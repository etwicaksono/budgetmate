/**
 * Transaction Service (Updated for Your Schema)
 * 
 * Handles all transaction-related API calls.
 * Types match your actual database schema from finance-api.sql
 */

import { httpClient } from './httpClient';
import type {
  Transaction,
  CreateTransactionRequest,
  UpdateTransactionRequest,
  TransactionFilters,
  TransactionListResponse,
} from '@/types/database';

/**
 * Transaction Service
 */
export const transactionService = {
  /**
   * Get all transactions with optional filters
   */
  getAll: async (filters?: TransactionFilters): Promise<TransactionListResponse> => {
    return httpClient.get<TransactionListResponse>('/api/transactions', {
      params: filters as Record<string, string | number | boolean>,
    });
  },

  /**
   * Get a single transaction by ID
   */
  getById: async (id: string): Promise<Transaction> => {
    return httpClient.get<Transaction>(`/api/transactions/${id}`);
  },

  /**
   * Create a new transaction
   * Note: position field is required in your schema
   */
  create: async (data: CreateTransactionRequest): Promise<Transaction> => {
    return httpClient.post<Transaction>('/api/transactions', data);
  },

  /**
   * Update an existing transaction
   */
  update: async (id: string, data: UpdateTransactionRequest): Promise<Transaction> => {
    return httpClient.put<Transaction>(`/api/transactions/${id}`, data);
  },

  /**
   * Delete a transaction
   */
  delete: async (id: string): Promise<void> => {
    return httpClient.delete<void>(`/api/transactions/${id}`);
  },

  /**
   * Get transaction summary/statistics
   */
  getSummary: async (startDate?: string, endDate?: string): Promise<TransactionSummary> => {
    return httpClient.get<TransactionSummary>('/api/transactions/summary', {
      params: {
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
      },
    });
  },

  /**
   * Bulk delete transactions
   */
  bulkDelete: async (ids: string[]): Promise<void> => {
    return httpClient.post<void>('/api/transactions/bulk-delete', { ids });
  },
};

// Summary types
export interface TransactionSummary {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  transaction_count: number;
  by_category: {
    category_id: string;
    category_name: string;
    total: number;
    count: number;
  }[];
  by_account: {
    account_id: string;
    account_name: string;
    total: number;
    count: number;
  }[];
}
