import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Button, Dropdown, Form, InputGroup, ListGroup, Modal } from 'react-bootstrap';
import {
   FaPlus,
   FaEdit,
   FaTrash,
   FaChevronRight,
   FaEllipsisV,
   FaGift,
   FaSearch,
   FaTimes
} from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import { ChromePicker } from 'react-color';
import { ChildCategorySelect } from '../transactions/ChildCategorySelect';
import { SingleCategoryDropdown } from '../transactions/SingleCategoryDropdown';
import { useCategoryData } from '../transactions/useCategoryData';
import { apiService } from '../../services';
import ToastAlert from '../../components/ToastAlert';
import './Categories.css';
import Swal from 'sweetalert2';

const DEFAULT_ICON_KEY = 'FaGift';
const DEFAULT_CATEGORY_COLOR = '#dc3545';
const ICON_EXCLUSIONS = new Set(['IconContext']);
const ALLOWED_NATURES = ['WANT', 'NEED', 'MUST'];

const sanitizeNature = (nature) => (ALLOWED_NATURES.includes(nature) ? nature : 'WANT');

const resolveIconKey = (availableIconKeys, iconKey, fallback = DEFAULT_ICON_KEY) => {
   if (!iconKey) {
      return fallback;
   }
   return availableIconKeys.includes(iconKey) ? iconKey : fallback;
};

const resolveParentColor = (parentId, parentIdToNameMap, parentCategoryColorsMap, fallback = DEFAULT_CATEGORY_COLOR) => {
   if (!parentId) {
      return fallback;
   }
   const parentName = parentIdToNameMap[parentId];
   if (!parentName) {
      return fallback;
   }
   return parentCategoryColorsMap[parentName] ?? fallback;
};

const createEmptyFormState = (defaultIconKey, overrides = {}) => ({
   id: null,
   name: '',
   nature: 'WANT',
   parentId: null,
   icon: defaultIconKey,
   color: DEFAULT_CATEGORY_COLOR,
   isActive: true,
   ...overrides,
});

const mapApiCategory = (item, availableIconKeys, defaultIconKey) => {
   if (!item?.name) {
      return null;
   }

   const parentId = item?.parent_id ?? null;

   return {
      id: item?.id,
      parent_id: parentId,
      name: item.name,
      icon: resolveIconKey(availableIconKeys, item?.icon, defaultIconKey),
      color: item?.color || DEFAULT_CATEGORY_COLOR,
      nature: sanitizeNature(item?.nature),
      is_parent: parentId == null,
      is_active: item?.is_active !== false,
   };
};

const useOutsideClick = (isActive, ref, onOutside) => {
   useEffect(() => {
      if (!isActive) {
         return;
      }

      const handleClickOutside = (event) => {
         if (ref.current && !ref.current.contains(event.target)) {
            onOutside();
         }
      };

      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);

      return () => {
         document.removeEventListener('mousedown', handleClickOutside);
         document.removeEventListener('touchstart', handleClickOutside);
      };
   }, [isActive, onOutside, ref]);
};

const Categories = () => {
   const {
      categories,
      setCategories,
      categoryIcons
   } = useCategoryData();

   const [searchTerm, setSearchTerm] = useState('');

   const categoriesWithChildren = useMemo(() => {
      // Filter categories based on search term
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = (name) => name.toLowerCase().includes(searchLower);

      // Get all parent categories
      const parentCategories = categories.filter(cat => cat.is_parent);

      return parentCategories.map(parent => ({
         ...parent,
         children: categories
            .filter(cat =>
               cat.parent_id === parent.id &&
               (matchesSearch(cat.name) || matchesSearch(parent.name))
            )
            .map(child => ({
               id: child.id,
               name: child.name,
               type: child.is_parent ? 'parent' : 'child'
            }))
      })).filter(parent =>
         matchesSearch(parent.name) || parent.children.length > 0
      );
   }, [categories, searchTerm]);

   const [showAddModal, setShowAddModal] = useState(false);
   const [successMessage, setSuccessMessage] = useState('');
   const availableIconKeys = useMemo(() => {
      return Object.keys(FaIcons).filter((key) => key.startsWith('Fa') && !ICON_EXCLUSIONS.has(key));
   }, []);

   const defaultIconKey = useMemo(() => {
      return availableIconKeys.find((key) => key === DEFAULT_ICON_KEY) || DEFAULT_ICON_KEY;
   }, [availableIconKeys]);

   const [newCategory, setNewCategory] = useState(() => createEmptyFormState(defaultIconKey));
   const [customColor, setCustomColor] = useState(DEFAULT_CATEGORY_COLOR);
   const [isLoadingCategories, setIsLoadingCategories] = useState(false);
   const [loadError, setLoadError] = useState('');
   const [showEditModal, setShowEditModal] = useState(false);
   const [editCategory, setEditCategory] = useState(() => createEmptyFormState(defaultIconKey));
   const [editCustomColor, setEditCustomColor] = useState(DEFAULT_CATEGORY_COLOR);
   const [isUpdating, setIsUpdating] = useState(false);
   const [editError, setEditError] = useState('');
   const [showEditColorPicker, setShowEditColorPicker] = useState(false);
   const editColorPickerRef = useRef(null);
   const hasFetchedCategoriesRef = useRef(false);

   const parentCategories = useMemo(
      () => categories.filter((category) => category.is_parent),
      [categories]
   );

   const parentIdToNameMap = useMemo(() => {
      return parentCategories.reduce((accumulator, category) => {
         accumulator[category.id] = category.name;
         return accumulator;
      }, {});
   }, [parentCategories]);

   const parentNameToIdMap = useMemo(() => {
      return parentCategories.reduce((accumulator, category) => {
         accumulator[category.name] = category.id;
         return accumulator;
      }, {});
   }, [parentCategories]);

   const parentCategoryColorsMap = useMemo(() => {
      return parentCategories.reduce((accumulator, category) => {
         accumulator[category.name] = category.color;
         return accumulator;
      }, {});
   }, [parentCategories]);

   const parentCategoryOptions = useMemo(
      () => categories.filter((category) => category.parent_id == null).map((category) => category.name).filter(Boolean),
      [categories]
   );

   const iconDropdownIcons = useMemo(() => {
      return availableIconKeys.reduce((accumulator, key) => {
         const IconComponent = FaIcons[key];
         if (IconComponent) {
            accumulator[key] = IconComponent;
         }
         return accumulator;
      }, {});
   }, [availableIconKeys]);

   const iconColorMap = useMemo(() => {
      const selectedParentName = newCategory.parentId ? parentIdToNameMap[newCategory.parentId] : null;
      const parentColor = selectedParentName
         ? parentCategoryColorsMap[selectedParentName] ?? customColor ?? DEFAULT_CATEGORY_COLOR
         : customColor ?? DEFAULT_CATEGORY_COLOR;
      return availableIconKeys.reduce((accumulator, key) => {
         accumulator[key] = parentColor;
         return accumulator;
      }, {});
   }, [availableIconKeys, customColor, newCategory.parentId, parentIdToNameMap, parentCategoryColorsMap]);
   const editIconColorMap = useMemo(() => {
      const selectedParentName = editCategory.parentId ? parentIdToNameMap[editCategory.parentId] : null;
      const parentColor = selectedParentName
         ? parentCategoryColorsMap[selectedParentName] ?? editCustomColor ?? DEFAULT_CATEGORY_COLOR
         : editCustomColor ?? editCategory.color ?? DEFAULT_CATEGORY_COLOR;
      return availableIconKeys.reduce((accumulator, key) => {
         accumulator[key] = parentColor;
         return accumulator;
      }, {});
   }, [
      availableIconKeys,
      editCategory.color,
      editCategory.parentId,
      editCustomColor,
      parentIdToNameMap,
      parentCategoryColorsMap,
   ]);
   const getIconComponent = useCallback(
      (iconKey) => {
         const resolvedKey = resolveIconKey(availableIconKeys, iconKey, DEFAULT_ICON_KEY);
         return iconDropdownIcons[resolvedKey] || FaIcons[resolvedKey] || FaGift;
      },
      [availableIconKeys, iconDropdownIcons]
   );
   const resolveColorForParent = useCallback(
      (parentId, fallbackColor = DEFAULT_CATEGORY_COLOR) => resolveParentColor(parentId, parentIdToNameMap, parentCategoryColorsMap, fallbackColor),
      [parentIdToNameMap, parentCategoryColorsMap]
   );
   const newCategoryDisplayColor = useMemo(
      () => (newCategory.parentId ? resolveColorForParent(newCategory.parentId) : newCategory.color),
      [newCategory.parentId, newCategory.color, resolveColorForParent]
   );
   const editCategoryDisplayColor = useMemo(
      () => (editCategory.parentId ? resolveColorForParent(editCategory.parentId) : editCategory.color),
      [editCategory.parentId, editCategory.color, resolveColorForParent]
   );
   const [formError, setFormError] = useState('');
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [showColorPicker, setShowColorPicker] = useState(false);
   const colorPickerRef = useRef(null);

   const resetNewForm = useCallback(() => {
      setNewCategory(createEmptyFormState(defaultIconKey));
      setCustomColor(DEFAULT_CATEGORY_COLOR);
      setFormError('');
      setIsSubmitting(false);
      setShowColorPicker(false);
   }, [defaultIconKey]);

   const resetEditForm = useCallback(() => {
      setEditCategory(createEmptyFormState(defaultIconKey));
      setEditCustomColor(DEFAULT_CATEGORY_COLOR);
      setEditError('');
      setIsUpdating(false);
      setShowEditColorPicker(false);
   }, [defaultIconKey]);

   const closeNewColorPicker = useCallback(() => setShowColorPicker(false), [setShowColorPicker]);
   const closeEditColorPicker = useCallback(() => setShowEditColorPicker(false), [setShowEditColorPicker]);

   useOutsideClick(showColorPicker, colorPickerRef, closeNewColorPicker);
   useOutsideClick(showEditColorPicker, editColorPickerRef, closeEditColorPicker);

   useEffect(() => {
      if (hasFetchedCategoriesRef.current) {
         return;
      }
      hasFetchedCategoriesRef.current = true;

      const fetchCategories = async () => {
         setIsLoadingCategories(true);
         try {
            const response = await apiService.get('/categories');
            const apiCategories = Array.isArray(response?.data)
               ? response.data
               : Array.isArray(response)
                  ? response
                  : [];
            const mappedCategories = apiCategories
               .map((item) => mapApiCategory(item, availableIconKeys, defaultIconKey))
               .filter(Boolean);

            setCategories(mappedCategories);
            setLoadError('');
         } catch (error) {
            setCategories([]);
            const apiMessage =
               error?.response?.data?.message ||
               error?.message ||
               'Failed to load categories.';
            setLoadError(apiMessage);
         } finally {
            setIsLoadingCategories(false);
         }
      };

      fetchCategories();
   }, [availableIconKeys, defaultIconKey, setCategories]);

   const handleAddCategory = async (e) => {
      e.preventDefault();
      if (isSubmitting) {
         return;
      }

      const trimmedName = newCategory.name.trim();
      const sanitizedNature = sanitizeNature(newCategory.nature);

      if (!ALLOWED_NATURES.includes(newCategory.nature)) {
         setFormError('Please choose a valid nature.');
         return;
      }

      if (!trimmedName) {
         setFormError('Category name is required.');
         return;
      }

      const personalId = categories.length + 1;
      const baseColor = resolveColorForParent(newCategory.parentId, newCategory.color);
      const payload = {
         personal_id: Number(personalId),
         parent_id: newCategory.parentId || null,
         name: trimmedName,
         icon: newCategory.icon,
         nature: sanitizedNature,
         is_active: newCategory.isActive,
         position: null,
         color: baseColor,
      };

      try {
         setFormError('');
         setIsSubmitting(true);

         const response = await apiService.post('/categories', payload);
         const createdCategory = response?.data ?? response;
         const successMsg = response?.message ?? 'Category created successfully';

         if (!createdCategory?.id) {
            throw new Error('Invalid category response from server.');
         }

         const resolvedParentId = createdCategory.parent_id ?? newCategory.parentId ?? null;
         const responseNature = sanitizeNature(createdCategory.nature ?? sanitizedNature);
         const resolvedIcon = resolveIconKey(availableIconKeys, createdCategory.icon ?? newCategory.icon, defaultIconKey);
         const resolvedColor = createdCategory.color ?? resolveColorForParent(resolvedParentId, baseColor);
         const mappedCategory = {
            id: createdCategory.id,
            parent_id: resolvedParentId,
            name: createdCategory.name ?? trimmedName,
            icon: resolvedIcon,
            color: resolvedColor,
            nature: responseNature,
            is_parent: resolvedParentId == null,
            is_active: createdCategory.is_active ?? newCategory.isActive,
            personal_id: createdCategory.personal_id ?? personalId,
         };

         setCategories(prev => [...prev, mappedCategory]);

         setShowAddModal(false);
         setSuccessMessage(successMsg);
         resetNewForm();
      } catch (error) {
         const apiMessage = error?.response?.data?.message
            || error?.response?.data?.error?.message
            || error.message
            || 'Failed to create category.';
         setFormError(apiMessage);
      } finally {
         setIsSubmitting(false);
      }

   };

   const handleDeleteCategory = async (categoryId) => {
      if (!categoryId) {
         return;
      }

      const targetCategory = categories.find(cat => cat.id === categoryId);
      if (!targetCategory) {
         return;
      }

      const hasChildren = categories.some(cat => cat.parent_id === categoryId);
      setOpenMenuId(null);

      const trimmedName = targetCategory.name?.trim();
      const hasCustomName = Boolean(trimmedName);
      const displayLabel = hasCustomName ? `"${trimmedName}"` : 'this category';
      const confirmationText = hasChildren
         ? `Deleting ${displayLabel} will also remove all of its subcategories.`
         : `You are about to delete ${displayLabel}.`;

      const { isConfirmed } = await Swal.fire({
         title: 'Delete category?',
         text: confirmationText,
         icon: 'warning',
         showCancelButton: true,
         confirmButtonText: 'Delete',
         cancelButtonText: 'Cancel',
         confirmButtonColor: '#dc3545',
         focusCancel: true,
      });

      if (!isConfirmed) {
         return;
      }

      let loaderVisible = false;
      try {
         setLoadError('');

         Swal.fire({
            title: 'Deleting...',
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
               Swal.showLoading();
            },
         });
            loaderVisible = true;

         const response = await apiService.delete(`/categories/${categoryId}`);
         const successMsg =
            response?.message ||
            response?.data?.message ||
            'Category deleted successfully';

         setCategories(prev =>
            prev.filter(cat => cat.id !== categoryId && cat.parent_id !== categoryId)
         );

         setOpenMenuId(null);
         setSuccessMessage(successMsg);
         setLoadError('');
      } catch (error) {
         const apiMessage =
            error?.response?.data?.message ||
            error?.response?.data?.error?.message ||
            error.message ||
            'Failed to delete category.';
         setSuccessMessage('');
         setLoadError(apiMessage);
         if (loaderVisible) {
            Swal.close();
            loaderVisible = false;
         }
         Swal.fire({
            title: 'Delete failed',
            text: apiMessage,
            icon: 'error',
            confirmButtonColor: '#0d6efd',
         });
      } finally {
         if (loaderVisible) {
            Swal.close();
         }
      }
   };

   const handleOpenEdit = (categoryId) => {
      const cat = categories.find(c => c.id === categoryId);
      if (!cat) return;

      const iconKey = resolveIconKey(availableIconKeys, cat?.icon, defaultIconKey);
      const resolvedNature = sanitizeNature(cat?.nature);
      const parentId = cat?.parent_id ?? null;
      const resolvedColor = cat?.color || resolveColorForParent(parentId);

      setEditCategory({
         id: cat.id,
         name: cat.name || '',
         nature: resolvedNature,
         parentId,
         icon: iconKey,
         color: resolvedColor,
         isActive: cat?.is_active !== false,
      });
      setEditCustomColor(resolvedColor ?? DEFAULT_CATEGORY_COLOR);
      setEditError('');
      setShowEditColorPicker(false);
      setShowEditModal(true);
      setOpenMenuId(null);
   };

   const handleCloseEditModal = () => {
      setShowEditModal(false);
      resetEditForm();
   };

   const handleUpdateCategory = async (e) => {
      e.preventDefault();

      if (isUpdating) {
         return;
      }

      const { id } = editCategory;
      if (!id) {
         return;
      }

      const existingCategory = categories.find(c => c.id === id) || null;
      const childCategories = categories.filter(c => c.parent_id === id);
      const previousColor = existingCategory?.color ?? null;

      const trimmedName = editCategory.name.trim();
      const sanitizedNature = sanitizeNature(editCategory.nature);

      if (!ALLOWED_NATURES.includes(editCategory.nature)) {
         setEditError('Please choose a valid nature.');
         return;
      }

      if (!trimmedName) {
         setEditError('Category name is required.');
         return;
      }

      const baseColor = resolveColorForParent(editCategory.parentId, editCategory.color);

      const payload = {
         parent_id: editCategory.parentId || null,
         name: trimmedName,
         icon: editCategory.icon,
         color: baseColor,
         nature: sanitizedNature,
         is_active: editCategory.isActive,
         position: null,
      };

      try {
         setEditError('');
         setIsUpdating(true);
         const response = await apiService.put(`/categories/${id}`, payload);
         const updated = response?.data ?? response;
         const successMsg = response?.message ?? 'Category updated successfully';

         const resolvedParentId = updated?.parent_id ?? editCategory.parentId ?? null;
         const responseNature = sanitizeNature(updated?.nature ?? sanitizedNature);
         const resolvedIcon = resolveIconKey(availableIconKeys, updated?.icon ?? editCategory.icon, defaultIconKey);
         const resolvedColor = updated?.color ?? resolveColorForParent(resolvedParentId, baseColor);
         const isParentCategoryUpdate = resolvedParentId == null;
         const shouldPropagateColor =
            isParentCategoryUpdate &&
            childCategories.length > 0 &&
            resolvedColor &&
            resolvedColor !== previousColor;

         const nextCategory = {
            id,
            parent_id: resolvedParentId,
            name: updated?.name ?? trimmedName,
            icon: resolvedIcon,
            color: resolvedColor,
            nature: responseNature,
            is_parent: resolvedParentId == null,
            is_active: updated?.is_active ?? editCategory.isActive,
         };

         setCategories(prev =>
            prev.map(c => {
               if (c.id === id) {
                  return { ...c, ...nextCategory };
               }
               if (shouldPropagateColor && c.parent_id === id) {
                  return { ...c, color: resolvedColor };
               }
               return c;
            })
         );

         setShowEditModal(false);
         setSuccessMessage(successMsg);
         resetEditForm();
      } catch (error) {
         const apiMessage = error?.response?.data?.message
            || error?.response?.data?.error?.message
            || error.message
            || 'Failed to update category.';
         setEditError(apiMessage);
      } finally {
         setIsUpdating(false);
      }
   };

   const handleCloseModal = () => {
      setShowAddModal(false);
      resetNewForm();
   };

   const handleAddSubcategory = (parentId) => {
      const parentColor = resolveColorForParent(parentId);
      setNewCategory(createEmptyFormState(defaultIconKey, {
         parentId,
         color: parentColor,
      }));
      setCustomColor(parentColor ?? DEFAULT_CATEGORY_COLOR);
      setShowAddModal(true);
      setFormError('');
      setIsSubmitting(false);
      setShowColorPicker(false);
   };

   const [expandedCategories, setExpandedCategories] = useState({});
   const [openMenuId, setOpenMenuId] = useState(null);

   const handleDropdownToggle = (menuId) => {
      setOpenMenuId(menuId);
   };
   const handleCloseSuccessToast = (_, reason) => {
      if (reason === 'clickaway') {
         return;
      }
      setSuccessMessage('');
   };

   const handleCloseErrorToast = (_, reason) => {
      if (reason === 'clickaway') {
         return;
      }
      setLoadError('');
   };

   const toggleCategory = (categoryId) => {
      setExpandedCategories(prev => ({
         ...prev,
         [categoryId]: !prev[categoryId]
      }));
   };

   useEffect(() => {
      const closeMenusOnClick = (event) => {
         if (!(event.target instanceof HTMLElement)) {
            return;
         }

         if (!event.target.closest('[data-category-dropdown-root="true"]')) {
            setOpenMenuId(null);
         }
      };

      document.addEventListener('click', closeMenusOnClick);
      document.addEventListener('touchstart', closeMenusOnClick);

      return () => {
         document.removeEventListener('click', closeMenusOnClick);
         document.removeEventListener('touchstart', closeMenusOnClick);
      };
   }, []);

   const renderCategoryItem = (category) => {
      const CategoryIcon = getIconComponent(category.icon);
      const categoryColor = category.color || DEFAULT_CATEGORY_COLOR;

      return (
         <ListGroup.Item key={category.id} className="category-item">
            <div className="category-item__header">
               <div
                  className={`category-item__content ${category.children?.length > 0 ? 'has-children' : ''}`}
                  onClick={() => category.children?.length > 0 && toggleCategory(category.id)}
                  style={{ cursor: category.children?.length > 0 ? 'pointer' : 'default' }}
               >
                  <div className="category-item__info">
                     {category.children?.length > 0 && (
                        <FaChevronRight
                           className={`category-item__arrow ${expandedCategories[category.id] ? 'expanded' : ''}`}
                           size={14}
                        />
                     )}
                     <div
                        className="category-item__icon"
                        style={{ backgroundColor: categoryColor }}
                     >
                        <CategoryIcon size={16} color="#fff" />
                     </div>
                     <span className="category-item__name">{category.name}</span>
                  </div>
                  <div
                     className="category-item__actions"
                     onClick={(e) => e.stopPropagation()}
                  >
                     <Dropdown
                        show={openMenuId === `parent-${category.id}`}
                        onToggle={(isOpen) => handleDropdownToggle(isOpen ? `parent-${category.id}` : null)}
                        data-category-dropdown-root="true"
                     >
                        <Dropdown.Toggle
                           variant="link"
                           className="p-1"
                           id={`dropdown-${category.id}`}
                           data-category-dropdown-toggle="true"
                        >
                           <FaEllipsisV size={14} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu align="end" show={openMenuId === `parent-${category.id}`}>
                           <Dropdown.Item
                              onClick={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 handleOpenEdit(category.id);
                              }}
                           >
                              <FaEdit size={14} className="me-2" /> Edit
                           </Dropdown.Item>
                           <Dropdown.Item
                              onClick={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 handleAddSubcategory(category.id);
                              }}
                           >
                              <FaPlus size={14} className="me-2" /> Add Subcategory
                           </Dropdown.Item>
                           <Dropdown.Item
                              className="text-danger"
                              onClick={(e) => {
                                 e.preventDefault();
                                 e.stopPropagation();
                                 handleDeleteCategory(category.id);
                              }}
                           >
                              <FaTrash size={14} className="me-2" /> Delete
                           </Dropdown.Item>
                        </Dropdown.Menu>
                     </Dropdown>
                  </div>
               </div>
            </div>
            {category.children?.length > 0 && expandedCategories[category.id] && (
               <ListGroup className="category-children">
                  {category.children.map((child) => {
                     const childData = categories.find(c => c.id === child.id);
                     const ChildIcon = getIconComponent(childData?.icon || child.icon);
                     const childColor = childData?.color || DEFAULT_CATEGORY_COLOR;

                     return (
                        <ListGroup.Item key={child.id} className="category-item category-item--child">
                           <div className="category-item__content">
                              <div className="category-item__info">
                                 <div
                                    className="category-item__icon"
                                    style={{ backgroundColor: childColor }}
                                 >
                                    <ChildIcon size={16} color="#fff" />
                                 </div>
                                 <span className="category-item__name">{child.name}</span>
                              </div>
                              <div
                                 className="category-item__actions"
                                 onClick={(e) => e.stopPropagation()}
                              >
                                 <Dropdown
                                    show={openMenuId === `child-${child.id}`}
                                    onToggle={(isOpen) => handleDropdownToggle(isOpen ? `child-${child.id}` : null)}
                                    data-category-dropdown-root="true"
                                 >
                                    <Dropdown.Toggle
                                       variant="link"
                                       className="p-1"
                                       id={`dropdown-${child.id}`}
                                       data-category-dropdown-toggle="true"
                                    >
                                       <FaEllipsisV size={14} />
                                    </Dropdown.Toggle>
                                    <Dropdown.Menu align="end" show={openMenuId === `child-${child.id}`}>
                                       <Dropdown.Item
                                          onClick={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                             handleOpenEdit(child.id);
                                          }}
                                       >
                                          <FaEdit size={14} className="me-2" /> Edit
                                       </Dropdown.Item>
                                       <Dropdown.Item
                                          className="text-danger"
                                          onClick={(e) => {
                                             e.preventDefault();
                                             e.stopPropagation();
                                             handleDeleteCategory(child.id);
                                          }}
                                       >
                                          <FaTrash size={14} className="me-2" /> Delete
                                       </Dropdown.Item>
                                    </Dropdown.Menu>
                                 </Dropdown>
                              </div>
                           </div>
                        </ListGroup.Item>
                     );
                  })}
               </ListGroup>
            )}
         </ListGroup.Item>
      )
   };

   return (
      <div>
         <div className="d-flex justify-content-between align-items-center mb-4">
            <h2>Categories</h2>
            <Button variant="success" onClick={() => setShowAddModal(true)}>
               <FaPlus className="me-2" size={12} />
               Add Category
            </Button>
         </div>

         <ToastAlert
            open={Boolean(successMessage)}
            onClose={handleCloseSuccessToast}
            severity="success"
            message={successMessage}
            autoHideDuration={4000}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
         />

         <ToastAlert
            open={Boolean(loadError)}
            onClose={handleCloseErrorToast}
            severity="error"
            message={loadError}
            autoHideDuration={6000}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
         />

         <div className="d-flex justify-content-start">
            <Form.Group className="mb-4 search-form">
               <InputGroup>
                  <InputGroup.Text>
                     <FaSearch size={14} />
                  </InputGroup.Text>
                  <Form.Control
                     type="text"
                     placeholder="Search categories..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                     <Button
                        variant="outline-secondary"
                        onClick={() => setSearchTerm('')}
                        title="Clear search"
                     >
                        <FaTimes size={14} />
                     </Button>
                  )}
               </InputGroup>
            </Form.Group>
         </div>

         <Modal show={showAddModal} onHide={handleCloseModal} centered backdrop="static">
            <Modal.Header closeButton>
               <Modal.Title as="h5">Add a new category</Modal.Title>
            </Modal.Header>
            <Modal.Body>
               <Form id="category-form" onSubmit={handleAddCategory}>
                  <Form.Group className="mb-3">
                     <Form.Label>Parent Category</Form.Label>
                     <ChildCategorySelect
                        selectedCategories={newCategory.parentId ? [parentIdToNameMap[newCategory.parentId]] : []}
                        setSelectedCategories={(values) => {
                           const selectedName = values?.[0] ?? null;
                           const resolvedParentId = selectedName ? parentNameToIdMap[selectedName] ?? null : null;

                           if (resolvedParentId) {
                              const parentColor = resolveColorForParent(resolvedParentId);
                              setNewCategory(prev => ({
                                 ...prev,
                                 parentId: resolvedParentId,
                                 color: parentColor,
                              }));
                              setCustomColor(parentColor ?? DEFAULT_CATEGORY_COLOR);
                              setShowColorPicker(false);
                           } else {
                              setNewCategory(prev => ({
                                 ...prev,
                                 parentId: null,
                                 color: customColor || DEFAULT_CATEGORY_COLOR,
                              }));
                           }
                        }}
                        categoryTree={{}}
                        parentCategoryColors={parentCategoryColorsMap}
                        categoryIcons={categoryIcons}
                        allCategories={parentCategoryOptions}
                        entityLabelSingular="parent category"
                        entityLabelPlural="parent categories"
                        clearSelectedLabel="Clear parent"
                        searchPlaceholder="Search parent categories..."
                     />
                  </Form.Group>
                  <div className="d-flex gap-3 flex-wrap categories-modal-row">
                     <div className="mb-3 flex-grow-1 categories-field-group">
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                           type="text"
                           placeholder="Enter category name"
                           value={newCategory.name}
                           onChange={(e) =>
                              setNewCategory(prev => ({
                                 ...prev,
                                 name: e.target.value,
                              }))
                           }
                        />
                     </div>
                     <div className="mb-3 position-relative categories-color-group">
                        <Form.Label>Color</Form.Label>
                        <InputGroup>
                           <InputGroup.Text
                              className={`categories-color-trigger ${newCategory.parentId ? 'disabled' : ''}`}
                              onClick={() => {
                                 if (newCategory.parentId) {
                                    return;
                                 }
                                 setShowColorPicker(prev => !prev);
                              }}
                              aria-label="Toggle color picker"
                              role="button"
                           >
                              <span className="categories-color-swatch" style={{ backgroundColor: newCategoryDisplayColor }} />
                           </InputGroup.Text>
                           <Form.Control
                              type="text"
                              value={newCategory.parentId ? newCategoryDisplayColor ?? DEFAULT_CATEGORY_COLOR : customColor}
                              onChange={(e) => {
                                 if (newCategory.parentId) {
                                    return;
                                 }
                                 const next = e.target.value;
                                 setCustomColor(next);
                                 setNewCategory(prev => ({
                                    ...prev,
                                    color: next,
                                 }));
                              }}
                              onFocus={() => {
                                 if (newCategory.parentId) {
                                    return;
                                 }
                                 setShowColorPicker(true);
                              }}
                              placeholder="#DC3545"
                              readOnly={Boolean(newCategory.parentId)}
                           />
                        </InputGroup>
                        {showColorPicker && !newCategory.parentId && (
                           <div className="categories-color-picker" ref={colorPickerRef}>
                              <ChromePicker
                                 color={newCategory.color}
                                 onChange={(colorResult) => {
                                    setCustomColor(colorResult.hex);
                                    setNewCategory(prev => ({
                                       ...prev,
                                       color: colorResult.hex,
                                    }));
                                 }}
                                 disableAlpha
                              />
                           </div>
                        )}
                     </div>
                  </div>
                  <Form.Group className="mb-3">
                     <Form.Label>Icon</Form.Label>
                     <SingleCategoryDropdown
                        selectedCategories={[newCategory.icon]}
                        setSelectedCategories={(values) =>
                           setNewCategory(prev => ({
                              ...prev,
                              icon: values?.[0] || defaultIconKey,
                           }))
                        }
                        categoryTree={{}}
                        parentCategoryColors={iconColorMap}
                        categoryIcons={iconDropdownIcons}
                        allCategories={availableIconKeys}
                        entityLabelSingular="icon"
                        entityLabelPlural="icons"
                        clearSelectedLabel="Clear icon"
                        searchPlaceholder="Search icons..."
                     />
                  </Form.Group>
                  <Form.Group className="mb-3">
                     <Form.Label>Nature of Spending</Form.Label>
                     <Form.Select
                        value={ALLOWED_NATURES.includes(newCategory.nature) ? newCategory.nature : 'WANT'}
                        onChange={(e) => {
                           const nextValue = e.target.value;
                           if (!ALLOWED_NATURES.includes(nextValue)) {
                              return;
                           }
                           setNewCategory(prev => ({
                              ...prev,
                              nature: nextValue,
                           }));
                        }}
                     >
                        {ALLOWED_NATURES.map((nature) => (
                           <option key={nature} value={nature}>
                              {nature.charAt(0) + nature.slice(1).toLowerCase()}
                           </option>
                        ))}
                     </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                     <Form.Check
                        type="switch"
                        id="category-active-switch"
                        label="Hide this category"
                        checked={!newCategory.isActive}
                        onChange={(e) =>
                           setNewCategory(prev => ({
                              ...prev,
                              isActive: !e.target.checked,
                           }))
                        }
                     />
                  </Form.Group>
                  {formError && (
                     <div className="text-danger small">
                        {formError}
                     </div>
                  )}
               </Form>
            </Modal.Body>
            <Modal.Footer className="categories-modal-footer">
               <Button variant="outline-secondary" className="categories-cancel-btn" onClick={handleCloseModal}>
                  Cancel
               </Button>
               <Button
                  type="submit"
                  form="category-form"
                  className="categories-save-btn"
                  disabled={isSubmitting}
               >
                  {isSubmitting ? 'Saving…' : 'Save'}
               </Button>
            </Modal.Footer>
         </Modal>

         <Modal show={showEditModal} onHide={handleCloseEditModal} centered backdrop="static">
            <Modal.Header closeButton>
               <Modal.Title as="h5">Edit category</Modal.Title>
            </Modal.Header>
            <Modal.Body>
               <Form id="edit-category-form" onSubmit={handleUpdateCategory}>
                  <Form.Group className="mb-3">
                     <Form.Label>Parent Category</Form.Label>
                     <ChildCategorySelect
                        selectedCategories={editCategory.parentId ? [parentIdToNameMap[editCategory.parentId]] : []}
                        setSelectedCategories={(values) => {
                           const selectedName = values?.[0] ?? null;
                           const resolvedParentId = selectedName ? parentNameToIdMap[selectedName] ?? null : null;

                           if (resolvedParentId) {
                              const parentColor = resolveColorForParent(resolvedParentId);
                              setEditCategory(prev => ({
                                 ...prev,
                                 parentId: resolvedParentId,
                                 color: parentColor,
                              }));
                              setEditCustomColor(parentColor ?? DEFAULT_CATEGORY_COLOR);
                              setShowEditColorPicker(false);
                           } else {
                              setEditCategory(prev => ({
                                 ...prev,
                                 parentId: null,
                                 color: editCustomColor || DEFAULT_CATEGORY_COLOR,
                              }));
                           }
                        }}
                        categoryTree={{}}
                        parentCategoryColors={parentCategoryColorsMap}
                        categoryIcons={categoryIcons}
                        allCategories={parentCategoryOptions}
                        entityLabelSingular="parent category"
                        entityLabelPlural="parent categories"
                        clearSelectedLabel="Clear parent"
                        searchPlaceholder="Search parent categories..."
                     />
                  </Form.Group>
                  <div className="d-flex gap-3 flex-wrap categories-modal-row">
                     <div className="mb-3 flex-grow-1 categories-field-group">
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                           type="text"
                           placeholder="Enter category name"
                           value={editCategory.name}
                           onChange={(e) =>
                              setEditCategory(prev => ({
                                 ...prev,
                                 name: e.target.value,
                              }))
                           }
                        />
                     </div>
                     <div className="mb-3 position-relative categories-color-group">
                        <Form.Label>Color</Form.Label>
                        <InputGroup>
                           <InputGroup.Text
                              className={`categories-color-trigger ${editCategory.parentId ? 'disabled' : ''}`}
                              onClick={() => {
                                 if (editCategory.parentId) {
                                    return;
                                 }
                                 setShowEditColorPicker(prev => !prev);
                              }}
                              aria-label="Toggle color picker"
                              role="button"
                           >
                              <span className="categories-color-swatch" style={{ backgroundColor: editCategoryDisplayColor }} />
                           </InputGroup.Text>
                           <Form.Control
                              type="text"
                              value={editCategory.parentId ? editCategoryDisplayColor ?? DEFAULT_CATEGORY_COLOR : editCustomColor}
                              onChange={(e) => {
                                 if (editCategory.parentId) {
                                    return;
                                 }
                                 const next = e.target.value;
                                 setEditCustomColor(next);
                                 setEditCategory(prev => ({
                                    ...prev,
                                    color: next,
                                 }));
                              }}
                              onFocus={() => {
                                 if (editCategory.parentId) {
                                    return;
                                 }
                                 setShowEditColorPicker(true);
                              }}
                              placeholder="#DC3545"
                              readOnly={Boolean(editCategory.parentId)}
                           />
                        </InputGroup>
                        {showEditColorPicker && !editCategory.parentId && (
                           <div className="categories-color-picker" ref={editColorPickerRef}>
                              <ChromePicker
                                 color={editCategory.color}
                                 onChange={(colorResult) => {
                                    setEditCustomColor(colorResult.hex);
                                    setEditCategory(prev => ({
                                       ...prev,
                                       color: colorResult.hex,
                                    }));
                                 }}
                                 disableAlpha
                              />
                           </div>
                        )}
                     </div>
                  </div>
                  <Form.Group className="mb-3">
                     <Form.Label>Icon</Form.Label>
                     <SingleCategoryDropdown
                        selectedCategories={[editCategory.icon]}
                        setSelectedCategories={(values) =>
                           setEditCategory(prev => ({
                              ...prev,
                              icon: values?.[0] || defaultIconKey,
                           }))
                        }
                        categoryTree={{}}
                        parentCategoryColors={editIconColorMap}
                        categoryIcons={iconDropdownIcons}
                        allCategories={availableIconKeys}
                        entityLabelSingular="icon"
                        entityLabelPlural="icons"
                        clearSelectedLabel="Clear icon"
                        searchPlaceholder="Search icons..."
                     />
                  </Form.Group>
                  <Form.Group className="mb-3">
                     <Form.Label>Nature of Spending</Form.Label>
                     <Form.Select
                        value={ALLOWED_NATURES.includes(editCategory.nature) ? editCategory.nature : 'WANT'}
                        onChange={(e) => {
                           const nextValue = e.target.value;
                           if (!ALLOWED_NATURES.includes(nextValue)) {
                              return;
                           }
                           setEditCategory(prev => ({
                              ...prev,
                              nature: nextValue,
                           }));
                        }}
                     >
                        {ALLOWED_NATURES.map((nature) => (
                           <option key={nature} value={nature}>
                              {nature.charAt(0) + nature.slice(1).toLowerCase()}
                           </option>
                        ))}
                     </Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-3">
                     <Form.Check
                        type="switch"
                        id="edit-category-active-switch"
                        label="Hide this category"
                        checked={!editCategory.isActive}
                        onChange={(e) =>
                           setEditCategory(prev => ({
                              ...prev,
                              isActive: !e.target.checked,
                           }))
                        }
                     />
                  </Form.Group>
                  {editError && (
                     <div className="text-danger small">
                        {editError}
                     </div>
                  )}
               </Form>
            </Modal.Body>
            <Modal.Footer className="categories-modal-footer">
               <Button variant="outline-secondary" className="categories-cancel-btn" onClick={handleCloseEditModal}>
                  Cancel
               </Button>
               <Button
                  type="submit"
                  form="edit-category-form"
                  className="categories-save-btn"
                  disabled={isUpdating}
               >
                  {isUpdating ? 'Saving.' : 'Save'}
               </Button>
            </Modal.Footer>
         </Modal>

         <div className="categories-list">
            {isLoadingCategories ? (
               <div className="py-5 text-center text-muted">Loading categories…</div>
            ) : categoriesWithChildren.length === 0 ? (
               <div className="py-5 text-center text-muted">No categories available.</div>
            ) : (
               <ListGroup>
                  {categoriesWithChildren.map((category) => renderCategoryItem(category))}
               </ListGroup>
            )}
         </div>
      </div>
   );
};

export default Categories;
