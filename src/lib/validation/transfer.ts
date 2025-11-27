import { z } from 'zod';

// CUID validation regex (sortable IDs)
const cuidRegex = /^[a-z][a-z0-9]{8,}$/;

// Create transfer schema with enhanced currency validation
export const CreateTransferSchema = z.object({
  date: z.string().datetime(),
  from_account_id: z.string().regex(cuidRegex, 'Invalid from account ID'),
  to_account_id: z.string().regex(cuidRegex, 'Invalid to account ID'),
  amount: z.number().positive('Amount must be positive'),
  to_amount: z.number().positive('Destination amount must be positive').optional(), // For currency conversion
  description: z.string().optional(),
  currency: z.string().min(3).max(3).default('USD'), // ISO 4217 currency code
  to_currency: z.string().min(3).max(3).optional() // ISO 4217 currency code
})
  // Validation 1: Cannot transfer to same account
  .refine(data => data.from_account_id !== data.to_account_id, {
    message: 'Cannot transfer to the same account',
    path: ['to_account_id']
  })
  // Validation 2: Multi-currency transfers require to_amount
  .refine(data => {
    const hasDifferentCurrency = data.to_currency && data.to_currency !== data.currency;
    if (hasDifferentCurrency && !data.to_amount) {
      return false;
    }
    return true;
  }, {
    message: 'Multi-currency transfers require destination amount (to_amount)',
    path: ['to_amount']
  })
  // Validation 3: Same-currency transfers must have matching amounts (if to_amount provided)
  .refine(data => {
    const effectiveToCurrency = data.to_currency || data.currency;
    const isSameCurrency = effectiveToCurrency === data.currency;
    
    if (isSameCurrency && data.to_amount && data.to_amount !== data.amount) {
      return false;
    }
    return true;
  }, {
    message: 'Same-currency transfers must have matching source and destination amounts',
    path: ['to_amount']
  });

export type CreateTransferInput = z.infer<typeof CreateTransferSchema>;

// Update transfer schema
export const UpdateTransferSchema = z.object({
  date: z.string().datetime().optional(),
  amount: z.number().positive().optional(),
  to_amount: z.number().positive().optional(),
  description: z.string().optional()
});

export type UpdateTransferInput = z.infer<typeof UpdateTransferSchema>;
