import React from 'react';
import { Form } from 'react-bootstrap';
import { Icon } from '@/utils/iconResolver';
import './CategoryDropdown.css';

interface AccountDropdownItemProps {
  name: string;
  color: string;
  icon?: string | undefined;
  isSelected: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Single account list item - follows same style as CategoryDropdownItem
 */
export const AccountDropdownItem: React.FC<AccountDropdownItemProps> = ({
  name,
  color,
  icon,
  isSelected,
  onClick,
  className = '',
}) => {
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <div
      className={`category-dropdown-item d-flex align-items-center px-3 py-2 ${
        isSelected ? 'selected' : ''
      } ${className}`}
      onClick={onClick}
    >
      <div onClick={handleCheckboxClick} className="me-2">
        <Form.Check
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
      <span className="text-truncate flex-grow-1 text-start">
        {name}
      </span>
    </div>
  );
};
