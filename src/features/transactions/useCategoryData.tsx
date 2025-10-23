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

export interface CategoryRecord {
  id: number;
  parent_id: number | null;
  name: string;
  icon: CategoryIconName;
  color: string;
  is_parent: boolean;
}

export type CategoryTree = Record<string, string[]>;
export type CategoryColorMap = Record<string, string>;
export type CategoryIconMap = Record<string, IconType | IconComponentType>;

interface UseCategoryDataResult {
  categories: CategoryRecord[];
  categoryTree: CategoryTree;
  parentCategoryColors: CategoryColorMap;
  categoryIcons: CategoryIconMap;
  allCategories: string[];
  addCategory: (name: string, parentId?: number | null, icon?: CategoryIconName, color?: string, isParent?: boolean) => CategoryRecord;
  setCategories: Dispatch<SetStateAction<CategoryRecord[]>>;
}

const resolveIcon = (iconName: CategoryIconName): IconType | IconComponentType | undefined => {
  if (iconName in ICON_MAP) {
    return ICON_MAP[iconName as StaticIconName];
  }
  return FaIcons[iconName as DynamicIconName] as IconType | IconComponentType | undefined;
};

export const useCategoryData = (): UseCategoryDataResult => {
  const [categories, setCategories] = useState<CategoryRecord[]>(() => []);

  const addCategory = useCallback(
    (
      name: string,
      parentId: number | null = null,
      icon: CategoryIconName = 'FaGift',
      color = '#6c757d',
      isParent = false
    ): CategoryRecord => {
      const existing = categories.find((category) => category.name === name);
      if (existing) {
        return existing;
      }

      const nextId =
        categories.length > 0
          ? Math.max(...categories.map((category) => category.id)) + 1
          : 1;

      const newCategory: CategoryRecord = {
        id: nextId,
        parent_id: parentId,
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
    const parents = categories.filter((category) => category.is_parent);
    const children = categories.filter((category) => !category.is_parent);

    parents.forEach((parent) => {
      tree[parent.name] = children
        .filter((child) => child.parent_id === parent.id)
        .map((child) => child.name);
    });

    children
      .filter((child) => child.parent_id == null)
      .forEach((child) => {
        if (!tree[child.name]) {
          tree[child.name] = [];
        }
      });

    return tree;
  }, [categories]);

  const parentCategoryColors = useMemo<CategoryColorMap>(() => {
    return categories
      .filter((category) => category.is_parent)
      .reduce<CategoryColorMap>((accumulator, category) => {
        accumulator[category.name] = category.color;
        return accumulator;
      }, {});
  }, [categories]);

  const categoryIcons = useMemo<CategoryIconMap>(() => {
    return categories.reduce<CategoryIconMap>((accumulator, category) => {
      const IconComponent = resolveIcon(category.icon);
      if (IconComponent) {
        accumulator[category.name] = IconComponent;
      }
      return accumulator;
    }, {});
  }, [categories]);

  const allCategories = useMemo<string[]>(
    () => categories.map((category) => category.name),
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
