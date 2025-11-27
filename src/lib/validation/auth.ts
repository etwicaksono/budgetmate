import { z } from 'zod';

// Email validation
const emailSchema = z.string()
  .email('Invalid email address')
  .min(5, 'Email too short')
  .max(255, 'Email too long')
  .toLowerCase()
  .trim();

// Username validation
const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be less than 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
  .trim();

// Password validation - must match server-side requirements
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Password must contain at least one special character');

// Login schema
export const LoginSchema = z.object({
  email_or_username: z.string().min(3, 'Email or username required'),
  password: passwordSchema
});

export type LoginInput = z.infer<typeof LoginSchema>;

// Register schema
export const RegisterSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  full_name: z.string().min(2).max(255).optional()
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

// Refresh token schema
export const RefreshTokenSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token required')
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;

// Forgot password schema
export const ForgotPasswordSchema = z.object({
  email: emailSchema
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

// Reset password schema
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token required'),
  password: passwordSchema
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

// Change password schema
export const ChangePasswordSchema = z.object({
  current_password: passwordSchema,
  new_password: passwordSchema
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// Validate request body
export async function validateAuthInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: true; data: T } | { success: false; errors: Array<{ field?: string; message: string }> }> {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      };
    }
    return { success: false, errors: [{ message: 'Validation failed' }] };
  }
}
