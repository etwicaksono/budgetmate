'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FaArrowUp, FaArrowDown } from 'react-icons/fa';

/**
 * Format large numbers into abbreviated form
 * 1000 -> 1k
 * 100000 -> 100k
 * 1000000 -> 1M
 * 1000000000 -> 1B
 */
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

/**
 * BalanceTrendChart - Reusable Line Chart Component with Balance Summary
 * 
 * Can be used in:
 * - Dashboard (balance over time)
 * - Account detail page (account balance history)
 * - Analytics page (any trend analysis)
 * 
 * Displays:
 * - Total balance with percentage change indicator
 * - Line chart showing balance trend over time
 */

export interface TrendChartData {
  date: string;
  balance?: number; // Legacy single balance
  [key: string]: number | string | undefined; // Dynamic currency keys (e.g., USD: 1000, EUR: 500)
}

export interface CurrencyBalance {
  currency: string;
  balance: number;
}

interface BalanceTrendChartProps {
  data: TrendChartData[];
  totalBalance?: number;
  currencyBalances?: CurrencyBalance[]; // Multi-currency balances
  percentChange?: number;
  formatValue?: (value: number) => string;
  formatCurrency?: (value: number, currency: string) => string;
  height?: number | string;
  lineColor?: string;
  showGrid?: boolean;
  showSummary?: boolean;
}

export const BalanceTrendChart: React.FC<BalanceTrendChartProps> = ({
  data,
  totalBalance,
  currencyBalances,
  percentChange,
  formatValue = (value) => value.toString(),
  formatCurrency,
  height = 300,
  showGrid = true,
  showSummary = true,
}) => {
  // Detect currency keys from data (keys that are not 'date' or 'balance')
  // NOTE: Must be before any early returns to follow React Hooks rules
  const currencyKeys = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const firstDataPoint = data[0];
    if (!firstDataPoint) return [];
    
    const keys = Object.keys(firstDataPoint).filter(
      key => key !== 'date' && key !== 'balance' && typeof firstDataPoint[key] === 'number'
    );
    
    return keys.length > 0 ? keys : ['balance']; // Fallback to 'balance' for legacy data
  }, [data]);

  // Early return after hooks
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        No data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: TrendChartData; name?: string; color?: string }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="mb-2 fw-bold">{payload[0]?.payload.date}</p>
          {payload.map((entry, index) => (
            <div key={index} className="d-flex align-items-center gap-2 mb-1">
              <div style={{ width: '12px', height: '12px', backgroundColor: entry.color, borderRadius: '50%' }}></div>
              <span style={{ color: entry.color, fontWeight: 'bold' }}>
                {entry.name}: {formatCurrency && entry.name ? formatCurrency(entry.value, entry.name) : formatValue(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Calculate total balance and percent change if not provided
  const calculatedTotalBalance = totalBalance ?? (data.length > 0 ? data[data.length - 1]?.balance ?? 0 : 0);
  const calculatedPercentChange = percentChange ?? 0;
  const isPositive = calculatedPercentChange >= 0;

  // For height='100%', use flex layout
  const isFlexHeight = height === '100%' || typeof height === 'string';
  const chartHeight = typeof height === 'number' ? height : 300;

  // Check if showing combined balance for multi-currency
  const isMultiCurrency = currencyBalances && currencyBalances.length > 1;
  const isCombinedBalance = isMultiCurrency && currencyKeys.length === 1 && currencyKeys[0] === 'balance';

  // Color palette for multiple currencies
  const currencyColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const chartContent = (
    <ResponsiveContainer width="100%" height={isFlexHeight ? '100%' : chartHeight}>
      <LineChart 
        data={data}
        margin={{ top: 5, right: 10, left: 10, bottom: 25 }}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis 
          dataKey="date"
          tick={{ fontSize: 12 }}
          height={60}
          tickMargin={8}
        />
        <YAxis 
          tickFormatter={(value) => formatNumberAbbreviation(value)}
          tick={{ fontSize: 12 }}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        {currencyKeys.map((currency, index) => {
          const lineName = isCombinedBalance ? 'Combined' : (currency === 'balance' ? 'Balance' : currency);
          const lineColor = currencyColors[index % currencyColors.length];
          
          return (
            <Line 
              key={currency}
              type="monotone" 
              dataKey={currency}
              name={lineName}
              stroke={lineColor} 
              strokeWidth={2}
              dot={{ fill: lineColor, r: 4 }}
              activeDot={{ r: 6 }}
              {...(isCombinedBalance && { strokeDasharray: '5 5' })}
            />
          );
        })}
      </LineChart>
    </ResponsiveContainer>
  );

  if (!showSummary) {
    return chartContent;
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', padding: '1rem' }}>
      {/* Balance Summary */}
      <div className="mb-4" style={{ flexShrink: 0 }}>
        <div className="d-flex align-items-center justify-content-between">
          <div style={{ flex: 1 }}>
            <h5 className="mb-1" style={{ fontSize: '14px', color: '#6c757d', fontWeight: 'normal' }}>
              Total Balance
            </h5>
            {currencyBalances && currencyBalances.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'baseline' }}>
                {currencyBalances.map((cb, index) => (
                  <h2 
                    key={cb.currency} 
                    className="mb-0" 
                    style={{ 
                      fontSize: index === 0 ? '28px' : '20px', 
                      fontWeight: 'bold', 
                      color: index === 0 ? '#212529' : '#6c757d' 
                    }}
                  >
                    {formatCurrency ? formatCurrency(cb.balance, cb.currency) : `${cb.currency} ${formatValue(cb.balance)}`}
                    {index < currencyBalances.length - 1 && <span style={{ margin: '0 8px', color: '#6c757d' }}>|</span>}
                  </h2>
                ))}
              </div>
            ) : (
              <h2 className="mb-0" style={{ fontSize: '28px', fontWeight: 'bold', color: '#212529' }}>
                {formatValue(calculatedTotalBalance)}
              </h2>
            )}
          </div>
          {calculatedPercentChange !== 0 && (
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
                {Math.abs(calculatedPercentChange)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Balance Trend Chart */}
      <div style={{ flex: 1, minHeight: 0, width: '100%', overflow: 'visible' }}>
        {isCombinedBalance && (
          <div className="mb-2" style={{ fontSize: '12px', color: '#6c757d', fontStyle: 'italic' }}>
            * Chart shows combined balance across all currencies
          </div>
        )}
        {chartContent}
      </div>
    </div>
  );
};
