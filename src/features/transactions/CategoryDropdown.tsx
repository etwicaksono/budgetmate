import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Button, Form } from 'react-bootstrap';
import { FaCaretDown, FaCaretRight, FaTimesCircle } from 'react-icons/fa';
import type { ComponentType } from 'react';
import type { IconType } from 'react-icons';

type CategoryTree = Record<string, string[]>;
type CategoryColorMap = Record<string, string>;
type IconComponent = ComponentType<{ className?: string; size?: number }>;

interface CategoryDropdownProps {
  selectedCategories: string[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<string[]>>;
  categoryTree: CategoryTree;
  parentCategoryColors: CategoryColorMap;
  categoryIcons: Record<string, IconComponent | IconType | undefined>;
  allCategories: string[];
  entityLabelSingular?: string;
  entityLabelPlural?: string;
  searchPlaceholder?: string;
  clearSelectedLabel?: string;
  isSingleSelect?: boolean;
  leadingIcon?: IconComponent | IconType | null;
}

const DEFAULT_COLOR = '#000000';
const MAX_VISIBLE_SELECTED_ITEMS = 3;

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
    if (children.includes(category)) {
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
  categoryIcons,
  allCategories,
  entityLabelSingular = 'category',
  entityLabelPlural = 'categories',
  searchPlaceholder = 'Search category',
  clearSelectedLabel = 'Clear selected',
  isSingleSelect = false,
  leadingIcon = null,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedParentsInSearch, setExpandedParentsInSearch] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const placeholderText = `All ${entityLabelPlural}`;
  const singleSelectName = useId();
  const LeadingIcon = coerceIconComponent(leadingIcon);
  const leadingPaddingLeft = LeadingIcon ? '2.5rem' : '0.75rem';
  const hasSelectedOverflow = selectedCategories.length > MAX_VISIBLE_SELECTED_ITEMS;
  const visibleSelectedCategories = hasSelectedOverflow
    ? selectedCategories.slice(0, MAX_VISIBLE_SELECTED_ITEMS - 1)
    : selectedCategories;
  const overflowSelectedCount = hasSelectedOverflow
    ? selectedCategories.length - visibleSelectedCategories.length
    : 0;

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
      children.forEach((child) => {
        if (child.toLowerCase().includes(searchLower)) {
          resultSet.add(child);
        }
      });
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

      if (categoryTree[category]) {
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
          if (category === 'All') {
            return [];
          }
          if (options?.isParent) {
            return previous.includes(category) ? [] : [category];
          }
          return previous.includes(category) ? [] : [category];
        }

        if (category === 'All') {
          return previous.length === allCategories.length ? [] : [...allCategories];
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
        setExpandedParentsInSearch([]);
      }
    },
    [allCategories, categoryTree, setSelectedCategories, categorySearch, isSingleSelect],
  );

  const isCategorySelected = useCallback(
    (category: string, options?: { isParent?: boolean }): boolean => {
      if (category === 'All') {
        return selectedCategories.length === allCategories.length;
      }

      if (options?.isParent) {
        const children = categoryTree[category];
        if (!children || children.length === 0) {
          return selectedCategories.includes(category);
        }
        return children.every((child) => selectedCategories.includes(child));
      }

      if (selectedCategories.includes(category)) {
        return true;
      }

      return false;
    },
    [selectedCategories, allCategories.length, categoryTree],
  );

  const isAnyChildSelected = useCallback(
    (parentCategory: string): boolean => {
      const children = categoryTree[parentCategory];
      if (!children) {
        return false;
      }

      return children.some((child) => selectedCategories.includes(child));
    },
    [categoryTree, selectedCategories],
  );

  const clearSelectedCategories = useCallback(() => {
    setSelectedCategories([]);
  }, [setSelectedCategories]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (
        dropdownRef.current &&
        target &&
        !dropdownRef.current.contains(target) &&
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setCategorySearch('');
      setExpandedParentsInSearch([]);
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

  return (
    <div className="position-relative" ref={containerRef}>
      {(categorySearch || selectedCategories.length > 0) && (
        <div className="mt-1">
          <span className="text-muted small d-block">
            {categorySearch
              ? `${filteredCategories.length} matching ${
                  filteredCategories.length === 1 ? entityLabelSingular : entityLabelPlural
                }`
              : `${selectedCategories.length} ${
                  selectedCategories.length === 1 ? entityLabelSingular : entityLabelPlural
                } selected`}
          </span>
        </div>
      )}
      <div
        className="d-flex flex-wrap align-items-center"
        style={{
          minHeight: '38px',
          border: '1px solid #ced4da',
          borderRadius: '0.375rem',
          padding: `0.375rem 2rem 0.375rem ${leadingPaddingLeft}`,
          cursor: 'text',
          position: 'relative',
          backgroundColor: '#fff',
        }}
        onClick={handleContainerClick}
      >
        {LeadingIcon && (
          <span className="category-dropdown-leading-icon">
            <LeadingIcon size={16} />
          </span>
        )}
        <div className="d-flex flex-wrap align-items-center flex-grow-1 gap-2">
          {visibleSelectedCategories.map((category) => {
            let categoryColor = DEFAULT_COLOR;
            let CategoryIcon = coerceIconComponent(categoryIcons[category]);

            if (parentCategoryColors[category]) {
              categoryColor = parentCategoryColors[category];
            } else {
              const parent = findParentForCategory(category, categoryTree);
              if (parent) {
                categoryColor = parentCategoryColors[parent] || DEFAULT_COLOR;
                CategoryIcon = coerceIconComponent(categoryIcons[category] ?? categoryIcons[parent]);
              }
            }

            return (
              <div
                key={category}
                className="d-flex align-items-center me-2 mb-1 rounded px-2 py-1"
                style={{ fontSize: '0.8em', backgroundColor: categoryColor, color: 'white' }}
              >
                {CategoryIcon && <CategoryIcon className="me-1" size={14} />}
                {category}
                <button
                  type="button"
                  className="btn-close btn-close-white ms-2 p-1"
                  style={{ fontSize: '0.6em', lineHeight: 0.8 }}
                  onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    setSelectedCategories((previous) => previous.filter((entry) => entry !== category));
                  }}
                  aria-label="Remove"
                />
              </div>
            );
          })}
          {hasSelectedOverflow && (
            <div
              className="d-flex align-items-center me-2 mb-1 rounded px-2 py-1"
              style={{ fontSize: '0.8em', backgroundColor: '#e9ecef', color: '#495057' }}
            >
              +{overflowSelectedCount} more
            </div>
          )}
          {selectedCategories.length === 0 && <span className="text-muted">{placeholderText}</span>}
        </div>
        {selectedCategories.length > 0 && !isSingleSelect && (
          <Button
            variant="link"
            size="sm"
            className="ms-auto me-3 text-decoration-none px-0"
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
          style={{ right: '0.75rem', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          {CaretDownIcon && CaretRightIcon && (isOpen ? <CaretDownIcon /> : <CaretRightIcon />)}
        </span>
      </div>
      {isOpen && (
        <div
          ref={dropdownRef}
          className="position-absolute w-100 mt-1 bg-white border rounded shadow-sm"
          style={{ zIndex: 1000 }}
        >
          <div className="p-2 border-bottom">
            <div className="position-relative">
              <Form.Control
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={categorySearch}
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  setCategorySearch(event.target.value);
                  setExpandedParentsInSearch([]);
                }}
                autoComplete="off"
                onClick={(event: ReactMouseEvent<HTMLInputElement>) => event.stopPropagation()}
              />
              {categorySearch && (
                <button
                  type="button"
                  className="btn btn-sm position-absolute top-50 end-0 translate-middle-y text-muted"
                  style={{ border: 'none', background: 'transparent' }}
                  onClick={(event: ReactMouseEvent<HTMLButtonElement>) => {
                    event.stopPropagation();
                    setCategorySearch('');
                    focusInput();
                  }}
                  aria-label="Clear search"
                >
                  {TimesCircleIcon && <TimesCircleIcon size={16} />}
                </button>
              )}
            </div>
          </div>
          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {categorySearch ? (
              filteredCategories
                .filter((category) => shouldShowCategory(category))
                .map((category, index) => {
                  const hasChildren = Boolean(categoryTree[category]?.length);
                  const isExpanded = expandedParentsInSearch.includes(category);
                  const isDirectParentMatch = Boolean(categoryTree[category] && directMatchParents.includes(category));

                  if (isDirectParentMatch) {
                    const parentColor = parentCategoryColors[category] || DEFAULT_COLOR;
                    const ParentIcon = coerceIconComponent(categoryIcons[category]);
                    return (
                      <React.Fragment key={`parent-${index}`}>
                        <div className="p-2 d-flex align-items-center">
                          <Form.Check
                            type={isSingleSelect ? 'radio' : 'checkbox'}
                            name={isSingleSelect ? singleSelectName : undefined}
                            id={`category-${index}`}
                            checked={
                              hasChildren
                                ? isCategorySelected(category, { isParent: true })
                                : isCategorySelected(category)
                            }
                            onChange={() => toggleCategory(category, { isParent: hasChildren })}
                            label={
                              <div
                                className="d-flex align-items-center"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  setExpandedParentsInSearch((previous) => {
                                    if (previous.includes(category)) {
                                      return previous.filter((entry) => entry !== category);
                                    }
                                    return [...previous, category];
                                  });
                                }}
                                style={{ cursor: 'pointer' }}
                              >
                                <span
                                  className="flex-grow-1"
                                  style={{
                                    color:
                                      (hasChildren && isCategorySelected(category, { isParent: true })) ||
                                      isAnyChildSelected(category)
                                        ? 'white'
                                        : parentColor,
                                    backgroundColor:
                                      (hasChildren && isCategorySelected(category, { isParent: true })) ||
                                      isAnyChildSelected(category)
                                        ? parentColor
                                        : 'transparent',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold',
                                  }}
                                >
                                  {ParentIcon && <ParentIcon className="me-2" size={14} />}
                                  {category}
                                </span>
                                {hasChildren && (
                                  <span style={{ marginLeft: 'auto', color: parentColor }}>
                                    {CaretDownIcon && CaretRightIcon && (isExpanded ? <CaretDownIcon /> : <CaretRightIcon />)}
                                  </span>
                                )}
                              </div>
                            }
                          />
                        </div>
                        {hasChildren && isExpanded
                          ? categoryTree[category]?.map((child) => {
                              const childColor = parentColor;
                              const ChildIcon = coerceIconComponent(categoryIcons[child]);
                              return (
                                <div key={child} className="p-2 ps-4 d-flex align-items-center">
                                  <Form.Check
                                    type={isSingleSelect ? 'radio' : 'checkbox'}
                                    name={isSingleSelect ? singleSelectName : undefined}
                                    id={`child-${category}-${child}`}
                                    checked={isCategorySelected(child)}
                                    onChange={() => toggleCategory(child)}
                                    onClick={(event) => event.stopPropagation()}
                                  />
                                  <span
                                    onClick={() => toggleCategory(child)}
                                    style={{ cursor: 'pointer', marginLeft: '0.5rem', color: childColor }}
                                    className="d-flex align-items-center"
                                  >
                                    {ChildIcon && <ChildIcon className="me-2" size={14} />}
                                    {child}
                                  </span>
                                </div>
                              );
                            })
                          : null}
                      </React.Fragment>
                    );
                  }

                  const parent = findParentForCategory(category, categoryTree);
                  const color = parent ? parentCategoryColors[parent] || DEFAULT_COLOR : DEFAULT_COLOR;
                  const Icon = coerceIconComponent(categoryIcons[category]);
                  return (
                    <div key={category} className="p-2 d-flex align-items-center">
                      <Form.Check
                        type={isSingleSelect ? 'radio' : 'checkbox'}
                        name={isSingleSelect ? singleSelectName : undefined}
                        id={`category-${index}`}
                        checked={isCategorySelected(category)}
                        onChange={() => toggleCategory(category)}
                        label={
                          <span
                            style={{
                              color: isCategorySelected(category) ? 'white' : color,
                              backgroundColor: isCategorySelected(category) ? color : 'transparent',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                            className="d-inline-flex align-items-center gap-1"
                          >
                            {Icon && <Icon size={14} />}
                            {category}
                          </span>
                        }
                        className="w-100"
                      />
                    </div>
                  );
                })
            ) : (
              Object.entries(categoryTree).map(([parent, children]) => {
                const parentColor = parentCategoryColors[parent] || DEFAULT_COLOR;
                const ParentIcon = coerceIconComponent(categoryIcons[parent]);
                const hasChildren = children.length > 0;
                const isExpanded = Boolean(expandedCategories[parent]);

                return (
                  <div key={parent}>
                    <div className="p-2 d-flex align-items-center">
                      <Form.Check
                        type={isSingleSelect ? 'radio' : 'checkbox'}
                        name={isSingleSelect ? singleSelectName : undefined}
                        id={`parent-${parent}`}
                        checked={
                          hasChildren
                            ? isCategorySelected(parent, { isParent: true })
                            : isCategorySelected(parent)
                        }
                        onChange={() => toggleCategory(parent, { isParent: hasChildren })}
                        label={
                          <div
                            className="d-flex align-items-center"
                            onClick={(event) => {
                              if (hasChildren) {
                                event.preventDefault();
                                event.stopPropagation();
                                setExpandedCategories((previous) => ({
                                  ...previous,
                                  [parent]: !previous[parent],
                                }));
                              }
                            }}
                            style={{ cursor: hasChildren ? 'pointer' : 'default' }}
                          >
                            <span
                              className="flex-grow-1"
                              style={{
                                color:
                                  (hasChildren && isCategorySelected(parent, { isParent: true })) ||
                                  isAnyChildSelected(parent)
                                    ? 'white'
                                    : parentColor,
                                backgroundColor:
                                  (hasChildren && isCategorySelected(parent, { isParent: true })) ||
                                  isAnyChildSelected(parent)
                                    ? parentColor
                                    : 'transparent',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                              }}
                            >
                              {ParentIcon && <ParentIcon className="me-2" size={14} />}
                              {parent}
                            </span>
                            {hasChildren && (
                              <span style={{ marginLeft: 'auto', color: parentColor }}>
                                {CaretDownIcon && CaretRightIcon && (isExpanded ? <CaretDownIcon /> : <CaretRightIcon />)}
                              </span>
                            )}
                          </div>
                        }
                      />
                    </div>
                    {hasChildren && isExpanded
                      ? children.map((child) => {
                          const childColor = parentColor;
                          const ChildIcon = coerceIconComponent(categoryIcons[child]);
                          return (
                            <div key={child} className="p-2 ps-4 d-flex align-items-center">
                              <Form.Check
                                type={isSingleSelect ? 'radio' : 'checkbox'}
                                name={isSingleSelect ? singleSelectName : undefined}
                                id={`child-${parent}-${child}`}
                                checked={isCategorySelected(child)}
                                onChange={() => toggleCategory(child)}
                                onClick={(event) => event.stopPropagation()}
                              />
                              <span
                                onClick={() => toggleCategory(child)}
                                style={{ cursor: 'pointer', marginLeft: '0.5rem', color: childColor }}
                                className="d-flex align-items-center"
                              >
                                {ChildIcon && <ChildIcon className="me-2" size={14} />}
                                {child}
                              </span>
                            </div>
                          );
                        })
                      : null}
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

export default CategoryDropdown;
