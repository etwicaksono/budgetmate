# Refactor Plan - Phased Migration to Full-Stack Next.js

> **For AI Agents**: This plan is designed to be followed step-by-step. Complete each phase before moving to the next. All conflicts have been analyzed and resolved. See `CONFLICTS_ANALYSIS.md` for detailed conflict resolution rationale.

## Table of Contents
1. [Conflicts Analysis & Resolution](#conflicts-analysis--resolution)
2. [Implementation Phases](#phased-refactor-plan)
3. [Detailed Phase Instructions](#detailed-phase-0-foundation-setup)
4. [Testing & Verification](#testing-strategy)
5. [Troubleshooting](#troubleshooting-guide)

## Pre-Implementation Checklist

Before starting any phase:
- [ ] Read `CONFLICTS_ANALYSIS.md` for complete conflict context
- [ ] Ensure you have database credentials (can find at [Go .env](.env))
- [ ] Ensure Next.js project is initialized
- [ ] Confirm Node.js version (>=18.x recommended)
- [X] Backup existing code

---

## Conflicts Analysis & Resolution

> **Note**: All 10 conflicts identified have been analyzed and resolved in `CONFLICTS_ANALYSIS.md`. Below is the summary of resolutions to apply.

### 🔴 Critical Conflicts Found

#### 1. **Response Format Inconsistency**

**Conflict:**
- **API_IMPLEMENTATION_GUIDE.md**: Uses wrapped responses `{success, message, data, meta}`
- **DATABASE_SCHEMA_GUIDE.md**: Returns raw data directly
- **route.ts**: Returns raw data directly
- **httpClient.ts**: Expects raw responses
- **Implemented API**: Uses wrapped format

**Resolution:** 
✅ **Use API_IMPLEMENTATION_GUIDE approach** (matches implemented API)
- All responses wrapped in `{success, message, data, meta}`
- Update DATABASE_SCHEMA_GUIDE examples
- Update route.ts examples
- Create adapter for httpClient or replace with apiClient

---

#### 2. **HTTP Client Mismatch**

**Conflict:**
- **API_IMPLEMENTATION_GUIDE.md**: Uses `apiClient` with response unwrapping
- **DATABASE_SCHEMA_GUIDE.md**: Uses `httpClient` expecting raw responses
- **httpClient.ts**: Simple client, returns raw
- **transactionService.updated.ts**: Uses `httpClient`

**Resolution:**
✅ **Keep httpClient, add response unwrapping adapter**
```typescript
// Update httpClient to handle wrapped responses
export const httpClient = {
  get: async <T>(endpoint: string, config?: RequestConfig): Promise<T> => {
    const response = await fetchWithErrorHandling<ApiResponse<T>>(endpoint, {
      ...config,
      method: 'GET',
    });
    return response.data!; // Unwrap data from {success, message, data, meta}
  },
  // ... same for post, put, delete
};
```

---

#### 3. **Authentication Token Structure**

**Conflict:**
- **API_IMPLEMENTATION_GUIDE**: `access_token` + `refresh_token` (JWT with jose)
- **Implemented API**: `access_token` + `refresh_token`
- **database.ts LoginResponse**: Single `token` field
- **httpClient.ts**: Stores single `token` in localStorage

**Resolution:**
✅ **Use dual-token system** (matches implemented API)
- Update httpClient to use `access_token`
- Add refresh token logic
- Update database.ts LoginResponse type
- Store both tokens in localStorage

---

#### 4. **URL Structure**

**Conflict:**
- **API_IMPLEMENTATION_GUIDE**: `/api/v1/*`
- **Implemented API**: `/api/v1/*`
- **DATABASE_SCHEMA_GUIDE examples**: `/api/*`
- **httpClient**: Uses configurable `API_BASE_URL`

**Resolution:**
✅ **Use `/api/v1/*` structure** (matches implemented API)
- Set `API_BASE_URL = '/api/v1'` in config
- Update all examples in DATABASE_SCHEMA_GUIDE
- All routes under `app/api/v1/`

---

#### 5. **Outdated Documentation**

**Conflict:**
- **READ_ME_FIRST.txt**: Says position is REQUIRED in transactions (❌ outdated)
- **route.ts**: Validates position as required (❌ outdated)
- **transactionService comment**: Says position required (❌ outdated)
- **SCHEMA_UPDATE_SUMMARY.txt**: Correctly says position is nullable ✅

**Resolution:**
✅ **Update all outdated docs**
- Update READ_ME_FIRST.txt
- Update route.ts validation
- Update transactionService comments
- Mark as deprecated/use API_IMPLEMENTATION_GUIDE instead

---

#### 6. **personal_id Handling**

**Conflict:**
- **API_IMPLEMENTATION_GUIDE**: Client sends personal_id (from cache)
- **Implemented API**: Client sends personal_id in request body
- **route.ts**: Server generates personal_id (queries DB)
- **DATABASE_SCHEMA_GUIDE**: Shows caching strategy ✅

**Resolution:**
✅ **Client-side caching** (as per latest updates)
- Client maintains cache, sends personal_id in request
- Server trusts client-provided personal_id
- Server returns max_personal_id in list responses
- Update route.ts to use client-provided value

---

## Phased Refactor Plan

### Phase 0: Foundation Setup (Infrastructure)

**Goal**: Set up core infrastructure and resolve conflicts

**Duration**: 1-2 days

**Tasks**:
1. ✅ Install dependencies
   ```bash
   npm install @prisma/client prisma bcryptjs jose
   npm install -D @types/bcryptjs
   ```

2. ✅ Setup Prisma
   ```bash
   npx prisma init
   npx prisma db pull
   npx prisma generate
   ```

3. ✅ Create core utilities
   - `lib/db.ts` - Prisma client
   - `lib/api-response.ts` - Response wrapper
   - `lib/auth.ts` - JWT utilities (jose)
   - `types/api.ts` - API request/response types

4. ✅ Update httpClient
   - Add API response unwrapping
   - Add dual-token support (access + refresh)
   - Add auto-refresh logic
   - Update to use `/api/v1` base URL

5. ✅ Environment setup
   ```bash
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret-key
   API_VERSION=v1.0.0
   NEXT_PUBLIC_API_BASE_URL=/api/v1
   ```

**Deliverables**:
- ✅ Prisma configured and connected
- ✅ Core utilities created
- ✅ httpClient updated for new API format
- ✅ Environment variables set

---

### Phase 1: Authentication System

**Goal**: Implement complete auth flow

**Duration**: 2-3 days

**Priority**: HIGH (Required for all other endpoints)

**Endpoints to implement**:
1. `POST /api/v1/auth/register` - User registration
2. `POST /api/v1/auth/login` - User login (dual tokens)
3. `POST /api/v1/auth/refresh` - Refresh access token
4. `POST /api/v1/auth/logout` - Logout

**Tasks**:
1. Create route handlers:
   - `app/api/v1/auth/register/route.ts`
   - `app/api/v1/auth/login/route.ts`
   - `app/api/v1/auth/refresh/route.ts`
   - `app/api/v1/auth/logout/route.ts`

2. Create auth service (client-side):
   - `services/authService.ts`
   - Handle token storage
   - Handle auto-refresh

3. Update database.ts types:
   - Fix LoginResponse to include access_token + refresh_token
   - Add RefreshTokenResponse type

4. Testing:
   - Test register flow
   - Test login with email
   - Test login with username
   - Test token refresh
   - Test logout
   - Test protected endpoints

**Deliverables**:
- ✅ Complete authentication system
- ✅ JWT token generation & verification
- ✅ Automatic token refresh
- ✅ All auth endpoints tested

**Dependencies**: Phase 0 must be complete

---

### Phase 2: Account Management

**Goal**: Implement account CRUD + ordering

**Duration**: 2-3 days

**Priority**: HIGH (Core feature, needed for transactions)

**Endpoints to implement**:
1. `GET /api/v1/accounts` - List accounts (with keyword search)
2. `POST /api/v1/accounts` - Create account
3. `GET /api/v1/accounts/:id` - Get account detail
4. `PUT /api/v1/accounts/:id` - Update account
5. `DELETE /api/v1/accounts/:id` - Delete account
6. `PUT /api/v1/accounts/swap-order` - Reorder accounts

**Tasks**:
1. Create route handlers:
   - `app/api/v1/accounts/route.ts` (list + create)
   - `app/api/v1/accounts/[id]/route.ts` (get + update + delete)
   - `app/api/v1/accounts/swap-order/route.ts` (reorder)

2. Create account service (client-side):
   - `services/accountService.ts`
   - Implement personal_id caching
   - All CRUD operations
   - Swap order operation

3. Implement personal_id caching:
   - Client caches `max_account_personal_id`
   - GET returns max_personal_id in meta
   - POST uses cached value

4. Testing:
   - Create account with all field types
   - List accounts (empty, with data, with search)
   - Update account fields
   - Swap account order (test unique constraint handling)
   - Delete account
   - Test account balance calculation

**Deliverables**:
- ✅ Complete account management
- ✅ personal_id caching implemented
- ✅ Swap order with two-phase update
- ✅ All account endpoints tested

**Dependencies**: Phase 1 (Auth) must be complete

---

### Phase 3: Category Management

**Goal**: Implement category CRUD + hierarchy

**Duration**: 2-3 days

**Priority**: HIGH (Needed for transactions)

**Endpoints to implement**:
1. `GET /api/v1/categories` - List categories
2. `GET /api/v1/categories/tree` - Get category hierarchy
3. `POST /api/v1/categories` - Create category
4. `GET /api/v1/categories/:id` - Get category detail
5. `PUT /api/v1/categories/:id` - Update category
6. `DELETE /api/v1/categories/:id` - Delete category
7. `PUT /api/v1/categories/swap-order` - Reorder categories

**Tasks**:
1. Create route handlers:
   - `app/api/v1/categories/route.ts` (list + create)
   - `app/api/v1/categories/tree/route.ts` (hierarchy)
   - `app/api/v1/categories/[id]/route.ts` (get + update + delete)
   - `app/api/v1/categories/swap-order/route.ts` (reorder)

2. Create category service (client-side):
   - `services/categoryService.ts`
   - Implement personal_id caching
   - Tree structure handling

3. Implement hierarchy logic:
   - Recursive tree building
   - Parent-child validation
   - Prevent circular references

4. Testing:
   - Create root category
   - Create child category
   - Get category tree
   - Update category parent
   - Swap category order
   - Delete category (check children)

**Deliverables**:
- ✅ Complete category management
- ✅ Hierarchical tree structure
- ✅ Category nature support (NEED/WANT/MUST)
- ✅ All category endpoints tested

**Dependencies**: Phase 1 (Auth) must be complete

---

### Phase 4: Group Management (Optional)

**Goal**: Implement account grouping

**Duration**: 1 day

**Priority**: MEDIUM (Optional feature)

**Endpoints to implement**:
1. `GET /api/v1/groups` - List groups
2. `POST /api/v1/groups` - Create group
3. `GET /api/v1/groups/:id` - Get group detail
4. `PUT /api/v1/groups/:id` - Update group
5. `DELETE /api/v1/groups/:id` - Delete group

**Tasks**:
1. Create route handlers
2. Create group service
3. Implement personal_id caching
4. Test all operations

**Deliverables**:
- ✅ Complete group management
- ✅ Account-to-group linking

**Dependencies**: Phase 2 (Accounts) must be complete

---

### Phase 5: Transaction Management

**Goal**: Implement transaction CRUD + filtering

**Duration**: 3-4 days

**Priority**: CRITICAL (Core feature)

**Endpoints to implement**:
1. `GET /api/v1/transactions` - List with filters
2. `POST /api/v1/transactions` - Create transaction
3. `GET /api/v1/transactions/:id` - Get transaction detail
4. `PUT /api/v1/transactions/:id` - Update transaction
5. `DELETE /api/v1/transactions/:id` - Delete transaction
6. `GET /api/v1/transactions/summary` - Statistics
7. `POST /api/v1/transactions/bulk-delete` - Bulk delete
8. `PUT /api/v1/transactions/swap-order` - Reorder

**Tasks**:
1. Create route handlers:
   - `app/api/v1/transactions/route.ts` (list + create)
   - `app/api/v1/transactions/[id]/route.ts` (get + update + delete)
   - `app/api/v1/transactions/summary/route.ts` (statistics)
   - `app/api/v1/transactions/bulk-delete/route.ts` (bulk ops)
   - `app/api/v1/transactions/swap-order/route.ts` (reorder)

2. Update transaction service:
   - Fix to use new API response format
   - Implement personal_id caching
   - Add all filters support
   - Update comment (position is nullable)

3. Implement filtering:
   - account_id, category_id, type
   - Date range (start_date, end_date)
   - Amount range (min_amount, max_amount)
   - Text search in notes
   - Pagination (limit, offset)

4. Implement statistics:
   - Total income/expenses
   - Net balance
   - By category breakdown
   - By account breakdown

5. Testing:
   - Create transaction (INCOME/EXPENSE)
   - List with all filter combinations
   - Update transaction
   - Delete transaction
   - Bulk delete
   - Get summary/statistics
   - Swap order

**Deliverables**:
- ✅ Complete transaction management
- ✅ Advanced filtering
- ✅ Statistics/summary
- ✅ Bulk operations
- ✅ All transaction endpoints tested

**Dependencies**: Phase 2 (Accounts) + Phase 3 (Categories) must be complete

---

### Phase 6: Transfer Management

**Goal**: Implement transfer system with linked transactions

**Duration**: 2-3 days

**Priority**: HIGH (Important feature)

**Endpoints to implement**:
1. `GET /api/v1/transfers` - List transfers
2. `POST /api/v1/transfers` - Create transfer (+ 2 transactions)
3. `GET /api/v1/transfers/:id` - Get transfer detail
4. `PUT /api/v1/transfers/:id` - Update transfer (+ linked transactions)
5. `DELETE /api/v1/transfers/:id` - Delete transfer (+ linked transactions)

**Tasks**:
1. Create route handlers:
   - `app/api/v1/transfers/route.ts` (list + create)
   - `app/api/v1/transfers/[id]/route.ts` (get + update + delete)

2. Create transfer service:
   - `services/transferService.ts`
   - Implement personal_id caching

3. Implement complex logic:
   - Create transfer → Create 2 transactions (EXPENSE + INCOME)
   - Update transfer → Update 2 transactions
   - Delete transfer → Delete 2 transactions
   - All operations in database transaction

4. Testing:
   - Create transfer between accounts
   - Verify 2 transactions created
   - Verify transfer_id links
   - Update transfer amount
   - Delete transfer
   - Check account balances

**Deliverables**:
- ✅ Complete transfer management
- ✅ Automatic transaction creation
- ✅ Atomicity guaranteed
- ✅ All transfer endpoints tested

**Dependencies**: Phase 5 (Transactions) must be complete

---

### Phase 7: Debt Management (Optional)

**Goal**: Implement debt tracking

**Duration**: 1-2 days

**Priority**: LOW (Optional feature)

**Endpoints to implement**:
1. `GET /api/v1/debts` - List debts
2. `POST /api/v1/debts` - Create debt
3. `GET /api/v1/debts/:id` - Get debt detail
4. `PUT /api/v1/debts/:id` - Update debt
5. `DELETE /api/v1/debts/:id` - Delete debt

**Tasks**:
1. Create route handlers
2. Create debt service
3. Link to transactions
4. Test all operations

**Deliverables**:
- ✅ Complete debt management
- ✅ Transaction linking

**Dependencies**: Phase 5 (Transactions) must be complete

---

### Phase 8: Documentation & Cleanup

**Goal**: Update all docs, remove conflicts, finalize

**Duration**: 1 day

**Priority**: MEDIUM

**Tasks**:
1. Update all outdated files:
   - ✅ UPDATE READ_ME_FIRST.txt (remove outdated info)
   - ✅ UPDATE route.ts (use new patterns)
   - ✅ UPDATE transactionService.updated.ts (fix comments)
   - ✅ UPDATE DATABASE_SCHEMA_GUIDE.md (align with API_IMPLEMENTATION_GUIDE)

2. Create unified guide:
   - Merge best practices from all guides
   - Single source of truth
   - Cross-reference between guides

3. Add missing documentation:
   - Error handling patterns
   - Testing strategies
   - Deployment guide

4. Remove deprecated patterns:
   - Old auth examples
   - Direct DB queries in services
   - Inconsistent response formats

**Deliverables**:
- ✅ All docs consistent
- ✅ No conflicting information
- ✅ Clear migration path

**Dependencies**: Phases 1-7 complete

---

## Detailed Phase 0: Foundation Setup

### Step 0.1: Install Dependencies

```bash
# Core dependencies
npm install @prisma/client prisma
npm install bcryptjs
npm install jose

# Dev dependencies
npm install -D @types/bcryptjs
npm install -D typescript
```

### Step 0.2: Setup Prisma

```bash
# Initialize Prisma
npx prisma init

# Pull schema from existing database
npx prisma db pull

# Generate Prisma Client
npx prisma generate
```

Create `lib/db.ts`:
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

### Step 0.3: Create Core Utilities

**File: `lib/api-response.ts`**
```typescript
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
  static success<T>(message: string, data: T | null = null): ApiResponse<T> {
    return {
      success: true,
      message,
      data,
      meta: {
        version: process.env.API_VERSION || 'v1.0.0',
        timestamp: Math.floor(Date.now() / 1000),
      },
    };
  }

  static error(message: string, errors: any = null): ApiResponse<null> {
    return {
      success: false,
      message,
      data: null,
      meta: null,
      errors,
    };
  }
}

export function jsonResponse<T>(response: ApiResponse<T>, statusCode: number = 200) {
  return Response.json(response, { status: statusCode });
}
```

**File: `lib/auth.ts`**
```typescript
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key'
);

export interface JWTPayload {
  user_id: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

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

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

export async function requireAuth(
  request: Request
): Promise<{ user: JWTPayload } | { error: Response }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      error: Response.json(
        { success: false, message: 'Unauthorized', data: null, meta: null },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.substring(7);
  const user = await verifyToken(token);

  if (!user) {
    return {
      error: Response.json(
        { success: false, message: 'Invalid token', data: null, meta: null },
        { status: 401 }
      ),
    };
  }

  return { user };
}
```

### Step 0.4: Update httpClient for New API Format

**File: `httpClient.ts` (COMPLETE UPDATED VERSION)**

Replace the entire file with this updated version:

```typescript
/**
 * Core API Client Base - UPDATED FOR WRAPPED RESPONSES
 * 
 * This module provides the foundational HTTP client functionality.
 * Changes from original:
 * - Unwraps {success, message, data, meta} responses
 * - Uses access_token + refresh_token (dual-token system)
 * - Auto-refresh on 401
 * - Base URL defaults to /api/v1
 */

import { config } from '@/config';

// Configuration - UPDATED: Default to /api/v1
const API_BASE_URL = config.apiBaseUrl || '/api/v1';

// ADDED: API Response wrapper type
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  meta: {
    version: string;
    timestamp: number;
    [key: string]: any; // Allow additional meta fields
  } | null;
  errors?: any;
}

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
 * Core fetch wrapper with error handling - UPDATED
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
  
  // UPDATED: Only set JSON Content-Type for non-FormData bodies
  if (!headers.has('Content-Type') && fetchConfig.body) {
    if (!(fetchConfig.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    // FormData sets its own Content-Type with boundary
  }

  // UPDATED: Add auth token if available (changed key)
  const token = localStorage.getItem('access_token'); // Changed from 'token'
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...fetchConfig,
      headers,
    });

    // UPDATED: Handle 401 with token refresh
    if (response.status === 401 && token) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        // Retry with new token
        return fetchWithErrorHandling<T>(endpoint, config);
      } else {
        // Refresh failed, clear tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    // Handle non-OK responses
    if (!response.ok) {
      let errorMessage = `Request failed with status ${response.status}`;
      let errorDetails: unknown;

      try {
        // UPDATED: Expect wrapped error response
        const errorData: ApiResponse<any> = await response.json();
        errorMessage = errorData.message || errorMessage;
        errorDetails = errorData.errors || errorData;
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

    // UPDATED: Parse wrapped response and unwrap data
    const responseData: ApiResponse<T> = await response.json();
    
    // Check if response is successful
    if (!responseData.success) {
      throw new ApiException(
        responseData.message,
        response.status,
        responseData.errors
      );
    }
    
    // Unwrap and return data only
    return responseData.data as T;
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
 * ADDED: Token refresh function
 */
async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;

  try {
    const formData = new FormData();
    formData.append('refresh_token', refreshToken);

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const data: ApiResponse<{
        access_token: string;
        refresh_token: string;
      }> = await response.json();

      if (data.success && data.data) {
        localStorage.setItem('access_token', data.data.access_token);
        localStorage.setItem('refresh_token', data.data.refresh_token);
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
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
```

**Verification Step:**
```bash
# Ensure no TypeScript errors
npx tsc --noEmit
```

### Step 0.5: Update Types

**File: `types/api.ts` (CREATE)**
```typescript
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

// All request/response types from API_IMPLEMENTATION_GUIDE.md
```

**File: `database.ts` (UPDATE)**
```typescript
// Update LoginResponse
export interface LoginResponse {
  access_token: string;      // Changed from 'token'
  refresh_token: string;     // Added
  user: UserProfile;
}

// Add RefreshTokenResponse
export interface RefreshTokenResponse {
  access_token: string;
  expired_at: string;
  refresh_token: string;
  refreshable_until: string;
}
```

### Step 0.6: Environment Variables

**File: `.env.local` (CREATE)**
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/finance_db"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
API_VERSION="v1.0.0"
NEXT_PUBLIC_API_BASE_URL="/api/v1"
```

---

## Implementation Priority Matrix

### Must Have (Phase 0-3)
- ✅ Phase 0: Foundation
- ✅ Phase 1: Authentication
- ✅ Phase 2: Accounts
- ✅ Phase 3: Categories

### Should Have (Phase 5-6)
- ✅ Phase 5: Transactions
- ✅ Phase 6: Transfers

### Nice to Have (Phase 4, 7, 8)
- 🔵 Phase 4: Groups
- 🔵 Phase 7: Debts
- 🔵 Phase 8: Documentation

---

## Files to Update/Create Summary

### Create New Files (✨ New)
```
✨ lib/api-response.ts          - Response wrapper utilities
✨ lib/auth.ts                   - JWT auth utilities
✨ lib/db.ts                     - Prisma client
✨ types/api.ts                  - API request/response types
✨ app/api/v1/auth/*            - Auth endpoints (4 files)
✨ app/api/v1/accounts/*        - Account endpoints (3 files)
✨ app/api/v1/categories/*      - Category endpoints (4 files)
✨ app/api/v1/transactions/*    - Transaction endpoints (5 files)
✨ app/api/v1/transfers/*       - Transfer endpoints (2 files)
✨ app/api/v1/groups/*          - Group endpoints (2 files)
✨ app/api/v1/debts/*           - Debt endpoints (2 files)
✨ services/authService.ts      - Client auth service
✨ services/accountService.ts   - Client account service
✨ services/categoryService.ts  - Client category service
✨ services/transactionService.ts - Client transaction service
✨ services/transferService.ts  - Client transfer service
✨ .env.local                    - Environment variables
```

### Update Existing Files (📝 Update)
```
📝 httpClient.ts                - Add API response unwrapping + dual tokens
📝 database.ts                  - Fix LoginResponse type
📝 transactionService.updated.ts - Fix outdated comments
📝 route.ts                     - Update to new patterns (or deprecate)
📝 READ_ME_FIRST.txt            - Update outdated info
📝 DATABASE_SCHEMA_GUIDE.md     - Align examples with API_IMPLEMENTATION_GUIDE
```

### Keep As-Is (✅ Already Correct)
```
✅ API_IMPLEMENTATION_GUIDE.md  - Primary implementation reference
✅ SCHEMA_UPDATE_SUMMARY.txt    - Correctly updated
✅ Database schema docs         - Correctly updated
```

---

## Critical Decision Points

### Decision 1: Response Format
**✅ DECIDED**: Use wrapped format `{success, message, data, meta}`
- Matches implemented Go API
- Consistent error handling
- Easier client-side error handling

### Decision 2: HTTP Client
**✅ DECIDED**: Update existing httpClient.ts
- Add response unwrapping
- Add dual-token support  
- Add auto-refresh logic
- Avoid creating duplicate clients

### Decision 3: URL Structure
**✅ DECIDED**: Use `/api/v1/*`
- Matches implemented API
- Allows versioning
- Clean structure

### Decision 4: personal_id Handling
**✅ DECIDED**: Client-side caching
- Client sends personal_id in request body
- Server returns max_personal_id in GET meta
- No DB queries for sequence generation

### Decision 5: position Field
**✅ DECIDED**: Always `null` for now
- Nullable in all tables
- Google Sheets sync not yet implemented
- Document future format

---

## Testing Strategy

### Unit Tests
- Utility functions (API response, JWT)
- Validation functions
- Helper functions

### Integration Tests
- Each endpoint with valid data
- Each endpoint with invalid data
- Authentication flow end-to-end
- Token refresh flow
- Error scenarios

### E2E Tests
- Complete user journey
- Create account → Create category → Create transaction
- Transfer between accounts
- Update and delete operations

---

## Rollback Plan

### Per Phase Rollback
- Keep old Go API running during migration
- Test each phase thoroughly before next
- Can rollback by reverting commits

### Feature Flags (Optional)
```typescript
// Use feature flags to toggle between old/new API
const USE_NEW_API = process.env.NEXT_PUBLIC_USE_NEW_API === 'true';

export const apiBaseUrl = USE_NEW_API 
  ? '/api/v1' 
  : 'http://localhost:8080/api/v1';
```

---

## Success Criteria

### Phase 0 Success Criteria
- [ ] Prisma connected to database
- [ ] All utilities created
- [ ] httpClient updated
- [ ] Environment variables set
- [ ] Can query database with Prisma

### Phase 1 Success Criteria
- [ ] Can register new user
- [ ] Can login with email/username
- [ ] Tokens stored correctly
- [ ] Protected routes work
- [ ] Token refresh works
- [ ] Logout clears tokens

### Phase 2 Success Criteria
- [ ] Can create account
- [ ] Can list accounts
- [ ] Can search accounts
- [ ] Can update account
- [ ] Can swap order (without unique constraint errors)
- [ ] Can delete account
- [ ] personal_id caching works

### Phase 3 Success Criteria
- [ ] Can create root category
- [ ] Can create child category
- [ ] Category tree displays correctly
- [ ] Can update category hierarchy
- [ ] Can swap order
- [ ] Can delete category

### Phase 5 Success Criteria
- [ ] Can create transaction
- [ ] All filters work
- [ ] Statistics calculate correctly
- [ ] Can update transaction
- [ ] Can delete transaction
- [ ] Bulk operations work

### Phase 6 Success Criteria
- [ ] Transfer creates 2 transactions
- [ ] Both transactions linked correctly
- [ ] Update updates both transactions
- [ ] Delete deletes both transactions
- [ ] Account balances correct

---

## Estimated Timeline

```
Phase 0: Foundation       → 1-2 days    ██
Phase 1: Authentication   → 2-3 days    ████
Phase 2: Accounts         → 2-3 days    ████
Phase 3: Categories       → 2-3 days    ████
Phase 4: Groups (opt)     → 1 day       ██
Phase 5: Transactions     → 3-4 days    ██████
Phase 6: Transfers        → 2-3 days    ████
Phase 7: Debts (opt)      → 1-2 days    ██
Phase 8: Documentation    → 1 day       ██
                          ──────────────
Total:                     15-23 days   ████████████████████████
```

**Minimum viable (must-have only)**: 10-15 days  
**Full implementation**: 15-23 days

---

## Risk Assessment

### High Risk Items
1. **Unique Constraint on swap-order** ⚠️
   - **Risk**: Violating (user_id, personal_id) unique constraint
   - **Mitigation**: Two-phase update pattern implemented
   - **Impact**: All resources with swap-order

2. **Transfer Transaction Atomicity** ⚠️
   - **Risk**: Creating orphaned transactions if transfer fails
   - **Mitigation**: Use Prisma transactions ($transaction)
   - **Impact**: Data consistency

3. **Token Security** ⚠️
   - **Risk**: JWT secret exposure, weak passwords
   - **Mitigation**: Strong secret, bcrypt 12 rounds, HTTPS only
   - **Impact**: Security breach

### Medium Risk Items
1. **personal_id Cache Sync** ⚠️
   - **Risk**: Multiple devices, cache out of sync
   - **Mitigation**: Refresh on list fetch, handle conflicts
   - **Impact**: Unique constraint violation

2. **Migration Downtime** ⚠️
   - **Risk**: Service unavailable during migration
   - **Mitigation**: Run both APIs in parallel, gradual cutover
   - **Impact**: User experience

### Low Risk Items
1. **Google Sheets Integration** ℹ️
   - **Risk**: position field format changes
   - **Mitigation**: Already nullable, can evolve format
   - **Impact**: Future feature

---

## Quick Start Command

To begin migration immediately:

```bash
# Phase 0
npm install @prisma/client prisma bcryptjs jose
npm install -D @types/bcryptjs
npx prisma init
npx prisma db pull
npx prisma generate

# Create directories
mkdir -p lib types services app/api/v1/auth app/api/v1/accounts

# Copy utilities from API_IMPLEMENTATION_GUIDE.md
# 1. lib/api-response.ts
# 2. lib/auth.ts  
# 3. lib/db.ts
# 4. types/api.ts

# Then proceed with Phase 1 (Auth endpoints)
```

---

## Next Actions

**Immediate (Today)**:
1. Review this refactor plan
2. Confirm approach and priorities
3. Start Phase 0 if approved

**This Week**:
1. Complete Phase 0-1 (Foundation + Auth)
2. Test authentication flow
3. Begin Phase 2 (Accounts)

**Next Week**:
1. Complete Phase 2-3 (Accounts + Categories)
2. Begin Phase 5 (Transactions)

**Week 3**:
1. Complete Phase 5-6 (Transactions + Transfers)
2. Final testing
3. Documentation cleanup

---

## Questions to Answer Before Starting

1. **Should we keep both APIs running during migration?**
   - Recommended: Yes (gradual cutover)
   - Use feature flags to toggle

2. **Which phases are must-have vs nice-to-have?**
   - Must: 0, 1, 2, 3, 5
   - Optional: 4, 7
   - Cleanup: 8

3. **Do you want to implement all at once or incrementally?**
   - Recommended: Incrementally (1-2 phases per week)
   - Test each phase before moving forward

4. **Current frontend architecture?**
   - React? Next.js pages? Next.js app?
   - This affects service implementation

5. **Deployment strategy?**
   - Vercel? Self-hosted? Docker?
   - Affects environment setup

---

## Troubleshooting Guide

### Common Issues

#### Issue 1: TypeScript Errors in httpClient.ts
**Symptom**: `Cannot find module '@/config'` or `Cannot find name 'config'`

**Solution**:
```typescript
// If @/config doesn't exist, replace:
import { config } from '@/config';
const API_BASE_URL = config.apiBaseUrl || '/api/v1';

// With:
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';
```

#### Issue 2: localStorage not defined (Server-side rendering)
**Symptom**: `ReferenceError: localStorage is not defined`

**Solution**: Already handled in httpClient.ts with `typeof window` checks.

#### Issue 3: Prisma Client not generated
**Symptom**: `Cannot find module '@prisma/client'`

**Solution**:
```bash
npx prisma generate
```

#### Issue 4: Database connection errors
**Symptom**: `Can't reach database server`

**Solution**:
1. Verify DATABASE_URL in `.env`
2. Check database is running
3. Test connection: `npx prisma db pull`

#### Issue 5: Token refresh infinite loop
**Symptom**: Multiple refresh requests in network tab

**Solution**: Already handled in httpClient.ts - refresh only called once per 401, then redirects to login on failure.

#### Issue 6: CORS errors
**Symptom**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**:
```typescript
// In Next.js route handlers, add headers if needed:
return jsonResponse(response, 200, {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  }
});
```

#### Issue 7: Unique constraint violations on swap-order
**Symptom**: `duplicate key value violates unique constraint "accounts_user_id_personal_id_key"`

**Solution**: Ensure you're using the two-phase update pattern (see API_IMPLEMENTATION_GUIDE.md swap-order example).

---

## Verification Checklist

After completing all phases, verify:

### Phase 0 Verification
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit` shows no errors
- [ ] `npx prisma generate` succeeds
- [ ] `.env.local` has all required variables
- [ ] `lib/db.ts`, `lib/api-response.ts`, `lib/auth.ts` exist
- [ ] `httpClient.ts` updated with unwrapping logic

### Phase 1 Verification
- [ ] Can register new user via Postman/curl
- [ ] Can login and receive access_token + refresh_token
- [ ] Can refresh token
- [ ] Can logout
- [ ] Protected endpoints return 401 without token
- [ ] Protected endpoints work with valid token

### Phase 2 Verification
- [ ] Can create account
- [ ] Can list accounts
- [ ] Can search accounts
- [ ] Can update account
- [ ] Can swap account order (no unique constraint errors)
- [ ] Can delete account

### Phase 3 Verification
- [ ] Can create root category
- [ ] Can create child category
- [ ] Category tree endpoint returns nested structure
- [ ] Can swap category order

### Phase 5 Verification
- [ ] Can create transaction
- [ ] Can filter by account_id, category_id, type
- [ ] Can filter by date range
- [ ] Can search by note text
- [ ] Statistics endpoint returns correct totals
- [ ] Can delete transaction

### Phase 6 Verification
- [ ] Transfer creates 2 transactions
- [ ] Both transactions have correct transfer_id
- [ ] Updating transfer updates both transactions
- [ ] Deleting transfer deletes both transactions

---

## Performance Optimization Tips

### 1. Database Queries
```typescript
// ❌ Bad: N+1 queries
const transactions = await db.transactions.findMany();
for (const t of transactions) {
  const account = await db.accounts.findUnique({ where: { id: t.account_id } });
  const category = await db.categories.findUnique({ where: { id: t.category_id } });
}

// ✅ Good: Single query with includes
const transactions = await db.transactions.findMany({
  include: {
    account: { select: { name: true, icon: true } },
    category: { select: { name: true, icon: true } },
  },
});
```

### 2. Caching personal_id
```typescript
// ✅ Good: Cache in localStorage
const maxPersonalId = parseInt(localStorage.getItem('max_transaction_personal_id') || '0');
const nextId = maxPersonalId + 1;

// Refresh cache when fetching list
const response = await httpClient.get('/api/v1/transactions');
localStorage.setItem('max_transaction_personal_id', response.meta.max_personal_id);
```

### 3. Pagination
```typescript
// ✅ Good: Always paginate large lists
const transactions = await db.transactions.findMany({
  where: { user_id: userId },
  skip: offset,
  take: limit,
  orderBy: { date: 'desc' },
});
```

---

## Security Checklist

- [ ] JWT_SECRET is strong (min 32 chars) and in .env (never committed)
- [ ] Password hashing uses bcrypt with 12 rounds minimum
- [ ] All endpoints validate user ownership (filter by user_id)
- [ ] Tokens stored in localStorage (consider httpOnly cookies for production)
- [ ] HTTPS used in production
- [ ] Input validation on all endpoints
- [ ] SQL injection prevented (Prisma handles this)
- [ ] No sensitive data in error messages
- [ ] Rate limiting implemented (consider in production)

---

## Deployment Checklist

### Vercel Deployment
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Set environment variables in Vercel dashboard:
# - DATABASE_URL
# - JWT_SECRET
# - API_VERSION
# - NEXT_PUBLIC_API_BASE_URL

# 4. Deploy production
vercel --prod
```

### Self-Hosted Deployment
```bash
# 1. Build
npm run build

# 2. Set environment variables
export DATABASE_URL="postgresql://..."
export JWT_SECRET="..."

# 3. Start
npm start
```

### Database Migration
```bash
# Generate migration from schema changes
npx prisma migrate dev --name migration_name

# Apply migration to production
npx prisma migrate deploy
```

---

## Summary

This refactor plan:
✅ Identifies all conflicts between documents  
✅ Proposes clear resolutions  
✅ Splits work into 8 manageable phases  
✅ Provides detailed implementation steps  
✅ Includes complete code examples  
✅ Includes testing and rollback strategies  
✅ Includes troubleshooting guide  
✅ Includes verification checklists  
✅ Estimates timelines  
✅ Assesses risks  

**Recommendation**: Start with Phase 0-1, validate the approach, then proceed incrementally through remaining phases.

---

## Quick Reference Commands

```bash
# Phase 0: Setup
npm install @prisma/client prisma bcryptjs jose @types/bcryptjs
npx prisma init
npx prisma db pull
npx prisma generate

# Development
npm run dev
npx tsc --noEmit  # Type check
npm run build     # Build check

# Database
npx prisma studio        # Database GUI
npx prisma migrate dev   # Create migration
npx prisma generate      # Regenerate client

# Testing
npm test                 # Run tests
npm run test:watch       # Watch mode

# Deployment
vercel                   # Deploy to Vercel
npm run build && npm start  # Self-hosted
```

---

## Additional Resources

- **API_IMPLEMENTATION_GUIDE.md** - Complete implementation examples
- **DATABASE_SCHEMA_GUIDE.md** - Database schema details
- **CONFLICTS_ANALYSIS.md** - Detailed conflict analysis (10 conflicts)
- **SCHEMA_UPDATE_SUMMARY.txt** - Schema-specific updates
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Route Handlers**: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- **Jose JWT**: https://github.com/panva/jose
