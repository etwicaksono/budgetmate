import { z } from 'zod';
import { DebtStatus, DebtType } from '@prisma/client';

export const CreateDebtSchema = z.object({
   date: z.string().datetime({ message: 'Invalid datetime string' }),
   type: z.nativeEnum(DebtType, { required_error: 'Debt type is required' }),
   account_id: z.string().min(1, 'Account ID is required'),
   amount: z.number().positive('Amount must be positive'),
   counterparty: z.string().min(1, 'Counterparty is required').max(255, 'Counterparty name is too long'),
   description: z.string().optional(),
   parent_debt_id: z.string().optional()
});

// NOTE: `type` is intentionally NOT editable after creation. Changing a debt's
// direction would require re-typing and re-signing every linked ledger
// transaction (and revalidating repayments), so it is excluded from edits.
export const UpdateDebtSchema = z.object({
   date: z.string().datetime({ message: 'Invalid datetime string' }).optional(),
   account_id: z.string().min(1).optional(),
   counterparty: z.string().min(1).max(255).optional(),
   description: z.string().optional(),
   status: z.nativeEnum(DebtStatus).optional()
});

export const CreateRepaymentSchema = z.object({
   date: z.string().datetime({ message: 'Invalid datetime string' }),
   account_id: z.string().min(1, 'Account ID is required'),
   amount: z.number().positive('Repayment amount must be positive'),
   description: z.string().optional()
});
