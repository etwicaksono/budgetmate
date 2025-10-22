import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Form } from 'react-bootstrap';
import { FaCaretDown, FaCheck, FaTimesCircle } from 'react-icons/fa';

const DEFAULT_COLOR = '#6c757d';

const findParentForCategory = (category, categoryTree) => {
  for (const [parent, children] of Object.entries(categoryTree || {})) {
    if (children?.includes(category)) {
      return parent;
    }
  }
  return null;
};

export const ChildCategorySelect = ({
  selectedCategories,
  setSelectedCategories,
  categoryTree,
  parentCategoryColors,
  categoryIcons,
  allCategories,
  entityLabelSingular = 'category',
  entityLabelPlural = 'categories',
  searchPlaceholder,
  clearSelectedLabel = 'Clear selection',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedCategory = selectedCategories?.[0] || null;
  const placeholderText = searchPlaceholder ?? `Search ${entityLabelSingular}...`;

  const openDropdown = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsOpen((previous) => !previous);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeDropdown]);

  useEffect(() => {
    if (!isOpen) {
      setCategorySearch('');
    }
  }, [isOpen]);

  const getCategoryMeta = useCallback(
    (category) => {
      if (!category) {
        return { parent: null, color: DEFAULT_COLOR, Icon: null };
      }

      const parent = findParentForCategory(category, categoryTree);
      const color =
        parentCategoryColors?.[category] ||
        (parent ? parentCategoryColors?.[parent] : null) ||
        DEFAULT_COLOR;
      const Icon = categoryIcons?.[category] || (parent ? categoryIcons?.[parent] : null) || null;

      return { parent, color, Icon };
    },
    [categoryTree, parentCategoryColors, categoryIcons]
  );

  const groupedCategories = useMemo(() => {
    const searchTerm = categorySearch.trim().toLowerCase();

    const normalizeChildren = (parent, children = []) =>
      children
        .filter((child) => child && child !== 'All')
        .map((child) => {
          const color =
            parentCategoryColors?.[child] ||
            parentCategoryColors?.[parent] ||
            DEFAULT_COLOR;
          const Icon = categoryIcons?.[child] || categoryIcons?.[parent] || null;
          return {
            value: child,
            label: child,
            parent,
            color,
            Icon,
          };
        });

    const results = [];

    Object.entries(categoryTree || {}).forEach(([parent, children]) => {
      const normalizedChildren = normalizeChildren(parent, children);
      if (normalizedChildren.length === 0) {
        return;
      }

      if (!searchTerm) {
        results.push({
          key: `parent-${parent}`,
          parent,
          parentColor: parentCategoryColors?.[parent] || DEFAULT_COLOR,
          parentIcon: categoryIcons?.[parent] || null,
          children: normalizedChildren,
        });
        return;
      }

      const parentMatches = parent.toLowerCase().includes(searchTerm);
      const childMatches = normalizedChildren.filter((child) =>
        child.label.toLowerCase().includes(searchTerm)
      );

      if (parentMatches) {
        results.push({
          key: `parent-${parent}`,
          parent,
          parentColor: parentCategoryColors?.[parent] || DEFAULT_COLOR,
          parentIcon: categoryIcons?.[parent] || null,
          children: normalizedChildren,
        });
      } else if (childMatches.length > 0) {
        results.push({
          key: `parent-${parent}`,
          parent,
          parentColor: parentCategoryColors?.[parent] || DEFAULT_COLOR,
          parentIcon: categoryIcons?.[parent] || null,
          children: childMatches,
        });
      }
    });

    const childSet = new Set(Object.values(categoryTree || {}).flat());
    const parentSet = new Set(Object.keys(categoryTree || {}));
    const orphanCategories = (allCategories || []).filter((category) => {
      if (!category || category === 'All') {
        return false;
      }
      if (parentSet.has(category)) {
        const hasChildren = (categoryTree?.[category] ?? []).length > 0;
        return !hasChildren;
      }
      return !childSet.has(category);
    });

    orphanCategories.forEach((category) => {
      if (searchTerm && !category.toLowerCase().includes(searchTerm)) {
        return;
      }
      const color = parentCategoryColors?.[category] || DEFAULT_COLOR;
      const Icon = categoryIcons?.[category] || null;

      results.push({
        key: `orphan-${category}`,
        parent: null,
        parentColor: color,
        parentIcon: Icon,
        children: [
          {
            value: category,
            label: category,
            parent: null,
            color,
            Icon,
          },
        ],
      });
    });

    return results;
  }, [categoryTree, parentCategoryColors, categoryIcons, allCategories, categorySearch]);

  const handleSelect = useCallback(
    (category) => {
      setSelectedCategories(category ? [category] : []);
      closeDropdown();
    },
    [setSelectedCategories, closeDropdown]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedCategories([]);
    closeDropdown();
  }, [setSelectedCategories, closeDropdown]);

  const { parent: selectedParent, color: selectedColor, Icon: SelectedIcon } = useMemo(
    () => getCategoryMeta(selectedCategory),
    [selectedCategory, getCategoryMeta]
  );

  const renderGroupedChildren = () => {
    if (groupedCategories.length === 0) {
      return (
        <div className="px-3 py-2 text-muted small">
          No matching {entityLabelPlural}.
        </div>
      );
    }

    return groupedCategories.map(({ key, parent, parentIcon: ParentIcon, parentColor, children }) => (
      <div key={key} className="border-bottom">
        {parent && (
          <div className="px-3 py-2 text-uppercase small fw-semibold text-muted d-flex align-items-center gap-2">
            {ParentIcon && (
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle"
                style={{
                  width: 24,
                  height: 24,
                  backgroundColor: parentColor,
                  color: '#fff',
                  fontSize: '0.75rem',
                }}
              >
                <ParentIcon size={12} />
              </span>
            )}
            <span>{parent}</span>
          </div>
        )}
        {children.map((child) => {
          const OptionIcon = child.Icon;
          const isSelected = child.value === selectedCategory;

          return (
            <button
              key={child.value}
              type="button"
              className={`w-100 d-flex align-items-center bg-white border-0 px-3 py-2 ${
                isSelected ? 'bg-light' : ''
              }`}
              onClick={() => handleSelect(child.value)}
              role="option"
              aria-selected={isSelected}
            >
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle me-3 flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: child.color,
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              >
                {OptionIcon ? <OptionIcon size={16} /> : child.label.charAt(0).toUpperCase()}
              </span>
              <div className="flex-grow-1 text-start">
                <div className="fw-semibold text-truncate">{child.label}</div>
                {child.parent && (
                  <div className="text-muted small text-truncate">{child.parent}</div>
                )}
              </div>
              {isSelected && <FaCheck className="text-success ms-2" />}
            </button>
          );
        })}
      </div>
    ));
  };

  return (
    <div className="position-relative" ref={containerRef}>
      <div
        role="button"
        className="d-flex align-items-center justify-content-between rounded px-3 py-2"
        style={{
          cursor: 'pointer',
          minHeight: '40px',
          border: `1px solid ${isOpen ? '#198754' : '#ced4da'}`,
          boxShadow: isOpen ? '0 0 0 0.2rem rgba(25, 135, 84, 0.15)' : 'none',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        }}
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="d-flex align-items-center flex-grow-1 overflow-hidden">
          {selectedCategory ? (
            <>
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle me-3 flex-shrink-0"
                style={{
                  width: 32,
                  height: 32,
                  backgroundColor: selectedColor,
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              >
                {SelectedIcon ? (
                  <SelectedIcon size={16} />
                ) : (
                  selectedCategory.charAt(0).toUpperCase()
                )}
              </span>
              <div className="d-flex flex-column overflow-hidden">
                <span className="text-truncate fw-semibold">{selectedCategory}</span>
                {selectedParent && (
                  <span className="text-muted small text-truncate">{selectedParent}</span>
                )}
              </div>
            </>
          ) : (
            <span className="text-muted">Select {entityLabelSingular}</span>
          )}
        </div>
        <div className="d-flex align-items-center ms-2 gap-2">
          {selectedCategory && (
            <button
              type="button"
              className="btn p-0 border-0 bg-transparent text-muted"
              onClick={(event) => {
                event.stopPropagation();
                handleClearSelection();
              }}
              aria-label={clearSelectedLabel}
            >
              <FaTimesCircle size={18} />
            </button>
          )}
          <FaCaretDown className="text-muted" />
        </div>
      </div>

      {isOpen && (
        <div
          className="position-absolute w-100 bg-white border rounded shadow-sm mt-1"
          style={{ zIndex: 1060 }}
        >
          <div className="p-2 border-bottom">
            <div className="position-relative">
              <Form.Control
                ref={searchInputRef}
                type="text"
                placeholder={placeholderText}
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                autoComplete="off"
                onClick={(event) => event.stopPropagation()}
              />
              {categorySearch && (
                <button
                  type="button"
                  className="btn btn-sm position-absolute top-50 end-0 translate-middle-y text-muted"
                  style={{ border: 'none', background: 'transparent' }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setCategorySearch('');
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <FaTimesCircle size={16} />
                </button>
              )}
            </div>
          </div>
          <div style={{ maxHeight: '260px', overflowY: 'auto' }} role="listbox">
            {renderGroupedChildren()}
          </div>
          {selectedCategory && (
            <button
              type="button"
              className="w-100 border-0 bg-light text-success fw-semibold text-start px-3 py-2 rounded-bottom"
              onClick={handleClearSelection}
            >
              {clearSelectedLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
