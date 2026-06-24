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

export interface TrendChartData {
  date: string;
  balance: number;
}

interface BalanceTrendChartProps {
  data: TrendChartData[];
  totalBalance?: number;
  percentChange?: number;
  formatValue?: (value: number) => string;
  height?: number | string;
  lineColor?: string;
  showGrid?: boolean;
  showSummary?: boolean;
}

export const BalanceTrendChart: React.FC<BalanceTrendChartProps> = ({
  data,
  totalBalance,
  percentChange,
  formatValue = (value) => value.toString(),
  height = 300,
  lineColor = '#2563eb',
  showGrid = true,
  showSummary = true,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        No data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: TrendChartData }> }) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 border rounded shadow-sm" style={{ backgroundColor: '#ffffff', opacity: 1, zIndex: 1000 }}>
          <p className="mb-2 fw-bold">{payload[0]?.payload.date}</p>
          <div className="d-flex align-items-center gap-2">
            <div style={{ width: '12px', height: '12px', backgroundColor: lineColor, borderRadius: '50%' }} />
            <span style={{ color: lineColor, fontWeight: 'bold' }}>
              Balance: {formatValue(payload[0]?.value ?? 0)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const calculatedTotalBalance = totalBalance ?? data[data.length - 1]?.balance ?? 0;
  const calculatedPercentChange = percentChange ?? 0;
  const isPositive = calculatedPercentChange >= 0;
  const isFlexHeight = height === '100%' || typeof height === 'string';
  const chartHeight = typeof height === 'number' ? height : 300;
  const chartContent = (
    <ResponsiveContainer width="100%" height={isFlexHeight ? '100%' : chartHeight}>
      <AreaChart
        data={data}
        margin={{ top: 5, right: 5, left: -10, bottom: 25 }}
      >
        <defs>
          <linearGradient id="gradient-balance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={lineColor} stopOpacity={0.25} />
            <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
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
        <Area
          type="monotone"
          dataKey="balance"
          name="Balance"
          stroke={lineColor}
          strokeWidth={2}
          fill="url(#gradient-balance)"
          dot={false}
          activeDot={{ r: 5, fill: lineColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  if (!showSummary) {
    return chartContent;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', padding: '1rem' }}>
      <div className="mb-2" style={{ flexShrink: 0 }}>
        <div className="d-flex align-items-start justify-content-between gap-2 flex-wrap">
          <div>
            <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
              Total Balance
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>
              {formatValue(calculatedTotalBalance)}
            </div>
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

      <div style={{ flex: 1, minHeight: 0, width: '100%', overflow: 'visible' }}>
        {chartContent}
      </div>
    </div>
  );
};
