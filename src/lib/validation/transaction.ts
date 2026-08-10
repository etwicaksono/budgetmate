import { z } from 'zod';
import { TransactionType } from '@prisma/client';

// CUID validation regex (sortable IDs)
const cuidRegex = /^[a-z][a-z0-9]{8,}$/;

// Create transaction schema
export const CreateTransactionSchema = z.object({
  date: z.string().datetime(),
  account_id: z.string().regex(cuidRegex, 'Invalid account ID'),
  category_id: z.string().regex(cuidRegex, 'Invalid category ID'),
  amount: z.number().positive(),
  type: z.enum([TransactionType.income, TransactionType.expense]),
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
  type: z.enum([TransactionType.income, TransactionType.expense]).optional(),
  description: z.string().optional(),
  payee: z.string().optional(),
  payment_method: z.string().optional(),
  payment_status: z.string().optional(),
  label_ids: z.array(z.string().regex(cuidRegex, 'Invalid label ID')).optional(),
  is_draft: z.boolean().optional()
});

export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;

// Bulk update transaction schema
// Only the fields present in `data` are applied; empty strings are rejected so that
// "leave unchanged" is always expressed by omitting the key rather than sending "".
export const BulkUpdateTransactionsSchema = z
  .object({
    allMatching: z.boolean().optional().default(false),
    ids: z
      .array(z.string().regex(cuidRegex, 'Invalid transaction ID'))
      .max(1000, 'Cannot update more than 1000 transactions by ID')
      .optional(),
    filters: z.record(z.unknown()).optional(),
    data: z.object({
      description: z.string().trim().min(1, 'Description cannot be empty').optional(),
      payee: z.string().trim().min(1, 'Payee cannot be empty').max(255).optional(),
      payment_method: z.string().trim().min(1, 'Payment method cannot be empty').max(50).optional(),
      payment_status: z.string().trim().min(1, 'Payment status cannot be empty').max(32).optional(),
      category_id: z.string().regex(cuidRegex, 'Invalid category ID').optional(),
      label_ids: z.array(z.string().regex(cuidRegex, 'Invalid label ID')).optional(),
      // 'replace' swaps the whole label set (an empty list clears it); 'append' only adds
      label_mode: z.enum(['replace', 'append']).default('append')
    })
  })
  .superRefine((val, ctx) => {
    if (!val.allMatching && (!val.ids || val.ids.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ids'],
        message: 'Must provide ids or set allMatching to true'
      });
    }

    // `label_mode` is excluded on purpose: it carries a default, so counting it here
    // would make an otherwise empty `data` object look like a real change.
    const { label_mode: _labelMode, ...mutations } = val.data;
    const providedFields = Object.values(mutations).filter(value => value !== undefined);
    if (providedFields.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['data'],
        message: 'At least one field must be provided'
      });
    }
  });

export type BulkUpdateTransactionsInput = z.infer<typeof BulkUpdateTransactionsSchema>;

// Transaction filter schema
export const TransactionFilterSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50),
  account_id: z.string().regex(cuidRegex, 'Invalid account ID').optional(),
  account_ids: z.string().optional(), // comma-separated CUIDs
  category_id: z.string().regex(cuidRegex, 'Invalid category ID').optional(),
  category_ids: z.string().optional(), // comma-separated CUIDs
  type: z.enum([TransactionType.income, TransactionType.expense]).optional(),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
  keyword: z.string().trim().min(2, 'Search term must be at least 2 characters').optional(),
  search: z.string().trim().min(2, 'Search term must be at least 2 characters').optional(), // alias for keyword
  label_ids: z.string().optional(), // comma-separated
  // 'amount' sorts by signed value (largest expense first); 'abs_amount' sorts by
  // magnitude so an expense and an income of the same size rank together
  sort_by: z.enum(['date', 'amount', 'created_at', 'abs_amount']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  transfer_option: z.enum(['include', 'only', 'exclude']).optional(),
  debt_option: z.enum(['include', 'only', 'exclude']).optional(),
  draft_option: z.enum(['include', 'only', 'exclude']).optional()
});

export type TransactionFilterInput = z.infer<typeof TransactionFilterSchema>;
