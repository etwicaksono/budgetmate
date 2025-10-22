import { useCallback, useMemo, useState } from 'react';
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
};

export const useCategoryData = () => {
  const [categories, setCategories] = useState(() => []);

  const addCategory = useCallback(
    (name, parentId = null, icon = 'FaGift', color = '#6c757d', isParent = false) => {
      const exists = categories.find((category) => category.name === name);
      if (exists) {
        return exists;
      }

      const nextId = categories.length > 0 ? Math.max(...categories.map((category) => category.id)) + 1 : 1;
      const newCategory = {
        id: nextId,
        parent_id: parentId,
        name,
        icon,
        color,
        is_parent: isParent,
      };

      const updated = [...categories, newCategory];
      setCategories(updated);
      return newCategory;
    },
    [categories]
  );

  const categoryTree = useMemo(() => {
    const tree = {};
    const parents = categories.filter((category) => category.is_parent);
    const children = categories.filter((category) => !category.is_parent);

    parents.forEach((parent) => {
      tree[parent.name] = children
        .filter((child) => child.parent_id === parent.id)
        .map((child) => child.name);
    });

    // Handle orphaned children without a parent entry
    children
      .filter((child) => child.parent_id == null)
      .forEach((child) => {
        if (!tree[child.name]) {
          tree[child.name] = [];
        }
      });

    return tree;
  }, [categories]);

  const parentCategoryColors = useMemo(() => {
    return categories
      .filter((category) => category.is_parent)
      .reduce((accumulator, category) => {
        accumulator[category.name] = category.color;
        return accumulator;
      }, {});
  }, [categories]);

  const categoryIcons = useMemo(() => {
    return categories.reduce((accumulator, category) => {
      const IconComponent = ICON_MAP[category.icon] || FaIcons[category.icon];
      if (IconComponent) {
        accumulator[category.name] = IconComponent;
      }
      return accumulator;
    }, {});
  }, [categories]);

  const allCategories = useMemo(() => categories.map((category) => category.name), [categories]);

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
