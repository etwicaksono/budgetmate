import React, { useState, ChangeEvent } from 'react';
import { Container, Row, Col, Card, Form } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

// Type definitions
interface ExpenseData {
  name: string;
  amount: number;
}

interface IncomeExpenseData {
  name: string;
  income: number;
  expense: number;
}

interface CashFlowData {
  month: string;
  inflow: number;
  outflow: number;
  net: number;
}

interface PieLabelProps {
  name: string;
  percent: number;
}

type TimeRange = 'weekly' | 'monthly' | 'yearly';

interface ExpenseDataMap {
  weekly: ExpenseData[];
  monthly: ExpenseData[];
  yearly: ExpenseData[];
}

// Constants with proper typing
const INITIAL_EXPENSE_DATA: ExpenseDataMap = {
  monthly: [
    { name: 'Food', amount: 800 },
    { name: 'Transport', amount: 400 },
    { name: 'Shopping', amount: 600 },
    { name: 'Entertainment', amount: 300 },
    { name: 'Utilities', amount: 500 },
    { name: 'Healthcare', amount: 200 },
  ],
  weekly: [
    { name: 'Food', amount: 200 },
    { name: 'Transport', amount: 100 },
    { name: 'Shopping', amount: 150 },
    { name: 'Entertainment', amount: 75 },
    { name: 'Utilities', amount: 125 },
    { name: 'Healthcare', amount: 50 },
  ],
  yearly: [
    { name: 'Food', amount: 9600 },
    { name: 'Transport', amount: 4800 },
    { name: 'Shopping', amount: 7200 },
    { name: 'Entertainment', amount: 3600 },
    { name: 'Utilities', amount: 6000 },
    { name: 'Healthcare', amount: 2400 },
  ]
};

const INCOME_EXPENSE_DATA: IncomeExpenseData[] = [
  { name: 'Jan', income: 4000, expense: 2400 },
  { name: 'Feb', income: 3000, expense: 1398 },
  { name: 'Mar', income: 2000, expense: 9800 },
  { name: 'Apr', income: 2780, expense: 3908 },
  { name: 'May', income: 1890, expense: 4800 },
  { name: 'Jun', income: 2390, expense: 3800 },
  { name: 'Jul', income: 3490, expense: 4300 },
  { name: 'Aug', income: 3200, expense: 2800 },
  { name: 'Sep', income: 2800, expense: 3100 },
  { name: 'Oct', income: 4000, expense: 2200 },
  { name: 'Nov', income: 3700, expense: 2900 },
  { name: 'Dec', income: 4500, expense: 3500 },
];

const CASH_FLOW_DATA: CashFlowData[] = [
  { month: 'Jan', inflow: 4000, outflow: 2400, net: 1600 },
  { month: 'Feb', inflow: 3000, outflow: 1398, net: 1602 },
  { month: 'Mar', inflow: 2000, outflow: 9800, net: -7800 },
  { month: 'Apr', inflow: 2780, outflow: 3908, net: -1128 },
  { month: 'May', inflow: 1890, outflow: 4800, net: -2910 },
  { month: 'Jun', inflow: 2390, outflow: 3800, net: -1410 },
  { month: 'Jul', inflow: 3490, outflow: 4300, net: -810 },
  { month: 'Aug', inflow: 3200, outflow: 2800, net: 400 },
  { month: 'Sep', inflow: 2800, outflow: 3100, net: -300 },
  { month: 'Oct', inflow: 4000, outflow: 2200, net: 1800 },
];

const COLORS: readonly string[] = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B'];

// Utility function for tooltip formatting
const formatCurrency = (value: number): [string, string] => [`$${value}`, 'Amount'];

// Utility function for pie chart labels
const pieLabelFormatter = ({ name, percent }: PieLabelProps): string => 
  `${name} ${(percent * 100).toFixed(0)}%`;

const Reports: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('monthly');

  // Sample expense data for different time ranges
  const expenseData: ExpenseDataMap = INITIAL_EXPENSE_DATA;

  const handleTimeRangeChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    setTimeRange(e.target.value as TimeRange);
  };

  return (
    <Container >
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Reports & Analytics</h1>
        <Form.Select
          value={timeRange}
          onChange={handleTimeRangeChange}
          style={{ width: '200px' }}
        >
          <option value="weekly">This Week</option>
          <option value="monthly">This Month</option>
          <option value="yearly">This Year</option>
        </Form.Select>
      </div>

      <Row>
        {/* Expense by Category - Pie Chart */}
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header>Expenses by Category</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={expenseData[timeRange]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="amount"
                    label={pieLabelFormatter}
                  >
                    {expenseData[timeRange].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={formatCurrency} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Income vs Expenses - Bar Chart */}
        <Col lg={6} className="mb-4">
          <Card>
            <Card.Header>Income vs Expenses (Yearly)</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={INCOME_EXPENSE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={formatCurrency} />
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
        {/* Cash Flow Analysis */}
        <Col lg={12} className="mb-4">
          <Card>
            <Card.Header>Cash Flow Analysis</Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={CASH_FLOW_DATA}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={formatCurrency} />
                  <Legend />
                  <Line type="monotone" dataKey="inflow" stroke="#2ecc71" name="Total Inflow" strokeWidth={2} />
                  <Line type="monotone" dataKey="outflow" stroke="#e74c3c" name="Total Outflow" strokeWidth={2} />
                  <Line type="monotone" dataKey="net" stroke="#3498db" name="Net Cash Flow" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Summary Cards */}
        <Col md={4} className="mb-4">
          <Card className="text-center bg-primary text-white">
            <Card.Body>
              <Card.Title>Total Income</Card.Title>
              <Card.Text className="display-4">$35,680</Card.Text>
              <Card.Text className="text-light">This Year</Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-4">
          <Card className="text-center bg-danger text-white">
            <Card.Body>
              <Card.Title>Total Expenses</Card.Title>
              <Card.Text className="display-4">$29,226</Card.Text>
              <Card.Text className="text-light">This Year</Card.Text>
            </Card.Body>
          </Card>
        </Col>

        <Col md={4} className="mb-4">
          <Card className="text-center bg-success text-white">
            <Card.Body>
              <Card.Title>Net Savings</Card.Title>
              <Card.Text className="display-4">$6,454</Card.Text>
              <Card.Text className="text-light">This Year</Card.Text>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Reports;
