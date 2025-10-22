/* eslint-disable react/prop-types */
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { authService } from '../services/authService';
import tokenCrypto from '../utils/crypto';
import { APP_CONFIG } from '../config';
import ToastAlert from '../components/ToastAlert';

interface ToastState {
  open: boolean;
  message: string;
  severity: 'success' | 'error';
}

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastState, setToastState] = useState<ToastState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const AUTH_TOKEN_KEY = (APP_CONFIG?.storageKeys?.authToken ?? 'authToken') as string;
  const REFRESH_TOKEN_KEY = (APP_CONFIG?.storageKeys?.refreshToken ?? 'refreshToken') as string;
  const USER_DATA_KEY = (APP_CONFIG?.storageKeys?.userData ?? 'userData') as string;

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
  }, []);

  const storeToken = async (token: unknown) => {
    if (typeof token === 'string' && token) {
      const encryptedToken = await tokenCrypto.encryptToken(token);
      if (typeof encryptedToken === 'string') {
        localStorage.setItem(AUTH_TOKEN_KEY, encryptedToken);
      }
    }
  };

  const storeRefreshToken = async (token: unknown) => {
    if (typeof token === 'string' && token) {
      const encryptedToken = await tokenCrypto.encryptToken(token);
      if (typeof encryptedToken === 'string') {
        localStorage.setItem(REFRESH_TOKEN_KEY, encryptedToken);
      }
    }
  };

  const login = async (response: LoginResult) => {
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
        setToastState({
          open: true,
          message: successMessage,
          severity: 'success',
        });
      } else {
        await storeToken(response);
        setIsAuthenticated(true);
        const fallbackMessage =
          typeof response === 'string'
            ? 'Login successful'
            : (typeof response.message === 'string' && response.message) || 'Login successful';
        setToastState({
          open: true,
          message: fallbackMessage,
          severity: 'success',
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Login encryption failed:', error);
      throw new Error('Failed to store authentication tokens');
    }
  };

  const logout = async () => {
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

      setToastState({
        open: true,
        message,
        severity: 'success',
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Logout error:', error);
      const errorMessage = extractLogoutErrorMessage(error);
      setToastState({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_DATA_KEY);
      tokenCrypto.clearKey();
      setIsAuthenticated(false);
    }
  };

  const handleCloseToast = (_: SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setToastState((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const value: AuthContextValue = {
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}

      <ToastAlert
        open={toastState.open}
        onClose={handleCloseToast}
        severity={toastState.severity}
        message={toastState.message || 'Action completed successfully'}
        autoHideDuration={3000}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </AuthContext.Provider>
  );
};
