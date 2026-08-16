'use client';

import { useState, useEffect } from 'react';
import { analyticsService, type IncomeExpenseReport } from '@/services/analyticsService';

type PeriodType = 'month' | 'week' | 'year' | 'custom';

interface UseIncomeExpenseDataParams {
  startDate?: string | undefined;
  endDate?: string | undefined;
  periodType?: PeriodType | undefined;
  selectedCategories?: string[] | undefined;
  selectedAccounts?: string[] | undefined;
  numberOfColumns: number;
  searchTerm?: string | undefined;
  minAmount?: number | undefined;
  maxAmount?: number | undefined;
  transferOption?: string | undefined;
  debtOption?: string | undefined;
  draftOption?: string | undefined;
  selectedLabelIds?: string[] | undefined;
  excludedLabelIds?: string[] | undefined;
}

interface UseIncomeExpenseDataResult {
  data: IncomeExpenseReport | null;
  loading: boolean;
  error: string | null;
}

export function useIncomeExpenseData({
  startDate,
  endDate,
  periodType = 'month',
  selectedCategories,
  selectedAccounts,
  numberOfColumns,
  searchTerm,
  minAmount,
  maxAmount,
  transferOption,
  debtOption,
  draftOption,
  selectedLabelIds,
  excludedLabelIds,
}: UseIncomeExpenseDataParams): UseIncomeExpenseDataResult {
  const [data, setData] = useState<IncomeExpenseReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          search?: string;
          min_amount?: number;
          max_amount?: number;
          transfer_option?: string;
          debt_option?: string;
          draft_option?: string;
          label_ids?: string[];
          exclude_label_ids?: string[];
        } = {
          period_type: periodType,
          periods: numberOfColumns,
        };
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (selectedCategories?.length) params.category_ids = selectedCategories;
        if (selectedAccounts?.length) params.account_ids = selectedAccounts;
        if (searchTerm) params.search = searchTerm;
        if (minAmount && minAmount > 0) params.min_amount = minAmount;
        if (maxAmount && maxAmount < 20000000) params.max_amount = maxAmount;
        if (transferOption) params.transfer_option = transferOption;
        if (debtOption) params.debt_option = debtOption;
        if (draftOption) params.draft_option = draftOption;
        if (selectedLabelIds?.length) params.label_ids = selectedLabelIds;
        if (excludedLabelIds?.length) params.exclude_label_ids = excludedLabelIds;

        const reportData = await analyticsService.fetchIncomeExpenseReport(params);
        setData(reportData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [startDate, endDate, numberOfColumns, periodType, selectedCategories, selectedAccounts, searchTerm, minAmount, maxAmount, transferOption, debtOption, draftOption, selectedLabelIds, excludedLabelIds]);

  return { data, loading, error };
}
