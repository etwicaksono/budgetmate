import apiService from './api';

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  error?: { message?: string } | null;
  errors?: Record<string, unknown> | null;
  meta?: unknown;
  status?: string;
  [key: string]: unknown;
}

export interface ApiCategoryResponse {
  id?: string;
  personal_id?: number;
  user_id?: string;
  parent_id?: string | null;
  name?: string;
  icon?: string;
  color?: string | null;
  nature?: 'WANT' | 'NEED' | 'MUST' | string | null;
  is_active?: boolean;
  position?: Record<string, unknown> | null;
  created_at?: string;
  created_by?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  is_parent?: boolean;
  [key: string]: unknown;
}

export type CategoryNature = 'WANT' | 'NEED' | 'MUST' | string;

export interface CategoryCreatePayload {
  personal_id: number;
  parent_id?: string | null;
  name: string;
  icon: string;
  color: string;
  nature: CategoryNature;
  is_active?: boolean;
  position?: Record<string, unknown> | null;
}

export interface CategoryUpdatePayload {
  parent_id?: string | null;
  name?: string;
  icon?: string;
  color?: string;
  nature?: CategoryNature;
  is_active?: boolean;
  position?: Record<string, unknown> | null;
}

interface CategoryMutationResult {
  category: ApiCategoryResponse | null;
  message?: string;
  success?: boolean;
  meta?: unknown;
}

const isApiResponse = <T,>(value: unknown): value is ApiResponse<T> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const objectValue = value as Record<string, unknown>;
  return (
    'data' in objectValue ||
    'message' in objectValue ||
    'error' in objectValue ||
    'errors' in objectValue ||
    'success' in objectValue
  );
};

const normalizeParentId = (
  value: string | number | null | undefined
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value);
  return normalized.length > 0 ? normalized : null;
};

const normalizePosition = (
  value: Record<string, unknown> | null | undefined
): Record<string, unknown> | undefined => (value ?? undefined);

const buildCreatePayload = (
  payload: CategoryCreatePayload
): Record<string, unknown> => {
  const { parent_id, position, ...rest } = payload;
  return {
    ...rest,
    parent_id: normalizeParentId(parent_id),
    position: normalizePosition(position),
  };
};

const buildUpdatePayload = (
  payload: CategoryUpdatePayload
): Record<string, unknown> => {
  const { parent_id, position, ...rest } = payload;
  const normalized: Record<string, unknown> = { ...rest };

  if (parent_id !== undefined) {
    normalized.parent_id = normalizeParentId(parent_id);
  }

  if (position !== undefined) {
    normalized.position = normalizePosition(position);
  }

  return normalized;
};

const normalizeIdentifier = (value: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value);
  return normalized.length > 0 ? normalized : undefined;
};

const extractMutationResult = (
  response: ApiResponse<ApiCategoryResponse> | ApiCategoryResponse
): CategoryMutationResult => {
  if (isApiResponse<ApiCategoryResponse>(response)) {
    return {
      category: response.data ?? null,
      message: response.message,
      success: response.success,
      meta: response.meta,
    };
  }

  return {
    category: response ?? null,
  };
};

export interface CategoryQueryParams {
  keyword?: string;
}

export interface CategoryService {
  fetchCategories(params?: CategoryQueryParams): Promise<ApiCategoryResponse[]>;
  createCategory(payload: CategoryCreatePayload): Promise<CategoryMutationResult>;
  updateCategory(
    id: string,
    payload: CategoryUpdatePayload
  ): Promise<CategoryMutationResult>;
  deleteCategory(
    id: string
  ): Promise<{ message?: string; categoryId?: string }>;
}

export const categoryService: CategoryService = {
  async fetchCategories(params = {}) {
    // API service automatically unwraps the response
    // Returns the data directly: Array<ApiCategoryResponse>
    const categories = (await apiService.get('/categories', {
      keyword: params.keyword ?? undefined,
    })) as ApiCategoryResponse[];

    // Update cache for personal_id
    if (typeof localStorage !== 'undefined' && categories.length > 0) {
      const maxPersonalId = Math.max(...categories.map(cat => cat.personal_id ?? 0));
      localStorage.setItem('max_category_personal_id', maxPersonalId.toString());
    }

    return Array.isArray(categories) ? categories : [];
  },

  async createCategory(payload: CategoryCreatePayload) {
    const requestBody = buildCreatePayload(payload);
    
    // API service automatically unwraps the response
    // Returns the data directly: ApiCategoryResponse
    const category = (await apiService.post('/categories', requestBody)) as ApiCategoryResponse;

    // Update cache after successful creation
    if (typeof localStorage !== 'undefined' && category.personal_id) {
      const currentMax = parseInt(localStorage.getItem('max_category_personal_id') || '0');
      if (category.personal_id > currentMax) {
        localStorage.setItem('max_category_personal_id', category.personal_id.toString());
      }
    }

    return {
      category: category ?? null,
      success: true,
    };
  },

  async updateCategory(id: string, payload: CategoryUpdatePayload) {
    const requestBody = buildUpdatePayload(payload);
    
    // API service automatically unwraps the response
    // Returns the data directly: ApiCategoryResponse
    const category = (await apiService.put(
      `/categories/${encodeURIComponent(String(id))}`,
      requestBody
    )) as ApiCategoryResponse;

    return {
      category: category ?? null,
      success: true,
    };
  },

  async deleteCategory(id: string) {
    // API service automatically unwraps the response and throws on error
    await apiService.delete(`/categories/${encodeURIComponent(String(id))}`);

    return {
      message: 'Category deleted successfully',
      categoryId: id,
    };
  },
};

export default categoryService;
