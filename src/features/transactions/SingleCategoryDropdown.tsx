import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import { Form } from 'react-bootstrap';
import { FaCaretDown, FaCheck, FaTimesCircle } from 'react-icons/fa';
import type { IconBaseProps, IconType } from 'react-icons';

const DEFAULT_COLOR = '#6c757d';

type CategoryName = string;
type CategoryTree = Record<CategoryName, CategoryName[]>;
type CategoryColorMap = Record<CategoryName, string>;
type IconRenderable = IconType | ComponentType<IconBaseProps>;
type CategoryIconMap = Record<CategoryName, IconRenderable | null | undefined>;

interface CategoryOptionMeta {
  parent: string | null;
  color: string;
  Icon: IconRenderable | null;
}

interface CategoryOption extends CategoryOptionMeta {
  value: string;
  label: string;
}

const renderIcon = (
  IconComponent: IconRenderable | null,
  props: IconBaseProps = {}
): React.ReactNode => {
  if (!IconComponent) {
    return null;
  }
  const Component = IconComponent as ComponentType<IconBaseProps>;
  return React.createElement(Component, props);
};

const findParentForCategory = (
  category: string,
  categoryTree?: CategoryTree
): string | null => {
  for (const [parent, children] of Object.entries(categoryTree ?? {})) {
    if (children.includes(category)) {
      return parent;
    }
  }
  return null;
};

export interface SingleCategoryDropdownProps {
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  categoryTree?: CategoryTree;
  parentCategoryColors?: CategoryColorMap;
  categoryIcons?: CategoryIconMap;
  allCategories: string[];
  entityLabelSingular?: string;
  entityLabelPlural?: string;
  searchPlaceholder?: string;
  clearSelectedLabel?: string;
  showClearButton?: boolean;
  triggerAvatarSize?: number;
  triggerIconSize?: number;
}

export function SingleCategoryDropdown({
  selectedCategories,
  setSelectedCategories,
  categoryTree,
  parentCategoryColors = {},
  categoryIcons = {},
  allCategories,
  entityLabelSingular = 'category',
  entityLabelPlural = 'categories',
  searchPlaceholder,
  clearSelectedLabel = 'Clear selected',
  showClearButton = true,
  triggerAvatarSize = 32,
  triggerIconSize = 16,
}: SingleCategoryDropdownProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCategory = selectedCategories?.[0] ?? null;
  const placeholderText =
    searchPlaceholder ?? `Search ${entityLabelSingular}...`;

  const getOptionMeta = useCallback(
    (category: string | null): CategoryOptionMeta => {
      if (!category) {
        return { parent: null, color: DEFAULT_COLOR, Icon: null };
      }

      const parent = findParentForCategory(category, categoryTree);
      const color =
        parentCategoryColors?.[category] ||
        (parent ? parentCategoryColors?.[parent] : null) ||
        DEFAULT_COLOR;
      const Icon =
        categoryIcons?.[category] ||
        (parent ? categoryIcons?.[parent] : null) ||
        null;

      return { parent, color, Icon };
    },
    [categoryTree, parentCategoryColors, categoryIcons]
  );

  const options = useMemo(() => {
    const seen = new Set<string>();
    const normalized: CategoryOption[] = [];

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
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
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
    (category: string | null) => {
      setSelectedCategories(category ? [category] : []);
      closeDropdown();
    },
    [closeDropdown, setSelectedCategories]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedCategories([]);
    closeDropdown();
  }, [closeDropdown, setSelectedCategories]);

  const selectedMeta = selectedCategory ? getOptionMeta(selectedCategory) : null;
  const selectedIcon = selectedMeta?.Icon ?? null;
  const selectedColor = selectedMeta?.color ?? DEFAULT_COLOR;

  return (
    <div
      ref={containerRef}
      className="position-relative w-100"
      style={{ maxWidth: '100%' }}
    >
      <button
        type="button"
        className="form-control d-flex justify-content-between align-items-center"
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        style={{ minHeight: '38px', padding: '0.375rem 0.75rem' }}
      >
        <div className="d-flex align-items-center gap-2 w-100 text-start">
          {selectedCategory ? (
            <>
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle flex-shrink-0"
                style={{
                  width: triggerAvatarSize,
                  height: triggerAvatarSize,
                  backgroundColor: selectedColor,
                  color: '#fff',
                  fontSize: '0.85rem',
                }}
              >
                {renderIcon(selectedIcon, { size: triggerIconSize }) ??
                  selectedCategory.charAt(0).toUpperCase()}
              </span>
              <span className="text-truncate">{selectedCategory}</span>
            </>
          ) : (
            <span className="text-muted">Select {entityLabelSingular}</span>
          )}
        </div>
        <div className="d-flex align-items-center ms-2 gap-2">
          {showClearButton && selectedCategory && (
            <button
              type="button"
              className="btn p-0 border-0 bg-transparent text-muted"
              onClick={(event) => {
                event.stopPropagation();
                handleClearSelection();
              }}
              aria-label={clearSelectedLabel}
            >
              {renderIcon(FaTimesCircle, { size: 18 })}
            </button>
          )}
          {renderIcon(FaCaretDown, { className: 'text-muted' })}
        </div>
      </button>

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
                  {renderIcon(FaTimesCircle, { size: 16 })}
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
                      {renderIcon(OptionIcon, { size: 16 }) ??
                        option.label.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-grow-1 text-start">
                      <div className="text-truncate">
                        {option.label}
                      </div>
                      {option.parent && (
                        <div className="text-muted small text-truncate">
                          {option.parent}
                        </div>
                      )}
                    </div>
                    {isSelected &&
                      renderIcon(FaCheck, { className: 'text-success ms-2' })}
                  </button>
                );
              })
            )}
          </div>
          {showClearButton && selectedCategory && (
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
}
