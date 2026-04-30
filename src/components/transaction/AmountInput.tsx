'use client';

import React, { forwardRef, useRef } from 'react';
import { Form } from 'react-bootstrap';
import { NumericFormat } from 'react-number-format';
import type { FormControlProps } from 'react-bootstrap/FormControl';
import { ClearButton } from '@/components/common/ClearButton';

export interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  type: 'income' | 'expense';
  isInvalid?: boolean;
  placeholder?: string;
  disabled?: boolean;
  prefix?: string;
}

const NumericFormControl = forwardRef<HTMLInputElement, FormControlProps>(
  (props, ref) => <Form.Control {...props} ref={ref} />,
);
NumericFormControl.displayName = 'NumericFormControl';

export function AmountInput({
  value,
  onChange,
  type,
  isInvalid = false,
  placeholder = 'Enter amount',
  disabled = false,
  prefix,
}: AmountInputProps): React.JSX.Element {
  const color = type === 'expense' ? '#dc3545' : '#198754';
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClear = () => {
    onChange('');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <div className="position-relative">
      <NumericFormat
        getInputRef={inputRef}
        value={value}
        thousandSeparator=","
        decimalSeparator="."
        decimalScale={2}
        allowNegative={false}
        allowLeadingZeros={false}
        inputMode="decimal"
        name="amount"
        placeholder={placeholder}
        autoComplete="off"
        valueIsNumericString
        className={`text-end${value && !disabled ? ' pe-5' : ''}`}
        style={{ color }}
        isInvalid={isInvalid}
        disabled={disabled}
        {...(prefix !== undefined && { prefix })}
        customInput={NumericFormControl}
        onValueChange={(values) => {
          onChange(values.value);
        }}
      />
      {value && !disabled && (
        <ClearButton
          className="position-absolute end-0 top-50 translate-middle-y me-1"
          style={{ zIndex: 5 }}
          onClick={handleClear}
          tabIndex={-1}
        />
      )}
    </div>
  );
}
