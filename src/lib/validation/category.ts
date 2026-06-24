import { z } from 'zod';
import { CategoryNature, CategoryType } from '@prisma/client';

// CUID validation regex (sortable IDs)
const cuidRegex = /^[a-z][a-z0-9]{8,}$/;

// Create category schema
export const CreateCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.union([z.nativeEnum(CategoryType), z.literal('both')]),
  analytic_flag: z.enum([CategoryType.income, CategoryType.expense]).optional(),
  parent_id: z.string().regex(cuidRegex, 'Invalid parent ID').nullable().optional(),
  nature: z.nativeEnum(CategoryNature).default(CategoryNature.WANT),
  icon: z.string(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  is_active: z.boolean().default(true)
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

// Update category schema
export const UpdateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  type: z.union([z.nativeEnum(CategoryType), z.literal('both')]).optional(),
  analytic_flag: z.enum([CategoryType.income, CategoryType.expense]).optional(),
  parent_id: z.string().regex(cuidRegex, 'Invalid parent ID').nullable().optional(),
  nature: z.nativeEnum(CategoryNature).optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).nullable().optional(),
  is_active: z.boolean().optional()
});

export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;

// Category filter schema
export const CategoryFilterSchema = z.object({
  type: z.union([z.nativeEnum(CategoryType), z.literal('both')]).optional(),
  parent_id: z.string().regex(cuidRegex, 'Invalid parent ID').nullable().optional(),
  is_system: z.coerce.boolean().optional(),
  is_active: z.coerce.boolean().optional(),
  search: z.string().optional()
});

export type CategoryFilterInput = z.infer<typeof CategoryFilterSchema>;
