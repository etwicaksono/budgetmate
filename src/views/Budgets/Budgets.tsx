import React, { useState, ChangeEvent } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal } from 'react-bootstrap';

interface Budget {
  id: number;
  category: string;
  budgeted: number;
  spent: number;
  period: 'Weekly' | 'Monthly' | 'Yearly';
}

interface CurrentBudgetForm {
  category: string;
  budgeted: string;
  period: 'Weekly' | 'Monthly' | 'Yearly';
}

// Constants with proper typing
const INITIAL_BUDGETS: Budget[] = [
  { id: 1, category: 'Food', budgeted: 400, spent: 250, period: 'Monthly' },
  { id: 2, category: 'Transport', budgeted: 200, spent: 120, period: 'Monthly' },
  { id: 3, category: 'Entertainment', budgeted: 150, spent: 180, period: 'Monthly' },
  { id: 4, category: 'Shopping', budgeted: 300, spent: 100, period: 'Monthly' },
  { id: 5, category: 'Utilities', budgeted: 250, spent: 240, period: 'Monthly' },
];

const CATEGORIES: readonly string[] = [
  'Food', 
  'Transport', 
  'Shopping', 
  'Entertainment', 
  'Utilities', 
  'Healthcare', 
  'Travel', 
  'Other'
] as const;

const PERIODS: readonly ('Weekly' | 'Monthly' | 'Yearly')[] = ['Weekly', 'Monthly', 'Yearly'] as const;

// Utility functions with type annotations
const createEmptyBudgetForm = (): CurrentBudgetForm => ({
  category: '',
  budgeted: '',
  period: 'Monthly'
});

const calculatePercentage = (spent: number, budgeted: number): number => {
  if (budgeted === 0) return 0;
  return Math.min(100, (spent / budgeted) * 100);
};

const getStatusVariant = (percentage: number): 'success' | 'warning' | 'danger' => {
  if (percentage >= 100) return 'danger';
  if (percentage >= 80) return 'warning';
  return 'success';
};

const Budgets: React.FC = () => {
  const [budgets, setBudgets] = useState<Budget[]>(INITIAL_BUDGETS);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [currentBudget, setCurrentBudget] = useState<CurrentBudgetForm>(() => createEmptyBudgetForm());

  const handleAddBudget = (): void => {
    setCurrentBudget(createEmptyBudgetForm());
    setShowModal(true);
  };

  const handleSaveBudget = (): void => {
    if (currentBudget.category && currentBudget.budgeted) {
      const newBudget: Budget = {
        ...currentBudget,
        id: budgets.length + 1,
        spent: 0, // New budgets start with $0 spent
        budgeted: parseFloat(currentBudget.budgeted)
      };

      setBudgets([...budgets, newBudget]);
      setShowModal(false);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setCurrentBudget(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCloseModal = (): void => {
    setShowModal(false);
  };

  return (
    <Container  fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Budgets</h1>
        <Button variant="primary" onClick={handleAddBudget}>
          + Create Budget
        </Button>
      </div>

      <Row>
        {budgets.map(budget => {
          const percentage = calculatePercentage(budget.spent, budget.budgeted);
          const statusVariant = getStatusVariant(percentage);

          return (
            <Col key={budget.id} xs={12} md={6} lg={4} className="mb-4">
              <Card className={`budget-card border-${statusVariant}`}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <Card.Title>{budget.category}</Card.Title>
                      <Card.Text className="text-muted">{budget.period} Budget</Card.Text>
                    </div>
                    <span className={`badge bg-${statusVariant}`}>
                      {percentage.toFixed(0)}%
                    </span>
                  </div>

                  <div className="budget-amounts mb-2">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Spent</span>
                      <strong>${budget.spent.toFixed(2)}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">Budgeted</span>
                      <strong>${budget.budgeted.toFixed(2)}</strong>
                    </div>
                  </div>

                  <div className="progress mb-2" style={{ height: '8px' }}>
                    <div
                      className={`progress-bar bg-${statusVariant}`}
                      role="progressbar"
                      style={{ width: `${percentage}%` }}
                      aria-valuenow={percentage}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>

                  <div className="d-flex justify-content-between">
                    <span className="text-muted small">
                      {budget.budgeted - budget.spent > 0
                        ? `$${(budget.budgeted - budget.spent).toFixed(2)} left`
                        : 'Over budget'}
                    </span>
                    <span className="text-muted small">
                      {percentage.toFixed(0)}% used
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Create Budget Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Create Budget</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="category">
              <Form.Label>Category</Form.Label>
              <Form.Select
                name="category"
                value={currentBudget.category}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="budgeted">
              <Form.Label>Budgeted Amount</Form.Label>
              <Form.Control
                type="number"
                name="budgeted"
                value={currentBudget.budgeted}
                onChange={handleInputChange}
                placeholder="Enter amount"
                step="0.01"
                min="0"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="period">
              <Form.Label>Budget Period</Form.Label>
              <Form.Select
                name="period"
                value={currentBudget.period}
                onChange={handleInputChange}
              >
                {PERIODS.map(period => (
                  <option key={period} value={period}>{period}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveBudget}>
            Create Budget
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Budgets;
