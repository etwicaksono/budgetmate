import { describe, it, expect } from '@jest/globals';
import {
  LoginRequestSchema,
  LoginResponseSchema,
  UserProfileSchema,
} from '../auth/login.schema';
import {
  RegisterRequestSchema,
} from '../auth/register.schema';

describe('Auth Schemas', () => {
  describe('LoginRequestSchema', () => {
    it('should validate valid login data', () => {
      const validData = {
        email_or_username: 'test@example.com',
        password: 'password123',
      };

      const result = LoginRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate with username instead of email', () => {
      const validData = {
        email_or_username: 'testuser',
        password: 'password123',
      };

      const result = LoginRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing email_or_username', () => {
      const invalidData = {
        password: 'password123',
      };

      const result = LoginRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.errors.map(e => e.path.join('.'));
        expect(paths).toContain('email_or_username');
      }
    });

    it('should reject missing password', () => {
      const invalidData = {
        email_or_username: 'test@example.com',
      };

      const result = LoginRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.errors.map(e => e.path.join('.'));
        expect(paths).toContain('password');
      }
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        email_or_username: 'test@example.com',
        password: 'short',
      };

      const result = LoginRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path[0] === 'password');
        expect(error?.message).toContain('at least 8 characters');
      }
    });
  });

  describe('RegisterRequestSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const result = RegisterRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        email: 'not-an-email',
        username: 'testuser',
        password: 'password123',
      };

      const result = RegisterRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path[0] === 'email');
        expect(error?.message).toContain('Invalid email');
      }
    });

    it('should reject username shorter than 3 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'ab',
        password: 'password123',
      };

      const result = RegisterRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path[0] === 'username');
        expect(error?.message).toContain('at least 3 characters');
      }
    });

    it('should reject username longer than 36 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'a'.repeat(37),
        password: 'password123',
      };

      const result = RegisterRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path[0] === 'username');
        expect(error?.message).toContain('at most 36 characters');
      }
    });

    it('should reject username with invalid characters', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'user@name',
        password: 'password123',
      };

      const result = RegisterRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path[0] === 'username');
        expect(error?.message).toContain('letters, numbers, underscores, and hyphens');
      }
    });

    it('should accept username with underscores and hyphens', () => {
      const validData = {
        email: 'test@example.com',
        username: 'test_user-123',
        password: 'password123',
      };

      const result = RegisterRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      const invalidData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'short',
      };

      const result = RegisterRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const error = result.error.errors.find(e => e.path[0] === 'password');
        expect(error?.message).toContain('at least 8 characters');
      }
    });
  });

  describe('UserProfileSchema', () => {
    it('should validate valid user profile', () => {
      const validData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        username: 'testuser',
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-01-02'),
      };

      const result = UserProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidData = {
        id: 'not-a-uuid',
        email: 'test@example.com',
        username: 'testuser',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = UserProfileSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should coerce date strings to Date objects', () => {
      const validData = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        username: 'testuser',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-02T00:00:00Z',
      };

      const result = UserProfileSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.created_at).toBeInstanceOf(Date);
        expect(result.data.updated_at).toBeInstanceOf(Date);
      }
    });
  });

  describe('LoginResponseSchema', () => {
    it('should validate valid login response', () => {
      const validData = {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          username: 'testuser',
          created_at: new Date('2025-01-01'),
          updated_at: new Date('2025-01-02'),
        },
      };

      const result = LoginResponseSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing tokens', () => {
      const invalidData = {
        user: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'test@example.com',
          username: 'testuser',
          created_at: new Date(),
          updated_at: new Date(),
        },
      };

      const result = LoginResponseSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.errors.map(e => e.path.join('.'));
        expect(paths).toContain('access_token');
        expect(paths).toContain('refresh_token');
      }
    });
  });
});
