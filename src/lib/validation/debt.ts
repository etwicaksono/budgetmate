import { z } from 'zod';

export const CreateDebtSchema = z.object({
   date: z.string().datetime({ message: 'Invalid datetime string' }),
   type: z.enum(['lend', 'borrow'], { required_error: 'Debt type is required' }),
   account_id: z.string().min(1, 'Account ID is required'),
   amount: z.number().positive('Amount must be positive'),
   counterparty: z.string().min(1, 'Counterparty is required').max(255, 'Counterparty name is too long'),
   description: z.string().optional(),
   parent_debt_id: z.string().optional()
});

export const UpdateDebtSchema = z.object({
   date: z.string().datetime({ message: 'Invalid datetime string' }).optional(),
   type: z.enum(['lend', 'borrow']).optional(),
   account_id: z.string().min(1).optional(),
   amount: z.number().positive('Amount must be positive').optional(),
   counterparty: z.string().min(1).max(255).optional(),
   description: z.string().optional(),
   status: z.enum(['active', 'settled', 'cancelled']).optional()
});

export const CreateRepaymentSchema = z.object({
   date: z.string().datetime({ message: 'Invalid datetime string' }),
   account_id: z.string().min(1, 'Account ID is required'),
   amount: z.number().positive('Repayment amount must be positive'),
   description: z.string().optional()
});
