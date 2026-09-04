'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

type ReportQueryParams = {
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
};

interface UseIncomeExpenseDataResult {
  data: IncomeExpenseReport | null;
  loading: boolean;
  error: string | null;
  /**
   * Re-fetches the report with the latest filters without toggling the loading
   * placeholder, so the table is updated in place instead of being remounted.
   * Used after in-app transaction edits to keep the aggregates current.
   */
  refresh: () => Promise<void>;
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

  // Guards against out-of-order responses: only the newest request may write state.
  const latestRequestRef = useRef(0);

  const buildParams = useCallback(
    (): ReportQueryParams => {
      const params: ReportQueryParams = {
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
      return params;
    },
    [
      startDate,
      endDate,
      periodType,
      numberOfColumns,
      selectedCategories,
      selectedAccounts,
      searchTerm,
      minAmount,
      maxAmount,
      transferOption,
      debtOption,
      draftOption,
      selectedLabelIds,
      excludedLabelIds,
    ]
  );

  const fetchReport = useCallback(async (params: ReportQueryParams, showLoading: boolean) => {
    const requestId = ++latestRequestRef.current;
    if (showLoading) {
      setLoading(true);
      setError(null);
    }
    try {
      const reportData = await analyticsService.fetchIncomeExpenseReport(params);
      if (requestId !== latestRequestRef.current) return;
      setData(reportData);
      setError(null);
    } catch (err) {
      if (requestId !== latestRequestRef.current) return;
      if (showLoading) {
        setError(err instanceof Error ? err.message : 'Failed to load report');
      }
      // Silent refreshes keep the current data on failure instead of flashing
      // an error over a table the user can still see.
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchReport(buildParams(), true);
  }, [fetchReport, buildParams]);

  const refresh = useCallback(async () => {
    await fetchReport(buildParams(), false);
  }, [fetchReport, buildParams]);

  return { data, loading, error, refresh };
}
