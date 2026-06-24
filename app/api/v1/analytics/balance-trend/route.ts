import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';
import { balanceService } from '@/services/balanceService';
import {
  generateAnalyticsPeriods,
  getLocalDateKey,
  formatDateLabelWithOffset,
} from '@/lib/timezone';

interface BalanceDataPoint {
  date: string;
  balance: number;
}

interface AccountBalance {
  id: string;
  name: string;
  account_type: string;
  icon: string;
  color: string;
  balance: number;
}

interface BalanceTrendResponse {
  periodLabel: string;
  totalBalance: number;
  percentChange: number;
  chartData: BalanceDataPoint[];
  accounts: AccountBalance[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const categoryIds = searchParams.get('category_ids')?.split(',').filter(Boolean) || [];
  const accountIdsParam = searchParams.get('account_ids')?.split(',').filter(Boolean) || [];

  try {
    const { start, end, previousEnd, offsetMinutes } = generateAnalyticsPeriods(startDate, endDate);

    const accountWhereClause: Prisma.AccountWhereInput = {
      user_id: user.user_id,
      deleted_at: null,
      is_active: true,
    };

    if (accountIdsParam.length > 0) {
      accountWhereClause.id = { in: accountIdsParam };
    }

    const accounts = await prisma.account.findMany({
      where: accountWhereClause,
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        account_type: true,
        icon: true,
        color: true,
        initial_balance: true,
        is_included_in_total: true,
      },
    });

    const accountIds = accounts.map((account) => account.id);
    const balances = await balanceService.calculateAccountBalances(accountIds);

    const accountBalances: AccountBalance[] = accounts.map((account) => ({
      id: account.id,
      name: account.name,
      account_type: account.account_type,
      icon: account.icon,
      color: account.color,
      balance: balances.get(account.id) ?? Number(account.initial_balance),
    }));

    const includedAccounts = accounts.filter((account) => account.is_included_in_total);
    const includedAccountIds = includedAccounts.map((account) => account.id);
    const totalBalance = includedAccounts.reduce((sum, account) => {
      const balance = balances.get(account.id) ?? Number(account.initial_balance);
      return sum + balance;
    }, 0);

    const transactionWhereClause: Prisma.TransactionWhereInput = {
      user_id: user.user_id,
      deleted_at: null,
      is_draft: false,
      date: {
        lte: end,
      },
    };

    if (includedAccountIds.length > 0) {
      transactionWhereClause.account_id = { in: includedAccountIds };
    } else {
      transactionWhereClause.account_id = { in: ['__empty__'] };
    }

    if (categoryIds.length > 0) {
      transactionWhereClause.category_id = { in: categoryIds };
    }

    const transactions = await prisma.transaction.findMany({
      where: transactionWhereClause,
      select: {
        date: true,
        amount: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    const initialBalance = includedAccounts.reduce((sum, account) => sum + Number(account.initial_balance), 0);
    const dailyChanges = new Map<string, number>();

    for (const transaction of transactions) {
      const dateKey = getLocalDateKey(transaction.date, offsetMinutes);
      const amount = Number(transaction.amount);
      dailyChanges.set(dateKey, (dailyChanges.get(dateKey) || 0) + amount);
    }

    const chartData: BalanceDataPoint[] = [];
    const sortedDates = Array.from(dailyChanges.keys()).sort();
    let runningBalance = initialBalance;

    for (const dateKey of sortedDates) {
      if (dateKey < getLocalDateKey(start, offsetMinutes)) {
        runningBalance += dailyChanges.get(dateKey) || 0;
      }
    }

    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dateKey = getLocalDateKey(currentDate, offsetMinutes);
      runningBalance += dailyChanges.get(dateKey) || 0;
      chartData.push({
        date: formatDateLabelWithOffset(currentDate, offsetMinutes),
        balance: runningBalance,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    let previousPeriodBalance = initialBalance;
    for (const dateKey of sortedDates) {
      if (dateKey <= getLocalDateKey(previousEnd, offsetMinutes)) {
        previousPeriodBalance += dailyChanges.get(dateKey) || 0;
      }
    }

    let percentChange = 0;
    if (previousPeriodBalance !== 0) {
      percentChange = Math.round(((totalBalance - previousPeriodBalance) / Math.abs(previousPeriodBalance)) * 100);
    } else if (totalBalance !== 0) {
      percentChange = 100;
    }

    const response: BalanceTrendResponse = {
      periodLabel: 'THIS MONTH',
      totalBalance,
      percentChange,
      chartData,
      accounts: accountBalances,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Balance trend error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch balance trend', 500);
  }
}
