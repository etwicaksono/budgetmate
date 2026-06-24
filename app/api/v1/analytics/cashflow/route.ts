import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';
import {
  generateAnalyticsPeriods,
  getDayOfPeriod,
  formatDateLabelUtc,
} from '@/lib/timezone';

interface DailyCashFlow {
  date: string;
  income: number;
  expense: number;
  cashFlow: number;
}

interface CashFlowSummary {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  percentChange: number;
}

interface ComparisonDataPoint {
  date: string;
  value: number;
}

interface ComparisonData {
  currentPeriod: ComparisonDataPoint[];
  previousPeriod: ComparisonDataPoint[];
  yearAgoPeriod: ComparisonDataPoint[];
}

interface CashFlowResponse {
  periodLabel: string;
  summary: CashFlowSummary;
  dailyData: DailyCashFlow[];
  comparisonData: {
    cashFlow: ComparisonData;
    income: ComparisonData;
    expense: ComparisonData;
  };
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
  const accountIds = searchParams.get('account_ids')?.split(',').filter(Boolean) || [];
  const search = searchParams.get('search');
  const minAmount = searchParams.get('min_amount');
  const maxAmount = searchParams.get('max_amount');

  try {
    const {
      start,
      end,
      previousStart,
      previousEnd,
      yearAgoStart,
      yearAgoEnd,
      periodDays,
      offsetMinutes,
    } = generateAnalyticsPeriods(startDate, endDate);

    const baseWhereClause: Prisma.TransactionWhereInput = {
      user_id: user.user_id,
      deleted_at: null,
      is_draft: false,
      type: { in: ['income', 'expense'] },
      account: { is_included_in_total: true },
    };

    if (categoryIds.length > 0) {
      baseWhereClause.category_id = { in: categoryIds };
    }

    if (search) {
      baseWhereClause.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { payee: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minAmount !== null || maxAmount !== null) {
      baseWhereClause.amount = {};
      if (minAmount !== null) baseWhereClause.amount.gte = Number(minAmount);
      if (maxAmount !== null) baseWhereClause.amount.lte = Number(maxAmount);
    }

    if (accountIds.length > 0) {
      baseWhereClause.account = {
        is_included_in_total: true,
        id: { in: accountIds },
      };
    }

    const currentTransactions = await prisma.transaction.findMany({
      where: {
        ...baseWhereClause,
        date: { gte: start, lte: end },
      },
      select: {
        date: true,
        amount: true,
        type: true,
      },
      orderBy: { date: 'asc' },
    });

    const previousTransactions = await prisma.transaction.findMany({
      where: {
        ...baseWhereClause,
        date: { gte: previousStart, lte: previousEnd },
      },
      select: {
        date: true,
        amount: true,
        type: true,
      },
      orderBy: { date: 'asc' },
    });

    const yearAgoTransactions = await prisma.transaction.findMany({
      where: {
        ...baseWhereClause,
        date: { gte: yearAgoStart, lte: yearAgoEnd },
      },
      select: {
        date: true,
        amount: true,
        type: true,
      },
      orderBy: { date: 'asc' },
    });

    const buildDailyData = (transactions: typeof currentTransactions): {
      dailyData: DailyCashFlow[];
      totalIncome: number;
      totalExpense: number;
    } => {
      const dailyDataMap = new Map<string, { income: number; expense: number }>();

      let currentLocalMap = new Date(start.getTime() + offsetMinutes * 60000);
      currentLocalMap.setUTCHours(0, 0, 0, 0);
      const endLocalMidnight = new Date(end.getTime() + offsetMinutes * 60000);
      endLocalMidnight.setUTCHours(0, 0, 0, 0);

      while (currentLocalMap <= endLocalMidnight) {
        const dateKey = currentLocalMap.toISOString().split('T')[0]!;
        dailyDataMap.set(dateKey, { income: 0, expense: 0 });
        currentLocalMap.setUTCDate(currentLocalMap.getUTCDate() + 1);
      }

      let totalIncome = 0;
      let totalExpense = 0;

      for (const tx of transactions) {
        const txLocal = new Date(tx.date.getTime() + offsetMinutes * 60000);
        const dateKey = txLocal.toISOString().split('T')[0]!;
        const amount = Math.abs(Number(tx.amount));
        const dayData = dailyDataMap.get(dateKey);

        if (dayData) {
          if (tx.type === 'income') {
            dayData.income += amount;
            totalIncome += amount;
          } else if (tx.type === 'expense') {
            dayData.expense += amount;
            totalExpense += amount;
          }
        }
      }

      const dailyData: DailyCashFlow[] = Array.from(dailyDataMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateStr, data]) => ({
          date: formatDateLabelUtc(new Date(`${dateStr}T00:00:00Z`)),
          income: data.income,
          expense: data.expense,
          cashFlow: data.income - data.expense,
        }));

      return { dailyData, totalIncome, totalExpense };
    };

    const combinedData = buildDailyData(currentTransactions);
    const dailyData = combinedData.dailyData;
    const totalIncome = combinedData.totalIncome;
    const totalExpense = combinedData.totalExpense;

    let previousTotalIncome = 0;
    let previousTotalExpense = 0;
    for (const tx of previousTransactions) {
      const amount = Math.abs(Number(tx.amount));
      if (tx.type === 'income') {
        previousTotalIncome += amount;
      } else if (tx.type === 'expense') {
        previousTotalExpense += amount;
      }
    }

    const netCashFlow = totalIncome - totalExpense;
    const previousNetCashFlow = previousTotalIncome - previousTotalExpense;

    let percentChange = 0;
    if (previousNetCashFlow !== 0) {
      percentChange = Math.round(((netCashFlow - previousNetCashFlow) / Math.abs(previousNetCashFlow)) * 100);
    } else if (netCashFlow !== 0) {
      percentChange = netCashFlow > 0 ? 100 : -100;
    }

    const buildComparisonData = (
      transactions: typeof currentTransactions,
      periodStart: Date,
      numDays: number,
      metric: 'income' | 'expense' | 'cashFlow'
    ): ComparisonDataPoint[] => {
      const dayMap = new Map<number, { income: number; expense: number }>();

      for (let i = 0; i < numDays; i++) {
        dayMap.set(i, { income: 0, expense: 0 });
      }

      for (const tx of transactions) {
        const txDate = new Date(tx.date);
        const dayOfPeriod = getDayOfPeriod(txDate, periodStart, offsetMinutes);
        if (dayOfPeriod >= 0 && dayOfPeriod < numDays) {
          const dayData = dayMap.get(dayOfPeriod)!;
          const amount = Math.abs(Number(tx.amount));
          if (tx.type === 'income') {
            dayData.income += amount;
          } else if (tx.type === 'expense') {
            dayData.expense += amount;
          }
        }
      }

      const result: ComparisonDataPoint[] = [];
      for (let i = 0; i < numDays; i++) {
        const dayData = dayMap.get(i)!;
        const dateAtDayLocal = new Date(periodStart.getTime() + offsetMinutes * 60000);
        dateAtDayLocal.setUTCHours(0, 0, 0, 0);
        dateAtDayLocal.setUTCDate(dateAtDayLocal.getUTCDate() + i);

        let value = 0;
        if (metric === 'income') {
          value = dayData.income;
        } else if (metric === 'expense') {
          value = -dayData.expense;
        } else {
          value = dayData.income - dayData.expense;
        }

        result.push({
          date: formatDateLabelUtc(dateAtDayLocal),
          value,
        });
      }

      return result;
    };

    const comparisonData = {
      cashFlow: {
        currentPeriod: buildComparisonData(currentTransactions, start, periodDays, 'cashFlow'),
        previousPeriod: buildComparisonData(previousTransactions, previousStart, periodDays, 'cashFlow'),
        yearAgoPeriod: buildComparisonData(yearAgoTransactions, yearAgoStart, periodDays, 'cashFlow'),
      },
      income: {
        currentPeriod: buildComparisonData(currentTransactions, start, periodDays, 'income'),
        previousPeriod: buildComparisonData(previousTransactions, previousStart, periodDays, 'income'),
        yearAgoPeriod: buildComparisonData(yearAgoTransactions, yearAgoStart, periodDays, 'income'),
      },
      expense: {
        currentPeriod: buildComparisonData(currentTransactions, start, periodDays, 'expense'),
        previousPeriod: buildComparisonData(previousTransactions, previousStart, periodDays, 'expense'),
        yearAgoPeriod: buildComparisonData(yearAgoTransactions, yearAgoStart, periodDays, 'expense'),
      },
    };

    const response: CashFlowResponse = {
      periodLabel: 'THIS MONTH',
      summary: {
        totalIncome,
        totalExpense,
        netCashFlow,
        percentChange,
      },
      dailyData,
      comparisonData,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Cash flow error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch cash flow data', 500);
  }
}
