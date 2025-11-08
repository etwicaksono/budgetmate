import { describe, it, expect } from '@jest/globals';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  validateBody,
  validateQuery,
  validatePathParams,
  handleValidationError,
  ValidationError,
} from '../validation';

describe('Validation Utilities', () => {
  describe('validateBody', () => {
    const TestSchema = z.object({
      name: z.string().min(1),
      age: z.number().int().positive(),
    });

    it('should validate valid request body', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'John', age: 30 }),
      });

      const result = await validateBody(request, TestSchema);
      expect(result).toEqual({ name: 'John', age: 30 });
    });

    it('should throw ValidationError for invalid data', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: '', age: -5 }),
      });

      await expect(validateBody(request, TestSchema)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'John' }), // missing age
      });

      await expect(validateBody(request, TestSchema)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for wrong data types', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        body: JSON.stringify({ name: 'John', age: 'thirty' }), // age should be number
      });

      await expect(validateBody(request, TestSchema)).rejects.toThrow(ValidationError);
    });
  });

  describe('validateQuery', () => {
    const TestSchema = z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().default(10),
      search: z.string().optional(),
    });

    it('should validate query parameters', () => {
      const request = new NextRequest('http://localhost/api/test?page=2&limit=20&search=test');

      const result = validateQuery(request, TestSchema);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
      expect(result.search).toBe('test');
    });

    it('should coerce string numbers to numbers', () => {
      const request = new NextRequest('http://localhost/api/test?page=5&limit=50');

      const result = validateQuery(request, TestSchema);
      expect(typeof result.page).toBe('number');
      expect(typeof result.limit).toBe('number');
      expect(result.page).toBe(5);
      expect(result.limit).toBe(50);
    });

    it('should apply default values', () => {
      const request = new NextRequest('http://localhost/api/test');

      const result = validateQuery(request, TestSchema);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should throw ValidationError for invalid query params', () => {
      const request = new NextRequest('http://localhost/api/test?page=-1');

      expect(() => validateQuery(request, TestSchema)).toThrow(ValidationError);
    });
  });

  describe('validatePathParams', () => {
    const TestSchema = z.object({
      id: z.string().uuid(),
      slug: z.string().min(1),
    });

    it('should validate valid path params', () => {
      const params = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        slug: 'test-slug',
      };

      const result = validatePathParams(params, TestSchema);
      expect(result).toEqual(params);
    });

    it('should throw ValidationError for invalid UUID', () => {
      const params = {
        id: 'not-a-uuid',
        slug: 'test-slug',
      };

      expect(() => validatePathParams(params, TestSchema)).toThrow(ValidationError);
    });

    it('should throw ValidationError for missing required fields', () => {
      const params = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        // missing slug
      };

      expect(() => validatePathParams(params, TestSchema)).toThrow(ValidationError);
    });
  });

  describe('handleValidationError', () => {
    it('should format ValidationError correctly', () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().positive(),
      });

      try {
        schema.parse({ name: 'ab', age: -5 });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationError = new ValidationError(error);
          const response = handleValidationError(validationError);

          expect(response.status).toBe(400);
          
          // Check response body
          response.json().then((data: any) => {
            expect(data.success).toBe(false);
            expect(data.error).toBe('Validation failed');
            expect(Array.isArray(data.details)).toBe(true);
            expect(data.details.length).toBeGreaterThan(0);
            expect(data.details[0]).toHaveProperty('path');
            expect(data.details[0]).toHaveProperty('message');
            expect(data.details[0]).toHaveProperty('code');
          });
        }
      }
    });

    it('should handle unknown errors', () => {
      const unknownError = new Error('Something went wrong');
      const response = handleValidationError(unknownError);

      expect(response.status).toBe(500);
      
      response.json().then((data: any) => {
        expect(data.success).toBe(false);
        expect(data.error).toBe('Internal server error');
      });
    });
  });

  describe('ValidationError class', () => {
    it('should store ZodError', () => {
      const schema = z.object({ name: z.string() });
      
      try {
        schema.parse({ name: 123 });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const validationError = new ValidationError(error);
          
          expect(validationError.name).toBe('ValidationError');
          expect(validationError.message).toBe('Validation failed');
          expect(validationError.errors).toBe(error);
        }
      }
    });
  });
});
