import React, { type MouseEvent as ReactMouseEvent } from 'react';
import { FaTimesCircle } from 'react-icons/fa';

interface ClearButtonProps {
    onClick: () => void;
    ariaLabel?: string;
    className?: string;
    style?: React.CSSProperties;
    size?: number;
}

export const ClearButton: React.FC<ClearButtonProps> = ({ 
    onClick, 
    ariaLabel = "Clear search",
    className = "",
    style = {},
    size = 14
}) => {
    return (
        <button
            type="button"
            className={`btn btn-sm text-muted ${className}`}
            style={{ border: 'none', background: 'transparent', padding: '0 0.5rem', ...style }}
            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                event.preventDefault();
                event.stopPropagation();
                onClick();
            }}
            aria-label={ariaLabel}
        >
            <FaTimesCircle size={size} />
        </button>
    );
};
