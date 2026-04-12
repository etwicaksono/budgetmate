'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

/**
 * Format large numbers into abbreviated form for Y-axis
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
 * IncomeExpenseBarChart - Reusable Bar Chart Component
 * 
 * Can be used in:
 * - Dashboard (monthly income vs expenses)
 * - Analytics page (any comparison data)
 * - Reports (trend comparisons)
 * 
 * Follows Single Responsibility Principle: Only renders bar chart with data
 */

export interface BarChartData {
  name: string;
  income?: number;
  expense?: number;
  [key: string]: number | string | undefined; // Chart data can have additional properties
}

interface IncomeExpenseBarChartProps {
  data: BarChartData[];
  formatValue?: (value: number) => string;
  height?: number | string;
  incomeColor?: string;
  expenseColor?: string;
  incomeLabel?: string;
  expenseLabel?: string;
}

export const IncomeExpenseBarChart: React.FC<IncomeExpenseBarChartProps> = ({
  data,
  formatValue = (value) => value.toString(),
  height = 300,
  incomeColor = '#2ecc71',
  expenseColor = '#e74c3c',
  incomeLabel = 'Income',
  expenseLabel = 'Expense',
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        No data available
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string; payload: BarChartData }> }) => {
    if (active && payload && payload.length && payload[0]) {
      return (
        <div className="p-3 border rounded shadow-sm" style={{ backgroundColor: '#ffffff', opacity: 1, zIndex: 1000 }}>
          <p className="mb-1 fw-bold">{payload[0].payload.name}</p>
          {payload.map((entry: { value: number; name: string; color: string; payload: BarChartData }, index: number) => (
            <p key={index} className="mb-0" style={{ color: entry.color }}>
              {entry.name}: {formatValue(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // For height='100%', use flex layout
  const isFlexHeight = height === '100%' || typeof height === 'string';
  const chartHeight = typeof height === 'number' ? height : '100%';
  
  return (
    <ResponsiveContainer width="100%" height={isFlexHeight ? '100%' : chartHeight}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis tickFormatter={formatNumberAbbreviation} tick={{ fontSize: 12 }} width={50} />
        <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
        <Legend wrapperStyle={{ paddingTop: '10px' }} />
        <Bar dataKey="expense" name={expenseLabel} fill={expenseColor} />
        <Bar dataKey="income" name={incomeLabel} fill={incomeColor} />
      </BarChart>
    </ResponsiveContainer>
  );
};
