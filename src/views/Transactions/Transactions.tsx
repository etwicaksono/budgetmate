/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useRef, useState, createElement } from 'react';
import type { ChangeEvent, ComponentType } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Modal,
} from 'react-bootstrap';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import { FaFilter, FaPlus } from 'react-icons/fa';
import type { IconType, IconBaseProps } from 'react-icons';
import { type CategoryIconName } from './useCategoryData';
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
  type ApiTransactionResponse,
} from '../../services/transactionService';
import { formatDateForBackend } from '../../utils/dateFormatter';
import AmountRangeFilter from '../../components/AmountRangeFilter';
import { MobileFilterOffcanvas, type FilterVisibility } from './components/MobileFilterOffcanvas';
import {
  DesktopFilterSidebar,
  SortDropdown,
  renderIcon,
  type SortValue,
  type DropdownIconMap,
} from './components/DesktopFilterSidebar';
import { useFilterData } from './hooks/useFilterData';
import { RecordsHeader, RecordsList } from '../../components/Records';
import type {
  GroupedTransactions,
  TransactionRecord as RecordsTransaction,
} from '../../types/transaction';

type TransactionType = 'Expense' | 'Income' | 'Transfer' | string;

type TransactionRecord = TransactionFormValues & { id: number };

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
const DEFAULT_MIN_AMOUNT = 0;
const DEFAULT_MAX_AMOUNT = 20000000;

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
    addCategory,
  } = useFilterData();
  
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

  const [apiTransactions, setApiTransactions] = useState<ApiTransactionResponse[]>([]);
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
  const lastFetchSignatureRef = useRef<string | null>(null);
  const inflightFetchSignatureRef = useRef<string | null>(null);

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

  const mapApiTransactions = useCallback(
    (apiTransactions: ApiTransactionResponse[]): TransactionRecord[] => {
      const mappedTransactions: TransactionRecord[] = apiTransactions.map((apiTxn, index) => {
        const category = categories.find((cat) => cat.id === apiTxn.category_id);
        const account = apiAccounts.find((acc) => acc.id === apiTxn.account_id);

        let numericId = index;
        if (apiTxn.id) {
          const extracted = parseInt(apiTxn.id.replace(/\D/g, ''), 10);
          numericId = Number.isNaN(extracted) ? index : extracted;
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

      return mappedTransactions.filter(
        (txn) => typeof txn.id === 'number' && !Number.isNaN(txn.id)
      );
    },
    [apiAccounts, categories]
  );

  const transactions = useMemo(
    () => mapApiTransactions(apiTransactions),
    [apiTransactions, mapApiTransactions]
  );

  const fetchTransactionsFromServer = useCallback(
    async (options: { force?: boolean } = {}): Promise<boolean> => {
      const { force = false } = options;
      const trimmedSearch = searchTerm.trim();
      const minAmountParam =
        typeof minAmount === 'number' ? minAmount : DEFAULT_MIN_AMOUNT;
      const maxAmountParam =
        maxAmount !== DEFAULT_MAX_AMOUNT ? maxAmount : undefined;
      const signaturePayload = {
        startDate: dateRange.start || null,
        endDate: dateRange.end || null,
        accounts: [...selectedAccounts].sort(),
        categories: [...selectedCategories].sort(),
        minAmount: minAmountParam,
        maxAmount: maxAmountParam ?? null,
        search: trimmedSearch || null,
        sort: sortOption,
      };
      const signature = JSON.stringify(signaturePayload);

      if (!force) {
        if (signature === inflightFetchSignatureRef.current) {
          return false;
        }
        if (signature === lastFetchSignatureRef.current) {
          return true;
        }
      }

      inflightFetchSignatureRef.current = signature;
      setLoadingTransactions(true);
      try {
        const apiTransactions = await transactionService.fetchTransactions({
          startDate: dateRange.start || undefined,
          endDate: dateRange.end || undefined,
          accountNames: selectedAccounts.length > 0 ? selectedAccounts : undefined,
          categoryNames: selectedCategories.length > 0 ? selectedCategories : undefined,
          minAmount: minAmountParam,
          maxAmount: maxAmountParam,
          search: trimmedSearch || undefined,
          sort: sortOption,
        });

        setApiTransactions(apiTransactions);
        lastFetchSignatureRef.current = signature;
        return true;
      } catch (error) {
        console.error('? Failed to fetch transactions:', error);
        return false;
      } finally {
        inflightFetchSignatureRef.current = null;
        setLoadingTransactions(false);
      }
    },
    [
      dateRange.end,
      dateRange.start,
      maxAmount,
      minAmount,
      searchTerm,
      selectedAccounts,
      selectedCategories,
      sortOption,
    ]
  );

  useEffect(() => {
    void fetchTransactionsFromServer();
  }, [fetchTransactionsFromServer]);

  const filteredTransactions = transactions;

  const groupedTransactionRecords = useMemo<GroupedTransactions>(() => {
    const grouped: GroupedTransactions = {};

    filteredTransactions.forEach((transaction) => {
      const sourceDate = transaction.dateTime || transaction.date || '';
      const dateObj = sourceDate ? new Date(sourceDate) : null;
      const isValidDate = dateObj && !Number.isNaN(dateObj.getTime());
      const dateKey = isValidDate
        ? dateObj.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Unknown date';
      const timeLabel = isValidDate
        ? dateObj.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : '';

      const categoryMeta = transaction.category
        ? categoryByName[transaction.category]
        : undefined;
      const categoryIconName = categoryMeta?.icon ?? DEFAULT_CATEGORY_ICON;
      const categoryColor = categoryMeta?.color ?? DEFAULT_CATEGORY_COLOR;
      const rawAmount = Number(transaction.amount ?? 0);
      const normalizedType =
        String(transaction.type ?? '').toLowerCase() === 'income'
          ? 'INCOME'
          : 'EXPENSE';

      const record: RecordsTransaction = {
        id: String(transaction.id),
        date: dateKey,
        time: timeLabel,
        categoryName: transaction.category || 'Uncategorized',
        categoryIcon: categoryIconName,
        categoryIconColor: categoryColor,
        accountName:
          transaction.accountName ||
          (typeof transaction.account === 'string'
            ? transaction.account
            : String(transaction.account ?? 'Account')),
        description: transaction.description || '',
        payer:
          typeof transaction.payer === 'string' ? transaction.payer : '',
        amount: Number.isNaN(rawAmount) ? 0 : Math.abs(rawAmount),
        type: normalizedType === 'INCOME' ? 'INCOME' : 'EXPENSE',
      };

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(record);
    });

    return grouped;
  }, [categoryByName, filteredTransactions]);
  useEffect(() => {
    setSelectedTransactionIds((previous) =>
      previous.filter((id) =>
        filteredTransactions.some((transaction) => transaction.id === id)
      )
    );
  }, [filteredTransactions]);
  const selectedIdsSet = useMemo(() => new Set(selectedTransactionIds), [selectedTransactionIds]);
  const selectedRecordIds = useMemo(
    () => new Set(selectedTransactionIds.map((id) => String(id))),
    [selectedTransactionIds]
  );
  const selectedCount = selectedTransactionIds.length;
  const allSelected =
    filteredTransactions.length > 0 &&
    filteredTransactions.every((transaction) => selectedIdsSet.has(transaction.id));
  const hasSelection = selectedCount > 0;
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
  const formatRecordCurrency = useCallback(
    (value: number): string => formatCurrency(value),
    [formatCurrency]
  );

  const handleToggleTransactionSelect = useCallback((transactionId: number): void => {
    setSelectedTransactionIds((previous) => {
      if (previous.includes(transactionId)) {
        return previous.filter((id) => id !== transactionId);
      }
      return [...previous, transactionId];
    });
  }, []);

  const handleRecordsSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedTransactionIds([]);
      return;
    }
    setSelectedTransactionIds(filteredTransactions.map((transaction) => transaction.id));
  }, [allSelected, filteredTransactions]);

  const handleClearSelection = useCallback(() => {
    setSelectedTransactionIds([]);
  }, []);

  const handleRecordSelection = useCallback(
    (recordId: string) => {
      const numericId = Number(recordId);
      if (Number.isNaN(numericId)) {
        return;
      }
      handleToggleTransactionSelect(numericId);
    },
    [handleToggleTransactionSelect]
  );

  const handleRecordEdit = useCallback(
    (record: RecordsTransaction) => {
      const sourceTransaction = filteredTransactions.find(
        (transaction) => String(transaction.id) === record.id
      );
      if (!sourceTransaction) {
        return;
      }
      setCurrentTransaction(createTransactionTemplate(sourceTransaction));
      setShowTransactionModal(true);
    },
    [filteredTransactions, setCurrentTransaction, setShowTransactionModal]
  );

  const handleBulkAction = useCallback(
    (action: 'edit' | 'export' | 'delete') => {
      if (!hasSelection) {
        return;
      }
      void Swal.fire({
        icon: 'info',
        title: 'Bulk action coming soon',
        text: `Bulk ${action} for ${selectedCount} transaction${
          selectedCount === 1 ? '' : 's'
        } will be available in a future update.`,
        confirmButtonColor: '#00a86b',
      });
    },
    [hasSelection, selectedCount]
  );

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
      await Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter a description',
        confirmButtonText: 'OK',
        confirmButtonColor: '#00a86b'
      });
      return;
    }

    if (isTransfer) {
      if (!currentTransaction.account || !currentTransaction.toAccount || currentTransaction.amount === '') {
        await Swal.fire({
          icon: 'warning',
          title: 'Missing Information',
          text: 'Please fill in all required fields for transfer: From Account, To Account, and Amount',
          confirmButtonText: 'OK',
          confirmButtonColor: '#00a86b'
        });
        return;
      }
    } else if (currentTransaction.amount === '') {
      await Swal.fire({
        icon: 'warning',
        title: 'Missing Information',
        text: 'Please enter an amount',
        confirmButtonText: 'OK',
        confirmButtonColor: '#00a86b'
      });
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
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Category',
        text: 'Please select a valid category',
        confirmButtonText: 'OK',
        confirmButtonColor: '#00a86b'
      });
      return;
    }

    if (!accountId) {
      // eslint-disable-next-line no-console
      console.error('Account not found:', currentTransaction.account);
      await Swal.fire({
        icon: 'warning',
        title: 'Invalid Account',
        text: 'Please select a valid account',
        confirmButtonText: 'OK',
        confirmButtonColor: '#00a86b'
      });
      return;
    }

    // Retry logic for personal_id conflicts
    const maxRetries = 3;
    let attempt = 0;
    let lastError: any = null;
    let createdTransaction: any = null;

    // Prepare the base API payload
    let normalizedAmount =
      typeof transactionRecord.amount === 'number'
        ? transactionRecord.amount
        : Number(transactionRecord.amount);

    // Apply sign based on transaction type
    // Expense: negative, Income: positive
    const originalAmount = normalizedAmount;
    if (currentTransaction.type === 'Expense') {
      normalizedAmount = -Math.abs(normalizedAmount);
    } else if (currentTransaction.type === 'Income') {
      normalizedAmount = Math.abs(normalizedAmount);
    }
    console.log(`💰 Amount sign adjustment:`, {
      type: currentTransaction.type,
      originalAmount,
      adjustedAmount: normalizedAmount
    });

    // Format the date properly for Go backend (RFC3339 with seconds and timezone)
    const formattedDate = formatDateForBackend(currentTransaction.dateTime || currentTransaction.date);

    // Retry loop
    while (attempt < maxRetries && !createdTransaction) {
      try {
        const createPayload: CreateTransactionRequest = {
          date: formattedDate,
          account_id: accountId,
          category_id: String(categoryId),
          amount: Number.isNaN(normalizedAmount) ? 0 : normalizedAmount,
          type: currentTransaction.type,
          note: currentTransaction.notes || null,
        };

        // On retry attempts, explicitly increment personal_id in cache
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt}/${maxRetries} with incremented personal_id`);
          // Force increment the cached personal_id before retry
          const currentMax = parseInt(localStorage.getItem('max_transaction_personal_id') || '0', 10);
          const newMax = currentMax + attempt; // Add attempt number to ensure increment
          localStorage.setItem('max_transaction_personal_id', String(newMax));
          console.log(`📝 Updated max_transaction_personal_id from ${currentMax} to ${newMax}`);
        }

        // Call the API to create the transaction
        createdTransaction = await transactionService.createTransaction(createPayload);
        console.log('✅ Transaction created successfully!');
        break; // Success! Exit the retry loop
      } catch (error: any) {
        lastError = error;
        attempt++;

        // Check if it's a personal_id conflict error
        const errorMessage = error?.message || error?.response?.data?.message || '';
        const isPersonalIdConflict = errorMessage.toLowerCase().includes('personal_id') && 
                                     errorMessage.toLowerCase().includes('already exists');

        console.error(`❌ Attempt ${attempt} failed:`, errorMessage);

        if (isPersonalIdConflict && attempt < maxRetries) {
          console.warn(`⚠️ personal_id conflict detected, will retry (attempt ${attempt}/${maxRetries})...`);
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          // Not a personal_id error or max retries reached
          console.error('❌ Not retrying - either not a personal_id conflict or max retries reached');
          break;
        }
      }
    }

    // If all retries failed, show appropriate error message
    if (!createdTransaction) {
      const errorMessage = lastError?.message || lastError?.response?.data?.message || 'Unknown error occurred';
      const isPersonalIdConflict = errorMessage.toLowerCase().includes('personal_id') && 
                                   errorMessage.toLowerCase().includes('already exists');

      if (isPersonalIdConflict) {
        await Swal.fire({
          icon: 'error',
          title: 'Transaction Creation Failed',
          html: `<p>Failed to create transaction after ${maxRetries} attempts due to ID conflicts.</p>
                 <p class="text-muted small">This might be caused by concurrent transactions or cache synchronization issues.</p>`,
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc3545',
          footer: '<p class="text-muted small">Please try again or refresh the page.</p>'
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Transaction Creation Failed',
          text: errorMessage,
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc3545'
        });
      }

      console.error('❌ Failed to create transaction after all retries:', lastError);
      return; // Exit the function
    }

    // Success! Continue with the rest of the logic
    try {

      const refreshed = await fetchTransactionsFromServer({ force: true });
      if (!refreshed) {
        console.error('Failed to refresh transactions after save; falling back to local state.');
        setApiTransactions((previous) => [
          {
            id: String(transactionRecord.id),
            date: transactionRecord.dateTime || transactionRecord.date,
            account_id: accountId,
            category_id: categoryId ? String(categoryId) : undefined,
            amount: Number(transactionRecord.amount ?? 0),
            type: transactionRecord.type,
            note: transactionRecord.notes || transactionRecord.description,
          },
          ...previous,
        ]);
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
      console.error('Error refreshing transactions after creation:', error);
      // Transaction was created successfully, but refresh failed
      // This is non-critical, so we can still close the modal
      await Swal.fire({
        icon: 'info',
        title: 'Transaction Created',
        text: 'Transaction created successfully, but failed to refresh the list. Please refresh the page.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#00a86b'
      });
      setShowTransactionModal(false);
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
              <RecordsHeader
                selectedCount={selectedCount}
                totalCount={filteredTransactions.length}
                allSelected={allSelected}
                onSelectAll={handleRecordsSelectAll}
                onClearSelection={handleClearSelection}
                onBulkEdit={hasSelection ? () => handleBulkAction('edit') : undefined}
                onBulkExport={hasSelection ? () => handleBulkAction('export') : undefined}
                onBulkDelete={hasSelection ? () => handleBulkAction('delete') : undefined}
                summaryText={`Net total ${formatCurrency(totalAmount)}`}
              />
              <RecordsList
                groupedTransactions={groupedTransactionRecords}
                selectedRecords={selectedRecordIds}
                accountName="All accounts"
                onSelectRecord={handleRecordSelection}
                onEditRecord={handleRecordEdit}
                formatCurrency={formatRecordCurrency}
                showCheckboxes
                showDropdownMenu={false}
                showPayer
                showType
              />
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
