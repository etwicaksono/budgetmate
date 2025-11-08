import { describe, it, expect } from '@jest/globals';
import {
  CreateTransactionRequestSchema,
  UpdateTransactionRequestSchema,
  TransactionTypeSchema,
  TransactionFiltersSchema,
} from '../transactions/transaction.schema';

describe('Transaction Schemas', () => {
  describe('CreateTransactionRequestSchema', () => {
    it('should validate valid transaction data', () => {
      const validData = {
        personal_id: 1,
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'EXPENSE' as const,
        amount: 50.99,
        date: new Date('2025-01-01'),
        note: 'Coffee',
      };

      const result = CreateTransactionRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject zero amount', () => {
      const invalidData = {
        personal_id: 1,
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'EXPENSE' as const,
        amount: 0,
        date: new Date(),
      };

      const result = CreateTransactionRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path[0] === 'amount');
        expect(error?.message).toContain('cannot be zero');
      }
    });

    it('should accept negative amounts', () => {
      const validData = {
        personal_id: 1,
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'EXPENSE' as const,
        amount: -50,
        date: new Date(),
      };

      const result = CreateTransactionRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should coerce date strings to Date objects', () => {
      const validData = {
        personal_id: 1,
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'INCOME' as const,
        amount: 100,
        date: '2025-01-01',
      };

      const result = CreateTransactionRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBeInstanceOf(Date);
      }
    });

    it('should accept INCOME type', () => {
      const validData = {
        personal_id: 1,
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'INCOME' as const,
        amount: 1000,
        date: new Date(),
      };

      const result = CreateTransactionRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept EXPENSE type', () => {
      const validData = {
        personal_id: 1,
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'EXPENSE' as const,
        amount: 50,
        date: new Date(),
      };

      const result = CreateTransactionRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const invalidData = {
        personal_id: 1,
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'TRANSFER',
        amount: 50,
        date: new Date(),
      };

      const result = CreateTransactionRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional note', () => {
      const dataWithNote = {
        personal_id: 1,
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'EXPENSE' as const,
        amount: 50,
        date: new Date(),
        note: 'Test note',
      };

      const result = CreateTransactionRequestSchema.safeParse(dataWithNote);
      expect(result.success).toBe(true);
    });

    it('should accept null note', () => {
      const dataWithNullNote = {
        personal_id: 1,
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'EXPENSE' as const,
        amount: 50,
        date: new Date(),
        note: null,
      };

      const result = CreateTransactionRequestSchema.safeParse(dataWithNullNote);
      expect(result.success).toBe(true);
    });
  });

  describe('TransactionFiltersSchema', () => {
    it('should validate empty filters', () => {
      const emptyFilters = {};

      const result = TransactionFiltersSchema.safeParse(emptyFilters);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(100); // Default
        expect(result.data.offset).toBe(0); // Default
      }
    });

    it('should coerce string numbers to numbers', () => {
      const filters = {
        limit: '50',
        offset: '10',
        min_amount: '100',
        max_amount: '500',
      };

      const result = TransactionFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(10);
        expect(result.data.min_amount).toBe(100);
        expect(result.data.max_amount).toBe(500);
      }
    });

    it('should coerce date strings', () => {
      const filters = {
        start_date: '2025-01-01',
        end_date: '2025-12-31',
      };

      const result = TransactionFiltersSchema.safeParse(filters);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.start_date).toBeInstanceOf(Date);
        expect(result.data.end_date).toBeInstanceOf(Date);
      }
    });

    it('should accept all filter fields', () => {
      const completeFilters = {
        account_id: '550e8400-e29b-41d4-a716-446655440000',
        category_id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'EXPENSE' as const,
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        min_amount: 10,
        max_amount: 1000,
        keyword: 'coffee',
        limit: 50,
        offset: 100,
      };

      const result = TransactionFiltersSchema.safeParse(completeFilters);
      expect(result.success).toBe(true);
    });

    it('should reject limit exceeding max (1000)', () => {
      const invalidFilters = {
        limit: 1001,
      };

      const result = TransactionFiltersSchema.safeParse(invalidFilters);
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const invalidFilters = {
        offset: -1,
      };

      const result = TransactionFiltersSchema.safeParse(invalidFilters);
      expect(result.success).toBe(false);
    });
  });

  describe('TransactionTypeSchema', () => {
    it('should accept INCOME', () => {
      const result = TransactionTypeSchema.safeParse('INCOME');
      expect(result.success).toBe(true);
    });

    it('should accept EXPENSE', () => {
      const result = TransactionTypeSchema.safeParse('EXPENSE');
      expect(result.success).toBe(true);
    });

    it('should reject invalid type', () => {
      const result = TransactionTypeSchema.safeParse('TRANSFER');
      expect(result.success).toBe(false);
    });
  });
});
