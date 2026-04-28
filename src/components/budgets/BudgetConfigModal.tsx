import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { categoryService, Category } from '@/services/categoryService';
import { budgetService, CategoryBudget } from '@/services/budgetService';
import { FaSave, FaTimes } from 'react-icons/fa';
import { AmountInput } from '@/components/transaction/AmountInput';

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

  const [basicMonthly, setBasicMonthly] = useState<number>(0);
  const [extendMonthly, setExtendMonthly] = useState<number>(0);
  const [basicAnnual, setBasicAnnual] = useState<number>(0);
  const [extendAnnual, setExtendAnnual] = useState<number>(0);

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

  useEffect(() => {
    if (selectedCategoryId) {
      const existing = existingBudgets.find(b => b.category_id === selectedCategoryId);
      if (existing) {
        setBasicMonthly(Number(existing.basic_monthly_amount));
        setExtendMonthly(Number(existing.extend_monthly_amount));
        setBasicAnnual(Number(existing.basic_annual_amount));
        setExtendAnnual(Number(existing.extend_annual_amount));
      } else {
        setBasicMonthly(0);
        setExtendMonthly(0);
        setBasicAnnual(0);
        setExtendAnnual(0);
      }
    } else {
      setBasicMonthly(0);
      setExtendMonthly(0);
      setBasicAnnual(0);
      setExtendAnnual(0);
    }
  }, [selectedCategoryId, existingBudgets]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) return;

    // Validation
    const totalMonthly = basicMonthly + extendMonthly;
    const totalAnnual = basicAnnual + extendAnnual;
    if (totalMonthly > totalAnnual && totalAnnual > 0) {
      setError("Total monthly budget cannot exceed total annual budget.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await budgetService.setCategoryBudget(selectedCategoryId, {
        basic_monthly_amount: basicMonthly,
        extend_monthly_amount: extendMonthly,
        basic_annual_amount: basicAnnual,
        extend_annual_amount: extendAnnual
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
        <Modal.Title>Manage Budgets</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {isLoading ? (
          <div className="text-center p-4"><Spinner animation="border" /></div>
        ) : (
          <Form onSubmit={handleSave}>
            {error && <Alert variant="danger">{error}</Alert>}

            <Form.Group className="mb-4">
              <Form.Label>Select Category</Form.Label>
              <Form.Select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                required
              >
                <option value="">-- Choose Category --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Form.Select>
            </Form.Group>

            {selectedCategoryId && (
              <>
                <h5 className="mb-3 mt-4 text-primary">Monthly Limits</h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Basic Amount</Form.Label>
                      <AmountInput
                        type="expense"
                        value={basicMonthly ? String(basicMonthly) : ''}
                        onChange={(val) => setBasicMonthly(val !== '' ? Number(val) : 0)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Extend Amount</Form.Label>
                      <AmountInput
                        type="expense"
                        value={extendMonthly ? String(extendMonthly) : ''}
                        onChange={(val) => setExtendMonthly(val !== '' ? Number(val) : 0)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <h5 className="mb-3 mt-4 text-info">Annual Limits</h5>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Basic Amount</Form.Label>
                      <AmountInput
                        type="expense"
                        value={basicAnnual ? String(basicAnnual) : ''}
                        onChange={(val) => setBasicAnnual(val !== '' ? Number(val) : 0)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Extend Amount</Form.Label>
                      <AmountInput
                        type="expense"
                        value={extendAnnual ? String(extendAnnual) : ''}
                        onChange={(val) => setExtendAnnual(val !== '' ? Number(val) : 0)}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <div className="d-flex justify-content-end mt-4">
                  <Button variant="secondary" className="me-2" onClick={onHide}>
                    <FaTimes className="me-2" /> Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={isSaving}>
                    {isSaving ? <Spinner size="sm" /> : <><FaSave className="me-2" /> Save Configuration</>}
                  </Button>
                </div>
              </>
            )}
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
};
