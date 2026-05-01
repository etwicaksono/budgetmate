import { useState, useEffect, useCallback } from 'react';
import { savedFilterService, type SavedFilter, type SavedFilterPayload } from '@/services/savedFilterService';
import type { SortValue, TransferOption, DebtOption } from '@/hooks/useFilterData';
import type { Category } from '@/services/categoryService';
import type { Account } from '@/services/accountService';

export interface FilterSnapshot {
   selectedCategories: string[];   // names (what useFilterData holds)
   selectedAccounts: string[];     // names
   selectedCurrencies: string[];
   selectedLabelIds: string[];
   sortOption: SortValue;
   transferOption: string;
   debtOption: string;
}

export interface LoadFilterCallback {
   setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;
   setSelectedAccounts: React.Dispatch<React.SetStateAction<string[]>>;
   setSelectedCurrencies: React.Dispatch<React.SetStateAction<string[]>>;
   setSelectedLabelIds: React.Dispatch<React.SetStateAction<string[]>>;
   setSortOption: React.Dispatch<React.SetStateAction<SortValue>>;
   setTransferOption: React.Dispatch<React.SetStateAction<TransferOption>>;
   setDebtOption: React.Dispatch<React.SetStateAction<DebtOption>>;
}

interface UseSavedFiltersOptions {
   /** All categories available — used to resolve IDs ↔ names */
   categories: Category[];
   /** All accounts available — used to resolve IDs ↔ names */
   accounts: Account[];
   /** Current filter state snapshot — used when saving */
   current: FilterSnapshot;
   /** Dispatchers to apply a loaded filter */
   dispatchers: LoadFilterCallback;
}

export function useSavedFilters({
   categories,
   accounts,
   current,
   dispatchers,
}: UseSavedFiltersOptions) {
   const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
   const [loading, setLoading] = useState(false);
   const [activeFilterId, setActiveFilterId] = useState<string | null>(null);

   // Load all saved filters on mount
   useEffect(() => {
      const load = async () => {
         setLoading(true);
         try {
            const data = await savedFilterService.fetchSavedFilters();
            setSavedFilters(data);
         } catch (error) {
            console.error('Failed to fetch saved filters:', error);
         } finally {
            setLoading(false);
         }
      };
      load();
   }, []);

   // Resolve category names → IDs
   const categoryNamesToIds = useCallback(
      (names: string[]): string[] => {
         return names
            .map((name) => categories.find((c) => c.name === name)?.id)
            .filter((id): id is string => !!id);
      },
      [categories]
   );

   // Resolve account names → IDs
   const accountNamesToIds = useCallback(
      (names: string[]): string[] => {
         return names
            .map((name) => accounts.find((a) => a.name === name)?.id)
            .filter((id): id is string => !!id);
      },
      [accounts]
   );

   // Resolve category IDs → names (drops deleted entities silently)
   const categoryIdsToNames = useCallback(
      (ids: string[]): string[] => {
         return ids
            .map((id) => categories.find((c) => c.id === id)?.name)
            .filter((name): name is string => !!name);
      },
      [categories]
   );

   // Resolve account IDs → names
   const accountIdsToNames = useCallback(
      (ids: string[]): string[] => {
         return ids
            .map((id) => accounts.find((a) => a.id === id)?.name)
            .filter((name): name is string => !!name);
      },
      [accounts]
   );

   /** Save the current filter state under a given name.
    *  Returns { success: true, filter } on success, or { success: false, duplicateName: true } on name conflict. */
   const saveCurrentFilter = useCallback(
      async (name: string): Promise<{ success: true; filter: SavedFilter } | { success: false; duplicateName: boolean }> => {
         const payload: SavedFilterPayload = {
            selectedCategoryIds: categoryNamesToIds(current.selectedCategories),
            selectedAccountIds: accountNamesToIds(current.selectedAccounts),
            selectedCurrencies: current.selectedCurrencies,
            selectedLabelIds: current.selectedLabelIds,
            sortOption: current.sortOption,
            transferOption: current.transferOption,
            debtOption: current.debtOption,
         };
         try {
            const created = await savedFilterService.createSavedFilter({ name, filters: payload });
            setSavedFilters((prev) => [...prev, created]);
            setActiveFilterId(created.id);
            return { success: true, filter: created };
         } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (status === 409) return { success: false, duplicateName: true };
            console.error('Failed to save filter:', error);
            return { success: false, duplicateName: false };
         }
      },
      [current, categoryNamesToIds, accountNamesToIds]
   );

   /** Apply a saved filter to the current page's filter state */
   const loadFilter = useCallback(
      (filter: SavedFilter) => {
         const { filters } = filter;
         if (filters.selectedCategoryIds) {
            dispatchers.setSelectedCategories(categoryIdsToNames(filters.selectedCategoryIds));
         }
         if (filters.selectedAccountIds) {
            dispatchers.setSelectedAccounts(accountIdsToNames(filters.selectedAccountIds));
         }
         if (filters.selectedCurrencies) {
            dispatchers.setSelectedCurrencies(filters.selectedCurrencies);
         }
         if (filters.selectedLabelIds) {
            dispatchers.setSelectedLabelIds(filters.selectedLabelIds);
         }
         if (filters.sortOption) {
            dispatchers.setSortOption(filters.sortOption as SortValue);
         }
         if (filters.transferOption) {
            dispatchers.setTransferOption(filters.transferOption as TransferOption);
         }
         if (filters.debtOption) {
            dispatchers.setDebtOption(filters.debtOption as DebtOption);
         }
         setActiveFilterId(filter.id);
      },
      [dispatchers, categoryIdsToNames, accountIdsToNames]
   );

   /** Delete a saved filter by ID */
   const deleteFilter = useCallback(async (id: string) => {
      try {
         await savedFilterService.deleteSavedFilter(id);
         setSavedFilters((prev) => prev.filter((f) => f.id !== id));
         if (activeFilterId === id) setActiveFilterId(null);
      } catch (error) {
         console.error('Failed to delete saved filter:', error);
      }
   }, [activeFilterId]);

   /** Clear the active filter ID to "unapply" state */
   const clearActiveFilter = useCallback(() => {
      setActiveFilterId(null);
   }, []);

   /** Rename a saved filter.
    *  Returns { success: true } or { success: false, duplicateName: true } on name conflict. */
   const renameFilter = useCallback(async (id: string, name: string): Promise<{ success: boolean; duplicateName?: boolean }> => {
      try {
         const updated = await savedFilterService.updateSavedFilter(id, { name });
         setSavedFilters((prev) => prev.map((f) => (f.id === id ? updated : f)));
         return { success: true };
      } catch (error: unknown) {
         const status = (error as { response?: { status?: number } })?.response?.status;
         if (status === 409) return { success: false, duplicateName: true };
         console.error('Failed to rename saved filter:', error);
         return { success: false };
      }
   }, []);

   /** Update both name and filter values of a saved filter.
    *  Returns { success: true } or { success: false, duplicateName: true } on name conflict. */
   const updateCurrentFilter = useCallback(
      async (id: string, name: string): Promise<{ success: boolean; duplicateName?: boolean }> => {
         const payload: SavedFilterPayload = {
            selectedCategoryIds: categoryNamesToIds(current.selectedCategories),
            selectedAccountIds: accountNamesToIds(current.selectedAccounts),
            selectedCurrencies: current.selectedCurrencies,
            selectedLabelIds: current.selectedLabelIds,
            sortOption: current.sortOption,
            transferOption: current.transferOption,
            debtOption: current.debtOption,
         };
         try {
            const updated = await savedFilterService.updateSavedFilter(id, { name, filters: payload });
            setSavedFilters((prev) => prev.map((f) => (f.id === id ? updated : f)));
            return { success: true };
         } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response?.status;
            if (status === 409) return { success: false, duplicateName: true };
            console.error('Failed to update saved filter:', error);
            return { success: false };
         }
      },
      [current, categoryNamesToIds, accountNamesToIds]
   );

   /** Reorder saved filters */
   const reorderFilter = useCallback(async (newOrderIds: string[]) => {
      setSavedFilters((prev) => {
         const newFilters = [...prev].sort((a, b) => {
            return newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id);
         });

         // Fire and forget API call for optimistic UI. 
         // If it fails, we fetch the truth from the server next time.
         savedFilterService.reorderSavedFilters(newFilters.map(f => f.id)).catch(e => {
            console.error('Failed to save new filter order:', e);
         });

         return newFilters;
      });
   }, []);

   return {
      savedFilters,
      loading,
      activeFilterId,
      saveCurrentFilter,
      loadFilter,
      deleteFilter,
      renameFilter,
      updateCurrentFilter,
      clearActiveFilter,
      reorderFilter,
   };
}
