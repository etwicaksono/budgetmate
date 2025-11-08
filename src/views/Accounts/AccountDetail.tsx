import React, { useState, useMemo, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Tabs, Tab } from 'react-bootstrap';
import { FaArrowLeft } from 'react-icons/fa';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Swal from 'sweetalert2';
import { TransactionModal } from '../Transactions/TransactionModal';
import type {
  TransactionFormValues,
  TransactionModalSaveContext,
} from '../Transactions/TransactionModal';
import AddAccountModal from '../../components/AddAccountModal';
import type { NewAccountForm } from '../../components/AddAccountModal';
import type { Account } from './Accounts';
import { accountService } from '../../services/accountService';
import { RecordsHeader, RecordsList } from '../../components/Records';
import type { TransactionRecord, GroupedTransactions } from '../../types/transaction';
import { useBulkActionHandler } from '../../hooks/useBulkActionHandler';

interface BalanceData {
  date: string;
  balance: number;
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
  const [editingTransaction, setEditingTransaction] = useState<TransactionFormValues | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState<boolean>(false);
  const IconComponent = account.icon;

  // Fetch transactions when component mounts or account changes
  useEffect(() => {
    const fetchTransactions = async () => {
      setLoadingTransactions(true);
      try {
        const data = await accountService.fetchAccountTransactions(account.id, account.balance);
        setTransactions(data);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoadingTransactions(false);
      }
    };

    fetchTransactions();
  }, [account.id, account.balance]);

  // Group transactions by date
  const groupedTransactions = useMemo<GroupedTransactions>(() => {
    const grouped: GroupedTransactions = {};

    transactions.forEach((transaction) => {
      const dateObj = new Date(transaction.date);
      const dateKey = dateObj.toLocaleDateString('en-US', {
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

  const handleDelete = async (): Promise<void> => {
    const result = await Swal.fire({
      title: 'Delete Account?',
      html: `
        <div style="text-align: left;">
          <div style="background-color: #f8f9fa; padding: 1rem; border-radius: 0.375rem;">
            <div style="margin-bottom: 0.75rem;">
              <span style="color: #6c757d; font-size: 0.875rem;">Account Name</span>
              <p style="margin: 0.25rem 0 0 0; font-weight: 500; font-size: 1.1rem;">
                ${account.name}
              </p>
            </div>
            <div style="margin-bottom: 0.75rem;">
              <span style="color: #6c757d; font-size: 0.875rem;">Account Type</span>
              <p style="margin: 0.25rem 0 0 0; font-weight: 500;">
                ${account.type}
              </p>
            </div>
            <div>
              <span style="color: #6c757d; font-size: 0.875rem;">Current Balance</span>
              <p style="margin: 0.25rem 0 0 0; font-weight: 500;">
                ${formatCurrency(account.balance)}
              </p>
            </div>
          </div>
          <div style="margin-bottom: 1.5rem;">
            <p style="color: #6c757d; margin-bottom: 0;">
              You are about to permanently delete this account and all its associated data.
            </p>
            <p style="color: #dc3545; font-weight: 500; margin-bottom: 0.5rem;margin-top: 0.5rem">
              ⚠️ This action cannot be undone
            </p>
          </div>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Delete Account',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'delete-confirm-modal',
      },
    });

    if (result.isConfirmed) {
      try {
        // Show loading state
        Swal.fire({
          title: 'Deleting...',
          text: 'Please wait while we delete the account',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => {
            Swal.showLoading();
          },
        });

        // Call the delete API
        await accountService.deleteAccount(account.id);

        // Show success message
        await Swal.fire({
          icon: 'success',
          title: 'Account Deleted',
          text: 'The account has been successfully deleted',
          timer: 2000,
          showConfirmButton: false,
        });

        // Call the onDelete callback to update parent component
        onDelete(account.id);
      } catch (error) {
        console.error('Delete error:', error);
        // Show error message
        await Swal.fire({
          icon: 'error',
          title: 'Delete Failed',
          text: error instanceof Error ? error.message : 'Failed to delete account. Please try again.',
          confirmButtonColor: '#dc3545',
        });
      }
    }
  };

  const handleSelectRecord = (recordId: string): void => {
    setSelectedRecords((previousSelected) => {
      const nextSelected = new Set(previousSelected);
      if (nextSelected.has(recordId)) {
        nextSelected.delete(recordId);
      } else {
        nextSelected.add(recordId);
      }
      return nextSelected;
    });
  };

  const handleSelectAllRecords = (): void => {
    if (selectedRecords.size === transactions.length) {
      setSelectedRecords(new Set());
    } else {
      const allIds = new Set(transactions.map((t) => t.id));
      setSelectedRecords(allIds);
    }
  };

  const selectedCount = selectedRecords.size;
  const hasSelection = selectedCount > 0;
  const handleBulkAction = useBulkActionHandler({
    hasSelection,
    selectedCount,
    entityLabel: 'record',
  });

  const clearSelection = (): void => {
    setSelectedRecords(new Set());
  };

  const convertTransactionRecordToFormValues = (record: TransactionRecord): TransactionFormValues => {
    // Convert 12-hour time format to 24-hour for datetime-local input
    const convertTo24Hour = (time12h: string): string => {
      const match = time12h.match(/(\d{1,2}):(\d{2})\s?(AM|PM)/i);
      if (!match) return '00:00';

      let hours = parseInt(match[1]);
      const minutes = match[2];
      const period = match[3].toUpperCase();

      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      return `${hours.toString().padStart(2, '0')}:${minutes}`;
    };

    const time24h = convertTo24Hour(record.time);
    const dateTime = `${record.date}T${time24h}`;

    return {
      type: record.type === 'INCOME' ? 'Income' : 'Expense',
      description: record.description,
      amount: record.amount,
      currency: 'IDR',
      date: record.date,
      dateTime,
      category: record.categoryName,
      account: account.name, // Pre-populate with current account name
      labels: '',
      createTemplate: false,
      notes: '',
      payer: record.payer,
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

  const handleEditModalSave = (
    createAnother: boolean,
    context?: TransactionModalSaveContext
  ): void => {
    if (!editingTransaction) return;

    // TODO: Implement API call to save the transaction
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
                <RecordsHeader
                  selectedCount={selectedRecords.size}
                  totalCount={transactions.length}
                  allSelected={selectedRecords.size === transactions.length}
                  onSelectAll={handleSelectAllRecords}
                  onClearSelection={clearSelection}
                  onBulkEdit={() => handleBulkAction('edit')}
                  onBulkExport={() => handleBulkAction('export')}
                  onBulkDelete={() => handleBulkAction('delete')}
                  summaryText={formatCurrency(account.balance)}
                  showBulkActions={true}
                />

                {/* Records List */}
                <RecordsList
                  groupedTransactions={groupedTransactions}
                  selectedRecords={selectedRecords}
                  accountName={account.name}
                  onSelectRecord={handleSelectRecord}
                  onEditRecord={handleEditRecord}
                  formatCurrency={formatCurrency}
                  showCheckboxes={true}
                  showDropdownMenu={true}
                  showPayer={true}
                  showType={true}
                />
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
        isEditMode={Boolean(editingTransaction)}
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
    </Container>
  );
};

export default AccountDetail;
