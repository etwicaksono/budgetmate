'use client';

import React, { useCallback } from 'react';
import { RecordsList, type GroupedTransactions, type TransactionRecord } from './RecordsList';
import { useTransaction, type TransactionFormData } from '@/context/TransactionContext';

interface EditableRecordsListProps {
  groupedTransactions: GroupedTransactions;
  selectedRecords?: Set<string>;
  onSelectRecord?: (recordId: string) => void;
  onDeleteRecord?: (recordId: string) => void;
  showCheckboxes?: boolean;
  showDropdownMenu?: boolean;
  isModal?: boolean;
}

export const EditableRecordsList: React.FC<EditableRecordsListProps> = ({
  groupedTransactions,
  selectedRecords = new Set(),
  onSelectRecord = () => {},
  onDeleteRecord,
  showCheckboxes = false,
  showDropdownMenu = false,
  isModal = false,
}) => {
  const { openEditModal } = useTransaction();

  const handleEditRecord = useCallback((record: TransactionRecord) => {
    // Convert TransactionRecord to TransactionFormData for the global modal.
    // account_id and category_id are forwarded from the source mapping (e.g. CategoryTransactionsModal)
    // so the edit modal can pre-fill the account and category selects.
    const transactionData: TransactionFormData = {
      id: record.id,
      type: record.type.toLowerCase() as 'income' | 'expense' | 'transfer',
      amount: record.amount,
      date: record.date,
      account_id: record.account_id || '',
      category_id: record.category_id || '',
      ...(record.description && { description: record.description }),
      ...(record.payer && { payee: record.payer }),
    };
    openEditModal(transactionData);
  }, [openEditModal]);

  return (
    <RecordsList
      groupedTransactions={groupedTransactions}
      selectedRecords={selectedRecords}
      onSelectRecord={onSelectRecord}
      onEditRecord={handleEditRecord}
      showCheckboxes={showCheckboxes}
      showDropdownMenu={showDropdownMenu}
      isModal={isModal}
      {...(onDeleteRecord && { onDeleteRecord })}
    />
  );
};
