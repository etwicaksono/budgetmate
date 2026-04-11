import React, { createElement, useState, useMemo } from 'react';
import Swal from 'sweetalert2';
import type { ComponentType } from 'react';
import { Card, Button, Form, InputGroup, Dropdown, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
  FaSearch,
  FaTags,
  FaWallet,
  FaPlus,
  FaCheck,
  FaFilter,
  FaSortAmountUp,
  FaSortAmountDown,
  FaSortAmountUpAlt,
  FaSortAmountDownAlt,
  FaMoneyBillWave,
  FaGripVertical,
  FaSave,
  FaBookmark,
  FaExchangeAlt,
  FaHandHoldingUsd,
  FaInfoCircle,
} from 'react-icons/fa';
import { RiListSettingsLine } from 'react-icons/ri';
import type { IconType, IconBaseProps } from 'react-icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AmountRangeFilter from '../AmountRangeFilter';
import { CategoryDropdown } from './CategoryDropdown';
import { AccountDropdown } from './AccountDropdown';
import { LabelMultiSelect } from '../transaction/LabelMultiSelect';
import type { Label } from '@/services/labelService';
import type { SortValue, FilterVisibility } from '@/hooks/useFilterData';
import { ClearButton } from '@/components/common/ClearButton';
import './FilterSidebar.css';

type IconRenderable = IconType | ComponentType<IconBaseProps>;
type DropdownIconMap = Record<
  string,
  IconType | ComponentType<{ className?: string; size?: number }> | undefined
>;

export type { SortValue, FilterVisibility };

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

const DEFAULT_SORT_OPTION: SortOption = SORT_OPTIONS[0] ?? {
  value: 'timeAsc',
  icon: FaSortAmountUp,
  title: 'Time ASC',
  ariaLabel: 'Time ascending (oldest first)',
};

export const renderIcon = (
  IconComponent: IconRenderable | null | undefined,
  props: IconBaseProps = {}
): React.ReactNode => {
  if (!IconComponent) {
    return null;
  }
  return createElement(IconComponent as ComponentType<IconBaseProps>, props);
};

function SortDropdown({ id, value, onChange }: SortDropdownProps): React.JSX.Element {
  const [show, setShow] = useState(false);
  const selectedOption = useMemo<SortOption>(
    () => SORT_OPTIONS.find((option) => option.value === value) ?? DEFAULT_SORT_OPTION,
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
      onToggle={(nextShow: boolean | null) => {
        setShow(nextShow ?? false);
      }}
      className="w-100"
    >
      <Dropdown.Toggle
        id={id}
        variant="outline-secondary"
        className="sort-dropdown-toggle d-flex align-items-center justify-content-between w-100 gap-2"
        aria-label={selectedOption.ariaLabel}
        title={selectedOption.ariaLabel}
      >
        <span className="d-flex align-items-center gap-2">
          <span className="text-truncate">{renderOptionContent(selectedOption)}</span>
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
          if (isSelected) {
            itemClasses.push('selected');
          }
          return (
            <Dropdown.Item
              key={option.value}
              as="button"
              type="button"
              onClick={() => {
                handleSelect(option.value);
              }}
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

interface FilterSidebarProps {
  title: string;
  filterVisibility?: FilterVisibility;
  onFilterVisibilityChange?: React.Dispatch<React.SetStateAction<FilterVisibility>>;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  sortOption?: SortValue;
  onSortOptionChange?: React.Dispatch<React.SetStateAction<SortValue>>;
  transferOption?: import('@/hooks/useFilterData').TransferOption;
  onTransferOptionChange?: React.Dispatch<React.SetStateAction<import('@/hooks/useFilterData').TransferOption>>;
  debtOption?: import('@/hooks/useFilterData').DebtOption;
  onDebtOptionChange?: React.Dispatch<React.SetStateAction<import('@/hooks/useFilterData').DebtOption>>;
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
  savedFilters?: import('@/services/savedFilterService').SavedFilter[];
  activeFilterId?: string | null;
  savedFiltersLoading?: boolean;
  onSaveFilter?: (name: string) => Promise<{ success: boolean; duplicateName?: boolean }>;
  onUpdateFilter?: (id: string, name: string) => Promise<{ success: boolean; duplicateName?: boolean }>;
  onLoadFilter?: (filter: import('@/services/savedFilterService').SavedFilter) => void;
  onDeleteFilter?: (id: string) => void;
  onRenameFilter?: (id: string, name: string) => Promise<{ success: boolean; duplicateName?: boolean }>;
  onClearActiveFilter?: () => void;
  onReorderFilter?: (newOrderIds: string[]) => void;
}

const noop = () => { };
const noopDispatch: React.Dispatch<React.SetStateAction<string[]>> = () => { };
const noopSortDispatch: React.Dispatch<React.SetStateAction<SortValue>> = () => { };
const noopTransferDispatch: React.Dispatch<React.SetStateAction<import('@/hooks/useFilterData').TransferOption>> = () => { };
const noopDebtDispatch: React.Dispatch<React.SetStateAction<import('@/hooks/useFilterData').DebtOption>> = () => { };
const noopFilterVisibilityDispatch: React.Dispatch<React.SetStateAction<FilterVisibility>> =
  () => { };

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  title,
  filterVisibility = {
    search: true,
    sortBy: true,
    accounts: true,
    categories: true,
    labels: true,
    amountRange: true,
    currencies: true,
    transfers: true,
    debts: true,
  },
  onFilterVisibilityChange = noopFilterVisibilityDispatch,
  searchTerm = '',
  onSearchTermChange = noop,
  sortOption = 'timeDesc',
  onSortOptionChange = noopSortDispatch,
  transferOption = 'include',
  onTransferOptionChange = noopTransferDispatch,
  debtOption = 'include',
  onDebtOptionChange = noopDebtDispatch,
  selectedCategories = [],
  onSelectedCategoriesChange = noopDispatch,
  categoryTree = {},
  parentCategoryColors = {},
  categoryIcons = {},
  allCategories = [],
  selectedAccounts = [],
  onSelectedAccountsChange = noopDispatch,
  accountColors = {},
  accountIcons = {},
  selectableAccounts = [],
  selectedLabelIds = [],
  onSelectedLabelIdsChange = noopDispatch,
  labels = [],
  selectedCurrencies = [],
  onSelectedCurrenciesChange = noopDispatch,
  availableCurrencies = [],
  minAmount = 0,
  maxAmount = 20000000,
  onMinAmountChange = noop,
  onMaxAmountChange = noop,
  onShowTransactionModal = noop,
  showAddTransactionButton = false,
  SortDropdownComponent = SortDropdown,
  savedFilters = [],
  activeFilterId = null,
  savedFiltersLoading = false,
  onSaveFilter = async () => ({ success: false, duplicateName: false } as { success: boolean; duplicateName?: boolean }),
  onUpdateFilter,
  onLoadFilter = noop,
  onDeleteFilter = noop,
  onRenameFilter = async (): Promise<{ success: boolean; duplicateName?: boolean }> => ({ success: false, duplicateName: false }),
  onClearActiveFilter = noop,
  onReorderFilter = noop,
}) => {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showSavedFilters, setShowSavedFilters] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  // { id: string, value: string } | null
  const [renameState, setRenameState] = useState<{ id: string; value: string } | null>(null);

  // Save button & modals
  const [showSaveDropdown, setShowSaveDropdown] = useState(false);
  const [showSaveAsNewModal, setShowSaveAsNewModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [saveModalName, setSaveModalName] = useState('');
  const [saveModalError, setSaveModalError] = useState<string | null>(null);
  const [saveModalLoading, setSaveModalLoading] = useState(false);

  // Snapshot of filter state at the moment a saved filter is loaded — used to detect changes
  type FilterSnapshot = {
    selectedCategories: string[];
    selectedAccounts: string[];
    selectedLabelIds: string[];
    selectedCurrencies: string[];
    sortOption: SortValue;
    transferOption: import('@/hooks/useFilterData').TransferOption;
    debtOption: import('@/hooks/useFilterData').DebtOption;
  };
  const [loadedSnapshot, setLoadedSnapshot] = useState<FilterSnapshot | null>(null);

  // Capture snapshot whenever a filter is loaded
  const handleLoadFilter = (filter: import('@/services/savedFilterService').SavedFilter) => {
    onLoadFilter(filter);
    // Snapshot will lag one render behind; capture props-at-load
    setLoadedSnapshot({
      selectedCategories: filter.filters.selectedCategoryIds ?? [],
      selectedAccounts: filter.filters.selectedAccountIds ?? [],
      selectedLabelIds: filter.filters.selectedLabelIds ?? [],
      selectedCurrencies: filter.filters.selectedCurrencies ?? [],
      sortOption: (filter.filters.sortOption as SortValue) ?? 'timeDesc',
      transferOption: (filter.filters.transferOption as import('@/hooks/useFilterData').TransferOption) ?? 'include',
      debtOption: (filter.filters.debtOption as import('@/hooks/useFilterData').DebtOption) ?? 'include',
    });
  };

  // Detect whether the current filter state has drifted from the loaded snapshot
  const hasFilterChanged = useMemo(() => {
    if (!activeFilterId || !loadedSnapshot) return false;
    const arrEq = (a: string[], b: string[]) =>
      a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
    return (
      !arrEq(selectedCategories, loadedSnapshot.selectedCategories) ||
      !arrEq(selectedAccounts, loadedSnapshot.selectedAccounts) ||
      !arrEq(selectedLabelIds, loadedSnapshot.selectedLabelIds) ||
      !arrEq(selectedCurrencies, loadedSnapshot.selectedCurrencies) ||
      sortOption !== loadedSnapshot.sortOption ||
      transferOption !== loadedSnapshot.transferOption ||
      debtOption !== loadedSnapshot.debtOption
    );
  }, [
    activeFilterId, loadedSnapshot,
    selectedCategories, selectedAccounts, selectedLabelIds, selectedCurrencies, sortOption, transferOption, debtOption,
  ]);

  const saveButtonEnabled = true;
  const canUpdateFilter = !!activeFilterId && hasFilterChanged;
  const activeFilterName = activeFilterId
    ? (savedFilters.find((f) => f.id === activeFilterId)?.name ?? '')
    : '';

  const handleResetFilters = () => {
    onSearchTermChange('');
    onSortOptionChange('timeDesc' as SortValue);
    onTransferOptionChange('include');
    onDebtOptionChange('include');
    onSelectedCategoriesChange([]);
    onSelectedAccountsChange([]);
    onSelectedLabelIdsChange([]);
    onSelectedCurrenciesChange([]);
    onMinAmountChange(0);
    onMaxAmountChange(20000000);
  };

  return (
    <>
    <Card className="desktop-filter-sidebar shadow-sm border-0">
      <Card.Header className="d-flex align-items-center justify-content-between bg-white border-bottom">
        <span className="h4 mb-0 fw-bold">{title}</span>
        <div className="d-flex gap-2">
          <Dropdown
            show={showFilterPanel}
            onToggle={(isOpen: boolean | null) => {
              setShowFilterPanel(isOpen ?? false);
            }}
          >
            <Dropdown.Toggle
              as="button"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'transparent';
              }}
              aria-label="Configure filters"
              title="Configure filters"
            >
              {renderIcon(RiListSettingsLine, { size: 20, color: '#6b7280' })}
            </Dropdown.Toggle>

            <Dropdown.Menu
              align="end"
              style={{
                minWidth: '280px',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                border: '1px solid #e5e7eb',
                marginTop: '8px',
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <h6 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                  Filter Settings
                </h6>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                  Configure visible filters
                </p>
              </div>
              <hr style={{ margin: '12px 0', borderColor: '#e5e7eb' }} />
              <div>
                <Form.Check
                  type="checkbox"
                  id="filter-search"
                  label="Search"
                  checked={filterVisibility.search}
                  onChange={() => {
                    onFilterVisibilityChange((prev) => ({ ...prev, search: !prev.search }));
                  }}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
                <Form.Check
                  type="checkbox"
                  id="filter-sortBy"
                  label="Sort By"
                  checked={filterVisibility.sortBy}
                  onChange={() => {
                    onFilterVisibilityChange((prev) => ({ ...prev, sortBy: !prev.sortBy }));
                  }}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
                <Form.Check
                  type="checkbox"
                  id="filter-categories"
                  label="Categories"
                  checked={filterVisibility.categories}
                  onChange={() => {
                    onFilterVisibilityChange((prev) => ({
                      ...prev,
                      categories: !prev.categories,
                    }));
                  }}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
                <Form.Check
                  type="checkbox"
                  id="filter-accounts"
                  label="Accounts"
                  checked={filterVisibility.accounts}
                  onChange={() => {
                    onFilterVisibilityChange((prev) => ({ ...prev, accounts: !prev.accounts }));
                  }}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
                <Form.Check
                  type="checkbox"
                  id="filter-labels"
                  label="Labels"
                  checked={filterVisibility.labels}
                  onChange={() => {
                    onFilterVisibilityChange((prev) => ({ ...prev, labels: !prev.labels }));
                  }}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
                <Form.Check
                  type="checkbox"
                  id="filter-amountRange"
                  label="Amount Range"
                  checked={filterVisibility.amountRange}
                  onChange={() => {
                    onFilterVisibilityChange((prev) => ({
                      ...prev,
                      amountRange: !prev.amountRange,
                    }));
                  }}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
                <Form.Check
                  type="checkbox"
                  id="filter-currencies"
                  label="Currencies"
                  checked={filterVisibility.currencies}
                  onChange={() => {
                    onFilterVisibilityChange((prev) => ({
                      ...prev,
                      currencies: !prev.currencies,
                    }));
                  }}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
                <Form.Check
                  type="checkbox"
                  id="filter-transfers"
                  label="Transfers"
                  checked={filterVisibility.transfers ?? true}
                  onChange={() => {
                    onFilterVisibilityChange((prev) => ({
                      ...prev,
                      transfers: !(prev.transfers ?? true),
                    }));
                  }}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
                <Form.Check
                  type="checkbox"
                  id="filter-debts"
                  label="Debts"
                  checked={filterVisibility.debts ?? true}
                  onChange={() => {
                    onFilterVisibilityChange((prev) => ({
                      ...prev,
                      debts: !(prev.debts ?? true),
                    }));
                  }}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
              </div>
            </Dropdown.Menu>
          </Dropdown>
          {showAddTransactionButton && (
            <Button
              type="button"
              variant="light"
              className="transactions-add-record-btn"
              onClick={onShowTransactionModal}
              aria-label="Add transaction"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {renderIcon(FaPlus, { size: 16 })}
            </Button>
          )}
        </div>
      </Card.Header>

      <Card.Body className="overflow-auto pb-2" style={{ flex: '1 1 auto' }}>
        {/* Saved Filters — filter selector + save button row */}
        <div className="mb-3">
          <Form.Label className="fw-semibold text-muted small d-flex align-items-center gap-1">
            My filter
            <OverlayTrigger
              placement="top"
              overlay={
                <Tooltip id="my-filter-tooltip">
                  My filters can be saved and reused later.
                </Tooltip>
              }
            >
              <span style={{ cursor: 'default', lineHeight: 1 }}>
                {renderIcon(FaInfoCircle, { size: 12, color: '#9ca3af' })}
              </span>
            </OverlayTrigger>
          </Form.Label>
          <div className="d-flex align-items-stretch gap-2">
            {/* Filter selector dropdown */}
            <Dropdown
              show={showSavedFilters}
              onToggle={(isOpen: boolean | null) => {
                setShowSavedFilters(isOpen ?? false);
              }}
              className="flex-grow-1"
            >
              <Dropdown.Toggle
                variant="outline-secondary"
                className="w-100 d-flex align-items-center justify-content-between filter-selector-toggle filter-selector-no-caret position-relative"
                style={{
                  textAlign: 'left',
                  fontSize: '14px',
                  borderColor: activeFilterId ? '#198754' : undefined,
                  color: activeFilterId ? '#198754' : undefined,
                  paddingRight: activeFilterId ? '2rem' : undefined,
                }}
              >
                <span className="d-flex align-items-center gap-2 text-truncate">
                  {renderIcon(FaFilter, { size: 14, color: activeFilterId ? '#198754' : '#6b7280' })}
                  <span className="text-truncate">
                    {activeFilterId
                      ? (savedFilters.find((f) => f.id === activeFilterId)?.name ?? 'Select filter')
                      : 'Select filter'}
                  </span>
                </span>
                {activeFilterId && (
                  <span
                    className="position-absolute end-0 top-50 translate-middle-y me-1"
                    style={{ zIndex: 5 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ClearButton
                      onClick={() => {
                        handleResetFilters();
                        onClearActiveFilter();
                        setLoadedSnapshot(null);
                      }}
                    />
                  </span>
                )}
              </Dropdown.Toggle>

              <Dropdown.Menu className="w-100 p-2" style={{ minWidth: '220px' }}>
                {savedFiltersLoading ? (
                  <div className="text-center text-muted small py-2">Loading…</div>
                ) : savedFilters.length === 0 ? (
                  <div className="text-center text-muted small py-2">No saved filters yet</div>
                ) : (
                  savedFilters.map((filter) => {
                    const isActive = filter.id === activeFilterId;
                    return (
                      <div
                        key={filter.id}
                        className={`d-flex align-items-center gap-1 px-2 py-1 rounded mb-1 ${
                          isActive ? 'bg-success bg-opacity-10' : ''
                        }`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          if (isActive) {
                            handleResetFilters();
                            onClearActiveFilter();
                            setLoadedSnapshot(null);
                          } else {
                            handleLoadFilter(filter);
                          }
                          setShowSavedFilters(false);
                        }}
                      >
                        {/* Active check */}
                        <span style={{ width: '16px', flexShrink: 0, color: '#198754', fontSize: '12px' }}>
                          {isActive ? '✓' : ''}
                        </span>
                        {/* Filter name */}
                        <span className="flex-grow-1 text-truncate" style={{ fontSize: '14px' }}>
                          {filter.name}
                        </span>
                      </div>
                    );
                  })
                )}

                {savedFilters.length > 0 && (
                  <>
                    <Dropdown.Divider />
                    <Dropdown.Item
                      as="button"
                      type="button"
                      className="d-flex align-items-center gap-2 text-muted"
                      style={{ fontSize: '14px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowSavedFilters(false);
                        setShowManageModal(true);
                      }}
                    >
                      {renderIcon(RiListSettingsLine, { size: 14 })}
                      Manage filters
                    </Dropdown.Item>
                  </>
                )}
              </Dropdown.Menu>
            </Dropdown>

            {/* Save button with dropdown */}
            <Dropdown
              show={showSaveDropdown}
              onToggle={(isOpen: boolean | null) => {
                if (saveButtonEnabled) setShowSaveDropdown(isOpen ?? false);
              }}
              drop="down"
              align="end"
            >
              <Dropdown.Toggle
                as="button"
                id="saved-filter-save-btn"
                disabled={!saveButtonEnabled}
                title="Save filter"
                aria-label="Save filter"
                style={{
                  width: '38px',
                  height: '38px',
                  flexShrink: 0,
                  borderRadius: '8px',
                  border: `1px solid ${saveButtonEnabled ? '#198754' : '#dee2e6'}`,
                  backgroundColor: saveButtonEnabled ? '#198754' : '#f8f9fa',
                  color: saveButtonEnabled ? '#fff' : '#adb5bd',
                  cursor: saveButtonEnabled ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  padding: 0,
                }}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  if (saveButtonEnabled) setShowSaveDropdown((v) => !v);
                }}
              >
                {renderIcon(FaSave, { size: 16 })}
              </Dropdown.Toggle>

              <Dropdown.Menu
                align="end"
                style={{
                  minWidth: '200px',
                  borderRadius: '10px',
                  boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
                  border: '1px solid #e5e7eb',
                  padding: '6px',
                  marginTop: '4px',
                }}
              >
                {/* Save as new */}
                <Dropdown.Item
                  as="button"
                  type="button"
                  className="d-flex align-items-center gap-2 save-action-item"
                  style={{ fontSize: '14px', borderRadius: '6px', padding: '8px 10px' }}
                  onClick={() => {
                    setShowSaveDropdown(false);
                    setSaveModalName('');
                    setSaveModalError(null);
                    setShowSaveAsNewModal(true);
                  }}
                >
                  {renderIcon(FaSave, { size: 14 })}
                  Save as new
                </Dropdown.Item>

                {/* Update existing — only when a filter is active and has changes */}
                {canUpdateFilter && (
                  <Dropdown.Item
                    as="button"
                    type="button"
                    className="d-flex align-items-center gap-2 save-action-item save-action-item--update"
                    style={{ fontSize: '14px', borderRadius: '6px', padding: '8px 10px' }}
                    onClick={() => {
                      setShowSaveDropdown(false);
                      setSaveModalName(activeFilterName);
                      setSaveModalError(null);
                      setShowUpdateModal(true);
                    }}
                  >
                    {renderIcon(FaBookmark, { size: 14 })}
                    <span style={{ fontWeight: 500 }}>
                      Update {activeFilterName}
                    </span>
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </div>

        <Form>
          {filterVisibility.search && (
            <Form.Group className="mb-4" controlId="searchTerm">
              <Form.Label className="fw-semibold text-muted small">Search</Form.Label>
              <InputGroup>
                <InputGroup.Text
                  className="search-input-icon bg-white"
                  style={{ borderRight: 'none' }}
                >
                  {renderIcon(FaSearch, { size: 14, color: '#adb5bd' })}
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search transactions"
                  value={searchTerm}
                  onChange={(event) => {
                    onSearchTermChange(event.target.value);
                  }}
                  autoComplete="off"
                  style={{ borderLeft: 'none' }}
                  className="shadow-none border-start-0 ps-0 pe-5"
                />
                {searchTerm && (
                  <ClearButton
                    className="position-absolute end-0 top-50 translate-middle-y me-2"
                    style={{ zIndex: 5 }}
                    onClick={() => onSearchTermChange('')}
                  />
                )}
              </InputGroup>
            </Form.Group>
          )}

          {filterVisibility.sortBy && (
            <Form.Group className="mb-4" controlId="sortOption">
              <Form.Label className="fw-semibold text-muted small">Sort by</Form.Label>
              <SortDropdownComponent
                id="sortOption"
                value={sortOption}
                onChange={(value) => onSortOptionChange(value)}
              />
            </Form.Group>
          )}

          {filterVisibility.categories && (
            <Form.Group className="mb-4" controlId="categoryFilter">
              <Form.Label className="fw-semibold text-muted small">Categories</Form.Label>
              <CategoryDropdown
                selectedCategories={selectedCategories}
                setSelectedCategories={onSelectedCategoriesChange}
                categoryTree={categoryTree}
                parentCategoryColors={parentCategoryColors}
                categoryIcons={categoryIcons}
                allCategories={allCategories}
                leadingIcon={FaTags}
                entityLabelSingular="category"
                entityLabelPlural="categories"
                searchPlaceholder="Search categories"
                isSingleSelect={false}
              />
            </Form.Group>
          )}

          {filterVisibility.accounts && (
            <Form.Group className="mb-4" controlId="accountFilter">
              <Form.Label className="fw-semibold text-muted small">Accounts</Form.Label>
              <AccountDropdown
                selectedAccounts={selectedAccounts}
                setSelectedAccounts={onSelectedAccountsChange}
                accountColors={accountColors}
                accountIcons={accountIcons}
                allAccounts={selectableAccounts}
                leadingIcon={FaWallet}
                entityLabelSingular="account"
                entityLabelPlural="accounts"
                searchPlaceholder="Search account"
                isSingleSelect={false}
              />
            </Form.Group>
          )}

          {filterVisibility.labels && (
            <Form.Group className="mb-4" controlId="labelFilter">
              <Form.Label className="fw-semibold text-muted small">Labels</Form.Label>
              <LabelMultiSelect
                labels={labels}
                selectedLabelIds={selectedLabelIds}
                onChange={onSelectedLabelIdsChange}
                placeholder="All labels"
              />
            </Form.Group>
          )}

          {filterVisibility.currencies && availableCurrencies.length > 0 && (
            <Form.Group className="mb-4" controlId="currencyFilter">
              <Form.Label className="fw-semibold text-muted small">Currencies</Form.Label>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  className="w-100 d-flex align-items-center justify-content-between"
                  style={{ textAlign: 'left' }}
                >
                  <span className="d-flex align-items-center gap-2">
                    {renderIcon(FaMoneyBillWave, { size: 14 })}
                    <span className="d-inline-flex align-items-center gap-1">
                      {selectedCurrencies.length === 0
                        ? 'All currencies'
                        : selectedCurrencies.length === 1
                          ? selectedCurrencies[0]
                          : `${selectedCurrencies.length} currencies`}
                      {selectedCurrencies.length > 0 && (
                        <ClearButton
                          size={12}
                          ariaLabel="Clear currencies"
                          onClick={() => onSelectedCurrenciesChange([])}
                        />
                      )}
                    </span>
                  </span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="w-100 p-2">
                  {availableCurrencies.map((currency) => {
                    const isChecked = selectedCurrencies.includes(currency);
                    const toggle = () => {
                      if (isChecked) {
                        onSelectedCurrenciesChange(selectedCurrencies.filter((c) => c !== currency));
                      } else {
                        onSelectedCurrenciesChange([...selectedCurrencies, currency]);
                      }
                    };
                    return (
                      <div
                        key={currency}
                        className="d-flex align-items-center gap-2 px-2 py-1 rounded mb-1"
                        style={{ cursor: 'pointer', userSelect: 'none' }}
                        onClick={toggle}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          readOnly
                          className="form-check-input m-0 flex-shrink-0"
                          style={{ pointerEvents: 'none' }}
                        />
                        <span className="form-check-label mb-0">
                          {currency}
                        </span>
                      </div>
                    );
                  })}
                  {selectedCurrencies.length > 0 && (
                    <>
                      <Dropdown.Divider />
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-secondary text-decoration-none ms-4"
                        onClick={() => onSelectedCurrenciesChange([])}
                      >
                        Clear selection
                      </Button>
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </Form.Group>
          )}

          {filterVisibility.amountRange && (
            <Form.Group className="mb-4" controlId="amountFilter">
              <AmountRangeFilter
                minAmount={minAmount}
                maxAmount={maxAmount}
                onMinAmountChange={onMinAmountChange}
                onMaxAmountChange={onMaxAmountChange}
                currency="IDR"
                minLimit={0}
                maxLimit={20000000}
                step={100000}
                controlId="amountFilterInner"
              />
            </Form.Group>
          )}

          {filterVisibility.transfers && (
            <Form.Group className="mb-2" controlId="transferFilter">
              <Form.Label className="fw-semibold text-muted small">Transfers</Form.Label>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  className="w-100 d-flex align-items-center justify-content-between"
                  style={{ textAlign: 'left' }}
                >
                  <span className="d-flex align-items-center gap-2">
                    {renderIcon(FaExchangeAlt, { size: 14 })}
                    <span className="d-inline-flex align-items-center gap-1">
                      {transferOption === 'include'
                        ? 'Include transfers'
                        : transferOption === 'only'
                          ? 'Only transfers'
                          : 'Exclude transfers'}
                    </span>
                  </span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="w-100 p-1">
                  {[
                    { label: 'Include transfers', value: 'include' },
                    { label: 'Only transfers', value: 'only' },
                    { label: 'Exclude transfers', value: 'exclude' },
                  ].map((option) => {
                    const isSelected = transferOption === option.value;
                    return (
                      <Dropdown.Item
                        key={option.value}
                        as="button"
                        type="button"
                        className={`d-flex align-items-center gap-2 w-100 bg-white ${
                          isSelected ? 'selected' : ''
                        }`}
                        style={isSelected ? { backgroundColor: '#e9ecef' } : {}}
                        onClick={() => onTransferOptionChange(option.value as import('@/hooks/useFilterData').TransferOption)}
                      >
                        {isSelected && (
                          <span className="d-inline-flex justify-content-center" style={{ width: '1.25rem' }}>
                            {renderIcon(FaCheck, { className: 'text-success' })}
                          </span>
                        )}
                        {!isSelected && <span style={{ width: '1.25rem' }}></span>}
                        <span className="flex-grow-1 text-start">{option.label}</span>
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Menu>
              </Dropdown>
            </Form.Group>
          )}

          {filterVisibility.debts && (
            <Form.Group className="mb-2" controlId="debtFilter">
              <Form.Label className="fw-semibold text-muted small">Debts</Form.Label>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  className="w-100 d-flex align-items-center justify-content-between"
                  style={{ textAlign: 'left' }}
                >
                  <span className="d-flex align-items-center gap-2">
                    {renderIcon(FaHandHoldingUsd, { size: 14 })}
                    <span className="d-inline-flex align-items-center gap-1">
                      {debtOption === 'include'
                        ? 'Include debts'
                        : debtOption === 'only'
                          ? 'Only debts'
                          : 'Exclude debts'}
                    </span>
                  </span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="w-100 p-1">
                  {[
                    { label: 'Include debts', value: 'include' },
                    { label: 'Only debts', value: 'only' },
                    { label: 'Exclude debts', value: 'exclude' },
                  ].map((option) => {
                    const isSelected = debtOption === option.value;
                    return (
                      <Dropdown.Item
                        key={option.value}
                        as="button"
                        type="button"
                        className={`d-flex align-items-center gap-2 w-100 bg-white ${
                          isSelected ? 'selected' : ''
                        }`}
                        style={isSelected ? { backgroundColor: '#e9ecef' } : {}}
                        onClick={() => onDebtOptionChange(option.value as import('@/hooks/useFilterData').DebtOption)}
                      >
                        {isSelected && (
                          <span className="d-inline-flex justify-content-center" style={{ width: '1.25rem' }}>
                            {renderIcon(FaCheck, { className: 'text-success' })}
                          </span>
                        )}
                        {!isSelected && <span style={{ width: '1.25rem' }}></span>}
                        <span className="flex-grow-1 text-start">{option.label}</span>
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Menu>
              </Dropdown>
            </Form.Group>
          )}
        </Form>
      </Card.Body>

      <Card.Footer className="bg-white border-top p-3 mt-auto">
        <Button
          variant="outline-secondary"
          onClick={handleResetFilters}
          className="w-100 fw-medium"
        >
          Reset all filters
        </Button>
      </Card.Footer>

      <ManageFiltersModal
        show={showManageModal}
        onHide={() => setShowManageModal(false)}
        savedFilters={savedFilters}
        renameState={renameState}
        setRenameState={setRenameState}
        onRenameFilter={onRenameFilter}
        onDeleteFilter={onDeleteFilter}
        onReorderFilter={onReorderFilter}
      />
    </Card>

      {/* Save as new modal */}
      <Modal
        show={showSaveAsNewModal}
        onHide={() => {
          setShowSaveAsNewModal(false);
          setSaveModalName('');
          setSaveModalError(null);
        }}
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '16px', fontWeight: 600 }}>Save as new</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label style={{ fontSize: '14px', fontWeight: 500 }}>Name</Form.Label>
            <Form.Control
              autoFocus
              type="text"
              placeholder="Filter name…"
              value={saveModalName}
              isInvalid={!!saveModalError}
              onChange={(e) => {
                setSaveModalName(e.target.value);
                setSaveModalError(null);
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && saveModalName.trim()) {
                  setSaveModalLoading(true);
                  const result = await onSaveFilter(saveModalName.trim());
                  setSaveModalLoading(false);
                  if (result?.duplicateName) {
                    setSaveModalError(`"${saveModalName.trim()}" already exists`);
                  } else {
                    setShowSaveAsNewModal(false);
                    setSaveModalName('');
                    setSaveModalError(null);
                  }
                }
              }}
            />
            {saveModalError && (
              <Form.Control.Feedback type="invalid">{saveModalError}</Form.Control.Feedback>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="success"
            className="w-100"
            disabled={!saveModalName.trim() || saveModalLoading}
            style={{ fontWeight: 500 }}
            onClick={async () => {
              if (!saveModalName.trim()) return;
              setSaveModalLoading(true);
              const result = await onSaveFilter(saveModalName.trim());
              setSaveModalLoading(false);
              if (result?.duplicateName) {
                setSaveModalError(`"${saveModalName.trim()}" already exists`);
              } else {
                setShowSaveAsNewModal(false);
                setSaveModalName('');
                setSaveModalError(null);
              }
            }}
          >
            {saveModalLoading ? 'Saving…' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Update existing filter modal */}
      <Modal
        show={showUpdateModal}
        onHide={() => {
          setShowUpdateModal(false);
          setSaveModalName('');
          setSaveModalError(null);
        }}
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '16px', fontWeight: 600 }}>
            Update {activeFilterName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label style={{ fontSize: '14px', fontWeight: 500 }}>Name</Form.Label>
            <Form.Control
              autoFocus
              type="text"
              placeholder="Filter name…"
              value={saveModalName}
              isInvalid={!!saveModalError}
              onChange={(e) => {
                setSaveModalName(e.target.value);
                setSaveModalError(null);
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && saveModalName.trim() && activeFilterId) {
                  setSaveModalLoading(true);
                  const result = onUpdateFilter
                    ? await onUpdateFilter(activeFilterId, saveModalName.trim())
                    : { success: false };
                  setSaveModalLoading(false);
                  if (result?.duplicateName) {
                    setSaveModalError(`"${saveModalName.trim()}" already exists`);
                  } else if (result?.success) {
                    setShowUpdateModal(false);
                    setSaveModalName('');
                    setSaveModalError(null);
                    setLoadedSnapshot({
                      selectedCategories,
                      selectedAccounts,
                      selectedLabelIds,
                      selectedCurrencies,
                      sortOption,
                      transferOption,
                      debtOption,
                    });
                  }
                }
              }}
            />
            {saveModalError && (
              <Form.Control.Feedback type="invalid">{saveModalError}</Form.Control.Feedback>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <Button
            variant="success"
            className="w-100"
            disabled={!saveModalName.trim() || saveModalLoading}
            style={{ fontWeight: 500 }}
            onClick={async () => {
              if (!saveModalName.trim() || !activeFilterId) return;
              setSaveModalLoading(true);
              const result = onUpdateFilter
                ? await onUpdateFilter(activeFilterId, saveModalName.trim())
                : { success: false };
              setSaveModalLoading(false);
              if (result?.duplicateName) {
                setSaveModalError(`"${saveModalName.trim()}" already exists`);
              } else if (result?.success) {
                setShowUpdateModal(false);
                setSaveModalName('');
                setSaveModalError(null);
                // Reset snapshot so save button disables after a successful update
                setLoadedSnapshot({
                  selectedCategories,
                  selectedAccounts,
                  selectedLabelIds,
                  selectedCurrencies,
                  sortOption,
                  transferOption,
                  debtOption,
                });
              }
            }}
          >
            {saveModalLoading ? 'Saving…' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

// --- Subcomponents below ---

interface ManageFiltersModalProps {
  show: boolean;
  onHide: () => void;
  savedFilters: import('@/services/savedFilterService').SavedFilter[];
  renameState: { id: string; value: string } | null;
  setRenameState: (state: { id: string; value: string } | null) => void;
  onRenameFilter: (id: string, name: string) => Promise<{ success: boolean; duplicateName?: boolean }>;
  onDeleteFilter: (id: string) => void;
  onReorderFilter: (newOrderIds: string[]) => void;
}

const ManageFiltersModal: React.FC<ManageFiltersModalProps> = ({
  show,
  onHide,
  savedFilters,
  renameState,
  setRenameState,
  onRenameFilter,
  onDeleteFilter,
  onReorderFilter,
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = savedFilters.findIndex((f) => f.id === active.id);
      const newIndex = savedFilters.findIndex((f) => f.id === over.id);
      const newOrderIds = arrayMove(savedFilters, oldIndex, newIndex).map(f => f.id);
      onReorderFilter(newOrderIds);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Manage Saved Filters</Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-0">
        {savedFilters.length === 0 ? (
          <div className="p-4 text-center text-muted">No saved filters.</div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={savedFilters.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="list-group list-group-flush">
                {savedFilters.map((filter) => (
                  <SortableFilterItem
                    key={filter.id}
                    filter={filter}
                    renameState={renameState}
                    setRenameState={setRenameState}
                    onRenameFilter={onRenameFilter}
                    onDeleteFilter={onDeleteFilter}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

interface SortableFilterItemProps {
  filter: import('@/services/savedFilterService').SavedFilter;
  renameState: { id: string; value: string } | null;
  setRenameState: (state: { id: string; value: string } | null) => void;
  onRenameFilter: (id: string, name: string) => Promise<{ success: boolean; duplicateName?: boolean }>;
  onDeleteFilter: (id: string) => void;
}

const SortableFilterItem: React.FC<SortableFilterItemProps> = ({
  filter,
  renameState,
  setRenameState,
  onRenameFilter,
  onDeleteFilter,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: filter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    boxShadow: isDragging ? '0 5px 15px rgba(0, 0, 0, 0.15)' : 'none',
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`list-group-item d-flex align-items-center justify-content-between p-3 bg-white ${isDragging ? 'opacity-75' : ''}`}
    >
      <div className="d-flex align-items-center flex-grow-1 overflow-hidden">
        <div
          {...attributes}
          {...listeners}
          className="me-3 text-muted d-flex align-items-center justify-content-center"
          style={{ cursor: isDragging ? 'grabbing' : 'grab', width: '20px', height: '100%', outline: 'none' }}
          title="Drag to reorder"
        >
          <FaGripVertical />
        </div>
        {renameState?.id === filter.id ? (
          <Form.Control
            autoFocus
            size="sm"
            type="text"
            value={renameState.value}
            onChange={(e) => setRenameState({ id: filter.id, value: e.target.value })}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && renameState.value.trim()) {
                const result = await onRenameFilter(filter.id, renameState.value.trim());
                if (result.duplicateName) {
                  Swal.fire({ icon: 'error', title: 'Name already exists', text: `You already have a filter named "${renameState.value.trim()}".`, confirmButtonColor: '#0d6efd' });
                } else {
                  setRenameState(null);
                }
              }
              if (e.key === 'Escape') setRenameState(null);
            }}
            onBlur={(e) => {
              // Only cancel rename if focus moves outside of this list item
              // We use e.currentTarget (the input) and find its closest li parent
              // and see if the new focus target (e.relatedTarget) is inside that li
              const listItem = e.currentTarget.closest('li');
              if (listItem && !listItem.contains(e.relatedTarget as Node)) {
                setRenameState(null);
              }
            }}
            className="me-3"
          />
        ) : (
          <span className="fw-medium text-truncate me-3" style={{ fontSize: '15px', userSelect: 'none' }}>{filter.name}</span>
        )}
      </div>

      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        {renameState?.id === filter.id ? (
          <Button
            variant="link"
            className="p-0 text-success text-decoration-none"
            aria-label={`Save rename for ${filter.name}`}
            title="Save"
            onClick={async (e) => {
              e.preventDefault();
              if (renameState.value.trim()) {
                const result = await onRenameFilter(filter.id, renameState.value.trim());
                if (result.duplicateName) {
                  Swal.fire({ icon: 'error', title: 'Name already exists', text: `You already have a filter named "${renameState.value.trim()}".`, confirmButtonColor: '#0d6efd' });
                } else {
                  setRenameState(null);
                }
              } else {
                setRenameState(null);
              }
            }}
          >
            ✓ Save
          </Button>
        ) : (
          <Button
            variant="link"
            className="p-0 text-muted text-decoration-none"
            aria-label={`Rename ${filter.name}`}
            title="Rename"
            onClick={() => setRenameState({ id: filter.id, value: filter.name })}
          >
            ✏️ Edit
          </Button>
        )}

        <Button
          variant="link"
          className="p-0 text-danger text-decoration-none ms-2"
          aria-label={`Delete ${filter.name}`}
          onClick={async () => {
            const result = await Swal.fire({
              icon: 'warning',
              title: 'Delete Filter',
              html: `Delete <strong>${filter.name}</strong>?<br><small class="text-muted">This cannot be undone.</small>`,
              showCancelButton: true,
              confirmButtonText: 'Yes, delete it',
              cancelButtonText: 'Cancel',
              confirmButtonColor: '#dc3545',
              cancelButtonColor: '#6c757d',
              reverseButtons: true,
            });
            if (!result.isConfirmed) return;
            onDeleteFilter(filter.id);
          }}
        >
          🗑️ Delete
        </Button>
      </div>
    </li>
  );
};

export { SortDropdown };
export type { SortOption, SortDropdownProps, IconRenderable, DropdownIconMap };
