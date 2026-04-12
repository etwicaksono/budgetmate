/**
 * Auth domain type definitions.
 * Extracted from AuthContext.tsx and authService.ts.
 */

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  timezone: string;
  currency: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}
