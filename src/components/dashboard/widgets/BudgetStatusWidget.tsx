import React, { useMemo } from 'react';
import { Nav } from 'react-bootstrap';
import { BudgetStatusList } from '@/components/widgets';
import type { BudgetStatus } from '@/services/budgetService';

export interface BudgetStatusWithCurrency extends BudgetStatus {
  currency: string;
}

export interface BudgetStatusWidgetProps {
  budgets: BudgetStatusWithCurrency[];
  formatCurrencyValue: (value: number, currency?: string) => string;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  height?: string | number;
}

export const BudgetStatusWidget: React.FC<BudgetStatusWidgetProps> = ({
  budgets,
  formatCurrencyValue,
  selectedCurrency,
  setSelectedCurrency,
  height,
}) => {
  // Get unique currencies from budgets
  const budgetCurrencies = useMemo(() => {
    const currencies = [...new Set(budgets.map((b) => b.currency))];
    return currencies.sort();
  }, [budgets]);

  // Filter budgets by selected currency
  const filteredBudgets = useMemo(() => {
    return budgets
      .filter((b) => b.currency === selectedCurrency)
      .map((b) => ({
        id: b.id,
        category: b.category,
        spent: b.spent,
        limit: b.total,
      }));
  }, [budgets, selectedCurrency]);

  const isExpanded = height === '100%';
  const hasTabs = budgetCurrencies.length > 1;

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
          {budgetCurrencies.map((currency) => (
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
      {/* Budget List */}
      <div
        style={{
          flex: isExpanded ? 1 : 'none',
          minHeight: isExpanded ? 0 : 'auto',
          height: isExpanded ? '100%' : 'auto',
        }}
      >
        {filteredBudgets.length > 0 ? (
          <BudgetStatusList
            budgets={filteredBudgets}
            formatCurrency={(value) => formatCurrencyValue(value, selectedCurrency)}
            height={isExpanded ? '100%' : undefined}
          />
        ) : (
          <div className="text-center py-5 text-muted">
            No budget data available for {selectedCurrency}
          </div>
        )}
      </div>
    </div>
  );
};
