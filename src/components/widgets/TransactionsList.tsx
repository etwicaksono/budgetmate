'use client';

import React from 'react';
import { ListGroup } from 'react-bootstrap';
import { currencyFormatService } from '@/services/currencyFormatService';

/**
 * TransactionsList - Reusable Transactions List Component
 * 
 * Can be used in:
 * - Dashboard (recent transactions)
 * - Transactions page (full transaction list)
 * - Account detail page (account transactions)
 * - Reports (filtered transactions)
 * 
 * Follows Single Responsibility Principle: Only renders transaction list
 */

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  category?: string;
  type: 'income' | 'expense' | 'transfer' | 'transfer_in' | 'transfer_out';
}

interface TransactionsListProps {
  transactions: Transaction[];
  emptyMessage?: string;
  maxHeight?: string;
  onTransactionClick?: (transaction: Transaction) => void;
}

export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  emptyMessage = 'No transactions',
  maxHeight = '400px',
  onTransactionClick,
}) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ maxHeight, overflowY: 'auto' }}>
      <ListGroup variant="flush">
        {transactions.map((transaction) => (
          <ListGroup.Item
            key={transaction.id}
            className="d-flex justify-content-between align-items-start py-3"
            style={{ cursor: onTransactionClick ? 'pointer' : 'default' }}
            onClick={() => onTransactionClick?.(transaction)}
          >
            <div className="flex-grow-1">
              <div className="fw-bold">{transaction.description}</div>
              {transaction.category && (
                <small className="text-muted">{transaction.category}</small>
              )}
              <div>
                <small className="text-muted">{transaction.date}</small>
              </div>
            </div>
            <div className="text-end">
              <div
                className={`fw-bold ${
                  transaction.amount < 0
                    ? 'text-danger'
                    : 'text-success'
                }`}
              >
                {/* Display amount with sign based on database value:
                    - Negative amounts (expenses, transfer_out): show -USD 100.00
                    - Positive amounts (income, transfer_in): show +USD 100.00 */}
                {transaction.amount < 0 ? '-' : '+'}
                {currencyFormatService.formatCurrency(Math.abs(transaction.amount), transaction.currency || 'USD')}
              </div>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  );
};
