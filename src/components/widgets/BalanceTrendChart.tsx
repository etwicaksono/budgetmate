'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';


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
    return `${sign}${(absValue / 1_000_000_000).toFixed(0)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(0)}M`;
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

  // State for selected currency - default to first currency
  const [selectedCurrency, setSelectedCurrency] = React.useState<string>(() => {
    if (currencyBalances && currencyBalances.length > 0 && currencyBalances[0]) {
      return currencyBalances[0].currency;
    }
    return currencyKeys[0] || 'balance';
  });

  // Update selected currency when currencyBalances or currencyKeys change
  React.useEffect(() => {
    if (currencyBalances && currencyBalances.length > 0 && currencyBalances[0]) {
      setSelectedCurrency(currencyBalances[0].currency);
    } else if (currencyKeys.length > 0 && currencyKeys[0]) {
      setSelectedCurrency(currencyKeys[0]);
    }
  }, [currencyBalances, currencyKeys]);

  // Get selected currency balance (must be before early return)
  const selectedCurrencyBalance = React.useMemo(() => {
    if (currencyBalances && currencyBalances.length > 0) {
      return currencyBalances.find(cb => cb.currency === selectedCurrency);
    }
    return null;
  }, [currencyBalances, selectedCurrency]);

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
        <div className="p-3 border rounded shadow-sm" style={{ backgroundColor: '#ffffff', opacity: 1, zIndex: 1000 }}>
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

  // Filter to show only selected currency in chart
  const displayCurrencyKeys = isMultiCurrency && !isCombinedBalance ? [selectedCurrency] : currencyKeys;

  // Color palette for multiple currencies
  const currencyColors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const chartContent = (
    <ResponsiveContainer width="100%" height={isFlexHeight ? '100%' : chartHeight}>
      <AreaChart 
        data={data}
        margin={{ top: 5, right: 5, left: -10, bottom: 25 }}
      >
        <defs>
          {displayCurrencyKeys.map((currency) => {
            const color = currencyColors[currencyKeys.indexOf(currency) % currencyColors.length] || '#2563eb';
            return (
              <linearGradient key={currency} id={`gradient-${currency}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" vertical={false} />}
        <XAxis 
          dataKey="date"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          height={40}
          tickMargin={6}
          axisLine={false}
          tickLine={false}
        />
        <YAxis 
          tickFormatter={(value) => formatNumberAbbreviation(value)}
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          width={38}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
        {displayCurrencyKeys.map((currency) => {
          const lineName = isCombinedBalance ? 'Combined' : (currency === 'balance' ? 'Balance' : currency);
          const lineColor = currencyColors[currencyKeys.indexOf(currency) % currencyColors.length] || '#2563eb';
          
          return (
            <Area
              key={currency}
              type="monotone" 
              dataKey={currency}
              name={lineName}
              stroke={lineColor}
              strokeWidth={2}
              fill={`url(#gradient-${currency})`}
              dot={false}
              activeDot={{ r: 5, fill: lineColor }}
              {...(isCombinedBalance && { strokeDasharray: '5 5' })}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );

  if (!showSummary) {
    return chartContent;
  }
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', padding: '1rem' }}>
      {/* Currency Selector Pills (only show if multi-currency and not combined) */}
      {isMultiCurrency && !isCombinedBalance && currencyBalances && currencyBalances.length > 1 && (
        <div className="mb-3" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {currencyBalances.map((cb) => (
              <button
                key={cb.currency}
                onClick={() => setSelectedCurrency(cb.currency)}
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: selectedCurrency === cb.currency ? '2px solid #2563eb' : '1px solid #dee2e6',
                  backgroundColor: selectedCurrency === cb.currency ? '#e3f2fd' : '#fff',
                  color: selectedCurrency === cb.currency ? '#2563eb' : '#6c757d',
                  fontSize: '13px',
                  fontWeight: selectedCurrency === cb.currency ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (selectedCurrency !== cb.currency) {
                    e.currentTarget.style.borderColor = '#adb5bd';
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCurrency !== cb.currency) {
                    e.currentTarget.style.borderColor = '#dee2e6';
                    e.currentTarget.style.backgroundColor = '#fff';
                  }
                }}
              >
                {cb.currency}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Balance Summary — inline style like reference app */}
      <div className="mb-2" style={{ flexShrink: 0 }}>
        <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap">
          <div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
              {isMultiCurrency && !isCombinedBalance ? `${selectedCurrency} Balance` : 'Total Balance'}
            </div>
            {isMultiCurrency && !isCombinedBalance && selectedCurrencyBalance ? (
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                {formatCurrency ? formatCurrency(selectedCurrencyBalance.balance, selectedCurrency) : `${selectedCurrency} ${formatValue(selectedCurrencyBalance.balance)}`}
              </div>
            ) : currencyBalances && currencyBalances.length > 0 ? (
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                {formatCurrency ? formatCurrency(currencyBalances[0]!.balance, currencyBalances[0]!.currency) : formatValue(calculatedTotalBalance)}
              </div>
            ) : (
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
                {formatValue(calculatedTotalBalance)}
              </div>
            )}
          </div>
          {calculatedPercentChange !== 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '2px' }}>vs past period</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: isPositive ? '#22c55e' : '#ef4444' }}>
                {isPositive ? '+' : ''}{Math.abs(calculatedPercentChange)}%
              </div>
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
