'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Container, Card, Button, Nav, Spinner } from 'react-bootstrap';
import { FaChevronLeft } from 'react-icons/fa';
import Swal from 'sweetalert2';

import { accountService, type Account } from '@/services/accountService';
import { analyticsService, type BalanceTrendResponse } from '@/services/analyticsService';
import { transactionService, type Transaction } from '@/services/transactionService';

import { useFormattedCurrency } from '@/hooks/useFormattedCurrency';
import { useAccountModal } from '@/hooks/useAccountModal';
import { useFilterData } from '@/hooks/useFilterData';

import AccountModal from '@/components/accounts/AccountModal';
import { BalanceTrendChart } from '@/components/widgets/BalanceTrendChart';
import { RecordsHeader, RecordsList, RecordsSkeleton, type GroupedTransactions, type TransactionRecord } from '@/components/Records';
import PeriodNavigation, { PeriodNavigationProvider, usePeriodNavigation } from '@/components/period/PeriodNavigation';
import PeriodRangeSelector from '@/components/period/PeriodRangeSelector';
import { isTransferTransaction } from '@/utils/transferUtils';
import { useTransactionActions } from '@/hooks/useTransactionActions';

import {
  FaWallet,
  FaUniversity,
  FaPiggyBank,
  FaCreditCard,
  FaMoneyBillWave,
  FaChartLine,
  FaGift,
  FaShieldAlt,
  FaHandHoldingUsd,
  FaHome,
  FaExclamationTriangle,
} from 'react-icons/fa';
import type { IconType } from 'react-icons';

import '../Accounts.css'; // Reuse styles from accounts

const getIconComponent = (iconName: string): IconType => {
  const iconMap: Record<string, IconType> = {
    FaWallet, FaUniversity, FaPiggyBank, FaCreditCard, FaMoneyBillWave,
    FaChartLine, FaGift, FaShieldAlt, FaHandHoldingUsd, FaHome, FaExclamationTriangle,
  };
  return iconMap[iconName] || FaWallet;
};

const lightenColor = (color: string, percent = 85): string => {
  if (!color) return '#f8f9fa';
  const num = parseInt(color.replace('#', ''), 16);
  if (isNaN(num)) return '#f8f9fa';
  const r = Math.min(255, Math.floor(((num >> 16) + 255 * (percent / 100)) / (1 + percent / 100)));
  const g = Math.min(255, Math.floor((((num >> 8) & 0x00ff) + 255 * (percent / 100)) / (1 + percent / 100)));
  const b = Math.min(255, Math.floor(((num & 0x0000ff) + 255 * (percent / 100)) / (1 + percent / 100)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

// --- Sub-components ---

// Balance Tab Component
const BalanceTab = ({ accountId }: { accountId: string }) => {
  const [data, setData] = useState<BalanceTrendResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await analyticsService.fetchBalanceTrend({ account_ids: [accountId] });
        setData(res);
      } catch (err) {
        console.error('Failed to fetch balance trend:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [accountId]);

  if (loading) {
    return (
      <div className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (!data || !data.chartData || data.chartData.length === 0) {
    return <div className="py-5 text-center text-muted">No balance history available.</div>;
  }

  return (
    <Card className="shadow-sm border-0 mt-3 p-3">
      <div className="d-flex justify-content-between mb-3 text-muted" style={{ fontSize: '0.9rem' }}>
        <div>
          <div>{data.periodLabel || 'Today'}</div>
        </div>
        <div>
          <div>VS Previous Period</div>
          <div className={data.percentChange >= 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 'bold', background: data.percentChange >= 0 ? '#d4edda' : '#f8d7da', padding: '2px 8px', borderRadius: '12px', display: 'inline-block' }}>
            {data.percentChange >= 0 ? '↑' : '↓'} {Math.abs(data.percentChange)}%
          </div>
        </div>
      </div>
      <BalanceTrendChart 
        data={data.chartData as import('@/components/widgets/BalanceTrendChart').TrendChartData[]} 
        totalBalance={data.totalBalance}
        percentChange={data.percentChange}
        showSummary={false} 
        height={300} 
      />
    </Card>
  );
};

// Records Tab Component
const RecordsTab = ({ accountId }: { accountId: string }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [isGlobalSelectAll, setIsGlobalSelectAll] = useState(false);
  const netTotal = useMemo(() => transactions.reduce((sum, transaction) => sum + transaction.amount, 0), [transactions]);
  const selectedNetTotal = useMemo(() => {
    if (selectedTransactionIds.size > 0 && !isGlobalSelectAll) {
      return transactions
        .filter(transaction => selectedTransactionIds.has(transaction.id))
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    }

    return netTotal;
  }, [transactions, selectedTransactionIds, isGlobalSelectAll, netTotal]);

  const { formatCurrency } = useFormattedCurrency();
  const { parentCategoryColors, categoryTree } = useFilterData();
  const { state: { dateRange, periodLabel, activePeriod, customRangeDraft } } = usePeriodNavigation();

  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchTransactions = useCallback(async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setIsLoadingMore(true);

      const startDateTime = dateRange.start ? new Date(dateRange.start + 'T00:00:00').toISOString() : undefined;
      const endDateTime = dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined;

      const filters: import('@/services/transactionService').TransactionFilters = { account_id: accountId, page: pageNum };
      if (startDateTime) filters.start_date = startDateTime;
      if (endDateTime) filters.end_date = endDateTime;

      const result = await transactionService.fetchTransactions(filters);

      if (pageNum === 1) {
        setTransactions(result.transactions);
        setTotalRecords(result.meta.total || 0);
      } else {
        setTransactions(prev => [...prev, ...result.transactions]);
      }

      const totalPages = result.meta.totalPages || result.meta.total_pages || 1;
      setHasMore(result.meta.page < totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      if (pageNum === 1) setLoading(false);
      else setIsLoadingMore(false);
    }
  }, [accountId, dateRange.start, dateRange.end]);

  useEffect(() => {
    fetchTransactions(1);
  }, [fetchTransactions]);

  // Listen for transaction updates
  useEffect(() => {
    const handleUpdate = () => fetchTransactions(1);
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, [fetchTransactions]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const firstEntry = entries[0];
      if (firstEntry?.isIntersecting && hasMore && !loading && !isLoadingMore) {
        fetchTransactions(page + 1);
      }
    }, { threshold: 0.1, rootMargin: '400px' });

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => { if (currentTarget) observer.unobserve(currentTarget); };
  }, [observerTarget, hasMore, loading, isLoadingMore, page, fetchTransactions]);

  const groupedTransactions = useMemo<GroupedTransactions>(() => {
    const grouped: GroupedTransactions = {};
    transactions.forEach((transaction) => {
      const date = new Date(transaction.date);
      const dateKey = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

      const isTransfer = isTransferTransaction(transaction);
      let categoryColor = '#6c757d';
      let categoryName = 'Uncategorized';
      let categoryIcon = transaction.category?.icon;

      if (isTransfer) {
        categoryName = 'Transfer';
        categoryIcon = 'FaExchangeAlt';
        categoryColor = '#17a2b8';
      } else {
        categoryName = transaction.category?.name || 'Uncategorized';
        categoryColor = parentCategoryColors[categoryName] || '#6c757d';
        if (categoryColor === '#6c757d') {
          for (const [parent, children] of Object.entries(categoryTree)) {
            if (children.includes(categoryName)) {
              categoryColor = parentCategoryColors[parent] || '#6c757d';
              break;
            }
          }
        }
      }

      if (transaction.type === 'debt_in' || transaction.type === 'debt_out') {
        categoryName = transaction.category?.name || 'Debt';
        categoryIcon = 'FaHandshake';
        categoryColor = transaction.type === 'debt_in' ? '#059669' : '#dc3545';
      }

      const record = {
        id: transaction.id,
        date: dateKey,
        time,
        categoryName,
        categoryIcon,
        categoryIconColor: categoryColor,
        accountName: transaction.account?.name || 'Unknown',
        description: transaction.description || 'No description',
        payer: transaction.payee,
        amount: transaction.amount,
        type: isTransfer ? 'TRANSFER' : (transaction.type === 'debt_in' ? 'DEBT_IN' : transaction.type === 'debt_out' ? 'DEBT_OUT' : transaction.type === 'income' ? 'INCOME' : 'EXPENSE'),
        debt_id: transaction.debt_id,
        labels: transaction.labels || [],
      } as TransactionRecord;

      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(record);
    });
    return grouped;
  }, [transactions, parentCategoryColors, categoryTree]);

  const handleSelectRecord = useCallback((recordId: string) => {
    setSelectedTransactionIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) { newSet.delete(recordId); setIsGlobalSelectAll(false); }
      else { newSet.add(recordId); }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedTransactionIds.size === transactions.length) {
      setSelectedTransactionIds(new Set());
      setIsGlobalSelectAll(false);
    } else {
      setSelectedTransactionIds(new Set(transactions.map((t) => t.id)));
    }
  }, [selectedTransactionIds.size, transactions]);
  
  const { handleEditRecord, handleDeleteRecord } = useTransactionActions({
    transactions,
  });

  const formatNetTotal = useCallback((net: number) => {
    const formatted = formatCurrency(Math.abs(net));
    return `${net > 0 ? '+' : net < 0 ? '-' : ''}${formatted}`;
  }, [formatCurrency]);

  return (
    <>
      <div className="d-flex justify-content-center align-items-center mb-3 mt-3">
        <PeriodNavigation>
          <PeriodRangeSelector label={periodLabel} activePeriod={activePeriod} customRange={customRangeDraft} />
        </PeriodNavigation>
      </div>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {loading ? (
            <div className="py-2"><RecordsSkeleton /></div>
          ) : (
            <>
              <div className="border-bottom bg-white" style={{ position: 'sticky', top: 'calc(var(--navbar-height, 73px) - 1px)', zIndex: 1010 }}>
                <RecordsHeader
                  selectedCount={selectedTransactionIds.size}
                  totalCount={totalRecords}
                  allSelected={selectedTransactionIds.size > 0 && selectedTransactionIds.size === transactions.length}
                  onSelectAll={handleSelectAll}
                  onBulkEdit={() => {}} 
                  onBulkExport={() => {}} 
                  onBulkDelete={() => {}} 
                  summaryText={formatNetTotal(selectedNetTotal)}
                  showBulkActions
                  isGlobalSelectAll={isGlobalSelectAll}
                  onSelectGlobal={setIsGlobalSelectAll}
                />
              </div>
              <RecordsList
                groupedTransactions={groupedTransactions}
                selectedRecords={selectedTransactionIds}
                onSelectRecord={handleSelectRecord}
                onEditRecord={handleEditRecord}
                onDeleteRecord={handleDeleteRecord}
                showCheckboxes
                showDropdownMenu
              />
              {hasMore && (
                <div ref={observerTarget} className="py-4 text-center">
                  {isLoadingMore ? <Spinner size="sm" animation="border" /> : <span className="text-muted small">Scroll to load more</span>}
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </>
  );
};


// --- Main Page Component ---
export default function AccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = typeof params?.['id'] === 'string' ? params['id'] : '';
  
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'balance' | 'records'>('balance');

  const accountModal = useAccountModal(async () => {
    fetchAccountData(); // Refresh after edit
  });

  const fetchAccountData = useCallback(async () => {
    if (!accountId) return;
    try {
      setLoading(true);
      const data = await accountService.fetchAccountById(accountId);
      setAccount(data);
    } catch (err) {
      console.error('Failed to fetch account:', err);
      // Fallback: they might be offline or it's a test. Handle error gracefully hook?
      Swal.fire({
        icon: 'error',
        title: 'Not Found',
        text: 'Account not found or failed to load.',
        confirmButtonText: 'Go Back'
      }).then(() => router.back());
    } finally {
      setLoading(false);
    }
  }, [accountId, router]);

  useEffect(() => {
    fetchAccountData();
  }, [fetchAccountData]);

  const handleDelete = async () => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Account',
      text: `Are you sure you want to delete ${account?.name}?`,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      confirmButtonColor: '#dc3545',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        await accountService.deleteAccount(accountId);
        await Swal.fire({ icon: 'success', title: 'Deleted', timer: 1500, showConfirmButton: false });
        router.push('/accounts');
      } catch (_err) {
        Swal.fire({ icon: 'error', title: 'Failed to delete account' });
      }
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (!account) return null;

  const IconComponent = getIconComponent(account.icon);
  const bgColor = lightenColor(account.color);

  return (
    <Container fluid className="p-2 p-md-4">
      <Card className="shadow-sm border-0 mb-4">
        <Card.Body className="p-3 p-md-4">
          {/* Header Row */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
            <h4 className="mb-0 fw-bold d-flex align-items-center">
              <Button variant="link" onClick={() => router.back()} className="text-dark p-0 me-3 text-decoration-none" style={{ display: 'flex', alignItems: 'center' }}>
                <FaChevronLeft size={16} />
              </Button>
              Account Detail
            </h4>
            <div className="d-flex gap-2 w-100 w-sm-auto mt-2 mt-sm-0">
               <Button variant="outline-primary" className="rounded-pill px-4 flex-grow-1 flex-sm-grow-0" onClick={() => accountModal.openEditModal(account)}>
                 Edit
               </Button>
               <Button variant="outline-danger" className="rounded-pill px-4 flex-grow-1 flex-sm-grow-0" onClick={handleDelete}>
                 Delete
               </Button>
            </div>
          </div>

          {/* Account Info Profile */}
          <div className="d-flex align-items-center mb-4 pb-3 border-bottom">
            <div 
              style={{ 
                width: '64px', height: '64px', 
                backgroundColor: bgColor, color: account.color, 
                borderRadius: '12px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginRight: '16px'
              }}
            >
              <IconComponent size={32} />
            </div>
            <div>
              <div className="text-muted small mb-1">Name</div>
              <div className="fw-bold" style={{ fontSize: '1.1rem' }}>{account.name}</div>
              <div className="text-muted small mt-2 mb-1">Type</div>
              <div className="fw-bold" style={{ fontSize: '0.9rem' }}>{account.account_type.charAt(0).toUpperCase() + account.account_type.slice(1)}</div>
            </div>
          </div>

          {/* Tabs */}
          <Nav variant="tabs" className="border-bottom">
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'balance'} 
                onClick={() => setActiveTab('balance')}
                className={`py-3 px-4 ${activeTab === 'balance' ? 'border-bottom border-primary border-3 fw-bold text-dark' : 'text-muted border-0'}`}
              >
                Balance
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'records'} 
                onClick={() => setActiveTab('records')}
                className={`py-3 px-4 ${activeTab === 'records' ? 'border-bottom border-primary border-3 fw-bold text-dark' : 'text-muted border-0'}`}
              >
                Records
              </Nav.Link>
            </Nav.Item>
          </Nav>
        </Card.Body>
      </Card>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'balance' && <BalanceTab accountId={accountId} />}
        {activeTab === 'records' && (
          <PeriodNavigationProvider>
            <RecordsTab accountId={accountId} />
          </PeriodNavigationProvider>
        )}
      </div>

      {accountModal.showModal && (
        <AccountModal
          show={accountModal.showModal}
          onHide={accountModal.closeModal}
          onSave={accountModal.saveAccount}
          mode={accountModal.modalMode}
          initialData={accountModal.initialData}
        />
      )}
    </Container>
  );
}
