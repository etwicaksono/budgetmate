import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner, Alert, Row, Col, Badge, OverlayTrigger, Placeholder, Tooltip } from 'react-bootstrap';

import { budgetService } from '@/services/budgetService';
import { transactionService } from '@/services/transactionService';
import { FaSave, FaTimes, FaInfoCircle, FaMagic } from 'react-icons/fa';
import { AmountInput } from '@/components/transaction/AmountInput';
import { TransactionCategorySelect } from '@/components/transaction/TransactionCategorySelect';

interface BudgetConfigModalProps {
  show: boolean;
  onHide: () => void;
  initialCategoryId?: string;
}

export const BudgetConfigModal: React.FC<BudgetConfigModalProps> = ({ show, onHide, initialCategoryId }) => {
  const [isFetchingBudget, setIsFetchingBudget] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  
  // Grouped State with string type to handle empty inputs cleanly
  const [formData, setFormData] = useState({
    basicMonthly: '',
    extendMonthly: '',
    basicAnnual: '',
    extendAnnual: ''
  });

  const [isSaving, setIsSaving] = useState(false);

  const [historicalRange, setHistoricalRange] = useState<number>(3);
  const [historicalAverage, setHistoricalAverage] = useState<number | null>(null);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  const renderModalSkeleton = () => (
    <div className="p-2">
      <Placeholder animation="glow">
        <Placeholder xs={3} className="d-block mb-2" style={{ height: '14px' }} />
        <Placeholder xs={12} className="d-block mb-4 rounded" style={{ height: '38px' }} />
      </Placeholder>

      <div className="mt-4">
        <Placeholder animation="glow">
          <Placeholder xs={4} className="d-block mb-3" style={{ height: '18px' }} />
        </Placeholder>
        <Row>
          <Col md={6}>
            <Placeholder animation="glow">
              <Placeholder xs={5} className="d-block mb-2" style={{ height: '14px' }} />
              <Placeholder xs={12} className="d-block mb-3 rounded" style={{ height: '38px' }} />
            </Placeholder>
          </Col>
          <Col md={6}>
            <Placeholder animation="glow">
              <Placeholder xs={5} className="d-block mb-2" style={{ height: '14px' }} />
              <Placeholder xs={12} className="d-block mb-3 rounded" style={{ height: '38px' }} />
            </Placeholder>
          </Col>
        </Row>
      </div>

      <div className="mt-4">
        <Placeholder animation="glow">
          <Placeholder xs={4} className="d-block mb-3" style={{ height: '18px' }} />
        </Placeholder>
        <Row>
          <Col md={6}>
            <Placeholder animation="glow">
              <Placeholder xs={5} className="d-block mb-2" style={{ height: '14px' }} />
              <Placeholder xs={12} className="d-block mb-3 rounded" style={{ height: '38px' }} />
            </Placeholder>
          </Col>
          <Col md={6}>
            <Placeholder animation="glow">
              <Placeholder xs={5} className="d-block mb-2" style={{ height: '14px' }} />
              <Placeholder xs={12} className="d-block mb-3 rounded" style={{ height: '38px' }} />
            </Placeholder>
          </Col>
        </Row>
      </div>
    </div>
  );

  useEffect(() => {
    if (show) {
      loadData();
    }
  }, [show]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {

      if (initialCategoryId) {
        setSelectedCategoryId(initialCategoryId);
      } else {
        setSelectedCategoryId('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load options');
    } finally {
      setIsLoading(false);
    }
  };

  // Cleaner side-effect for selecting a category
  useEffect(() => {
    const fetchBudgetForCategory = async () => {
      if (!selectedCategoryId) {
        setFormData({ basicMonthly: '', extendMonthly: '', basicAnnual: '', extendAnnual: '' });
        return;
      }

      // Clear previous values immediately so they aren't visible under the loading overlay
      setFormData({ basicMonthly: '', extendMonthly: '', basicAnnual: '', extendAnnual: '' });
      setIsFetchingBudget(true);
      try {
        const existing = await budgetService.getCategoryBudget(selectedCategoryId);
        if (existing) {
          // Normalize: treat 0 as empty so the input shows the placeholder
          const nonZero = (n: string | number) => (Number(n) === 0 ? '' : Number(n).toString());
          setFormData({
            basicMonthly: nonZero(existing.basic_monthly_amount),
            extendMonthly: nonZero(existing.extend_monthly_amount),
            basicAnnual: nonZero(existing.basic_annual_amount),
            extendAnnual: nonZero(existing.extend_annual_amount),
          });
        } else {
          setFormData({ basicMonthly: '', extendMonthly: '', basicAnnual: '', extendAnnual: '' });
        }
      } catch (err) {
        console.error("Failed to fetch budget for category:", err);
        setFormData({ basicMonthly: '', extendMonthly: '', basicAnnual: '', extendAnnual: '' });
      } finally {
        setIsFetchingBudget(false);
      }
    };

    fetchBudgetForCategory();
  }, [selectedCategoryId]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedCategoryId) {
        setHistoricalAverage(null);
        return;
      }
      setIsFetchingHistory(true);
      try {
        const end = new Date();
        const start = new Date();
        start.setMonth(start.getMonth() - historicalRange);
        
        const res = await transactionService.fetchTransactions({
          category_id: selectedCategoryId,
          start_date: start.toISOString(),
          end_date: end.toISOString(),
          limit: 5000 // Get enough transactions to calculate average reliably
        });
        
        let sum = 0;
        res.transactions.forEach((t) => {
            sum += Math.abs(t.amount);
        });
        setHistoricalAverage(sum / historicalRange);
      } catch (err) {
        console.error("Failed to fetch historical average", err);
        setHistoricalAverage(null);
      } finally {
        setIsFetchingHistory(false);
      }
    };

    fetchHistory();
  }, [selectedCategoryId, historicalRange]);

  // Derived Values for UI and Validation
  const totalMonthly = Number(formData.basicMonthly) + Number(formData.extendMonthly);
  const totalAnnual = Number(formData.basicAnnual) + Number(formData.extendAnnual);
  const isInvalidLimits = totalMonthly > totalAnnual && totalAnnual > 0;
  


  const handleAutoFillAnnual = () => {
    setFormData(prev => ({
      ...prev,
      basicAnnual: (Number(prev.basicMonthly) * 12).toString(),
      extendAnnual: (Number(prev.extendMonthly) * 12).toString(),
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) return;

    if (isInvalidLimits) {
      setError("Total monthly budget cannot exceed total annual budget.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await budgetService.setCategoryBudget(selectedCategoryId, {
        basic_monthly_amount: Number(formData.basicMonthly),
        extend_monthly_amount: Number(formData.extendMonthly),
        basic_annual_amount: Number(formData.basicAnnual),
        extend_annual_amount: Number(formData.extendAnnual)
      });
      onHide();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save budget configuration';
      setError(errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="glass-modal">
      <Modal.Header closeButton className="border-bottom border-secondary">
        <Modal.Title>
          {selectedCategoryId ? 'Configure Budget' : 'Manage Budgets'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? (
          renderModalSkeleton()
        ) : (
          <Form onSubmit={handleSave}>
            {error && <Alert variant="danger">{error}</Alert>}

            <Form.Group className="mb-4" style={{ position: 'relative', zIndex: 1050 }}>
              <Form.Label className="fw-bold">Select Category</Form.Label>
              <TransactionCategorySelect
                selectedCategoryId={selectedCategoryId || null}
                onSelect={(id) => setSelectedCategoryId(id || '')}
                placeholder="-- Choose Category --"
              />
            </Form.Group>

            {selectedCategoryId && (
              <div className="position-relative">
                {isFetchingBudget && (
                  <div className="position-absolute top-0 start-0 w-100 h-100 bg-white p-2" style={{ zIndex: 10 }}>
                    {renderModalSkeleton()}
                  </div>
                )}

                {/* ── Historical Suggestion card ── */}
                <div
                  className="mb-3 p-3 rounded"
                  style={{ border: '1px solid #e2e8f0', borderLeft: '4px solid #6f42c1', background: '#fcfaff' }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: '14px' }}>
                      💡 Budget Suggestions
                    </h6>
                  </div>
                  <p className="text-muted mb-3" style={{ fontSize: '11px' }}>
                    See your historical monthly average to help you allocate appropriately.
                  </p>
                  
                  <div className="d-flex align-items-center gap-2 mb-3">
                    <Form.Select 
                      size="sm" 
                      value={historicalRange} 
                      onChange={(e) => setHistoricalRange(Number(e.target.value))}
                      style={{ width: 'auto', fontSize: '12px' }}
                    >
                      <option value={3}>Last 3 months</option>
                      <option value={6}>Last 6 months</option>
                      <option value={12}>Last 12 months</option>
                    </Form.Select>
                    <div className="flex-grow-1 text-end">
                      {isFetchingHistory ? (
                        <Spinner animation="border" size="sm" variant="secondary" />
                      ) : (
                        <span className="fw-bold text-primary" style={{ fontSize: '14px' }}>
                          Avg: {historicalAverage !== null ? Math.round(historicalAverage).toLocaleString() : '-'}
                        </span>
                      )}
                    </div>
                  </div>

                  <Button
                    variant="outline-primary"
                    size="sm"
                    className="w-100 d-flex align-items-center justify-content-center"
                    style={{ fontSize: '12px', borderStyle: 'dashed' }}
                    onClick={() => {
                        if (historicalAverage !== null && historicalAverage > 0) {
                            setFormData(prev => ({ ...prev, basicMonthly: Math.round(historicalAverage).toString() }));
                        }
                    }}
                    disabled={historicalAverage === null || historicalAverage === 0 || isFetchingHistory}
                    title="Apply to Monthly Basic Amount"
                  >
                    <FaMagic className="me-1" size={11} /> Apply to Monthly Basic
                  </Button>
                </div>

                {/* ── Monthly Limits card ── */}
                <div
                  className="mb-3 p-3 rounded"
                  style={{ border: '1px solid #e2e8f0', borderLeft: '4px solid #0d6efd', background: '#f8faff' }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: '14px' }}>
                      📅 Monthly Limits
                    </h6>
                    {totalMonthly > 0 && (
                      <Badge bg="primary" pill className="px-2 py-1" style={{ fontSize: '11px' }}>
                        Total: {totalMonthly.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted mb-3" style={{ fontSize: '11px' }}>
                    Set the monthly spending cap for this category.
                  </p>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold" style={{ fontSize: '12px' }}>Basic Amount</Form.Label>
                    <AmountInput
                      type="expense"
                      value={formData.basicMonthly}
                      onChange={(val) => setFormData(prev => ({ ...prev, basicMonthly: val }))}
                    />
                  </Form.Group>

                  <Form.Group className="mb-0">
                    <Form.Label className="fw-semibold d-flex align-items-center" style={{ fontSize: '12px' }}>
                      Extend Amount
                      <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-extend-monthly">An optional additional buffer allowed for this category.</Tooltip>}>
                        <span className="ms-1 text-muted d-flex align-items-center" style={{ cursor: 'help' }}><FaInfoCircle size={12} /></span>
                      </OverlayTrigger>
                    </Form.Label>
                    <AmountInput
                      type="expense"
                      value={formData.extendMonthly}
                      onChange={(val) => setFormData(prev => ({ ...prev, extendMonthly: val }))}
                    />
                  </Form.Group>
                </div>

                {/* ── Annual Limits card ── */}
                <div
                  className="mb-3 p-3 rounded"
                  style={{ border: '1px solid #e2e8f0', borderLeft: '4px solid #0dcaf0', background: '#f6feff' }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h6 className="mb-0 fw-bold text-dark" style={{ fontSize: '14px' }}>
                      📆 Annual Limits
                    </h6>
                    {totalAnnual > 0 && (
                      <Badge bg="info" pill className="px-2 py-1 text-white" style={{ fontSize: '11px' }}>
                        Total: {totalAnnual.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted mb-2" style={{ fontSize: '11px' }}>
                    Set the yearly spending cap. Must be ≥ monthly total.
                  </p>

                  <Button
                    variant="outline-secondary"
                    size="sm"
                    className="w-100 mb-3 d-flex align-items-center justify-content-center"
                    style={{ fontSize: '12px', borderStyle: 'dashed' }}
                    onClick={handleAutoFillAnnual}
                    title="Auto-fill Annual (12x Monthly)"
                  >
                    <FaMagic className="me-1" size={11} /> Auto-fill from monthly × 12
                  </Button>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold" style={{ fontSize: '12px' }}>Basic Amount</Form.Label>
                    <AmountInput
                      type="expense"
                      value={formData.basicAnnual}
                      onChange={(val) => setFormData(prev => ({ ...prev, basicAnnual: val }))}
                    />
                  </Form.Group>

                  <Form.Group className="mb-0">
                    <Form.Label className="fw-semibold d-flex align-items-center" style={{ fontSize: '12px' }}>
                      Extend Amount
                      <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-extend-annual">An optional additional buffer allowed for this category over the year.</Tooltip>}>
                        <span className="ms-1 text-muted d-flex align-items-center" style={{ cursor: 'help' }}><FaInfoCircle size={12} /></span>
                      </OverlayTrigger>
                    </Form.Label>
                    <AmountInput
                      type="expense"
                      value={formData.extendAnnual}
                      onChange={(val) => setFormData(prev => ({ ...prev, extendAnnual: val }))}
                    />
                  </Form.Group>
                </div>

                {isInvalidLimits && (
                  <Alert variant="warning" className="mt-2 mb-3 py-2" style={{ fontSize: '12px' }}>
                    <FaInfoCircle className="me-2" />
                    <strong>Warning:</strong> Monthly total exceeds annual total. Please adjust.
                  </Alert>
                )}

                {/* Footer — full-width on mobile, side-by-side on md+ */}
                <div className="d-flex flex-column flex-md-row gap-2 mt-3">
                  <Button
                    variant="secondary"
                    className="d-flex align-items-center justify-content-center order-md-0 order-1"
                    onClick={onHide}
                    style={{ flex: '1 1 0' }}
                  >
                    <FaTimes className="me-2" /> Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isSaving || isInvalidLimits}
                    className="d-flex align-items-center justify-content-center order-md-1 order-0"
                    style={{ flex: '2 1 0' }}
                  >
                    {isSaving ? (
                      <><Spinner size="sm" className="me-2" /> Saving...</>
                    ) : (
                      <><FaSave className="me-2" /> Save Configuration</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
}
