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
  const startDateStr = searchParams.get('start_date');
  const endDateStr = searchParams.get('end_date');
  const limit = parseInt(searchParams.get('limit') || '10', 10);

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
          },
        },
      },
    });

    if (categoryBudgets.length === 0) {
      return successResponse([]);
    }

    // Calculate spending for each budget
    const budgetStatuses = await Promise.all(
      categoryBudgets.map(async (budget) => {
        const categoryId = budget.category_id;

        // Calculate spent amount
        const transactions = await prisma.transaction.findMany({
          where: {
            user_id: user.user_id,
            deleted_at: null,
            type: 'expense',
            category_id: categoryId,
            ...(Object.keys(dateFilter).length > 0 && { date: dateFilter }),
          },
          select: {
            amount: true,
          },
        });

        const spent = transactions.reduce(
          (sum, t) => sum + Math.abs(Number(t.amount)), // Make sure to use positive representation
          0
        );

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
          currency: budget.currency || 'USD',
        };
      })
    );

    // Filter out null values and sort by severity
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
