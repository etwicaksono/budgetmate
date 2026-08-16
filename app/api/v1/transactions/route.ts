import { NextRequest, NextResponse } from 'next/server';
import { Prisma, TransactionType } from '@prisma/client';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse, paginationMeta } from '@/lib/api/response';
import { logError } from '@/lib/logger';
import { orderRowsByIds, selectAbsAmountPageIds } from '@/lib/api/transactionSort';
import {
  CreateTransactionSchema,
  TransactionFilterSchema
} from '@/lib/validation/transaction';

/** Custom error thrown when submitted label IDs don't all belong to the authenticated user. */
class LabelNotFoundError extends Error {
  constructor() {
    super('One or more labels not found');
    this.name = 'LabelNotFoundError';
  }
}

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
    // Build where clause — AND is initialized upfront to avoid repeated guards
    const where: Prisma.TransactionWhereInput = {
      user_id: user.user_id,
      deleted_at: null,
      AND: [] as Prisma.TransactionWhereInput[]
    };

    // Account filter - support single ID or comma-separated IDs (max 50)
    if (filters.account_id) {
      where.account_id = filters.account_id;
    } else if (filters.account_ids) {
      const accountIds = filters.account_ids.split(',').filter(Boolean).slice(0, 50);
      if (accountIds.length > 0) {
        where.account_id = { in: accountIds };
      }
    }

    // Category filter - support single ID or comma-separated IDs (max 50)
    if (filters.category_id) {
      where.category_id = filters.category_id;
    } else if (filters.category_ids) {
      const categoryIds = filters.category_ids.split(',').filter(Boolean).slice(0, 50);
      if (categoryIds.length > 0) {
        where.category_id = { in: categoryIds };
      }
    }

    if (filters.type) {
      where.type = filters.type as TransactionType;
    } else {
      const includeTypes: TransactionType[] = [];
      const excludeTypes: TransactionType[] = [];

      if (filters.transfer_option === 'only') {
        includeTypes.push(TransactionType.transfer_in, TransactionType.transfer_out);
      } else if (filters.transfer_option === 'exclude') {
        excludeTypes.push(TransactionType.transfer_in, TransactionType.transfer_out);
      }

      if (filters.debt_option === 'only') {
        // Two 'only' options are mutually exclusive — we can't include two disjoint sets simultaneously
        if (filters.transfer_option === 'only') {
          return errorResponse(
            'INVALID_FILTER',
            "Cannot combine transfer_option='only' and debt_option='only' simultaneously",
            400
          );
        }
        includeTypes.push(TransactionType.debt_in, TransactionType.debt_out);
      } else if (filters.debt_option === 'exclude') {
        excludeTypes.push(TransactionType.debt_in, TransactionType.debt_out);
      }

      if (includeTypes.length > 0 && excludeTypes.length > 0) {
        // e.g. transfer_option=only + debt_option=exclude: keep only transfers, then remove debt types
        // (debt types wouldn't be in includeTypes anyway, but this handles future combinations cleanly)
        const filtered = includeTypes.filter(t => !excludeTypes.includes(t));
        if (filtered.length > 0) where.type = { in: filtered as TransactionType[] };
      } else if (includeTypes.length > 0) {
        where.type = { in: includeTypes };
      } else if (excludeTypes.length > 0) {
        where.type = { notIn: excludeTypes };
      }
    }

    // Draft option (default: exclude)
    if (filters.draft_option === 'only') {
      where.is_draft = true;
    } else if (filters.draft_option === 'include') {
      // include both true and false, no filter needed
    } else {
      where.is_draft = false;
    }

    // Date range
    if (filters.start_date || filters.end_date) {
      where.date = {};
      if (filters.start_date) {
        where.date.gte = new Date(filters.start_date);
      }
      if (filters.end_date) {
        // Advance to end-of-day (23:59:59.999 UTC) so the full calendar day is included
        const endOfDay = new Date(filters.end_date);
        endOfDay.setUTCHours(23, 59, 59, 999);
        where.date.lte = endOfDay;
      }
    }

    // Amount range (filtering by absolute value)
    if (filters.min_amount !== undefined || filters.max_amount !== undefined) {
      const min = filters.min_amount ?? 0;
      const max = filters.max_amount ?? Number.MAX_SAFE_INTEGER;

      // Match positive range [min, max] OR strictly-negative range [-max, -min).
      // Using `lt: -min` (strict upper bound) on the negative branch ensures zero-amount
      // transactions only appear in the positive branch, preventing double-inclusion when min=0.
      (where.AND as Prisma.TransactionWhereInput[]).push({
        OR: [
          { amount: { gte: min, lte: max } },
          { amount: { gte: -max, lt: min > 0 ? -min : 0 } }
        ]
      });
    }

    // Keyword search in description and payee (both 'keyword' and 'search' are accepted).
    // Minimum 2 chars enforced by schema; trim() here is a belt-and-suspenders guard.
    const searchTerm = (filters.keyword || filters.search)?.trim();
    if (searchTerm) {
      (where.AND as Prisma.TransactionWhereInput[]).push({
        OR: [
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { payee: { contains: searchTerm, mode: 'insensitive' } }
        ]
      });
    }

    // Label filter (max 50 IDs)
    if (filters.label_ids) {
      const labelIds = filters.label_ids.split(',').filter(Boolean).slice(0, 50);
      if (labelIds.length > 0) {
        where.labels = {
          some: {
            label_id: { in: labelIds }
          }
        };
      }
    }

    // Excluded label filter (max 50 IDs) — pushed into AND so it composes with the
    // include filter above instead of overwriting `where.labels`
    if (filters.exclude_label_ids) {
      const excludeLabelIds = filters.exclude_label_ids.split(',').filter(Boolean).slice(0, 50);
      if (excludeLabelIds.length > 0) {
        (where.AND as Prisma.TransactionWhereInput[]).push({
          labels: {
            none: {
              label_id: { in: excludeLabelIds }
            }
          }
        });
      }
    }

    // Prisma cannot order by abs(amount), so magnitude ordering is resolved here:
    // fetch the matching ids with their amounts, rank them, then load just that page.
    // Ranking has to happen over the whole result set — sorting an already-paginated
    // page would only shuffle rows within it and break paging.
    let absAmountPageIds: string[] | null = null;
    if (filters.sort_by === 'abs_amount') {
      const amountRows = await prisma.transaction.findMany({
        where,
        select: { id: true, amount: true }
      });

      absAmountPageIds = selectAbsAmountPageIds(
        amountRows.map(row => ({ id: row.id, amount: row.amount.toNumber() })),
        filters.sort_order,
        filters.page,
        filters.limit
      );
    }

    const pageQuery: Prisma.TransactionFindManyArgs =
      absAmountPageIds === null
        ? {
            where,
            orderBy: { [filters.sort_by]: filters.sort_order },
            skip: (filters.page - 1) * filters.limit,
            take: filters.limit
          }
        : // Already paginated above; `in` returns rows in arbitrary order, so the
          // ranking is reapplied after the fetch.
          { where: { id: { in: absAmountPageIds } } };

    // Execute all queries in parallel — single groupBy on type covers aggregation needs.
    const [transactions, total, typeGrouped] = await Promise.all([
      prisma.transaction.findMany({
        ...pageQuery,
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
              color: true
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
              description: true
            }
          }
        }
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true }
      })
    ]);

    const orderedTransactions =
      absAmountPageIds === null ? transactions : orderRowsByIds(transactions, absAmountPageIds);

    // Aggregate income/expense in IDR.
    // Transfers and debts are excluded from net intentionally — they net to zero across accounts.
    const totals: Record<string, { income: number; expense: number; net: number }> = {
      IDR: { income: 0, expense: 0, net: 0 }
    };
    const idrTotals = totals['IDR']!;
    for (const row of typeGrouped) {
      const amount = row._sum.amount?.toNumber() ?? 0;
      if (row.type === 'income') {
        idrTotals.income += amount;
      } else if (row.type === 'expense') {
        idrTotals.expense += amount; // already negative
      }
    }

    // Compute net = income + expense (expense is already negative)
    idrTotals.net = idrTotals.income + idrTotals.expense;


    // Transform response
    const transformedTransactions = orderedTransactions.map(tx => {
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
        payee: tx.payee,
        payment_method: tx.payment_method,
        payment_status: tx.payment_status,
        labels: tx.labels.map(l => l.label),
        debt_id: tx.debt_id,
        is_draft: tx.is_draft,
        created_at: tx.created_at,
        updated_at: tx.updated_at
      };

      if (tx.transfer) {
        return {
          ...baseTransaction,
          transfer_id: tx.transfer.id,
          to_account_id: tx.transfer.to_account,
          from_account_id: tx.transfer.from_account,
          transfer_description: tx.transfer.description
        };
      }

      return baseTransaction;
    });

    return successResponse(
      transformedTransactions,
      {
        ...paginationMeta(total, filters.page, filters.limit),
        totals,
      }
    );

  } catch (error) {
    logError('Transaction fetch error:', error);
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
    const transactionType = data.type as TransactionType;

    // CRITICAL: Amount sign convention
    // Expenses are NEGATIVE, income is POSITIVE
    const finalAmount = transactionType === TransactionType.expense
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

    // Verify category belongs to user and is active.
    // Category uses is_active as its soft-delete flag (no deleted_at column).
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
    // Categories with type 'both' accept both income and expense transactions
    if (category.type !== 'both' && category.type !== transactionType) {
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
          type: transactionType,
          description: data.description ?? null,
          payee: data.payee ?? null,
          payment_method: data.payment_method ?? null,
          payment_status: data.payment_status ?? null,
          is_draft: data.is_draft ?? false,
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
      let createdLabels: Array<{ id: string; name: string; color: string }> = [];
      if (data.label_ids && data.label_ids.length > 0) {
        // Deduplicate to prevent false ownership mismatch and unique constraint violations
        const uniqueLabelIds = [...new Set(data.label_ids)];

        // Verify all labels belong to user
        const labels = await tx.label.findMany({
          where: {
            id: { in: uniqueLabelIds },
            user_id: user.user_id
          },
          select: { id: true, name: true, color: true }
        });

        if (labels.length !== uniqueLabelIds.length) {
          throw new LabelNotFoundError();
        }

        await tx.transactionLabel.createMany({
          data: uniqueLabelIds.map(label_id => ({
            transaction_id: created.id,
            label_id
          }))
        });

        createdLabels = labels;
      }

      // ✅ Balance is now calculated on-demand, no need to update

      // Expose the resolved labels so the client can render badges right away.
      return { ...created, labels: createdLabels };
    });

    // Transform response
    const response = {
      id: transaction.id,
      date: transaction.date,
      account_id: transaction.account_id,
      account: transaction.account,
      category_id: transaction.category_id,
      category: transaction.category,
      amount: transaction.amount.toNumber(),
      type: transaction.type,
      description: transaction.description,
      payee: transaction.payee,
      payment_method: transaction.payment_method,
      payment_status: transaction.payment_status,
      labels: transaction.labels,
      is_draft: transaction.is_draft,
      created_at: transaction.created_at
    };

    return successResponse(response, { message: 'Transaction created successfully' }, 201);

  } catch (error) {
    logError('Transaction creation error:', error);

    if (error instanceof LabelNotFoundError) {
      return errorResponse('INVALID_LABEL', error.message, 404);
    }

    return errorResponse('INTERNAL_ERROR', 'Failed to create transaction', 500);
  }
}
