'use client';

import React from 'react';
import { Button } from 'react-bootstrap';
import { FaPlus } from 'react-icons/fa';
import { useTransaction, type TransactionFormData } from '@/contexts/TransactionContext';

interface RecordTransactionButtonProps {
  variant?: string;
  size?: 'sm' | 'lg';
  className?: string;
  prefillData?: Partial<TransactionFormData>;
  children?: React.ReactNode;
  block?: boolean;
}

/**
 * Reusable button component to open the global transaction modal from anywhere
 * 
 * Usage examples:
 * 
 * 1. Simple add button:
 *    <RecordTransactionButton />
 * 
 * 2. Custom text:
 *    <RecordTransactionButton>Add Expense</RecordTransactionButton>
 * 
 * 3. Prefill with account:
 *    <RecordTransactionButton prefillData={{ account_id: '123', type: 'expense' }}>
 *      Add to this account
 *    </RecordTransactionButton>
 * 
 * 4. Prefill with category:
 *    <RecordTransactionButton prefillData={{ category_id: '456', type: 'income' }}>
 *      Quick Income
 *    </RecordTransactionButton>
 */
export const RecordTransactionButton: React.FC<RecordTransactionButtonProps> = ({
  variant = 'primary',
  size,
  className = '',
  prefillData,
  children,
}) => {
  const { openAddModal } = useTransaction();

  const handleClick = () => {
    openAddModal(prefillData);
  };

  return (
    <Button
      variant={variant}
      {...(size ? { size } : {})}
      className={className}
      onClick={handleClick}
    >
      <FaPlus className="me-2" />
      {children || 'Record Transaction'}
    </Button>
  );
};
