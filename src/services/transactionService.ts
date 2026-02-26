import { api } from './api';
import { USE_MOCK_DATA, mockDataService } from './mockData';

export interface Transaction {
  id: string;
  date: string;
  account_id: string;
  account?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  };
  category_id?: string;
  category?: {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: string;
  };
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'transfer_in' | 'transfer_out';
  description?: string;
  currency: string;
  payee?: string;
  payment_method?: string;
  payment_status?: string;
  label_ids?: string[];
  labels?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  // Transfer-specific fields (populated when transaction is part of a transfer)
  transfer_id?: string;
  to_account_id?: string;
  to_amount?: number;
  from_account_id?: string;
  transfer_description?: string;
  transfer_currency?: string;
  to_currency?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionRequest {
  date: string;
  account_id: string;
  category_id?: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer' | 'transfer_in' | 'transfer_out';
  description?: string;
  currency?: string;
  payee?: string;
  payment_method?: string;
  payment_status?: string;
  label_ids?: string[];
  // Transfer-specific fields
  to_account_id?: string;
  to_amount?: number;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  account_id?: string;
  category_id?: string;
  type?: 'income' | 'expense' | 'transfer' | 'transfer_in' | 'transfer_out';
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  keyword?: string;
  label_ids?: string[];
  sort_by?: 'date' | 'amount';
  sort_order?: 'asc' | 'desc';
}

export interface TransactionsResponse {
  success: boolean;
  data: Transaction[];
  meta: {
    page: number;
    per_page?: number;
    limit?: number;
    total: number;
    total_pages?: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
    totals_by_currency?: Record<string, number>;
  };
}

export interface TransactionSummary {
  total_income: number;
  total_expense: number;
  net_amount: number;
  transaction_count: number;
  by_category: Array<{
    category_id: string;
    category_name: string;
    total: number;
    count: number;
  }>;
}

class TransactionService {
  async fetchTransactions(filters?: TransactionFilters): Promise<{
    transactions: Transaction[];
    meta: TransactionsResponse['meta'];
  }> {
    if (USE_MOCK_DATA) {
      const transactions = await mockDataService.fetchTransactions();
      return {
        transactions,
        meta: {
          page: 1,
          per_page: 10,
          total: transactions.length,
          total_pages: 1,
        }
      };
    }

    const params = filters ? {
      ...filters,
      // label_ids is already a comma-separated string from the caller
    } : undefined;

    const response = await api.get<TransactionsResponse>('/transactions', { params });
    return {
      transactions: response.data,
      meta: response.meta
    };
  }

  async fetchTransactionById(id: string): Promise<Transaction> {
    const response = await api.get<{ success: boolean; data: Transaction }>(
      `/transactions/${id}`
    );
    return response.data;
  }

  async createTransaction(data: CreateTransactionRequest): Promise<Transaction> {
    const response = await api.post<{ success: boolean; data: Transaction }>(
      '/transactions',
      data
    );
    return response.data;
  }

  async updateTransaction(id: string, data: Partial<CreateTransactionRequest>): Promise<Transaction> {
    const response = await api.put<{ success: boolean; data: Transaction }>(
      `/transactions/${id}`,
      data
    );
    return response.data;
  }

  async deleteTransaction(id: string): Promise<void> {
    await api.delete(`/transactions/${id}`);
  }

  async fetchTransactionSummary(filters?: {
    start_date?: string;
    end_date?: string;
    account_id?: string;
  }): Promise<TransactionSummary> {
    const response = await api.get<{ success: boolean; data: TransactionSummary }>(
      '/transactions/summary',
      { params: filters }
    );
    return response.data;
  }

  async bulkCreateTransactions(transactions: CreateTransactionRequest[]): Promise<Transaction[]> {
    const response = await api.post<{ success: boolean; data: Transaction[] }>(
      '/transactions/bulk',
      { transactions }
    );
    return response.data;
  }

  async importTransactions(file: File, accountId: string, format: 'csv' | 'ofx' | 'qif'): Promise<{
    imported: number;
    failed: number;
    errors?: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('account_id', accountId);
    formData.append('format', format);

    const response = await api.post<{
      success: boolean;
      data: { imported: number; failed: number; errors?: string[]; }
    }>('/transactions/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    return response.data;
  }
}

export const transactionService = new TransactionService();
