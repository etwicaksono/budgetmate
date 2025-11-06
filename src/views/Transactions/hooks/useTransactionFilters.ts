'use client';

import { useState, useCallback, useMemo } from 'react';
import type { FilterState, TransactionType } from '../types';
import { DEFAULT_FILTER_STATE } from '../constants';

interface UseTransactionFiltersReturn {
  filters: FilterState;
  toggleFilter: () => void;
  setSearchTerm: (term: string) => void;
  toggleType: (type: TransactionType) => void;
  toggleCategory: (category: string) => void;
  toggleAccount: (account: string) => void;
  setAmountRange: (range: [number, number]) => void;
  setDateRange: (range: { start: Date | null; end: Date | null }) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function useTransactionFilters(): UseTransactionFiltersReturn {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTER_STATE);

  // Toggle filter panel visibility
  const toggleFilter = useCallback(() => {
    setFilters(prev => ({ ...prev, showFilters: !prev.showFilters }));
  }, []);

  // Set search term
  const setSearchTerm = useCallback((term: string) => {
    setFilters(prev => ({ ...prev, searchTerm: term }));
  }, []);

  // Toggle transaction type
  const toggleType = useCallback((type: TransactionType) => {
    setFilters(prev => {
      const newTypes = new Set(prev.selectedTypes);
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      return { ...prev, selectedTypes: newTypes };
    });
  }, []);

  // Toggle category
  const toggleCategory = useCallback((category: string) => {
    setFilters(prev => {
      const newCategories = new Set(prev.selectedCategories);
      if (newCategories.has(category)) {
        newCategories.delete(category);
      } else {
        newCategories.add(category);
      }
      return { ...prev, selectedCategories: newCategories };
    });
  }, []);

  // Toggle account
  const toggleAccount = useCallback((account: string) => {
    setFilters(prev => {
      const newAccounts = new Set(prev.selectedAccounts);
      if (newAccounts.has(account)) {
        newAccounts.delete(account);
      } else {
        newAccounts.add(account);
      }
      return { ...prev, selectedAccounts: newAccounts };
    });
  }, []);

  // Set amount range
  const setAmountRange = useCallback((range: [number, number]) => {
    setFilters(prev => ({ ...prev, amountRange: range }));
  }, []);

  // Set date range
  const setDateRange = useCallback((range: { start: Date | null; end: Date | null }) => {
    setFilters(prev => ({ ...prev, dateRange: range }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters(prev => ({
      ...DEFAULT_FILTER_STATE,
      showFilters: prev.showFilters, // Preserve panel visibility
    }));
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchTerm !== '' ||
      filters.selectedTypes.size > 0 ||
      filters.selectedCategories.size > 0 ||
      filters.selectedAccounts.size > 0 ||
      filters.amountRange[0] !== DEFAULT_FILTER_STATE.amountRange[0] ||
      filters.amountRange[1] !== DEFAULT_FILTER_STATE.amountRange[1] ||
      filters.dateRange.start !== null ||
      filters.dateRange.end !== null
    );
  }, [filters]);

  return {
    filters,
    toggleFilter,
    setSearchTerm,
    toggleType,
    toggleCategory,
    toggleAccount,
    setAmountRange,
    setDateRange,
    clearFilters,
    hasActiveFilters,
  };
}
