import { api } from './api';
import type { CategoryNature, CategoryType } from '@prisma/client';

export interface Category {
  id: string;
  name: string;
  type: CategoryType | 'both';
  analytic_flag: 'income' | 'expense';
  nature: CategoryNature;
  icon: string;
  color: string | null;
  is_system: boolean;
  is_active: boolean;
  parent_id: string | null;
  parent?: { id: string; name: string } | null;
  children?: Array<{ id: string; name: string }>;
  transaction_count?: number;
  children_count?: number;
  created_at: string;
  updated_at?: string;
}

export interface CategoryFilters {
  type?: CategoryType | 'both';
  parent_id?: string | null;
  is_system?: boolean;
  is_active?: boolean;
  search?: string;
}

export interface CreateCategoryPayload {
  name: string;
  type: CategoryType | 'both';
  analytic_flag?: 'income' | 'expense';
  nature?: CategoryNature;
  icon?: string;
  color?: string;
  parent_id?: string | null;
  is_active?: boolean;
}

export interface UpdateCategoryPayload {
  name?: string;
  type?: CategoryType | 'both';
  analytic_flag?: 'income' | 'expense';
  nature?: CategoryNature;
  icon?: string;
  color?: string;
  parent_id?: string | null;
  is_active?: boolean;
}

export interface CategoryResponse {
  data: Category[];
  meta: {
    total: number;
    income_count: number;
    expense_count: number;
  };
}

class CategoryService {
  /**
   * Fetch all categories with optional filters
   */
  async fetchCategories(filters?: CategoryFilters): Promise<CategoryResponse> {
    const params: Record<string, string> = {};

    if (filters?.type) params['type'] = filters.type;
    if (filters?.parent_id !== undefined) params['parent_id'] = filters.parent_id || '';
    if (filters?.is_system !== undefined) params['is_system'] = String(filters.is_system);
    if (filters?.is_active !== undefined) params['is_active'] = String(filters.is_active);
    if (filters?.search) params['search'] = filters.search;

    return api.get<CategoryResponse>('/categories', { params });
  }

  /**
   * Fetch category tree structure
   */
  async fetchCategoryTree(): Promise<Category[]> {
    const response = await api.get<{ data: Category[] }>('/categories/tree');
    return response.data;
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(id: string): Promise<Category> {
    const response = await api.get<{ data: Category }>(`/categories/${id}`);
    return response.data;
  }

  /**
   * Create a new category
   */
  async createCategory(payload: CreateCategoryPayload): Promise<Category> {
    const response = await api.post<{ data: Category }>('/categories', payload);
    return response.data;
  }

  /**
   * Update a category
   */
  async updateCategory(id: string, payload: UpdateCategoryPayload): Promise<Category> {
    const response = await api.put<{ data: Category }>(`/categories/${id}`, payload);
    return response.data;
  }

  /**
   * Delete a category
   */
  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/categories/${id}`);
  }

  /**
   * Reorder categories
   */
  async reorderCategories(categories: Array<{ id: string; order: number }>): Promise<void> {
    await api.put('/categories/reorder', { categories });
  }
}

export const categoryService = new CategoryService();
