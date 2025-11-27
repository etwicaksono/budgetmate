'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

/**
 * CategoryPieChart - Reusable Pie Chart Component
 * 
 * Can be used in:
 * - Dashboard (expenses by category)
 * - Analytics page (any categorical breakdown)
 * - Reports (category distributions)
 * 
 * Follows Single Responsibility Principle: Only renders pie chart with data
 */

export interface PieChartData {
  name: string;
  value: number;
  color?: string;
  [key: string]: number | string; // Chart data can have additional string keys with number or string values
}

interface CategoryPieChartProps {
  data: PieChartData[];
  colors?: string[];
  formatValue?: (value: number) => string;
  height?: number | string;
  innerRadius?: number | string;
  outerRadius?: number | string;
  showLegend?: boolean;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  data,
  colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'],
  formatValue = (value) => value.toString(),
  height = 300,
  innerRadius = 0,
  outerRadius = 80,
  showLegend = false,
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        No data available
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; payload: PieChartData }> }) => {
    if (active && payload && payload.length && payload[0]) {
      const percentage = total > 0 ? ((payload[0].value / total) * 100).toFixed(2) : '0';
      return (
        <div className="bg-white p-3 border rounded shadow-sm">
          <p className="mb-1 fw-bold">{payload[0].name}</p>
          <p className="mb-1 text-primary">{formatValue(payload[0].value)}</p>
          <p className="mb-0 text-muted">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  // ResponsiveContainer accepts number or percentage string like "100%"
  const chartHeight: number | `${number}%` = typeof height === 'number' 
    ? height 
    : height === '100%' 
      ? '100%' 
      : 300;
  
  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          fill="#8884d8"
          dataKey="value"
          labelLine={true}
          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || colors[index % colors.length]} 
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
};
