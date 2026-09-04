'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Dropdown, Form, Button } from 'react-bootstrap';
import { FaCompressAlt, FaExpandAlt, FaSearch, FaTimes, FaSort, FaSortAmountDown, FaSortAmountUp, FaSortAlphaDown, FaSortAlphaUpAlt } from 'react-icons/fa';
import type { SortValue } from '@/hooks/useFilterData';

// TODO: Consider extracting SORT_OPTIONS to a shared constants file (e.g.,
// src/constants/analytics.ts) if these options are needed elsewhere.
const SORT_OPTIONS: { value: SortValue; icon: typeof FaSort; title: string }[] = [
  { value: 'timeDesc', icon: FaSortAmountDown, title: 'Default' },
  { value: 'amountDesc', icon: FaSortAmountDown, title: 'Amount DESC' },
  { value: 'amountAsc', icon: FaSortAmountUp, title: 'Amount ASC' },
  { value: 'absAmountDesc', icon: FaSortAlphaUpAlt, title: 'Name DESC' },
  { value: 'absAmountAsc', icon: FaSortAlphaDown, title: 'Name ASC' },
];

export interface AnalyticsToolbarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  sortOption: SortValue;
  onSortOptionChange: (value: SortValue) => void;
  // Expand / Collapse all — optional; the toggle is hidden unless all three are set.
  isAllCollapsed?: boolean;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  rightSlot?: ReactNode;
}

export function AnalyticsToolbar({
  searchTerm,
  onSearchTermChange,
  sortOption,
  onSortOptionChange,
  isAllCollapsed,
  onExpandAll,
  onCollapseAll,
  rightSlot,
}: AnalyticsToolbarProps) {
  const [inputValue, setInputValue] = useState(searchTerm);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Toggle icon mirrors the selected option — same icons as the dropdown items.
  const activeSort = SORT_OPTIONS.find(opt => opt.value === sortOption);
  const ActiveSortIcon = activeSort?.icon ?? FaSort;

  // Sync local input with parent when searchTerm changes from outside (e.g., filter reset)
  useEffect(() => {
    setInputValue(prev => (prev !== searchTerm ? searchTerm : prev));
  }, [searchTerm]);

  // Cleanup pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new 500ms debounce timeout
    debounceRef.current = setTimeout(() => {
      onSearchTermChange(newValue);
      debounceRef.current = null;
    }, 500);
  };

  const handleClear = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setInputValue('');
    onSearchTermChange('');
  };

  return (
    // Must stack above the report's sticky table header (--z-sticky-table-header)
    // so an open dropdown menu is never hidden behind it, yet stay below the app
    // navbar (--z-app-header). Values live in the shared :root scale (globals.css).
    <div
      className="d-flex flex-wrap align-items-center gap-2 p-3 border-bottom bg-white rounded-top"
      style={{ position: 'sticky', top: 0, zIndex: 'var(--z-toolbar)' }}
    >
      <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
        {/* Search */}
        <div
          className="d-flex align-items-center bg-white rounded-1 px-2 border border-secondary"
          style={{ height: '36px', maxWidth: '300px', flex: '1 1 200px' }}
        >
          <FaSearch className="text-muted me-2 flex-shrink-0" size={12} />
          <Form.Control
            type="text"
            size="sm"
            placeholder="Search..."
            className="border-0 bg-transparent shadow-none flex-grow-1 p-0 h-100"
            value={inputValue}
            onChange={handleInputChange}
          />
          {inputValue && (
            <Button
              variant="link"
              size="sm"
              className="p-0 text-muted mx-1 d-flex align-items-center"
              onClick={handleClear}
            >
              <FaTimes size={12} />
            </Button>
          )}
        </div>

        {/* Sort By */}
        <Dropdown>
          <Dropdown.Toggle
            variant="outline-secondary"
            size="sm"
            className="d-flex align-items-center justify-content-center p-0"
            style={{ width: '36px', height: '36px' }}
            title="Sort By"
            aria-label="Sort By"
          >
            <ActiveSortIcon size={12} />
          </Dropdown.Toggle>
          <Dropdown.Menu style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {SORT_OPTIONS.map(opt => {
              const Icon = opt.icon;
              return (
                <Dropdown.Item
                  key={opt.value}
                  onClick={() => onSortOptionChange(opt.value)}
                  active={sortOption === opt.value}
                  className="d-flex align-items-center gap-2"
                >
                  <Icon size={12} /> {opt.title}
                </Dropdown.Item>
              );
            })}
          </Dropdown.Menu>
        </Dropdown>

      </div>

      {/* Right section — expand/collapse all + settings (e.g. Number of columns) */}
      {(isAllCollapsed !== undefined || rightSlot) && (
        <div className="d-flex align-items-center gap-2 flex-shrink-0">
          {isAllCollapsed !== undefined && onExpandAll && onCollapseAll && (
            <Button
              variant="outline-secondary"
              size="sm"
              className="d-flex align-items-center justify-content-center p-0"
              style={{ width: '36px', height: '36px' }}
              onClick={isAllCollapsed ? onExpandAll : onCollapseAll}
              title={isAllCollapsed ? 'Expand All' : 'Collapse All'}
              aria-label={isAllCollapsed ? 'Expand All' : 'Collapse All'}
            >
              {isAllCollapsed ? <FaExpandAlt size={12} /> : <FaCompressAlt size={12} />}
            </Button>
          )}
          {rightSlot}
        </div>
      )}
    </div>
  );
}
