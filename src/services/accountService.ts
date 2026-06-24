import { api } from './api';

export interface Account {
  id: string;
  name: string;
  account_type: 'checking' | 'savings' | 'credit_card' | 'cash' | 'investment' | 'loan';
  icon: string;
  color: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  is_included_in_total: boolean;
  order?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountRequest {
  name: string;
  account_type: string;
  icon: string;
  color: string;
  initial_balance?: number;
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
    include_balance?: boolean;
    include_draft?: boolean;
  }): Promise<Account[]> {
    const response = await api.get<AccountsResponse>('/accounts', { params });
    return response.data;
  }

  async fetchAccountById(id: string): Promise<Account> {
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

  async swapAccountOrder(orderMap: Array<{ id: string; order: number }>): Promise<void> {
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
