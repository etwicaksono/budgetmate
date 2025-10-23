import React, { useState, ChangeEvent } from 'react';
import { Row, Col, Card, Button, Container, Modal, Form } from 'react-bootstrap';
import { FaUniversity, FaCreditCard, FaWallet, FaPiggyBank } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import PeriodNavigation, {
  PeriodNavigationProvider,
  usePeriodNavigation,
} from '../../components/PeriodNavigation';
import PeriodRangeSelector from '../../components/PeriodRangeSelector';

interface Account {
  id: number;
  name: string;
  balance: number;
  type: 'Bank' | 'Credit Card' | 'Cash';
  color: string;
}

interface NewAccount {
  name: string;
  type: 'Bank' | 'Credit Card' | 'Cash';
  balance: number | string;
}

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

const DashboardContent: React.FC = () => {
  // Sample account data
  const [accounts, setAccounts] = useState<Account[]>([
    { id: 1, name: 'Checking Account', balance: 2450.75, type: 'Bank', color: '#3498db' },
    { id: 2, name: 'Savings Account', balance: 8750.20, type: 'Bank', color: '#2ecc71' },
    { id: 3, name: 'Credit Card', balance: -1250.30, type: 'Credit Card', color: '#e74c3c' },
    { id: 4, name: 'Cash', balance: 420.00, type: 'Cash', color: '#f39c12' },
  ]);

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccount, setNewAccount] = useState<NewAccount>({
    name: '',
    type: 'Bank',
    balance: 0
  });

  const {
    state: { periodLabel, activePeriod, customRangeDraft },
  } = usePeriodNavigation();

  const accountTypes: AccountType[] = ['Bank', 'Credit Card', 'Cash'];
  const accountColors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#e67e22'];

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

  const handleAddAccount = (): void => {
    if (newAccount.name) {
      const newAccountObj: Account = {
        id: accounts.length + 1,
        name: newAccount.name,
        type: newAccount.type,
        balance: parseFloat(newAccount.balance as string) || 0,
        color: accountColors[accounts.length % accountColors.length]
      };

      setAccounts([...accounts, newAccountObj]);
      setNewAccount({ name: '', type: 'Bank', balance: 0 });
      setShowAddAccountModal(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setNewAccount(prev => ({
      ...prev,
      [name]: value
    }));
  };

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
            const AccountIcon = accountTypeIcons[account.type] || (FaPiggyBank as React.ComponentType<{ size?: number }>);
            return (
              <Col key={account.id} xs={12} sm={6} md={3} className="mb-3">
                <Card
                  className="h-100 account-card"
                  style={{ backgroundColor: account.color, borderColor: account.color }}
                >
                  <Card.Body className="account-card__body">
                    <span className="account-card__icon">
                      <AccountIcon size={24} />
                    </span>
                    <div className="account-card__details">
                      <div className="account-card__name">{account.name}</div>
                      <div className="account-card__balance">{formatCurrency(account.balance)}</div>
                    </div>
                  </Card.Body>
                </Card>
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
      {/* Add Account Modal */}
      <Modal show={showAddAccountModal} onHide={() => setShowAddAccountModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Account</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="accountName">
              <Form.Label>Account Name</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={newAccount.name}
                onChange={handleInputChange}
                placeholder="e.g. Checking Account, Credit Card"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="accountType">
              <Form.Label>Account Type</Form.Label>
              <Form.Select
                name="type"
                value={newAccount.type}
                onChange={handleInputChange}
              >
                {accountTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="accountBalance">
              <Form.Label>Current Balance</Form.Label>
              <Form.Control
                type="number"
                name="balance"
                value={newAccount.balance}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddAccountModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddAccount}>
            Add Account
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

const Dashboard: React.FC = () => (
  <PeriodNavigationProvider initialDate={new Date()}>
    <DashboardContent />
  </PeriodNavigationProvider>
);

export default Dashboard;
