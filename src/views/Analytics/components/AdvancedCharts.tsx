import React, { useState } from 'react';
// TODO: Replace mocked advanced charts with real analytics feeds.
import { Card, Form, Row, Col } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface AdvancedChartsProps {
  currentMonth: string;
}

type ChartType = 'line' | 'bar' | 'area';
type GraphType = 'balance' | 'income' | 'expense' | 'cashflow';
type GroupBy = 'none' | 'account' | 'category';
type Granularity = 'day' | 'week' | 'month' | 'year';

const AdvancedCharts: React.FC<AdvancedChartsProps> = ({ currentMonth }) => {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [graphType, setGraphType] = useState<GraphType>('balance');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [granularity, setGranularity] = useState<Granularity>('day');

  const balanceData = [
    { date: '9/1/2025', value: 24000000 },
    { date: '9/3/2025', value: 23500000 },
    { date: '9/5/2025', value: 23200000 },
    { date: '9/7/2025', value: 22800000 },
    { date: '9/9/2025', value: 22200000 },
    { date: '9/11/2025', value: 23500000 },
    { date: '9/14/2025', value: 21500000 },
    { date: '9/17/2025', value: 20800000 },
    { date: '9/20/2025', value: 13000000 },
    { date: '9/23/2025', value: 12500000 },
    { date: '9/26/2025', value: 12000000 },
    { date: '9/30/2025', value: 11500000 },
  ];

  const formatCurrency = (value: number): string => {
    return `IDR ${value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatYAxis = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`;
    }
    return value.toLocaleString();
  };

  return (
    <div className="advanced-charts">
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="mb-4">
            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-bold">Type</Form.Label>
                <Form.Select
                  size="sm"
                  value={graphType}
                  onChange={(e) => setGraphType(e.target.value as GraphType)}
                >
                  <option value="balance">Balance</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="cashflow">Cash Flow</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-bold">Graph type</Form.Label>
                <Form.Select
                  size="sm"
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as ChartType)}
                >
                  <option value="line">Line Chart</option>
                  <option value="bar">Bar Chart</option>
                  <option value="area">Area Chart</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-bold">Group by</Form.Label>
                <Form.Select
                  size="sm"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                >
                  <option value="none">None</option>
                  <option value="account">Account</option>
                  <option value="category">Category</option>
                </Form.Select>
              </Form.Group>
            </Col>

            <Col md={3}>
              <Form.Group>
                <Form.Label className="small fw-bold">Granularity</Form.Label>
                <Form.Select
                  size="sm"
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value as Granularity)}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <div className="mb-3">
            <div className="d-flex align-items-center gap-3 mb-2">
              <Form.Control
                type="text"
                size="sm"
                placeholder="Select your graph"
                style={{ maxWidth: '300px' }}
              />
              <button
                className="btn btn-sm btn-success"
                style={{
                  width: '32px',
                  height: '32px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                +
              </button>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={500}>
            <AreaChart data={balanceData}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0088FE" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                stroke="#999"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#999"
                style={{ fontSize: '12px' }}
                tickFormatter={formatYAxis}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), 'Balance']}
                contentStyle={{ borderRadius: '8px', border: '1px solid #ddd' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#0088FE"
                strokeWidth={2}
                fill="url(#colorBalance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>
    </div>
  );
};

export default AdvancedCharts;
