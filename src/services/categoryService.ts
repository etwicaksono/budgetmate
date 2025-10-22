import apiService from './api';

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: { message?: string };
}

export interface ApiCategoryResponse {
  id?: number;
  parent_id?: number | null;
  name?: string;
  icon?: string;
  color?: string | null;
  nature?: string | null;
  is_active?: boolean;
  is_parent?: boolean;
  personal_id?: number;
}

export interface CategoryCreatePayload {
  personal_id: number;
  parent_id: number | null;
  name: string;
  icon: string;
  nature: string;
  is_active: boolean;
  position: number | null;
  color: string;
}

export interface CategoryUpdatePayload {
  parent_id: number | null;
  name: string;
  icon: string;
  color: string;
  nature: string;
  is_active: boolean;
  position: number | null;
}

interface CategoryMutationResult {
  category: ApiCategoryResponse | null;
  message?: string;
}

const isApiResponse = <T,>(value: unknown): value is ApiResponse<T> =>
  typeof value === 'object' &&
  value !== null &&
  ('data' in (value as Record<string, unknown>) ||
    'message' in (value as Record<string, unknown>) ||
    'error' in (value as Record<string, unknown>));

const extractMutationResult = (
  response: ApiResponse<ApiCategoryResponse> | ApiCategoryResponse
): CategoryMutationResult => {
  if (isApiResponse<ApiCategoryResponse>(response)) {
    return {
      category: response.data ?? null,
      message: response.message,
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
    id: number,
    payload: CategoryUpdatePayload
  ): Promise<CategoryMutationResult>;
  deleteCategory(id: number): Promise<{ message?: string }>;
}

export const categoryService: CategoryService = {
  async fetchCategories(params = {}) {
    const response = (await apiService.get('/categories', {
      keyword: params.keyword,
    })) as ApiResponse<ApiCategoryResponse[]> | ApiCategoryResponse[];

    if (isApiResponse<ApiCategoryResponse[]>(response) && Array.isArray(response.data)) {
      return response.data ?? [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    return [];
  },

  async createCategory(payload) {
    const response = (await apiService.post('/categories', payload)) as
      | ApiResponse<ApiCategoryResponse>
      | ApiCategoryResponse;

    return extractMutationResult(response);
  },

  async updateCategory(id, payload) {
    const response = (await apiService.put(`/categories/${id}`, payload)) as
      | ApiResponse<ApiCategoryResponse>
      | ApiCategoryResponse;

    return extractMutationResult(response);
  },

  async deleteCategory(id) {
    const response = (await apiService.delete(`/categories/${id}`)) as
      | ApiResponse<unknown>
      | { message?: string }
      | undefined;

    if (isApiResponse<unknown>(response)) {
      const dataMessage =
        typeof response.data === 'object' && response.data !== null
          ? (response.data as { message?: string }).message
          : undefined;
      return {
        message: response.message ?? dataMessage,
      };
    }

    if (response && typeof response === 'object' && 'message' in response) {
      return {
        message: (response as { message?: string }).message,
      };
    }

    return {};
  },
};

export default categoryService;
