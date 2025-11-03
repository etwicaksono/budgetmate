'use client';

import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { FaPlus, FaFileImport } from 'react-icons/fa';

interface TransactionListEmptyProps {
  onAddTransaction?: () => void;
  onImportTransactions?: () => void;
}

const TransactionListEmpty: React.FC<TransactionListEmptyProps> = ({
  onAddTransaction,
  onImportTransactions,
}) => {
  return (
    <Card>
      <Card.Body className="text-center py-5">
        <div className="mb-4">
          <FaFileImport size={48} className="text-muted" />
        </div>
        <h5 className="mb-3">No Transactions Found</h5>
        <p className="text-muted mb-4">
          Get started by adding your first transaction or importing existing data.
        </p>
        <div className="d-flex justify-content-center gap-2">
          {onAddTransaction && (
            <Button variant="primary" onClick={onAddTransaction}>
              <FaPlus className="me-2" />
              Add Transaction
            </Button>
          )}
          {onImportTransactions && (
            <Button variant="outline-primary" onClick={onImportTransactions}>
              <FaFileImport className="me-2" />
              Import Transactions
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default TransactionListEmpty;
