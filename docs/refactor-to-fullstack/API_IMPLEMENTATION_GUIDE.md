# API Implementation Guide for Next.js

## Overview

This guide provides a complete implementation plan for migrating the existing Go backend API to Next.js App Router with TypeScript and Prisma ORM.

## API Analysis Summary

### Base URL Structure
```
Production: /api/v1/*
```

### Consistent Response Format
All API responses follow this structure:
```typescript
{
  success: boolean;
  message: string;
  data: T | null;
  meta: {
    version: string;
    timestamp: number;
  } | null;
  errors?: any; // For error responses
}
```

### Authentication Flow
1. **Register** → Returns user data
2. **Login** → Returns access_token, refresh_token, and user data
3. **All protected endpoints** → Require `Authorization: Bearer {access_token}`
4. **Refresh** → Exchange refresh_token for new access_token
5. **Logout** → Invalidate tokens (server-side)

### Content Types
- **Auth endpoints**: `application/x-www-form-urlencoded`
- **Other endpoints**: `application/json`

---

## Project Structure

```
app/
├── api/
│   └── v1/
│       ├── auth/
│       │   ├── register/
│       │   │   └── route.ts
│       │   ├── login/
│       │   │   └── route.ts
│       │   ├── refresh/
│       │   │   └── route.ts
│       │   └── logout/
│       │       └── route.ts
│       └── accounts/
│           ├── route.ts                    # GET /api/v1/accounts, POST /api/v1/accounts
│           ├── [id]/
│           │   └── route.ts                # GET, PUT, DELETE /api/v1/accounts/:id
│           └── swap-order/
│               └── route.ts                # PUT /api/v1/accounts/swap-order
├── lib/
│   ├── db.ts                               # Prisma client
│   ├── auth.ts                             # JWT utilities
│   ├── api-response.ts                     # Response helpers
│   └── middleware.ts                       # Auth middleware
├── types/
│   ├── api.ts                              # API request/response types
│   └── database.ts                         # Database types (already exists)
└── services/
    ├── authService.ts                      # Auth business logic
    └── accountService.ts                   # Account business logic
```

---

## 1. Core Utilities

### 1.1 API Response Helper (`lib/api-response.ts`)

```typescript
/**
 * Standard API response wrapper
 */

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  meta: {
    version: string;
    timestamp: number;
  } | null;
  errors?: any;
}

export class ApiResponseBuilder {
  /**
   * Create successful response
   */
  static success<T>(
    message: string,
    data: T | null = null,
    meta: { version?: string; timestamp?: number } | null = null
  ): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      meta: meta || {
        version: process.env.API_VERSION || 'v1.0.0',
        timestamp: Math.floor(Date.now() / 1000),
      },
    };
  }

  /**
   * Create error response
   */
  static error(
    message: string,
    errors: any = null,
    statusCode: number = 500
  ): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      meta: null,
      errors,
    };
  }

  /**
   * Create validation error response
   */
  static validationError(errors: Record<string, string[]>): ApiResponse<null> {
    return {
      success: false,
      message: 'Validation failed',
      data: null,
      meta: null,
      errors,
    };
  }
}

// Helper to send JSON response with status code
export function jsonResponse<T>(
  response: ApiResponse<T>,
  statusCode: number = 200
) {
  return Response.json(response, { status: statusCode });
}
```

### 1.2 JWT Authentication Utilities (`lib/auth.ts`)

```typescript
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface JWTPayload {
  user_id: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

/**
 * Generate access token (24 hours)
 */
export async function generateAccessToken(payload: {
  user_id: string;
  email: string;
  username: string;
}): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

/**
 * Generate refresh token (7 days)
 */
export async function generateRefreshToken(payload: {
  user_id: string;
  email: string;
  username: string;
}): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Get current user from request
 */
export async function getCurrentUser(
  request: Request
): Promise<JWTPayload | null> {
  const authHeader = request.headers.get('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return null;
  }

  return await verifyToken(token);
}

/**
 * Require authentication middleware
 */
export async function requireAuth(
  request: Request
): Promise<{ user: JWTPayload } | { error: Response }> {
  const user = await getCurrentUser(request);

  if (!user) {
    return {
      error: Response.json(
        {
          success: false,
          message: 'Unauthorized',
          data: null,
          meta: null,
        },
        { status: 401 }
      ),
    };
  }

  return { user };
}
```

### 1.3 Database Client (`lib/db.ts`)

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

---

## 2. Authentication Endpoints

### 2.1 Register (`app/api/v1/auth/register/route.ts`)

```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    // Validation
    if (!email || !name || !username || !password) {
      return jsonResponse(
        ApiResponseBuilder.error('All fields are required'),
        400
      );
    }

    // Check if user exists
    const existingUser = await db.users.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return jsonResponse(
        ApiResponseBuilder.error('Email or username already exists'),
        409
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await db.users.create({
      data: {
        id: crypto.randomUUID(),
        name,
        email,
        username,
        password: hashedPassword,
        created_at: new Date(),
        created_by: null,
        updated_at: new Date(),
        updated_by: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        created_at: true,
        created_by: true,
        updated_at: true,
        updated_by: true,
      },
    });

    return jsonResponse(
      ApiResponseBuilder.success('User created successfully', user),
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
```

### 2.2 Login (`app/api/v1/auth/login/route.ts`)

```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { generateAccessToken, generateRefreshToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const email_or_username = formData.get('email_or_username') as string;
    const password = formData.get('password') as string;

    // Validation
    if (!email_or_username || !password) {
      return jsonResponse(
        ApiResponseBuilder.error('Email/username and password are required'),
        400
      );
    }

    // Find user by email or username
    const user = await db.users.findFirst({
      where: {
        OR: [{ email: email_or_username }, { username: email_or_username }],
      },
    });

    if (!user) {
      return jsonResponse(
        ApiResponseBuilder.error('Invalid credentials'),
        401
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return jsonResponse(
        ApiResponseBuilder.error('Invalid credentials'),
        401
      );
    }

    // Generate tokens
    const tokenPayload = {
      user_id: user.id,
      email: user.email,
      username: user.username,
    };

    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);

    // Return response
    return jsonResponse(
      ApiResponseBuilder.success('Login successful', {
        access_token: accessToken,
        refresh_token: refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          username: user.username,
          created_at: user.created_at,
          created_by: user.created_by,
          updated_at: user.updated_at,
          updated_by: user.updated_by,
        },
      })
    );
  } catch (error) {
    console.error('Login error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
```

### 2.3 Refresh Token (`app/api/v1/auth/refresh/route.ts`)

```typescript
import { NextRequest } from 'next/server';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { verifyToken, generateAccessToken, generateRefreshToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const refreshToken = formData.get('refresh_token') as string;

    if (!refreshToken) {
      return jsonResponse(
        ApiResponseBuilder.error('Refresh token is required'),
        400
      );
    }

    // Verify refresh token
    const payload = await verifyToken(refreshToken);

    if (!payload) {
      return jsonResponse(
        ApiResponseBuilder.error('Invalid or expired refresh token'),
        401
      );
    }

    // Generate new tokens
    const tokenPayload = {
      user_id: payload.user_id,
      email: payload.email,
      username: payload.username,
    };

    const newAccessToken = await generateAccessToken(tokenPayload);
    const newRefreshToken = await generateRefreshToken(tokenPayload);

    // Calculate expiration times
    const now = Date.now();
    const accessTokenExpiry = new Date(now + 24 * 60 * 60 * 1000); // 24 hours
    const refreshTokenExpiry = new Date(now + 7 * 24 * 60 * 60 * 1000); // 7 days

    return jsonResponse(
      ApiResponseBuilder.success('Token refreshed', {
        access_token: newAccessToken,
        expired_at: accessTokenExpiry.toISOString(),
        refresh_token: newRefreshToken,
        refreshable_until: refreshTokenExpiry.toISOString(),
      })
    );
  } catch (error) {
    console.error('Token refresh error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
```

### 2.4 Logout (`app/api/v1/auth/logout/route.ts`)

```typescript
import { NextRequest } from 'next/server';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    // In a production app, you might want to:
    // 1. Add token to blacklist in Redis/Database
    // 2. Clear any server-side sessions
    // For now, client-side token removal is sufficient

    return jsonResponse(ApiResponseBuilder.success('success', null));
  } catch (error) {
    console.error('Logout error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
```

---

## 3. Account Endpoints

### 3.1 List & Create Accounts (`app/api/v1/accounts/route.ts`)

```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/v1/accounts?keyword=
 * List all accounts for authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const keyword = searchParams.get('keyword') || '';

    // Build where clause
    const where: any = {
      user_id: user.user_id,
    };

    if (keyword) {
      where.name = {
        contains: keyword,
        mode: 'insensitive',
      };
    }

    // Fetch accounts
    const accounts = await db.accounts.findMany({
      where,
      orderBy: { personal_id: 'asc' },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Accounts retrieved successfully', accounts)
    );
  } catch (error) {
    console.error('List accounts error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

/**
 * POST /api/v1/accounts
 * Create new account
 */
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Parse request body
    const body = await request.json();
    const {
      personal_id,
      name,
      icon,
      color,
      active,
      account_type,
      initial_amount,
      usability,
      group_id,
    } = body;

    // Validation
    if (!personal_id || !name || !icon || !color || !account_type) {
      return jsonResponse(
        ApiResponseBuilder.error('Required fields are missing'),
        400
      );
    }

    // Create account
    const account = await db.accounts.create({
      data: {
        id: crypto.randomUUID(),
        user_id: user.user_id,
        personal_id,
        name,
        icon,
        color,
        active: active ?? true,
        usability: usability || 'USABLE',
        account_type,
        initial_amount: initial_amount || null,
        group_id: group_id || null,
        position: null,
        created_at: new Date(),
        created_by: user.user_id,
        updated_at: null,
        updated_by: null,
      },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Account created successfully', account),
      201
    );
  } catch (error) {
    console.error('Create account error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
```

### 3.2 Get, Update, Delete Account (`app/api/v1/accounts/[id]/route.ts`)

```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

/**
 * GET /api/v1/accounts/:id
 * Get account detail
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Fetch account
    const account = await db.accounts.findFirst({
      where: {
        id: params.id,
        user_id: user.user_id,
      },
    });

    if (!account) {
      return jsonResponse(
        ApiResponseBuilder.error('Account not found'),
        404
      );
    }

    return jsonResponse(
      ApiResponseBuilder.success('Account retrieved successfully', account)
    );
  } catch (error) {
    console.error('Get account error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

/**
 * PUT /api/v1/accounts/:id
 * Update account
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Parse request body
    const body = await request.json();
    const {
      name,
      icon,
      color,
      active,
      account_type,
      initial_amount,
      usability,
      group_id,
    } = body;

    // Check if account exists and belongs to user
    const existingAccount = await db.accounts.findFirst({
      where: {
        id: params.id,
        user_id: user.user_id,
      },
    });

    if (!existingAccount) {
      return jsonResponse(
        ApiResponseBuilder.error('Account not found'),
        404
      );
    }

    // Update account
    const updatedAccount = await db.accounts.update({
      where: { id: params.id },
      data: {
        name: name ?? existingAccount.name,
        icon: icon ?? existingAccount.icon,
        color: color ?? existingAccount.color,
        active: active ?? existingAccount.active,
        account_type: account_type ?? existingAccount.account_type,
        initial_amount: initial_amount ?? existingAccount.initial_amount,
        usability: usability ?? existingAccount.usability,
        group_id: group_id !== undefined ? group_id : existingAccount.group_id,
        updated_at: new Date(),
        updated_by: user.user_id,
      },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Account updated successfully', updatedAccount)
    );
  } catch (error) {
    console.error('Update account error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}

/**
 * DELETE /api/v1/accounts/:id
 * Delete account
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Check if account exists and belongs to user
    const existingAccount = await db.accounts.findFirst({
      where: {
        id: params.id,
        user_id: user.user_id,
      },
    });

    if (!existingAccount) {
      return jsonResponse(
        ApiResponseBuilder.error('Account not found'),
        404
      );
    }

    // Delete account
    await db.accounts.delete({
      where: { id: params.id },
    });

    return jsonResponse(
      ApiResponseBuilder.success('Account deleted successfully', {
        id: params.id,
      })
    );
  } catch (error) {
    console.error('Delete account error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
```

### 3.3 Swap Account Order (`app/api/v1/accounts/swap-order/route.ts`)

**⚠️ Critical: Handling Unique Constraint on (user_id, personal_id)**

When swapping order, we must avoid violating the unique constraint. Here's why:

```
❌ WRONG APPROACH (Direct Update):
Account A: personal_id = 1 → Update to 2 (FAILS! B already has 2)
Account B: personal_id = 2 → Update to 1
Account C: personal_id = 3 → Update to 3

✅ CORRECT APPROACH (Two-Phase Update):
Phase 1 - Temporary negative values:
  Account A: personal_id = 1 → -1  ✓
  Account B: personal_id = 2 → -2  ✓
  Account C: personal_id = 3 → -3  ✓

Phase 2 - Final values:
  Account A: personal_id = -1 → 2  ✓
  Account B: personal_id = -2 → 1  ✓
  Account C: personal_id = -3 → 3  ✓
```

```typescript
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';
import { requireAuth } from '@/lib/auth';

/**
 * PUT /api/v1/accounts/swap-order
 * Batch update account personal_id order
 * 
 * IMPORTANT: Handles unique constraint (user_id, personal_id) by using 
 * a two-phase update: temporary values first, then final values
 */
export async function PUT(request: NextRequest) {
  try {
    // Require authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    const { user } = authResult;

    // Parse request body
    const body = await request.json();
    const { order_map } = body;

    // Validation
    if (!order_map || !Array.isArray(order_map)) {
      return jsonResponse(
        ApiResponseBuilder.error('order_map is required and must be an array'),
        400
      );
    }

    // Validate all accounts belong to user
    const accountIds = order_map.map((item: { id: string; personal_id: number }) => item.id);
    const userAccounts = await db.accounts.findMany({
      where: {
        id: { in: accountIds },
        user_id: user.user_id,
      },
      select: { id: true },
    });

    if (userAccounts.length !== accountIds.length) {
      return jsonResponse(
        ApiResponseBuilder.error('One or more accounts not found or unauthorized'),
        404
      );
    }

    /**
     * Two-phase update to avoid unique constraint violations
     * Phase 1: Set all to temporary negative values
     * Phase 2: Set to final positive values
     * 
     * Example problem:
     * - Account A has personal_id = 1
     * - Account B has personal_id = 2
     * - Want to swap: A->2, B->1
     * - Direct update A to 2 fails (B already has 2!)
     * 
     * Solution:
     * - Phase 1: A->(-1), B->(-2)  [no conflicts]
     * - Phase 2: A->2, B->1         [no conflicts]
     */
    await db.$transaction(async (tx) => {
      // Phase 1: Update to temporary negative values
      // This avoids unique constraint violations
      for (let i = 0; i < order_map.length; i++) {
        const item = order_map[i];
        await tx.accounts.updateMany({
          where: {
            id: item.id,
            user_id: user.user_id,
          },
          data: {
            personal_id: -(i + 1), // Temporary negative value
            updated_at: new Date(),
            updated_by: user.user_id,
          },
        });
      }

      // Phase 2: Update to final positive values
      for (const item of order_map) {
        await tx.accounts.updateMany({
          where: {
            id: item.id,
            user_id: user.user_id,
          },
          data: {
            personal_id: item.personal_id,
            updated_at: new Date(),
            updated_by: user.user_id,
          },
        });
      }
    });

    return jsonResponse(
      ApiResponseBuilder.success('Account swaped successfully', null)
    );
  } catch (error) {
    console.error('Swap order error:', error);
    return jsonResponse(
      ApiResponseBuilder.error('Internal server error'),
      500
    );
  }
}
```

---

## 4. TypeScript Types

### 4.1 API Types (`types/api.ts`)

```typescript
/**
 * Standard API Response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  meta: {
    version: string;
    timestamp: number;
  } | null;
  errors?: any;
}

/**
 * Auth Types
 */
export interface RegisterRequest {
  email: string;
  name: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email_or_username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    created_at: string;
    created_by: string | null;
    updated_at: string | null;
    updated_by: string | null;
  };
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  expired_at: string;
  refresh_token: string;
  refreshable_until: string;
}

/**
 * Account Types
 */
export interface CreateAccountRequest {
  personal_id: number;
  name: string;
  icon: string;
  color: string;
  active: boolean;
  account_type: string;
  initial_amount?: number;
  usability: string;
  group_id?: string | null;
}

export interface UpdateAccountRequest {
  name?: string;
  icon?: string;
  color?: string;
  active?: boolean;
  account_type?: string;
  initial_amount?: number;
  usability?: string;
  group_id?: string | null;
}

export interface SwapOrderRequest {
  order_map: Array<{
    id: string;
    personal_id: number;
  }>;
}
```

---

## 5. Client-Side Service Layer

### 5.1 API Client (`services/apiClient.ts`)

```typescript
import type { ApiResponse } from '@/types/api';

class ApiClient {
  private baseURL: string;
  private accessToken: string | null = null;

  constructor(baseURL: string = '/api/v1') {
    this.baseURL = baseURL;
    // Load token from localStorage on client-side
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
    }
  }

  setAccessToken(token: string) {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  clearTokens() {
    this.accessToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      ...options.headers,
    };

    // Add Authorization header if token exists
    if (this.accessToken && !endpoint.includes('/auth/')) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Add Content-Type for JSON requests
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data: ApiResponse<T> = await response.json();

      // Handle unauthorized (token expired)
      if (response.status === 401 && this.accessToken) {
        // Try to refresh token
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry original request
          return this.request<T>(endpoint, options);
        } else {
          // Refresh failed, clear tokens and redirect to login
          this.clearTokens();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
      }

      return data;
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async postFormData<T>(
    endpoint: string,
    data: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      formData.append(key, value);
    });

    return this.request<T>(endpoint, {
      method: 'POST',
      body: formData,
    });
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async refreshToken(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
      const response = await this.postFormData('/auth/refresh', {
        refresh_token: refreshToken,
      });

      if (response.success && response.data) {
        this.setAccessToken(response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }
}

export const apiClient = new ApiClient();
```

### 5.2 Auth Service (`services/authService.ts`)

```typescript
import { apiClient } from './apiClient';
import type {
  RegisterRequest,
  LoginRequest,
  LoginResponse,
  ApiResponse,
} from '@/types/api';

export const authService = {
  async register(data: RegisterRequest): Promise<ApiResponse<any>> {
    return apiClient.postFormData('/auth/register', data);
  },

  async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.postFormData<LoginResponse>(
      '/auth/login',
      data
    );

    // Store tokens on successful login
    if (response.success && response.data) {
      apiClient.setAccessToken(response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }

    return response;
  },

  async logout(): Promise<ApiResponse<null>> {
    const response = await apiClient.post<null>('/auth/logout', {});
    apiClient.clearTokens();
    return response;
  },

  async refreshToken(): Promise<boolean> {
    return apiClient.refreshToken();
  },
};
```

### 5.3 Account Service (`services/accountService.ts`)

```typescript
import { apiClient } from './apiClient';
import type {
  CreateAccountRequest,
  UpdateAccountRequest,
  SwapOrderRequest,
  ApiResponse,
} from '@/types/api';
import type { Account } from '@/types/database';

export const accountService = {
  async list(keyword: string = ''): Promise<ApiResponse<Account[]>> {
    const query = keyword ? `?keyword=${encodeURIComponent(keyword)}` : '';
    return apiClient.get<Account[]>(`/accounts${query}`);
  },

  async getById(id: string): Promise<ApiResponse<Account>> {
    return apiClient.get<Account>(`/accounts/${id}`);
  },

  async create(data: CreateAccountRequest): Promise<ApiResponse<Account>> {
    return apiClient.post<Account>('/accounts', data);
  },

  async update(
    id: string,
    data: UpdateAccountRequest
  ): Promise<ApiResponse<Account>> {
    return apiClient.put<Account>(`/accounts/${id}`, data);
  },

  async delete(id: string): Promise<ApiResponse<{ id: string }>> {
    return apiClient.delete<{ id: string }>(`/accounts/${id}`);
  },

  async swapOrder(data: SwapOrderRequest): Promise<ApiResponse<null>> {
    return apiClient.put<null>('/accounts/swap-order', data);
  },
};
```

---

## 6. Environment Variables

Create `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/finance_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-in-production"

# API
API_VERSION="v1.0.0"
NEXT_PUBLIC_API_BASE_URL="/api/v1"
```

---

## 7. Dependencies to Install

```bash
# Core dependencies
npm install @prisma/client prisma
npm install bcryptjs
npm install jose # JWT library for Next.js

# Type definitions
npm install -D @types/bcryptjs
```

---

## 8. Testing Checklist

### Authentication
- [ ] Register with valid data
- [ ] Register with duplicate email/username (should fail)
- [ ] Login with email
- [ ] Login with username
- [ ] Login with invalid credentials (should fail)
- [ ] Access protected route without token (should fail)
- [ ] Access protected route with valid token
- [ ] Refresh token with valid refresh_token
- [ ] Refresh token with invalid refresh_token (should fail)
- [ ] Logout

### Accounts
- [ ] Create account with valid data
- [ ] List accounts (empty)
- [ ] List accounts with data
- [ ] Search accounts with keyword
- [ ] Get account by ID
- [ ] Get non-existent account (should fail)
- [ ] Update account
- [ ] Swap account order
- [ ] Delete account
- [ ] Delete non-existent account (should fail)

---

## 9. Migration Steps

1. **Set up Prisma**
   ```bash
   npx prisma init
   npx prisma db pull
   npx prisma generate
   ```

2. **Create utilities**
   - Create `lib/api-response.ts`
   - Create `lib/auth.ts`
   - Create `lib/db.ts`

3. **Implement auth endpoints**
   - Create register route
   - Create login route
   - Create refresh route
   - Create logout route
   - Test all endpoints

4. **Implement account endpoints**
   - Create list/create route
   - Create detail/update/delete route
   - Create swap-order route
   - Test all endpoints

5. **Create client services**
   - Create API client
   - Create auth service
   - Create account service
   - Test from frontend

6. **Repeat for other resources**
   - Categories
   - Transactions
   - Transfers
   - Debts
   - Groups

---

## 10. Best Practices

1. **Security**
   - Always validate user ownership before updates/deletes
   - Use `requireAuth` middleware consistently
   - Hash passwords with bcrypt (12 rounds minimum)
   - Use HTTPS in production
   - Validate all input data
   - Sanitize error messages (don't leak sensitive info)

2. **Error Handling**
   - Use try-catch blocks in all route handlers
   - Log errors server-side
   - Return consistent error format
   - Use appropriate HTTP status codes

3. **Database**
   - Use transactions for multi-step operations
   - Always filter by user_id for data isolation
   - Use prepared statements (Prisma handles this)
   - Index frequently queried fields
   - **Handle unique constraints carefully**: When swapping/reordering records with unique constraints (like `user_id, personal_id`), use a two-phase update:
     1. Phase 1: Update all to temporary values (e.g., negative numbers)
     2. Phase 2: Update to final values
     This prevents constraint violations during batch updates

4. **Performance**
   - Cache personal_id on client-side
   - Use pagination for large lists
   - Lazy load related data
   - Optimize database queries

5. **Code Organization**
   - Keep route handlers thin
   - Move business logic to services
   - Reuse utility functions
   - Type everything with TypeScript

---

## Next Steps

After implementing accounts, follow the same pattern for:
1. **Categories** (with parent-child relationships)
2. **Transactions** (core feature)
3. **Transfers** (creates 2 linked transactions)
4. **Debts** (debt tracking)
5. **Groups** (account grouping)

Each resource will follow the same structure:
- `GET /api/v1/:resource` - List
- `POST /api/v1/:resource` - Create
- `GET /api/v1/:resource/:id` - Detail
- `PUT /api/v1/:resource/:id` - Update
- `DELETE /api/v1/:resource/:id` - Delete
- Additional endpoints as needed (swap-order, tree structure, etc.)

### Important Notes for Other Resources

**When implementing swap-order for other resources (categories, transactions, etc.):**
- All tables have unique constraint on `(user_id, personal_id)`
- Always use the two-phase update pattern shown in accounts/swap-order
- Phase 1: Temporary negative values
- Phase 2: Final positive values
- This prevents unique constraint violations

**Example tables that need swap-order endpoints:**
- Categories: For reordering category display order
- Transactions: For manual sorting of transactions on same date
- Transfers: For display order
- Debts: For priority ordering
- Groups: For display order
