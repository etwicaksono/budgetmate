import React, { useState } from 'react';
import { Row, Col, Card, Button, Container } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard = () => {
  // Sample account data
  const [accounts] = useState([
    { id: 1, name: 'Checking Account', balance: 2450.75, type: 'Bank', color: '#3498db' },
    { id: 2, name: 'Savings Account', balance: 8750.20, type: 'Bank', color: '#2ecc71' },
    { id: 3, name: 'Credit Card', balance: -1250.30, type: 'Credit', color: '#e74c3c' },
    { id: 4, name: 'Cash', balance: 420.00, type: 'Cash', color: '#f39c12' },
  ]);

  // Sample expense data for the chart
  const expenseData = [
    { name: 'Food', value: 400 },
    { name: 'Transport', value: 300 },
    { name: 'Shopping', value: 200 },
    { name: 'Entertainment', value: 150 },
    { name: 'Utilities', value: 250 },
  ];

  // Sample income vs expense data
  const incomeExpenseData = [
    { name: 'Jan', income: 4000, expense: 2400 },
    { name: 'Feb', income: 3000, expense: 1398 },
    { name: 'Mar', income: 2000, expense: 9800 },
    { name: 'Apr', income: 2780, expense: 3908 },
    { name: 'May', income: 1890, expense: 4800 },
    { name: 'Jun', income: 2390, expense: 3800 },
  ];

  // Sample recent transactions
  const recentTransactions = [
    { id: 1, description: 'Grocery Store', amount: -85.30, date: '2023-07-15', category: 'Food' },
    { id: 2, description: 'Salary Deposit', amount: 3500.00, date: '2023-07-01', category: 'Salary' },
    { id: 3, description: 'Gas Station', amount: -45.00, date: '2023-07-14', category: 'Transport' },
    { id: 4, description: 'Online Purchase', amount: -120.50, date: '2023-07-13', category: 'Shopping' },
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Container fluid>
      <h1 className="mb-4">Dashboard</h1>
      
      {/* Account Cards Section */}
      <section className="mb-5">
        <h2 className="mb-3">Accounts</h2>
        <Row>
          {accounts.map((account) => (
            <Col key={account.id} xs={12} sm={6} md={3} className="mb-3">
              <Card 
                className="h-100 account-card" 
                style={{ borderLeft: `4px solid ${account.color}` }}
              >
                <Card.Body>
                  <Card.Title>{account.name}</Card.Title>
                  <Card.Text className="account-balance">
                    ${account.balance.toFixed(2)}
                  </Card.Text>
                  <Card.Text className="text-muted">
                    {account.type}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
          {/* Add Account Card */}
          <Col xs={12} sm={6} md={3} className="mb-3">
            <Card className="h-100 add-account-card d-flex align-items-center justify-content-center">
              <Card.Body className="text-center">
                <Button variant="outline-primary" size="lg">
                  + Add Account
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </section>

      {/* Customizable Widgets Section */}
      <section>
        <h2 className="mb-3">Financial Overview</h2>
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
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
                      aria-valuenow="50" 
                      aria-valuemin="0" 
                      aria-valuemax="100"
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
                      aria-valuenow="80" 
                      aria-valuemin="0" 
                      aria-valuemax="100"
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
                      aria-valuenow="25" 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </section>
    </Container>
  );
};

export default Dashboard;