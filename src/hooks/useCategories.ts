/**
 * Custom hook for category management
 * Following SRP - separates data fetching logic from UI
 */

import { useState, useEffect, useCallback } from 'react';
import { categoryService, Category } from '@/services/categoryService';
import { useToast } from '@/context/ToastContext';

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: Error | null;
  incomeCategories: Category[];
  expenseCategories: Category[];
  totalCategories: number;
  refreshCategories: () => Promise<void>;
}

export function useCategories(): UseCategoriesResult {
  const { showToast } = useToast();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await categoryService.fetchCategories();
      setCategories(response.data);
    } catch (err) {
      const error = err as Error;
      setError(error);
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);
  
  // Load categories on mount
  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);
  
  // Listen for category events
  useEffect(() => {
    const handleCategoryEvent = () => {
      void fetchCategories();
    };
    
    window.addEventListener('category-created', handleCategoryEvent);
    window.addEventListener('category-updated', handleCategoryEvent);
    window.addEventListener('category-deleted', handleCategoryEvent);
    
    return () => {
      window.removeEventListener('category-created', handleCategoryEvent);
      window.removeEventListener('category-updated', handleCategoryEvent);
      window.removeEventListener('category-deleted', handleCategoryEvent);
    };
  }, [fetchCategories]);
  
  // Filter by type (include 'both' type in both lists)
  const incomeCategories = categories.filter(cat => cat.type === 'income' || cat.type === 'both');
  const expenseCategories = categories.filter(cat => cat.type === 'expense' || cat.type === 'both');
  
  // Refresh categories
  const refreshCategories = useCallback(async () => {
    await fetchCategories();
  }, [fetchCategories]);
  
  return {
    categories,
    loading,
    error,
    incomeCategories,
    expenseCategories,
    totalCategories: categories.length,
    refreshCategories
  };
}
