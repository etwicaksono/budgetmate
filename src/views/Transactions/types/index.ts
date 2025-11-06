import type { IconType, IconBaseProps } from 'react-icons';
import type { ComponentType } from 'react';
import type { ApiCategoryResponse } from '../../../services/categoryService';
import type { ApiAccountResponse } from '../../../services/accountService';
import type { 
  TransactionFormValues, 
  TransactionChangeEvent,
  QuickTransactionOption,
  TransactionModalSaveContext 
} from '../TransactionModal';
import type { QuickTransactionFormValues } from '../QuickTransactionModal';

// Transaction Types
export type TransactionType = 'Expense' | 'Income' | 'Transfer' | string;

export type TransactionRecord = TransactionFormValues & { id: number };

// Sorting Types
export type SortValue =
  | 'timeAsc'
  | 'timeDesc'
  | 'amountAsc'
  | 'amountDesc'
  | 'absAmountAsc'
  | 'absAmountDesc';

export interface SortOption {
  value: SortValue;
  icon: IconRenderable;
  title: string;
  ariaLabel: string;
}

export interface SortDropdownProps {
  id: string;
  value: SortValue;
  onChange?: (value: SortValue) => void;
}

// Tag Types
export type TagTone = 'neutral' | 'want' | 'need' | 'credit' | 'debt';

// Account Types
export interface AccountMetadataEntry {
  color: string;
  icon: string | null;
}

export type AccountMetadata = Record<string, AccountMetadataEntry>;

// Category Types
export type CategoryMap = Record<string, ApiCategoryResponse>;

export type ApiCategoryEntity = ApiCategoryResponse & {
  id: string;
  name: string;
};

// Quick Transaction Types
export interface QuickTransactionPreset extends QuickTransactionFormValues {
  id?: string | number;
  category_id?: string | number | null;
}

export type QuickTransactionPresetInput = Partial<QuickTransactionPreset> &
  Pick<QuickTransactionPreset, 'description' | 'category'>;

// Icon Types
export type IconRenderable = IconType | ComponentType<IconBaseProps>;

export type DropdownIconMap = Record<
  string,
  IconType | ComponentType<{ className?: string; size?: number }> | undefined
>;

// Filter Types
export interface FilterState {
  showFilters: boolean;
  searchTerm: string;
  selectedTypes: Set<TransactionType>;
  selectedCategories: Set<string>;
  selectedAccounts: Set<string>;
  amountRange: [number, number];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

// Pagination Types
export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

// Selection Types
export interface SelectionState {
  selectedIds: Set<number>;
  selectAll: boolean;
}

// Stats Types
export interface TransactionStats {
  totalIncome: number;
  totalExpense: number;
  totalTransfer: number;
  netAmount: number;
  transactionCount: number;
  averageTransaction: number;
  categoryBreakdown: Record<string, number>;
}

// Re-export imported types for convenience
export type {
  TransactionFormValues,
  TransactionChangeEvent,
  QuickTransactionOption,
  TransactionModalSaveContext,
  QuickTransactionFormValues,
  ApiCategoryResponse,
  ApiAccountResponse,
};
