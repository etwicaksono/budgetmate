import { z } from 'zod';
import {
  BaseResourceSchema,
  UuidSchema,
  CategoryNameSchema,
  IconSchema,
  CategoryColorSchema,
} from '../common/fields.schema';

/**
 * Category nature - expense classification
 * NEED: Necessary expenses (rent, utilities)
 * WANT: Discretionary spending (entertainment)
 * MUST: Non-negotiable (debt payments)
 */
export const CategoryNatureSchema = z.enum(['NEED', 'WANT', 'MUST']);

/**
 * Base category fields
 * NOTE: Uses is_active (not isActive)
 */
export const CategoryBaseSchema = z.object({
  name: CategoryNameSchema,
  icon: IconSchema,
  color: CategoryColorSchema.nullable().optional(),
  nature: CategoryNatureSchema.default('NEED'),
  parent_id: UuidSchema.nullable().optional(),
  is_active: z.boolean().default(true), // Note: snake_case
});

/**
 * Category creation request
 */
export const CreateCategoryRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  name: CategoryNameSchema,
  icon: IconSchema,
  color: CategoryColorSchema.nullable().optional(),
  nature: CategoryNatureSchema.optional(),
  parent_id: UuidSchema.nullable().optional(),
  is_active: z.boolean().optional(),
});

/**
 * Category update request
 */
export const UpdateCategoryRequestSchema = CreateCategoryRequestSchema
  .partial()
  .omit({ personal_id: true });

/**
 * Full category schema
 */
export const CategorySchema = BaseResourceSchema.merge(CategoryBaseSchema);

/**
 * Recursive category tree schema for hierarchical display
 * Uses z.lazy() for self-referencing
 */
export const CategoryTreeSchema: z.ZodType<any> = CategorySchema.extend({
  children: z.lazy(() => CategoryTreeSchema.array()),
});

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof UpdateCategoryRequestSchema>;
export type CategoryTree = z.infer<typeof CategoryTreeSchema>;
