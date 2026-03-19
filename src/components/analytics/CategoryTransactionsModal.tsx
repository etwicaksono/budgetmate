'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Placeholder } from 'react-bootstrap';
import { transactionService, type Transaction } from '@/services/transactionService';
import { EditableRecordsList } from '@/components/Records/EditableRecordsList';
import { type GroupedTransactions, type TransactionRecord } from '@/components/Records/RecordsList';

interface CategoryTransactionsModalProps {
  show: boolean;
  onHide: () => void;
  categoryIds: string[] | null;
  categoryName: string;
  monthType: 'current' | 'previous';
  monthName: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
}

const CategoryTransactionsModal: React.FC<CategoryTransactionsModalProps> = ({
  show,
  onHide,
  categoryIds,
  categoryName,
  monthName,
  startDate,
  endDate,
  currency,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!categoryIds || categoryIds.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      
      const filters: Record<string, string | number> = {
        category_ids: categoryIds.join(','),
      };
      
      if (startDate) filters['start_date'] = startDate;
      if (endDate) filters['end_date'] = endDate;
      if (currency) filters['currencies'] = currency;
      
      const result = await transactionService.fetchTransactions(filters);
      setTransactions(result.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [categoryIds, startDate, endDate, currency]);

  useEffect(() => {
    if (show && categoryIds && categoryIds.length > 0) {
      fetchTransactions();
    }
  }, [show, categoryIds, fetchTransactions]);

  useEffect(() => {
    const handleTransactionChange = () => {
      if (show && categoryIds && categoryIds.length > 0) {
        fetchTransactions();
      }
    };

    window.addEventListener('transaction-updated', handleTransactionChange);
    return () => window.removeEventListener('transaction-updated', handleTransactionChange);
  }, [show, categoryIds, fetchTransactions]);

  const groupedTransactions = useMemo((): GroupedTransactions => {
    const grouped: GroupedTransactions = {};
    
    transactions.forEach((txn) => {
      const dateObj = new Date(txn.date);
      const dateKey = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
      
      const record: TransactionRecord = {
        id: txn.id,
        date: dateKey,
        time: dateObj.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        categoryName: txn.category?.name || 'Uncategorized',
        accountName: txn.account?.name || '',
        description: txn.description || '',
        amount: txn.amount,
        currency: txn.currency,
        type: txn.type.toUpperCase() as 'INCOME' | 'EXPENSE' | 'TRANSFER',
        ...(txn.category?.icon && { categoryIcon: txn.category.icon }),
        ...(txn.category?.color && { categoryIconColor: txn.category.color }),
        ...(txn.payee && { payer: txn.payee }),
        ...(txn.labels && txn.labels.length > 0 && {
          labels: txn.labels.map(label => ({
            id: label.id,
            name: label.name,
            ...(label.color && { color: label.color }),
          })),
        }),
      };
      
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(record);
    });
    
    return grouped;
  }, [transactions]);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered backdrop="static" keyboard={false} scrollable>
      <Modal.Header closeButton>
        <Modal.Title>
          {categoryName} - {monthName}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading && (
          <div>
            {/* Skeleton for 2 date groups */}
            {[0, 1].map((groupIndex) => (
              <div key={groupIndex} className="mb-4">
                {/* Date header skeleton */}
                <div className="mb-2">
                  <Placeholder animation="glow">
                    <Placeholder xs={4} className="rounded" style={{ height: 20 }} />
                  </Placeholder>
                </div>
                
                {/* Transaction rows skeleton */}
                {[0, 1, 2].map((rowIndex) => (
                  <div
                    key={rowIndex}
                    className="d-flex align-items-center gap-3 py-2 border-bottom"
                  >
                    {/* Icon placeholder */}
                    <Placeholder animation="glow">
                      <Placeholder
                        className="rounded-circle"
                        style={{ width: 40, height: 40 }}
                      />
                    </Placeholder>
                    
                    {/* Category and description */}
                    <div className="flex-grow-1">
                      <Placeholder animation="glow">
                        <Placeholder xs={rowIndex % 2 === 0 ? 5 : 4} className="d-block mb-1" />
                      </Placeholder>
                      <Placeholder animation="glow">
                        <Placeholder xs={rowIndex % 2 === 0 ? 3 : 6} size="sm" className="text-muted" />
                      </Placeholder>
                    </div>
                    
                    {/* Amount placeholder */}
                    <div className="text-end">
                      <Placeholder animation="glow">
                        <Placeholder style={{ width: 80 }} />
                      </Placeholder>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && (
          <EditableRecordsList
            groupedTransactions={groupedTransactions}
            isModal={true}
          />
        )}
      </Modal.Body>
    </Modal>
  );
};

export default CategoryTransactionsModal;
