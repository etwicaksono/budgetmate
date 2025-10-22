import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';
import tokenCrypto from '../utils/crypto';
import { APP_CONFIG } from '../config';
import ToastAlert from '../components/ToastAlert';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastState, setToastState] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  useEffect(() => {
    // Check if user is logged in by decrypting and checking token
    checkAuthentication();
    setLoading(false);
  }, []);

  // Check authentication by decrypting stored tokens
  const checkAuthentication = async () => {
    try {
      const encryptedToken = localStorage.getItem(APP_CONFIG.storageKeys.authToken);
      if (encryptedToken) {
        const decryptedToken = await tokenCrypto.decryptToken(encryptedToken);
        setIsAuthenticated(!!decryptedToken);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Failed to check authentication:', error);
      setIsAuthenticated(false);
    }
  };

  // Encrypt and store token
  const storeToken = async (token) => {
    if (token) {
      const encryptedToken = await tokenCrypto.encryptToken(token);
      localStorage.setItem(APP_CONFIG.storageKeys.authToken, encryptedToken);
    }
  };

  // Encrypt and store refresh token
  const storeRefreshToken = async (token) => {
    if (token) {
      const encryptedToken = await tokenCrypto.encryptToken(token);
      localStorage.setItem(APP_CONFIG.storageKeys.refreshToken, encryptedToken);
    }
  };

  const login = async (response) => {
    try {
      // Handle new response format with nested data structure
      if (response.data?.access_token) {
        await storeToken(response.data.access_token);

        // Store refresh token if available
        if (response.data.refresh_token) {
          await storeRefreshToken(response.data.refresh_token);
        }

        setIsAuthenticated(true);
        const successMessage =
          response.data?.message ||
          response?.message ||
          'Login successful';
        setToastState({
          open: true,
          message: successMessage,
          severity: 'success',
        });
      } else {
        // Fallback for legacy response format
        await storeToken(response);
        setIsAuthenticated(true);
        const fallbackMessage =
          response?.message ||
          'Login successful';
        setToastState({
          open: true,
          message: fallbackMessage,
          severity: 'success',
        });
      }
    } catch (error) {
      console.error('Login encryption failed:', error);
      throw new Error('Failed to store authentication tokens');
    }
  };

  const logout = async () => {
    try {
      const response = await authService.logout();

      // Determine logout message
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
      console.error('Logout error:', error);

      // Show error message
      const errorMessage = error.response?.data?.message || error.message || 'Logout failed. Please try again.';
      setToastState({
        open: true,
        message: errorMessage,
        severity: 'error',
      });
    } finally {
      // Clear all authentication data
      localStorage.removeItem(APP_CONFIG.storageKeys.authToken);
      localStorage.removeItem(APP_CONFIG.storageKeys.refreshToken);
      localStorage.removeItem(APP_CONFIG.storageKeys.userData);
      tokenCrypto.clearKey();
      setIsAuthenticated(false);
    }
  };

  const handleCloseToast = (_, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setToastState((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const value = {
    isAuthenticated,
    loading,
    login,
    logout
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
