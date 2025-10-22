import apiService from './api';
import tokenCrypto from '../utils/crypto';
import { APP_CONFIG } from '../config';

type FormValue = string | number | boolean | null | undefined;

export interface AuthFormData {
  [key: string]: FormValue;
}
export type JsonPayload = Record<string, unknown>;

export interface LogoutResponseData {
  success?: boolean;
  message?: string;
  [key: string]: unknown;
}

export interface LogoutResponse {
  success?: boolean;
  message?: string;
  data?: LogoutResponseData;
  [key: string]: unknown;
}

type ErrorWithResponse = Error & {
  response?: {
    data?: Record<string, unknown>;
    status?: number;
  };
};

const isErrorWithResponse = (error: unknown): error is ErrorWithResponse => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    'message' in error
  );
};

const extractMessage = (error: unknown, fallback: string): string => {
  if (typeof error === 'string' && error) {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export interface AuthService {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  login(credentials: AuthFormData): Promise<unknown>;
  register(userData: AuthFormData): Promise<unknown>;
  logout(): Promise<LogoutResponse>;
  clearAuthData(): void;
  refreshToken(): Promise<unknown>;
  getCurrentUser(): Promise<unknown>;
  updateProfile(userData: JsonPayload): Promise<unknown>;
  changePassword(passwords: JsonPayload): Promise<unknown>;
  forgotPassword(email: string): Promise<unknown>;
  resetPassword(resetData: JsonPayload): Promise<unknown>;
}

// Authentication service
export const authService: AuthService = {
  // Get decrypted access token
  async getAccessToken() {
    try {
      const encryptedToken = localStorage.getItem(APP_CONFIG.storageKeys.authToken);
      if (encryptedToken) {
        return await tokenCrypto.decryptToken(encryptedToken);
      }
      return null;
    } catch (error) {
      console.error('Failed to decrypt access token:', error);
      return null;
    }
  },

  // Get decrypted refresh token
  async getRefreshToken() {
    try {
      const encryptedRefreshToken = localStorage.getItem(APP_CONFIG.storageKeys.refreshToken);
      if (encryptedRefreshToken) {
        return await tokenCrypto.decryptToken(encryptedRefreshToken);
      }
      return null;
    } catch (error) {
      console.error('Failed to decrypt refresh token:', error);
      return null;
    }
  },

  // Login user
  async login(credentials) {
    return apiService.postForm('/auth/login', credentials);
  },

  // Register user
  async register(userData) {
    return apiService.postForm('/auth/register', userData);
  },

  // Logout user
  async logout() {
    try {
      // Get decrypted refresh token to send in request body
      const refreshToken = await this.getRefreshToken();

      const requestBody = refreshToken
        ? { refresh_token: refreshToken }
        : {};

      const response = await apiService.post('/auth/logout', requestBody);
      // Clear local storage
      this.clearAuthData();
      return response as LogoutResponse;
    } catch (error) {
      // Even if API call fails, clear local storage
      this.clearAuthData();
      console.error('Logout API call failed:', error);
      // Return a fallback response so the calling code doesn't break
      return { success: true, message: 'Logout completed' };
    }
  },

  // Clear all authentication data
  clearAuthData() {
    localStorage.removeItem(APP_CONFIG.storageKeys.authToken);
    localStorage.removeItem(APP_CONFIG.storageKeys.refreshToken);
    localStorage.removeItem(APP_CONFIG.storageKeys.userData);
    tokenCrypto.clearKey();
  },

  // Refresh token
  async refreshToken() {
    try {
      const refreshToken = await this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('Missing refresh token.');
      }
      const response = await apiService.post('/auth/refresh', { refresh_token: refreshToken });
      return response;
    } catch (error) {
      if (isErrorWithResponse(error)) {
        const data = error.response?.data ?? {};
        const messageFromResponse =
          (typeof data?.message === 'string' && data.message) ||
          (typeof (data?.error as { message?: string } | undefined)?.message === 'string'
            ? (data.error as { message?: string }).message
            : undefined);

        const derivedMessage =
          messageFromResponse ??
          (error.message || 'Token refresh failed.');
        throw new Error(derivedMessage);
      }

      throw new Error(extractMessage(error, 'Token refresh failed.'));
    }
  },

  // Get current user profile
  async getCurrentUser() {
    try {
      const response = await apiService.get('/auth/me');
      return response;
    } catch (error) {
      throw new Error(extractMessage(error, 'Failed to fetch user profile.'));
    }
  },

  // Update user profile
  async updateProfile(userData) {
    try {
      const response = await apiService.put('/auth/profile', userData);
      return response;
    } catch (error) {
      throw new Error(extractMessage(error, 'Failed to update profile.'));
    }
  },

  // Change password
  async changePassword(passwords) {
    try {
      const response = await apiService.post('/auth/change-password', passwords);
      return response;
    } catch (error) {
      throw new Error(extractMessage(error, 'Failed to change password.'));
    }
  },

  // forgot password
  async forgotPassword(email) {
    try {
      const response = await apiService.post('/auth/forgot-password', { email });
      return response;
    } catch (error) {
      throw new Error(extractMessage(error, 'Failed to send password reset email.'));
    }
  },

  // Reset password
  async resetPassword(resetData) {
    try {
      const response = await apiService.post('/auth/reset-password', resetData);
      return response;
    } catch (error) {
      throw new Error(extractMessage(error, 'Failed to reset password.'));
    }
  },
};
