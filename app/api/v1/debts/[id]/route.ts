import { NextRequest, NextResponse } from 'next/server';
import { DebtStatus, DebtType, TransactionType } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { handlePrismaError } from '@/lib/api/prisma-errors';
import { UpdateDebtSchema } from '@/lib/validation/debt';
import { logError } from '@/lib/logger';

export async function GET(
   request: NextRequest,
   { params }: { params: { id: string } }
): Promise<NextResponse> {
   const authResult = await requireAuth(request);
   if ('error' in authResult) {
      return authResult.error;
   }

   const resolvedParams = await Promise.resolve(params);
   const debtId = resolvedParams.id;

   try {
      const debt = await prisma.debt.findFirst({
         where: {
            id: debtId,
            user_id: authResult.user.user_id,
         },
         include: {
            account: {
               select: { name: true, icon: true, color: true },
            },
            transactions: {
               orderBy: { created_at: 'asc' },
               include: {
                  account: { select: { name: true, icon: true, color: true } }
               }
            },
         },
      });

      if (!debt) {
         return errorResponse('NOT_FOUND', 'Debt not found', 404);
      }

      const allTxs = debt.transactions || [];

      const initialTxType = debt.type === DebtType.lend ? TransactionType.debt_out : TransactionType.debt_in;
      const initialTxs = allTxs.filter((tx) => tx.type === initialTxType);
      let initialAmount = 0;
      if (initialTxs.length > 0) {
         initialAmount = initialTxs.reduce((acc: number, tx) => acc + Math.abs(Number(tx.amount)), 0);
      }

      const repaymentTxType = debt.type === DebtType.lend ? TransactionType.debt_in : TransactionType.debt_out;
      const repaymentTxs = allTxs.filter((tx) => tx.type === repaymentTxType);

      let totalRepaid = 0;
      if (repaymentTxs.length > 0) {
         totalRepaid = repaymentTxs.reduce((acc: number, tx) => acc + Math.abs(Number(tx.amount)), 0);
      }

      const remainingAmount = Math.max(0, initialAmount - totalRepaid);

      const transformedDebt = {
         id: debt.id,
         date: debt.date.toISOString(),
         type: debt.type,
         counterparty: debt.counterparty,
         description: debt.description,
         status: debt.status,
         amount: initialAmount,
         remaining_amount: remainingAmount,
         account: debt.account,
         account_id: debt.account_id,
         repayments: repaymentTxs.map((tx) => ({
            id: tx.id,
            date: tx.date.toISOString(),
            description: tx.description,
            amount: Math.abs(Number(tx.amount)),
            account: tx.account
         })),
         transactions: allTxs.map((tx) => ({
            id: tx.id,
            type: tx.type,
            date: tx.date.toISOString(),
            description: tx.description,
            amount: Math.abs(Number(tx.amount)),
            account: tx.account
         }))
      };

      return successResponse(transformedDebt);
   } catch (error) {
      logError('Fetch debt detail error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to retrieve debt', 500);
   }
}

export async function PUT(
   request: NextRequest,
   { params }: { params: { id: string } }
): Promise<NextResponse> {
   const authResult = await requireAuth(request);
   if ('error' in authResult) {
      return authResult.error;
   }

   const resolvedParams = await Promise.resolve(params);
   const debtId = resolvedParams.id;

   try {
      const body = await request.json();
      const validation = UpdateDebtSchema.safeParse(body);

      if (!validation.success) {
         return errorResponse('VALIDATION_ERROR', 'Validation failed', 400, validation.error.errors);
      }

      const data = validation.data;

      // Check existing debt (edit only mutates the Debt record; linked
      // transactions/ledger entries are intentionally left untouched).
      const existingDebt = await prisma.debt.findFirst({
         where: {
            id: debtId,
            user_id: authResult.user.user_id,
         },
      });

      if (!existingDebt) {
         return errorResponse('NOT_FOUND', 'Debt not found', 404);
      }

      const updatedDebt = await prisma.debt.update({
         where: { id: debtId },
         data: {
            updated_by: authResult.user.user_id,
            ...(data.date && { date: new Date(data.date) }),
            ...(data.type && { type: data.type as DebtType }),
            ...(data.account_id && { account: { connect: { id: data.account_id } } }),
            ...(data.counterparty && { counterparty: data.counterparty }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.status && { status: data.status as DebtStatus }),
         },
      });

      return successResponse(updatedDebt, { message: 'Debt updated successfully' });
   } catch (error) {
      const prismaError = handlePrismaError(error, 'Debt', 'update');
      if (prismaError) return prismaError;
      logError('Unexpected error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to update debt', 500);
   }
}

export async function DELETE(
   request: NextRequest,
   { params }: { params: { id: string } }
): Promise<NextResponse> {
   const authResult = await requireAuth(request);
   if ('error' in authResult) {
      return authResult.error;
   }

   const resolvedParams = await Promise.resolve(params);
   const debtId = resolvedParams.id;

   try {
      const existingDebt = await prisma.debt.findFirst({
         where: {
            id: debtId,
            user_id: authResult.user.user_id,
         },
      });

      if (!existingDebt) {
         return errorResponse('NOT_FOUND', 'Debt not found', 404);
      }

      // Since onDelete: Cascade is handled by parent-child relations and Prisma schema, 
      // Deleting the Debt directly removes its attached repayments and the Transaction. 
      // But Transaction foreign key `debt_id` has `onDelete: SetNull`. 
      // To cleanly remove the ledger transaction associated with the debt, we explicitly delete the transaction first inside a logic block. 

      await prisma.$transaction(async (tx) => {
         // Delete all transactions linked strictly to this root debt
         await tx.transaction.deleteMany({
            where: { debt_id: debtId }
         });

         await tx.debt.delete({
            where: { id: debtId }
         });
      });

      return successResponse(null, { message: 'Debt deleted successfully' });
   } catch (error) {
      const prismaError = handlePrismaError(error, 'Debt', 'delete');
      if (prismaError) return prismaError;
      logError('Unexpected error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to delete debt', 500);
   }
}
