'use client';

import { Button, Col, Offcanvas } from 'react-bootstrap';
import { FilterSidebar } from '@/components/FilterSidebar';
import type { useFilterData } from '@/hooks/useFilterData';
import type { useSavedFilters } from '@/hooks/useSavedFilters';

/**
 * Groups all props consumed by FilterSidebar, derived from hook return types.
 * Avoids passing 44 flat props directly at the call site.
 */
interface TransactionFilterSidebarProps {
  /** Return value of useFilterData() */
  filterData: ReturnType<typeof useFilterData>;
  /** Return value of useSavedFilters() */
  savedFiltersData: ReturnType<typeof useSavedFilters>;
  /** Mobile Offcanvas visibility */
  showMobile: boolean;
  /** Mobile Offcanvas close handler */
  onHideMobile: () => void;
}

/**
 * Renders the transaction filter sidebar for both:
 * - Desktop: sticky left column (d-none d-lg-block)
 * - Mobile: slide-in Offcanvas (d-lg-none)
 *
 * Eliminates the 44-prop repetition that previously existed at both call sites.
 */
export function TransactionFilterSidebar({
  filterData,
  savedFiltersData,
  showMobile,
  onHideMobile,
}: TransactionFilterSidebarProps) {
  const {
    filterVisibility, setFilterVisibility,
    searchTerm, setSearchTerm,
    sortOption, setSortOption,
    transferOption, setTransferOption,
    debtOption, setDebtOption,
    draftOption, setDraftOption,
    selectedCategories, setSelectedCategories,
    allCategories, categoryTree, parentCategoryColors, categoryIcons,
    selectedAccounts, setSelectedAccounts,
    selectableAccounts, accountColors, accountIcons,
    selectedLabelIds, setSelectedLabelIds,
    excludedLabelIds, setExcludedLabelIds,
    labels,
    selectedCurrencies, setSelectedCurrencies,
    availableCurrencies,
    minAmount, setMinAmount,
    maxAmount, setMaxAmount,
  } = filterData;

  const {
    savedFilters,
    activeFilterId,
    loading: savedFiltersLoading,
    saveCurrentFilter,
    updateCurrentFilter,
    loadFilter,
    deleteFilter,
    renameFilter,
    clearActiveFilter,
    reorderFilter,
  } = savedFiltersData;

  const sharedProps = {
    title: 'Transactions',
    filterVisibility,
    onFilterVisibilityChange: setFilterVisibility,
    searchTerm,
    onSearchTermChange: setSearchTerm,
    sortOption,
    onSortOptionChange: setSortOption,
    transferOption,
    onTransferOptionChange: setTransferOption,
    debtOption,
    onDebtOptionChange: setDebtOption,
    draftOption,
    onDraftOptionChange: setDraftOption,
    selectedCategories,
    onSelectedCategoriesChange: setSelectedCategories,
    allCategories,
    categoryTree,
    parentCategoryColors,
    categoryIcons,
    selectedAccounts,
    onSelectedAccountsChange: setSelectedAccounts,
    selectableAccounts,
    accountColors,
    accountIcons,
    selectedLabelIds,
    onSelectedLabelIdsChange: setSelectedLabelIds,
    excludedLabelIds,
    onExcludedLabelIdsChange: setExcludedLabelIds,
    labels,
    selectedCurrencies,
    onSelectedCurrenciesChange: setSelectedCurrencies,
    availableCurrencies,
    minAmount,
    maxAmount,
    onMinAmountChange: setMinAmount,
    onMaxAmountChange: setMaxAmount,
    savedFilters,
    activeFilterId,
    savedFiltersLoading,
    onSaveFilter: saveCurrentFilter,
    onUpdateFilter: updateCurrentFilter,
    onLoadFilter: loadFilter,
    onDeleteFilter: deleteFilter,
    onRenameFilter: renameFilter,
    onClearActiveFilter: clearActiveFilter,
    onReorderFilter: reorderFilter,
  };

  return (
    <>
      {/* Desktop: sticky left column */}
      <Col lg={3} className="d-none d-lg-block">
        <FilterSidebar {...sharedProps} />
      </Col>

      {/* Mobile: slide-in Offcanvas */}
      <Offcanvas
        show={showMobile}
        onHide={onHideMobile}
        placement="end"
        className="d-lg-none"
        style={{ display: 'flex', flexDirection: 'column' }}
      >
        <Offcanvas.Header closeButton className="border-bottom">
          <Offcanvas.Title className="fw-bold">Filters</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="p-0" style={{ overflowY: 'auto', flex: 1 }}>
          <FilterSidebar {...sharedProps} />
        </Offcanvas.Body>
        {/* Sticky footer — mobile only */}
        <div
          className="border-top p-3"
          style={{ flexShrink: 0, backgroundColor: 'var(--bs-body-bg, #fff)' }}
        >
          <Button
            variant="primary"
            className="w-100"
            onClick={onHideMobile}
          >
            Show Result
          </Button>
        </div>
      </Offcanvas>
    </>
  );
}
