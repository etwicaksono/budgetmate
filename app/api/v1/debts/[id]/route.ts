import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { UpdateDebtSchema } from '@/lib/validation/debt';

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
            account_rel: {
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

      const initialTxType = debt.type === 'lend' ? 'debt_out' : 'debt_in';
      const initialTxs = allTxs.filter((tx) => tx.type === initialTxType);
      let initialAmount = 0;
      if (initialTxs.length > 0) {
         initialAmount = initialTxs.reduce((acc: number, tx) => acc + Math.abs(Number(tx.amount)), 0);
      }

      const repaymentTxType = debt.type === 'lend' ? 'debt_in' : 'debt_out';
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
         account: debt.account_rel,
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
      console.error('Fetch debt detail error:', error);
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

      // Check existing debt and fetch its active linked transaction
      const existingDebt = await prisma.debt.findFirst({
         where: {
            id: debtId,
            user_id: authResult.user.user_id,
         },
         include: {
            transactions: { orderBy: { created_at: 'asc' } },
         },
      });

      if (!existingDebt) {
         return errorResponse('NOT_FOUND', 'Debt not found', 404);
      }

      const allTxs = existingDebt.transactions || [];

      const initialTxType = existingDebt.type === 'lend' ? 'debt_out' : 'debt_in';
      const linkedTransaction = allTxs.find((tx) => tx.type === initialTxType) || null;

      // Compute repaid total to ensure new amount doesn't go below what's already repaid
      const repaymentTxType = existingDebt.type === 'lend' ? 'debt_in' : 'debt_out';
      const repaymentTxs = allTxs.filter((tx) => tx.type === repaymentTxType);

      let totalRepaid = 0;
      if (repaymentTxs.length > 0) {
         totalRepaid = repaymentTxs.reduce((acc: number, tx) => acc + Math.abs(Number(tx.amount)), 0);
      }

      if (data.amount !== undefined && data.amount < totalRepaid) {
         return errorResponse('VALIDATION_ERROR', 'New amount cannot be less than already repaid amount', 400);
      }

      const updateType = data.type || existingDebt.type;
      const dbAmount = data.amount
         ? (updateType === 'lend' ? -Math.abs(data.amount) : Math.abs(data.amount))
         : undefined;
      const txType = updateType === 'lend' ? 'debt_out' : 'debt_in';

      const updatedDebt = await prisma.$transaction(async (tx) => {
         const updateData: Prisma.DebtUpdateInput = { updated_by: authResult.user.user_id };
         if (data.date) updateData.date = new Date(data.date);
         if (data.type) updateData.type = data.type;
         if (data.account_id) updateData.account_rel = { connect: { id: data.account_id } };
         if (data.counterparty) updateData.counterparty = data.counterparty;
         if (data.description !== undefined) updateData.description = data.description;
         if (data.status) updateData.status = data.status;

         // Update Debt entry
         const updated = await tx.debt.update({
            where: { id: debtId },
            data: updateData
         });

         // Update linked transaction
         if (linkedTransaction) {
            const txUpdateData: Prisma.TransactionUpdateInput = { updated_by: authResult.user.user_id };
            if (data.date) txUpdateData.date = new Date(data.date);
            if (data.type) txUpdateData.type = txType;
            if (data.account_id) txUpdateData.account = { connect: { id: data.account_id } };
            if (dbAmount !== undefined) {
               // Calculate how much of the new Total Amount belongs to THIS specific initial transaction.
               // Total Amount = (Initial Transaction Amount) + (Sum of all Increase Transactions)
               // Therefore: New Initial Transaction Amount = (New Total Amount) - (Sum of all Increase Transactions)
               const allOtherInitialTxs = allTxs.filter((tx) => tx.type === initialTxType && tx.id !== linkedTransaction.id);
               const sumOfIncreases = allOtherInitialTxs.reduce((acc: number, tx) => acc + Math.abs(Number(tx.amount)), 0);

               const newInitialAmount = Math.max(0, Math.abs(dbAmount) - sumOfIncreases);

               // Restore negative sign if lending
               const finalDbAmount = txType === 'debt_out' ? -newInitialAmount : newInitialAmount;
               txUpdateData.amount = new Prisma.Decimal(finalDbAmount);
            }
            if (data.counterparty) txUpdateData.payee = data.counterparty;
            if (data.description !== undefined) txUpdateData.description = data.description;

            await tx.transaction.update({
               where: { id: linkedTransaction.id },
               data: txUpdateData
            });
         }

         return updated;
      });

      return successResponse(updatedDebt, { message: 'Debt updated successfully' });
   } catch (error) {
      console.error('Update debt error:', error);
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
      console.error('Delete debt error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to delete debt', 500);
   }
}
