import { describe, it, expect } from '@jest/globals';
import {
  CreateAccountRequestSchema,
  UpdateAccountRequestSchema,
  AccountSchema,
  SwapOrderRequestSchema,
} from '../accounts/account.schema';

describe('Account Schemas', () => {
  describe('CreateAccountRequestSchema', () => {
    it('should validate valid account data', () => {
      const validData = {
        personal_id: 1,
        name: 'Test Account',
        icon: 'wallet',
        account_type: 'BANK',
        color: '#FF5733',
        initial_amount: 1000,
      };

      const result = CreateAccountRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should apply default values', () => {
      const minimalData = {
        personal_id: 1,
        name: 'Test',
        icon: 'wallet',
        account_type: 'BANK',
        color: '#FF5733',
      };

      const result = CreateAccountRequestSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.initial_amount).toBe(0); // Default value
      }
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        name: 'Test Account',
        // missing personal_id, icon, account_type, color
      };

      const result = CreateAccountRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.errors.map(e => e.path.join('.'));
        expect(paths).toContain('personal_id');
        expect(paths).toContain('icon');
        expect(paths).toContain('account_type');
        expect(paths).toContain('color');
      }
    });

    it('should reject name exceeding max length (36 chars)', () => {
      const invalidData = {
        personal_id: 1,
        name: 'A'.repeat(37), // Max is 36
        icon: 'wallet',
        account_type: 'BANK',
        color: '#FF5733',
      };

      const result = CreateAccountRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path[0] === 'name');
        expect(error?.message).toContain('36');
      }
    });

    it('should reject empty name', () => {
      const invalidData = {
        personal_id: 1,
        name: '',
        icon: 'wallet',
        account_type: 'BANK',
        color: '#FF5733',
      };

      const result = CreateAccountRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path[0] === 'name');
        expect(error?.message).toContain('cannot be empty');
      }
    });

    it('should accept optional group_id', () => {
      const dataWithGroup = {
        personal_id: 1,
        name: 'Test',
        icon: 'wallet',
        account_type: 'BANK',
        color: '#FF5733',
        group_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = CreateAccountRequestSchema.safeParse(dataWithGroup);
      expect(result.success).toBe(true);
    });

    it('should accept null group_id', () => {
      const dataWithNullGroup = {
        personal_id: 1,
        name: 'Test',
        icon: 'wallet',
        account_type: 'BANK',
        color: '#FF5733',
        group_id: null,
      };

      const result = CreateAccountRequestSchema.safeParse(dataWithNullGroup);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID for group_id', () => {
      const invalidData = {
        personal_id: 1,
        name: 'Test',
        icon: 'wallet',
        account_type: 'BANK',
        color: '#FF5733',
        group_id: 'not-a-uuid',
      };

      const result = CreateAccountRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative personal_id', () => {
      const invalidData = {
        personal_id: -1,
        name: 'Test',
        icon: 'wallet',
        account_type: 'BANK',
        color: '#FF5733',
      };

      const result = CreateAccountRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject zero personal_id', () => {
      const invalidData = {
        personal_id: 0,
        name: 'Test',
        icon: 'wallet',
        account_type: 'BANK',
        color: '#FF5733',
      };

      const result = CreateAccountRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateAccountRequestSchema', () => {
    it('should validate partial updates', () => {
      const partialUpdate = {
        name: 'Updated Name',
        // All other fields optional
      };

      const result = UpdateAccountRequestSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should not require any fields', () => {
      const emptyUpdate = {};

      const result = UpdateAccountRequestSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate multiple field updates', () => {
      const multiUpdate = {
        name: 'New Name',
        color: '#00FF00',
        active: false,
      };

      const result = UpdateAccountRequestSchema.safeParse(multiUpdate);
      expect(result.success).toBe(true);
    });

    it('should reject invalid field values', () => {
      const invalidUpdate = {
        name: 'A'.repeat(37), // Too long
      };

      const result = UpdateAccountRequestSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('SwapOrderRequestSchema', () => {
    it('should validate valid order map', () => {
      const validData = {
        order_map: [
          { id: '550e8400-e29b-41d4-a716-446655440000', personal_id: 1 },
          { id: '550e8400-e29b-41d4-a716-446655440001', personal_id: 2 },
        ],
      };

      const result = SwapOrderRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty order map', () => {
      const invalidData = {
        order_map: [],
      };

      const result = SwapOrderRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path[0] === 'order_map');
        expect(error?.message).toContain('At least one item');
      }
    });

    it('should reject invalid UUID in order map', () => {
      const invalidData = {
        order_map: [
          { id: 'not-a-uuid', personal_id: 1 },
        ],
      };

      const result = SwapOrderRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
