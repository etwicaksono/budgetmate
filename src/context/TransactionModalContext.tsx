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
import Swal from 'sweetalert2';
import {
  TransactionModal,
  type TransactionFormValues,
  type TransactionChangeEvent,
  type QuickTransactionOption,
  type TransactionModalSaveContext,
} from '../views/Transactions/TransactionModal';
import {
  QuickTransactionModal,
  type QuickTransactionFormValues,
} from '../views/Transactions/QuickTransactionModal';
import {
  useCategoryData,
  type CategoryTree,
  type CategoryColorMap,
  type CategoryIconName,
} from '../views/Transactions/useCategoryData';
import {
  useQuickTransactions,
  type QuickTransactionPresetInput,
  type UseQuickTransactionsResult,
  type CategoryReference,
} from '../views/Transactions/useQuickTransactions';
import {
  buildAccountMetadata,
  type AccountMetadata,
} from '../components/PeriodRangeSelector';
import {
  accountService,
  type ApiAccountResponse,
} from '../services/accountService';
import {
  transactionService,
  type CreateTransactionRequest,
} from '../services/transactionService';
import {
  categoryService,
  type ApiCategoryResponse,
} from '../services/categoryService';
import { formatDateForBackend } from '../utils/dateFormatter';
import { useAuth } from './AuthContext';

const ACCOUNT_METADATA_STORAGE_KEY = 'finance-app-account-metadata';

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
  accountIdToName: Record<string, string>;
  accountNameToId: Record<string, string>;
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

  const quickTransactionCategories = useMemo<CategoryReference[]>(
    () =>
      categories
        .filter(
          (category): category is typeof categories[number] & {
            id: string | number;
            name: string;
          } =>
            typeof category.id === 'string' &&
            category.id.length > 0 &&
            typeof category.name === 'string' &&
            category.name.length > 0
        )
        .map((category) => ({
          id: category.id as string | number,
          name: category.name as string,
        })),
    [categories]
  );

  const { quickTransactions, addQuickTransactionPreset }: UseQuickTransactionsResult =
    useQuickTransactions(quickTransactionCategories);
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [apiAccounts, setApiAccounts] = useState<ApiAccountResponse[]>([]);

  useEffect(() => {
    let isCancelled = false;

    const loadAccounts = async () => {
      // Only fetch accounts if user is authenticated and auth context has finished loading
      if (!isAuthenticated || authLoading) {
        return;
      }

      try {
        const accounts = await accountService.fetchAccounts();
        if (isCancelled) {
          return;
        }
        if (accounts.length > 0) {
          setApiAccounts(accounts);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch accounts for transaction modal:', error);
      }
    };

    void loadAccounts();

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, authLoading]);

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

  const categoryByName = useMemo(
    () =>
      categories.reduce<Record<string, typeof categories[number]>>(
        (accumulator, category) => {
          if (category.name) {
            accumulator[category.name] = category;
          }
          return accumulator;
        },
        {}
      ),
    [categories]
  );

  // Map of account ID to account name for display purposes
  const accountIdToName = useMemo<Record<string, string>>(
    () => apiAccounts
      .filter((account) => account.id && account.name && account.active !== false)
      .reduce((acc, account) => {
        acc[account.id as string] = account.name as string;
        return acc;
      }, {} as Record<string, string>),
    [apiAccounts]
  );

  // Map of account name to account ID for reverse lookup
  const accountNameToId = useMemo<Record<string, string>>(
    () => apiAccounts
      .filter((account) => account.id && account.name && account.active !== false)
      .reduce((acc, account) => {
        acc[account.name as string] = account.id as string;
        return acc;
      }, {} as Record<string, string>),
    [apiAccounts]
  );

  // List of selectable account IDs
  const selectableAccountIds = useMemo<string[]>(
    () => apiAccounts
      .filter((account) => account.id && account.name && account.active !== false)
      .map((account) => account.id as string),
    [apiAccounts]
  );

  // List of account names for backward compatibility with UI components
  const selectableAccounts = useMemo<string[]>(
    () => apiAccounts
      .filter((account) => account.name && account.active !== false)
      .map((account) => account.name as string),
    [apiAccounts]
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

  // Account tree using IDs as keys
  const accountTreeById = useMemo<CategoryTree>(
    () =>
      Object.fromEntries(
        selectableAccountIds.map((accountId) => [accountId, [] as string[]])
      ),
    [selectableAccountIds]
  );

  // Account tree using names as keys (for backward compatibility)
  const accountTree = useMemo<CategoryTree>(
    () =>
      Object.fromEntries(
        selectableAccounts.map((account) => [account, [] as string[]])
      ),
    [selectableAccounts]
  );

  // Account colors by ID
  const accountColorsById = useMemo<CategoryColorMap>(
    () => {
      const colorMap: Record<string, string> = {};
      selectableAccountIds.forEach((accountId) => {
        const apiAccount = apiAccounts.find((a) => a.id === accountId);
        const accountName = accountIdToName[accountId];
        const color = apiAccount?.color ?? accountMetadata[accountName]?.color ?? '#6c757d';
        colorMap[accountId] = color;
      });
      return colorMap;
    },
    [selectableAccountIds, apiAccounts, accountMetadata, accountIdToName]
  );

  // Account colors by name (for backward compatibility)
  const accountColors = useMemo<CategoryColorMap>(
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

  // Account icons by ID
  const accountIconsById = useMemo<Record<string, IconType | null>>(
    () => {
      const iconMap: Record<string, IconType | null> = {};
      selectableAccountIds.forEach((accountId) => {
        const apiAccount = apiAccounts.find((a) => a.id === accountId);
        const accountName = accountIdToName[accountId];
        const iconKey = apiAccount?.icon ?? accountMetadata[accountName]?.icon;
        const iconComponent =
          iconKey && iconKey in accountIconComponents
            ? accountIconComponents[iconKey as keyof typeof accountIconComponents]
            : null;
        iconMap[accountId] = iconComponent;
      });
      return iconMap;
    },
    [selectableAccountIds, apiAccounts, accountMetadata, accountIdToName]
  );

  // Account icons by name (for backward compatibility)
  const accountIcons = useMemo<Record<string, IconType | null>>(
    () => {
      const iconMap: Record<string, IconType | null> = {};
      selectableAccounts.forEach((accountName) => {
        const apiAccount = apiAccounts.find((a) => a.name === accountName);
        const iconKey = apiAccount?.icon ?? accountMetadata[accountName]?.icon;
        const iconComponent =
          iconKey && iconKey in accountIconComponents
            ? accountIconComponents[iconKey as keyof typeof accountIconComponents]
            : null;
        iconMap[accountName] = iconComponent;
      });
      return iconMap;
    },
    [selectableAccounts, apiAccounts, accountMetadata]
  );

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionFormValues>(() =>
    createTransactionTemplate()
  );
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [showTransactionModal, setShowTransactionModal] = useState<boolean>(false);
  const [showQuickTransactionModal, setShowQuickTransactionModal] = useState<boolean>(false);
  const [newQuickTransaction, setNewQuickTransaction] =
    useState<QuickTransactionFormValues>(() => createQuickTransactionTemplate());

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
        categories.find((category) => category.is_parent && category.name !== 'Income') ??
        categories.find((category) => category.is_parent) ??
        null;

      const fallbackParentId = fallbackParent?.id ?? null;
      const fallbackColor = fallbackParent?.color ?? '#6c757d';

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
            : 'FaGift';

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

      // Clear validation error for this field when it changes
      setValidationErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });

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

      // Convert account name to ID if needed
      const accountId = selected.account 
        ? (accountNameToId[selected.account] ?? selected.account)
        : '';

      setCurrentTransaction((previous) => ({
        ...previous,
        templateId: String(selected.id ?? ''),
        description: selected.description || '',
        amount: selected.amount ?? '',
        category: selected.category || previous.category,
        categoryId:
          selected.category_id && String(selected.category_id).length > 0
            ? String(selected.category_id)
            : categoryByName[selected.category ?? '']?.id || previous.categoryId,
        account: accountId || previous.account,
        accountName: selected.account || accountIdToName[accountId] || previous.accountName,
        type: selected.type || previous.type,
        currency: selected.currency || previous.currency,
      }));
    },
    [quickTransactionOptions, categoryByName, accountNameToId, accountIdToName]
  );

  const handleSaveTransaction = useCallback(
    async (
      createAnother = false,
      context?: TransactionModalSaveContext
    ) => {
      const isTransfer = currentTransaction.type === 'Transfer';
      const errors: Record<string, string> = {};

      // Validate required fields
      if (currentTransaction.amount === '' || !currentTransaction.amount) {
        errors.amount = 'Please enter an amount';
      }

      if (!currentTransaction.account) {
        errors.account = 'Please select an account';
      }

      if (isTransfer) {
        if (!currentTransaction.toAccount) {
          errors.toAccount = 'Please select a destination account';
        }
      } else {
        // For non-transfers, category is required
        if (!currentTransaction.category) {
          errors.category = 'Please select a category';
        }
      }

      // If there are validation errors, set them and return
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return;
      }

      // Clear validation errors if validation passes
      setValidationErrors({});

      const ensuredCategory = await ensureCategoryExists(currentTransaction.category);

      const parsedAmount = parseFloat(String(currentTransaction.amount));
      const transactionRecord: TransactionRecord = {
        ...currentTransaction,
        id: Date.now(),
        amount: Number.isNaN(parsedAmount) ? 0 : parsedAmount,
        // Ensure accountName is populated for display
        accountName: currentTransaction.accountName || accountIdToName[currentTransaction.account] || '',
        toAccountName: currentTransaction.toAccountName || (currentTransaction.toAccount ? accountIdToName[currentTransaction.toAccount] : undefined),
      };

      if (isTransfer) {
        const parsedToAmount = parseFloat(String(currentTransaction.toAmount));
        transactionRecord.toAmount = Number.isNaN(parsedToAmount)
          ? currentTransaction.toAmount
          : parsedToAmount;
      }

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

      // currentTransaction.account now contains account ID, not name
      const accountId = currentTransaction.account;

      // Basic validation - these shouldn't normally happen if dropdowns work correctly
      if (!categoryId && !isTransfer) {
        // eslint-disable-next-line no-console
        console.error('Category not found:', currentTransaction.category);
        setValidationErrors({ category: 'Invalid category selected' });
        return;
      }

      if (!accountId) {
        // eslint-disable-next-line no-console
        console.error('Account ID is missing');
        setValidationErrors({ account: 'Invalid account selected' });
        return;
      }

      // Retry logic for personal_id conflicts
      const maxRetries = 3;
      let attempt = 0;
      let lastError: any = null;
      let createdTransaction: any = null;

      // Use description if available, otherwise create a default one
      const description = currentTransaction.description ||
        `${currentTransaction.type} - ${currentTransaction.category || 'Transaction'}`;

      // Prepare the API payload with properly formatted date
      const formattedDate = formatDateForBackend(currentTransaction.dateTime || currentTransaction.date);
      
      let normalizedAmount = typeof transactionRecord.amount === 'number' 
        ? transactionRecord.amount 
        : parseFloat(String(transactionRecord.amount));

      // Apply sign based on transaction type
      // Expense: negative, Income: positive
      const originalAmount = normalizedAmount;
      if (currentTransaction.type === 'Expense') {
        normalizedAmount = -Math.abs(normalizedAmount);
      } else if (currentTransaction.type === 'Income') {
        normalizedAmount = Math.abs(normalizedAmount);
      }
      console.log(`💰 [Context] Amount sign adjustment:`, {
        type: currentTransaction.type,
        originalAmount,
        adjustedAmount: normalizedAmount
      });

      // Retry loop
      while (attempt < maxRetries && !createdTransaction) {
        try {
          const createPayload: CreateTransactionRequest = {
            date: formattedDate,
            account_id: accountId,
            category_id: String(categoryId),
            amount: normalizedAmount,
            type: currentTransaction.type,
            note: currentTransaction.notes || description,
          };

          // On retry attempts, explicitly increment personal_id in cache
          if (attempt > 0) {
            console.log(`🔄 [Context] Retry attempt ${attempt}/${maxRetries} with incremented personal_id`);
            const currentMax = parseInt(localStorage.getItem('max_transaction_personal_id') || '0', 10);
            const newMax = currentMax + attempt;
            localStorage.setItem('max_transaction_personal_id', String(newMax));
            console.log(`📝 [Context] Updated max_transaction_personal_id from ${currentMax} to ${newMax}`);
          }

          // Call the API to create the transaction
          createdTransaction = await transactionService.createTransaction(createPayload);
          console.log('✅ [Context] Transaction created successfully!');
          break; // Success! Exit the retry loop
        } catch (error: any) {
          lastError = error;
          attempt++;

          // Check if it's a personal_id conflict error
          const errorMessage = error?.message || error?.response?.data?.message || '';
          const isPersonalIdConflict = errorMessage.toLowerCase().includes('personal_id') && 
                                       errorMessage.toLowerCase().includes('already exists');

          console.error(`❌ [Context] Attempt ${attempt} failed:`, errorMessage);

          if (isPersonalIdConflict && attempt < maxRetries) {
            console.warn(`⚠️ [Context] personal_id conflict detected, will retry (attempt ${attempt}/${maxRetries})...`);
            // Small delay before retry
            await new Promise(resolve => setTimeout(resolve, 200));
          } else {
            // Not a personal_id error or max retries reached
            console.error('❌ [Context] Not retrying - either not a personal_id conflict or max retries reached');
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

        console.error('❌ [Context] Failed to create transaction after all retries:', lastError);
        return; // Exit the function
      }

      // Success! Continue with the rest of the logic
      try {
        // Update local state with the created transaction
        setTransactions((previous) => [transactionRecord, ...previous]);

        if (currentTransaction.createTemplate) {
          const presetInput: QuickTransactionPresetInput = {
            description: currentTransaction.description,
            category: currentTransaction.category,
            category_id: categoryId ?? normalizedCategoryId ?? null,
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
            accountName: currentTransaction.accountName,
            category: currentTransaction.category,
            categoryId: currentTransaction.categoryId || context?.categoryId || '',
          };

          if (isTransfer) {
            nextDefaults.toAccount = currentTransaction.toAccount ?? '';
            nextDefaults.toAccountName = currentTransaction.toAccountName ?? '';
            nextDefaults.toCurrency =
              currentTransaction.toCurrency || currentTransaction.currency;
          }

          setCurrentTransaction(createTransactionTemplate(nextDefaults));
          return;
        }

        setShowTransactionModal(false);
        setCurrentTransaction(createTransactionTemplate());
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[Context] Error updating state after transaction creation:', error);
        // Transaction was created successfully, but state update failed
        await Swal.fire({
          icon: 'warning',
          title: 'Transaction Created',
          text: 'Transaction was created but there was an issue updating the display. Please refresh the page.',
          confirmButtonText: 'OK',
          confirmButtonColor: '#00a86b'
        });
      }
    },
    [addQuickTransactionPreset, currentTransaction, ensureCategoryExists, categories, apiAccounts, accountIdToName]
  );

  const handleAddNewQuickTransaction = useCallback(() => {
    if (!newQuickTransaction.description || !newQuickTransaction.category) {
      return;
    }

    void ensureCategoryExists(newQuickTransaction.category);
    addQuickTransactionPreset(newQuickTransaction);
    setNewQuickTransaction(createQuickTransactionTemplate());
    setShowQuickTransactionModal(false);
  }, [addQuickTransactionPreset, ensureCategoryExists, newQuickTransaction]);

  const openTransactionModal = useCallback(
    (overrides?: Partial<TransactionFormValues>) => {
      if (overrides && Object.keys(overrides).length > 0) {
        // If account is provided without accountName, populate it
        const enrichedOverrides = { ...overrides };
        if (enrichedOverrides.account && !enrichedOverrides.accountName) {
          enrichedOverrides.accountName = accountIdToName[enrichedOverrides.account] || '';
        }
        if (enrichedOverrides.toAccount && !enrichedOverrides.toAccountName) {
          enrichedOverrides.toAccountName = accountIdToName[enrichedOverrides.toAccount] || '';
        }
        setCurrentTransaction((previous) =>
          createTransactionTemplate({ ...previous, ...enrichedOverrides })
        );
      }
      setShowTransactionModal(true);
    },
    [accountIdToName]
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
    setValidationErrors({});
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
      accountIdToName,
      accountNameToId,
    }),
    [
      closeTransactionModal,
      openQuickTransactionModal,
      openTransactionModal,
      setTransactionDefaults,
      transactions,
      accountIdToName,
      accountNameToId,
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
        validationErrors={validationErrors}
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

