'use client';

import React, { memo, useCallback } from 'react';
import { FixedSizeList } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Card } from 'react-bootstrap';
import TransactionListItem from './TransactionListItem';
import TransactionListHeader from './TransactionListHeader';
import TransactionListEmpty from './TransactionListEmpty';
import TransactionListSkeleton from './TransactionListSkeleton';
import type { TransactionRecord, SelectionState } from '../../types';

interface VirtualTransactionListProps {
  transactions: TransactionRecord[];
  loading?: boolean;
  selection?: SelectionState;
  onSelect?: (id: number) => void;
  onSelectAll?: () => void;
  onEdit?: (transaction: TransactionRecord) => void;
  onDelete?: (id: number) => void;
  onDuplicate?: (transaction: TransactionRecord) => void;
  itemHeight?: number;
}

/**
 * Virtual scrolling implementation for large transaction lists
 * Uses react-window for performance optimization
 */
const VirtualTransactionList: React.FC<VirtualTransactionListProps> = memo(({
  transactions,
  loading = false,
  selection,
  onSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onDuplicate,
  itemHeight = 80,
}) => {
  // Row renderer for virtual list
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const transaction = transactions[index];
    
    return (
      <div style={style}>
        <table className="table mb-0">
          <tbody>
            <TransactionListItem
              transaction={transaction}
              selected={selection?.selectedIds.has(transaction.id) || false}
              onSelect={onSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
            />
          </tbody>
        </table>
      </div>
    );
  }, [transactions, selection, onSelect, onEdit, onDelete, onDuplicate]);

  if (loading) {
    return <TransactionListSkeleton />;
  }

  if (transactions.length === 0) {
    return <TransactionListEmpty />;
  }

  return (
    <Card>
      <Card.Body className="p-0">
        <div className="virtual-list-container">
          {/* Fixed header */}
          <table className="table mb-0">
            <TransactionListHeader
              showSelection={!!selection}
              selectAll={selection?.selectAll || false}
              onSelectAll={onSelectAll}
            />
          </table>
          
          {/* Virtual scrolling list */}
          <AutoSizer>
            {({ height, width }) => (
              <FixedSizeList
                height={Math.min(height || 600, transactions.length * itemHeight)}
                itemCount={transactions.length}
                itemSize={itemHeight}
                width={width || '100%'}
                overscanCount={5} // Render 5 items outside of visible area for smoother scrolling
              >
                {Row as any}
              </FixedSizeList>
            )}
          </AutoSizer>
        </div>
      </Card.Body>
      
      <style jsx>{`
        .virtual-list-container {
          height: 600px;
          position: relative;
        }
        
        .virtual-list-container table {
          margin-bottom: 0;
        }
        
        .virtual-list-container .table thead {
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
        }
      `}</style>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Optimized comparison for virtual list
  return (
    prevProps.loading === nextProps.loading &&
    prevProps.transactions.length === nextProps.transactions.length &&
    prevProps.selection?.selectedIds.size === nextProps.selection?.selectedIds.size &&
    prevProps.selection?.selectAll === nextProps.selection?.selectAll &&
    prevProps.itemHeight === nextProps.itemHeight
  );
});

VirtualTransactionList.displayName = 'VirtualTransactionList';

export default VirtualTransactionList;
