import { z } from 'zod';
import { BaseResourceSchema, UuidSchema } from '../common/fields.schema';

/**
 * IMPORTANT: Field name differences
 * - Database: from_account, to_account
 * - API: from_account_id, to_account_id
 * 
 * Transfer automatically creates 2 linked transactions:
 * 1. EXPENSE from source account
 * 2. INCOME to destination account
 */

/**
 * Database schema - internal representation
 */
export const TransferBaseSchema = z.object({
  date: z.coerce.date(),
  from_account: UuidSchema, // DB field name
  to_account: UuidSchema,   // DB field name
  amount: z.number().positive('Amount must be positive'),
  note: z.string(), // Required (defaults to empty string)
});

/**
 * API Request schema - what API accepts
 */
export const CreateTransferRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  from_account_id: UuidSchema, // API field name
  to_account_id: UuidSchema,   // API field name
  amount: z.number().positive('Amount must be greater than 0'),
  date: z.coerce.date(),
  note: z.string().optional(), // API accepts optional, defaults to empty
}).refine(
  (data) => data.from_account_id !== data.to_account_id,
  { 
    message: 'Source and destination accounts must be different',
    path: ['to_account_id']
  }
);

/**
 * Transfer update request
 */
export const UpdateTransferRequestSchema = z.object({
  from_account_id: UuidSchema.optional(),
  to_account_id: UuidSchema.optional(),
  amount: z.number().positive().optional(),
  date: z.coerce.date().optional(),
  note: z.string().optional(),
}).refine(
  (data) => {
    // Only validate if both fields are present
    if (data.from_account_id && data.to_account_id) {
      return data.from_account_id !== data.to_account_id;
    }
    return true;
  },
  { 
    message: 'Source and destination accounts must be different',
    path: ['to_account_id']
  }
);

/**
 * Database schema
 */
export const TransferSchema = BaseResourceSchema.merge(TransferBaseSchema);

/**
 * API Response schema - includes account details
 */
export const TransferResponseSchema = TransferSchema.extend({
  from_account_id: UuidSchema,
  from_account_name: z.string(),
  from_account_icon: z.string(),
  to_account_id: UuidSchema,
  to_account_name: z.string(),
  to_account_icon: z.string(),
  transactions: z.array(
    z.object({
      id: UuidSchema,
      type: z.enum(['INCOME', 'EXPENSE']),
      account_id: UuidSchema,
      amount: z.number(),
    })
  ).optional(),
});

export type Transfer = z.infer<typeof TransferSchema>;
export type CreateTransferRequest = z.infer<typeof CreateTransferRequestSchema>;
export type UpdateTransferRequest = z.infer<typeof UpdateTransferRequestSchema>;
export type TransferResponse = z.infer<typeof TransferResponseSchema>;
