import { z } from 'zod';

// CUID validation regex (sortable IDs)
const cuidRegex = /^[a-z][a-z0-9]{8,}$/;

// Create category schema
export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['income', 'expense', 'both']),
  analytic_flag: z.enum(['income', 'expense']).optional(),
  parent_id: z.string().regex(cuidRegex, 'Invalid parent ID').nullable().optional(),
  nature: z.enum(['WANT', 'NEED', 'MUST']).default('WANT'),
  icon: z.string(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  is_active: z.boolean().default(true)
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

// Update category schema
export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.enum(['income', 'expense', 'both']).optional(),
  analytic_flag: z.enum(['income', 'expense']).optional(),
  parent_id: z.string().regex(cuidRegex, 'Invalid parent ID').nullable().optional(),
  nature: z.enum(['WANT', 'NEED', 'MUST']).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

// Category filter schema
export const CategoryFilterSchema = z.object({
  type: z.enum(['income', 'expense', 'both']).optional(),
  parent_id: z.string().regex(cuidRegex, 'Invalid parent ID').nullable().optional(),
  is_system: z.coerce.boolean().optional(),
  is_active: z.coerce.boolean().optional(),
  search: z.string().optional()
});

export type CategoryFilterInput = z.infer<typeof CategoryFilterSchema>;
