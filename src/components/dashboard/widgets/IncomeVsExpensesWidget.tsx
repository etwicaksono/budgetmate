import React from 'react';
import { Nav } from 'react-bootstrap';
import { IncomeExpenseBarChart, type BarChartData } from '@/components/widgets';

export interface IncomeVsExpensesWidgetProps {
  dataByCurrency: Record<string, BarChartData[]>;
  currencies: string[];
  formatCurrencyValue: (value: number, currency?: string) => string;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  height?: string | number;
}

export const IncomeVsExpensesWidget: React.FC<IncomeVsExpensesWidgetProps> = ({
  dataByCurrency,
  currencies,
  formatCurrencyValue,
  selectedCurrency,
  setSelectedCurrency,
  height,
}) => {
  const currentData = selectedCurrency ? dataByCurrency[selectedCurrency] || [] : [];
  const isExpanded = height === '100%';
  const hasTabs = currencies.length > 1;

  return (
    <div
      style={{
        height: isExpanded ? '100%' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Currency Tabs */}
      {hasTabs && (
        <Nav variant="pills" className="justify-content-center py-2" style={{ gap: '8px', flexShrink: 0 }}>
          {currencies.map((currency) => (
            <Nav.Item key={currency}>
              <Nav.Link
                className={selectedCurrency === currency ? 'active' : ''}
                onClick={() => setSelectedCurrency(currency)}
                style={{
                  cursor: 'pointer',
                  padding: '4px 12px',
                  fontSize: '13px',
                  borderRadius: '16px',
                }}
              >
                {currency}
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      )}
      {/* Chart */}
      <div
        style={{
          flex: isExpanded ? 1 : 'none',
          minHeight: isExpanded ? 0 : 'auto',
          height: isExpanded ? '100%' : 'auto',
          padding: '1rem',
        }}
      >
        {currentData.length > 0 ? (
          <IncomeExpenseBarChart
            data={currentData}
            formatValue={(value) => formatCurrencyValue(value, selectedCurrency)}
            height={isExpanded ? '100%' : hasTabs ? 280 : 320}
            incomeColor="#2ecc71"
            expenseColor="#e74c3c"
            incomeLabel="Income"
            expenseLabel="Expense"
          />
        ) : (
          <div className="text-center py-5 text-muted">
            No income/expense data available for {selectedCurrency || 'selected currency'}
          </div>
        )}
      </div>
    </div>
  );
};
