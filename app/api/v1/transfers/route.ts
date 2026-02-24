import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, paginationMeta } from '@/lib/api/response';
import { CreateTransferSchema } from '@/lib/validation/transfer';
import {
  getTransferDestination,
  shouldUseNullForDestination
} from '@/utils/transferUtils';

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
        include: {
          from_account_rel: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
              currency: true
            }
          },
          to_account_rel: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
              currency: true
            }
          },
          transactions: {
            select: {
              id: true,
              type: true,
              account_id: true
            }
          }
        },
        orderBy: { [sort_by]: sort_order },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.transfer.count({ where })
    ]);

    // Transform response using helper functions
    const transformedTransfers = transfers.map(transfer => {
      const destination = getTransferDestination({
        id: transfer.id,
        amount: transfer.amount.toNumber(),
        to_amount: transfer.to_amount?.toNumber() ?? null,
        currency: transfer.currency,
        to_currency: transfer.to_currency ?? null
      });

      return {
        id: transfer.id,
        date: transfer.date,
        from_account_id: transfer.from_account,
        from_account: transfer.from_account_rel,
        to_account_id: transfer.to_account,
        to_account: transfer.to_account_rel,
        amount: transfer.amount.toNumber(),
        to_amount: destination.amount,
        description: transfer.description,
        currency: transfer.currency,
        to_currency: destination.currency,
        transactions: transfer.transactions,
        created_at: transfer.created_at,
        updated_at: transfer.updated_at
      };
    });

    return successResponse(
      transformedTransfers,
      paginationMeta(total, page, limit)
    );

  } catch (error) {
    console.error('Transfer fetch error:', error);
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

    // Use to_amount if provided (for currency conversion), otherwise use amount
    const destinationAmount = data.to_amount ?? data.amount;
    const destinationCurrency = data.to_currency ?? fromAccount.currency;

    // Optimization: Store NULL for to_amount and to_currency if same as source
    // This reduces storage and clearly indicates same-currency transfers
    const useNullForDestination = shouldUseNullForDestination(
      fromAccount.currency,
      destinationCurrency,
      data.to_amount,
      data.amount
    );

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
          // Store NULL if same currency and same amount (optimization)
          to_amount: useNullForDestination ? null : destinationAmount,
          description: data.description ?? null,
          currency: fromAccount.currency, // Always use actual account currency
          // Store NULL if same as source currency (optimization)
          to_currency: useNullForDestination ? null : destinationCurrency,
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
          currency: fromAccount.currency,
          date: new Date(data.date),
          description: data.description ?? `Transfer to ${toAccount.name}`,
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
          amount: Math.abs(destinationAmount), // Positive for income
          currency: toAccount.currency,
          date: new Date(data.date),
          description: data.description ?? `Transfer from ${fromAccount.name}`,
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
      include: {
        from_account_rel: {
          select: { name: true, icon: true, color: true, currency: true }
        },
        to_account_rel: {
          select: { name: true, icon: true, color: true, currency: true }
        },
        transactions: {
          select: { id: true, type: true, amount: true, account_id: true }
        }
      }
    });

    if (!createdTransfer) {
      throw new Error('Failed to fetch created transfer');
    }

    // Use helper to compute destination values
    const destination = getTransferDestination({
      id: createdTransfer.id,
      amount: createdTransfer.amount.toNumber(),
      to_amount: createdTransfer.to_amount?.toNumber() ?? null,
      currency: createdTransfer.currency,
      to_currency: createdTransfer.to_currency ?? null
    });

    const response = {
      id: createdTransfer.id,
      date: createdTransfer.date,
      from_account_id: createdTransfer.from_account,
      from_account: createdTransfer.from_account_rel,
      to_account_id: createdTransfer.to_account,
      to_account: createdTransfer.to_account_rel,
      amount: createdTransfer.amount.toNumber(),
      to_amount: destination.amount,
      description: createdTransfer.description,
      currency: createdTransfer.currency,
      to_currency: destination.currency,
      transactions: createdTransfer.transactions.map(t => ({
        ...t,
        amount: t.amount.toNumber()
      })),
      created_at: createdTransfer.created_at
    };

    return successResponse(response, { message: 'Transfer created successfully' }, 201);

  } catch (error) {
    console.error('Transfer creation error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create transfer', 500);
  }
}
