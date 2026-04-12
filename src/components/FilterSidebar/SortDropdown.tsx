import React, { useState, useMemo } from 'react';
import { Dropdown } from 'react-bootstrap';
import {
  FaCheck,
  FaSortAmountUp,
  FaSortAmountDown,
  FaSortAmountUpAlt,
  FaSortAmountDownAlt,
} from 'react-icons/fa';
import { renderIcon } from './FilterSidebar.utils';
import type { SortDropdownProps, SortOption, SortValue } from './FilterSidebar.types';

const SORT_OPTIONS: SortOption[] = [
  {
    value: 'timeAsc',
    icon: FaSortAmountUp,
    title: 'Time ASC',
    ariaLabel: 'Time ascending (oldest first)',
  },
  {
    value: 'timeDesc',
    icon: FaSortAmountDown,
    title: 'Time DESC',
    ariaLabel: 'Time descending (newest first)',
  },
  {
    value: 'amountAsc',
    icon: FaSortAmountUp,
    title: 'Amount ASC',
    ariaLabel: 'Amount ascending (lowest first)',
  },
  {
    value: 'amountDesc',
    icon: FaSortAmountDown,
    title: 'Amount DESC',
    ariaLabel: 'Amount descending (highest first)',
  },
  {
    value: 'absAmountAsc',
    icon: FaSortAmountUpAlt,
    title: 'Absolute amount ASC',
    ariaLabel: 'Absolute amount ascending (lowest first)',
  },
  {
    value: 'absAmountDesc',
    icon: FaSortAmountDownAlt,
    title: 'Absolute amount DESC',
    ariaLabel: 'Absolute amount descending (highest first)',
  },
];

const DEFAULT_SORT_OPTION: SortOption = SORT_OPTIONS[0] ?? {
  value: 'timeAsc',
  icon: FaSortAmountUp,
  title: 'Time ASC',
  ariaLabel: 'Time ascending (oldest first)',
};

export function SortDropdown({ id, value, onChange }: SortDropdownProps): React.JSX.Element {
  const [show, setShow] = useState(false);
  
  const selectedOption = useMemo<SortOption>(
    () => SORT_OPTIONS.find((option) => option.value === value) ?? DEFAULT_SORT_OPTION,
    [value]
  );
  
  const handleSelect = (nextValue: SortValue) => {
    onChange?.(nextValue);
    setShow(false);
  };
  
  const renderOptionContent = (option?: SortOption) =>
    option ? (
      <span className="d-inline-flex align-items-center gap-1" title={option.ariaLabel}>
        {renderIcon(option.icon, { title: option.ariaLabel })}
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
      className="w-100"
    >
      <Dropdown.Toggle
        id={id}
        variant="outline-secondary"
        className="sort-dropdown-toggle d-flex align-items-center justify-content-between w-100 gap-2"
        aria-label={selectedOption.ariaLabel}
        title={selectedOption.ariaLabel}
      >
        <span className="d-flex align-items-center gap-2">
          <span className="text-truncate">{renderOptionContent(selectedOption)}</span>
        </span>
      </Dropdown.Toggle>
      
      <Dropdown.Menu className="sort-dropdown-menu w-100 p-1">
        {SORT_OPTIONS.map((option) => {
          const isSelected = option.value === value;
          const itemClasses = [
            'sort-dropdown-item',
            'd-flex',
            'align-items-center',
            'gap-2',
            'w-100',
            'bg-white',
          ];
          if (isSelected) {
            itemClasses.push('selected');
          }
          return (
            <Dropdown.Item
              key={option.value}
              as="button"
              type="button"
              onClick={() => {
                handleSelect(option.value);
              }}
              className={itemClasses.join(' ')}
              aria-label={option.ariaLabel}
              title={option.ariaLabel}
            >
              {isSelected && (
                <span
                  className="d-inline-flex justify-content-center"
                  style={{ width: '1.25rem' }}
                >
                  {renderIcon(FaCheck, { className: 'text-success' })}
                </span>
              )}
              {!isSelected && <span style={{ width: '1.25rem' }}></span>}
              <span className="flex-grow-1 text-start">{renderOptionContent(option)}</span>
            </Dropdown.Item>
          );
        })}
      </Dropdown.Menu>
    </Dropdown>
  );
}
