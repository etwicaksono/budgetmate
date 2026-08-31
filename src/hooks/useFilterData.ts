import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { accountService, type Account } from '@/services/accountService';
import { categoryService, type Category } from '@/services/categoryService';
import { labelService, type Label } from '@/services/labelService';
import { logError } from '@/lib/logger';

export type SortValue =
  | 'timeAsc'
  | 'timeDesc'
  | 'amountAsc'
  | 'amountDesc'
  | 'absAmountAsc'
  | 'absAmountDesc';
export type TransferOption = 'include' | 'only' | 'exclude';
export type DebtOption = 'include' | 'only' | 'exclude';
export type DraftOption = 'include' | 'only' | 'exclude';
export type RecordTypeOption = 'all' | 'income' | 'expense';

export interface FilterVisibility {
  search: boolean;
  sortBy: boolean;
  accounts: boolean;
  categories: boolean;
  labels?: boolean;
  currencies?: boolean;
  amountRange?: boolean;
  transfers?: boolean;
  debts?: boolean;
  drafts?: boolean;
  recordTypes?: boolean;
}

const DEFAULT_MIN_AMOUNT = 0;
const DEFAULT_MAX_AMOUNT = 20000000;
const AMOUNT_RANGE_STORAGE_KEY = 'filter-amount-range';

export const useFilterData = () => {
  // Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce: only propagate to debouncedSearchTerm 350ms after user stops typing
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 350);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [excludedLabelIds, setExcludedLabelIds] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const availableCurrencies = useMemo<string[]>(() => ['IDR'], []);
  const [sortOption, setSortOption] = useState<SortValue>('timeDesc');
  const [transferOption, setTransferOption] = useState<TransferOption>('include');
  const [debtOption, setDebtOption] = useState<DebtOption>('include');
  const [draftOption, setDraftOption] = useState<DraftOption>('exclude');
  const [recordTypeOption, setRecordTypeOption] = useState<RecordTypeOption>('all');
  const [minAmount, setMinAmount] = useState<number>(DEFAULT_MIN_AMOUNT);
  const [maxAmount, setMaxAmount] = useState<number>(DEFAULT_MAX_AMOUNT);
  const [filterVisibility, setFilterVisibility] = useState<FilterVisibility>({
    search: true,
    sortBy: true,
    accounts: true,
    categories: true,
    labels: true,
    currencies: true,
    amountRange: true,
    transfers: true,
    debts: true,
    drafts: true,
    recordTypes: true,
  });
  const [numberOfColumns, setNumberOfColumns] = useState<number>(2);

  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load filter visibility from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('filter-visibility');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setFilterVisibility((prev) => ({ ...prev, ...parsed }));
      } catch (error) {
        logError('Failed to parse filter visibility:', error);
      }
    }
  }, []);

  // Save filter visibility to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('filter-visibility', JSON.stringify(filterVisibility));
    } catch (error) {
      logError('Failed to persist filter visibility to localStorage:', error);
    }
  }, [filterVisibility]);

  // Restore the amount range so a widened ceiling keeps large transactions
  // visible after a reload instead of snapping back to the default maximum.
  const restoredAmountRange = useRef(false);

  useEffect(() => {
    const stored = localStorage.getItem(AMOUNT_RANGE_STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as { minAmount?: unknown; maxAmount?: unknown };
      const storedMin = Number(parsed.minAmount);
      const storedMax = Number(parsed.maxAmount);

      if (Number.isFinite(storedMin) && storedMin >= 0) {
        setMinAmount(storedMin);
        restoredAmountRange.current = true;
      }
      if (Number.isFinite(storedMax) && storedMax > 0) {
        setMaxAmount(storedMax);
        restoredAmountRange.current = true;
      }
    } catch (error) {
      logError('Failed to parse persisted amount range:', error);
    }
  }, []);

  // Save the amount range to localStorage
  useEffect(() => {
    // The restore above schedules a state update, so this first pass still holds
    // the defaults — skip it to avoid overwriting what was just read back.
    if (restoredAmountRange.current) {
      restoredAmountRange.current = false;
      return;
    }

    try {
      localStorage.setItem(AMOUNT_RANGE_STORAGE_KEY, JSON.stringify({ minAmount, maxAmount }));
    } catch (error) {
      logError('Failed to persist amount range to localStorage:', error);
    }
  }, [minAmount, maxAmount]);

  // Fetch categories and accounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);
        const [categoriesResponse, accountsData, labelsData] = await Promise.all([
          categoryService.fetchCategories(),
          accountService.fetchAccounts({ include_balance: false }),
          labelService.fetchLabels(),
        ]);
        setCategories(categoriesResponse.data);
        setAccounts(accountsData);
        setLabels(labelsData.data);
      } catch (error) {
        logError('Failed to fetch filter data:', error);
        setError(error instanceof Error ? error : new Error('Failed to fetch filter data'));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Category tree (parent -> children mapping)
  const categoryTree = useMemo<Record<string, string[]>>(() => {
    const tree: Record<string, string[]> = {};
    const parents = categories.filter((c) => !c.parent_id);
    const children = categories.filter((c) => c.parent_id);

    parents.forEach((parent) => {
      tree[parent.name] = children
        .filter((child) => child.parent_id === parent.id)
        .map((child) => child.name);
    });

    return tree;
  }, [categories]);

  // Parent category colors
  const parentCategoryColors = useMemo<Record<string, string>>(() => {
    const colors: Record<string, string> = {};
    categories
      .filter((c) => !c.parent_id)
      .forEach((parent) => {
        colors[parent.name] = parent.color || '#6c757d';
      });
    return colors;
  }, [categories]);

  // Category icons
  const categoryIcons = useMemo<Record<string, string | undefined>>(() => {
    const icons: Record<string, string | undefined> = {};
    categories.forEach((category) => {
      if (category.icon) {
        icons[category.name] = category.icon;
      }
    });
    return icons;
  }, [categories]);

  // All category names
  const allCategories = useMemo<string[]>(() => {
    return categories.map((c) => c.name);
  }, [categories]);

  // Selectable accounts (active only)
  const selectableAccounts = useMemo<string[]>(() => {
    return accounts
      .filter((a) => a.is_active)
      .map((a) => a.name);
  }, [accounts]);

  // Account tree (for consistency with old API)
  const accountTree = useMemo<Record<string, string[]>>(() => {
    const tree: Record<string, string[]> = {};
    selectableAccounts.forEach((account) => {
      tree[account] = [];
    });
    return tree;
  }, [selectableAccounts]);

  // Account colors
  const accountColors = useMemo<Record<string, string>>(() => {
    const colors: Record<string, string> = {};
    accounts.forEach((account) => {
      colors[account.name] = account.color || '#6c757d';
    });
    return colors;
  }, [accounts]);

  // Account icons
  const accountIcons = useMemo<Record<string, string | undefined>>(() => {
    const icons: Record<string, string | undefined> = {};
    accounts.forEach((account) => {
      if (account.icon) {
        icons[account.name] = account.icon;
      }
    });
    return icons;
  }, [accounts]);

  // Helper to add category (for compatibility with old code)
  const addCategory = useCallback((
    name: string,
    parentId: string | null = null,
    icon = 'FaGift',
    color = '#6c757d',
    _isParent = false,
    id?: string
  ) => {
    const newCategory: Category = {
      id: id || `cat-${Date.now()}`,
      name,
      type: 'expense',
      analytic_flag: 'expense',
      nature: 'WANT' as const,
      parent_id: parentId,
      color,
      icon,
      is_active: true,
      created_at: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCategory]);
    return newCategory;
  }, []);

  return {
    // Filter state
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    selectedCategories,
    setSelectedCategories,
    selectedAccounts,
    setSelectedAccounts,
    sortOption,
    setSortOption,
    transferOption,
    setTransferOption,
    debtOption,
    setDebtOption,
    draftOption,
    setDraftOption,
    recordTypeOption,
    setRecordTypeOption,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    filterVisibility,
    setFilterVisibility,
    numberOfColumns,
    setNumberOfColumns,

    // Category data
    categories,
    categoryTree,
    parentCategoryColors,
    categoryIcons,
    allCategories,
    setCategories,
    addCategory,

    // Account data
    apiAccounts: accounts,
    selectableAccounts,
    accountTree,
    accountColors,
    accountIcons,

    // Label data
    labels,
    selectedLabelIds,
    setSelectedLabelIds,
    excludedLabelIds,
    setExcludedLabelIds,
    selectedCurrencies,
    setSelectedCurrencies,
    availableCurrencies,

    // Loading state
    loading,
    error,
  };
};
