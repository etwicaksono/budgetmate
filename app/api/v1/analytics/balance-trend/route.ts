import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';
import { balanceService } from '@/services/balanceService';
import { 
  generateAnalyticsPeriods, 
  getLocalDateKey, 
  formatDateLabelWithOffset 
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
  currency: string;
  balance: number;
}

interface CurrencyTotal {
  currency: string;
  balance: number;
  percentChange: number;
}

interface BalanceTrendResponse {
  periodLabel: string;
  totalBalance: number;
  percentChange: number;
  chartData: BalanceDataPoint[];
  chartDataByCurrency: Record<string, BalanceDataPoint[]>;
  accounts: AccountBalance[];
  currencyTotals: CurrencyTotal[];
  currencies: string[];
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
  const currencyParams = searchParams.get('currencies')?.split(',').filter(Boolean) || [];

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
    if (currencyParams.length > 0) {
      accountWhereClause.currency = { in: currencyParams };
    }

    // Fetch all active accounts
    const accounts = await prisma.account.findMany({
      where: accountWhereClause,
      orderBy: [
        { name: 'asc' },
      ],
    });

    // Calculate current balances for all accounts using balance service
    const accountIds = accounts.map(a => a.id);
    const balances = await balanceService.calculateAccountBalances(accountIds);

    // Calculate current total balance by currency
    const currencyTotalsMap = new Map<string, number>();
    const accountBalances: AccountBalance[] = accounts.map(account => {
      const balance = balances.get(account.id) ?? Number(account.initial_balance);
      const currency = account.currency || 'USD';

      if (account.is_included_in_total) {
        currencyTotalsMap.set(currency, (currencyTotalsMap.get(currency) || 0) + balance);
      }

      return {
        id: account.id,
        name: account.name,
        account_type: account.account_type,
        icon: account.icon,
        color: account.color,
        currency,
        balance,
      };
    });

    const currencyTotalsBasic = Array.from(currencyTotalsMap.entries())
      .map(([currency, balance]) => ({ currency, balance }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    const currencies = currencyTotalsBasic.map(ct => ct.currency);
    const primaryCurrency = currencies[0] || 'USD';
    const totalBalance = currencyTotalsBasic.find(ct => ct.currency === primaryCurrency)?.balance || 0;

    const transactionWhereClause: Prisma.TransactionWhereInput = {
      user_id: user.user_id,
      deleted_at: null,
      date: {
        lte: end,
      },
      account: {
        is_included_in_total: true,
      },
    };

    // Only fetch transactions for accounts we have filtered down to
    transactionWhereClause.account_id = { in: accountIds };

    // Apply optional category filter
    if (categoryIds.length > 0) {
      transactionWhereClause.category_id = { in: categoryIds };
    }

    // Fetch transactions for the current period to build daily balance chart
    const transactions = await prisma.transaction.findMany({
      where: transactionWhereClause,
      select: {
        date: true,
        amount: true,
        account: {
          select: {
            currency: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Get initial balances by currency for accounts included in total
    const initialBalancesByCurrency = new Map<string, number>();
    accounts.filter(a => a.is_included_in_total).forEach(a => {
      const currency = a.currency || 'USD';
      initialBalancesByCurrency.set(
        currency,
        (initialBalancesByCurrency.get(currency) || 0) + Number(a.initial_balance)
      );
    });

    // Build daily balance data by currency
    const dailyChangesByCurrency = new Map<string, Map<string, number>>();

    for (const tx of transactions) {
      const dateKey = getLocalDateKey(tx.date, offsetMinutes);
      const amount = Number(tx.amount);
      const currency = tx.account?.currency || 'USD';

      if (!dailyChangesByCurrency.has(currency)) {
        dailyChangesByCurrency.set(currency, new Map());
      }
      const currencyChanges = dailyChangesByCurrency.get(currency)!;
      currencyChanges.set(dateKey, (currencyChanges.get(dateKey) || 0) + amount);
    }

    // Generate chart data points for each currency
    const chartDataByCurrency: Record<string, BalanceDataPoint[]> = {};
    const currencyPercentChanges = new Map<string, number>();

    for (const currency of currencies) {
      const dailyChanges = dailyChangesByCurrency.get(currency) || new Map<string, number>();
      const initialBalance = initialBalancesByCurrency.get(currency) || 0;
      const currencyChartData: BalanceDataPoint[] = [];
      let runningBalance = initialBalance;

      // Calculate balance up to the start date
      const sortedDates = Array.from(dailyChanges.keys()).sort();
      for (const dateKey of sortedDates) {
        if (dateKey < getLocalDateKey(start, offsetMinutes)) {
          runningBalance += dailyChanges.get(dateKey) || 0;
        }
      }

      // Generate data points for each day in the period
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = getLocalDateKey(currentDate, offsetMinutes);
        runningBalance += dailyChanges.get(dateKey) || 0;

        currencyChartData.push({
          date: formatDateLabelWithOffset(currentDate, offsetMinutes),
          balance: runningBalance,
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      chartDataByCurrency[currency] = currencyChartData;

      // Calculate balance at the end of previous period for percent change
      let previousPeriodBalance = initialBalance;
      for (const dateKey of sortedDates) {
        if (dateKey <= getLocalDateKey(previousEnd, offsetMinutes)) {
          previousPeriodBalance += dailyChanges.get(dateKey) || 0;
        }
      }

      // Calculate percent change for this currency
      const currentBalance = currencyTotalsMap.get(currency) || 0;
      let pctChange = 0;
      if (previousPeriodBalance !== 0) {
        pctChange = Math.round(((currentBalance - previousPeriodBalance) / Math.abs(previousPeriodBalance)) * 100);
      } else if (currentBalance !== 0) {
        pctChange = 100;
      }
      currencyPercentChanges.set(currency, pctChange);
    }

    // Generate combined chart data (all currencies)
    const chartData: BalanceDataPoint[] = [];
    const allCurrenciesInitialBalance = Array.from(initialBalancesByCurrency.values()).reduce((sum, b) => sum + b, 0);
    let combinedRunningBalance = allCurrenciesInitialBalance;

    // Combine all daily changes
    const allDailyChanges = new Map<string, number>();
    for (const [, currencyChanges] of dailyChangesByCurrency) {
      for (const [dateKey, amount] of currencyChanges) {
        allDailyChanges.set(dateKey, (allDailyChanges.get(dateKey) || 0) + amount);
      }
    }

    const allSortedDates = Array.from(allDailyChanges.keys()).sort();
    for (const dateKey of allSortedDates) {
      if (dateKey < getLocalDateKey(start, offsetMinutes)) {
        combinedRunningBalance += allDailyChanges.get(dateKey) || 0;
      }
    }

    const combinedCurrentDate = new Date(start);
    while (combinedCurrentDate <= end) {
      const dateKey = getLocalDateKey(combinedCurrentDate, offsetMinutes);
      combinedRunningBalance += allDailyChanges.get(dateKey) || 0;

      chartData.push({
        date: formatDateLabelWithOffset(combinedCurrentDate, offsetMinutes),
        balance: combinedRunningBalance,
      });

      combinedCurrentDate.setDate(combinedCurrentDate.getDate() + 1);
    }

    // Update currency totals with percent changes
    const currencyTotalsWithChange: CurrencyTotal[] = Array.from(currencyTotalsMap.entries())
      .map(([currency, balance]) => ({
        currency,
        balance,
        percentChange: currencyPercentChanges.get(currency) || 0,
      }))
      .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));

    // Calculate overall percent change
    let previousTotalBalance = allCurrenciesInitialBalance;
    for (const dateKey of allSortedDates) {
      if (dateKey <= previousEnd.toISOString().split('T')[0]!) {
        previousTotalBalance += allDailyChanges.get(dateKey) || 0;
      }
    }

    let percentChange = 0;
    if (previousTotalBalance !== 0) {
      percentChange = Math.round(((totalBalance - previousTotalBalance) / Math.abs(previousTotalBalance)) * 100);
    } else if (totalBalance !== 0) {
      percentChange = 100;
    }

    // Generate period label
    const periodLabel = 'THIS MONTH'; // This will be overridden by frontend based on period selector

    const response: BalanceTrendResponse = {
      periodLabel,
      totalBalance,
      percentChange,
      chartData,
      chartDataByCurrency,
      accounts: accountBalances,
      currencyTotals: currencyTotalsWithChange,
      currencies,
    };

    return successResponse(response);
  } catch (error) {
    console.error('Balance trend error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch balance trend', 500);
  }
}
