'use client';

import React from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';
import { FaArrowCircleUp, FaArrowCircleDown } from 'react-icons/fa';

import { DEBT_TYPES } from '@/utils/constants';

interface DebtTypeToggleProps {
  value: typeof DEBT_TYPES.LEND | typeof DEBT_TYPES.BORROW;
  onChange: (type: typeof DEBT_TYPES.LEND | typeof DEBT_TYPES.BORROW) => void;
  disabled?: boolean;
}

export const DebtTypeToggle: React.FC<DebtTypeToggleProps> = ({ value, onChange, disabled }) => {
  return (
    <ButtonGroup className="w-100 mb-3">
      <Button
        variant={value === DEBT_TYPES.LEND ? 'success' : 'outline-secondary'}
        onClick={() => onChange(DEBT_TYPES.LEND as typeof DEBT_TYPES.LEND)}
        disabled={disabled}
        className="d-flex align-items-center justify-content-center gap-2 py-2"
      >
        <FaArrowCircleUp /> Lend
      </Button>
      <Button
        variant={value === DEBT_TYPES.BORROW ? 'danger' : 'outline-secondary'}
        onClick={() => onChange(DEBT_TYPES.BORROW as typeof DEBT_TYPES.BORROW)}
        disabled={disabled}
        className="d-flex align-items-center justify-content-center gap-2 py-2"
      >
        <FaArrowCircleDown /> Borrow
      </Button>
    </ButtonGroup>
  );
};
