import React from 'react';
import * as FaIcons from 'react-icons/fa';

interface Transaction {
  id: string;
  date: string;
  time: string;
  categoryName: string;
  categoryIcon: string;
  accountName: string;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
}

interface GroupedTransactions {
  [date: string]: Transaction[];
}

interface TransactionListProps {
  transactions: Transaction[];
  groupedTransactions: GroupedTransactions;
  onTransactionClick: (transaction: Transaction) => void;
  formatCurrency: (amount: number) => string;
  formatDateHeader: (dateString: string) => string;
  loading?: boolean;
  error?: string | null;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  groupedTransactions,
  onTransactionClick,
  formatCurrency,
  formatDateHeader,
  loading = false,
  error = null,
}) => {
  const resolveIconComponent = (
    iconName?: string
  ): React.ComponentType<{ size?: number }> | undefined => {
    if (!iconName) return undefined;
    const iconsLibrary = FaIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>;
    const IconComp = iconsLibrary[iconName];
    return IconComp ? (IconComp as React.ComponentType<{ size?: number }>) : undefined;
  };

  if (loading) {
    return null;
  }

  if (error) {
    return null;
  }

  if (!loading && !error && transactions.length === 0) {
    return (
      <div className="text-center py-5 text-muted">
        <p>No transactions found</p>
      </div>
    );
  }

  return (
    <div className="account-detail-records__list">
      {Object.entries(groupedTransactions).map(([date, dateTransactions], groupIndex) => (
        <div key={date} className="account-detail-records__day-group">
          {/* Date Spacer/Divider */}
          {groupIndex > 0 && (
            <div className="my-4">
              <hr className="mb-3" />
            </div>
          )}

          {/* Sticky Date Header */}
          <div
            className="account-detail-records__day-header"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: '#f8f9fa',
              padding: '0.5rem 1rem',
              marginBottom: '1rem',
              borderRadius: '0.375rem'
            }}
          >
            <h4>{formatDateHeader(date)}</h4>
          </div>

          {/* Transaction Items */}
          <div className="account-detail-records__transactions">
            {dateTransactions.map((transaction) => {
              const CategoryIcon = resolveIconComponent(transaction.categoryIcon);

              return (
                <div
                  key={transaction.id}
                  className="account-detail-records__item"
                  onClick={() => onTransactionClick(transaction)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="account-detail-records__item-icon">
                    {CategoryIcon ? (
                      <CategoryIcon size={20} />
                    ) : (
                      <span>📁</span>
                    )}
                  </div>

                  <div className="account-detail-records__item-details">
                    <div className="account-detail-records__item-category">
                      {transaction.categoryName}
                    </div>
                    <div className="account-detail-records__item-info">
                      <span className="account-detail-records__item-subcategory">
                        {transaction.categoryName}
                      </span>
                      <span className="account-detail-records__item-account">
                        • {transaction.accountName}
                      </span>
                    </div>
                  </div>

                  <div className="account-detail-records__item-description">
                    {transaction.description}
                  </div>

                  <div className="account-detail-records__item-amount">
                    <strong
                      className={`${
                        transaction.type === 'Expense'
                          ? 'account-detail-records__amount--negative'
                          : 'account-detail-records__amount--positive'
                      }`}
                    >
                      {transaction.type === 'Expense' ? '-' : ''}IDR {formatCurrency(transaction.amount)}
                    </strong>
                    <span className="account-detail-records__item-time">
                      {transaction.time}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TransactionList;
