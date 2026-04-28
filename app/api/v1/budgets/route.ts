import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { prisma } from '@/lib/db/prisma';
import { errorResponse } from '@/lib/api/response';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) return authResult.error;

  const { user } = authResult;

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
          },
        },
      },
    });

    // Calculate target month and year dates
    const url = new URL(request.url);
    const monthQuery = url.searchParams.get('month');
    const yearQuery = url.searchParams.get('year');

    const targetDate = new Date();
    if (yearQuery) targetDate.setFullYear(parseInt(yearQuery, 10));
    if (monthQuery) targetDate.setMonth(parseInt(monthQuery, 10) - 1);

    const currentYear = targetDate.getFullYear();
    const currentMonth = targetDate.getMonth();

    // We use UTC aligned to 1st of month/year to match general database records cleanly
    const startOfMonth = new Date(Date.UTC(currentYear, currentMonth, 1));
    const lastDayOfMonth = new Date(Date.UTC(currentYear, currentMonth + 1, 0, 23, 59, 59));
    const startOfYear = new Date(Date.UTC(currentYear, 0, 1));
    const lastDayOfYear = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59));

    // Get monthly spending for ALL categories iteratively independent of budget rows
    const monthlyAgg = await prisma.transaction.groupBy({
      by: ['category_id'],
      where: {
        user_id: user.user_id,
        deleted_at: null,
        type: 'expense',
        date: { gte: startOfMonth, lte: lastDayOfMonth },
      },
      _sum: { amount: true },
    });

    // Get annual spending for ALL categories natively
    const annualAgg = await prisma.transaction.groupBy({
      by: ['category_id'],
      where: {
        user_id: user.user_id,
        deleted_at: null,
        type: 'expense',
        date: { gte: startOfYear, lte: lastDayOfYear },
      },
      _sum: { amount: true },
    });

    // Create maps
    const monthlyMap = new Map(monthlyAgg.map(agg => [agg.category_id, Number(agg._sum.amount || 0)]));
    const annualMap = new Map(annualAgg.map(agg => [agg.category_id, Number(agg._sum.amount || 0)]));

    const augmentedBudgets = budgets.map(budget => ({
      ...budget,
      spent_monthly: monthlyMap.get(budget.category_id) || 0,
      spent_annual: annualMap.get(budget.category_id) || 0,
    }));

    // Inject phantom shells for transactions that lack formal budget configuration
    const mappedCategoryIds = new Set(budgets.map(b => b.category_id));
    const phantomCategories = new Set([...monthlyMap.keys(), ...annualMap.keys()].filter(id => id !== null));
    mappedCategoryIds.forEach(id => phantomCategories.delete(id));

    const phantomBudgets = Array.from(phantomCategories).map(catId => ({
      id: `phantom-${catId}`,
      category_id: catId,
      currency: 'IDR',
      basic_monthly_amount: 0,
      extend_monthly_amount: 0,
      basic_annual_amount: 0,
      extend_annual_amount: 0,
      spent_monthly: monthlyMap.get(catId) || 0,
      spent_annual: annualMap.get(catId) || 0,
      created_at: new Date(),
      updated_at: new Date()
    }));

    return NextResponse.json({ success: true, data: [...augmentedBudgets, ...phantomBudgets] });
  } catch (error) {
    console.error('Fetch budgets error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch budgets', 500);
  }
}
