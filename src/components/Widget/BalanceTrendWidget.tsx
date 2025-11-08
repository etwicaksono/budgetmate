import React, { useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';
import analyticsService, { type BalanceTrendData } from '../../services/analyticsService';
import BalanceTrendChart from '../BalanceTrendChart';

interface BalanceTrendWidgetProps {
  formatCurrency?: (value: number) => string;
  height?: number;
  lineColor?: string;
}

const BalanceTrendWidget: React.FC<BalanceTrendWidgetProps> = ({
  formatCurrency,
  height = 300,
  lineColor = '#2563eb',
}) => {
  const [data, setData] = useState<BalanceTrendData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const trendData = await analyticsService.fetchBalanceTrend();
        setData(trendData);
      } catch (err) {
        console.error('Failed to fetch balance trend:', err);
        setError('Failed to load balance trend data');
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  const defaultFormatCurrency = (value: number): string => {
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
    return `${value < 0 ? '-' : ''}IDR ${formatted}`;
  };

  const currencyFormatter = formatCurrency || defaultFormatCurrency;

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: height + 100 }}>
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center text-muted py-5">
        {error || 'No balance trend data available'}
      </div>
    );
  }

  const isPositive = data.percentChange >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', padding: '1rem' }}>
      {/* Balance Summary */}
      <div className="mb-4" style={{ flexShrink: 0 }}>
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h5 className="mb-1" style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'normal' }}>
              Total Balance
            </h5>
            <h2 className="mb-0" style={{ fontSize: '28px', fontWeight: 'bold', color: '#212529' }}>
              {currencyFormatter(data.totalBalance)}
            </h2>
          </div>
          <div
            className="d-flex align-items-center"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: isPositive ? '#d4edda' : '#f8d7da',
            }}
          >
            {isPositive ? (
              <FaArrowUp size={14} color="#28a745" />
            ) : (
              <FaArrowDown size={14} color="#dc3545" />
            )}
            <span
              className="ms-2"
              style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: isPositive ? '#28a745' : '#dc3545',
              }}
            >
              {Math.abs(data.percentChange)}%
            </span>
          </div>
        </div>
      </div>

      {/* Balance Trend Chart */}
      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <BalanceTrendChart
          data={data.balanceData}
          height="100%"
          lineColor={lineColor}
          formatValue={currencyFormatter}
        />
      </div>
    </div>
  );
};

export default BalanceTrendWidget;
