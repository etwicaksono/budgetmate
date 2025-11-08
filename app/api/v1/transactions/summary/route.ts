import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

// GET /api/v1/transactions/summary - Get transaction statistics
/**
 * @summary Return aggregate transaction stats.
 * @description Requires bearer auth, filters by optional `start_date`/`end_date`, and responds with totals, net balance, and breakdowns by category/account/type.
 * @tag Transactions
 * @security bearerAuth
 * @param request Authenticated Next.js request carrying optional date range query params.
 * @response 200 - Summary metrics returned successfully.
 * @response 401 - Authentication failed.
 * @response 500 - Server error while computing the summary.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');

    // Build where clause
    const where: any = {
      user_id: user.user_id,
    };

    // Date range filter
    if (start_date || end_date) {
      where.date = {};
      if (start_date) where.date.gte = new Date(start_date);
      if (end_date) where.date.lte = new Date(end_date);
    }

    // Get all transactions for the period
    const transactions = await db.transactions.findMany({
      where,
    });

    // Get unique account IDs and category IDs
    const accountIds = Array.from(new Set(transactions.map(t => t.account_id)));
    const categoryIds = Array.from(new Set(transactions.map(t => t.category_id)));

    // Fetch accounts and categories
    const accounts = await db.accounts.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, name: true },
    });

    const categories = await db.categories.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    // Create maps for quick lookup
    const accountMap = new Map(accounts.map(a => [a.id, a]));
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = totalIncome - totalExpense;

    // Group by category
    const byCategoryMap = new Map<string, { category_id: string; category_name: string; total: number; count: number }>();
    
    transactions.forEach(t => {
      const key = t.category_id;
      const category = categoryMap.get(t.category_id);
      if (!byCategoryMap.has(key)) {
        byCategoryMap.set(key, {
          category_id: t.category_id,
          category_name: category?.name || 'Unknown',
          total: 0,
          count: 0,
        });
      }
      const entry = byCategoryMap.get(key)!;
      entry.total += t.amount;
      entry.count += 1;
    });

    const byCategory = Array.from(byCategoryMap.values())
      .sort((a, b) => b.total - a.total);

    // Group by account
    const byAccountMap = new Map<string, { account_id: string; account_name: string; total: number; count: number }>();
    
    transactions.forEach(t => {
      const key = t.account_id;
      const account = accountMap.get(t.account_id);
      if (!byAccountMap.has(key)) {
        byAccountMap.set(key, {
          account_id: t.account_id,
          account_name: account?.name || 'Unknown',
          total: 0,
          count: 0,
        });
      }
      const entry = byAccountMap.get(key)!;
      entry.total += t.amount;
      entry.count += 1;
    });

    const byAccount = Array.from(byAccountMap.values())
      .sort((a, b) => b.total - a.total);

    // Group by type
    const incomeCount = transactions.filter(t => t.type === 'INCOME').length;
    const expenseCount = transactions.filter(t => t.type === 'EXPENSE').length;

    return jsonResponse(
      ApiResponseBuilder.success('Transaction summary retrieved successfully', {
        total_income: totalIncome,
        total_expense: totalExpense,
        net_balance: netBalance,
        transaction_count: transactions.length,
        income_count: incomeCount,
        expense_count: expenseCount,
        by_category: byCategory,
        by_account: byAccount,
      }),
      200
    );
  } catch (error) {
    console.error('Get transaction summary error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
