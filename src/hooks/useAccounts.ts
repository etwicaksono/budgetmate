/**
 * Custom hook for account management
 * Following SRP - separates data fetching logic from UI
 */

import { useState, useEffect, useCallback } from 'react';
import { accountService, Account } from '@/services/accountService';
import { useToast } from '@/context/ToastContext';

interface UseAccountsResult {
  accounts: Account[];
  loading: boolean;
  error: Error | null;
  refreshAccounts: () => Promise<void>;
  totalBalance: number;
  activeAccountsCount: number;
}

export function useAccounts(): UseAccountsResult {
  const { showToast } = useToast();
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await accountService.fetchAccounts();
      setAccounts(data);
    } catch (err) {
      const error = err as Error;
      setError(error);
      showToast('Failed to load accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  
  // Load accounts on mount
  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);
  
  // Listen for account events
  useEffect(() => {
    const handleAccountEvent = () => {
      void fetchAccounts();
    };
    
    window.addEventListener('account-created', handleAccountEvent);
    window.addEventListener('account-updated', handleAccountEvent);
    window.addEventListener('account-deleted', handleAccountEvent);
    window.addEventListener('transaction-created', handleAccountEvent);
    window.addEventListener('transaction-updated', handleAccountEvent);
    window.addEventListener('transaction-deleted', handleAccountEvent);
    
    return () => {
      window.removeEventListener('account-created', handleAccountEvent);
      window.removeEventListener('account-updated', handleAccountEvent);
      window.removeEventListener('account-deleted', handleAccountEvent);
      window.removeEventListener('transaction-created', handleAccountEvent);
      window.removeEventListener('transaction-updated', handleAccountEvent);
      window.removeEventListener('transaction-deleted', handleAccountEvent);
    };
  }, [fetchAccounts]);
  
  // Calculate total balance
  const totalBalance = accounts.reduce((sum, account) => {
    return account.is_active ? sum + account.current_balance : sum;
  }, 0);
  
  // Count active accounts
  const activeAccountsCount = accounts.filter(account => account.is_active).length;
  
  // Refresh accounts
  const refreshAccounts = useCallback(async () => {
    await fetchAccounts();
  }, [fetchAccounts]);
  
  return {
    accounts,
    loading,
    error,
    refreshAccounts,
    totalBalance,
    activeAccountsCount
  };
}
