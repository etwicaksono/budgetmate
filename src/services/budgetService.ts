import { api } from './api';

export interface CategoryBudget {
  id: string;
  category_id: string;
  basic_monthly_amount: string | number;
  extend_monthly_amount: string | number;
  basic_annual_amount: string | number;
  extend_annual_amount: string | number;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  spent_monthly?: number;
  spent_annual?: number;
}

export interface BudgetStatus {
  id: string;
  category_id: string;
  category: string;
  applied_period: 'monthly' | 'annually';
  spent: number;
  basic_budget: number;
  extend_budget: number;
  total_budget: number;
  percentage: number;
  status: 'success' | 'warning' | 'danger';
}

export interface SetCategoryBudgetRequest {
  basic_monthly_amount: number;
  extend_monthly_amount: number;
  basic_annual_amount: number;
  extend_annual_amount: number;
}

export interface BudgetFilterParams {
  month?: number;
  year?: number;
  start_date?: string;
  end_date?: string;
  account_ids?: string;
  label_ids?: string;
  exclude_label_ids?: string;
  drafts?: string;
}

class BudgetService {
  async fetchBudgets(params?: BudgetFilterParams): Promise<CategoryBudget[]> {
    let url = '/budgets';
    if (params) {
      const q = new URLSearchParams();
      if (params.month) q.append('month', params.month.toString());
      if (params.year) q.append('year', params.year.toString());
      if (params.start_date) q.append('start_date', params.start_date);
      if (params.end_date) q.append('end_date', params.end_date);
      if (params.account_ids) q.append('account_ids', params.account_ids);
      if (params.label_ids) q.append('label_ids', params.label_ids);
      if (params.exclude_label_ids) q.append('exclude_label_ids', params.exclude_label_ids);
      if (params.drafts) q.append('drafts', params.drafts);
      if (q.toString()) url += `?${q.toString()}`;
    }
    const response = await api.get<{ success: boolean; data: CategoryBudget[] }>(url);
    return response.data;
  }

  async fetchBudgetStatus(params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
    account_ids?: string;
    category_ids?: string;
    drafts?: string;
  }): Promise<BudgetStatus[]> {
    const response = await api.get<{ success: boolean; data: BudgetStatus[] }>(
      '/budgets/status',
      { params }
    );
    return response.data;
  }

  async getCategoryBudget(categoryId: string): Promise<CategoryBudget | null> {
    const response = await api.get<{ success: boolean; data: CategoryBudget | null }>(`/budgets/${categoryId}`);
    return response.data;
  }

  async setCategoryBudget(categoryId: string, data: SetCategoryBudgetRequest): Promise<CategoryBudget> {
    const response = await api.put<{ success: boolean; data: CategoryBudget }>(`/budgets/${categoryId}`, data);
    return response.data;
  }

  async deleteCategoryBudget(categoryId: string): Promise<void> {
    await api.delete<{ success: boolean }>(`/budgets/${categoryId}`);
  }
}

export const budgetService = new BudgetService();
