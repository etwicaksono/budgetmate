'use client';

import React, { memo } from 'react';
import { Form } from 'react-bootstrap';

interface TransactionListHeaderProps {
  showSelection?: boolean;
  selectAll?: boolean;
  onSelectAll?: () => void;
}

const TransactionListHeader: React.FC<TransactionListHeaderProps> = memo(({
  showSelection = false,
  selectAll = false,
  onSelectAll,
}) => {
  return (
    <thead>
      <tr>
        {showSelection && (
          <th className="text-center" style={{ width: '40px' }}>
            <Form.Check
              type="checkbox"
              checked={selectAll}
              onChange={onSelectAll}
              aria-label="Select all transactions"
            />
          </th>
        )}
        <th>Description</th>
        <th>Type</th>
        <th>Category</th>
        <th>Account</th>
        <th className="text-end">Amount</th>
        <th style={{ width: '50px' }}></th>
      </tr>
    </thead>
  );
});

TransactionListHeader.displayName = 'TransactionListHeader';

export default TransactionListHeader;
