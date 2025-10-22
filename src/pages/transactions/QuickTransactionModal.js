import React from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

export const QuickTransactionModal = ({
  show,
  onHide,
  quickTransaction,
  onChange,
  onSubmit,
  availableCategories,
  availableAccounts,
}) => {
  if (!quickTransaction) {
    return null;
  }

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Add Quick Transaction</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3" controlId="quickDescription">
            <Form.Label>Description</Form.Label>
            <Form.Control
              type="text"
              name="description"
              value={quickTransaction.description}
              onChange={onChange}
              placeholder="Enter description (e.g., Coffee Shop)"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="quickCategory">
            <Form.Label>Category</Form.Label>
            <Form.Select
              name="category"
              value={quickTransaction.category}
              onChange={onChange}
            >
              {availableCategories.filter((category) => category !== 'All').map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3" controlId="quickAmount">
            <Form.Label>Amount (optional)</Form.Label>
            <Form.Control
              type="number"
              name="amount"
              value={quickTransaction.amount}
              onChange={onChange}
              placeholder="Enter amount (optional)"
              step="0.01"
            />
          </Form.Group>

          <Form.Group className="mb-3" controlId="quickAccount">
            <Form.Label>Account</Form.Label>
            <Form.Select
              name="account"
              value={quickTransaction.account}
              onChange={onChange}
            >
              {availableAccounts.map((account) => (
                <option key={account} value={account}>
                  {account}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSubmit}>
          Add Quick Transaction
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
