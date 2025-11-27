import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Authenticate user
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const metric = searchParams.get('metric') || 'balance';
  const period = searchParams.get('period') || 'daily';
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  try {
    console.log('[Trends API] Request params:', { metric, period, startDate, endDate });

    // Validate parameters
    if (!['income', 'expense', 'net', 'balance'].includes(metric)) {
      return errorResponse('INVALID_PARAMETER', 'Invalid metric', 400);
    }

    if (!['daily', 'weekly', 'monthly', 'yearly'].includes(period)) {
      return errorResponse('INVALID_PARAMETER', 'Invalid period', 400);
    }

    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    console.log('[Trends API] Date filter:', {
      gte: dateFilter.gte?.toISOString(),
      lte: dateFilter.lte?.toISOString()
    });

    // For balance metric, fetch accounts to get initial balances per currency
    let initialBalances: Map<string, number> | null = null;
    if (metric === 'balance') {
      const accounts = await prisma.account.findMany({
        where: {
          user_id: user.user_id,
          deleted_at: null,
          is_included_in_total: true,
        },
        select: {
          currency: true,
          initial_balance: true,
        },
      });

      initialBalances = new Map<string, number>();
      for (const account of accounts) {
        const currency = account.currency || 'USD';
        const current = initialBalances.get(currency) || 0;
        initialBalances.set(currency, current + Number(account.initial_balance));
      }
    }

    // Fetch transactions based on metric (include currency for multi-currency support)
    let transactions;
    if (metric === 'income' || metric === 'expense' || metric === 'net') {
      const typeFilter = metric === 'income' 
        ? 'income' 
        : metric === 'expense' 
        ? 'expense' 
        : undefined;

      transactions = await prisma.transaction.findMany({
        where: {
          user_id: user.user_id,
          deleted_at: null,
          ...(typeFilter && { type: typeFilter }),
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        select: {
          date: true,
          amount: true,
          type: true,
          currency: true,
        },
        orderBy: {
          date: 'asc',
        },
      });
    } else {
      // For balance trend, we need all transactions with currency
      transactions = await prisma.transaction.findMany({
        where: {
          user_id: user.user_id,
          deleted_at: null,
          ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        },
        select: {
          date: true,
          amount: true,
          type: true,
          currency: true,
        },
        orderBy: {
          date: 'asc',
        },
      });
    }

    // Group transactions by period and currency for multi-currency support
    const groupedData = new Map<string, Map<string, number>>();
    const currencies = new Set<string>();

    console.log('[Trends API] Total transactions fetched:', transactions.length);
    console.log('[Trends API] Transactions:', JSON.stringify(transactions.map(t => ({
      date: t.date,
      currency: t.currency,
      amount: t.amount,
      type: t.type
    })), null, 2));

    // Add currencies from initial balances (even if no transactions exist)
    if (initialBalances) {
      initialBalances.forEach((_, currency) => currencies.add(currency));
      console.log('[Trends API] Initial balances:', Array.from(initialBalances.entries()));
    }

    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      let key: string;

      switch (period) {
        case 'daily':
          key = date.toISOString().split('T')[0]!;
          break;
        case 'weekly': {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = weekStart.toISOString().split('T')[0]!;
          break;
        }
        case 'monthly':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          key = String(date.getFullYear());
          break;
        default:
          key = date.toISOString().split('T')[0]!;
      }

      const currency = transaction.currency || 'USD';
      currencies.add(currency);

      if (!groupedData.has(key)) {
        groupedData.set(key, new Map());
      }
      
      const periodData = groupedData.get(key)!;
      const current = periodData.get(currency) || 0;
      
      // Note: Amounts are already signed in database (income: +, expense: -)
      // So we just add them directly without flipping
      const amount = Number(transaction.amount);
      
      if (metric === 'balance' || metric === 'net') {
        // For balance and net, amounts are already signed correctly
        periodData.set(currency, current + amount);
      } else {
        // For income or expense metrics, use absolute value
        periodData.set(currency, current + Math.abs(amount));
      }
    }

    // Get all date keys and sort
    const labels = Array.from(groupedData.keys()).sort();
    const currencyList = Array.from(currencies).sort();

    // For balance metric, calculate cumulative sum per currency (starting from initial balance)
    if (metric === 'balance') {
      const cumulativeBalances = new Map<string, number>();
      
      // Initialize with initial balances from accounts
      currencyList.forEach(currency => {
        const initialBalance = initialBalances?.get(currency) || 0;
        cumulativeBalances.set(currency, initialBalance);
      });

      // If there are transactions, calculate cumulative for each period
      if (labels.length > 0) {
        for (const label of labels) {
          const periodData = groupedData.get(label)!;
          
          currencyList.forEach(currency => {
            const currentCumulative = cumulativeBalances.get(currency) || 0;
            const periodChange = periodData.get(currency) || 0;
            const newCumulative = currentCumulative + periodChange;
            
            cumulativeBalances.set(currency, newCumulative);
            periodData.set(currency, newCumulative);
          });
        }
      } else {
        // No transactions in period, but still need to show initial balances
        // Create a single data point for the start date
        const dateKey = startDate 
          ? new Date(startDate).toISOString().split('T')[0]! 
          : new Date().toISOString().split('T')[0]!;
        
        labels.push(dateKey);
        const periodData = new Map<string, number>();
        
        currencyList.forEach(currency => {
          const balance = cumulativeBalances.get(currency) || 0;
          periodData.set(currency, balance);
        });
        
        groupedData.set(dateKey, periodData);
      }
    }

    // Convert to datasets format (one dataset per currency)
    const datasets = currencyList.map(currency => ({
      label: currency,
      data: labels.map(label => {
        const periodData = groupedData.get(label);
        return periodData?.get(currency) || 0;
      }),
    }));

    return successResponse({
      labels,
      datasets,
      currencies: currencyList, // Added for frontend convenience
    });
  } catch (error) {
    console.error('Fetch trends error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch trends', 500);
  }
}
