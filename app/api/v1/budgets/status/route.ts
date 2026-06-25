import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { successResponse, errorResponse } from '@/lib/api/response';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Authenticate user
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  // Parse query parameters
  const startDateStr = searchParams.get('start_date');
  const endDateStr = searchParams.get('end_date');
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  const draftsParam = searchParams.get('drafts') || 'exclude'; // 'include', 'exclude', 'only'

  try {
    // Build date filter
    const dateFilter: { gte?: Date; lte?: Date } = {};
    let diffDays = 30; // default to monthly view if bounds are not passed

    if (startDateStr) {
      dateFilter.gte = new Date(startDateStr);
    }
    if (endDateStr) {
      dateFilter.lte = new Date(endDateStr);
    }

    if (startDateStr && endDateStr) {
      const msDiff = dateFilter.lte!.getTime() - dateFilter.gte!.getTime();
      diffDays = msDiff / (1000 * 60 * 60 * 24);
    }

    // Determine the period
    const appliedPeriod = diffDays > 60 ? 'annually' : 'monthly';

    // Fetch active budgets for the user
    const categoryBudgets = await prisma.categoryBudget.findMany({
      where: {
        category: {
          user_id: user.user_id,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
            type: true,
          },
        },
      },
    });

    if (categoryBudgets.length === 0) {
      return successResponse([]);
    }

    // Calculate spending for each budget via single optimized grouped SQL query
    const categoryIds = categoryBudgets.map(b => b.category_id);
    
    // Determine draft filter
    const draftFilter: { is_draft?: boolean } = {};
    if (draftsParam === 'exclude') draftFilter.is_draft = false;
    else if (draftsParam === 'only') draftFilter.is_draft = true;

    const aggregations = await prisma.transaction.groupBy({
      by: ['category_id'],
      where: {
        user_id: user.user_id,
        deleted_at: null,
        type: { in: ['income', 'expense'] },
        category_id: { in: categoryIds },
        ...draftFilter,
        ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
      },
      _sum: {
        amount: true,
      },
    });

    const spentMap = new Map<string, number>();
    for (const agg of aggregations) {
      if (agg.category_id) {
        spentMap.set(agg.category_id, Number(agg._sum.amount || 0));
      }
    }

    const budgetStatuses = categoryBudgets.map((budget) => {
      const categoryId = budget.category_id;
      const spent = spentMap.get(categoryId) || 0;

      let basicBudget = 0;
      let extendBudget = 0;

      if (appliedPeriod === 'monthly') {
        basicBudget = Number(budget.basic_monthly_amount);
        extendBudget = Number(budget.extend_monthly_amount);
      } else {
        basicBudget = Number(budget.basic_annual_amount);
        extendBudget = Number(budget.extend_annual_amount);
      }

      const totalBudget = basicBudget + extendBudget;

      // If total is 0, skip showing this setup since nothing is budgeted
      if (totalBudget === 0) {
        return null;
      }

      const percentage = totalBudget > 0 ? (spent / totalBudget) * 100 : 0;

      // Determine status
      let status: 'success' | 'warning' | 'danger';
      if (spent > totalBudget) {
        status = 'danger'; // Exceeded total (basic + extend)
      } else if (spent > basicBudget) {
        status = 'warning'; // Exceeded basic, dipping into extend
      } else {
        status = 'success'; // Within basic
      }

      return {
        id: budget.id,
        category_id: categoryId,
        category: budget.category.name,
        applied_period: appliedPeriod,
        spent,
        basic_budget: basicBudget,
        extend_budget: extendBudget,
        total_budget: totalBudget,
        percentage: Math.round(percentage * 10) / 10,
        status,
      };
    });

    // Filter out null values and sort by severity
    const validStatuses = budgetStatuses
      .filter((status): status is NonNullable<typeof status> => status !== null)
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, limit);

    return successResponse(validStatuses);
  } catch (error) {
    logError('Fetch budget status error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch budget status', 500);
  }
}
