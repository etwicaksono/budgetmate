/**
 * Shared filter state types used by the FilterSidebar and saved filter hooks.
 * These are cross-domain — used by transactions, analytics, and saved-filters.
 */

export interface FilterState {
  selectedCategories: string[];
  selectedAccounts: string[];
  selectedCurrencies: string[];
  selectedLabelIds: string[];
  sortOption: string;
  transferOption: string;
  debtOption: string;
}

export type FilterVisibility = Record<string, boolean>;
