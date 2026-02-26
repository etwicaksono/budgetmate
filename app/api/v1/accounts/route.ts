import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { balanceService } from '@/services/balanceService';
import { getCurrencyCodes } from '@/config/currencies';

// CUID validation regex (sortable IDs)
const cuidRegex = /^[a-z][a-z0-9]{8,}$/;

// Get valid currency codes from config
const VALID_CURRENCIES = getCurrencyCodes();

const CreateAccountSchema = z.object({
  name: z.string().min(1).max(100),
  account_type: z.enum(['checking', 'savings', 'credit_card', 'cash', 'investment', 'loan']),
  icon: z.string(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i),
  currency: z.string().default('USD').refine(
    (code) => VALID_CURRENCIES.includes(code),
    { message: 'Invalid currency code' }
  ),
  initial_balance: z.number().default(0),
  credit_limit: z.number().optional(),
  interest_rate: z.number().optional(),
  group_id: z.string().regex(cuidRegex, 'Invalid group ID').optional(),
  is_active: z.boolean().default(true),
  is_included_in_total: z.boolean().default(true)
});

// GET - Fetch all accounts
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  const is_active = searchParams.get('is_active');
  const group_id = searchParams.get('group_id');
  const include_balance = searchParams.get('include_balance') !== 'false';

  try {
    const where: Record<string, unknown> = {
      user_id: user.user_id,
      deleted_at: null
    };

    if (is_active !== null) {
      where['is_active'] = is_active === 'true';
    }

    if (group_id) {
      where['group_id'] = group_id;
    }

    const accounts = await prisma.account.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { created_at: 'asc' }
      ],
      include: {
        group: {
          select: { name: true, icon: true, color: true }
        }
      },
    });

    // Calculate current balances for all accounts (single query)
    const accountIds = accounts.map(a => a.id);
    const balances = await balanceService.calculateAccountBalances(accountIds);

    // Transform response
    const transformedAccounts = accounts.map(account => ({
      id: account.id,
      name: account.name,
      account_type: account.account_type,
      icon: account.icon,
      color: account.color,
      currency: account.currency,
      initial_balance: account.initial_balance.toNumber(),
      current_balance: balances.get(account.id) ?? account.initial_balance.toNumber(), // ✅ Calculated balance
      credit_limit: account.credit_limit?.toNumber() ?? null,
      interest_rate: account.interest_rate?.toNumber() ?? null,
      is_active: account.is_active,
      is_included_in_total: account.is_included_in_total,
      order: account.order,
      group: account.group,
      created_at: account.created_at,
      updated_at: account.updated_at
    }));

    // Calculate total balance if requested
    const meta: Record<string, unknown> = {
      total: transformedAccounts.length
    };

    if (include_balance) {
      // Calculate total from calculated balances
      meta['total_balance'] = transformedAccounts
        .filter(a => a.is_included_in_total && a.is_active)
        .reduce((sum, a) => sum + a.current_balance, 0);
    }

    return successResponse(transformedAccounts, meta);

  } catch (error) {
    console.error('Account fetch error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch accounts', 500);
  }
}

// POST - Create new account
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const validation = CreateAccountSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse(
        'VALIDATION_ERROR',
        'Validation failed',
        400,
        validation.error.errors
      );
    }

    const data = validation.data;

    const account = await prisma.account.create({
      data: {
        user_id: user.user_id,
        name: data.name,
        account_type: data.account_type,
        icon: data.icon,
        color: data.color,
        currency: data.currency,
        initial_balance: data.initial_balance,
        // current_balance removed - calculated on-demand
        credit_limit: data.credit_limit ?? null,
        interest_rate: data.interest_rate ?? null,
        group_id: data.group_id ?? null,
        is_active: data.is_active,
        is_included_in_total: data.is_included_in_total
      }
    });

    const response = {
      id: account.id,
      name: account.name,
      account_type: account.account_type,
      icon: account.icon,
      color: account.color,
      currency: account.currency,
      initial_balance: account.initial_balance.toNumber(),
      current_balance: data.initial_balance, // ✅ New account balance = initial_balance
      credit_limit: account.credit_limit?.toNumber() ?? null,
      interest_rate: account.interest_rate?.toNumber() ?? null,
      is_active: account.is_active,
      is_included_in_total: account.is_included_in_total,
      order: account.order,
      created_at: account.created_at,
      updated_at: account.updated_at
    };

    return successResponse(response, { message: 'Account created successfully' }, 201);

  } catch (error) {
    console.error('Account creation error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create account', 500);
  }
}
