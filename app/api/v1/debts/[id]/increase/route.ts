import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { CreateRepaymentSchema } from '@/lib/validation/debt'; // Reusing this schema as properties match: amount, account_id, date, description

export async function POST(
   request: NextRequest,
   { params }: { params: { id: string } }
): Promise<NextResponse> {
   const authResult = await requireAuth(request);
   if ('error' in authResult) {
      return authResult.error;
   }

   const { user } = authResult;
   const resolvedParams = await Promise.resolve(params);
   const debtId = resolvedParams.id;

   try {
      const body = await request.json();
      // We can reuse CreateRepaymentSchema because the payload is identical (amount, account_id, date, description)
      const validation = CreateRepaymentSchema.safeParse(body);

      if (!validation.success) {
         return errorResponse(
            'VALIDATION_ERROR',
            'Validation failed',
            400,
            validation.error.errors
         );
      }

      const data = validation.data;

      // 1. Fetch parent debt
      const parentDebt = await prisma.debt.findFirst({
         where: {
            id: debtId,
            user_id: user.user_id,
            status: { in: ['active', 'settled'] }, // Allow increasing settled debts
         },
      });

      if (!parentDebt) {
         return errorResponse('NOT_FOUND', 'Active or Settled Debt not found to increase', 404);
      }

      // 2. Verify account exists
      const account = await prisma.account.findFirst({
         where: { id: data.account_id, user_id: user.user_id }
      });

      if (!account) {
         return errorResponse('NOT_FOUND', 'Account not found or access denied', 404);
      }

      if (data.amount <= 0) {
         return errorResponse('VALIDATION_ERROR', 'Amount must be greater than zero', 400);
      }

      // 3. Determine transaction logic
      const txType = parentDebt.type === 'lend' ? 'debt_out' : 'debt_in';
      const dbAmount = parentDebt.type === 'lend' ? -Math.abs(data.amount) : Math.abs(data.amount);

      // 4. Execute transaction
      const newIncreaseTx = await prisma.$transaction(async (tx) => {
         // 4a. Create a linked Transaction strictly against parent Debt ID
         const increaseTx = await tx.transaction.create({
            data: {
               user_id: user.user_id,
               account_id: data.account_id,
               type: txType,
               amount: new Prisma.Decimal(dbAmount),
               date: new Date(data.date),
               ...(data.description !== undefined
                  ? { description: data.description }
                  : { description: `Increase for ${parentDebt.type === 'lend' ? 'lending' : 'borrowing'}` }),
               payee: parentDebt.counterparty,
               debt_id: debtId,
               created_by: user.user_id,
            }
         });

         // 4b. Identify if we need to 'Re-open' a settled debt
         if (parentDebt.status === 'settled') {
            await tx.debt.update({
               where: { id: parentDebt.id },
               data: {
                  status: 'active',
                  updated_by: user.user_id
               }
            });
         }

         return increaseTx;
      });

      return successResponse(newIncreaseTx, { message: 'Debt increased successfully', code: 201 });

   } catch (error) {
      console.error('Create debt increase error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to increase debt', 500);
   }
}
