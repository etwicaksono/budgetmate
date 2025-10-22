import { useCallback, useEffect, useState } from 'react';

const DEFAULT_PRESETS = [
  { id: 1, description: 'Grocery Shopping', category: 'Food & Dining', amount: '', account: 'Checking Account', type: 'Expense', currency: 'IDR' },
  { id: 2, description: 'Gas', category: 'Transportation', amount: '', account: 'Checking Account', type: 'Expense', currency: 'IDR' },
  { id: 3, description: 'Salary', category: 'Salary', amount: '', account: 'Checking Account', type: 'Income', currency: 'IDR' },
  { id: 4, description: 'Dinner', category: 'Food & Dining', amount: '', account: 'Checking Account', type: 'Expense', currency: 'IDR' },
];

const readFromStorage = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  const stored = window.localStorage.getItem('quickTransactions');
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Failed to parse quick transactions from storage, ignoring persisted value.', error);
    return [];
  }
};

const writeToStorage = (presets) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem('quickTransactions', JSON.stringify(presets));
};

const resolveCategoryId = (categoryName, categories) => {
  if (!Array.isArray(categories)) {
    return null;
  }

  const match = categories.find((category) => category.name === categoryName);
  return match ? match.id : null;
};

const seedDefaults = (categories) => {
  return DEFAULT_PRESETS.map((preset) => ({
    ...preset,
    category_id: resolveCategoryId(preset.category, categories),
  }));
};

export const useQuickTransactions = (categories) => {
  const [quickTransactions, setQuickTransactions] = useState(() => readFromStorage());

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!window.localStorage.getItem('quickTransactions')) {
      const seeded = seedDefaults(categories);
      setQuickTransactions(seeded);
      writeToStorage(seeded);
    }
  }, [categories]);

  useEffect(() => {
    writeToStorage(quickTransactions);
  }, [quickTransactions]);

  const addQuickTransactionPreset = useCallback(
    ({ description, category, amount = '', account = 'Checking Account', type = 'Expense', currency = 'IDR' }) => {
      setQuickTransactions((previous) => {
        const nextId = previous.length > 0 ? Math.max(...previous.map((preset) => preset.id || 0)) + 1 : 1;
        const nextPreset = {
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

  const removeQuickTransactionPreset = useCallback((id) => {
    setQuickTransactions((previous) => previous.filter((preset) => preset.id !== id));
  }, []);

  return {
    quickTransactions,
    addQuickTransactionPreset,
    removeQuickTransactionPreset,
    setQuickTransactions,
  };
};

