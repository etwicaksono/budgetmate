import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const currency = searchParams.get('currency');

  try {
    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Fetch all transactions (income and expense)
    const transactions = await prisma.transaction.findMany({
      where: {
        user_id: user.user_id,
        deleted_at: null,
        type: { in: ['income', 'expense'] },
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        ...(currency && { currency }),
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

    // Group by month and currency
    const monthlyData = new Map<string, Map<string, { income: number; expense: number }>>();
    const currencies = new Set<string>();

    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const txCurrency = transaction.currency || 'IDR';
      
      currencies.add(txCurrency);

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, new Map());
      }

      const monthData = monthlyData.get(monthKey)!;
      if (!monthData.has(txCurrency)) {
        monthData.set(txCurrency, { income: 0, expense: 0 });
      }

      const currencyData = monthData.get(txCurrency)!;
      const amount = Math.abs(Number(transaction.amount));

      if (transaction.type === 'income') {
        currencyData.income += amount;
      } else {
        currencyData.expense += amount;
      }
    }

    // Convert to array format grouped by currency
    const sortedMonths = Array.from(monthlyData.keys()).sort();
    const currencyList = Array.from(currencies).sort();

    // Build response data per currency
    const dataByCurrency: Record<string, Array<{ name: string; income: number; expense: number }>> = {};

    for (const curr of currencyList) {
      dataByCurrency[curr] = sortedMonths.map(monthKey => {
        const parts = monthKey.split('-');
        const month = parts[1] || '01';
        const monthIndex = parseInt(month, 10) - 1;
        const monthName = MONTH_NAMES[monthIndex] || month;
        
        const monthData = monthlyData.get(monthKey);
        const currencyData = monthData?.get(curr) || { income: 0, expense: 0 };

        return {
          name: monthName,
          income: currencyData.income,
          expense: currencyData.expense,
        };
      });
    }

    // If currency filter is applied, return only that currency's data
    if (currency && dataByCurrency[currency]) {
      return successResponse({
        data: dataByCurrency[currency],
        currencies: [currency],
      });
    }

    return successResponse({
      data: dataByCurrency,
      currencies: currencyList,
    });
  } catch (error) {
    console.error('Fetch income vs expenses error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch income vs expenses data', 500);
  }
}
