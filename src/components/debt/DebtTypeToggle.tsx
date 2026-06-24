'use client';

import React from 'react';
import { ButtonGroup, Button } from 'react-bootstrap';
import { FaArrowCircleUp, FaArrowCircleDown } from 'react-icons/fa';

import { DebtType } from '@prisma/client';

interface DebtTypeToggleProps {
  value: DebtType;
  onChange: (type: DebtType) => void;
  disabled?: boolean;
}

export const DebtTypeToggle: React.FC<DebtTypeToggleProps> = ({ value, onChange, disabled }) => {
  return (
    <ButtonGroup className="w-100 mb-3">
      <Button
        variant={value === DebtType.lend ? 'danger' : 'outline-secondary'}
        onClick={() => onChange(DebtType.lend)}
        disabled={disabled}
        className="d-flex align-items-center justify-content-center gap-2 py-2"
      >
        <FaArrowCircleUp /> Lend
      </Button>
      <Button
        variant={value === DebtType.borrow ? 'success' : 'outline-secondary'}
        onClick={() => onChange(DebtType.borrow)}
        disabled={disabled}
        className="d-flex align-items-center justify-content-center gap-2 py-2"
      >
        <FaArrowCircleDown /> Borrow
      </Button>
    </ButtonGroup>
  );
};
