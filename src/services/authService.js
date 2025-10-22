import apiService from './api';
import tokenCrypto from '../utils/crypto';
import { APP_CONFIG } from '../config';

// Authentication service
export const authService = {
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
    try {
      const response = await apiService.postForm('/auth/login', credentials);
      return response;
    } catch (error) {
      // Pass through the original error structure for detailed field validation
      throw error;
    }
  },

  // Register user
  async register(userData) {
    try {
      const response = await apiService.postForm('/auth/register', userData);
      return response;
    } catch (error) {
      // Pass through the original error structure for detailed field validation
      throw error;
    }
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
      return response;
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
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error?.message ||
        error.message ||
        'Token refresh failed.';
      throw new Error(message);
    }
  },

  // Get current user profile
  async getCurrentUser() {
    try {
      const response = await apiService.get('/auth/me');
      return response;
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch user profile.');
    }
  },

  // Update user profile
  async updateProfile(userData) {
    try {
      const response = await apiService.put('/auth/profile', userData);
      return response;
    } catch (error) {
      throw new Error(error.message || 'Failed to update profile.');
    }
  },

  // Change password
  async changePassword(passwords) {
    try {
      const response = await apiService.post('/auth/change-password', passwords);
      return response;
    } catch (error) {
      throw new Error(error.message || 'Failed to change password.');
    }
  },

  // forgot password
  async forgotPassword(email) {
    try {
      const response = await apiService.post('/auth/forgot-password', { email });
      return response;
    } catch (error) {
      throw new Error(error.message || 'Failed to send password reset email.');
    }
  },

  // Reset password
  async resetPassword(resetData) {
    try {
      const response = await apiService.post('/auth/reset-password', resetData);
      return response;
    } catch (error) {
      throw new Error(error.message || 'Failed to reset password.');
    }
  },
};
