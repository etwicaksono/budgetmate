'use client';

import React from 'react';
import Swal from 'sweetalert2';
import { useDebt } from '@/context/DebtContext';
import { debtService, CreateDebtPayload, UpdateDebtPayload, CreateRepaymentPayload } from '@/services/debtService';
import { DebtModal, RepaymentModal, DebtIncreaseModal } from '@/components/debt';
import { useTransactionData } from '@/hooks/useTransactionData';
import { logError } from '@/lib/logger';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export const GlobalDebtModal: React.FC = () => {
  const { 
    isOpen, 
    modalType, 
    initialData, 
    editTransaction, 
    defaultDebtType, 
    closeModal 
  } = useDebt();

  // Load accounts globally for the modal
  const { accounts } = useTransactionData();

  // Handle generic dispatch so panes can refetch
  const dispatchMutated = () => {
    window.dispatchEvent(new CustomEvent('debt-mutated'));
  };

  const handleSaveDebt = async (payload: CreateDebtPayload | UpdateDebtPayload) => {
    try {
      if (initialData?.id && 'id' in initialData) {
        await debtService.updateDebt(initialData.id, payload as UpdateDebtPayload);
        Toast.fire({ icon: 'success', title: 'Debt updated successfully' });
      } else {
        await debtService.createDebt(payload as CreateDebtPayload);
        Toast.fire({ icon: 'success', title: 'Debt created successfully' });
      }
      dispatchMutated();
    } catch (error) {
      logError('Failed to save debt', error);
      throw error; // Rethrow to let the inner modal catch it for error rendering
    }
  };

  const handleSaveRepayment = async (debtId: string, payload: CreateRepaymentPayload) => {
    try {
      if (editTransaction) {
        await debtService.updateRepayment(debtId, editTransaction.id, payload);
        Toast.fire({ icon: 'success', title: 'Repayment updated successfully' });
        window.dispatchEvent(
          new CustomEvent('transaction-updated', {
            detail: { action: 'edit', data: { id: editTransaction.id } },
          })
        );
      } else {
        await debtService.recordRepayment(debtId, payload);
        Toast.fire({ icon: 'success', title: 'Repayment recorded successfully' });
        window.dispatchEvent(new CustomEvent('transaction-created'));
      }
      dispatchMutated();
    } catch (error) {
      logError('Failed to save repayment', error);
      throw error;
    }
  };

  const handleSaveIncrease = async (debtId: string, payload: CreateRepaymentPayload) => {
    try {
      if (editTransaction) {
        await debtService.updateIncrease(debtId, editTransaction.id, payload);
        Toast.fire({ icon: 'success', title: 'Increase updated successfully' });
        window.dispatchEvent(
          new CustomEvent('transaction-updated', {
            detail: { action: 'edit', data: { id: editTransaction.id } },
          })
        );
      } else {
        await debtService.increaseDebt(debtId, payload);
        Toast.fire({ icon: 'success', title: 'Debt increased successfully' });
        window.dispatchEvent(new CustomEvent('transaction-created'));
      }
      dispatchMutated();
    } catch (error) {
      logError('Failed to save increase', error);
      throw error;
    }
  };

  return (
    <>
      <DebtModal
        show={isOpen && modalType === 'debt'}
        onHide={closeModal}
        onSave={handleSaveDebt}
        editDebt={modalType === 'debt' ? initialData : null}
        accounts={accounts}
        defaultType={defaultDebtType}
      />
      
      {initialData && (
        <>
          <RepaymentModal
            show={isOpen && modalType === 'repayment'}
            onHide={closeModal}
            onSave={handleSaveRepayment}
            debt={initialData}
            accounts={accounts}
            editTransaction={modalType === 'repayment' ? editTransaction : null}
          />

          <DebtIncreaseModal
            show={isOpen && modalType === 'increase'}
            onHide={closeModal}
            onSave={handleSaveIncrease}
            debt={initialData}
            accounts={accounts}
            editTransaction={modalType === 'increase' ? editTransaction : null}
          />
        </>
      )}
    </>
  );
};
