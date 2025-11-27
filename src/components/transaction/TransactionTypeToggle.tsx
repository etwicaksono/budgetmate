'use client';

import React from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';

export interface TransactionTypeToggleProps {
  value: 'income' | 'expense' | 'transfer';
  onChange: (type: 'income' | 'expense' | 'transfer') => void;
}

const TYPE_OPTIONS = [
  { value: 'expense' as const, label: 'Expense', variant: 'danger' },
  { value: 'income' as const, label: 'Income', variant: 'success' },
  { value: 'transfer' as const, label: 'Transfer', variant: 'primary' },
];

export function TransactionTypeToggle({ value, onChange }: TransactionTypeToggleProps): React.JSX.Element {
  return (
    <ButtonGroup className="w-100">
      {TYPE_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={value === option.value ? option.variant : 'outline-secondary'}
          onClick={() => onChange(option.value)}
          size="lg"
        >
          {option.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}
