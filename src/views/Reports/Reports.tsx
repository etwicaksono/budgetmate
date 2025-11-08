import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Row, Col, Card, Form, Dropdown } from 'react-bootstrap';
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
import { RiListSettingsLine } from 'react-icons/ri';
import analyticsService, {
  type ExpenseByCategory,
  type DashboardTransaction,
  type IncomeExpenseTrend,
  type CashFlowData,
} from '../../services/analyticsService';
import budgetService, { type BudgetStatus } from '../../services/budgetService';
import CategoryPieChart from '../../components/CategoryPieChart';
import IncomeExpenseBarChart from '../../components/IncomeExpenseBarChart';
import CashFlowChart from '../../components/CashFlowChart';
import RecentTransactionsList from '../../components/RecentTransactionsList';
import BudgetStatusList from '../../components/BudgetStatusList';
import BalanceTrendWidget from '../../components/Widget/BalanceTrendWidget';
import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '../../components/PeriodNavigation';
import PeriodRangeSelector from '../../components/PeriodRangeSelector';
import { SortableWidgetCard, WidgetCard } from '../../components/WidgetCards';

const COLORS: readonly string[] = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#4ECDC4', '#95E1D3'];

// LocalStorage key for widget order
const WIDGET_ORDER_STORAGE_KEY = 'reports-widget-order';
const DEFAULT_WIDGET_ORDER = [
  'balanceTrend',
  'expensesByCategory',
  'incomeVsExpenses',
  'cashFlow',
  'recentTransactions',
  'budgetStatus',
];

// Helper function to load widget order from localStorage
const loadWidgetOrder = (): string[] => {
  if (typeof window === 'undefined') {return DEFAULT_WIDGET_ORDER;}
  
  try {
    const stored = localStorage.getItem(WIDGET_ORDER_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      // If stored order matches expected length, use it
      if (Array.isArray(parsed) && parsed.length === DEFAULT_WIDGET_ORDER.length) {
        return parsed;
      }
      // If stored order is outdated, merge with default order
      if (Array.isArray(parsed)) {
        const merged = [...DEFAULT_WIDGET_ORDER];
        parsed.forEach((widgetId) => {
          if (DEFAULT_WIDGET_ORDER.includes(widgetId) && !merged.includes(widgetId)) {
            merged.push(widgetId);
          }
        });
        return merged;
      }
    }
  } catch (error) {
    console.error('Failed to load widget order from localStorage:', error);
  }
  
  return DEFAULT_WIDGET_ORDER;
};

// Utility function for tooltip formatting
const formatCurrencyTooltip = (value: number): [string, string] => {
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(value));
  return [`${value < 0 ? '-' : ''}IDR ${formatted}`, 'Amount'];
};

// Utility function for IDR currency formatting
const formatCurrency = (value: number): string => {
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(value));
  return `${value < 0 ? '-' : ''}IDR ${formatted}`;
};

const ReportsContent: React.FC = () => {
  const [expensesFromService, setExpensesFromService] = useState<ExpenseByCategory[]>([]);
  const [incomeExpenseData, setIncomeExpenseData] = useState<IncomeExpenseTrend[]>([]);
  const [cashFlowData, setCashFlowData] = useState<CashFlowData[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<DashboardTransaction[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Widget order state - load from localStorage
  const [widgetOrder, setWidgetOrder] = useState<string[]>(() => loadWidgetOrder());

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);

  // Control panel state
  const [showControlPanel, setShowControlPanel] = useState(false);

  // Widget visibility state
  const [widgetVisibility, setWidgetVisibility] = useState({
    balanceTrend: true,
    expensesByCategory: true,
    incomeVsExpenses: true,
    cashFlow: true,
    recentTransactions: true,
    budgetStatus: true,
  });

  const toggleWidgetVisibility = (widgetKey: keyof typeof widgetVisibility) => {
    setWidgetVisibility(prev => ({
      ...prev,
      [widgetKey]: !prev[widgetKey],
    }));
  };

  // DnD-Kit sensors for drag and drop
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

  // Drag handlers
  const handleDragStart = useCallback((event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.findIndex((item) => item === active.id);
        const newIndex = items.findIndex((item) => item === over.id);

        if (oldIndex === -1 || newIndex === -1) {return items;}

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const {
    state: { periodLabel, activePeriod, customRangeDraft },
  } = usePeriodNavigation();

  // Save widget order to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(WIDGET_ORDER_STORAGE_KEY, JSON.stringify(widgetOrder));
      } catch (error) {
        console.error('Failed to save widget order to localStorage:', error);
      }
    }
  }, [widgetOrder]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [expenses, incomeExpense, cashFlow, transactions, budgets] = await Promise.all([
          analyticsService.fetchExpensesByCategory(),
          analyticsService.fetchIncomeExpenseTrend(),
          analyticsService.fetchCashFlow(),
          analyticsService.fetchRecentTransactions(30),
          budgetService.fetchBudgetStatus(),
        ]);
        setExpensesFromService(expenses);
        setIncomeExpenseData(incomeExpense);
        setCashFlowData(cashFlow);
        setRecentTransactions(transactions);
        setBudgetStatus(budgets);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  // Filter expense data to only show categories with percentage >= 0.5% (rounds to 1% or more)
  const filteredExpenseData = React.useMemo(() => {
    const nonZero = expensesFromService.filter((item) => item.value > 0);
    const total = nonZero.reduce((sum, item) => sum + item.value, 0);
    return total > 0 ? nonZero.filter((item) => (item.value / total) >= 0.005) : [];
  }, [expensesFromService]);

  // Widget components map
  const widgets: Record<string, { title: string; component: React.ReactNode }> = {
    balanceTrend: {
      title: 'Balance Trend',
      component: (
        <BalanceTrendWidget
          formatCurrency={formatCurrency}
          height={350}
          lineColor="#2563eb"
        />
      ),
    },
    expensesByCategory: {
      title: 'Expenses by Category',
      component: loading ? (
        <div className="text-center py-5">Loading...</div>
      ) : filteredExpenseData.length === 0 ? (
        <div className="text-center text-muted py-5">No expense data available</div>
      ) : (
        <CategoryPieChart
          data={filteredExpenseData}
          colors={[...COLORS]}
          formatValue={formatCurrency}
          height={350}
          outerRadius={100}
        />
      ),
    },
    incomeVsExpenses: {
      title: 'Income vs Expenses (Yearly)',
      component: loading ? (
        <div className="text-center py-5">Loading...</div>
      ) : incomeExpenseData.length === 0 ? (
        <div className="text-center text-muted py-5">No income/expense data available</div>
      ) : (
        <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <IncomeExpenseBarChart
            data={incomeExpenseData}
            formatValue={(value) => formatCurrencyTooltip(value)[0]}
            height="100%"
            incomeColor="#2ecc71"
            expenseColor="#e74c3c"
            incomeLabel="Income"
            expenseLabel="Expense"
          />
        </div>
      ),
    },
    cashFlow: {
      title: 'Cash Flow Analysis',
      component: loading ? (
        <div className="text-center py-5">Loading...</div>
      ) : cashFlowData.length === 0 ? (
        <div className="text-center text-muted py-5">No cash flow data available</div>
      ) : (
        <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <CashFlowChart
            data={cashFlowData}
            formatValue={(value) => formatCurrencyTooltip(value)[0]}
            height="100%"
            incomeColor="#2ecc71"
            expenseColor="#e74c3c"
            netColor="#000000"
            incomeLabel="Income"
            expenseLabel="Expense"
            netLabel="Cash flow"
          />
        </div>
      ),
    },
    recentTransactions: {
      title: 'Recent Transactions',
      component: loading ? (
        <div className="text-center py-5">Loading...</div>
      ) : (
        <RecentTransactionsList
          transactions={recentTransactions}
          formatCurrency={formatCurrency}
          emptyMessage="No recent transactions"
          height="100%"
        />
      ),
    },
    budgetStatus: {
      title: 'Budget Status',
      component: loading ? (
        <div className="text-center py-5">Loading...</div>
      ) : (
        <BudgetStatusList
          budgets={budgetStatus}
          formatCurrency={formatCurrency}
          limit={5}
          emptyMessage="No budget data available"
        />
      ),
    },
  };

  return (
    <Container  fluid>
      <Row>
        <Col lg={12} className="mb-4">
          <h1 className="mb-3">Reports & Analytics</h1>
          <div className="d-flex align-items-start mb-3" style={{ position: 'relative' }}>
            <div style={{ flex: 1 }}></div>
            <PeriodNavigation>
              <PeriodRangeSelector
                label={periodLabel}
                activePeriod={activePeriod}
                customRange={customRangeDraft}
              />
            </PeriodNavigation>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              {/* Widget Control Panel */}
              <Dropdown show={showControlPanel} onToggle={(isOpen) => setShowControlPanel(isOpen)}>
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
                      className="custom-widget-checkbox"
                    />
                  ))}
                </div>
              </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </Col>
      </Row>

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
                const visibility = widgetVisibility[widgetId as keyof typeof widgetVisibility];

                return (
                  <SortableWidgetCard
                    key={widgetId}
                    widgetId={widgetId}
                    widget={widget}
                    visibility={visibility}
                    onToggleVisibility={() => toggleWidgetVisibility(widgetId as keyof typeof widgetVisibility)}
                  />
                );
              })}
          </Row>
        </SortableContext>

        <DragOverlay>
          {activeId
            ? (() => {
                const widget = widgets[activeId];
                const visibility = widgetVisibility[activeId as keyof typeof widgetVisibility];
                return widget ? (
                  <WidgetCard widgetId={activeId} widget={widget} visibility={visibility} />
                ) : null;
              })()
            : null}
        </DragOverlay>
      </DndContext>

    </Container>
  );
};

const Reports: React.FC = () => (
  <PeriodNavigationProvider initialDate={new Date()}>
    <ReportsContent />
  </PeriodNavigationProvider>
);

export default Reports;
