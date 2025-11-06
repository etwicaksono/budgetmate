import { useState, useEffect, useMemo } from 'react';
import type { ComponentType } from 'react';
import type { IconType, IconBaseProps } from 'react-icons';
import {
  FaUniversity,
  FaPiggyBank,
  FaCreditCard,
  FaMoneyBillWave,
} from 'react-icons/fa';
import { useCategoryData } from '../useCategoryData';
import { accountService, type ApiAccountResponse } from '../../../services/accountService';
import { categoryService } from '../../../services/categoryService';
import { buildAccountMetadata } from '../../../components/PeriodRangeSelector';
import type { FilterVisibility } from '../components/MobileFilterOffcanvas';

type IconRenderable = IconType | ComponentType<IconBaseProps>;

type SortValue =
  | 'timeAsc'
  | 'timeDesc'
  | 'amountAsc'
  | 'amountDesc'
  | 'absAmountAsc'
  | 'absAmountDesc';

interface AccountMetadataEntry {
  color: string;
  icon: string | null;
}

type AccountMetadata = Record<string, AccountMetadataEntry>;

const ACCOUNT_METADATA_STORAGE_KEY = 'finance-app-account-metadata';

const accountIconComponents: Record<string, IconRenderable> = {
  FaUniversity,
  FaPiggyBank,
  FaCreditCard,
  FaMoneyBillWave,
};

interface UseFilterDataOptions {
  filterVisibilityStorageKey?: string;
}

export function useFilterData(options: UseFilterDataOptions = {}) {
  const {
    filterVisibilityStorageKey = 'finance-app-filter-visibility',
  } = options;

  // Filter state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortValue>('amountAsc');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(20000000);
  const [filterVisibility, setFilterVisibility] = useState<FilterVisibility>({
    search: true,
    sortBy: true,
    accounts: true,
    categories: true,
    amountRange: true,
  });
  const [showFilterVisibilityPanel, setShowFilterVisibilityPanel] = useState<boolean>(false);

  // Category data
  const {
    categories,
    categoryTree,
    parentCategoryColors,
    categoryIcons,
    allCategories,
    setCategories,
  } = useCategoryData();

  // Account data
  const [apiAccounts, setApiAccounts] = useState<ApiAccountResponse[]>([]);

  // Load categories
  useEffect(() => {
    let isCancelled = false;

    const loadCategories = async () => {
      try {
        const apiCategories = await categoryService.fetchCategories();
        if (isCancelled) return;
        setCategories(apiCategories);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    if (categories.length === 0) {
      void loadCategories();
    }

    return () => {
      isCancelled = true;
    };
  }, [categories.length, setCategories]);

  // Load accounts
  useEffect(() => {
    let isCancelled = false;

    const loadAccounts = async () => {
      try {
        const accounts = await accountService.fetchAccounts();
        if (isCancelled) return;
        if (accounts.length > 0) {
          setApiAccounts(accounts);
        }
      } catch (error) {
        console.error('Failed to fetch accounts:', error);
      }
    };

    void loadAccounts();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Account metadata
  const accountMetadata = useMemo<AccountMetadata>(() => {
    let storedMetadata: Record<string, unknown> = {};
    if (typeof window !== 'undefined') {
      try {
        const persisted = window.localStorage.getItem(ACCOUNT_METADATA_STORAGE_KEY);
        if (persisted) {
          storedMetadata = JSON.parse(persisted) as Record<string, unknown>;
        }
      } catch (error) {
        console.error('Failed to read account metadata from storage', error);
      }
    }
    return buildAccountMetadata(storedMetadata) as AccountMetadata;
  }, []);

  // Load filter visibility from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(filterVisibilityStorageKey);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<FilterVisibility>;
          setFilterVisibility((prev) => ({
            ...prev,
            ...parsed,
          }));
        }
      } catch (error) {
        console.error('Failed to read filter visibility from storage', error);
      }
    }
  }, [filterVisibilityStorageKey]);

  // Save filter visibility to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        filterVisibilityStorageKey,
        JSON.stringify(filterVisibility)
      );
    }
  }, [filterVisibility, filterVisibilityStorageKey]);

  // Computed account data
  const selectableAccounts = useMemo<string[]>(
    () => apiAccounts
      .filter((account) => account.name && account.active !== false)
      .map((account) => account.name as string),
    [apiAccounts]
  );

  const accountTree = useMemo<Record<string, string[]>>(
    () => Object.fromEntries(selectableAccounts.map((account) => [account, [] as string[]])),
    [selectableAccounts]
  );

  const accountColors = useMemo<Record<string, string>>(
    () => {
      const colorMap: Record<string, string> = {};
      selectableAccounts.forEach((accountName) => {
        const apiAccount = apiAccounts.find((a) => a.name === accountName);
        const color = apiAccount?.color ?? accountMetadata[accountName]?.color ?? '#6c757d';
        colorMap[accountName] = color;
      });
      return colorMap;
    },
    [selectableAccounts, apiAccounts, accountMetadata]
  );

  const accountIcons = useMemo<Record<string, IconRenderable | undefined>>(
    () => {
      const iconMap: Record<string, IconRenderable | undefined> = {};
      selectableAccounts.forEach((accountName) => {
        const apiAccount = apiAccounts.find((a) => a.name === accountName);
        const iconKey = apiAccount?.icon ?? accountMetadata[accountName]?.icon;
        const icon =
          iconKey && accountIconComponents[iconKey as keyof typeof accountIconComponents]
            ? accountIconComponents[iconKey as keyof typeof accountIconComponents]
            : undefined;
        iconMap[accountName] = icon;
      });
      return iconMap;
    },
    [selectableAccounts, apiAccounts, accountMetadata]
  );

  return {
    // Filter state
    searchTerm,
    setSearchTerm,
    selectedCategories,
    setSelectedCategories,
    selectedAccounts,
    setSelectedAccounts,
    sortOption,
    setSortOption,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    filterVisibility,
    setFilterVisibility,
    showFilterVisibilityPanel,
    setShowFilterVisibilityPanel,

    // Category data
    categories,
    categoryTree,
    parentCategoryColors,
    categoryIcons,
    allCategories,
    setCategories,

    // Account data
    apiAccounts,
    selectableAccounts,
    accountTree,
    accountColors,
    accountIcons,
    accountMetadata,
  };
}

export type { SortValue };
