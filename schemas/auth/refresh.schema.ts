import { z } from 'zod';

/**
 * Token refresh request
 */
export const RefreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

/**
 * Token refresh response with new tokens and expiry info
 */
export const RefreshTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expired_at: z.string().datetime(),
  refreshable_until: z.string().datetime(),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
