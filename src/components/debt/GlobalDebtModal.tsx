'use client';

import React, { useEffect, useRef } from 'react';
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
    closeModal,
    isDetailOpen,
    closeDetailModal
  } = useDebt();

  // -- Mobile back button handling -------------------------------------------
  // Keep one history entry per open modal layer (global modal + detail modal)
  // so the device back button closes one layer at a time instead of leaving
  // the page. Debt modals are excluded from ModalBackCloseManager (via the
  // `debt-back-managed` class) because layer state lives in React, not the DOM.
  const layerCountRef = useRef(0);      // history entries currently pushed
  const pendingCleanupRef = useRef(0);  // popstate events to skip (own back() calls)
  const isOpenRef = useRef(isOpen);
  const isDetailOpenRef = useRef(isDetailOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    isDetailOpenRef.current = isDetailOpen;
  }, [isDetailOpen]);

  useEffect(() => {
    const isMobile = window.matchMedia('(max-width: 991.98px)').matches;
    const layerCount = (isOpen ? 1 : 0) + (isDetailOpen ? 1 : 0);

    if (!isMobile) {
      // Viewport left mobile size while entries are still pushed: consume them.
      if (layerCountRef.current > 0) {
        pendingCleanupRef.current += layerCountRef.current;
        layerCountRef.current = 0;
        window.history.back();
      }
      return;
    }

    if (layerCount > layerCountRef.current) {
      // Modal layer(s) opened: push one entry per new layer.
      for (let i = layerCountRef.current; i < layerCount; i++) {
        window.history.pushState(
          { ...window.history.state, debtModalLayer: true },
          '',
          window.location.href
        );
      }
      layerCountRef.current = layerCount;
    } else if (layerCount < layerCountRef.current) {
      // Modal layer(s) closed through the UI: consume the stale entries so the
      // next back press navigates normally instead of doing nothing.
      pendingCleanupRef.current += layerCountRef.current - layerCount;
      layerCountRef.current = layerCount;
      window.history.back();
    }
  }, [isOpen, isDetailOpen]);

  useEffect(() => {
    const handlePopState = () => {
      // Skip popstate events triggered by our own cleanup back() calls and
      // chain the next one when several entries must be consumed.
      if (pendingCleanupRef.current > 0) {
        pendingCleanupRef.current--;
        if (pendingCleanupRef.current > 0) window.history.back();
        return;
      }

      if (layerCountRef.current === 0) return;
      layerCountRef.current--;

      // Close the top layer: the global modal sits above the detail modal.
      // Refs are updated eagerly so rapid consecutive back presses peel one
      // layer at a time.
      if (isOpenRef.current) {
        isOpenRef.current = false;
        closeModal();
      } else if (isDetailOpenRef.current) {
        isDetailOpenRef.current = false;
        closeDetailModal();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [closeModal, closeDetailModal]);

  // Load accounts and labels globally for the modal
  const { accounts, labels } = useTransactionData();

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
        // Include the edited fields so the list updates optimistically. The
        // payload amount is positive; the page listener re-applies the correct
        // sign based on the row's directional type (debt_in/debt_out).
        window.dispatchEvent(
          new CustomEvent('transaction-updated', {
            detail: {
              action: 'edit',
              data: {
                id: editTransaction.id,
                amount: payload.amount,
                date: payload.date,
                account_id: payload.account_id,
                ...(payload.description !== undefined && { description: payload.description }),
              },
            },
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
        // Include the edited fields so the list updates optimistically. The
        // payload amount is positive; the page listener re-applies the correct
        // sign based on the row's directional type (debt_in/debt_out).
        window.dispatchEvent(
          new CustomEvent('transaction-updated', {
            detail: {
              action: 'edit',
              data: {
                id: editTransaction.id,
                amount: payload.amount,
                date: payload.date,
                account_id: payload.account_id,
                ...(payload.description !== undefined && { description: payload.description }),
              },
            },
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
        labels={labels}
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
