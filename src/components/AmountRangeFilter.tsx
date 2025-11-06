import React from 'react';
import { Form } from 'react-bootstrap';
import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';

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
  const handleSliderChange = (values: number | number[]) => {
    if (Array.isArray(values)) {
      onMinAmountChange(values[0]);
      onMaxAmountChange(values[1]);
    }
  };

  const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || value === '-') {
      onMinAmountChange(minLimit);
    } else {
      onMinAmountChange(Math.max(minLimit, Number(value)));
    }
  };

  const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || value === '-') {
      onMaxAmountChange(maxLimit);
    } else {
      onMaxAmountChange(Math.max(minLimit, Number(value)));
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
          max={maxLimit}
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
          <Form.Control
            type="number"
            placeholder="Min"
            value={minAmount}
            onChange={handleMinInputChange}
            min={minLimit}
            step={step}
          />
          <small className="text-muted d-block mt-1">
            {currency} {minAmount.toLocaleString('en-US')}
          </small>
        </div>
        <div className="flex-grow-1">
          <Form.Control
            type="number"
            placeholder="Max"
            value={maxAmount}
            onChange={handleMaxInputChange}
            min={minLimit}
            step={step}
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
