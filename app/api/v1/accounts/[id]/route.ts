import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, commonErrors } from '@/lib/api/response';
import { resolveRouteParam } from '@/lib/api/params';
import { balanceService } from '@/services/balanceService';



const UpdateAccountSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  account_type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  initial_balance: z.number().optional(),


  is_active: z.boolean().optional(),
  is_included_in_total: z.boolean().optional()
});

interface RouteParams {
  params?: {
    id?: string;
  };
}

// GET - Fetch single account
export async function GET(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const accountId = resolveRouteParam(request, context.params);
  if (!accountId) {
    return errorResponse('VALIDATION_ERROR', 'Account ID is required in the path', 400);
  }

  const id = accountId;

  try {
    const account = await prisma.account.findFirst({
      where: {
        id,
        user_id: user.user_id,
        deleted_at: null
      },
    });

    if (!account) {
      return commonErrors.notFound('Account');
    }

    // Get account statistics and calculate current balance
    const [transactionCount, lastTransaction, currentBalance] = await Promise.all([
      prisma.transaction.count({
        where: {
          account_id: id,
          user_id: user.user_id,
          deleted_at: null
        }
      }),
      prisma.transaction.findFirst({
        where: {
          account_id: id,
          user_id: user.user_id,
          deleted_at: null
        },
        orderBy: { date: 'desc' },
        select: { date: true, amount: true, type: true }
      }),
      balanceService.calculateAccountBalance(id) // ✅ Calculate balance
    ]);

    const response = {
      id: account.id,
      name: account.name,
      account_type: account.account_type,
      icon: account.icon,
      color: account.color,

      initial_balance: account.initial_balance.toNumber(),
      current_balance: currentBalance, // ✅ Use calculated balance
      is_active: account.is_active,
      is_included_in_total: account.is_included_in_total,
      created_at: account.created_at,
      updated_at: account.updated_at,
      statistics: {
        transaction_count: transactionCount,
        last_transaction: lastTransaction ? {
          date: lastTransaction.date,
          amount: lastTransaction.amount.toNumber(),
          type: lastTransaction.type
        } : null
      }
    };

    return successResponse(response);

  } catch (error) {
    console.error('Account fetch error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch account', 500);
  }
}

// PUT/PATCH - Update account
export async function PUT(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const accountId = resolveRouteParam(request, context.params);
  if (!accountId) {
    return errorResponse('VALIDATION_ERROR', 'Account ID is required in the path', 400);
  }

  const id = accountId;

  try {
    const body = await request.json();
    const validation = UpdateAccountSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        validation.error.errors
      );
    }

    const data = validation.data;

    // Check if account exists and belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: {
        id,
        user_id: user.user_id,
        deleted_at: null
      }
    });

    if (!existingAccount) {
      return commonErrors.notFound('Account');
    }

    // Update account
    const updateData: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: user.user_id
    };

    if (data.name !== undefined) updateData['name'] = data.name;
    if (data.account_type !== undefined) updateData['account_type'] = data.account_type;
    if (data.icon !== undefined) updateData['icon'] = data.icon;
    if (data.color !== undefined) updateData['color'] = data.color;
    if (data.initial_balance !== undefined) updateData['initial_balance'] = data.initial_balance;

    if (data.is_active !== undefined) updateData['is_active'] = data.is_active;
    if (data.is_included_in_total !== undefined) updateData['is_included_in_total'] = data.is_included_in_total;

    const updated = await prisma.account.update({
      where: { id },
      data: updateData
    });

    // Calculate current balance after update
    const updatedBalance = await balanceService.calculateAccountBalance(id);

    const response = {
      id: updated.id,
      name: updated.name,
      account_type: updated.account_type,
      icon: updated.icon,
      color: updated.color,

      initial_balance: updated.initial_balance.toNumber(),
      current_balance: updatedBalance, // ✅ Calculated balance
      is_active: updated.is_active,
      is_included_in_total: updated.is_included_in_total,
      created_at: updated.created_at,
      updated_at: updated.updated_at
    };

    return successResponse(response, { message: 'Account updated successfully' });

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return errorResponse('NOT_FOUND', 'Account not found', 404);
      }
      if (error.code === 'P2003') {
        return errorResponse('CONFLICT', 'Cannot update account: it is referenced by other records', 409);
      }
      if (error.code === 'P2002') {
        return errorResponse('DUPLICATE', 'Duplicate entry', 409);
      }
      console.error('Prisma error in account update:', { code: error.code, message: error.message, meta: error.meta, accountId: id, userId: user.user_id });
      return errorResponse('DATABASE_ERROR', `Database operation failed: ${error.code}`, 500);
    }
    console.error('Account update error:', { accountId: id, userId: user.user_id, error });
    return errorResponse('INTERNAL_ERROR', 'Failed to update account', 500);
  }
}

// PATCH - Alias for PUT
export async function PATCH(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  return PUT(request, context);
}

// DELETE - Soft delete account
export async function DELETE(request: NextRequest, context: RouteParams): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const accountId = resolveRouteParam(request, context.params);
  if (!accountId) {
    return errorResponse('VALIDATION_ERROR', 'Account ID is required in the path', 400);
  }

  const id = accountId;

  try {
    // Check if account exists and belongs to user
    const existingAccount = await prisma.account.findFirst({
      where: {
        id,
        user_id: user.user_id,
        deleted_at: null
      }
    });

    if (!existingAccount) {
      return commonErrors.notFound('Account');
    }

    // Check if account has transactions
    const transactionCount = await prisma.transaction.count({
      where: {
        account_id: id,
        user_id: user.user_id,
        deleted_at: null
      }
    });

    if (transactionCount > 0) {
      return errorResponse(
        'ACCOUNT_HAS_TRANSACTIONS',
        'Cannot delete account with existing transactions. Please delete or transfer transactions first.',
        409
      );
    }

    // Soft delete
    await prisma.account.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
        updated_by: user.user_id
      }
    });

    return successResponse(null, { message: 'Account deleted successfully' });

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        return errorResponse('NOT_FOUND', 'Account not found', 404);
      }
      if (error.code === 'P2003') {
        return errorResponse('CONFLICT', 'Cannot delete account: it is referenced by other records', 409);
      }
      if (error.code === 'P2002') {
        return errorResponse('DUPLICATE', 'Duplicate entry', 409);
      }
      console.error('Prisma error in account delete:', { code: error.code, message: error.message, meta: error.meta, accountId: id, userId: user.user_id });
      return errorResponse('DATABASE_ERROR', `Database operation failed: ${error.code}`, 500);
    }
    console.error('Account deletion error:', { accountId: id, userId: user.user_id, error });
    return errorResponse('INTERNAL_ERROR', 'Failed to delete account', 500);
  }
}
