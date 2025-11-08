import { z } from 'zod';

/**
 * User registration schema
 * Username must be alphanumeric with underscores/hyphens
 */
export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address').max(36),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(36, 'Username must be at most 36 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(255, 'Password must be at most 255 characters'),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
