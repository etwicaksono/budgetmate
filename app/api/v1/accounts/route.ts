import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

// GET /api/v1/accounts - List accounts with optional search
/**
 * @summary List a user's accounts.
 * @description Requires bearer auth, supports `keyword`, `limit`, and `offset` query params, and returns each account with its calculated balance plus pagination metadata.
 * @tag Accounts
 * @security bearerAuth
 * @param request Authenticated Next.js request with optional query parameters.
 * @response 200 - Accounts retrieved successfully with pagination hints.
 * @response 401 - Authentication failed.
 * @response 500 - Unable to load accounts due to server error.
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
    const keyword = searchParams.get('keyword') || '';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build where clause
    const where: any = {
      user_id: user.user_id,
    };

    // Add keyword search if provided
    if (keyword) {
      where.name = {
        contains: keyword,
        mode: 'insensitive',
      };
    }

    // Get accounts
    const accounts = await db.accounts.findMany({
      where,
      orderBy: {
        personal_id: 'asc',
      },
      skip: offset,
      take: limit,
      select: {
        id: true,
        user_id: true,
        personal_id: true,
        name: true,
        icon: true,
        active: true,
        usability: true,
        account_type: true,
        color: true,
        initial_amount: true,
        group_id: true,
        position: true,
        created_at: true,
        updated_at: true,
      },
    });

    // Get max personal_id for caching
    const maxPersonalIdResult = await db.accounts.findFirst({
      where: { user_id: user.user_id },
      orderBy: { personal_id: 'desc' },
      select: { personal_id: true },
    });

    const maxPersonalId = maxPersonalIdResult?.personal_id
      ? Number(maxPersonalIdResult.personal_id)
      : 0;

    // Calculate balance for each account (sum of transactions)
    const accountsWithBalance = await Promise.all(
      accounts.map(async (account) => {
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

        return {
          ...account,
          personal_id: Number(account.personal_id),
          balance,
          created_at: account.created_at.toISOString(),
          updated_at: account.updated_at?.toISOString() || account.created_at.toISOString(),
        };
      })
    );

    return jsonResponse(
      ApiResponseBuilder.success('Accounts retrieved successfully', accountsWithBalance, {
        max_personal_id: maxPersonalId,
        total: accountsWithBalance.length,
        limit,
        offset,
      }),
      200
    );
  } catch (error) {
    console.error('Get accounts error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

// POST /api/v1/accounts - Create new account
/**
 * @summary Create a new account record.
 * @description Authenticates the user, validates account fields, ensures `personal_id` uniqueness, and persists the account with its starting balance.
 * @tag Accounts
 * @security bearerAuth
 * @bodyContent {Object} { personal_id: number, name: string, icon: string, account_type: string, color: string, ... }
 * @param request Authenticated Next.js request with the account payload.
 * @response 201 - Account created successfully and returned with computed balance.
 * @response 400 - Missing required fields in the payload.
 * @response 401 - Authentication failed.
 * @response 409 - An account with the same `personal_id` already exists.
 * @response 500 - Server error while creating the account.
 */
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
      name,
      icon,
      active,
      usability,
      account_type,
      color,
      initial_amount,
      group_id,
    } = body;

    // Validate required fields
    if (!personal_id || !name || !icon || !account_type || !color) {
      return jsonResponse(
        ApiResponseBuilder.error('Missing required fields: personal_id, name, icon, account_type, color'),
        400
      );
    }

    // Check for duplicate personal_id
    const existing = await db.accounts.findFirst({
      where: {
        user_id: user.user_id,
        personal_id: BigInt(personal_id),
      },
    });

    if (existing) {
      return jsonResponse(
        ApiResponseBuilder.error('An account with this personal_id already exists'),
        409
      );
    }

    // Create account
    const account = await db.accounts.create({
      data: {
        id: crypto.randomUUID(),
        user_id: user.user_id,
        personal_id: BigInt(personal_id),
        name,
        icon,
        active: active !== undefined ? active : true,
        usability: usability || 'ACTIVE',
        account_type,
        color,
        initial_amount: initial_amount || 0,
        group_id: group_id || null,
        position: null as any,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Account created successfully', {
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
        balance: account.initial_amount || 0,
        group_id: account.group_id,
        position: account.position,
        created_at: account.created_at.toISOString(),
        updated_at: account.updated_at?.toISOString() || account.created_at.toISOString(),
      }),
      201
    );
  } catch (error) {
    console.error('Create account error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
