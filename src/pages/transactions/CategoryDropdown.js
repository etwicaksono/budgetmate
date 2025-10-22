import React, { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import { Button, Form } from 'react-bootstrap';
import { FaCaretDown, FaCaretRight, FaTimesCircle } from 'react-icons/fa';

const findParentForCategory = (category, categoryTree) => {
  for (const [parent, children] of Object.entries(categoryTree)) {
    if (children.includes(category)) {
      return parent;
    }
  }
  return null;
};

export const CategoryDropdown = ({
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
  const [isOpen, setIsOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedParentsInSearch, setExpandedParentsInSearch] = useState([]);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const placeholderText = `All ${entityLabelPlural}`;
  const singleSelectName = useId();
  const LeadingIcon = leadingIcon;
  const leadingPaddingLeft = LeadingIcon ? '2.5rem' : '0.75rem';

  const { filteredCategories, directMatchParents } = useMemo(() => {
    if (!categorySearch) {
      return {
        filteredCategories: allCategories,
        directMatchParents: [],
      };
    }

    const searchLower = categorySearch.toLowerCase();
    const resultSet = new Set();
    const directParents = [];

    Object.entries(categoryTree).forEach(([parent, children]) => {
      if (parent.toLowerCase().includes(searchLower)) {
        resultSet.add(parent);
        directParents.push(parent);
      }
    });

    Object.entries(categoryTree).forEach(([parent, children]) => {
      const matches = children.filter((child) => child.toLowerCase().includes(searchLower));
      if (matches.length > 0) {
        matches.forEach((match) => {
          if (!directParents.includes(parent)) {
            resultSet.add(match);
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
    (category) => {
      if (!categorySearch) {
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
    [categorySearch, categoryTree, directMatchParents]
  );

  const selectAllSubcategories = useCallback(
    (parentCategory) => {
      if (isSingleSelect) {
        setSelectedCategories((previous) =>
          previous.includes(parentCategory) ? [] : [parentCategory]
        );
        return;
      }

      const subcategories = categoryTree[parentCategory] || [];
      setSelectedCategories((previous) => {
        const allSelected = subcategories.every((category) => previous.includes(category));
        if (allSelected) {
          return previous.filter((category) => !subcategories.includes(category));
        }

        const combined = new Set(previous);
        subcategories.forEach((category) => combined.add(category));
        combined.delete(parentCategory);
        return Array.from(combined);
      });
    },
    [categoryTree, setSelectedCategories, isSingleSelect]
  );
  const toggleCategory = useCallback(
    (category) => {
      setSelectedCategories((previous) => {
        if (isSingleSelect) {
          if (category === 'All') {
            return [];
          }
          return previous.includes(category) ? [] : [category];
        }

        if (category === 'All') {
          return previous.length === allCategories.length ? [] : [...allCategories];
        }

        if (categoryTree[category]) {
          const children = categoryTree[category];
          if (children.length === 0) {
            if (previous.includes(category)) {
              return previous.filter((entry) => entry !== category);
            }
            return [...previous, category];
          }

          const allChildrenSelected = children.every((child) => previous.includes(child));
          if (allChildrenSelected) {
            return previous.filter((entry) => !children.includes(entry));
          }

          const combined = new Set(previous);
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
    [allCategories, categoryTree, setSelectedCategories, categorySearch, setCategorySearch, setExpandedParentsInSearch, isSingleSelect]
  );
  const isCategorySelected = useCallback(
    (category) => {
      if (category === 'All') {
        return selectedCategories.length === allCategories.length;
      }

      if (selectedCategories.includes(category)) {
        return true;
      }

      if (categoryTree[category]) {
        const children = categoryTree[category];
        return children.length > 0 && children.every((child) => selectedCategories.includes(child));
      }

      return false;
    },
    [selectedCategories, allCategories.length, categoryTree]
  );

  const isAnyChildSelected = useCallback(
    (parentCategory) => {
      const children = categoryTree[parentCategory];
      if (!children) {
        return false;
      }

      return children.some((child) => selectedCategories.includes(child));
    },
    [categoryTree, selectedCategories]
  );

  const clearSelectedCategories = useCallback(() => {
    setSelectedCategories([]);
  }, [setSelectedCategories]);


  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        containerRef.current &&
        !containerRef.current.contains(event.target)
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
      if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(triggerFocus);
    } else {
      setTimeout(triggerFocus, 0);
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
              ? `${filteredCategories.length} matching ${filteredCategories.length === 1 ? entityLabelSingular : entityLabelPlural}`
              : `${selectedCategories.length} ${selectedCategories.length === 1 ? entityLabelSingular : entityLabelPlural} selected`}
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
          {selectedCategories.map((category) => {
            let categoryColor = '#000000';
            let CategoryIcon = null;

            if (parentCategoryColors[category]) {
              categoryColor = parentCategoryColors[category];
              CategoryIcon = categoryIcons[category] || null;
            } else {
              const parent = findParentForCategory(category, categoryTree);
              if (parent) {
                categoryColor = parentCategoryColors[parent] || '#000000';
              }
              CategoryIcon = categoryIcons[category] || null;
            }

            return (
              <div
                key={category}
                className="d-flex align-items-center me-2 mb-1 rounded px-2 py-1"
                style={{ fontSize: '0.8em', backgroundColor: categoryColor, color: 'white' }}
              >
                {CategoryIcon && <CategoryIcon className="me-1" style={{ fontSize: '0.9em' }} />}
                {category}
                <button
                  type="button"
                  className="btn-close btn-close-white ms-2 p-1"
                  style={{ fontSize: '0.6em', lineHeight: 0.8 }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedCategories((previous) => previous.filter((entry) => entry !== category));
                  }}
                  aria-label="Remove"
                ></button>
              </div>
            );
          })}
          {selectedCategories.length === 0 && (
            <span className="text-muted">{placeholderText}</span>
          )}
        </div>
        {selectedCategories.length > 0 && !isSingleSelect && (
          <Button
            variant="link"
            size="sm"
            className="ms-auto me-3 text-decoration-none px-0"
            onClick={(event) => {
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
          {isOpen ? <FaCaretDown /> : <FaCaretRight />}
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
                onChange={(event) => {
                  setCategorySearch(event.target.value);
                  setExpandedParentsInSearch([]);
                }}
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
                    focusInput();
                  }}
                  aria-label="Clear search"
                >
                  <FaTimesCircle size={16} />
                </button>
              )}
            </div>
          </div>
          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {categorySearch ? (
              filteredCategories
                .filter((category) => shouldShowCategory(category))
                .map((category, index) => {
                  const hasChildren = categoryTree[category] && categoryTree[category].length > 0;
                  const isExpanded = expandedParentsInSearch.includes(category);
                  const isDirectParentMatch = categoryTree[category] && directMatchParents.includes(category);

                  if (isDirectParentMatch) {
                    const parentColor = parentCategoryColors[category] || '#000000';
                    const ParentIcon = categoryIcons[category] || null;
                    return (
                      <React.Fragment key={`parent-${index}`}>
                        <div className="p-2 d-flex align-items-center">
                          <Form.Check
                            type={isSingleSelect ? 'radio' : 'checkbox'}
                            name={isSingleSelect ? singleSelectName : undefined}
                            id={`category-${index}`}
                            checked={isCategorySelected(category)}
                            onChange={() => toggleCategory(category)}
                            label={
                              <div className="d-flex align-items-center w-100">
                                <span className="flex-grow-1 d-flex align-items-center" style={{ color: parentColor, fontWeight: 'bold' }}>
                                  {ParentIcon && <ParentIcon className="me-2" />}
                                  {category}
                                </span>
                                {hasChildren && (
                                  <span
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      setExpandedParentsInSearch((previous) =>
                                        isExpanded
                                          ? previous.filter((entry) => entry !== category)
                                          : [...previous, category]
                                      );
                                    }}
                                    style={{ cursor: 'pointer', marginLeft: 'auto', paddingLeft: '8px', color: parentColor }}
                                  >
                                    {isExpanded ? <FaCaretDown /> : <FaCaretRight />}
                                  </span>
                                )}
                              </div>
                            }
                          />
                        </div>
                        {hasChildren && isExpanded
                          ? categoryTree[category].map((child, childIndex) => {
                            const childColor = parentCategoryColors[category] || '#000000';
                            const ChildIcon = categoryIcons[child] || null;
                            return (
                              <div key={`child-${index}-${childIndex}`} className="p-2 ps-4 d-flex align-items-center">
                                <Form.Check
                                  type={isSingleSelect ? 'radio' : 'checkbox'}
                                  name={isSingleSelect ? singleSelectName : undefined}
                                  id={`child-${index}-${childIndex}`}
                                  checked={isCategorySelected(child)}
                                  onChange={() => toggleCategory(child)}
                                  onClick={(event) => event.stopPropagation()}
                                />
                                <span
                                  onClick={() => toggleCategory(child)}
                                  style={{ cursor: 'pointer', marginLeft: '0.5rem', color: childColor }}
                                  className="d-flex align-items-center"
                                >
                                  {ChildIcon && <ChildIcon className="me-2" />}
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
                  const color = parent ? parentCategoryColors[parent] || '#000000' : '#000000';
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
                          >
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
                const parentColor = parentCategoryColors[parent] || '#000000';
                const ParentIcon = categoryIcons[parent] || null;
                const hasChildren = children.length > 0;
                const isExpanded = !!expandedCategories[parent];

                return (
                  <div key={parent}>
                    <div className="p-2 d-flex align-items-center">
                      <Form.Check
                        type={isSingleSelect ? 'radio' : 'checkbox'}
                        name={isSingleSelect ? singleSelectName : undefined}
                        id={`parent-${parent}`}
                        checked={isCategorySelected(parent) || (hasChildren && children.every((child) => isCategorySelected(child)))}
                        onChange={() => {
                          if (hasChildren) {
                            selectAllSubcategories(parent);
                            return;
                          }
                          toggleCategory(parent);
                        }}
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
                                color: isCategorySelected(parent) || isAnyChildSelected(parent) ? 'white' : parentColor,
                                backgroundColor: isCategorySelected(parent) || isAnyChildSelected(parent) ? parentColor : 'transparent',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                              }}
                            >
                              {ParentIcon && <ParentIcon className="me-2" />}
                              {parent}
                            </span>
                            {hasChildren && (
                              <span
                                style={{ marginLeft: 'auto', color: parentColor }}
                              >
                                {isExpanded ? <FaCaretDown /> : <FaCaretRight />}
                              </span>
                            )}
                          </div>
                        }
                      />
                    </div>
                    {hasChildren && isExpanded
                      ? children.map((child) => {
                        const childColor = parentColor;
                        const ChildIcon = categoryIcons[child] || null;
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
                              {ChildIcon && <ChildIcon className="me-2" />}
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
