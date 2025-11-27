'use client';

import React, { useState } from 'react';
import { Container, Row, Col, Nav, Button, Card } from 'react-bootstrap';
import { FaFileExport } from 'react-icons/fa';
import { useFilterData } from '@/hooks/useFilterData';
import { DesktopFilterSidebar } from '@/components/FilterSidebar';
import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '@/components/period/PeriodNavigation';
import PeriodRangeSelector from '@/components/period/PeriodRangeSelector';
import IncomesExpensesReport from '@/components/analytics/IncomesExpensesReport';

type TabKey = 'income-expense' | 'balance-trend' | 'cash-flow' | 'advanced-charts';

function AnalyticsContent(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabKey>('income-expense');

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
  } = useFilterData();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'income-expense': {
        const startDate = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
        const endDate = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;
        return (
          <IncomesExpensesReport
            {...(startDate && { startDate })}
            {...(endDate && { endDate })}
          />
        );
      }
      case 'balance-trend':
        return (
          <Card className="text-center py-5">
            <Card.Body>
              <span className="text-6xl mb-4 d-block" style={{ fontSize: '4rem' }}>📈</span>
              <h4>Balance Trend</h4>
              <p className="text-muted">Coming soon</p>
            </Card.Body>
          </Card>
        );
      case 'cash-flow':
        return (
          <Card className="text-center py-5">
            <Card.Body>
              <span className="text-6xl mb-4 d-block" style={{ fontSize: '4rem' }}>💰</span>
              <h4>Cash Flow</h4>
              <p className="text-muted">Coming soon</p>
            </Card.Body>
          </Card>
        );
      case 'advanced-charts':
        return (
          <Card className="text-center py-5">
            <Card.Body>
              <span className="text-6xl mb-4 d-block" style={{ fontSize: '4rem' }}>📉</span>
              <h4>Advanced Charts and Reports</h4>
              <p className="text-muted">Coming soon</p>
            </Card.Body>
          </Card>
        );
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
            filterVisibility={{ ...filterVisibility, currencies: false }}
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
          />
        </Col>

        {/* Main Content */}
        <Col lg={9}>
          {/* Header with Period Navigation */}
          <div className="analytics-header mb-4">
            {/* Export button for mobile */}
            <div className="d-flex justify-content-end mb-3 d-lg-none">
              <Button variant="outline-success" size="sm">
                <FaFileExport className="me-2" />
                Export
              </Button>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3">
              <div style={{ flex: 1 }}></div>
              <PeriodNavigation>
                <PeriodRangeSelector
                  label={periodLabel}
                  activePeriod={activePeriod}
                  customRange={customRangeDraft}
                />
              </PeriodNavigation>
              {/* Export button for desktop */}
              <div style={{ flex: 1 }} className="d-none d-lg-block text-end">
                <Button variant="outline-success" size="sm" className="d-inline-flex align-items-center">
                  <FaFileExport className="me-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Tab Navigation */}
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
