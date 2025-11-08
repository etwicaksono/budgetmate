import { z } from 'zod';

/**
 * Standard pagination query parameters
 * Used by all list endpoints
 */
export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
  keyword: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
