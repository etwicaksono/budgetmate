import {
  useCallback,
  useMemo,
  useState,
  type ComponentType,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  FaMoneyBillWave,
  FaShoppingCart,
  FaPiggyBank,
  FaBriefcase,
  FaWallet,
  FaLandmark,
  FaGift,
  FaUtensils,
  FaCar,
  FaTshirt,
  FaGamepad,
  FaLightbulb,
  FaHeartbeat,
  FaPlane,
  FaHome,
  FaSpa,
  FaGraduationCap,
  FaCreditCard,
  FaHospital,
  FaUniversity,
  FaUmbrellaBeach,
} from 'react-icons/fa';
import type { IconType } from 'react-icons';
import * as FaIcons from 'react-icons/fa';
import type { ApiCategoryResponse } from '../../services/categoryService';

const ICON_MAP = {
  FaMoneyBillWave,
  FaShoppingCart,
  FaPiggyBank,
  FaBriefcase,
  FaWallet,
  FaLandmark,
  FaGift,
  FaUtensils,
  FaCar,
  FaTshirt,
  FaGamepad,
  FaLightbulb,
  FaHeartbeat,
  FaPlane,
  FaHome,
  FaSpa,
  FaGraduationCap,
  FaCreditCard,
  FaHospital,
  FaUniversity,
  FaUmbrellaBeach,
} as const;

type StaticIconName = keyof typeof ICON_MAP;
type DynamicIconName = keyof typeof FaIcons;
export type CategoryIconName = StaticIconName | DynamicIconName;
type IconComponentType = ComponentType<{ size?: number; className?: string }>;

export type CategoryTree = Record<string, string[]>;
export type CategoryColorMap = Record<string, string>;
export type CategoryIconMap = Record<string, IconType | IconComponentType>;

let localCategoryCounter = 0;

const getNextLocalCategoryId = (): string => `local-${++localCategoryCounter}`;

const resolveApiCategoryId = (
  id: ApiCategoryResponse['id'] | null | undefined
): string | null => (typeof id === 'string' && id.length > 0 ? id : null);

interface UseCategoryDataResult {
  categories: ApiCategoryResponse[];
  categoryTree: CategoryTree;
  parentCategoryColors: CategoryColorMap;
  categoryIcons: CategoryIconMap;
  allCategories: string[];
  addCategory: (
    name: string,
    parentId?: string | null,
    icon?: CategoryIconName,
    color?: string,
    isParent?: boolean,
    id?: ApiCategoryResponse['id']
  ) => ApiCategoryResponse;
  setCategories: Dispatch<SetStateAction<ApiCategoryResponse[]>>;
}

const resolveIcon = (iconName?: string | null): IconType | IconComponentType | undefined => {
  if (!iconName) {
    return undefined;
  }

  if (iconName in ICON_MAP) {
    return ICON_MAP[iconName as StaticIconName];
  }
  return FaIcons[iconName as DynamicIconName] as IconType | IconComponentType | undefined;
};

const isCategoryWithIdAndName = (
  category: ApiCategoryResponse
): category is ApiCategoryResponse & { id: string; name: string } => {
  return (
    typeof category.id === 'string' &&
    category.id.length > 0 &&
    typeof category.name === 'string' &&
    category.name.length > 0
  );
};

const isParentCategory = (category: ApiCategoryResponse): boolean => {
  if (typeof category.is_parent === 'boolean') {
    return category.is_parent;
  }
  return category.parent_id === null || category.parent_id === undefined;
};

export const useCategoryData = (): UseCategoryDataResult => {
  const [categories, setCategories] = useState<ApiCategoryResponse[]>(() => []);

  const addCategory = useCallback(
    (
      name: string,
      parentId: string | null = null,
      icon: CategoryIconName = 'FaGift',
      color = '#6c757d',
      isParent = false,
      id?: ApiCategoryResponse['id']
    ): ApiCategoryResponse => {
      const providedId = resolveApiCategoryId(id ?? null);
      if (!providedId) {
        throw new Error('Expected category ID from API but received null/undefined.');
      }

      const existingById = categories.find((category) => category.id === providedId);
      if (existingById) {
        return existingById;
      }

      const existing = categories.find((category) => category.name === name);
      if (existing) {
        return existing;
      }

      const newCategory: ApiCategoryResponse = {
        id: providedId,
        parent_id: parentId ?? null,
        name,
        icon,
        color,
        is_parent: isParent,
      };

      setCategories((previous) => [...previous, newCategory]);
      return newCategory;
    },
    [categories]
  );

  const categoryTree = useMemo<CategoryTree>(() => {
    const tree: CategoryTree = {};
    const validCategories = categories.filter(isCategoryWithIdAndName);
    const parents = validCategories.filter(isParentCategory);
    const children = validCategories.filter((category) => !isParentCategory(category));

    parents.forEach((parent) => {
      tree[parent.name] = children
        .filter((child) => child.parent_id === parent.id)
        .map((child) => child.name);
    });

    children
      .filter((child) => child.parent_id == null)
      .forEach((child) => {
        const childName = child.name;
        if (childName && !tree[childName]) {
          tree[childName] = [];
        }
      });

    return tree;
  }, [categories]);

  const parentCategoryColors = useMemo<CategoryColorMap>(() => {
    return categories
      .filter(isCategoryWithIdAndName)
      .filter(isParentCategory)
      .reduce<CategoryColorMap>((accumulator, category) => {
        accumulator[category.name] = category.color ?? '#6c757d';
        return accumulator;
      }, {});
  }, [categories]);

  const categoryIcons = useMemo<CategoryIconMap>(() => {
    return categories.filter(isCategoryWithIdAndName).reduce<CategoryIconMap>((accumulator, category) => {
      const IconComponent = resolveIcon(category.icon);
      if (IconComponent) {
        accumulator[category.name] = IconComponent;
      }
      return accumulator;
    }, {});
  }, [categories]);

  const allCategories = useMemo<string[]>(
    () =>
      categories
        .map((category) => category.name)
        .filter((name): name is string => typeof name === 'string' && name.length > 0),
    [categories]
  );

  return {
    categories,
    categoryTree,
    parentCategoryColors,
    categoryIcons,
    allCategories,
    addCategory,
    setCategories,
  };
};
