import React, { useState } from 'react';
import { Container, Card, Button, Table, Form, Modal } from 'react-bootstrap';

const Transactions = () => {
  const [transactions, setTransactions] = useState([
    { id: 1, description: 'Grocery Store', amount: -85.30, date: '2023-07-15', category: 'Food', account: 'Checking Account', notes: '' },
    { id: 2, description: 'Salary Deposit', amount: 3500.00, date: '2023-07-01', category: 'Salary', account: 'Checking Account', notes: 'Monthly salary' },
    { id: 3, description: 'Gas Station', amount: -45.00, date: '2023-07-14', category: 'Transport', account: 'Credit Card', notes: '' },
    { id: 4, description: 'Online Purchase', amount: -120.50, date: '2023-07-13', category: 'Shopping', account: 'Credit Card', notes: 'Electronics' },
    { id: 5, description: 'Restaurant', amount: -65.20, date: '2023-07-12', category: 'Food', account: 'Checking Account', notes: 'Dinner with friends' },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Food',
    account: 'Checking Account',
    notes: ''
  });

  const categories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Utilities', 'Salary', 'Healthcare', 'Travel', 'Other'];
  const accounts = ['Checking Account', 'Savings Account', 'Credit Card', 'Cash'];

  const handleAddTransaction = () => {
    setCurrentTransaction({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      category: 'Food',
      account: 'Checking Account',
      notes: ''
    });
    setShowModal(true);
  };

  const handleSaveTransaction = () => {
    if (currentTransaction.description && currentTransaction.amount) {
      const newTransaction = {
        ...currentTransaction,
        id: transactions.length + 1,
        amount: parseFloat(currentTransaction.amount)
      };
      
      setTransactions([newTransaction, ...transactions]);
      setShowModal(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentTransaction(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Transactions</h1>
        <Button variant="primary" onClick={handleAddTransaction}>
          + Add Transaction
        </Button>
      </div>

      <Card>
        <Card.Body>
          <div className="d-flex mb-3">
            <Form.Control 
              type="text" 
              placeholder="Search transactions..." 
              className="me-2"
            />
            <Form.Select className="me-2" style={{ width: '150px' }}>
              <option>All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Form.Select>
            <Form.Select className="me-2" style={{ width: '200px' }}>
              <option>All Accounts</option>
              {accounts.map(acc => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </Form.Select>
            <Form.Control 
              type="date" 
              className="me-2"
              style={{ width: '150px' }}
            />
          </div>

          <Table responsive>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Account</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(transaction => (
                <tr key={transaction.id}>
                  <td>{transaction.description}</td>
                  <td>
                    <span className="badge bg-secondary">{transaction.category}</span>
                  </td>
                  <td>{transaction.account}</td>
                  <td>{transaction.date}</td>
                  <td className={transaction.amount > 0 ? 'text-success' : 'text-danger'}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount.toFixed(2)}
                  </td>
                  <td>{transaction.notes}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* Add Transaction Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add Transaction</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3" controlId="description">
              <Form.Label>Description</Form.Label>
              <Form.Control
                type="text"
                name="description"
                value={currentTransaction.description}
                onChange={handleInputChange}
                placeholder="Enter description"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="amount">
              <Form.Label>Amount</Form.Label>
              <Form.Control
                type="number"
                name="amount"
                value={currentTransaction.amount}
                onChange={handleInputChange}
                placeholder="Enter amount"
                step="0.01"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="date">
              <Form.Label>Date</Form.Label>
              <Form.Control
                type="date"
                name="date"
                value={currentTransaction.date}
                onChange={handleInputChange}
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="category">
              <Form.Label>Category</Form.Label>
              <Form.Select
                name="category"
                value={currentTransaction.category}
                onChange={handleInputChange}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="account">
              <Form.Label>Account</Form.Label>
              <Form.Select
                name="account"
                value={currentTransaction.account}
                onChange={handleInputChange}
              >
                {accounts.map(acc => (
                  <option key={acc} value={acc}>{acc}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3" controlId="notes">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={currentTransaction.notes}
                onChange={handleInputChange}
                placeholder="Add any notes..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveTransaction}>
            Save Transaction
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default Transactions;