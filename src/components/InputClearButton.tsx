import React from 'react';
import * as FaIcons from 'react-icons/fa';
import type { MouseEvent as ReactMouseEvent } from 'react';
import type { IconBaseProps } from 'react-icons';

interface InputClearButtonProps {
  onClick: (event?: ReactMouseEvent<HTMLButtonElement>) => void;
  show?: boolean;
  title?: string;
  ariaLabel?: string;
  className?: string;
  rightOffset?: string;
  iconSize?: number;
  colorClass?: string;
  positionAbsolute?: boolean;
}

export function InputClearButton({
  onClick,
  show = true,
  title = 'Clear',
  ariaLabel = 'Clear',
  className = 'btn p-0 border-0 bg-transparent',
  rightOffset = '0.75rem',
  iconSize = 18,
  colorClass = 'text-muted',
  positionAbsolute = true,
}: InputClearButtonProps): JSX.Element | null {
  if (!show) {return null;}

  const classes = positionAbsolute
    ? `${className} position-absolute top-50 end-0 translate-middle-y ${colorClass}`
    : `${className} ${colorClass}`;

  return (
    <button
      type="button"
      className={classes}
      onClick={(event) => onClick(event)}
      title={title}
      aria-label={ariaLabel}
      style={{ marginRight: rightOffset }}
    >
      {React.createElement(FaIcons.FaTimesCircle as React.ComponentType<IconBaseProps>, { size: iconSize })}
    </button>
  );
}

export default InputClearButton;