'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  localStorageService,
  type DashboardDraftOption,
  type DashboardFilters,
} from '@/mocks/localStorageService';
import type { DraftOption } from '@/hooks/useFilterData';

interface UseDashboardFiltersOptions {
  selectedAccounts: string[];
  setSelectedAccounts: React.Dispatch<React.SetStateAction<string[]>>;
  selectedCategories: string[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;
  selectedLabelIds: string[];
  setSelectedLabelIds: React.Dispatch<React.SetStateAction<string[]>>;
  excludedLabelIds: string[];
  setExcludedLabelIds: React.Dispatch<React.SetStateAction<string[]>>;
  draftOption: DraftOption;
  setDraftOption: React.Dispatch<React.SetStateAction<DraftOption>>;
}

export interface UseDashboardFiltersReturn {
  /** False until the persisted filters have been read back, so callers can hold
   *  off fetching and avoid a flash of unfiltered widgets */
  hydrated: boolean;
  /** Number of filter groups currently narrowing the widgets — drives the chip badge */
  activeFilterCount: number;
  /** Clear every dashboard filter back to its default */
  resetFilters: () => void;
  /** Whether the widgets should include draft transactions in balances */
  includeDraft: boolean;
}

/**
 * Persists the dashboard's widget filters across reloads.
 *
 * The filter state itself lives in useFilterData so the shared dropdowns and
 * SavedFiltersManager keep working unchanged; this hook only mirrors it into
 * localStorage and restores it after mount (which keeps SSR output stable).
 */
export function useDashboardFilters({
  selectedAccounts,
  setSelectedAccounts,
  selectedCategories,
  setSelectedCategories,
  selectedLabelIds,
  setSelectedLabelIds,
  excludedLabelIds,
  setExcludedLabelIds,
  draftOption,
  setDraftOption,
}: UseDashboardFiltersOptions): UseDashboardFiltersReturn {
  const [hydrated, setHydrated] = useState(false);
  const restoredFilters = useRef(false);

  // Restore once after mount so the server and first client render agree
  useEffect(() => {
    const stored = localStorageService.loadDashboardFilters();

    if (stored.selectedAccounts.length > 0) {
      setSelectedAccounts(stored.selectedAccounts);
      restoredFilters.current = true;
    }
    if (stored.selectedCategories.length > 0) {
      setSelectedCategories(stored.selectedCategories);
      restoredFilters.current = true;
    }
    if (stored.selectedLabelIds.length > 0) {
      setSelectedLabelIds(stored.selectedLabelIds);
      restoredFilters.current = true;
    }
    if (stored.excludedLabelIds.length > 0) {
      setExcludedLabelIds(stored.excludedLabelIds);
      restoredFilters.current = true;
    }
    if (stored.draftOption !== 'exclude') {
      setDraftOption(stored.draftOption);
      restoredFilters.current = true;
    }

    setHydrated(true);
  }, [
    setSelectedAccounts,
    setSelectedCategories,
    setSelectedLabelIds,
    setExcludedLabelIds,
    setDraftOption,
  ]);

  // Mirror the current selection back into localStorage
  useEffect(() => {
    if (!hydrated) return;

    // The restore above schedules state updates, so this first pass still holds
    // the defaults — skip it to avoid overwriting what was just read back.
    if (restoredFilters.current) {
      restoredFilters.current = false;
      return;
    }

    const filters: DashboardFilters = {
      selectedAccounts,
      selectedCategories,
      selectedLabelIds,
      excludedLabelIds,
      draftOption: draftOption as DashboardDraftOption,
    };
    localStorageService.saveDashboardFilters(filters);
    // Keep the legacy key in sync for the account/net-worth requests
    localStorageService.saveIncludeDraft(draftOption !== 'exclude');
  }, [
    hydrated,
    selectedAccounts,
    selectedCategories,
    selectedLabelIds,
    excludedLabelIds,
    draftOption,
  ]);

  const resetFilters = useCallback(() => {
    setSelectedAccounts([]);
    setSelectedCategories([]);
    setSelectedLabelIds([]);
    setExcludedLabelIds([]);
    setDraftOption('exclude');
  }, [
    setSelectedAccounts,
    setSelectedCategories,
    setSelectedLabelIds,
    setExcludedLabelIds,
    setDraftOption,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedAccounts.length > 0) count += 1;
    if (selectedCategories.length > 0) count += 1;
    if (selectedLabelIds.length > 0) count += 1;
    if (excludedLabelIds.length > 0) count += 1;
    if (draftOption !== 'exclude') count += 1;
    return count;
  }, [selectedAccounts, selectedCategories, selectedLabelIds, excludedLabelIds, draftOption]);

  return {
    hydrated,
    activeFilterCount,
    resetFilters,
    includeDraft: draftOption !== 'exclude',
  };
}
