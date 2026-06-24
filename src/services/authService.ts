import { api } from './api';
import axios from 'axios';
import { APP_CONFIG } from '@/utils/constants';

export interface LoginRequest {
  email_or_username: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: {
      id: string;
      email: string;
      username: string;
      full_name?: string;
      timezone: string;
    };
    access_token: string;
    refresh_token: string;
  };
  message?: string;
}

export interface RefreshResponse {
  success: boolean;
  data: {
    access_token: string;
    refresh_token: string;
  };
}

class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    // Don't use interceptor for login
    const response = await axios.post<AuthResponse>(
      `${APP_CONFIG.api.baseUrl}/auth/login`,
      credentials
    );
    return response.data;
  }
  
  async register(data: RegisterRequest): Promise<AuthResponse> {
    // Don't use interceptor for register
    const response = await axios.post<AuthResponse>(
      `${APP_CONFIG.api.baseUrl}/auth/register`,
      data
    );
    return response.data;
  }
  
  async logout(token?: string): Promise<void> {
    try {
      if (token) {
        await axios.post(
          `${APP_CONFIG.api.baseUrl}/auth/logout`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }
    } catch (error) {
      // Logout anyway even if API call fails
      console.error('Logout API error:', error);
    }
  }
  
  async refreshToken(refreshToken: string): Promise<RefreshResponse> {
    const response = await axios.post<RefreshResponse>(
      `${APP_CONFIG.api.baseUrl}/auth/refresh`,
      { refresh_token: refreshToken }
    );
    return response.data;
  }
  
  async forgotPassword(email: string): Promise<unknown> {
    return api.post('/auth/forgot-password', { email });
  }
  
  async resetPassword(token: string, password: string): Promise<unknown> {
    return api.post('/auth/reset-password', { token, password });
  }
  
  async changePassword(currentPassword: string, newPassword: string): Promise<unknown> {
    return api.post('/auth/change-password', { 
      current_password: currentPassword,
      new_password: newPassword 
    });
  }
}

export const authService = new AuthService();
