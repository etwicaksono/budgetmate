'use client';

import { useMemo, useState, useRef, useEffect, type ReactNode } from 'react';
import { Dropdown, Form, Button } from 'react-bootstrap';
import { FaSearch, FaTimes, FaSort, FaSortAmountDown, FaSortAmountUp, FaSortAlphaDown, FaSortAlphaUpAlt } from 'react-icons/fa';
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
  rightSlot?: ReactNode;
}

export function AnalyticsToolbar({
  searchTerm,
  onSearchTermChange,
  sortOption,
  onSortOptionChange,
  rightSlot,
}: AnalyticsToolbarProps) {
  const [inputValue, setInputValue] = useState(searchTerm);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSortTitle = useMemo(
    () => SORT_OPTIONS.find(opt => opt.value === sortOption)?.title ?? 'Sort',
    [sortOption]
  );

  // Sync local input with parent when searchTerm changes from outside (e.g., filter reset)
  useEffect(() => {
    if (searchTerm !== inputValue) {
      setInputValue(searchTerm);
    }
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
    <div
      className="d-flex flex-wrap align-items-center gap-2 p-3 border-bottom bg-white rounded-top"
      style={{ position: 'sticky', top: 0, zIndex: 10 }}
    >
      <div className="d-flex align-items-center gap-2 flex-wrap flex-grow-1">
        {/* Sort By */}
        <Dropdown>
          <Dropdown.Toggle variant="outline-secondary" size="sm" className="d-flex align-items-center gap-2" style={{ height: '36px' }}>
            <FaSort size={12} />
            <span className="d-none d-sm-inline">{activeSortTitle}</span>
            <span className="d-inline d-sm-none">Sort</span>
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
      </div>

      {/* Right slot — e.g. settings dropdown */}
      {rightSlot && (
        <div className="d-flex align-items-center gap-2">
          {rightSlot}
        </div>
      )}
    </div>
  );
}
