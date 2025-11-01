import React, { useState, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Row, Col, Card, Container } from 'react-bootstrap';
import { FaUniversity, FaCreditCard, FaWallet, FaPiggyBank, FaPencilAlt } from 'react-icons/fa';
import { accountService, type ApiAccountResponse } from '../../services/accountService';
import { resolveIconFromApiName, lightenColor, generateAccountId, type Account } from '../../utils/accountUtils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '../../components/PeriodNavigation';
import PeriodRangeSelector from '../../components/PeriodRangeSelector';
import AddAccountModal, { type NewAccountForm } from '../../components/AddAccountModal';


 
interface ExpenseData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface IncomeExpenseData {
  name: string;
  income: number;
  expense: number;
}

interface Transaction {
  id: number;
  description: string;
  amount: number;
  date: string;
  category: string;
}

type AccountType = 'Bank' | 'Credit Card' | 'Cash';
type AccountTypeIcons = {
  [K in AccountType]: React.ComponentType<{ size?: number }>;
};

const mapApiAccountToAccount = (apiAccount: ApiAccountResponse, index: number): Account => {
  const IconComp = resolveIconFromApiName(apiAccount.icon) ?? (FaWallet as React.ComponentType<{ size?: number }>);
  const color = typeof apiAccount.color === 'string' && apiAccount.color ? apiAccount.color : '#047857';
  const usabilityStr = typeof apiAccount.usability === 'string' ? apiAccount.usability.toUpperCase() : undefined;
  const usability: 'USABLE' | 'PROTECTED' = usabilityStr === 'PROTECTED' ? 'PROTECTED' : 'USABLE';

  return {
    id: apiAccount.id ?? generateAccountId(apiAccount.name ?? 'Account'),
    personal_id: apiAccount.personal_id,
    order: index + 1,
    name: apiAccount.name ?? 'Unnamed Account',
    type: apiAccount.account_type ?? 'General',
    balance: 0, // Balance data not available in API response
    icon: IconComp,
    accentColor: color,
    backgroundColor: lightenColor(color),
    isActive: apiAccount.active ?? true,
    isArchived: apiAccount.active === false,
    usability,
  };
};

const DashboardContent: React.FC = () => {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const fetchedRef = React.useRef<boolean>(false);

  useEffect(() => {
    // Prevent double fetching in StrictMode or multiple mounts
    if (fetchedRef.current) {
      return;
    }
    fetchedRef.current = true;

    const loadAccounts = async () => {
      try {
        const apiAccounts = await accountService.fetchAccounts();
        const activeAccounts = apiAccounts.filter((a) => a.active !== false);
        const mapped = activeAccounts.map(mapApiAccountToAccount);
        setAccounts(mapped);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to fetch accounts for dashboard:', error);
      }
    };

    void loadAccounts();
  }, []);


  const {
    state: { periodLabel, activePeriod, customRangeDraft },
  } = usePeriodNavigation();

  const accountTypeIcons: AccountTypeIcons = {
    Bank: FaUniversity as React.ComponentType<{ size?: number }>,
    'Credit Card': FaCreditCard as React.ComponentType<{ size?: number }>,
    Cash: FaWallet as React.ComponentType<{ size?: number }>,
  };

  const formatCurrency = (value: number): string => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
    return `${value < 0 ? '-' : ''}IDR ${formatted}`;
  };

  const handleSelectAccount = (account: Account): void => {
    router.push(`/accounts/${account.id}?from=dashboard`);
  };

  const mapAddAccountType = (t: string): AccountType => (t === 'Cash' ? 'Cash' : 'Bank');

const accountToNewAccountForm = (account: Account): NewAccountForm => ({
  name: account.name,
  color: account.accentColor,
  accountType: account.type,
  initialAmount: account.balance.toString(),
  currency: account.currency || 'IDR',
  excludeFromStatistics: account.excludeFromStatistics || false,
  iconKey: 'FaWallet',
  isActive: account.isActive !== false,
  usability: account.usability || 'USABLE',
});
  // Sample expense data for the chart
  const expenseData: ExpenseData[] = [
    { name: 'Food', value: 400 },
    { name: 'Transport', value: 300 },
    { name: 'Shopping', value: 200 },
    { name: 'Entertainment', value: 150 },
    { name: 'Utilities', value: 250 },
  ];

  // Sample income vs expense data
  const incomeExpenseData: IncomeExpenseData[] = [
    { name: 'Jan', income: 4000, expense: 2400 },
    { name: 'Feb', income: 3000, expense: 1398 },
    { name: 'Mar', income: 2000, expense: 9800 },
    { name: 'Apr', income: 2780, expense: 3908 },
    { name: 'May', income: 1890, expense: 4800 },
    { name: 'Jun', income: 2390, expense: 3800 },
  ];

  // Sample recent transactions
  const recentTransactions: Transaction[] = [
    { id: 1, description: 'Grocery Store', amount: -85.30, date: '2023-07-15', category: 'Food' },
    { id: 2, description: 'Salary Deposit', amount: 3500.00, date: '2023-07-01', category: 'Salary' },
    { id: 3, description: 'Gas Station', amount: -45.00, date: '2023-07-14', category: 'Transport' },
    { id: 4, description: 'Online Purchase', amount: -120.50, date: '2023-07-13', category: 'Shopping' },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Container>
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
            <PeriodNavigation className="mb-3">
              <PeriodRangeSelector
                label={periodLabel}
                activePeriod={activePeriod}
                customRange={customRangeDraft}
              />
            </PeriodNavigation>
          </Col>
        </Row>
        <Row>
          {/* Expense by Category Chart */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Header>Expenses by Category</Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={expenseData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={(props: PieLabelRenderProps) => {
                        const percent = Number(props.percent ?? 0);
                        return `${props.name ?? ''} ${(percent * 100).toFixed(0)}%`;
                      }}
                    >
                      {expenseData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>

          {/* Income vs Expenses Chart */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Header>Income vs Expenses</Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={incomeExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
                    <Legend />
                    <Bar dataKey="income" fill="#2ecc71" name="Income" />
                    <Bar dataKey="expense" fill="#e74c3c" name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row>
          {/* Recent Transactions */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Header>Recent Transactions</Card.Header>
              <Card.Body>
                <div className="transaction-list">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="transaction-item d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                      <div>
                        <div className="fw-bold">{transaction.description}</div>
                        <div className="text-muted small">{transaction.category} • {transaction.date}</div>
                      </div>
                      <div className={transaction.amount > 0 ? 'text-success' : 'text-danger'}>
                        {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Budget Status */}
          <Col lg={6} className="mb-4">
            <Card>
              <Card.Header>Budget Status</Card.Header>
              <Card.Body>
                <div className="budget-item mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Food Budget</span>
                    <span>$200 of $400</span>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-bar bg-warning"
                      role="progressbar"
                      style={{ width: '50%' }}
                      aria-valuenow={50}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
                <div className="budget-item mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Entertainment</span>
                    <span>$120 of $150</span>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-bar bg-warning"
                      role="progressbar"
                      style={{ width: '80%' }}
                      aria-valuenow={80}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
                <div className="budget-item mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Transport</span>
                    <span>$50 of $200</span>
                  </div>
                  <div className="progress">
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: '25%' }}
                      aria-valuenow={25}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </section>
      {/* Add/Edit Account Modal */}
      <AddAccountModal
        show={showAddAccountModal || !!editingAccount}
        onHide={() => {
          setShowAddAccountModal(false);
          setEditingAccount(null);
        }}
        onSubmit={(form) => {
          if (editingAccount) {
            // Update existing account
            const updatedAccounts = accounts.map((account) =>
              account.id === editingAccount.id
                ? {
                    ...account,
                    name: form.name.trim(),
                    type: form.accountType,
                    balance: parseFloat(form.initialAmount || '0') || 0,
                    accentColor: form.color || '#047857',
                    backgroundColor: lightenColor(form.color || '#047857'),
                    currency: form.currency,
                    excludeFromStatistics: form.excludeFromStatistics,
                    isActive: form.isActive,
                    usability: form.usability,
                  }
                : account
            );
            setAccounts(updatedAccounts);
            setEditingAccount(null);
          } else {
            // Create new account
            const accentColor = form.color || '#047857';
            const newItem: Account = {
              id: generateAccountId(form.name.trim()),
              order: accounts.length + 1,
              name: form.name.trim(),
              type: form.accountType,
              balance: parseFloat(form.initialAmount || '0') || 0,
              icon: resolveIconFromApiName(form.iconKey) ?? (FaWallet as React.ComponentType<{ size?: number }>),
              accentColor,
              backgroundColor: lightenColor(accentColor),
              currency: form.currency,
              excludeFromStatistics: form.excludeFromStatistics,
              isActive: form.isActive,
              usability: form.usability,
            };
            setAccounts([...accounts, newItem]);
            setShowAddAccountModal(false);
          }
        }}
        title={editingAccount ? 'Edit Account' : 'Add Account'}
        initialValue={editingAccount ? accountToNewAccountForm(editingAccount) : undefined}
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
