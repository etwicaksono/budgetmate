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
  baseURL: process.env.REACT_APP_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  timeout: 30000, // 30 seconds timeout
  retryAttempts: 3,
};

export const APP_CONFIG: AppConfig = {
  name: 'Finance App',
  version: '1.0.0',
  storageKeys: {
    authToken: 'authToken',
    refreshToken: 'refreshToken',
    userData: 'userData',
    cryptoKey: 'finance_app_crypto_key',
  },
  modalTimeout: 3000,
};

export const CRYPTO_CONFIG: CryptoConfig = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12, // 96-bit IV for AES-GCM
};
