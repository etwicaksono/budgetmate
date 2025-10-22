// Base API configuration and utilities
import tokenCrypto from '../utils/crypto';
import { API_CONFIG, APP_CONFIG } from '../config';

class ApiService {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.timeout = API_CONFIG.timeout;
    this.retryAttempts = API_CONFIG.retryAttempts;
  }

  // Generic request method
  async request(endpoint, options = {}, attempt = 0) {
    const url = `${this.baseURL}${endpoint}`;
    const normalizedOptions = options ? { ...options } : {};

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(normalizedOptions.headers || {}),
      },
      ...normalizedOptions,
    };

    await this.applyAuthHeader(config);

    try {
      const response = await fetch(url, config);

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (this.shouldAttemptTokenRefresh(response.status, errorData, attempt)) {
          try {
            await this.refreshAccessToken();
            return this.request(endpoint, options, attempt + 1);
          } catch (refreshError) {
            this.handleRefreshFailure(refreshError);
            const refreshMessage =
              refreshError?.response?.data?.message ||
              refreshError?.message ||
              'Session expired. Please log in again.';
            const sessionError = new Error(refreshMessage);
            sessionError.code = 'SESSION_EXPIRED';
            sessionError.response = refreshError?.response || { data: errorData, status: response.status };
            throw sessionError;
          }
        }

        const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
        error.response = { data: errorData, status: response.status };
        throw error;
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return response;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data = {}, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  // POST request with form data
  async postForm(endpoint, data = {}) {
    const formData = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    return this.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
  }

  // PUT request
  async put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // PUT request with form data
  async putForm(endpoint, data = {}) {
    const formData = new URLSearchParams();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    return this.request(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // PATCH request
  async patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async applyAuthHeader(config) {
    const encryptedToken = localStorage.getItem(APP_CONFIG.storageKeys.authToken);
    if (!encryptedToken) {
      return;
    }
    try {
      const token = await tokenCrypto.decryptToken(encryptedToken);
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to decrypt auth token:', error);
      localStorage.removeItem(APP_CONFIG.storageKeys.authToken);
    }
  }

  shouldAttemptTokenRefresh(status, errorData, attempt) {
    if (attempt > 0) {
      return false;
    }

    if (status !== 401) {
      return false;
    }

    const code = (errorData?.code || '').toString().toUpperCase();
    const message = (errorData?.message || '').toString().toLowerCase();
    const authError = (errorData?.errors?.Authorization || '').toString().toLowerCase();

    if (code === 'UNAUTHORIZED') {
      return true;
    }

    if (message.includes('invalid token')) {
      return true;
    }

    if (authError.includes('invalid token')) {
      return true;
    }

    return false;
  }

  async refreshAccessToken() {
    const encryptedRefreshToken = localStorage.getItem(APP_CONFIG.storageKeys.refreshToken);
    if (!encryptedRefreshToken) {
      throw new Error('Missing refresh token');
    }

    let refreshToken = null;
    try {
      refreshToken = await tokenCrypto.decryptToken(encryptedRefreshToken);
    } catch (error) {
      console.error('Failed to decrypt refresh token:', error);
      throw new Error('Failed to use refresh token');
    }

    if (!refreshToken) {
      throw new Error('Invalid refresh token');
    }

    const refreshUrl = `${this.baseURL}/auth/refresh`;
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    let responseData = null;
    try {
      responseData = await response.json();
    } catch (error) {
      responseData = {};
    }

    if (!response.ok) {
      const error = new Error(
        responseData?.message || responseData?.error?.message || 'Token refresh failed'
      );
      error.response = { data: responseData, status: response.status };
      throw error;
    }

    const payload = responseData?.data || responseData;
    const accessToken =
      payload?.access_token || payload?.accessToken || payload?.token || null;
    const newRefreshToken =
      payload?.refresh_token || payload?.refreshToken || null;

    if (!accessToken) {
      throw new Error('Token refresh response missing access token');
    }

    await this.storeEncryptedToken(APP_CONFIG.storageKeys.authToken, accessToken);

    if (newRefreshToken) {
      await this.storeEncryptedToken(APP_CONFIG.storageKeys.refreshToken, newRefreshToken);
    }

    return accessToken;
  }

  async storeEncryptedToken(storageKey, token) {
    if (!token) {
      return;
    }
    try {
      const encrypted = await tokenCrypto.encryptToken(token);
      localStorage.setItem(storageKey, encrypted);
    } catch (error) {
      console.error('Failed to store token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  handleRefreshFailure(error) {
    console.error('Token refresh failed:', error);
    this.clearAuthData();
    if (typeof window !== 'undefined') {
      window.location.assign('/login');
    }
  }

  clearAuthData() {
    localStorage.removeItem(APP_CONFIG.storageKeys.authToken);
    localStorage.removeItem(APP_CONFIG.storageKeys.refreshToken);
    localStorage.removeItem(APP_CONFIG.storageKeys.userData);
    tokenCrypto.clearKey();
  }
}

// Create a singleton instance
const apiService = new ApiService();

export default apiService;
