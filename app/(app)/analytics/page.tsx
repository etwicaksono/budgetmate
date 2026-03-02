'use client';

import React, { useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Container, Row, Col, Nav } from 'react-bootstrap';
import { useFilterData } from '@/hooks/useFilterData';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { DesktopFilterSidebar } from '@/components/FilterSidebar';
import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '@/components/period/PeriodNavigation';
import PeriodRangeSelector from '@/components/period/PeriodRangeSelector';
import IncomesExpensesReport from '@/components/analytics/IncomesExpensesReport';
import BalanceTrendReport from '@/components/analytics/BalanceTrendReport';
import CashFlowReport from '@/components/analytics/CashFlowReport';
import AdvancedChartsReport from '@/components/analytics/AdvancedChartsReport';

type TabKey = 'income-expense' | 'balance-trend' | 'cash-flow' | 'advanced-charts';

const VALID_TABS: TabKey[] = ['income-expense', 'balance-trend', 'cash-flow', 'advanced-charts'];

function AnalyticsContent(): React.ReactElement {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Get active tab from URL, default to 'income-expense'
  const tabParam = searchParams.get('tab');
  const activeTab: TabKey = VALID_TABS.includes(tabParam as TabKey) ? (tabParam as TabKey) : 'income-expense';

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
  } = useFilterData();

  const { savedFilters, activeFilterId, loading: savedFiltersLoading, saveCurrentFilter, loadFilter, deleteFilter, renameFilter, clearActiveFilter, reorderFilter } = useSavedFilters({
    categories,
    accounts: apiAccounts,
    current: { selectedCategories, selectedAccounts, selectedCurrencies, selectedLabelIds: [], sortOption },
    dispatchers: { setSelectedCategories, setSelectedAccounts, setSelectedCurrencies, setSelectedLabelIds: (_v) => { }, setSortOption },
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
          <DesktopFilterSidebar
            title="Analytics"
            filterVisibility={filterVisibility}
            onFilterVisibilityChange={setFilterVisibility}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            sortOption={sortOption}
            onSortOptionChange={setSortOption}
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
          />
        </Col>

        {/* Main Content */}
        <Col lg={9}>
          {/* Header with Period Navigation */}
          <div className="analytics-header mb-4">
            <div className="d-flex justify-content-center align-items-center mb-3">
              <PeriodNavigation>
                <PeriodRangeSelector
                  label={periodLabel}
                  activePeriod={activePeriod}
                  customRange={customRangeDraft}
                />
              </PeriodNavigation>
            </div>

          </div>

          {/* Tab Navigation */}
          <div
            className="border-bottom bg-white mb-4 pt-2 pb-2"
            style={{ position: 'sticky', top: '65px', zIndex: 100 }}
          >
            <Nav variant="pills" className="analytics-tabs flex-nowrap overflow-auto">
              <Nav.Item>
                <Nav.Link
                  className={`d-flex align-items-center ${activeTab === 'income-expense' ? 'active' : ''}`}
                  onClick={() => setActiveTab('income-expense')}
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <span className="me-2">📊</span>
                  Incomes &amp; Expenses Report
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  className={`d-flex align-items-center ${activeTab === 'balance-trend' ? 'active' : ''}`}
                  onClick={() => setActiveTab('balance-trend')}
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <span className="me-2">📈</span>
                  Balance Trend
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  className={`d-flex align-items-center ${activeTab === 'cash-flow' ? 'active' : ''}`}
                  onClick={() => setActiveTab('cash-flow')}
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <span className="me-2">💰</span>
                  Cash flow
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  className={`d-flex align-items-center ${activeTab === 'advanced-charts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('advanced-charts')}
                  style={{ cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  <span className="me-2">📉</span>
                  Advanced Charts and Reports
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>

          {/* Tab Content */}
          <div className="analytics-content">
            {renderTabContent()}
          </div>
        </Col>
      </Row>
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
