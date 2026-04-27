'use client';

import React, { useCallback } from 'react';
import Swal from 'sweetalert2';
import { useTransaction } from '@/context/TransactionContext';
import { transactionService, type Transaction, type CreateTransactionRequest } from '@/services/transactionService';
import { transferService, type CreateTransferRequest } from '@/services/transferService';
import { TransactionModal } from '@/components/transaction';

export const GlobalTransactionModal: React.FC = () => {
  const { isOpen, mode, initialData, closeModal } = useTransaction();

  const handleSave = useCallback(
    async (transactionData: Partial<Transaction>): Promise<void> => {
      try {
        const isTransfer = transactionData.type === 'transfer';

        if (mode === 'edit' && initialData?.id) {
          if (isTransfer) {
            // Get the transfer ID (must use transfer_id, not transaction id)
            const transferId = initialData.transfer_id || initialData.id;

            // Update transfer
            const transferData: Record<string, string | number | undefined> = {
              date: transactionData.date || new Date().toISOString(),
              amount: typeof transactionData.amount === 'number' ? transactionData.amount : parseFloat(String(transactionData.amount || 0)),
              description: transactionData.description || '',
              currency: transactionData.currency || 'USD',
            };

            // Only include accounts if they have valid values
            if (transactionData.account_id) {
              transferData['from_account_id'] = transactionData.account_id;
            }
            if (transactionData.to_account_id) {
              transferData['to_account_id'] = transactionData.to_account_id;
            }

            // Include destination currency if provided
            if (transactionData.to_currency) {
              transferData['to_currency'] = transactionData.to_currency;
            }

            // Include to_amount if:
            // 1. It's a multi-currency transfer (has to_currency), OR
            // 2. to_amount is different from amount (same currency but different value)
            const isMultiCurrency = transactionData.to_currency && transactionData.to_currency !== transactionData.currency;
            const hasDifferentAmount = transactionData.to_amount && transactionData.to_amount !== transactionData.amount;

            if (isMultiCurrency || hasDifferentAmount) {
              const toAmountValue = transactionData.to_amount
                ? (typeof transactionData.to_amount === 'number'
                  ? transactionData.to_amount
                  : parseFloat(transactionData.to_amount as string))
                : transactionData.amount; // Default to source amount if not specified

              // Include to_amount if it's a valid number (including 0)
              if (typeof toAmountValue === 'number' && !isNaN(toAmountValue)) {
                transferData['to_amount'] = toAmountValue;
              }
            }

            await transferService.updateTransfer(transferId, transferData);
          } else {
            // Update regular transaction
            await transactionService.updateTransaction(initialData.id, transactionData);
          }

          // Close modal first
          closeModal();

          // Then show success message
          await Swal.fire({
            icon: 'success',
            title: 'Success',
            text: `${isTransfer ? 'Transfer' : 'Transaction'} updated successfully`,
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
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
              ...(transactionData.to_currency && { to_currency: transactionData.to_currency }), // ✅ Include destination currency
            };
            await transferService.createTransfer(transferData);
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
              ...(transactionData.description && { description: transactionData.description }),
              ...(transactionData.payee && { payee: transactionData.payee }),
              ...(transactionData.payment_method && { payment_method: transactionData.payment_method }),
              ...(transactionData.payment_status && { payment_status: transactionData.payment_status }),
            };

            await transactionService.createTransaction(createData);
          }

          // Close modal first
          closeModal();

          // Then show success message
          await Swal.fire({
            icon: 'success',
            title: 'Success',
            text: `${isTransfer ? 'Transfer' : 'Transaction'} created successfully`,
            timer: 2000,
            showConfirmButton: false,
          });
        }

        // Emit custom event to notify other components
        const eventName = mode === 'edit' ? 'transaction-updated' : 'transaction-created';

        const eventData = { ...transactionData };
        if (mode === 'edit' && initialData?.id) {
          eventData.id = initialData.id;
        }
        window.dispatchEvent(
          new CustomEvent(eventName, {
            detail: { action: mode, data: eventData },
          })
        );
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

      await Swal.fire({
        title: 'Deleting...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });

      if (isTransfer) {
        const transferId = initialData?.transfer_id || initialData?.id || transactionId;
        await transferService.deleteTransfer(transferId);
      } else {
        await transactionService.deleteTransaction(transactionId);
      }

      closeModal();
      Swal.close();

      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `${isTransfer ? 'Transfer' : 'Transaction'} deleted successfully`,
        timer: 2000,
        showConfirmButton: false,
      });

      window.dispatchEvent(
        new CustomEvent('transaction-deleted', {
          detail: { id: transactionId },
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

  return (
    <TransactionModal
      show={isOpen}
      onHide={closeModal}
      onSave={handleSave}
      onDelete={handleDelete}
      transaction={initialData as Transaction | null}
      title={mode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}
    />
  );
};
