import React, { useRef, useCallback } from 'react';
import { Form, Row, Col } from 'react-bootstrap';
import { FaArrowRight } from 'react-icons/fa';
import { AccountSelect } from './AccountSelect';
import { TransactionCategorySelect } from './TransactionCategorySelect';
import { TransactionTypeToggle } from './TransactionTypeToggle';
import { AmountInput } from './AmountInput';
import { LabelMultiSelect } from './LabelMultiSelect';
import { ClearButton } from '@/components/common/ClearButton';
import { getCurrencyPrefix } from '@/utils/formatters';
import type { Account } from '@/services/accountService';

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Bank Transfer', 'Digital Wallet'];
const PAYMENT_STATUSES = ['Cleared', 'Pending', 'Scheduled'];

export interface TransactionFormProps {
  formData: any;
  updateField: (field: any, value: any) => void;
  errors: Record<string, string>;
  accounts: Account[];
  labels: any[];
  isLoading: boolean;
}

export function TransactionForm({
  formData,
  updateField,
  errors,
  accounts,
  labels,
  isLoading,
}: TransactionFormProps): React.JSX.Element {
  const dateInputRef = useRef<HTMLInputElement>(null);

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
      const fromAccount = accounts.find((a) => a.id === formData.account_id);
      const toAccount = accounts.find((a) => a.id === formData.to_account_id);

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


  const isTransfer = formData.type === 'transfer';

  // Get selected accounts for currency display
  const selectedAccount = accounts.find((a) => a.id === formData.account_id);
  const selectedToAccount = accounts.find((a) => a.id === formData.to_account_id);
  const isMultiCurrencyTransfer = isTransfer && selectedAccount?.currency !== selectedToAccount?.currency;

  return (
    <Form>
      {/* Transaction Type - Full Width */}
      <Form.Group className="mb-3">
        <TransactionTypeToggle value={formData.type} onChange={(type) => updateField('type', type)} />
      </Form.Group>

      {/* Transfer: From/To Accounts and Amounts - Full Width */}
      {isTransfer ? (
        <>
          <Form.Group className="mb-3">
            <Row className="g-3 align-items-center">
              <Col xs={12} md={5}>
                <Form.Label>
                  From Account <span className="text-danger">*</span>
                </Form.Label>
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
              <Col
                xs={12}
                md={2}
                className="d-flex justify-content-center align-items-end"
                style={{ paddingBottom: errors['account'] ? '1.5rem' : '0.375rem' }}
              >
                <FaArrowRight size={24} className="text-primary" />
              </Col>
              <Col xs={12} md={5}>
                <Form.Label>
                  To Account <span className="text-danger">*</span>
                </Form.Label>
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
                  prefix={getCurrencyPrefix(selectedAccount?.currency)}
                />
              </Col>
              <Col
                xs={12}
                md={2}
                className="d-flex justify-content-center align-items-end"
                style={{ paddingBottom: errors['amount'] ? '1.5rem' : '0.375rem' }}
              >
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
                  prefix={getCurrencyPrefix(selectedToAccount?.currency)}
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
                Converting from {selectedAccount?.currency} to {selectedToAccount?.currency}. Enter the amount
                received in {selectedToAccount?.currency}.
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
                  prefix={getCurrencyPrefix(selectedAccount?.currency)}
                />
                {errors['amount'] && (
                  <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                    {errors['amount']}
                  </Form.Control.Feedback>
                )}
              </Form.Group>

              {/* Regular: Account */}
              <Form.Group className="mb-3">
                <Form.Label>
                  Account <span className="text-danger">*</span>
                </Form.Label>
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
                <Form.Label>
                  Category <span className="text-danger">*</span>
                </Form.Label>
                <TransactionCategorySelect
                  selectedCategoryId={formData.category_id}
                  onSelect={handleCategorySelect}
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
            <Form.Label>
              Date & Time <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              ref={dateInputRef}
              type="datetime-local"
              value={formData.date}
              onChange={(e) => updateField('date', e.target.value)}
              onClick={handleDateClick}
              isInvalid={!!errors['date']}
            />
            {errors['date'] && <Form.Control.Feedback type="invalid">{errors['date']}</Form.Control.Feedback>}
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
            <div className="position-relative">
              <Form.Control
                as="textarea"
                rows={3}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Add a note..."
                className={formData.description ? 'pe-5' : ''}
              />
              {formData.description && (
                <ClearButton
                  className="position-absolute end-0 me-1"
                  style={{ top: '0.5rem', zIndex: 5 }}
                  onClick={() => updateField('description', '')}
                />
              )}
            </div>
          </Form.Group>

          {/* Labels */}
          <Form.Group className="mb-3">
            <Form.Label>Labels</Form.Label>
            {isLoading ? (
              <div className="text-muted small" style={{ padding: '0.5rem' }}>
                Loading labels...
              </div>
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
            <div className="position-relative">
              <Form.Control
                type="text"
                value={formData.payee}
                onChange={(e) => updateField('payee', e.target.value)}
                placeholder="Who was paid?"
                className={formData.payee ? 'pe-5' : ''}
              />
              {formData.payee && (
                <ClearButton
                  className="position-absolute end-0 top-50 translate-middle-y me-1"
                  style={{ zIndex: 5 }}
                  onClick={() => updateField('payee', '')}
                />
              )}
            </div>
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
  );
}
