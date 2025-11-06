import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import analyticsService from '../../../services/analyticsService';
import { TransactionModal } from '../../Transactions/TransactionModal';
import type { TransactionFormValues } from '../../Transactions/TransactionModal';
import { RecordsHeader, RecordsList } from '../../../components/Records';
import type { TransactionRecord, GroupedTransactions } from '../../../types/transaction';

interface CategoryTransactionsModalProps {
  show: boolean;
  onHide: () => void;
  categoryId: string | null;
  categoryName: string;
  monthType: 'current' | 'previous';
  monthName: string;
}

const CategoryTransactionsModal: React.FC<CategoryTransactionsModalProps> = ({
  show,
  onHide,
  categoryId,
  categoryName,
  monthType,
  monthName,
}) => {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionFormValues | null>(null);
  const [hideCategoryModal, setHideCategoryModal] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (show && categoryId) {
      fetchTransactions();
    }
  }, [show, categoryId, monthType]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsService.fetchCategoryTransactions(categoryId!, monthType);
      setTransactions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const groupTransactionsByDate = (transactions: TransactionRecord[]): GroupedTransactions => {
    return transactions.reduce((groups, record) => {
      const dateObj = new Date(record.date);
      const dateKey = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(record);
      return groups;
    }, {} as GroupedTransactions);
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getTotalAmount = (): string => {
    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    return formatCurrency(total);
  };

  const handleSelectRecord = (recordId: string): void => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAllRecords = (): void => {
    if (selectedRecords.size === transactions.length) {
      setSelectedRecords(new Set());
    } else {
      const allIds = new Set(transactions.map((t) => t.id));
      setSelectedRecords(allIds);
    }
  };

  const clearSelection = (): void => {
    setSelectedRecords(new Set());
  };

  const handleBulkEdit = (): void => {
    // TODO: Implement bulk edit functionality
  };

  const handleBulkExport = (): void => {
    // TODO: Implement bulk export functionality
  };

  const handleBulkDelete = (): void => {
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedRecords.size} record(s)?`
      )
    ) {
      // TODO: Implement bulk delete functionality
      setSelectedRecords(new Set());
    }
  };

  const convertToTransactionFormValues = (transaction: TransactionRecord): TransactionFormValues => {
    // Convert 12-hour time format to 24-hour for datetime-local input
    const convertTo24Hour = (time12h: string): string => {
      const match = time12h.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
      if (!match) return '00:00';

      let hours = parseInt(match[1]);
      const minutes = match[2];
      const period = match[3].toUpperCase();

      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    };

    const time24h = convertTo24Hour(transaction.time);
    const dateTime = `${transaction.date}T${time24h}`;

    return {
      type: transaction.type === 'INCOME' ? 'Income' : 'Expense',
      description: transaction.description,
      amount: transaction.amount,
      currency: 'IDR',
      date: transaction.date,
      dateTime: dateTime,
      category: transaction.categoryName,
      categoryId: '',
      account: '', // Will be populated by account ID from API
      accountName: transaction.accountName,
      labels: '',
      notes: '',
      payer: transaction.payer,
      paymentType: 'Cash',
      paymentStatus: 'Cleared',
    };
  };

  const handleEditRecord = (record: TransactionRecord) => {
    const formValues = convertToTransactionFormValues(record);
    setEditingTransaction(formValues);
    setHideCategoryModal(true);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingTransaction(null);
    setHideCategoryModal(false);
  };

  const handleSaveTransaction = async () => {
    // TODO: Implement save logic when backend is ready
    handleCloseEditModal();
    // Optionally refresh the transaction list
    if (categoryId) {
      await fetchTransactions();
    }
  };

  const handleTransactionChange = (event: any) => {
    if (!editingTransaction) return;

    const { name, value } = event.target;
    setEditingTransaction({
      ...editingTransaction,
      [name]: value,
    });
  };

  const groupedTransactions = useMemo(
    () => groupTransactionsByDate(transactions),
    [transactions]
  );

  return (
    <>
    <Modal 
      show={show && !hideCategoryModal} 
      onHide={onHide} 
      scrollable
      dialogClassName="modal-fullscreen-custom"
    >
      <style>{`
        .modal-fullscreen-custom {
          max-width: calc(100vw - 5rem);
          margin: 2.5rem auto;
        }
        .modal-fullscreen-custom .modal-content {
          height: calc(100vh - 5rem);
          display: flex;
          flex-direction: column;
        }
        .modal-fullscreen-custom .modal-body {
          flex: 1;
          overflow-y: auto;
        }
        .account-detail-records__item:hover {
          background-color: #f8f9fa;
          transition: background-color 0.2s ease-in-out;
        }
      `}</style>
      <Modal.Header className="border-0 pb-0">
        <div className="w-100">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div>
              <h2 className="mb-0">Records</h2>
            </div>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={onHide}
            />
          </div>

          {!loading && !error && (
            <RecordsHeader
              selectedCount={selectedRecords.size}
              totalCount={transactions.length}
              allSelected={selectedRecords.size === transactions.length}
              onSelectAll={handleSelectAllRecords}
              onClearSelection={clearSelection}
              onBulkEdit={handleBulkEdit}
              onBulkExport={handleBulkExport}
              onBulkDelete={handleBulkDelete}
              summaryText={`IDR ${getTotalAmount()}`}
              showBulkActions={true}
            />
          )}
        </div>
      </Modal.Header>
      <Modal.Body>
        {loading && (
          <div className="d-flex justify-content-center align-items-center py-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        {!loading && !error && (
          <RecordsList
            groupedTransactions={groupedTransactions}
            selectedRecords={selectedRecords}
            accountName={categoryName}
            onSelectRecord={handleSelectRecord}
            onEditRecord={handleEditRecord}
            formatCurrency={formatCurrency}
            showCheckboxes={true}
            showDropdownMenu={false}
            showPayer={true}
            showType={true}
          />
        )}
      </Modal.Body>
    </Modal>

    {/* Transaction Edit Modal */}
    {editingTransaction && (
      <TransactionModal
        show={showEditModal}
        onHide={handleCloseEditModal}
        transaction={editingTransaction}
        onChange={handleTransactionChange}
        onSave={handleSaveTransaction}
      />
    )}
    </>
  );
};

export default CategoryTransactionsModal;
