'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FaSearch } from 'react-icons/fa';
import { categoryService, Category } from '@/services/categoryService';
import { getIconComponent } from '@/utils/iconUtils';
import { ClearButton } from '@/components/common/ClearButton';

interface TransactionCategorySelectProps {
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  filterType?: 'income' | 'expense' | 'both';
}

export const TransactionCategorySelect: React.FC<TransactionCategorySelectProps> = ({
  selectedCategoryId,
  onSelect,
  placeholder = 'Select category',
  searchPlaceholder = 'Search category...',
  disabled = false,
  filterType,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch categories from API when debounced search changes, but only when the dropdown is open
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const filters: Record<string, string> = {};
        if (debouncedSearch) filters['search'] = debouncedSearch;
        if (filterType && filterType !== 'both') filters['type'] = filterType;

        const res = await categoryService.fetchCategories(filters);
        if (isMounted) {
          setCategories(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, [debouncedSearch, filterType, isOpen]);

  // When a selectedCategoryId is provided but not in our loaded list,
  // fetch it individually so we can display its name in the trigger button.
  useEffect(() => {
    if (!selectedCategoryId) return;
    if (categories.some(c => c.id === selectedCategoryId)) return;

    let isMounted = true;
    categoryService.getCategoryById(selectedCategoryId)
      .then(cat => {
        if (isMounted) setCategories(prev => [...prev, cat]);
      })
      .catch(() => { /* silently ignore */ });

    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  const selectedCategory = categories.find(cat => cat.id === selectedCategoryId);

  // Group categories by parent
  const groupedCategories = useMemo(() => {
    const groups: Record<string, { parent: Category; children: Category[] }> = {};
    const childCategories: Category[] = [];
    const parents = new Map<string, Category>();

    categories.forEach(cat => {
      if (!cat.parent_id) {
        parents.set(cat.id, cat);
      } else {
        childCategories.push(cat);
      }
    });

    childCategories.forEach(child => {
      if (child.parent_id) {
        const parent = parents.get(child.parent_id) || categories.find(c => c.id === child.parent_id);
        if (parent) {
          if (!groups[parent.id]) {
            groups[parent.id] = { parent, children: [] };
          }
          groups[parent.id]!.children.push(child);
        }
      }
    });

    return Object.values(groups);
  }, [categories]);

  // Standalone parents (no children in current result set)
  const standaloneParents = useMemo(() => {
    return categories.filter(
      c => !c.parent_id && !groupedCategories.some(g => g.parent.id === c.id)
    );
  }, [categories, groupedCategories]);

  const toggleDropdown = () => {
    if (!disabled) setIsOpen(prev => !prev);
  };

  const handleSelect = (categoryId: string | null) => {
    onSelect(categoryId);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = () => {
    onSelect(null);
  };

  // Close dropdown on outside click
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

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const getCategoryIcon = (category: Category) => {
    if (!category.icon) return null;
    const IconComponent = getIconComponent(category.icon);
    return IconComponent ? <IconComponent size={16} /> : null;
  };

  const renderCategoryItem = (cat: Category) => (
    <div
      key={cat.id}
      className={`px-3 py-2 d-flex align-items-center gap-2 ${
        selectedCategoryId === cat.id ? 'bg-primary text-white' : ''
      }`}
      style={{ cursor: 'pointer' }}
      onMouseEnter={e => {
        if (selectedCategoryId !== cat.id)
          (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--bs-light)';
      }}
      onMouseLeave={e => {
        if (selectedCategoryId !== cat.id)
          (e.currentTarget as HTMLDivElement).style.backgroundColor = '';
      }}
      onClick={() => handleSelect(cat.id)}
    >
      <span
        className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
        style={{
          width: '24px',
          height: '24px',
          backgroundColor:
            selectedCategoryId === cat.id ? 'rgba(255,255,255,0.2)' : cat.color || '#6c757d',
          color: 'white',
          fontSize: '12px',
        }}
      >
        {getCategoryIcon(cat)}
      </span>
      <span>{cat.name}</span>
    </div>
  );

  return (
    <div ref={dropdownRef} className="position-relative">
      {/* Trigger */}
      <div
        className={`form-control d-flex align-items-center justify-content-between ${
          disabled ? 'disabled' : ''
        } ${isOpen ? 'border-primary' : ''}`}
        onClick={toggleDropdown}
        style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
      >
        <div className="d-flex align-items-center gap-2 flex-grow-1 overflow-hidden">
          {selectedCategory ? (
            <>
              {selectedCategory.icon && (
                <span
                  className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
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
              <span className="d-inline-flex align-items-center gap-1 text-truncate">
                {selectedCategory.name}
                {!disabled && (
                  <ClearButton size={12} ariaLabel="Clear category" onClick={handleClear} />
                )}
              </span>
            </>
          ) : (
            <span className="text-muted">{placeholder}</span>
          )}
        </div>
        <div className="d-flex align-items-center ms-2">
          {isLoading && !isOpen && (
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          )}
          <span
            className="text-muted"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '0.75rem' }}
          >
            ▼
          </span>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="position-absolute w-100 mt-1 bg-white border rounded shadow-sm"
          style={{ maxHeight: '300px', display: 'flex', flexDirection: 'column', zIndex: 1051 }}
        >
          {/* Search Box */}
          <div className="p-2 border-bottom bg-white">
            <div className="position-relative">
              <FaSearch
                className="position-absolute text-muted"
                style={{ top: '50%', left: '10px', transform: 'translateY(-50%)' }}
                size={14}
              />
              <input
                ref={searchInputRef}
                type="text"
                className="form-control form-control-sm ps-4 pe-4"
                placeholder={searchPlaceholder}
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
              {isLoading && (
                <div
                  className="spinner-border spinner-border-sm text-primary position-absolute"
                  style={{ top: '50%', right: '10px', transform: 'translateY(-50%)' }}
                  role="status"
                >
                  <span className="visually-hidden">Loading...</span>
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          <div className="overflow-auto py-1" style={{ flex: 1 }}>
            {!isLoading && categories.length === 0 ? (
              <div className="p-3 text-center text-muted" style={{ fontSize: '0.875rem' }}>
                No categories found
              </div>
            ) : (
              <>
                {groupedCategories.map(group => (
                  <div key={group.parent.id} className="mb-1">
                    <div
                      className="px-3 py-1 text-muted fw-semibold"
                      style={{ fontSize: '0.8rem', backgroundColor: '#f8f9fa' }}
                    >
                      {group.parent.name}
                    </div>
                    {group.children.map(child => renderCategoryItem(child))}
                  </div>
                ))}
                {standaloneParents.map(cat => renderCategoryItem(cat))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
