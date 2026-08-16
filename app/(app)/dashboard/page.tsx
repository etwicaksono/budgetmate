'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Row, Col, Dropdown, Form, Alert } from 'react-bootstrap';
import { FaWallet, FaUniversity, FaPiggyBank, FaPencilAlt, FaFilter } from 'react-icons/fa';
import { RiListSettingsLine } from 'react-icons/ri';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableWidgetCard, WidgetCard, type WidgetConfig } from '@/components/dashboard/WidgetCard';
import { AccountCard, AddAccountCard } from '@/components/dashboard/AccountCard';
import {
  TransactionsList,
  type BarChartData,
  type TrendChartData,
  type Transaction,
} from '@/components/widgets';
import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '@/components/period/PeriodNavigation';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';
import PeriodRangeSelector from '@/components/period/PeriodRangeSelector';
import { WidgetSkeleton, CardSkeleton } from '@/components/Loading';
import AccountModal from '@/components/accounts/AccountModal';
import { useAccountModal } from '@/hooks/useAccountModal';
import { accountService, type Account } from '@/services/accountService';
import { analyticsService, type ExpenseByCategory } from '@/services/analyticsService';
import { budgetService, type BudgetStatus } from '@/services/budgetService';
import { transactionService, type Transaction as ApiTransaction } from '@/services/transactionService';
import { localStorageService } from '@/mocks/localStorageService';
import { useFilterData } from '@/hooks/useFilterData';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { useDashboardFilters } from '@/hooks/useDashboardFilters';
import { DashboardFilterModal } from './_components/DashboardFilterModal';
import './Dashboard.css';

// Widget order and visibility now managed by localStorageService

// Map icon string to React icon component
const getIconComponent = (iconName: string): React.ComponentType<{ size?: number }> => {
  switch (iconName) {
    case 'FaWallet':
      return FaWallet;
    case 'FaUniversity':
      return FaUniversity;
    case 'FaPiggyBank':
      return FaPiggyBank;
    default:
      return FaWallet;
  }
};

import { useTransactionActions } from '@/hooks/useTransactionActions';
import { useNetWorth } from '@/hooks/useNetWorth';
import { logError } from '@/lib/logger';
import { SavedFilterContext } from '@prisma/client';
import {
  BalanceTrendWidget,
  BudgetStatusWidget,
  ExpensesByCategoryWidget,
  IncomeVsExpensesWidget,
  NetWorthWidget,
} from '@/components/dashboard/widgets';

function DashboardContent(): React.ReactElement {
  const router = useRouter();
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => localStorageService.loadWidgetOrder());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [widgetVisibility, setWidgetVisibility] = useState(() => localStorageService.loadWidgetVisibility());
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Shared filter state (accounts, categories, labels, drafts) reused from the
  // transactions/analytics sidebars so the same dropdowns work here.
  const filterData = useFilterData();
  const {
    selectedAccounts,
    setSelectedAccounts,
    selectedCategories,
    setSelectedCategories,
    selectedLabelIds,
    setSelectedLabelIds,
    excludedLabelIds,
    setExcludedLabelIds,
    draftOption,
    setDraftOption,
    sortOption,
    setSortOption,
    transferOption,
    setTransferOption,
    debtOption,
    setDebtOption,
    categories,
    apiAccounts,
  } = filterData;

  const savedFiltersData = useSavedFilters({
    categories,
    accounts: apiAccounts,
    context: SavedFilterContext.dashboard,
    current: {
      selectedCategories,
      selectedAccounts,
      selectedLabelIds,
      excludedLabelIds,
      sortOption,
      transferOption,
      debtOption,
      draftOption,
    },
    dispatchers: {
      setSelectedCategories,
      setSelectedAccounts,
      setSelectedLabelIds,
      setExcludedLabelIds,
      setSortOption,
      setTransferOption,
      setDebtOption,
      setDraftOption,
    },
  });

  const { hydrated: filtersHydrated, activeFilterCount, resetFilters, includeDraft } = useDashboardFilters({
    selectedAccounts,
    setSelectedAccounts,
    selectedCategories,
    setSelectedCategories,
    selectedLabelIds,
    setSelectedLabelIds,
    excludedLabelIds,
    setExcludedLabelIds,
    draftOption,
    setDraftOption,
  });

  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseByCategory[]>([]);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetStatus[]>([]);
  const [balanceTrend, setBalanceTrend] = useState<TrendChartData[]>([]);
  const [incomeExpenseData, setIncomeExpenseData] = useState<BarChartData[]>([]);

  // Infinite Scroll state for Recent Transactions
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [isLoadingMoreTx, setIsLoadingMoreTx] = useState(false);

  const { handleEditRecord } = useTransactionActions({
    transactions: transactions
  });

  const { formatCurrency } = useFormattedCurrency();

  const {
    state: { periodLabel, activePeriod, customRangeDraft, dateRange },
  } = usePeriodNavigation();

  // The dropdowns hold names; the API expects IDs.
  const selectedAccountIds = useMemo(() => {
    if (!selectedAccounts.length || !apiAccounts.length) return [];
    return apiAccounts.filter((acc) => selectedAccounts.includes(acc.name)).map((acc) => acc.id);
  }, [selectedAccounts, apiAccounts]);

  // Net Worth data — categories and labels do not apply to account balances,
  // so it only follows the account and draft filters.
  const { data: netWorthData, accountBalance: netWorthAccountBalance, totalCredit: netWorthTotalCredit, totalDebt: netWorthTotalDebt, isLoading: netWorthLoading } = useNetWorth(includeDraft, selectedAccountIds);

  const selectedCategoryIds = useMemo(() => {
    if (!selectedCategories.length || !categories.length) return [];
    return categories.filter((cat) => selectedCategories.includes(cat.name)).map((cat) => cat.id);
  }, [selectedCategories, categories]);

  // Comma-separated query params shared by the widgets. Kept as primitive strings
  // so the fetch callbacks below don't rerun on every render.
  const accountIdsParam = selectedAccountIds.join(',');
  const categoryIdsParam = selectedCategoryIds.join(',');
  const labelIdsParam = selectedLabelIds.join(',');
  const excludeLabelIdsParam = excludedLabelIds.join(',');

  // The analytics and transactions routes share these param names and both
  // default to excluding drafts, so one object covers all four widgets.
  const widgetFilters = useMemo(() => {
    const filters: {
      account_ids?: string;
      category_ids?: string;
      label_ids?: string;
      exclude_label_ids?: string;
      draft_option?: string;
    } = {};
    if (accountIdsParam) filters.account_ids = accountIdsParam;
    if (categoryIdsParam) filters.category_ids = categoryIdsParam;
    if (labelIdsParam) filters.label_ids = labelIdsParam;
    if (excludeLabelIdsParam) filters.exclude_label_ids = excludeLabelIdsParam;
    if (draftOption !== 'exclude') filters.draft_option = draftOption;
    return filters;
  }, [accountIdsParam, categoryIdsParam, labelIdsParam, excludeLabelIdsParam, draftOption]);

  // Budget Status aggregates by category, so labels cannot be applied there
  const budgetFilters = useMemo(() => {
    const filters: { account_ids?: string; category_ids?: string; drafts?: string } = {
      drafts: draftOption,
    };
    if (accountIdsParam) filters.account_ids = accountIdsParam;
    if (categoryIdsParam) filters.category_ids = categoryIdsParam;
    return filters;
  }, [accountIdsParam, categoryIdsParam, draftOption]);

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      setError(null);
      const data = await accountService.fetchAccounts({ is_active: true, include_draft: includeDraft });
      setAccounts(data);
    } catch (err) {
      logError('Failed to fetch accounts:', err);
      setError('Failed to load accounts');
    } finally {
      setAccountsLoading(false);
    }
  }, [includeDraft]);

  // Account Modal hook (DRY principle)
  const accountModal = useAccountModal(fetchAccounts);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (options?: { preserveTransactions?: boolean }) => {
    try {
      setLoading(true);
      setError(null);
      // Fetch dashboard data based on the active widget configuration

      // Determine date range directly from period navigation context
      const startDateTime = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
      const endDateTime = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;


      const dateFilters: { start_date?: string; end_date?: string } = {};
      if (startDateTime) dateFilters.start_date = startDateTime;
      if (endDateTime) dateFilters.end_date = endDateTime;

      // Build conditional promises based on widgetVisibility
      const expensesPromise = widgetVisibility.expensesByCategory
        ? analyticsService.fetchExpensesByCategory({ ...dateFilters, ...widgetFilters })
        : Promise.resolve({ expenses: [] as ExpenseByCategory[] });

      const transactionsPromise = (widgetVisibility.recentTransactions && !options?.preserveTransactions)
        ? transactionService.fetchTransactions({ ...dateFilters, ...widgetFilters, limit: 10 })
        : Promise.resolve(null);

      const budgetsPromise = widgetVisibility.budgetStatus
        ? budgetService.fetchBudgetStatus({ ...dateFilters, ...budgetFilters })
        : Promise.resolve([] as BudgetStatus[]);

      const trendsPromise = widgetVisibility.balanceTrend
        ? analyticsService.fetchTrends({
          metric: 'balance',
          period: 'daily',
          ...dateFilters,
          ...widgetFilters,
        })
        : Promise.resolve({ labels: [], datasets: [] });

      const incomeExpensePromise = widgetVisibility.incomeVsExpenses
        ? analyticsService.fetchIncomeVsExpenses({ ...dateFilters, ...widgetFilters })
        : Promise.resolve({ data: [] as BarChartData[] });

      const [expensesData, transactionsResponse, budgetsData, trendData, incomeExpenseResponse] = await Promise.all([
        expensesPromise,
        transactionsPromise,
        budgetsPromise,
        trendsPromise,
        incomeExpensePromise,
      ]);

      if (widgetVisibility.expensesByCategory) {
        setExpenseCategories(expensesData.expenses);
      }

      if (widgetVisibility.recentTransactions && !options?.preserveTransactions && transactionsResponse) {
        setTransactions(transactionsResponse.transactions || []);
        setTransactionsPage(1);
        const metaData = transactionsResponse.meta;
        const totalTxPages = metaData?.totalPages || metaData?.total_pages || 1;
        setHasMoreTransactions((metaData?.page || 1) < totalTxPages);
      }

      if (widgetVisibility.budgetStatus) {
        setBudgets(budgetsData);
      }

      if (widgetVisibility.incomeVsExpenses) {
        const normalizedIncomeExpenseData = Array.isArray(incomeExpenseResponse.data)
          ? incomeExpenseResponse.data
          : [];
        setIncomeExpenseData(normalizedIncomeExpenseData as BarChartData[]);
      }

      if (widgetVisibility.balanceTrend && trendData.labels && trendData.datasets && trendData.datasets.length > 0) {
        const dataset = trendData.datasets[0]?.data ?? [];
        const chartData: TrendChartData[] = trendData.labels.map((label: string, index: number) => ({
          date: label,
          balance: dataset[index] ?? 0,
        }));
        setBalanceTrend(chartData);
      }

    } catch (err) {
      logError('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end, widgetVisibility, widgetFilters, budgetFilters]);

  const loadMoreTransactions = useCallback(async () => {
    if (isLoadingMoreTx || !hasMoreTransactions || !widgetVisibility.recentTransactions) return;
    try {
      setIsLoadingMoreTx(true);
      const nextPage = transactionsPage + 1;

      const startDateTime = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
      const endDateTime = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;

      const dateFilters: { start_date?: string; end_date?: string } = {};
      if (startDateTime) dateFilters.start_date = startDateTime;
      if (endDateTime) dateFilters.end_date = endDateTime;

      const response = await transactionService.fetchTransactions({ ...dateFilters, ...widgetFilters, limit: 10, page: nextPage });
      setTransactions(prev => [...prev, ...(response.transactions || [])]);
      setTransactionsPage(nextPage);

      const totalPages = response.meta?.totalPages || response.meta?.total_pages || 1;
      setHasMoreTransactions((response.meta?.page || 1) < totalPages);
    } catch (e) {
      logError('Failed to load more transactions:', e);
    } finally {
      setIsLoadingMoreTx(false);
    }
  }, [isLoadingMoreTx, hasMoreTransactions, transactionsPage, dateRange, widgetVisibility.recentTransactions, widgetFilters]);

  // Initial data fetch — waits for the persisted filters so the widgets are not
  // fetched twice (once unfiltered, then again once the filters are restored)
  useEffect(() => {
    if (!filtersHydrated) return;
    fetchAccounts();
  }, [filtersHydrated, fetchAccounts]);

  useEffect(() => {
    if (!filtersHydrated) return;
    fetchDashboardData();
  }, [filtersHydrated, fetchDashboardData]);

  // Auto-refresh dashboard when transactions or accounts are created/updated/deleted
  useEffect(() => {
    const handleDataChange = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const updatedId = customEvent.detail?.data?.id;

      if (event.type === 'transaction-updated' && updatedId) {
        // Targeted in-place update for transaction modifications to preserve infinite scroll state
        try {
          const updatedTxRaw = await transactionService.fetchTransactionById(updatedId);
          if (updatedTxRaw) {
            setTransactions(prev => prev.map(t => t.id === updatedId ? updatedTxRaw : t));

            // Still refresh all other dashboard metrics (charts, trends), but freeze the recent list!
            fetchAccounts();
            fetchDashboardData({ preserveTransactions: true });
            return;
          }
        } catch (e) {
          logError('[Dashboard] Failed to fetch updated transaction for local patch, falling back to full reload', e);
        }
      }

      // Default behavior: fully reload everything
      fetchAccounts();
      fetchDashboardData();
    };

    // Listen for transaction events (affects dashboard widgets)
    window.addEventListener('transaction-created', handleDataChange);
    window.addEventListener('transaction-updated', handleDataChange);
    window.addEventListener('transaction-deleted', handleDataChange);

    // Listen for account events (affects account cards and balances)
    window.addEventListener('account-created', handleDataChange);
    window.addEventListener('account-updated', handleDataChange);
    window.addEventListener('account-deleted', handleDataChange);


    return () => {
      window.removeEventListener('transaction-created', handleDataChange);
      window.removeEventListener('transaction-updated', handleDataChange);
      window.removeEventListener('transaction-deleted', handleDataChange);
      window.removeEventListener('account-created', handleDataChange);
      window.removeEventListener('account-updated', handleDataChange);
      window.removeEventListener('account-deleted', handleDataChange);
    };
  }, [fetchAccounts, fetchDashboardData]);

  // Save widget order to localStorage whenever it changes
  useEffect(() => {
    localStorageService.saveWidgetOrder(widgetOrder);
  }, [widgetOrder]);

  // Save widget visibility to localStorage whenever it changes
  useEffect(() => {
    localStorageService.saveWidgetVisibility(widgetVisibility);
  }, [widgetVisibility]);

  const toggleWidgetVisibility = (widgetKey: keyof typeof widgetVisibility) => {
    setWidgetVisibility(prev => ({
      ...prev,
      [widgetKey]: !prev[widgetKey],
    }));
  };

  // IDR-only formatter for dashboard values
  const formatCurrencyValue = (value: number): string => {
    return value < 0 ? `-${formatCurrency(Math.abs(value))}` : formatCurrency(value);
  };





  // Transform transactions for widget display
  // Database already stores amounts with correct signs:
  // - expenses: negative
  // - income: positive
  // - transfer_out: negative
  // - transfer_in: positive
  const transactionsData: Transaction[] = transactions.map(t => {
    let categoryName = t.category?.name || 'Uncategorized';
    let categoryIcon = t.category?.icon;
    let categoryIconColor = t.category?.color;

    if (t.type.startsWith('transfer')) {
      categoryName = 'Transfer';
      categoryIcon = 'FaExchangeAlt';
      categoryIconColor = '#17a2b8';
    } else if (t.type === 'debt_in' || t.type === 'debt_out') {
      categoryName = t.category?.name || 'Debt';
      categoryIcon = 'FaHandshake';
      categoryIconColor = t.type === 'debt_in' ? '#059669' : '#dc3545';
    }

    const result: Partial<Transaction> = {
      id: t.id,
      description: t.description || 'No description',
      amount: t.amount,
      date: t.date,
      category: categoryName,
      type: t.type,
    };

    if (t.account?.name) {
      result.account = t.account.name;
    }
    if (categoryIconColor) result.categoryIconColor = categoryIconColor;
    if (categoryIcon) result.categoryIcon = categoryIcon;
    if (t.labels) result.labels = t.labels;

    return result as Transaction;
  });



  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Widget configurations
  const widgets: Record<string, WidgetConfig> = {
    netWorth: {
      title: 'Net Worth',
      height: 'auto',
      component: (
        <NetWorthWidget
          data={netWorthData}
          accountBalance={netWorthAccountBalance}
          totalCredit={netWorthTotalCredit}
          totalDebt={netWorthTotalDebt}
          isLoading={netWorthLoading}
          formatCurrencyValue={formatCurrencyValue}
          includeDraft={includeDraft}
          onToggleDraft={(next) => setDraftOption(next ? 'include' : 'exclude')}
        />
      ),
    },
    balanceTrend: {
      title: 'Balance Trend',
      component: loading ? (
        <WidgetSkeleton height={350} />
      ) : balanceTrend.length > 0 ? (
        <BalanceTrendWidget
          data={balanceTrend}
          formatCurrencyValue={formatCurrencyValue}
        />
      ) : (
        <div className="text-center py-5 text-muted">No balance data available</div>
      ),
    },
    expensesByCategory: {
      title: 'Expenses by Category',
      component: loading ? (
        <WidgetSkeleton height={350} />
      ) : (
        <ExpensesByCategoryWidget
          allExpenseCategories={expenseCategories}
          formatCurrencyValue={formatCurrencyValue}
        />
      ),
    },
    incomeVsExpenses: {
      title: 'Income vs Expenses',
      component: loading ? (
        <WidgetSkeleton height={350} />
      ) : incomeExpenseData.length > 0 ? (
        <IncomeVsExpensesWidget
          data={incomeExpenseData}
          formatCurrencyValue={formatCurrencyValue}
        />
      ) : (
        <div className="text-center py-5 text-muted">No income/expense data available</div>
      ),
    },
    recentTransactions: {
      title: 'Recent Transactions',
      component: loading ? (
        <WidgetSkeleton height={350} />
      ) : transactionsData.length > 0 ? (
        <TransactionsList
          transactions={transactionsData}
          maxHeight="350px"
          hasMore={hasMoreTransactions}
          isLoadingMore={isLoadingMoreTx}
          onLoadMore={loadMoreTransactions}
          onTransactionClick={(tx) => handleEditRecord(tx as unknown as import('@/components/Records').TransactionRecord)}
        />
      ) : (
        <div className="text-center py-5 text-muted">No recent transactions</div>
      ),
    },
    budgetStatus: {
      title: 'Budget Status',
      component: loading ? (
        <WidgetSkeleton height={350} />
      ) : (
        <BudgetStatusWidget
          budgets={budgets}
          formatCurrencyValue={formatCurrencyValue}
        />
      ),
    },
  };

  return (
    <>
      {/* Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
          {error}
        </Alert>
      )}

      {/* Account Cards Section */}
      <section className="mb-5">
        <Row className="g-1">
          {accountsLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Col key={i} xs={4} sm={4} md={3} lg={2}>
                  <CardSkeleton />
                </Col>
              ))}
            </>
          ) : (
            <>
              {accounts.map((account) => (
                <Col key={account.id} xs={4} sm={4} md={3} lg={2}>
                  <div
                    style={{ position: 'relative' }}
                    onMouseEnter={(e) => {
                      const editBtn = e.currentTarget.querySelector('.edit-account-btn');
                      if (editBtn) {
                        (editBtn as HTMLElement).style.opacity = '1';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const editBtn = e.currentTarget.querySelector('.edit-account-btn');
                      if (editBtn) {
                        (editBtn as HTMLElement).style.opacity = '0';
                      }
                    }}
                  >
                    <AccountCard
                      name={account.name}
                      balance={account.current_balance}
                      color={account.color}
                      icon={getIconComponent(account.icon)}
                      onClick={() => router.push(`/accounts/${account.id}`)}
                    />
                    <button
                      className="edit-account-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        accountModal.openEditModal(account);
                      }}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        right: '10px',
                        transform: 'translateY(-50%)',
                        opacity: 0,
                        transition: 'opacity 0.2s ease-in-out',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '36px',
                        height: '36px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 10,
                        padding: 0,
                      }}
                      title="Edit account"
                    >
                      <FaPencilAlt size={16} color="#333" />
                    </button>
                  </div>
                </Col>
              ))}
              <Col xs={4} sm={4} md={3} lg={2}>
                <AddAccountCard onClick={accountModal.openAddModal} />
              </Col>
            </>
          )}
        </Row>
      </section>

      {/* Period Navigation & Widget Controls */}
      <section className="mb-4">
        <Row>
          <Col lg={12}>
            <div className="d-flex flex-column flex-lg-row align-items-center justify-content-lg-between mb-4 gap-2">
              {/* Spacer — desktop only */}
              <div className="d-none d-lg-block" style={{ flex: 1 }}></div>

              {/* Period Navigation — centered on all screens */}
              <div className="d-flex align-items-center justify-content-center gap-2">
                {/* Filter Chip — desktop only (next to Period Navigation) */}
                <button
                  id="dashboard-filter-chip"
                  className={`dashboard-filter-chip d-none d-lg-inline-flex${activeFilterCount > 0 ? ' dashboard-filter-chip--active' : ''}`}
                  onClick={() => setShowFilterModal(true)}
                  title="Filter dashboard widgets"
                >
                  <FaFilter size={11} />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="dashboard-filter-chip__count">{activeFilterCount}</span>
                  )}
                </button>

                <PeriodNavigation>
                  <PeriodRangeSelector
                    label={periodLabel}
                    activePeriod={activePeriod}
                    customRange={customRangeDraft}
                  />
                </PeriodNavigation>
              </div>

              {/* Filter chip (mobile) + Widget Controls — spread on mobile, right on desktop */}
              <div className="d-flex align-items-center justify-content-between justify-content-lg-end w-100 gap-2" style={{ flex: 1 }}>
                {/* Filter Chip — mobile only (left side) */}
                <button
                  className={`dashboard-filter-chip d-inline-flex d-lg-none${activeFilterCount > 0 ? ' dashboard-filter-chip--active' : ''}`}
                  onClick={() => setShowFilterModal(true)}
                  title="Filter dashboard widgets"
                >
                  <FaFilter size={11} />
                  <span>Filter</span>
                  {activeFilterCount > 0 && (
                    <span className="dashboard-filter-chip__count">{activeFilterCount}</span>
                  )}
                </button>
                {/* Widget Control Panel */}
                <Dropdown show={showControlPanel} onToggle={setShowControlPanel}>
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
                  >
                    <RiListSettingsLine size={24} color="#6b7280" />
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
                        Customize Widgets
                      </h6>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b7280' }}>
                        Show or hide widgets on this page
                      </p>
                    </div>
                    <hr style={{ margin: '12px 0', borderColor: '#e5e7eb' }} />
                    <div>
                      {Object.entries(widgets).map(([widgetId, widget]) => (
                        <Form.Check
                          key={widgetId}
                          type="checkbox"
                          id={`widget-${widgetId}`}
                          label={widget.title}
                          checked={widgetVisibility[widgetId as keyof typeof widgetVisibility]}
                          onChange={() => toggleWidgetVisibility(widgetId as keyof typeof widgetVisibility)}
                          style={{
                            marginBottom: '10px',
                            fontSize: '14px',
                          }}
                        />
                      ))}
                    </div>
                  </Dropdown.Menu>
                </Dropdown>
              </div>
            </div>
          </Col>
        </Row>
      </section>

      {/* Widgets Section */}
      <section>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={widgetOrder} strategy={rectSortingStrategy}>
            <Row>
              {widgetOrder
                .filter((widgetId) => widgetVisibility[widgetId as keyof typeof widgetVisibility])
                .map((widgetId) => {
                  const widget = widgets[widgetId];
                  if (!widget) return null;

                  return (
                    <SortableWidgetCard
                      key={widgetId}
                      widgetId={widgetId}
                      widget={widget}
                      visibility={widgetVisibility[widgetId as keyof typeof widgetVisibility]}
                      onToggleVisibility={(id) => toggleWidgetVisibility(id as keyof typeof widgetVisibility)}
                    />
                  );
                })}
            </Row>
          </SortableContext>

          <DragOverlay>
            {activeId && widgets[activeId] ? (
              <WidgetCard widget={widgets[activeId]} />
            ) : null}
          </DragOverlay>
        </DndContext>
      </section>

      {/* Widget Filter Modal */}
      <DashboardFilterModal
        show={showFilterModal}
        onHide={() => setShowFilterModal(false)}
        filterData={filterData}
        savedFiltersData={savedFiltersData}
        onResetFilters={resetFilters}
      />

      {/* Account Modal */}
      {accountModal.showModal && (
        <AccountModal
          show={accountModal.showModal}
          onHide={accountModal.closeModal}
          onSave={accountModal.saveAccount}
          mode={accountModal.modalMode}
          initialData={accountModal.initialData}
        />
      )}
    </>
  );
}

export default function DashboardPage(): React.ReactElement {
  return (
    <PeriodNavigationProvider initialDate={new Date()}>
      <DashboardContent />
    </PeriodNavigationProvider>
  );
}
