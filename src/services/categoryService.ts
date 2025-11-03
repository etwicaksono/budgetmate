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
    const response = (await apiService.get('/categories', {
      keyword: params.keyword ?? undefined,
    })) as ApiResponse<ApiCategoryResponse[]> | ApiCategoryResponse[];

    if (isApiResponse<ApiCategoryResponse[]>(response)) {
      const { data } = response;
      return Array.isArray(data) ? data : [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    return [];
  },

  async createCategory(payload: CategoryCreatePayload) {
    const requestBody = buildCreatePayload(payload);
    const response = (await apiService.post('/categories', requestBody)) as
      | ApiResponse<ApiCategoryResponse>
      | ApiCategoryResponse;

    return extractMutationResult(response);
  },

  async updateCategory(id: string, payload: CategoryUpdatePayload) {
    const requestBody = buildUpdatePayload(payload);
    const response = (await apiService.put(
      `/categories/${encodeURIComponent(String(id))}`,
      requestBody
    )) as
      | ApiResponse<ApiCategoryResponse>
      | ApiCategoryResponse;

    return extractMutationResult(response);
  },

  async deleteCategory(id: string) {
    const response = (await apiService.delete(
      `/categories/${encodeURIComponent(String(id))}`
    )) as
      | ApiResponse<unknown>
      | { message?: string; id?: string | number }
      | undefined;

    const resolveResult = (message?: string, identifier?: unknown) => ({
      message,
      categoryId: normalizeIdentifier(identifier),
    });

    if (isApiResponse<unknown>(response)) {
      const dataPayload =
        response.data && typeof response.data === 'object'
          ? (response.data as { id?: string | number; message?: string })
          : undefined;

      const resolvedMessage =
        response.message ??
        dataPayload?.message ??
        (typeof response.data === 'string' ? (response.data as string) : undefined);

      const resolvedId =
        dataPayload?.id ??
        (typeof response.data === 'string' || typeof response.data === 'number'
          ? response.data
          : undefined);

      return resolveResult(resolvedMessage, resolvedId);
    }

    if (response && typeof response === 'object') {
      const plainObject = response as { message?: string; id?: string | number };
      return resolveResult(plainObject.message, plainObject.id);
    }

    return resolveResult();
  },
};

export default categoryService;
