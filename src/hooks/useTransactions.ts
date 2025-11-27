/**
 * Custom hook for transaction management
 * Following SRP - separates data fetching logic from UI
 */

import { useState, useEffect, useCallback } from 'react';
import { transactionService, Transaction, TransactionFilters } from '@/services/transactionService';
import { useToast } from '@/context/ToastContext';
import { APP_CONFIG } from '@/utils/constants';

interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: Error | null;
  filters: TransactionFilters;
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
  setFilters: React.Dispatch<React.SetStateAction<TransactionFilters>>;
  refreshTransactions: () => Promise<void>;
  handleFilterChange: (key: keyof TransactionFilters, value: string | number | undefined) => void;
  handlePageChange: (page: number) => void;
}

export function useTransactions(initialFilters?: Partial<TransactionFilters>): UseTransactionsResult {
  const { showToast } = useToast();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    limit: APP_CONFIG.pagination.transactionsPerPage,
    sort_by: 'date',
    sort_order: 'desc',
    ...initialFilters
  });
  const [meta, setMeta] = useState({
    page: 1,
    per_page: APP_CONFIG.pagination.transactionsPerPage,
    total: 0,
    total_pages: 0
  });
  
  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await transactionService.fetchTransactions(filters);
      setTransactions(response.transactions);
      setMeta(response.meta);
    } catch (err) {
      const error = err as Error;
      setError(error);
      showToast('Failed to load transactions', 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, showToast]);
  
  // Load transactions on mount and filter changes
  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);
  
  // Listen for transaction events
  useEffect(() => {
    const handleTransactionEvent = () => {
      void fetchTransactions();
    };
    
    window.addEventListener('transaction-created', handleTransactionEvent);
    window.addEventListener('transaction-updated', handleTransactionEvent);
    window.addEventListener('transaction-deleted', handleTransactionEvent);
    
    return () => {
      window.removeEventListener('transaction-created', handleTransactionEvent);
      window.removeEventListener('transaction-updated', handleTransactionEvent);
      window.removeEventListener('transaction-deleted', handleTransactionEvent);
    };
  }, [fetchTransactions]);
  
  // Handle filter changes
  const handleFilterChange = useCallback((key: keyof TransactionFilters, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page on filter change
    }));
  }, []);
  
  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  }, []);
  
  // Refresh transactions
  const refreshTransactions = useCallback(async () => {
    await fetchTransactions();
  }, [fetchTransactions]);
  
  return {
    transactions,
    loading,
    error,
    filters,
    meta,
    setFilters,
    refreshTransactions,
    handleFilterChange,
    handlePageChange
  };
}
