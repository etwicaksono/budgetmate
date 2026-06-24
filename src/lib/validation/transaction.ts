import { z } from 'zod';

// CUID validation regex (sortable IDs)
const cuidRegex = /^[a-z][a-z0-9]{8,}$/;

// Create transaction schema
export const CreateTransactionSchema = z.object({
  date: z.string().datetime(),
  account_id: z.string().regex(cuidRegex, 'Invalid account ID'),
  category_id: z.string().regex(cuidRegex, 'Invalid category ID'),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  description: z.string().optional(),
  payee: z.string().optional(),
  payment_method: z.string().optional(),
  payment_status: z.string().optional(),
  label_ids: z.array(z.string().regex(cuidRegex, 'Invalid label ID')).optional(),
  is_draft: z.boolean().optional()
});

export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;

// Update transaction schema
export const UpdateTransactionSchema = z.object({
  date: z.string().datetime().optional(),
  account_id: z.string().regex(cuidRegex, 'Invalid account ID').optional(),
  category_id: z.string().regex(cuidRegex, 'Invalid category ID').optional(),
  amount: z.number().positive().optional(),
  type: z.enum(['income', 'expense']).optional(),
  description: z.string().optional(),
  payee: z.string().optional(),
  payment_method: z.string().optional(),
  payment_status: z.string().optional(),
  label_ids: z.array(z.string().regex(cuidRegex, 'Invalid label ID')).optional(),
  is_draft: z.boolean().optional()
});

export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

// Transaction filter schema
export const TransactionFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  account_id: z.string().regex(cuidRegex, 'Invalid account ID').optional(),
  account_ids: z.string().optional(), // comma-separated CUIDs
  category_id: z.string().regex(cuidRegex, 'Invalid category ID').optional(),
  category_ids: z.string().optional(), // comma-separated CUIDs
  type: z.enum(['income', 'expense']).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
  keyword: z.string().trim().min(2, 'Search term must be at least 2 characters').optional(),
  search: z.string().trim().min(2, 'Search term must be at least 2 characters').optional(), // alias for keyword
  label_ids: z.string().optional(), // comma-separated
  sort_by: z.enum(['date', 'amount', 'created_at']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  transfer_option: z.enum(['include', 'only', 'exclude']).optional(),
  debt_option: z.enum(['include', 'only', 'exclude']).optional(),
  draft_option: z.enum(['include', 'only', 'exclude']).optional()
});

export type TransactionFilterInput = z.infer<typeof TransactionFilterSchema>;
