import React from 'react';
import { BudgetStatusList } from '@/components/widgets';
import type { Budget } from '@/components/widgets/BudgetStatusList';
import type { BudgetStatus } from '@/services/budgetService';
import { BudgetConfigModal } from '@/components/budgets/BudgetConfigModal';
import { Button } from 'react-bootstrap';
import { FaCog } from 'react-icons/fa';

export interface BudgetStatusWidgetProps {
  budgets: BudgetStatus[];
  formatCurrencyValue: (value: number) => string;
  height?: string | number;
}

export const BudgetStatusWidget: React.FC<BudgetStatusWidgetProps> = ({
  budgets,
  formatCurrencyValue,
  height,
}) => {
  const [showConfig, setShowConfig] = React.useState(false);
  const isExpanded = height === '100%';

  return (
    <div
      style={{
        height: isExpanded ? '100%' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div className="d-flex justify-content-end align-items-center px-1 py-2" style={{ flexShrink: 0 }}>
        <Button variant="link" size="sm" className="text-secondary p-0 m-0" onClick={() => setShowConfig(true)}>
          <FaCog size={16} /> Manage
        </Button>
      </div>

      <div
        style={{
          flex: isExpanded ? 1 : 'none',
          minHeight: isExpanded ? 0 : 'auto',
          height: isExpanded ? '100%' : 'auto',
        }}
      >
        {budgets.length > 0 ? (
          <BudgetStatusList
            budgets={budgets.map((budget): Budget => ({
              id: budget.id,
              category: budget.category,
              spent: budget.spent,
              basic_limit: budget.basic_budget,
              extend_limit: budget.extend_budget,
              total_limit: budget.total_budget,
              percentage: budget.percentage,
              status: budget.status,
            }))}
            formatCurrency={formatCurrencyValue}
            height={isExpanded ? '100%' : undefined}
          />
        ) : (
          <div className="text-center py-5 text-muted">No budget data available</div>
        )}
      </div>

      <BudgetConfigModal 
        show={showConfig} 
        onHide={() => setShowConfig(false)}
      />
    </div>
  );
};
