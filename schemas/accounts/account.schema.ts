import { z } from 'zod';
import {
  BaseResourceSchema,
  UuidSchema,
  AccountNameSchema,
  IconSchema,
  AccountColorSchema,
} from '../common/fields.schema';

/**
 * Account type - flexible string (not enum)
 * Examples: CASH, BANK, CREDIT_CARD, etc.
 */
export const AccountTypeSchema = z.string().max(32);

/**
 * Account usability status
 * Examples: ACTIVE, ARCHIVED, etc.
 */
export const UsabilitySchema = z.string().max(32);

/**
 * Base account fields (for create/update)
 * NOTE: Uses snake_case field names
 */
export const AccountBaseSchema = z.object({
  name: AccountNameSchema,
  icon: IconSchema,
  active: z.boolean().default(true),
  usability: UsabilitySchema.default('ACTIVE'),
  account_type: AccountTypeSchema, // Not just "type"
  color: AccountColorSchema,
  initial_amount: z.number().default(0),
  group_id: UuidSchema.nullable().optional(),
});

/**
 * Account creation request
 * Requires personal_id for user-specific ordering
 */
export const CreateAccountRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  name: AccountNameSchema,
  icon: IconSchema,
  active: z.boolean().optional(),
  usability: UsabilitySchema.optional(),
  account_type: AccountTypeSchema,
  color: AccountColorSchema,
  initial_amount: z.number().optional(),
  group_id: UuidSchema.nullable().optional(),
});

/**
 * Account update request - all fields optional except personal_id
 */
export const UpdateAccountRequestSchema = CreateAccountRequestSchema
  .partial()
  .omit({ personal_id: true });

/**
 * Full account schema (database model)
 * Includes calculated balance field
 */
export const AccountSchema = BaseResourceSchema.merge(AccountBaseSchema).extend({
  balance: z.number(), // Calculated from transactions
});

/**
 * Swap order request for drag-and-drop reordering
 */
export const SwapOrderRequestSchema = z.object({
  order_map: z.array(
    z.object({
      id: UuidSchema,
      personal_id: z.number().int().positive(),
    })
  ).min(1, 'At least one item required'),
});

export type Account = z.infer<typeof AccountSchema>;
export type CreateAccountRequest = z.infer<typeof CreateAccountRequestSchema>;
export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequestSchema>;
export type SwapOrderRequest = z.infer<typeof SwapOrderRequestSchema>;
