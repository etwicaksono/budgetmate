import React from 'react';
import { Form, Dropdown, Card } from 'react-bootstrap';
import { FaEllipsisV } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';
import './Records.css';

export interface TransactionRecord {
  id: string;
  date: string;
  time: string;
  categoryName: string;
  categoryIcon?: string;
  categoryIconColor?: string;
  accountName: string;
  description: string;
  payer?: string;
  amount: number;
  currency: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  labels?: Array<{
    id?: string;
    name: string;
    color?: string;
  }>;
}

export type GroupedTransactions = Record<string, TransactionRecord[]>;

interface RecordsListProps {
  groupedTransactions: GroupedTransactions;
  selectedRecords: Set<string>;
  accountName?: string;
  onSelectRecord: (recordId: string) => void;
  onEditRecord: (record: TransactionRecord) => void;
  onDeleteRecord?: (recordId: string) => void;
  showCheckboxes?: boolean;
  showDropdownMenu?: boolean;
}

export const RecordsList: React.FC<RecordsListProps> = ({
  groupedTransactions,
  selectedRecords,
  onSelectRecord,
  onEditRecord,
  onDeleteRecord,
  showCheckboxes = true,
  showDropdownMenu = true,
}) => {
  const { formatCurrency } = useFormattedCurrency();

  const resolveIconComponent = (
    iconName?: string
  ): React.ComponentType<{ size?: number }> | undefined => {
    if (!iconName) {
      return undefined;
    }

    if (!Object.hasOwn(FaIcons, iconName)) {
      return undefined;
    }

    const maybeIcon = FaIcons[iconName as keyof typeof FaIcons];
    return typeof maybeIcon === 'function'
      ? (maybeIcon as React.ComponentType<{ size?: number }>)
      : undefined;
  };

  if (Object.entries(groupedTransactions).length === 0) {
    return (
      <div className="records-empty">
        <p className="text-muted">No records found</p>
      </div>
    );
  }

  return (
    <div className="records-list">
      {Object.entries(groupedTransactions).map(([dateKey, dayTransactions]) => {
        const dayHasCheckboxes = showCheckboxes && dayTransactions.length > 0;
        const dayHasSelections =
          dayHasCheckboxes &&
          dayTransactions.some((transaction) => selectedRecords.has(transaction.id));
        const areAllDayRecordsSelected =
          dayHasCheckboxes &&
          dayTransactions.every((transaction) => selectedRecords.has(transaction.id));
        const dayCheckboxId = `day-select-${dateKey.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}`;
        const shouldShowDayCheckbox = dayHasCheckboxes && dayHasSelections;

        const handleDaySelectionChange = (event: React.ChangeEvent<HTMLInputElement>) => {
          event.stopPropagation();
          if (!dayHasCheckboxes) {
            return;
          }

          const shouldSelectAll = !areAllDayRecordsSelected;
          dayTransactions.forEach((transaction) => {
            const isSelected = selectedRecords.has(transaction.id);
            if (shouldSelectAll && !isSelected) {
              onSelectRecord(transaction.id);
            } else if (!shouldSelectAll && isSelected) {
              onSelectRecord(transaction.id);
            }
          });
        };

        // Calculate daily total per currency
        // All transaction amounts from database already have correct signs:
        // - INCOME: positive
        // - EXPENSE: negative (already stored as negative in DB)
        // - transfer_in: positive
        // - transfer_out: negative
        const dayTotalsByCurrency: Record<string, number> = {};
        dayTransactions.forEach((transaction) => {
          const currency = transaction.currency || 'USD'; // Default to USD if undefined
          dayTotalsByCurrency[currency] = (dayTotalsByCurrency[currency] || 0) + transaction.amount;
        });

        return (
          <div key={dateKey} className="records-day-group">
            <div className="records-day-header">
              <div className="records-day-header-left">
                {shouldShowDayCheckbox && (
                  <Form.Check
                    type="checkbox"
                    id={dayCheckboxId}
                    className="records-day-select"
                    checked={areAllDayRecordsSelected}
                    onChange={handleDaySelectionChange}
                  />
                )}
                <h6 className="mb-0">{dateKey}</h6>
              </div>
              <div className="records-day-header-right">
                {Object.entries(dayTotalsByCurrency).map(([currency, total], index) => (
                  <React.Fragment key={currency}>
                    {index > 0 && <span className="mx-2">|</span>}
                    <strong
                      className={total < 0 ? 'text-danger' : total > 0 ? 'text-success' : 'text-muted'}
                    >
                      {total < 0 ? '-' : total > 0 ? '+' : ''}
                      {formatCurrency(Math.abs(total), currency)}
                    </strong>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="records-day-separator" />

            <div className="records-transactions">
              {dayTransactions.map((transaction) => {
                const CategoryIcon = resolveIconComponent(transaction.categoryIcon);
                const isSelected = selectedRecords.has(transaction.id);

                return (
                  <Card key={transaction.id} className="records-item-card mb-2">
                    <div
                      className={`records-item ${isSelected ? 'records-item--selected' : ''}`}
                      onClick={() => onEditRecord(transaction)}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative' }}
                    >
                      {showCheckboxes && (
                        <div
                          className="records-item-checkbox"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Form.Check
                            type="checkbox"
                            id={`record-${transaction.id}`}
                            checked={isSelected}
                            onChange={() => onSelectRecord(transaction.id)}
                          />
                        </div>
                      )}

                      <div className="records-item-icon" style={{ width: '48px', flexShrink: 0 }}>
                        <span
                          className="d-inline-flex align-items-center justify-content-center rounded-circle"
                          style={{
                            width: 40,
                            height: 40,
                            backgroundColor: transaction.categoryIconColor || '#6c757d',
                            color: '#fff',
                            fontSize: '1rem',
                          }}
                        >
                          {CategoryIcon ? <CategoryIcon size={18} /> : <span>📦</span>}
                        </span>
                      </div>

                      <div className="records-item-category fw-bold" style={{ width: '200px', flexShrink: 0 }}>
                        {transaction.categoryName}
                      </div>

                      <div className="d-flex align-items-center gap-2" style={{ width: '200px', flexShrink: 0 }}>
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: transaction.categoryIconColor || '#6c757d',
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                        <span className="text-truncate">{transaction.accountName}</span>
                      </div>

                      <div className="text-muted small" style={{ width: '220px', flexShrink: 0 }}>
                        <span className="text-truncate d-block">{transaction.description}</span>
                      </div>

                      <div className="d-flex gap-1 flex-wrap" style={{ flex: '1 1 auto', minWidth: 0 }}>
                        {Array.isArray(transaction.labels) && transaction.labels.length > 0 ? (
                          transaction.labels.map((label) => {
                            const labelKey = label.id ?? `${label.name}-${label.color ?? 'default'}`;
                            return (
                              <span
                                key={labelKey}
                                className="badge text-uppercase"
                                style={{ 
                                  backgroundColor: label.color || '#6c757d',
                                  color: '#fff',
                                  fontSize: '0.65rem',
                                  padding: '0.2rem 0.5rem',
                                  fontWeight: '600'
                                }}
                              >
                                {label.name}
                              </span>
                            );
                          })
                        ) : (
                          <span></span>
                        )}
                      </div>

                      <div className="ms-auto text-end" style={{ flexShrink: 0, paddingRight: '1rem' }}>
                        <div>
                          <strong
                            className={
                              transaction.amount < 0
                                ? 'text-danger'
                                : 'text-success'
                            }
                          >
                            {/* Display amount with sign exactly as stored in database:
                                - transfer_out: negative amount → show -USD 100.00 (red)
                                - transfer_in: positive amount → show +USD 100.00 (green)
                                - expense: negative amount → show -USD 100.00 (red)
                                - income: positive amount → show +USD 100.00 (green) */}
                            {transaction.amount < 0 ? '-' : transaction.amount > 0 ? '+' : ''}
                            {formatCurrency(Math.abs(transaction.amount), transaction.currency || 'USD')}
                          </strong>
                        </div>
                        <div className="text-muted small">
                          {transaction.time}
                        </div>
                      </div>

                      {showDropdownMenu && (
                        <div
                          className="records-item-actions"
                          onClick={(e) => e.stopPropagation()}
                          style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                        >
                          <Dropdown>
                            <Dropdown.Toggle
                              as="button"
                              className="btn btn-link text-muted p-0 border-0 bg-transparent records-menu-toggle"
                              id={`menu-${transaction.id}`}
                              bsPrefix="records-menu"
                            >
                              <FaEllipsisV size={20} />
                            </Dropdown.Toggle>

                            <Dropdown.Menu align="end" style={{ zIndex: 1050 }}>
                              <Dropdown.Item onClick={() => onEditRecord(transaction)}>
                                Edit
                              </Dropdown.Item>
                              {onDeleteRecord && (
                                <>
                                  <Dropdown.Divider />
                                  <Dropdown.Item
                                    className="text-danger"
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
        );
      })}
    </div>
  );
};
