import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validatePathParams, handleValidationError } from '@/lib/validation';

const PathParamsSchema = z.object({ id: z.string().uuid() });

// GET /api/v1/debts/:id - Get debt detail with linked transactions
/**
 * @summary Retrieve a debt and linked transactions.
 * @description Requires bearer auth, ensures ownership, aggregates linked transactions to compute balance, and returns metadata plus transaction summaries.
 * @tag Debts
 * @security bearerAuth
 * @param request Authenticated Next.js request.
 * @param params Promise resolving to `{ id: string }`.
 * @response 200 - Debt retrieved successfully with transactions.
 * @response 401 - Authentication failed.
 * @response 404 - Debt not found.
 * @response 500 - Server error while fetching the debt.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Validate path params
    const { id: debtId } = validatePathParams(await params, PathParamsSchema);

    // Get debt
    const debt = await db.debts.findFirst({
      where: {
        id: debtId,
        user_id: user.user_id,
      },
    });

    if (!debt) {
      return jsonResponse(
        ApiResponseBuilder.error('Debt not found'),
        404
      );
    }

    // Fetch account details
    const account = await db.accounts.findUnique({
      where: { id: debt.account_id },
      select: { name: true, icon: true },
    });

    // Get linked transactions with details
    const linkedTransactions = await db.transactions.findMany({
      where: {
        debt_id: debtId,
        user_id: user.user_id,
      },
      orderBy: [
        { date: 'desc' },
        { created_at: 'desc' },
      ],
    });

    // Get unique category IDs from transactions
    const categoryIds = Array.from(new Set(linkedTransactions.map(t => t.category_id)));

    // Fetch categories
    const categories = await db.categories.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true, color: true },
    });

    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // Calculate balance
    let balance = 0;
    linkedTransactions.forEach((txn) => {
      if (debt.type === 'PAYABLE') {
        balance += txn.type === 'EXPENSE' ? txn.amount : -txn.amount;
      } else {
        balance += txn.type === 'INCOME' ? txn.amount : -txn.amount;
      }
    });

    return jsonResponse(
      ApiResponseBuilder.success('Debt retrieved successfully', {
        id: debt.id,
        user_id: debt.user_id,
        personal_id: Number(debt.personal_id),
        account_id: debt.account_id,
        account_name: account?.name || '',
        account_icon: account?.icon || '',
        name: debt.name,
        type: debt.type,
        balance,
        transaction_count: linkedTransactions.length,
        position: debt.position,
        created_at: debt.created_at.toISOString(),
        updated_at: debt.updated_at?.toISOString() || debt.created_at.toISOString(),
        transactions: linkedTransactions.map(txn => {
          const category = categoryMap.get(txn.category_id);
          return {
            id: txn.id,
            date: txn.date.toISOString().split('T')[0],
            type: txn.type,
            amount: txn.amount,
            category_id: txn.category_id,
            category_name: category?.name || '',
            category_icon: category?.icon || '',
            note: txn.note,
          };
        }),
      }),
      200
    );
  } catch (error) {
    console.error('Get debt error:', error);
    return handleValidationError(error);
  }
}

// PUT /api/v1/debts/:id - Update debt
/**
 * @summary Update debt metadata.
 * @description Validates optional changes to `name`, `type`, or `account_id`, ensures referenced account belongs to the user, and recalculates balance/transaction counts.
 * @tag Debts
 * @security bearerAuth
 * @bodyContent {Object} { name?: string, type?: 'PAYABLE' | 'RECEIVABLE', account_id?: string }
 * @param request Authenticated Next.js request with the update payload.
 * @param params Promise resolving to `{ id: string }`.
 * @response 200 - Debt updated successfully with refreshed balance.
 * @response 400 - Invalid updates (empty name, unsupported type).
 * @response 401 - Authentication failed.
 * @response 404 - Debt or account not found.
 * @response 500 - Server error while updating the debt.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Validate path params
    const { id: debtId } = validatePathParams(await params, PathParamsSchema);
    const body = await request.json();

    // Verify debt exists and belongs to user
    const existingDebt = await db.debts.findFirst({
      where: {
        id: debtId,
        user_id: user.user_id,
      },
    });

    if (!existingDebt) {
      return jsonResponse(
        ApiResponseBuilder.error('Debt not found'),
        404
      );
    }

    // Validate name if being changed
    if (body.name !== undefined && body.name.trim().length === 0) {
      return jsonResponse(
        ApiResponseBuilder.error('Name cannot be empty'),
        400
      );
    }

    // Validate type if being changed
    if (body.type && body.type !== 'PAYABLE' && body.type !== 'RECEIVABLE') {
      return jsonResponse(
        ApiResponseBuilder.error('Type must be PAYABLE or RECEIVABLE'),
        400
      );
    }

    // Validate account if being changed
    if (body.account_id !== undefined) {
      const account = await db.accounts.findFirst({
        where: {
          id: body.account_id,
          user_id: user.user_id,
        },
      });

      if (!account) {
        return jsonResponse(
          ApiResponseBuilder.error('Account not found'),
          404
        );
      }
    }

    // Build update data
    const updateData: any = {
      updated_at: new Date(),
    };

    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.type !== undefined) updateData.type = body.type;
    if (body.account_id !== undefined) updateData.account_id = body.account_id;

    // Update debt
    const debt = await db.debts.update({
      where: { id: debtId },
      data: updateData,
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    // Fetch account details
    const account = await db.accounts.findUnique({
      where: { id: debt.account_id },
      select: { name: true, icon: true },
    });

    // Calculate balance
    const debtTransactions = await db.transactions.findMany({
      where: {
        debt_id: debtId,
        user_id: user.user_id,
      },
    });

    let balance = 0;
    debtTransactions.forEach((txn) => {
      if (debt.type === 'PAYABLE') {
        balance += txn.type === 'EXPENSE' ? txn.amount : -txn.amount;
      } else {
        balance += txn.type === 'INCOME' ? txn.amount : -txn.amount;
      }
    });

    return jsonResponse(
      ApiResponseBuilder.success('Debt updated successfully', {
        id: debt.id,
        user_id: debt.user_id,
        personal_id: Number(debt.personal_id),
        account_id: debt.account_id,
        account_name: account?.name || '',
        account_icon: account?.icon || '',
        name: debt.name,
        type: debt.type,
        balance,
        transaction_count: debt._count.transactions,
        position: debt.position,
        created_at: debt.created_at.toISOString(),
        updated_at: debt.updated_at?.toISOString() || debt.created_at.toISOString(),
      }),
      200
    );
  } catch (error) {
    console.error('Update debt error:', error);
    return handleValidationError(error);
  }
}

// DELETE /api/v1/debts/:id - Delete debt
/**
 * @summary Delete a debt record.
 * @description Authenticates the user, ensures the debt has no linked transactions, and removes it from the ledger.
 * @tag Debts
 * @security bearerAuth
 * @param request Authenticated Next.js request.
 * @param params Promise resolving to `{ id: string }`.
 * @response 200 - Debt deleted successfully.
 * @response 400 - Debt still has linked transactions.
 * @response 401 - Authentication failed.
 * @response 404 - Debt not found.
 * @response 500 - Server error while deleting the debt.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Validate path params
    const { id: debtId } = validatePathParams(await params, PathParamsSchema);

    // Verify debt exists and belongs to user
    const existingDebt = await db.debts.findFirst({
      where: {
        id: debtId,
        user_id: user.user_id,
      },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!existingDebt) {
      return jsonResponse(
        ApiResponseBuilder.error('Debt not found'),
        404
      );
    }

    // Check if debt has transactions
    if (existingDebt._count.transactions > 0) {
      return jsonResponse(
        ApiResponseBuilder.error('Cannot delete debt with linked transactions. Remove transactions first.'),
        400
      );
    }

    // Delete debt
    await db.debts.delete({
      where: { id: debtId },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Debt deleted successfully', null),
      200
    );
  } catch (error) {
    console.error('Delete debt error:', error);
    return handleValidationError(error);
  }
}
