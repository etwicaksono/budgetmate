import { z } from 'zod';
import apiService from './api';
import {
  ApiResponseSchema,
  CategorySchema,
  CreateCategoryRequestSchema,
  PaginatedResponseSchema,
  SwapOrderRequestSchema,
  UpdateCategoryRequestSchema,
  type Category,
  type CreateCategoryRequest,
  type SwapOrderRequest,
  type UpdateCategoryRequest,
} from '@/types/schemas';

export type ApiCategoryResponse = Category;
export type CategoryCreatePayload = CreateCategoryRequest & {
  position?: Record<string, unknown> | null;
};
export type CategoryUpdatePayload = UpdateCategoryRequest & {
  position?: Record<string, unknown> | null;
};

interface CategoryMutationResult {
  category: ApiCategoryResponse | null;
  message?: string;
  success?: boolean;
  meta?: unknown;
}

const categoryListSchema = PaginatedResponseSchema(CategorySchema);
const categoryResponseSchema = ApiResponseSchema(CategorySchema);
const emptyResponseSchema = ApiResponseSchema(z.null());
const swapOrderSchema = SwapOrderRequestSchema;

export interface CategoryQueryParams {
  keyword?: string;
}

export interface CategoryService {
  fetchCategories(params?: CategoryQueryParams): Promise<ApiCategoryResponse[]>;
  createCategory(payload: CategoryCreatePayload): Promise<CategoryMutationResult>;
  updateCategory(id: string, payload: CategoryUpdatePayload): Promise<CategoryMutationResult>;
  deleteCategory(id: string): Promise<{ message?: string; categoryId?: string }>;
  swapCategoryOrder(payload: SwapOrderRequest): Promise<void>;
  getNextPersonalId(): number;
}

let nextPersonalId = 1;
const LOCAL_STORAGE_KEY = 'max_category_personal_id';

const querySchema = z.object({
  keyword: z.string().optional(),
});

function normalizeParentId(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function sanitizeCreatePayload(payload: CategoryCreatePayload): CreateCategoryRequest {
  const { position: _position, parent_id, color, ...rest } = payload;
  return CreateCategoryRequestSchema.parse({
    ...rest,
    color: color ?? undefined,
    parent_id: normalizeParentId(parent_id),
  });
}

function sanitizeUpdatePayload(payload: CategoryUpdatePayload): UpdateCategoryRequest {
  const { position: _position, parent_id, color, ...rest } = payload;
  const base: Record<string, unknown> = { ...rest };

  if (color !== undefined) {
    base.color = color ?? null;
  }

  if (parent_id !== undefined) {
    base.parent_id = normalizeParentId(parent_id);
  }

  return UpdateCategoryRequestSchema.parse(base);
}

function updatePersonalIdCache(personalId: number | null | undefined): void {
  if (typeof window === 'undefined' || personalId == null) {
    return;
  }
  const cached = Number(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '0');
  const maxId = Math.max(cached, personalId);
  localStorage.setItem(LOCAL_STORAGE_KEY, maxId.toString());
  nextPersonalId = maxId + 1;
}

function resetPersonalIdCache(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
  nextPersonalId = 1;
}

export const categoryService: CategoryService = {
  async fetchCategories(params = {}) {
    const query = querySchema.parse(params);
    const response = await apiService.get<Category[]>('/categories', query, { returnRaw: true });
    const validated = categoryListSchema.parse(response);

    const maxPersonalId = validated.meta.max_personal_id ?? 0;
    if (validated.data.length === 0) {
      resetPersonalIdCache();
    } else if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEY, maxPersonalId.toString());
    }
    nextPersonalId = Math.max(1, maxPersonalId + 1);

    return validated.data;
  },

  async createCategory(payload) {
    const request = sanitizeCreatePayload(payload);
    const response = await apiService.post<Category>('/categories', request, { returnRaw: true });
    const validated = categoryResponseSchema.parse(response);

    const category = validated.data ?? null;
    updatePersonalIdCache(category?.personal_id);

    return {
      category,
      success: validated.success,
      message: validated.message,
      meta: validated.meta,
    };
  },

  async updateCategory(id, payload) {
    const request = sanitizeUpdatePayload(payload);
    const response = await apiService.put<Category>(
      `/categories/${encodeURIComponent(id)}`,
      request,
      { returnRaw: true }
    );
    const validated = categoryResponseSchema.parse(response);

    const category = validated.data ?? null;
    updatePersonalIdCache(category?.personal_id);

    return {
      category,
      success: validated.success,
      message: validated.message,
      meta: validated.meta,
    };
  },

  async deleteCategory(id) {
    const response = await apiService.delete<null>(
      `/categories/${encodeURIComponent(id)}`,
      { returnRaw: true }
    );
    emptyResponseSchema.parse(response);

    return {
      message: 'Category deleted successfully',
      categoryId: id,
    };
  },

  async swapCategoryOrder(payload) {
    const validatedRequest = swapOrderSchema.parse(payload);
    const response = await apiService.put<null>(
      '/categories/swap-order',
      validatedRequest,
      { returnRaw: true }
    );
    emptyResponseSchema.parse(response);
  },

  getNextPersonalId() {
    return nextPersonalId;
  },
};

export default categoryService;
