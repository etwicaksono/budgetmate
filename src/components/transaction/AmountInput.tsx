'use client';

import React, { forwardRef } from 'react';
import { Form } from 'react-bootstrap';
import { NumericFormat } from 'react-number-format';
import type { FormControlProps } from 'react-bootstrap/FormControl';

export interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  type: 'income' | 'expense';
  isInvalid?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

const NumericFormControl = forwardRef<HTMLInputElement, FormControlProps>(
  (props, ref) => <Form.Control {...props} ref={ref} />
);
NumericFormControl.displayName = 'NumericFormControl';

export function AmountInput({
  value,
  onChange,
  type,
  isInvalid = false,
  placeholder = 'Enter amount',
  disabled = false,
}: AmountInputProps): React.JSX.Element {
  const color = type === 'expense' ? '#dc3545' : '#198754';

  return (
    <NumericFormat
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
      className="text-end"
      style={{ color }}
      isInvalid={isInvalid}
      disabled={disabled}
      customInput={NumericFormControl}
      onValueChange={(values) => {
        onChange(values.value);
      }}
    />
  );
}
