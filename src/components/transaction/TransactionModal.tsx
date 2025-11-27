'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { Modal, Form, Button, Row, Col } from 'react-bootstrap';
import { FaArrowRight } from 'react-icons/fa';
import { AccountSelect } from './AccountSelect';
import { TransactionCategorySelect } from './TransactionCategorySelect';
import { TransactionTypeToggle } from './TransactionTypeToggle';
import { AmountInput } from './AmountInput';
import { LabelMultiSelect } from './LabelMultiSelect';
import { useTransactionForm } from '@/hooks/useTransactionForm';
import { useTransactionData } from '@/hooks/useTransactionData';
import type { Transaction } from '@/services/transactionService';

export interface TransactionModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (transaction: Partial<Transaction>) => Promise<void>;
  transaction?: Transaction | null;
  title?: string;
}

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Digital Wallet'];
const PAYMENT_STATUSES = ['Cleared', 'Pending', 'Scheduled'];

export function TransactionModal({
  show,
  onHide,
  onSave,
  transaction = null,
  title,
}: TransactionModalProps): React.JSX.Element {
  const { formData, errors, updateField, validateForm, resetForm, initializeFromTransaction } =
    useTransactionForm();

  const {
    categories,
    accounts,
    labels,
    isLoading,
    refresh: refreshData,
  } = useTransactionData();

  const dateInputRef = useRef<HTMLInputElement>(null);

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
    async (createAnother: boolean = false) => {
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
            // Create: Include additional fields
            personal_id: transaction?.personal_id || 0,
            type: formData.type,
            amount: parseFloat(formData.amount),
            date: formatDateForAPI(formData.date),
            account_id: formData.account_id,
            ...(formData.type !== 'transfer' && formData.category_id && { category_id: formData.category_id }),
            currency: accountCurrency, // ✅ Use account currency instead of hardcoded 'USD'
            label_ids: formData.label_ids,
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
        await onSave(transactionData);

        if (createAnother) {
          resetForm();
        } else {
          onHide();
        }
      } catch (error) {
        console.error('Failed to save transaction:', error);
      }
    },
    [formData, transaction, validateForm, onSave, onHide, resetForm, isEditMode, accounts]
  );

  const handleAccountSelectSimple = useCallback(
    (accountId: string | null) => {
      updateField('account_id', accountId || '');
    },
    [updateField]
  );

  const handleToAccountSelectSimple = useCallback(
    (accountId: string | null) => {
      updateField('to_account_id', accountId || '');
    },
    [updateField]
  );

  const handleCategorySelect = useCallback(
    (categoryId: string | null) => {
      updateField('category_id', categoryId || '');
    },
    [updateField]
  );

  const handleLabelChange = useCallback(
    (labelIds: string[]) => {
      updateField('label_ids', labelIds);
    },
    [updateField]
  );

  const handleDateClick = useCallback(() => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker?.();
      } catch {
        // showPicker() not supported or blocked, ignore
      }
    }
  }, []);

  const handleTransferAmountChange = useCallback(
    (value: string) => {
      const fromAccount = accounts.find(a => a.id === formData.account_id);
      const toAccount = accounts.find(a => a.id === formData.to_account_id);
      
      // Only sync amounts if same currency
      if (fromAccount?.currency === toAccount?.currency) {
        // Same currency: keep amounts in sync
        updateField('amount', value);
        updateField('to_amount', value);
      } else {
        // Multi-currency: update only source amount
        // User can manually set different destination amount
        updateField('amount', value);
      }
    },
    [updateField, formData.account_id, formData.to_account_id, accounts]
  );

  const filteredCategories = categories.filter((cat) => cat.type === formData.type || cat.type === 'both');
  const isTransfer = formData.type === 'transfer';
  
  // Get selected accounts for currency display
  const selectedAccount = accounts.find(a => a.id === formData.account_id);
  const selectedToAccount = accounts.find(a => a.id === formData.to_account_id);
  const isMultiCurrencyTransfer = isTransfer && selectedAccount?.currency !== selectedToAccount?.currency;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>{modalTitle}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          {/* Transaction Type - Full Width */}
          <Form.Group className="mb-3">
            <TransactionTypeToggle
              value={formData.type}
              onChange={(type) => updateField('type', type)}
            />
          </Form.Group>

          {/* Transfer: From/To Accounts and Amounts - Full Width */}
          {isTransfer ? (
            <>
              <Form.Group className="mb-3">
                <Row className="g-3 align-items-center">
                  <Col xs={12} md={5}>
                    <Form.Label>From Account <span className="text-danger">*</span></Form.Label>
                    <AccountSelect
                      selectedAccountId={formData.account_id}
                      onSelect={handleAccountSelectSimple}
                      accounts={accounts}
                      placeholder="Select account"
                      disabled={isLoading}
                      excludeId={formData.to_account_id}
                    />
                    {errors['account'] && (
                      <div className="invalid-feedback" style={{ display: 'block' }}>
                        {errors['account']}
                      </div>
                    )}
                  </Col>
                  <Col xs={12} md={2} className="d-flex justify-content-center align-items-end" style={{ paddingBottom: errors['account'] ? '1.5rem' : '0.375rem' }}>
                    <FaArrowRight size={24} className="text-primary" />
                  </Col>
                  <Col xs={12} md={5}>
                    <Form.Label>To Account <span className="text-danger">*</span></Form.Label>
                    <AccountSelect
                      selectedAccountId={formData.to_account_id}
                      onSelect={handleToAccountSelectSimple}
                      accounts={accounts}
                      placeholder="Select account"
                      disabled={isLoading}
                      excludeId={formData.account_id}
                    />
                    {errors['toAccount'] && (
                      <div className="invalid-feedback" style={{ display: 'block' }}>
                        {errors['toAccount']}
                      </div>
                    )}
                  </Col>
                </Row>
              </Form.Group>

              <Form.Group className="mb-3">
                <Row className="g-3 align-items-center">
                  <Col xs={12} md={5}>
                    <Form.Label>
                      Amount <span className="text-danger">*</span>
                      {selectedAccount && (
                        <span className="text-muted ms-2" style={{ fontWeight: 'normal', fontSize: '0.9em' }}>
                          ({selectedAccount.currency})
                        </span>
                      )}
                    </Form.Label>
                    <AmountInput
                      value={formData.amount}
                      onChange={handleTransferAmountChange}
                      type="expense"
                      isInvalid={!!errors['amount']}
                    />
                  </Col>
                  <Col xs={12} md={2} className="d-flex justify-content-center align-items-end" style={{ paddingBottom: errors['amount'] ? '1.5rem' : '0.375rem' }}>
                    <FaArrowRight size={24} className="text-primary" />
                  </Col>
                  <Col xs={12} md={5}>
                    <Form.Label>
                      Amount Received
                      {selectedToAccount && (
                        <span className="text-muted ms-2" style={{ fontWeight: 'normal', fontSize: '0.9em' }}>
                          ({selectedToAccount.currency})
                        </span>
                      )}
                      {isMultiCurrencyTransfer && (
                        <span className="badge bg-info ms-2" style={{ fontSize: '0.7em' }}>
                          Multi-currency
                        </span>
                      )}
                    </Form.Label>
                    <AmountInput
                      value={formData.to_amount || formData.amount}
                      onChange={(value) => updateField('to_amount', value)}
                      type="income"
                      placeholder={isMultiCurrencyTransfer ? 'Enter amount' : 'Same as sent'}
                      disabled={!isMultiCurrencyTransfer}
                    />
                  </Col>
                </Row>
                {errors['amount'] && (
                  <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                    {errors['amount']}
                  </Form.Control.Feedback>
                )}
                {isMultiCurrencyTransfer && (
                  <div className="text-info small mt-1">
                    <i className="bi bi-info-circle me-1"></i>
                    Converting from {selectedAccount?.currency} to {selectedToAccount?.currency}. Enter the amount received in {selectedToAccount?.currency}.
                  </div>
                )}
              </Form.Group>
            </>
          ) : null}

          <Row>
            {/* Left Column */}
            <Col md={6}>
              {/* Regular: Amount, Account, Category */}
              {!isTransfer && (
                <>
                  {/* Regular: Amount */}
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Amount <span className="text-danger">*</span>
                      {selectedAccount && (
                        <span className="text-muted ms-2" style={{ fontWeight: 'normal', fontSize: '0.9em' }}>
                          ({selectedAccount.currency})
                        </span>
                      )}
                    </Form.Label>
                    <AmountInput
                      value={formData.amount}
                      onChange={(value) => updateField('amount', value)}
                      type={formData.type === 'income' ? 'income' : 'expense'}
                      isInvalid={!!errors['amount']}
                    />
                    {errors['amount'] && (
                      <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                        {errors['amount']}
                      </Form.Control.Feedback>
                    )}
                  </Form.Group>

                  {/* Regular: Account */}
                  <Form.Group className="mb-3">
                    <Form.Label>Account <span className="text-danger">*</span></Form.Label>
                    <AccountSelect
                      selectedAccountId={formData.account_id}
                      onSelect={handleAccountSelectSimple}
                      accounts={accounts}
                      placeholder="Select account"
                      disabled={isLoading}
                    />
                    {errors['account'] && (
                      <div className="invalid-feedback" style={{ display: 'block' }}>
                        {errors['account']}
                      </div>
                    )}
                  </Form.Group>

                  {/* Regular: Category */}
                  <Form.Group className="mb-3">
                    <Form.Label>Category <span className="text-danger">*</span></Form.Label>
                    <TransactionCategorySelect
                      selectedCategoryId={formData.category_id}
                      onSelect={handleCategorySelect}
                      categories={filteredCategories}
                      placeholder="Select category"
                      filterType={formData.type === 'income' ? 'income' : 'expense'}
                      disabled={isLoading}
                    />
                    {errors['category'] && (
                      <div className="invalid-feedback" style={{ display: 'block' }}>
                        {errors['category']}
                      </div>
                    )}
                  </Form.Group>
                </>
              )}

              {/* Date & Time */}
              <Form.Group className="mb-3">
                <Form.Label>Date & Time <span className="text-danger">*</span></Form.Label>
                <Form.Control
                  ref={dateInputRef}
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  onClick={handleDateClick}
                  isInvalid={!!errors['date']}
                />
                {errors['date'] && (
                  <Form.Control.Feedback type="invalid">{errors['date']}</Form.Control.Feedback>
                )}
              </Form.Group>
              
              {/* Payment Status */}
              <Form.Group className="mb-3">
                <Form.Label>Payment Status</Form.Label>
                <Form.Select
                  value={formData.payment_status}
                  onChange={(e) => updateField('payment_status', e.target.value)}
                >
                  {PAYMENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

            </Col>

            {/* Right Column */}
            <Col md={6}>
              {/* Description */}
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Add a note..."
                />
              </Form.Group>

              {/* Labels */}
              <Form.Group className="mb-3">
                <Form.Label>Labels</Form.Label>
                {isLoading ? (
                  <div className="text-muted small" style={{ padding: '0.5rem' }}>Loading labels...</div>
                ) : (
                  <LabelMultiSelect
                    labels={labels || []}
                    selectedLabelIds={formData.label_ids}
                    onChange={handleLabelChange}
                    disabled={isLoading}
                  />
                )}
              </Form.Group>

              {/* Payee */}
              <Form.Group className="mb-3">
                <Form.Label>Payee</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.payee}
                  onChange={(e) => updateField('payee', e.target.value)}
                  placeholder="Who was paid?"
                />
              </Form.Group>

              {/* Payment Method */}
              <Form.Group className="mb-3">
                <Form.Label>Payment Method</Form.Label>
                <Form.Select
                  value={formData.payment_method}
                  onChange={(e) => updateField('payment_method', e.target.value)}
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

            </Col>
          </Row>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <div className="d-flex gap-2 w-100">
          <Button variant="success" onClick={() => handleSave(false)} className="flex-grow-1">
            {isEditMode ? 'Save Changes' : 'Add Transaction'}
          </Button>

          {!isEditMode && (
            <Button
              variant="outline-primary"
              onClick={() => handleSave(true)}
              className="flex-grow-1"
            >
              Add & Create Another
            </Button>
          )}

          <Button variant="outline-secondary" onClick={onHide}>
            Cancel
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
