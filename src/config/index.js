// Centralized application configuration

export const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080/api/v1',
  timeout: 30000, // 30 seconds timeout
  retryAttempts: 3,
};

export const APP_CONFIG = {
  name: 'Finance App',
  version: '1.0.0',
  // Token storage keys
  storageKeys: {
    authToken: 'authToken',
    refreshToken: 'refreshToken',
    userData: 'userData',
    cryptoKey: 'finance_app_crypto_key',
  },
  // Modal auto-dismiss timeout in milliseconds
  modalTimeout: 3000,
};

export const CRYPTO_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12, // 96-bit IV for AES-GCM
};
