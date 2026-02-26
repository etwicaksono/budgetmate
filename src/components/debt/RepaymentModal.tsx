'use client';

import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { format } from 'date-fns';
import { NumericFormat } from 'react-number-format';

import { Debt, CreateRepaymentPayload } from '@/services/debtService';
import { DEBT_TYPES } from '@/utils/constants';
import { AccountSelect } from '@/components/transaction/AccountSelect';
import { Account } from '@/services/accountService';

interface RepaymentModalProps {
  show: boolean;
  onHide: () => void;
  debt: Debt | null;
  onSave: (debtId: string, payload: CreateRepaymentPayload) => Promise<void>;
  accounts: Account[];
}

export const RepaymentModal: React.FC<RepaymentModalProps> = ({
  show,
  onHide,
  debt,
  onSave,
  accounts
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (show && debt) {
      setAccountId(debt.account_id); // Default to same account
      setAmount(debt.remaining_amount || '');
      setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
      setDescription('');
      setError(null);
    }
  }, [show, debt]);

  if (!debt) return null;

  const isLend = debt.type === DEBT_TYPES.LEND;
  const remaining = debt.remaining_amount || 0;
  const currencyPrefix = debt.account?.currency === 'IDR' ? 'Rp ' : '$ ';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || amount === '' || amount <= 0) {
      setError('Please fill in required fields.');
      return;
    }
    
    if (amount > remaining + 0.01) {
       setError(`Repayment cannot exceed remaining amount (${remaining}).`);
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
      
      await onSave(debt.id, payload);
      onHide();
    } catch (err: any) {
       const apiError = err.response?.data?.error?.message || err.response?.data?.message || err.message;
       setError(apiError || 'Failed to record repayment');
    } finally {
       setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>Record Repayment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="mb-4">
             <div className="fw-semibold mb-1">
                {isLend ? 'Lend to' : 'Borrow from'} {debt.counterparty}
             </div>
             <div className="small d-flex justify-content-between text-muted">
                <span>Total: <NumericFormat value={debt.amount} displayType="text" thousandSeparator prefix={currencyPrefix} /></span>
                <span>Remaining: <NumericFormat value={remaining} displayType="text" thousandSeparator prefix={currencyPrefix} className="text-dark fw-bold" /></span>
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
            </Col>

            <Col xs={12} className="mb-3">
              <Form.Label>Amount <span className="text-danger">*</span></Form.Label>
              <NumericFormat
                 customInput={Form.Control as any}
                 thousandSeparator={true}
                 value={amount}
                 onValueChange={(values) => setAmount(values.floatValue || '')}
                 disabled={isSubmitting}
                 max={remaining}
                 placeholder="0"
                 allowNegative={false}
                 required
              />
              <Form.Text className="text-muted">
                 Max: <NumericFormat value={remaining} displayType="text" thousandSeparator prefix={currencyPrefix} />
              </Form.Text>
            </Col>

            <Col xs={12} className="mb-3">
              <Form.Label>Date & Time <span className="text-danger">*</span></Form.Label>
              <Form.Control
                 type="datetime-local"
                 value={date}
                 onChange={(e) => setDate(e.target.value)}
                 disabled={isSubmitting}
                 required
              />
            </Col>

            <Col xs={12} className="mb-3">
               <Form.Label>Description</Form.Label>
               <Form.Control
                 as="textarea"
                 rows={2}
                 placeholder="Repayment note..."
                 value={description}
                 onChange={(e) => setDescription(e.target.value)}
                 disabled={isSubmitting}
               />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={isSubmitting} className="me-auto">
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={isSubmitting}>
             {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : 'Record Repayment'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};
