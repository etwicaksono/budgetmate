'use client';

import { useState, useEffect, useCallback } from 'react';
import { transactionService } from '../../../services/transactionService';
import type { TransactionRecord } from '../types';
import { useErrorHandler } from '../../../hooks/useErrorHandler';
// TODO: Replace custom transaction hook with query-based data layer.

interface UseTransactionsReturn {
  transactions: TransactionRecord[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  addTransaction: (transaction: Omit<TransactionRecord, 'id'>) => Promise<void>;
  updateTransaction: (id: number, updates: Partial<TransactionRecord>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  deleteMultiple: (ids: number[]) => Promise<void>;
}

export function useTransactions(): UseTransactionsReturn {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { handleAsyncError } = useErrorHandler();

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    await handleAsyncError(
      async () => {
        // TODO: Replace with actual API call when available
        const mockTransactions: TransactionRecord[] = [
          {
            id: 1,
            amount: 1500,
            type: 'Income',
            category: 'Salary',
            account: 'Checking',
            date: new Date().toISOString(),
            description: 'Monthly salary',
            currency: 'USD',
            dateTime: new Date().toISOString(),
            labels: '',
            notes: '',
            categoryId: '1',
            createTemplate: false,
            toAccount: undefined,
            toAmount: undefined,
            payer: '',
            paymentType: '',
            paymentStatus: '',
          } as TransactionRecord,
          {
            id: 2,
            amount: 50,
            type: 'Expense',
            category: 'Food',
            account: 'Credit Card',
            date: new Date().toISOString(),
            description: 'Lunch',
            currency: 'USD',
            dateTime: new Date().toISOString(),
            labels: '',
            notes: '',
            categoryId: '2',
            createTemplate: false,
            toAccount: undefined,
            toAmount: undefined,
            payer: '',
            paymentType: '',
            paymentStatus: '',
          } as TransactionRecord,
        ];
        
        setTransactions(mockTransactions);
      },
      {
        customMessage: 'Failed to load transactions',
        retry: fetchTransactions,
      }
    );
    
    setLoading(false);
  }, [handleAsyncError]);

  // Add transaction
  const addTransaction = useCallback(async (transaction: Omit<TransactionRecord, 'id'>) => {
    await handleAsyncError(
      async () => {
        // TODO: Replace with actual API call
        const newTransaction: TransactionRecord = {
          ...transaction,
          id: Date.now(), // Temporary ID generation
        } as TransactionRecord;
        
        setTransactions(prev => [newTransaction, ...prev]);
      },
      {
        customMessage: 'Failed to add transaction',
      }
    );
  }, [handleAsyncError]);

  // Update transaction
  const updateTransaction = useCallback(async (id: number, updates: Partial<TransactionRecord>) => {
    await handleAsyncError(
      async () => {
        // TODO: Replace with actual API call
        setTransactions(prev => 
          prev.map(t => t.id === id ? { ...t, ...updates } : t)
        );
      },
      {
        customMessage: 'Failed to update transaction',
      }
    );
  }, [handleAsyncError]);

  // Delete transaction
  const deleteTransaction = useCallback(async (id: number) => {
    await handleAsyncError(
      async () => {
        // TODO: Replace with actual API call
        setTransactions(prev => prev.filter(t => t.id !== id));
      },
      {
        customMessage: 'Failed to delete transaction',
      }
    );
  }, [handleAsyncError]);

  // Delete multiple transactions
  const deleteMultiple = useCallback(async (ids: number[]) => {
    await handleAsyncError(
      async () => {
        // TODO: Replace with actual API call
        setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      },
      {
        customMessage: 'Failed to delete transactions',
      }
    );
  }, [handleAsyncError]);

  // Refresh transactions
  const refresh = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);

  // Initial load
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refresh,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    deleteMultiple,
  };
}
