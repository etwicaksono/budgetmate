import { api } from './api';
import { USE_MOCK_DATA, mockDataService } from '@/mocks/mockData';

export interface CategoryBudget {
  id: string;
  category_id: string;
  currency: string;
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
  }
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
  currency: string;
}

export interface SetCategoryBudgetRequest {
  basic_monthly_amount: number;
  extend_monthly_amount: number;
  basic_annual_amount: number;
  extend_annual_amount: number;
}

class BudgetService {
  async fetchBudgets(): Promise<CategoryBudget[]> {
    if (USE_MOCK_DATA) {
      throw new Error('Not implemented in mock data');
    }
    const response = await api.get<{ success: boolean; data: CategoryBudget[] }>('/budgets');
    return response.data;
  }
  
  async fetchBudgetStatus(params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<BudgetStatus[]> {
    if (USE_MOCK_DATA) {
      // Might want to update mock data eventually, but let it fail or use existing fallback
      return mockDataService.fetchBudgetStatus() as any;
    }
    const response = await api.get<{ success: boolean; data: BudgetStatus[] }>(
      '/budgets/status',
      { params }
    );
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
