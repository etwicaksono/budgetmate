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
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const currencyFilter = searchParams.get('currency');

  try {
    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Fetch expense transactions grouped by category
    const transactions = await prisma.transaction.findMany({
      where: {
        user_id: user.user_id,
        deleted_at: null,
        type: 'expense',
        category_id: { not: null },
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
        ...(currencyFilter && { currency: currencyFilter }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });

    // Group by currency and category, sum amounts
    // Key format: "currency:categoryId"
    const categoryMap = new Map<string, {
      category_id: string;
      category_name: string;
      amount: number;
      color: string;
      currency: string;
    }>();

    // Track totals per currency
    const currencyTotals = new Map<string, number>();

    for (const transaction of transactions) {
      if (!transaction.category) continue;

      const currency = transaction.currency;
      const categoryId = transaction.category.id;
      const key = `${currency}:${categoryId}`;
      const existing = categoryMap.get(key);
      const amount = Math.abs(Number(transaction.amount)); // Use absolute value for expenses

      // Update currency total
      currencyTotals.set(currency, (currencyTotals.get(currency) || 0) + amount);

      if (existing) {
        existing.amount += amount;
      } else {
        categoryMap.set(key, {
          category_id: categoryId,
          category_name: transaction.category.name,
          amount: amount,
          color: transaction.category.color || '#6c757d',
          currency: currency,
        });
      }
    }

    // Convert to array and calculate percentages per currency
    const expenses = Array.from(categoryMap.values())
      .map(item => {
        const currencyTotal = currencyTotals.get(item.currency) || 0;
        return {
          ...item,
          percentage: currencyTotal > 0 ? (item.amount / currencyTotal) * 100 : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);

    // Get list of currencies that have expenses
    const currencies = Array.from(currencyTotals.keys()).sort();

    return successResponse({ expenses, currencies });
  } catch (error) {
    console.error('Fetch expenses by category error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch expenses by category', 500);
  }
}
