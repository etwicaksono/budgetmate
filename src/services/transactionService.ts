import { api } from './api';
import type { TransactionType } from '@prisma/client';

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
  type: TransactionType | 'transfer';
  description?: string;
  debt_id?: string;
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
  from_account_id?: string;
  transfer_description?: string;
  is_draft?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionRequest {
  date: string;
  account_id: string;
  category_id?: string;
  amount: number;
  type: TransactionType | 'transfer';
  description?: string;
  payee?: string;
  payment_method?: string;
  payment_status?: string;
  label_ids?: string[];
  is_draft?: boolean;
  // Transfer-specific fields
  to_account_id?: string;
}

export interface TransactionFilters {
  page?: number;
  limit?: number;
  account_id?: string;
  category_id?: string;
  type?: TransactionType | 'transfer';
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  keyword?: string;
  search?: string;
  label_ids?: string[] | string;
  exclude_label_ids?: string[] | string;
  account_ids?: string;
  category_ids?: string;
  transfer_option?: string;
  debt_option?: string;
  draft_option?: string;
  sort_by?: 'date' | 'amount' | 'created_at' | 'abs_amount';
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
  };
}

export interface BulkDeleteTransactionsRequest {
  allMatching?: boolean;
  ids?: string[];
  filters?: TransactionFilters;
}

/** Fields applied to every selected transaction; omitted keys are left unchanged. */
export interface BulkUpdateTransactionsData {
  description?: string;
  payee?: string;
  payment_method?: string;
  payment_status?: string;
  category_id?: string;
  label_ids?: string[];
  /** 'replace' swaps the whole label set, 'append' only adds. Defaults to append. */
  label_mode?: 'replace' | 'append';
}

export interface BulkUpdateTransactionsRequest {
  allMatching?: boolean;
  ids?: string[];
  filters?: TransactionFilters;
  data: BulkUpdateTransactionsData;
}

/** Why some selected transactions were not updated. */
export interface BulkUpdateSkipBreakdown {
  transferOrDebt: number;
  categoryTypeMismatch: number;
}

export interface BulkUpdateTransactionsResult {
  updatedCount: number;
  skipped: BulkUpdateSkipBreakdown;
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

  async bulkDeleteTransactions(payload: BulkDeleteTransactionsRequest): Promise<{ deletedCount: number }> {
    // Delete typically doesn't have a body but axios supports config.data
    const response = await api.delete<{ success: boolean; data: { deletedCount: number } }>(
      '/transactions/bulk',
      { data: payload }
    );
    return response.data;
  }

  async bulkUpdateTransactions(
    payload: BulkUpdateTransactionsRequest
  ): Promise<BulkUpdateTransactionsResult> {
    const response = await api.patch<{ success: boolean; data: BulkUpdateTransactionsResult }>(
      '/transactions/bulk',
      payload
    );
    return response.data;
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
