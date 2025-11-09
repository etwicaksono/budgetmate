/* eslint-disable react/prop-types */
import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { authService } from '../services/authService';
import tokenCrypto from '../utils/crypto';
import { APP_CONFIG } from '../config';
// TODO: Replace legacy auth wiring once new auth flow ships.
import { useToast } from './ToastContext';
import { useAuthState } from './AuthStateContext';

export interface LoginResponseData {
  access_token?: string;
  refresh_token?: string;
  message?: string;
  user?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LoginResponse {
  data?: LoginResponseData;
  message?: string;
  success?: boolean;
}

export type LoginResult = string | LoginResponse;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const extractLogoutErrorMessage = (error: unknown): string => {
  if (typeof error === 'string' && error) {
    return error;
  }

  if (error instanceof Error && typeof error.message === 'string' && error.message) {
    return error.message;
  }

  if (isRecord(error)) {
    const response = error.response;
    if (isRecord(response)) {
      const data = response.data;
      if (isRecord(data) && typeof data.message === 'string' && data.message) {
        return data.message;
      }
    }

    const message = error.message;
    if (typeof message === 'string' && message) {
      return message;
    }
  }

  return 'Logout failed. Please try again.';
};

export interface AuthContextValue {
  isAuthenticated: boolean;
  loading: boolean;
  login: (response: LoginResult) => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isAuthenticated, setIsAuthenticated, loading, setLoading } = useAuthState();
  const { showToast } = useToast();

  const AUTH_TOKEN_KEY = useMemo(
    () => (APP_CONFIG?.storageKeys?.authToken ?? 'authToken') as string,
    []
  );
  const REFRESH_TOKEN_KEY = useMemo(
    () => (APP_CONFIG?.storageKeys?.refreshToken ?? 'refreshToken') as string,
    []
  );
  const USER_DATA_KEY = useMemo(
    () => (APP_CONFIG?.storageKeys?.userData ?? 'userData') as string,
    []
  );

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const encryptedToken = localStorage.getItem(AUTH_TOKEN_KEY);
        if (encryptedToken) {
          const decryptedToken = await tokenCrypto.decryptToken(encryptedToken);
          setIsAuthenticated(!!decryptedToken);
        } else {
          setIsAuthenticated(false);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to check authentication:', error);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    void checkAuthentication();
  }, [AUTH_TOKEN_KEY, setIsAuthenticated, setLoading]);

  const storeToken = useCallback(
    async (token: unknown) => {
      if (typeof token === 'string' && token) {
        const encryptedToken = await tokenCrypto.encryptToken(token);
        if (typeof encryptedToken === 'string') {
          localStorage.setItem(AUTH_TOKEN_KEY, encryptedToken);
        }
      }
    },
    [AUTH_TOKEN_KEY]
  );

  const storeRefreshToken = useCallback(
    async (token: unknown) => {
      if (typeof token === 'string' && token) {
        const encryptedToken = await tokenCrypto.encryptToken(token);
        if (typeof encryptedToken === 'string') {
          localStorage.setItem(REFRESH_TOKEN_KEY, encryptedToken);
        }
      }
    },
    [REFRESH_TOKEN_KEY]
  );

  const login = useCallback(
    async (response: LoginResult) => {
      try {
        if (typeof response !== 'string' && response.data?.access_token) {
          await storeToken(response.data.access_token);

          if (response.data.refresh_token) {
            await storeRefreshToken(response.data.refresh_token);
          }

          setIsAuthenticated(true);
          const successMessage =
            (typeof response.data?.message === 'string' && response.data.message) ||
            (typeof response.message === 'string' && response.message) ||
            'Login successful';
          showToast(successMessage, 'success');
        } else {
          await storeToken(response);
          setIsAuthenticated(true);
          const fallbackMessage =
            typeof response === 'string'
              ? 'Login successful'
              : (typeof response.message === 'string' && response.message) || 'Login successful';
          showToast(fallbackMessage, 'success');
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Login encryption failed:', error);
        throw new Error('Failed to store authentication tokens');
      }
    },
    [storeToken, storeRefreshToken, setIsAuthenticated, showToast]
  );

  const logout = useCallback(async () => {
    try {
      const response = await authService.logout();

      let message = 'Logout completed successfully';
      if (response?.success) {
        message = response.message || 'Logout successful';
      } else if (response?.data?.success) {
        message = response.data.message || 'Logout successful';
      } else if (response?.data?.message) {
        message = response.data.message;
      } else if (response?.message) {
        message = response.message;
      }

      showToast(message, 'success');
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout error:', error);
      const errorMessage = extractLogoutErrorMessage(error);
      showToast(errorMessage, 'error');
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
      tokenCrypto.clearKey();
      setIsAuthenticated(false);
    }
  }, [AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_DATA_KEY, setIsAuthenticated, showToast]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      loading,
      login,
      logout,
    }),
    [isAuthenticated, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
