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

export const UpdateDebtSchema = z.object({
   date: z.string().datetime({ message: 'Invalid datetime string' }).optional(),
   type: z.nativeEnum(DebtType).optional(),
   account_id: z.string().min(1).optional(),
   amount: z.number().positive('Amount must be positive').optional(),
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
