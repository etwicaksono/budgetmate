import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { CreateRepaymentSchema } from '@/lib/validation/debt';

/**
 * PUT /api/v1/debts/[id]/increase/[transactionId]
 * Update an existing debt-increase transaction's amount, account, date, or description.
 */
export async function PUT(
   request: NextRequest,
   { params }: { params: { id: string; transactionId: string } }
): Promise<NextResponse> {
   const authResult = await requireAuth(request);
   if ('error' in authResult) {
      return authResult.error;
   }

   const { user } = authResult;
   const resolvedParams = await Promise.resolve(params);
   const { id: debtId, transactionId } = resolvedParams;

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

      // 1. Verify the parent debt belongs to the user
      const parentDebt = await prisma.debt.findFirst({
         where: {
            id: debtId,
            user_id: user.user_id,
         },
      });

      if (!parentDebt) {
         return errorResponse('NOT_FOUND', 'Debt not found', 404);
      }

      // 2. Verify the transaction to update exists, belongs to this debt, and is an increase-type
      const existingTx = await prisma.transaction.findFirst({
         where: {
            id: transactionId,
            debt_id: debtId,
            user_id: user.user_id,
         },
      });

      if (!existingTx) {
         return errorResponse('NOT_FOUND', 'Increase transaction not found', 404);
      }

      // Confirm it is actually an "increase" transaction (same direction as initial debt)
      const increaseType = parentDebt.type === 'lend' ? 'debt_out' : 'debt_in';
      if (existingTx.type !== increaseType) {
         return errorResponse('VALIDATION_ERROR', 'Transaction is not a debt increase record', 400);
      }

      // 3. Verify the new account belongs to the user
      const account = await prisma.account.findFirst({
         where: { id: data.account_id, user_id: user.user_id },
      });

      if (!account) {
         return errorResponse('NOT_FOUND', 'Account not found or access denied', 404);
      }

      if (data.amount <= 0) {
         return errorResponse('VALIDATION_ERROR', 'Amount must be greater than zero', 400);
      }

      // 4. Compute the signed amount in the same convention as the original increase
      const dbAmount = parentDebt.type === 'lend' ? -Math.abs(data.amount) : Math.abs(data.amount);

      // 5. Update the transaction
      const updatedTx = await prisma.transaction.update({
         where: { id: transactionId },
         data: {
            account_id: data.account_id,
            amount: new Prisma.Decimal(dbAmount),
            date: new Date(data.date),
            description: data.description ?? existingTx.description,
            updated_by: user.user_id,
         },
      });

      return successResponse(updatedTx, { message: 'Debt increase updated successfully' });

   } catch (error) {
      console.error('Update debt increase error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to update debt increase', 500);
   }
}

/**
 * DELETE /api/v1/debts/[id]/increase/[transactionId]
 * Delete an existing debt-increase transaction.
 */
export async function DELETE(
   request: NextRequest,
   { params }: { params: { id: string; transactionId: string } }
): Promise<NextResponse> {
   const authResult = await requireAuth(request);
   if ('error' in authResult) {
      return authResult.error;
   }

   const { user } = authResult;
   const resolvedParams = await Promise.resolve(params);
   const { id: debtId, transactionId } = resolvedParams;

   try {
      // 1. Verify parent debt ownership
      const parentDebt = await prisma.debt.findFirst({
         where: { id: debtId, user_id: user.user_id },
      });

      if (!parentDebt) {
         return errorResponse('NOT_FOUND', 'Debt not found', 404);
      }

      // 2. Verify the transaction exists and belongs to this debt
      const existingTx = await prisma.transaction.findFirst({
         where: {
            id: transactionId,
            debt_id: debtId,
            user_id: user.user_id,
         },
      });

      if (!existingTx) {
         return errorResponse('NOT_FOUND', 'Increase transaction not found', 404);
      }

      // 3. Delete it
      await prisma.transaction.delete({ where: { id: transactionId } });

      return successResponse(null, { message: 'Debt increase deleted successfully' });

   } catch (error) {
      console.error('Delete debt increase error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to delete debt increase', 500);
   }
}
