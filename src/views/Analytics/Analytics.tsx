import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Nav, Button } from 'react-bootstrap';
import { FaFileExport } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '../../components/PeriodNavigation';
import PeriodRangeSelector from '../../components/PeriodRangeSelector';
import IncomesExpensesReport from './components/IncomesExpensesReport';
import BalanceTrend from './components/BalanceTrend';
import CashFlow from './components/CashFlow';
import AdvancedCharts from './components/AdvancedCharts';
import AccountDetail from '../Accounts/AccountDetail';
import type { Account } from '../Accounts/Accounts';
import {
  DesktopFilterSidebar,
  SortDropdown,
  type DropdownIconMap,
} from '../Transactions/components/DesktopFilterSidebar';
import type { FilterVisibility } from '../Transactions/components/MobileFilterOffcanvas';
import { useFilterData } from '../Transactions/hooks/useFilterData';
import analyticsService, { type AccountBalance } from '../../services/analyticsService';

type TabKey = 'income-expense' | 'balance-trend' | 'cash-flow' | 'advanced-charts';

const FILTER_VISIBILITY_STORAGE_KEY = 'finance-app-analytics-filter-visibility';

const AnalyticsContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('income-expense');
  const [showAccountDetail, setShowAccountDetail] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [accountsData, setAccountsData] = useState<AccountBalance[]>([]);
  
  // Use the shared filter data hook
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
    showFilterVisibilityPanel,
    setShowFilterVisibilityPanel,
    categoryTree,
    parentCategoryColors,
    categoryIcons,
    allCategories,
    selectableAccounts,
    accountTree,
    accountColors,
    accountIcons,
  } = useFilterData({ filterVisibilityStorageKey: FILTER_VISIBILITY_STORAGE_KEY });

  const {
    state: { periodLabel, activePeriod, customRangeDraft },
  } = usePeriodNavigation();

  // Fetch accounts data for conversion
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const balanceTrendData = await analyticsService.fetchBalanceTrend();
        setAccountsData(balanceTrendData.accounts);
      } catch (err) {
        console.error('Failed to load accounts:', err);
      }
    };
    fetchAccounts();
  }, []);

  // Convert AccountBalance to Account type
  const convertToAccount = (accountBalance: AccountBalance): Account => {
    const iconKey = accountBalance.icon || 'FaWallet';
    const IconComponent = (FaIcons as any)[iconKey] || FaIcons.FaWallet;

    return {
      id: accountBalance.name.toLowerCase().replace(/\s+/g, '-'),
      name: accountBalance.name,
      type: accountBalance.type,
      balance: accountBalance.balance,
      currency: 'IDR',
      backgroundColor: `${accountBalance.color}20`,
      accentColor: accountBalance.color,
      icon: IconComponent,
      iconKey: iconKey,
      isActive: true,
      excludeFromStatistics: false,
      usability: 'USABLE',
      order: 0,
    };
  };

  const handleAccountClick = (accountName: string) => {
    const accountBalance = accountsData.find(acc => acc.name === accountName);
    if (accountBalance) {
      setSelectedAccount(convertToAccount(accountBalance));
      setShowAccountDetail(true);
    }
  };

  const handleBackFromAccountDetail = () => {
    setShowAccountDetail(false);
    setSelectedAccount(null);
  };

  const handleEditAccount = (account: Account) => {
    // TODO: Implement account edit
    console.log('Edit account:', account);
  };

  const handleDeleteAccount = (accountId: string) => {
    // TODO: Implement account delete
    console.log('Delete account:', accountId);
    setShowAccountDetail(false);
    setSelectedAccount(null);
  };

  // If showing account detail, render it instead of the main content
  if (showAccountDetail && selectedAccount) {
    return (
      <Container fluid>
        <AccountDetail
          account={selectedAccount}
          onBack={handleBackFromAccountDetail}
          onEdit={handleEditAccount}
          onDelete={handleDeleteAccount}
        />
      </Container>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'income-expense':
        return <IncomesExpensesReport currentMonth={periodLabel} />;
      case 'balance-trend':
        return <BalanceTrend currentMonth={periodLabel} onAccountClick={handleAccountClick} />;
      case 'cash-flow':
        return <CashFlow currentMonth={periodLabel} />;
      case 'advanced-charts':
        return <AdvancedCharts currentMonth={periodLabel} />;
      default:
        return <IncomesExpensesReport currentMonth={periodLabel} />;
    }
  };

  return (
    <Container fluid>
      <Row>
        <Col lg={3} className="mb-2 d-none d-lg-block">
          <DesktopFilterSidebar
            title="Analytics"
            filterVisibility={filterVisibility}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            sortOption={sortOption}
            onSortOptionChange={setSortOption}
            selectedCategories={selectedCategories}
            onSelectedCategoriesChange={setSelectedCategories}
            categoryTree={categoryTree}
            parentCategoryColors={parentCategoryColors}
            categoryIcons={categoryIcons as DropdownIconMap}
            allCategories={allCategories}
            selectedAccounts={selectedAccounts}
            onSelectedAccountsChange={setSelectedAccounts}
            accountTree={accountTree}
            accountColors={accountColors}
            accountIcons={accountIcons as DropdownIconMap}
            selectableAccounts={selectableAccounts}
            minAmount={minAmount}
            maxAmount={maxAmount}
            onMinAmountChange={setMinAmount}
            onMaxAmountChange={setMaxAmount}
            onFilterVisibilityChange={setFilterVisibility}
            onShowTransactionModal={() => {}}
            SortDropdownComponent={SortDropdown}
          />
        </Col>

        <Col lg={9}>
          <div className="analytics-header mb-4">
            {/* Export button for mobile - shows above PeriodNavigation */}
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
              {/* Export button for desktop - shows on the right */}
              <div style={{ flex: 1 }} className="d-none d-lg-flex justify-content-end">
                <Button variant="outline-success" size="sm">
                  <FaFileExport className="me-2" />
                  Export
                </Button>
              </div>
            </div>

            <Nav variant="pills" className="analytics-tabs">
              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'income-expense'}
                  onClick={() => setActiveTab('income-expense')}
                  className="d-flex align-items-center"
                >
                  <span className="tab-icon">📊</span>
                  Incomes &amp; Expenses Report
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'balance-trend'}
                  onClick={() => setActiveTab('balance-trend')}
                  className="d-flex align-items-center"
                >
                  <span className="tab-icon">📈</span>
                  Balance Trend
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'cash-flow'}
                  onClick={() => setActiveTab('cash-flow')}
                  className="d-flex align-items-center"
                >
                  <span className="tab-icon">💰</span>
                  Cash flow
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link
                  active={activeTab === 'advanced-charts'}
                  onClick={() => setActiveTab('advanced-charts')}
                  className="d-flex align-items-center"
                >
                  <span className="tab-icon">📉</span>
                  Advanced Charts and Reports
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </div>

          <div className="analytics-content">
            {renderTabContent()}
          </div>
        </Col>
      </Row>
    </Container>
  );
};

const Analytics: React.FC = () => (
  <PeriodNavigationProvider initialDate={new Date()}>
    <AnalyticsContent />
  </PeriodNavigationProvider>
);

export default Analytics;
