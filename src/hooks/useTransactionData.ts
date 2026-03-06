import { useState, useEffect, useCallback, useMemo } from 'react';
import { categoryService, type Category } from '@/services/categoryService';
import { accountService, type Account } from '@/services/accountService';
import { labelService, type Label } from '@/services/labelService';
import type { IconType } from 'react-icons';
import * as FaIcons from 'react-icons/fa';

export interface TransactionDataHookResult {
  categories: Category[];
  accounts: Account[];
  labels: Label[];
  categoryTree: Record<string, string[]>;
  parentCategoryColors: Record<string, string>;
  categoryIcons: Record<string, IconType>;
  accountColors: Record<string, string>;
  accountIcons: Record<string, IconType>;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const resolveIconComponent = (iconName?: string | null): IconType | undefined => {
  if (!iconName) return undefined;
  const iconsLibrary = FaIcons as unknown as Record<string, IconType>;
  return iconsLibrary[iconName];
};

const buildCategoryTree = (categories: Category[]): Record<string, string[]> => {
  const tree: Record<string, string[]> = {};
  const nameById = new Map<string, string>();

  categories.forEach((cat) => {
    nameById.set(cat.id, cat.name);
    if (!cat.parent_id) {
      tree[cat.name] = [];
    }
  });

  categories.forEach((cat) => {
    if (cat.parent_id) {
      const parentName = nameById.get(cat.parent_id);
      if (parentName && tree[parentName]) {
        tree[parentName].push(cat.name);
      }
    }
  });

  return tree;
};

export function useTransactionData(): TransactionDataHookResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [categoriesResponse, accountsData, labelsData] = await Promise.all([
        categoryService.fetchCategories(),
        accountService.fetchAccounts({ include_balance: false }),
        labelService.fetchLabels(),
      ]);

      setCategories(categoriesResponse.data);
      setAccounts(accountsData);
      setLabels(labelsData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error fetching transaction data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  const parentCategoryColors = useMemo(() => {
    const colors: Record<string, string> = {};
    categories
      .filter((cat) => !cat.parent_id)
      .forEach((cat) => {
        colors[cat.name] = cat.color || '#6c757d';
      });
    return colors;
  }, [categories]);

  const categoryIcons = useMemo(() => {
    const icons: Record<string, IconType> = {};
    categories.forEach((cat) => {
      const icon = resolveIconComponent(cat.icon);
      if (icon) {
        icons[cat.name] = icon;
      }
    });
    return icons;
  }, [categories]);

  const accountColors = useMemo(() => {
    const colors: Record<string, string> = {};
    accounts.forEach((acc) => {
      colors[acc.name] = acc.color || '#6c757d';
    });
    return colors;
  }, [accounts]);

  const accountIcons = useMemo(() => {
    const icons: Record<string, IconType> = {};
    accounts.forEach((acc) => {
      const icon = resolveIconComponent(acc.icon);
      if (icon) {
        icons[acc.name] = icon;
      }
    });
    return icons;
  }, [accounts]);

  return {
    categories,
    accounts,
    labels,
    categoryTree,
    parentCategoryColors,
    categoryIcons,
    accountColors,
    accountIcons,
    isLoading,
    error,
    refresh: fetchData,
  };
}
