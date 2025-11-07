import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export interface CashFlowChartData {
  name: string;
  income: number;
  expense: number;
  net: number;
  [key: string]: string | number;
}

interface CashFlowChartProps {
  data: CashFlowChartData[];
  formatValue?: (value: number) => string;
  height?: number | `${number}%`;
  incomeColor?: string;
  expenseColor?: string;
  netColor?: string;
  incomeLabel?: string;
  expenseLabel?: string;
  netLabel?: string;
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({
  data,
  formatValue,
  height = 350,
  incomeColor = '#2ecc71',
  expenseColor = '#e74c3c',
  netColor = '#000000',
  incomeLabel = 'Income',
  expenseLabel = 'Expense',
  netLabel = 'Cash flow',
}) => {
  const defaultFormatter = (value: number) => value.toString();
  const valueFormatter = formatValue || defaultFormatter;

  // Transform data to have negative expense values for display
  const transformedData = data.map((item) => ({
    ...item,
    expenseNegative: -Math.abs(item.expense),
  }));

  const tooltipFormatter = (value: number, name: string) => {
    // For display in tooltip, show absolute values
    const displayValue = name === 'Expense' ? Math.abs(value) : value;
    return [valueFormatter(displayValue), name];
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={transformedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip formatter={tooltipFormatter} />
        <Legend />
        <ReferenceLine y={0} stroke="#666" strokeWidth={1} />
        <Bar dataKey="income" fill={incomeColor} name={incomeLabel} />
        <Bar dataKey="expenseNegative" fill={expenseColor} name={expenseLabel} />
        <Line
          type="monotone"
          dataKey="net"
          stroke={netColor}
          strokeWidth={2}
          dot={{ fill: netColor, r: 3 }}
          name={netLabel}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default CashFlowChart;
