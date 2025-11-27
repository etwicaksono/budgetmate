import { api } from './api';
import { USE_MOCK_DATA, mockDataService } from './mockData';

export interface AnalyticsSummary {
  total_income: number;
  total_expenses: number;
  net_income: number;
  savings_rate: number;
  top_categories: Array<{
    category_id: string;
    category_name: string;
    total: number;
    percentage: number;
  }>;
  account_balances: Array<{
    account_id: string;
    account_name: string;
    balance: number;
  }>;
}

export interface TrendData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color?: string;
  }>;
}

export interface CashFlow {
  date: string;
  inflow: number;
  outflow: number;
  net: number;
  balance: number;
}

export interface ExpenseByCategory {
  category_id: string;
  category_name: string;
  amount: number;
  percentage: number;
  color: string;
  currency: string;
}

export interface ExpensesByCategoryResponse {
  expenses: ExpenseByCategory[];
  currencies: string[];
}

export interface IncomeExpenseData {
  name: string;
  income: number;
  expense: number;
}

export interface IncomeVsExpensesResponse {
  data: IncomeExpenseData[] | Record<string, IncomeExpenseData[]>;
  currencies: string[];
}

export interface CategoryReport {
  id: string;
  name: string;
  icon: string;
  color: string;
  currentMonth: number;
  previousMonth: number;
  hasSubItems?: boolean;
  subItems?: CategoryReport[];
}

export interface CurrencyReport {
  incomeCategories: CategoryReport[];
  expenseCategories: CategoryReport[];
  totalIncome: number;
  totalExpense: number;
  previousTotalIncome: number;
  previousTotalExpense: number;
}

export interface IncomeExpenseReport {
  currentMonthName: string;
  previousMonthName: string;
  currencies: string[];
  data: Record<string, CurrencyReport>;
}

class AnalyticsService {
  async fetchSummary(params?: {
    period?: 'month' | 'quarter' | 'year';
    start_date?: string;
    end_date?: string;
  }): Promise<AnalyticsSummary> {
    if (USE_MOCK_DATA) {
      throw new Error('Not implemented in mock data');
    }
    const response = await api.get<{ success: boolean; data: AnalyticsSummary }>(
      '/analytics/summary',
      { params }
    );
    return response.data;
  }
  
  async fetchTrends(params: {
    metric: 'income' | 'expense' | 'net' | 'balance';
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    group_by?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<TrendData> {
    if (USE_MOCK_DATA) {
      return mockDataService.fetchTrends();
    }
    const response = await api.get<{ success: boolean; data: TrendData }>(
      '/analytics/trends',
      { params }
    );
    return response.data;
  }
  
  async fetchCashFlow(params?: {
    start_date?: string;
    end_date?: string;
    account_id?: string;
  }): Promise<CashFlow[]> {
    if (USE_MOCK_DATA) {
      return mockDataService.fetchCashFlow();
    }
    const response = await api.get<{ success: boolean; data: CashFlow[] }>(
      '/analytics/cashflow',
      { params }
    );
    return response.data;
  }
  
  async fetchExpensesByCategory(params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
    currency?: string;
  }): Promise<ExpensesByCategoryResponse> {
    if (USE_MOCK_DATA) {
      const expenses = await mockDataService.fetchExpensesByCategory();
      const currencies = [...new Set(expenses.map(e => e.currency || 'USD'))];
      return { expenses, currencies };
    }
    const response = await api.get<{ success: boolean; data: ExpensesByCategoryResponse }>(
      '/analytics/expenses-by-category',
      { params }
    );
    return response.data;
  }
  
  async fetchNetWorthHistory(): Promise<TrendData> {
    const response = await api.get<{ success: boolean; data: TrendData }>(
      '/analytics/net-worth'
    );
    return response.data;
  }
  
  async fetchCategoryBreakdown(categoryId: string, params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<{
    total: number;
    transactions: number;
    average: number;
    trend: TrendData;
  }> {
    const response = await api.get<{ 
      success: boolean; 
      data: {
        total: number;
        transactions: number;
        average: number;
        trend: TrendData;
      }
    }>(
      `/analytics/category-breakdown/${categoryId}`,
      { params }
    );
    return response.data;
  }

  async fetchIncomeVsExpenses(params?: {
    start_date?: string;
    end_date?: string;
    currency?: string;
  }): Promise<IncomeVsExpensesResponse> {
    const response = await api.get<{ success: boolean; data: IncomeVsExpensesResponse }>(
      '/analytics/income-vs-expenses',
      { params }
    );
    return response.data;
  }

  async fetchIncomeExpenseReport(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<IncomeExpenseReport> {
    const response = await api.get<{ success: boolean; data: IncomeExpenseReport }>(
      '/analytics/income-expense-report',
      { params }
    );
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();
