import { describe, it, expect } from '@jest/globals';
import {
  CreateCategoryRequestSchema,
  UpdateCategoryRequestSchema,
  CategorySchema,
  CategoryNatureSchema,
} from '../categories/category.schema';

describe('Category Schemas', () => {
  describe('CreateCategoryRequestSchema', () => {
    it('should validate valid category data', () => {
      const validData = {
        personal_id: 1,
        name: 'Food',
        icon: 'restaurant',
        color: '#FF5733',
        nature: 'NEED' as const,
      };

      const result = CreateCategoryRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should apply default nature as NEED', () => {
      const minimalData = {
        personal_id: 1,
        name: 'Food',
        icon: 'restaurant',
      };

      const result = CreateCategoryRequestSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nature).toBe('NEED');
      }
    });

    it('should apply default is_active as true', () => {
      const minimalData = {
        personal_id: 1,
        name: 'Food',
        icon: 'restaurant',
      };

      const result = CreateCategoryRequestSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_active).toBe(true);
      }
    });

    it('should accept valid nature values', () => {
      const natures: Array<'NEED' | 'WANT' | 'MUST'> = ['NEED', 'WANT', 'MUST'];

      natures.forEach(nature => {
        const data = {
          personal_id: 1,
          name: 'Test',
          icon: 'icon',
          nature,
        };

        const result = CreateCategoryRequestSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid nature value', () => {
      const invalidData = {
        personal_id: 1,
        name: 'Test',
        icon: 'icon',
        nature: 'INVALID',
      };

      const result = CreateCategoryRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept parent_id as UUID', () => {
      const dataWithParent = {
        personal_id: 1,
        name: 'Groceries',
        icon: 'cart',
        parent_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = CreateCategoryRequestSchema.safeParse(dataWithParent);
      expect(result.success).toBe(true);
    });

    it('should accept null parent_id', () => {
      const dataWithoutParent = {
        personal_id: 1,
        name: 'Food',
        icon: 'restaurant',
        parent_id: null,
      };

      const result = CreateCategoryRequestSchema.safeParse(dataWithoutParent);
      expect(result.success).toBe(true);
    });

    it('should reject name exceeding max length (36 chars)', () => {
      const invalidData = {
        personal_id: 1,
        name: 'A'.repeat(37),
        icon: 'icon',
      };

      const result = CreateCategoryRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const invalidData = {
        personal_id: 1,
        name: '',
        icon: 'icon',
      };

      const result = CreateCategoryRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject color exceeding max length (36 chars)', () => {
      const invalidData = {
        personal_id: 1,
        name: 'Test',
        icon: 'icon',
        color: 'A'.repeat(37),
      };

      const result = CreateCategoryRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateCategoryRequestSchema', () => {
    it('should validate partial updates', () => {
      const partialUpdate = {
        name: 'Updated Name',
      };

      const result = UpdateCategoryRequestSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty update object', () => {
      const emptyUpdate = {};

      const result = UpdateCategoryRequestSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });

    it('should validate nature change', () => {
      const updateNature = {
        nature: 'WANT' as const,
      };

      const result = UpdateCategoryRequestSchema.safeParse(updateNature);
      expect(result.success).toBe(true);
    });

    it('should reject invalid nature', () => {
      const invalidUpdate = {
        nature: 'INVALID',
      };

      const result = UpdateCategoryRequestSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('CategoryNatureSchema', () => {
    it('should accept NEED', () => {
      const result = CategoryNatureSchema.safeParse('NEED');
      expect(result.success).toBe(true);
    });

    it('should accept WANT', () => {
      const result = CategoryNatureSchema.safeParse('WANT');
      expect(result.success).toBe(true);
    });

    it('should accept MUST', () => {
      const result = CategoryNatureSchema.safeParse('MUST');
      expect(result.success).toBe(true);
    });

    it('should reject invalid values', () => {
      const result = CategoryNatureSchema.safeParse('OTHER');
      expect(result.success).toBe(false);
    });
  });
});
