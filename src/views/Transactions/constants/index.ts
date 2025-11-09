import {
  FaSortAmountUp,
  FaSortAmountDown,
  FaSortAmountUpAlt,
  FaSortAmountDownAlt,
} from 'react-icons/fa';
import type { SortOption, TransactionType } from '../types';
// TODO: Revisit transaction constants after new defaults are defined.

// Default values
export const DEFAULT_CATEGORY_COLOR = '#6c757d';
export const DEFAULT_CATEGORY_ICON = 'FaGift';

// Pagination
export const DEFAULT_ITEMS_PER_PAGE = 20;
export const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

// Amount range
export const DEFAULT_MIN_AMOUNT = 0;
export const DEFAULT_MAX_AMOUNT = 10000;

// Sort options
export const SORT_OPTIONS: SortOption[] = [
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

// Transaction types
export const TRANSACTION_TYPES: TransactionType[] = ['Income', 'Expense', 'Transfer'];

// Tag tones
export const TAG_TONE_COLORS: Record<string, string> = {
  neutral: '#6c757d',
  want: '#17a2b8',
  need: '#dc3545',
  credit: '#ffc107',
  debt: '#fd7e14',
};

// Filter defaults
export const DEFAULT_FILTER_STATE = {
  showFilters: false,
  searchTerm: '',
  selectedTypes: new Set<string>(),
  selectedCategories: new Set<string>(),
  selectedAccounts: new Set<string>(),
  amountRange: [DEFAULT_MIN_AMOUNT, DEFAULT_MAX_AMOUNT] as [number, number],
  dateRange: {
    start: null,
    end: null,
  },
};
