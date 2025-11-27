import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Button, Form } from 'react-bootstrap';
import { FaCaretDown, FaCaretRight, FaTimesCircle } from 'react-icons/fa';
import type { ComponentType } from 'react';
import type { IconType } from 'react-icons';
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react';
import { CategoryDropdownItem } from './CategoryDropdownItem';

type CategoryTree = Record<string, string[] | undefined>;
type CategoryColorMap = Record<string, string>;
type IconComponent = ComponentType<{ className?: string; size?: number }>;

interface CategoryDropdownProps {
  selectedCategories: string[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;
  categoryTree: CategoryTree;
  parentCategoryColors: CategoryColorMap;
  categoryIcons?: Record<string, string | undefined>;
  allCategories: string[];
  entityLabelSingular?: string;
  entityLabelPlural?: string;
  searchPlaceholder?: string;
  clearSelectedLabel?: string;
  isSingleSelect?: boolean;
  leadingIcon?: IconComponent | IconType | null;
}

const DEFAULT_COLOR = '#6c757d';

const resolveCategoryColor = (value: string | null | undefined): string => {
  return typeof value === 'string' && value.trim().length > 0 ? value : DEFAULT_COLOR;
};

const coerceIconComponent = (icon: IconComponent | IconType | undefined | null): IconComponent | null => {
  if (!icon) {
    return null;
  }
  return icon as unknown as IconComponent;
};

const CaretDownIcon = coerceIconComponent(FaCaretDown);
const CaretRightIcon = coerceIconComponent(FaCaretRight);
const TimesCircleIcon = coerceIconComponent(FaTimesCircle);

const findParentForCategory = (category: string, categoryTree: CategoryTree): string | null => {
  for (const [parent, children] of Object.entries(categoryTree)) {
    if (Array.isArray(children) && children.includes(category)) {
      return parent;
    }
  }
  return null;
};

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  selectedCategories,
  setSelectedCategories,
  categoryTree,
  parentCategoryColors,
  categoryIcons = {},
  allCategories,
  entityLabelSingular: _entityLabelSingular = 'category',
  entityLabelPlural,
  searchPlaceholder,
  clearSelectedLabel,
  isSingleSelect = false,
  leadingIcon = null,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean | undefined>>({});
  const inputRef = useRef<HTMLInputElement | null>(null);
  const referenceRef = useRef<HTMLDivElement | null>(null);
  const floatingRef = useRef<HTMLDivElement | null>(null);

  const floatingData = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    middleware: [
      offset(4),
      flip({
        padding: 8,
      }),
      shift({
        padding: 8,
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const { floatingStyles } = floatingData;
  const placeholderText = `All ${entityLabelPlural}`;
  const LeadingIcon = coerceIconComponent(leadingIcon);
  const leadingPaddingLeft = LeadingIcon ? '2.5rem' : '0.75rem';

  const { filteredCategories, directMatchParents } = useMemo(() => {
    if (!categorySearch.trim()) {
      return {
        filteredCategories: allCategories,
        directMatchParents: [] as string[],
      };
    }

    const searchLower = categorySearch.toLowerCase();
    const resultSet = new Set<string>();
    const directParents: string[] = [];

    Object.entries(categoryTree).forEach(([parent, children]) => {
      if (parent.toLowerCase().includes(searchLower)) {
        resultSet.add(parent);
        directParents.push(parent);
      }
      if (Array.isArray(children)) {
        children.forEach((child) => {
          if (child.toLowerCase().includes(searchLower)) {
            resultSet.add(child);
          }
        });
      }
    });

    return {
      filteredCategories: Array.from(resultSet),
      directMatchParents: directParents,
    };
  }, [categorySearch, categoryTree, allCategories]);

  const shouldShowCategory = useCallback(
    (category: string): boolean => {
      if (!categorySearch.trim()) {
        return true;
      }

      const parentChildren = categoryTree[category];
      if (Array.isArray(parentChildren) && parentChildren.length > 0) {
        return directMatchParents.includes(category);
      }

      const parent = findParentForCategory(category, categoryTree);
      if (!parent) {
        return true;
      }

      return !directMatchParents.includes(parent);
    },
    [categorySearch, categoryTree, directMatchParents],
  );

  const toggleCategory = useCallback(
    (category: string, options?: { isParent?: boolean }) => {
      setSelectedCategories((previous) => {
        if (isSingleSelect) {
          return previous.includes(category) ? [] : [category];
        }

        if (options?.isParent) {
          const children = categoryTree[category] ?? [];
          if (children.length === 0) {
            return previous.includes(category)
              ? previous.filter((entry) => entry !== category)
              : [...previous, category];
          }

          const allChildrenSelected = children.every((child) => previous.includes(child));
          if (allChildrenSelected) {
            return previous.filter(
              (entry) => entry !== category && !children.includes(entry)
            );
          }

          const combined = new Set(previous);
          combined.delete(category);
          children.forEach((child) => combined.add(child));
          return Array.from(combined);
        }

        if (previous.includes(category)) {
          return previous.filter((entry) => entry !== category);
        }

        return [...previous, category];
      });

      if (categorySearch) {
        setCategorySearch('');
      }
    },
    [categoryTree, setSelectedCategories, categorySearch, isSingleSelect],
  );

  const isCategorySelected = useCallback(
    (category: string, options?: { isParent?: boolean }): boolean => {
      if (options?.isParent) {
        const children = categoryTree[category] ?? [];
        if (children.length === 0) {
          return selectedCategories.includes(category);
        }
        return children.every((child) => selectedCategories.includes(child));
      }

      return selectedCategories.includes(category);
    },
    [selectedCategories, categoryTree],
  );

  const isParentIndeterminate = useCallback(
    (parentCategory: string): boolean => {
      const children = categoryTree[parentCategory] ?? [];
      if (children.length === 0) return false;
      
      const selectedChildrenCount = children.filter((child) => 
        selectedCategories.includes(child)
      ).length;
      
      return selectedChildrenCount > 0 && selectedChildrenCount < children.length;
    },
    [categoryTree, selectedCategories],
  );

  const clearSelectedCategories = useCallback(() => {
    setSelectedCategories([]);
  }, [setSelectedCategories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;

      const target = event.target as Node | null;
      if (!target) return;

      const isClickOnReference = referenceRef.current && referenceRef.current.contains(target);
      const isClickOnFloating = floatingRef.current && floatingRef.current.contains(target);

      if (!isClickOnReference && !isClickOnFloating) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setCategorySearch('');
    }
  }, [isOpen]);

  const focusInput = () => {
    const triggerFocus = () => {
      inputRef.current?.focus();
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(triggerFocus);
    } else {
      window.setTimeout(triggerFocus, 0);
    }
  };

  const handleContainerClick = () => {
    setIsOpen((previous) => {
      const nextIsOpen = !previous;
      if (!previous) {
        focusInput();
      }
      return nextIsOpen;
    });
  };

  const referenceWidth = referenceRef.current?.offsetWidth ?? 300;
  const dropdownMinWidth = referenceWidth.toString() + 'px';
  const selectedCount = selectedCategories.length;

  return (
    <div
      className="position-relative"
      ref={(el) => {
        referenceRef.current = el;
        floatingData.refs.setReference(el);
      }}
    >
      <div
        className="d-flex flex-wrap align-items-center"
        style={{
          minHeight: '38px',
          border: '1px solid #ced4da',
          borderRadius: '0.375rem',
          padding: `0.375rem 2rem 0.375rem ${leadingPaddingLeft}`,
          cursor: 'pointer',
          position: 'relative',
          backgroundColor: '#fff',
        }}
        onClick={handleContainerClick}
      >
        {LeadingIcon && (
          <span className="position-absolute start-0 ms-2">
            <LeadingIcon size={16} />
          </span>
        )}
        <div className="d-flex flex-wrap align-items-center flex-grow-1 gap-1">
          {selectedCategories.length === 0 && <span className="text-muted small">{placeholderText}</span>}
          {selectedCategories.length > 0 && (
            <span className="small text-muted">
              {selectedCount} selected
            </span>
          )}
        </div>
        {selectedCategories.length > 0 && !isSingleSelect && (
          <Button
            variant="link"
            size="sm"
            className="text-decoration-none px-1 py-0 me-4 small"
            onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
              event.preventDefault();
              event.stopPropagation();
              clearSelectedCategories();
            }}
          >
            {clearSelectedLabel}
          </Button>
        )}
        <span
          className="position-absolute"
          style={{ right: '0.5rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          {CaretDownIcon && CaretRightIcon && (isOpen ? <CaretDownIcon /> : <CaretRightIcon />)}
        </span>
      </div>
      {isOpen && (
        <div
          ref={(el) => {
            floatingRef.current = el;
            floatingData.refs.setFloating(el);
          }}
          className="bg-white border rounded shadow-sm"
          style={{
            position: floatingStyles.position as 'absolute' | 'fixed',
            top: floatingStyles.top ?? 0,
            left: floatingStyles.left ?? 0,
            minWidth: dropdownMinWidth,
            zIndex: 1050,
            pointerEvents: 'auto',
          }}
        >
          <div className="p-2 border-bottom">
            <div className="position-relative">
              <Form.Control
                ref={inputRef}
                type="text"
                size="sm"
                placeholder={searchPlaceholder}
                value={categorySearch}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setCategorySearch(event.target.value);
                }}
                autoComplete="off"
                onClick={(event: ReactMouseEvent<HTMLInputElement>) => {
                  event.stopPropagation();
                }}
              />
              {categorySearch && (
                <button
                  type="button"
                  className="btn btn-sm position-absolute top-50 end-0 translate-middle-y text-muted"
                  style={{ border: 'none', background: 'transparent', padding: '0 0.5rem' }}
                  onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    setCategorySearch('');
                    focusInput();
                  }}
                  aria-label="Clear search"
                >
                  {TimesCircleIcon && <TimesCircleIcon size={14} />}
                </button>
              )}
            </div>
          </div>
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {categorySearch ? (
              filteredCategories.length === 0 ? (
                <div className="p-3 text-center text-muted small">No categories found</div>
              ) : (
                filteredCategories
                  .filter((category) => shouldShowCategory(category))
                  .map((category) => {
                    const childCategories = categoryTree[category] ?? [];
                    const hasChildren = childCategories.length > 0;
                    const parent = findParentForCategory(category, categoryTree);
                    const color = parent ? resolveCategoryColor(parentCategoryColors[parent]) : resolveCategoryColor(parentCategoryColors[category]);
                    const icon = parent ? categoryIcons[category] || categoryIcons[parent] : categoryIcons[category];
                    const isSelected = isCategorySelected(category);

                    return (
                      <CategoryDropdownItem
                        key={category}
                        name={category}
                        color={color}
                        icon={icon}
                        isSelected={isSelected}
                        onClick={() => toggleCategory(category, { isParent: hasChildren })}
                      />
                    );
                  })
              )
            ) : (
              Object.entries(categoryTree).map(([parent, children]) => {
                const parentColor = resolveCategoryColor(parentCategoryColors[parent]);
                const parentIcon = categoryIcons[parent];
                const childCategories = Array.isArray(children) ? children : [];
                const hasChildren = childCategories.length > 0;
                const parentSelection = isCategorySelected(parent, { isParent: true });
                const parentIndeterminate = isParentIndeterminate(parent);
                const isExpanded = expandedCategories[parent] === true;

                return (
                  <div key={parent}>
                    <CategoryDropdownItem
                      name={parent}
                      color={parentColor}
                      icon={parentIcon}
                      isSelected={parentSelection}
                      isIndeterminate={parentIndeterminate}
                      onClick={() => {
                        if (hasChildren) {
                          setExpandedCategories((previous) => ({
                            ...previous,
                            [parent]: !previous[parent],
                          }));
                        } else {
                          toggleCategory(parent, { isParent: hasChildren });
                        }
                      }}
                      onCheckboxClick={() => {
                        // If indeterminate, uncheck all; otherwise toggle normally
                        if (parentIndeterminate) {
                          setSelectedCategories((prev) => 
                            prev.filter((cat) => !childCategories.includes(cat) && cat !== parent)
                          );
                        } else {
                          toggleCategory(parent, { isParent: true });
                        }
                      }}
                      isBold
                      rightElement={
                        hasChildren ? (
                          <span style={{ color: parentColor }}>
                            {CaretDownIcon && CaretRightIcon && (isExpanded ? <CaretDownIcon size={12} /> : <CaretRightIcon size={12} />)}
                          </span>
                        ) : undefined
                      }
                    />
                    {hasChildren && isExpanded && childCategories.map((child) => {
                      const childColor = parentColor;
                      const childIcon = categoryIcons[child] || parentIcon;
                      const isChildSelected = isCategorySelected(child);
                      
                      return (
                        <CategoryDropdownItem
                          key={child}
                          name={child}
                          color={childColor}
                          icon={childIcon}
                          isSelected={isChildSelected}
                          onClick={() => toggleCategory(child)}
                          className="ps-5 pe-3"
                        />
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
