import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { CreateRepaymentSchema } from '@/lib/validation/debt';

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
            status: 'active',
         },
         include: {
            transactions: { orderBy: { created_at: 'asc' } }
         }
      });

      if (!parentDebt) {
         return errorResponse('NOT_FOUND', 'Active Debt not found to record repayment', 404);
      }

      // 2. Verify account
      const account = await prisma.account.findFirst({
         where: { id: data.account_id, user_id: user.user_id }
      });

      if (!account) {
         return errorResponse('NOT_FOUND', 'Account not found or access denied', 404);
      }

      // 3. Compute remaining balance to ensure we don't overpay
      const allTxs = parentDebt.transactions || [];
      const initialTxType = parentDebt.type === 'lend' ? 'debt_out' : 'debt_in';

      const initialTxs = allTxs.filter((tx) => tx.type === initialTxType);
      const repaymentTxs = allTxs.filter((tx) => tx.type !== initialTxType);

      const initialAmount = initialTxs.reduce((acc: number, tx) => acc + Math.abs(Number(tx.amount)), 0);
      const totalRepaid = repaymentTxs.reduce((acc: number, tx) => acc + Math.abs(Number(tx.amount)), 0);

      const remainingAmount = Math.max(0, initialAmount - totalRepaid);

      if (data.amount > remainingAmount + 0.01) { // small floating precision buffer
         return errorResponse('VALIDATION_ERROR', 'Repayment amount exceeds remaining debt balance', 400);
      }

      // 4. Determine repayment transaction amount logic
      // If original was lend (money left account): repayment means money IN to account.
      // If original was borrow (money arrived): repayment means money OUT of account.
      const txType = parentDebt.type === 'lend' ? 'debt_in' : 'debt_out';
      const dbAmount = parentDebt.type === 'lend' ? Math.abs(data.amount) : -Math.abs(data.amount);

      // 5. Execute transaction
      const newRepaymentTx = await prisma.$transaction(async (tx) => {
         // 5a. Create linked Transaction strictly against parent Debt ID
         const repaymentTx = await tx.transaction.create({
            data: {
               user_id: user.user_id,
               account_id: data.account_id,
               type: txType,
               amount: new Prisma.Decimal(dbAmount),
               currency: account.currency,
               date: new Date(data.date),
               ...(data.description !== undefined
                  ? { description: data.description }
                  : { description: `Repayment for ${parentDebt.type === 'lend' ? 'lending' : 'borrowing'}` }),
               payee: parentDebt.counterparty,
               debt_id: debtId, // Direct link to parent!
               created_by: user.user_id,
            }
         });

         // 5b. Auto-settle parent debt if fully paid
         if (Math.abs(remainingAmount - data.amount) < 0.01) {
            await tx.debt.update({
               where: { id: parentDebt.id },
               data: { status: 'settled', updated_by: user.user_id }
            });
         }

         return repaymentTx;
      });

      return successResponse(newRepaymentTx, { message: 'Repayment recorded successfully', code: 201 });

   } catch (error) {
      console.error('Create repayment error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to record repayment', 500);
   }
}
