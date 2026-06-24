import React from 'react';
import { IncomeExpenseBarChart, type BarChartData } from '@/components/widgets';

export interface IncomeVsExpensesWidgetProps {
  data: BarChartData[];
  formatCurrencyValue: (value: number) => string;
  height?: string | number;
}

export const IncomeVsExpensesWidget: React.FC<IncomeVsExpensesWidgetProps> = ({
  data,
  formatCurrencyValue,
  height,
}) => {
  const isExpanded = height === '100%';

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
          padding: '1rem',
        }}
      >
        {data.length > 0 ? (
          <IncomeExpenseBarChart
            data={data}
            formatValue={formatCurrencyValue}
            height={isExpanded ? '100%' : 320}
            incomeColor="#2ecc71"
            expenseColor="#e74c3c"
            incomeLabel="Income"
            expenseLabel="Expense"
          />
        ) : (
          <div className="text-center py-5 text-muted">No income/expense data available</div>
        )}
      </div>
    </div>
  );
};
