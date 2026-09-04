'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Modal, Placeholder } from 'react-bootstrap';
import Swal from 'sweetalert2';
import { transactionService, type Transaction } from '@/services/transactionService';
import { useTransaction } from '@/context/TransactionContext';
import { RecordsHeader } from '@/components/Records';
import { EditableRecordsList } from '@/components/Records/EditableRecordsList';
import { type GroupedTransactions, type TransactionRecord } from '@/components/Records/RecordsList';
import { BulkEditModal, type BulkEditValues } from '../../../app/(app)/transactions/_components/BulkEditModal';
import { dispatchAppEvent } from '@/lib/eventBus';
import { logError } from '@/lib/logger';

interface CategoryTransactionsModalProps {
  show: boolean;
  onHide: () => void;
  categoryIds: string[] | null;
  categoryName: string;
  monthType: 'current' | 'previous';
  monthName: string;
  startDate?: string;
  endDate?: string;
  accountIds?: string[];
  selectedLabelIds?: string[];
  excludedLabelIds?: string[];
}

const formatSignedIdr = (net: number): string => {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Math.abs(net));
  return `${net > 0 ? '+' : net < 0 ? '-' : ''}${formatted}`;
};

const CategoryTransactionsModal: React.FC<CategoryTransactionsModalProps> = ({
  show,
  onHide,
  categoryIds,
  categoryName,
  monthName,
  startDate,
  endDate,
  accountIds,
  selectedLabelIds,
  excludedLabelIds,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const { isOpen: isTransactionModalOpen } = useTransaction();

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
      if (accountIds && accountIds.length > 0) filters['account_ids'] = accountIds.join(',');
      if (selectedLabelIds && selectedLabelIds.length > 0) filters['label_ids'] = selectedLabelIds.join(',');
      if (excludedLabelIds && excludedLabelIds.length > 0) filters['exclude_label_ids'] = excludedLabelIds.join(',');

      const result = await transactionService.fetchTransactions(filters);
      setTransactions(result.transactions);
      // A fresh dataset invalidates any previous selection (e.g. after an edit).
      setSelectedTransactionIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [categoryIds, startDate, endDate, accountIds, selectedLabelIds, excludedLabelIds]);

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

  // Selection state shared with RecordsHeader / RecordsList (same pattern as the
  // transactions page). The modal loads a single page, so there is no global
  // "select all matching" flow.
  const selectedCount = selectedTransactionIds.size;
  const allSelected = transactions.length > 0 && selectedCount === transactions.length;

  const totalNet = useMemo(
    () => transactions.reduce((sum, transaction) => sum + transaction.amount, 0),
    [transactions]
  );
  const selectedNetTotal = useMemo(() => {
    if (selectedCount === 0) return totalNet;
    return transactions
      .filter(transaction => selectedTransactionIds.has(transaction.id))
      .reduce((sum, transaction) => sum + transaction.amount, 0);
  }, [transactions, selectedTransactionIds, selectedCount, totalNet]);
  const summaryText = useMemo(
    () => formatSignedIdr(selectedCount > 0 ? selectedNetTotal : totalNet),
    [selectedCount, selectedNetTotal, totalNet]
  );

  const handleToggleRecord = useCallback((recordId: string) => {
    setSelectedTransactionIds(prev => {
      const next = new Set(prev);
      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedTransactionIds(prev =>
      prev.size === transactions.length
        ? new Set()
        : new Set(transactions.map(transaction => transaction.id))
    );
  }, [transactions]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedTransactionIds.size === 0) return;

    const selectionTouchesTransfer = transactions.some(
      transaction => selectedTransactionIds.has(transaction.id) && !!transaction.transfer_id
    );
    const transferNote = selectionTouchesTransfer
      ? ' Deleting a transfer also removes its paired transaction.'
      : '';

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Bulk Delete',
      text: `Are you sure you want to delete ${selectedTransactionIds.size} transaction(s)?${transferNote}`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const res = await transactionService.bulkDeleteTransactions({
        allMatching: false,
        ids: Array.from(selectedTransactionIds),
      });

      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: `Successfully deleted ${res.deletedCount} transaction(s)`,
        timer: 2000,
        showConfirmButton: false,
      });

      // Notify the app; the 'transaction-updated' listener refetches this list.
      dispatchAppEvent('transaction-updated', { transactionId: '' });
    } catch (err) {
      logError('Failed to bulk delete:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: 'Failed to delete transactions',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545',
      });
    }
  }, [selectedTransactionIds, transactions]);

  const handleBulkEditSubmit = useCallback(
    async (values: BulkEditValues) => {
      try {
        const res = await transactionService.bulkUpdateTransactions({
          allMatching: false,
          ids: Array.from(selectedTransactionIds),
          data: values,
        });
        setShowBulkEdit(false);

        const reasons: string[] = [];
        if (res.skipped.transferOrDebt > 0) {
          reasons.push(`${res.skipped.transferOrDebt} transfer/debt`);
        }
        if (res.skipped.categoryTypeMismatch > 0) {
          reasons.push(`${res.skipped.categoryTypeMismatch} with a mismatched category type`);
        }

        await Swal.fire({
          icon: reasons.length > 0 ? 'warning' : 'success',
          title: 'Updated',
          text: reasons.length > 0
            ? `Updated ${res.updatedCount} transaction(s). Skipped ${reasons.join(' and ')}.`
            : `Successfully updated ${res.updatedCount} transaction(s)`,
          ...(reasons.length === 0 && { timer: 2000, showConfirmButton: false }),
        });

        dispatchAppEvent('transaction-updated', { transactionId: '' });
      } catch (err) {
        logError('Failed to bulk edit:', err);
        await Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: 'Failed to update transactions',
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc3545',
        });
        // Rethrow so the modal stays open with the user's input intact
        throw err;
      }
    },
    [selectedTransactionIds]
  );

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
        type: txn.type.toUpperCase() as 'INCOME' | 'EXPENSE' | 'TRANSFER',
        ...(txn.account_id && { account_id: txn.account_id }),
        ...(txn.category_id && { category_id: txn.category_id }),
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
    <>
      <Modal show={show && !isTransactionModalOpen} onHide={onHide} size="xl" fullscreen="md-down" centered backdrop="static" keyboard={false} scrollable>
        <Modal.Header closeButton>
          <Modal.Title>
            {categoryName} - {monthName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0 p-md-3">
          {loading && (
            <div>
              {[0, 1].map((groupIndex) => (
                <div key={groupIndex} className="mb-4">
                  <div className="mb-2">
                    <Placeholder animation="glow">
                      <Placeholder xs={4} className="rounded" style={{ height: 20 }} />
                    </Placeholder>
                  </div>

                  {[0, 1, 2].map((rowIndex) => (
                    <div
                      key={rowIndex}
                      className="d-flex align-items-center gap-3 py-2 border-bottom"
                    >
                      <Placeholder animation="glow">
                        <Placeholder
                          className="rounded-circle"
                          style={{ width: 40, height: 40 }}
                        />
                      </Placeholder>

                      <div className="flex-grow-1">
                        <Placeholder animation="glow">
                          <Placeholder xs={rowIndex % 2 === 0 ? 5 : 4} className="d-block mb-1" />
                        </Placeholder>
                        <Placeholder animation="glow">
                          <Placeholder xs={rowIndex % 2 === 0 ? 3 : 6} size="sm" className="text-muted" />
                        </Placeholder>
                      </div>

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

          {!loading && !error && transactions.length > 0 && (
            <div className="position-sticky" style={{ top: 0, zIndex: 10 }}>
              <RecordsHeader
                selectedCount={selectedCount}
                totalCount={transactions.length}
                allSelected={allSelected}
                onSelectAll={handleSelectAll}
                onBulkEdit={() => setShowBulkEdit(true)}
                onBulkDelete={handleBulkDelete}
                summaryText={summaryText}
              />
            </div>
          )}

          {!loading && !error && (
            <EditableRecordsList
              groupedTransactions={groupedTransactions}
              isModal={true}
              showCheckboxes={transactions.length > 0}
              selectedRecords={selectedTransactionIds}
              onSelectRecord={handleToggleRecord}
            />
          )}
        </Modal.Body>
      </Modal>

      <BulkEditModal
        show={showBulkEdit}
        onHide={() => setShowBulkEdit(false)}
        targetCount={selectedCount}
        isGlobalSelectAll={false}
        onSubmit={handleBulkEditSubmit}
      />
    </>
  );
};

export default CategoryTransactionsModal;
