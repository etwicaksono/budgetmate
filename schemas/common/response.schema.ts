import { z } from 'zod';

/**
 * Generic API response wrapper
 * Matches actual API response format: { success, message, data, meta?, errors? }
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: dataSchema.nullable(),
    meta: z.record(z.any()).nullable().optional(),
    errors: z.any().optional(),
  });

/**
 * Paginated list response with metadata
 * Used by GET endpoints that return lists (accounts, categories, etc.)
 */
export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.array(itemSchema),
    meta: z.object({
      max_personal_id: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
      limit: z.number().int().positive(),
      offset: z.number().int().nonnegative(),
    }),
  });

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
  meta?: Record<string, any> | null;
  errors?: any;
};
