import React, { useCallback, useContext } from 'react';
import { Button } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import {
  PeriodNavigationContext,
  PeriodNavigationProvider,
  usePeriodNavigation,
} from './periodNavigationContext';

const PeriodNavigation = ({
  onPrevious,
  onNext,
  disablePrevious,
  disableNext,
  previousAriaLabel = 'Previous period',
  nextAriaLabel = 'Next period',
  className = '',
  children,
}) => {
  const context = useContext(PeriodNavigationContext);
  const canShiftPeriod = context?.meta?.canShiftPeriod ?? true;
  const shiftPeriod = context?.actions?.shiftPeriod;

  const defaultPrevious = useCallback(() => {
    if (typeof shiftPeriod === 'function') {
      shiftPeriod(-1);
    }
  }, [shiftPeriod]);

  const defaultNext = useCallback(() => {
    if (typeof shiftPeriod === 'function') {
      shiftPeriod(1);
    }
  }, [shiftPeriod]);

  const previousHandler = onPrevious ?? defaultPrevious;
  const nextHandler = onNext ?? defaultNext;

  const previousDisabled =
    typeof disablePrevious === 'boolean' ? disablePrevious : !canShiftPeriod || !shiftPeriod;
  const nextDisabled =
    typeof disableNext === 'boolean' ? disableNext : !canShiftPeriod || !shiftPeriod;

  const containerClasses = [
    'd-flex',
    'justify-content-center',
    'align-items-center',
    'gap-2',
    'flex-wrap',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={previousHandler}
        disabled={previousDisabled}
        aria-label={previousAriaLabel}
      >
        <FaChevronLeft />
      </Button>
      {children}
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={nextHandler}
        disabled={nextDisabled}
        aria-label={nextAriaLabel}
      >
        <FaChevronRight />
      </Button>
    </div>
  );
};

export default PeriodNavigation;
export { PeriodNavigationProvider, usePeriodNavigation };
