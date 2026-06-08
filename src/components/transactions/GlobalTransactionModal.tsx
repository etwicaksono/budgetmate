'use client';

import React, { useCallback } from 'react';
import Swal from 'sweetalert2';
import { useTransaction } from '@/context/TransactionContext';
import { transactionService, type Transaction, type CreateTransactionRequest } from '@/services/transactionService';
import { transferService, type CreateTransferRequest } from '@/services/transferService';
import { TransactionModal } from '@/components/transaction';

export const GlobalTransactionModal: React.FC = () => {
  const { isOpen, mode, initialData, closeModal, openAddModal } = useTransaction();

  const handleSave = useCallback(
    async (transactionData: Partial<Transaction>): Promise<void> => {
      try {
        let resultData;
        const isTransfer = transactionData.type === 'transfer';

        if (mode === 'edit' && initialData?.id) {
          // Optimistic update: instantly close modal and dispatch event
          const eventData = { ...initialData, ...transactionData, id: initialData.id };
          window.dispatchEvent(
            new CustomEvent('transaction-updated', {
              detail: { action: 'edit', data: eventData },
            })
          );
          
          closeModal();
          
          Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
          }).fire({
            icon: 'success',
            title: `${isTransfer ? 'Transfer' : 'Transaction'} updated`
          });

          // Background API Call
          if (isTransfer) {
            const transferId = initialData.transfer_id || initialData.id;
            const transferData: Record<string, string | number | undefined> = {
              date: transactionData.date || new Date().toISOString(),
              amount: typeof transactionData.amount === 'number' ? transactionData.amount : parseFloat(String(transactionData.amount || 0)),
              description: transactionData.description || '',
              currency: transactionData.currency || 'USD',
            };

            if (transactionData.account_id) transferData['from_account_id'] = transactionData.account_id;
            if (transactionData.to_account_id) transferData['to_account_id'] = transactionData.to_account_id;
            if (transactionData.to_currency) transferData['to_currency'] = transactionData.to_currency;

            const isMultiCurrency = transactionData.to_currency && transactionData.to_currency !== transactionData.currency;
            const hasDifferentAmount = transactionData.to_amount && transactionData.to_amount !== transactionData.amount;
            if (isMultiCurrency || hasDifferentAmount) {
              const toAmountValue = transactionData.to_amount ? (typeof transactionData.to_amount === 'number' ? transactionData.to_amount : parseFloat(transactionData.to_amount as string)) : transactionData.amount;
              if (typeof toAmountValue === 'number' && !isNaN(toAmountValue)) transferData['to_amount'] = toAmountValue;
            }
            
            const handleError = (error: unknown) => {
              console.error('Background update failed:', error);
              // Revert optimistic update
              window.dispatchEvent(
                new CustomEvent('transaction-updated', {
                  detail: { action: 'edit', data: initialData },
                })
              );
              Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: 'Failed to save changes to the server. Your data has been reverted.',
              });
            };

            transferService.updateTransfer(transferId, transferData).catch(handleError);
          } else {
            const handleError = (error: unknown) => {
              console.error('Background update failed:', error);
              window.dispatchEvent(
                new CustomEvent('transaction-updated', {
                  detail: { action: 'edit', data: initialData },
                })
              );
              Swal.fire({
                icon: 'error',
                title: 'Update Failed',
                text: 'Failed to save changes to the server. Your data has been reverted.',
              });
            };
            transactionService.updateTransaction(initialData.id, transactionData).catch(handleError);
          }
          return; // Exit early since we handled edit optimistically
        } else {
          // Create mode (still awaits API to get the real ID and populated relations)
          if (isTransfer) {
            // Create transfer
            const transferData: CreateTransferRequest = {
              date: transactionData.date || new Date().toISOString(),
              from_account_id: transactionData.account_id || '',
              to_account_id: transactionData.to_account_id || '',
              amount: typeof transactionData.amount === 'number' ? transactionData.amount : parseFloat(String(transactionData.amount || 0)),
              to_amount: transactionData.to_amount ? (typeof transactionData.to_amount === 'number' ? transactionData.to_amount : parseFloat(transactionData.to_amount as string)) : 0,
              description: transactionData.description || '',
              currency: transactionData.currency || 'USD',
              ...(transactionData.to_currency && { to_currency: transactionData.to_currency }),
            };
            resultData = await transferService.createTransfer(transferData);
          } else {
            // Create regular transaction
            const createData: CreateTransactionRequest = {
              date: transactionData.date || new Date().toISOString(),
              account_id: transactionData.account_id || '',
              amount: transactionData.amount || 0,
              type: (transactionData.type as 'income' | 'expense' | 'transfer' | 'transfer_in' | 'transfer_out') || 'expense',
              ...(transactionData.category_id && { category_id: transactionData.category_id }),
              ...(transactionData.currency && { currency: transactionData.currency }),
              ...(transactionData.label_ids && { label_ids: transactionData.label_ids }),
              ...(transactionData.is_draft !== undefined && { is_draft: transactionData.is_draft }),
              ...(transactionData.description && { description: transactionData.description }),
              ...(transactionData.payee && { payee: transactionData.payee }),
              ...(transactionData.payment_method && { payment_method: transactionData.payment_method }),
              ...(transactionData.payment_status && { payment_status: transactionData.payment_status }),
            };

            resultData = await transactionService.createTransaction(createData);
          }

          // Close modal after create finishes
          closeModal();

          const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
          });

          Toast.fire({
            icon: 'success',
            title: `${isTransfer ? 'Transfer' : 'Transaction'} created`
          });

          // Dispatch event with populated resultData
          window.dispatchEvent(
            new CustomEvent('transaction-updated', {
              detail: { action: 'add', data: resultData },
            })
          );
        }
      } catch (err: unknown) {
        console.error('Failed to save:', err);
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to save',
        });
        throw err;
      }
    },
    [mode, initialData, closeModal]
  );

  const handleDelete = useCallback(async (transactionId: string) => {
    try {
      const isTransfer = initialData?.type === 'transfer';
      const { isConfirmed } = await Swal.fire({
        title: `Delete ${isTransfer ? 'Transfer' : 'Transaction'}?`,
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#dc3545',
        focusCancel: true,
      });

      if (!isConfirmed) return;

      closeModal();
      Swal.close();

      // Background delete
      if (isTransfer) {
        const transferId = initialData?.transfer_id || initialData?.id || transactionId;
        transferService.deleteTransfer(transferId).catch(error => {
          console.error('Failed to delete transfer in background:', error);
        });
      } else {
        transactionService.deleteTransaction(transactionId).catch(error => {
          console.error('Failed to delete transaction in background:', error);
        });
      }

      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      Toast.fire({
        icon: 'success',
        title: `${isTransfer ? 'Transfer' : 'Transaction'} deleted`
      });

      window.dispatchEvent(
        new CustomEvent('transaction-updated', {
          detail: { action: 'delete', data: { id: transactionId } },
        })
      );
    } catch (err: unknown) {
      console.error('Failed to delete:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete',
      });
    }
  }, [initialData, closeModal]);

  const handleCloneAsDraft = useCallback((transaction: Transaction) => {
    closeModal();
    const labelIds = transaction.labels?.map(label => label.id).filter((id): id is string => !!id) || [];
    
    setTimeout(() => {
      openAddModal({
        date: new Date().toISOString(), // Use current date for clone
        account_id: transaction.account_id,
        category_id: transaction.category_id || '',
        amount: Math.abs(transaction.amount),
        type: transaction.type === 'income' ? 'income' : 'expense',
        description: transaction.description || '',
        payee: transaction.payee || '',
        payment_method: transaction.payment_method || 'Cash',
        label_ids: labelIds,
        is_draft: true,
      });
    }, 350); // wait for modal animation
  }, [closeModal, openAddModal]);

  const handleConfirmDraft = useCallback(async (transaction: Transaction) => {
    try {
      await transactionService.updateTransaction(transaction.id, { is_draft: false });
      closeModal();
      
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
      });

      Toast.fire({
        icon: 'success',
        title: 'Transaction Confirmed'
      });

      window.dispatchEvent(
        new CustomEvent('transaction-updated', {
          detail: { action: 'edit', data: { ...transaction, is_draft: false } },
        })
      );
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to confirm draft',
      });
    }
  }, [closeModal]);

  return (
    <TransactionModal
      show={isOpen}
      onHide={closeModal}
      onSave={handleSave}
      onDelete={handleDelete}
      onCloneAsDraft={handleCloneAsDraft}
      onConfirmDraft={handleConfirmDraft}
      transaction={initialData as Transaction | null}
      title={mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}
    />
  );
};
