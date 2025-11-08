import { createElement } from 'react';
import type { ComponentType } from 'react';
import type { IconBaseProps } from 'react-icons';
import type { 
  ApiCategoryEntity, 
  ApiCategoryResponse, 
  IconRenderable,
  TransactionRecord,
  TransactionType,
  SortValue,
} from '../types';
import { DEFAULT_CATEGORY_COLOR, DEFAULT_CATEGORY_ICON } from '../constants';

/**
 * Render an icon component with props
 */
export const renderIcon = (
  IconComponent: IconRenderable | null | undefined,
  props: IconBaseProps = {}
): React.ReactNode => {
  if (!IconComponent) {
    return null;
  }
  return createElement(IconComponent as ComponentType<IconBaseProps>, props);
};

/**
 * Check if a category is valid
 */
export const isValidApiCategory = (
  item: ApiCategoryResponse | null | undefined
): item is ApiCategoryEntity => {
  if (!item) {
    return false;
  }

  const { id, name } = item;
  return typeof id === 'string' && id.length > 0 && typeof name === 'string' && name.length > 0;
};

/**
 * Normalize a category with default values
 */
export const normalizeApiCategory = (item: ApiCategoryEntity): ApiCategoryResponse => ({
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

/**
 * Filter transactions based on search term
 */
export const filterBySearchTerm = (
  transactions: TransactionRecord[],
  searchTerm: string
): TransactionRecord[] => {
  if (!searchTerm) {return transactions;}
  
  const lowerSearch = searchTerm.toLowerCase();
  return transactions.filter(transaction => 
    transaction.description?.toLowerCase().includes(lowerSearch) ||
    transaction.amount?.toString().includes(searchTerm) ||
    transaction.category?.toLowerCase().includes(lowerSearch)
  );
};

/**
 * Filter transactions by type
 */
export const filterByType = (
  transactions: TransactionRecord[],
  selectedTypes: Set<TransactionType>
): TransactionRecord[] => {
  if (selectedTypes.size === 0) {return transactions;}
  return transactions.filter(transaction => 
    selectedTypes.has(transaction.type as TransactionType)
  );
};

/**
 * Filter transactions by categories
 */
export const filterByCategories = (
  transactions: TransactionRecord[],
  selectedCategories: Set<string>
): TransactionRecord[] => {
  if (selectedCategories.size === 0) {return transactions;}
  return transactions.filter(transaction => 
    transaction.category && selectedCategories.has(transaction.category)
  );
};

/**
 * Filter transactions by accounts
 */
export const filterByAccounts = (
  transactions: TransactionRecord[],
  selectedAccounts: Set<string>
): TransactionRecord[] => {
  if (selectedAccounts.size === 0) {return transactions;}
  return transactions.filter(transaction => 
    transaction.account && selectedAccounts.has(transaction.account)
  );
};

/**
 * Filter transactions by amount range
 */
export const filterByAmountRange = (
  transactions: TransactionRecord[],
  amountRange: [number, number]
): TransactionRecord[] => {
  const [min, max] = amountRange;
  return transactions.filter(transaction => {
    const amount = Math.abs(Number(transaction.amount));
    return amount >= min && amount <= max;
  });
};

/**
 * Filter transactions by date range
 */
export const filterByDateRange = (
  transactions: TransactionRecord[],
  dateRange: { start: Date | null; end: Date | null }
): TransactionRecord[] => {
  if (!dateRange.start && !dateRange.end) {return transactions;}
  
  return transactions.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    
    if (dateRange.start && transactionDate < dateRange.start) {
      return false;
    }
    
    if (dateRange.end && transactionDate > dateRange.end) {
      return false;
    }
    
    return true;
  });
};

/**
 * Sort transactions based on sort value
 */
export const sortTransactions = (
  transactions: TransactionRecord[],
  sortValue: SortValue
): TransactionRecord[] => {
  const sorted = [...transactions];
  
  switch (sortValue) {
    case 'timeAsc':
      return sorted.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    case 'timeDesc':
      return sorted.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
    case 'amountAsc':
      return sorted.sort((a, b) => Number(a.amount) - Number(b.amount));
    case 'amountDesc':
      return sorted.sort((a, b) => Number(b.amount) - Number(a.amount));
    case 'absAmountAsc':
      return sorted.sort((a, b) => Math.abs(Number(a.amount)) - Math.abs(Number(b.amount)));
    case 'absAmountDesc':
      return sorted.sort((a, b) => Math.abs(Number(b.amount)) - Math.abs(Number(a.amount)));
    default:
      return sorted;
  }
};

/**
 * Apply all filters to transactions
 */
export const applyFilters = (
  transactions: TransactionRecord[],
  filters: {
    searchTerm: string;
    selectedTypes: Set<TransactionType>;
    selectedCategories: Set<string>;
    selectedAccounts: Set<string>;
    amountRange: [number, number];
    dateRange: { start: Date | null; end: Date | null };
    sortValue: SortValue;
  }
): TransactionRecord[] => {
  let filtered = transactions;
  
  filtered = filterBySearchTerm(filtered, filters.searchTerm);
  filtered = filterByType(filtered, filters.selectedTypes);
  filtered = filterByCategories(filtered, filters.selectedCategories);
  filtered = filterByAccounts(filtered, filters.selectedAccounts);
  filtered = filterByAmountRange(filtered, filters.amountRange);
  filtered = filterByDateRange(filtered, filters.dateRange);
  filtered = sortTransactions(filtered, filters.sortValue);
  
  return filtered;
};

/**
 * Paginate transactions
 */
export const paginateTransactions = (
  transactions: TransactionRecord[],
  currentPage: number,
  itemsPerPage: number
): {
  paginatedItems: TransactionRecord[];
  totalPages: number;
  startIndex: number;
  endIndex: number;
} => {
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, transactions.length);
  const paginatedItems = transactions.slice(startIndex, endIndex);
  
  return {
    paginatedItems,
    totalPages,
    startIndex,
    endIndex,
  };
};
