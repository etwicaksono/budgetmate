import React, { useState, ChangeEvent, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Row, Col, Card, Container, Form, Dropdown } from 'react-bootstrap';
import { FaUniversity, FaCreditCard, FaWallet, FaPiggyBank, FaPencilAlt } from 'react-icons/fa';
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
import { accountService, type ApiAccountResponse } from '../../services/accountService';
import analyticsService, {
  type ExpenseByCategory,
  type IncomeExpenseTrend,
  type DashboardTransaction,
} from '../../services/analyticsService';
import budgetService, { type BudgetStatus } from '../../services/budgetService';
import { resolveIconFromApiName, lightenColor, type Account } from '../../utils/accountUtils';
import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '../../components/PeriodNavigation';
import PeriodRangeSelector from '../../components/PeriodRangeSelector';
import AddAccountModal, { type NewAccountForm } from '../../components/AddAccountModal';
import CategoryPieChart from '../../components/CategoryPieChart';
import IncomeExpenseBarChart from '../../components/IncomeExpenseBarChart';
import RecentTransactionsList from '../../components/RecentTransactionsList';
import BudgetStatusList from '../../components/BudgetStatusList';
import BalanceTrendWidget from '../../components/Widget/BalanceTrendWidget';
import { SortableWidgetCard, WidgetCard } from '../../components/WidgetCards';

type AccountType = 'Bank' | 'Credit Card' | 'Cash';
type AccountTypeIcons = {
  [K in AccountType]: React.ComponentType<{ size?: number }>;
};

// LocalStorage key for widget order
const WIDGET_ORDER_STORAGE_KEY = 'dashboard-widget-order';
const DEFAULT_WIDGET_ORDER = [
  'balanceTrend',
  'expensesByCategory',
  'incomeVsExpenses',
  'recentTransactions',
  'budgetStatus',
];

// Helper function to load widget order from localStorage
const loadWidgetOrder = (): string[] => {
  if (typeof window === 'undefined') return DEFAULT_WIDGET_ORDER;
  
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

const mapApiAccountToAccount = (apiAccount: ApiAccountResponse, index: number): Account | null => {
  if (!apiAccount.id) {
    console.warn('Skipping account without ID:', apiAccount);
    return null;
  }

  const IconComp = resolveIconFromApiName(apiAccount.icon) ?? (FaWallet as React.ComponentType<{ size?: number }>);
  const color = typeof apiAccount.color === 'string' && apiAccount.color ? apiAccount.color : '#047857';
  const usabilityStr = typeof apiAccount.usability === 'string' ? apiAccount.usability.toUpperCase() : undefined;
  const usability: 'USABLE' | 'PROTECTED' = usabilityStr === 'PROTECTED' ? 'PROTECTED' : 'USABLE';
  const iconKey = typeof apiAccount.icon === 'string' && apiAccount.icon ? apiAccount.icon : 'FaWallet';

  return {
    id: apiAccount.id,
    personal_id: apiAccount.personal_id,
    order: index + 1,
    name: apiAccount.name ?? 'Unnamed Account',
    type: apiAccount.account_type ?? 'General',
    balance: apiAccount.initial_amount ?? 0,
    icon: IconComp,
    accentColor: color,
    backgroundColor: lightenColor(color),
    isActive: apiAccount.active ?? true,
    isArchived: apiAccount.active === false,
    usability,
    iconKey,
  };
};

const DashboardContent: React.FC = () => {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [expenseData, setExpenseData] = useState<ExpenseByCategory[]>([]);
  const [incomeExpenseData, setIncomeExpenseData] = useState<IncomeExpenseTrend[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<DashboardTransaction[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = React.useRef<boolean>(false);

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

        if (oldIndex === -1 || newIndex === -1) return items;

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

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
    // Prevent double fetching in StrictMode or multiple mounts
    if (fetchedRef.current) {
      return;
    }
    fetchedRef.current = true;

    const loadDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch all dashboard data in parallel
        const [apiAccounts, expenses, trends, transactions, budgets] = await Promise.all([
          accountService.fetchAccounts(),
          analyticsService.fetchExpensesByCategory(),
          analyticsService.fetchIncomeExpenseTrend(),
          analyticsService.fetchRecentTransactions(20),
          budgetService.fetchBudgetStatus(),
        ]);

        const activeAccounts = apiAccounts.filter((a) => a.active !== false);
        const mapped = activeAccounts.map(mapApiAccountToAccount).filter((a): a is Account => a !== null);

        setAccounts(mapped);
        setExpenseData(expenses);
        setIncomeExpenseData(trends);
        setRecentTransactions(transactions);
        setBudgetStatus(budgets);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardData();
  }, []);


  const {
    state: { periodLabel, activePeriod, customRangeDraft },
  } = usePeriodNavigation();

  const handleSelectAccount = (account: Account): void => {
    router.push(`/accounts/${account.id}?from=dashboard`);
  };


  const accountToNewAccountForm = (account: Account): NewAccountForm => ({
    name: account.name,
    color: account.accentColor,
    accountType: account.type,
    initialAmount: account.balance.toString(),
    currency: account.currency || 'IDR',
    excludeFromStatistics: account.excludeFromStatistics || false,
    iconKey: account.iconKey || 'FaWallet',
    isActive: account.isActive !== false,
    usability: account.usability || 'USABLE',
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#4ECDC4', '#95E1D3'];

  const formatCurrency = (value: number): string => {
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
    return `${value < 0 ? '-' : ''}IDR ${formatted}`;
  };

  // Filter expense data to only show categories with percentage >= 0.5% (rounds to 1% or more)
  const filteredExpenseData = React.useMemo(() => {
    const nonZero = expenseData.filter((item) => item.value > 0);
    const total = nonZero.reduce((sum, item) => sum + item.value, 0);
    return total > 0 ? nonZero.filter((item) => (item.value / total) >= 0.005) : [];
  }, [expenseData]);

  // Widget components map
  const widgets: Record<string, { title: string; component: React.ReactNode }> = {
    balanceTrend: {
      title: 'Balance Trend',
      component: (
        <BalanceTrendWidget
          formatCurrency={formatCurrency}
          height={300}
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
          colors={COLORS}
          formatValue={formatCurrency}
          height={300}
          outerRadius={80}
        />
      ),
    },
    incomeVsExpenses: {
      title: 'Income vs Expenses',
      component: loading ? (
        <div className="text-center py-5">Loading...</div>
      ) : incomeExpenseData.length === 0 ? (
        <div className="text-center text-muted py-5">No income/expense data available</div>
      ) : (
        <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <IncomeExpenseBarChart
            data={incomeExpenseData}
            formatValue={formatCurrency}
            height="100%"
            incomeColor="#2ecc71"
            expenseColor="#e74c3c"
            incomeLabel="Income"
            expenseLabel="Expense"
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
          limit={3}
          emptyMessage="No budget data available"
        />
      ),
    },
  };

  return (
    <Container fluid>
      {/* Account Cards Section */}
      <section className="mb-5">
        <Row>
          {accounts.map((account) => {
            return (
              <Col key={account.id} xs={12} sm={6} md={3} className="mb-3">
                <div
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                  }}
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
                  <Card
                    className="h-100 account-card"
                    style={{ backgroundColor: account.accentColor, borderColor: account.accentColor }}
                    onClick={() => handleSelectAccount(account)}
                  >
                    <Card.Body className="account-card__body">
                      <span className="account-card__icon">
                        <account.icon size={24} />
                      </span>
                      <div className="account-card__details">
                        <div className="account-card__name">{account.name}</div>
                        <div className="account-card__balance">{formatCurrency(account.balance)}</div>
                  <button
                    className="edit-account-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingAccount(account);
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
                      lineHeight: 1,
                    }}
                    title="Edit account"
                  >
                    <FaPencilAlt size={16} color="#333" />
                  </button>
                      </div>
                    </Card.Body>
                  </Card>
                </div>
              </Col>
            );
          })}
          {/* Add Account Card */}
          <Col xs={12} sm={6} md={3} className="mb-3">
            <Card
              className="h-100 add-account-card"
              onClick={() => setShowAddAccountModal(true)}
              style={{ cursor: 'pointer' }}
            >
              <Card.Body className="add-account-card__body">
                <span className="add-account-card__plus">+</span>
                <span className="add-account-card__text">Add Account</span>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Customizable Widgets Section */}
      <section>
        <Row>
          <Col lg={12} className="mb-4">
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
                      width: '100px',
                      height: '100px',
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
      </section>
      {/* Add/Edit Account Modal */}
      <AddAccountModal
        show={showAddAccountModal || !!editingAccount}
        onHide={() => {
          setShowAddAccountModal(false);
          setEditingAccount(null);
        }}
        onSubmit={async () => {
          // Account creation/update is handled by the modal's internal API call
          // Refresh all dashboard data after successful operation
          try {
            const [apiAccounts, expenses, trends, transactions, budgets] = await Promise.all([
              accountService.fetchAccounts(),
              analyticsService.fetchExpensesByCategory(),
              analyticsService.fetchIncomeExpenseTrend(),
              analyticsService.fetchRecentTransactions(30),
              budgetService.fetchBudgetStatus(),
            ]);

            const activeAccounts = apiAccounts.filter((a) => a.active !== false);
            const mapped = activeAccounts.map(mapApiAccountToAccount).filter((a): a is Account => a !== null);

            setAccounts(mapped);
            setExpenseData(expenses);
            setIncomeExpenseData(trends);
            setRecentTransactions(transactions);
            setBudgetStatus(budgets);
          } catch (error) {
            console.error('Failed to refresh dashboard data:', error);
          }
          setShowAddAccountModal(false);
          setEditingAccount(null);
        }}
        title={editingAccount ? 'Edit Account' : 'Add Account'}
        initialValue={editingAccount ? accountToNewAccountForm(editingAccount) : undefined}
        accountId={editingAccount?.id}
        isEditMode={!!editingAccount}
      />
      </Container>
  );
}

const Dashboard: React.FC = () => (
  <PeriodNavigationProvider initialDate={new Date()}>
    <DashboardContent />
  </PeriodNavigationProvider>
);

export default Dashboard;
