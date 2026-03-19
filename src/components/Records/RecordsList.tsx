import React from 'react';
import { Form, Card } from 'react-bootstrap';
import { FaCheck, FaTrash } from 'react-icons/fa';
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
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'DEBT_IN' | 'DEBT_OUT';
  debt_id?: string;
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
  isModal?: boolean;
}

export const RecordsList: React.FC<RecordsListProps> = ({
  groupedTransactions,
  selectedRecords,
  onSelectRecord,
  onEditRecord,
  onDeleteRecord,
  showCheckboxes = true,
  showDropdownMenu = true,
  isModal = false,
}) => {
  const { formatCurrency } = useFormattedCurrency();
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

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
            <div 
              className="records-day-header"
              style={isModal ? { position: 'static' } : {}}
            >
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
                <h6 className="mb-0 fw-bold">{dateKey}</h6>
              </div>
              <div className="records-day-header-right">
                {Object.entries(dayTotalsByCurrency).map(([currency, total], index) => (
                  <React.Fragment key={currency}>
                    {index > 0 && <span className="mx-2">|</span>}
                    <strong
                      style={{ color: '#6C757D', whiteSpace: 'nowrap' }}
                    >
                      {total < 0 ? '-' : total > 0 ? '+' : ''}
                      {formatCurrency(Math.abs(total), currency).replace(/\.00$/, '')}
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
                      onClick={() => {
                        if (selectedRecords.size > 0) {
                          onSelectRecord(transaction.id);
                        } else {
                          onEditRecord(transaction);
                        }
                      }}
                      onTouchStart={() => {
                        if (selectedRecords.size === 0) {
                          longPressTimerRef.current = setTimeout(() => {
                            onSelectRecord(transaction.id);
                            if (window.navigator?.vibrate) {
                              window.navigator.vibrate(50);
                            }
                          }, 500);
                        }
                      }}
                      onTouchEnd={() => {
                        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                      }}
                      onTouchMove={() => {
                        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
                      }}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', position: 'relative' }}
                    >
                      {showCheckboxes && (
                        <div
                          className="records-item-checkbox d-none d-md-block"
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

                      <div className="records-item-icon" style={{ flexShrink: 0 }}>
                        <span
                          className={`d-inline-flex align-items-center justify-content-center rounded-circle ${isSelected ? 'bg-primary' : ''}`}
                          style={{
                            width: 36,
                            height: 36,
                            backgroundColor: isSelected ? undefined : (transaction.categoryIconColor || '#6c757d'),
                            color: '#fff',
                            fontSize: '0.9rem',
                            transition: 'background-color 0.2s',
                          }}
                        >
                          {isSelected ? (
                            <>
                              <FaCheck size={16} className="d-md-none" />
                              {CategoryIcon ? (
                                <span className="d-none d-md-block"><CategoryIcon size={16} /></span>
                              ) : (
                                <span className="d-none d-md-block">📦</span>
                              )}
                            </>
                          ) : CategoryIcon ? (
                            <CategoryIcon size={16} />
                          ) : (
                            <span>📦</span>
                          )}
                        </span>
                      </div>
                      {/* Middle Details */}
                      <div className="records-item-details d-flex flex-column pe-2 overflow-hidden mx-1" style={{ flex: '1 1 auto', minWidth: 0 }}>
                        <div className="records-item-category fw-bold text-truncate" style={{ fontSize: '0.95rem' }}>
                          {transaction.categoryName}
                        </div>
                        {/* Mobile: Stacked, Desktop: Inline */}
                        <div className="d-flex flex-column flex-md-row align-items-md-center text-muted small mt-1 w-100 overflow-hidden">
                          {/* Account Line */}
                          <div className="d-flex align-items-center mb-1 mb-md-0 flex-shrink-0" style={{ maxWidth: '100%' }}>
                            <div
                              className="d-none d-md-block"
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: transaction.categoryIconColor || '#6c757d',
                                flexShrink: 0,
                                marginRight: '6px'
                              }}
                            />
                            <div className="text-truncate" style={{ maxWidth: '100%' }}>{transaction.accountName}</div>
                          </div>

                          {/* Description Line */}
                          {transaction.description && (
                            <div className="d-flex align-items-start align-items-md-center flex-shrink-1 ps-md-1 overflow-hidden w-100">
                              <div className="d-none d-md-block flex-shrink-0 mx-1">•</div>
                              <div
                                className="description-text w-100 description-clamp"
                                style={{
                                  fontStyle: 'italic',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                              >
                                {transaction.description}
                              </div>
                            </div>
                          )}
                        </div>
                        {Array.isArray(transaction.labels) && transaction.labels.length > 0 && (
                          <div className="d-flex gap-1 flex-wrap mt-1">
                            {transaction.labels.map((label) => {
                              const labelKey = label.id ?? `${label.name}-${label.color ?? 'default'}`;
                              return (
                                <span
                                  key={labelKey}
                                  className="badge text-uppercase text-truncate"
                                  style={{
                                    backgroundColor: label.color || '#6c757d',
                                    color: '#fff',
                                    fontSize: '0.6rem',
                                    padding: '0.15rem 0.4rem',
                                    fontWeight: '600',
                                    maxWidth: '80px'
                                  }}
                                >
                                  {label.name}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right Side Amount */}
                      <div className="records-item-amount text-end flex-shrink-0 ms-auto d-flex flex-column justify-content-start" style={{ whiteSpace: 'nowrap', minWidth: 'fit-content' }}>
                        <div>
                          <strong
                            className={
                              transaction.amount < 0
                                ? 'text-danger'
                                : 'text-success'
                            }
                            style={{ fontSize: '0.95rem' }}
                          >
                            {transaction.amount < 0 ? '-' : transaction.amount > 0 ? '+' : ''}
                            {formatCurrency(Math.abs(transaction.amount), transaction.currency || 'USD').replace(/\.00$/, '')}
                          </strong>
                        </div>
                        <div className="text-muted d-flex align-items-center justify-content-end" style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>
                          <span>{transaction.time}</span>
                        </div>
                      </div>

                      {/* Action Menu (Desktop only) */}
                      {showDropdownMenu && onDeleteRecord && (
                        <div
                          className="records-item-actions d-none d-md-flex align-items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className="records-action-btn text-danger"
                            onClick={() => onDeleteRecord(transaction.id)}
                            title="Delete Record"
                          >
                            <FaTrash size={14} />
                            <span>Delete</span>
                          </button>
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
