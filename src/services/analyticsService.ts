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
  parent_id: string | null;
  parent_name: string | null;
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
  amounts: number[];
  hasSubItems?: boolean;
  subItems?: CategoryReport[];
}

export interface CurrencyReport {
  incomeCategories: CategoryReport[];
  expenseCategories: CategoryReport[];
  totalIncomes: number[];
  totalExpenses: number[];
}

export interface IncomeExpenseReport {
  monthNames: string[];
  currencies: string[];
  data: Record<string, CurrencyReport>;
}

export interface BalanceDataPoint {
  date: string;
  balance: number;
}

export interface AccountBalance {
  id: string;
  name: string;
  account_type: string;
  icon: string;
  color: string;
  currency: string;
  balance: number;
}

export interface CurrencyTotal {
  currency: string;
  balance: number;
  percentChange: number;
}

export interface BalanceTrendResponse {
  periodLabel: string;
  totalBalance: number;
  percentChange: number;
  chartData: BalanceDataPoint[];
  chartDataByCurrency: Record<string, BalanceDataPoint[]>;
  accounts: AccountBalance[];
  currencyTotals: CurrencyTotal[];
  currencies: string[];
}

export interface DailyCashFlow {
  date: string;
  income: number;
  expense: number;
  cashFlow: number;
}

export interface CashFlowSummary {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  percentChange: number;
}

export interface ComparisonDataPoint {
  date: string;
  value: number;
}

export interface ComparisonData {
  currentPeriod: ComparisonDataPoint[];
  previousPeriod: ComparisonDataPoint[];
  yearAgoPeriod: ComparisonDataPoint[];
}

export interface CurrencyCashFlowData {
  summary: CashFlowSummary;
  dailyData: DailyCashFlow[];
  comparisonData: {
    cashFlow: ComparisonData;
    income: ComparisonData;
    expense: ComparisonData;
  };
}
export interface CashFlowResponse {
  periodLabel: string;
  summary: CashFlowSummary;
  dailyData: DailyCashFlow[];
  comparisonData: {
    cashFlow: ComparisonData;
    income: ComparisonData;
    expense: ComparisonData;
  };
  dataByCurrency: Record<string, CurrencyCashFlowData>;
  currencies: string[];
}

// Advanced Charts types
export type AdvancedChartDataType = 'balance' | 'cashflow' | 'cumulative_cashflow';
export type AdvancedChartGraphType = 'line' | 'bar' | 'area';
export type AdvancedChartGranularity = 'day' | 'week' | 'month';
export type AdvancedChartGroupBy = 'none' | 'accounts' | 'categories' | 'currencies';

export interface AdvancedChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface GroupedChartData {
  groupId: string;
  groupName: string;
  color: string | null;
  data: AdvancedChartDataPoint[];
}

export interface AdvancedChartsResponse {
  dataType: AdvancedChartDataType;
  granularity: AdvancedChartGranularity;
  groupBy: AdvancedChartGroupBy;
  chartData: AdvancedChartDataPoint[];
  groupedData: GroupedChartData[];
  currencies: string[];
  dataByCurrency: Record<string, {
    chartData: AdvancedChartDataPoint[];
    groupedData: GroupedChartData[];
  }>;
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
    period_type?: 'month' | 'week' | 'year' | 'custom';
    periods?: number;
    category_ids?: string[]; // Added from instruction
    account_ids?: string[]; // Added from instruction
    currencies?: string[]; // Added from instruction
  }): Promise<IncomeExpenseReport> {
    const queryParams: Record<string, string | number | string[]> = { ...params };
    if (params?.category_ids?.length) queryParams['category_ids'] = params.category_ids.join(',');
    if (params?.account_ids?.length) queryParams['account_ids'] = params.account_ids.join(',');
    if (params?.currencies?.length) queryParams['currencies'] = params.currencies.join(',');

    const response = await api.get<{ success: boolean; data: IncomeExpenseReport }>(
      '/analytics/income-expense-report',
      { params: queryParams }
    );
    return response.data;
  }

  async fetchBalanceTrend(params?: {
    start_date?: string;
    end_date?: string;
    period_type?: 'month' | 'week' | 'year' | 'custom'; // Added from instruction
    category_ids?: string[]; // Added from instruction
    account_ids?: string[]; // Added from instruction
    currencies?: string[]; // Added from instruction
  }): Promise<BalanceTrendResponse> { // Kept original return type BalanceTrendResponse
    const queryParams: Record<string, string | number | string[]> = { ...params };
    if (params?.category_ids?.length) queryParams['category_ids'] = params.category_ids.join(',');
    if (params?.account_ids?.length) queryParams['account_ids'] = params.account_ids.join(',');
    if (params?.currencies?.length) queryParams['currencies'] = params.currencies.join(',');

    const response = await api.get<{ success: boolean; data: BalanceTrendResponse }>(
      '/analytics/balance-trend',
      { params: queryParams }
    );
    return response.data;
  }

  async fetchCashFlowReport(params?: {
    start_date?: string;
    end_date?: string;
    search?: string;
    min_amount?: number;
    max_amount?: number;
    category_ids?: string[];
    account_ids?: string[];
    currencies?: string[];
  }): Promise<CashFlowResponse> {
    const queryParams: Record<string, string | number | string[]> = { ...params };
    if (params?.category_ids?.length) queryParams['category_ids'] = params.category_ids.join(',');
    if (params?.account_ids?.length) queryParams['account_ids'] = params.account_ids.join(',');
    if (params?.currencies?.length) queryParams['currencies'] = params.currencies.join(',');

    const response = await api.get<{ success: boolean; data: CashFlowResponse }>(
      '/analytics/cashflow',
      { params: queryParams }
    );
    return response.data;
  }

  async fetchAdvancedCharts(params?: {
    start_date?: string;
    end_date?: string;
    type?: AdvancedChartDataType;
    granularity?: AdvancedChartGranularity;
    group_by?: AdvancedChartGroupBy;
    search?: string;
    min_amount?: number;
    max_amount?: number;
    category_ids?: string[]; // Added from instruction
    account_ids?: string[]; // Added from instruction
    currencies?: string[]; // Added from instruction
  }): Promise<AdvancedChartsResponse> { // Kept original return type AdvancedChartsResponse
    const queryParams: Record<string, string | number | string[]> = { ...params };
    if (params?.category_ids?.length) queryParams['category_ids'] = params.category_ids.join(',');
    if (params?.account_ids?.length) queryParams['account_ids'] = params.account_ids.join(',');
    if (params?.currencies?.length) queryParams['currencies'] = params.currencies.join(',');

    const response = await api.get<{ success: boolean; data: AdvancedChartsResponse }>(
      '/analytics/advanced-charts',
      { params: queryParams }
    );
    return response.data;
  }
}

export const analyticsService = new AnalyticsService();
