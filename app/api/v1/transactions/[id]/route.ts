import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateBody, validatePathParams, handleValidationError } from '@/lib/validation';
import { UpdateTransactionRequestSchema, TransactionSchema } from '@/schemas/transactions/transaction.schema';
import { z } from 'zod';

// GET /api/v1/transactions/:id - Get transaction detail
/**
 * @summary Retrieve a transaction by id.
 * @description Requires bearer auth, checks ownership, and returns the transaction with account and category labels.
 * @tag Transactions
 * @security bearerAuth
 * @param request Authenticated Next.js request.
 * @param params Promise resolving to `{ id: string }`.
 * @response 200 - Transaction retrieved successfully.
 * @response 401 - Authentication failed.
 * @response 404 - Transaction not found.
 * @response 500 - Server error while fetching the transaction.
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

    const { id: transactionId } = validatePathParams(
      await params,
      z.object({ id: z.string().uuid() })
    );

    // Get transaction
    const transaction = await db.transactions.findFirst({
      where: {
        id: transactionId,
        user_id: user.user_id,
      },
    });

    if (!transaction) {
      return jsonResponse(
        ApiResponseBuilder.error('Transaction not found'),
        404
      );
    }

    // Fetch account and category
    const account = await db.accounts.findUnique({
      where: { id: transaction.account_id },
      select: { name: true, icon: true },
    });

    const category = await db.categories.findUnique({
      where: { id: transaction.category_id },
      select: { name: true, icon: true, color: true },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Transaction retrieved successfully', {
        id: transaction.id,
        user_id: transaction.user_id,
        personal_id: Number(transaction.personal_id),
        date: transaction.date.toISOString().split('T')[0],
        account_id: transaction.account_id,
        account_name: account?.name || '',
        account_icon: account?.icon || '',
        category_id: transaction.category_id,
        category_name: category?.name || '',
        category_icon: category?.icon || '',
        category_color: category?.color || null,
        amount: transaction.amount,
        type: transaction.type,
        note: transaction.note,
        transfer_id: transaction.transfer_id,
        debt_id: transaction.debt_id,
        position: transaction.position,
        created_at: transaction.created_at.toISOString(),
        updated_at: transaction.updated_at?.toISOString() || transaction.created_at.toISOString(),
      }),
      200
    );
  } catch (error) {
    console.error('Get transaction error:', error);
    return handleValidationError(error);
  }
}

// PUT /api/v1/transactions/:id - Update transaction
/**
 * @summary Update transaction details.
 * @description Validates ownership, allows changing the account, category, amount (auto-adjusting the type), date, and note, and returns the refreshed record.
 * @tag Transactions
 * @security bearerAuth
 * @bodyContent {Object} Partial transaction fields (`date`, `account_id`, `category_id`, `amount`, `note`).
 * @param request Authenticated Next.js request.
 * @param params Promise resolving to `{ id: string }`.
 * @response 200 - Transaction updated successfully.
 * @response 401 - Authentication failed.
 * @response 404 - Transaction, account, or category not found for the user.
 * @response 500 - Server error while updating the transaction.
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

    const { id: transactionId } = validatePathParams(
      await params,
      z.object({ id: z.string().uuid() })
    );

    const body = await validateBody(request, UpdateTransactionRequestSchema);

    // Check if transaction exists and belongs to user
    const existingTransaction = await db.transactions.findFirst({
      where: {
        id: transactionId,
        user_id: user.user_id,
      },
    });

    if (!existingTransaction) {
      return jsonResponse(
        ApiResponseBuilder.error('Transaction not found'),
        404
      );
    }

    // If account_id is being changed, verify new account exists
    if (body.account_id) {
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

    // If category_id is being changed, verify new category exists
    if (body.category_id) {
      const category = await db.categories.findFirst({
        where: {
          id: body.category_id,
          user_id: user.user_id,
        },
      });

      if (!category) {
        return jsonResponse(
          ApiResponseBuilder.error('Category not found'),
          404
        );
      }
    }

    // Validate amount if being changed (cannot be 0)
    if (body.amount !== undefined) {
      const numericAmount = parseFloat(body.amount);
      if (numericAmount === 0) {
        return jsonResponse(
          ApiResponseBuilder.error('Amount cannot be 0'),
          400
        );
      }
    }

    // Build update data
    const updateData: any = {
      updated_at: new Date(),
    };

    if (body.date !== undefined) updateData.date = new Date(body.date);
    if (body.account_id !== undefined) updateData.account_id = body.account_id;
    if (body.category_id !== undefined) updateData.category_id = body.category_id;
    
    // Handle amount and type together
    // Store signed amount: negative for EXPENSE, positive for INCOME
    if (body.amount !== undefined) {
      const numericAmount = parseFloat(body.amount);
      updateData.amount = numericAmount; // Store signed amount
      updateData.type = numericAmount > 0 ? 'INCOME' : 'EXPENSE';
    }
    
    if (body.note !== undefined) updateData.note = body.note;

    // Update transaction
    const transaction = await db.transactions.update({
      where: { id: transactionId },
      data: updateData,
    });

    // Fetch account and category
    const account = await db.accounts.findUnique({
      where: { id: transaction.account_id },
      select: { name: true, icon: true },
    });

    const category = await db.categories.findUnique({
      where: { id: transaction.category_id },
      select: { name: true, icon: true, color: true },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Transaction updated successfully', {
        id: transaction.id,
        user_id: transaction.user_id,
        personal_id: Number(transaction.personal_id),
        date: transaction.date.toISOString().split('T')[0],
        account_id: transaction.account_id,
        account_name: account?.name || '',
        account_icon: account?.icon || '',
        category_id: transaction.category_id,
        category_name: category?.name || '',
        category_icon: category?.icon || '',
        category_color: category?.color || null,
        amount: transaction.amount,
        type: transaction.type,
        note: transaction.note,
        transfer_id: transaction.transfer_id,
        debt_id: transaction.debt_id,
        position: transaction.position,
        created_at: transaction.created_at.toISOString(),
        updated_at: transaction.updated_at?.toISOString() || transaction.created_at.toISOString(),
      }),
      200
    );
  } catch (error) {
    console.error('Update transaction error:', error);
    return handleValidationError(error);
  }
}

// DELETE /api/v1/transactions/:id - Delete transaction
/**
 * @summary Delete a transaction.
 * @description Authenticates the user, prevents deleting transactions that belong to transfers, and removes the entry if eligible.
 * @tag Transactions
 * @security bearerAuth
 * @param request Authenticated Next.js request.
 * @param params Promise resolving to `{ id: string }`.
 * @response 200 - Transaction deleted successfully.
 * @response 400 - Transaction is part of a transfer and cannot be removed directly.
 * @response 401 - Authentication failed.
 * @response 404 - Transaction not found.
 * @response 500 - Server error while deleting the transaction.
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

    const { id: transactionId } = validatePathParams(
      await params,
      z.object({ id: z.string().uuid() })
    );

    // Check if transaction exists and belongs to user
    const transaction = await db.transactions.findFirst({
      where: {
        id: transactionId,
        user_id: user.user_id,
      },
    });

    if (!transaction) {
      return jsonResponse(
        ApiResponseBuilder.error('Transaction not found'),
        404
      );
    }

    // Check if transaction is part of a transfer
    if (transaction.transfer_id) {
      return jsonResponse(
        ApiResponseBuilder.error('Cannot delete transaction that is part of a transfer. Delete the transfer instead.'),
        400
      );
    }

    // Delete transaction
    await db.transactions.delete({
      where: { id: transactionId },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Transaction deleted successfully', null),
      200
    );
  } catch (error) {
    console.error('Delete transaction error:', error);
    return handleValidationError(error);
  }
}
