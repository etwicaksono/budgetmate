/**
 * @module features/auth
 *
 * Auth feature module — login, registration, token management.
 * Canonical import paths for new code:
 *   import { authService } from '@/features/auth';
 *   import { useLogin, useRegister } from '@/features/auth';
 *   import type { User, LoginResponse } from '@/features/auth';
 */
export * from './types/auth.types';
export * from './services/authService';
export * from './hooks/index';
