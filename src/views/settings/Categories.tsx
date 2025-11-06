import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { Button, Dropdown, Form, InputGroup, ListGroup, Modal } from 'react-bootstrap';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaChevronRight,
  FaEllipsisV,
  FaGift,
  FaSearch,
  FaTimes,
} from 'react-icons/fa';
import * as FaIcons from 'react-icons/fa';
import type { IconType } from 'react-icons';
import { ChromePicker } from 'react-color';
import type { ColorResult } from 'react-color';
import Swal from 'sweetalert2';
import { ChildCategorySelect } from '../Transactions/ChildCategorySelect';
import { SingleCategoryDropdown } from '../Transactions/SingleCategoryDropdown';
import { useCategoryData } from '../Transactions/useCategoryData';
import {
  categoryService,
  type ApiCategoryResponse,
  type CategoryCreatePayload,
  type CategoryUpdatePayload,
} from '../../services/categoryService';
import ToastAlert from '../../components/ToastAlert';
import { InputClearButton } from '../../components/InputClearButton';
import './Categories.css';

const DEFAULT_ICON_KEY = 'FaGift';
const DEFAULT_CATEGORY_COLOR = '#dc3545';
const ICON_EXCLUSIONS = new Set<string>(['IconContext']);
const ALLOWED_NATURES = ['WANT', 'NEED', 'MUST'] as const;

type NatureValue = (typeof ALLOWED_NATURES)[number];

interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  icon: string;
  color: string;
  nature?: NatureValue;
  is_parent: boolean;
  is_active?: boolean;
  personal_id?: number;
}

interface CategoryChild {
  id: string;
  name: string;
  type: 'parent' | 'child';
  icon?: string;
}

interface CategoryWithChildren extends Category {
  children: CategoryChild[];
}

interface CategoryFormState {
  id: string | null;
  name: string;
  nature: NatureValue;
  parentId: string | null;
  icon: string;
  color: string;
  isActive: boolean;
}

type CategoryMap = Record<string, string>;
type ParentColorMap = Record<string, string>;

type UseCategoryDataReturn = {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  categoryIcons: Record<string, IconType>;
};

type ToastAlertProps = {
  open: boolean;
  onClose: (_: unknown, reason?: string) => void;
  severity: 'success' | 'info' | 'warning' | 'error';
  message: ReactNode;
  autoHideDuration?: number;
  anchorOrigin?: { vertical: 'top' | 'bottom'; horizontal: 'left' | 'center' | 'right' };
  variant?: 'filled' | 'outlined' | 'standard';
  elevation?: number;
};

type IconComponentProps = {
  size?: number;
  className?: string;
  color?: string;
};

const ToastAlertComponent = ToastAlert as unknown as React.ComponentType<ToastAlertProps>;
const ChevronRightIcon = FaChevronRight as React.ComponentType<IconComponentProps>;
const EllipsisIcon = FaEllipsisV as React.ComponentType<IconComponentProps>;
const EditIcon = FaEdit as React.ComponentType<IconComponentProps>;
const PlusIcon = FaPlus as React.ComponentType<IconComponentProps>;
const TrashIcon = FaTrash as React.ComponentType<IconComponentProps>;
const SearchIcon = FaSearch as React.ComponentType<IconComponentProps>;
const TimesIcon = FaTimes as React.ComponentType<IconComponentProps>;

const isNatureValue = (value: string): value is NatureValue =>
  (ALLOWED_NATURES as readonly string[]).includes(value);

const sanitizeNature = (nature: string | null | undefined): NatureValue =>
  nature && isNatureValue(nature) ? nature : 'WANT';

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    const apiError = error as {
      response?: { data?: { message?: string; error?: { message?: string } } };
      message?: string;
    };

    return (
      apiError.response?.data?.message ??
      apiError.response?.data?.error?.message ??
      apiError.message ??
      fallback
    );
  }

  return fallback;
};

const resolveIconKey = (
  availableIconKeys: string[],
  iconKey: string | null | undefined,
  fallback: string = DEFAULT_ICON_KEY,
): string => {
  if (!iconKey) {
    return fallback;
  }

  return availableIconKeys.includes(iconKey) ? iconKey : fallback;
};

const resolveParentColor = (
  parentId: string | null,
  parentIdToNameMap: CategoryMap,
  parentCategoryColorsMap: ParentColorMap,
  fallback: string = DEFAULT_CATEGORY_COLOR,
): string => {
  if (parentId == null) {
    return fallback;
  }

  const parentName = parentIdToNameMap[parentId];
  if (!parentName) {
    return fallback;
  }

  return parentCategoryColorsMap[parentName] ?? fallback;
};

const createEmptyFormState = (
  defaultIconKey: string,
  overrides: Partial<CategoryFormState> = {},
): CategoryFormState => ({
  id: null,
  name: '',
  nature: 'WANT',
  parentId: null,
  icon: defaultIconKey,
  color: DEFAULT_CATEGORY_COLOR,
  isActive: true,
  ...overrides,
});

const mapApiCategory = (
  item: ApiCategoryResponse | null | undefined,
  availableIconKeys: string[],
  defaultIconKey: string,
): Category | null => {
  if (!item?.name || item.id == null) {
    return null;
  }

  const parentId = item.parent_id ?? null;

  return {
    id: item.id,
    parent_id: parentId,
    name: item.name,
    icon: resolveIconKey(availableIconKeys, item.icon, defaultIconKey),
    color: item.color ?? DEFAULT_CATEGORY_COLOR,
    nature: sanitizeNature(item.nature),
    is_parent: parentId == null,
    is_active: item.is_active !== false,
    personal_id: item.personal_id,
  };
};

const useOutsideClick = (
  isActive: boolean,
  ref: RefObject<HTMLElement | null>,
  onOutside: () => void,
): void => {
  useEffect(() => {
    if (!isActive) {
      return;
    }

    const handleClickOutside = (event: Event) => {
      const target = event.target as Node | null;
      if (ref.current && target && !ref.current.contains(target)) {
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

const Categories: React.FC = () => {
  const { categories, setCategories, categoryIcons } =
    useCategoryData() as unknown as UseCategoryDataReturn;
  const [searchTerm, setSearchTerm] = useState<string>('');

  const categoriesWithChildren = useMemo<CategoryWithChildren[]>(() => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (name: string): boolean => name.toLowerCase().includes(searchLower);

    const parentCategories = categories.filter((cat) => cat.is_parent);

    return parentCategories
      .map<CategoryWithChildren>((parent) => ({
        ...parent,
        children: categories
          .filter(
            (cat) =>
              cat.parent_id === parent.id &&
              (matchesSearch(cat.name) || matchesSearch(parent.name)),
          )
          .map<CategoryChild>((child) => ({
            id: child.id,
            name: child.name,
            type: child.is_parent ? 'parent' : 'child',
            icon: child.icon,
          })),
      }))
      .filter((parent) => matchesSearch(parent.name) || parent.children.length > 0);
  }, [categories, searchTerm]);

  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const availableIconKeys = useMemo<string[]>(() => {
    return (Object.keys(FaIcons) as string[]).filter(
      (key) => key.startsWith('Fa') && !ICON_EXCLUSIONS.has(key),
    );
  }, []);

  const defaultIconKey = useMemo<string>(() => {
    return availableIconKeys.find((key) => key === DEFAULT_ICON_KEY) ?? DEFAULT_ICON_KEY;
  }, [availableIconKeys]);

  const [newCategory, setNewCategory] = useState<CategoryFormState>(() =>
    createEmptyFormState(defaultIconKey),
  );
  const [customColor, setCustomColor] = useState<string>(DEFAULT_CATEGORY_COLOR);
  const [isLoadingCategories, setIsLoadingCategories] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editCategory, setEditCategory] = useState<CategoryFormState>(() =>
    createEmptyFormState(defaultIconKey),
  );
  const [editCustomColor, setEditCustomColor] = useState<string>(DEFAULT_CATEGORY_COLOR);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>('');
  const [showEditColorPicker, setShowEditColorPicker] = useState<boolean>(false);
  const editColorPickerRef = useRef<HTMLDivElement | null>(null);
  const hasFetchedCategoriesRef = useRef<boolean>(false);

  const parentCategories = useMemo<Category[]>(() => {
    return categories.filter((category) => category.is_parent);
  }, [categories]);

  const parentIdToNameMap = useMemo<CategoryMap>(() => {
    return parentCategories.reduce<CategoryMap>((accumulator, category) => {
      accumulator[category.id] = category.name;
      return accumulator;
    }, {} as CategoryMap);
  }, [parentCategories]);

  const parentNameToIdMap = useMemo<Record<string, string>>(() => {
    return parentCategories.reduce<Record<string, string>>((accumulator, category) => {
      accumulator[category.name] = category.id;
      return accumulator;
    }, {} as Record<string, string>);
  }, [parentCategories]);

  const parentCategoryColorsMap = useMemo<ParentColorMap>(() => {
    return parentCategories.reduce<ParentColorMap>((accumulator, category) => {
      accumulator[category.name] = category.color;
      return accumulator;
    }, {} as ParentColorMap);
  }, [parentCategories]);

  const parentCategoryOptions = useMemo<string[]>(() => {
    return categories
      .filter((category) => category.parent_id == null)
      .map((category) => category.name)
      .filter((name): name is string => Boolean(name));
  }, [categories]);

  const iconDropdownIcons = useMemo<Record<string, IconType>>(() => {
    return availableIconKeys.reduce<Record<string, IconType>>((accumulator, key) => {
      const iconComponent = (FaIcons as Record<string, IconType | undefined>)[key];
      if (iconComponent) {
        accumulator[key] = iconComponent;
      }
      return accumulator;
    }, {} as Record<string, IconType>);
  }, [availableIconKeys]);

  const iconColorMap = useMemo<Record<string, string>>(() => {
    const selectedParentName =
      newCategory.parentId != null ? parentIdToNameMap[newCategory.parentId] : null;
    const parentColor =
      selectedParentName !== null
        ? parentCategoryColorsMap[selectedParentName] ?? customColor ?? DEFAULT_CATEGORY_COLOR
        : customColor ?? DEFAULT_CATEGORY_COLOR;

    return availableIconKeys.reduce<Record<string, string>>((accumulator, key) => {
      accumulator[key] = parentColor;
      return accumulator;
    }, {} as Record<string, string>);
  }, [
    availableIconKeys,
    customColor,
    newCategory.parentId,
    parentIdToNameMap,
    parentCategoryColorsMap,
  ]);

  const editIconColorMap = useMemo<Record<string, string>>(() => {
    const selectedParentName =
      editCategory.parentId != null ? parentIdToNameMap[editCategory.parentId] : null;
    const parentColor =
      selectedParentName !== null
        ? parentCategoryColorsMap[selectedParentName] ??
          editCustomColor ??
          DEFAULT_CATEGORY_COLOR
        : editCustomColor ?? editCategory.color ?? DEFAULT_CATEGORY_COLOR;

    return availableIconKeys.reduce<Record<string, string>>((accumulator, key) => {
      accumulator[key] = parentColor;
      return accumulator;
    }, {} as Record<string, string>);
  }, [
    availableIconKeys,
    editCategory.color,
    editCategory.parentId,
    editCustomColor,
    parentIdToNameMap,
    parentCategoryColorsMap,
  ]);

  const getIconComponent = useCallback(
    (iconKey: string): IconType => {
      const resolvedKey = resolveIconKey(availableIconKeys, iconKey, DEFAULT_ICON_KEY);
      return (
        iconDropdownIcons[resolvedKey] ??
        (FaIcons as Record<string, IconType | undefined>)[resolvedKey] ??
        FaGift
      );
    },
    [availableIconKeys, iconDropdownIcons],
  );

  const resolveColorForParent = useCallback(
    (parentId: string | null, fallbackColor: string = DEFAULT_CATEGORY_COLOR) =>
      resolveParentColor(parentId, parentIdToNameMap, parentCategoryColorsMap, fallbackColor),
    [parentCategoryColorsMap, parentIdToNameMap],
  );

  const newCategoryDisplayColor = useMemo<string>(
    () => (newCategory.parentId ? resolveColorForParent(newCategory.parentId) : newCategory.color),
    [newCategory.parentId, newCategory.color, resolveColorForParent],
  );

  const editCategoryDisplayColor = useMemo<string>(
    () => (editCategory.parentId ? resolveColorForParent(editCategory.parentId) : editCategory.color),
    [editCategory.parentId, editCategory.color, resolveColorForParent],
  );

  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const colorPickerRef = useRef<HTMLDivElement | null>(null);

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

  const closeNewColorPicker = useCallback(() => setShowColorPicker(false), []);
  const closeEditColorPicker = useCallback(() => setShowEditColorPicker(false), []);

  useOutsideClick(showColorPicker, colorPickerRef, closeNewColorPicker);
  useOutsideClick(showEditColorPicker, editColorPickerRef, closeEditColorPicker);

  useEffect(() => {
    if (hasFetchedCategoriesRef.current) {
      return;
    }
    hasFetchedCategoriesRef.current = true;

    const loadCategories = async (): Promise<void> => {
      setIsLoadingCategories(true);
      try {
        const apiCategories = await categoryService.fetchCategories();

        const mappedCategories = apiCategories
          .map((item) => mapApiCategory(item, availableIconKeys, defaultIconKey))
          .filter((item): item is Category => item !== null);

        setCategories(mappedCategories);
        setLoadError('');
      } catch (error) {
        setCategories([]);
        setLoadError(getErrorMessage(error, 'Failed to load categories.'));
      } finally {
        setIsLoadingCategories(false);
      }
    };

    void loadCategories();
  }, [availableIconKeys, defaultIconKey, setCategories]);

  const handleAddCategory = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const trimmedName = newCategory.name.trim();
    const sanitizedNature = sanitizeNature(newCategory.nature);

    if (!isNatureValue(newCategory.nature)) {
      setFormError('Please choose a valid nature.');
      return;
    }

    if (!trimmedName) {
      setFormError('Category name is required.');
      return;
    }

    const personalId = categories.length + 1;
    const baseColor = resolveColorForParent(newCategory.parentId, newCategory.color);
    const payload: CategoryCreatePayload = {
      personal_id: Number(personalId),
      parent_id: newCategory.parentId ?? null,
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

      const { category: createdCategory, message: successMsg } =
        await categoryService.createCategory(payload);
      const fallbackMessage = 'Category created successfully';

      if (!createdCategory?.id) {
        throw new Error('Invalid category response from server.');
      }

      const resolvedParentId = createdCategory.parent_id ?? newCategory.parentId ?? null;
      const responseNature = sanitizeNature(createdCategory.nature ?? sanitizedNature);
      const resolvedIcon = resolveIconKey(
        availableIconKeys,
        createdCategory.icon ?? newCategory.icon,
        defaultIconKey,
      );
      const resolvedColor =
        createdCategory.color ?? resolveColorForParent(resolvedParentId, baseColor);
      const mappedCategory: Category = {
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

      setCategories((prev) => [...prev, mappedCategory]);

      setShowAddModal(false);
      setSuccessMessage(successMsg ?? fallbackMessage);
      resetNewForm();
    } catch (error) {
      setFormError(getErrorMessage(error, 'Failed to create category.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string | null | undefined): Promise<void> => {
    if (!categoryId) {
      return;
    }

    const targetCategory = categories.find((cat) => cat.id === categoryId);
    if (!targetCategory) {
      return;
    }

    const hasChildren = categories.some((cat) => cat.parent_id === categoryId);
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

      void Swal.fire({
        title: 'Deleting...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });
      loaderVisible = true;

      const { message: successMsg } = await categoryService.deleteCategory(categoryId);
      const resolvedMessage = successMsg ?? 'Category deleted successfully';

      setCategories((prev) =>
        prev.filter((cat) => cat.id !== categoryId && cat.parent_id !== categoryId),
      );

      setOpenMenuId(null);
      setSuccessMessage(resolvedMessage);
      setLoadError('');
    } catch (error) {
      const apiMessage = getErrorMessage(error, 'Failed to delete category.');
      setSuccessMessage('');
      setLoadError(apiMessage);
      if (loaderVisible) {
        Swal.close();
        loaderVisible = false;
      }
      void Swal.fire({
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

  const handleOpenEdit = (categoryId: string): void => {
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) {
      return;
    }

    const iconKey = resolveIconKey(availableIconKeys, cat.icon, defaultIconKey);
    const resolvedNature = sanitizeNature(cat.nature);
    const parentId = cat.parent_id ?? null;
    const resolvedColor = cat.color ?? resolveColorForParent(parentId);

    setEditCategory({
      id: cat.id,
      name: cat.name ?? '',
      nature: resolvedNature,
      parentId,
      icon: iconKey,
      color: resolvedColor,
      isActive: cat.is_active !== false,
    });
    setEditCustomColor(resolvedColor ?? DEFAULT_CATEGORY_COLOR);
    setEditError('');
    setShowEditColorPicker(false);
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const handleCloseEditModal = (): void => {
    setShowEditModal(false);
    resetEditForm();
  };

  const handleUpdateCategory = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (isUpdating) {
      return;
    }

    const { id } = editCategory;
    if (!id) {
      return;
    }

    const existingCategory = categories.find((c) => c.id === id) ?? null;
    const childCategories = categories.filter((c) => c.parent_id === id);
    const previousColor = existingCategory?.color ?? null;

    const trimmedName = editCategory.name.trim();
    const sanitizedNature = sanitizeNature(editCategory.nature);

    if (!isNatureValue(editCategory.nature)) {
      setEditError('Please choose a valid nature.');
      return;
    }

    if (!trimmedName) {
      setEditError('Category name is required.');
      return;
    }

    const baseColor = resolveColorForParent(editCategory.parentId, editCategory.color);
    const payload: CategoryUpdatePayload = {
      parent_id: editCategory.parentId ?? null,
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
      const { category: updated, message: successMsg } = await categoryService.updateCategory(
        id,
        payload
      );
      const fallbackMessage = 'Category updated successfully';

      const resolvedParentId = updated?.parent_id ?? editCategory.parentId ?? null;
      const responseNature = sanitizeNature(updated?.nature ?? sanitizedNature);
      const resolvedIcon = resolveIconKey(
        availableIconKeys,
        updated?.icon ?? editCategory.icon,
        defaultIconKey,
      );
      const resolvedColor =
        updated?.color ?? resolveColorForParent(resolvedParentId, baseColor);
      const isParentCategoryUpdate = resolvedParentId == null;
      const shouldPropagateColor =
        isParentCategoryUpdate &&
        childCategories.length > 0 &&
        resolvedColor !== previousColor;

      const nextCategory: Category = {
        id,
        parent_id: resolvedParentId,
        name: updated?.name ?? trimmedName,
        icon: resolvedIcon,
        color: resolvedColor,
        nature: responseNature,
        is_parent: resolvedParentId == null,
        is_active: updated?.is_active ?? editCategory.isActive,
      };

      setCategories((prev) =>
        prev.map((c) => {
          if (c.id === id) {
            return { ...c, ...nextCategory };
          }
          if (shouldPropagateColor && c.parent_id === id) {
            return { ...c, color: resolvedColor };
          }
          return c;
        }),
      );

      setShowEditModal(false);
      setSuccessMessage(successMsg ?? fallbackMessage);
      resetEditForm();
    } catch (error) {
      setEditError(getErrorMessage(error, 'Failed to update category.'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseModal = (): void => {
    setShowAddModal(false);
    resetNewForm();
  };

  const handleAddSubcategory = (parentId: string): void => {
    const parentColor = resolveColorForParent(parentId);
    setNewCategory(
      createEmptyFormState(defaultIconKey, {
        parentId,
        color: parentColor,
      }),
    );
    setCustomColor(parentColor ?? DEFAULT_CATEGORY_COLOR);
    setShowAddModal(true);
    setFormError('');
    setIsSubmitting(false);
    setShowColorPicker(false);
  };

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => ({}));
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleDropdownToggle = (menuId: string | null): void => {
    setOpenMenuId(menuId);
  };

  const handleCloseSuccessToast = (_: unknown, reason?: string): void => {
    if (reason === 'clickaway') {
      return;
    }
    setSuccessMessage('');
  };

  const handleCloseErrorToast = (_: unknown, reason?: string): void => {
    if (reason === 'clickaway') {
      return;
    }
    setLoadError('');
  };

  const toggleCategory = (categoryId: string): void => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  useEffect(() => {
    const closeMenusOnClick = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (!target.closest('[data-category-dropdown-root="true"]')) {
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

  const renderCategoryItem = (category: CategoryWithChildren): JSX.Element => {
    const CategoryIconComponent = getIconComponent(category.icon) as React.ComponentType<IconComponentProps>;
    const categoryColor = category.color || DEFAULT_CATEGORY_COLOR;
    const hasChildren = category.children.length > 0;

    return (
      <ListGroup.Item key={category.id} className="category-item">
        <div className="category-item__header">
          <div
            className={`category-item__content ${hasChildren ? 'has-children' : ''}`}
            onClick={() => hasChildren && toggleCategory(category.id)}
            style={{ cursor: hasChildren ? 'pointer' : 'default' }}
          >
            <div className="category-item__info">
              {hasChildren && (
                <ChevronRightIcon
                  className={`category-item__arrow ${expandedCategories[category.id] ? 'expanded' : ''}`}
                  size={14}
                />
              )}
              <div className="category-item__icon" style={{ backgroundColor: categoryColor }}>
                <CategoryIconComponent size={16} color="#fff" />
              </div>
              <span className="category-item__name">{category.name}</span>
            </div>
            <div className="category-item__actions" onClick={(e) => e.stopPropagation()}>
              <Dropdown
                show={openMenuId === `parent-${category.id}`}
                onToggle={(isOpen: boolean | null) =>
                  handleDropdownToggle(isOpen ? `parent-${category.id}` : null)
                }
                data-category-dropdown-root="true"
              >
                <Dropdown.Toggle
                  variant="link"
                  className="p-1"
                  id={`dropdown-${category.id}`}
                  data-category-dropdown-toggle="true"
                >
                <EllipsisIcon size={14} />
                </Dropdown.Toggle>
                <Dropdown.Menu align="end" show={openMenuId === `parent-${category.id}`}>
                  <Dropdown.Item
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleOpenEdit(category.id);
                    }}
                  >
                    <EditIcon size={14} className="me-2" /> Edit
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleAddSubcategory(category.id);
                    }}
                  >
                    <PlusIcon size={14} className="me-2" /> Add Subcategory
                  </Dropdown.Item>
                  <Dropdown.Item
                    className="text-danger"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      void handleDeleteCategory(category.id);
                    }}
                  >
                    <TrashIcon size={14} className="me-2" /> Delete
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
          </div>
        </div>
        {hasChildren && expandedCategories[category.id] && (
          <ListGroup className="category-children">
            {category.children.map((child) => {
              const childData = categories.find((c) => c.id === child.id);
              const ChildIconComponent = getIconComponent(
                childData?.icon ?? child.icon ?? DEFAULT_ICON_KEY,
              ) as React.ComponentType<IconComponentProps>;
              const childColor = childData?.color ?? DEFAULT_CATEGORY_COLOR;

              return (
                <ListGroup.Item key={child.id} className="category-item category-item--child">
                  <div className="category-item__content">
                    <div className="category-item__info">
                      <div className="category-item__icon" style={{ backgroundColor: childColor }}>
                        <ChildIconComponent size={16} color="#fff" />
                      </div>
                      <span className="category-item__name">{child.name}</span>
                    </div>
                    <div className="category-item__actions" onClick={(e) => e.stopPropagation()}>
                      <Dropdown
                        show={openMenuId === `child-${child.id}`}
                        onToggle={(isOpen: boolean | null) =>
                          handleDropdownToggle(isOpen ? `child-${child.id}` : null)
                        }
                        data-category-dropdown-root="true"
                      >
                        <Dropdown.Toggle
                          variant="link"
                          className="p-1"
                          id={`dropdown-${child.id}`}
                          data-category-dropdown-toggle="true"
                        >
                        <EllipsisIcon size={14} />
                        </Dropdown.Toggle>
                        <Dropdown.Menu align="end" show={openMenuId === `child-${child.id}`}>
                          <Dropdown.Item
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleOpenEdit(child.id);
                            }}
                          >
                            <EditIcon size={14} className="me-2" /> Edit
                          </Dropdown.Item>
                          <Dropdown.Item
                            className="text-danger"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              void handleDeleteCategory(child.id);
                            }}
                          >
                            <TrashIcon size={14} className="me-2" /> Delete
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
    );
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Categories</h2>
        <Button variant="success" onClick={() => setShowAddModal(true)}>
          <PlusIcon className="me-2" size={12} />
          Add Category
        </Button>
      </div>

      <ToastAlertComponent
        open={Boolean(successMessage)}
        onClose={handleCloseSuccessToast}
        severity="success"
        message={successMessage}
        autoHideDuration={4000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <ToastAlertComponent
        open={Boolean(loadError)}
        onClose={handleCloseErrorToast}
        severity="error"
        message={loadError}
        autoHideDuration={6000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />

      <div className="d-flex justify-content-start">
        <Form.Group className="mb-4 search-form">
          <div className="position-relative w-100">
            <Form.Control
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
              style={{ paddingLeft: '2rem', paddingRight: '2rem' }}
            />
            <span
              className="position-absolute top-50 start-0 translate-middle-y ms-2 text-muted"
              aria-hidden="true"
            >
              <SearchIcon size={14} />
            </span>
            <InputClearButton
              show={!!searchTerm}
              onClick={() => setSearchTerm('')}
              title="Clear search"
              ariaLabel="Clear search"
              rightOffset="0.5rem"
              iconSize={16}
              colorClass="text-muted"
              className="p-0 border-0 bg-transparent z-3"
            />
          </div>
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
                selectedCategories={
                  newCategory.parentId ? [parentIdToNameMap[newCategory.parentId]] : []
                }
                setSelectedCategories={(values?: string[]) => {
                  const selectedName = values?.[0] ?? null;
                  const resolvedParentId = selectedName ? parentNameToIdMap[selectedName] ?? null : null;

                  if (resolvedParentId) {
                    const parentColor = resolveColorForParent(resolvedParentId);
                    setNewCategory((prev) => ({
                      ...prev,
                      parentId: resolvedParentId,
                      color: parentColor,
                    }));
                    setCustomColor(parentColor ?? DEFAULT_CATEGORY_COLOR);
                    setShowColorPicker(false);
                  } else {
                    setNewCategory((prev) => ({
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
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setNewCategory((prev) => ({
                      ...prev,
                      name: event.target.value,
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
                      setShowColorPicker((prev) => !prev);
                    }}
                    aria-label="Toggle color picker"
                    role="button"
                  >
                    <span className="categories-color-swatch" style={{ backgroundColor: newCategoryDisplayColor }} />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    value={
                      newCategory.parentId
                        ? newCategoryDisplayColor ?? DEFAULT_CATEGORY_COLOR
                        : customColor
                    }
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      if (newCategory.parentId) {
                        return;
                      }
                      const next = event.target.value;
                      setCustomColor(next);
                      setNewCategory((prev) => ({
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
                      onChange={(colorResult: ColorResult) => {
                        setCustomColor(colorResult.hex);
                        setNewCategory((prev) => ({
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
                setSelectedCategories={(values?: string[]) =>
                  setNewCategory((prev) => ({
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
                value={isNatureValue(newCategory.nature) ? newCategory.nature : 'WANT'}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  const nextValue = event.target.value;
                  if (!isNatureValue(nextValue)) {
                    return;
                  }
                  setNewCategory((prev) => ({
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
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setNewCategory((prev) => ({
                    ...prev,
                    isActive: !event.target.checked,
                  }))
                }
              />
            </Form.Group>
            {formError && <div className="text-danger small">{formError}</div>}
          </Form>
        </Modal.Body>
        <Modal.Footer className="categories-modal-footer">
          <Button variant="outline-secondary" className="categories-cancel-btn" onClick={handleCloseModal}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" className="categories-save-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Saving.' : 'Save'}
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
                selectedCategories={
                  editCategory.parentId ? [parentIdToNameMap[editCategory.parentId]] : []
                }
                setSelectedCategories={(values?: string[]) => {
                  const selectedName = values?.[0] ?? null;
                  const resolvedParentId = selectedName ? parentNameToIdMap[selectedName] ?? null : null;

                  if (resolvedParentId) {
                    const parentColor = resolveColorForParent(resolvedParentId);
                    setEditCategory((prev) => ({
                      ...prev,
                      parentId: resolvedParentId,
                      color: parentColor,
                    }));
                    setEditCustomColor(parentColor ?? DEFAULT_CATEGORY_COLOR);
                    setShowEditColorPicker(false);
                  } else {
                    setEditCategory((prev) => ({
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
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setEditCategory((prev) => ({
                      ...prev,
                      name: event.target.value,
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
                      setShowEditColorPicker((prev) => !prev);
                    }}
                    aria-label="Toggle color picker"
                    role="button"
                  >
                    <span className="categories-color-swatch" style={{ backgroundColor: editCategoryDisplayColor }} />
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    value={
                      editCategory.parentId
                        ? editCategoryDisplayColor ?? DEFAULT_CATEGORY_COLOR
                        : editCustomColor
                    }
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                      if (editCategory.parentId) {
                        return;
                      }
                      const next = event.target.value;
                      setEditCustomColor(next);
                      setEditCategory((prev) => ({
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
                      onChange={(colorResult: ColorResult) => {
                        setEditCustomColor(colorResult.hex);
                        setEditCategory((prev) => ({
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
                setSelectedCategories={(values?: string[]) =>
                  setEditCategory((prev) => ({
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
                value={isNatureValue(editCategory.nature) ? editCategory.nature : 'WANT'}
                onChange={(event: ChangeEvent<HTMLSelectElement>) => {
                  const nextValue = event.target.value;
                  if (!isNatureValue(nextValue)) {
                    return;
                  }
                  setEditCategory((prev) => ({
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
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setEditCategory((prev) => ({
                    ...prev,
                    isActive: !event.target.checked,
                  }))
                }
              />
            </Form.Group>
            {editError && <div className="text-danger small">{editError}</div>}
          </Form>
        </Modal.Body>
        <Modal.Footer className="categories-modal-footer">
          <Button
            variant="outline-secondary"
            className="categories-cancel-btn"
            onClick={handleCloseEditModal}
          >
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
          <div className="py-5 text-center text-muted">Loading categories.</div>
        ) : categoriesWithChildren.length === 0 ? (
          <div className="py-5 text-center text-muted">No categories available.</div>
        ) : (
          <ListGroup>{categoriesWithChildren.map((category) => renderCategoryItem(category))}</ListGroup>
        )}
      </div>
    </div>
  );
};

export default Categories;

