import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';
import { buildLabelWhereConditions } from '@/lib/api/labelFilters';
import { generateAnalyticsPeriods } from '@/lib/timezone';
import { logError } from '@/lib/logger';

type DataType = 'balance' | 'cashflow' | 'cumulative_cashflow';
type Granularity = 'day' | 'week' | 'month';
type GroupBy = 'none' | 'accounts' | 'categories';

interface ChartDataPoint {
  date: string;
  value: number;
}

interface GroupedChartData {
  groupId: string;
  groupName: string;
  color: string | null;
  data: ChartDataPoint[];
}

interface AdvancedChartsResponse {
  dataType: DataType;
  granularity: Granularity;
  groupBy: GroupBy;
  chartData: ChartDataPoint[];
  groupedData: GroupedChartData[];
}

function formatDateLabel(dateUtc: Date, granularity: Granularity): string {
  if (granularity === 'month') {
    return `${dateUtc.getUTCMonth() + 1}/${dateUtc.getUTCFullYear()}`;
  }

  return `${dateUtc.getUTCMonth() + 1}/${dateUtc.getUTCDate()}/${dateUtc.getUTCFullYear()}`;
}

function getDateKey(dateUtc: Date, granularity: Granularity): string {
  if (granularity === 'month') {
    return `${dateUtc.getUTCFullYear()}-${String(dateUtc.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  if (granularity === 'week') {
    const d = new Date(dateUtc);
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
    d.setUTCDate(diff);
    return d.toISOString().split('T')[0]!;
  }

  return dateUtc.toISOString().split('T')[0]!;
}

function generateDateRange(startLocal: Date, endLocal: Date, granularity: Granularity): Date[] {
  const dates: Date[] = [];
  const current = new Date(startLocal);
  current.setUTCHours(0, 0, 0, 0);

  if (granularity === 'month') {
    current.setUTCDate(1);
    while (current <= endLocal) {
      dates.push(new Date(current));
      current.setUTCMonth(current.getUTCMonth() + 1);
    }
  } else if (granularity === 'week') {
    const day = current.getUTCDay();
    const diff = current.getUTCDate() - day + (day === 0 ? -6 : 1);
    current.setUTCDate(diff);
    while (current <= endLocal) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 7);
    }
  } else {
    while (current <= endLocal) {
      dates.push(new Date(current));
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return dates;
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
  const dataType = (searchParams.get('type') || 'balance') as DataType;
  const granularity = (searchParams.get('granularity') || 'day') as Granularity;
  const groupBy = (searchParams.get('group_by') || 'none') as GroupBy;
  const categoryIds = searchParams.get('category_ids')?.split(',').filter(Boolean) || [];
  const accountIdsParam = searchParams.get('account_ids')?.split(',').filter(Boolean) || [];
  const search = searchParams.get('search');
  const minAmount = searchParams.get('min_amount');
  const maxAmount = searchParams.get('max_amount');
  const labelConditions = buildLabelWhereConditions(
    searchParams.get('label_ids'),
    searchParams.get('exclude_label_ids')
  );

  try {
    const { start, end, startLocal, endLocal, offsetMinutes } = generateAnalyticsPeriods(startDate, endDate);

    const accountWhereClause: Prisma.AccountWhereInput = {
      user_id: user.user_id,
      deleted_at: null,
      is_included_in_total: true,
    };
    if (accountIdsParam.length > 0) {
      accountWhereClause.id = { in: accountIdsParam };
    }

    const accounts = await prisma.account.findMany({
      where: accountWhereClause,
      select: {
        id: true,
        name: true,
        color: true,
        initial_balance: true,
      },
    });

    const transactionWhereClause: Prisma.TransactionWhereInput = {
      user_id: user.user_id,
      deleted_at: null,
      is_draft: false,
      date: { gte: start, lte: end },
      type: { in: ['income', 'expense'] },
      account: { is_included_in_total: true },
    };

    const accountIds = accounts.map((account) => account.id);
    if (accountIds.length > 0) {
      transactionWhereClause.account_id = { in: accountIds };
    } else {
      transactionWhereClause.account_id = { in: ['__empty__'] };
    }

    if (categoryIds.length > 0) {
      transactionWhereClause.category_id = { in: categoryIds };
    }

    if (search) {
      transactionWhereClause.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { payee: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (minAmount !== null || maxAmount !== null) {
      transactionWhereClause.amount = {};
      if (minAmount !== null) transactionWhereClause.amount.gte = Number(minAmount);
      if (maxAmount !== null) transactionWhereClause.amount.lte = Number(maxAmount);
    }

    if (labelConditions.length > 0) {
      transactionWhereClause.AND = labelConditions;
    }

    const transactions = await prisma.transaction.findMany({
      where: transactionWhereClause,
      select: {
        id: true,
        date: true,
        amount: true,
        type: true,
        account_id: true,
        category_id: true,
        account: {
          select: { id: true, name: true, color: true },
        },
        category: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    const dateRange = generateDateRange(startLocal, endLocal, granularity);

    const buildCashflowData = (
      txs: typeof transactions,
      isCumulative: boolean
    ): ChartDataPoint[] => {
      const dateMap = new Map<string, { income: number; expense: number }>();

      for (const date of dateRange) {
        dateMap.set(getDateKey(date, granularity), { income: 0, expense: 0 });
      }

      for (const tx of txs) {
        const txLocal = new Date(tx.date.getTime() + offsetMinutes * 60000);
        const key = getDateKey(txLocal, granularity);
        const entry = dateMap.get(key);
        if (entry) {
          const amount = Math.abs(Number(tx.amount));
          if (tx.type === 'income') {
            entry.income += amount;
          } else {
            entry.expense += amount;
          }
        }
      }

      const chartData: ChartDataPoint[] = [];
      let cumulative = 0;

      for (const date of dateRange) {
        const key = getDateKey(date, granularity);
        const entry = dateMap.get(key) || { income: 0, expense: 0 };
        const cashflow = entry.income - entry.expense;

        if (isCumulative) {
          cumulative += cashflow;
          chartData.push({ date: formatDateLabel(date, granularity), value: cumulative });
        } else {
          chartData.push({ date: formatDateLabel(date, granularity), value: cashflow });
        }
      }

      return chartData;
    };

    const buildCashflowDataForGroup = (
      txs: typeof transactions,
      isCumulative: boolean
    ): ChartDataPoint[] => {
      const dateMap = new Map<string, { income: number; expense: number }>();

      for (const date of dateRange) {
        dateMap.set(getDateKey(date, granularity), { income: 0, expense: 0 });
      }

      for (const tx of txs) {
        const txLocal = new Date(tx.date.getTime() + offsetMinutes * 60000);
        const key = getDateKey(txLocal, granularity);
        const entry = dateMap.get(key);
        if (entry) {
          const amount = Math.abs(Number(tx.amount));
          if (tx.type === 'income') {
            entry.income += amount;
          } else {
            entry.expense += amount;
          }
        }
      }

      const result: ChartDataPoint[] = [];
      let cumulative = 0;

      for (const date of dateRange) {
        const key = getDateKey(date, granularity);
        const entry = dateMap.get(key) || { income: 0, expense: 0 };
        const cashflow = entry.income - entry.expense;

        if (isCumulative) {
          cumulative += cashflow;
          result.push({ date: formatDateLabel(date, granularity), value: cumulative });
        } else {
          result.push({ date: formatDateLabel(date, granularity), value: cashflow });
        }
      }

      return result;
    };

    const buildBalanceData = async (): Promise<ChartDataPoint[]> => {
      const filteredAccounts = accounts;
      const filteredAccountIds = filteredAccounts.map((account) => account.id);

      const priorTransactions = await prisma.transaction.findMany({
        where: {
          user_id: user.user_id,
          deleted_at: null,
          is_draft: false,
          date: { lt: start },
          account_id: { in: filteredAccountIds.length > 0 ? filteredAccountIds : ['__empty__'] },
          type: { in: ['income', 'expense'] },
          ...(search && {
            OR: [
              { description: { contains: search, mode: 'insensitive' } },
              { payee: { contains: search, mode: 'insensitive' } },
            ],
          }),
          ...((minAmount !== null || maxAmount !== null) && {
            amount: {
              ...(minAmount !== null && { gte: Number(minAmount) }),
              ...(maxAmount !== null && { lte: Number(maxAmount) }),
            },
          }),
          ...(labelConditions.length > 0 && { AND: labelConditions }),
        },
        select: {
          amount: true,
          type: true,
        },
      });

      let startingBalance = filteredAccounts.reduce((sum, account) => sum + Number(account.initial_balance), 0);
      for (const tx of priorTransactions) {
        const amount = Number(tx.amount);
        if (tx.type === 'income') {
          startingBalance += Math.abs(amount);
        } else {
          startingBalance -= Math.abs(amount);
        }
      }

      const filteredTxs = transactions;
      const dateMap = new Map<string, number>();
      for (const date of dateRange) {
        dateMap.set(getDateKey(date, granularity), 0);
      }

      for (const tx of filteredTxs) {
        const txLocal = new Date(tx.date.getTime() + offsetMinutes * 60000);
        const key = getDateKey(txLocal, granularity);
        const current = dateMap.get(key) || 0;
        const amount = Number(tx.amount);
        if (tx.type === 'income') {
          dateMap.set(key, current + Math.abs(amount));
        } else {
          dateMap.set(key, current - Math.abs(amount));
        }
      }

      const chartData: ChartDataPoint[] = [];
      let runningBalance = startingBalance;
      for (const date of dateRange) {
        const key = getDateKey(date, granularity);
        runningBalance += dateMap.get(key) || 0;
        chartData.push({ date: formatDateLabel(date, granularity), value: runningBalance });
      }

      return chartData;
    };

    let chartData: ChartDataPoint[] = [];
    let groupedData: GroupedChartData[] = [];

    if (dataType === 'balance') {
      chartData = await buildBalanceData();
    } else {
      const isCumulative = dataType === 'cumulative_cashflow';
      chartData = buildCashflowData(transactions, isCumulative);

      if (groupBy === 'accounts') {
        const accountMap = new Map<string, { name: string; color: string | null }>();
        for (const account of accounts) {
          accountMap.set(account.id, { name: account.name, color: account.color });
        }

        for (const [accountId, accountInfo] of accountMap) {
          const accountTxs = transactions.filter((tx) => tx.account_id === accountId);
          groupedData.push({
            groupId: accountId,
            groupName: accountInfo.name,
            color: accountInfo.color,
            data: buildCashflowDataForGroup(accountTxs, isCumulative),
          });
        }
      } else if (groupBy === 'categories') {
        const categoryMap = new Map<string, { name: string; color: string | null }>();
        for (const tx of transactions) {
          if (tx.category) {
            categoryMap.set(tx.category.id, { name: tx.category.name, color: tx.category.color });
          }
        }

        for (const [categoryId, categoryInfo] of categoryMap) {
          const categoryTxs = transactions.filter((tx) => tx.category_id === categoryId);
          groupedData.push({
            groupId: categoryId,
            groupName: categoryInfo.name,
            color: categoryInfo.color,
            data: buildCashflowDataForGroup(categoryTxs, isCumulative),
          });
        }
      }
    }

    const response: AdvancedChartsResponse = {
      dataType,
      granularity,
      groupBy,
      chartData,
      groupedData,
    };

    return successResponse(response);
  } catch (error) {
    logError('Advanced charts error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch advanced charts data', 500);
  }
}
