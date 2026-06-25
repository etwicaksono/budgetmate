import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, paginationMeta } from '@/lib/api/response';
import { CreateTransferSchema } from '@/lib/validation/transfer';
import { logError } from '@/lib/logger';

// GET - Fetch all transfers
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const from_account = searchParams.get('from_account');
  const to_account = searchParams.get('to_account');
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');
  const sort_by = searchParams.get('sort_by') || 'date';
  const sort_order = (searchParams.get('sort_order') || 'desc') as 'asc' | 'desc';

  try {
    const where: Prisma.TransferWhereInput = {
      user_id: user.user_id
    };

    if (from_account) {
      where.from_account = from_account;
    }

    if (to_account) {
      where.to_account = to_account;
    }

    // Date range
    if (start_date || end_date) {
      where.date = {};
      if (start_date) {
        where.date.gte = new Date(start_date);
      }
      if (end_date) {
        where.date.lte = new Date(end_date);
      }
    }

    // Execute queries
    const [transfers, total] = await Promise.all([
      prisma.transfer.findMany({
        where,

        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.transfer.count({ where })
    ]);

    // Transform response
    const transformedTransfers = await Promise.all(transfers.map(async transfer => {
      const from_account_rel = await prisma.account.findUnique({ where: { id: transfer.from_account }, select: { id: true, name: true, icon: true, color: true } });
      const to_account_rel = await prisma.account.findUnique({ where: { id: transfer.to_account }, select: { id: true, name: true, icon: true, color: true } });
      const transactions_rel = await prisma.transaction.findMany({ where: { transfer_id: transfer.id }, select: { id: true, type: true, account_id: true } });

      return {
        id: transfer.id,
        date: transfer.date,
        from_account_id: transfer.from_account,
        from_account: from_account_rel,
        to_account_id: transfer.to_account,
        to_account: to_account_rel,
        amount: transfer.amount.toNumber(),
        description: transfer.description,
        transactions: transactions_rel,
        created_at: transfer.created_at,
        updated_at: transfer.updated_at
      };
    }));

    return successResponse(
      transformedTransfers,
      paginationMeta(total, page, limit)
    );

  } catch (error) {
    logError('Transfer fetch error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch transfers', 500);
  }
}

// POST - Create new transfer
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const validation = CreateTransferSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        validation.error.errors
      );
    }

    const data = validation.data;

    // Verify both accounts belong to user and are active
    const [fromAccount, toAccount] = await Promise.all([
      prisma.account.findFirst({
        where: {
          id: data.from_account_id,
          user_id: user.user_id,
          is_active: true,
          deleted_at: null
        }
      }),
      prisma.account.findFirst({
        where: {
          id: data.to_account_id,
          user_id: user.user_id,
          is_active: true,
          deleted_at: null
        }
      })
    ]);

    if (!fromAccount) {
      return errorResponse('INVALID_FROM_ACCOUNT', 'Source account not found or inactive', 404);
    }

    if (!toAccount) {
      return errorResponse('INVALID_TO_ACCOUNT', 'Destination account not found or inactive', 404);
    }

    // Create transfer amounts directly using the source amount.
    // Create transfer and linked transactions in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create transfer record with smart defaults
      const transfer = await tx.transfer.create({
        data: {
          user_id: user.user_id,
          date: new Date(data.date),
          from_account: data.from_account_id,
          to_account: data.to_account_id,
          amount: data.amount,
          description: data.description ?? null,
          created_by: user.user_id
        }
      });

      // 2. Create expense transaction in source account
      await tx.transaction.create({
        data: {
          user_id: user.user_id,
          account_id: data.from_account_id,
          type: 'transfer_out',
          amount: -Math.abs(data.amount), // Negative for expense
          date: new Date(data.date),
          description: data.description ?? `Transfer from ${fromAccount.name} to ${toAccount.name}`,
          transfer_id: transfer.id,
          created_by: user.user_id
        }
      });

      // 3. Create income transaction in destination account
      await tx.transaction.create({
        data: {
          user_id: user.user_id,
          account_id: data.to_account_id,
          type: 'transfer_in',
          amount: Math.abs(data.amount), // Positive for income
          date: new Date(data.date),
          description: data.description ?? `Transfer from ${fromAccount.name} to ${toAccount.name}`,
          transfer_id: transfer.id,
          created_by: user.user_id
        }
      });

      // ✅ Balance is now calculated on-demand, no need to update

      return transfer;
    });


    if (!result) {
      throw new Error('Failed to create transfer');
    }

    // Fetch complete transfer with relations
    const createdTransfer = await prisma.transfer.findUnique({
      where: { id: result.id },

    });

    if (!createdTransfer) {
      throw new Error('Failed to fetch created transfer');
    }

    const from_account_rel = await prisma.account.findUnique({ where: { id: createdTransfer.from_account }, select: { name: true, icon: true, color: true } });
    const to_account_rel = await prisma.account.findUnique({ where: { id: createdTransfer.to_account }, select: { name: true, icon: true, color: true } });
    const transactions_rel = await prisma.transaction.findMany({ where: { transfer_id: createdTransfer.id }, select: { id: true, type: true, amount: true, account_id: true } });

    const response = {
      id: createdTransfer.id,
      date: createdTransfer.date,
      from_account_id: createdTransfer.from_account,
      from_account: from_account_rel,
      to_account_id: createdTransfer.to_account,
      to_account: to_account_rel,
      amount: createdTransfer.amount.toNumber(),
      description: createdTransfer.description,
      transactions: transactions_rel.map((t) => ({
        ...t,
        amount: Number(t.amount)
      })),
      created_at: createdTransfer.created_at
    };

    return successResponse(response, { message: 'Transfer created successfully' }, 201);

  } catch (error) {
    logError('Transfer creation error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create transfer', 500);
  }
}
