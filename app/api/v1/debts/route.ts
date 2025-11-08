import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import { validateBody, handleValidationError } from '@/lib/validation';
import { CreateDebtRequestSchema } from '@/schemas/debts/debt.schema';

// GET /api/v1/debts - List debts
/**
 * @summary List payable/receivable debts.
 * @description Requires bearer auth, supports filtering by `account_id`, debt `type`, and keyword, and returns each debt with computed balance and transaction counts.
 * @tag Debts
 * @security bearerAuth
 * @param request Authenticated Next.js request with optional query params.
 * @response 200 - Debts retrieved successfully with balances.
 * @response 401 - Authentication failed.
 * @response 500 - Server error while loading debts.
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
    const account_id = searchParams.get('account_id');
    const type = searchParams.get('type'); // PAYABLE or RECEIVABLE
    const keyword = searchParams.get('keyword');

    // Build where clause
    const where: any = {
      user_id: user.user_id,
    };

    if (account_id) where.account_id = account_id;
    if (type) where.type = type;

    // Keyword search in name
    if (keyword) {
      where.name = {
        contains: keyword,
        mode: 'insensitive',
      };
    }

    // Get debts
    const debts = await db.debts.findMany({
      where,
      orderBy: [
        { personal_id: 'asc' },
      ],
      include: {
        _count: {
          select: { transactions: true },
        },
      },
    });

    // Get max personal_id for caching
    const maxPersonalIdResult = await db.debts.findFirst({
      where: { user_id: user.user_id },
      orderBy: { personal_id: 'desc' },
      select: { personal_id: true },
    });

    const maxPersonalId = maxPersonalIdResult?.personal_id
      ? Number(maxPersonalIdResult.personal_id)
      : 0;

    // Get unique account IDs
    const accountIds = Array.from(new Set(debts.map(d => d.account_id)));

    // Fetch account details
    const accounts = await db.accounts.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true, icon: true },
    });

    // Create map for quick lookup
    const accountMap = new Map(accounts.map(a => [a.id, a]));

    // Calculate total amount owed for each debt from linked transactions
    const debtsWithBalances = await Promise.all(
      debts.map(async (debt) => {
        const account = accountMap.get(debt.account_id);

        // Get all transactions linked to this debt
        const debtTransactions = await db.transactions.findMany({
          where: {
            debt_id: debt.id,
            user_id: user.user_id,
          },
        });

        // Calculate total based on type
        // PAYABLE: negative balance = you owe money
        // RECEIVABLE: positive balance = they owe you money
        let totalAmount = 0;
        debtTransactions.forEach((txn) => {
          if (debt.type === 'PAYABLE') {
            // For payables: EXPENSE increases debt, INCOME decreases it
            totalAmount += txn.type === 'EXPENSE' ? txn.amount : -txn.amount;
          } else {
            // For receivables: INCOME increases what they owe, EXPENSE decreases it
            totalAmount += txn.type === 'INCOME' ? txn.amount : -txn.amount;
          }
        });

        return {
          id: debt.id,
          user_id: debt.user_id,
          personal_id: Number(debt.personal_id),
          account_id: debt.account_id,
          account_name: account?.name || '',
          account_icon: account?.icon || '',
          name: debt.name,
          type: debt.type,
          balance: totalAmount,
          transaction_count: debt._count.transactions,
          position: debt.position,
          created_at: debt.created_at.toISOString(),
          updated_at: debt.updated_at?.toISOString() || debt.created_at.toISOString(),
        };
      })
    );

    return jsonResponse(
      ApiResponseBuilder.success('Debts retrieved successfully', debtsWithBalances, {
        max_personal_id: maxPersonalId,
        total: debtsWithBalances.length,
      }),
      200
    );
  } catch (error) {
    console.error('Get debts error:', error);
    return handleValidationError(error);
  }
}

// POST /api/v1/debts - Create new debt
/**
 * @summary Create a debt tracker.
 * @description Authenticates the user, validates `personal_id`, `account_id`, `name`, and `type` (PAYABLE/RECEIVABLE), and persists the debt record.
 * @tag Debts
 * @security bearerAuth
 * @bodyContent {Object} { personal_id: number, account_id: string, name: string, type: 'PAYABLE' | 'RECEIVABLE' }
 * @param request Authenticated Next.js request containing the debt payload.
 * @response 201 - Debt created successfully with initial balance metadata.
 * @response 400 - Missing fields or invalid type/name.
 * @response 401 - Authentication failed.
 * @response 404 - Account not found.
 * @response 409 - `personal_id` already exists.
 * @response 500 - Server error while creating the debt.
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
    const body = await validateBody(request, CreateDebtRequestSchema);
    const {
      personal_id,
      account_id,
      name,
      type,
    } = body;

    // Check for duplicate personal_id
    const existing = await db.debts.findFirst({
      where: {
        user_id: user.user_id,
        personal_id: BigInt(personal_id),
      },
    });

    if (existing) {
      return jsonResponse(
        ApiResponseBuilder.error('A debt with this personal_id already exists'),
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

    // Create debt
    const debt = await db.debts.create({
      data: {
        id: crypto.randomUUID(),
        user_id: user.user_id,
        personal_id: BigInt(personal_id),
        account_id,
        name,
        type,
        position: null as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Debt created successfully', {
        id: debt.id,
        user_id: debt.user_id,
        personal_id: Number(debt.personal_id),
        account_id: debt.account_id,
        account_name: account.name,
        account_icon: account.icon,
        name: debt.name,
        type: debt.type,
        balance: 0,
        transaction_count: 0,
        position: debt.position,
        created_at: debt.created_at.toISOString(),
        updated_at: debt.updated_at?.toISOString() || debt.created_at.toISOString(),
      }),
      201
    );
  } catch (error) {
    console.error('Create debt error:', error);
    return handleValidationError(error);
  }
}
