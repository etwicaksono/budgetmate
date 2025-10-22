import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Form } from 'react-bootstrap';
import { FaCaretDown, FaCheck, FaTimesCircle } from 'react-icons/fa';

const findParentForCategory = (category, categoryTree) => {
  for (const [parent, children] of Object.entries(categoryTree)) {
    if (children.includes(category)) {
      return parent;
    }
  }
  return null;
};

const DEFAULT_COLOR = '#6c757d';

export const SingleCategoryDropdown = ({
  selectedCategories,
  setSelectedCategories,
  categoryTree,
  parentCategoryColors,
  categoryIcons,
  allCategories,
  entityLabelSingular = 'category',
  entityLabelPlural = 'categories',
  searchPlaceholder,
  clearSelectedLabel = 'Clear selected',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedCategory = selectedCategories?.[0] || null;
  const placeholderText = searchPlaceholder ?? `Search ${entityLabelSingular}...`;

  const getOptionMeta = useCallback(
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

  const options = useMemo(() => {
    const seen = new Set();
    const normalized = [];

    (allCategories || []).forEach((category) => {
      if (!category || category === 'All' || seen.has(category)) {
        return;
      }
      const meta = getOptionMeta(category);
      normalized.push({
        value: category,
        label: category,
        ...meta,
      });
      seen.add(category);
    });

    if (normalized.length === 0 && selectedCategory) {
      const meta = getOptionMeta(selectedCategory);
      normalized.push({
        value: selectedCategory,
        label: selectedCategory,
        ...meta,
      });
    }

    return normalized;
  }, [allCategories, getOptionMeta, selectedCategory]);

  const filteredOptions = useMemo(() => {
    if (!categorySearch.trim()) {
      return options;
    }
    const searchLower = categorySearch.trim().toLowerCase();
    return options.filter((option) => {
      return (
        option.label.toLowerCase().includes(searchLower) ||
        (option.parent && option.parent.toLowerCase().includes(searchLower))
      );
    });
  }, [options, categorySearch]);

  const toggleDropdown = useCallback(() => {
    setIsOpen((previous) => !previous);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
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

  const handleSelect = useCallback(
    (category) => {
      setSelectedCategories([category]);
      closeDropdown();
    },
    [setSelectedCategories, closeDropdown]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedCategories([]);
    setCategorySearch('');
    closeDropdown();
  }, [setSelectedCategories, closeDropdown]);

  const selectedMeta = selectedCategory ? getOptionMeta(selectedCategory) : null;
  const SelectedIcon = selectedMeta?.Icon;
  const selectedColor = selectedMeta?.color || DEFAULT_COLOR;

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
                {SelectedIcon ? <SelectedIcon size={16} /> : selectedCategory.charAt(0).toUpperCase()}
              </span>
              <span className="text-truncate">{selectedCategory}</span>
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
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-muted small">
                No matching {entityLabelPlural}.
              </div>
            ) : (
              filteredOptions.map((option) => {
                const OptionIcon = option.Icon;
                const optionColor = option.color || DEFAULT_COLOR;
                const isSelected = option.value === selectedCategory;

                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`w-100 d-flex align-items-center bg-white border-0 px-3 py-2 ${
                      isSelected ? 'bg-light' : ''
                    }`}
                    onClick={() => handleSelect(option.value)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <span
                      className="d-inline-flex align-items-center justify-content-center rounded-circle me-3 flex-shrink-0"
                      style={{
                        width: 32,
                        height: 32,
                        backgroundColor: optionColor,
                        color: '#fff',
                        fontSize: '0.85rem',
                      }}
                    >
                      {OptionIcon ? <OptionIcon size={16} /> : option.label.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-grow-1 text-start">
                      <div className="fw-semibold text-truncate">{option.label}</div>
                      {option.parent && (
                        <div className="text-muted small text-truncate">{option.parent}</div>
                      )}
                    </div>
                    {isSelected && <FaCheck className="text-success ms-2" />}
                  </button>
                );
              })
            )}
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
