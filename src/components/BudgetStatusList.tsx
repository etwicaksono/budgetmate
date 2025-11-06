import React from 'react';

export interface BudgetItem {
  id: string;
  category: string;
  spent: number;
  total: number;
  percentage: number;
  status: 'success' | 'warning' | 'danger';
}

interface BudgetStatusListProps {
  budgets: BudgetItem[];
  formatCurrency: (value: number) => string;
  limit?: number;
  emptyMessage?: string;
}

const getProgressBarColor = (status: string): string => {
  switch (status) {
    case 'success':
      return 'bg-success';
    case 'warning':
      return 'bg-warning';
    case 'danger':
      return 'bg-danger';
    default:
      return 'bg-secondary';
  }
};

const BudgetStatusList: React.FC<BudgetStatusListProps> = ({
  budgets,
  formatCurrency,
  limit,
  emptyMessage = 'No budget data available',
}) => {
  if (budgets.length === 0) {
    return <div className="text-center text-muted py-4">{emptyMessage}</div>;
  }

  const displayedBudgets = limit ? budgets.slice(0, limit) : budgets;

  return (
    <>
      {displayedBudgets.map((budget) => (
        <div key={budget.id} className="budget-item mb-3">
          <div className="d-flex justify-content-between mb-1">
            <span>{budget.category}</span>
            <span>
              {formatCurrency(budget.spent)} of {formatCurrency(budget.total)}
            </span>
          </div>
          <div className="progress">
            <div
              className={`progress-bar ${getProgressBarColor(budget.status)}`}
              role="progressbar"
              style={{ width: `${budget.percentage}%` }}
              aria-valuenow={budget.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
        </div>
      ))}
    </>
  );
};

export default BudgetStatusList;
