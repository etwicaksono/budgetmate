'use client';

import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Placeholder } from 'react-bootstrap';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { Icon } from '@/utils/iconResolver';
import { analyticsService, type BalanceTrendResponse, type AccountBalance } from '@/services/analyticsService';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';

interface BalanceTrendReportProps {
  startDate?: string;
  endDate?: string;
  periodLabel?: string;
  selectedCategories?: string[];
  selectedAccounts?: string[];
  searchTerm?: string;
  minAmount?: number;
  maxAmount?: number;
  transferOption?: string;
  debtOption?: string;
  selectedLabelIds?: string[];
  excludedLabelIds?: string[];
}

const formatNumberAbbreviation = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B`;
  if (absValue >= 1_000_000) return `${sign}${(absValue / 1_000_000).toFixed(1)}M`;
  if (absValue >= 1_000) return `${sign}${(absValue / 1_000).toFixed(0)}k`;
  return `${sign}${absValue}`;
};

const accountTypeLabels: Record<string, string> = {
  checking: 'Current account',
  savings: 'Savings',
  credit_card: 'Credit card',
  cash: 'Cash',
  investment: 'Investment',
  loan: 'Loan',
};

const BalanceTrendReport: React.FC<BalanceTrendReportProps> = ({
  startDate,
  endDate,
  periodLabel = 'THIS MONTH',
  selectedCategories,
  selectedAccounts,
  searchTerm,
  minAmount,
  maxAmount,
  transferOption,
  debtOption,
  selectedLabelIds,
  excludedLabelIds,
}) => {
  const [data, setData] = useState<BalanceTrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { formatCurrency } = useFormattedCurrency();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: {
          start_date?: string;
          end_date?: string;
          category_ids?: string[];
          account_ids?: string[];
          search?: string;
          min_amount?: number;
          max_amount?: number;
          transfer_option?: string;
          debt_option?: string;
          label_ids?: string[];
          exclude_label_ids?: string[];
        } = {};
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (selectedCategories?.length) params.category_ids = selectedCategories;
        if (selectedAccounts?.length) params.account_ids = selectedAccounts;
        if (searchTerm) params.search = searchTerm;
        if (minAmount && minAmount > 0) params.min_amount = minAmount;
        if (maxAmount && maxAmount < 20000000) params.max_amount = maxAmount;
        if (transferOption) params.transfer_option = transferOption;
        if (debtOption) params.debt_option = debtOption;
        if (selectedLabelIds?.length) params.label_ids = selectedLabelIds;
        if (excludedLabelIds?.length) params.exclude_label_ids = excludedLabelIds;

        const response = await analyticsService.fetchBalanceTrend(params);
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load balance trend');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [
    startDate,
    endDate,
    selectedCategories,
    selectedAccounts,
    searchTerm,
    minAmount,
    maxAmount,
    transferOption,
    debtOption,
    selectedLabelIds,
    excludedLabelIds,
  ]);

  const CustomTooltip = ({ active, payload }: {
    active?: boolean;
    payload?: Array<{ value: number; payload: { date: string } }>
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="mb-1 fw-bold">{payload[0]?.payload.date}</p>
          <p className="mb-0" style={{ color: '#2563eb' }}>
            {formatCurrency(payload[0]?.value ?? 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderSkeleton = () => (
    <div>
      <div className="mb-4">
        <Placeholder animation="glow">
          <Placeholder xs={3} className="mb-2" />
        </Placeholder>
        <Placeholder animation="glow">
          <Placeholder xs={5} style={{ height: '2rem' }} />
        </Placeholder>
      </div>

      <Card className="mb-4">
        <Card.Body style={{ height: 350 }}>
          <Placeholder animation="glow" className="h-100 d-flex align-items-center justify-content-center">
            <div className="text-muted">Loading chart...</div>
          </Placeholder>
        </Card.Body>
      </Card>

      <Card className="mb-4 shadow-sm overflow-hidden rounded-3">
        <ListGroup variant="flush">
          {[1, 2, 3, 4, 5].map((i) => (
            <ListGroup.Item key={i} className="d-flex justify-content-between align-items-center py-3">
              <div className="d-flex align-items-center gap-3">
                <Placeholder animation="glow">
                  <Placeholder className="rounded" style={{ width: 40, height: 40 }} />
                </Placeholder>
                <div>
                  <Placeholder animation="glow">
                    <Placeholder xs={8} style={{ width: 120 }} />
                  </Placeholder>
                  <Placeholder animation="glow">
                    <Placeholder xs={6} style={{ width: 80 }} className="d-block mt-1" />
                  </Placeholder>
                </div>
              </div>
              <Placeholder animation="glow">
                <Placeholder xs={4} style={{ width: 100 }} />
              </Placeholder>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card>
    </div>
  );

  if (loading) return renderSkeleton();

  if (error || !data) {
    return (
      <div className="alert alert-danger" role="alert">
        {error ?? 'Failed to load balance trend'}
      </div>
    );
  }

  const isPositive = data.percentChange >= 0;

  const renderAccountItem = (account: AccountBalance) => {
    const isNegative = account.balance < 0;
    const formattedBalance = formatCurrency(Math.abs(account.balance));
    const displayBalance = isNegative ? `-${formattedBalance}` : formattedBalance;

    return (
      <ListGroup.Item
        key={account.id}
        action
        onClick={() => router.push(`/accounts/${account.id}`)}
        className="d-flex justify-content-between align-items-center py-3"
        style={{ cursor: 'pointer' }}
      >
        <div className="d-flex align-items-center gap-3">
          <div
            className="d-flex align-items-center justify-content-center rounded"
            style={{
              width: 40,
              height: 40,
              backgroundColor: account.color,
              color: '#fff',
            }}
          >
            <Icon name={account.icon} size={20} />
          </div>
          <div>
            <div className="fw-medium">{account.name}</div>
            <small className="text-muted">
              {accountTypeLabels[account.account_type] || account.account_type}
            </small>
          </div>
        </div>
        <div
          className="fw-medium"
          style={{ color: isNegative ? '#dc3545' : '#198754' }}
        >
          {displayBalance}
        </div>
      </ListGroup.Item>
    );
  };

  return (
    <div className="balance-trend-report">
      <Card className="mb-4 border-0 shadow-sm rounded-3">
        <Card.Body className="p-3 p-md-4 pb-3">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start mb-4 gap-3">
            <div>
              <div className="text-muted text-uppercase small mb-1">{periodLabel}</div>
              <h2 className="mb-0" style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>
                {formatCurrency(data.totalBalance)}
              </h2>
            </div>
            {data.percentChange !== 0 && (
              <div className="text-end">
                <small className="text-muted d-block mb-1">vs previous period</small>
                <div
                  className="d-inline-flex align-items-center px-2 py-1 rounded"
                  style={{ backgroundColor: isPositive ? '#d4edda' : '#f8d7da' }}
                >
                  {isPositive ? <FaArrowUp size={12} color="#28a745" /> : <FaArrowDown size={12} color="#dc3545" />}
                  <span
                    className="ms-1"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                      color: isPositive ? '#28a745' : '#dc3545',
                    }}
                  >
                    {Math.abs(data.percentChange)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          <div style={{ height: 350 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(val: string) => {
                    const d = new Date(val);
                    return !Number.isNaN(d.getTime()) ? d.toLocaleDateString('default', { day: 'numeric', month: 'short' }) : val;
                  }}
                  tick={{ fontSize: 11, fill: '#6c757d' }}
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
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card.Body>
      </Card>

      <Card className="mb-4 border-0 shadow-sm overflow-hidden rounded-3">
        <ListGroup variant="flush">
          {data.accounts.length > 0 ? (
            data.accounts.map(renderAccountItem)
          ) : (
            <ListGroup.Item className="text-center text-muted py-4">
              No accounts available
            </ListGroup.Item>
          )}
        </ListGroup>
      </Card>

      <Card className="border-0 shadow-sm rounded-3">
        <Card.Body className="p-3 p-md-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="text-muted">IDR</span>
            <span className="fw-bold" style={{ color: data.totalBalance < 0 ? '#dc3545' : undefined }}>
              {data.totalBalance < 0 ? '-' : ''}
              {formatCurrency(Math.abs(data.totalBalance))}
            </span>
          </div>
          <div className="rounded" style={{ height: 8, backgroundColor: '#e9ecef', overflow: 'hidden' }}>
            <div
              className="h-100 rounded"
              style={{
                width: '100%',
                backgroundColor: data.totalBalance < 0 ? '#dc3545' : '#2563eb',
              }}
            />
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default BalanceTrendReport;
