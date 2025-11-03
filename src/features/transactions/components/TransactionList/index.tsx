'use client';

import React, { memo } from 'react';
import { Card, Table } from 'react-bootstrap';
import TransactionListItem from './TransactionListItem';
import TransactionListHeader from './TransactionListHeader';
import TransactionListEmpty from './TransactionListEmpty';
import TransactionListSkeleton from './TransactionListSkeleton';
import type { TransactionRecord, SelectionState } from '../../types';

interface TransactionListProps {
  transactions: TransactionRecord[];
  loading?: boolean;
  selection?: SelectionState;
  onSelect?: (id: number) => void;
  onSelectAll?: () => void;
  onEdit?: (transaction: TransactionRecord) => void;
  onDelete?: (id: number) => void;
  onDuplicate?: (transaction: TransactionRecord) => void;
}

const TransactionList: React.FC<TransactionListProps> = memo(({
  transactions,
  loading = false,
  selection,
  onSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onDuplicate,
}) => {
  if (loading) {
    return <TransactionListSkeleton />;
  }

  if (transactions.length === 0) {
    return <TransactionListEmpty />;
  }

  return (
    <Card>
      <Card.Body className="p-0">
        <Table responsive hover className="mb-0">
          <TransactionListHeader
            showSelection={!!selection}
            selectAll={selection?.selectAll || false}
            onSelectAll={onSelectAll}
          />
          <tbody>
            {transactions.map(transaction => (
              <TransactionListItem
                key={transaction.id}
                transaction={transaction}
                selected={selection?.selectedIds.has(transaction.id) || false}
                onSelect={onSelect}
                onEdit={onEdit}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
              />
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.transactions.length === nextProps.transactions.length &&
    prevProps.selection?.selectedIds.size === nextProps.selection?.selectedIds.size &&
    prevProps.selection?.selectAll === nextProps.selection?.selectAll &&
    // Deep comparison only if lengths are the same
    (prevProps.transactions.length === 0 || 
     prevProps.transactions[0].id === nextProps.transactions[0].id)
  );
});

TransactionList.displayName = 'TransactionList';

export default TransactionList;
