import { z } from 'zod';
import { registry } from '../registry';
import {
  LoginSchema,
  RegisterSchema,
  RefreshTokenSchema
} from '@/lib/validation/auth';

export const UserSchema = registry.register(
  'User',
  z.object({
    id: z.string().openapi({ example: 'clq1234560000000000000000' }),
    username: z.string().openapi({ example: 'johndoe' }),
    email: z.string().openapi({ example: 'john@example.com' }),
    full_name: z.string().nullable().openapi({ example: 'John Doe' }),
    timezone: z.string().openapi({ example: 'America/New_York' }),
    locale: z.string().openapi({ example: 'en-US' }),
    created_at: z.date().openapi({ example: '2023-12-01T00:00:00Z' })
  })
);

export const AuthTokensSchema = registry.register(
  'AuthTokens',
  z.object({
    access_token: z.string().openapi({ example: 'eyJhbGci...' }),
    refresh_token: z.string().openapi({ example: '12345678...' }),
    expires_in: z.number().openapi({ example: 900 })
  })
);

const LoginRequest = registry.register('LoginRequest', LoginSchema);
const RegisterRequest = registry.register('RegisterRequest', RegisterSchema);
const RefreshTokenRequest = registry.register('RefreshTokenRequest', RefreshTokenSchema);

// POST /api/v1/auth/login
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/login',
  description: 'Authenticate user and return tokens',
  summary: 'Login',
  tags: ['Auth'],
  request: {
    body: {
      content: { 'application/json': { schema: LoginRequest } }
    }
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              user: UserSchema,
              tokens: AuthTokensSchema
            })
          })
        }
      }
    }
  }
});

// POST /api/v1/auth/register
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/register',
  description: 'Register a new user',
  summary: 'Register',
  tags: ['Auth'],
  request: {
    body: {
      content: { 'application/json': { schema: RegisterRequest } }
    }
  },
  responses: {
    201: {
      description: 'Registration successful',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              user: UserSchema,
              tokens: AuthTokensSchema
            })
          })
        }
      }
    }
  }
});

// POST /api/v1/auth/logout
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/logout',
  description: 'Logout user and clear session cookies',
  summary: 'Logout',
  tags: ['Auth'],
  responses: {
    200: {
      description: 'Logout successful',
      content: {
        'application/json': {
          schema: z.object({ success: z.boolean() })
        }
      }
    }
  }
});

// POST /api/v1/auth/refresh
registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/refresh',
  description: 'Refresh authentication tokens',
  summary: 'Refresh Token',
  tags: ['Auth'],
  request: {
    body: {
      content: { 'application/json': { schema: RefreshTokenRequest } }
    }
  },
  responses: {
    200: {
      description: 'Tokens refreshed',
      content: {
        'application/json': {
          schema: z.object({
            success: z.boolean(),
            data: AuthTokensSchema
          })
        }
      }
    }
  }
});
