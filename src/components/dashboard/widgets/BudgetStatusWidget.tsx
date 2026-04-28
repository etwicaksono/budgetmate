import React, { useMemo } from 'react';
import { Nav } from 'react-bootstrap';
import { BudgetStatusList } from '@/components/widgets';
import type { BudgetStatus } from '@/services/budgetService';
import { BudgetConfigModal } from '@/components/budgets/BudgetConfigModal';
import { Button } from 'react-bootstrap';
import { FaCog } from 'react-icons/fa';

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
  const [showConfig, setShowConfig] = React.useState(false);

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
        basic_limit: b.basic_budget,
        extend_limit: b.extend_budget,
        total_limit: b.total_budget,
        percentage: b.percentage,
        status: b.status,
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
      {/* Header controls: Nav pills and manage button */}
      <div className="d-flex justify-content-between align-items-center px-1 py-2" style={{ flexShrink: 0 }}>
        <div>
          {hasTabs && (
            <Nav variant="pills" style={{ gap: '8px' }}>
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
        </div>
        <Button variant="link" size="sm" className="text-secondary p-0 m-0" onClick={() => setShowConfig(true)}>
          <FaCog size={16} /> Manage
        </Button>
      </div>
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

      <BudgetConfigModal 
        show={showConfig} 
        onHide={() => setShowConfig(false)}
      />
    </div>
  );
};
