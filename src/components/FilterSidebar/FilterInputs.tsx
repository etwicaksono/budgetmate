import React from 'react';
import { Form, InputGroup, Dropdown } from 'react-bootstrap';
import { FaSearch, FaTags, FaWallet, FaCheck, FaExchangeAlt, FaHandHoldingUsd, FaFileAlt, FaCoins } from 'react-icons/fa';
import AmountRangeFilter from '../AmountRangeFilter';
import { CategoryDropdown } from './CategoryDropdown';
import { AccountDropdown } from './AccountDropdown';
import { LabelMultiSelect } from '../transaction/LabelMultiSelect';
import { ClearButton } from '@/components/common/ClearButton';
import { renderIcon } from './FilterSidebar.utils';
import type { FilterSidebarProps } from './FilterSidebar.types';
import type { TransferOption, DebtOption, DraftOption, RecordTypeOption } from '@/hooks/useFilterData';

type FilterInputsProps = Pick<
  FilterSidebarProps,
  | 'filterVisibility'
  | 'searchTerm'
  | 'onSearchTermChange'
  | 'sortOption'
  | 'onSortOptionChange'
  | 'transferOption'
  | 'onTransferOptionChange'
  | 'debtOption'
  | 'onDebtOptionChange'
  | 'draftOption'
  | 'onDraftOptionChange'
  | 'recordTypeOption'
  | 'onRecordTypeOptionChange'
  | 'disableDraftFilter'
  | 'selectedCategories'
  | 'onSelectedCategoriesChange'
  | 'categoryTree'
  | 'parentCategoryColors'
  | 'categoryIcons'
  | 'allCategories'
  | 'selectedAccounts'
  | 'onSelectedAccountsChange'
  | 'accountTree'
  | 'accountColors'
  | 'accountIcons'
  | 'selectableAccounts'
  | 'selectedLabelIds'
  | 'onSelectedLabelIdsChange'
  | 'excludedLabelIds'
  | 'onExcludedLabelIdsChange'
  | 'labels'
  | 'minAmount'
  | 'maxAmount'
  | 'onMinAmountChange'
  | 'onMaxAmountChange'
  | 'SortDropdownComponent'
>;

export const FilterInputs: React.FC<FilterInputsProps> = ({
  filterVisibility = {
    search: true,
    sortBy: true,
    accounts: true,
    categories: true,
    labels: true,
    amountRange: true,
    transfers: true,
    debts: true,
  },
  searchTerm = '',
  onSearchTermChange = () => {},
  sortOption = 'timeDesc',
  onSortOptionChange = () => {},
  transferOption = 'include',
  onTransferOptionChange = () => {},
  debtOption = 'include',
  onDebtOptionChange = () => {},
  draftOption = 'exclude',
  onDraftOptionChange = () => {},
  recordTypeOption = 'all',
  onRecordTypeOptionChange = () => {},
  disableDraftFilter = false,
  selectedCategories = [],
  onSelectedCategoriesChange = () => {},
  categoryTree = {},
  parentCategoryColors = {},
  categoryIcons = {},
  allCategories = [],
  selectedAccounts = [],
  onSelectedAccountsChange = () => {},
  accountColors = {},
  accountIcons = {},
  selectableAccounts = [],
  selectedLabelIds = [],
  onSelectedLabelIdsChange = () => {},
  excludedLabelIds = [],
  onExcludedLabelIdsChange = () => {},
  labels = [],
  minAmount = 0,
  maxAmount = 20000000,
  onMinAmountChange = () => {},
  onMaxAmountChange = () => {},
  SortDropdownComponent,
}) => {
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Include and exclude must stay disjoint — a label present in both can never match.
  const handleSelectedLabelIdsChange = (labelIds: string[]) => {
    onSelectedLabelIdsChange(labelIds);
    onExcludedLabelIdsChange((prev) => prev.filter((id) => !labelIds.includes(id)));
  };

  const handleExcludedLabelIdsChange = (labelIds: string[]) => {
    onExcludedLabelIdsChange(labelIds);
    onSelectedLabelIdsChange((prev) => prev.filter((id) => !labelIds.includes(id)));
  };

  return (
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
              ref={searchInputRef}
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
                onClick={() => {
                  onSearchTermChange('');
                  searchInputRef.current?.focus();
                }}
              />
            )}
          </InputGroup>
        </Form.Group>
      )}

      {filterVisibility.sortBy && SortDropdownComponent && (
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
        <>
          <Form.Group className="mb-3" controlId="labelFilter">
            <Form.Label className="fw-semibold text-muted small">Labels</Form.Label>
            <LabelMultiSelect
              labels={labels}
              selectedLabelIds={selectedLabelIds}
              onChange={handleSelectedLabelIdsChange}
              placeholder="All labels"
            />
          </Form.Group>

          <Form.Group className="mb-4" controlId="excludeLabelFilter">
            <Form.Label className="fw-semibold text-muted small">Exclude labels</Form.Label>
            <LabelMultiSelect
              labels={labels}
              selectedLabelIds={excludedLabelIds}
              onChange={handleExcludedLabelIdsChange}
              placeholder="No excluded labels"
            />
          </Form.Group>
        </>
      )}

      {filterVisibility.recordTypes && (
        <Form.Group className="mb-4" controlId="recordTypeFilter">
          <Form.Label className="fw-semibold text-muted small">Record types</Form.Label>
          <Dropdown>
            <Dropdown.Toggle
              variant="outline-secondary"
              className="w-100 d-flex align-items-center justify-content-between"
              style={{ textAlign: 'left' }}
            >
              <span className="d-flex align-items-center gap-2">
                {renderIcon(FaCoins, { size: 14 })}
                <span className="d-inline-flex align-items-center gap-1">
                  {recordTypeOption === 'income'
                    ? 'Income only'
                    : recordTypeOption === 'expense'
                      ? 'Expense only'
                      : 'All types'}
                </span>
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu className="w-100 p-1">
              {[
                { label: 'All types', value: 'all' },
                { label: 'Income', value: 'income' },
                { label: 'Expense', value: 'expense' },
              ].map((option) => {
                const isSelected = recordTypeOption === option.value;
                return (
                  <Dropdown.Item
                    key={option.value}
                    as="button"
                    type="button"
                    className={`d-flex align-items-center gap-2 w-100 bg-white ${
                      isSelected ? 'selected' : ''
                    }`}
                    style={isSelected ? { backgroundColor: '#e9ecef' } : {}}
                    onClick={() => onRecordTypeOptionChange(option.value as RecordTypeOption)}
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

      {filterVisibility.amountRange && (
        <Form.Group className="mb-4" controlId="amountFilter">
          <AmountRangeFilter
            minAmount={minAmount}
            maxAmount={maxAmount}
            onMinAmountChange={onMinAmountChange}
            onMaxAmountChange={onMaxAmountChange}
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
                    onClick={() => onTransferOptionChange(option.value as TransferOption)}
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
                    onClick={() => onDebtOptionChange(option.value as DebtOption)}
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

      {filterVisibility.drafts && !disableDraftFilter && (
        <Form.Group className="mb-2" controlId="draftFilter">
          <Form.Label className="fw-semibold text-muted small">Drafts</Form.Label>
          <Dropdown>
            <Dropdown.Toggle
              variant="outline-secondary"
              className="w-100 d-flex align-items-center justify-content-between"
              style={{ textAlign: 'left' }}
            >
              <span className="d-flex align-items-center gap-2">
                {renderIcon(FaFileAlt, { size: 14 })}
                <span className="d-inline-flex align-items-center gap-1">
                  {draftOption === 'include'
                    ? 'Include drafts'
                    : draftOption === 'only'
                      ? 'Only drafts'
                      : 'Exclude drafts'}
                </span>
              </span>
            </Dropdown.Toggle>
            <Dropdown.Menu className="w-100 p-1">
              {[
                { label: 'Include drafts', value: 'include' },
                { label: 'Only drafts', value: 'only' },
                { label: 'Exclude drafts', value: 'exclude' },
              ].map((option) => {
                const isSelected = draftOption === option.value;
                return (
                  <Dropdown.Item
                    key={option.value}
                    as="button"
                    type="button"
                    className={`d-flex align-items-center gap-2 w-100 bg-white ${
                      isSelected ? 'selected' : ''
                    }`}
                    style={isSelected ? { backgroundColor: '#e9ecef' } : {}}
                    onClick={() => onDraftOptionChange(option.value as DraftOption)}
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
  );
};
