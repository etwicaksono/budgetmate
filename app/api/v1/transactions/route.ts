import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateBody, handleValidationError } from '@/lib/validation';
import { CreateTransactionRequestSchema } from '@/schemas/transactions/transaction.schema';

type SortValue =
  | 'timeAsc'
  | 'timeDesc'
  | 'amountAsc'
  | 'amountDesc'
  | 'absAmountAsc'
  | 'absAmountDesc';

// GET /api/v1/transactions - List transactions with filters
/**
 * @summary List transactions with advanced filters.
 * @description Requires bearer auth and honors query parameters for accounts, categories, date/amount ranges, keyword search, sort order, and pagination, returning formatted transactions plus metadata.
 * @tag Transactions
 * @security bearerAuth
 * @param request Authenticated Next.js request containing query params such as `account_ids`, `category_ids`, `type`, `start_date`, `end_date`, `sort`, `limit`, and `offset`.
 * @response 200 - Transactions retrieved successfully with pagination summary.
 * @response 401 - Authentication failed.
 * @response 500 - Server error while querying transactions.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const parseListParam = (value: string | null): string[] =>
      value
        ? value
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0)
        : [];
    const account_id = searchParams.get('account_id');
    const accountIdsParam = parseListParam(searchParams.get('account_ids'));
    const accountNamesParam = parseListParam(searchParams.get('account_names'));
    const category_id = searchParams.get('category_id');
    const categoryIdsParam = parseListParam(searchParams.get('category_ids'));
    const categoryNamesParam = parseListParam(searchParams.get('category_names'));
    const type = searchParams.get('type');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const min_amount = searchParams.get('min_amount');
    const max_amount = searchParams.get('max_amount');
    const search = searchParams.get('search');
    const keywordParam = search ?? searchParams.get('keyword');
    const keyword = keywordParam && keywordParam.length > 0 ? keywordParam : undefined;
    const sort = (searchParams.get('sort') as SortValue | null) ?? 'timeDesc';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const accountIdFilters = new Set<string>();
    if (account_id) {accountIdFilters.add(account_id);}
    accountIdsParam.forEach((id) => accountIdFilters.add(id));
    if (accountNamesParam.length > 0) {
      const matchingAccounts = await db.accounts.findMany({
        where: {
          user_id: user.user_id,
          name: { in: accountNamesParam },
        },
        select: { id: true },
      });
      matchingAccounts.forEach((account) => accountIdFilters.add(String(account.id)));
    }

    const categoryIdFilters = new Set<string>();
    if (category_id) {categoryIdFilters.add(category_id);}
    categoryIdsParam.forEach((id) => categoryIdFilters.add(id));
    if (categoryNamesParam.length > 0) {
      const matchingCategories = await db.categories.findMany({
        where: {
          user_id: user.user_id,
          name: { in: categoryNamesParam },
        },
        select: { id: true },
      });
      matchingCategories.forEach((category) => categoryIdFilters.add(String(category.id)));
    }

    // Build where clause
    const where: any = {
      user_id: user.user_id,
    };

    if (accountIdFilters.size === 1) {
      where.account_id = Array.from(accountIdFilters)[0];
    } else if (accountIdFilters.size > 1) {
      where.account_id = { in: Array.from(accountIdFilters) };
    }

    if (categoryIdFilters.size === 1) {
      where.category_id = Array.from(categoryIdFilters)[0];
    } else if (categoryIdFilters.size > 1) {
      where.category_id = { in: Array.from(categoryIdFilters) };
    }
    if (type) {where.type = type;}

    // Date range filter
    if (start_date || end_date) {
      where.date = {};
      if (start_date) {
        const start = new Date(start_date);
        start.setHours(0, 0, 0, 0);
        where.date.gte = start;
      }
      if (end_date) {
        const end = new Date(end_date);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    // Amount range filter
    if (min_amount || max_amount) {
      const minVal = min_amount ? parseFloat(min_amount) : undefined;
      const maxVal = max_amount ? parseFloat(max_amount) : undefined;
      const amountFilters: Array<Record<string, unknown>> = [];

      if (minVal !== undefined) {
        amountFilters.push({
          OR: [
            { amount: { gte: minVal } },
            { amount: { lte: -minVal } },
          ],
        });
      }

      if (maxVal !== undefined) {
        amountFilters.push({
          OR: [
            { amount: { lte: maxVal } },
            { amount: { gte: -maxVal } },
          ],
        });
      }

      if (amountFilters.length > 0) {
        where.AND = [...(where.AND ?? []), ...amountFilters];
      }
    }

    // Keyword search in notes
    if (keyword) {
      where.note = {
        contains: keyword,
        mode: 'insensitive',
      };
    }

    let orderBy: Array<Record<string, 'asc' | 'desc'>> = [];
    switch (sort) {
      case 'timeAsc':
        orderBy = [
          { date: 'asc' },
          { created_at: 'asc' },
        ];
        break;
      case 'amountAsc':
        orderBy = [{ amount: 'asc' }];
        break;
      case 'amountDesc':
        orderBy = [{ amount: 'desc' }];
        break;
      case 'timeDesc':
      case 'absAmountAsc':
      case 'absAmountDesc':
      default:
        orderBy = [
          { date: 'desc' },
          { created_at: 'desc' },
        ];
        break;
    }

    console.log('[transactions] executing findMany with:', {
      where,
      orderBy,
      skip: offset,
      take: limit,
    });

    // Get transactions
    const transactions = await db.transactions.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
    });
    console.log('[transactions] prisma returned count:', transactions.length);

    if (sort === 'absAmountAsc' || sort === 'absAmountDesc') {
      transactions.sort((a, b) => {
        const diff = Math.abs(Number(a.amount)) - Math.abs(Number(b.amount));
        return sort === 'absAmountAsc' ? diff : -diff;
      });
    }

    // Get max personal_id for caching
    console.log('[transactions] maxPersonalId query params:', {
      userId: user.user_id,
      limit: 1,
      offset: 0,
    });
    const maxPersonalIdResult = await db.transactions.findFirst({
      where: { user_id: user.user_id },
      orderBy: { personal_id: 'desc' },
      select: { personal_id: true },
    });

    const maxPersonalId = maxPersonalIdResult?.personal_id
      ? Number(maxPersonalIdResult.personal_id)
      : 0;

    // Get unique account IDs and category IDs
    const accountIds = Array.from(new Set(transactions.map(t => t.account_id)));
    const categoryIds = Array.from(new Set(transactions.map(t => t.category_id)));

    // Fetch accounts and categories
    const accounts = await db.accounts.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true, icon: true },
    });

    const categories = await db.categories.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, icon: true, color: true },
    });

    // Create maps for quick lookup
    const accountMap = new Map(accounts.map(a => [a.id, a]));
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const formattedTransactions = transactions.map((txn) => {
      const account = accountMap.get(txn.account_id);
      const category = categoryMap.get(txn.category_id);

      return {
        id: txn.id,
        user_id: txn.user_id,
        personal_id: Number(txn.personal_id),
        date: txn.date.toISOString().split('T')[0], // YYYY-MM-DD
        account_id: txn.account_id,
        account_name: account?.name || '',
        account_icon: account?.icon || '',
        category_id: txn.category_id,
        category_name: category?.name || '',
        category_icon: category?.icon || '',
        category_color: category?.color || null,
        amount: txn.amount,
        type: txn.type,
        note: txn.note,
        transfer_id: txn.transfer_id,
        debt_id: txn.debt_id,
        position: txn.position,
        created_at: txn.created_at.toISOString(),
        updated_at: txn.updated_at?.toISOString() || txn.created_at.toISOString(),
      };
    });

    return jsonResponse(
      ApiResponseBuilder.success('Transactions retrieved successfully', formattedTransactions, {
        max_personal_id: maxPersonalId,
        total: formattedTransactions.length,
        limit,
        offset,
      }),
      200
    );
  } catch (error) {
    console.error('Get transactions error:', error);
    return handleValidationError(error);
  }
}

// POST /api/v1/transactions - Create new transaction
/**
 * @summary Create a transaction record.
 * @description Authenticates the user, validates `personal_id`, `date`, `account_id`, `category_id`, and signed `amount`, infers the transaction type from the amount, and persists the entry with related account/category info.
 * @tag Transactions
 * @security bearerAuth
 * @bodyContent {Object} { personal_id: number, date: string (YYYY-MM-DD), account_id: string, category_id: string, amount: number, note?: string }
 * @param request Authenticated Next.js request containing the transaction payload.
 * @response 201 - Transaction created successfully and returned with hydrated account/category labels.
 * @response 400 - Missing or invalid transaction attributes (e.g., zero amount).
 * @response 401 - Authentication failed.
 * @response 404 - Account or category not found.
 * @response 409 - `personal_id` already used.
 * @response 500 - Server error while creating the transaction.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Validate request body
    const body = await validateBody(request, CreateTransactionRequestSchema);
    const {
      personal_id,
      date,
      account_id,
      category_id,
      amount,
      note,
    } = body;

    const numericAmount = amount;

    // Determine type based on amount sign
    // Store the signed amount: negative for EXPENSE, positive for INCOME
    const type = numericAmount > 0 ? 'INCOME' : 'EXPENSE';

    // Check for duplicate personal_id
    const existing = await db.transactions.findFirst({
      where: {
        user_id: user.user_id,
        personal_id: BigInt(personal_id),
      },
    });

    if (existing) {
      return jsonResponse(
        ApiResponseBuilder.error('A transaction with this personal_id already exists'),
        409
      );
    }

    // Verify account exists and belongs to user
    const account = await db.accounts.findFirst({
      where: {
        id: account_id,
        user_id: user.user_id,
      },
    });

    if (!account) {
      return jsonResponse(
        ApiResponseBuilder.error('Account not found'),
        404
      );
    }

    // Verify category exists and belongs to user
    const category = await db.categories.findFirst({
      where: {
        id: category_id,
        user_id: user.user_id,
      },
    });

    if (!category) {
      return jsonResponse(
        ApiResponseBuilder.error('Category not found'),
        404
      );
    }

    // Create transaction with signed amount
    // Negative for EXPENSE, positive for INCOME
    const transaction = await db.transactions.create({
      data: {
        id: crypto.randomUUID(),
        user_id: user.user_id,
        personal_id: BigInt(personal_id),
        date: new Date(date),
        account_id,
        category_id,
        amount: numericAmount, // Store signed amount
        type,
        note: note || null,
        position: null as any,
        transfer_id: null,
        debt_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Transaction created successfully', {
        id: transaction.id,
        user_id: transaction.user_id,
        personal_id: Number(transaction.personal_id),
        date: transaction.date.toISOString().split('T')[0],
        account_id: transaction.account_id,
        account_name: account.name,
        account_icon: account.icon,
        category_id: transaction.category_id,
        category_name: category.name,
        category_icon: category.icon,
        category_color: category.color,
        amount: transaction.amount,
        type: transaction.type,
        note: transaction.note,
        transfer_id: transaction.transfer_id,
        debt_id: transaction.debt_id,
        position: transaction.position,
        created_at: transaction.created_at.toISOString(),
        updated_at: transaction.updated_at?.toISOString() || transaction.created_at.toISOString(),
      }),
      201
    );
  } catch (error) {
    console.error('Create transaction error:', error);
    return handleValidationError(error);
  }
}
