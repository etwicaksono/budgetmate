import axios, { AxiosRequestConfig } from 'axios';
import { tokenCrypto } from '@/utils/crypto';
import { APP_CONFIG } from '@/utils/constants';

// Create axios instance
const apiClient = axios.create({
  baseURL: APP_CONFIG.api.baseUrl,
  timeout: APP_CONFIG.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Get encrypted token from localStorage
    const encryptedToken = localStorage.getItem(APP_CONFIG.storageKeys.authToken);

    if (encryptedToken) {
      // Decrypt token
      const token = await tokenCrypto.decryptToken(encryptedToken);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if this is a 401 error
    if (error.response?.status === 401 && !originalRequest._retry) {
      const errorCode = error.response?.data?.error?.code;
      const isAuthEndpoint = originalRequest.url?.includes('/auth/');

      // Don't retry auth endpoints (login, register, refresh)
      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      // Check if it's a token expired error (not just any 401)
      if (errorCode === 'TOKEN_EXPIRED') {
        originalRequest._retry = true;

        try {
          // Get refresh token
          const encryptedRefreshToken = localStorage.getItem(APP_CONFIG.storageKeys.refreshToken);

          if (!encryptedRefreshToken) {
            throw new Error('No refresh token available');
          }

          const refreshToken = await tokenCrypto.decryptToken(encryptedRefreshToken);

          if (!refreshToken) {
            throw new Error('Failed to decrypt refresh token');
          }

          // Call refresh endpoint (without Authorization header to avoid infinite loop)
          const response = await axios.post(
            `${APP_CONFIG.api.baseUrl}/auth/refresh`,
            { refresh_token: refreshToken },
            {
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );

          if (response.data?.success && response.data?.data) {
            const { access_token } = response.data.data;
            // Note: refresh_token in response is the same one we sent

            // Encrypt and store new access token
            const encryptedAccessToken = await tokenCrypto.encryptToken(access_token);
            localStorage.setItem(APP_CONFIG.storageKeys.authToken, encryptedAccessToken);

            // Retry original request with new access token
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return apiClient(originalRequest);
          } else {
            throw new Error('Invalid refresh response');
          }
        } catch (refreshError) {
          // Refresh failed (refresh token expired or invalid)
          console.error('Token refresh failed:', refreshError);

          // Clear all auth data
          localStorage.removeItem(APP_CONFIG.storageKeys.authToken);
          localStorage.removeItem(APP_CONFIG.storageKeys.refreshToken);
          localStorage.removeItem(APP_CONFIG.storageKeys.userData);
          tokenCrypto.clearKey();

          // Only redirect if we're not already on login page
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login?session_expired=true';
          }

          return Promise.reject(refreshError);
        }
      } else {
        // Other 401 errors (invalid token, user not found, etc.) - redirect immediately
        console.error('Authentication failed:', error.response?.data?.error?.message);

        // Clear all auth data
        localStorage.removeItem(APP_CONFIG.storageKeys.authToken);
        localStorage.removeItem(APP_CONFIG.storageKeys.refreshToken);
        localStorage.removeItem(APP_CONFIG.storageKeys.userData);
        tokenCrypto.clearKey();

        // Redirect to login
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?auth_error=true';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Base API methods
export const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.get(url, config).then(response => response.data);
  },

  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.post(url, data, config).then(response => response.data);
  },

  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.put(url, data, config).then(response => response.data);
  },

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.delete(url, config).then(response => response.data);
  },
};

// Export axios instance for special cases
export { apiClient };
