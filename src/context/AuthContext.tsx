'use client';

import React, { createContext, useContext, useEffect, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { tokenCrypto } from '@/utils/crypto';
import { APP_CONFIG } from '@/utils/constants';
import { authService } from '@/services/authService';
import { useToast } from './ToastContext';
import { useAuthState } from './AuthStateContext';

interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  timezone: string;
  currency: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  loading: boolean;
  user: User | null;
  login: (response: LoginResponse) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const router = useRouter();
  const { showToast } = useToast();
  const { isAuthenticated, setIsAuthenticated, loading, setLoading } = useAuthState();
  const [user, setUser] = React.useState<User | null>(null);
  
  const clearAuthData = useCallback(() => {
    localStorage.removeItem(APP_CONFIG.storageKeys.authToken);
    localStorage.removeItem(APP_CONFIG.storageKeys.refreshToken);
    localStorage.removeItem(APP_CONFIG.storageKeys.userData);
    tokenCrypto.clearKey();
    setIsAuthenticated(false);
    setUser(null);
  }, [setIsAuthenticated]);
  
  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const encryptedToken = localStorage.getItem(APP_CONFIG.storageKeys.authToken);
        const userData = localStorage.getItem(APP_CONFIG.storageKeys.userData);
        
        if (encryptedToken && userData) {
          const token = await tokenCrypto.decryptToken(encryptedToken);
          
          if (token) {
            setIsAuthenticated(true);
            setUser(JSON.parse(userData));
          } else {
            // Token decryption failed or expired
            clearAuthData();
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [setIsAuthenticated, setLoading, clearAuthData]);
  
  const login = async (response: LoginResponse) => {
    try {
      // Encrypt and store tokens
      const encryptedAccessToken = await tokenCrypto.encryptToken(response.access_token);
      const encryptedRefreshToken = await tokenCrypto.encryptToken(response.refresh_token);
      
      localStorage.setItem(APP_CONFIG.storageKeys.authToken, encryptedAccessToken);
      localStorage.setItem(APP_CONFIG.storageKeys.refreshToken, encryptedRefreshToken);
      localStorage.setItem(APP_CONFIG.storageKeys.userData, JSON.stringify(response.user));
      
      setUser(response.user);
      setIsAuthenticated(true);
      
      showToast('Login successful!', 'success');
      router.push('/');
    } catch (error) {
      console.error('Login error:', error);
      showToast('Login failed. Please try again.', 'error');
      throw error;
    }
  };
  
  const logout = async () => {
    try {
      // Call logout API (optional, as JWT is stateless)
      const encryptedToken = localStorage.getItem(APP_CONFIG.storageKeys.authToken);
      if (encryptedToken) {
        const token = await tokenCrypto.decryptToken(encryptedToken);
        if (token) {
          await authService.logout(token);
        }
      }
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API fails
    } finally {
      clearAuthData();
      showToast('Logged out successfully', 'success');
      router.push('/login');
    }
  };
  
  const refreshToken = async (): Promise<boolean> => {
    try {
      const encryptedRefreshToken = localStorage.getItem(APP_CONFIG.storageKeys.refreshToken);
      if (!encryptedRefreshToken) {
        clearAuthData();
        return false;
      }
      
      const refreshTokenValue = await tokenCrypto.decryptToken(encryptedRefreshToken);
      if (!refreshTokenValue) {
        clearAuthData();
        return false;
      }
      
      const response = await authService.refreshToken(refreshTokenValue);
      
      if (response.success && response.data) {
        // Store new access token (refresh token remains the same)
        const encryptedAccessToken = await tokenCrypto.encryptToken(response.data.access_token);
        localStorage.setItem(APP_CONFIG.storageKeys.authToken, encryptedAccessToken);
        
        return true;
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      clearAuthData();
      
      // Redirect to login if refresh failed
      if (!window.location.pathname.includes('/login')) {
        router.push('/login?session_expired=true');
      }
      
      return false;
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        loading,
        user,
        login,
        logout,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
