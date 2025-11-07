import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

// GET /api/v1/accounts/:id - Get account detail
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

    const { id: accountId } = await params;

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

    return jsonResponse(
      ApiResponseBuilder.success('Account retrieved successfully', {
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
      }),
      200
    );
  } catch (error) {
    console.error('Get account error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

// PUT /api/v1/accounts/:id - Update account
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

    const { id: accountId } = await params;
    const body = await request.json();

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

    if (body.name !== undefined) updateData.name = body.name;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.usability !== undefined) updateData.usability = body.usability;
    if (body.account_type !== undefined) updateData.account_type = body.account_type;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.initial_amount !== undefined) updateData.initial_amount = body.initial_amount;
    if (body.group_id !== undefined) updateData.group_id = body.group_id;

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

    return jsonResponse(
      ApiResponseBuilder.success('Account updated successfully', {
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
      }),
      200
    );
  } catch (error) {
    console.error('Update account error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

// DELETE /api/v1/accounts/:id - Delete account
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

    const { id: accountId } = await params;

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
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
