'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { format } from 'date-fns';
import { NumericFormat } from 'react-number-format';
import { FaPlusCircle } from 'react-icons/fa';

import { Debt, CreateRepaymentPayload } from '@/services/debtService';
import { DEBT_TYPES } from '@/utils/constants';
import { AccountSelect } from '@/components/transaction/AccountSelect';
import { Account } from '@/services/accountService';
import { getCurrencyPrefix } from '@/utils/formatters';
import { ClearButton } from '@/components/common/ClearButton';

interface DebtIncreaseModalProps {
  show: boolean;
  onHide: () => void;
  debt: Debt | null;
  onSave: (debtId: string, payload: CreateRepaymentPayload) => Promise<void>;
  editTransaction?: import('@/services/transactionService').Transaction | null;
  onEdit?: (debtId: string, txId: string, payload: CreateRepaymentPayload) => Promise<void>;
  accounts: Account[];
}

export const DebtIncreaseModal: React.FC<DebtIncreaseModalProps> = ({
  show,
  onHide,
  debt,
  onSave,
  editTransaction,
  onEdit,
  accounts
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [description, setDescription] = useState('');

  const amountInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleDateClick = useCallback(() => {
    if (dateInputRef.current) {
      try {
        dateInputRef.current.showPicker?.();
      } catch {
        // showPicker() not supported or blocked, ignore
      }
    }
  }, []);

  useEffect(() => {
    if (show && debt) {
      if (editTransaction) {
        setAccountId(editTransaction.account?.id || editTransaction.account_id || debt.account_id);
        setAmount(editTransaction.amount || '');
        setDate(format(new Date(editTransaction.date), "yyyy-MM-dd'T'HH:mm"));
        setDescription(editTransaction.description || '');
      } else {
        setAccountId(debt.account_id); // Default to same account
        setAmount('');
        setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setDescription('');
      }
      setError(null);
    }
  }, [show, debt, editTransaction]);

  if (!debt) return null;

  const isLend = debt.type === DEBT_TYPES.LEND;
  const currencyPrefix = getCurrencyPrefix(debt.account?.currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || amount === '' || amount <= 0) {
      setError('Please fill in required fields.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const payload: CreateRepaymentPayload = {
         account_id: accountId,
         amount: Number(amount),
         date: new Date(date).toISOString(),
         ...(description ? { description } : {})
      };
      
      if (editTransaction && onEdit) {
        await onEdit(debt.id, editTransaction.id, payload);
      } else {
        await onSave(debt.id, payload);
      }
      onHide();
    } catch (err: unknown) {
       type ApiErr = { response?: { data?: { error?: { message?: string }, message?: string } } };
       const axiosErr = err as ApiErr;
       const apiError = err instanceof Error ? axiosErr.response?.data?.error?.message || axiosErr.response?.data?.message || err.message : String(err);
       setError(apiError || 'Failed to increase debt');
    } finally {
       setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center gap-2">
            <FaPlusCircle className="text-primary" />
            {editTransaction ? 'Edit Increase' : 'Increase Debt'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="primary" className="mb-4">
             <div className="fw-semibold mb-1">
                {isLend ? 'Lend more to' : 'Borrow more from'} {debt.counterparty}
             </div>
             <div className="small d-flex justify-content-between text-muted">
                <span>Current Total: <NumericFormat value={debt.amount} displayType="text" thousandSeparator prefix={currencyPrefix} /></span>
             </div>
          </Alert>

          {error && <div className="alert alert-danger py-2">{error}</div>}

          <Row>
            <Col xs={12} className="mb-3">
              <Form.Label>Account <span className="text-danger">*</span></Form.Label>
              <AccountSelect
                 selectedAccountId={accountId}
                 onSelect={(id) => setAccountId(id || '')}
                 accounts={accounts}
                 disabled={isSubmitting}
              />
              <Form.Text className="text-muted">
                 {isLend ? 'Account the money will leave from' : 'Account receiving the money'}
              </Form.Text>
            </Col>

            <Col xs={12} className="mb-3">
              <Form.Label>Amount to Add <span className="text-danger">*</span></Form.Label>
              <div className="position-relative d-flex align-items-center">
                <NumericFormat
                   getInputRef={amountInputRef}
                   customInput={Form.Control as React.ComponentType<unknown>}
                   thousandSeparator={true}
                   prefix={currencyPrefix}
                   decimalScale={2}
                   value={amount}
                   onValueChange={(values) => setAmount(values.floatValue || '')}
                   disabled={isSubmitting}
                   placeholder="0"
                   allowNegative={false}
                   required
                   style={{ paddingRight: amount !== '' && !isSubmitting ? '2.5rem' : undefined }}
                />
                {amount !== '' && !isSubmitting && (
                  <div className="position-absolute end-0 pe-2 d-flex align-items-center">
                    <ClearButton
                      size={14}
                      ariaLabel="Clear amount"
                      onClick={() => {
                        setAmount('');
                        amountInputRef.current?.focus();
                      }}
                    />
                  </div>
                )}
              </div>
            </Col>

            <Col xs={12} className="mb-3">
              <Form.Label>Date & Time <span className="text-danger">*</span></Form.Label>
              <Form.Control
                 ref={dateInputRef}
                 type="datetime-local"
                 value={date}
                 onChange={(e) => setDate(e.target.value)}
                 onClick={handleDateClick}
                 disabled={isSubmitting}
                 required
              />
            </Col>

            <Col xs={12} className="mb-3">
               <Form.Label>Description</Form.Label>
               <div className="position-relative">
                 <Form.Control
                   ref={descriptionInputRef}
                   as="textarea"
                   rows={2}
                   placeholder="Reason for increase..."
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   disabled={isSubmitting}
                   style={{ paddingRight: description !== '' && !isSubmitting ? '2.5rem' : undefined }}
                 />
                 {description !== '' && !isSubmitting && (
                   <div className="position-absolute end-0 top-0 pt-2 pe-2" style={{ zIndex: 5 }}>
                     <ClearButton
                       size={14}
                       ariaLabel="Clear description"
                       onClick={() => {
                         setDescription('');
                         descriptionInputRef.current?.focus();
                       }}
                     />
                   </div>
                 )}
               </div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer className="d-flex flex-column-reverse flex-md-row align-items-stretch align-items-md-center gap-2">
          <Button variant="secondary" onClick={onHide} disabled={isSubmitting} className="me-md-auto">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting} className="d-flex align-items-center justify-content-center">
             {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : (editTransaction ? 'Save Changes' : 'Confirm Increase')}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};
