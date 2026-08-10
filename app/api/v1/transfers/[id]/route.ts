import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, commonErrors } from '@/lib/api/response';
import { handlePrismaError } from '@/lib/api/prisma-errors';
import { resolveRouteParam } from '@/lib/api/params';
import { logError } from '@/lib/logger';

interface RouteParams {
  params?: {
    id?: string;
  };
}

// GET - Fetch single transfer
export async function GET(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const transferId = resolveRouteParam(request, context.params);
  if (!transferId) {
    return errorResponse('VALIDATION_ERROR', 'Transfer ID is required in the path', 400);
  }

  const id = transferId;

  try {
    const transfer = await prisma.transfer.findFirst({
      where: {
        id,
        user_id: user.user_id
      },
    });
    if (!transfer) {
      return commonErrors.notFound('Transfer');
    }

    const from_account_rel = await prisma.account.findUnique({
      where: { id: transfer.from_account },
      select: { id: true, name: true, icon: true, color: true, account_type: true }
    });

    const to_account_rel = await prisma.account.findUnique({
      where: { id: transfer.to_account },
      select: { id: true, name: true, icon: true, color: true, account_type: true }
    });

    const transactions_rel = await prisma.transaction.findMany({
      where: { transfer_id: transfer.id, deleted_at: null },
      select: { id: true, type: true, amount: true, account_id: true, created_at: true },
      orderBy: { type: 'desc' }
    });

    const response = {
      id: transfer.id,
      date: transfer.date,
      from_account_id: transfer.from_account,
      from_account: from_account_rel,
      to_account_id: transfer.to_account,
      to_account: to_account_rel,
      amount: transfer.amount.toNumber(),
      description: transfer.description,
      transactions: transactions_rel.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        account_id: t.account_id,
        created_at: t.created_at
      })),
      created_at: transfer.created_at,
      updated_at: transfer.updated_at
    };

    return successResponse(response);

  } catch (error) {
    logError('Transfer fetch error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch transfer', 500);
  }
}

// Validation schema for updating transfer
const UpdateTransferSchema = z.object({
  date: z.string().optional(),
  from_account_id: z.string().optional(),
  to_account_id: z.string().optional(),
  amount: z.number().optional(),
  description: z.string().optional()
});

// PUT - Update transfer and its linked transactions
export async function PUT(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const transferId = resolveRouteParam(request, context.params);
  if (!transferId) {
    return errorResponse('VALIDATION_ERROR', 'Transfer ID is required in the path', 400);
  }

  const id = transferId;

  try {
    const body = await request.json();
    const data = UpdateTransferSchema.parse(body);

    // Validate destination account is not empty string
    if (data.to_account_id === '') {
      return errorResponse('VALIDATION_ERROR', 'Destination account is required', 400);
    }

    // Check if transfer exists and belongs to user
    const existingTransferRaw = await prisma.transfer.findFirst({
      where: {
        id,
        user_id: user.user_id
      }
    });
    // Must exclude deleted legs: the source/dest rows picked out of this list are
    // the ones PUT writes to, so a deleted leg here would be silently rewritten
    // while the live leg kept its old amount.
    const transferTransactions = await prisma.transaction.findMany({ where: { transfer_id: id, deleted_at: null } });
    const existingTransfer = existingTransferRaw ? { ...existingTransferRaw, transactions: transferTransactions } : null;

    if (!existingTransfer) {
      return commonErrors.notFound('Transfer');
    }

    // Validate accounts if provided
    if (data.from_account_id || data.to_account_id) {
      const fromAccountId = data.from_account_id || existingTransfer.from_account;
      const toAccountId = data.to_account_id || existingTransfer.to_account;

      if (!toAccountId) {
        return errorResponse('VALIDATION_ERROR', 'Destination account is required', 400);
      }

      if (fromAccountId === toAccountId) {
        return errorResponse('VALIDATION_ERROR', 'Cannot transfer to the same account', 400);
      }

      // Verify both accounts exist and belong to user
      const accounts = await prisma.account.findMany({
        where: {
          id: { in: [fromAccountId, toAccountId] },
          user_id: user.user_id,
          deleted_at: null
        }
      });

      if (accounts.length !== 2) {
        return errorResponse('VALIDATION_ERROR', 'One or both accounts not found', 404);
      }
    }

    // Update transfer and linked transactions in a transaction
    await prisma.$transaction(async (tx) => {
      // Build update data for transfer
      const transferUpdateData: {
        updated_at: Date;
        updated_by: string;
        date?: Date;
        from_account?: string;
        to_account?: string;
        amount?: number;
        description?: string | null;
      } = {
        updated_at: new Date(),
        updated_by: user.user_id
      };

      if (data.date) transferUpdateData.date = new Date(data.date);
      if (data.from_account_id) transferUpdateData.from_account = data.from_account_id;
      if (data.to_account_id) transferUpdateData.to_account = data.to_account_id;
      if (data.amount !== undefined) transferUpdateData.amount = data.amount;
      if (data.description !== undefined) transferUpdateData.description = data.description;

      // Update transfer record
      const transfer = await tx.transfer.update({
        where: { id },
        data: transferUpdateData
      });

      // Get the updated values (use new values or keep existing)
      const finalDate = data.date ? new Date(data.date) : existingTransfer.date;
      const finalFromAccount = data.from_account_id || existingTransfer.from_account;
      const finalToAccount = data.to_account_id || existingTransfer.to_account;
      const finalAmount = data.amount !== undefined ? data.amount : existingTransfer.amount.toNumber();
      const finalDescription = data.description !== undefined ? data.description : existingTransfer.description;

      // Update linked transactions
      // Find the source and destination transactions
      const transactions = existingTransfer.transactions;
      const sourceTransaction = transactions.find(t => t.account_id === existingTransfer.from_account);
      const destTransaction = transactions.find(t => t.account_id === existingTransfer.to_account);

      if (sourceTransaction) {
        await tx.transaction.update({
          where: { id: sourceTransaction.id },
          data: {
            date: finalDate,
            account_id: finalFromAccount,
            amount: -Math.abs(finalAmount), // Negative for source
            description: finalDescription,
            updated_at: new Date(),
            updated_by: user.user_id
          }
        });
      }

      if (destTransaction) {
        await tx.transaction.update({
          where: { id: destTransaction.id },
          data: {
            date: finalDate,
            account_id: finalToAccount,
            amount: Math.abs(finalAmount), // Positive for destination
            description: finalDescription,
            updated_at: new Date(),
            updated_by: user.user_id
          }
        });
      }

      return transfer;
    });

    // Fetch the updated transfer with relations
    const result = await prisma.transfer.findFirst({
      where: { id }
    });

    if (!result) {
      return commonErrors.notFound('Transfer');
    }

    const response = {
      id: result.id,
      date: result.date,
      from_account: result.from_account,
      to_account: result.to_account,
      amount: result.amount.toNumber(),
      description: result.description,
      from_account_data: await prisma.account.findUnique({ where: { id: result.from_account }, select: { id: true, name: true, icon: true, color: true } }),
      to_account_data: await prisma.account.findUnique({ where: { id: result.to_account }, select: { id: true, name: true, icon: true, color: true } }),
      created_at: result.created_at,
      updated_at: result.updated_at
    };

    return successResponse(response, { message: 'Transfer updated successfully' });

  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      return errorResponse('VALIDATION_ERROR', firstError?.message || 'Validation error', 400);
    }
    const prismaError = handlePrismaError(error, 'Transfer', 'update');
    if (prismaError) return prismaError;
    logError('Unexpected error:', error);
    return commonErrors.serverError();
  }
}

// DELETE - Delete transfer and its linked transactions
export async function DELETE(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const transferId = resolveRouteParam(request, context.params);
  if (!transferId) {
    return errorResponse('VALIDATION_ERROR', 'Transfer ID is required in the path', 400);
  }

  const id = transferId;

  try {
    // Check if transfer exists and belongs to user
    const existingTransfer = await prisma.transfer.findFirst({
      where: {
        id,
        user_id: user.user_id
      }
    });

    if (!existingTransfer) {
      return commonErrors.notFound('Transfer');
    }

    // Delete transfer and linked transactions (balance calculated on-demand)
    await prisma.$transaction(async (tx) => {
      // ✅ Balance is now calculated on-demand, no need to revert

      // 1. Delete linked transactions
      await tx.transaction.deleteMany({
        where: {
          transfer_id: id
        }
      });

      // 3. Delete transfer
      await tx.transfer.delete({
        where: { id }
      });
    });

    return successResponse(null, { message: 'Transfer deleted successfully' });

  } catch (error) {
    const prismaError = handlePrismaError(error, 'Transfer', 'delete');
    if (prismaError) return prismaError;
    logError('Unexpected error:', error);
    return commonErrors.serverError();
  }
}
