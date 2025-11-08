import React from 'react';
import { Form, Dropdown, Card } from 'react-bootstrap';
import { FaEllipsisV } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import type { TransactionRecord, GroupedTransactions } from '../../types/transaction';

interface RecordsListProps {
  groupedTransactions: GroupedTransactions;
  selectedRecords: Set<string>;
  accountName: string;
  onSelectRecord: (recordId: string) => void;
  onEditRecord: (record: TransactionRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
  formatCurrency: (amount: number) => string;
  showCheckboxes?: boolean;
  showDropdownMenu?: boolean;
  showPayer?: boolean;
  showType?: boolean;
}

const RecordsList: React.FC<RecordsListProps> = ({
  groupedTransactions,
  selectedRecords,
  accountName,
  onSelectRecord,
  onEditRecord,
  onDeleteRecord,
  formatCurrency,
  showCheckboxes = true,
  showDropdownMenu = true,
  showPayer = false,
  showType = false,
}) => {
  const resolveIconComponent = (
    iconName?: string
  ): React.ComponentType<{ size?: number }> | undefined => {
    if (!iconName) return undefined;
    const iconsLibrary = FaIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>;
    const IconComp = iconsLibrary[iconName];
    return IconComp ? (IconComp as React.ComponentType<{ size?: number }>) : undefined;
  };

  if (Object.entries(groupedTransactions).length === 0) {
    return (
      <div className="account-detail-empty-state">
        <p>No records found</p>
      </div>
    );
  }

  return (
    <div className="account-detail-records__list">
      {Object.entries(groupedTransactions).map(([dateKey, dayTransactions]) => (
        <div key={dateKey} className="account-detail-records__day-group">
          <div
            className="account-detail-records__day-header"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: '#fff',
            }}
          >
            <h4>{dateKey}</h4>
          </div>

          <div className="account-detail-records__transactions">
            {dayTransactions.map((transaction) => {
              const CategoryIcon = resolveIconComponent(transaction.categoryIcon);
              const isSelected = selectedRecords.has(transaction.id);

              return (
                <Card key={transaction.id} className="account-detail-records__item-card">
                  <div
                    className={`account-detail-records__item ${
                      isSelected ? 'account-detail-records__item--selected' : ''
                    }`}
                    onClick={() => onEditRecord(transaction)}
                    style={{ cursor: 'pointer' }}
                  >
                  {showCheckboxes && (
                    <div
                      className="account-detail-records__item-checkbox"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Form.Check
                        type="checkbox"
                        id={transaction.id}
                        checked={isSelected}
                        onChange={() => onSelectRecord(transaction.id)}
                      />
                    </div>
                  )}

                  <div className="account-detail-records__item-icon" style={{ color: transaction.categoryIconColor }}>
                    {CategoryIcon ? (
                      <CategoryIcon size={20} />
                    ) : (
                      <span>📦</span>
                    )}
                  </div>

                  <div className="account-detail-records__item-details">
                    <div className="account-detail-records__item-category">
                      {transaction.categoryName}
                    </div>
                    <div className="account-detail-records__item-info">
                      <span className="account-detail-records__item-subcategory">
                        {transaction.description}
                      </span>
                      <span className="account-detail-records__item-account">
                        • {transaction.accountName}
                      </span>
                      {showPayer && transaction.payer && (
                        <span className="account-detail-records__item-payer">
                          • {transaction.payer}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="account-detail-records__item-description">
                    {transaction.description}
                  </div>

                  {showType && (
                    <div className="account-detail-records__item-type">
                      <span
                        className={`account-detail-records__badge account-detail-records__badge--${
                          transaction.type === 'INCOME' ? 'success' : 'danger'
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </div>
                  )}

                  <div className="account-detail-records__item-amount">
                    <strong
                      className={`${
                        transaction.type === 'EXPENSE'
                          ? 'account-detail-records__amount--negative'
                          : 'account-detail-records__amount--positive'
                      }`}
                    >
                      {transaction.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(transaction.amount)}
                    </strong>
                    <span className="account-detail-records__item-time">
                      {transaction.time}
                    </span>
                  </div>

                  {showDropdownMenu && (
                    <div
                      className="account-detail-records__item-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Dropdown>
                        <Dropdown.Toggle
                          variant="link"
                          className="account-detail-records__menu-btn"
                          id={`menu-${transaction.id}`}
                        >
                          <FaEllipsisV size={16} />
                        </Dropdown.Toggle>

                        <Dropdown.Menu align="end">
                          <Dropdown.Item
                            className="account-detail-records__menu-item"
                            onClick={() => onEditRecord(transaction)}
                          >
                            Edit
                          </Dropdown.Item>
                          {onDeleteRecord && (
                            <>
                              <Dropdown.Divider />
                              <Dropdown.Item
                                className="account-detail-records__menu-item account-detail-records__menu-item--danger"
                                onClick={() => onDeleteRecord(transaction.id)}
                              >
                                Delete
                              </Dropdown.Item>
                            </>
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  )}
                </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecordsList;
