import { z } from 'zod';
import {
  BaseResourceSchema,
  UuidSchema,
  NoteSchema,
} from '../common/fields.schema';

/**
 * Transaction type
 */
export const TransactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);

/**
 * Base transaction fields
 * NOTE: No "tags" field (not supported in DB)
 */
export const TransactionBaseSchema = z.object({
  date: z.coerce.date(),
  account_id: UuidSchema,
  category_id: UuidSchema,
  amount: z.number().refine((val) => val !== 0, 'Amount cannot be zero'),
  type: TransactionTypeSchema,
  note: NoteSchema.optional(),
  transfer_id: UuidSchema.nullable().optional(),
  debt_id: UuidSchema.nullable().optional(),
});

/**
 * Transaction creation request
 */
export const CreateTransactionRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  account_id: UuidSchema,
  category_id: UuidSchema,
  type: TransactionTypeSchema,
  amount: z.number().refine((val) => val !== 0, 'Amount cannot be zero'),
  date: z.coerce.date(),
  note: NoteSchema.optional(),
});

/**
 * Transaction update request
 */
export const UpdateTransactionRequestSchema = CreateTransactionRequestSchema
  .partial()
  .omit({ personal_id: true });

/**
 * Full transaction schema
 */
export const TransactionSchema = BaseResourceSchema.merge(TransactionBaseSchema);

/**
 * Transaction filters for GET requests
 */
export const TransactionFiltersSchema = z.object({
  account_id: UuidSchema.optional(),
  category_id: UuidSchema.optional(),
  type: TransactionTypeSchema.optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
  keyword: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

/**
 * Transaction summary response (from /summary endpoint)
 */
export const TransactionSummarySchema = z.object({
  total_income: z.number(),
  total_expense: z.number(),
  net_balance: z.number(),
  by_category: z.array(
    z.object({
      category_id: UuidSchema,
      category_name: z.string(),
      total: z.number(),
    })
  ),
  by_account: z.array(
    z.object({
      account_id: UuidSchema,
      account_name: z.string(),
      total: z.number(),
    })
  ),
});

export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransactionRequest = z.infer<typeof CreateTransactionRequestSchema>;
export type UpdateTransactionRequest = z.infer<typeof UpdateTransactionRequestSchema>;
export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;
export type TransactionSummary = z.infer<typeof TransactionSummarySchema>;
