import React, { createElement, useState, useMemo } from 'react';
import type { ComponentType } from 'react';
import { Card, Button, Form, InputGroup, Dropdown } from 'react-bootstrap';
import {
  FaFilter,
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
import { RiListSettingsLine } from 'react-icons/ri';
import type { IconType, IconBaseProps } from 'react-icons';
import AmountRangeFilter from '../../../components/AmountRangeFilter';
import { CategoryDropdown } from '../CategoryDropdown';
import type { FilterVisibility } from './MobileFilterOffcanvas';

type IconRenderable = IconType | ComponentType<IconBaseProps>;
type DropdownIconMap = Record<
  string,
  IconType | ComponentType<{ className?: string; size?: number }> | undefined
>;

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

export const renderIcon = (
  IconComponent: IconRenderable | null | undefined,
  props: IconBaseProps = {}
): React.ReactNode => {
  if (!IconComponent) {
    return null;
  }
  return createElement(IconComponent as ComponentType<IconBaseProps>, props);
};

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

interface DesktopFilterSidebarProps {
  title: string;
  filterVisibility?: FilterVisibility;
  onFilterVisibilityChange?: React.Dispatch<React.SetStateAction<FilterVisibility>>;
  searchTerm?: string;
  onSearchTermChange?: (value: string) => void;
  sortOption?: SortValue;
  onSortOptionChange?: (value: SortValue) => void;
  selectedCategories?: string[];
  onSelectedCategoriesChange?: React.Dispatch<React.SetStateAction<string[]>>;
  categoryTree?: Record<string, string[]>;
  parentCategoryColors?: Record<string, string>;
  categoryIcons?: DropdownIconMap;
  allCategories?: string[];
  selectedAccounts?: string[];
  onSelectedAccountsChange?: React.Dispatch<React.SetStateAction<string[]>>;
  accountTree?: Record<string, string[]>;
  accountColors?: Record<string, string>;
  accountIcons?: DropdownIconMap;
  selectableAccounts?: string[];
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

export function DesktopFilterSidebar({
  title,
  filterVisibility = {
    search: true,
    sortBy: true,
    accounts: true,
    categories: true,
    amountRange: true,
  },
  onFilterVisibilityChange = noopDispatch as any,
  searchTerm = '',
  onSearchTermChange = noop,
  sortOption = 'timeDesc',
  onSortOptionChange = noop,
  selectedCategories = [],
  onSelectedCategoriesChange = noopDispatch,
  categoryTree = {},
  parentCategoryColors = {},
  categoryIcons = {},
  allCategories = [],
  selectedAccounts = [],
  onSelectedAccountsChange = noopDispatch,
  accountTree = {},
  accountColors = {},
  accountIcons = {},
  selectableAccounts = [],
  minAmount = 0,
  maxAmount = 20000000,
  onMinAmountChange = noop,
  onMaxAmountChange = noop,
  onShowTransactionModal = noop,
  showAddTransactionButton = false,
  SortDropdownComponent = SortDropdown,
}: DesktopFilterSidebarProps): JSX.Element {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  return (
    <Card>
      <Card.Header className="d-flex align-items-center justify-content-between">
        <span className="h3 mb-0">{title}</span>
        <div className="d-flex gap-2">
          <Dropdown show={showFilterPanel} onToggle={(isOpen) => setShowFilterPanel(isOpen)}>
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
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
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
                  onChange={() => onFilterVisibilityChange(prev => ({ ...prev, search: !prev.search }))}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
                <Form.Check
                  type="checkbox"
                  id="filter-sortBy"
                  label="Sort By"
                  checked={filterVisibility.sortBy}
                  onChange={() => onFilterVisibilityChange(prev => ({ ...prev, sortBy: !prev.sortBy }))}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
                <Form.Check
                  type="checkbox"
                  id="filter-categories"
                  label="Categories"
                  checked={filterVisibility.categories}
                  onChange={() => onFilterVisibilityChange(prev => ({ ...prev, categories: !prev.categories }))}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
                <Form.Check
                  type="checkbox"
                  id="filter-accounts"
                  label="Accounts"
                  checked={filterVisibility.accounts}
                  onChange={() => onFilterVisibilityChange(prev => ({ ...prev, accounts: !prev.accounts }))}
                  style={{ marginBottom: '10px', fontSize: '14px' }}
                  className="custom-widget-checkbox"
                />
                <Form.Check
                  type="checkbox"
                  id="filter-amountRange"
                  label="Amount Range"
                  checked={filterVisibility.amountRange}
                  onChange={() => onFilterVisibilityChange(prev => ({ ...prev, amountRange: !prev.amountRange }))}
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
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
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
                <InputGroup.Text className="search-input-icon">
                  {renderIcon(FaSearch, { size: 14 })}
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search transactions"
                  value={searchTerm}
                  onChange={(event) => onSearchTermChange(event.target.value)}
                  autoComplete="off"
                />
                {searchTerm && (
                  <Button
                    variant="light"
                    className="clear-search-btn"
                    onClick={() => onSearchTermChange('')}
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
                onChange={onSortOptionChange}
              />
            </Form.Group>
          )}

          {filterVisibility.categories && (() => {
            console.log('🎨 DesktopFilterSidebar - Rendering CategoryDropdown with props:', {
              categoryTreeKeys: Object.keys(categoryTree),
              categoryTreeEntries: Object.entries(categoryTree).slice(0, 3),
              allCategoriesLength: allCategories.length,
              allCategories: allCategories.slice(0, 10),
              parentCategoryColorsKeys: Object.keys(parentCategoryColors),
              categoryIconsKeys: Object.keys(categoryIcons),
            });
            return (
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
                />
              </Form.Group>
            );
          })()}

          {filterVisibility.accounts && (
            <Form.Group className="mb-3" controlId="accountFilter">
              <Form.Label>Account</Form.Label>
              <CategoryDropdown
                selectedCategories={selectedAccounts}
                setSelectedCategories={onSelectedAccountsChange}
                categoryTree={accountTree}
                parentCategoryColors={accountColors}
                categoryIcons={accountIcons}
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
      </Card.Body>
    </Card>
  );
}

export { SortDropdown };
export type { SortValue, SortOption, SortDropdownProps, IconRenderable, DropdownIconMap };
