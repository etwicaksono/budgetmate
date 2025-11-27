import React, { createElement, useState, useMemo } from 'react';
import type { ComponentType } from 'react';
import { Card, Button, Form, InputGroup, Dropdown } from 'react-bootstrap';
import {
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
  FaMoneyBillWave,
} from 'react-icons/fa';
import { RiListSettingsLine } from 'react-icons/ri';
import type { IconType, IconBaseProps } from 'react-icons';
import AmountRangeFilter from '../AmountRangeFilter';
import { CategoryDropdown } from './CategoryDropdown';
import { AccountDropdown } from './AccountDropdown';
import { LabelMultiSelect } from '../transaction/LabelMultiSelect';
import type { Label } from '@/services/labelService';
import type { SortValue, FilterVisibility } from '@/hooks/useFilterData';
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

interface DesktopFilterSidebarProps {
  title: string;
  filterVisibility?: FilterVisibility;
  onFilterVisibilityChange?: React.Dispatch<React.SetStateAction<FilterVisibility>>;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  sortOption?: SortValue;
  onSortOptionChange?: React.Dispatch<React.SetStateAction<SortValue>>;
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
}

const noop = () => {};
const noopDispatch: React.Dispatch<React.SetStateAction<string[]>> = () => {};
const noopSortDispatch: React.Dispatch<React.SetStateAction<SortValue>> = () => {};
const noopFilterVisibilityDispatch: React.Dispatch<React.SetStateAction<FilterVisibility>> =
  () => {};

export const DesktopFilterSidebar: React.FC<DesktopFilterSidebarProps> = ({
  title,
  filterVisibility = {
    search: true,
    sortBy: true,
    accounts: true,
    categories: true,
    labels: true,
    amountRange: true,
    currencies: true,
  },
  onFilterVisibilityChange = noopFilterVisibilityDispatch,
  searchTerm = '',
  onSearchTermChange = noop,
  sortOption = 'timeDesc',
  onSortOptionChange = noopSortDispatch,
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
}) => {
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const handleResetFilters = () => {
    onSearchTermChange('');
    onSortOptionChange('timeDesc' as SortValue);
    onSelectedCategoriesChange([]);
    onSelectedAccountsChange([]);
    onSelectedLabelIdsChange([]);
    onSelectedCurrenciesChange([]);
    onMinAmountChange(0);
    onMaxAmountChange(20000000);
  };

  return (
    <Card>
      <Card.Header className="d-flex align-items-center justify-content-between">
        <span className="h3 mb-0">{title}</span>
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
                width: '40px',
                height: '40px',
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
              {renderIcon(RiListSettingsLine, { size: 24, color: '#6b7280' })}
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
                width: '40px',
                height: '40px',
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
              {renderIcon(FaPlus, { size: 18 })}
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body>
        <Form>
          {filterVisibility.search && (
            <Form.Group className="mb-3" controlId="searchTerm">
              <Form.Label>Search</Form.Label>
              <InputGroup>
                <InputGroup.Text 
                  className="search-input-icon"
                  style={{ backgroundColor: '#fff', borderRight: 'none' }}
                >
                  {renderIcon(FaSearch, { size: 14 })}
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
                />
                {searchTerm && (
                  <Button
                    variant="light"
                    className="clear-search-btn"
                    onClick={() => {
                      onSearchTermChange('');
                    }}
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
              <SortDropdownComponent
                id="sortOption"
                value={sortOption}
                onChange={(value) => onSortOptionChange(value)}
              />
            </Form.Group>
          )}

          {filterVisibility.categories && (
            <Form.Group className="mb-3" controlId="categoryFilter">
              <Form.Label>Category</Form.Label>
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
                clearSelectedLabel="Clear"
                isSingleSelect={false}
              />
            </Form.Group>
          )}

          {filterVisibility.accounts && (
            <Form.Group className="mb-3" controlId="accountFilter">
              <Form.Label>Account</Form.Label>
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
                clearSelectedLabel="Clear accounts"
                isSingleSelect={false}
              />
            </Form.Group>
          )}

          {filterVisibility.labels && (
            <Form.Group className="mb-3" controlId="labelFilter">
              <Form.Label>Labels</Form.Label>
              <LabelMultiSelect
                labels={labels}
                selectedLabelIds={selectedLabelIds}
                onChange={onSelectedLabelIdsChange}
                placeholder="All labels"
              />
            </Form.Group>
          )}

          {filterVisibility.currencies && availableCurrencies.length > 0 && (
            <Form.Group className="mb-3" controlId="currencyFilter">
              <Form.Label>Currency</Form.Label>
              <Dropdown>
                <Dropdown.Toggle
                  variant="outline-secondary"
                  className="w-100 d-flex align-items-center justify-content-between"
                  style={{ textAlign: 'left' }}
                >
                  <span className="d-flex align-items-center gap-2">
                    {renderIcon(FaMoneyBillWave, { size: 14 })}
                    <span>
                      {selectedCurrencies.length === 0
                        ? 'All currencies'
                        : selectedCurrencies.length === 1
                          ? selectedCurrencies[0]
                          : `${selectedCurrencies.length} currencies`}
                    </span>
                  </span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="w-100 p-2">
                  {availableCurrencies.map((currency) => (
                    <Form.Check
                      key={currency}
                      type="checkbox"
                      id={`currency-${currency}`}
                      label={currency}
                      checked={selectedCurrencies.includes(currency)}
                      onChange={() => {
                        if (selectedCurrencies.includes(currency)) {
                          onSelectedCurrenciesChange(selectedCurrencies.filter((c) => c !== currency));
                        } else {
                          onSelectedCurrenciesChange([...selectedCurrencies, currency]);
                        }
                      }}
                      className="mb-1"
                    />
                  ))}
                  {selectedCurrencies.length > 0 && (
                    <>
                      <Dropdown.Divider />
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-secondary"
                        onClick={() => onSelectedCurrenciesChange([])}
                      >
                        Clear
                      </Button>
                    </>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </Form.Group>
          )}

          {filterVisibility.amountRange && (
            <AmountRangeFilter
              minAmount={minAmount}
              maxAmount={maxAmount}
              onMinAmountChange={onMinAmountChange}
              onMaxAmountChange={onMaxAmountChange}
              currency="IDR"
              minLimit={0}
              maxLimit={20000000}
              step={100000}
              controlId="amountFilter"
            />
          )}
        </Form>
        <div className="d-grid mt-3">
          <Button variant="outline-secondary" onClick={handleResetFilters}>
            Reset filters
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export { SortDropdown };
export type { SortOption, SortDropdownProps, IconRenderable, DropdownIconMap };
