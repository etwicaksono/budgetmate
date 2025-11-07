import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

// GET /api/v1/transfers/:id - Get transfer detail with linked transactions
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

    const { id: transferId } = await params;

    // Get transfer
    const transfer = await db.transfers.findFirst({
      where: {
        id: transferId,
        user_id: user.user_id,
      },
    });

    if (!transfer) {
      return jsonResponse(
        ApiResponseBuilder.error('Transfer not found'),
        404
      );
    }

    // Fetch account details
    const fromAccount = await db.accounts.findUnique({
      where: { id: transfer.from_account },
      select: { name: true, icon: true },
    });

    const toAccount = await db.accounts.findUnique({
      where: { id: transfer.to_account },
      select: { name: true, icon: true },
    });

    // Get linked transactions
    const linkedTransactions = await db.transactions.findMany({
      where: {
        transfer_id: transferId,
        user_id: user.user_id,
      },
      orderBy: { type: 'desc' }, // INCOME first, then EXPENSE
    });

    return jsonResponse(
      ApiResponseBuilder.success('Transfer retrieved successfully', {
        id: transfer.id,
        user_id: transfer.user_id,
        personal_id: Number(transfer.personal_id),
        date: transfer.date.toISOString().split('T')[0],
        from_account_id: transfer.from_account,
        from_account_name: fromAccount?.name || '',
        from_account_icon: fromAccount?.icon || '',
        to_account_id: transfer.to_account,
        to_account_name: toAccount?.name || '',
        to_account_icon: toAccount?.icon || '',
        amount: transfer.amount,
        note: transfer.note,
        position: transfer.position,
        created_at: transfer.created_at.toISOString(),
        updated_at: transfer.updated_at?.toISOString() || transfer.created_at.toISOString(),
        transactions: linkedTransactions.map(txn => ({
          id: txn.id,
          type: txn.type,
          account_id: txn.account_id,
          category_id: txn.category_id,
          amount: txn.amount,
          note: txn.note,
        })),
      }),
      200
    );
  } catch (error) {
    console.error('Get transfer error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

// PUT /api/v1/transfers/:id - Update transfer and linked transactions
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

    const { id: transferId } = await params;
    const body = await request.json();

    // Verify transfer exists and belongs to user
    const existingTransfer = await db.transfers.findFirst({
      where: {
        id: transferId,
        user_id: user.user_id,
      },
    });

    if (!existingTransfer) {
      return jsonResponse(
        ApiResponseBuilder.error('Transfer not found'),
        404
      );
    }

    // Validate amount if being changed (cannot be 0 or negative)
    if (body.amount !== undefined) {
      const numericAmount = parseFloat(body.amount);
      if (numericAmount <= 0) {
        return jsonResponse(
          ApiResponseBuilder.error('Amount must be greater than 0'),
          400
        );
      }
    }

    // Validate accounts if being changed
    if (body.from_account_id !== undefined) {
      const fromAccount = await db.accounts.findFirst({
        where: {
          id: body.from_account_id,
          user_id: user.user_id,
        },
      });

      if (!fromAccount) {
        return jsonResponse(
          ApiResponseBuilder.error('Source account not found'),
          404
        );
      }
    }

    if (body.to_account_id !== undefined) {
      const toAccount = await db.accounts.findFirst({
        where: {
          id: body.to_account_id,
          user_id: user.user_id,
        },
      });

      if (!toAccount) {
        return jsonResponse(
          ApiResponseBuilder.error('Destination account not found'),
          404
        );
      }
    }

    // Validate from and to accounts are different if both provided
    const finalFromAccountId = body.from_account_id ?? existingTransfer.from_account;
    const finalToAccountId = body.to_account_id ?? existingTransfer.to_account;
    
    if (finalFromAccountId === finalToAccountId) {
      return jsonResponse(
        ApiResponseBuilder.error('Source and destination accounts must be different'),
        400
      );
    }

    // Use Prisma transaction for atomicity
    const result = await db.$transaction(async (prisma) => {
      // Build transfer update data
      const transferUpdateData: any = {
        updated_at: new Date(),
      };

      if (body.date !== undefined) transferUpdateData.date = new Date(body.date);
      if (body.from_account_id !== undefined) transferUpdateData.from_account = body.from_account_id;
      if (body.to_account_id !== undefined) transferUpdateData.to_account = body.to_account_id;
      if (body.amount !== undefined) transferUpdateData.amount = parseFloat(body.amount);
      if (body.note !== undefined) transferUpdateData.note = body.note;

      // Update transfer
      const transfer = await prisma.transfers.update({
        where: { id: transferId },
        data: transferUpdateData,
      });

      // Get linked transactions
      const linkedTransactions = await prisma.transactions.findMany({
        where: {
          transfer_id: transferId,
          user_id: user.user_id,
        },
      });

      if (linkedTransactions.length !== 2) {
        throw new Error('Transfer must have exactly 2 linked transactions');
      }

      // Find expense and income transactions
      const expenseTransaction = linkedTransactions.find(txn => txn.type === 'EXPENSE');
      const incomeTransaction = linkedTransactions.find(txn => txn.type === 'INCOME');

      if (!expenseTransaction || !incomeTransaction) {
        throw new Error('Transfer must have one EXPENSE and one INCOME transaction');
      }

      // Build transaction update data
      const txnUpdateData: any = {
        updated_at: new Date(),
      };

      if (body.date !== undefined) txnUpdateData.date = new Date(body.date);
      if (body.amount !== undefined) txnUpdateData.amount = parseFloat(body.amount);
      if (body.note !== undefined) txnUpdateData.note = body.note;

      // Update EXPENSE transaction (from account)
      if (body.from_account_id !== undefined) {
        txnUpdateData.account_id = body.from_account_id;
      }
      await prisma.transactions.update({
        where: { id: expenseTransaction.id },
        data: txnUpdateData,
      });

      // Update INCOME transaction (to account)
      const incomeUpdateData = { ...txnUpdateData };
      if (body.to_account_id !== undefined) {
        incomeUpdateData.account_id = body.to_account_id;
      }
      await prisma.transactions.update({
        where: { id: incomeTransaction.id },
        data: incomeUpdateData,
      });

      return transfer;
    });

    // Fetch updated account details
    const fromAccount = await db.accounts.findUnique({
      where: { id: result.from_account },
      select: { name: true, icon: true },
    });

    const toAccount = await db.accounts.findUnique({
      where: { id: result.to_account },
      select: { name: true, icon: true },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Transfer updated successfully', {
        id: result.id,
        user_id: result.user_id,
        personal_id: Number(result.personal_id),
        date: result.date.toISOString().split('T')[0],
        from_account_id: result.from_account,
        from_account_name: fromAccount?.name || '',
        from_account_icon: fromAccount?.icon || '',
        to_account_id: result.to_account,
        to_account_name: toAccount?.name || '',
        to_account_icon: toAccount?.icon || '',
        amount: result.amount,
        note: result.note,
        position: result.position,
        created_at: result.created_at.toISOString(),
        updated_at: result.updated_at?.toISOString() || result.created_at.toISOString(),
      }),
      200
    );
  } catch (error) {
    console.error('Update transfer error:', error);
    return jsonResponse(
      ApiResponseBuilder.error(error instanceof Error ? error.message : 'Internal server error'),
      500
    );
  }
}

// DELETE /api/v1/transfers/:id - Delete transfer and linked transactions
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

    const { id: transferId } = await params;

    // Verify transfer exists and belongs to user
    const existingTransfer = await db.transfers.findFirst({
      where: {
        id: transferId,
        user_id: user.user_id,
      },
    });

    if (!existingTransfer) {
      return jsonResponse(
        ApiResponseBuilder.error('Transfer not found'),
        404
      );
    }

    // Use Prisma transaction for atomicity
    await db.$transaction(async (prisma) => {
      // Delete linked transactions first (due to foreign key constraint)
      await prisma.transactions.deleteMany({
        where: {
          transfer_id: transferId,
          user_id: user.user_id,
        },
      });

      // Delete transfer
      await prisma.transfers.delete({
        where: { id: transferId },
      });
    });

    return jsonResponse(
      ApiResponseBuilder.success('Transfer deleted successfully', null),
      200
    );
  } catch (error) {
    console.error('Delete transfer error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
