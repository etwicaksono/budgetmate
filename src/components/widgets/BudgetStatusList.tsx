'use client';

import React from 'react';
import { ProgressBar } from 'react-bootstrap';

/**
 * BudgetStatusList - Reusable Budget Status Component
 * 
 * Can be used in:
 * - Dashboard (budget overview)
 * - Budgets page (detailed budget tracking)
 * - Analytics page (spending analysis)
 * 
 * Follows Single Responsibility Principle: Only renders budget status list
 */

export interface Budget {
  id: string;
  category: string;
  spent: number;
  limit: number;
  color?: string;
}

interface BudgetStatusListProps {
  budgets: Budget[];
  formatCurrency?: (value: number) => string;
  emptyMessage?: string;
  limit?: number;
  height?: string | number | undefined;
}

export const BudgetStatusList: React.FC<BudgetStatusListProps> = ({
  budgets,
  formatCurrency = (value) => value.toString(),
  emptyMessage = 'No budget data available',
  limit,
  height,
}) => {
  if (!budgets || budgets.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        {emptyMessage}
      </div>
    );
  }

  const displayBudgets = limit ? budgets.slice(0, limit) : budgets;

  const getVariant = (percentage: number): string => {
    if (percentage >= 90) return 'danger';
    if (percentage >= 50) return 'warning';
    return 'success';
  };

  const isExpanded = height === '100%';

  return (
    <div 
      style={{ 
        height: isExpanded ? '100%' : 'auto',
        overflowY: isExpanded ? 'auto' : 'visible',
        padding: '0.5rem 1rem',
      }}
    >
      {displayBudgets.map((budget, index) => {
        const percentage = budget.limit > 0 ? (budget.spent / budget.limit) * 100 : 0;

        return (
          <div 
            key={budget.id} 
            className={index < displayBudgets.length - 1 ? 'mb-4' : ''}
            style={{ 
              borderBottom: index < displayBudgets.length - 1 ? '1px solid #e9ecef' : 'none',
              paddingBottom: index < displayBudgets.length - 1 ? '1rem' : 0,
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span style={{ fontWeight: 500 }}>{budget.category}</span>
              <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                {formatCurrency(budget.spent)} of {formatCurrency(budget.limit)}
              </span>
            </div>
            <ProgressBar
              now={Math.min(percentage, 100)}
              variant={getVariant(percentage)}
              style={{ height: '10px', borderRadius: '5px' }}
            />
          </div>
        );
      })}
    </div>
  );
};
