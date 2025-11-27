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

  try {
    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Fetch active budgets for the user
    const budgets = await prisma.budget.findMany({
      where: {
        user_id: user.user_id,
        is_active: true,
      },
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                icon: true,
                color: true,
              },
            },
          },
        },
      },
    });

    // If no budgets, return empty array
    if (budgets.length === 0) {
      return successResponse([]);
    }

    // Calculate spending for each budget
    const budgetStatuses = await Promise.all(
      budgets.map(async (budget) => {
        // Get category IDs for this budget
        const categoryIds = budget.categories.map((bc) => bc.category_id);

        // If budget has no categories, skip it
        if (categoryIds.length === 0) {
          return null;
        }

        // Calculate spent amount for these categories
        const transactions = await prisma.transaction.findMany({
          where: {
            user_id: user.user_id,
            deleted_at: null,
            type: 'expense',
            category_id: { in: categoryIds },
            ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
          },
          select: {
            amount: true,
          },
        });

        const spent = transactions.reduce(
          (sum, t) => sum + Number(t.amount),
          0
        );

        const total = Number(budget.amount);
        const percentage = total > 0 ? (spent / total) * 100 : 0;

        // Determine status based on percentage
        let status: 'success' | 'warning' | 'danger';
        if (percentage >= 100) {
          status = 'danger';
        } else if (percentage >= 80) {
          status = 'warning';
        } else {
          status = 'success';
        }

        // Get category name (use first category or budget name)
        const categoryName =
          budget.categories[0]?.category.name || budget.name;

        // Get currency from budget (defaults to IDR if not set)
        const currency = budget.currency || 'IDR';

        return {
          id: budget.id,
          category: categoryName,
          spent: spent,
          total: total,
          percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
          status: status,
          currency: currency,
        };
      })
    );

    // Filter out null values and limit results
    const validStatuses = budgetStatuses
      .filter((status): status is NonNullable<typeof status> => status !== null)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, limit);

    return successResponse(validStatuses);
  } catch (error) {
    console.error('Fetch budget status error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch budget status', 500);
  }
}
