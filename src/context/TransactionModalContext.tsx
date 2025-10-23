import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  FaUniversity,
  FaPiggyBank,
  FaCreditCard,
  FaMoneyBillWave,
} from 'react-icons/fa';
import type { IconType, IconBaseProps } from 'react-icons';
import {
  TransactionModal,
  type TransactionFormValues,
  type TransactionChangeEvent,
  type QuickTransactionOption,
} from '../features/transactions/TransactionModal';
import {
  QuickTransactionModal,
  type QuickTransactionFormValues,
} from '../features/transactions/QuickTransactionModal';
import {
  useCategoryData,
  type CategoryTree,
  type CategoryColorMap,
} from '../features/transactions/useCategoryData';
import {
  useQuickTransactions,
  type QuickTransactionPresetInput,
  type UseQuickTransactionsResult,
} from '../features/transactions/useQuickTransactions';
import {
  buildAccountMetadata,
  type AccountMetadata,
} from '../components/PeriodRangeSelector';

const ACCOUNT_METADATA_STORAGE_KEY = 'finance-app-account-metadata';

const accounts = ['All', 'Checking Account', 'Savings Account', 'Credit Card', 'Cash'] as const;

const accountIconComponents: Record<string, IconType> = {
  FaUniversity,
  FaPiggyBank,
  FaCreditCard,
  FaMoneyBillWave,
};

export type TransactionRecord = TransactionFormValues & { id: number };

export interface TransactionModalContextValue {
  openTransactionModal: (overrides?: Partial<TransactionFormValues>) => void;
  closeTransactionModal: () => void;
  openQuickTransactionModal: () => void;
  setTransactionDefaults: (overrides?: Partial<TransactionFormValues>) => void;
  transactions: TransactionRecord[];
}

interface TransactionModalProviderProps {
  children: ReactNode;
}

const TransactionModalContext = createContext<TransactionModalContextValue | undefined>(undefined);

const getLocalDateTimeString = (): string => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset();
  const localTime = new Date(now.getTime() - timezoneOffset * 60000);
  return localTime.toISOString().slice(0, 16);
};

const createTransactionTemplate = (
  overrides: Partial<TransactionFormValues> = {}
): TransactionFormValues => {
  const resolvedDateTime =
    overrides.dateTime ??
    (overrides.date ? `${overrides.date}T00:00` : getLocalDateTimeString());
  const resolvedDate = overrides.date ?? resolvedDateTime.slice(0, 10);

  return {
    templateId: overrides.templateId ?? '',
    type: overrides.type ?? 'Expense',
    description: overrides.description ?? '',
    amount: overrides.amount ?? '',
    currency: overrides.currency ?? 'IDR',
    date: resolvedDate,
    dateTime: resolvedDateTime,
    category: overrides.category ?? '',
    account: overrides.account ?? 'Checking Account',
    toAccount: overrides.toAccount ?? '',
    toAmount: overrides.toAmount ?? '',
    toCurrency: overrides.toCurrency ?? overrides.currency ?? 'IDR',
    labels: overrides.labels ?? '',
    createTemplate: overrides.createTemplate ?? false,
    notes: overrides.notes ?? '',
    payer: overrides.payer ?? '',
    paymentType: overrides.paymentType ?? 'Cash',
    paymentStatus: overrides.paymentStatus ?? 'Cleared',
  };
};

const createQuickTransactionTemplate = (
  overrides: Partial<QuickTransactionFormValues> = {}
): QuickTransactionFormValues => ({
  description: overrides.description ?? '',
  category: overrides.category ?? '',
  amount: overrides.amount ?? '',
  account: overrides.account ?? 'Checking Account',
  type: overrides.type ?? 'Expense',
  currency: overrides.currency ?? 'IDR',
});

export const useTransactionModal = (): TransactionModalContextValue => {
  const context = useContext(TransactionModalContext);
  if (!context) {
    throw new Error('TransactionModalProvider is missing');
  }
  return context;
};

export const TransactionModalProvider: React.FC<TransactionModalProviderProps> = ({
  children,
}) => {
  const {
    categories,
    categoryTree,
    parentCategoryColors,
    categoryIcons,
    allCategories,
    addCategory,
  } = useCategoryData();
  const { quickTransactions, addQuickTransactionPreset }: UseQuickTransactionsResult =
    useQuickTransactions(categories);

  const quickTransactionOptions = useMemo<QuickTransactionOption[]>(
    () =>
      quickTransactions.map((preset, index) => ({
        id: preset.id ?? `quick-${index}`,
        description: preset.description,
        category: preset.category,
        amount: preset.amount,
        account: preset.account,
        type: preset.type,
        currency: preset.currency,
      })),
    [quickTransactions]
  );

  const selectableAccounts = useMemo<string[]>(
    () => accounts.filter((account) => account !== 'All'),
    []
  );

  const accountMetadata = useMemo<AccountMetadata>(() => {
    let storedMetadata: Record<string, unknown> = {};
    if (typeof window !== 'undefined') {
      try {
        const persisted = window.localStorage.getItem(ACCOUNT_METADATA_STORAGE_KEY);
        if (persisted) {
          storedMetadata = JSON.parse(persisted) as Record<string, unknown>;
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to read account metadata from storage', error);
      }
    }
    return buildAccountMetadata(storedMetadata);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        ACCOUNT_METADATA_STORAGE_KEY,
        JSON.stringify(accountMetadata)
      );
    }
  }, [accountMetadata]);

  const accountTree = useMemo<CategoryTree>(
    () =>
      Object.fromEntries(
        selectableAccounts.map((account) => [account, [] as string[]])
      ),
    [selectableAccounts]
  );

  const accountColors = useMemo<CategoryColorMap>(
    () =>
      Object.fromEntries(
        selectableAccounts.map((account) => [
          account,
          accountMetadata[account]?.color ?? '#6c757d',
        ])
      ),
    [selectableAccounts, accountMetadata]
  );

const accountIcons = useMemo<Record<string, IconType | null>>(
    () =>
      Object.fromEntries(
        selectableAccounts.map((account) => {
          const iconKey = accountMetadata[account]?.icon;
          const iconComponent =
            iconKey && iconKey in accountIconComponents
              ? accountIconComponents[iconKey]
              : null;
          return [account, iconComponent];
        })
      ),
    [selectableAccounts, accountMetadata]
  );

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionFormValues>(() =>
    createTransactionTemplate()
  );
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [showQuickTransactionModal, setShowQuickTransactionModal] = useState<boolean>(false);
  const [newQuickTransaction, setNewQuickTransaction] =
    useState<QuickTransactionFormValues>(() => createQuickTransactionTemplate());

  const ensureCategoryExists = useCallback(
    (categoryName: string) => {
      if (!categoryName || allCategories.includes(categoryName)) {
        return;
      }

      const fallbackParent =
        categories.find((category) => category.is_parent && category.name !== 'Income') ??
        categories.find((category) => category.is_parent) ??
        null;

      addCategory(
        categoryName,
        fallbackParent ? fallbackParent.id : null,
        'FaGift',
        fallbackParent ? fallbackParent.color : '#6c757d',
        false
      );
    },
    [addCategory, allCategories, categories]
  );

  const handleTransactionChange = useCallback(
    (event: TransactionChangeEvent) => {
      const target = event.target as (EventTarget & {
        name?: string;
        value?: unknown;
        checked?: boolean;
      }) | null;

      const name = target?.name;
      if (!name) {
        return;
      }

      if (name === 'dateTime') {
        const nextValue =
          typeof target?.value === 'string'
            ? target.value
            : String(target?.value ?? '');
        setCurrentTransaction((previous) => ({
          ...previous,
          dateTime: nextValue,
          date: nextValue ? nextValue.slice(0, 10) : previous.date,
        }));
        return;
      }

      const nextValue =
        typeof target?.checked === 'boolean' ? target.checked : target?.value;

      setCurrentTransaction((previous) => ({
        ...previous,
        [name]: nextValue as unknown,
      }));
    },
    []
  );

  const handleTemplateSelect = useCallback(
    (templateId: string | null) => {
      if (!templateId) {
        setCurrentTransaction((previous) => ({
          ...previous,
          templateId: '',
        }));
        return;
      }

      const selected = quickTransactionOptions.find(
        (preset: QuickTransactionOption) =>
          String(preset.id) === String(templateId)
      );
      if (!selected) {
        return;
      }

      setCurrentTransaction((previous) => ({
        ...previous,
        templateId: String(selected.id ?? ''),
        description: selected.description || '',
        amount: selected.amount ?? '',
        category: selected.category || previous.category,
        account: selected.account || previous.account,
        type: selected.type || previous.type,
        currency: selected.currency || previous.currency,
      }));
    },
    [quickTransactionOptions]
  );

  const handleSaveTransaction = useCallback(
    (createAnother = false) => {
      const isTransfer = currentTransaction.type === 'Transfer';
      if (!currentTransaction.description) {
        return;
      }

      if (isTransfer) {
        if (
          !currentTransaction.account ||
          !currentTransaction.toAccount ||
          currentTransaction.amount === ''
        ) {
          return;
        }
      } else if (currentTransaction.amount === '') {
        return;
      }

      ensureCategoryExists(currentTransaction.category);

      const parsedAmount = parseFloat(String(currentTransaction.amount));
      const transactionRecord: TransactionRecord = {
        ...currentTransaction,
        id: Date.now(),
        amount: Number.isNaN(parsedAmount) ? 0 : parsedAmount,
      };

      if (isTransfer) {
        const parsedToAmount = parseFloat(String(currentTransaction.toAmount));
        transactionRecord.toAmount = Number.isNaN(parsedToAmount)
          ? currentTransaction.toAmount
          : parsedToAmount;
      }

      setTransactions((previous) => [transactionRecord, ...previous]);

      if (currentTransaction.createTemplate) {
        const presetInput: QuickTransactionPresetInput = {
          description: currentTransaction.description,
          category: currentTransaction.category,
          amount: currentTransaction.amount,
          account: currentTransaction.account,
          type: currentTransaction.type,
          currency: currentTransaction.currency,
        };
        addQuickTransactionPreset(presetInput);
      }

      if (createAnother) {
        const nextDefaults: Partial<TransactionFormValues> = {
          type: currentTransaction.type,
          currency: currentTransaction.currency,
          account: currentTransaction.account,
          category: currentTransaction.category,
        };

        if (isTransfer) {
          nextDefaults.toAccount = currentTransaction.toAccount ?? '';
          nextDefaults.toCurrency =
            currentTransaction.toCurrency || currentTransaction.currency;
        }

        setCurrentTransaction(createTransactionTemplate(nextDefaults));
        return;
      }

      setShowTransactionModal(false);
      setCurrentTransaction(createTransactionTemplate());
    },
    [addQuickTransactionPreset, currentTransaction, ensureCategoryExists]
  );

  const handleAddNewQuickTransaction = useCallback(() => {
    if (!newQuickTransaction.description || !newQuickTransaction.category) {
      return;
    }

    ensureCategoryExists(newQuickTransaction.category);
    addQuickTransactionPreset(newQuickTransaction);
    setNewQuickTransaction(createQuickTransactionTemplate());
    setShowQuickTransactionModal(false);
  }, [addQuickTransactionPreset, ensureCategoryExists, newQuickTransaction]);

  const openTransactionModal = useCallback(
    (overrides?: Partial<TransactionFormValues>) => {
      if (overrides && Object.keys(overrides).length > 0) {
        setCurrentTransaction((previous) =>
          createTransactionTemplate({ ...previous, ...overrides })
        );
      }
      setShowTransactionModal(true);
    },
    []
  );

  const setTransactionDefaults = useCallback(
    (overrides?: Partial<TransactionFormValues>) => {
      setCurrentTransaction(createTransactionTemplate(overrides ?? {}));
    },
    []
  );

  const closeTransactionModal = useCallback(() => {
    setShowTransactionModal(false);
    setCurrentTransaction(createTransactionTemplate());
  }, []);

  const openQuickTransactionModal = useCallback(() => {
    setNewQuickTransaction(createQuickTransactionTemplate());
    setShowQuickTransactionModal(true);
  }, []);

  const handleQuickTransactionChange = useCallback(
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const { name, value } = event.target;
      if (!name) {
        return;
      }
      setNewQuickTransaction((previous) => ({
        ...previous,
        [name]: value,
      }));
    },
    []
  );

  const handleQuickTransactionHide = useCallback(() => {
    setShowQuickTransactionModal(false);
  }, []);

  const value = useMemo<TransactionModalContextValue>(
    () => ({
      openTransactionModal,
      closeTransactionModal,
      openQuickTransactionModal,
      setTransactionDefaults,
      transactions,
    }),
    [
      closeTransactionModal,
      openQuickTransactionModal,
      openTransactionModal,
      setTransactionDefaults,
      transactions,
    ]
  );

  return (
    <TransactionModalContext.Provider value={value}>
      {children}
      <TransactionModal
        show={showTransactionModal}
        onHide={closeTransactionModal}
        transaction={currentTransaction}
        onChange={handleTransactionChange}
        onSave={handleSaveTransaction}
        quickTransactions={quickTransactionOptions}
        onTemplateSelect={handleTemplateSelect}
        onAddTemplate={openQuickTransactionModal}
        availableCategories={allCategories}
        availableAccounts={selectableAccounts}
        categoryTree={categoryTree}
        parentCategoryColors={parentCategoryColors}
        accountTree={accountTree}
        accountColors={accountColors}
        categoryIcons={
          categoryIcons as Record<
            string,
            IconType | React.ComponentType<IconBaseProps> | null | undefined
          >
        }
        accountIcons={
          accountIcons as Record<
            string,
            IconType | React.ComponentType<IconBaseProps> | null | undefined
          >
        }
      />
      <QuickTransactionModal
        show={showQuickTransactionModal}
        onHide={handleQuickTransactionHide}
        quickTransaction={newQuickTransaction}
        onChange={handleQuickTransactionChange}
        onSubmit={handleAddNewQuickTransaction}
        availableCategories={allCategories}
        availableAccounts={selectableAccounts}
      />
    </TransactionModalContext.Provider>
  );
};

