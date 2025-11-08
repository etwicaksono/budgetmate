/**
 * TypeScript type definitions for API responses
 * Used to generate accurate OpenAPI schemas
 */

// Base API Response wrapper
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

// ============= Auth Types =============

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: UserProfile;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token: string;
  expired_at: string;
  refreshable_until: string;
}

// ============= Account Types =============

export interface Account {
  id: string;
  user_id: string;
  personal_id: number;
  name: string;
  icon: string;
  active: boolean;
  usability: string;
  account_type: string;
  color: string;
  initial_amount: number;
  balance: number;
  group_id: string | null;
  position: any;
  created_at: string;
  updated_at: string;
}

export interface AccountListMeta extends PaginationMeta {
  max_personal_id: number;
}

export interface SwapOrderResult {
  updated_count: number;
}
