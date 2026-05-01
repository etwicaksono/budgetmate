import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getClientTimezoneOffset, getUtcFromLocal } from '@/lib/timezone';

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

  const offsetMinutes = getClientTimezoneOffset(startDateParam);

  const getUtcFromLocalWithOffset = (year: number, month: number, day: number, hours: number, minutes: number, seconds: number, ms: number = 0) => {
    return getUtcFromLocal(year, month, day, hours, minutes, seconds, ms, offsetMinutes);
  };

  // Get the base date in local time so we can cleanly extract its logical month/year
  const baseDateUtc = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), now.getMonth(), 1);
  const baseLocal = new Date(baseDateUtc.getTime() + offsetMinutes * 60000);

  // Calculate date ranges based on period type
  const periodRanges: { start: Date; end: Date; name: string }[] = [];

  if (periodType === 'month') {
    for (let i = 0; i < numPeriods; i++) {
      const year = baseLocal.getUTCFullYear();
      const month = baseLocal.getUTCMonth() - i;

      const periodStart = getUtcFromLocalWithOffset(year, month, 1, 0, 0, 0, 0);
      const periodEnd = getUtcFromLocalWithOffset(year, month + 1, 0, 23, 59, 59, 999);

      const localStart = new Date(periodStart.getTime() + offsetMinutes * 60000);
      const name = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(localStart);

      periodRanges.push({ start: periodStart, end: periodEnd, name });
    }
  } else if (periodType === 'week') {
    const dayOfWeek = baseLocal.getUTCDay();
    const mondayLocal = new Date(baseLocal);
    mondayLocal.setUTCDate(baseLocal.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    mondayLocal.setUTCHours(0, 0, 0, 0);

    for (let i = 0; i < numPeriods; i++) {
      const startLocal = new Date(mondayLocal);
      startLocal.setUTCDate(mondayLocal.getUTCDate() - (i * 7));

      const endLocal = new Date(startLocal);
      endLocal.setUTCDate(startLocal.getUTCDate() + 6);
      endLocal.setUTCHours(23, 59, 59, 999);

      const periodStart = new Date(startLocal.getTime() - offsetMinutes * 60000);
      const periodEnd = new Date(endLocal.getTime() - offsetMinutes * 60000);

      const nameStart = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(startLocal);
      const nameEnd = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(endLocal);
      const name = `${nameStart} - ${nameEnd}`;

      periodRanges.push({ start: periodStart, end: periodEnd, name });
    }
  } else if (periodType === 'year') {
    const baseYear = baseLocal.getUTCFullYear();
    for (let i = 0; i < numPeriods; i++) {
      const year = baseYear - i;
      const periodStart = getUtcFromLocalWithOffset(year, 0, 1, 0, 0, 0, 0);
      const periodEnd = getUtcFromLocalWithOffset(year, 11, 31, 23, 59, 59, 999);
      const name = year.toString();
      periodRanges.push({ start: periodStart, end: periodEnd, name });
    }
  } else {
    // Custom range
    const customStart = startDateParam ? new Date(startDateParam) : getUtcFromLocalWithOffset(baseLocal.getUTCFullYear(), baseLocal.getUTCMonth(), 1, 0, 0, 0, 0);
    const customEnd = endDateParam ? new Date(endDateParam) : getUtcFromLocalWithOffset(baseLocal.getUTCFullYear(), baseLocal.getUTCMonth() + 1, 0, 23, 59, 59, 999);

    const totalDays = Math.ceil((customEnd.getTime() - customStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const daysPerPeriod = Math.max(1, Math.ceil(totalDays / numPeriods));

    for (let i = 0; i < numPeriods; i++) {
      const startLocal = new Date(customStart.getTime() + offsetMinutes * 60000);
      startLocal.setUTCDate(startLocal.getUTCDate() - (i * daysPerPeriod));

      const endLocal = new Date(startLocal);
      endLocal.setUTCDate(startLocal.getUTCDate() + daysPerPeriod - 1);
      endLocal.setUTCHours(23, 59, 59, 999);

      const periodStart = new Date(startLocal.getTime() - offsetMinutes * 60000);
      const periodEnd = new Date(endLocal.getTime() - offsetMinutes * 60000);

      const nameStart = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(startLocal);
      const nameEnd = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(endLocal);
      const name = `${nameStart} - ${nameEnd}`;

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
      const whereClause: Prisma.TransactionWhereInput = {
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
        by: ['category_id', 'currency'],
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
    // Ensure we have at least one currency (e.g., USD) to build an empty tree for new users
    if (currencySet.size === 0) {
      currencySet.add('USD');
    }
    const currencies = Array.from(currencySet).sort();

    // Create lookup maps for amounts by period and currency
    // Map<currency, Map<categoryId, number[]>>
    const amountsByCurrency = new Map<string, Map<string, number[]>>();

    currencies.forEach((currency) => {
      amountsByCurrency.set(currency, new Map());
    });

    // Process transactions for each period
    allPeriodTransactions.forEach((periodTxns, periodIndex) => {
      periodTxns.forEach((t) => {
        if (t.category_id) {
          const amount = Number(t._sum.amount) || 0;
          const categoryMap = amountsByCurrency.get(t.currency)!;

          if (!categoryMap.has(t.category_id)) {
            categoryMap.set(t.category_id, new Array(numPeriods).fill(0));
          }
          const targetArray = categoryMap.get(t.category_id)!;
          targetArray[periodIndex] = amount;
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

        const buildCategoryReport = (amountsMap: Map<string, number[]>, multiplier: number): CategoryReport => {
          // Initialize parent totals for each month
          const parentTotals = new Array(numPeriods).fill(0);
          const parentAmounts = amountsMap.get(parent.id) || new Array(numPeriods).fill(0);
          parentAmounts.forEach((amt, idx) => { parentTotals[idx] += amt * multiplier; });

          const subItems: CategoryReport[] = children.map((child) => {
            const childAmounts = amountsMap.get(child.id) || new Array(numPeriods).fill(0);
            const scaledChildAmounts = new Array(numPeriods).fill(0);
            childAmounts.forEach((amt, idx) => {
              scaledChildAmounts[idx] = amt * multiplier;
              parentTotals[idx] += amt * multiplier;
            });

            return {
              id: child.id,
              name: child.name,
              icon: child.icon || 'FaTag',
              color: child.color || parent.color || '#6c757d',
              amounts: scaledChildAmounts,
            };
          });

          return {
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
        };

        if (parent.analytic_flag === 'income') {
          incomeCategories.push(buildCategoryReport(categoryAmounts, 1));
        } else if (parent.analytic_flag === 'expense') {
          expenseCategories.push(buildCategoryReport(categoryAmounts, -1));
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
