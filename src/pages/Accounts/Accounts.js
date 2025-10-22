import React, { useMemo, useRef, useState } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, InputGroup, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
  FaBars,
  FaMobileAlt,
  FaMoneyBillWave,
  FaPiggyBank,
  FaPlus,
  FaShoppingCart,
  FaStore,
  FaUniversity,
  FaWallet,
  FaInfoCircle,
} from 'react-icons/fa';

const INITIAL_ACCOUNTS = [
  {
    id: 'cash-eko',
    order: 1,
    name: 'Cash Eko',
    type: 'Cash',
    balance: 2816756,
    icon: FaMoneyBillWave,
    accentColor: '#047857',
    backgroundColor: '#ecfdf5',
  },
  {
    id: 'cimb-syariah',
    order: 2,
    name: 'CIMB Syariah',
    type: 'Checking account',
    balance: 2813245.42,
    icon: FaUniversity,
    accentColor: '#b91c1c',
    backgroundColor: '#fee2e2',
  },
  {
    id: 'saldo-pulsa',
    order: 3,
    name: 'Saldo Pulsa',
    type: 'General',
    balance: 80947,
    icon: FaMobileAlt,
    accentColor: '#0284c7',
    backgroundColor: '#e0f2fe',
  },
  {
    id: 'ovo-eko',
    order: 4,
    name: 'OVO Eko',
    type: 'General',
    balance: 0,
    icon: FaWallet,
    accentColor: '#7c3aed',
    backgroundColor: '#ede9fe',
  },
  {
    id: 'shopee-pay',
    order: 5,
    name: 'Shopee Pay Eko',
    type: 'General',
    balance: 0,
    icon: FaStore,
    accentColor: '#ea580c',
    backgroundColor: '#ffedd5',
  },
  {
    id: 'saldo-tokped',
    order: 6,
    name: 'Saldo Tokped',
    type: 'General',
    balance: 0,
    icon: FaShoppingCart,
    accentColor: '#16a34a',
    backgroundColor: '#dcfce7',
  },
  {
    id: 'gopay',
    order: 7,
    name: 'Gopay',
    type: 'General',
    balance: 0,
    icon: FaWallet,
    accentColor: '#0ea5e9',
    backgroundColor: '#e0f2fe',
  },
  {
    id: 'dana',
    order: 8,
    name: 'DANA',
    type: 'General',
    balance: 127741,
    icon: FaPiggyBank,
    accentColor: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  {
    id: 'bca',
    order: 9,
    name: 'BCA',
    type: 'Checking account',
    balance: 0,
    icon: FaUniversity,
    accentColor: '#1d4ed8',
    backgroundColor: '#dbeafe',
  },
  {
    id: 'cash-dewi',
    order: 10,
    name: 'Cash Dewi',
    type: 'Cash',
    balance: -7800,
    icon: FaMoneyBillWave,
    accentColor: '#be123c',
    backgroundColor: '#fee2e2',
  },
  {
    id: 'archived-savings',
    order: 11,
    name: 'Savings Jar (Archived)',
    type: 'General',
    balance: 450000,
    icon: FaPiggyBank,
    accentColor: '#7c3aed',
    backgroundColor: '#ede9fe',
    isArchived: true,
  },
];

const ACCOUNT_TYPES = [
  { value: 'General', label: 'General', icon: FaWallet },
  { value: 'Cash', label: 'Cash', icon: FaMoneyBillWave },
  { value: 'Checking account', label: 'Checking account', icon: FaUniversity },
];

const CURRENCY_OPTIONS = ['IDR', 'USD', 'EUR', 'SGD'];

const createEmptyAccountForm = () => ({
  name: '',
  color: '#ce9600',
  accountType: 'General',
  initialAmount: '0',
  currency: 'IDR',
  excludeFromStatistics: false,
});

const reorderAccounts = (items, sourceId, targetId, placeAfter) => {
  const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const sourceIndex = sorted.findIndex((account) => account.id === sourceId);
  const targetIndex = sorted.findIndex((account) => account.id === targetId);

  if (sourceIndex === -1 || targetIndex === -1) {
    return items;
  }

  const [sourceAccount] = sorted.splice(sourceIndex, 1);

  let adjustedTargetIndex = targetIndex;
  if (sourceIndex < targetIndex) {
    adjustedTargetIndex -= 1;
  }

  let insertIndex = placeAfter ? adjustedTargetIndex + 1 : adjustedTargetIndex;
  insertIndex = Math.max(0, Math.min(insertIndex, sorted.length));

  sorted.splice(insertIndex, 0, sourceAccount);

  sorted.forEach((account, index) => {
    account.order = index + 1;
  });

  return [...sorted];
};

const lightenColor = (hex, ratio = 0.85) => {
  if (!/^#?[0-9a-fA-F]{6}$/.test(hex)) {
    return '#f8f9fa';
  }

  const normalized = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  const apply = (channel) => Math.round(channel + (255 - channel) * ratio);
  const toHex = (channel) => channel.toString(16).padStart(2, '0');

  return `#${toHex(apply(r))}${toHex(apply(g))}${toHex(apply(b))}`;
};

const generateAccountId = (name) => {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const fallback = base || 'account';
  return `${fallback}-${Date.now().toString(36)}`;
};

const Accounts = () => {
  const [showArchived, setShowArchived] = useState(false);
  const [accounts, setAccounts] = useState(() =>
    INITIAL_ACCOUNTS.map((account) => ({ ...account })).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  );
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState(() => createEmptyAccountForm());
  const [colorHexInput, setColorHexInput] = useState(() => createEmptyAccountForm().color);
  const colorPickerInputRef = useRef(null);

  const openColorPicker = (event) => {
    const picker = colorPickerInputRef.current;
    if (!picker) {
      return;
    }

    if (event) {
      event.preventDefault();
    }

    picker.click();
  };

  const filteredAccounts = useMemo(() => {
    const relevantAccounts = showArchived ? accounts : accounts.filter((account) => !account.isArchived);
    return [...relevantAccounts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [accounts, showArchived]);

  const summary = useMemo(() => {
    const activeAccounts = accounts.filter((account) => !account.isArchived);
    const archivedAccounts = accounts.filter((account) => account.isArchived);
    const visibleAccounts = showArchived ? accounts : activeAccounts;

    return {
      totalVisibleBalance: visibleAccounts.reduce((total, account) => total + account.balance, 0),
      activeCount: activeAccounts.length,
      archivedCount: archivedAccounts.length,
    };
  }, [accounts, showArchived]);

  const formatCurrency = (value) => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));

    return `${value < 0 ? '-' : ''}IDR ${formatted}`;
  };

  let dragPreviewElement = null;

  const cleanupDragPreview = () => {
    if (dragPreviewElement && dragPreviewElement.parentNode) {
      dragPreviewElement.parentNode.removeChild(dragPreviewElement);
    }
    dragPreviewElement = null;
  };

  const createDragPreview = (event) => {
    const dragCard = event.currentTarget.closest('.accounts-list__item');
    if (!dragCard) {
      cleanupDragPreview();
      return;
    }

    const node = dragCard.cloneNode(true);
    const { clientX, clientY } = event.nativeEvent;
    const rect = dragCard.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const offsetY = clientY - rect.top;

    node.style.position = 'fixed';
    node.style.left = '-9999px';
    node.style.top = '-9999px';
    node.style.width = `${rect.width}px`;
    node.style.pointerEvents = 'none';
    node.style.zIndex = '2147483647';
    node.classList.add('accounts-list__item--drag-preview');

    document.body.appendChild(node);
    dragPreviewElement = node;
    event.dataTransfer.setDragImage(node, offsetX, offsetY);
  };

  const handleDragStart = (event, accountId) => {
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', accountId);
    createDragPreview(event);
    setDraggingId(accountId);
  };

  const handleDragEnter = (event, targetId) => {
    event.preventDefault();
    if (!draggingId || draggingId === targetId) {
      return;
    }

    const { top, height } = event.currentTarget.getBoundingClientRect();
    const shouldPlaceAfter = event.clientY - top > height / 2;

    setAccounts((previous) => reorderAccounts(previous, draggingId, targetId, shouldPlaceAfter));

    setDragOverId(targetId);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (_event, targetId) => {
    if (dragOverId === targetId) {
      setDragOverId(null);
    }
  };

  const handleDrop = (event, targetId) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain') || draggingId;

    if (!sourceId || sourceId === targetId) {
      setDragOverId(null);
      cleanupDragPreview();
      return;
    }
    cleanupDragPreview();
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    cleanupDragPreview();
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleOpenAddModal = () => {
    setShowAddModal(true);
  };

  const resetAddAccountForm = () => {
    const nextForm = createEmptyAccountForm();
    setNewAccountForm(nextForm);
    setColorHexInput(nextForm.color);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    resetAddAccountForm();
  };

  const handleFormFieldChange = (field) => (event) => {
    const { value } = event.target;
    setNewAccountForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleColorTextChange = (event) => {
    let value = event.target.value.replace(/[^#0-9a-fA-F]/g, '');
    if (!value.startsWith('#')) {
      value = `#${value}`;
    }
    value = value.slice(0, 7);
    setColorHexInput(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setNewAccountForm((previous) => ({
        ...previous,
        color: value,
      }));
    }
  };

  const handleColorPickerChange = (event) => {
    const value = event.target.value;
    setColorHexInput(value);
    setNewAccountForm((previous) => ({
      ...previous,
      color: value,
    }));
  };

  const handleExcludeToggle = (event) => {
    const { checked } = event.target;
    setNewAccountForm((previous) => ({
      ...previous,
      excludeFromStatistics: checked,
    }));
  };

  const handleCreateAccount = (event) => {
    event.preventDefault();
    const trimmedName = newAccountForm.name.trim();
    if (!trimmedName) {
      return;
    }

    const accountTypeMeta =
      ACCOUNT_TYPES.find((type) => type.value === newAccountForm.accountType) ?? ACCOUNT_TYPES[0];
    const IconComponent = accountTypeMeta.icon ?? FaWallet;
    const maxOrder = accounts.reduce((max, account) => Math.max(max, account.order ?? 0), 0);

    const nextAccount = {
      id: generateAccountId(trimmedName),
      order: maxOrder + 1,
      name: trimmedName,
      type: newAccountForm.accountType,
      balance: parseFloat(newAccountForm.initialAmount || '0') || 0,
      icon: IconComponent,
      accentColor: newAccountForm.color,
      backgroundColor: lightenColor(newAccountForm.color),
      excludeFromStatistics: newAccountForm.excludeFromStatistics,
      currency: newAccountForm.currency,
    };

    setAccounts((previous) => [...previous, nextAccount]);
    handleCloseAddModal();
  };

  const selectedAccountType =
    ACCOUNT_TYPES.find((type) => type.value === newAccountForm.accountType) ?? ACCOUNT_TYPES[0];
  const SelectedAccountTypeIcon = selectedAccountType.icon ?? FaWallet;

  return (
    <Container className="accounts-page">
      <Row className="align-items-stretch accounts-page__layout">
        <Col xl={3} lg={4} className="mb-4">
          <Card className="accounts-sidebar">
            <Card.Body>
              <h2 className="accounts-sidebar__title">Accounts</h2>
              <p className="accounts-sidebar__caption">Organise your accounts and wallets in one place.</p>

              <Button variant="success" className="accounts-sidebar__add-btn" onClick={handleOpenAddModal}>
                <FaPlus className="me-2" size={14} />
                Add
              </Button>

              <div className="accounts-sidebar__switch">
                <span>Show Archived</span>
                <Form.Check
                  type="switch"
                  id="show-archived-switch"
                  className="accounts-sidebar__form-switch"
                  checked={showArchived}
                  onChange={(event) => setShowArchived(event.target.checked)}
                />
              </div>

              <div className="accounts-sidebar__summary">
                <div className="accounts-sidebar__summary-item">
                  <span>Total Balance</span>
                  <strong>{formatCurrency(summary.totalVisibleBalance)}</strong>
                </div>
                <div className="accounts-sidebar__summary-grid">
                  <div>
                    <span>Active</span>
                    <strong>{summary.activeCount}</strong>
                  </div>
                  <div>
                    <span>Archived</span>
                    <strong>{summary.archivedCount}</strong>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col xl={9} lg={8}>
          <div className="accounts-list" onDragOver={handleDragOver}>
            {filteredAccounts.map((account) => {
              const IconComponent = account.icon;
              const isDragging = draggingId === account.id;
              const isDragOver = dragOverId === account.id;

              return (
                <Card
                  key={account.id}
                  className={`accounts-list__item${isDragging ? ' accounts-list__item--dragging' : ''}${isDragOver ? ' accounts-list__item--drag-over' : ''
                    }`}
                  onDragEnter={(event) => handleDragEnter(event, account.id)}
                  onDragOver={handleDragOver}
                  onDragLeave={(event) => handleDragLeave(event, account.id)}
                  onDrop={(event) => handleDrop(event, account.id)}
                >
                  <Card.Body className="accounts-list__body">
                    <div
                      className="accounts-list__icon"
                      style={{ backgroundColor: account.backgroundColor, color: account.accentColor }}
                    >
                      <IconComponent size={20} />
                    </div>
                    <div className="accounts-list__details">
                      <span className="accounts-list__name">{account.name}</span>
                      <span className="accounts-list__type">{account.type}</span>
                    </div>
                    <div
                      className={`accounts-list__balance ${account.balance < 0 ? 'accounts-list__balance--negative' : ''
                        }`}
                    >
                      {formatCurrency(account.balance)}
                    </div>
                    <Button
                      variant="light"
                      className="accounts-list__menu-btn"
                      draggable
                      onDragStart={(event) => handleDragStart(event, account.id)}
                      onDragEnd={handleDragEnd}
                      aria-label={`Reorder ${account.name}`}
                    >
                      <FaBars size={20} />
                    </Button>
                  </Card.Body>
                </Card>
              );
            })}

            {filteredAccounts.length === 0 && (
              <Card className="accounts-list__empty">
                <Card.Body>
                  <div className="accounts-list__empty-icon">
                    <FaBars size={20} />
                  </div>
                  <h3>No accounts to show</h3>
                  <p>Toggle archived accounts or add a new one to get started.</p>
                </Card.Body>
              </Card>
            )}
          </div>
        </Col>
      </Row>

      <Modal
        show={showAddModal}
        onHide={handleCloseAddModal}
        centered
        backdrop="static"
        className="add-account-modal"
      >
        <Form onSubmit={handleCreateAccount}>
          <Modal.Header closeButton>
            <Modal.Title>Add Account</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group controlId="addAccountName" className="mb-3 mb-md-0">
                  <Form.Label>
                    Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Account name"
                    value={newAccountForm.name}
                    onChange={handleFormFieldChange('name')}
                    autoFocus
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="addAccountColor" className="mb-3 mb-md-0">
                  <Form.Label>Color</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '1rem',
                          height: '1rem',
                          borderRadius: '50%',
                          backgroundColor: newAccountForm.color,
                          border: '1px solid #dee2e6',
                        }}
                      />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="#ce9600"
                      value={colorHexInput}
                      onChange={handleColorTextChange}
                      onClick={openColorPicker}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          openColorPicker(event);
                        }
                      }}
                    />
                    <Form.Control
                      ref={colorPickerInputRef}
                      type="color"
                      value={newAccountForm.color}
                      title="Pick a color"
                      onChange={handleColorPickerChange}
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '8px',
                        width: '180px',
                        height: '42px',
                        padding: 0,
                        margin: 0,
                        opacity: 0,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onBlur={() => {
                        // restore to initial hidden position to avoid layout jump
                        if (colorPickerInputRef.current) {
                          colorPickerInputRef.current.style.top = 'bpx';
                        }
                      }}
                      tabIndex={-1}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group controlId="addAccountType" className="mb-3">
              <Form.Label>Account type</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <SelectedAccountTypeIcon size={16} />
                </InputGroup.Text>
                <Form.Select
                  value={newAccountForm.accountType}
                  onChange={handleFormFieldChange('accountType')}
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Form.Select>
              </InputGroup>
            </Form.Group>

            <Row className="g-3 mt-1">
              <Col md={6}>
                <Form.Group controlId="addAccountAmount">
                  <Form.Label>Initial Amount</Form.Label>
                  <InputGroup>
                    <InputGroup.Text>{newAccountForm.currency}</InputGroup.Text>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={newAccountForm.initialAmount}
                      onChange={handleFormFieldChange('initialAmount')}
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="addAccountCurrency">
                  <Form.Label>Currency</Form.Label>
                  <Form.Select
                    value={newAccountForm.currency}
                    onChange={handleFormFieldChange('currency')}
                  >
                    {CURRENCY_OPTIONS.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <div className="mt-3">
              <Form.Check
                type="switch"
                id="addAccountExclude"
                label={
                  <span className="d-inline-flex align-items-center">
                    Exclude from statistics
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip id="exclude-tip">Excluded accounts will not affect totals.</Tooltip>}
                    >
                      <span
                        className="text-muted ms-2"
                        role="button"
                        tabIndex={0}
                        style={{ lineHeight: 0, cursor: 'pointer' }}
                      >
                        <FaInfoCircle />
                      </span>
                    </OverlayTrigger>
                  </span>
                }
                checked={newAccountForm.excludeFromStatistics}
                onChange={handleExcludeToggle}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={handleCloseAddModal}>
              Cancel
            </Button>
            <Button type="submit" variant="success" disabled={!newAccountForm.name.trim()}>
              Create account
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Accounts;
