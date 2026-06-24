// TODO: Remove dead code — this component is no longer imported anywhere.
// Sort dropdown logic was inlined into AnalyticsToolbar.tsx (BudgetToolbar pattern).

import React, { useState, useMemo } from 'react';
import { Dropdown } from 'react-bootstrap';
import { FaCheck, FaSortAmountUp, FaSortAmountDown, FaSortAlphaDown, FaSortAlphaUpAlt } from 'react-icons/fa';
import { renderIcon } from '@/components/FilterSidebar/FilterSidebar.utils';
import type { SortDropdownProps, SortOption, SortValue } from '@/components/FilterSidebar/FilterSidebar.types';

const ANALYTICS_SORT_OPTIONS: SortOption[] = [
  {
    value: 'timeDesc',
    icon: FaSortAmountDown,
    title: 'Default',
    ariaLabel: 'Default order',
  },
  {
    value: 'amountDesc',
    icon: FaSortAmountDown,
    title: 'Amount DESC',
    ariaLabel: 'Amount descending (highest first)',
  },
  {
    value: 'amountAsc',
    icon: FaSortAmountUp,
    title: 'Amount ASC',
    ariaLabel: 'Amount ascending (lowest first)',
  },
  {
    value: 'absAmountDesc',
    icon: FaSortAlphaUpAlt,
    title: 'Name DESC',
    ariaLabel: 'Name descending (Z to A)',
  },
  {
    value: 'absAmountAsc',
    icon: FaSortAlphaDown,
    title: 'Name ASC',
    ariaLabel: 'Name ascending (A to Z)',
  },
];

const DEFAULT_SORT_OPTION: SortOption = ANALYTICS_SORT_OPTIONS[0] ?? {
  value: 'timeDesc',
  icon: FaSortAmountDown,
  title: 'Default',
  ariaLabel: 'Default order',
};

export function AnalyticsSortDropdown({ id, value, onChange }: SortDropdownProps): React.JSX.Element {
  const [show, setShow] = useState(false);

  const selectedOption = useMemo<SortOption>(
    () => ANALYTICS_SORT_OPTIONS.find((option) => option.value === value) ?? DEFAULT_SORT_OPTION,
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
        {ANALYTICS_SORT_OPTIONS.map((option) => {
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
