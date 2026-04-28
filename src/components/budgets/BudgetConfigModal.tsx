import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Form, Button, Spinner, Alert, Row, Col, Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { categoryService, Category } from '@/services/categoryService';
import { budgetService, CategoryBudget } from '@/services/budgetService';
import { FaSave, FaTimes, FaInfoCircle, FaMagic } from 'react-icons/fa';
import { AmountInput } from '@/components/transaction/AmountInput';
import { TransactionCategorySelect } from '@/components/transaction/TransactionCategorySelect';

interface BudgetConfigModalProps {
  show: boolean;
  onHide: () => void;
  initialCategoryId?: string;
}

export const BudgetConfigModal: React.FC<BudgetConfigModalProps> = ({ show, onHide, initialCategoryId }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [existingBudgets, setExistingBudgets] = useState<CategoryBudget[]>([]);
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

  useEffect(() => {
    if (show) {
      loadData();
    }
  }, [show]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [catRes, budRes] = await Promise.all([
        categoryService.fetchCategories(),
        budgetService.fetchBudgets()
      ]);
      setCategories(catRes.data.filter(c => c.type === 'expense' || c.type === 'both'));
      setExistingBudgets(budRes);

      if (initialCategoryId) {
        setSelectedCategoryId(initialCategoryId);
      } else {
        setSelectedCategoryId('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load options');
    } finally {
      setIsLoading(false);
    }
  };

  // O(1) Lookup Map for existing budgets
  const budgetMap = useMemo(() => {
    return existingBudgets.reduce((acc, budget) => {
      acc[budget.category_id] = budget;
      return acc;
    }, {} as Record<string, CategoryBudget>);
  }, [existingBudgets]);

  // Cleaner side-effect for selecting a category
  useEffect(() => {
    if (selectedCategoryId && budgetMap[selectedCategoryId]) {
      const existing = budgetMap[selectedCategoryId];
      setFormData({
        basicMonthly: existing.basic_monthly_amount.toString(),
        extendMonthly: existing.extend_monthly_amount.toString(),
        basicAnnual: existing.basic_annual_amount.toString(),
        extendAnnual: existing.extend_annual_amount.toString(),
      });
    } else {
      // Reset form cleanly
      setFormData({ basicMonthly: '', extendMonthly: '', basicAnnual: '', extendAnnual: '' });
    }
  }, [selectedCategoryId, budgetMap]);

  // Derived Values for UI and Validation
  const totalMonthly = Number(formData.basicMonthly) + Number(formData.extendMonthly);
  const totalAnnual = Number(formData.basicAnnual) + Number(formData.extendAnnual);
  const isInvalidLimits = totalMonthly > totalAnnual && totalAnnual > 0;
  
  const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name;

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
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to save budget configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered className="glass-modal">
      <Modal.Header closeButton className="border-bottom border-secondary">
        <Modal.Title>
          {selectedCategoryName ? `Configure Budget: ${selectedCategoryName}` : 'Manage Budgets'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? (
          <div className="text-center p-4"><Spinner animation="border" /></div>
        ) : (
          <Form onSubmit={handleSave}>
            {error && <Alert variant="danger">{error}</Alert>}

            <Form.Group className="mb-4" style={{ position: 'relative', zIndex: 1050 }}>
              <Form.Label className="fw-bold">Select Category</Form.Label>
              <TransactionCategorySelect
                selectedCategoryId={selectedCategoryId || null}
                onSelect={(id) => setSelectedCategoryId(id || '')}
                categories={categories}
                placeholder="-- Choose Category --"
              />
            </Form.Group>

            {selectedCategoryId && (
              <>
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
              </>
            )}
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
}
