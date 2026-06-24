'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { accountService, type Account } from '@/services/accountService';
import { debtService } from '@/services/debtService';

export interface UseNetWorthReturn {
  data: number;
  accountBalance: number;
  totalCredit: number;
  totalDebt: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useNetWorth(includeDraft: boolean = false): UseNetWorthReturn {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalCredit, setTotalCredit] = useState(0);
  const [totalDebt, setTotalDebt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [accountsData, lendData, borrowData] = await Promise.all([
        accountService.fetchAccounts({ is_active: true, include_draft: includeDraft }),
        debtService.fetchDebts({ limit: -1, status: 'active', type: 'lend' }),
        debtService.fetchDebts({ limit: -1, status: 'active', type: 'borrow' }),
      ]);

      setAccounts(accountsData);

      const creditTotal = lendData.data.reduce((sum, debt) => sum + (debt.remaining_amount || 0), 0);
      const debtTotalValue = borrowData.data.reduce((sum, debt) => sum + (debt.remaining_amount || 0), 0);

      setTotalCredit(creditTotal);
      setTotalDebt(debtTotalValue);
    } catch (err) {
      console.error('Failed to fetch net worth data:', err);
      setError('Failed to load net worth data');
    } finally {
      setIsLoading(false);
    }
  }, [includeDraft]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Listen for relevant events to auto-refresh
  useEffect(() => {
    const handleChange = () => {
      fetchData();
    };

    window.addEventListener('account-created', handleChange);
    window.addEventListener('account-updated', handleChange);
    window.addEventListener('account-deleted', handleChange);
    window.addEventListener('transaction-created', handleChange);
    window.addEventListener('transaction-updated', handleChange);
    window.addEventListener('transaction-deleted', handleChange);
    window.addEventListener('debt-created', handleChange);
    window.addEventListener('debt-updated', handleChange);
    window.addEventListener('debt-deleted', handleChange);

    return () => {
      window.removeEventListener('account-created', handleChange);
      window.removeEventListener('account-updated', handleChange);
      window.removeEventListener('account-deleted', handleChange);
      window.removeEventListener('transaction-created', handleChange);
      window.removeEventListener('transaction-updated', handleChange);
      window.removeEventListener('transaction-deleted', handleChange);
      window.removeEventListener('debt-created', handleChange);
      window.removeEventListener('debt-updated', handleChange);
      window.removeEventListener('debt-deleted', handleChange);
    };
  }, [fetchData]);

  const accountBalance = useMemo(() => {
    return accounts.reduce((sum, account) => {
      if (!account.is_included_in_total) return sum;
      return sum + account.current_balance;
    }, 0);
  }, [accounts]);

  const data = useMemo(() => {
    return accountBalance + totalCredit - totalDebt;
  }, [accountBalance, totalCredit, totalDebt]);

  return {
    data,
    accountBalance,
    totalCredit,
    totalDebt,
    isLoading,
    error,
    refresh: fetchData,
  };
}
