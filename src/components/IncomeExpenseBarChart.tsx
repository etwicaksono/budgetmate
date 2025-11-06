import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatNumberAbbreviation = (value: number): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1000000000) {
    return `${sign}${(absValue / 1000000000).toFixed(absValue % 1000000000 === 0 ? 0 : 1)}B`;
  }
  if (absValue >= 1000000) {
    return `${sign}${(absValue / 1000000).toFixed(absValue % 1000000 === 0 ? 0 : 1)}M`;
  }
  if (absValue >= 1000) {
    return `${sign}${(absValue / 1000).toFixed(absValue % 1000 === 0 ? 0 : 1)}k`;
  }
  return value.toString();
};

export interface IncomeExpenseChartData {
  name: string;
  income: number;
  expense: number;
  [key: string]: string | number;
}

interface IncomeExpenseBarChartProps {
  data: IncomeExpenseChartData[];
  formatValue?: (value: number) => string;
  height?: number;
  incomeColor?: string;
  expenseColor?: string;
  incomeLabel?: string;
  expenseLabel?: string;
}

const IncomeExpenseBarChart: React.FC<IncomeExpenseBarChartProps> = ({
  data,
  formatValue,
  height = 300,
  incomeColor = '#2ecc71',
  expenseColor = '#e74c3c',
  incomeLabel = 'Income',
  expenseLabel = 'Expense',
}) => {
  const defaultFormatter = (value: number) => value.toString();
  const valueFormatter = formatValue || defaultFormatter;

  const tooltipFormatter = (value: number) => [valueFormatter(value), 'Amount'];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={formatNumberAbbreviation} />
        <Tooltip formatter={tooltipFormatter} />
        <Legend />
        <Bar dataKey="income" fill={incomeColor} name={incomeLabel} />
        <Bar dataKey="expense" fill={expenseColor} name={expenseLabel} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default IncomeExpenseBarChart;
