import React from 'react';
import { useEffect, useState } from 'react';
import { Form } from 'react-bootstrap';
import type { FormControlProps } from 'react-bootstrap/FormControl';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { NumericFormat, type NumberFormatValues } from 'react-number-format';
import { coerceAndFormatNumber, formatNumberDisplayFromValue } from '../utils/numericInput';

const NumericFormControl = React.forwardRef<HTMLInputElement, FormControlProps>(
  (props, ref) => <Form.Control {...props} ref={ref} />
);
NumericFormControl.displayName = 'NumericFormControl';

interface AmountRangeFilterProps {
  minAmount: number;
  maxAmount: number;
  onMinAmountChange: (value: number) => void;
  onMaxAmountChange: (value: number) => void;
  currency?: string;
  minLimit?: number;
  maxLimit?: number;
  step?: number;
  controlId?: string;
}

const AmountRangeFilter: React.FC<AmountRangeFilterProps> = ({
  minAmount,
  maxAmount,
  onMinAmountChange,
  onMaxAmountChange,
  currency = 'IDR',
  minLimit = 0,
  maxLimit = 20000000,
  step = 100000,
  controlId = 'amountFilter',
}) => {
  const [minInputValue, setMinInputValue] = useState<string>(
    formatNumberDisplayFromValue(minAmount)
  );
  const [maxInputValue, setMaxInputValue] = useState<string>(
    formatNumberDisplayFromValue(maxAmount)
  );
  const [dynamicMaxLimit, setDynamicMaxLimit] = useState<number>(maxLimit);

  useEffect(() => {
    setMinInputValue(formatNumberDisplayFromValue(minAmount));
  }, [minAmount]);

  useEffect(() => {
    setMaxInputValue(formatNumberDisplayFromValue(maxAmount));
    setDynamicMaxLimit((previous) => Math.max(previous, maxAmount, maxLimit));
  }, [maxAmount, maxLimit]);

  useEffect(() => {
    setDynamicMaxLimit((previous) => (maxLimit > previous ? maxLimit : previous));
  }, [maxLimit]);

  const clampValue = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);

  const commitMinAmount = (normalized?: string) => {
    const numericValue = normalized && normalized.length > 0 ? Number(normalized) : minLimit;
    const safeNumeric = Number.isFinite(numericValue) ? numericValue : minLimit;
    const upperBound = Math.max(
      minLimit,
      Math.min(dynamicMaxLimit, Math.max(maxAmount, minLimit))
    );
    const clamped = clampValue(safeNumeric, minLimit, upperBound);
    setMinInputValue(formatNumberDisplayFromValue(clamped));
    onMinAmountChange(clamped);
  };

  const commitMaxAmount = (normalized?: string) => {
    const floor = Math.max(minAmount, minLimit);
    const numericValue = normalized && normalized.length > 0 ? Number(normalized) : floor;
    const safeNumeric = Number.isFinite(numericValue) ? numericValue : floor;
    const upperBound = Math.max(dynamicMaxLimit, safeNumeric, floor);
    const clamped = clampValue(safeNumeric, floor, upperBound);
    setDynamicMaxLimit((previous) => Math.max(previous, clamped));
    setMaxInputValue(formatNumberDisplayFromValue(clamped));
    onMaxAmountChange(clamped);
  };

  const handleSliderChange = (values: number | number[]) => {
    if (Array.isArray(values)) {
      onMinAmountChange(values[0]);
      onMaxAmountChange(values[1]);
      setMinInputValue(formatNumberDisplayFromValue(values[0]));
      setMaxInputValue(formatNumberDisplayFromValue(values[1]));
    }
  };

  const handleMinValueChange = (values: NumberFormatValues) => {
    setMinInputValue(values.value);
    if (typeof values.floatValue !== 'number') {
      return;
    }
    const clamped = clampValue(values.floatValue, minLimit, maxAmount);
    if (clamped !== minAmount) {
      onMinAmountChange(clamped);
    }
  };

  const handleMaxValueChange = (values: NumberFormatValues) => {
    setMaxInputValue(values.value);
    if (typeof values.floatValue !== 'number') {
      return;
    }
    const floor = Math.max(minAmount, minLimit);
    const provisionalLimit = Math.max(dynamicMaxLimit, values.floatValue, maxLimit);
    const clamped = clampValue(values.floatValue, floor, provisionalLimit);
    setDynamicMaxLimit((previous) => Math.max(previous, clamped, maxLimit));
    if (clamped !== maxAmount) {
      onMaxAmountChange(clamped);
    }
  };

  return (
    <Form.Group className="mb-3" controlId={controlId}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <Form.Label className="mb-0">Amount range</Form.Label>
        <small className="text-muted">{currency}</small>
      </div>
      <small className="text-muted d-block mb-2">Absolute amount in referential currency</small>
      <div className="mb-3" style={{ padding: '16px 0' }}>
        <Slider
          range
          min={minLimit}
          max={dynamicMaxLimit}
          step={step}
          value={[minAmount, maxAmount]}
          onChange={handleSliderChange}
          styles={{
            track: {
              backgroundColor: '#0d6efd',
            },
            rail: {
              backgroundColor: '#dee2e6',
            },
            handle: {
              backgroundColor: '#0d6efd',
              borderColor: '#0d6efd',
              boxShadow: '0 0 0 3px rgba(13, 110, 253, 0.25)',
            },
          }}
        />
      </div>
      <div className="d-flex gap-2">
        <div className="flex-grow-1">
          <NumericFormat
            value={minInputValue}
            valueIsNumericString
            thousandSeparator=","
            decimalSeparator="."
            allowNegative={false}
            allowLeadingZeros={false}
            decimalScale={2}
            inputMode="decimal"
            placeholder="Min"
            customInput={NumericFormControl}
            onValueChange={handleMinValueChange}
            onBlur={() => {
              const { normalized } = coerceAndFormatNumber(minInputValue);
              commitMinAmount(normalized);
            }}
          />
          <small className="text-muted d-block mt-1">
            {currency} {minAmount.toLocaleString('en-US')}
          </small>
        </div>
        <div className="flex-grow-1">
          <NumericFormat
            value={maxInputValue}
            valueIsNumericString
            thousandSeparator=","
            decimalSeparator="."
            allowNegative={false}
            allowLeadingZeros={false}
            decimalScale={2}
            inputMode="decimal"
            placeholder="Max"
            customInput={NumericFormControl}
            onValueChange={handleMaxValueChange}
            onBlur={() => {
              const { normalized } = coerceAndFormatNumber(maxInputValue);
              commitMaxAmount(normalized);
            }}
          />
          <small className="text-muted d-block mt-1">
            {currency} {maxAmount.toLocaleString('en-US')}
          </small>
        </div>
      </div>
    </Form.Group>
  );
};

export default AmountRangeFilter;
