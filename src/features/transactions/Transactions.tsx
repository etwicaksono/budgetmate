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
  Offcanvas,
  InputGroup,
  Dropdown,
  Modal,
} from 'react-bootstrap';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
  FaFilter,
  FaUniversity,
  FaPiggyBank,
  FaCreditCard,
  FaMoneyBillWave,
  FaSearch,
  FaTimes,
  FaTags,
  FaWallet,
  FaPlus,
  FaCheck,
  FaSortAmountUp,
  FaSortAmountDown,
  FaSortAmountUpAlt,
  FaSortAmountDownAlt,
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
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { formatDateForBackend } from '../../utils/dateFormatter';

type TransactionType = 'Expense' | 'Income' | 'Transfer' | string;

type SortValue =
  | 'timeAsc'
  | 'timeDesc'
  | 'amountAsc'
  | 'amountDesc'
  | 'absAmountAsc'
  | 'absAmountDesc';

interface SortOption {
  value: SortValue;
  icon: IconRenderable;
  title: string;
  ariaLabel: string;
}

interface SortDropdownProps {
  id: string;
  value: SortValue;
  onChange?: (value: SortValue) => void;
}

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

type IconRenderable = IconType | ComponentType<IconBaseProps>;

type DropdownIconMap = Record<
  string,
  IconType | ComponentType<{ className?: string; size?: number }> | undefined
>;

const renderIcon = (
  IconComponent: IconRenderable | null | undefined,
  props: IconBaseProps = {}
): React.ReactNode => {
  if (!IconComponent) {
    return null;
  }
  return createElement(IconComponent as ComponentType<IconBaseProps>, props);
};

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

const SORT_OPTIONS: SortOption[] = [
  {
    value: 'timeAsc',
    icon: FaSortAmountUp,
    title: 'Time ASC',
    ariaLabel: 'Time ascending (oldest first)',
  },
  {
    value: 'timeDesc',
    icon: FaSortAmountDown,
    title: 'Time DESC',
    ariaLabel: 'Time descending (newest first)',
  },
  {
    value: 'amountAsc',
    icon: FaSortAmountUp,
    title: 'Amount ASC',
    ariaLabel: 'Amount ascending (lowest first)',
  },
  {
    value: 'amountDesc',
    icon: FaSortAmountDown,
    title: 'Amount DESC',
    ariaLabel: 'Amount descending (highest first)',
  },
  {
    value: 'absAmountAsc',
    icon: FaSortAmountUpAlt,
    title: 'Absolute amount ASC',
    ariaLabel: 'Absolute amount ascending (lowest first)',
  },
  {
    value: 'absAmountDesc',
    icon: FaSortAmountDownAlt,
    title: 'Absolute amount DESC',
    ariaLabel: 'Absolute amount descending (highest first)',
  },
];

function SortDropdown({ id, value, onChange }: SortDropdownProps): JSX.Element {
  const [show, setShow] = useState(false);
  const selectedOption = useMemo<SortOption>(
    () => SORT_OPTIONS.find((option) => option.value === value) || SORT_OPTIONS[0],
    [value]
  );
  const handleSelect = (nextValue: SortValue) => {
    onChange?.(nextValue);
    setShow(false);
  };
  const renderOptionContent = (option?: SortOption) =>
    option ? (
      <span className="d-inline-flex align-items-center gap-1" title={option.ariaLabel}>
        {renderIcon(option.icon, { title: option.ariaLabel })}
        <span>{option.title}</span>
      </span>
    ) : (
      <span>Select sort order</span>
    );
  return (
    <Dropdown
      show={show}
      onToggle={(nextShow) => setShow(Boolean(nextShow))}
      className="w-100"
    >
      <Dropdown.Toggle
        id={id}
        variant="outline-secondary"
        className="sort-dropdown-toggle d-flex align-items-center justify-content-between w-100 gap-2"
        aria-label={selectedOption?.ariaLabel}
        title={selectedOption?.ariaLabel}
      >
        <span className="d-flex align-items-center gap-2">
          <span className="text-truncate">
            {renderOptionContent(selectedOption)}
          </span>
        </span>
      </Dropdown.Toggle>
      <Dropdown.Menu className="sort-dropdown-menu w-100 p-1">
        {SORT_OPTIONS.map((option) => {
          const isSelected = option.value === value;
          const itemClasses = [
            'sort-dropdown-item',
            'd-flex',
            'align-items-center',
            'gap-2',
            'w-100',
            'bg-white',
          ];
          if (isSelected) itemClasses.push('selected');
          return (
            <Dropdown.Item
              key={option.value}
              as="button"
              type="button"
              onClick={() => handleSelect(option.value)}
              className={itemClasses.join(' ')}
              aria-label={option.ariaLabel}
              title={option.ariaLabel}
            >
              {isSelected && (
                <span
                  className="d-inline-flex justify-content-center"
                  style={{ width: '1.25rem' }}
                >
                  {renderIcon(FaCheck, { className: 'text-success' })}
                </span>
              )}
              <span className="flex-grow-1 text-start">{renderOptionContent(option)}</span>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}


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
  const {
    categories,
    categoryTree,
    parentCategoryColors,
    categoryIcons,
    allCategories,
    addCategory,
    setCategories,
  } = useCategoryData();
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

  useEffect(() => {
    let isCancelled = false;

    const loadCategories = async () => {
      try {
        const apiCategories = await categoryService.fetchCategories();
        if (isCancelled) {
          return;
        }
        const validCategories = apiCategories.filter(isValidApiCategory);
        if (validCategories.length > 0) {
          setCategories(validCategories.map(normalizeApiCategory));
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch categories for transactions:', error);
      }
    };

    if (categories.length === 0) {
      void loadCategories();
    }

    return () => {
      isCancelled = true;
    };
  }, [categories.length, setCategories]);

  useEffect(() => {
    let isCancelled = false;

    const loadAccounts = async () => {
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
        console.error('Failed to fetch accounts for transactions:', error);
      }
    };

    void loadAccounts();

    return () => {
      isCancelled = true;
    };
  }, []);

  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [apiAccounts, setApiAccounts] = useState<ApiAccountResponse[]>([]);
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

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortValue>('amountAsc');
  const [minAmount, setMinAmount] = useState<number>(0);
  const [maxAmount, setMaxAmount] = useState<number>(20000000);
  const [filterVisibility, setFilterVisibility] = useState<Record<string, boolean>>({
    search: true,
    sortBy: true,
    accounts: true,
    categories: true,
    amountRange: true,
  });
  const [showFilterVisibilityPanel, setShowFilterVisibilityPanel] = useState<boolean>(false);
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
    return buildAccountMetadata(storedMetadata) as AccountMetadata;
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        ACCOUNT_METADATA_STORAGE_KEY,
        JSON.stringify(accountMetadata)
      );
    }
  }, [accountMetadata]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(FILTER_VISIBILITY_STORAGE_KEY);
        if (stored) {
          setFilterVisibility(JSON.parse(stored) as Record<string, boolean>);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to read filter visibility from storage', error);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        FILTER_VISIBILITY_STORAGE_KEY,
        JSON.stringify(filterVisibility)
      );
    }
  }, [filterVisibility]);

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

  const filteredTransactions = useMemo(() => {
    const filtered = transactions.filter((transaction) => {
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        transaction.description.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(transaction.category);

      const matchesAccount = selectedAccounts.length === 0 || selectedAccounts.includes(transaction.account);

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
    // eslint-disable-next-line no-console
    console.log('handleSaveTransaction called with:', {
      createAnother,
      currentTransaction,
      context,
    });

    const isTransfer = currentTransaction.type === 'Transfer';
    if (!currentTransaction.description) {
      // eslint-disable-next-line no-console
      console.log('No description provided');
      alert('Please enter a description');
      return;
    }

    if (isTransfer) {
      if (!currentTransaction.account || !currentTransaction.toAccount || currentTransaction.amount === '') {
        // eslint-disable-next-line no-console
        console.log('Transfer validation failed:', {
          account: currentTransaction.account,
          toAccount: currentTransaction.toAccount,
          amount: currentTransaction.amount
        });
        alert('Please fill in all required fields for transfer: From Account, To Account, and Amount');
        return;
      }
    } else if (currentTransaction.amount === '') {
      // eslint-disable-next-line no-console
      console.log('Amount validation failed');
      alert('Please enter an amount');
      return;
    }

    const ensuredCategory = await ensureCategoryExists(currentTransaction.category);

    const parsedAmount = Number.parseFloat(String(currentTransaction.amount ?? 0));
    const transactionRecord: TransactionRecord = {
      ...currentTransaction,
      id: transactions.length + 1,
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

      // eslint-disable-next-line no-console
      console.log('Transaction created successfully:', createdTransaction);

      // Update local state with the created transaction
      setTransactions((previous) => [transactionRecord, ...previous]);
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
    <Container className="transactions-page">
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
          <Card>
            <Card.Header className="d-flex align-items-center justify-content-between">
              <span className="h3 mb-0">Transactions</span>
              <div className="d-flex gap-2">
                <Button
                  type="button"
                  variant="light"
                  className="transactions-filter-visibility-btn"
                  onClick={() => setShowFilterVisibilityPanel(true)}
                  aria-label="Configure filters"
                  title="Configure filters"
                >
                  {renderIcon(FaFilter, { size: 18 })}
                </Button>
                <Button
                  type="button"
                  variant="light"
                  className="transactions-add-record-btn"
                  onClick={() => setShowTransactionModal(true)}
                  aria-label="Add transaction"
                >
                  {renderIcon(FaPlus, { size: 18 })}
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              <Form>
                {filterVisibility.search && (
                  <Form.Group className="mb-3" controlId="searchTerm">
                    <Form.Label>Search</Form.Label>
                    <InputGroup>
                      <InputGroup.Text className="search-input-icon">
                        {renderIcon(FaSearch, { size: 14 })}
                      </InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Search transactions"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        autoComplete="off"
                      />
                      {searchTerm && (
                        <Button
                          variant="light"
                          className="clear-search-btn"
                          onClick={() => setSearchTerm('')}
                        >
                          {renderIcon(FaTimes)}
                        </Button>
                      )}
                    </InputGroup>
                  </Form.Group>
                )}

                {filterVisibility.sortBy && (
                  <Form.Group className="mb-3" controlId="sortOption">
                    <Form.Label>Sort by</Form.Label>
                    <SortDropdown
                      id="sortOption"
                      value={sortOption}
                      onChange={setSortOption}
                    />
                  </Form.Group>
                )}

                {filterVisibility.categories && (
                  <Form.Group className="mb-3" controlId="categoryFilter">
                    <Form.Label>Category</Form.Label>
                    <CategoryDropdown
                      selectedCategories={selectedCategories}
                      setSelectedCategories={setSelectedCategories}
                      categoryTree={categoryTree}
                      parentCategoryColors={parentCategoryColors}
                      categoryIcons={categoryIcons as DropdownIconMap}
                      allCategories={allCategories}
                      leadingIcon={FaTags}
                    />
                  </Form.Group>
                )}

                {filterVisibility.accounts && (
                  <Form.Group className="mb-3" controlId="accountFilter">
                    <Form.Label>Account</Form.Label>
                    <CategoryDropdown
                      selectedCategories={selectedAccounts}
                      setSelectedCategories={setSelectedAccounts}
                      categoryTree={accountTree}
                      parentCategoryColors={accountColors}
                      categoryIcons={accountIcons as DropdownIconMap}
                      allCategories={selectableAccounts}
                      entityLabelSingular="account"
                      entityLabelPlural="accounts"
                      searchPlaceholder="Search account"
                      clearSelectedLabel="Clear accounts"
                      leadingIcon={FaWallet}
                    />
                  </Form.Group>
                )}

                {filterVisibility.amountRange && (
                  <Form.Group className="mb-3" controlId="amountFilter">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Form.Label className="mb-0">Amount range</Form.Label>
                    <small className="text-muted">IDR</small>
                  </div>
                  <small className="text-muted d-block mb-2">Absolute amount in referential currency</small>
                  <div className="mb-3" style={{ padding: '16px 0' }}>
                    <Slider
                      range
                      min={0}
                      max={20000000}
                      step={100000}
                      value={[minAmount, maxAmount]}
                      onChange={(values) => {
                        if (Array.isArray(values)) {
                          setMinAmount(values[0]);
                          setMaxAmount(values[1]);
                        }
                      }}
                      styles={{
                        track: {
                          backgroundColor: '#0d6efd',
                        },
                        rail: {
                          backgroundColor: '#dee2e6',
                        },
                        handle: {
                          backgroundColor: '#0d6efd',
                          borderColor: '#0d6efd',
                          boxShadow: '0 0 0 3px rgba(13, 110, 253, 0.25)',
                        },
                      }}
                    />
                  </div>
                  <div className="d-flex gap-2">
                    <div className="flex-grow-1">
                      <Form.Control
                        type="number"
                        placeholder="Min"
                        value={minAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || value === '-') {
                            setMinAmount(0);
                          } else {
                            setMinAmount(Math.max(0, Number(value)));
                          }
                        }}
                        min="0"
                        step="100000"
                      />
                      <small className="text-muted d-block mt-1">IDR {minAmount.toLocaleString('en-US')}</small>
                    </div>
                    <div className="flex-grow-1">
                      <Form.Control
                        type="number"
                        placeholder="Max"
                        value={maxAmount}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === '' || value === '-') {
                            setMaxAmount(20000000);
                          } else {
                            setMaxAmount(Math.max(0, Number(value)));
                          }
                        }}
                        min="0"
                        step="100000"
                      />
                      <small className="text-muted d-block mt-1">IDR {maxAmount.toLocaleString('en-US')}</small>
                    </div>
                  </div>
                  </Form.Group>
                )}

              </Form>
            </Card.Body>
          </Card>

          <Modal show={showFilterVisibilityPanel} onHide={() => setShowFilterVisibilityPanel(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Show / Hide Filters</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="d-flex flex-column gap-3">
                <Form.Check
                  type="checkbox"
                  id="modal-filter-search"
                  label="Search"
                  checked={filterVisibility.search}
                  onChange={(e) =>
                    setFilterVisibility((prev) => ({ ...prev, search: e.target.checked }))
                  }
                />
                <Form.Check
                  type="checkbox"
                  id="modal-filter-sortby"
                  label="Sort by"
                  checked={filterVisibility.sortBy}
                  onChange={(e) =>
                    setFilterVisibility((prev) => ({ ...prev, sortBy: e.target.checked }))
                  }
                />
                <Form.Check
                  type="checkbox"
                  id="modal-filter-accounts"
                  label="Accounts"
                  checked={filterVisibility.accounts}
                  onChange={(e) =>
                    setFilterVisibility((prev) => ({ ...prev, accounts: e.target.checked }))
                  }
                />
                <Form.Check
                  type="checkbox"
                  id="modal-filter-categories"
                  label="Categories"
                  checked={filterVisibility.categories}
                  onChange={(e) =>
                    setFilterVisibility((prev) => ({ ...prev, categories: e.target.checked }))
                  }
                />
                <Form.Check
                  type="checkbox"
                  id="modal-filter-amountrange"
                  label="Amount range"
                  checked={filterVisibility.amountRange}
                  onChange={(e) =>
                    setFilterVisibility((prev) => ({ ...prev, amountRange: e.target.checked }))
                  }
                />
              </div>
            </Modal.Body>
          </Modal>
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
                    const accountColor = accountColors[transaction.account] || '#6b7280';
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
                              {transaction.account}
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

      <Offcanvas show={showFilterSidebar} onHide={toggleFilterSidebar} placement="end" className="d-lg-none">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Filter Transactions</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Form>
            {filterVisibility.search && (
              <Form.Group className="mb-3" controlId="searchTermMobile">
                <Form.Label>Search</Form.Label>
                <InputGroup>
                  <InputGroup.Text className="search-input-icon">
                    {renderIcon(FaSearch, { size: 14 })}
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Search transactions"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    autoComplete="off"
                  />
                  {searchTerm && (
                    <Button
                      variant="light"
                      className="clear-search-btn"
                      onClick={() => setSearchTerm('')}
                    >
                      {renderIcon(FaTimes)}
                    </Button>
                  )}
                </InputGroup>
              </Form.Group>
            )}

            {filterVisibility.sortBy && (
              <Form.Group className="mb-3" controlId="sortOptionMobile">
                <Form.Label>Sort by</Form.Label>
                <SortDropdown
                  id="sortOptionMobile"
                  value={sortOption}
                  onChange={setSortOption}
                />
              </Form.Group>
            )}

            {filterVisibility.categories && (
              <Form.Group className="mb-3" controlId="categoryFilterMobile">
                <Form.Label>Category</Form.Label>
                <CategoryDropdown
                  selectedCategories={selectedCategories}
                  setSelectedCategories={setSelectedCategories}
                  categoryTree={categoryTree}
                  parentCategoryColors={parentCategoryColors}
                  categoryIcons={categoryIcons as DropdownIconMap}
                  allCategories={allCategories}
                  searchPlaceholder="Search category"
                  leadingIcon={FaTags}
                />
              </Form.Group>
            )}

            {filterVisibility.accounts && (
              <Form.Group className="mb-3" controlId="accountFilterMobile">
                <Form.Label>Account</Form.Label>
                <CategoryDropdown
                  selectedCategories={selectedAccounts}
                  setSelectedCategories={setSelectedAccounts}
                  categoryTree={accountTree}
                  parentCategoryColors={accountColors}
                  categoryIcons={accountIcons as DropdownIconMap}
                  allCategories={selectableAccounts}
                  entityLabelSingular="account"
                  entityLabelPlural="accounts"
                  searchPlaceholder="Search account"
                  clearSelectedLabel="Clear accounts"
                  leadingIcon={FaWallet}
                />
              </Form.Group>
            )}

            {filterVisibility.amountRange && (
              <Form.Group className="mb-3" controlId="amountFilterMobile">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="mb-0">Amount range</Form.Label>
                <small className="text-muted">IDR</small>
              </div>
              <small className="text-muted d-block mb-2">Absolute amount in referential currency</small>
              <div className="mb-3" style={{ padding: '16px 0' }}>
                <Slider
                  range
                  min={0}
                  max={20000000}
                  step={100000}
                  value={[minAmount, maxAmount]}
                  onChange={(values) => {
                    if (Array.isArray(values)) {
                      setMinAmount(values[0]);
                      setMaxAmount(values[1]);
                    }
                  }}
                  styles={{
                    track: {
                      backgroundColor: '#0d6efd',
                    },
                    rail: {
                      backgroundColor: '#dee2e6',
                    },
                    handle: {
                      backgroundColor: '#0d6efd',
                      borderColor: '#0d6efd',
                      boxShadow: '0 0 0 3px rgba(13, 110, 253, 0.25)',
                    },
                  }}
                />
              </div>
              <div className="d-flex gap-2">
                <div className="flex-grow-1">
                  <Form.Control
                    type="number"
                    placeholder="Min"
                    value={minAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === '-') {
                        setMinAmount(0);
                      } else {
                        setMinAmount(Math.max(0, Number(value)));
                      }
                    }}
                    min="0"
                    step="100000"
                  />
                  <small className="text-muted d-block mt-1">IDR {minAmount.toLocaleString('en-US')}</small>
                </div>
                <div className="flex-grow-1">
                  <Form.Control
                    type="number"
                    placeholder="Max"
                    value={maxAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '' || value === '-') {
                        setMaxAmount(20000000);
                      } else {
                        setMaxAmount(Math.max(0, Number(value)));
                      }
                    }}
                    min="0"
                    step="100000"
                  />
                  <small className="text-muted d-block mt-1">IDR {maxAmount.toLocaleString('en-US')}</small>
                </div>
              </div>
              </Form.Group>
            )}

          </Form>
        </Offcanvas.Body>
      </Offcanvas>

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
