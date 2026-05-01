import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner, Alert, Row, Col, Badge, OverlayTrigger, Placeholder, Tooltip } from 'react-bootstrap';

import { budgetService } from '@/services/budgetService';
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
                <div className="d-flex justify-content-between align-items-center mb-3 mt-4 border-bottom pb-2">
                  <h5 className="mb-0 fw-bold text-dark">Monthly Limits</h5>
                  {totalMonthly > 0 && (
                    <Badge bg="primary" pill className="fs-6 px-3 py-2">Total: {totalMonthly.toLocaleString()}</Badge>
                  )}
                </div>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Basic Amount</Form.Label>
                      <AmountInput
                        type="expense"
                        value={formData.basicMonthly}
                        onChange={(val) => setFormData(prev => ({ ...prev, basicMonthly: val }))}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="d-flex align-items-center">
                        Extend Amount 
                        <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-extend-monthly">An optional additional buffer allowed for this category.</Tooltip>}>
                          <span className="ms-2 text-muted d-flex align-items-center" style={{ cursor: 'help' }}><FaInfoCircle size={14} /></span>
                        </OverlayTrigger>
                      </Form.Label>
                      <AmountInput
                        type="expense"
                        value={formData.extendMonthly}
                        onChange={(val) => setFormData(prev => ({ ...prev, extendMonthly: val }))}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-between align-items-center mb-3 mt-4 border-bottom pb-2">
                  <h5 className="mb-0 fw-bold text-dark">Annual Limits</h5>
                  <div className="d-flex align-items-center">
                    <Button variant="outline-secondary" size="sm" className="me-3" onClick={handleAutoFillAnnual} title="Auto-fill Annual (12x Monthly)">
                      <FaMagic className="me-1" /> Auto-fill (x12)
                    </Button>
                    {totalAnnual > 0 && (
                      <Badge bg="info" pill className="fs-6 px-3 py-2 text-white">Total: {totalAnnual.toLocaleString()}</Badge>
                    )}
                  </div>
                </div>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Basic Amount</Form.Label>
                      <AmountInput
                        type="expense"
                        value={formData.basicAnnual}
                        onChange={(val) => setFormData(prev => ({ ...prev, basicAnnual: val }))}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="d-flex align-items-center">
                        Extend Amount
                        <OverlayTrigger placement="top" overlay={<Tooltip id="tooltip-extend-annual">An optional additional buffer allowed for this category over the year.</Tooltip>}>
                          <span className="ms-2 text-muted d-flex align-items-center" style={{ cursor: 'help' }}><FaInfoCircle size={14} /></span>
                        </OverlayTrigger>
                      </Form.Label>
                      <AmountInput
                        type="expense"
                        value={formData.extendAnnual}
                        onChange={(val) => setFormData(prev => ({ ...prev, extendAnnual: val }))}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {isInvalidLimits && (
                  <Alert variant="warning" className="mt-3">
                    <FaInfoCircle className="me-2" />
                    <strong>Warning:</strong> The total monthly budget exceeds the total annual budget. Please adjust your limits.
                  </Alert>
                )}

                <div className="d-flex justify-content-end mt-4">
                  <Button variant="secondary" className="me-2 d-flex align-items-center justify-content-center" onClick={onHide}>
                    <FaTimes className="me-2" /> Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={isSaving || isInvalidLimits} className="d-flex align-items-center justify-content-center">
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
