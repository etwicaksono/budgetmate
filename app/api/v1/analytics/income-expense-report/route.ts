import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAuth } from '@/lib/auth/middleware';
import { successResponse, errorResponse } from '@/lib/api/response';

interface CategoryReport {
  id: string;
  name: string;
  icon: string;
  color: string;
  currentMonth: number;
  previousMonth: number;
  hasSubItems?: boolean;
  subItems?: CategoryReport[];
}

interface CurrencyReport {
  incomeCategories: CategoryReport[];
  expenseCategories: CategoryReport[];
  totalIncome: number;
  totalExpense: number;
  previousTotalIncome: number;
  previousTotalExpense: number;
}

interface IncomeExpenseReport {
  currentMonthName: string;
  previousMonthName: string;
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

  // Get date parameters or default to current/previous month
  const now = new Date();
  const currentMonthStart = searchParams.get('start_date') 
    ? new Date(searchParams.get('start_date')!)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = searchParams.get('end_date')
    ? new Date(searchParams.get('end_date')!)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Calculate previous month dates
  const previousMonthStart = new Date(currentMonthStart);
  previousMonthStart.setMonth(previousMonthStart.getMonth() - 1);
  const previousMonthEnd = new Date(currentMonthEnd);
  previousMonthEnd.setMonth(previousMonthEnd.getMonth() - 1);
  // Adjust end date for previous month
  previousMonthEnd.setDate(new Date(previousMonthEnd.getFullYear(), previousMonthEnd.getMonth() + 1, 0).getDate());

  try {
    // Get all categories for user
    const categories = await prisma.category.findMany({
      where: {
        user_id: user.user_id,
        is_active: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get current month transactions grouped by category and currency
    const currentMonthTransactions = await prisma.transaction.groupBy({
      by: ['category_id', 'type', 'currency'],
      where: {
        user_id: user.user_id,
        deleted_at: null,
        date: {
          gte: currentMonthStart,
          lte: currentMonthEnd,
        },
        type: { in: ['income', 'expense'] },
      },
      _sum: { amount: true },
    });

    // Get previous month transactions grouped by category and currency
    const previousMonthTransactions = await prisma.transaction.groupBy({
      by: ['category_id', 'type', 'currency'],
      where: {
        user_id: user.user_id,
        deleted_at: null,
        date: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
        type: { in: ['income', 'expense'] },
      },
      _sum: { amount: true },
    });

    // Collect all currencies
    const currencySet = new Set<string>();
    currentMonthTransactions.forEach((t) => currencySet.add(t.currency));
    previousMonthTransactions.forEach((t) => currencySet.add(t.currency));
    const currencies = Array.from(currencySet).sort();

    // Create lookup maps for amounts by currency: Map<currency, Map<categoryId, amount>>
    const currentAmountsByCurrency = new Map<string, Map<string, number>>();
    const previousAmountsByCurrency = new Map<string, Map<string, number>>();

    currencies.forEach((currency) => {
      currentAmountsByCurrency.set(currency, new Map());
      previousAmountsByCurrency.set(currency, new Map());
    });

    currentMonthTransactions.forEach((t) => {
      if (t.category_id) {
        const amount = Math.abs(Number(t._sum.amount) || 0);
        const currencyMap = currentAmountsByCurrency.get(t.currency)!;
        currencyMap.set(t.category_id, (currencyMap.get(t.category_id) || 0) + amount);
      }
    });

    previousMonthTransactions.forEach((t) => {
      if (t.category_id) {
        const amount = Math.abs(Number(t._sum.amount) || 0);
        const currencyMap = previousAmountsByCurrency.get(t.currency)!;
        currencyMap.set(t.category_id, (currencyMap.get(t.category_id) || 0) + amount);
      }
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
      const currentAmounts = currentAmountsByCurrency.get(currency)!;
      const previousAmounts = previousAmountsByCurrency.get(currency)!;

      const incomeCategories: CategoryReport[] = [];
      const expenseCategories: CategoryReport[] = [];

      parentCategories.forEach((parent) => {
        const children = childrenByParent.get(parent.id) || [];
        
        let parentCurrentTotal = currentAmounts.get(parent.id) || 0;
        let parentPreviousTotal = previousAmounts.get(parent.id) || 0;

        const subItems: CategoryReport[] = children.map((child) => {
          const childCurrent = currentAmounts.get(child.id) || 0;
          const childPrevious = previousAmounts.get(child.id) || 0;
          parentCurrentTotal += childCurrent;
          parentPreviousTotal += childPrevious;

          return {
            id: child.id,
            name: child.name,
            icon: child.icon || 'FaTag',
            color: child.color || parent.color || '#6c757d',
            currentMonth: childCurrent,
            previousMonth: childPrevious,
          };
        });

        const categoryReport: CategoryReport = {
          id: parent.id,
          name: parent.name,
          icon: parent.icon || 'FaFolder',
          color: parent.color || '#6c757d',
          currentMonth: parentCurrentTotal,
          previousMonth: parentPreviousTotal,
          ...(subItems.length > 0 && {
            hasSubItems: true,
            subItems,
          }),
        };

        if (parent.type === 'income') {
          incomeCategories.push(categoryReport);
        } else {
          expenseCategories.push(categoryReport);
        }
      });

      // Calculate totals for this currency
      const totalIncome = incomeCategories.reduce((sum, c) => sum + c.currentMonth, 0);
      const totalExpense = expenseCategories.reduce((sum, c) => sum + c.currentMonth, 0);
      const previousTotalIncome = incomeCategories.reduce((sum, c) => sum + c.previousMonth, 0);
      const previousTotalExpense = expenseCategories.reduce((sum, c) => sum + c.previousMonth, 0);

      data[currency] = {
        incomeCategories,
        expenseCategories,
        totalIncome,
        totalExpense,
        previousTotalIncome,
        previousTotalExpense,
      };
    });

    // Format month names
    const currentMonthName = currentMonthStart.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    const previousMonthName = previousMonthStart.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });

    const report: IncomeExpenseReport = {
      currentMonthName,
      previousMonthName,
      currencies,
      data,
    };

    return successResponse(report);
  } catch (error) {
    console.error('Failed to fetch income expense report:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch report', 500);
  }
}
