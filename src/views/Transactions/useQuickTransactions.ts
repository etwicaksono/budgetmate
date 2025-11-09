
import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react';
// TODO: Swap quick transaction presets for backend-driven templates.

export type QuickTransactionKind = 'Expense' | 'Income' | 'Transfer' | string;

export interface CategoryReference {
  id: number | string;
  name: string;
}

export interface QuickTransactionPreset {
  id?: number;
  description: string;
  category: string;
  amount: string | number;
  account: string;
  type: QuickTransactionKind;
  currency: string;
  category_id?: CategoryReference['id'] | null;
}

export type QuickTransactionPresetInput = Partial<
  Omit<QuickTransactionPreset, 'description' | 'category'>
> &
  Pick<QuickTransactionPreset, 'description' | 'category'>;

type StoredPreset = QuickTransactionPreset;

const STORAGE_KEY = 'quickTransactions';

const DEFAULT_PRESETS: readonly QuickTransactionPreset[] = [] as const;

const readFromStorage = (): StoredPreset[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((item): item is StoredPreset => typeof item === 'object' && item !== null);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      'Failed to parse quick transactions from storage, ignoring persisted value.',
      error
    );
    return [];
  }
};

const writeToStorage = (presets: StoredPreset[]): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
};

const resolveCategoryId = (
  categoryName: string,
  categories?: CategoryReference[] | null
): CategoryReference['id'] | null => {
  if (!Array.isArray(categories)) {
    return null;
  }
  const match = categories.find((category) => category.name === categoryName);
  return match ? match.id : null;
};

const seedDefaults = (categories?: CategoryReference[] | null): StoredPreset[] =>
  DEFAULT_PRESETS.map((preset) => ({
    ...preset,
    category_id: resolveCategoryId(preset.category, categories),
  }));

export interface UseQuickTransactionsResult {
  quickTransactions: StoredPreset[];
  addQuickTransactionPreset: (preset: QuickTransactionPresetInput) => void;
  removeQuickTransactionPreset: (id: number) => void;
  setQuickTransactions: Dispatch<SetStateAction<StoredPreset[]>>;
}

export const useQuickTransactions = (
  categories?: CategoryReference[] | null
): UseQuickTransactionsResult => {
  const [quickTransactions, setQuickTransactions] = useState<StoredPreset[]>(() =>
    readFromStorage()
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!window.localStorage.getItem(STORAGE_KEY)) {
      const seeded = seedDefaults(categories);
      setQuickTransactions(seeded);
      writeToStorage(seeded);
    }
  }, [categories]);

  useEffect(() => {
    writeToStorage(quickTransactions);
  }, [quickTransactions]);

  const addQuickTransactionPreset = useCallback(
    ({
      description,
      category,
      amount = '',
      account = '',
      type = 'Expense',
      currency = 'IDR',
    }: QuickTransactionPresetInput): void => {
      setQuickTransactions((previous) => {
        const nextId =
          previous.length > 0 ? Math.max(...previous.map((preset) => preset.id ?? 0)) + 1 : 1;
        const nextPreset: StoredPreset = {
          id: nextId,
          description,
          category,
          amount,
          account,
          type,
          currency,
          category_id: resolveCategoryId(category, categories),
        };
        return [...previous, nextPreset];
      });
    },
    [categories]
  );

  const removeQuickTransactionPreset = useCallback((id: number): void => {
    setQuickTransactions((previous) => previous.filter((preset) => preset.id !== id));
  }, []);

  return {
    quickTransactions,
    addQuickTransactionPreset,
    removeQuickTransactionPreset,
    setQuickTransactions,
  };
};
