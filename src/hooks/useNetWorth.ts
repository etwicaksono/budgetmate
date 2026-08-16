'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { accountService, type Account } from '@/services/accountService';
import { debtService, type Debt } from '@/services/debtService';
import { onAppEvent } from '@/lib/eventBus';
import { logError } from '@/lib/logger';

export interface UseNetWorthReturn {
  data: number;
  accountBalance: number;
  totalCredit: number;
  totalDebt: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useNetWorth(includeDraft: boolean = false, accountIds: string[] = []): UseNetWorthReturn {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lendDebts, setLendDebts] = useState<Debt[]>([]);
  const [borrowDebts, setBorrowDebts] = useState<Debt[]>([]);
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
      setLendDebts(lendData.data);
      setBorrowDebts(borrowData.data);
    } catch (err) {
      logError('Failed to fetch net worth data:', err);
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

    const unsubscribeAccountCreated = onAppEvent('account-created', handleChange);
    const unsubscribeAccountUpdated = onAppEvent('account-updated', handleChange);
    const unsubscribeAccountDeleted = onAppEvent('account-deleted', handleChange);
    const unsubscribeTransactionCreated = onAppEvent('transaction-created', handleChange);
    const unsubscribeTransactionUpdated = onAppEvent('transaction-updated', handleChange);
    const unsubscribeTransactionDeleted = onAppEvent('transaction-deleted', handleChange);
    const unsubscribeDebtCreated = onAppEvent('debt-created', handleChange);
    const unsubscribeDebtUpdated = onAppEvent('debt-updated', handleChange);
    const unsubscribeDebtDeleted = onAppEvent('debt-deleted', handleChange);

    return () => {
      unsubscribeAccountCreated();
      unsubscribeAccountUpdated();
      unsubscribeAccountDeleted();
      unsubscribeTransactionCreated();
      unsubscribeTransactionUpdated();
      unsubscribeTransactionDeleted();
      unsubscribeDebtCreated();
      unsubscribeDebtUpdated();
      unsubscribeDebtDeleted();
    };
  }, [fetchData]);

  const accountBalance = useMemo(() => {
    return accounts.reduce((sum, account) => {
      if (!account.is_included_in_total) return sum;
      // An empty selection means "all accounts"
      if (accountIds.length > 0 && !accountIds.includes(account.id)) return sum;
      return sum + account.current_balance;
    }, 0);
  }, [accounts, accountIds]);

  const sumRemaining = useCallback(
    (debts: Debt[]) =>
      debts.reduce((sum, debt) => {
        if (accountIds.length > 0 && !accountIds.includes(debt.account_id)) return sum;
        return sum + (debt.remaining_amount || 0);
      }, 0),
    [accountIds]
  );

  const totalCredit = useMemo(() => sumRemaining(lendDebts), [sumRemaining, lendDebts]);
  const totalDebt = useMemo(() => sumRemaining(borrowDebts), [sumRemaining, borrowDebts]);

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
