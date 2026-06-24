'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Form, Button, Row, Col, InputGroup, Spinner } from 'react-bootstrap';
import { FaUser } from 'react-icons/fa';
import { NumericFormat } from 'react-number-format';
import { format } from 'date-fns';

import { Debt, CreateDebtPayload, UpdateDebtPayload } from '@/services/debtService';
import { DebtStatus, DebtType } from '@prisma/client';
import { DebtTypeToggle } from './DebtTypeToggle';
import { AccountSelect } from '@/components/transaction/AccountSelect';
import { Account } from '@/services/accountService';
import { ClearButton } from '@/components/common/ClearButton';

interface DebtModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (data: CreateDebtPayload | UpdateDebtPayload) => Promise<void>;
  editDebt?: Debt | null;
  accounts: Account[];
  defaultType?: DebtType;
}

export const DebtModal: React.FC<DebtModalProps> = ({
  show,
  onHide,
  onSave,
  editDebt,
  accounts,
  defaultType,
}) => {
  const isEdit = !!editDebt;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<DebtType>(DebtType.lend);
  const [counterparty, setCounterparty] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<DebtStatus>(DebtStatus.active);

  const counterpartyInputRef = useRef<HTMLInputElement>(null);
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
    if (show) {
      if (isEdit && editDebt) {
        setType(editDebt.type);
        setCounterparty(editDebt.counterparty);
        setAccountId(editDebt.account_id);
        setAmount(editDebt.amount);
        setDate(format(new Date(editDebt.date), "yyyy-MM-dd'T'HH:mm"));
        setDescription(editDebt.description || '');
        setStatus(editDebt.status);
      } else {
        setType(defaultType ?? DebtType.lend);
        setCounterparty('');
        setAccountId('');
        setAmount('');
        setDate(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        setDescription('');
        setStatus(DebtStatus.active);
        setError(null);
      }
    }
  }, [show, isEdit, editDebt, defaultType]);

  const decimalScale = 2;

  const handleSubmit = async (e: React.FormEvent, createAnother: boolean = false) => {
    e.preventDefault();
    if (!counterparty.trim() || !accountId || amount === '' || amount <= 0) {
      setError('Please fill in all required fields accurately.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const dDate = new Date(date).toISOString();

      if (isEdit) {
        const payload: UpdateDebtPayload = {
          type,
          counterparty,
          account_id: accountId,
          amount: Number(amount),
          date: dDate,
          status,
          ...(description ? { description } : {})
        };
        await onSave(payload);
        onHide();
      } else {
        const payload: CreateDebtPayload = {
          type,
          counterparty,
          account_id: accountId,
          amount: Number(amount),
          date: dDate,
          ...(description ? { description } : {})
        };
        await onSave(payload);
        if (createAnother) {
           // Reset amount and description but keep contextual defaults
           setCounterparty('');
           setAmount('');
           setDescription('');
        } else {
           onHide();
        }
      }
    } catch (err: unknown) {
       type ApiErr = { response?: { data?: { error?: { message?: string }, message?: string } } };
       const axiosErr = err as ApiErr;
       const apiError = err instanceof Error ? axiosErr.response?.data?.error?.message || axiosErr.response?.data?.message || err.message : String(err);
       setError(apiError || 'Failed to save debt');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Form onSubmit={(e) => handleSubmit(e, false)}>
        <Modal.Header closeButton>
          <Modal.Title>{isEdit ? (type === DebtType.lend ? 'Edit Credit' : 'Edit Debit') : (type === DebtType.lend ? 'New Credit' : 'New Debit')}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger py-2">{error}</div>}

          <DebtTypeToggle value={type} onChange={setType} disabled={isEdit && editDebt?.repayments && editDebt.repayments.length > 0} />

          <Row>
            <Col xs={12} className="mb-3">
              <Form.Label>Counterparty <span className="text-danger">*</span></Form.Label>
              <InputGroup>
                <InputGroup.Text><FaUser /></InputGroup.Text>
                <Form.Control
                  ref={counterpartyInputRef}
                  type="text"
                  placeholder="Person or business name"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  disabled={isSubmitting}
                  required
                  style={{ paddingRight: counterparty !== '' && !isSubmitting ? '2.5rem' : undefined }}
                />
                {counterparty !== '' && !isSubmitting && (
                  <div className="position-absolute end-0 top-50 translate-middle-y pe-2 d-flex align-items-center" style={{ zIndex: 5 }}>
                    <ClearButton
                      size={14}
                      ariaLabel="Clear counterparty"
                      onClick={() => {
                        setCounterparty('');
                        counterpartyInputRef.current?.focus();
                      }}
                    />
                  </div>
                )}
              </InputGroup>
            </Col>

            <Col xs={12} md={6} className="mb-3">
              <Form.Label>Account <span className="text-danger">*</span></Form.Label>
              <AccountSelect
                 selectedAccountId={accountId}
                 onSelect={(id) => setAccountId(id || '')}
                 accounts={accounts}
                 disabled={isSubmitting}
              />
            </Col>

            <Col xs={12} md={6} className="mb-3">
              <Form.Label>Amount <span className="text-danger">*</span></Form.Label>
              <div className="position-relative d-flex align-items-center">
                <NumericFormat
                   getInputRef={amountInputRef}
                   customInput={Form.Control as React.ComponentType<unknown>}
                   thousandSeparator={true}
                   prefix="Rp "
                   decimalScale={decimalScale}
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

            <Col xs={12} md={6} className="mb-3">
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

            {isEdit && (
               <Col xs={12} md={6} className="mb-3">
                  <Form.Label>Status</Form.Label>
                  <Form.Select 
                     value={status} 
                     onChange={(e) => setStatus(e.target.value as DebtStatus)}
                     disabled={isSubmitting}
                  >
                     <option value={DebtStatus.active}>Active</option>
                     <option value={DebtStatus.settled}>Settled</option>
                  </Form.Select>
               </Col>
            )}

            <Col xs={12} className="mb-3">
               <Form.Label>Description</Form.Label>
               <div className="position-relative">
                 <Form.Control
                   ref={descriptionInputRef}
                   as="textarea"
                   rows={2}
                   placeholder="Optional note"
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
          {!isEdit && (
             <Button
                variant={type === DebtType.lend ? "outline-danger" : "outline-success"}
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting}
                className="d-flex align-items-center justify-content-center"
             >
                {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : 'Save & Create Another'}
             </Button>
          )}
          <Button type="submit" variant={type === DebtType.lend ? "danger" : "success"} disabled={isSubmitting} className="d-flex align-items-center justify-content-center">
             {isSubmitting ? <Spinner as="span" animation="border" size="sm" /> : 'Save'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};
