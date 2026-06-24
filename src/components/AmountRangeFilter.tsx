import React from 'react';
import { useEffect, useState } from 'react';
import { Form } from 'react-bootstrap';
import type { FormControlProps } from 'react-bootstrap/FormControl';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { NumericFormat, type NumberFormatValues } from 'react-number-format';


const NumericFormControl = React.forwardRef<HTMLInputElement, FormControlProps>(
  (props, ref) => <Form.Control {...props} ref={ref} />
);
NumericFormControl.displayName = 'NumericFormControl';

interface AmountRangeFilterProps {
  minAmount: number;
  maxAmount: number;
  onMinAmountChange: (value: number) => void;
  onMaxAmountChange: (value: number) => void;
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
  minLimit = 0,
  maxLimit = 20000000,
  step = 100000,
  controlId = 'amountFilter',
}) => {
  const [minInputValue, setMinInputValue] = useState<string>(minAmount.toString());
  const [maxInputValue, setMaxInputValue] = useState<string>(maxAmount.toString());
  const [dynamicMaxLimit, setDynamicMaxLimit] = useState<number>(maxLimit);

  useEffect(() => {
    setMinInputValue(minAmount.toString());
  }, [minAmount]);

  useEffect(() => {
    setMaxInputValue(maxAmount.toString());
    setDynamicMaxLimit((previous) => Math.max(previous, maxAmount, maxLimit));
  }, [maxAmount, maxLimit]);

  useEffect(() => {
    setDynamicMaxLimit((previous) => (maxLimit > previous ? maxLimit : previous));
  }, [maxLimit]);

  const clampValue = (value: number, min: number, max: number): number =>
    Math.min(Math.max(value, min), max);

  const commitMinAmount = (valueString?: string) => {
    const numericValue = valueString && valueString.length > 0 ? Number(valueString) : minLimit;
    const safeNumeric = Number.isFinite(numericValue) ? numericValue : minLimit;
    const upperBound = Math.max(
      minLimit,
      Math.min(dynamicMaxLimit, Math.max(maxAmount, minLimit))
    );
    const clamped = clampValue(safeNumeric, minLimit, upperBound);
    onMinAmountChange(clamped);
  };

  const commitMaxAmount = (valueString?: string) => {
    const floor = Math.max(minAmount, minLimit);
    const numericValue = valueString && valueString.length > 0 ? Number(valueString) : floor;
    const safeNumeric = Number.isFinite(numericValue) ? numericValue : floor;
    const upperBound = Math.max(dynamicMaxLimit, safeNumeric, floor);
    const clamped = clampValue(safeNumeric, floor, upperBound);
    setDynamicMaxLimit((previous) => Math.max(previous, clamped));
    onMaxAmountChange(clamped);
  };

  const handleSliderChange = (values: number | number[]) => {
    if (Array.isArray(values)) {
      const [minValue, maxValue] = values;
      if (typeof minValue !== 'number' || typeof maxValue !== 'number') {
        return;
      }
      onMinAmountChange(minValue);
      onMaxAmountChange(maxValue);
      setMinInputValue(minValue.toString());
      setMaxInputValue(maxValue.toString());
    }
  };

  const handleMinValueChange = (values: NumberFormatValues) => {
    setMinInputValue(values.value);
  };

  const handleMaxValueChange = (values: NumberFormatValues) => {
    setMaxInputValue(values.value);
  };

  return (
    <Form.Group className="mb-3" controlId={controlId}>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <Form.Label className="mb-0">Amount range</Form.Label>
        <small className="text-muted">IDR</small>
      </div>
      <small className="text-muted d-block mb-2">Absolute amount in IDR</small>
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
            placeholder="0"
            customInput={NumericFormControl}
            onValueChange={handleMinValueChange}
            onBlur={() => {
              commitMinAmount(minInputValue);
            }}
          />
          <small className="text-muted d-block mt-1">
            IDR {minAmount.toLocaleString('en-US')}
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
            placeholder="20,000,000"
            customInput={NumericFormControl}
            onValueChange={handleMaxValueChange}
            onBlur={() => {
              commitMaxAmount(maxInputValue);
            }}
          />
          <small className="text-muted d-block mt-1">
            IDR {maxAmount.toLocaleString('en-US')}
          </small>
        </div>
      </div>
    </Form.Group>
  );
};

export default AmountRangeFilter;
