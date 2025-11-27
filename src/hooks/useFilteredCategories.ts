import { useMemo } from 'react';
import type { Category } from '@/services/categoryService';

interface UseFilteredCategoriesProps {
  categories: Category[];
  search?: string;
  filterType?: 'income' | 'expense' | 'both';
  excludeId?: string;
  onlyParents?: boolean;
}

/**
 * Hook to filter and search categories
 * Centralizes category filtering logic
 */
export const useFilteredCategories = ({
  categories,
  search = '',
  filterType,
  excludeId,
  onlyParents = false,
}: UseFilteredCategoriesProps) => {
  // Filter by props
  const availableCategories = useMemo(() => {
    return categories.filter(cat => {
      if (excludeId && cat.id === excludeId) return false;
      if (filterType && cat.type !== filterType && cat.type !== 'both') return false;
      if (onlyParents && cat.parent_id !== null) return false;
      return true;
    });
  }, [categories, excludeId, filterType, onlyParents]);

  // Filter by search term
  const filteredCategories = useMemo(() => {
    if (!search.trim()) return availableCategories;
    const searchTerm = search.toLowerCase();
    return availableCategories.filter(cat =>
      cat.name.toLowerCase().includes(searchTerm)
    );
  }, [availableCategories, search]);

  return {
    availableCategories,
    filteredCategories,
    hasResults: filteredCategories.length > 0,
    totalAvailable: availableCategories.length,
    totalFiltered: filteredCategories.length,
  };
};
