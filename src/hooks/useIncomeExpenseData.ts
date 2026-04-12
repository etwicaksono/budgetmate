'use client';

import { useState, useEffect, useMemo } from 'react';
import { analyticsService, type IncomeExpenseReport } from '@/services/analyticsService';
import { useAuth } from '@/context/AuthContext';

type PeriodType = 'month' | 'week' | 'year' | 'custom';

interface UseIncomeExpenseDataParams {
  startDate?: string | undefined;
  endDate?: string | undefined;
  periodType?: PeriodType | undefined;
  selectedCategories?: string[] | undefined;
  selectedAccounts?: string[] | undefined;
  selectedCurrencies?: string[] | undefined;
  numberOfColumns: number;
}

interface UseIncomeExpenseDataResult {
  data: IncomeExpenseReport | null;
  loading: boolean;
  error: string | null;
  sortedCurrencies: string[];
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  defaultCurrency: string;
}

export function useIncomeExpenseData({
  startDate,
  endDate,
  periodType = 'month',
  selectedCategories,
  selectedAccounts,
  selectedCurrencies,
  numberOfColumns,
}: UseIncomeExpenseDataParams): UseIncomeExpenseDataResult {
  const [data, setData] = useState<IncomeExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const { user } = useAuth();
  const defaultCurrency = user?.currency || 'USD';

  // Sort currencies with default currency first
  const sortedCurrencies = useMemo(() => {
    if (!data) return [];
    const currencies = [...data.currencies];
    if (defaultCurrency && currencies.includes(defaultCurrency)) {
      currencies.sort((a, b) => {
        if (a === defaultCurrency) return -1;
        if (b === defaultCurrency) return 1;
        return 0;
      });
    }
    return currencies;
  }, [data, defaultCurrency]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: {
          start_date?: string;
          end_date?: string;
          period_type?: PeriodType;
          periods?: number;
          category_ids?: string[];
          account_ids?: string[];
          currencies?: string[];
        } = {
          period_type: periodType,
          periods: numberOfColumns,
        };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (selectedCategories?.length) params.category_ids = selectedCategories;
        if (selectedAccounts?.length) params.account_ids = selectedAccounts;
        if (selectedCurrencies?.length) params.currencies = selectedCurrencies;

        const reportData = await analyticsService.fetchIncomeExpenseReport(params);
        setData(reportData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate, numberOfColumns, periodType, selectedCategories, selectedAccounts, selectedCurrencies]);

  // Set default currency when data loads
  useEffect(() => {
    if (sortedCurrencies.length > 0 && !selectedCurrency) {
      setSelectedCurrency(sortedCurrencies[0]!);
    } else if (sortedCurrencies.length > 0 && !sortedCurrencies.includes(selectedCurrency)) {
      setSelectedCurrency(sortedCurrencies[0]!);
    }
  }, [sortedCurrencies, selectedCurrency]);

  return { data, loading, error, sortedCurrencies, selectedCurrency, setSelectedCurrency, defaultCurrency };
}
