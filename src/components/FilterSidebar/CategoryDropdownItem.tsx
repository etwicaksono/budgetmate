import React, { useRef, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import { Icon } from '@/utils/iconResolver';
import './CategoryDropdown.css';

interface CategoryDropdownItemProps {
  name: string;
  color: string;
  icon?: string | undefined;
  isSelected: boolean;
  isIndeterminate?: boolean;
  onClick: () => void;
  onCheckboxClick?: () => void;
  className?: string;
  isBold?: boolean;
  rightElement?: React.ReactNode;
}

/**
 * Single category list item - follows SRP (Single Responsibility Principle)
 * Only responsible for rendering one category option
 */
export const CategoryDropdownItem: React.FC<CategoryDropdownItemProps> = ({
  name,
  color,
  icon,
  isSelected,
  isIndeterminate = false,
  onClick,
  onCheckboxClick,
  className = '',
  isBold = false,
  rightElement,
}) => {
  const checkboxRef = useRef<HTMLInputElement>(null);

  // Set indeterminate state (can't be done via props in React)
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCheckboxClick) {
      onCheckboxClick();
    } else {
      onClick();
    }
  };

  const shouldHighlight = isSelected || isIndeterminate;

  return (
    <div
      className={`category-dropdown-item d-flex align-items-center px-3 py-2 ${
        shouldHighlight ? 'selected' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div onClick={handleCheckboxClick} className="me-2">
        <Form.Check
          ref={checkboxRef}
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          style={{ pointerEvents: 'none' }}
        />
      </div>
      <span
        className="d-inline-flex align-items-center justify-content-center rounded-circle me-2 flex-shrink-0"
        style={{
          width: 24,
          height: 24,
          backgroundColor: color,
          color: '#fff',
        }}
      >
        {icon && <Icon name={icon} size={12} />}
      </span>
      <span className={`text-truncate flex-grow-1 text-start ${isBold ? 'fw-semibold' : ''}`}>
        {name}
      </span>
      {rightElement && <div className="ms-auto">{rightElement}</div>}
    </div>
  );
};
