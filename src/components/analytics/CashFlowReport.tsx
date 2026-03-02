'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Nav, Placeholder } from 'react-bootstrap';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
} from 'recharts';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { analyticsService, type CashFlowResponse } from '@/services/analyticsService';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';
import { useAuth } from '@/context/AuthContext';

interface CashFlowReportProps {
  startDate?: string;
  endDate?: string;
  periodLabel?: string;
  selectedCategories?: string[];
  selectedAccounts?: string[];
  selectedCurrencies?: string[];
  searchTerm?: string;
  minAmount?: number;
  maxAmount?: number;
}

const formatNumberAbbreviation = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(0)}k`;
  }
  return `${sign}${absValue}`;
};

type ComparisonTab = 'cashFlow' | 'expense' | 'income';

const CashFlowReport: React.FC<CashFlowReportProps> = ({
  startDate,
  endDate,
  periodLabel = 'THIS MONTH',
  searchTerm,
  minAmount,
  maxAmount,
  selectedCategories,
  selectedAccounts,
  selectedCurrencies,
}) => {
  const [data, setData] = useState<CashFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparisonTab, setComparisonTab] = useState<ComparisonTab>('cashFlow');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const { formatCurrency } = useFormattedCurrency();
  const { user } = useAuth();
  const defaultCurrency = user?.currency || 'USD';

  // Sort currencies with default currency first
  const sortedCurrencies = useMemo(() => {
    if (!data) return [];
    const currencies = [...data.currencies];
    if (defaultCurrency && currencies.includes(defaultCurrency)) {
      currencies.sort((a, b) => {
        if (a === defaultCurrency) return -1;
        if (b === defaultCurrency) return 1;
        return 0;
      });
    }
    return currencies;
  }, [data, defaultCurrency]);

  // Set default currency when data loads
  useEffect(() => {
    if (data && sortedCurrencies.length > 0 && !selectedCurrency) {
      setSelectedCurrency(sortedCurrencies[0] ?? '');
    }
  }, [data, sortedCurrencies, selectedCurrency]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: {
          start_date?: string;
          end_date?: string;
          search?: string;
          min_amount?: number;
          max_amount?: number;
          category_ids?: string[];
          account_ids?: string[];
          currencies?: string[];
        } = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (searchTerm) params.search = searchTerm;
        if (minAmount !== undefined) params.min_amount = minAmount;
        if (maxAmount !== undefined) params.max_amount = maxAmount;
        if (selectedCategories?.length) params.category_ids = selectedCategories;
        if (selectedAccounts?.length) params.account_ids = selectedAccounts;
        if (selectedCurrencies?.length) params.currencies = selectedCurrencies;

        const response = await analyticsService.fetchCashFlowReport(params);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cash flow data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, searchTerm, minAmount, maxAmount, selectedCategories, selectedAccounts, selectedCurrencies]);

  // Get current data based on selected currency
  const currentData = useMemo(() => {
    if (!data) return null;
    if (selectedCurrency && data.dataByCurrency[selectedCurrency]) {
      return data.dataByCurrency[selectedCurrency];
    }
    return {
      summary: data.summary,
      dailyData: data.dailyData,
      comparisonData: data.comparisonData,
    };
  }, [data, selectedCurrency]);

  // Get comparison data based on selected tab
  const comparisonChartData = useMemo(() => {
    if (!currentData) return [];

    const comparison = currentData.comparisonData[comparisonTab];
    return comparison.currentPeriod.map((point, index) => ({
      date: point.date,
      current: point.value,
      previous: comparison.previousPeriod[index]?.value ?? 0,
      yearAgo: comparison.yearAgoPeriod[index]?.value ?? 0,
    }));
  }, [currentData, comparisonTab]);

  const displayCurrency = selectedCurrency || data?.currencies[0] || defaultCurrency;

  const CustomBarTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; payload: { date: string } }>;
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="mb-2 fw-bold">{item?.payload.date}</p>
          {payload.map((entry, index) => {
            let label = '';
            let color = '';
            if (entry.dataKey === 'income') {
              label = 'Income';
              color = '#22c55e';
            } else if (entry.dataKey === 'expense') {
              label = 'Expense';
              color = '#ef4444';
            } else if (entry.dataKey === 'cashFlow') {
              label = 'Cash Flow';
              color = '#1f2937';
            }
            return (
              <p key={index} className="mb-1" style={{ color }}>
                {label}: {formatCurrency(Math.abs(entry.value), displayCurrency)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const CustomLineTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; payload: { date: string } }>;
  }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="mb-2 fw-bold">{item?.payload.date}</p>
          {payload.map((entry, index) => {
            let label = '';
            let color = '';
            if (entry.dataKey === 'current') {
              label = 'Current period';
              color = '#3b82f6';
            } else if (entry.dataKey === 'previous') {
              label = 'Previous period';
              color = '#22c55e';
            } else if (entry.dataKey === 'yearAgo') {
              label = 'Same period a year ago';
              color = '#f97316';
            }
            return (
              <p key={index} className="mb-1" style={{ color }}>
                {label}: {formatCurrency(entry.value, displayCurrency)}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const renderSkeleton = () => (
    <div>
      {/* Chart skeleton */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body style={{ height: 350 }}>
          <Placeholder animation="glow" className="h-100 d-flex align-items-center justify-content-center">
            <div className="text-muted">Loading chart...</div>
          </Placeholder>
        </Card.Body>
      </Card>

      {/* Summary skeleton */}
      <div className="mb-4">
        <Placeholder animation="glow">
          <Placeholder xs={3} className="mb-2" />
        </Placeholder>
        <Placeholder animation="glow">
          <Placeholder xs={5} style={{ height: '2rem' }} />
        </Placeholder>
      </div>

      {/* Comparison chart skeleton */}
      <Card className="border-0 shadow-sm">
        <Card.Body style={{ height: 350 }}>
          <Placeholder animation="glow" className="h-100 d-flex align-items-center justify-content-center">
            <div className="text-muted">Loading comparison...</div>
          </Placeholder>
        </Card.Body>
      </Card>
    </div>
  );

  if (loading) {
    return renderSkeleton();
  }

  if (error || !data || !currentData) {
    return (
      <div className="alert alert-danger" role="alert">
        {error ?? 'Failed to load cash flow data'}
      </div>
    );
  }

  const { summary } = currentData;
  const isPositive = summary.percentChange >= 0;

  // Calculate max for income/expense progress bars
  const maxValue = Math.max(summary.totalIncome, summary.totalExpense);
  const incomePercent = maxValue > 0 ? (summary.totalIncome / maxValue) * 100 : 0;
  const expensePercent = maxValue > 0 ? (summary.totalExpense / maxValue) * 100 : 0;

  return (
    <div className="cash-flow-report">
      <style>{`
        .cash-flow-report .comparison-tabs {
          margin-bottom: 1rem;
        }
        .cash-flow-report .comparison-tabs .nav-link {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          color: #6c757d;
          cursor: pointer;
          border: none;
          background: transparent;
        }
        .cash-flow-report .comparison-tabs .nav-link.active {
          background-color: #e9ecef;
          color: #212529;
          border-radius: 0.375rem;
        }
        .cash-flow-report .currency-pill {
          padding: 0.375rem 0.75rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          border: 1px solid #dee2e6;
          background-color: #fff;
          color: #6c757d;
        }
        .cash-flow-report .currency-pill:hover {
          background-color: #f8f9fa;
        }
        .cash-flow-report .currency-pill.active {
          background-color: #212529;
          color: #fff;
          border-color: #212529;
        }
      `}</style>

      {/* Currency Pills */}
      {sortedCurrencies.length > 1 && (
        <div className="d-flex gap-2 mb-4 flex-wrap">
          {sortedCurrencies.map((currency) => (
            <button
              key={currency}
              className={`currency-pill ${selectedCurrency === currency ? 'active' : ''}`}
              onClick={() => setSelectedCurrency(currency)}
            >
              {currency}
            </button>
          ))}
        </div>
      )}

      {/* Daily Cash Flow Bar Chart */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          {/* Legend */}
          <div className="d-flex justify-content-end gap-4 mb-3">
            <div className="d-flex align-items-center gap-2">
              <div style={{ width: 12, height: 12, backgroundColor: '#22c55e', borderRadius: 2 }} />
              <small className="text-muted">Income</small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <div style={{ width: 12, height: 12, backgroundColor: '#ef4444', borderRadius: 2 }} />
              <small className="text-muted">Expense</small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <div style={{ width: 12, height: 12, backgroundColor: '#1f2937', borderRadius: '50%' }} />
              <small className="text-muted">Cash flow</small>
            </div>
          </div>

          {/* Chart */}
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={currentData.dailyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#6c757d' }}
                  tickMargin={10}
                  axisLine={{ stroke: '#e9ecef' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatNumberAbbreviation}
                  tick={{ fontSize: 11, fill: '#6c757d' }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar dataKey="income" fill="#22c55e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="cashFlow"
                  stroke="#1f2937"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
      </Card>

      {/* Summary Section */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <div className="text-muted text-uppercase small mb-1">{periodLabel}</div>
            <h2 className="mb-0" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
              {summary.netCashFlow < 0 ? '-' : ''}
              {formatCurrency(Math.abs(summary.netCashFlow), displayCurrency)}
            </h2>
          </div>
          {summary.percentChange !== 0 && (
            <div className="text-end">
              <small className="text-muted d-block mb-1">vs previous period</small>
              <div
                className="d-inline-flex align-items-center px-2 py-1 rounded"
                style={{
                  backgroundColor: isPositive ? '#d4edda' : '#f8d7da',
                }}
              >
                {isPositive ? (
                  <FaArrowUp size={12} color="#28a745" />
                ) : (
                  <FaArrowDown size={12} color="#dc3545" />
                )}
                <span
                  className="ms-1"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    color: isPositive ? '#28a745' : '#dc3545',
                  }}
                >
                  {Math.abs(summary.percentChange)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Income Bar */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span style={{ color: '#22c55e', fontWeight: 500 }}>Income</span>
            <span style={{ fontWeight: 500 }}>
              {formatCurrency(summary.totalIncome, displayCurrency)}
            </span>
          </div>
          <div
            className="rounded"
            style={{ height: 8, backgroundColor: '#e9ecef', overflow: 'hidden' }}
          >
            <div
              className="h-100 rounded"
              style={{ width: `${incomePercent}%`, backgroundColor: '#22c55e' }}
            />
          </div>
        </div>

        {/* Expense Bar */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span style={{ color: '#ef4444', fontWeight: 500 }}>Expense</span>
            <span style={{ fontWeight: 500 }}>
              -{formatCurrency(summary.totalExpense, displayCurrency)}
            </span>
          </div>
          <div
            className="rounded"
            style={{ height: 8, backgroundColor: '#e9ecef', overflow: 'hidden' }}
          >
            <div
              className="h-100 rounded"
              style={{ width: `${expensePercent}%`, backgroundColor: '#ef4444' }}
            />
          </div>
        </div>
      </div>

      {/* Comparison Chart */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          {/* Tabs */}
          <Nav variant="pills" className="comparison-tabs gap-1 justify-content-center mb-3">
            <Nav.Item>
              <Nav.Link
                className={comparisonTab === 'cashFlow' ? 'active' : ''}
                onClick={() => setComparisonTab('cashFlow')}
              >
                Cash flow
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                className={comparisonTab === 'expense' ? 'active' : ''}
                onClick={() => setComparisonTab('expense')}
              >
                Expense
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link
                className={comparisonTab === 'income' ? 'active' : ''}
                onClick={() => setComparisonTab('income')}
              >
                Income
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {/* Legend */}
          <div className="d-flex justify-content-end gap-4 mb-3">
            <div className="d-flex align-items-center gap-2">
              <div style={{ width: 12, height: 12, backgroundColor: '#3b82f6', borderRadius: '50%' }} />
              <small className="text-muted">Current period</small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <div style={{ width: 12, height: 12, backgroundColor: '#22c55e', borderRadius: '50%' }} />
              <small className="text-muted">Previous period</small>
            </div>
            <div className="d-flex align-items-center gap-2">
              <div style={{ width: 12, height: 12, backgroundColor: '#f97316', borderRadius: '50%' }} />
              <small className="text-muted">Same period a year ago</small>
            </div>
          </div>

          {/* Chart */}
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonChartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#6c757d' }}
                  tickMargin={10}
                  axisLine={{ stroke: '#e9ecef' }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatNumberAbbreviation}
                  tick={{ fontSize: 11, fill: '#6c757d' }}
                  axisLine={false}
                  tickLine={false}
                  width={50}
                />
                <Tooltip content={<CustomLineTooltip />} />
                <Line
                  type="monotone"
                  dataKey="current"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="yearAgo"
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CashFlowReport;
