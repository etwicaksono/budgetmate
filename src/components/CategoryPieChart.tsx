import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { PieLabelRenderProps } from 'recharts';

export interface CategoryPieChartData {
  name: string;
  value: number;
  [key: string]: any;
}

interface CategoryPieChartProps {
  data: CategoryPieChartData[];
  colors?: string[];
  formatValue?: (value: number) => string;
  height?: number | `${number}%`;
  outerRadius?: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: CategoryPieChartData;
  }>;
  formatValue: (value: number) => string;
  total: number;
}

const DEFAULT_COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884D8',
  '#FF6B6B',
  '#4ECDC4',
  '#95E1D3',
];

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, formatValue, total }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0];
    const percentage = ((data.value / total) * 100).toFixed(2);

    return (
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '1px solid #ccc',
          borderRadius: '4px',
          padding: '10px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{data.payload.name}</p>
        <p style={{ margin: '0 0 5px 0', color: '#666' }}>
          Amount: <strong>{formatValue(data.value)}</strong>
        </p>
        <p style={{ margin: '0', color: '#666' }}>
          Percentage: <strong>{percentage}%</strong>
        </p>
      </div>
    );
  }

  return null;
};

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  data,
  colors = DEFAULT_COLORS,
  formatValue,
  height = 300,
  outerRadius = 80,
}) => {
  const defaultFormatter = (value: number) => value.toString();
  const valueFormatter = formatValue || defaultFormatter;

  const total = React.useMemo(() => {
    return data.reduce((sum, item) => sum + item.value, 0);
  }, [data]);

  // Calculate dynamic outerRadius based on height when using percentage
  const computedOuterRadius = typeof height === 'string' ? '80%' : outerRadius;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={true}
            outerRadius={computedOuterRadius}
            fill="#8884d8"
            dataKey="value"
            label={(props: PieLabelRenderProps) => {
              const percent = Number(props.percent ?? 0);
              return `${props.name ?? ''} ${(percent * 100).toFixed(0)}%`;
            }}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatValue={valueFormatter} total={total} />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CategoryPieChart;
