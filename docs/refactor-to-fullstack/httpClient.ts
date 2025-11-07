/**
 * Core API Client Base
 * 
 * This module provides the foundational HTTP client functionality.
 * Domain-specific API services should be created in separate files in src/services/
 */

import { config } from '@/config';

// Configuration
const API_BASE_URL = config.apiBaseUrl || '';

// Types
export interface ApiError {
  message: string;
  status: number;
  details?: unknown;
}

export class ApiException extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.details = details;
  }
}

// Request configuration type
export interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

/**
 * Core fetch wrapper with error handling
 */
export async function fetchWithErrorHandling<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const { params, ...fetchConfig } = config;

  // Build URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  // Set default headers
  const headers = new Headers(fetchConfig.headers);
  if (!headers.has('Content-Type') && fetchConfig.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...fetchConfig,
      headers,
    });

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let errorDetails: unknown;

      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        errorDetails = errorData;
      } catch {
        // If response is not JSON, try to get text
        try {
          errorMessage = await response.text();
        } catch {
          // Keep default error message
        }
      }

      throw new ApiException(errorMessage, response.status, errorDetails);
    }

    // Handle no-content responses
    if (response.status === 204) {
      return undefined as T;
    }

    // Parse and return JSON response
    const data = await response.json();
    return data as T;
  } catch (error) {
    // Re-throw ApiException as-is
    if (error instanceof ApiException) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiException(
        'Network error: Please check your connection',
        0,
        error
      );
    }

    // Handle other errors
    throw new ApiException(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      0,
      error
    );
  }
}

/**
 * Base HTTP client with generic methods
 * Use this to create domain-specific API services
 */
export const httpClient = {
  /**
   * GET request
   */
  get: <T>(endpoint: string, config?: RequestConfig): Promise<T> => {
    return fetchWithErrorHandling<T>(endpoint, {
      ...config,
      method: 'GET',
    });
  },

  /**
   * POST request
   */
  post: <T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> => {
    return fetchWithErrorHandling<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PUT request
   */
  put: <T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> => {
    return fetchWithErrorHandling<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * PATCH request
   */
  patch: <T>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> => {
    return fetchWithErrorHandling<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  /**
   * DELETE request
   */
  delete: <T>(endpoint: string, config?: RequestConfig): Promise<T> => {
    return fetchWithErrorHandling<T>(endpoint, {
      ...config,
      method: 'DELETE',
    });
  },
};

/**
 * Helper function to handle API errors in components
 * Returns a user-friendly error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiException) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
