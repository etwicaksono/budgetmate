'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaSearch } from 'react-icons/fa';
import type { Category } from '@/services/categoryService';
import { getIconComponent } from '@/utils/iconUtils';

interface TransactionCategorySelectProps {
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
  categories: Category[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  filterType?: 'income' | 'expense' | 'both';
}

export const TransactionCategorySelect: React.FC<TransactionCategorySelectProps> = ({
  selectedCategoryId,
  onSelect,
  categories,
  placeholder = 'Select category',
  searchPlaceholder = 'Search category...',
  disabled = false,
  filterType,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);

  // Group categories by parent
  const groupedCategories = useMemo(() => {
    const filtered = categories.filter(cat => {
      if (filterType && cat.type !== filterType && cat.type !== 'both') return false;
      if (search) {
        return cat.name.toLowerCase().includes(search.toLowerCase());
      }
      return true;
    });

    const groups: Record<string, { parent: Category; children: Category[] }> = {};
    const childCategories: Category[] = [];
    const parents = new Map<string, Category>();

    // Separate parents and children
    filtered.forEach(cat => {
      if (!cat.parent_id) {
        parents.set(cat.id, cat);
      } else {
        childCategories.push(cat);
      }
    });

    // Group children by parent
    childCategories.forEach(child => {
      if (child.parent_id) {
        const parent = parents.get(child.parent_id) || categories.find(c => c.id === child.parent_id);
        if (parent) {
          if (!groups[parent.id]) {
            groups[parent.id] = { parent, children: [] };
          }
          const group = groups[parent.id];
          if (group) {
            group.children.push(child);
          }
        }
      }
    });

    return Object.values(groups);
  }, [categories, search, filterType]);

  const hasResults = groupedCategories.some(group => group.children.length > 0);

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
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Get category icon
  const getCategoryIcon = (category: Category) => {
    if (!category.icon) return null;
    const IconComponent = getIconComponent(category.icon);
    return IconComponent ? <IconComponent size={16} /> : null;
  };

  return (
    <div ref={dropdownRef} className="position-relative">
      {/* Selected Value Display */}
      <div
        className={`form-control d-flex align-items-center justify-content-between ${
          disabled ? 'disabled' : 'cursor-pointer'
        } ${isOpen ? 'border-primary' : ''}`}
        onClick={toggleDropdown}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <div className="d-flex align-items-center gap-2 flex-grow-1">
          {selectedCategory ? (
            <>
              {selectedCategory.icon && (
                <span
                  className="rounded-circle d-flex align-items-center justify-content-center"
                  style={{
                    width: '24px',
                    height: '24px',
                    backgroundColor: selectedCategory.color || '#6c757d',
                    color: 'white',
                    fontSize: '12px',
                  }}
                >
                  {getCategoryIcon(selectedCategory)}
                </span>
              )}
              <span>{selectedCategory.name}</span>
            </>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2">
          {selectedCategory && !disabled && (
            <button
              type="button"
              className="btn btn-link btn-sm p-0 text-secondary"
              onClick={handleClear}
              style={{ textDecoration: 'none' }}
            >
              ×
            </button>
          )}
          <span className="text-muted">▼</span>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="position-absolute w-100 bg-white border rounded shadow-sm mt-1"
          style={{
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1050,
          }}
        >
          {/* Search Input */}
          <div className="p-2 border-bottom sticky-top bg-white">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white border-end-0">
                <FaSearch size={12} className="text-muted" />
              </span>
              <input
                ref={searchInputRef}
                type="text"
                className="form-control border-start-0"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Category List Grouped by Parent */}
          <div className="list-group list-group-flush">
            {hasResults ? (
              groupedCategories.map((group) => (
                <React.Fragment key={group.parent.id}>
                  {/* Parent Header */}
                  <div
                    className="px-3 py-2 bg-light border-bottom"
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#6c757d',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {group.parent.name}
                  </div>

                  {/* Child Categories */}
                  {group.children.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      className={`list-group-item list-group-item-action d-flex align-items-center gap-2 border-0 ${
                        selectedCategoryId === category.id ? 'active' : ''
                      }`}
                      onClick={() => handleSelect(category.id)}
                    >
                      {category.icon && (
                        <span
                          className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{
                            width: '24px',
                            height: '24px',
                            backgroundColor: category.color || group.parent.color || '#6c757d',
                            color: 'white',
                            fontSize: '12px',
                          }}
                        >
                          {getCategoryIcon(category)}
                        </span>
                      )}
                      <div className="flex-grow-1 text-start">
                        <div style={{ fontWeight: '500' }}>{category.name}</div>
                        <small className="text-muted">{group.parent.name}</small>
                      </div>
                      {selectedCategoryId === category.id && (
                        <span className="text-primary">✓</span>
                      )}
                    </button>
                  ))}
                </React.Fragment>
              ))
            ) : (
              <div className="p-3 text-center text-muted">
                <small>No categories found</small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
