import React, { useState, useMemo } from 'react';
import { Dropdown } from 'react-bootstrap';
import { FaCheck } from 'react-icons/fa';
import type { IconType } from 'react-icons';

export interface SortOption<T extends string> {
  value: T;
  icon: IconType;
  title: string;
  ariaLabel: string;
}

export interface SortDropdownProps<T extends string> {
  id: string;
  value: T;
  options: SortOption<T>[];
  onChange?: (value: T) => void;
  className?: string;
}

export function SortDropdown<T extends string>({ 
  id, 
  value, 
  options, 
  onChange, 
  className = 'w-100' 
}: SortDropdownProps<T>): React.JSX.Element {
  const [show, setShow] = useState(false);
  
  const selectedOption = useMemo<SortOption<T> | undefined>(
    () => options.find((option) => option.value === value) ?? options[0],
    [value, options]
  );
  
  const handleSelect = (nextValue: T) => {
    onChange?.(nextValue);
    setShow(false);
  };
  
  const renderOptionContent = (option?: SortOption<T>) =>
    option ? (
      <span className="d-inline-flex align-items-center gap-2" title={option.ariaLabel}>
        <option.icon size={14} title={option.ariaLabel} className="text-secondary" />
        <span>{option.title}</span>
      </span>
    ) : (
      <span>Select sort order</span>
    );

  return (
    <Dropdown
      show={show}
      onToggle={(nextShow: boolean | null) => {
        setShow(nextShow ?? false);
      }}
      className={className}
    >
      <Dropdown.Toggle
        id={id}
        variant="outline-secondary"
        className="d-flex align-items-center justify-content-between w-100 gap-2 text-start bg-white"
        aria-label={selectedOption?.ariaLabel}
        title={selectedOption?.ariaLabel}
      >
        <span className="d-flex align-items-center gap-2 text-truncate text-dark fw-normal">
          {renderOptionContent(selectedOption)}
        </span>
      </Dropdown.Toggle>
      
      <Dropdown.Menu className="w-100 p-1 shadow-sm border-0">
        {options.map((option) => {
          const isSelected = option.value === value;
          const itemClasses = [
            'd-flex',
            'align-items-center',
            'gap-2',
            'w-100',
            'bg-white',
            'border-0',
            'rounded-2'
          ];
          if (isSelected) {
            itemClasses.push('bg-light');
          }
          return (
            <Dropdown.Item
              key={option.value}
              as="button"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleSelect(option.value);
              }}
              className={itemClasses.join(' ')}
              aria-label={option.ariaLabel}
              title={option.ariaLabel}
              style={{ padding: '0.5rem 0.75rem' }}
            >
              <div style={{ width: '1.25rem' }} className="d-flex align-items-center justify-content-center">
                {isSelected && <FaCheck className="text-primary" size={12} />}
              </div>
              <span className="flex-grow-1 text-start" style={{ fontWeight: isSelected ? 600 : 400 }}>
                {renderOptionContent(option)}
              </span>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}
