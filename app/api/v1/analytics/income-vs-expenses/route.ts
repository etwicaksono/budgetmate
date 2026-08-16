import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';
import { parseAnalyticsFilters, buildAnalyticsTransactionWhere } from '@/lib/api/analyticsFilters';
import { logError } from '@/lib/logger';

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
  const filters = parseAnalyticsFilters(searchParams);

  try {
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        user_id: user.user_id,
        deleted_at: null,
        type: { in: ['income', 'expense'] },
        ...buildAnalyticsTransactionWhere(filters),
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      select: {
        date: true,
        amount: true,
        type: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    const monthlyData = new Map<string, { income: number; expense: number }>();

    for (const transaction of transactions) {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, { income: 0, expense: 0 });
      }

      const monthData = monthlyData.get(monthKey)!;
      const amount = Math.abs(Number(transaction.amount));

      if (transaction.type === 'income') {
        monthData.income += amount;
      } else {
        monthData.expense += amount;
      }
    }

    const data = Array.from(monthlyData.keys()).sort().map(monthKey => {
      const [, month = '01'] = monthKey.split('-');
      const monthIndex = parseInt(month, 10) - 1;
      const monthName = MONTH_NAMES[monthIndex] || month;
      const monthData = monthlyData.get(monthKey) || { income: 0, expense: 0 };

      return {
        name: monthName,
        income: monthData.income,
        expense: monthData.expense,
      };
    });

    return successResponse({ data });
  } catch (error) {
    logError('Fetch income vs expenses error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch income vs expenses data', 500);
  }
}
