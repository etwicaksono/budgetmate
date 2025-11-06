import React from 'react';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  type: 'INCOME' | 'EXPENSE';
}

interface RecentTransactionsListProps {
  transactions: Transaction[];
  formatCurrency: (value: number) => string;
  emptyMessage?: string;
}

const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
  transactions,
  formatCurrency,
  emptyMessage = 'No recent transactions',
}) => {
  if (transactions.length === 0) {
    return <div className="text-center text-muted py-4">{emptyMessage}</div>;
  }

  return (
    <div className="transaction-list">
      {transactions.map((transaction) => (
        <div
          key={transaction.id}
          className="transaction-item d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom"
        >
          <div>
            <div className="fw-bold">{transaction.description}</div>
            <div className="text-muted small">
              {transaction.category} • {transaction.date}
            </div>
          </div>
          <div className={transaction.type === 'INCOME' ? 'text-success' : 'text-danger'}>
            {transaction.type === 'INCOME' ? '+' : '-'}
            {formatCurrency(transaction.amount)}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecentTransactionsList;
