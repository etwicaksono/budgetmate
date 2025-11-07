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
  height?: number | `${number}%` | string;
}

const RecentTransactionsList: React.FC<RecentTransactionsListProps> = ({
  transactions,
  formatCurrency,
  emptyMessage = 'No recent transactions',
  height,
}) => {
  if (transactions.length === 0) {
    return <div className="text-center text-muted py-4">{emptyMessage}</div>;
  }

  const containerStyle: React.CSSProperties = {
    paddingLeft: '1rem',
    paddingRight: '1rem',
    paddingTop: '1rem',
    paddingBottom: '1rem',
    ...(height === '100%'
      ? {
          flex: '1 1 0',
          overflowY: 'auto' as const,
          minHeight: 0,
        }
      : height
        ? {
            height: height,
            overflowY: 'auto' as const
          }
        : {}
    ),
  };

  return (
    <div className="transaction-list" style={containerStyle}>
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
