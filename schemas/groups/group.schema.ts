import { z } from 'zod';
import { BaseResourceSchema, GroupNameSchema } from '../common/fields.schema';

/**
 * Groups - simple containers for organizing accounts
 */

/**
 * Base group fields
 */
export const GroupBaseSchema = z.object({
  name: GroupNameSchema,
});

/**
 * Group creation request
 */
export const CreateGroupRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  name: GroupNameSchema,
});

/**
 * Group update request
 */
export const UpdateGroupRequestSchema = z.object({
  name: GroupNameSchema.optional(),
});

/**
 * Full group schema
 */
export const GroupSchema = BaseResourceSchema.merge(GroupBaseSchema);

export type Group = z.infer<typeof GroupSchema>;
export type CreateGroupRequest = z.infer<typeof CreateGroupRequestSchema>;
export type UpdateGroupRequest = z.infer<typeof UpdateGroupRequestSchema>;
