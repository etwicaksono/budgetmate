'use client';

import React, { useRef, useEffect } from 'react';
import { ListGroup, Spinner } from 'react-bootstrap';
import { format, parseISO } from 'date-fns';
import * as FaIcons from 'react-icons/fa';
import { currencyFormatService } from '@/services/currencyFormatService';
import '@/components/Records/Records.css';

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
  categoryIconColor?: string;
  categoryIcon?: string;
  account?: string;
  labels?: Array<{ id: string; name: string; color: string; }>;
  type: 'income' | 'expense' | 'transfer' | 'transfer_in' | 'transfer_out' | 'debt_in' | 'debt_out';
}

interface TransactionsListProps {
  transactions: Transaction[];
  emptyMessage?: string;
  maxHeight?: string;
  height?: string | number;
  onTransactionClick?: (transaction: Transaction) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

export const TransactionsList: React.FC<TransactionsListProps> = ({
  transactions,
  emptyMessage = 'No transactions',
  maxHeight = '400px',
  height,
  onTransactionClick,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}) => {
  const observerTarget = useRef<HTMLDivElement>(null);

  const resolveIconComponent = (
    iconName?: string
  ): React.ComponentType<{ size?: number }> | undefined => {
    if (!iconName) return undefined;
    if (!Object.hasOwn(FaIcons, iconName)) return undefined;
    const maybeIcon = (FaIcons as Record<string, React.ComponentType<{ size?: number }>>)[iconName];
    return typeof maybeIcon === 'function' ? maybeIcon : undefined;
  };

  useEffect(() => {
    if (!onLoadMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoadingMore, onLoadMore]);
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center text-muted py-5">
        {emptyMessage}
      </div>
    );
  }

  const isExpanded = height === '100%';

  return (
    <div style={{ 
      height: isExpanded ? '100%' : undefined,
      maxHeight: isExpanded ? undefined : maxHeight, 
      overflowY: 'auto' 
    }}>
      <ListGroup variant="flush">
        {transactions.map((transaction) => {
          const CategoryIcon = resolveIconComponent(transaction.categoryIcon);
          
          return (
            <ListGroup.Item
              key={transaction.id}
              className="records-item p-3"
              style={{ cursor: onTransactionClick ? 'pointer' : 'default', display: 'flex', alignItems: 'center', position: 'relative' }}
              onClick={() => onTransactionClick?.(transaction)}
            >
              {/* Left Icon */}
              <div className="records-item-icon" style={{ flexShrink: 0 }}>
                <span
                  className="d-inline-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: 36,
                    height: 36,
                    backgroundColor: transaction.categoryIconColor || '#6c757d',
                    color: '#fff',
                    fontSize: '0.9rem',
                  }}
                >
                  {CategoryIcon ? (
                    <CategoryIcon size={16} />
                  ) : (
                    <span>📦</span>
                  )}
                </span>
              </div>
              
              {/* Middle Details */}
              <div className="records-item-details d-flex flex-column pe-2 overflow-hidden mx-2" style={{ flex: '1 1 auto', minWidth: 0 }}>
                <div className="records-item-category fw-bold text-truncate" style={{ fontSize: '0.95rem' }}>
                  {transaction.category || 'Uncategorized'}
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
                    <div className="text-truncate" style={{ maxWidth: '100%' }}>{transaction.account || 'Wallet'}</div>
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
                        {transaction.description.length > 100 
                          ? `${transaction.description.substring(0, 100)}...` 
                          : transaction.description}
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
                    {currencyFormatService.formatCurrency(Math.abs(transaction.amount), transaction.currency || 'USD').replace(/\.00$/, '')}
                  </strong>
                </div>
                <div className="text-muted d-flex align-items-center justify-content-end" style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>
                  <span>{format(parseISO(transaction.date), 'yyyy-MM-dd HH:mm')}</span>
                </div>
              </div>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
      
      {/* Infinite Scroll Observer Target */}
      {(hasMore || isLoadingMore) && (
        <div 
          ref={observerTarget} 
          className="d-flex justify-content-center align-items-center py-3"
          style={{ minHeight: '50px' }}
        >
          {isLoadingMore ? (
            <Spinner animation="border" size="sm" variant="primary" />
          ) : (
            <span className="text-muted" style={{ fontSize: '12px' }}>Scroll for more</span>
          )}
        </div>
      )}
    </div>
  );
};
