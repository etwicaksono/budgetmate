import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';
import { generateAnalyticsPeriods } from '@/lib/timezone';

type DataType = 'balance' | 'cashflow' | 'cumulative_cashflow';
type Granularity = 'day' | 'week' | 'month';
type GroupBy = 'none' | 'accounts' | 'categories' | 'currencies';

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
  currencies: string[];
  dataByCurrency: Record<string, {
    chartData: ChartDataPoint[];
    groupedData: GroupedChartData[];
  }>;
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
  } else if (granularity === 'week') {
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
  current.setUTCHours(0,0,0,0);

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
  const currencyParams = searchParams.get('currencies')?.split(',').filter(Boolean) || [];
  const search = searchParams.get('search');
  const minAmount = searchParams.get('min_amount');
  const maxAmount = searchParams.get('max_amount');

  try {
    const { start, end, startLocal, endLocal, offsetMinutes } = generateAnalyticsPeriods(startDate, endDate);

    const accountWhereClause: any = {
      user_id: user.user_id,
      deleted_at: null,
      is_included_in_total: true,
    };
    if (accountIdsParam.length > 0) {
      accountWhereClause.id = { in: accountIdsParam };
    }
    if (currencyParams.length > 0) {
      accountWhereClause.currency = { in: currencyParams };
    }

    // Fetch accounts
    const accounts = await prisma.account.findMany({
      where: accountWhereClause,
      select: {
        id: true,
        name: true,
        currency: true,
        color: true,
        initial_balance: true,
      },
    });

    const transactionWhereClause: any = {
      user_id: user.user_id,
      deleted_at: null,
      date: { gte: start, lte: end },
      type: { in: ['income', 'expense'] },
      account: { is_included_in_total: true },
    };

    // Only fetch transactions for accounts we have filtered down to
    const accountIds = accounts.map((a) => a.id);
    if (accountIds.length > 0) {
      transactionWhereClause.account_id = { in: accountIds };
    } else {
      // If no accounts match the filter, force an empty result safely
      transactionWhereClause.account_id = { in: ['__empty__'] };
    }

    if (categoryIds.length > 0) {
      transactionWhereClause.category_id = { in: categoryIds };
    }

    if (search) {
      transactionWhereClause.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { payee: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (minAmount !== null || maxAmount !== null) {
      transactionWhereClause.amount = {};
      if (minAmount !== null) transactionWhereClause.amount.gte = Number(minAmount);
      if (maxAmount !== null) transactionWhereClause.amount.lte = Number(maxAmount);
    }

    // Fetch transactions
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
          select: { id: true, name: true, currency: true, color: true },
        },
        category: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Collect currencies sorted by volume
    const currencyVolumes = new Map<string, number>();
    transactions.forEach(tx => {
      const currency = tx.account?.currency || 'USD';
      const amount = Math.abs(Number(tx.amount));
      currencyVolumes.set(currency, (currencyVolumes.get(currency) || 0) + amount);
    });
    accounts.forEach(acc => {
      if (!currencyVolumes.has(acc.currency)) {
        currencyVolumes.set(acc.currency, 0);
      }
    });
    const currencies = Array.from(currencyVolumes.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([currency]) => currency);

    const dateRange = generateDateRange(startLocal, endLocal, granularity);

    // Helper to build cashflow/cumulative data
    const buildCashflowData = (
      txs: typeof transactions,
      isCumulative: boolean
    ): ChartDataPoint[] => {
      const dateMap = new Map<string, { income: number; expense: number }>();

      for (const date of dateRange) {
        const key = getDateKey(date, granularity);
        dateMap.set(key, { income: 0, expense: 0 });
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

    // Helper to build balance data using initial balance + cumulative changes
    const buildBalanceData = async (
      filterCurrency: string | null
    ): Promise<ChartDataPoint[]> => {
      const filteredAccounts = filterCurrency
        ? accounts.filter(a => a.currency === filterCurrency)
        : accounts;

      // Get initial balance (sum of all filtered accounts' initial balances)
      // Then fetch all transactions before start date to calculate starting balance
      const accountIds = filteredAccounts.map(a => a.id);

      // Get transactions before start date
      const priorTransactions = await prisma.transaction.findMany({
        where: {
          user_id: user.user_id,
          deleted_at: null,
          date: { lt: start },
          account_id: { in: accountIds },
          type: { in: ['income', 'expense'] },
          ...(search && {
            OR: [
              { description: { contains: search, mode: 'insensitive' } },
              { payee: { contains: search, mode: 'insensitive' } }
            ]
          }),
          ...((minAmount !== null || maxAmount !== null) && {
            amount: {
              ...(minAmount !== null && { gte: Number(minAmount) }),
              ...(maxAmount !== null && { lte: Number(maxAmount) }),
            }
          })
        },
        select: {
          amount: true,
          type: true,
        },
      });

      // Calculate starting balance
      let startingBalance = filteredAccounts.reduce((sum, acc) => sum + Number(acc.initial_balance), 0);
      for (const tx of priorTransactions) {
        const amount = Number(tx.amount);
        if (tx.type === 'income') {
          startingBalance += Math.abs(amount);
        } else {
          startingBalance -= Math.abs(amount);
        }
      }

      // Build daily changes from filtered transactions
      const filteredTxs = filterCurrency
        ? transactions.filter(tx => tx.account?.currency === filterCurrency)
        : transactions;

      const dateMap = new Map<string, number>();
      for (const date of dateRange) {
        const key = getDateKey(date, granularity);
        dateMap.set(key, 0);
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
        const change = dateMap.get(key) || 0;
        runningBalance += change;
        chartData.push({ date: formatDateLabel(date, granularity), value: runningBalance });
      }

      return chartData;
    };

    // Build grouped data for cashflow
    const buildGroupedCashflowData = (
      txs: typeof transactions,
      isCumulative: boolean
    ): GroupedChartData[] => {
      const groupedData: GroupedChartData[] = [];

      if (groupBy === 'accounts') {
        const accountMap = new Map<string, { name: string; color: string | null }>();
        for (const acc of accounts) {
          accountMap.set(acc.id, { name: acc.name, color: acc.color });
        }

        for (const [accId, accInfo] of accountMap) {
          const accTxs = txs.filter(tx => tx.account_id === accId);
          const data = buildCashflowDataForGroup(accTxs, isCumulative);
          groupedData.push({
            groupId: accId,
            groupName: accInfo.name,
            color: accInfo.color,
            data,
          });
        }
      } else if (groupBy === 'categories') {
        const categoryMap = new Map<string, { name: string; color: string | null }>();
        for (const tx of txs) {
          if (tx.category) {
            categoryMap.set(tx.category.id, { name: tx.category.name, color: tx.category.color });
          }
        }

        for (const [catId, catInfo] of categoryMap) {
          const catTxs = txs.filter(tx => tx.category_id === catId);
          const data = buildCashflowDataForGroup(catTxs, isCumulative);
          groupedData.push({
            groupId: catId,
            groupName: catInfo.name,
            color: catInfo.color,
            data,
          });
        }
      } else if (groupBy === 'currencies') {
        for (const currency of currencies) {
          const currencyTxs = txs.filter(tx => tx.account?.currency === currency);
          const data = buildCashflowDataForGroup(currencyTxs, isCumulative);
          groupedData.push({
            groupId: currency,
            groupName: currency,
            color: null,
            data,
          });
        }
      }

      return groupedData;
    };

    const buildCashflowDataForGroup = (
      txs: typeof transactions,
      isCumulative: boolean
    ): ChartDataPoint[] => {
      const dateMap = new Map<string, { income: number; expense: number }>();

      for (const date of dateRange) {
        const key = getDateKey(date, granularity);
        dateMap.set(key, { income: 0, expense: 0 });
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

    // Build main chart data
    let chartData: ChartDataPoint[] = [];
    let groupedData: GroupedChartData[] = [];

    if (dataType === 'balance') {
      chartData = await buildBalanceData(null);
      // For balance with grouping, we'd need more complex logic
      // For now, grouping is mainly for cashflow
    } else {
      const isCumulative = dataType === 'cumulative_cashflow';
      chartData = buildCashflowData(transactions, isCumulative);
      groupedData = buildGroupedCashflowData(transactions, isCumulative);
    }

    // Build data per currency
    const dataByCurrency: Record<string, { chartData: ChartDataPoint[]; groupedData: GroupedChartData[] }> = {};

    for (const currency of currencies) {
      if (dataType === 'balance') {
        dataByCurrency[currency] = {
          chartData: await buildBalanceData(currency),
          groupedData: [],
        };
      } else {
        const isCumulative = dataType === 'cumulative_cashflow';
        const currencyTxs = transactions.filter(tx => tx.account?.currency === currency);
        dataByCurrency[currency] = {
          chartData: buildCashflowData(currencyTxs, isCumulative),
          groupedData: buildGroupedCashflowData(currencyTxs, isCumulative),
        };
      }
    }

    const response: AdvancedChartsResponse = {
      dataType,
      granularity,
      groupBy,
      chartData,
      groupedData,
      currencies,
      dataByCurrency,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Advanced charts error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch advanced charts data', 500);
  }
}
