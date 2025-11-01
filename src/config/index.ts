// Centralized application configuration

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
}

interface AppStorageKeys {
  authToken: string;
  refreshToken: string;
  userData: string;
  cryptoKey: string;
}

export interface AppConfig {
  name: string;
  version: string;
  storageKeys: AppStorageKeys;
  modalTimeout: number;
}

export interface CryptoConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
}

export const API_CONFIG: ApiConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  timeout: 30000, // 30 seconds timeout
  retryAttempts: 3,
};

export const APP_CONFIG: AppConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? 'Finance App',
  version: process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0',
  storageKeys: {
    authToken: process.env.NEXT_PUBLIC_STORAGE_AUTH_TOKEN_KEY ?? 'authToken',
    refreshToken: process.env.NEXT_PUBLIC_STORAGE_REFRESH_TOKEN_KEY ?? 'refreshToken',
    userData: process.env.NEXT_PUBLIC_STORAGE_USER_DATA_KEY ?? 'userData',
    cryptoKey: process.env.NEXT_PUBLIC_STORAGE_CRYPTO_KEY ?? 'finance_app_crypto_key',
  },
  modalTimeout: Number(process.env.NEXT_PUBLIC_MODAL_TIMEOUT) || 3000,
};

export const CRYPTO_CONFIG: CryptoConfig = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12, // 96-bit IV for AES-GCM
};
