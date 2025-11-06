import React, { useState, useEffect } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import * as FaIcons from 'react-icons/fa';
import analyticsService, { type BalanceTrendData, type AccountBalance } from '../../../services/analyticsService';

interface BalanceTrendProps {
  currentMonth: string;
  onAccountClick?: (accountName: string) => void;
}

const BalanceTrend: React.FC<BalanceTrendProps> = ({ currentMonth, onAccountClick }) => {
  const [data, setData] = useState<BalanceTrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const balanceTrendData = await analyticsService.fetchBalanceTrend();
        setData(balanceTrendData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load balance trend');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number): string => {
    return `IDR ${value.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatYAxis = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(0)}M`;
    }
    return `${value.toLocaleString()}`;
  };

  const renderAccountIcon = (iconName: string) => {
    const IconComponent = (FaIcons as any)[iconName] || FaIcons.FaWallet;
    return <IconComponent size={20} />;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="alert alert-danger" role="alert">
        {error || 'Failed to load balance trend'}
      </div>
    );
  }

  return (
    <div className="balance-trend">
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h5 className="mb-1">{currentMonth}</h5>
              <h2 className="mb-0 fw-bold">{formatCurrency(data.totalBalance)}</h2>
            </div>
            <div className="text-end">
              <p className="mb-0 text-muted small">vs previous period</p>
              <p className="mb-0 text-danger fw-bold">
                ↓ {data.percentChange}%
              </p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={data.balanceData}>
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
                dataKey="balance"
                stroke="#0088FE"
                strokeWidth={2}
                fill="url(#colorBalance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">Accounts</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {data.accounts.map((account, index) => (
            <div
              key={index}
              className="d-flex justify-content-between align-items-center p-3 border-bottom"
              style={{ cursor: 'pointer' }}
              onClick={() => onAccountClick?.(account.name)}
            >
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded"
                  style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: account.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                  }}
                >
                  {renderAccountIcon(account.icon)}
                </div>
                <div>
                  <p className="mb-0 fw-medium">{account.name}</p>
                  <p className="mb-0 text-muted small">{account.type}</p>
                </div>
              </div>
              <div className="text-end">
                <p className={`mb-0 fw-bold ${account.balance < 0 ? 'text-danger' : ''}`}>
                  {formatCurrency(account.balance)}
                </p>
              </div>
            </div>
          ))}
        </Card.Body>
        <Card.Footer className="bg-white border-top">
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Indonesian Rupiah</h6>
            <h5 className="mb-0 fw-bold">{formatCurrency(data.totalBalance)}</h5>
          </div>
        </Card.Footer>
      </Card>
    </div>
  );
};

export default BalanceTrend;
