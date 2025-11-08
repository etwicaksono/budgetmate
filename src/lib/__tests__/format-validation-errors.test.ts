import { describe, it, expect } from '@jest/globals';
import { z } from 'zod';
import {
  formatZodErrors,
  zodErrorsToFieldErrors,
  formatErrorForUser,
} from '../format-validation-errors';

describe('Format Validation Errors', () => {
  describe('formatZodErrors', () => {
    it('should format Zod errors correctly', () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number().positive(),
      });

      try {
        schema.parse({ name: 'ab', age: -5 });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formatted = formatZodErrors(error);

          expect(Array.isArray(formatted)).toBe(true);
          expect(formatted.length).toBe(2);
          
          expect(formatted[0]).toHaveProperty('field');
          expect(formatted[0]).toHaveProperty('message');
          expect(formatted[0]).toHaveProperty('code');
          
          // Check that fields are dot-separated paths
          const fields = formatted.map(f => f.field);
          expect(fields).toContain('name');
          expect(fields).toContain('age');
        }
      }
    });

    it('should handle nested field paths', () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1),
          }),
        }),
      });

      try {
        schema.parse({ user: { profile: { name: '' } } });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const formatted = formatZodErrors(error);

          expect(formatted[0].field).toBe('user.profile.name');
        }
      }
    });
  });

  describe('zodErrorsToFieldErrors', () => {
    it('should convert to field-based error object', () => {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
      });

      try {
        schema.parse({ email: 'invalid', password: 'short' });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors = zodErrorsToFieldErrors(error);

          expect(typeof fieldErrors).toBe('object');
          expect(fieldErrors.email).toBeDefined();
          expect(fieldErrors.password).toBeDefined();
          
          expect(typeof fieldErrors.email).toBe('string');
          expect(typeof fieldErrors.password).toBe('string');
        }
      }
    });

    it('should only store first error per field', () => {
      const schema = z.object({
        name: z.string().min(3).max(10),
      });

      try {
        // This would trigger multiple errors if name is empty
        schema.parse({ name: '' });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors = zodErrorsToFieldErrors(error);

          // Should only have one error message for 'name'
          expect(typeof fieldErrors.name).toBe('string');
          expect(fieldErrors.name.split('\n').length).toBe(1);
        }
      }
    });

    it('should handle nested fields', () => {
      const schema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      });

      try {
        schema.parse({ user: { email: 'invalid' } });
      } catch (error) {
        if (error instanceof z.ZodError) {
          const fieldErrors = zodErrorsToFieldErrors(error);

          expect(fieldErrors['user.email']).toBeDefined();
        }
      }
    });
  });

  describe('formatErrorForUser', () => {
    it('should format ZodError for users', () => {
      const schema = z.object({
        email: z.string().email('Please enter a valid email'),
      });

      try {
        schema.parse({ email: 'invalid' });
      } catch (error) {
        const message = formatErrorForUser(error);

        expect(typeof message).toBe('string');
        expect(message).toContain('valid email');
      }
    });

    it('should format regular Error', () => {
      const error = new Error('Something went wrong');
      const message = formatErrorForUser(error);

      expect(message).toBe('Something went wrong');
    });

    it('should handle unknown errors', () => {
      const error = 'string error';
      const message = formatErrorForUser(error);

      expect(message).toBe('An unexpected error occurred');
    });

    it('should return first error message from ZodError', () => {
      const schema = z.object({
        name: z.string().min(3, 'Name too short'),
        age: z.number().positive('Age must be positive'),
      });

      try {
        schema.parse({ name: 'ab', age: -5 });
      } catch (error) {
        const message = formatErrorForUser(error);

        // Should return first error
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
      }
    });

    it('should fallback to generic message if no specific message', () => {
      const schema = z.object({
        name: z.string(),
      });

      try {
        schema.parse({ name: 123 });
      } catch (error) {
        const message = formatErrorForUser(error);

        expect(message).toBeTruthy();
      }
    });
  });
});
