import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';
import { parseAnalyticsFilters, buildAnalyticsTransactionWhere } from '@/lib/api/analyticsFilters';
import { logError } from '@/lib/logger';

interface TrendDataset {
  label: string;
  data: number[];
}

interface TrendsResponse {
  labels: string[];
  datasets: TrendDataset[];
}

function getPeriodKey(date: Date, period: 'daily' | 'weekly' | 'monthly' | 'yearly'): string {
  switch (period) {
    case 'daily':
      return date.toISOString().split('T')[0]!;
    case 'weekly': {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split('T')[0]!;
    }
    case 'monthly':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    case 'yearly':
      return String(date.getFullYear());
    default:
      return date.toISOString().split('T')[0]!;
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  const metric = searchParams.get('metric') || 'balance';
  const period = searchParams.get('period') || 'daily';
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const filters = parseAnalyticsFilters(searchParams);

  try {
    if (!['income', 'expense', 'net', 'balance'].includes(metric)) {
      return errorResponse('INVALID_PARAMETER', 'Invalid metric', 400);
    }

    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(period)) {
      return errorResponse('INVALID_PARAMETER', 'Invalid period', 400);
    }

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    let initialBalance = 0;
    if (metric === 'balance') {
      const accounts = await prisma.account.findMany({
        where: {
          user_id: user.user_id,
          deleted_at: null,
          is_included_in_total: true,
          // Keep the baseline aligned with the accounts the caller filtered on
          ...(filters.accountIds.length > 0 && { id: { in: filters.accountIds } }),
        },
        select: {
          initial_balance: true,
        },
      });

      initialBalance = accounts.reduce((sum, account) => sum + Number(account.initial_balance), 0);
    }

    const typeFilter = metric === 'income'
      ? 'income'
      : metric === 'expense'
        ? 'expense'
        : undefined;

    const transactions = await prisma.transaction.findMany({
      where: {
        user_id: user.user_id,
        deleted_at: null,
        ...buildAnalyticsTransactionWhere(filters),
        ...(typeFilter && { type: typeFilter }),
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      select: {
        date: true,
        amount: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    const periodChanges = new Map<string, number>();
    for (const transaction of transactions) {
      const key = getPeriodKey(new Date(transaction.date), period as 'daily' | 'weekly' | 'monthly' | 'yearly');
      const amount = Number(transaction.amount);
      const signedAmount = metric === 'income'
        ? Math.abs(amount)
        : metric === 'expense'
          ? -Math.abs(amount)
          : amount;

      periodChanges.set(key, (periodChanges.get(key) || 0) + signedAmount);
    }

    let labels = Array.from(periodChanges.keys()).sort();
    if (metric === 'balance' && labels.length === 0) {
      labels = [startDate ? new Date(startDate).toISOString().split('T')[0]! : new Date().toISOString().split('T')[0]!];
    }

    let data: number[];
    if (metric === 'balance') {
      let runningBalance = initialBalance;
      data = labels.map((label) => {
        runningBalance += periodChanges.get(label) || 0;
        return runningBalance;
      });
    } else {
      data = labels.map((label) => periodChanges.get(label) || 0);
    }

    const response: TrendsResponse = {
      labels,
      datasets: [
        {
          label: 'IDR',
          data,
        },
      ],
    };

    return successResponse(response);
  } catch (error) {
    logError('Fetch trends error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch trends', 500);
  }
}
