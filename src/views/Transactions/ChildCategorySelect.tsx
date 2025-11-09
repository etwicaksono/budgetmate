import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { Form } from 'react-bootstrap';
import { FaCaretDown, FaCheck } from 'react-icons/fa';
import { InputClearButton } from '../../components/InputClearButton';
// TODO: Merge child category selector into unified category picker.
import type { ComponentType } from 'react';
import type { IconType } from 'react-icons';

const DEFAULT_COLOR = '#6c757d';

type CategoryTree = Record<string, string[]>;
type CategoryColorMap = Record<string, string>;
type IconComponent = ComponentType<{ size?: number; className?: string }>;

interface ChildCategorySelectProps {
  selectedCategories: string[];
  setSelectedCategories: (next?: string[]) => void;
  categoryTree: CategoryTree;
  parentCategoryColors: CategoryColorMap;
  categoryIcons: Record<string, IconComponent | IconType | undefined>;
  allCategories: string[];
  entityLabelSingular?: string;
  entityLabelPlural?: string;
  searchPlaceholder?: string;
  clearSelectedLabel?: string;
  onDropdownOpen?: () => void;
}

interface CategoryMeta {
  parent: string | null;
  color: string;
  Icon: IconComponent | null;
}

interface GroupedChildCategory {
  value: string;
  label: string;
  parent: string | null;
  color: string;
  Icon: IconComponent | null;
}

interface GroupedCategory {
  key: string;
  parent: string;
  parentColor: string;
  parentIcon: IconComponent | null;
  children: GroupedChildCategory[];
}

const coerceIconComponent = (
  icon: IconComponent | IconType | undefined | null,
): IconComponent | null => {
  if (!icon) {
    return null;
  }
  return icon as unknown as IconComponent;
};

const CaretDownIcon = coerceIconComponent(FaCaretDown);
const CheckIcon = coerceIconComponent(FaCheck);

const findParentForCategory = (category: string, categoryTree: CategoryTree): string | null => {
  for (const [parent, children] of Object.entries(categoryTree ?? {})) {
    if (children?.includes(category)) {
      return parent;
    }
  }
  return null;
};

export const ChildCategorySelect: React.FC<ChildCategorySelectProps> = ({
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
  onDropdownOpen,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [categorySearch, setCategorySearch] = useState<string>('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCategory = selectedCategories?.[0] ?? null;
  const placeholderText = searchPlaceholder ?? `Search ${entityLabelSingular}...`;

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsOpen((previous) => {
      const next = !previous;
      if (!previous && next) {
        onDropdownOpen?.();
      }
      return next;
    });
  }, [onDropdownOpen]);

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;

      if (containerRef.current && target && !containerRef.current.contains(target)) {
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
    (category: string | null): CategoryMeta => {
      if (!category) {
        return { parent: null, color: DEFAULT_COLOR, Icon: null };
      }

      const parent = findParentForCategory(category, categoryTree);
      const color =
        parentCategoryColors?.[category] ??
        (parent ? parentCategoryColors?.[parent] : null) ??
        DEFAULT_COLOR;
      const Icon = coerceIconComponent(
        categoryIcons?.[category] ?? (parent ? categoryIcons?.[parent] : null),
      );

      return { parent, color, Icon };
    },
    [categoryTree, parentCategoryColors, categoryIcons],
  );

  const groupedCategories = useMemo(() => {
    const searchTerm = categorySearch.trim().toLowerCase();

    const createChildEntry = (parent: string, child: string): GroupedChildCategory => {
      const color =
        parentCategoryColors?.[child] ?? parentCategoryColors?.[parent] ?? DEFAULT_COLOR;
      const Icon = coerceIconComponent(categoryIcons?.[child] ?? categoryIcons?.[parent]);

      return {
        value: child,
        label: child,
        parent,
        color,
        Icon,
      };
    };

    const results: GroupedCategory[] = [];

    Object.entries(categoryTree ?? {}).forEach(([parent, children]) => {
      const normalizedChildren = (children ?? [])
        .filter((child): child is string => Boolean(child) && child !== 'All')
        .map((child) => createChildEntry(parent, child));

      if (!searchTerm) {
        // If parent has children, show them
        if (normalizedChildren.length > 0) {
          results.push({
            key: `parent-${parent}`,
            parent,
            parentColor: parentCategoryColors?.[parent] ?? DEFAULT_COLOR,
            parentIcon: coerceIconComponent(categoryIcons?.[parent]),
            children: normalizedChildren,
          });
        } else {
          // If parent has no children, make the parent itself selectable
          results.push({
            key: `parent-${parent}`,
            parent,
            parentColor: parentCategoryColors?.[parent] ?? DEFAULT_COLOR,
            parentIcon: coerceIconComponent(categoryIcons?.[parent]),
            children: [{
              value: parent,
              label: parent,
              parent: null,
              color: parentCategoryColors?.[parent] ?? DEFAULT_COLOR,
              Icon: coerceIconComponent(categoryIcons?.[parent]),
            }],
          });
        }
        return;
      }

      const parentMatches = parent.toLowerCase().includes(searchTerm);
      const filteredChildren = normalizedChildren.filter((child) =>
        child.label.toLowerCase().includes(searchTerm),
      );

      if (parentMatches || filteredChildren.length > 0) {
        // If parent matches but has no children, make parent selectable
        const childrenToShow = parentMatches && normalizedChildren.length === 0
          ? [{
              value: parent,
              label: parent,
              parent: null,
              color: parentCategoryColors?.[parent] ?? DEFAULT_COLOR,
              Icon: coerceIconComponent(categoryIcons?.[parent]),
            }]
          : parentMatches ? normalizedChildren : filteredChildren;
        
        results.push({
          key: `parent-${parent}`,
          parent,
          parentColor: parentCategoryColors?.[parent] ?? DEFAULT_COLOR,
          parentIcon: coerceIconComponent(categoryIcons?.[parent]),
          children: childrenToShow,
        });
      }
    });

    if (!searchTerm) {
      const uncategorized = allCategories.filter(
        (category) => !(categoryTree ?? {})[category] && !findParentForCategory(category, categoryTree),
      );

      if (uncategorized.length > 0) {
        results.push({
          key: 'uncategorized',
          parent: 'Uncategorized',
          parentColor: DEFAULT_COLOR,
          parentIcon: null,
          children: uncategorized.map((category) => ({
            value: category,
            label: category,
            parent: null,
            color: DEFAULT_COLOR,
            Icon: coerceIconComponent(categoryIcons?.[category]),
          })),
        });
      }
    }

    return results;
  }, [categoryTree, categoryIcons, parentCategoryColors, categorySearch, allCategories]);

  const handleSelectCategory = useCallback(
    (category: string) => {
    setSelectedCategories([category]);
      closeDropdown();
    },
    [closeDropdown, setSelectedCategories],
  );

  const handleClearSelection = useCallback(() => {
    setSelectedCategories([]);
    closeDropdown();
  }, [closeDropdown, setSelectedCategories]);

  const renderGroupedChildren = () => {
    if (groupedCategories.length === 0) {
      return (
        <div className="p-3 text-center text-muted">
          No {entityLabelPlural.toLowerCase()} found.
        </div>
      );
    }

    return groupedCategories.map((group) => (
      <div key={group.key} className="border-bottom">
        <div className="px-3 pt-2">
          <div className="d-flex align-items-center">
            <div className="small text-muted fw-semibold">{group.parent}</div>
            <div className="flex-grow-1 ms-2" style={{ borderBottom: '1px solid #e9ecef' }} />
          </div>
        </div>
        {group.children.map((child) => {
          const isSelected = selectedCategories.includes(child.value);
          return (
            <button
              key={child.value}
              type="button"
              className={`w-100 border-0 bg-transparent d-flex align-items-center px-3 py-2 ${
                isSelected ? 'bg-light' : ''
              }`}
              onClick={() => handleSelectCategory(child.value)}
            >
              <span
                className="d-inline-flex align-items-center justify-content-center rounded-circle me-3 flex-shrink-0"
                style={{
                  width: 28,
                  height: 28,
                  backgroundColor: child.color,
                  color: '#fff',
                  fontSize: '0.75rem',
                }}
              >
                {child.Icon ? <child.Icon size={14} /> : child.label.charAt(0).toUpperCase()}
              </span>
              <div className="flex-grow-1 text-start">
                <div className="fw-semibold text-truncate">{child.label}</div>
                {child.parent && (
                  <div className="text-muted small text-truncate">{child.parent}</div>
                )}
              </div>
              {isSelected && CheckIcon && <CheckIcon className="text-success ms-2" />}
            </button>
          );
        })}
      </div>
    ));
  };

  const { parent: selectedParent, color: selectedColor, Icon: SelectedIcon } =
    getCategoryMeta(selectedCategory);

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
        <div className="d-flex alignments-center ms-2 gap-2">
          <InputClearButton
            show={!!selectedCategory}
            onClick={(event) => {
              event?.stopPropagation?.();
              handleClearSelection();
            }}
            title={clearSelectedLabel}
            ariaLabel={clearSelectedLabel}
            className="btn p-0 border-0 bg-transparent"
            colorClass="text-muted"
            positionAbsolute={false}
            rightOffset="0"
            iconSize={18}
          />
          {CaretDownIcon && <CaretDownIcon className="text-muted" />}
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
                onChange={(event: ChangeEvent<HTMLInputElement>) => setCategorySearch(event.target.value)}
                autoComplete="off"
                onClick={(event) => event.stopPropagation()}
              />
              {categorySearch && (
                <InputClearButton
                  show={true}
                  onClick={(event) => {
                    event?.stopPropagation?.();
                    setCategorySearch('');
                    searchInputRef.current?.focus();
                  }}
                  title="Clear search"
                  ariaLabel="Clear search"
                  className="btn btn-sm border-0 bg-transparent"
                  colorClass="text-muted"
                  positionAbsolute={true}
                  rightOffset="0.25rem"
                  iconSize={16}
                />
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

export default ChildCategorySelect;
