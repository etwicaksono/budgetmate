import { api } from './api';
import { USE_MOCK_DATA, mockDataService } from './mockData';

export interface Budget {
  id: string;
  personal_id: number;
  name: string;
  category_id?: string;
  category?: {
    name: string;
    icon: string;
    color: string;
  };
  amount: number;
  period: 'monthly' | 'yearly' | 'custom';
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetStatus {
  id: string;
  category: string;
  spent: number;
  total: number;
  percentage: number;
  status: 'success' | 'warning' | 'danger';
}

export interface CreateBudgetRequest {
  personal_id: number;
  name: string;
  category_id?: string;
  amount: number;
  period: 'monthly' | 'yearly' | 'custom';
  start_date?: string;
  end_date?: string;
  is_active?: boolean;
}

export interface BudgetResponse {
  success: boolean;
  data: Budget[];
  meta?: {
    total: number;
  };
}

class BudgetService {
  async fetchBudgets(params?: {
    is_active?: boolean;
    period?: string;
    category_id?: string;
  }): Promise<Budget[]> {
    if (USE_MOCK_DATA) {
      throw new Error('Not implemented in mock data');
    }
    const response = await api.get<BudgetResponse>('/budgets', { params });
    return response.data;
  }
  
  async fetchBudgetStatus(params?: {
    start_date?: string;
    end_date?: string;
    limit?: number;
  }): Promise<BudgetStatus[]> {
    if (USE_MOCK_DATA) {
      return mockDataService.fetchBudgetStatus();
    }
    const response = await api.get<{ success: boolean; data: BudgetStatus[] }>(
      '/budgets/status',
      { params }
    );
    return response.data;
  }
  
  async fetchBudgetById(id: string): Promise<Budget> {
    const response = await api.get<{ success: boolean; data: Budget }>(`/budgets/${id}`);
    return response.data;
  }
  
  async createBudget(data: CreateBudgetRequest): Promise<Budget> {
    const response = await api.post<{ success: boolean; data: Budget }>('/budgets', data);
    return response.data;
  }
  
  async updateBudget(id: string, data: Partial<CreateBudgetRequest>): Promise<Budget> {
    const response = await api.put<{ success: boolean; data: Budget }>(`/budgets/${id}`, data);
    return response.data;
  }
  
  async deleteBudget(id: string): Promise<void> {
    await api.delete(`/budgets/${id}`);
  }
}

export const budgetService = new BudgetService();
