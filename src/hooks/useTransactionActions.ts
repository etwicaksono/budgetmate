import { useCallback } from 'react';
import Swal from 'sweetalert2';
import { useTransaction } from '@/context/TransactionContext';
import { useDebt } from '@/context/DebtContext';
import { transactionService, type Transaction } from '@/services/transactionService';
import { debtService } from '@/services/debtService';
import { type TransactionRecord } from '@/components/Records';
import { isTransferTransaction, mapTransferAccounts, getModalTransactionType } from '@/utils/transferUtils';

interface UseTransactionActionsOptions {
  transactions: Transaction[];
  onTransactionMutated: () => void;
}

export function useTransactionActions({ transactions, onTransactionMutated }: UseTransactionActionsOptions) {
  const { openEditModal } = useTransaction();
  const { openIncreaseModal, openRepaymentModal } = useDebt();

  const handleEditRecord = useCallback(async (record: TransactionRecord) => {
    const transaction = transactions.find((t) => t.id === record.id);
    if (!transaction) return;

    // Debt Modal Intercept Logic
    if (transaction.type === 'debt_in' || transaction.type === 'debt_out') {
      if (transaction.debt_id) {
        try {
          const debtDoc = await debtService.getDebtById(transaction.debt_id);
          
          if (debtDoc.type === 'lend') {
            if (transaction.type === 'debt_out') {
              openIncreaseModal(debtDoc, transaction);
            } else {
              openRepaymentModal(debtDoc, transaction);
            }
          } else if (debtDoc.type === 'borrow') {
            if (transaction.type === 'debt_in') {
              openIncreaseModal(debtDoc, transaction);
            } else {
              openRepaymentModal(debtDoc, transaction);
            }
          }
          return; // Skip opening the standard transaction modal
        } catch (error) {
          console.error("Failed to load debt for this transaction", error);
          // Fallback to standard edit if debt load fails
        }
      }
    }

    // Extract label IDs
    const labelIds = transaction.labels?.map(label => label.id).filter((id): id is string => !!id) || [];

    const isTransfer = isTransferTransaction(transaction);
    const modalType = getModalTransactionType(transaction);
    const { fromAccountId, toAccountId } = mapTransferAccounts(transaction);

    const sourceAmount = Math.abs(transaction.amount);
    const sourceCurrency = transaction.type === 'transfer_in'
      ? transaction.transfer_currency || transaction.currency
      : transaction.currency;
    const destAmount = transaction.to_amount ? Math.abs(transaction.to_amount) : Math.abs(transaction.amount);
    const destCurrency = transaction.to_currency || transaction.currency;

    const modalData = {
      id: transaction.id,
      date: transaction.date,
      account_id: fromAccountId,
      category_id: transaction.category_id || '',
      amount: transaction.type === 'transfer_in' ? destAmount : sourceAmount,
      type: modalType,
      description: transaction.description || '',
      payee: transaction.payee || '',
      payment_method: transaction.payment_method || 'Cash',
      label_ids: labelIds,
      ...(isTransfer && {
        transfer_id: transaction.transfer_id,
        to_account_id: toAccountId,
        to_amount: transaction.type === 'transfer_in' ? sourceAmount : destAmount,
        to_currency: destCurrency,
        currency: sourceCurrency,
      }),
    };

    openEditModal(modalData);
  }, [transactions, openEditModal, openIncreaseModal, openRepaymentModal]);

  const handleDeleteRecord = useCallback(async (recordId: string) => {
    const transaction = transactions.find((t) => t.id === recordId);
    if (!transaction) return;

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Transaction',
      html: `
        <p>Are you sure you want to delete this transaction?</p>
        <div class="text-start mt-3">
          <strong>${transaction.description || 'No description'}</strong><br>
          <small class="text-muted">${transaction.currency || 'USD'} ${Math.abs(transaction.amount).toLocaleString()}</small>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      await transactionService.deleteTransaction(recordId);
      await Swal.fire({
        icon: 'success',
        title: 'Deleted',
        text: 'Transaction deleted successfully',
        timer: 2000,
        showConfirmButton: false
      });
      onTransactionMutated();
    } catch (error) {
      console.error('Failed to delete transaction:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: 'Failed to delete transaction',
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc3545'
      });
    }
  }, [transactions, onTransactionMutated]);

  return { handleEditRecord, handleDeleteRecord };
}
