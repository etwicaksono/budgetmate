import { NextRequest, NextResponse } from 'next/server';
import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';
import { getClientTimezoneOffset, getUtcFromLocal } from '@/lib/timezone';
import { logError } from '@/lib/logger';

interface CategoryReport {
  id: string;
  name: string;
  icon: string;
  color: string;
  amounts: number[];
  hasSubItems?: boolean;
  subItems?: CategoryReport[];
}

interface IncomeExpenseReport {
  monthNames: string[];
  incomeCategories: CategoryReport[];
  expenseCategories: CategoryReport[];
  totalIncomes: number[];
  totalExpenses: number[];
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return authResult.error;
  }

  const { user } = authResult;
  const { searchParams } = new URL(request.url);

  const periodType = searchParams.get('period_type') || 'month';
  const numPeriods = Math.min(Math.max(parseInt(searchParams.get('periods') || '2', 10), 2), 6);

  const now = new Date();
  const startDateParam = searchParams.get('start_date');
  const endDateParam = searchParams.get('end_date');

  const offsetMinutes = getClientTimezoneOffset(startDateParam);

  const getUtcFromLocalWithOffset = (
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number,
    seconds: number,
    ms: number = 0,
  ) => {
    return getUtcFromLocal(year, month, day, hours, minutes, seconds, ms, offsetMinutes);
  };

  const baseDateUtc = startDateParam ? new Date(startDateParam) : new Date(now.getFullYear(), now.getMonth(), 1);
  const baseLocal = new Date(baseDateUtc.getTime() + offsetMinutes * 60000);

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
      periodRanges.push({ start: periodStart, end: periodEnd, name: `${nameStart} - ${nameEnd}` });
    }
  } else if (periodType === 'year') {
    const baseYear = baseLocal.getUTCFullYear();
    for (let i = 0; i < numPeriods; i++) {
      const year = baseYear - i;
      const periodStart = getUtcFromLocalWithOffset(year, 0, 1, 0, 0, 0, 0);
      const periodEnd = getUtcFromLocalWithOffset(year, 11, 31, 23, 59, 59, 999);
      periodRanges.push({ start: periodStart, end: periodEnd, name: year.toString() });
    }
  } else {
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
      periodRanges.push({ start: periodStart, end: periodEnd, name: `${nameStart} - ${nameEnd}` });
    }
  }

  const categoryIds = searchParams.get('category_ids')?.split(',').filter(Boolean) || [];
  const accountIds = searchParams.get('account_ids')?.split(',').filter(Boolean) || [];
  const draftsParam = searchParams.get('draft_option') || 'exclude';

  // Determine draft filter
  const draftFilter: { is_draft?: boolean } = {};
  if (draftsParam === 'exclude') draftFilter.is_draft = false;
  else if (draftsParam === 'only') draftFilter.is_draft = true;

  try {
    const categories = await prisma.category.findMany({
      where: {
        user_id: user.user_id,
        is_active: true,
      },
      orderBy: { name: 'asc' },
    });

    const transactionPromises = periodRanges.map(({ start, end }) => {
      const whereClause: Prisma.TransactionWhereInput = {
        user_id: user.user_id,
        deleted_at: null,
        ...draftFilter,
        date: {
          gte: start,
          lte: end,
        },
        type: { in: [TransactionType.income, TransactionType.expense] },
      };

      if (categoryIds.length > 0) {
        whereClause.category_id = { in: categoryIds };
      }
      if (accountIds.length > 0) {
        whereClause.account_id = { in: accountIds };
      }

      return prisma.transaction.groupBy({
        by: ['category_id'],
        where: whereClause,
        _sum: { amount: true },
      });
    });

    const allPeriodTransactions = await Promise.all(transactionPromises);

    const amountsByCategory = new Map<string, number[]>();
    allPeriodTransactions.forEach((periodTxns, periodIndex) => {
      periodTxns.forEach((transaction) => {
        if (!transaction.category_id) return;
        if (!amountsByCategory.has(transaction.category_id)) {
          amountsByCategory.set(transaction.category_id, new Array(numPeriods).fill(0));
        }
        amountsByCategory.get(transaction.category_id)![periodIndex] = Number(transaction._sum.amount) || 0;
      });
    });

    const parentCategories = categories.filter((category) => !category.parent_id);
    const childCategories = categories.filter((category) => category.parent_id);

    const childrenByParent = new Map<string, typeof categories>();
    childCategories.forEach((child) => {
      if (!child.parent_id) return;
      const children = childrenByParent.get(child.parent_id) || [];
      children.push(child);
      childrenByParent.set(child.parent_id, children);
    });

    const buildCategoryReport = (parent: typeof categories[number], multiplier: number): CategoryReport => {
      const parentTotals = new Array(numPeriods).fill(0);
      const parentAmounts = amountsByCategory.get(parent.id) || new Array(numPeriods).fill(0);

      parentAmounts.forEach((amount, index) => {
        parentTotals[index] += amount * multiplier;
      });

      const subItems: CategoryReport[] = (childrenByParent.get(parent.id) || []).map((child) => {
        const childAmounts = amountsByCategory.get(child.id) || new Array(numPeriods).fill(0);
        const scaledChildAmounts = new Array(numPeriods).fill(0);

        childAmounts.forEach((amount, index) => {
          const scaledAmount = amount * multiplier;
          scaledChildAmounts[index] = scaledAmount;
          parentTotals[index] += scaledAmount;
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

    const incomeCategories: CategoryReport[] = [];
    const expenseCategories: CategoryReport[] = [];

    parentCategories.forEach((parent) => {
      const flag = parent.type === 'both' ? parent.analytic_flag : parent.type;
      if (flag === 'income') {
        incomeCategories.push(buildCategoryReport(parent, 1));
      } else if (flag === 'expense') {
        expenseCategories.push(buildCategoryReport(parent, -1));
      }
    });

    const totalIncomes = new Array(numPeriods).fill(0);
    const totalExpenses = new Array(numPeriods).fill(0);

    incomeCategories.forEach((category) => {
      category.amounts.forEach((amount, index) => {
        totalIncomes[index] += amount;
      });
    });
    expenseCategories.forEach((category) => {
      category.amounts.forEach((amount, index) => {
        totalExpenses[index] += amount;
      });
    });

    const report: IncomeExpenseReport = {
      monthNames: periodRanges.map((range) => range.name),
      incomeCategories,
      expenseCategories,
      totalIncomes,
      totalExpenses,
    };

    return successResponse(report);
  } catch (error) {
    logError('Failed to fetch income expense report:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch report', 500);
  }
}
