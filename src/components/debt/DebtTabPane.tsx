'use client';

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { FaHandshake, FaPlus } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { debtService, Debt } from '@/services/debtService';
import { DEBT_STATUSES } from '@/utils/constants';
import { useDebt } from '@/contexts/DebtContext';
import { DebtCard } from './DebtCard';
import { DebtSkeleton } from './DebtSkeleton';
import { DebtDetailModal } from './DebtDetailModal';

const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export interface DebtTabPaneProps {
  debtType: 'lend' | 'borrow';
  statusFilter: string;
  counterpartyFilter: string;
  sortBy: string;
  sortOrder: string;
  onMutated: () => void;
  totalAmount: number;
  onStateChange?: (loading: boolean, count: number) => void;
}

export interface DebtTabPaneHandle {
  openNewDebtModal: () => void;
}

export const DebtTabPane = forwardRef<DebtTabPaneHandle, DebtTabPaneProps>(({
  debtType,
  statusFilter,
  counterpartyFilter,
  sortBy,
  sortOrder,
  onMutated,
  onStateChange
}, ref) => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Modals
  const { openAddDebtModal, openEditDebtModal, openRepaymentModal, openIncreaseModal } = useDebt();

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null);

  const fetchDebts = useCallback(async (isLoadMore = false, quiet = false) => {
    try {
      if (!isLoadMore && !quiet) setIsLoading(true);
      setError(null);

      const targetPage = isLoadMore ? page + 1 : 1;

      const response = await debtService.fetchDebts({
        page: targetPage,
        limit: 20,
        type: debtType,
        status: statusFilter && statusFilter !== 'all' ? statusFilter : undefined,
        counterparty: counterpartyFilter || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
      } as any);

      if (isLoadMore) {
        setDebts(prev => [...prev, ...response.data]);
      } else {
        setDebts(response.data);
      }

      setPage(response.meta.page);
      setHasMore(response.meta.page < response.meta.total_pages);
    } catch (err: any) {
      setError(err.message || 'Failed to load debts');
    } finally {
      setIsLoading(false);
    }
  }, [debtType, statusFilter, counterpartyFilter, sortBy, sortOrder, page]);

  useImperativeHandle(ref, () => ({
    openNewDebtModal: handleOpenNewDebt
  }));

  useEffect(() => {
    if (onStateChange) {
      onStateChange(isLoading, debts.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, debts.length]);

  // Re-fetch from page 1 whenever filters or type change
   
  useEffect(() => {
    fetchDebts();
    // intentionally omitting `page` so this only triggers on filter/type changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtType, statusFilter, counterpartyFilter, sortBy, sortOrder]);

  // Listen to global events for refresh
  useEffect(() => {
    const handleDebtMutated = async () => {
      fetchDebts(false, true);
      onMutated();

      // Refresh detail modal if open
      if (showDetailModal && detailDebt) {
        try {
          const updated = await debtService.getDebtById(detailDebt.id);
          setDetailDebt(updated);
        } catch (err) {
          console.error('Failed to refresh detail modal', err);
        }
      }
    };
    
    window.addEventListener('debt-mutated', handleDebtMutated);
    return () => window.removeEventListener('debt-mutated', handleDebtMutated);
  }, [fetchDebts, onMutated, showDetailModal, detailDebt]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenNewDebt = () => {
    openAddDebtModal(debtType);
  };

  const handleOpenEditDebt = (debt: Debt) => {
    openEditDebtModal(debt);
  };

  const handleOpenDetail = (debt: Debt) => {
    setDetailDebt(debt);
    setShowDetailModal(true);
  };

  const handleOpenRepay = (debt: Debt) => {
    if (debt.status !== DEBT_STATUSES.ACTIVE) return;
    openRepaymentModal(debt);
  };

  const handleOpenIncrease = (debt: Debt) => {
    openIncreaseModal(debt);
  };

  const handleEditTransactionClick = (debt: Debt, transaction: any, isIncrease: boolean) => {
    if (isIncrease) {
      openIncreaseModal(debt, transaction);
    } else {
      openRepaymentModal(debt, transaction);
    }
  };

  const handleDeleteDebt = async (debt: Debt) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Debt',
      html: `
        <p>Are you sure you want to delete this debt?</p>
        <div class="text-start mt-3 border p-2 rounded bg-light">
          <strong>${debt.type === 'lend' ? 'Lend to' : 'Borrow from'} ${debt.counterparty}</strong><br>
          <small class="text-muted">Will also delete all associated transactions and repayments.</small>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        setIsLoading(true);
        await debtService.deleteDebt(debt.id);
        Toast.fire({ icon: 'success', title: 'Debt deleted' });
        fetchDebts(false, true);
        onMutated();
        if (detailDebt && detailDebt.id === debt.id) setShowDetailModal(false);
      } catch (err: any) {
        Toast.fire({ icon: 'error', title: err.message || 'Failed to delete debt' });
      } finally {
        setIsLoading(false);
      }
    }
  };


  return (
    <>
      <Row>
        <Col xs={12}>
          <Card className="border-0 shadow-sm debt-tab-panel">
            <Card.Body className="p-0">
              {isLoading && debts.length === 0 ? (
                <div className="py-2">
                  <DebtSkeleton />
                </div>
              ) : error ? (
                <div className="alert alert-danger m-3">{error}</div>
              ) : debts.length === 0 ? (
                <div className="text-center py-5 my-5">
                  <div
                    className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
                    style={{ width: '80px', height: '80px' }}
                  >
                    <FaHandshake size={32} style={{ color: '#94a3b8' }} />
                  </div>
                  <h3 className="fw-bold text-dark mb-2">
                    No {debtType === 'lend' ? 'credits' : 'debits'} found
                  </h3>
                  <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '400px' }}>
                    {debtType === 'lend'
                      ? "Track money you've lent to others. Add your first credit record to get started."
                      : "Track money you've borrowed. Add your first debit record to get started."}
                  </p>
                  <Button
                    onClick={handleOpenNewDebt}
                    className="px-4 py-2 rounded-pill fw-semibold d-inline-flex align-items-center gap-2"
                    style={{
                      backgroundColor: debtType === 'lend' ? '#059669' : '#dc3545',
                      borderColor: debtType === 'lend' ? '#059669' : '#dc3545',
                    }}
                  >
                    <FaPlus /> Record a {debtType === 'lend' ? 'Credit' : 'Debit'}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="debts-list">
                    {debts.map(debt => (
                      <DebtCard
                        key={debt.id}
                        debt={debt}
                        onIncreaseClick={handleOpenIncrease}
                        onRepayClick={handleOpenRepay}
                        onDetailClick={handleOpenDetail}
                        onEditClick={handleOpenEditDebt}
                        onDeleteClick={handleDeleteDebt}
                      />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="text-center py-3 border-top">
                      <Button
                        variant="outline-secondary"
                        onClick={() => fetchDebts(true)}
                        disabled={isLoading}
                        size="sm"
                      >
                        {isLoading ? <Spinner as="span" animation="border" size="sm" /> : 'Load More'}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modals scoped to this pane */}
      <DebtDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        debt={detailDebt}
        onIncreaseClick={handleOpenIncrease}
        onRepayClick={handleOpenRepay}
        onEditTransactionClick={handleEditTransactionClick}
      />
    </>
  );
});

DebtTabPane.displayName = 'DebtTabPane';
