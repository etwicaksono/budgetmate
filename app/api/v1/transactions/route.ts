import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, paginationMeta } from '@/lib/api/response';
import {
  CreateTransactionSchema,
  TransactionFilterSchema
} from '@/lib/validation/transaction';

// GET - Fetch transactions with filtering and pagination
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  // Parse and validate filter parameters
  const filterInput = Object.fromEntries(searchParams.entries());
  const filterValidation = TransactionFilterSchema.safeParse(filterInput);

  if (!filterValidation.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Invalid filter parameters',
      400,
      filterValidation.error.errors
    );
  }

  const filters = filterValidation.data;

  try {
    // Build where clause
    const where: Prisma.TransactionWhereInput = {
      user_id: user.user_id,
      deleted_at: null
    };

    // Account filter - support single ID or comma-separated IDs
    if (filters.account_id) {
      where.account_id = filters.account_id;
    } else if (filters.account_ids) {
      const accountIds = filters.account_ids.split(',').filter(id => id);
      if (accountIds.length > 0) {
        where.account_id = { in: accountIds };
      }
    }

    // Category filter - support single ID or comma-separated IDs
    if (filters.category_id) {
      where.category_id = filters.category_id;
    } else if (filters.category_ids) {
      const categoryIds = filters.category_ids.split(',').filter(id => id);
      if (categoryIds.length > 0) {
        where.category_id = { in: categoryIds };
      }
    }

    if (filters.type) {
      where.type = filters.type;
    }

    // Date range
    if (filters.start_date || filters.end_date) {
      where.date = {};
      if (filters.start_date) {
        where.date.gte = new Date(filters.start_date);
      }
      if (filters.end_date) {
        where.date.lte = new Date(filters.end_date);
      }
    }

    // Amount range
    if (filters.min_amount !== undefined || filters.max_amount !== undefined) {
      where.amount = {};
      if (filters.min_amount !== undefined) {
        where.amount.gte = filters.min_amount;
      }
      if (filters.max_amount !== undefined) {
        where.amount.lte = filters.max_amount;
      }
    }

    // Keyword search in description and payee
    // Support both 'keyword' and 'search' parameters
    const searchTerm = filters.keyword || filters.search;
    if (searchTerm) {
      where.OR = [
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { payee: { contains: searchTerm, mode: 'insensitive' } }
      ];
    }

    // Label filter
    if (filters.label_ids) {
      const labelIds = filters.label_ids.split(',').filter(id => id);
      if (labelIds.length > 0) {
        where.labels = {
          some: {
            label_id: { in: labelIds }
          }
        };
      }
    }

    // Currency filter
    if (filters.currencies) {
      const currencies = filters.currencies.split(',').filter(c => c);
      if (currencies.length > 0) {
        where.currency = { in: currencies };
      }
    }

    // Execute queries
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
              type: true
            }
          },
          account: {
            select: {
              id: true,
              name: true,
              icon: true,
              color: true,
              currency: true
            }
          },
          labels: {
            include: {
              label: {
                select: {
                  id: true,
                  name: true,
                  color: true
                }
              }
            }
          },
          transfer: {
            select: {
              id: true,
              from_account: true,
              to_account: true,
              amount: true,
              to_amount: true,
              description: true,
              currency: true,
              to_currency: true
            }
          }
        },
        orderBy: { [filters.sort_by]: filters.sort_order },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit
      }),
      prisma.transaction.count({ where })
    ]);

    // Transform response
    const transformedTransactions = transactions.map(tx => {
      const baseTransaction = {
        id: tx.id,
        date: tx.date,
        account_id: tx.account_id,
        account: tx.account,
        category_id: tx.category_id,
        category: tx.category,
        amount: tx.amount.toNumber(),
        type: tx.type,
        description: tx.description,
        currency: tx.currency,
        payee: tx.payee,
        payment_method: tx.payment_method,
        payment_status: tx.payment_status,
        reference_number: tx.reference_number,
        labels: tx.labels.map(l => l.label),
        created_at: tx.created_at,
        updated_at: tx.updated_at
      };

      // Add transfer-specific fields if this is a transfer transaction
      if (tx.transfer) {
        // For transfer_in: transaction shows DESTINATION, so to_amount should show SOURCE
        // For transfer_out: transaction shows SOURCE, so to_amount should show DESTINATION
        const isTransferIn = tx.type === 'transfer_in';
        const sourceAmount = tx.transfer.amount.toNumber();
        const destAmount = tx.transfer.to_amount?.toNumber() || tx.transfer.amount.toNumber();

        return {
          ...baseTransaction,
          transfer_id: tx.transfer.id,
          to_account_id: tx.transfer.to_account,
          // If transfer_in, to_amount should be source amount; if transfer_out, destination amount
          to_amount: isTransferIn ? sourceAmount : destAmount,
          from_account_id: tx.transfer.from_account,
          transfer_description: tx.transfer.description,
          transfer_currency: tx.transfer.currency,
          to_currency: tx.transfer.to_currency || tx.transfer.currency
        };
      }

      return baseTransaction;
    });

    return successResponse(
      transformedTransactions,
      paginationMeta(total, filters.page, filters.limit)
    );

  } catch (error) {
    console.error('Transaction fetch error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch transactions', 500);
  }
}

// POST - Create new transaction
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const validation = CreateTransactionSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        validation.error.errors
      );
    }

    const data = validation.data;

    // CRITICAL: Amount sign convention
    // Expenses are NEGATIVE, income is POSITIVE
    const finalAmount = data.type === 'expense'
      ? -Math.abs(data.amount)
      : Math.abs(data.amount);

    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: data.account_id,
        user_id: user.user_id,
        is_active: true,
        deleted_at: null
      }
    });

    if (!account) {
      return errorResponse('INVALID_ACCOUNT', 'Account not found or inactive', 404);
    }

    // Verify category belongs to user
    const category = await prisma.category.findFirst({
      where: {
        id: data.category_id,
        user_id: user.user_id,
        is_active: true
      }
    });

    if (!category) {
      return errorResponse('INVALID_CATEGORY', 'Category not found or inactive', 404);
    }

    // Verify category type matches transaction type
    if (category.type !== data.type && category.type !== "both") {
      return errorResponse(
        'CATEGORY_TYPE_MISMATCH',
        `Category type '${category.type}' does not match transaction type '${data.type}'`,
        400
      );
    }

    const transaction = await prisma.$transaction(async (tx) => {
      // Create transaction
      const created = await tx.transaction.create({
        data: {
          user_id: user.user_id,
          date: new Date(data.date),
          account_id: data.account_id,
          category_id: data.category_id,
          amount: finalAmount,
          type: data.type,
          description: data.description ?? null,
          currency: account.currency,
          payee: data.payee ?? null,
          payment_method: data.payment_method ?? null,
          payment_status: data.payment_status ?? null,
          reference_number: data.reference_number ?? null,
          created_by: user.user_id
        },
        include: {
          category: {
            select: { name: true, icon: true, color: true }
          },
          account: {
            select: { name: true, icon: true, color: true }
          }
        }
      });

      // Create label associations if provided
      if (data.label_ids && data.label_ids.length > 0) {
        // Verify labels belong to user
        const labels = await tx.label.findMany({
          where: {
            id: { in: data.label_ids },
            user_id: user.user_id
          }
        });

        if (labels.length !== data.label_ids.length) {
          throw new Error('One or more labels not found');
        }

        await tx.transactionLabel.createMany({
          data: data.label_ids.map(label_id => ({
            transaction_id: created.id,
            label_id
          }))
        });
      }

      // ✅ Balance is now calculated on-demand, no need to update

      return created;
    });

    // Transform response
    const response = {
      id: transaction.id,
      date: transaction.date,
      account_id: transaction.account_id,
      account: 'account' in transaction ? transaction.account : undefined,
      category_id: transaction.category_id,
      category: 'category' in transaction ? transaction.category : undefined,
      amount: transaction.amount.toNumber(),
      type: transaction.type,
      description: transaction.description,
      currency: transaction.currency,
      payee: transaction.payee,
      payment_method: transaction.payment_method,
      payment_status: transaction.payment_status,
      reference_number: transaction.reference_number,
      created_at: transaction.created_at
    };

    return successResponse(response, { message: 'Transaction created successfully' }, 201);

  } catch (error) {
    console.error('Transaction creation error:', error);

    if (error instanceof Error && error.message === 'One or more labels not found') {
      return errorResponse('INVALID_LABEL', error.message, 404);
    }

    return errorResponse('INTERNAL_ERROR', 'Failed to create transaction', 500);
  }
}
