import tokenCrypto from '../utils/crypto';
import { API_CONFIG, APP_CONFIG } from '../config';

type RequestHeaders = Record<string, string>;

type RequestInitWithBody = Omit<RequestInit, 'body'> & {
  body?: BodyInit | null;
};

export type JsonRecord = Record<string, unknown>;

// Wrapped API response format (full-stack refactor)
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T | null;
  meta: {
    version: string;
    timestamp: number;
    [key: string]: unknown;
  } | null;
  errors?: unknown;
}

export interface ApiErrorResponse {
  code?: string | number;
  message?: string;
  error?: {
    message?: string;
    [key: string]: unknown;
  };
  errors?: Record<string, unknown>;
  [key: string]: unknown;
}

interface FetchError extends Error {
  response?: {
    data?: ApiErrorResponse;
    status?: number;
  };
  code?: string;
}

interface ApiRequestOptions extends RequestInitWithBody {
  headers?: RequestHeaders;
  returnRaw?: boolean;
}

type QueryParams = Record<string, string | number | boolean | undefined | null>;

type FormBody = Record<string, string | number | boolean | undefined | null>;

const isJsonResponse = (contentType: string | null): boolean =>
  typeof contentType === 'string' && contentType.includes('application/json');

const buildUrl = (baseURL: string, endpoint: string): string =>
  `${baseURL}${endpoint}`;

const initHeaders = (headers: RequestHeaders | undefined): RequestHeaders => {
  const initial: RequestHeaders = {
    'Content-Type': 'application/json',
  };
  return headers ? { ...initial, ...headers } : initial;
};

const serialiseQuery = (params: QueryParams): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  });
  return query.toString();
};

const toUrlEncoded = (data: FormBody): string => {
  const formData = new URLSearchParams();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  });
  return formData.toString();
};

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Unknown error';
};

class ApiService {
  private readonly baseURL: string;

  private readonly timeout: number;

  private readonly retryAttempts: number;

  constructor() {
    this.baseURL = API_CONFIG.baseURL;
    this.timeout = API_CONFIG.timeout;
    this.retryAttempts = API_CONFIG.retryAttempts;
  }

  async request<T = unknown>(
    endpoint: string,
    options: ApiRequestOptions & { returnRaw: true },
    attempt?: number
  ): Promise<ApiResponse<T>>;
  async request<T = unknown>(
    endpoint: string,
    options?: ApiRequestOptions,
    attempt?: number
  ): Promise<T>;
  async request<T = unknown>(
    endpoint: string,
    options: ApiRequestOptions = {},
    attempt = 0
  ): Promise<T | ApiResponse<T>> {
    const url = buildUrl(this.baseURL, endpoint);
    const { returnRaw = false, headers, ...restOptions } = options;
    const config: RequestInitWithBody & { headers?: RequestHeaders } = {
      ...restOptions,
      headers: initHeaders(headers),
    };

    await this.applyAuthHeader(config);

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = (await response
          .json()
          .catch(() => ({}))) as ApiErrorResponse;

        if (this.shouldAttemptTokenRefresh(response.status, errorData, attempt, endpoint)) {
          try {
            await this.refreshAccessToken();
            return this.request<T>(endpoint, options, attempt + 1);
          } catch (refreshError) {
            this.handleRefreshFailure(refreshError);
            this.throwSessionExpiredError(
              refreshError,
              errorData,
              response.status
            );
          }
        }

        const error = new Error(
          errorData.message ?? `HTTP error! status: ${response.status}`
        ) as FetchError;
        error.response = { data: errorData, status: response.status };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (isJsonResponse(contentType)) {
        const jsonData = await response.json();

        // Check if response is wrapped in {success, message, data, meta} format
        if (
          typeof jsonData === 'object' &&
          jsonData !== null &&
          'success' in jsonData &&
          'data' in jsonData
        ) {
          const wrappedResponse = jsonData as ApiResponse<T>;

          // If wrapped response indicates failure, throw error
          if (!wrappedResponse.success) {
            if (
              attempt === 0 &&
              this.isInvalidOrExpiredTokenMessage(wrappedResponse.message)
            ) {
              try {
                await this.refreshAccessToken();
                return this.request<T>(endpoint, options, attempt + 1);
              } catch (refreshError) {
                this.handleRefreshFailure(refreshError);
                this.throwSessionExpiredError(
                  refreshError,
                  {
                    message: wrappedResponse.message,
                    errors: wrappedResponse.errors,
                  } as ApiErrorResponse,
                  response.status
                );
              }
            }
            const error = new Error(wrappedResponse.message || 'API request failed') as FetchError;
            error.response = {
              data: {
                message: wrappedResponse.message,
                errors: wrappedResponse.errors,
              } as ApiErrorResponse,
              status: response.status,
            };
            throw error;
          }

          return returnRaw
            ? (wrappedResponse as ApiResponse<T>)
            : (wrappedResponse.data as T);
        }

        // Return raw response if not wrapped
        return jsonData as T;
      }

      return (response as unknown) as T;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  async get<T = unknown>(
    endpoint: string,
    params: QueryParams,
    options: ApiRequestOptions & { returnRaw: true }
  ): Promise<ApiResponse<T>>;
  async get<T = unknown>(
    endpoint: string,
    params?: QueryParams,
    options?: ApiRequestOptions
  ): Promise<T>;
  async get<T = unknown>(
    endpoint: string,
    params: QueryParams = {},
    options: ApiRequestOptions = {}
  ): Promise<T | ApiResponse<T>> {
    const query = serialiseQuery(params);
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request<T>(url, { method: 'GET', ...options });
  }

  async post<T = unknown, B extends object = JsonRecord>(
    endpoint: string,
    data: B,
    options: ApiRequestOptions & { returnRaw: true }
  ): Promise<ApiResponse<T>>;
  async post<T = unknown, B extends object = JsonRecord>(
    endpoint: string,
    data?: B,
    options?: ApiRequestOptions
  ): Promise<T>;
  async post<T = unknown, B extends object = JsonRecord>(
    endpoint: string,
    data: B = {} as B,
    options: ApiRequestOptions = {}
  ): Promise<T | ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async postForm<T = unknown>(
    endpoint: string,
    data: FormBody,
    options: ApiRequestOptions & { returnRaw: true }
  ): Promise<ApiResponse<T>>;
  async postForm<T = unknown>(
    endpoint: string,
    data?: FormBody,
    options?: ApiRequestOptions
  ): Promise<T>;
  async postForm<T = unknown>(
    endpoint: string,
    data: FormBody = {},
    options: ApiRequestOptions = {}
  ): Promise<T | ApiResponse<T>> {
    const { headers: optionHeaders, ...restOptions } = options;

    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(optionHeaders ?? {}),
      },
      body: toUrlEncoded(data),
      ...restOptions,
    });
  }

  async put<T = unknown, B extends object = JsonRecord>(
    endpoint: string,
    data: B,
    options: ApiRequestOptions & { returnRaw: true }
  ): Promise<ApiResponse<T>>;
  async put<T = unknown, B extends object = JsonRecord>(
    endpoint: string,
    data?: B,
    options?: ApiRequestOptions
  ): Promise<T>;
  async put<T = unknown, B extends object = JsonRecord>(
    endpoint: string,
    data: B = {} as B,
    options: ApiRequestOptions = {}
  ): Promise<T | ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    });
  }

  async putForm<T = unknown>(
    endpoint: string,
    data: FormBody,
    options: ApiRequestOptions & { returnRaw: true }
  ): Promise<ApiResponse<T>>;
  async putForm<T = unknown>(
    endpoint: string,
    data?: FormBody,
    options?: ApiRequestOptions
  ): Promise<T>;
  async putForm<T = unknown>(
    endpoint: string,
    data: FormBody = {},
    options: ApiRequestOptions = {}
  ): Promise<T | ApiResponse<T>> {
    const { headers: optionHeaders, ...restOptions } = options;

    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...(optionHeaders ?? {}),
      },
      body: toUrlEncoded(data),
      ...restOptions,
    });
  }

  async delete<T = unknown>(
    endpoint: string,
    options: ApiRequestOptions & { returnRaw: true }
  ): Promise<ApiResponse<T>>;
  async delete<T = unknown>(
    endpoint: string,
    options?: ApiRequestOptions
  ): Promise<T>;
  async delete<T = unknown>(
    endpoint: string,
    options: ApiRequestOptions = {}
  ): Promise<T | ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      ...options,
    });
  }

  private async applyAuthHeader(config: ApiRequestOptions): Promise<void> {
    const token = await this.getStoredToken();
    if (token) {
      config.headers = {
        ...(config.headers ?? {}),
        Authorization: `Bearer ${token}`,
      };
    }
  }

  private async getStoredToken(): Promise<string | null> {
    try {
      const encryptedToken = localStorage.getItem(
        APP_CONFIG.storageKeys.authToken
      );
      if (!encryptedToken) {
        return null;
      }
      const token = await tokenCrypto.decryptToken(encryptedToken);
      return typeof token === 'string' ? token : null;
    } catch (error) {
      console.error('Failed to decrypt auth token:', error);
      localStorage.removeItem(APP_CONFIG.storageKeys.authToken);
      return null;
    }
  }

  private isInvalidOrExpiredTokenMessage(message?: string | null): boolean {
    if (!message) {
      return false;
    }
    const normalized = message.toLowerCase();
    return (
      normalized.includes('invalid token') || normalized.includes('expired token')
    );
  }

  private shouldAttemptTokenRefresh(
    status: number,
    errorData: ApiErrorResponse,
    attempt: number,
    endpoint: string
  ): boolean {
    if (attempt > 0) {
      return false;
    }

    if (status !== 401) {
      return false;
    }

    // Do NOT refresh token on login failures
    // This prevents triggering a refresh when credentials are invalid
    const ep = (endpoint || '').toLowerCase();
    if (ep.includes('/auth/login')) {
      return false;
    }

    const code = (errorData?.code ?? '').toString().toUpperCase();
    const message = (errorData?.message ?? '').toString();
    const authError = (errorData?.errors?.Authorization ?? '').toString();
    const nestedErrorMessage = (errorData?.error?.message ?? '').toString();

    return (
      code === 'UNAUTHORIZED' ||
      this.isInvalidOrExpiredTokenMessage(message) ||
      this.isInvalidOrExpiredTokenMessage(authError) ||
      this.isInvalidOrExpiredTokenMessage(nestedErrorMessage)
    );
  }

  private async refreshAccessToken(): Promise<string> {
    const encryptedRefreshToken = localStorage.getItem(
      APP_CONFIG.storageKeys.refreshToken
    );
    if (!encryptedRefreshToken) {
      throw new Error('Missing refresh token');
    }

    let refreshToken: string | null = null;
    try {
      const decrypted = await tokenCrypto.decryptToken(encryptedRefreshToken);
      refreshToken = typeof decrypted === 'string' ? decrypted : null;
    } catch (error) {
      console.error('Failed to decrypt refresh token:', error);
      throw new Error('Failed to use refresh token');
    }

    if (!refreshToken) {
      throw new Error('Invalid refresh token');
    }

    const refreshUrl = buildUrl(this.baseURL, '/auth/refresh');
    const response = await fetch(refreshUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    let responseData: ApiErrorResponse | (ApiErrorResponse & { data?: JsonRecord }) = {};
    try {
      responseData = (await response.json()) as typeof responseData;
    } catch {
      responseData = {};
    }

    if (!response.ok) {
      const error = new Error(
        responseData?.message ??
          responseData?.error?.message ??
          'Token refresh failed'
      ) as FetchError;
      error.response = { data: responseData, status: response.status };
      throw error;
    }

    const payload = (responseData?.data as JsonRecord | undefined) ?? responseData;
    const accessToken =
      (payload?.access_token as string | undefined) ??
      (payload?.accessToken as string | undefined) ??
      (payload?.token as string | undefined) ??
      null;
    const newRefreshToken =
      (payload?.refresh_token as string | undefined) ??
      (payload?.refreshToken as string | undefined) ??
      null;

    if (!accessToken) {
      throw new Error('Token refresh response missing access token');
    }

    await this.storeEncryptedToken(
      APP_CONFIG.storageKeys.authToken,
      accessToken
    );

    if (newRefreshToken) {
      await this.storeEncryptedToken(
        APP_CONFIG.storageKeys.refreshToken,
        newRefreshToken
      );
    }

    return accessToken;
  }

  private async storeEncryptedToken(
    storageKey: string,
    token: string | null
  ): Promise<void> {
    if (!token) {
      return;
    }
    try {
      const encrypted = await tokenCrypto.encryptToken(token);
      if (typeof encrypted === 'string') {
        localStorage.setItem(storageKey, encrypted);
      }
    } catch (error) {
      console.error('Failed to store token:', error);
      throw new Error('Failed to store authentication token');
    }
  }

  private throwSessionExpiredError(
    refreshError: unknown,
    fallbackData: ApiErrorResponse,
    status?: number
  ): never {
    const message =
      (refreshError as FetchError)?.response?.data?.message ??
      extractErrorMessage(refreshError) ??
      'Session expired. Please log in again.';

    const sessionError = new Error(message) as FetchError;
    sessionError.code = 'SESSION_EXPIRED';
    sessionError.response = (refreshError as FetchError)?.response ?? {
      data: fallbackData,
      status,
    };
    throw sessionError;
  }

  private handleRefreshFailure(error: unknown): void {
    console.error('Token refresh failed:', error);
    this.clearAuthData();
    // Only redirect to login if not already on the login page to prevent infinite redirects
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        window.location.assign('/login');
      }
    }
  }

  clearAuthData(): void {
    localStorage.removeItem(APP_CONFIG.storageKeys.authToken);
    localStorage.removeItem(APP_CONFIG.storageKeys.refreshToken);
    localStorage.removeItem(APP_CONFIG.storageKeys.userData);
    tokenCrypto.clearKey();
  }
}

const apiService = new ApiService();

export default apiService;
