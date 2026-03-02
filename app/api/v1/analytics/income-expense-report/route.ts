import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';

interface CategoryReport {
  id: string;
  name: string;
  icon: string;
  color: string;
  amounts: number[]; // Array of amounts for each month
  hasSubItems?: boolean;
  subItems?: CategoryReport[];
}

interface CurrencyReport {
  incomeCategories: CategoryReport[];
  expenseCategories: CategoryReport[];
  totalIncomes: number[]; // Array of totals for each month
  totalExpenses: number[]; // Array of totals for each month
}

interface IncomeExpenseReport {
  monthNames: string[]; // Array of month names
  currencies: string[];
  data: Record<string, CurrencyReport>;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  // Get period type and number of periods to display
  const periodType = searchParams.get('period_type') || 'month'; // month, week, year, custom
  const numPeriods = Math.min(Math.max(parseInt(searchParams.get('periods') || '2', 10), 2), 6);

  // Get date parameters
  const now = new Date();
  const startDateParam = searchParams.get('start_date');
  const endDateParam = searchParams.get('end_date');

  // Calculate date ranges based on period type
  const periodRanges: { start: Date; end: Date; name: string }[] = [];

  if (periodType === 'month') {
    const baseDate = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), now.getMonth(), 1);
    for (let i = 0; i < numPeriods; i++) {
      const periodStart = new Date(baseDate);
      periodStart.setMonth(periodStart.getMonth() - i);
      periodStart.setDate(1);
      const periodEnd = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0, 23, 59, 59);
      const name = periodStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      periodRanges.push({ start: periodStart, end: periodEnd, name });
    }
  } else if (periodType === 'week') {
    const baseDate = startDateParam ? new Date(startDateParam) : now;
    // Get the Monday of the base week
    const dayOfWeek = baseDate.getDay();
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < numPeriods; i++) {
      const periodStart = new Date(monday);
      periodStart.setDate(monday.getDate() - (i * 7));
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + 6);
      periodEnd.setHours(23, 59, 59, 999);

      const name = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      periodRanges.push({ start: periodStart, end: periodEnd, name });
    }
  } else if (periodType === 'year') {
    const baseYear = startDateParam ? new Date(startDateParam).getFullYear() : now.getFullYear();
    for (let i = 0; i < numPeriods; i++) {
      const year = baseYear - i;
      const periodStart = new Date(year, 0, 1, 0, 0, 0);
      const periodEnd = new Date(year, 11, 31, 23, 59, 59);
      const name = year.toString();
      periodRanges.push({ start: periodStart, end: periodEnd, name });
    }
  } else {
    // Custom range - divide the range into equal periods
    const startDate = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = endDateParam ? new Date(endDateParam) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysPerPeriod = Math.max(1, Math.ceil(totalDays / numPeriods));

    for (let i = 0; i < numPeriods; i++) {
      const periodStart = new Date(startDate);
      periodStart.setDate(startDate.getDate() - (i * daysPerPeriod));
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodStart.getDate() + daysPerPeriod - 1);
      periodEnd.setHours(23, 59, 59, 999);

      const name = `${periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      periodRanges.push({ start: periodStart, end: periodEnd, name });
    }
  }

  // Get filter parameters
  const categoryIds = searchParams.get('category_ids')?.split(',').filter(Boolean) || [];
  const accountIds = searchParams.get('account_ids')?.split(',').filter(Boolean) || [];
  const currencyParams = searchParams.get('currencies')?.split(',').filter(Boolean) || [];

  try {
    // Get all categories for user
    const categories = await prisma.category.findMany({
      where: {
        user_id: user.user_id,
        is_active: true,
      },
      orderBy: { name: 'asc' },
    });

    // Fetch transactions for all periods in parallel
    const transactionPromises = periodRanges.map(({ start, end }) => {
      const whereClause: any = {
        user_id: user.user_id,
        deleted_at: null,
        date: {
          gte: start,
          lte: end,
        },
        type: { in: ['income', 'expense'] },
      };

      if (categoryIds.length > 0) {
        whereClause.category_id = { in: categoryIds };
      }
      if (accountIds.length > 0) {
        whereClause.account_id = { in: accountIds };
      }
      if (currencyParams.length > 0) {
        whereClause.currency = { in: currencyParams };
      }

      return prisma.transaction.groupBy({
        by: ['category_id', 'type', 'currency'],
        where: whereClause,
        _sum: { amount: true },
      });
    });

    const allPeriodTransactions = await Promise.all(transactionPromises);

    // Collect all currencies from all periods
    const currencySet = new Set<string>();
    allPeriodTransactions.forEach((periodTxns) => {
      periodTxns.forEach((t) => currencySet.add(t.currency));
    });
    const currencies = Array.from(currencySet).sort();

    // Create lookup maps for amounts by period and currency
    // Map<currency, Map<categoryId, number[]>> where number[] is amounts per period
    const amountsByCurrency = new Map<string, Map<string, number[]>>();

    currencies.forEach((currency) => {
      amountsByCurrency.set(currency, new Map());
    });

    // Process transactions for each period
    allPeriodTransactions.forEach((periodTxns, periodIndex) => {
      periodTxns.forEach((t) => {
        if (t.category_id) {
          const amount = Math.abs(Number(t._sum.amount) || 0);
          const currencyMap = amountsByCurrency.get(t.currency)!;

          if (!currencyMap.has(t.category_id)) {
            currencyMap.set(t.category_id, new Array(numPeriods).fill(0));
          }
          currencyMap.get(t.category_id)![periodIndex] = amount;
        }
      });
    });

    // Build category tree
    const parentCategories = categories.filter((c) => !c.parent_id);
    const childCategories = categories.filter((c) => c.parent_id);

    // Group children by parent
    const childrenByParent = new Map<string, typeof categories>();
    childCategories.forEach((child) => {
      if (child.parent_id) {
        const children = childrenByParent.get(child.parent_id) || [];
        children.push(child);
        childrenByParent.set(child.parent_id, children);
      }
    });

    // Build report data per currency
    const data: Record<string, CurrencyReport> = {};

    currencies.forEach((currency) => {
      const categoryAmounts = amountsByCurrency.get(currency)!;

      const incomeCategories: CategoryReport[] = [];
      const expenseCategories: CategoryReport[] = [];

      parentCategories.forEach((parent) => {
        const children = childrenByParent.get(parent.id) || [];

        // Initialize parent totals for each month
        const parentTotals = new Array(numPeriods).fill(0);
        const parentAmounts = categoryAmounts.get(parent.id) || new Array(numPeriods).fill(0);
        parentAmounts.forEach((amt, idx) => { parentTotals[idx] += amt; });

        const subItems: CategoryReport[] = children.map((child) => {
          const childAmounts = categoryAmounts.get(child.id) || new Array(numPeriods).fill(0);
          childAmounts.forEach((amt, idx) => { parentTotals[idx] += amt; });

          return {
            id: child.id,
            name: child.name,
            icon: child.icon || 'FaTag',
            color: child.color || parent.color || '#6c757d',
            amounts: childAmounts,
          };
        });

        const categoryReport: CategoryReport = {
          id: parent.id,
          name: parent.name,
          icon: parent.icon || 'FaFolder',
          color: parent.color || '#6c757d',
          amounts: parentTotals,
          ...(subItems.length > 0 && {
            hasSubItems: true,
            subItems,
          }),
        };

        if (parent.type === 'income') {
          incomeCategories.push(categoryReport);
        } else if (parent.type === 'expense') {
          expenseCategories.push(categoryReport);
        } else if (parent.type === 'both') {
          // Add to both income and expense
          incomeCategories.push({ ...categoryReport });
          expenseCategories.push({ ...categoryReport });
        }
      });

      // Calculate totals for each month
      const totalIncomes = new Array(numPeriods).fill(0);
      const totalExpenses = new Array(numPeriods).fill(0);

      incomeCategories.forEach((c) => {
        c.amounts.forEach((amt, idx) => { totalIncomes[idx] += amt; });
      });
      expenseCategories.forEach((c) => {
        c.amounts.forEach((amt, idx) => { totalExpenses[idx] += amt; });
      });

      data[currency] = {
        incomeCategories,
        expenseCategories,
        totalIncomes,
        totalExpenses,
      };
    });

    const report: IncomeExpenseReport = {
      monthNames: periodRanges.map((r) => r.name),
      currencies,
      data,
    };

    return successResponse(report);
  } catch (error) {
    console.error('Failed to fetch income expense report:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch report', 500);
  }
}
