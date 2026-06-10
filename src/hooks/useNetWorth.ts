'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { accountService, type Account } from '@/services/accountService';
import { debtService } from '@/services/debtService';

export interface CurrencyNetWorth {
  currency: string;
  accountBalance: number;
  totalCredit: number;  // piutang (lend)
  totalDebt: number;    // hutang (borrow)
}

export interface UseNetWorthReturn {
  data: CurrencyNetWorth[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useNetWorth(includeDraft: boolean = false): UseNetWorthReturn {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditByCurrency, setCreditByCurrency] = useState<Record<string, number>>({});
  const [debtByCurrency, setDebtByCurrency] = useState<Record<string, number>>({});
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

      // Group credit (piutang) by account currency
      const creditMap: Record<string, number> = {};
      lendData.data.forEach((debt) => {
        const currency = debt.account?.currency;
        if (currency) {
          creditMap[currency] = (creditMap[currency] || 0) + (debt.remaining_amount || 0);
        }
      });
      setCreditByCurrency(creditMap);

      // Group debt (hutang) by account currency
      const debtMap: Record<string, number> = {};
      borrowData.data.forEach((debt) => {
        const currency = debt.account?.currency;
        if (currency) {
          debtMap[currency] = (debtMap[currency] || 0) + (debt.remaining_amount || 0);
        }
      });
      setDebtByCurrency(debtMap);
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

  // Merge data: only currencies that exist in accounts
  const data = useMemo<CurrencyNetWorth[]>(() => {
    // Group account balances by currency (only is_included_in_total)
    const balanceMap: Record<string, number> = {};
    const accountCurrencies = new Set<string>();

    accounts.forEach((account) => {
      accountCurrencies.add(account.currency);
      if (account.is_included_in_total) {
        balanceMap[account.currency] = (balanceMap[account.currency] || 0) + account.current_balance;
      }
    });

    // Build result only for currencies used by accounts
    const result: CurrencyNetWorth[] = Array.from(accountCurrencies).map((currency) => ({
      currency,
      accountBalance: balanceMap[currency] || 0,
      totalCredit: creditByCurrency[currency] || 0,
      totalDebt: debtByCurrency[currency] || 0,
    }));

    // Sort by account balance descending
    result.sort((a, b) => b.accountBalance - a.accountBalance);

    return result;
  }, [accounts, creditByCurrency, debtByCurrency]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
  };
}
