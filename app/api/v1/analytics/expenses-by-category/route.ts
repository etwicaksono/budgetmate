import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';
import { logError } from '@/lib/logger';

interface ExpenseCategoryItem {
  category_id: string;
  category_name: string;
  parent_id: string | null;
  parent_name: string | null;
  amount: number;
  color: string;
  percentage: number;
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
  const limit = parseInt(searchParams.get('limit') || '500', 10);

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
        is_draft: false,
        type: 'expense',
        category_id: { not: null },
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            parent_id: true,
            parent: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    const categoryMap = new Map<string, Omit<ExpenseCategoryItem, 'percentage'>>();
    let totalExpense = 0;

    for (const transaction of transactions) {
      if (!transaction.category) continue;

      const categoryId = transaction.category.id;
      const amount = Math.abs(Number(transaction.amount));
      totalExpense += amount;

      const existing = categoryMap.get(categoryId);
      if (existing) {
        existing.amount += amount;
      } else {
        categoryMap.set(categoryId, {
          category_id: categoryId,
          category_name: transaction.category.name,
          parent_id: transaction.category.parent_id ?? null,
          parent_name: transaction.category.parent?.name ?? null,
          amount,
          color: transaction.category.color || '#6c757d',
        });
      }
    }

    const expenses = Array.from(categoryMap.values())
      .map(item => ({
        ...item,
        percentage: totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);

    return successResponse({ expenses });
  } catch (error) {
    logError('Fetch expenses by category error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch expenses by category', 500);
  }
}
