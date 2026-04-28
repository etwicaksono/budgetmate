'use client';

import React from 'react';
import { ProgressBar } from 'react-bootstrap';

export interface Budget {
  id: string;
  category: string;
  spent: number;
  basic_limit: number;
  extend_limit: number;
  total_limit: number;
  percentage: number;
  status: 'success' | 'warning' | 'danger';
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
        const basicTickPercentage = budget.total_limit > 0 ? (budget.basic_limit / budget.total_limit) * 100 : 0;

        return (
          <div 
            key={budget.id} 
            className={index < displayBudgets.length - 1 ? 'mb-4' : ''}
            style={{ 
              borderBottom: index < displayBudgets.length - 1 ? '1px solid #e9ecef' : 'none',
              paddingBottom: index < displayBudgets.length - 1 ? '1rem' : 0,
            }}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span style={{ fontWeight: 500 }}>{budget.category}</span>
              <span className={`text-${budget.status === 'danger' ? 'danger' : 'muted'}`} style={{ fontSize: '0.85rem' }}>
                {formatCurrency(budget.spent)} / {formatCurrency(budget.total_limit)}
              </span>
            </div>
            {budget.extend_limit > 0 ? (
               <div style={{fontSize: '0.75rem', color: '#6c757d', marginBottom: '4px'}}>
                 Basic Limit: {formatCurrency(budget.basic_limit)}
               </div>
            ) : null}
            
            <div style={{ position: 'relative', paddingTop: '4px', paddingBottom: '4px' }}>
               <ProgressBar
                 now={Math.min(budget.percentage, 100)}
                 variant={budget.status}
                 style={{ height: '8px', borderRadius: '4px' }}
               />
               {/* Marker for basic limit if extend limit exists */}
               {budget.extend_limit > 0 && basicTickPercentage < 100 && (
                 <div 
                   style={{
                     position: 'absolute',
                     left: `${basicTickPercentage}%`,
                     top: 0,
                     bottom: 0,
                     width: '2px',
                     backgroundColor: '#adb5bd',
                     zIndex: 1
                   }}
                   title="Basic Limit"
                 />
               )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

