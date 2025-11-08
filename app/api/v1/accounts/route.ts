import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';
import type { ApiResponse, ApiErrorResponse, Account, AccountListMeta } from '@/types/api-responses';

// GET /api/v1/accounts - List accounts with optional search
/**
 * @summary List all user accounts
 * @description Retrieves all financial accounts for the authenticated user. Supports filtering by keyword (searches account name), pagination with limit/offset. Each account includes calculated balance based on initial amount and transaction history. Results ordered by personal_id.
 * @tag Accounts
 * @security bearerAuth
 * @param request Authenticated request with query params: ?keyword=text&limit=100&offset=0
 * @response 200 - Accounts retrieved successfully: `{ success: true, message: "Accounts retrieved successfully", data: Array<{ id: string, user_id: string, personal_id: number, name: string, icon: string, active: boolean, usability: string, account_type: string, color: string, initial_amount: number, balance: number, group_id: string|null, position: any, created_at: string, updated_at: string }>, meta: { max_personal_id: number, total: number, limit: number, offset: number } }`
 * @response 401 - Authentication failed: `{ success: false, message: "Unauthorized" }`
 * @response 500 - Internal server error: `{ success: false, message: "Internal server error" }`
 */
export async function GET(request: NextRequest): Promise<Response> {
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
      }) as ApiResponse<Account[]> & { meta: AccountListMeta },
      200
    );
  } catch (error) {
    console.error('Get accounts error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error') as ApiErrorResponse,
      500
    );
  }
}

// POST /api/v1/accounts - Create new account
/**
 * @summary Create new account
 * @description Creates a new financial account for the authenticated user. Validates required fields (personal_id, name, icon, account_type, color) and checks for personal_id uniqueness per user. Initial balance defaults to 0 if not provided.
 * @tag Accounts
 * @security bearerAuth
 * @bodyContent {application/json} { personal_id: number, name: string, icon: string, active?: boolean, usability?: string, account_type: string, color: string, initial_amount?: number, group_id?: string }
 * @param request Authenticated request with account data
 * @response 201 - Account created successfully: `{ success: true, message: "Account created successfully", data: { id: string, user_id: string, personal_id: number, name: string, icon: string, active: boolean, usability: string, account_type: string, color: string, initial_amount: number, balance: number, group_id: string|null, position: any, created_at: string, updated_at: string } }`
 * @response 400 - Validation failure: `{ success: false, message: "Missing required fields: personal_id, name, icon, account_type, color" }`
 * @response 401 - Authentication failed: `{ success: false, message: "Unauthorized" }`
 * @response 409 - Conflict: `{ success: false, message: "An account with this personal_id already exists" }`
 * @response 500 - Internal server error: `{ success: false, message: "Internal server error" }`
 */
export async function POST(request: NextRequest): Promise<Response> {
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
        ApiResponseBuilder.error('Missing required fields: personal_id, name, icon, account_type, color') as ApiErrorResponse,
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
        ApiResponseBuilder.error('An account with this personal_id already exists') as ApiErrorResponse,
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
      }) as ApiResponse<Account>,
      201
    );
  } catch (error) {
    console.error('Create account error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error') as ApiErrorResponse,
      500
    );
  }
}
