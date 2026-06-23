'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { TransactionForm } from './TransactionForm';
import { useTransactionForm } from '@/hooks/useTransactionForm';
import { useTransactionData } from '@/hooks/useTransactionData';
import type { Transaction } from '@/services/transactionService';

export interface TransactionModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (transaction: Partial<Transaction>) => Promise<void>;
  transaction?: Transaction | null;
  title?: string;
  onDelete?: (transactionId: string) => void;
  onCloneAsDraft?: (transaction: Transaction) => void;
  onConfirmDraft?: (transaction: Transaction) => void;
}

export function TransactionModal({
  show,
  onHide,
  onSave,
  transaction = null,
  title,
  onDelete,
  onCloneAsDraft,
  onConfirmDraft,
}: TransactionModalProps): React.JSX.Element {
  const { formData, errors, updateField, validateForm, resetForm, initializeFromTransaction } =
    useTransactionForm();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    accounts,
    labels,
    isLoading,
    refresh: refreshData,
  } = useTransactionData();


  // Refresh data when modal opens (to get newly created accounts/categories)
  useEffect(() => {
    if (show) {
      refreshData();
    }
  }, [show, refreshData]);

  const isEditMode = !!transaction?.id;
  const modalTitle = title || (isEditMode ? 'Edit Transaction' : 'Add Transaction');

  // Initialize form when modal opens or transaction changes
  useEffect(() => {
    if (show) {
      initializeFromTransaction(transaction);
    } else {
      resetForm();
    }
  }, [show, transaction, initializeFromTransaction, resetForm]);

  const handleSave = useCallback(
    async (createAnother: boolean = false, isDraftOverride?: boolean) => {
      if (!validateForm()) {
        return;
      }

      // Convert datetime-local to ISO string with seconds
      const formatDateForAPI = (dateStr: string): string => {
        if (!dateStr) return new Date().toISOString();

        // datetime-local format: "2025-11-20T18:59"
        // Add seconds if missing
        const dateWithSeconds = dateStr.includes(':') && dateStr.split(':').length === 2
          ? `${dateStr}:00`
          : dateStr;

        // Convert to ISO string
        const date = new Date(dateWithSeconds);
        return date.toISOString();
      };

      // Get currency from selected account(s)
      const fromAccount = accounts.find(a => a.id === formData.account_id);
      const toAccount = accounts.find(a => a.id === formData.to_account_id);
      const accountCurrency = fromAccount?.currency || 'USD';

      // Build transaction data based on mode (create vs update)
      const transactionData: Partial<Transaction> = isEditMode
        ? {
          // Update: Only send allowed fields
          type: formData.type,
          amount: parseFloat(formData.amount),
          date: formatDateForAPI(formData.date),
          account_id: formData.account_id,
          ...(formData.type !== 'transfer' && formData.category_id && { category_id: formData.category_id }),
          ...(formData.description !== undefined && { description: formData.description }),
          ...(formData.payee !== undefined && { payee: formData.payee }),
          ...(formData.payment_method !== undefined && { payment_method: formData.payment_method }),
          ...(formData.payment_status !== undefined && { payment_status: formData.payment_status }),
          label_ids: formData.label_ids,
          // Include currency if account changed (so API can update it)
          ...(formData.account_id && { currency: accountCurrency }),
          // ✅ Include transfer-specific fields for updates
          ...(formData.type === 'transfer' && formData.to_account_id && {
            to_account_id: formData.to_account_id,
          }),
          ...(formData.type === 'transfer' && formData.to_amount && {
            to_amount: parseFloat(formData.to_amount)
          }),
          ...(formData.type === 'transfer' && toAccount?.currency && {
            to_currency: toAccount.currency
          }),
        }
        : {
          type: formData.type,
          amount: parseFloat(formData.amount),
          date: formatDateForAPI(formData.date),
          account_id: formData.account_id,
          ...(formData.type !== 'transfer' && formData.category_id && { category_id: formData.category_id }),
          currency: accountCurrency, // ✅ Use account currency instead of hardcoded 'USD'
          label_ids: formData.label_ids,
          ...(isDraftOverride !== undefined ? { is_draft: isDraftOverride } : { is_draft: formData.is_draft }),
          ...(formData.description && { description: formData.description }),
          ...(formData.payee && { payee: formData.payee }),
          ...(formData.payment_method && { payment_method: formData.payment_method }),
          ...(formData.payment_status && { payment_status: formData.payment_status }),
          // Transfer-specific fields with currency handling
          ...(formData.type === 'transfer' && formData.to_account_id && {
            to_account_id: formData.to_account_id,
            ...(toAccount?.currency && { to_currency: toAccount.currency }), // ✅ Only send if we have destination currency
          }),
          ...(formData.type === 'transfer' && formData.to_amount && {
            to_amount: parseFloat(formData.to_amount)
          }),
        };

      try {
        setIsSubmitting(true);
        await onSave(transactionData);
        setSubmitError(null);
        if (createAnother) {
          resetForm();
        } else {
          onHide();
        }
      } catch (err: unknown) {
        type ApiErr = { response?: { data?: { error?: { message?: string }, message?: string } } };
        const axiosErr = err as ApiErr;
        const apiError = err instanceof Error ? axiosErr.response?.data?.error?.message || axiosErr.response?.data?.message || err.message : String(err);
        setSubmitError(apiError || 'Failed to save transaction');
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validateForm, onSave, onHide, resetForm, isEditMode, accounts]
  );


  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{modalTitle}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {submitError && <div className="alert alert-danger py-2">{submitError}</div>}
        <TransactionForm
          formData={formData}
          updateField={updateField}
          errors={errors}
          accounts={accounts}
          labels={labels}
          isLoading={isLoading}
        />
      </Modal.Body>

      <Modal.Footer className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2">
          {isEditMode && onDelete && (
            <Button
              variant="outline-danger"
              onClick={() => transaction?.id && onDelete(transaction.id)}
              disabled={isSubmitting}
              className="order-4 order-md-1"
            >
              Delete
            </Button>
          )}

          {isEditMode && transaction?.is_draft ? (
            onConfirmDraft && (
              <Button
                variant="success"
                onClick={() => onConfirmDraft(transaction)}
                disabled={isSubmitting}
                title="Confirm Transaction"
                className="order-3 order-md-2"
              >
                Confirm
              </Button>
            )
          ) : (
            isEditMode && onCloneAsDraft && formData.type !== 'transfer' && (
              <Button
                variant="outline-secondary"
                onClick={() => onCloneAsDraft(transaction!)}
                disabled={isSubmitting}
                title="Clone as Draft"
                className="order-3 order-md-2"
              >
                Clone as Draft
              </Button>
            )
          )}

          <Button variant="primary" onClick={() => handleSave(false, false)} disabled={isSubmitting} className="order-1 order-md-3 flex-grow-1">
            {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : (isEditMode ? 'Save Changes' : 'Add Transaction')}
          </Button>

          {!isEditMode && formData.type !== 'transfer' && (
            <Button
              variant="outline-warning"
              onClick={() => handleSave(false, true)}
              disabled={isSubmitting}
              className="order-2 order-md-4 flex-grow-1"
            >
              {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : 'Save as Draft'}
            </Button>
          )}

          {!isEditMode && (
            <Button
              variant="outline-primary"
              onClick={() => handleSave(true, false)}
              disabled={isSubmitting}
              className="order-3 order-md-5 flex-grow-1"
            >
              {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : 'Add & Create Another'}
            </Button>
          )}

          <Button variant="outline-secondary" onClick={onHide} disabled={isSubmitting} className="order-5 order-md-6">
            Cancel
          </Button>
      </Modal.Footer>
    </Modal>
  );
}
