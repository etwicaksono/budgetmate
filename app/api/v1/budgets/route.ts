import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { errorResponse } from '@/lib/api/response';

export const dynamic = 'force-dynamic';

type EnhancedBudget = Prisma.CategoryBudgetGetPayload<Record<string, never>> & {
  spent_monthly: number;
  spent_annual: number;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  const monthParam = searchParams.get('month');
  const yearParam = searchParams.get('year');
  const startDateParam = searchParams.get('start_date');
  const endDateParam = searchParams.get('end_date');
  const accountIdsParam = searchParams.get('account_ids')?.split(',').filter(Boolean) ?? [];
  const draftsParam = searchParams.get('drafts') || 'exclude'; // 'include', 'exclude', 'only'

  const now = new Date();
  const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
  const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1; // 1-based

  try {
    const budgets = await prisma.categoryBudget.findMany({
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



    // Monthly boundaries
    const monthlyStart = startDateParam ? new Date(startDateParam) : new Date(year, month - 1, 1);
    const monthlyEnd = endDateParam ? new Date(endDateParam) : new Date(year, month, 0, 23, 59, 59, 999);

    // Annual boundaries
    const annualStart = new Date(year, 0, 1);
    const annualEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    // Run aggregations concurrently
    const accountFilter = accountIdsParam.length > 0 ? { account_id: { in: accountIdsParam } } : {};
    
    // Determine draft filter
    const draftFilter: { is_draft?: boolean } = {};
    if (draftsParam === 'exclude') draftFilter.is_draft = false;
    else if (draftsParam === 'only') draftFilter.is_draft = true;

    const [monthlyAgg, annualAgg] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['category_id'],
        where: {
          user_id: user.user_id,
          deleted_at: null,
          type: { in: ['income', 'expense'] },
          date: { gte: monthlyStart, lte: monthlyEnd },
          ...accountFilter,
          ...draftFilter,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.groupBy({
        by: ['category_id'],
        where: {
          user_id: user.user_id,
          deleted_at: null,
          type: { in: ['income', 'expense'] },
          date: { gte: annualStart, lte: annualEnd },
          ...accountFilter,
          ...draftFilter,
        },
        _sum: { amount: true },
      })
    ]);

    const monthlySpentMap = new Map<string, number>();
    for (const agg of monthlyAgg) {
      if (agg.category_id) {
        monthlySpentMap.set(agg.category_id, Number(agg._sum.amount || 0));
      }
    }

    const annualSpentMap = new Map<string, number>();
    for (const agg of annualAgg) {
      if (agg.category_id) {
        annualSpentMap.set(agg.category_id, Number(agg._sum.amount || 0));
      }
    }

    const categoriesWithSpending = new Set([...monthlySpentMap.keys(), ...annualSpentMap.keys()]);

    // Attach spent data to budgets
    const enhancedBudgets: EnhancedBudget[] = budgets.map(budget => ({
      ...budget,
      spent_monthly: monthlySpentMap.get(budget.category_id) || 0,
      spent_annual: annualSpentMap.get(budget.category_id) || 0,
    }));

    // Inject dummy budgets for categories that have spending but no budget configured
    for (const catId of categoriesWithSpending) {
      if (!budgets.find(b => b.category_id === catId)) {
        enhancedBudgets.push({
          id: '',
          category_id: catId,
          basic_monthly_amount: new Prisma.Decimal(0),
          extend_monthly_amount: new Prisma.Decimal(0),
          basic_annual_amount: new Prisma.Decimal(0),
          extend_annual_amount: new Prisma.Decimal(0),
          created_at: new Date(),
          updated_at: new Date(),
          spent_monthly: monthlySpentMap.get(catId) || 0,
          spent_annual: annualSpentMap.get(catId) || 0,
        });
      }
    }

    return NextResponse.json({ success: true, data: enhancedBudgets, debug: { yearParam, monthParam, year, month, monthlyStart, monthlyEnd, monthlyAgg } });
  } catch (error) {
    console.error('Fetch budgets error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch budgets', 500);
  }
}
