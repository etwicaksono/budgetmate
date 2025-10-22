import React, { useMemo, useCallback } from 'react';
import {
  Modal,
  Form,
  Button,
  Row,
  Col,
  InputGroup,
  ButtonGroup,
} from 'react-bootstrap';
import { FaPlus, FaArrowRight } from 'react-icons/fa';
import { ChildCategorySelect } from './ChildCategorySelect';
import { SingleCategoryDropdown } from './SingleCategoryDropdown';

const TYPE_OPTIONS = [
  { value: 'Expense', label: 'Expense', activeVariant: 'danger' },
  { value: 'Income', label: 'Income', activeVariant: 'success' },
  { value: 'Transfer', label: 'Transfer', activeVariant: 'primary' },
];

const CURRENCY_OPTIONS = ['IDR', 'USD', 'EUR', 'GBP'];
const PAYMENT_TYPE_OPTIONS = ['Cash', 'Credit Card', 'Bank Transfer', 'Digital Wallet'];
const PAYMENT_STATUS_OPTIONS = ['Cleared', 'Pending', 'Scheduled'];

export const TransactionModal = ({
  show,
  onHide,
  transaction,
  onChange,
  onSave,
  quickTransactions = [],
  onTemplateSelect,
  onAddTemplate,
  availableCategories,
  availableAccounts,
  categoryTree = {},
  parentCategoryColors = {},
  categoryIcons = {},
  accountTree = {},
  accountColors = {},
  accountIcons = {},
}) => {
  const templateOptions = useMemo(() => quickTransactions || [], [quickTransactions]);

  const handleTypeChange = (type) => {
    if (onChange) {
      onChange({ target: { name: 'type', value: type } });
    }
  };

  const handleDateTimeChange = (value) => {
    if (!onChange) {
      return;
    }
    onChange({ target: { name: 'dateTime', value } });
    onChange({ target: { name: 'date', value: value ? value.slice(0, 10) : '' } });
  };

  const handleTemplateChange = (event) => {
    const { value } = event.target;
    if (onTemplateSelect) {
      onTemplateSelect(value ? value : null);
    }
  };

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    if (onChange) {
      onChange({ target: { name, value: checked } });
    }
  };

  const handleSave = (createAnother) => {
    if (onSave) {
      onSave(createAnother);
    }
  };

  const accountOptions = useMemo(
    () => (availableAccounts || []).filter((accountOption) => accountOption && accountOption !== 'All'),
    [availableAccounts]
  );

  const categoryOptions = useMemo(
    () => (availableCategories || []).filter((categoryOption) => categoryOption && categoryOption !== 'All'),
    [availableCategories]
  );

  const resolvedAccountTree = useMemo(() => {
    if (accountTree && Object.keys(accountTree).length > 0) {
      return accountTree;
    }
    return Object.fromEntries(accountOptions.map((accountOption) => [accountOption, []]));
  }, [accountTree, accountOptions]);

  const resolvedAccountColors = useMemo(() => {
    if (accountColors && Object.keys(accountColors).length > 0) {
      return accountColors;
    }
    return {};
  }, [accountColors]);

  const resolvedAccountIcons = useMemo(() => {
    if (accountIcons && Object.keys(accountIcons).length > 0) {
      return accountIcons;
    }
    return {};
  }, [accountIcons]);

  const resolvedCategoryTree = useMemo(() => {
    if (categoryTree && Object.keys(categoryTree).length > 0) {
      return categoryTree;
    }
    return Object.fromEntries(categoryOptions.map((categoryOption) => [categoryOption, []]));
  }, [categoryTree, categoryOptions]);

  const resolvedParentCategoryColors = useMemo(() => {
    if (parentCategoryColors && Object.keys(parentCategoryColors).length > 0) {
      return parentCategoryColors;
    }
    return {};
  }, [parentCategoryColors]);

  const resolvedCategoryIcons = useMemo(() => {
    if (categoryIcons && Object.keys(categoryIcons).length > 0) {
      return categoryIcons;
    }
    return {};
  }, [categoryIcons]);

  const createSingleSelectSetter = useCallback(
    (fieldName) => (updater) => {
      const previousValue = transaction?.[fieldName];
      const previousSelection = previousValue ? [previousValue] : [];
      const nextSelection = typeof updater === 'function' ? updater(previousSelection) : updater;
      const normalizedSelection = Array.isArray(nextSelection) ? nextSelection : [];
      const sanitizedSelection = normalizedSelection.filter((item) => item && item !== 'All');
      const nextValue = sanitizedSelection[sanitizedSelection.length - 1] || '';
      if (onChange) {
        onChange({ target: { name: fieldName, value: nextValue } });
      }
    },
    [transaction, onChange]
  );

  const handleAccountSelect = useMemo(() => createSingleSelectSetter('account'), [createSingleSelectSetter]);
  const handleToAccountSelect = useMemo(() => createSingleSelectSetter('toAccount'), [createSingleSelectSetter]);
  const handleCategorySelect = useMemo(() => createSingleSelectSetter('category'), [createSingleSelectSetter]);


  const currentTemplateValue = transaction?.templateId ? String(transaction.templateId) : '';

  if (!transaction) {
    return null;
  }

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="xl"
      centered
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>Add record</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Row>
            <Col lg={6} className="mb-4">
              <Form.Group className="mb-3" controlId="templateSelect">
                <Form.Label className="small text-uppercase text-muted fw-semibold">Select template</Form.Label>
                <InputGroup>
                  <Form.Select value={currentTemplateValue} onChange={handleTemplateChange}>
                    <option value="">Select template</option>
                    {templateOptions.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.description}
                      </option>
                    ))}
                  </Form.Select>
                  <Button
                    type="button"
                    variant="outline-success"
                    onClick={() => onAddTemplate?.()}
                    title="Create new template"
                  >
                    <FaPlus />
                  </Button>
                </InputGroup>
              </Form.Group>

              <Form.Group className="mb-3">
                <div className="d-flex">
                  <ButtonGroup className="w-100">
                    {TYPE_OPTIONS.map((option) => {
                      const isActive = transaction.type === option.value;
                      return (
                        <Button
                          key={option.value}
                          variant={isActive ? option.activeVariant : 'outline-secondary'}
                          onClick={() => handleTypeChange(option.value)}
                        >
                          {option.label}
                        </Button>
                      );
                    })}
                  </ButtonGroup>
                </div>
              </Form.Group>

              {transaction.type === 'Transfer' ? (
                <>
                  <Form.Group className="mb-3" controlId="transferAccounts">
                    <Row className="g-2 align-items-end">
                      <Col xs={12} md={5}>
                        <Form.Label>From account</Form.Label>
                        <SingleCategoryDropdown
                          selectedCategories={transaction.account ? [transaction.account] : []}
                          setSelectedCategories={handleAccountSelect}
                          categoryTree={resolvedAccountTree}
                          parentCategoryColors={resolvedAccountColors}
                          categoryIcons={resolvedAccountIcons}
                          allCategories={accountOptions}
                          entityLabelSingular="account"
                          entityLabelPlural="accounts"
                          searchPlaceholder="Search account..."
                          clearSelectedLabel="Clear selection"
                        />
                      </Col>
                      <Col xs={12} md="auto" className="d-flex justify-content-center align-items-center pt-md-4">
                        <div className="bg-light border rounded-circle p-2">
                          <FaArrowRight className="text-muted" />
                        </div>
                      </Col>
                      <Col xs={12} md={5}>
                        <Form.Label>To account</Form.Label>
                        <SingleCategoryDropdown
                          selectedCategories={transaction.toAccount ? [transaction.toAccount] : []}
                          setSelectedCategories={handleToAccountSelect}
                          categoryTree={resolvedAccountTree}
                          parentCategoryColors={resolvedAccountColors}
                          categoryIcons={resolvedAccountIcons}
                          allCategories={accountOptions}
                          entityLabelSingular="account"
                          entityLabelPlural="accounts"
                          searchPlaceholder="Search destination account..."
                          clearSelectedLabel="Clear selection"
                        />
                      </Col>
                    </Row>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="transferAmount">
                    <Row className="g-2 align-items-end">
                      <Col xs={12} md={5}>
                        <Form.Label>Amount</Form.Label>
                        <InputGroup>
                          <Form.Control
                            type="number"
                            step="0.01"
                            name="amount"
                            value={transaction.amount}
                            onChange={onChange}
                            placeholder="Enter amount"
                            autoComplete="off"
                          />
                          <Form.Select
                            name="currency"
                            value={transaction.currency}
                            onChange={onChange}
                            style={{ flex: '0 0 auto', width: 'auto' }}
                          >
                            {CURRENCY_OPTIONS.map((currency) => (
                              <option key={currency} value={currency}>
                                {currency}
                              </option>
                            ))}
                          </Form.Select>
                        </InputGroup>
                      </Col>
                      <Col xs={12} md="auto" className="d-flex justify-content-center align-items-center pt-md-4">
                        <div className="bg-light border rounded-circle p-2">
                          <FaArrowRight className="text-muted" />
                        </div>
                      </Col>
                      <Col xs={12} md={5}>
                        <Form.Label>Amount received</Form.Label>
                        <InputGroup>
                          <Form.Control
                            type="number"
                            step="0.01"
                            name="toAmount"
                            value={transaction.toAmount || ''}
                            onChange={onChange}
                            placeholder="Enter amount"
                            autoComplete="off"
                          />
                          <Form.Select
                            name="toCurrency"
                            value={transaction.toCurrency || transaction.currency}
                            onChange={onChange}
                            style={{ flex: '0 0 auto', width: 'auto' }}
                          >
                            {CURRENCY_OPTIONS.map((currency) => (
                              <option key={currency} value={currency}>
                                {currency}
                              </option>
                            ))}
                          </Form.Select>
                        </InputGroup>
                      </Col>
                    </Row>
                  </Form.Group>
                </>
              ) : (
                <>
                  <Form.Group className="mb-3" controlId="amount">
                    <Form.Label>Amount</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="amount"
                        value={transaction.amount}
                        onChange={onChange}
                        placeholder="Enter amount"
                        autoComplete="off"
                      />
                      <Form.Select
                        name="currency"
                        value={transaction.currency}
                        onChange={onChange}
                        style={{ flex: '0 0 auto', width: 'auto' }}
                      >
                        {CURRENCY_OPTIONS.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </Form.Select>
                    </InputGroup>
                  </Form.Group>

                  <Form.Group className="mb-3" controlId="account">
                    <Form.Label>Account</Form.Label>
                    <SingleCategoryDropdown
                      selectedCategories={transaction.account ? [transaction.account] : []}
                      setSelectedCategories={handleAccountSelect}
                      categoryTree={resolvedAccountTree}
                      parentCategoryColors={resolvedAccountColors}
                      categoryIcons={resolvedAccountIcons}
                      allCategories={accountOptions}
                      entityLabelSingular="account"
                      entityLabelPlural="accounts"
                      searchPlaceholder="Search account..."
                      clearSelectedLabel="Clear selection"
                    />
                  </Form.Group>
                </>
              )}

              <Form.Group className="mb-3" controlId="category">
                <Form.Label>Category</Form.Label>
                <ChildCategorySelect
                  selectedCategories={transaction.category ? [transaction.category] : []}
                  setSelectedCategories={handleCategorySelect}
                  categoryTree={resolvedCategoryTree}
                  parentCategoryColors={resolvedParentCategoryColors}
                  categoryIcons={resolvedCategoryIcons}
                  allCategories={categoryOptions}
                  entityLabelSingular="category"
                  entityLabelPlural="categories"
                  searchPlaceholder="Search category..."
                  clearSelectedLabel="Clear selection"
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="labels">
                <Form.Label>Labels</Form.Label>
                <Form.Control
                  type="text"
                  name="labels"
                  value={transaction.labels}
                  onChange={onChange}
                  placeholder="Add labels (comma separated)"
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="dateTime">
                <Form.Label>Date &amp; Time</Form.Label>
                <Form.Control
                  type="datetime-local"
                  name="dateTime"
                  value={transaction.dateTime}
                  onChange={(event) => handleDateTimeChange(event.target.value)}
                />
              </Form.Group>

              <Form.Check
                type="checkbox"
                id="createTemplateFromRecord"
                label="Create template from this record"
                name="createTemplate"
                checked={!!transaction.createTemplate}
                onChange={handleCheckboxChange}
              />
            </Col>
            <Col lg={6}>
              <h6 className="fw-semibold mb-3">Other details</h6>
              <Form.Group className="mb-3" controlId="notes">
                <Form.Label>Note</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  name="notes"
                  value={transaction.notes}
                  onChange={onChange}
                  placeholder="Describe your record"
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="payer">
                <Form.Label>Payer</Form.Label>
                <Form.Control
                  type="text"
                  name="payer"
                  value={transaction.payer}
                  onChange={onChange}
                  placeholder="Who paid?"
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="paymentType">
                <Form.Label>Payment type</Form.Label>
                <Form.Select
                  name="paymentType"
                  value={transaction.paymentType}
                  onChange={onChange}
                >
                  {PAYMENT_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3" controlId="paymentStatus">
                <Form.Label>Payment status</Form.Label>
                <Form.Select
                  name="paymentStatus"
                  value={transaction.paymentStatus}
                  onChange={onChange}
                >
                  {PAYMENT_STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Form>
      </Modal.Body>
      <Modal.Footer className="flex-column flex-lg-row gap-2">
        <div className="d-flex flex-column flex-lg-row w-100 gap-2">
          <Button type="button" variant="success" className="w-100" onClick={() => handleSave(false)}>
            Add record
          </Button>
          <Button type="button" variant="outline-primary" className="w-100" onClick={() => handleSave(true)}>
            Add and create another
          </Button>
          <Button variant="outline-secondary" className="w-100 w-lg-auto" onClick={onHide}>
            Cancel
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
};


