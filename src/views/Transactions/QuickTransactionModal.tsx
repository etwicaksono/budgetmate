import React, { type ChangeEvent } from 'react';
import { Modal, Form, Button } from 'react-bootstrap';

export interface QuickTransactionFormValues {
  description: string;
  category: string;
  amount: string | number;
  account: string;
  type: string;
  currency: string;
}

type QuickTransactionChangeEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;

export interface QuickTransactionModalProps {
  show: boolean;
  onHide: () => void;
  quickTransaction: QuickTransactionFormValues | null;
  onChange: (event: QuickTransactionChangeEvent) => void;
  onSubmit: () => void;
  availableCategories: string[];
  availableAccounts: string[];
}

export function QuickTransactionModal({
  show,
  onHide,
  quickTransaction,
  onChange,
  onSubmit,
  availableCategories,
  availableAccounts,
}: QuickTransactionModalProps): JSX.Element | null {
  if (!quickTransaction) {
    return null;
  }

  const selectableCategories = availableCategories.filter((category) => category !== 'All');

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
              {selectableCategories.map((category) => (
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
}
