import React from 'react';
import { BalanceTrendChart, type TrendChartData } from '@/components/widgets';

export interface BalanceTrendWidgetProps {
  data: TrendChartData[];
  formatCurrencyValue: (value: number) => string;
  height?: string | number;
}

export const BalanceTrendWidget: React.FC<BalanceTrendWidgetProps> = ({
  data,
  formatCurrencyValue,
  height,
}) => {
  const isExpanded = height === '100%';
  const lastPoint = data[data.length - 1];
  const firstPoint = data[0];
  const totalBalance = lastPoint?.balance ?? 0;
  const percentChange =
    data.length > 1 && firstPoint?.balance
      ? Number((((totalBalance - firstPoint.balance) / firstPoint.balance) * 100).toFixed(2))
      : 0;

  return (
    <div
      style={{
        height: isExpanded ? '100%' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          flex: isExpanded ? 1 : 'none',
          minHeight: isExpanded ? 0 : 'auto',
          height: isExpanded ? '100%' : 'auto',
        }}
      >
        <BalanceTrendChart
          data={data}
          totalBalance={totalBalance}
          percentChange={percentChange}
          formatValue={formatCurrencyValue}
          height={isExpanded ? '100%' : 350}
          lineColor="#2563eb"
        />
      </div>
    </div>
  );
};
