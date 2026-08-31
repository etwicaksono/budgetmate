import type { ComponentType } from 'react';
import type { IconType, IconBaseProps } from 'react-icons';
import type { Label } from '@/services/labelService';
import type { SortValue, FilterVisibility, TransferOption, DebtOption, DraftOption, RecordTypeOption } from '@/hooks/useFilterData';
import type { SavedFilter } from '@/services/savedFilterService';

export type { SortValue, FilterVisibility, TransferOption, DebtOption, DraftOption, RecordTypeOption };

export type IconRenderable = IconType | ComponentType<IconBaseProps>;

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

export interface FilterSidebarProps {
  title: string;
  filterVisibility?: FilterVisibility;
  onFilterVisibilityChange?: React.Dispatch<React.SetStateAction<FilterVisibility>>;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  sortOption?: SortValue;
  onSortOptionChange?: React.Dispatch<React.SetStateAction<SortValue>>;
  transferOption?: TransferOption;
  onTransferOptionChange?: React.Dispatch<React.SetStateAction<TransferOption>>;
  debtOption?: DebtOption;
  onDebtOptionChange?: React.Dispatch<React.SetStateAction<DebtOption>>;
  draftOption?: DraftOption;
  onDraftOptionChange?: React.Dispatch<React.SetStateAction<DraftOption>>;
  recordTypeOption?: RecordTypeOption;
  onRecordTypeOptionChange?: React.Dispatch<React.SetStateAction<RecordTypeOption>>;
  disableDraftFilter?: boolean;
  selectedCategories?: string[];
  onSelectedCategoriesChange?: React.Dispatch<React.SetStateAction<string[]>>;
  categoryTree?: Record<string, string[]>;
  parentCategoryColors?: Record<string, string>;
  categoryIcons?: Record<string, string | undefined>;
  allCategories?: string[];
  selectedAccounts?: string[];
  onSelectedAccountsChange?: React.Dispatch<React.SetStateAction<string[]>>;
  accountTree?: Record<string, string[]>;
  accountColors?: Record<string, string>;
  accountIcons?: Record<string, string | undefined>;
  selectableAccounts?: string[];
  selectedLabelIds?: string[];
  onSelectedLabelIdsChange?: React.Dispatch<React.SetStateAction<string[]>>;
  excludedLabelIds?: string[];
  onExcludedLabelIdsChange?: React.Dispatch<React.SetStateAction<string[]>>;
  labels?: Label[];
  selectedCurrencies?: string[];
  onSelectedCurrenciesChange?: React.Dispatch<React.SetStateAction<string[]>>;
  availableCurrencies?: string[];
  minAmount?: number;
  maxAmount?: number;
  onMinAmountChange?: (value: number) => void;
  onMaxAmountChange?: (value: number) => void;
  onShowTransactionModal?: () => void;
  showAddTransactionButton?: boolean;
  SortDropdownComponent?: React.ComponentType<SortDropdownProps>;
  // Saved filters
  savedFilters?: SavedFilter[];
  activeFilterId?: string | null;
  savedFiltersLoading?: boolean;
  onSaveFilter?: (name: string) => Promise<{ success: boolean; duplicateName?: boolean }>;
  onUpdateFilter?: (id: string, name: string) => Promise<{ success: boolean; duplicateName?: boolean }>;
  onLoadFilter?: (filter: SavedFilter) => void;
  onDeleteFilter?: (id: string) => void;
  onRenameFilter?: (id: string, name: string) => Promise<{ success: boolean; duplicateName?: boolean }>;
  onClearActiveFilter?: () => void;
  onReorderFilter?: (newOrderIds: string[]) => void;
}
