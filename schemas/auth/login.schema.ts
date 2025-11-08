import { z } from 'zod';
import { UuidSchema, TimestampSchema } from '../common/fields.schema';

/**
 * Login request - supports both email and username
 * Field name: email_or_username (not just "email")
 */
export const LoginRequestSchema = z.object({
  email_or_username: z.string().min(1, 'Email or username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * User profile returned in responses
 */
export const UserProfileSchema = z.object({
  id: UuidSchema,
  email: z.string().email(),
  username: z.string().min(1),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

/**
 * Login response with tokens
 */
export const LoginResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user: UserProfileSchema,
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
