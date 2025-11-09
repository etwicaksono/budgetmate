'use client';

import React, { memo } from 'react';
import { Form, Badge, Dropdown, Button } from 'react-bootstrap';
import { FaEllipsisV, FaEdit, FaTrash, FaCopy } from 'react-icons/fa';
import type { TransactionRecord } from '../../types';
import { formatCurrency, getTransactionSign } from '../../utils/transactionCalculations';
// TODO: Update transaction row rendering to match new visual style.

interface TransactionListItemProps {
  transaction: TransactionRecord;
  selected?: boolean;
  onSelect?: (id: number) => void;
  onEdit?: (transaction: TransactionRecord) => void;
  onDelete?: (id: number) => void;
  onDuplicate?: (transaction: TransactionRecord) => void;
}

const TransactionListItem: React.FC<TransactionListItemProps> = memo(({
  transaction,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  const handleSelect = () => {
    onSelect?.(transaction.id);
  };

  const handleEdit = () => {
    onEdit?.(transaction);
  };

  const handleDelete = () => {
    onDelete?.(transaction.id);
  };

  const handleDuplicate = () => {
    onDuplicate?.(transaction);
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'Income':
        return 'success';
      case 'Expense':
        return 'danger';
      case 'Transfer':
        return 'info';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <tr className={selected ? 'table-active' : ''}>
      {onSelect && (
        <td className="text-center" style={{ width: '40px' }}>
          <Form.Check
            type="checkbox"
            checked={selected}
            onChange={handleSelect}
            aria-label={`Select transaction ${transaction.id}`}
          />
        </td>
      )}
      <td>
        <div>
          <strong>{transaction.description || 'No description'}</strong>
          <br />
          <small className="text-muted">{formatDate(transaction.date)}</small>
        </div>
      </td>
      <td>
        <Badge bg={getTypeVariant(transaction.type)}>
          {transaction.type}
        </Badge>
      </td>
      <td>{transaction.category || '-'}</td>
      <td>{transaction.accountName || transaction.account || '-'}</td>
      <td className="text-end">
        <span className={`text-${getTypeVariant(transaction.type)}`}>
          {getTransactionSign(transaction.type)} {formatCurrency(Math.abs(Number(transaction.amount)))}
        </span>
      </td>
      <td className="text-center" style={{ width: '50px' }}>
        <Dropdown align="end">
          <Dropdown.Toggle
            as={Button}
            variant="link"
            size="sm"
            className="text-muted p-0"
          >
            <FaEllipsisV />
          </Dropdown.Toggle>
          <Dropdown.Menu>
            {onEdit && (
              <Dropdown.Item onClick={handleEdit}>
                <FaEdit className="me-2" />
                Edit
              </Dropdown.Item>
            )}
            {onDuplicate && (
              <Dropdown.Item onClick={handleDuplicate}>
                <FaCopy className="me-2" />
                Duplicate
              </Dropdown.Item>
            )}
            {onDelete && (
              <>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleDelete} className="text-danger">
                  <FaTrash className="me-2" />
                  Delete
                </Dropdown.Item>
              </>
            )}
          </Dropdown.Menu>
        </Dropdown>
      </td>
    </tr>
  );
});

TransactionListItem.displayName = 'TransactionListItem';

export default TransactionListItem;
