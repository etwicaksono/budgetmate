'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Row, Col, Dropdown, Form, Alert, Nav } from 'react-bootstrap';
import { FaWallet, FaUniversity, FaPiggyBank, FaPencilAlt } from 'react-icons/fa';
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
  CategoryPieChart,
  IncomeExpenseBarChart,
  BalanceTrendChart,
  TransactionsList,
  BudgetStatusList,
  type PieChartData,
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
import { localStorageService } from '@/services/localStorageService';
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

// =============================================================================
// Budget status with currency support
interface BudgetStatusWithCurrency extends BudgetStatus {
  currency: string;
}

// Balance Trend Widget - handles currency tabs and expanded state
interface BalanceTrendWidgetProps {
  data: TrendChartData[];
  currencyBalances: { currency: string; balance: number }[];
  formatCurrencyValue: (value: number, currency?: string) => string;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  height?: string | number;
}

const BalanceTrendWidget: React.FC<BalanceTrendWidgetProps> = ({
  data,
  currencyBalances,
  formatCurrencyValue,
  selectedCurrency,
  setSelectedCurrency,
  height,
}) => {
  // Get unique currencies from data
  const availableCurrencies = useMemo(() => {
    if (!data || data.length === 0) return [];
    const firstDataPoint = data[0];
    if (!firstDataPoint) return [];
    return Object.keys(firstDataPoint).filter(
      key => key !== 'date' && key !== 'balance' && typeof firstDataPoint[key] === 'number'
    ).sort();
  }, [data]);

  // Filter data to show only selected currency
  const filteredData = useMemo(() => {
    if (!selectedCurrency) return data;
    return data.map(point => ({
      date: point.date,
      [selectedCurrency]: point[selectedCurrency],
    }));
  }, [data, selectedCurrency]);

  // Get balance for selected currency
  const selectedBalance = useMemo(() => {
    const cb = currencyBalances.find(c => c.currency === selectedCurrency);
    return cb?.balance ?? 0;
  }, [currencyBalances, selectedCurrency]);

  // Calculate percent change for selected currency
  const percentChange = useMemo(() => {
    if (filteredData.length < 2 || !selectedCurrency) return 0;
    const firstValue = filteredData[0]?.[selectedCurrency];
    const lastValue = filteredData[filteredData.length - 1]?.[selectedCurrency];
    if (typeof firstValue !== 'number' || typeof lastValue !== 'number' || firstValue === 0) return 0;
    return Number(((lastValue - firstValue) / firstValue * 100).toFixed(2));
  }, [filteredData, selectedCurrency]);

  const isExpanded = height === '100%';
  const hasTabs = availableCurrencies.length > 1;

  return (
    <div style={{
      height: isExpanded ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Currency Tabs */}
      {hasTabs && (
        <Nav variant="pills" className="justify-content-center py-2" style={{ gap: '8px', flexShrink: 0 }}>
          {availableCurrencies.map((currency) => (
            <Nav.Item key={currency}>
              <Nav.Link
                className={selectedCurrency === currency ? 'active' : ''}
                onClick={() => setSelectedCurrency(currency)}
                style={{
                  cursor: 'pointer',
                  padding: '4px 12px',
                  fontSize: '13px',
                  borderRadius: '16px',
                }}
              >
                {currency}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      )}
      {/* Chart */}
      <div style={{
        flex: isExpanded ? 1 : 'none',
        minHeight: isExpanded ? 0 : 'auto',
        height: isExpanded ? '100%' : 'auto',
      }}>
        <BalanceTrendChart
          data={filteredData}
          totalBalance={selectedBalance}
          currencyBalances={[{ currency: selectedCurrency, balance: selectedBalance }]}
          percentChange={percentChange}
          formatValue={(value) => formatCurrencyValue(value, selectedCurrency)}
          formatCurrency={(value, currency) => formatCurrencyValue(value, currency)}
          height={isExpanded ? '100%' : (hasTabs ? 310 : 350)}
          lineColor="#2563eb"
        />
      </div>
    </div>
  );
};

// Budget Status Widget - handles currency tabs and expanded state
interface BudgetStatusWidgetProps {
  budgets: BudgetStatusWithCurrency[];
  formatCurrencyValue: (value: number, currency?: string) => string;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  height?: string | number;
}

const BudgetStatusWidget: React.FC<BudgetStatusWidgetProps> = ({
  budgets,
  formatCurrencyValue,
  selectedCurrency,
  setSelectedCurrency,
  height,
}) => {
  // Get unique currencies from budgets
  const budgetCurrencies = useMemo(() => {
    const currencies = [...new Set(budgets.map(b => b.currency))];
    return currencies.sort();
  }, [budgets]);

  // Filter budgets by selected currency
  const filteredBudgets = useMemo(() => {
    return budgets
      .filter(b => b.currency === selectedCurrency)
      .map(b => ({
        id: b.id,
        category: b.category,
        spent: b.spent,
        limit: b.total,
      }));
  }, [budgets, selectedCurrency]);

  const isExpanded = height === '100%';
  const hasTabs = budgetCurrencies.length > 1;

  return (
    <div style={{
      height: isExpanded ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Currency Tabs */}
      {hasTabs && (
        <Nav variant="pills" className="justify-content-center py-2" style={{ gap: '8px', flexShrink: 0 }}>
          {budgetCurrencies.map((currency) => (
            <Nav.Item key={currency}>
              <Nav.Link
                className={selectedCurrency === currency ? 'active' : ''}
                onClick={() => setSelectedCurrency(currency)}
                style={{
                  cursor: 'pointer',
                  padding: '4px 12px',
                  fontSize: '13px',
                  borderRadius: '16px',
                }}
              >
                {currency}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      )}
      {/* Budget List */}
      <div style={{
        flex: isExpanded ? 1 : 'none',
        minHeight: isExpanded ? 0 : 'auto',
        height: isExpanded ? '100%' : 'auto',
      }}>
        {filteredBudgets.length > 0 ? (
          <BudgetStatusList
            budgets={filteredBudgets}
            formatCurrency={(value) => formatCurrencyValue(value, selectedCurrency)}
            height={isExpanded ? '100%' : undefined}
          />
        ) : (
          <div className="text-center py-5 text-muted">
            No budget data available for {selectedCurrency}
          </div>
        )}
      </div>
    </div>
  );
};

// Expenses by Category Widget - handles expanded state + drill-down
interface ExpensesByCategoryWidgetProps {
  expenseCurrencies: string[];
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  allExpenseCategories: import('@/services/analyticsService').ExpenseByCategory[];
  formatCurrencyValue: (value: number, currency?: string) => string;
  height?: string | number;
}

const ExpensesByCategoryWidget: React.FC<ExpensesByCategoryWidgetProps> = ({
  expenseCurrencies,
  selectedCurrency,
  setSelectedCurrency,
  allExpenseCategories,
  formatCurrencyValue,
  height,
}) => {
  const isExpanded = height === '100%';
  const hasTabs = expenseCurrencies.length > 1;
  const [drilledParent, setDrilledParent] = React.useState<{ id: string; name: string } | null>(null);

  // Reset drill when currency changes
  React.useEffect(() => {
    setDrilledParent(null);
  }, [selectedCurrency]);

  // Group filteredExpenseData by parent category
  const parentGroupedData = React.useMemo((): PieChartData[] => {
    const rawForCurrency = allExpenseCategories.filter(e => e.currency === selectedCurrency);
    const parentMap = new Map<string, { name: string; value: number; color: string; id: string }>();

    for (const exp of rawForCurrency) {
      if (exp.parent_id) {
        // It's a child — roll up into parent
        const existing = parentMap.get(exp.parent_id);
        if (existing) {
          existing.value += exp.amount;
        } else {
          parentMap.set(exp.parent_id, {
            id: exp.parent_id,
            name: exp.parent_name ?? exp.category_name,
            value: exp.amount,
            color: exp.color,
          });
        }
      } else {
        // It's a parent (or standalone)
        const existing = parentMap.get(exp.category_id);
        if (existing) {
          existing.value += exp.amount;
        } else {
          parentMap.set(exp.category_id, {
            id: exp.category_id,
            name: exp.category_name,
            value: exp.amount,
            color: exp.color,
          });
        }
      }
    }

    return Array.from(parentMap.values())
      .sort((a, b) => b.value - a.value)
      .map(p => ({ name: p.name, value: p.value, color: p.color, id: p.id }));
  }, [allExpenseCategories, selectedCurrency]);

  // Children of drilled parent
  const childrenData = React.useMemo((): PieChartData[] => {
    if (!drilledParent) return [];
    // High-contrast palette (same as CategoryPieChart default)
    const palette = [
      '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
      '#0891b2', '#db2777', '#65a30d', '#ea580c', '#0d9488',
      '#9333ea', '#ca8a04', '#be185d', '#047857', '#1d4ed8',
    ];
    const rawForCurrency = allExpenseCategories.filter(e => e.currency === selectedCurrency);
    return rawForCurrency
      .filter(e => e.parent_id === drilledParent.id || e.category_id === drilledParent.id)
      .sort((a, b) => b.amount - a.amount)
      .map((e, i) => ({ name: e.category_name, value: e.amount, color: palette[i % palette.length] ?? '#6c757d' }));
  }, [allExpenseCategories, selectedCurrency, drilledParent]);

  const chartData = drilledParent ? childrenData : parentGroupedData;
  const chartHeight = isExpanded ? '100%' : (hasTabs ? 310 : 350);

  const handleSliceClick = (entry: PieChartData) => {
    if (drilledParent) return; // already drilled; no deeper
    const parentId = (entry as PieChartData & { id?: string }).id;
    if (!parentId) return;
    const hasChildren = allExpenseCategories.some(
      e => e.currency === selectedCurrency && e.parent_id === parentId
    );
    if (hasChildren) {
      setDrilledParent({ id: parentId, name: entry.name });
    }
  };

  return (
    <div style={{ height: isExpanded ? '100%' : 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Currency Tabs */}
      {hasTabs && (
        <Nav variant="pills" className="justify-content-center py-2" style={{ gap: '8px', flexShrink: 0 }}>
          {expenseCurrencies.map((currency) => (
            <Nav.Item key={currency}>
              <Nav.Link
                className={selectedCurrency === currency ? 'active' : ''}
                onClick={() => setSelectedCurrency(currency)}
                style={{ cursor: 'pointer', padding: '4px 12px', fontSize: '13px', borderRadius: '16px' }}
              >
                {currency}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      )}

      {/* Drill breadcrumb & back */}
      {drilledParent && (
        <div className="d-flex align-items-center gap-2 px-3 pb-1" style={{ flexShrink: 0 }}>
          <button
            className="btn btn-sm btn-outline-secondary"
            style={{ fontSize: '11px', padding: '2px 8px' }}
            onClick={() => setDrilledParent(null)}
          >
            ← Back
          </button>
          <span style={{ fontSize: '12px', color: '#6c757d' }}>{drilledParent.name}</span>
        </div>
      )}

      {/* Chart */}
      <div style={{ flex: isExpanded ? 1 : 'none', minHeight: isExpanded ? 0 : 'auto', height: isExpanded ? '100%' : 'auto' }}>
        {chartData.length > 0 ? (
          <CategoryPieChart
            data={chartData}
            formatValue={(value) => formatCurrencyValue(value, selectedCurrency)}
            height={chartHeight}
            centerLabel={drilledParent ? drilledParent.name : 'All'}
            {...(drilledParent ? {} : { onSliceClick: handleSliceClick })}
          />
        ) : (
          <div className="text-center py-5 text-muted">
            No expense data available for {selectedCurrency}
          </div>
        )}
      </div>
    </div>
  );
};

// Income vs Expenses Widget - handles currency tabs and expanded state
interface IncomeVsExpensesWidgetProps {
  dataByCurrency: Record<string, BarChartData[]>;
  currencies: string[];
  formatCurrencyValue: (value: number, currency?: string) => string;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  height?: string | number;
}

const IncomeVsExpensesWidget: React.FC<IncomeVsExpensesWidgetProps> = ({
  dataByCurrency,
  currencies,
  formatCurrencyValue,
  selectedCurrency,
  setSelectedCurrency,
  height,
}) => {
  const currentData = selectedCurrency ? (dataByCurrency[selectedCurrency] || []) : [];
  const isExpanded = height === '100%';
  const hasTabs = currencies.length > 1;

  return (
    <div style={{
      height: isExpanded ? '100%' : 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Currency Tabs */}
      {hasTabs && (
        <Nav variant="pills" className="justify-content-center py-2" style={{ gap: '8px', flexShrink: 0 }}>
          {currencies.map((currency) => (
            <Nav.Item key={currency}>
              <Nav.Link
                className={selectedCurrency === currency ? 'active' : ''}
                onClick={() => setSelectedCurrency(currency)}
                style={{
                  cursor: 'pointer',
                  padding: '4px 12px',
                  fontSize: '13px',
                  borderRadius: '16px',
                }}
              >
                {currency}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      )}
      {/* Chart */}
      <div style={{
        flex: isExpanded ? 1 : 'none',
        minHeight: isExpanded ? 0 : 'auto',
        height: isExpanded ? '100%' : 'auto',
        padding: '1rem',
      }}>
        {currentData.length > 0 ? (
          <IncomeExpenseBarChart
            data={currentData}
            formatValue={(value) => formatCurrencyValue(value, selectedCurrency)}
            height={isExpanded ? '100%' : (hasTabs ? 280 : 320)}
            incomeColor="#2ecc71"
            expenseColor="#e74c3c"
            incomeLabel="Income"
            expenseLabel="Expense"
          />
        ) : (
          <div className="text-center py-5 text-muted">
            No income/expense data available for {selectedCurrency || 'selected currency'}
          </div>
        )}
      </div>
    </div>
  );
};

function DashboardContent(): React.ReactElement {
  const router = useRouter();
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => localStorageService.loadWidgetOrder());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [widgetVisibility, setWidgetVisibility] = useState(() => localStorageService.loadWidgetVisibility());
  const [loading, setLoading] = useState(true);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API data states
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseByCategory[]>([]);
  const [expenseCurrencies, setExpenseCurrencies] = useState<string[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(''); // Shared across all widgets
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [budgets, setBudgets] = useState<BudgetStatusWithCurrency[]>([]);
  const [balanceTrend, setBalanceTrend] = useState<TrendChartData[]>([]);
  const [incomeExpenseByCurrency, setIncomeExpenseByCurrency] = useState<Record<string, BarChartData[]>>({});
  const [incomeExpenseCurrencies, setIncomeExpenseCurrencies] = useState<string[]>([]);

  const { formatCurrency } = useFormattedCurrency();

  const {
    state: { periodLabel, activePeriod, customRangeDraft },
  } = usePeriodNavigation();

  // Fetch accounts
  const fetchAccounts = useCallback(async () => {
    try {
      setAccountsLoading(true);
      setError(null);
      const data = await accountService.fetchAccounts({ is_active: true });
      setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
      setError('Failed to load accounts');
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  // Account Modal hook (DRY principle)
  const accountModal = useAccountModal(fetchAccounts);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    console.log('[Dashboard] fetchDashboardData called');
    try {
      setLoading(true);
      setError(null);
      // Don't reset selected currency - let useEffect handle it based on available data

      // Determine date range based on active period
      const now = new Date();
      let startDate = '';
      let endDate = now.toISOString().split('T')[0] ?? '';

      if (activePeriod.type === 'month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = startOfMonth.toISOString().split('T')[0] ?? '';
        // Show the entire month (not just up to today)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endDate = endOfMonth.toISOString().split('T')[0] ?? '';
      } else if (activePeriod.type === 'year') {
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        startDate = startOfYear.toISOString().split('T')[0] ?? '';
      } else if (activePeriod.type === 'custom' && customRangeDraft?.start && customRangeDraft?.end) {
        startDate = customRangeDraft.start;
        endDate = customRangeDraft.end;
      } else {
        // Default to this month
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = startOfMonth.toISOString().split('T')[0] ?? '';
      }

      // Convert date-only format to ISO datetime for API
      // Use local midnight (start of day) to match how the transactions page filters.
      // Parsing "YYYY-MM-DD" without a time component gives local midnight in the browser's timezone.
      const startLocal = new Date(startDate);
      startLocal.setHours(0, 0, 0, 0);
      const endLocal = new Date(endDate);
      endLocal.setHours(23, 59, 59, 999);
      const startDateTime = startLocal.toISOString();
      const endDateTime = endLocal.toISOString();

      console.log('[Dashboard] Date range (UTC):', { startDate, endDate, startDateTime, endDateTime });

      // Build conditional promises based on widgetVisibility
      const expensesPromise = widgetVisibility.expensesByCategory
        ? analyticsService.fetchExpensesByCategory({ start_date: startDateTime, end_date: endDateTime })
        : Promise.resolve({ expenses: [], currencies: [] });

      const transactionsPromise = widgetVisibility.recentTransactions
        ? transactionService.fetchTransactions({ start_date: startDateTime, end_date: endDateTime, limit: 10 })
        : Promise.resolve({ transactions: [], total: 0 });

      const budgetsPromise = widgetVisibility.budgetStatus
        ? budgetService.fetchBudgetStatus({ start_date: startDateTime, end_date: endDateTime })
        : Promise.resolve([]);

      const trendsPromise = widgetVisibility.balanceTrend
        ? analyticsService.fetchTrends({
          metric: 'balance',
          period: 'daily',
          start_date: startDateTime,
          end_date: endDateTime,
        })
        : Promise.resolve({ labels: [], datasets: [] });

      const incomeExpensePromise = widgetVisibility.incomeVsExpenses
        ? analyticsService.fetchIncomeVsExpenses({ start_date: startDateTime, end_date: endDateTime })
        : Promise.resolve({ data: {}, currencies: [] });

      // Fetch widget data conditionally in parallel
      const [expensesData, transactionsResponse, budgetsData, trendData, incomeExpenseData] = await Promise.all([
        expensesPromise,
        transactionsPromise,
        budgetsPromise,
        trendsPromise,
        incomeExpensePromise,
      ]);

      if (widgetVisibility.expensesByCategory) {
        setExpenseCategories(expensesData.expenses);
        setExpenseCurrencies(expensesData.currencies);
      }

      if (widgetVisibility.recentTransactions) {
        setTransactions(transactionsResponse.transactions || []);
      }

      if (widgetVisibility.budgetStatus) {
        // Transform budget data to include currency from API
        const budgetsWithCurrency: BudgetStatusWithCurrency[] = budgetsData.map(b => ({
          ...b,
          currency: (b as BudgetStatusWithCurrency).currency || 'IDR',
        }));
        setBudgets(budgetsWithCurrency);
      }

      if (widgetVisibility.incomeVsExpenses) {
        // Set income vs expense data from API
        setIncomeExpenseCurrencies(incomeExpenseData.currencies || []);
        if (Array.isArray(incomeExpenseData.data)) {
          // Single currency response - wrap in object with first currency
          const currency = incomeExpenseData.currencies[0] || 'IDR';
          setIncomeExpenseByCurrency({ [currency]: incomeExpenseData.data as BarChartData[] });
        } else if (typeof incomeExpenseData.data === 'object') {
          // Multi-currency response
          setIncomeExpenseByCurrency(incomeExpenseData.data as Record<string, BarChartData[]>);
        }
      }

      if (widgetVisibility.balanceTrend) {
        // Convert trend data to chart format with multi-currency support
        if (trendData.labels && trendData.datasets && trendData.datasets.length > 0) {
          console.log('[Dashboard] Raw trend data from API:', JSON.stringify(trendData, null, 2));

          const chartData: TrendChartData[] = trendData.labels.map((label: string, index: number) => {
            const dataPoint: TrendChartData = { date: label };

            // Add data for each currency
            trendData.datasets.forEach((dataset: { label: string; data: number[] }) => {
              const currency = dataset.label;
              const value = dataset.data[index] ?? 0;
              dataPoint[currency] = value;
            });

            return dataPoint;
          });
          setBalanceTrend(chartData);
        }
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [activePeriod, customRangeDraft, widgetVisibility]);

  // Initial data fetch
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Auto-refresh dashboard when transactions or accounts are created/updated/deleted
  useEffect(() => {
    const handleDataChange = (event: Event) => {
      console.log('[Dashboard] Data change event detected:', event.type);
      // Refresh both accounts and dashboard data
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

    console.log('[Dashboard] Event listeners registered');

    return () => {
      window.removeEventListener('transaction-created', handleDataChange);
      window.removeEventListener('transaction-updated', handleDataChange);
      window.removeEventListener('transaction-deleted', handleDataChange);
      window.removeEventListener('account-created', handleDataChange);
      window.removeEventListener('account-updated', handleDataChange);
      window.removeEventListener('account-deleted', handleDataChange);
      console.log('[Dashboard] Event listeners removed');
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

  // Currency formatter (using USD as default for totals)
  const formatCurrencyValue = (value: number, currency: string = 'USD'): string => {
    const formatted = formatCurrency(Math.abs(value), currency);
    return `${value < 0 ? '-' : ''}${formatted}`;
  };

  // Determine primary currency from accounts (most common or first active account's currency)
  const primaryCurrency = useMemo(() => {
    if (accounts.length === 0) return 'USD';
    const currencyCounts = accounts.reduce((acc, account) => {
      acc[account.currency] = (acc[account.currency] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(currencyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'USD';
  }, [accounts]);

  // Calculate balance per currency from accounts
  const currencyBalances = React.useMemo(() => {
    const balanceMap = new Map<string, number>();

    accounts.forEach(account => {
      if (account.is_included_in_total) {
        const current = balanceMap.get(account.currency) || 0;
        balanceMap.set(account.currency, current + account.current_balance);
      }
    });

    return Array.from(balanceMap.entries())
      .map(([currency, balance]) => ({ currency, balance }))
      .sort((a, b) => b.balance - a.balance); // Sort by balance descending
  }, [accounts]);

  // Set default selected currency from any available source when currencies are loaded
  useEffect(() => {
    if (!selectedCurrency) {
      // Priority 1: Use primary currency if available in any data source
      if (primaryCurrency) {
        const isInExpenses = expenseCurrencies.includes(primaryCurrency);
        const isInBalances = currencyBalances.some(cb => cb.currency === primaryCurrency);
        const isInIncomeExpense = incomeExpenseCurrencies.includes(primaryCurrency);

        if (isInExpenses || isInBalances || isInIncomeExpense) {
          setSelectedCurrency(primaryCurrency);
          return;
        }
      }

      // Priority 2: Use first currency from balance trend (dashboard's main widget)
      if (currencyBalances.length > 0 && currencyBalances[0]) {
        setSelectedCurrency(currencyBalances[0].currency);
        return;
      }

      // Priority 3: Use first expense currency
      if (expenseCurrencies.length > 0 && expenseCurrencies[0]) {
        setSelectedCurrency(expenseCurrencies[0]);
        return;
      }

      // Priority 4: Use first income/expense currency
      if (incomeExpenseCurrencies.length > 0 && incomeExpenseCurrencies[0]) {
        setSelectedCurrency(incomeExpenseCurrencies[0]);
        return;
      }
    }
  }, [expenseCurrencies, primaryCurrency, selectedCurrency, currencyBalances, incomeExpenseCurrencies]);





  // Transform transactions for widget display
  // Database already stores amounts with correct signs:
  // - expenses: negative
  // - income: positive
  // - transfer_out: negative
  // - transfer_in: positive
  const transactionsData: Transaction[] = transactions.map(t => ({
    id: t.id,
    description: t.description || 'No description',
    amount: t.amount, // Use amount as-is from database (already has correct sign)
    currency: t.currency,
    date: t.date,
    category: t.category?.name || 'Uncategorized',
    type: t.type,
  }));



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
    balanceTrend: {
      title: 'Balance Trend',
      component: loading ? (
        <WidgetSkeleton height={350} />
      ) : balanceTrend.length > 0 ? (
        <BalanceTrendWidget
          data={balanceTrend}
          currencyBalances={currencyBalances}
          formatCurrencyValue={formatCurrencyValue}
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={setSelectedCurrency}
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
          expenseCurrencies={expenseCurrencies}
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={setSelectedCurrency}
          allExpenseCategories={expenseCategories}
          formatCurrencyValue={formatCurrencyValue}
        />
      ),
    },
    incomeVsExpenses: {
      title: 'Income vs Expenses',
      component: loading ? (
        <WidgetSkeleton height={350} />
      ) : incomeExpenseCurrencies.length > 0 ? (
        <IncomeVsExpensesWidget
          dataByCurrency={incomeExpenseByCurrency}
          currencies={incomeExpenseCurrencies}
          formatCurrencyValue={formatCurrencyValue}
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={setSelectedCurrency}
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
        />
      ) : (
        <div className="text-center py-5 text-muted">No recent transactions</div>
      ),
    },
    budgetStatus: {
      title: 'Budget Status',
      component: loading ? (
        <WidgetSkeleton height={350} />
      ) : budgets.length > 0 ? (
        <BudgetStatusWidget
          budgets={budgets}
          formatCurrencyValue={formatCurrencyValue}
          selectedCurrency={selectedCurrency}
          setSelectedCurrency={setSelectedCurrency}
        />
      ) : (
        <div className="text-center py-5 text-muted">No budget data available</div>
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
                      currency={account.currency}
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

              {/* Period Navigation — always centered */}
              <PeriodNavigation>
                <PeriodRangeSelector
                  label={periodLabel}
                  activePeriod={activePeriod}
                  customRange={customRangeDraft}
                />
              </PeriodNavigation>

              {/* Widget Controls — right on desktop, below on mobile */}
              <div className="d-flex justify-content-end w-100" style={{ flex: 1 }}>
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
