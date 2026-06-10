'use client';

import React, { useCallback, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Container, Row, Col, Nav, Offcanvas, Button, Dropdown } from 'react-bootstrap';
import { FaFilter } from 'react-icons/fa';
import { useFilterData } from '@/hooks/useFilterData';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { FilterSidebar } from '@/components/FilterSidebar';
import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '@/components/period/PeriodNavigation';
import PeriodRangeSelector from '@/components/period/PeriodRangeSelector';
import IncomesExpensesReport from '@/components/analytics/IncomesExpensesReport';
import BalanceTrendReport from '@/components/analytics/BalanceTrendReport';
import CashFlowReport from '@/components/analytics/CashFlowReport';
import AdvancedChartsReport from '@/components/analytics/AdvancedChartsReport';
import AIChatPanel from '@/components/analytics/AIChatPanel';
import type { ContextSnapshot } from '@/lib/ai/types';
import { useAuth } from '@/context/AuthContext';

type TabKey = 'income-expense' | 'balance-trend' | 'cash-flow' | 'advanced-charts';

const VALID_TABS: TabKey[] = ['income-expense', 'balance-trend', 'cash-flow', 'advanced-charts'];

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'income-expense', label: 'Incomes & Expenses Report', icon: '📊' },
  { key: 'balance-trend', label: 'Balance Trend', icon: '📈' },
  { key: 'cash-flow', label: 'Cash flow', icon: '💰' },
  { key: 'advanced-charts', label: 'Advanced Charts and Reports', icon: '📉' },
];

function AnalyticsContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  // Get active tab from URL, default to 'income-expense'
  const tabParam = searchParams.get('tab');
  const activeTab: TabKey = VALID_TABS.includes(tabParam as TabKey) ? (tabParam as TabKey) : 'income-expense';

  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const setActiveTab = useCallback((tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [searchParams, router, pathname]);

  const {
    state: { dateRange, periodLabel, activePeriod, customRangeDraft },
  } = usePeriodNavigation();

  const {
    searchTerm,
    setSearchTerm,
    selectedCategories,
    setSelectedCategories,
    selectedAccounts,
    setSelectedAccounts,
    selectedCurrencies,
    setSelectedCurrencies,
    availableCurrencies,
    sortOption,
    setSortOption,
    transferOption,
    setTransferOption,
    debtOption,
    setDebtOption,
    draftOption,
    setDraftOption,
    minAmount,
    setMinAmount,
    maxAmount,
    setMaxAmount,
    filterVisibility,
    setFilterVisibility,
    allCategories,
    selectableAccounts,
    parentCategoryColors,
    categoryTree,
    categoryIcons,
    accountColors,
    accountIcons,
    categories,
    apiAccounts,
    selectedLabelIds,
    setSelectedLabelIds,
    labels,
    numberOfColumns,
    setNumberOfColumns,
  } = useFilterData();

  const { savedFilters, activeFilterId, loading: savedFiltersLoading, saveCurrentFilter, loadFilter, deleteFilter, renameFilter, clearActiveFilter, reorderFilter } = useSavedFilters({
    categories,
    accounts: apiAccounts,
    current: { selectedCategories, selectedAccounts, selectedCurrencies, selectedLabelIds, sortOption, transferOption, debtOption, draftOption },
    dispatchers: { setSelectedCategories, setSelectedAccounts, setSelectedCurrencies, setSelectedLabelIds, setSortOption, setTransferOption, setDebtOption, setDraftOption },
  });

  // Map selected names to IDs for API calls
  const selectedCategoryIds = React.useMemo(() => {
    if (!selectedCategories.length || !categories.length) return [];
    return categories
      .filter(cat => selectedCategories.includes(cat.name))
      .map(cat => cat.id);
  }, [selectedCategories, categories]);

  const selectedAccountIds = React.useMemo(() => {
    if (!selectedAccounts.length || !apiAccounts.length) return [];
    return apiAccounts
      .filter(acc => selectedAccounts.includes(acc.name))
      .map(acc => acc.id);
  }, [selectedAccounts, apiAccounts]);

  // Build context snapshot for AIChatPanel from current filter state
  const buildContextSnapshot = React.useCallback((): ContextSnapshot => {
    const activeFilter = savedFilters.find(f => f.id === activeFilterId);
    return {
      activeTab,
      ...(dateRange.start ? { startDate: new Date(dateRange.start + 'T00:00:00').toISOString() } : {}),
      ...(dateRange.end ? { endDate: new Date(dateRange.end + 'T23:59:59').toISOString() } : {}),
      categoryIds: selectedCategoryIds,
      accountIds: selectedAccountIds,
      currencies: selectedCurrencies,
      periodLabel,
      periodType: activePeriod.type,
      searchTerm,
      minAmount,
      maxAmount,
      transferOption,
      debtOption,
      sortOption,
      selectedLabelIds,
      ...(activeFilterId && { filterId: activeFilterId }),
      ...(activeFilter && { filterName: activeFilter.name }),
      numberOfColumns,
    };
  }, [
    activeTab, dateRange, selectedCategoryIds, selectedAccountIds, selectedCurrencies, 
    periodLabel, activePeriod.type, searchTerm, minAmount, maxAmount, transferOption, 
    debtOption, sortOption, selectedLabelIds, activeFilterId, savedFilters, numberOfColumns
  ]);

  // Restore filters from a saved session context snapshot
  const handleRestoreContext = React.useCallback((snapshot: ContextSnapshot) => {
    // Restore category selections (map IDs back to names)
    if (snapshot.categoryIds?.length && categories.length) {
      const names = categories.filter(c => snapshot.categoryIds.includes(c.id)).map(c => c.name);
      setSelectedCategories(names);
    } else {
      setSelectedCategories([]);
    }
    // Restore account selections
    if (snapshot.accountIds?.length && apiAccounts.length) {
      const names = apiAccounts.filter(a => snapshot.accountIds.includes(a.id)).map(a => a.name);
      setSelectedAccounts(names);
    } else {
      setSelectedAccounts([]);
    }
    // Restore currencies
    setSelectedCurrencies(snapshot.currencies ?? []);
    
    // Restore advanced filters
    if (snapshot.searchTerm !== undefined) setSearchTerm(snapshot.searchTerm);
    if (snapshot.minAmount !== undefined) setMinAmount(snapshot.minAmount);
    if (snapshot.maxAmount !== undefined) setMaxAmount(snapshot.maxAmount);
    if (snapshot.transferOption) setTransferOption(snapshot.transferOption as any);
    if (snapshot.debtOption) setDebtOption(snapshot.debtOption as any);
    if (snapshot.sortOption) setSortOption(snapshot.sortOption as any);
    if (snapshot.selectedLabelIds) setSelectedLabelIds(snapshot.selectedLabelIds);
    if (snapshot.numberOfColumns !== undefined) setNumberOfColumns(snapshot.numberOfColumns);
  }, [categories, apiAccounts, setSelectedCategories, setSelectedAccounts, setSelectedCurrencies, setSearchTerm, setMinAmount, setMaxAmount, setTransferOption, setDebtOption, setSortOption, setSelectedLabelIds, setNumberOfColumns]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'income-expense': {
        const startDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
        const endDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;
        return (
          <IncomesExpensesReport
            {...(startDate && { startDate })}
            {...(endDate && { endDate })}
            periodType={activePeriod.type}
            selectedCategories={selectedCategoryIds}
            selectedAccounts={selectedAccountIds}
            selectedCurrencies={selectedCurrencies}
            numberOfColumns={numberOfColumns}
            onNumberOfColumnsChange={setNumberOfColumns}
          />
        );
      }
      case 'balance-trend': {
        const balanceStartDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
        const balanceEndDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;
        return (
          <BalanceTrendReport
            {...(balanceStartDate && { startDate: balanceStartDate })}
            {...(balanceEndDate && { endDate: balanceEndDate })}
            periodLabel={periodLabel.toUpperCase()}
            selectedCategories={selectedCategoryIds}
            selectedAccounts={selectedAccountIds}
            selectedCurrencies={selectedCurrencies}
          />
        );
      }
      case 'cash-flow': {
        const cashFlowStartDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
        const cashFlowEndDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;
        return (
          <CashFlowReport
            {...(cashFlowStartDate && { startDate: cashFlowStartDate })}
            {...(cashFlowEndDate && { endDate: cashFlowEndDate })}
            {...(searchTerm && { searchTerm })}
            {...(minAmount > 0 && { minAmount })}
            {...(maxAmount < 20000000 && { maxAmount })}
            periodLabel={periodLabel.toUpperCase()}
            selectedCategories={selectedCategoryIds}
            selectedAccounts={selectedAccountIds}
            selectedCurrencies={selectedCurrencies}
          />
        );
      }
      case 'advanced-charts': {
        const advancedStartDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
        const advancedEndDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;
        return (
          <AdvancedChartsReport
            {...(advancedStartDate && { startDate: advancedStartDate })}
            {...(advancedEndDate && { endDate: advancedEndDate })}
            {...(searchTerm && { searchTerm })}
            {...(minAmount > 0 && { minAmount })}
            {...(maxAmount < 20000000 && { maxAmount })}
            selectedCategories={selectedCategoryIds}
            selectedAccounts={selectedAccountIds}
            selectedCurrencies={selectedCurrencies}
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <Container fluid>
      <Row>
        {/* Desktop Filter Sidebar */}
        <Col lg={3} className="mb-3 d-none d-lg-block">
          <FilterSidebar
            title="Analytics"
            filterVisibility={filterVisibility}
            onFilterVisibilityChange={setFilterVisibility}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            sortOption={sortOption}
            onSortOptionChange={setSortOption}
            transferOption={transferOption}
            onTransferOptionChange={setTransferOption}
            debtOption={debtOption}
            onDebtOptionChange={setDebtOption}
            selectedCategories={selectedCategories}
            onSelectedCategoriesChange={setSelectedCategories}
            allCategories={allCategories}
            categoryTree={categoryTree}
            parentCategoryColors={parentCategoryColors}
            categoryIcons={categoryIcons}
            selectedAccounts={selectedAccounts}
            onSelectedAccountsChange={setSelectedAccounts}
            selectableAccounts={selectableAccounts}
            accountColors={accountColors}
            accountIcons={accountIcons}
            minAmount={minAmount}
            maxAmount={maxAmount}
            onMinAmountChange={setMinAmount}
            onMaxAmountChange={setMaxAmount}
            selectedCurrencies={selectedCurrencies}
            onSelectedCurrenciesChange={setSelectedCurrencies}
            availableCurrencies={availableCurrencies}
            savedFilters={savedFilters}
            activeFilterId={activeFilterId}
            savedFiltersLoading={savedFiltersLoading}
            onSaveFilter={saveCurrentFilter}
            onLoadFilter={loadFilter}
            onDeleteFilter={deleteFilter}
            onRenameFilter={renameFilter}
            onClearActiveFilter={clearActiveFilter}
            onReorderFilter={reorderFilter}
            disableDraftFilter={true}
          />
        </Col>

        {/* Main Content */}
        <Col lg={9} className="p-0">
          {/* Mobile Filter Offcanvas */}
          <Offcanvas
            show={showMobileFilters}
            onHide={() => setShowMobileFilters(false)}
            placement="end"
            className="d-lg-none"
          >
            <Offcanvas.Header closeButton className="border-bottom">
              <Offcanvas.Title className="fw-bold">Filters</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body className="p-0">
              <FilterSidebar
                title="Analytics"
                filterVisibility={filterVisibility}
                onFilterVisibilityChange={setFilterVisibility}
                searchTerm={searchTerm}
                onSearchTermChange={setSearchTerm}
                sortOption={sortOption}
                onSortOptionChange={setSortOption}
                transferOption={transferOption}
                onTransferOptionChange={setTransferOption}
                debtOption={debtOption}
                onDebtOptionChange={setDebtOption}
                selectedCategories={selectedCategories}
                onSelectedCategoriesChange={setSelectedCategories}
                allCategories={allCategories}
                categoryTree={categoryTree}
                parentCategoryColors={parentCategoryColors}
                categoryIcons={categoryIcons}
                selectedAccounts={selectedAccounts}
                onSelectedAccountsChange={setSelectedAccounts}
                selectableAccounts={selectableAccounts}
                accountColors={accountColors}
                accountIcons={accountIcons}
                selectedLabelIds={selectedLabelIds}
                onSelectedLabelIdsChange={setSelectedLabelIds}
                labels={labels}
                availableCurrencies={availableCurrencies}
                selectedCurrencies={selectedCurrencies}
                onSelectedCurrenciesChange={setSelectedCurrencies}
                minAmount={minAmount}
                maxAmount={maxAmount}
                onMinAmountChange={setMinAmount}
                onMaxAmountChange={setMaxAmount}
                savedFilters={savedFilters}
                activeFilterId={activeFilterId}
                savedFiltersLoading={savedFiltersLoading}
                onSaveFilter={saveCurrentFilter}
                onLoadFilter={loadFilter}
                onDeleteFilter={deleteFilter}
                onRenameFilter={renameFilter}
                onClearActiveFilter={clearActiveFilter}
                onReorderFilter={reorderFilter}
                disableDraftFilter={true}
              />
            </Offcanvas.Body>
          </Offcanvas>

          {/* Mobile Page Title + Filter Toggle */}
          <div className="d-flex justify-content-between align-items-center mb-2 d-lg-none">
            <h2 className="page-mobile-title">Analytics</h2>
            <Button
              variant="outline-secondary"
              className="d-flex align-items-center justify-content-center p-2"
              onClick={() => setShowMobileFilters(true)}
              style={{ width: '36px', height: '36px' }}
              aria-label="Toggle Filters"
            >
              <FaFilter size={14} />
            </Button>
          </div>

          {/* Period & Tab Navigation Container */}
          <div className="analytics-nav-container mb-4">
            {/* Desktop Period Navigation */}
            <div className="d-none d-md-flex justify-content-center align-items-center mb-3">
              <PeriodNavigation>
                <PeriodRangeSelector
                  label={periodLabel}
                  activePeriod={activePeriod}
                  customRange={customRangeDraft}
                />
              </PeriodNavigation>
            </div>

            {/* Desktop Tab Navigation */}
            <div
              className="border-bottom bg-white pt-2 pb-2 d-none d-md-block"
              style={{ position: 'sticky', top: 'var(--navbar-height)', zIndex: 100 }}
            >
              <Nav variant="pills" className="analytics-tabs flex-nowrap overflow-auto">
                {TABS.map((tab) => (
                  <Nav.Item key={tab.key}>
                    <Nav.Link
                      className={`d-flex align-items-center ${activeTab === tab.key ? 'active' : ''}`}
                      onClick={() => setActiveTab(tab.key)}
                      style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      <span className="me-2">{tab.icon}</span>
                      {tab.label}
                    </Nav.Link>
                  </Nav.Item>
                ))}
              </Nav>
            </div>

            {/* Mobile Sticky Controls Wrapper */}
            <div
              className="d-flex flex-column d-md-none gap-2 pb-2"
              style={{
                position: 'sticky',
                top: 'var(--navbar-height)',
                zIndex: 100,
                backgroundColor: 'var(--bs-body-bg)',
                paddingTop: '8px',
                marginTop: '-8px'
              }}
            >
              <div className="d-flex justify-content-center align-items-center">
                <PeriodNavigation>
                  <PeriodRangeSelector
                    label={periodLabel}
                    activePeriod={activePeriod}
                    customRange={customRangeDraft}
                  />
                </PeriodNavigation>
              </div>

              <Dropdown className="w-100 shadow-sm">
                <Dropdown.Toggle
                  variant="outline-secondary"
                  id="mobile-analytics-tabs-dropdown"
                  className="w-100 d-flex justify-content-between align-items-center bg-white"
                  style={{ textAlign: 'left' }}
                >
                  <span className="d-flex align-items-center text-truncate">
                    <span className="me-2">{TABS.find((t) => t.key === activeTab)?.icon}</span>
                    {TABS.find((t) => t.key === activeTab)?.label}
                  </span>
                </Dropdown.Toggle>
                <Dropdown.Menu className="w-100 shadow-sm">
                  {TABS.map((tab) => (
                    <Dropdown.Item
                      key={tab.key}
                      active={activeTab === tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className="d-flex align-items-center py-2"
                    >
                      <span className="me-2" style={{ width: '20px', textAlign: 'center' }}>
                        {tab.icon}
                      </span>
                      {tab.label}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>

          {/* Tab Content */}
          <div className={activeTab === 'balance-trend' ? 'analytics-card-container mt-3' : 'analytics-content'}>
            {renderTabContent()}
          </div>
        </Col>
      </Row>

      {/* AI Chat — floating FAB, always visible across all tabs if user has access */}
      {user?.has_ai_access && (
        <AIChatPanel
          context={buildContextSnapshot()}
          onRestoreContext={handleRestoreContext}
        />
      )}
    </Container>
  );
}

export default function AnalyticsPage(): React.ReactElement {
  return (
    <PeriodNavigationProvider initialDate={new Date()}>
      <AnalyticsContent />
    </PeriodNavigationProvider>
  );
}
