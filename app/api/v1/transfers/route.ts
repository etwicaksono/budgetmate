import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateBody, handleValidationError } from '@/lib/validation';
import { CreateTransferRequestSchema } from '@/schemas/transfers/transfer.schema';

// GET /api/v1/transfers - List transfers
/**
 * @summary List transfers between accounts.
 * @description Authenticates the user, supports filtering by source/destination account, date or amount ranges, keyword search, plus pagination, and returns transfer records with account metadata.
 * @tag Transfers
 * @security bearerAuth
 * @param request Authenticated Next.js request with optional query params such as `from_account_id`, `to_account_id`, `start_date`, `end_date`, `min_amount`, `max_amount`, `keyword`, `limit`, and `offset`.
 * @response 200 - Transfers retrieved successfully with pagination hints.
 * @response 401 - Authentication failed.
 * @response 500 - Server error while listing transfers.
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
    const from_account_id = searchParams.get('from_account_id');
    const to_account_id = searchParams.get('to_account_id');
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

    if (from_account_id) where.from_account = from_account_id;
    if (to_account_id) where.to_account = to_account_id;

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

    // Get transfers
    const transfers = await db.transfers.findMany({
      where,
      orderBy: [
        { date: 'desc' },
        { created_at: 'desc' },
      ],
      skip: offset,
      take: limit,
    });

    // Get max personal_id for caching
    const maxPersonalIdResult = await db.transfers.findFirst({
      where: { user_id: user.user_id },
      orderBy: { personal_id: 'desc' },
      select: { personal_id: true },
    });

    const maxPersonalId = maxPersonalIdResult?.personal_id
      ? Number(maxPersonalIdResult.personal_id)
      : 0;

    // Get unique account IDs
    const fromAccountIds = Array.from(new Set(transfers.map(t => t.from_account)));
    const toAccountIds = Array.from(new Set(transfers.map(t => t.to_account)));
    const allAccountIds = Array.from(new Set([...fromAccountIds, ...toAccountIds]));

    // Fetch account details
    const accounts = await db.accounts.findMany({
      where: { id: { in: allAccountIds } },
      select: { id: true, name: true, icon: true },
    });

    // Create map for quick lookup
    const accountMap = new Map(accounts.map(a => [a.id, a]));

    const formattedTransfers = transfers.map((transfer) => {
      const fromAccount = accountMap.get(transfer.from_account);
      const toAccount = accountMap.get(transfer.to_account);

      return {
        id: transfer.id,
        user_id: transfer.user_id,
        personal_id: Number(transfer.personal_id),
        date: transfer.date.toISOString().split('T')[0], // YYYY-MM-DD
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
      };
    });

    return jsonResponse(
      ApiResponseBuilder.success('Transfers retrieved successfully', formattedTransfers, {
        max_personal_id: maxPersonalId,
        total: formattedTransfers.length,
        limit,
        offset,
      }),
      200
    );
  } catch (error) {
    console.error('Get transfers error:', error);
    return handleValidationError(error);
  }
}

// POST /api/v1/transfers - Create transfer (with 2 linked transactions)
/**
 * @summary Create a transfer and mirrored transactions.
 * @description Validates account ownership, amount, and `personal_id`, then wraps the transfer plus the associated EXPENSE/INCOME transactions in a DB transaction for atomicity.
 * @tag Transfers
 * @security bearerAuth
 * @bodyContent {Object} { personal_id: number, date: string, from_account_id: string, to_account_id: string, amount: number, note?: string }
 * @param request Authenticated Next.js request containing the transfer payload.
 * @response 201 - Transfer created successfully with linked transaction ids.
 * @response 400 - Invalid payload (missing fields, same accounts, non-positive amount).
 * @response 401 - Authentication failed.
 * @response 404 - Source or destination account not found.
 * @response 409 - `personal_id` already exists.
 * @response 500 - Server error while creating the transfer or transactions.
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
    const body = await validateBody(request, CreateTransferRequestSchema);
    const {
      personal_id,
      date,
      from_account_id,
      to_account_id,
      amount,
      note,
    } = body;

    const numericAmount = amount;

    // Check for duplicate personal_id
    const existing = await db.transfers.findFirst({
      where: {
        user_id: user.user_id,
        personal_id: BigInt(personal_id),
      },
    });

    if (existing) {
      return jsonResponse(
        ApiResponseBuilder.error('A transfer with this personal_id already exists'),
        409
      );
    }

    // Verify from_account exists and belongs to user
    const fromAccount = await db.accounts.findFirst({
      where: {
        id: from_account_id,
        user_id: user.user_id,
      },
    });

    if (!fromAccount) {
      return jsonResponse(
        ApiResponseBuilder.error('Source account not found'),
        404
      );
    }

    // Verify to_account exists and belongs to user
    const toAccount = await db.accounts.findFirst({
      where: {
        id: to_account_id,
        user_id: user.user_id,
      },
    });

    if (!toAccount) {
      return jsonResponse(
        ApiResponseBuilder.error('Destination account not found'),
        404
      );
    }

    // Get next personal_id for transactions
    const maxTxnPersonalId = await db.transactions.findFirst({
      where: { user_id: user.user_id },
      orderBy: { personal_id: 'desc' },
      select: { personal_id: true },
    });

    const nextTxnPersonalId = maxTxnPersonalId?.personal_id
      ? Number(maxTxnPersonalId.personal_id) + 1
      : 1;

    // Use Prisma transaction for atomicity
    const result = await db.$transaction(async (prisma) => {
      // Create transfer
      const transfer = await prisma.transfers.create({
        data: {
          id: crypto.randomUUID(),
          user_id: user.user_id,
          personal_id: BigInt(personal_id),
          date: new Date(date),
          from_account: from_account_id,
          to_account: to_account_id,
          amount: numericAmount,
          note: note || '',
          position: null as any,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Find a default category for transfers (or create one if needed)
      // For simplicity, we'll use the first category the user has
      const defaultCategory = await prisma.categories.findFirst({
        where: { user_id: user.user_id },
        orderBy: { personal_id: 'asc' },
      });

      if (!defaultCategory) {
        throw new Error('No category found. Please create at least one category first.');
      }

      // Create EXPENSE transaction (from source account)
      const expenseTransaction = await prisma.transactions.create({
        data: {
          id: crypto.randomUUID(),
          user_id: user.user_id,
          personal_id: BigInt(nextTxnPersonalId),
          date: new Date(date),
          account_id: from_account_id,
          category_id: defaultCategory.id,
          amount: numericAmount,
          type: 'EXPENSE',
          note: note || `Transfer to ${toAccount.name}`,
          position: null as any,
          transfer_id: transfer.id,
          debt_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      // Create INCOME transaction (to destination account)
      const incomeTransaction = await prisma.transactions.create({
        data: {
          id: crypto.randomUUID(),
          user_id: user.user_id,
          personal_id: BigInt(nextTxnPersonalId + 1),
          date: new Date(date),
          account_id: to_account_id,
          category_id: defaultCategory.id,
          amount: numericAmount,
          type: 'INCOME',
          note: note || `Transfer from ${fromAccount.name}`,
          position: null as any,
          transfer_id: transfer.id,
          debt_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      return { transfer, expenseTransaction, incomeTransaction };
    });

    return jsonResponse(
      ApiResponseBuilder.success('Transfer created successfully', {
        id: result.transfer.id,
        user_id: result.transfer.user_id,
        personal_id: Number(result.transfer.personal_id),
        date: result.transfer.date.toISOString().split('T')[0],
        from_account_id: result.transfer.from_account,
        from_account_name: fromAccount.name,
        from_account_icon: fromAccount.icon,
        to_account_id: result.transfer.to_account,
        to_account_name: toAccount.name,
        to_account_icon: toAccount.icon,
        amount: result.transfer.amount,
        note: result.transfer.note,
        position: result.transfer.position,
        created_at: result.transfer.created_at.toISOString(),
        updated_at: result.transfer.updated_at?.toISOString() || result.transfer.created_at.toISOString(),
        transactions: [
          {
            id: result.expenseTransaction.id,
            type: result.expenseTransaction.type,
            account_id: result.expenseTransaction.account_id,
            amount: result.expenseTransaction.amount,
          },
          {
            id: result.incomeTransaction.id,
            type: result.incomeTransaction.type,
            account_id: result.incomeTransaction.account_id,
            amount: result.incomeTransaction.amount,
          },
        ],
      }),
      201
    );
  } catch (error) {
    console.error('Create transfer error:', error);
    return handleValidationError(error);
  }
}
