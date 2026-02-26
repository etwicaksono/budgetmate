'use client';

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, Spinner, Accordion } from 'react-bootstrap';
import { 
  FaHandshake,
  FaPlus,
  FaArrowCircleUp,
  FaArrowCircleDown,
  FaBalanceScale
} from 'react-icons/fa';
import Swal from 'sweetalert2';
import { NumericFormat } from 'react-number-format';
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

import './Debts.css';
import { 
  debtService, 
  Debt, 
  CreateDebtPayload, 
  UpdateDebtPayload, 
  CreateRepaymentPayload 
} from '@/services/debtService';
import { DEBT_TYPES, DEBT_STATUSES } from '@/utils/constants';
import { accountService, Account } from '@/services/accountService';

import { 
  DebtCard, 
  DebtModal, 
  RepaymentModal, 
  DebtDetailModal,
  DebtIncreaseModal
} from '@/components/debt';
import { ClearButton } from '@/components/common/ClearButton';

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filtering
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [counterpartyFilter, setCounterpartyFilter] = useState('');
  
  // Modals state
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  
  const [showRepaymentModal, setShowRepaymentModal] = useState(false);
  const [repaymentDebt, setRepaymentDebt] = useState<Debt | null>(null);
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailDebt, setDetailDebt] = useState<Debt | null>(null);

  const [showIncreaseModal, setShowIncreaseModal] = useState(false);
  const [increaseDebt, setIncreaseDebt] = useState<Debt | null>(null);

  // Summary computed states
  const [totalLent, setTotalLent] = useState(0);
  const [totalBorrowed, setTotalBorrowed] = useState(0);

  const fetchDebts = useCallback(async (isLoadMore = false, quiet = false) => {
    try {
      if (!isLoadMore && !quiet) setIsLoading(true);
      setError(null);

      const targetPage = isLoadMore ? page + 1 : 1;
      
      const response = await debtService.fetchDebts({
        page: targetPage,
        limit: 20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        counterparty: counterpartyFilter || undefined,
      } as any);

      if (isLoadMore) {
         setDebts(prev => [...prev, ...response.data]);
      } else {
         setDebts(response.data);
      }
      
      setPage(response.meta.page);
      setHasMore(response.meta.page < response.meta.total_pages);
      
      // Calculate active summary specifically
      // Also fetch accounts if not loaded
      if (accounts.length === 0) {
         const accResponse = await accountService.fetchAccounts();
         setAccounts(accResponse);
      }

      const allActive = await debtService.fetchDebts({ limit: -1, status: 'active' });
      let lentOut = 0; let borrowIn = 0;
      allActive.data.forEach(d => {
         if (d.type === 'lend') lentOut += (d.remaining_amount || 0);
         if (d.type === 'borrow') borrowIn += (d.remaining_amount || 0);
      });
      setTotalLent(lentOut);
      setTotalBorrowed(borrowIn);

    } catch (err: any) {
      setError(err.message || 'Failed to load debts');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, typeFilter, counterpartyFilter]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

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
     setShowRepaymentModal(true);
  };

  const handleOpenIncrease = (debt: Debt) => {
     setIncreaseDebt(debt);
     setShowIncreaseModal(true);
  };

  const handleSaveDebt = async (payload: CreateDebtPayload | UpdateDebtPayload) => {
     if (editDebt) {
        await debtService.updateDebt(editDebt.id, payload as UpdateDebtPayload);
        Toast.fire({ icon: 'success', title: 'Debt updated successfully' });
        // If we also had detail open for this debt, refresh it
        if (detailDebt && detailDebt.id === editDebt.id) {
           const updated = await debtService.getDebtById(editDebt.id);
           setDetailDebt(updated);
        }
     } else {
        await debtService.createDebt(payload as CreateDebtPayload);
        Toast.fire({ icon: 'success', title: 'Debt created successfully' });
     }
     fetchDebts(false, true);
  };

  const handleRecordRepayment = async (debtId: string, payload: CreateRepaymentPayload) => {
     await debtService.recordRepayment(debtId, payload);
     Toast.fire({ icon: 'success', title: 'Repayment recorded successfully' });
     if (detailDebt && detailDebt.id === debtId) {
        const updated = await debtService.getDebtById(debtId);
        setDetailDebt(updated);
     }
     fetchDebts(false, true);
  };

  const handleRecordIncrease = async (debtId: string, payload: CreateRepaymentPayload) => {
     await debtService.increaseDebt(debtId, payload);
     Toast.fire({ icon: 'success', title: 'Debt increased successfully' });
     if (detailDebt && detailDebt.id === debtId) {
        const updated = await debtService.getDebtById(debtId);
        setDetailDebt(updated);
     }
     fetchDebts(false, true);
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
        reverseButtons: true
     });

     if (result.isConfirmed) {
        try {
           setIsLoading(true);
           await debtService.deleteDebt(debt.id);
           Toast.fire({ icon: 'success', title: 'Debt deleted' });
           fetchDebts(false, true);
           if (detailDebt && detailDebt.id === debt.id) setShowDetailModal(false);
        } catch (err: any) {
           Toast.fire({ icon: 'error', title: err.message || 'Failed to delete debt' });
        } finally {
           setIsLoading(false);
        }
     }
  };

  return (
    <Container fluid className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1 text-dark fw-bold">Debts</h2>
          <p className="text-muted mb-0">Track money you've lent or borrowed</p>
        </div>
      </div>

      <Row className="mb-4 g-3">
        <Col xs={12} md={4}>
          <Card className="border-0 debt-summary-card h-100 rounded-3">
            <Card.Body className="d-flex align-items-center p-4">
              <div className="debt-summary-icon bg-success bg-opacity-10 text-success me-3">
                <FaArrowCircleUp size={24} />
              </div>
              <div>
                <h4 className="fw-bold mb-0 text-success" style={{ letterSpacing: '-0.5px' }}>
                   <NumericFormat value={totalLent} displayType="text" thousandSeparator prefix="Rp " decimalScale={0} />
                </h4>
                <div className="small text-muted mt-1 fw-medium">Total Lent (Active)</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4}>
          <Card className="border-0 debt-summary-card h-100 rounded-3">
            <Card.Body className="d-flex align-items-center p-4">
              <div className="debt-summary-icon bg-danger bg-opacity-10 text-danger me-3">
                <FaArrowCircleDown size={24} />
              </div>
              <div>
                <h4 className="fw-bold mb-0 text-danger" style={{ letterSpacing: '-0.5px' }}>
                   <NumericFormat value={totalBorrowed} displayType="text" thousandSeparator prefix="Rp " decimalScale={0} />
                </h4>
                <div className="small text-muted mt-1 fw-medium">Total Borrowed (Active)</div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} md={4}>
          <Card className="border-0 debt-summary-card h-100 rounded-3">
            <Card.Body className="d-flex align-items-center p-4">
              <div className="debt-summary-icon bg-primary bg-opacity-10 text-primary me-3">
                <FaBalanceScale size={24} />
              </div>
              <div>
                <h4 className="fw-bold mb-0 text-primary" style={{ letterSpacing: '-0.5px' }}>
                   <NumericFormat value={Math.abs(totalLent - totalBorrowed)} displayType="text" thousandSeparator prefix="Rp " decimalScale={0} />
                </h4>
                <div className="small text-muted mt-1 fw-medium">
                   {totalLent === totalBorrowed 
                     ? 'Positions are balanced' 
                     : (totalLent > totalBorrowed ? 'People owe you more' : 'You owe people more')
                   }
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        {/* Only show filters if there's data to filter or if a filter is active */}
        {(debts.length > 0 || statusFilter !== '' || typeFilter !== '' || counterpartyFilter !== '') && (
          <Col lg={3} className="d-none d-lg-block mb-4">
            <Card className="border-0 debt-summary-card">
              <Card.Header className="bg-white border-bottom-0 pt-3 pb-0">
                <h6 className="mb-0 fw-bold text-uppercase text-muted" style={{ fontSize: '13px' }}>Filters</h6>
              </Card.Header>
              <Card.Body className="p-0 mt-2">
                <Accordion defaultActiveKey={['search', 'status', 'type']} alwaysOpen flush>
                  <Accordion.Item eventKey="search">
                    <Accordion.Header>Search</Accordion.Header>
                    <Accordion.Body>
                      <Form.Group>
                         <div className="position-relative">
                           <Form.Control 
                             type="text" 
                             placeholder="Find counterparty..." 
                             value={counterpartyFilter}
                             onChange={(e) => setCounterpartyFilter(e.target.value)}
                             className="shadow-none border-secondary-subtle pe-4"
                           />
                           {counterpartyFilter && (
                             <ClearButton
                               className="position-absolute end-0 top-50 translate-middle-y p-0 me-2"
                               style={{ zIndex: 5 }}
                               onClick={() => setCounterpartyFilter('')}
                             />
                           )}
                         </div>
                      </Form.Group>
                    </Accordion.Body>
                  </Accordion.Item>
                  <Accordion.Item eventKey="status">
                    <Accordion.Header>Status</Accordion.Header>
                    <Accordion.Body>
                      <Form.Select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="shadow-none border-secondary-subtle"
                      >
                        <option value="all">All Statuses</option>
                        <option value={DEBT_STATUSES.ACTIVE}>Active</option>
                        <option value={DEBT_STATUSES.SETTLED}>Settled</option>
                      </Form.Select>
                    </Accordion.Body>
                  </Accordion.Item>
                  <Accordion.Item eventKey="type">
                    <Accordion.Header>Type</Accordion.Header>
                    <Accordion.Body>
                      <Form.Select 
                        value={typeFilter} 
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="shadow-none border-secondary-subtle"
                      >
                        <option value="all">All Types</option>
                        <option value={DEBT_TYPES.LEND}>Lend</option>
                        <option value={DEBT_TYPES.BORROW}>Borrow</option>
                      </Form.Select>
                    </Accordion.Body>
                  </Accordion.Item>
                </Accordion>
              </Card.Body>
            </Card>
          </Col>
        )}

        <Col xs={12} lg={(debts.length > 0 || statusFilter !== '' || typeFilter !== '' || counterpartyFilter !== '') ? 9 : 12}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="p-0">
              <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-light">
                 <div className="fw-semibold">
                    {debts.length} {debts.length === 1 ? 'debt' : 'debts'} found
                 </div>
                 <Button variant="success" onClick={handleOpenNewDebt} className="d-flex align-items-center gap-2">
                    <FaPlus /> New Debt
                 </Button>
              </div>

              {isLoading && debts.length === 0 ? (
                 <div className="text-center py-5">
                    <Spinner animation="border" style={{ color: '#059669' }} />
                 </div>
              ) : error ? (
                 <div className="alert alert-danger m-3">{error}</div>
              ) : debts.length === 0 ? (
                 <div className="text-center py-5 my-5">
                    <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-4" style={{ width: '80px', height: '80px' }}>
                      <FaHandshake size={32} style={{ color: '#94a3b8' }} />
                    </div>
                    <h3 className="fw-bold text-dark mb-2">No debts tracked yet</h3>
                    <p className="text-muted mb-4 mx-auto" style={{ maxWidth: '400px' }}>
                      Keep track of money you've lent to friends or borrowed from family. Add your first record to get started.
                    </p>
                    <Button 
                      onClick={handleOpenNewDebt}
                      className="px-4 py-2 rounded-pill fw-semibold d-inline-flex align-items-center gap-2"
                      style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                    >
                       <FaPlus /> Record a Debt
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

      <DebtModal
        show={showDebtModal}
        onHide={() => setShowDebtModal(false)}
        editDebt={editDebt}
        onSave={handleSaveDebt}
        accounts={accounts}
      />

      <RepaymentModal
        show={showRepaymentModal}
        onHide={() => setShowRepaymentModal(false)}
        debt={repaymentDebt}
        onSave={handleRecordRepayment}
        accounts={accounts}
      />

      <DebtDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        debt={detailDebt}
        onIncreaseClick={(d) => {
           setShowDetailModal(false);
           handleOpenIncrease(d);
        }}
        onRepayClick={(d) => {
           setShowDetailModal(false);
           handleOpenRepay(d);
        }}
      />

      <DebtIncreaseModal
        show={showIncreaseModal}
        onHide={() => setShowIncreaseModal(false)}
        debt={increaseDebt}
        onSave={handleRecordIncrease}
        accounts={accounts}
      />
    </Container>
  );
}
