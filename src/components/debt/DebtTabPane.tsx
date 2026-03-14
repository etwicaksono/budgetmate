'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { FaHandshake, FaPlus } from 'react-icons/fa';
import Swal from 'sweetalert2';
import { NumericFormat } from 'react-number-format';

import { debtService, Debt, CreateDebtPayload, UpdateDebtPayload, CreateRepaymentPayload } from '@/services/debtService';
import { DEBT_STATUSES } from '@/utils/constants';
import { Account } from '@/services/accountService';
import { DebtCard } from './DebtCard';
import { DebtModal } from './DebtModal';
import { RepaymentModal } from './RepaymentModal';
import { DebtDetailModal } from './DebtDetailModal';
import { DebtIncreaseModal } from './DebtIncreaseModal';

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
  accounts: Account[];
  onMutated: () => void;
  totalAmount: number;
}

export const DebtTabPane: React.FC<DebtTabPaneProps> = ({
  debtType,
  statusFilter,
  counterpartyFilter,
  sortBy,
  sortOrder,
  accounts,
  onMutated,
  totalAmount
}) => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Modals
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);

  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [repaymentDebt, setRepaymentDebt] = useState<Debt | null>(null);

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null);

  // New state for editing specific transactions
  const [editTransaction, setEditTransaction] = useState<any>(null);
  
  // Track if we need to return to the detail modal after closing other modals
  const [returnToDetail, setReturnToDetail] = useState(false);

  const [showIncreaseModal, setShowIncreaseModal] = useState(false);
  const [increaseDebt, setIncreaseDebt] = useState<Debt | null>(null);

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

  // Re-fetch from page 1 whenever filters or type change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchDebts();
    // intentionally omitting `page` so this only triggers on filter/type changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debtType, statusFilter, counterpartyFilter, sortBy, sortOrder]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenNewDebt = () => {
    setEditDebt(null);
    setShowDebtModal(true);
  };

  const handleOpenEditDebt = (debt: Debt) => {
    setEditDebt(debt);
    setShowDebtModal(true);
  };

  const handleOpenDetail = (debt: Debt) => {
    setDetailDebt(debt);
    setShowDetailModal(true);
  };

  const handleOpenRepay = (debt: Debt) => {
    if (debt.status !== DEBT_STATUSES.ACTIVE) return;
    setRepaymentDebt(debt);
    setEditTransaction(null);
    setShowRepaymentModal(true);
  };

  const handleOpenIncrease = (debt: Debt) => {
    setIncreaseDebt(debt);
    setEditTransaction(null);
    setShowIncreaseModal(true);
  };

  const handleEditTransactionClick = (debt: Debt, transaction: any, isIncrease: boolean) => {
    setEditTransaction(transaction);
    setShowDetailModal(false);
    setReturnToDetail(true);
    if (isIncrease) {
      setIncreaseDebt(debt);
      setShowIncreaseModal(true);
    } else {
      setRepaymentDebt(debt);
      setShowRepaymentModal(true);
    }
  };

  const handleSaveDebt = async (payload: CreateDebtPayload | UpdateDebtPayload) => {
    if (editDebt) {
      await debtService.updateDebt(editDebt.id, payload as UpdateDebtPayload);
      Toast.fire({ icon: 'success', title: 'Debt updated successfully' });
      if (detailDebt && detailDebt.id === editDebt.id) {
        const updated = await debtService.getDebtById(editDebt.id);
        setDetailDebt(updated);
      }
    } else {
      await debtService.createDebt(payload as CreateDebtPayload);
      Toast.fire({ icon: 'success', title: 'Debt created successfully' });
    }
    fetchDebts(false, true);
    onMutated();
  };

  const handleRecordRepayment = async (debtId: string, payload: CreateRepaymentPayload) => {
    await debtService.recordRepayment(debtId, payload);
    Toast.fire({ icon: 'success', title: 'Repayment recorded successfully' });
    if (detailDebt && detailDebt.id === debtId) {
      const updated = await debtService.getDebtById(debtId);
      setDetailDebt(updated);
    }
    fetchDebts(false, true);
    onMutated();
  };

  const handleRecordIncrease = async (debtId: string, payload: CreateRepaymentPayload) => {
    await debtService.increaseDebt(debtId, payload);
    Toast.fire({ icon: 'success', title: 'Debt increased successfully' });
    if (detailDebt && detailDebt.id === debtId) {
      const updated = await debtService.getDebtById(debtId);
      setDetailDebt(updated);
    }
    fetchDebts(false, true);
    onMutated();
  };

  const handleEditRepayment = async (debtId: string, txId: string, payload: CreateRepaymentPayload) => {
    await debtService.updateRepayment(debtId, txId, payload);
    Toast.fire({ icon: 'success', title: 'Repayment updated successfully' });
    if (detailDebt && detailDebt.id === debtId) {
      const updated = await debtService.getDebtById(debtId);
      setDetailDebt(updated);
    }
    fetchDebts(false, true);
    onMutated();
  };

  const handleEditIncrease = async (debtId: string, txId: string, payload: CreateRepaymentPayload) => {
    await debtService.updateIncrease(debtId, txId, payload);
    Toast.fire({ icon: 'success', title: 'Increase updated successfully' });
    if (detailDebt && detailDebt.id === debtId) {
      const updated = await debtService.getDebtById(debtId);
      setDetailDebt(updated);
    }
    fetchDebts(false, true);
    onMutated();
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

  // ── Render ─────────────────────────────────────────────────────────────────

  const closeRepaymentModal = () => {
    setShowRepaymentModal(false);
    setEditTransaction(null);
    if (returnToDetail && detailDebt) {
      setShowDetailModal(true);
    }
    setReturnToDetail(false);
  };

  const closeIncreaseModal = () => {
    setShowIncreaseModal(false);
    setEditTransaction(null);
    if (returnToDetail && detailDebt) {
      setShowDetailModal(true);
    }
    setReturnToDetail(false);
  };

  return (
    <>
      <Row>
        <Col xs={12}>
          <Card className="border-0 shadow-sm debt-tab-panel">
            <Card.Body className="p-0">
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center p-3 border-bottom bg-light debt-list-header gap-3 gap-sm-0">
                <div className="d-flex align-items-center gap-3">
                  <div className="fw-semibold">
                    {isLoading && debts.length === 0
                      ? 'Loading…'
                      : `${debts.length} ${debts.length === 1 ? 'record' : 'records'}`}
                  </div>
                  <div className="d-none d-sm-block text-muted">|</div>
                  <div className={`fw-bold ${debtType === 'lend' ? 'text-success' : 'text-danger'}`}>
                    Total: <NumericFormat value={totalAmount} displayType="text" thousandSeparator prefix="Rp " decimalScale={0} />
                  </div>
                </div>
                <div className="d-grid d-sm-block">
                  <Button
                    variant={debtType === 'lend' ? 'success' : 'danger'}
                    onClick={handleOpenNewDebt}
                    className="d-flex align-items-center justify-content-center gap-2"
                  >
                    <FaPlus /> New {debtType === 'lend' ? 'Credit' : 'Debit'}
                  </Button>
                </div>
              </div>

              {isLoading && debts.length === 0 ? (
                <div className="text-center py-5">
                  <Spinner animation="border" style={{ color: debtType === 'lend' ? '#059669' : '#dc3545' }} />
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
      <DebtModal
        show={showDebtModal}
        onHide={() => setShowDebtModal(false)}
        editDebt={editDebt}
        onSave={handleSaveDebt}
        accounts={accounts}
        defaultType={debtType}
      />

      <RepaymentModal
        show={showRepaymentModal}
        onHide={closeRepaymentModal}
        debt={repaymentDebt}
        onSave={async (debtId, payload) => {
          await handleRecordRepayment(debtId, payload);
          closeRepaymentModal();
        }}
        editTransaction={editTransaction}
        onEdit={async (debtId, txId, payload) => {
          await handleEditRepayment(debtId, txId, payload);
          closeRepaymentModal();
        }}
        accounts={accounts}
      />

      <DebtDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        debt={detailDebt}
        onIncreaseClick={(d) => {
          setShowDetailModal(false);
          setReturnToDetail(true);
          handleOpenIncrease(d);
        }}
        onRepayClick={(d) => {
          setShowDetailModal(false);
          setReturnToDetail(true);
          handleOpenRepay(d);
        }}
        onEditTransactionClick={handleEditTransactionClick}
      />

      <DebtIncreaseModal
        show={showIncreaseModal}
        onHide={closeIncreaseModal}
        debt={increaseDebt}
        onSave={async (debtId, payload) => {
          await handleRecordIncrease(debtId, payload);
          closeIncreaseModal();
        }}
        editTransaction={editTransaction}
        onEdit={async (debtId, txId, payload) => {
          await handleEditIncrease(debtId, txId, payload);
          closeIncreaseModal();
        }}
        accounts={accounts}
      />
    </>
  );
};
