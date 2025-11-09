import React, { createElement } from 'react';
import type { ComponentType } from 'react';
import { Offcanvas, Form, InputGroup, Button } from 'react-bootstrap';
// TODO: Revisit mobile filter offcanvas for new responsive layout.
import { FaSearch, FaTimes, FaTags, FaWallet } from 'react-icons/fa';
import type { IconType, IconBaseProps } from 'react-icons';
import AmountRangeFilter from '../../../components/AmountRangeFilter';
import { CategoryDropdown } from '../CategoryDropdown';

type IconRenderable = IconType | ComponentType<IconBaseProps>;
type DropdownIconMap = Record<
  string,
  IconType | ComponentType<{ className?: string; size?: number }> | undefined
>;

interface FilterVisibility {
  search: boolean;
  sortBy: boolean;
  accounts: boolean;
  categories: boolean;
  amountRange: boolean;
}

type SortValue =
  | 'timeAsc'
  | 'timeDesc'
  | 'amountAsc'
  | 'amountDesc'
  | 'absAmountAsc'
  | 'absAmountDesc';

interface SortDropdownProps {
  id: string;
  value: SortValue;
  onChange?: (value: SortValue) => void;
}

interface MobileFilterOffcanvasProps {
  show: boolean;
  onHide: () => void;
  filterVisibility: FilterVisibility;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  sortOption: SortValue;
  onSortOptionChange: (value: SortValue) => void;
  selectedCategories: string[];
  onSelectedCategoriesChange: React.Dispatch<React.SetStateAction<string[]>>;
  categoryTree: Record<string, string[]>;
  parentCategoryColors: Record<string, string>;
  categoryIcons: DropdownIconMap;
  allCategories: string[];
  selectedAccounts: string[];
  onSelectedAccountsChange: React.Dispatch<React.SetStateAction<string[]>>;
  accountTree: Record<string, string[]>;
  accountColors: Record<string, string>;
  accountIcons: DropdownIconMap;
  selectableAccounts: string[];
  minAmount: number;
  maxAmount: number;
  onMinAmountChange: (value: number) => void;
  onMaxAmountChange: (value: number) => void;
  SortDropdownComponent: React.ComponentType<SortDropdownProps>;
}

const renderIcon = (
  IconComponent: IconRenderable | null | undefined,
  props: IconBaseProps = {}
): React.ReactNode => {
  if (!IconComponent) {
    return null;
  }
  return createElement(IconComponent as ComponentType<IconBaseProps>, props);
};

export function MobileFilterOffcanvas({
  show,
  onHide,
  filterVisibility,
  searchTerm,
  onSearchTermChange,
  sortOption,
  onSortOptionChange,
  selectedCategories,
  onSelectedCategoriesChange,
  categoryTree,
  parentCategoryColors,
  categoryIcons,
  allCategories,
  selectedAccounts,
  onSelectedAccountsChange,
  accountTree,
  accountColors,
  accountIcons,
  selectableAccounts,
  minAmount,
  maxAmount,
  onMinAmountChange,
  onMaxAmountChange,
  SortDropdownComponent,
}: MobileFilterOffcanvasProps): JSX.Element {
  return (
    <Offcanvas show={show} onHide={onHide} placement="end" className="d-lg-none">
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
            <Form.Group className="mb-3" controlId="sortOptionMobile">
              <Form.Label>Sort by</Form.Label>
              <SortDropdownComponent
                id="sortOptionMobile"
                value={sortOption}
                onChange={onSortOptionChange}
              />
            </Form.Group>
          )}

          {filterVisibility.categories && (
            <Form.Group className="mb-3" controlId="categoryFilterMobile">
              <Form.Label>Category</Form.Label>
              <CategoryDropdown
                selectedCategories={selectedCategories}
                setSelectedCategories={onSelectedCategoriesChange}
                categoryTree={categoryTree}
                parentCategoryColors={parentCategoryColors}
                categoryIcons={categoryIcons}
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
              controlId="amountFilterMobile"
            />
          )}
        </Form>
      </Offcanvas.Body>
    </Offcanvas>
  );
}

export type { FilterVisibility, SortValue };
