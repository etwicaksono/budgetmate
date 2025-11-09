import React from 'react';
// TODO: Replace static cash flow charts with live transactional data.
import { Card, Row, Col } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart, Area } from 'recharts';

interface CashFlowProps {
  currentMonth: string;
}

const CashFlow: React.FC<CashFlowProps> = ({ currentMonth }) => {
  const dailyCashFlow = [
    { date: '9/1/2025', income: 4500000, expense: 200000, cashFlow: 4300000 },
    { date: '9/2/2025', income: 150000, expense: 350000, cashFlow: -200000 },
    { date: '9/5/2025', income: 300000, expense: 450000, cashFlow: -150000 },
    { date: '9/7/2025', income: 2800000, expense: 180000, cashFlow: 2620000 },
    { date: '9/9/2025', income: 0, expense: 4500000, cashFlow: -4500000 },
    { date: '9/11/2025', income: 3200000, expense: 280000, cashFlow: 2920000 },
    { date: '9/13/2025', income: 0, expense: 5500000, cashFlow: -5500000 },
    { date: '9/15/2025', income: 0, expense: 200000, cashFlow: -200000 },
    { date: '9/17/2025', income: 0, expense: 150000, cashFlow: -150000 },
    { date: '9/19/2025', income: 0, expense: 320000, cashFlow: -320000 },
    { date: '9/21/2025', income: 0, expense: 180000, cashFlow: -180000 },
    { date: '9/23/2025', income: 0, expense: 220000, cashFlow: -220000 },
    { date: '9/25/2025', income: 0, expense: 190000, cashFlow: -190000 },
    { date: '9/27/2025', income: 0, expense: 280000, cashFlow: -280000 },
    { date: '9/30/2025', income: 8800000, expense: 350000, cashFlow: 8450000 },
  ];

  const cumulativeCashFlow = [
    { date: '9/1/2025', currentPeriod: 18000000, previousPeriod: 16500000, sameTimePrevious: 17000000 },
    { date: '9/3/2025', currentPeriod: 17900000, previousPeriod: 16450000, sameTimePrevious: 17100000 },
    { date: '9/5/2025', currentPeriod: 17800000, previousPeriod: 16400000, sameTimePrevious: 17050000 },
    { date: '9/7/2025', currentPeriod: 17650000, previousPeriod: 16350000, sameTimePrevious: 17000000 },
    { date: '9/9/2025', currentPeriod: 17200000, previousPeriod: 16800000, sameTimePrevious: 17200000 },
    { date: '9/11/2025', currentPeriod: 16800000, previousPeriod: 17200000, sameTimePrevious: 17800000 },
    { date: '9/14/2025', currentPeriod: 16400000, previousPeriod: 17500000, sameTimePrevious: 18000000 },
    { date: '9/17/2025', currentPeriod: 16000000, previousPeriod: 17400000, sameTimePrevious: 18100000 },
    { date: '9/20/2025', currentPeriod: 15700000, previousPeriod: 17300000, sameTimePrevious: 18200000 },
    { date: '9/23/2025', currentPeriod: 15400000, previousPeriod: 16800000, sameTimePrevious: 18300000 },
    { date: '9/26/2025', currentPeriod: 15100000, previousPeriod: 16300000, sameTimePrevious: 18400000 },
    { date: '9/30/2025', currentPeriod: 14755284.59, previousPeriod: 15800000, sameTimePrevious: 18500000 },
  ];

  const expenseFlowData = [
    { date: '9/1/2025', expense: 18000000, income: 17500000 },
    { date: '9/3/2025', expense: 17900000, income: 17450000 },
    { date: '9/5/2025', expense: 17750000, income: 17400000 },
    { date: '9/8/2025', expense: 17600000, income: 17350000 },
    { date: '9/11/2025', expense: 17400000, income: 17200000 },
    { date: '9/14/2025', expense: 17200000, income: 17100000 },
    { date: '9/17/2025', expense: 17000000, income: 17000000 },
    { date: '9/19/2025', expense: 16800000, income: 16950000 },
    { date: '9/21/2025', expense: 16600000, income: 16900000 },
    { date: '9/23/2025', expense: 16400000, income: 16850000 },
    { date: '9/25/2025', expense: 16200000, income: 16800000 },
    { date: '9/27/2025', expense: 16000000, income: 16750000 },
    { date: '9/30/2025', expense: 15755284.59, income: 16700000 },
  ];

  const formatCurrency = (value: number): string => {
    return `IDR ${value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatYAxis = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`;
    } else if (value <= -1000000) {
      return `-${(Math.abs(value) / 1000000).toFixed(0)}M`;
    }
    return value.toLocaleString();
  };

  const totalIncome = 18385052.41;
  const totalExpense = 33140337.00;
  const netCashFlow = totalIncome - totalExpense;
  const percentChange = -625;

  return (
    <div className="cash-flow">
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h5 className="mb-1">{currentMonth}</h5>
              <h2 className="mb-0 fw-bold text-danger">{formatCurrency(netCashFlow)}</h2>
            </div>
            <div className="text-end">
              <p className="mb-0 text-muted small">vs previous period</p>
              <p className="mb-0 text-danger fw-bold">
                ↓ {percentChange}%
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyCashFlow}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#999" style={{ fontSize: '12px' }} />
              <YAxis stroke="#999" style={{ fontSize: '12px' }} tickFormatter={formatYAxis} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <Legend />
              <Bar dataKey="income" fill="#00C49F" name="Income" />
              <Bar dataKey="expense" fill="#FF6B6B" name="Expense" />
              <Bar dataKey="cashFlow" fill="#0088FE" name="Cash flow" />
            </BarChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>

      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <div className="mb-3">
            <h5>Cash Flow Summary</h5>
          </div>

          <Row className="mb-4">
            <Col md={6}>
              <div className="d-flex align-items-center mb-3">
                <div className="flex-grow-1">
                  <p className="mb-1 small text-muted">Income</p>
                  <div className="progress" style={{ height: '30px' }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: '55%' }}
                      aria-valuenow={55}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
                <div className="ms-3 text-end">
                  <p className="mb-0 fw-bold text-success">{formatCurrency(totalIncome)}</p>
                </div>
              </div>

              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="mb-1 small text-muted">Expense</p>
                  <div className="progress" style={{ height: '30px' }}>
                    <div
                      className="progress-bar bg-danger"
                      role="progressbar"
                      style={{ width: '100%' }}
                      aria-valuenow={100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
                <div className="ms-3 text-end">
                  <p className="mb-0 fw-bold text-danger">-{formatCurrency(totalExpense)}</p>
                </div>
              </div>
            </Col>

            <Col md={6}>
              <div className="d-flex align-items-center mb-3">
                <div className="flex-grow-1">
                  <p className="mb-1 small text-muted">Income</p>
                  <div className="progress" style={{ height: '30px' }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: '55%' }}
                      aria-valuenow={55}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
                <div className="ms-3 text-end">
                  <p className="mb-0 fw-bold text-success">{formatCurrency(totalIncome)}</p>
                </div>
              </div>

              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <p className="mb-1 small text-muted">Expense</p>
                  <div className="progress" style={{ height: '30px' }}>
                    <div
                      className="progress-bar bg-danger"
                      role="progressbar"
                      style={{ width: '100%' }}
                      aria-valuenow={100}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                </div>
                <div className="ms-3 text-end">
                  <p className="mb-0 fw-bold text-danger">-{formatCurrency(totalExpense)}</p>
                </div>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <div className="mb-3">
            <div className="d-flex justify-content-center gap-4 mb-2">
              <div className="form-check">
                <input className="form-check-input" type="radio" name="cashFlowView" id="cashFlowRadio" defaultChecked />
                <label className="form-check-label" htmlFor="cashFlowRadio">
                  Cash flow
                </label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="cashFlowView" id="expenseRadio" />
                <label className="form-check-label" htmlFor="expenseRadio">
                  Expense
                </label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="radio" name="cashFlowView" id="incomeRadio" />
                <label className="form-check-label" htmlFor="incomeRadio">
                  Income
                </label>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={cumulativeCashFlow}>
              <defs>
                <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0088FE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" stroke="#999" style={{ fontSize: '12px' }} />
              <YAxis stroke="#999" style={{ fontSize: '12px' }} tickFormatter={formatYAxis} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="currentPeriod"
                stroke="#0088FE"
                strokeWidth={2}
                fill="url(#colorCurrent)"
                name="Current period"
              />
              <Line
                type="monotone"
                dataKey="previousPeriod"
                stroke="#FF6B6B"
                strokeWidth={2}
                name="Previous period"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="sameTimePrevious"
                stroke="#FFB84D"
                strokeWidth={2}
                name="Same period a year ago"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CashFlow;
