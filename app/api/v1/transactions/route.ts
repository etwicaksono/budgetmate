import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

// GET /api/v1/transactions - List transactions with filters
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
    const account_id = searchParams.get('account_id');
    const category_id = searchParams.get('category_id');
    const type = searchParams.get('type');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const min_amount = searchParams.get('min_amount');
    const max_amount = searchParams.get('max_amount');
    const keyword = searchParams.get('keyword');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {
      user_id: user.user_id,
    };

    if (account_id) where.account_id = account_id;
    if (category_id) where.category_id = category_id;
    if (type) where.type = type;

    // Date range filter
    if (start_date || end_date) {
      where.date = {};
      if (start_date) where.date.gte = new Date(start_date);
      if (end_date) where.date.lte = new Date(end_date);
    }

    // Amount range filter
    if (min_amount || max_amount) {
      where.amount = {};
      if (min_amount) where.amount.gte = parseFloat(min_amount);
      if (max_amount) where.amount.lte = parseFloat(max_amount);
    }

    // Keyword search in notes
    if (keyword) {
      where.note = {
        contains: keyword,
        mode: 'insensitive',
      };
    }

    // Get transactions
    const transactions = await db.transactions.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { created_at: 'desc' },
      ],
      skip: offset,
      take: limit,
    });

    // Get max personal_id for caching
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
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

// POST /api/v1/transactions - Create new transaction
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    const body = await request.json();
    const {
      personal_id,
      date,
      account_id,
      category_id,
      amount,
      note,
    } = body;

    // Validate required fields
    if (!personal_id || !date || !account_id || !category_id || amount === undefined) {
      return jsonResponse(
        ApiResponseBuilder.error('Missing required fields: personal_id, date, account_id, category_id, amount'),
        400
      );
    }

    // Validate amount (cannot be 0)
    const numericAmount = parseFloat(amount);
    if (numericAmount === 0) {
      return jsonResponse(
        ApiResponseBuilder.error('Amount cannot be 0'),
        400
      );
    }

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
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
