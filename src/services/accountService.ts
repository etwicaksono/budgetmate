import { api } from './api';
import { USE_MOCK_DATA, mockDataService } from './mockData';

export interface Account {
  id: string;
  personal_id: number;
  name: string;
  account_type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'loan';
  icon: string;
  color: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  credit_limit?: number;
  interest_rate?: number;
  is_active: boolean;
  is_included_in_total: boolean;
  group_id?: string;
  group?: {
    name: string;
    icon: string;
    color: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CreateAccountRequest {
  personal_id: number;
  name: string;
  account_type: string;
  icon: string;
  color: string;
  currency?: string;
  initial_balance?: number;
  group_id?: string;
  is_active?: boolean;
  is_included_in_total?: boolean;
}

export interface AccountsResponse {
  success: boolean;
  data: Account[];
  meta?: {
    total: number;
    total_balance?: number;
  };
}

class AccountService {
  async fetchAccounts(params?: {
    is_active?: boolean;
    group_id?: string;
    include_balance?: boolean;
  }): Promise<Account[]> {
    if (USE_MOCK_DATA) {
      return mockDataService.fetchAccounts();
    }
    const response = await api.get<AccountsResponse>('/accounts', { params });
    return response.data;
  }
  
  async fetchAccountById(id: string): Promise<Account> {
    if (USE_MOCK_DATA) {
      return mockDataService.fetchAccountById(id);
    }
    const response = await api.get<{ success: boolean; data: Account }>(`/accounts/${id}`);
    return response.data;
  }
  
  async createAccount(data: CreateAccountRequest): Promise<Account> {
    const response = await api.post<{ success: boolean; data: Account }>('/accounts', data);
    return response.data;
  }
  
  async updateAccount(id: string, data: Partial<CreateAccountRequest>): Promise<Account> {
    const response = await api.put<{ success: boolean; data: Account }>(`/accounts/${id}`, data);
    return response.data;
  }
  
  async deleteAccount(id: string): Promise<void> {
    await api.delete(`/accounts/${id}`);
  }
  
  async swapAccountOrder(orderMap: Array<{ id: string; personal_id: number }>): Promise<void> {
    await api.put('/accounts/swap-order', { order_map: orderMap });
  }
  
  async getAccountBalance(id: string): Promise<number> {
    const account = await this.fetchAccountById(id);
    return account.current_balance;
  }
  
  async getNetWorth(): Promise<number> {
    const accounts = await this.fetchAccounts({ is_active: true, include_balance: true });
    return accounts
      .filter(a => a.is_included_in_total)
      .reduce((sum, a) => sum + a.current_balance, 0);
  }
}

export const accountService = new AccountService();
