import { z } from 'zod';

// CUID validation regex (sortable IDs)
const cuidRegex = /^[a-z][a-z0-9]{8,}$/;

// Create transfer schema
export const CreateTransferSchema = z.object({
  date: z.string().datetime(),
  from_account_id: z.string().regex(cuidRegex, 'Invalid from account ID'),
  to_account_id: z.string().regex(cuidRegex, 'Invalid to account ID'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().optional()
})
  // Validation: Cannot transfer to same account
  .refine(data => data.from_account_id !== data.to_account_id, {
    message: 'Cannot transfer to the same account',
    path: ['to_account_id']
  });

export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;

// Update transfer schema
export const UpdateTransferSchema = z.object({
  date: z.string().datetime().optional(),
  amount: z.number().positive().optional(),
  description: z.string().optional()
});

export type UpdateTransferInput = z.infer<typeof UpdateTransferSchema>;
