/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useState, createElement } from 'react';
import type { ChangeEvent, ComponentType } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Modal,
} from 'react-bootstrap';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  FaFilter,
  FaUniversity,
  FaPiggyBank,
  FaCreditCard,
  FaMoneyBillWave,
  FaTags,
  FaPlus,
  FaCheck,
} from 'react-icons/fa';
import type { IconType, IconBaseProps } from 'react-icons';
import { useCategoryData, type CategoryIconName } from './useCategoryData';
import { useQuickTransactions, type CategoryReference } from './useQuickTransactions';
import { CategoryDropdown } from './CategoryDropdown';
import {
  TransactionModal,
  type TransactionFormValues,
  type TransactionChangeEvent,
  type QuickTransactionOption,
  type TransactionModalSaveContext,
} from './TransactionModal';
import {
  QuickTransactionModal,
  type QuickTransactionFormValues,
} from './QuickTransactionModal';
import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '../../components/PeriodNavigation';
import PeriodRangeSelector, {
  buildAccountMetadata,
} from '../../components/PeriodRangeSelector';
import {
  categoryService,
  type ApiCategoryResponse,
} from '../../services/categoryService';
import {
  accountService,
  type ApiAccountResponse,
} from '../../services/accountService';
import {
  transactionService,
  type CreateTransactionRequest,
} from '../../services/transactionService';
import { formatDateForBackend } from '../../utils/dateFormatter';
import AmountRangeFilter from '../../components/AmountRangeFilter';
import { MobileFilterOffcanvas, type FilterVisibility } from './components/MobileFilterOffcanvas';
import {
  DesktopFilterSidebar,
  SortDropdown,
  renderIcon,
  type SortValue,
  type IconRenderable,
  type DropdownIconMap,
} from './components/DesktopFilterSidebar';
import { useFilterData } from './hooks/useFilterData';

type TransactionType = 'Expense' | 'Income' | 'Transfer' | string;

type TransactionRecord = TransactionFormValues & { id: number };

type TagTone = 'neutral' | 'want' | 'need' | 'credit' | 'debt';

interface AccountMetadataEntry {
  color: string;
  icon: string | null;
}

type AccountMetadata = Record<string, AccountMetadataEntry>;

type CategoryMap = Record<string, ApiCategoryResponse>;

interface QuickTransactionPreset extends QuickTransactionFormValues {
  id?: string | number;
  category_id?: string | number | null;
}

type QuickTransactionPresetInput = Partial<QuickTransactionPreset> &
  Pick<QuickTransactionPreset, 'description' | 'category'>;

const DEFAULT_CATEGORY_COLOR = '#6c757d';
const DEFAULT_CATEGORY_ICON: CategoryIconName = 'FaGift';

type ApiCategoryEntity = ApiCategoryResponse & {
  id: string;
  name: string;
};

const isValidApiCategory = (
  item: ApiCategoryResponse | null | undefined
): item is ApiCategoryEntity => {
  if (!item) {
    return false;
  }

  const { id, name } = item;
  return typeof id === 'string' && id.length > 0 && typeof name === 'string' && name.length > 0;
};

const normalizeApiCategory = (item: ApiCategoryEntity): ApiCategoryResponse => ({
  ...item,
  id: item.id,
  parent_id: item.parent_id ?? null,
  name: item.name,
  icon: item.icon ?? DEFAULT_CATEGORY_ICON,
  color: item.color ?? DEFAULT_CATEGORY_COLOR,
  is_parent:
    typeof item.is_parent === 'boolean'
      ? item.is_parent
      : item.parent_id == null,
});

const ACCOUNT_METADATA_STORAGE_KEY = 'finance-app-account-metadata';
const FILTER_VISIBILITY_STORAGE_KEY = 'finance-app-filter-visibility';

const accountIconComponents: Record<string, IconRenderable> = {
  FaUniversity,
  FaPiggyBank,
  FaCreditCard,
  FaMoneyBillWave,
};

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
    categoryId: overrides.categoryId ?? '',
    account: overrides.account ?? '',
    toAccount: overrides.toAccount ?? '',
    toAmount: overrides.toAmount ?? '',
    toCurrency: overrides.toCurrency ?? overrides.currency ?? 'IDR',
    labels: overrides.labels ?? '',
    createTemplate: overrides.createTemplate ?? false,
    notes: overrides.notes ?? '',
    payer: overrides.payer ?? '',
    paymentType: overrides.paymentType ?? 'Cash',
    paymentStatus: overrides.paymentStatus ?? 'Cleared',
    ...overrides,
  };
};

const createQuickTransactionTemplate = (
  overrides: Partial<QuickTransactionFormValues> = {}
): QuickTransactionFormValues => ({
  description: overrides.description ?? '',
  category: overrides.category ?? '',
  amount: overrides.amount ?? '',
  account: overrides.account ?? '',
  type: overrides.type ?? 'Expense',
  currency: overrides.currency ?? 'IDR',
  ...overrides,
});

function TransactionsContent(): JSX.Element {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const searchParams = useSearchParams();
  
  // Use the shared filter data hook
  const {
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
    categories,
    categoryTree,
    parentCategoryColors,
    categoryIcons,
    allCategories,
    setCategories,
    apiAccounts,
    selectableAccounts,
    accountTree,
    accountColors,
    accountIcons,
  } = useFilterData();
  
  const { addCategory } = useCategoryData();
  const quickTransactionCategories = useMemo<CategoryReference[]>(
    () =>
      categories
        .filter(isValidApiCategory)
        .map((category) => ({
          id: category.id,
          name: category.name,
        })),
    [categories]
  );
  const { quickTransactions, addQuickTransactionPreset } = useQuickTransactions(
    quickTransactionCategories
  ) as unknown as {
    quickTransactions: QuickTransactionPreset[];
    addQuickTransactionPreset: (preset: QuickTransactionPresetInput) => void;
  };

  const normalizedQuickTransactions = useMemo<QuickTransactionOption[]>(
    () =>
      quickTransactions.map((preset, index) => ({
        id: preset.id ?? index,
        description: preset.description,
        category: preset.category,
        amount: preset.amount,
        account: preset.account,
        type: preset.type as TransactionType | undefined,
        currency: preset.currency,
      })),
    [quickTransactions]
  );

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionFormValues>(
    createTransactionTemplate()
  );
  const [, setLastTransaction] = useState<TransactionFormValues | null>(null);
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [showQuickTransactionModal, setShowQuickTransactionModal] =
    useState<boolean>(false);
  const [newQuickTransaction, setNewQuickTransaction] =
    useState<QuickTransactionFormValues>(createQuickTransactionTemplate());
  const [showFilterSidebar, setShowFilterSidebar] = useState<boolean>(false);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<number[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(false);

  useEffect(() => {
    const open = searchParams?.get('openTransactionModal');
    if (open) {
      setShowTransactionModal(true);
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.delete('openTransactionModal');
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname);
    }
  }, [searchParams, pathname, router]);

  const categoryByName = useMemo<CategoryMap>(
    () =>
      categories.reduce<CategoryMap>((accumulator, category) => {
        if (category.name) {
          accumulator[category.name] = category;
        }
        return accumulator;
      }, {}),
    [categories]
  );
  const {
    state: { dateRange, periodLabel, activePeriod, customRangeDraft },
  } = usePeriodNavigation();

  // Fetch transactions from service
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoadingTransactions(true);
        console.log('📊 Fetching transactions...', {
          startDate: dateRange.start,
          endDate: dateRange.end,
          categoriesLoaded: categories.length,
          accountsLoaded: apiAccounts.length,
        });

        const apiTransactions = await transactionService.fetchTransactions({
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
        });

        console.log('📊 Received transactions from API:', apiTransactions.length);

        // Map API response to TransactionRecord format
        const mappedTransactions: TransactionRecord[] = apiTransactions.map((apiTxn, index) => {
          // Find category and account names
          const category = categories.find(cat => cat.id === apiTxn.category_id);
          const account = apiAccounts.find(acc => acc.id === apiTxn.account_id);

          // Extract numeric ID from string (e.g., 'txn-1' -> 1) or use index
          let numericId = index; // Default to index
          if (apiTxn.id) {
            const extracted = parseInt(apiTxn.id.replace(/\D/g, ''), 10);
            numericId = !isNaN(extracted) ? extracted : index;
          }

          return {
            id: numericId,
            templateId: '',
            type: apiTxn.type || 'Expense',
            description: apiTxn.note || `Transaction ${apiTxn.id}`,
            amount: apiTxn.amount || 0,
            currency: 'IDR',
            date: apiTxn.date ? new Date(apiTxn.date).toISOString().slice(0, 10) : '',
            dateTime: apiTxn.date || '',
            category: category?.name || 'Unknown',
            categoryId: apiTxn.category_id || '',
            account: account?.name || 'Unknown',
            accountName: account?.name || 'Unknown',
            toAccount: '',
            toAmount: '',
            toCurrency: 'IDR',
            labels: '',
            createTemplate: false,
            notes: apiTxn.note || '',
            payer: '',
            paymentType: 'Cash',
            paymentStatus: 'Cleared',
          };
        });

        // Filter out any transactions with invalid IDs as a safeguard
        const validTransactions = mappedTransactions.filter(txn =>
          typeof txn.id === 'number' && !isNaN(txn.id)
        );

        console.log('📊 Mapped transactions:', validTransactions.length);
        setTransactions(validTransactions);
      } catch (error) {
        console.error('❌ Failed to fetch transactions:', error);
      } finally {
        setLoadingTransactions(false);
      }
    };

    // Load transactions immediately - categories and accounts will be mapped when available
    void loadTransactions();
  }, [dateRange.start, dateRange.end, categories, apiAccounts]);

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(transaction.category);

      const matchesAccount = selectedAccounts.length === 0 || selectedAccounts.includes(transaction.accountName || transaction.account);

      const matchesDate = (() => {
        if (!dateRange.start && !dateRange.end) {
          return true;
        }
        const transactionTime = new Date(transaction.date).getTime();
        const afterStart = dateRange.start ? transactionTime >= new Date(dateRange.start).getTime() : true;
        const beforeEnd = dateRange.end ? transactionTime <= new Date(dateRange.end).getTime() : true;
        return afterStart && beforeEnd;
      })();

      const matchesAmount = (() => {
        const absoluteAmount = Math.abs(Number(transaction.amount ?? 0));
        return absoluteAmount >= minAmount && absoluteAmount <= maxAmount;
      })();

      return matchesSearch && matchesCategory && matchesAccount && matchesDate && matchesAmount;
    });

    const comparator = (a: TransactionRecord, b: TransactionRecord) => {
      switch (sortOption) {
        case 'timeAsc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'timeDesc':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'amountAsc':
          return Number(a.amount ?? 0) - Number(b.amount ?? 0);
        case 'amountDesc':
          return Number(b.amount ?? 0) - Number(a.amount ?? 0);
        case 'absAmountAsc':
          return Math.abs(Number(a.amount ?? 0)) - Math.abs(Number(b.amount ?? 0));
        case 'absAmountDesc':
          return Math.abs(Number(b.amount ?? 0)) - Math.abs(Number(a.amount ?? 0));
        default:
          return 0;
      }
    };

    return [...filtered].sort(comparator);
  }, [transactions, searchTerm, selectedCategories, selectedAccounts, dateRange, sortOption, minAmount, maxAmount]);
  useEffect(() => {
    setSelectedTransactionIds((previous) =>
      previous.filter((id) =>
        filteredTransactions.some((transaction) => transaction.id === id)
      )
    );
  }, [filteredTransactions]);
  const selectedIdsSet = useMemo(() => new Set(selectedTransactionIds), [selectedTransactionIds]);
  const allSelected = filteredTransactions.length > 0 && filteredTransactions.every((transaction) => selectedIdsSet.has(transaction.id));
  const hasSelection = selectedTransactionIds.length > 0;
  const totalAmount = useMemo(
    () =>
      filteredTransactions.reduce(
        (accumulator, transaction) => accumulator + Number(transaction.amount ?? 0),
        0
      ),
    [filteredTransactions]
  );

  const formatCurrency = useCallback(
    (amount: number | string | null | undefined, currency = 'IDR'): string => {
      if (amount == null || Number.isNaN(Number(amount))) {
        return '-';
      }
      const safeCurrency = typeof currency === 'string' && currency ? currency : 'IDR';
      try {
        const formatter = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: safeCurrency,
          minimumFractionDigits: 2,
        });
        const formatted = formatter.format(Math.abs(Number(amount)));
        return `${Number(amount) < 0 ? '-' : ''}${formatted}`;
      } catch (error) {
        const numericValue = typeof amount === 'number' ? amount.toFixed(2) : amount;
        return `${Number(amount) < 0 ? '-' : ''}${safeCurrency} ${numericValue}`;
      }
    },
    []
  );

  const formatTransactionDate = useCallback((dateValue?: string, dateTimeValue?: string): string => {
    const source = dateTimeValue || dateValue;
    if (!source) {
      return '';
    }
    const parsed = new Date(source);
    if (Number.isNaN(parsed.getTime())) {
      return source;
    }
    const dateLabel = new Intl.DateTimeFormat('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    }).format(parsed);
    const timeLabel = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(parsed);
    return `${dateLabel} ${timeLabel}`;
  }, []);

  const handleToggleTransactionSelect = useCallback((transactionId: number): void => {
    setSelectedTransactionIds((previous) => {
      if (previous.includes(transactionId)) {
        return previous.filter((id) => id !== transactionId);
      }
      return [...previous, transactionId];
    });
  }, []);

  const handleToggleSelectAll = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { checked } = event.target;
      if (checked) {
        setSelectedTransactionIds(filteredTransactions.map((transaction) => transaction.id));
      } else {
        setSelectedTransactionIds([]);
      }
    },
    [filteredTransactions]
  );

  const getSurfaceColor = useCallback((hexColor: string | null | undefined, alpha = 0.12): string => {
    if (!hexColor || typeof hexColor !== 'string') {
      return `rgba(15, 23, 42, ${alpha})`;
    }
    let normalized = hexColor.trim();
    if (normalized.startsWith('#')) {
      normalized = normalized.slice(1);
    }
    if (normalized.length === 3) {
      normalized = normalized
        .split('')
        .map((char) => char + char)
        .join('');
    }
    if (normalized.length !== 6) {
      return `rgba(15, 23, 42, ${alpha})`;
    }
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
    if ([r, g, b].some((value) => Number.isNaN(value))) {
      return `rgba(15, 23, 42, ${alpha})`;
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }, []);

  const resolveTagTone = useCallback((label: string | null | undefined): TagTone => {
    if (!label) {
      return 'neutral';
    }
    const normalized = label.toString().toLowerCase();
    if (['want', 'wishlist'].includes(normalized)) {
      return 'want';
    }
    if (['need', 'pending', 'due'].includes(normalized)) {
      return 'need';
    }
    if (['credit', 'income', 'bonus'].includes(normalized)) {
      return 'credit';
    }
    if (['debt', 'loan', 'owed'].includes(normalized)) {
      return 'debt';
    }
    return 'neutral';
  }, []);

  const ensureCategoryExists = useCallback(
    async (categoryName: string): Promise<ApiCategoryResponse | undefined> => {
      const trimmedName = categoryName?.trim();
      if (!trimmedName) {
        return undefined;
      }

      const existingCategory = categories.find((category) => category.name?.trim() === trimmedName);
      if (existingCategory?.id) {
        return existingCategory;
      }

      if (allCategories.includes(trimmedName)) {
        return existingCategory;
      }

      const fallbackParent =
        categories.find((category) => category.is_parent && category.name !== 'Income') ||
        categories.find((category) => category.is_parent) ||
        null;

      const fallbackParentId = fallbackParent?.id ?? null;
      const fallbackColor = fallbackParent?.color ?? DEFAULT_CATEGORY_COLOR;

      const findMatchingCategory = (items: ApiCategoryResponse[]): ApiCategoryResponse | undefined => {
        const normalizedTarget = trimmedName.toLowerCase();
        return items.find((item) => {
          if (!item?.name) {
            return false;
          }
          const normalizedName = item.name.trim().toLowerCase();
          return normalizedName === normalizedTarget && typeof item.id === 'string' && item.id.length > 0;
        });
      };

      try {
        const candidates = await categoryService.fetchCategories({ keyword: trimmedName });
        let resolvedCategory = findMatchingCategory(candidates);

        if (!resolvedCategory) {
          const allRemoteCategories = await categoryService.fetchCategories();
          resolvedCategory = findMatchingCategory(allRemoteCategories);
        }

        if (!resolvedCategory?.id) {
          // eslint-disable-next-line no-console
          console.warn('Category not found from API lookup:', trimmedName);
          return undefined;
        }

        const resolvedParentId =
          resolvedCategory.parent_id ?? fallbackParentId;
        const resolvedColor = resolvedCategory.color ?? fallbackColor;
        const resolvedIsParent =
          typeof resolvedCategory.is_parent === 'boolean'
            ? resolvedCategory.is_parent
            : resolvedParentId == null;
        const resolvedIcon =
          typeof resolvedCategory.icon === 'string' && resolvedCategory.icon.length > 0
            ? (resolvedCategory.icon as CategoryIconName)
            : DEFAULT_CATEGORY_ICON;

        return addCategory(
          resolvedCategory.name ?? trimmedName,
          resolvedParentId,
          resolvedIcon,
          resolvedColor,
          resolvedIsParent,
          resolvedCategory.id
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch categories from API', error);
        return undefined;
      }
    },
    [addCategory, allCategories, categories]
  );

  const handleSaveTransaction = async (
    createAnother = false,
    context?: TransactionModalSaveContext
  ): Promise<void> => {
    const isTransfer = currentTransaction.type === 'Transfer';
    if (!currentTransaction.description) {
      alert('Please enter a description');
      return;
    }

    if (isTransfer) {
      if (!currentTransaction.account || !currentTransaction.toAccount || currentTransaction.amount === '') {
        alert('Please fill in all required fields for transfer: From Account, To Account, and Amount');
        return;
      }
    } else if (currentTransaction.amount === '') {
      alert('Please enter an amount');
      return;
    }

    const ensuredCategory = await ensureCategoryExists(currentTransaction.category);

    const parsedAmount = Number.parseFloat(String(currentTransaction.amount ?? 0));
    // Generate a unique ID that won't collide with existing transactions
    const maxId = transactions.reduce((max, txn) => {
      const id = typeof txn.id === 'number' && !isNaN(txn.id) ? txn.id : 0;
      return Math.max(max, id);
    }, 0);
    const transactionRecord: TransactionRecord = {
      ...currentTransaction,
      id: maxId + 1,
      amount: Number.isNaN(parsedAmount) ? 0 : parsedAmount,
    };

    if (isTransfer) {
      const parsedToAmount = Number.parseFloat(String(currentTransaction.toAmount ?? ''));
      transactionRecord.toAmount = Number.isNaN(parsedToAmount) ? currentTransaction.toAmount : parsedToAmount;
    }

    // Determine category ID from current selection
    const normalizedCategoryIdFromContext =
      context?.categoryId && String(context.categoryId).length > 0
        ? String(context.categoryId)
        : '';
    const normalizedCategoryId =
      normalizedCategoryIdFromContext ||
      (currentTransaction.categoryId && String(currentTransaction.categoryId).length > 0
        ? String(currentTransaction.categoryId)
        : '');
    const categoryRecordById = normalizedCategoryId
      ? categories.find((cat) => String(cat.id) === normalizedCategoryId)
      : undefined;
    const categoryRecordByName = categories.find(
      (cat) => cat.name === currentTransaction.category
    );
    const categoryRecord = categoryRecordById ?? categoryRecordByName ?? ensuredCategory;
    const categoryId = normalizedCategoryId || categoryRecord?.id;

    transactionRecord.categoryId = categoryId ?? '';

    // Map account name to account ID
    const accountRecord = apiAccounts.find((acc) => acc.name === currentTransaction.account);
    const accountId = accountRecord?.id;

    // Basic validation
    if (!categoryId) {
      // eslint-disable-next-line no-console
      console.error('Category not found:', currentTransaction.category);
      alert('Please select a valid category');
      return;
    }

    if (!accountId) {
      // eslint-disable-next-line no-console
      console.error('Account not found:', currentTransaction.account);
      alert('Please select a valid account');
      return;
    }

    try {
      // Prepare the API payload
      const normalizedAmount =
        typeof transactionRecord.amount === 'number'
          ? transactionRecord.amount
          : Number(transactionRecord.amount);

      // Format the date properly for Go backend (RFC3339 with seconds and timezone)
      const formattedDate = formatDateForBackend(currentTransaction.dateTime || currentTransaction.date);

      const createPayload: CreateTransactionRequest = {
        date: formattedDate,
        account_id: accountId,
        category_id: String(categoryId),
        amount: Number.isNaN(normalizedAmount) ? 0 : normalizedAmount,
        type: currentTransaction.type,
        note: currentTransaction.notes || null,
      };

      // Call the API to create the transaction
      const createdTransaction = await transactionService.createTransaction(createPayload);

      // Refresh transactions from API
      try {
        const apiTransactions = await transactionService.fetchTransactions({
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
        });

        const mappedTransactions: TransactionRecord[] = apiTransactions.map((apiTxn, index) => {
          const category = categories.find(cat => cat.id === apiTxn.category_id);
          const account = apiAccounts.find(acc => acc.id === apiTxn.account_id);

          // Extract numeric ID from string (e.g., 'txn-1' -> 1) or use index
          let numericId = index; // Default to index
          if (apiTxn.id) {
            const extracted = parseInt(apiTxn.id.replace(/\D/g, ''), 10);
            numericId = !isNaN(extracted) ? extracted : index;
          }

          return {
            id: numericId,
            templateId: '',
            type: apiTxn.type || 'Expense',
            description: apiTxn.note || `Transaction ${apiTxn.id}`,
            amount: apiTxn.amount || 0,
            currency: 'IDR',
            date: apiTxn.date ? new Date(apiTxn.date).toISOString().slice(0, 10) : '',
            dateTime: apiTxn.date || '',
            category: category?.name || 'Unknown',
            categoryId: apiTxn.category_id || '',
            account: account?.name || 'Unknown',
            accountName: account?.name || 'Unknown',
            toAccount: '',
            toAmount: '',
            toCurrency: 'IDR',
            labels: '',
            createTemplate: false,
            notes: apiTxn.note || '',
            payer: '',
            paymentType: 'Cash',
            paymentStatus: 'Cleared',
          };
        });

        // Filter out any transactions with invalid IDs as a safeguard
        const validTransactions = mappedTransactions.filter(txn =>
          typeof txn.id === 'number' && !isNaN(txn.id)
        );

        setTransactions(validTransactions);
      } catch (refreshError) {
        console.error('Failed to refresh transactions:', refreshError);
        // Fallback to adding locally if refresh fails
        if (typeof transactionRecord.id === 'number' && !isNaN(transactionRecord.id)) {
          setTransactions((previous) => [transactionRecord, ...previous]);
        } else {
          console.error('Cannot add transaction with invalid ID:', transactionRecord.id);
        }
      }

      setLastTransaction(transactionRecord);

      if (currentTransaction.createTemplate) {
        addQuickTransactionPreset({
          description: currentTransaction.description,
          category: currentTransaction.category,
          category_id: categoryId ?? normalizedCategoryId ?? null,
          amount: currentTransaction.amount,
          account: currentTransaction.account,
          type: currentTransaction.type,
          currency: currentTransaction.currency,
        });
      }

      if (createAnother) {
        const nextDefaults: Partial<TransactionFormValues> = {
          type: currentTransaction.type,
          currency: currentTransaction.currency,
          account: currentTransaction.account,
          category: currentTransaction.category,
          categoryId: currentTransaction.categoryId,
        };

        if (isTransfer) {
          nextDefaults.toAccount = currentTransaction.toAccount;
          nextDefaults.toCurrency = currentTransaction.toCurrency || currentTransaction.currency;
        }
        setCurrentTransaction(createTransactionTemplate(nextDefaults));
        return;
      }

      setShowTransactionModal(false);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to create transaction:', error);
      alert('Failed to create transaction. Please try again.');
    }
  };

  const handleAddNewQuickTransaction = (): void => {
    if (!newQuickTransaction.description || !newQuickTransaction.category) {
      return;
    }

    void ensureCategoryExists(newQuickTransaction.category);
    addQuickTransactionPreset(newQuickTransaction as QuickTransactionPresetInput);
    setNewQuickTransaction(createQuickTransactionTemplate());
    setShowQuickTransactionModal(false);
  };

  const handleTransactionChange = useCallback((event: TransactionChangeEvent): void => {
    const target = event.target as typeof event.target & { checked?: boolean };
    const { name } = target;
    if (!name) {
      return;
    }
    if (name === 'dateTime') {
      const nextValue = String(target.value ?? '');
      setCurrentTransaction((previous) => ({
        ...previous,
        dateTime: nextValue,
        date: nextValue ? nextValue.slice(0, 10) : previous.date,
      }));
      return;
    }
    const nextValue =
      typeof target.checked === 'boolean' ? target.checked : target.value;
    setCurrentTransaction((previous) => ({
      ...previous,
      [name]: nextValue,
    }));
  }, [setCurrentTransaction]);

  const handleTemplateSelect = useCallback(
    (templateId: string | null) => {
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
        categoryId:
          (selected.category_id && String(selected.category_id).length > 0)
            ? String(selected.category_id)
            : categoryByName[selected.category ?? '']?.id || previous.categoryId,
        account: selected.account || previous.account,
        type: selected.type || previous.type,
        currency: selected.currency || previous.currency,
      }));
    },
    [quickTransactions, setCurrentTransaction, categoryByName]
  );

  const toggleFilterSidebar = (): void =>
    setShowFilterSidebar((previous) => !previous);


  return (
    <Container fluid className="transactions-page">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center mb-2 d-lg-none">
        <div className="d-flex w-100 justify-content-end justify-content-lg-end mt-2 mt-lg-0">
          <div className="d-flex align-items-center">
            <Button
              variant="outline-secondary"
              className="me-2 d-lg-none"
              onClick={toggleFilterSidebar}
              aria-label="Filter transactions"
              title="Filter transactions"
            >
              {renderIcon(FaFilter)}
            </Button>
            <Button
              type="button"
              variant="outline-secondary"
              className="me-2 d-lg-none"
              onClick={() => setShowTransactionModal(true)}
              aria-label="Add transaction"
            >
              {renderIcon(FaPlus, { size: 18 })}
            </Button>
          </div>
        </div>
      </div>
      <Row className="align-items-stretch">
        <Col lg={3} className="mb-2 d-none d-lg-block">
          <DesktopFilterSidebar
            title="Transactions"
            filterVisibility={filterVisibility}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            sortOption={sortOption}
            onSortOptionChange={setSortOption}
            selectedCategories={selectedCategories}
            onSelectedCategoriesChange={setSelectedCategories}
            categoryTree={categoryTree}
            parentCategoryColors={parentCategoryColors}
            categoryIcons={categoryIcons as DropdownIconMap}
            allCategories={allCategories}
            selectedAccounts={selectedAccounts}
            onSelectedAccountsChange={setSelectedAccounts}
            accountTree={accountTree}
            accountColors={accountColors}
            accountIcons={accountIcons as DropdownIconMap}
            selectableAccounts={selectableAccounts}
            minAmount={minAmount}
            maxAmount={maxAmount}
            onMinAmountChange={setMinAmount}
            onMaxAmountChange={setMaxAmount}
            onFilterVisibilityChange={setFilterVisibility}
            onShowTransactionModal={() => setShowTransactionModal(true)}
            showAddTransactionButton={true}
            SortDropdownComponent={SortDropdown}
          />
        </Col>

        <Col lg={9}>
          <PeriodNavigation className="mb-3">
            <PeriodRangeSelector
              label={periodLabel}
              activePeriod={activePeriod}
              customRange={customRangeDraft}
            />
          </PeriodNavigation>
          <Card className="transactions-ledger-card">
            <Card.Body className="transactions-ledger-card__body">
              <div className="transactions-ledger__header">
                <div className="transactions-ledger__header-left">
                  <span className="transactions-ledger__count">
                    {`Found ${filteredTransactions.length} ${filteredTransactions.length === 1 ? 'record' : 'records'}`}
                  </span>
                  <Form.Check
                    type="checkbox"
                    id="transactions-select-all"
                    label="Select all"
                    className="transactions-ledger__select-all"
                    checked={allSelected}
                    onChange={handleToggleSelectAll}
                  />
                </div>
                <div className="transactions-ledger__header-right">
                  <span className="transactions-ledger__total-label">Net total</span>
                  <span className={`transactions-ledger__total-value ${totalAmount >= 0 ? 'is-income' : 'is-expense'}`}>
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              <div className="transactions-ledger__actions">
                <Button
                  type="button"
                  variant="outline-secondary"
                  size="sm"
                  className="transactions-ledger__action-btn"
                  disabled={!hasSelection}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="outline-secondary"
                  size="sm"
                  className="transactions-ledger__action-btn"
                  disabled={!hasSelection}
                >
                  Export
                </Button>
                <Button
                  type="button"
                  variant="outline-secondary"
                  size="sm"
                  className="transactions-ledger__action-btn"
                  disabled={!hasSelection}
                >
                  Delete
                </Button>
              </div>

              <div className="transactions-ledger__list">
                {filteredTransactions.length === 0 ? (
                  <div className="transactions-ledger__empty">
                    No transactions found for this filter.
                  </div>
                ) : (
                  filteredTransactions.map((transaction) => {
                    const CategoryIcon = (categoryIcons[transaction.category] || FaTags) as IconRenderable;
                    const categoryColor =
                      categoryByName[transaction.category]?.color || '#3b82f6';
                    const categorySurface = getSurfaceColor(categoryColor);
                    const accountColor = accountColors[transaction.accountName || transaction.account] || '#6b7280';
                    const isSelected = selectedIdsSet.has(transaction.id);
                    const amountValue = Number(transaction.amount) || 0;
                    const amountClass = amountValue >= 0 ? 'is-income' : 'is-expense';
                    const formattedAmount = formatCurrency(amountValue, transaction.currency || 'IDR');
                    const dateLabel = formatTransactionDate(transaction.date, transaction.dateTime);
                    const isCleared = (transaction.paymentStatus || '').toLowerCase() === 'cleared';
                    const labelEntries: string[] = [];
                    const labelsValue = transaction.labels as unknown;
                    if (typeof labelsValue === 'string') {
                      labelsValue
                        .split(',')
                        .map((label) => label.trim())
                        .filter(Boolean)
                        .forEach((label) => labelEntries.push(label));
                    } else if (Array.isArray(labelsValue)) {
                      labelsValue
                        .filter(Boolean)
                        .forEach((label) => labelEntries.push(String(label)));
                    }
                    if (transaction.paymentStatus && transaction.paymentStatus.toLowerCase() !== 'cleared') {
                      labelEntries.push(transaction.paymentStatus);
                    }

                    return (
                      <div
                        key={transaction.id}
                        className={`transaction-row ${isSelected ? 'transaction-row--selected' : ''}`}
                      >
                        <Form.Check
                          type="checkbox"
                          id={`transaction-${transaction.id}`}
                          className="transaction-row__checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleTransactionSelect(transaction.id)}
                        />
                        <div
                          className="transaction-row__icon-wrapper"
                          style={{ backgroundColor: categorySurface, color: categoryColor }}
                        >
                          {renderIcon(CategoryIcon, { size: 18 })}
                          {isCleared && (
                            <span className="transaction-row__icon-status">
                              {renderIcon(FaCheck, { size: 10 })}
                            </span>
                          )}
                        </div>
                        <div className="transaction-row__content">
                          <div className="transaction-row__heading">
                            <span className="transaction-row__title">
                              {transaction.description || 'Untitled transaction'}
                            </span>
                            <div className="transaction-row__tags">
                              {labelEntries.map((label) => {
                                const tone = resolveTagTone(label);
                                return (
                                  <span
                                    key={`${transaction.id}-${tone}-${label}`}
                                    className={`transaction-row__tag transaction-row__tag--${tone}`}
                                  >
                                    {label}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div className="transaction-row__meta">
                            <span className="transaction-row__meta-item">{transaction.category}</span>
                            <span className="transaction-row__separator" />
                            <span className="transaction-row__meta-item transaction-row__meta-account">
                              <span
                                className="transaction-row__account-dot"
                                style={{ backgroundColor: accountColor }}
                                aria-hidden="true"
                              />
                              {transaction.accountName || transaction.account}
                            </span>
                            {transaction.payer && (
                              <>
                                <span className="transaction-row__separator" />
                                <span className="transaction-row__meta-item">{transaction.payer}</span>
                              </>
                            )}
                          </div>
                          {transaction.notes && transaction.notes.trim().length > 0 && (
                            <div className="transaction-row__notes">
                              {transaction.notes}
                            </div>
                          )}
                        </div>
                        <div className="transaction-row__amount">
                          <div className={`transaction-row__value ${amountClass}`}>
                            {formattedAmount}
                          </div>
                          <div className="transaction-row__date">{dateLabel}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <MobileFilterOffcanvas
        show={showFilterSidebar}
        onHide={toggleFilterSidebar}
        filterVisibility={filterVisibility}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        sortOption={sortOption}
        onSortOptionChange={setSortOption}
        selectedCategories={selectedCategories}
        onSelectedCategoriesChange={setSelectedCategories}
        categoryTree={categoryTree}
        parentCategoryColors={parentCategoryColors}
        categoryIcons={categoryIcons as DropdownIconMap}
        allCategories={allCategories}
        selectedAccounts={selectedAccounts}
        onSelectedAccountsChange={setSelectedAccounts}
        accountTree={accountTree}
        accountColors={accountColors}
        accountIcons={accountIcons as DropdownIconMap}
        selectableAccounts={selectableAccounts}
        minAmount={minAmount}
        maxAmount={maxAmount}
        onMinAmountChange={setMinAmount}
        onMaxAmountChange={setMaxAmount}
        SortDropdownComponent={SortDropdown}
      />

      <TransactionModal
        show={showTransactionModal}
        onHide={() => setShowTransactionModal(false)}
        transaction={currentTransaction}
        onChange={handleTransactionChange}
        onSave={handleSaveTransaction}
        quickTransactions={normalizedQuickTransactions}
        onTemplateSelect={handleTemplateSelect}
        onAddTemplate={() => setShowQuickTransactionModal(true)}
        availableCategories={allCategories}
        availableAccounts={selectableAccounts}
        categoryTree={categoryTree}
        parentCategoryColors={parentCategoryColors}
        categoryIcons={
          categoryIcons as Record<
            string,
            IconType | ComponentType<IconBaseProps> | null | undefined
          >
        }
        accountTree={accountTree}
        accountColors={accountColors}
        accountIcons={
          accountIcons as Record<
            string,
            IconType | ComponentType<IconBaseProps> | null | undefined
          >
        }
      />

      <QuickTransactionModal
        show={showQuickTransactionModal}
        onHide={() => setShowQuickTransactionModal(false)}
        quickTransaction={newQuickTransaction}
        onChange={(
          event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
        ) => {
          const { name, value } = event.target;
          setNewQuickTransaction((previous) => ({ ...previous, [name]: value }));
        }}
        onSubmit={handleAddNewQuickTransaction}
        availableCategories={allCategories}
        availableAccounts={selectableAccounts}
      />
    </Container >
  );
}

const Transactions = () => (
  <PeriodNavigationProvider initialDate={new Date()}>
    <TransactionsContent />
  </PeriodNavigationProvider>
);

export default Transactions;
