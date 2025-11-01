import React, { useState, useMemo } from 'react';
import { Container, Row, Col, Card, Button, Tabs, Tab, Form, Dropdown, Modal } from 'react-bootstrap';
import { FaArrowLeft, FaEllipsisV } from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TransactionModal } from '../../features/transactions/TransactionModal';
import type { TransactionFormValues } from '../../features/transactions/TransactionModal';
import AddAccountModal from '../../components/AddAccountModal';
import type { NewAccountForm } from '../../components/AddAccountModal';
import type { Account } from './Accounts';

interface BalanceData {
  date: string;
  balance: number;
}

interface TransactionRecord {
  id: string;
  date: Date;
  category: string;
  categoryIcon?: string;
  subCategory?: string;
  description: string;
  amount: number;
  status: 'WANT' | 'NEED' | 'Credit' | 'Unknown';
  runningBalance: number;
  time: string;
}

interface GroupedTransactions {
  [dateString: string]: TransactionRecord[];
}

interface AccountDetailProps {
  account: Account;
  onBack: () => void;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string) => void;
}

// Generate mock balance history data (last 30 days)
const generateMockBalanceHistory = (currentBalance: number): BalanceData[] => {
  const data: BalanceData[] = [];
  const today = new Date();
  const variation = currentBalance * 0.05; // 5% variation

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dayOfMonth = date.getDate();
    const month = String(date.getMonth() + 1).padStart(2, '0');

    // Create realistic balance variation
    const randomVariation = (Math.random() - 0.5) * variation * 2;
    const balanceAtDate = currentBalance - randomVariation * (i / 30);

    data.push({
      date: `${dayOfMonth}/${month}`,
      balance: Math.max(0, Math.round(balanceAtDate)),
    });
  }

  return data;
};

// Generate mock transaction records
const generateMockTransactions = (currentBalance: number): TransactionRecord[] => {
  const categories = [
    { name: 'Loans, interests', icon: 'FaHandshake', subCategory: 'Ibuk Fatim' },
    { name: 'Missing', icon: 'FaQuestionCircle', subCategory: 'Unknown' },
    { name: 'Life events', icon: 'FaLeaf', subCategory: 'luran alumni Inayatullah' },
    { name: 'Charity, gifts', icon: 'FaGift', subCategory: 'Kondangan nikahan Danang' },
    { name: 'Fuel', icon: 'FaGasPump', subCategory: 'Pertalite heat' },
    { name: 'Food & Dining', icon: 'FaUtensils', subCategory: 'Restaurant' },
    { name: 'Transport', icon: 'FaTaxi', subCategory: 'Uber' },
  ];

  const statuses: Array<'WANT' | 'NEED' | 'Credit' | 'Unknown'> = ['WANT', 'NEED', 'Credit', 'Unknown'];
  const descriptions = [
    'Payment to friend',
    'Monthly subscription',
    'Shopping',
    'Transfer to savings',
    'Salary deposit',
    'Refund',
    'Invoice payment',
  ];

  const transactions: TransactionRecord[] = [];
  let runningBalance = currentBalance;
  const today = new Date();

  // Generate transactions for the last 30 days
  for (let i = 0; i < 50; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);

    const category = categories[Math.floor(Math.random() * categories.length)];
    const amount = Math.floor(Math.random() * 500000) + 10000;
    const isExpense = Math.random() > 0.3; // 70% expenses, 30% income
    const finalAmount = isExpense ? -amount : amount;

    const hours = Math.floor(Math.random() * 24);
    const minutes = Math.floor(Math.random() * 60);
    const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    runningBalance += finalAmount;

    transactions.push({
      id: `trans-${i}`,
      date,
      category: category.name,
      categoryIcon: category.icon,
      subCategory: category.subCategory,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      amount: finalAmount,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      runningBalance,
      time,
    });
  }

  // Sort by date descending (most recent first)
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
};

const AccountDetail: React.FC<AccountDetailProps> = ({
  account,
  onBack,
  onEdit,
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState<string>('balance');
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAccountEditModal, setShowAccountEditModal] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionFormValues | null>(null);
  const IconComponent = account.icon;

  // Generate and memoize transactions
  const transactions = useMemo(
    () => generateMockTransactions(account.balance),
    [account.balance]
  );

  // Group transactions by date
  const groupedTransactions = useMemo<GroupedTransactions>(() => {
    const grouped: GroupedTransactions = {};

    transactions.forEach((transaction) => {
      const dateKey = transaction.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(transaction);
    });

    return grouped;
  }, [transactions]);

  // Calculate balance change compared to 30 days ago
  const balanceHistory = useMemo(
    () => generateMockBalanceHistory(account.balance),
    [account.balance]
  );

  const previousBalance = balanceHistory[0]?.balance ?? account.balance;
  const currentBalance = account.balance;
  const balanceChange = currentBalance - previousBalance;
  const balanceChangePercent =
    previousBalance !== 0
      ? ((balanceChange / previousBalance) * 100).toFixed(0)
      : '0';

  const formatCurrency = (value: number): string => {
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));

    return `${value < 0 ? '-' : ''}IDR ${formatted}`;
  };

  const handleDelete = (): void => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = (): void => {
    setShowDeleteConfirm(false);
    onDelete(account.id);
  };

  const handleSelectRecord = (recordId: string): void => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(recordId)) {
      newSelected.delete(recordId);
    } else {
      newSelected.add(recordId);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAllRecords = (): void => {
    if (selectedRecords.size === transactions.length) {
      setSelectedRecords(new Set());
    } else {
      const allIds = new Set(transactions.map((t) => t.id));
      setSelectedRecords(allIds);
    }
  };

  const resolveIconComponent = (
    iconName?: string
  ): React.ComponentType<{ size?: number }> | undefined => {
    if (!iconName) return undefined;
    const iconsLibrary = FaIcons as unknown as Record<string, React.ComponentType<{ size?: number }>>;
    const IconComp = iconsLibrary[iconName];
    return IconComp ? (IconComp as React.ComponentType<{ size?: number }>) : undefined;
  };

  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'WANT':
        return 'success';
      case 'NEED':
        return 'info';
      case 'Credit':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  const handleBulkEdit = (): void => {
    // TODO: Implement bulk edit functionality
    console.log(`Editing ${selectedRecords.size} records`);
  };

  const handleBulkExport = (): void => {
    // TODO: Implement bulk export functionality
    console.log(`Exporting ${selectedRecords.size} records`);
  };

  const handleBulkDelete = (): void => {
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedRecords.size} record(s)?`
      )
    ) {
      // TODO: Implement bulk delete functionality
      console.log(`Deleting ${selectedRecords.size} records`);
      setSelectedRecords(new Set());
    }
  };

  const clearSelection = (): void => {
    setSelectedRecords(new Set());
  };

  const convertTransactionRecordToFormValues = (record: TransactionRecord): TransactionFormValues => {
    const dateTime = record.date.toISOString().slice(0, 16);
    const date = record.date.toISOString().slice(0, 10);

    return {
      type: record.amount < 0 ? 'Expense' : 'Income', // Determine type from amount
      description: record.description,
      amount: Math.abs(record.amount),
      currency: 'IDR',
      date,
      dateTime,
      category: record.category,
      account: account.name, // Pre-populate with current account name
      labels: '',
      createTemplate: false,
      notes: `${record.subCategory || ''}`,
      payer: '',
      paymentType: 'Cash',
      paymentStatus: 'Cleared',
    };
  };

  const handleEditRecord = (record: TransactionRecord): void => {
    const formValues = convertTransactionRecordToFormValues(record);
    setEditingTransaction(formValues);
    setShowEditModal(true);
  };

  const convertAccountToForm = (acc: Account): NewAccountForm => {
    return {
      name: acc.name,
      color: acc.accentColor,
      accountType: acc.type,
      initialAmount: acc.balance.toString(),
      currency: acc.currency || 'IDR',
      excludeFromStatistics: acc.excludeFromStatistics || false,
      iconKey: acc.iconKey || 'FaWallet',
      isActive: acc.isActive !== false,
      usability: acc.usability || 'USABLE',
    };
  };

  const handleEditAccount = (): void => {
    // Open the account edit modal
    setShowAccountEditModal(true);
  };

  const handleAccountEditSubmit = (form: NewAccountForm): void => {
    // TODO: Implement API call to update the account
    console.log('Updating account:', form);
    setShowAccountEditModal(false);
  };

  const handleEditModalChange = (event: any): void => {
    if (!editingTransaction) return;

    const { name, value, checked, type: inputType } = event.target;

    setEditingTransaction((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        [name]: inputType === 'checkbox' ? checked : value,
      };
    });
  };

  const handleEditModalSave = (createAnother: boolean): void => {
    if (!editingTransaction) return;

    // TODO: Implement API call to save the transaction
    console.log('Saving transaction:', editingTransaction);
    setShowEditModal(false);
    setEditingTransaction(null);

    if (!createAnother) {
      // Close modal
    }
  };

  return (
    <Container className="account-detail-page" fluid>
      {/* Header Card containing title and account info rows */}
      <div className="account-detail-header">
        {/* Row 1: Back button and title */}
        <div className="account-detail-header__title-row">
          <div className="account-detail-header__title-left">
            <Button
              variant="light"
              className="account-detail-header__back-btn"
              onClick={onBack}
            >
              <FaArrowLeft size={18} />
            </Button>
            <h2 className="account-detail-header__title">Account Detail</h2>
          </div>
          <div className="account-detail-header__actions">
            <Button
              variant="secondary"
              className="account-detail-header__edit-btn"
              onClick={handleEditAccount}
            >
              Edit
            </Button>
            <Button
              variant="danger"
              className="account-detail-header__delete-btn"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Row 2: Account Info (Icon, Name, Type) */}
        <div className="account-detail-header__info-row">
          <div className="account-detail-header__icon-section">
            <div
              className="account-detail__icon"
              style={{
                backgroundColor: account.backgroundColor,
                color: account.accentColor,
              }}
            >
              <IconComponent size={32} />
            </div>
            <div className="account-detail__info">
              <div className="account-detail__info-group">
                <span className="account-detail__label">Name</span>
                <h3 className="account-detail__name">{account.name}</h3>
              </div>
              <div className="account-detail__info-group">
                <span className="account-detail__label">Type</span>
                <p className="account-detail__type">{account.type}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Separated Tabs Card */}
      <Card className="account-detail-tabs-card">
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k || 'balance')}
          className="account-detail__tabs"
        >
          <Tab eventKey="balance" title="Balance">
            <Card className="account-detail-card">
              <Card.Body>
                {/* Balance Information */}
                <div className="account-detail-balance-info">
                  <div className="account-detail-balance-item">
                    <span className="account-detail-balance-label">Today</span>
                    <strong className="account-detail-balance-amount">
                      {formatCurrency(currentBalance)}
                    </strong>
                  </div>
                  <div className="account-detail-balance-item">
                    <span className="account-detail-balance-label">
                      vs previous period
                    </span>
                    <strong
                      className={`account-detail-balance-change ${
                        balanceChange >= 0
                          ? 'account-detail-balance-change--positive'
                          : 'account-detail-balance-change--negative'
                      }`}
                    >
                      {balanceChange >= 0 ? '+' : ''}{balanceChangePercent}%
                    </strong>
                  </div>
                </div>

                {/* Balance Chart */}
                <div className="account-detail-chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={balanceHistory}
                      margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e0e0e0"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12, fill: '#666' }}
                        stroke="#ddd"
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#666' }}
                        stroke="#ddd"
                        width={50}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: `1px solid ${account.accentColor}`,
                          borderRadius: '4px',
                        }}
                        formatter={(value) => formatCurrency(value as number)}
                      />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        stroke={account.accentColor}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card.Body>
            </Card>
          </Tab>

          <Tab eventKey="records" title="Records">
            <Card className="account-detail-card">
              <Card.Body className="account-detail-records">
                {/* Records Header */}
                {selectedRecords.size > 0 ? (
                  <div className="account-detail-records__header account-detail-records__header--active">
                    <div className="account-detail-records__info">
                      <Form.Check
                        className="account-detail-records__select-all"
                        type="checkbox"
                        id="select-all-records"
                        checked={selectedRecords.size === transactions.length && transactions.length > 0}
                        onChange={handleSelectAllRecords}
                        label={`Selected ${selectedRecords.size} item(s)`}
                      />
                    </div>
                    <div className="account-detail-records__bulk-actions">
                      <Button
                        variant="success"
                        size="sm"
                        className="account-detail-records__bulk-btn"
                        onClick={handleBulkEdit}
                      >
                        Edit ({selectedRecords.size})
                      </Button>
                      <Button
                        variant="info"
                        size="sm"
                        className="account-detail-records__bulk-btn"
                        onClick={handleBulkExport}
                      >
                        Export ({selectedRecords.size})
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        className="account-detail-records__bulk-btn"
                        onClick={handleBulkDelete}
                      >
                        Delete ({selectedRecords.size})
                      </Button>
                    </div>
                    <div className="account-detail-records__header-close">
                      <Button
                        variant="link"
                        className="account-detail-records__header-close-btn"
                        onClick={clearSelection}
                      >
                        ✕
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="account-detail-records__header">
                    <div className="account-detail-records__info">
                      <Form.Check
                        className="account-detail-records__select-all"
                        type="checkbox"
                        id="select-all-records"
                        checked={selectedRecords.size === transactions.length && transactions.length > 0}
                        onChange={handleSelectAllRecords}
                        label={`Found ${transactions.length} records`}
                      />
                    </div>
                    <div className="account-detail-records__summary">
                      <span className="account-detail-records__total">
                        {formatCurrency(account.balance)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Records List */}
                <div className="account-detail-records__list">
                  {Object.entries(groupedTransactions).length > 0 ? (
                    Object.entries(groupedTransactions).map(([dateKey, dayTransactions]) => (
                      <div key={dateKey} className="account-detail-records__day-group">
                        <div className="account-detail-records__day-header">
                          <h4>{dateKey}</h4>
                          <span className="account-detail-records__day-balance">
                            {formatCurrency(dayTransactions[0]?.runningBalance ?? 0)}
                          </span>
                        </div>

                        <div className="account-detail-records__transactions">
                          {dayTransactions.map((transaction) => {
                            const CategoryIcon = resolveIconComponent(transaction.categoryIcon);
                            const isSelected = selectedRecords.has(transaction.id);

                            return (
                              <div
                                key={transaction.id}
                                className={`account-detail-records__item ${
                                  isSelected ? 'account-detail-records__item--selected' : ''
                                }`}
                                onClick={() => handleEditRecord(transaction)}
                                style={{ cursor: 'pointer' }}
                              >
                                <div
                                  className="account-detail-records__item-checkbox"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Form.Check
                                    type="checkbox"
                                    id={transaction.id}
                                    checked={isSelected}
                                    onChange={() => handleSelectRecord(transaction.id)}
                                  />
                                </div>

                                <div className="account-detail-records__item-icon">
                                  {CategoryIcon ? (
                                    <CategoryIcon size={20} />
                                  ) : (
                                    <span>📦</span>
                                  )}
                                </div>

                                <div className="account-detail-records__item-details">
                                  <div className="account-detail-records__item-category">
                                    {transaction.category}
                                  </div>
                                  <div className="account-detail-records__item-info">
                                    <span className="account-detail-records__item-subcategory">
                                      {transaction.subCategory || transaction.description}
                                    </span>
                                    <span className="account-detail-records__item-account">
                                      • {account.name}
                                    </span>
                                  </div>
                                </div>

                                <div className="account-detail-records__item-description">
                                  {transaction.description}
                                </div>

                                <div className="account-detail-records__item-status">
                                  <span
                                    className={`account-detail-records__badge account-detail-records__badge--${getStatusBadgeColor(
                                      transaction.status
                                    )}`}
                                  >
                                    {transaction.status}
                                  </span>
                                </div>

                                <div className="account-detail-records__item-amount">
                                  <strong
                                    className={`${
                                      transaction.amount < 0
                                        ? 'account-detail-records__amount--negative'
                                        : 'account-detail-records__amount--positive'
                                    }`}
                                  >
                                    {formatCurrency(transaction.amount)}
                                  </strong>
                                  <span className="account-detail-records__item-time">
                                    {transaction.time}
                                  </span>
                                </div>

                                <div
                                  className="account-detail-records__item-actions"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Dropdown>
                                    <Dropdown.Toggle
                                      variant="link"
                                      className="account-detail-records__menu-btn"
                                      id={`menu-${transaction.id}`}
                                    >
                                      <FaEllipsisV size={16} />
                                    </Dropdown.Toggle>

                                    <Dropdown.Menu align="end">
                                      <Dropdown.Item
                                        className="account-detail-records__menu-item"
                                        onClick={() => handleEditRecord(transaction)}
                                      >
                                        Edit
                                      </Dropdown.Item>
                                      <Dropdown.Divider />
                                      <Dropdown.Item
                                        className="account-detail-records__menu-item account-detail-records__menu-item--danger"
                                      >
                                        Delete
                                      </Dropdown.Item>
                                    </Dropdown.Menu>
                                  </Dropdown>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="account-detail-empty-state">
                      <p>No records found</p>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </Card>

      {/* Transaction Edit Modal */}
      {/* When editing a transaction, the modal opens with:
          - Account field pre-populated with current account name (read-only in dropdown)
          - All transaction details from the selected record
          - Available categories loaded from API
      */}
      <TransactionModal
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setEditingTransaction(null);
        }}
        transaction={editingTransaction}
        onChange={handleEditModalChange}
        onSave={handleEditModalSave}
        availableAccounts={[account.name]}
        availableCategories={[]}
      />

      {/* Account Edit Modal */}
      {/* When editing an account, the modal opens with:
          - All account details pre-populated from the current account
          - Name, color, type, icon, and other settings editable
      */}
      <AddAccountModal
        show={showAccountEditModal}
        onHide={() => setShowAccountEditModal(false)}
        onSubmit={handleAccountEditSubmit}
        title="Edit Account"
        initialValue={convertAccountToForm(account)}
        accountId={account.id}
        isEditMode={true}
      />

      {/* Delete Confirmation Modal */}
      {/* Shows account details and warning before permanent deletion */}
      <Modal
        show={showDeleteConfirm}
        onHide={() => setShowDeleteConfirm(false)}
        centered
        backdrop="static"
        className="delete-confirm-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Account?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="delete-confirm-content">
            <div className="delete-confirm-warning" style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: '#dc3545', fontWeight: '500', marginBottom: '0.5rem' }}>
                ⚠️ This action cannot be undone
              </p>
              <p style={{ color: '#6c757d', marginBottom: 0 }}>
                You are about to permanently delete this account and all its associated data.
              </p>
            </div>

            <div className="delete-confirm-details" style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>Account Name</span>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: '500', fontSize: '1.1rem' }}>
                  {account.name}
                </p>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>Account Type</span>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: '500' }}>
                  {account.type}
                </p>
              </div>
              <div>
                <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>Current Balance</span>
                <p style={{ margin: '0.25rem 0 0 0', fontWeight: '500' }}>
                  {formatCurrency(account.balance)}
                </p>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            Delete Account
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default AccountDetail;
