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
}

export function useTransactionActions({ transactions }: UseTransactionActionsOptions) {
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

    if (result.isConfirmed) {
      // Find paired transfer transaction so the UI can remove both halves
      const isTransfer = isTransferTransaction(transaction);
      const pairedTransaction = isTransfer && transaction.transfer_id
        ? transactions.find(t => t.transfer_id === transaction.transfer_id && t.id !== recordId)
        : null;

      // Background delete
      transactionService.deleteTransaction(recordId).catch(error => {
        console.error('Failed to delete transaction in background:', error);
        
        // Revert optimistic update
        const deletedTransaction = transactions.find((t) => t.id === recordId);
        if (deletedTransaction) {
          window.dispatchEvent(
            new CustomEvent('transaction-updated', {
              detail: { action: 'add', data: deletedTransaction },
            })
          );
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Delete Failed',
          text: 'Failed to delete transaction on the server. Your data has been restored.',
        });
      });

      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      Toast.fire({
        icon: 'success',
        title: 'Transaction deleted'
      });

      window.dispatchEvent(
        new CustomEvent('transaction-updated', {
          detail: {
            action: 'delete',
            data: {
              id: recordId,
              ...(pairedTransaction && { pairedId: pairedTransaction.id }),
            },
          },
        })
      );
    }
  }, [transactions]);

  const handleCloneAsDraft = useCallback(async (record: TransactionRecord) => {
    const transaction = transactions.find((t) => t.id === record.id);
    if (!transaction) return;

    const labelIds = transaction.labels?.map(label => label.id).filter((id): id is string => !!id) || [];
    const modalType = getModalTransactionType(transaction);

    // Open add modal prefilled with cloned data, and flag as draft
    openEditModal({
      // no id -> Create Mode
      date: new Date().toISOString(), // Use current date for clone
      account_id: transaction.account_id,
      category_id: transaction.category_id || '',
      amount: Math.abs(transaction.amount),
      type: modalType,
      description: transaction.description || '',
      payee: transaction.payee || '',
      payment_method: transaction.payment_method || 'Cash',
      label_ids: labelIds,
      is_draft: true // Preselect "Save as Draft" if implemented in modal, or use as indicator
    });
  }, [transactions, openEditModal]);

  const handleConfirmDraft = useCallback(async (record: TransactionRecord) => {
    const transaction = transactions.find((t) => t.id === record.id);
    if (!transaction) return;

    // Confirm Draft via background process: update transaction.is_draft to false
    try {
      // Create a toast for background processing
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      const optimisticData = { ...transaction, is_draft: false };
      
      window.dispatchEvent(
        new CustomEvent('transaction-updated', {
          detail: { action: 'edit', data: optimisticData },
        })
      );
      
      Toast.fire({
        icon: 'success',
        title: 'Transaction Confirmed'
      });

      // Update API in background
      transactionService.updateTransaction(transaction.id, {
        is_draft: false
      }).catch(error => {
        console.error('Failed to confirm draft in background:', error);
        
        // Revert optimistic update
        window.dispatchEvent(
          new CustomEvent('transaction-updated', {
            detail: { action: 'edit', data: transaction },
          })
        );
        
        Swal.fire({
          icon: 'error',
          title: 'Confirmation Failed',
          text: 'Failed to confirm draft on the server. Your data has been reverted.',
        });
      });
    } catch (error) {
      console.error('Failed to confirm draft:', error);
      Swal.fire({
        icon: 'error',
        title: 'Confirmation Failed',
        text: 'Failed to confirm draft transaction',
        confirmButtonColor: '#dc3545'
      });
    }
  }, [transactions]);

  return { handleEditRecord, handleDeleteRecord, handleCloneAsDraft, handleConfirmDraft };
}
