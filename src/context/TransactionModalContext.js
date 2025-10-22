import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  FaUniversity,
  FaPiggyBank,
  FaCreditCard,
  FaMoneyBillWave,
} from 'react-icons/fa';
import { TransactionModal } from '../pages/transactions/TransactionModal';
import { QuickTransactionModal } from '../pages/transactions/QuickTransactionModal';
import { useCategoryData } from '../pages/transactions/useCategoryData';
import { useQuickTransactions } from '../pages/transactions/useQuickTransactions';
import { buildAccountMetadata } from '../components/PeriodRangeSelector';

const ACCOUNT_METADATA_STORAGE_KEY = 'finance-app-account-metadata';

const accounts = ['All', 'Checking Account', 'Savings Account', 'Credit Card', 'Cash'];

const accountIconComponents = {
  FaUniversity,
  FaPiggyBank,
  FaCreditCard,
  FaMoneyBillWave,
};

const TransactionModalContext = createContext({
  openTransactionModal: () => {
    throw new Error('TransactionModalProvider is missing');
  },
  closeTransactionModal: () => {},
  openQuickTransactionModal: () => {},
  setTransactionDefaults: () => {},
  transactions: [],
});

const getLocalDateTimeString = () => {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset();
  const localTime = new Date(now.getTime() - timezoneOffset * 60000);
  return localTime.toISOString().slice(0, 16);
};

const createTransactionTemplate = (overrides = {}) => {
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
    category: overrides.category ?? 'Food & Dining',
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

const createQuickTransactionTemplate = (overrides = {}) => ({
  description: overrides.description ?? '',
  category: overrides.category ?? 'Food & Dining',
  amount: overrides.amount ?? '',
  account: overrides.account ?? 'Checking Account',
  type: overrides.type ?? 'Expense',
  currency: overrides.currency ?? 'IDR',
});

export const useTransactionModal = () => useContext(TransactionModalContext);

export const TransactionModalProvider = ({ children }) => {
  const {
    categories,
    categoryTree,
    parentCategoryColors,
    categoryIcons,
    allCategories,
    addCategory,
  } = useCategoryData();
  const { quickTransactions, addQuickTransactionPreset } = useQuickTransactions(categories);

  const selectableAccounts = useMemo(() => accounts.filter((account) => account !== 'All'), []);

  const accountMetadata = useMemo(() => {
    let storedMetadata = {};
    if (typeof window !== 'undefined') {
      try {
        const persisted = window.localStorage.getItem(ACCOUNT_METADATA_STORAGE_KEY);
        if (persisted) {
          storedMetadata = JSON.parse(persisted);
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

  const accountTree = useMemo(
    () => Object.fromEntries(selectableAccounts.map((account) => [account, []])),
    [selectableAccounts]
  );

  const accountColors = useMemo(
    () =>
      Object.fromEntries(
        selectableAccounts.map((account) => [account, accountMetadata[account]?.color || '#6c757d'])
      ),
    [selectableAccounts, accountMetadata]
  );

  const accountIcons = useMemo(
    () =>
      Object.fromEntries(
        selectableAccounts.map((account) => {
          const iconKey = accountMetadata[account]?.icon;
          return [account, iconKey ? accountIconComponents[iconKey] || null : null];
        })
      ),
    [selectableAccounts, accountMetadata]
  );

  const [transactions, setTransactions] = useState([]);
  const [currentTransaction, setCurrentTransaction] = useState(() => createTransactionTemplate());
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showQuickTransactionModal, setShowQuickTransactionModal] = useState(false);
  const [newQuickTransaction, setNewQuickTransaction] = useState(createQuickTransactionTemplate());

  const ensureCategoryExists = useCallback(
    (categoryName) => {
      if (!categoryName || allCategories.includes(categoryName)) {
        return;
      }

      const fallbackParent =
        categories.find((category) => category.is_parent && category.name !== 'Income') ||
        categories.find((category) => category.is_parent) ||
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

  const handleTransactionChange = useCallback((event) => {
    const { name, value, checked } = event.target;
    if (!name) {
      return;
    }
    if (name === 'dateTime') {
      const nextValue = value;
      setCurrentTransaction((previous) => ({
        ...previous,
        dateTime: nextValue,
        date: nextValue ? nextValue.slice(0, 10) : previous.date,
      }));
      return;
    }
    const nextValue = typeof checked === 'boolean' ? checked : value;
    setCurrentTransaction((previous) => ({
      ...previous,
      [name]: nextValue,
    }));
  }, []);

  const handleTemplateSelect = useCallback(
    (templateId) => {
      if (!templateId) {
        setCurrentTransaction((previous) => ({
          ...previous,
          templateId: '',
        }));
        return;
      }
      const selected = quickTransactions.find((preset) => String(preset.id) === String(templateId));
      if (!selected) {
        return;
      }
      setCurrentTransaction((previous) => ({
        ...previous,
        templateId: String(selected.id),
        description: selected.description || '',
        amount: selected.amount || '',
        category: selected.category || previous.category,
        account: selected.account || previous.account,
        type: selected.type || previous.type,
        currency: selected.currency || previous.currency,
      }));
    },
    [quickTransactions]
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

      const parsedAmount = parseFloat(currentTransaction.amount);
      const transactionRecord = {
        ...currentTransaction,
        id: Date.now(),
        amount: Number.isNaN(parsedAmount) ? 0 : parsedAmount,
      };

      if (isTransfer) {
        const parsedToAmount = parseFloat(currentTransaction.toAmount);
        transactionRecord.toAmount = Number.isNaN(parsedToAmount)
          ? currentTransaction.toAmount
          : parsedToAmount;
      }

      setTransactions((previous) => [transactionRecord, ...previous]);

      if (currentTransaction.createTemplate) {
        addQuickTransactionPreset({
          description: currentTransaction.description,
          category: currentTransaction.category,
          amount: currentTransaction.amount,
          account: currentTransaction.account,
          type: currentTransaction.type,
          currency: currentTransaction.currency,
        });
      }

      if (createAnother) {
        const nextDefaults = {
          type: currentTransaction.type,
          currency: currentTransaction.currency,
          account: currentTransaction.account,
          category: currentTransaction.category,
        };

        if (isTransfer) {
          nextDefaults.toAccount = currentTransaction.toAccount;
          nextDefaults.toCurrency = currentTransaction.toCurrency || currentTransaction.currency;
        }

        setCurrentTransaction(createTransactionTemplate(nextDefaults));
        return;
      }

      setShowTransactionModal(false);
      setCurrentTransaction(createTransactionTemplate());
    },
    [
      addQuickTransactionPreset,
      currentTransaction,
      ensureCategoryExists,
    ]
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
    (overrides = {}) => {
      if (overrides && Object.keys(overrides).length > 0) {
        setCurrentTransaction((previous) => createTransactionTemplate({ ...previous, ...overrides }));
      }
      setShowTransactionModal(true);
    },
    []
  );

  const setTransactionDefaults = useCallback((overrides = {}) => {
    setCurrentTransaction(createTransactionTemplate(overrides));
  }, []);

  const closeTransactionModal = useCallback(() => {
    setShowTransactionModal(false);
    setCurrentTransaction(createTransactionTemplate());
  }, []);

  const openQuickTransactionModal = useCallback(() => {
    setNewQuickTransaction(createQuickTransactionTemplate());
    setShowQuickTransactionModal(true);
  }, []);

  const value = useMemo(
    () => ({
      openTransactionModal,
      closeTransactionModal,
      openQuickTransactionModal,
      setTransactionDefaults,
      transactions,
    }),
    [closeTransactionModal, openQuickTransactionModal, openTransactionModal, setTransactionDefaults, transactions]
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
        quickTransactions={quickTransactions}
        onTemplateSelect={handleTemplateSelect}
        onAddTemplate={openQuickTransactionModal}
        availableCategories={allCategories}
        availableAccounts={selectableAccounts}
        categoryTree={categoryTree}
        parentCategoryColors={parentCategoryColors}
        categoryIcons={categoryIcons}
        accountTree={accountTree}
        accountColors={accountColors}
        accountIcons={accountIcons}
      />
      <QuickTransactionModal
        show={showQuickTransactionModal}
        onHide={() => setShowQuickTransactionModal(false)}
        quickTransaction={newQuickTransaction}
        onChange={(event) => {
          const { name, value } = event.target;
          setNewQuickTransaction((previous) => ({ ...previous, [name]: value }));
        }}
        onSubmit={handleAddNewQuickTransaction}
        availableCategories={allCategories}
        availableAccounts={selectableAccounts}
      />
    </TransactionModalContext.Provider>
  );
};
