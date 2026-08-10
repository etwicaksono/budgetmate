import axios, { AxiosRequestConfig } from 'axios';
import { tokenCrypto } from '@/utils/crypto';
import { APP_CONFIG } from '@/utils/constants';
import { logError } from '@/lib/logger';

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
// Mutex to prevent multiple concurrent refresh attempts
let refreshPromise: Promise<string> | null = null;

async function refreshToken(): Promise<string> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
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

        // Encrypt and store new access token
        const encryptedAccessToken = await tokenCrypto.encryptToken(access_token);
        localStorage.setItem(APP_CONFIG.storageKeys.authToken, encryptedAccessToken);

        return access_token;
      } else {
        throw new Error('Invalid refresh response');
      }
    } finally {
      // Clear the mutex so future refreshes can proceed
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function clearAuthAndRedirect(reason: 'session_expired' | 'auth_error') {
  localStorage.removeItem(APP_CONFIG.storageKeys.authToken);
  localStorage.removeItem(APP_CONFIG.storageKeys.refreshToken);
  localStorage.removeItem(APP_CONFIG.storageKeys.userData);
  tokenCrypto.clearKey();

  if (!window.location.pathname.includes('/login')) {
    window.location.href = `/login?${reason}=true`;
  }
}

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
          // Use the shared refresh mutex — concurrent requests will wait
          // for the same refresh to complete instead of racing
          const newAccessToken = await refreshToken();

          // Retry original request with new access token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          logError('Token refresh failed:', refreshError);
          clearAuthAndRedirect('session_expired');
          return Promise.reject(refreshError);
        }
      } else {
        // Other 401 errors (invalid token, user not found, etc.) - redirect immediately
        logError('Authentication failed:', error.response?.data?.error?.message);
        clearAuthAndRedirect('auth_error');
      }
    }

    return Promise.reject(error);
  }
);

// Map to track in-flight GET requests for deduplication
const pendingGetRequests = new Map<string, Promise<unknown>>();

// Base API methods
export const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    // Generate a deduplication cache key from the URL and params
    const cacheKey = config?.params
      ? `${url}?${JSON.stringify(config.params)}`
      : url;

    // If a request with the same key is already in flight, return its Promise
    if (pendingGetRequests.has(cacheKey)) {
      return pendingGetRequests.get(cacheKey) as Promise<T>;
    }

    // Otherwise, create a new request promise
    const requestPromise = apiClient.get(url, config)
      .then(response => response.data)
      .finally(() => {
        // Remove the promise from the Map once it resolves or rejects
        pendingGetRequests.delete(cacheKey);
      });

    // Store the pending promise
    pendingGetRequests.set(cacheKey, requestPromise);

    return requestPromise;
  },

  post: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.post(url, data, config).then(response => response.data);
  },

  put: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.put(url, data, config).then(response => response.data);
  },

  patch: <T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.patch(url, data, config).then(response => response.data);
  },

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return apiClient.delete(url, config).then(response => response.data);
  },
};

// Export axios instance for special cases
export { apiClient };
