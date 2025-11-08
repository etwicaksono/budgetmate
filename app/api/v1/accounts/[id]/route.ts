import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateBody, validatePathParams, handleValidationError } from '@/lib/validation';
import { UpdateAccountRequestSchema, AccountSchema } from '@/schemas/accounts/account.schema';
import { z } from 'zod';

// GET /api/v1/accounts/:id - Get account detail
/**
 * @summary Get account by ID
 * @description Retrieves a specific account by ID for the authenticated user. Calculates current balance by aggregating all transactions (INCOME adds, EXPENSE subtracts) with the initial amount. Only returns accounts owned by the current user.
 * @tag Accounts
 * @security bearerAuth
 * @param request Authenticated request
 * @param params Route params with account ID
 * @response 200 - Account retrieved successfully: `{ success: true, message: "Account retrieved successfully", data: { id: string, user_id: string, personal_id: number, name: string, icon: string, active: boolean, usability: string, account_type: string, color: string, initial_amount: number, balance: number, group_id: string|null, position: any, created_at: string, updated_at: string } }`
 * @response 401 - Authentication failed: `{ success: false, message: "Unauthorized" }`
 * @response 404 - Account not found: `{ success: false, message: "Account not found" }`
 * @response 500 - Internal server error: `{ success: false, message: "Internal server error" }`
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
    const { id: accountId } = validatePathParams(
      await params,
      z.object({ id: z.string().uuid() })
    );

    // Get account
    const account = await db.accounts.findFirst({
      where: {
        id: accountId,
        user_id: user.user_id,
      },
    });

    if (!account) {
      return jsonResponse(
        ApiResponseBuilder.error('Account not found'),
        404
      );
    }

    // Calculate balance
    const transactions = await db.transactions.findMany({
      where: { account_id: account.id },
      select: {
        type: true,
        amount: true,
      },
    });

    const balance = transactions.reduce((sum, txn) => {
      return txn.type === 'INCOME' ? sum + txn.amount : sum - txn.amount;
    }, account.initial_amount || 0);

    const responseData = {
      id: account.id,
      user_id: account.user_id,
      personal_id: Number(account.personal_id),
      name: account.name,
      icon: account.icon,
      active: account.active,
      usability: account.usability,
      account_type: account.account_type,
      color: account.color,
      initial_amount: account.initial_amount,
      balance,
      group_id: account.group_id,
      position: account.position,
      created_at: account.created_at.toISOString(),
      updated_at: account.updated_at?.toISOString() || account.created_at.toISOString(),
    };

    // Validate response data
    const validatedData = AccountSchema.parse(responseData);

    return jsonResponse(
      ApiResponseBuilder.success('Account retrieved successfully', validatedData),
      200
    );
  } catch (error) {
    console.error('Get account error:', error);
    return handleValidationError(error);
  }
}

// PUT /api/v1/accounts/:id - Update account
/**
 * @summary Update account details
 * @description Updates an existing account's attributes. Only the account owner can update. Supports partial updates - only provided fields are modified. Returns updated account with recalculated balance.
 * @tag Accounts
 * @security bearerAuth
 * @bodyContent {application/json} { name?: string, icon?: string, active?: boolean, usability?: string, account_type?: string, color?: string, initial_amount?: number, group_id?: string }
 * @param request Authenticated request with update data
 * @param params Route params with account ID
 * @response 200 - Account updated successfully: `{ success: true, message: "Account updated successfully", data: { id: string, user_id: string, personal_id: number, name: string, icon: string, active: boolean, usability: string, account_type: string, color: string, initial_amount: number, balance: number, group_id: string|null, position: any, created_at: string, updated_at: string } }`
 * @response 401 - Authentication failed: `{ success: false, message: "Unauthorized" }`
 * @response 404 - Account not found: `{ success: false, message: "Account not found" }`
 * @response 500 - Internal server error: `{ success: false, message: "Internal server error" }`
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
    const { id: accountId } = validatePathParams(
      await params,
      z.object({ id: z.string().uuid() })
    );

    // Validate request body
    const body = await validateBody(request, UpdateAccountRequestSchema);

    // Check if account exists and belongs to user
    const existingAccount = await db.accounts.findFirst({
      where: {
        id: accountId,
        user_id: user.user_id,
      },
    });

    if (!existingAccount) {
      return jsonResponse(
        ApiResponseBuilder.error('Account not found'),
        404
      );
    }

    // Build update data
    const updateData: any = {
      updated_at: new Date(),
    };

    if (body.name !== undefined) {updateData.name = body.name;}
    if (body.icon !== undefined) {updateData.icon = body.icon;}
    if (body.active !== undefined) {updateData.active = body.active;}
    if (body.usability !== undefined) {updateData.usability = body.usability;}
    if (body.account_type !== undefined) {updateData.account_type = body.account_type;}
    if (body.color !== undefined) {updateData.color = body.color;}
    if (body.initial_amount !== undefined) {updateData.initial_amount = body.initial_amount;}
    if (body.group_id !== undefined) {updateData.group_id = body.group_id;}

    // Update account
    const account = await db.accounts.update({
      where: { id: accountId },
      data: updateData,
    });

    // Calculate balance
    const transactions = await db.transactions.findMany({
      where: { account_id: account.id },
      select: {
        type: true,
        amount: true,
      },
    });

    const balance = transactions.reduce((sum, txn) => {
      return txn.type === 'INCOME' ? sum + txn.amount : sum - txn.amount;
    }, account.initial_amount || 0);

    const responseData = {
      id: account.id,
      user_id: account.user_id,
      personal_id: Number(account.personal_id),
      name: account.name,
      icon: account.icon,
      active: account.active,
      usability: account.usability,
      account_type: account.account_type,
      color: account.color,
      initial_amount: account.initial_amount,
      balance,
      group_id: account.group_id,
      position: account.position,
      created_at: account.created_at.toISOString(),
      updated_at: account.updated_at?.toISOString() || account.created_at.toISOString(),
    };

    // Validate response data
    const validatedData = AccountSchema.parse(responseData);

    return jsonResponse(
      ApiResponseBuilder.success('Account updated successfully', validatedData),
      200
    );
  } catch (error) {
    console.error('Update account error:', error);
    return handleValidationError(error);
  }
}

// DELETE /api/v1/accounts/:id - Delete account
/**
 * @summary Delete account
 * @description Permanently deletes an account. Only the account owner can delete. Validates that no transactions exist for the account before deletion. This action cannot be undone.
 * @tag Accounts
 * @security bearerAuth
 * @param request Authenticated request
 * @param params Route params with account ID
 * @response 200 - Account deleted successfully: `{ success: true, message: "Account deleted successfully", data: null }`
 * @response 400 - Cannot delete account with transactions: `{ success: false, message: "Cannot delete account with existing transactions" }`
 * @response 401 - Authentication failed: `{ success: false, message: "Unauthorized" }`
 * @response 404 - Account not found: `{ success: false, message: "Account not found" }`
 * @response 500 - Internal server error: `{ success: false, message: "Internal server error" }`
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
    const { id: accountId } = validatePathParams(
      await params,
      z.object({ id: z.string().uuid() })
    );

    // Check if account exists and belongs to user
    const account = await db.accounts.findFirst({
      where: {
        id: accountId,
        user_id: user.user_id,
      },
    });

    if (!account) {
      return jsonResponse(
        ApiResponseBuilder.error('Account not found'),
        404
      );
    }

    // Check if account has transactions
    const transactionCount = await db.transactions.count({
      where: { account_id: accountId },
    });

    if (transactionCount > 0) {
      return jsonResponse(
        ApiResponseBuilder.error('Cannot delete account with existing transactions'),
        400
      );
    }

    // Delete account
    await db.accounts.delete({
      where: { id: accountId },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Account deleted successfully', null),
      200
    );
  } catch (error) {
    console.error('Delete account error:', error);
    return handleValidationError(error);
  }
}
