import { z } from 'zod';
import {
  BaseResourceSchema,
  UuidSchema,
  DebtNameSchema,
} from '../common/fields.schema';

/**
 * Debt type - IMPORTANT: Use PAYABLE/RECEIVABLE (not LENT/BORROWED)
 * - PAYABLE: Money you owe to someone
 * - RECEIVABLE: Money someone owes to you
 * 
 * Balance is calculated from linked transactions, not stored
 */
export const DebtTypeSchema = z.enum(['PAYABLE', 'RECEIVABLE']);

/**
 * Base debt fields
 */
export const DebtBaseSchema = z.object({
  account_id: UuidSchema,
  name: DebtNameSchema, // Counterparty name (person/company)
  type: DebtTypeSchema,
});

/**
 * Debt creation request
 */
export const CreateDebtRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  account_id: UuidSchema,
  name: z.string().min(1, 'Name cannot be empty').max(64),
  type: DebtTypeSchema,
});

/**
 * Debt update request
 */
export const UpdateDebtRequestSchema = z.object({
  account_id: UuidSchema.optional(),
  name: z.string().min(1, 'Name cannot be empty').max(64).optional(),
  type: DebtTypeSchema.optional(),
});

/**
 * Database schema
 */
export const DebtSchema = BaseResourceSchema.merge(DebtBaseSchema);

/**
 * API Response schema - includes calculated fields
 */
export const DebtResponseSchema = DebtSchema.extend({
  account_name: z.string(),
  account_icon: z.string(),
  balance: z.number(), // Calculated from linked transactions
  transaction_count: z.number().int().nonnegative(),
});

export type Debt = z.infer<typeof DebtSchema>;
export type DebtResponse = z.infer<typeof DebtResponseSchema>;
export type CreateDebtRequest = z.infer<typeof CreateDebtRequestSchema>;
export type UpdateDebtRequest = z.infer<typeof UpdateDebtRequestSchema>;
