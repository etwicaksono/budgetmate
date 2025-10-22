import React, { useCallback, useContext, type ReactNode } from 'react';
import { Button } from 'react-bootstrap';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import {
  PeriodNavigationContext,
  PeriodNavigationProvider,
  usePeriodNavigation,
} from './periodNavigationContext';
import type { IconBaseProps, IconType } from 'react-icons';

type IconRenderable = IconType | React.ComponentType<IconBaseProps>;

const renderIcon = (IconComponent: IconRenderable, props: IconBaseProps = {}): React.ReactNode =>
  React.createElement(IconComponent as React.ComponentType<IconBaseProps>, props);

export interface PeriodNavigationProps {
  onPrevious?: () => void;
  onNext?: () => void;
  disablePrevious?: boolean;
  disableNext?: boolean;
  previousAriaLabel?: string;
  nextAriaLabel?: string;
  className?: string;
  children: ReactNode;
}

const PeriodNavigation: React.FC<PeriodNavigationProps> = ({
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
        {renderIcon(FaChevronLeft)}
      </Button>
      {children}
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={nextHandler}
        disabled={nextDisabled}
        aria-label={nextAriaLabel}
      >
        {renderIcon(FaChevronRight)}
      </Button>
    </div>
  );
};

export default PeriodNavigation;
export { PeriodNavigationProvider, usePeriodNavigation };
