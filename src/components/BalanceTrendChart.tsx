import React from 'react';
// TODO: Align balance trend chart with refreshed dashboard requirements.
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { BalanceDataPoint } from '../services/analyticsService';

interface BalanceTrendChartProps {
  data: BalanceDataPoint[];
  height?: number | `${number}%`;
  lineColor?: string;
  formatValue?: (value: number) => string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: BalanceDataPoint;
  }>;
  formatValue?: (value: number) => string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  formatValue,
}) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const date = payload[0].payload.date;
    
    return (
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#666' }}>
          {date}
        </p>
        <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
          {formatValue ? formatValue(value) : `IDR ${value.toLocaleString('id-ID')}`}
        </p>
      </div>
    );
  }

  return null;
};

const BalanceTrendChart: React.FC<BalanceTrendChartProps> = ({
  data,
  height = 300,
  lineColor = '#2563eb',
  formatValue,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 10,
          left: 10,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: '#666' }}
          tickLine={false}
          axisLine={{ stroke: '#e0e0e0' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#666' }}
          tickLine={false}
          axisLine={{ stroke: '#e0e0e0' }}
          tickFormatter={(value) => {
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M`;
            }
            if (value >= 1000) {
              return `${(value / 1000).toFixed(0)}K`;
            }
            return value.toString();
          }}
        />
        <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
        <Line
          type="monotone"
          dataKey="balance"
          stroke={lineColor}
          strokeWidth={2}
          dot={{ fill: lineColor, r: 4 }}
          activeDot={{ r: 6, fill: lineColor }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default BalanceTrendChart;
