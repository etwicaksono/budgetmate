import React from 'react';
import { Card } from 'react-bootstrap';
import { FilterHeader } from './FilterHeader';
import { SavedFiltersManager } from './SavedFiltersManager';
import { FilterInputs } from './FilterInputs';
import { SortDropdown as DefaultSortDropdown } from './SortDropdown';
import type { FilterSidebarProps, SortValue } from './FilterSidebar.types';
import './FilterSidebar.css';

export const FilterSidebar: React.FC<FilterSidebarProps> = (props) => {
  const handleResetFilters = () => {
    if (props.onSearchTermChange) props.onSearchTermChange('');
    if (props.onSortOptionChange) props.onSortOptionChange('timeDesc' as SortValue);
    if (props.onTransferOptionChange) props.onTransferOptionChange('include');
    if (props.onDebtOptionChange) props.onDebtOptionChange('include');
    if (props.onRecordTypeOptionChange) props.onRecordTypeOptionChange('all');
    if (props.onSelectedCategoriesChange) props.onSelectedCategoriesChange([]);
    if (props.onSelectedAccountsChange) props.onSelectedAccountsChange([]);
    if (props.onSelectedLabelIdsChange) props.onSelectedLabelIdsChange([]);
    if (props.onExcludedLabelIdsChange) props.onExcludedLabelIdsChange([]);
    if (props.onSelectedCurrenciesChange) props.onSelectedCurrenciesChange([]);
    if (props.onMinAmountChange) props.onMinAmountChange(0);
    if (props.onMaxAmountChange) props.onMaxAmountChange(20000000);
  };

  return (
    <Card className="desktop-filter-sidebar shadow-sm border-0">
      <FilterHeader {...props} />

      <Card.Body className="overflow-auto pb-2" style={{ flex: '1 1 auto' }}>
        <SavedFiltersManager {...props} handleResetFilters={handleResetFilters} />

        <FilterInputs
          {...props}
          SortDropdownComponent={props.SortDropdownComponent || DefaultSortDropdown}
        />
      </Card.Body>

      <Card.Footer className="bg-white border-top p-3 mt-auto">
        <button
          type="button"
          className="btn btn-outline-secondary w-100 fw-medium"
          onClick={handleResetFilters}
        >
          Reset all filters
        </button>
      </Card.Footer>
    </Card>
  );
};
