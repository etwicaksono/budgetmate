'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Form } from 'react-bootstrap';
import { FaSearch } from 'react-icons/fa';
import type { Category } from '@/services/categoryService';
import { getIconComponent } from '@/utils/iconUtils';
import { useFilteredCategories } from '@/hooks/useFilteredCategories';
import { CategorySelectOption } from './CategorySelectOption';

interface CategorySelectProps {
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
  categories: Category[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  filterType?: 'income' | 'expense' | 'both';
  excludeId?: string;
  onlyParents?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  selectedCategoryId,
  onSelect,
  categories,
  placeholder = 'Select category',
  searchPlaceholder = 'Search categories...',
  disabled = false,
  filterType,
  excludeId,
  onlyParents = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);

  // Use custom hook for filtering
  const { filteredCategories, hasResults } = useFilteredCategories({
    categories,
    search,
    ...(filterType ? { filterType } : {}),
    ...(excludeId ? { excludeId } : {}),
    onlyParents,
  });

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(prev => !prev);
    }
  };

  // Handle category selection
  const handleSelect = (categoryId: string | null) => {
    onSelect(categoryId);
    setIsOpen(false);
    setSearch('');
  };

  // Handle clear button
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div className="position-relative" ref={dropdownRef}>
      <div
        role="button"
        className="d-flex align-items-center justify-content-between rounded px-3 py-2"
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          minHeight: '38px',
          border: `1px solid ${isOpen ? '#0d6efd' : '#ced4da'}`,
          boxShadow: isOpen ? '0 0 0 0.2rem rgba(13, 110, 253, 0.25)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          backgroundColor: disabled ? '#e9ecef' : 'white',
          opacity: disabled ? 0.6 : 1,
        }}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="d-flex align-items-center flex-grow-1 overflow-hidden">
          {selectedCategory ? (
            <>
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle me-2 flex-shrink-0"
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: selectedCategory.color || '#6c757d',
                  color: '#fff',
                }}
              >
                {(() => {
                  const Icon = getIconComponent(selectedCategory.icon);
                  return <Icon size={12} />;
                })()}
              </span>
              <span className="text-truncate">{selectedCategory.name}</span>
            </>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </div>
        <div className="d-flex align-items-center ms-2 gap-1">
          {selectedCategoryId && !disabled && (
            <button
              type="button"
              className="btn btn-sm p-0 border-0 bg-transparent text-muted"
              onClick={handleClear}
              style={{ width: '20px', height: '20px', fontSize: '20px', lineHeight: '1' }}
              title="Clear selection"
            >
              ×
            </button>
          )}
          <FaSearch className="text-muted" size={12} />
        </div>
      </div>

      {isOpen && (
        <div
          className="position-absolute w-100 bg-white border rounded shadow-sm mt-1"
          style={{ zIndex: 1060 }}
          role="listbox"
        >
          <div className="p-2 border-bottom">
            <Form.Control
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              size="sm"
            />
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {/* None option */}
            <CategorySelectOption
              category={null}
              isSelected={!selectedCategoryId}
              onClick={() => handleSelect(null)}
            />

            {/* Category options */}
            {!hasResults && search ? (
              <div className="text-center text-muted py-3 small">
                No categories found
              </div>
            ) : (
              filteredCategories.map((cat) => (
                <CategorySelectOption
                  key={cat.id}
                  category={cat}
                  isSelected={selectedCategoryId === cat.id}
                  onClick={() => handleSelect(cat.id)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelect;
