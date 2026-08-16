import { z } from 'zod';
import { DebtStatus, DebtType } from '@prisma/client';

// CUID validation regex (sortable IDs)
const cuidRegex = /^[a-z][a-z0-9]{8,}$/;

const labelIdsSchema = z
   .array(z.string().regex(cuidRegex, 'Invalid label ID'))
   .max(50, 'Cannot attach more than 50 labels')
   .optional();

export const CreateDebtSchema = z.object({
   date: z.string().datetime({ message: 'Invalid datetime string' }),
   type: z.nativeEnum(DebtType, { required_error: 'Debt type is required' }),
   account_id: z.string().min(1, 'Account ID is required'),
   amount: z.number().positive('Amount must be positive'),
   counterparty: z.string().min(1, 'Counterparty is required').max(255, 'Counterparty name is too long'),
   description: z.string().optional(),
   parent_debt_id: z.string().optional(),
   label_ids: labelIdsSchema
});

// NOTE: `type` is intentionally NOT editable after creation. Changing a debt's
// direction would require re-typing and re-signing every linked ledger
// transaction (and revalidating repayments), so it is excluded from edits.
export const UpdateDebtSchema = z.object({
   date: z.string().datetime({ message: 'Invalid datetime string' }).optional(),
   account_id: z.string().min(1).optional(),
   counterparty: z.string().min(1).max(255).optional(),
   description: z.string().optional(),
   status: z.nativeEnum(DebtStatus).optional(),
   // Omitting the key leaves the labels untouched; an empty array clears them.
   label_ids: labelIdsSchema
});

export const CreateRepaymentSchema = z.object({
   date: z.string().datetime({ message: 'Invalid datetime string' }),
   account_id: z.string().min(1, 'Account ID is required'),
   amount: z.number().positive('Repayment amount must be positive'),
   description: z.string().optional()
});
