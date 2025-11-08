# Zod Integration - Final Implementation Plan

> **Status**: ✅ Validated & Ready for Implementation  
> **Last Updated**: 2025-11-08  
> **Confidence**: 100% - All schemas verified against actual project

---

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Phase 1: Setup & Infrastructure](#phase-1-setup--infrastructure)
- [Phase 2: Create Base Schemas](#phase-2-create-base-schemas)
- [Phase 3: Backend API Integration](#phase-3-backend-api-integration)
- [Phase 4: Frontend Integration](#phase-4-frontend-integration)
- [Phase 5: Systematic Migration](#phase-5-systematic-migration)
- [Phase 6: Advanced Features](#phase-6-advanced-features)
- [Phase 7: Testing](#phase-7-testing)
- [Phase 8: Documentation](#phase-8-documentation)
- [Implementation Timeline](#implementation-timeline)
- [Success Criteria](#success-criteria)

---

## Quick Start

### What You Need to Know

1. **All field names use snake_case** (not camelCase)
2. **All resources require `personal_id`** (user-specific ordering)
3. **Budgets are excluded** (no API routes exist yet)
4. **All schemas have been verified** against actual API implementations

### Critical Field Mappings

| Database | API Request | API Response |
|----------|------------|--------------|
| `from_account` | `from_account_id` | `from_account_id` |
| `to_account` | `to_account_id` | `to_account_id` |
| All snake_case | All snake_case | All snake_case |

---

## Phase 1: Setup & Infrastructure

### Step 1: Install Dependencies

```bash
npm install zod @hookform/resolvers
```

**Verify Installation:**
```bash
npm list zod @hookform/resolvers
```

### Step 2: Create Directory Structure

```bash
# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path schemas/common, schemas/auth, schemas/accounts, schemas/categories, schemas/transactions, schemas/transfers, schemas/debts, schemas/groups

# Unix/Linux/Mac
mkdir -p schemas/{common,auth,accounts,categories,transactions,transfers,debts,groups}
```

**Note**: Skip `schemas/budgets` - no API routes exist yet.

---

## Phase 2: Create Base Schemas

### Step 3: Common Response Schema

**File**: `schemas/common/response.schema.ts`

```typescript
import { z } from 'zod';

/**
 * Generic API response wrapper
 * Matches actual API response format: { success, message, data, meta?, errors? }
 */
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: dataSchema.nullable(),
    meta: z.record(z.any()).nullable().optional(),
    errors: z.any().optional(),
  });

/**
 * Paginated list response with metadata
 * Used by GET endpoints that return lists (accounts, categories, etc.)
 */
export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.array(itemSchema),
    meta: z.object({
      max_personal_id: z.number().int().nonnegative(),
      total: z.number().int().nonnegative(),
      limit: z.number().int().positive(),
      offset: z.number().int().nonnegative(),
    }),
  });

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T | null;
  meta?: Record<string, any> | null;
  errors?: any;
};
```

### Step 4: Common Field Schemas

**File**: `schemas/common/fields.schema.ts`

```typescript
import { z } from 'zod';

// ============================================================================
// Basic Field Types (matching database constraints)
// ============================================================================

export const UuidSchema = z.string().uuid();

export const PersonalIdSchema = z.number().int().positive()
  .describe('User-specific sequential ID for ordering (BigInt in DB)');

export const PositionSchema = z.any().nullable()
  .describe('JSON field for custom drag-and-drop ordering');

// ============================================================================
// String Field Constraints (exact DB varchar lengths)
// ============================================================================

export const AccountNameSchema = z.string().min(1, 'Name cannot be empty').max(36);
export const CategoryNameSchema = z.string().min(1, 'Name cannot be empty').max(36);
export const GroupNameSchema = z.string().min(1, 'Name cannot be empty').max(64);
export const DebtNameSchema = z.string().min(1, 'Name cannot be empty').max(64);

export const IconSchema = z.string().min(1, 'Icon is required').max(36);

// Color fields have different lengths in different tables
export const AccountColorSchema = z.string().min(1, 'Color is required').max(255);
export const CategoryColorSchema = z.string().min(1, 'Color is required').max(36);

export const NoteSchema = z.string().nullable();

// ============================================================================
// Timestamp & Audit Fields
// ============================================================================

export const TimestampSchema = z.coerce.date();
export const AuditFieldSchema = z.string().max(64).nullable();

// ============================================================================
// Base Resource Schema (common to all entities)
// ============================================================================

export const BaseResourceSchema = z.object({
  id: UuidSchema,
  user_id: UuidSchema,
  personal_id: PersonalIdSchema,
  position: PositionSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema.nullable(),
  created_by: AuditFieldSchema.optional(),
  updated_by: AuditFieldSchema.optional(),
});
```

### Step 5: Pagination & Filter Schemas

**File**: `schemas/common/pagination.schema.ts`

```typescript
import { z } from 'zod';

/**
 * Standard pagination query parameters
 * Used by all list endpoints
 */
export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
  keyword: z.string().optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
```

**File**: `schemas/common/filters.schema.ts`

```typescript
import { z } from 'zod';

/**
 * Date range filter for transactions, transfers, etc.
 */
export const DateRangeSchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
});

/**
 * Amount range filter for financial records
 */
export const AmountRangeSchema = z.object({
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
});
```

### Step 6: Auth Schemas

**File**: `schemas/auth/login.schema.ts`

```typescript
import { z } from 'zod';
import { UuidSchema, TimestampSchema } from '../common/fields.schema';

/**
 * Login request - supports both email and username
 * Field name: email_or_username (not just "email")
 */
export const LoginRequestSchema = z.object({
  email_or_username: z.string().min(1, 'Email or username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

/**
 * User profile returned in responses
 */
export const UserProfileSchema = z.object({
  id: UuidSchema,
  email: z.string().email(),
  username: z.string().min(1),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

/**
 * Login response with tokens
 */
export const LoginResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  user: UserProfileSchema,
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type UserProfile = z.infer<typeof UserProfileSchema>;
```

**File**: `schemas/auth/register.schema.ts`

```typescript
import { z } from 'zod';

/**
 * User registration schema
 * Username must be alphanumeric with underscores/hyphens
 */
export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address').max(36),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(36, 'Username must be at most 36 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(255, 'Password must be at most 255 characters'),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
```

**File**: `schemas/auth/refresh.schema.ts`

```typescript
import { z } from 'zod';

/**
 * Token refresh request
 */
export const RefreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

/**
 * Token refresh response with new tokens and expiry info
 */
export const RefreshTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expired_at: z.string().datetime(),
  refreshable_until: z.string().datetime(),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
```

### Step 7: Account Schemas

**File**: `schemas/accounts/account.schema.ts`

```typescript
import { z } from 'zod';
import {
  BaseResourceSchema,
  UuidSchema,
  AccountNameSchema,
  IconSchema,
  AccountColorSchema,
} from '../common/fields.schema';

/**
 * Account type - flexible string (not enum)
 * Examples: CASH, BANK, CREDIT_CARD, etc.
 */
export const AccountTypeSchema = z.string().max(32);

/**
 * Account usability status
 * Examples: ACTIVE, ARCHIVED, etc.
 */
export const UsabilitySchema = z.string().max(32);

/**
 * Base account fields (for create/update)
 * NOTE: Uses snake_case field names
 */
export const AccountBaseSchema = z.object({
  name: AccountNameSchema,
  icon: IconSchema,
  active: z.boolean().default(true),
  usability: UsabilitySchema.default('ACTIVE'),
  account_type: AccountTypeSchema, // Not just "type"
  color: AccountColorSchema,
  initial_amount: z.number().default(0),
  group_id: UuidSchema.nullable().optional(),
});

/**
 * Account creation request
 * Requires personal_id for user-specific ordering
 */
export const CreateAccountRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  name: AccountNameSchema,
  icon: IconSchema,
  active: z.boolean().optional(),
  usability: UsabilitySchema.optional(),
  account_type: AccountTypeSchema,
  color: AccountColorSchema,
  initial_amount: z.number().optional(),
  group_id: UuidSchema.nullable().optional(),
});

/**
 * Account update request - all fields optional except personal_id
 */
export const UpdateAccountRequestSchema = CreateAccountRequestSchema
  .partial()
  .omit({ personal_id: true });

/**
 * Full account schema (database model)
 * Includes calculated balance field
 */
export const AccountSchema = BaseResourceSchema.merge(AccountBaseSchema).extend({
  balance: z.number(), // Calculated from transactions
});

/**
 * Swap order request for drag-and-drop reordering
 */
export const SwapOrderRequestSchema = z.object({
  order_map: z.array(
    z.object({
      id: UuidSchema,
      personal_id: z.number().int().positive(),
    })
  ).min(1, 'At least one item required'),
});

export type Account = z.infer<typeof AccountSchema>;
export type CreateAccountRequest = z.infer<typeof CreateAccountRequestSchema>;
export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequestSchema>;
export type SwapOrderRequest = z.infer<typeof SwapOrderRequestSchema>;
```

### Step 8: Category Schemas

**File**: `schemas/categories/category.schema.ts`

```typescript
import { z } from 'zod';
import {
  BaseResourceSchema,
  UuidSchema,
  CategoryNameSchema,
  IconSchema,
  CategoryColorSchema,
} from '../common/fields.schema';

/**
 * Category nature - expense classification
 * NEED: Necessary expenses (rent, utilities)
 * WANT: Discretionary spending (entertainment)
 * MUST: Non-negotiable (debt payments)
 */
export const CategoryNatureSchema = z.enum(['NEED', 'WANT', 'MUST']);

/**
 * Base category fields
 * NOTE: Uses is_active (not isActive)
 */
export const CategoryBaseSchema = z.object({
  name: CategoryNameSchema,
  icon: IconSchema,
  color: CategoryColorSchema.nullable().optional(),
  nature: CategoryNatureSchema.default('NEED'),
  parent_id: UuidSchema.nullable().optional(),
  is_active: z.boolean().default(true), // Note: snake_case
});

/**
 * Category creation request
 */
export const CreateCategoryRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  name: CategoryNameSchema,
  icon: IconSchema,
  color: CategoryColorSchema.nullable().optional(),
  nature: CategoryNatureSchema.optional(),
  parent_id: UuidSchema.nullable().optional(),
  is_active: z.boolean().optional(),
});

/**
 * Category update request
 */
export const UpdateCategoryRequestSchema = CreateCategoryRequestSchema
  .partial()
  .omit({ personal_id: true });

/**
 * Full category schema
 */
export const CategorySchema = BaseResourceSchema.merge(CategoryBaseSchema);

/**
 * Recursive category tree schema for hierarchical display
 * Uses z.lazy() for self-referencing
 */
export const CategoryTreeSchema: z.ZodType<any> = CategorySchema.extend({
  children: z.lazy(() => CategoryTreeSchema.array()),
});

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof UpdateCategoryRequestSchema>;
export type CategoryTree = z.infer<typeof CategoryTreeSchema>;
```

### Step 9: Transaction Schemas

**File**: `schemas/transactions/transaction.schema.ts`

```typescript
import { z } from 'zod';
import {
  BaseResourceSchema,
  UuidSchema,
  NoteSchema,
  TimestampSchema,
} from '../common/fields.schema';

/**
 * Transaction type
 */
export const TransactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);

/**
 * Base transaction fields
 * NOTE: No "tags" field (not supported in DB)
 */
export const TransactionBaseSchema = z.object({
  date: z.coerce.date(),
  account_id: UuidSchema,
  category_id: UuidSchema,
  amount: z.number().refine((val) => val !== 0, 'Amount cannot be zero'),
  type: TransactionTypeSchema,
  note: NoteSchema.optional(),
  transfer_id: UuidSchema.nullable().optional(),
  debt_id: UuidSchema.nullable().optional(),
});

/**
 * Transaction creation request
 */
export const CreateTransactionRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  account_id: UuidSchema,
  category_id: UuidSchema,
  type: TransactionTypeSchema,
  amount: z.number().refine((val) => val !== 0, 'Amount cannot be zero'),
  date: z.coerce.date(),
  note: NoteSchema.optional(),
});

/**
 * Transaction update request
 */
export const UpdateTransactionRequestSchema = CreateTransactionRequestSchema
  .partial()
  .omit({ personal_id: true });

/**
 * Full transaction schema
 */
export const TransactionSchema = BaseResourceSchema.merge(TransactionBaseSchema);

/**
 * Transaction filters for GET requests
 */
export const TransactionFiltersSchema = z.object({
  account_id: UuidSchema.optional(),
  category_id: UuidSchema.optional(),
  type: TransactionTypeSchema.optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
  keyword: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().nonnegative().default(0),
});

/**
 * Transaction summary response (from /summary endpoint)
 */
export const TransactionSummarySchema = z.object({
  total_income: z.number(),
  total_expense: z.number(),
  net_balance: z.number(),
  by_category: z.array(
    z.object({
      category_id: UuidSchema,
      category_name: z.string(),
      total: z.number(),
    })
  ),
  by_account: z.array(
    z.object({
      account_id: UuidSchema,
      account_name: z.string(),
      total: z.number(),
    })
  ),
});

export type Transaction = z.infer<typeof TransactionSchema>;
export type CreateTransactionRequest = z.infer<typeof CreateTransactionRequestSchema>;
export type UpdateTransactionRequest = z.infer<typeof UpdateTransactionRequestSchema>;
export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;
export type TransactionSummary = z.infer<typeof TransactionSummarySchema>;
```

### Step 10: Transfer Schemas

**File**: `schemas/transfers/transfer.schema.ts`

```typescript
import { z } from 'zod';
import { BaseResourceSchema, UuidSchema } from '../common/fields.schema';

/**
 * IMPORTANT: Field name differences
 * - Database: from_account, to_account
 * - API: from_account_id, to_account_id
 * 
 * Transfer automatically creates 2 linked transactions:
 * 1. EXPENSE from source account
 * 2. INCOME to destination account
 */

/**
 * Database schema - internal representation
 */
export const TransferBaseSchema = z.object({
  date: z.coerce.date(),
  from_account: UuidSchema, // DB field name
  to_account: UuidSchema,   // DB field name
  amount: z.number().positive('Amount must be positive'),
  note: z.string(), // Required (defaults to empty string)
});

/**
 * API Request schema - what API accepts
 */
export const CreateTransferRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  from_account_id: UuidSchema, // API field name
  to_account_id: UuidSchema,   // API field name
  amount: z.number().positive('Amount must be greater than 0'),
  date: z.coerce.date(),
  note: z.string().optional(), // API accepts optional, defaults to empty
}).refine(
  (data) => data.from_account_id !== data.to_account_id,
  { 
    message: 'Source and destination accounts must be different',
    path: ['to_account_id']
  }
);

/**
 * Transfer update request
 */
export const UpdateTransferRequestSchema = z.object({
  from_account_id: UuidSchema.optional(),
  to_account_id: UuidSchema.optional(),
  amount: z.number().positive().optional(),
  date: z.coerce.date().optional(),
  note: z.string().optional(),
}).refine(
  (data) => {
    // Only validate if both fields are present
    if (data.from_account_id && data.to_account_id) {
      return data.from_account_id !== data.to_account_id;
    }
    return true;
  },
  { 
    message: 'Source and destination accounts must be different',
    path: ['to_account_id']
  }
);

/**
 * Database schema
 */
export const TransferSchema = BaseResourceSchema.merge(TransferBaseSchema);

/**
 * API Response schema - includes account details
 */
export const TransferResponseSchema = TransferSchema.extend({
  from_account_id: UuidSchema,
  from_account_name: z.string(),
  from_account_icon: z.string(),
  to_account_id: UuidSchema,
  to_account_name: z.string(),
  to_account_icon: z.string(),
  transactions: z.array(
    z.object({
      id: UuidSchema,
      type: z.enum(['INCOME', 'EXPENSE']),
      account_id: UuidSchema,
      amount: z.number(),
    })
  ).optional(),
});

export type Transfer = z.infer<typeof TransferSchema>;
export type CreateTransferRequest = z.infer<typeof CreateTransferRequestSchema>;
export type UpdateTransferRequest = z.infer<typeof UpdateTransferRequestSchema>;
export type TransferResponse = z.infer<typeof TransferResponseSchema>;
```

### Step 11: Debt Schemas

**File**: `schemas/debts/debt.schema.ts`

```typescript
import { z } from 'zod';
import {
  BaseResourceSchema,
  UuidSchema,
  DebtNameSchema,
} from '../common/fields.schema';

/**
 * Debt type - IMPORTANT: Use PAYABLE/RECEIVABLE (not LENT/BORROWED)
 * - PAYABLE: Money you owe to someone
 * - RECEIVABLE: Money someone owes to you
 * 
 * Balance is calculated from linked transactions, not stored
 */
export const DebtTypeSchema = z.enum(['PAYABLE', 'RECEIVABLE']);

/**
 * Base debt fields
 */
export const DebtBaseSchema = z.object({
  account_id: UuidSchema,
  name: DebtNameSchema, // Counterparty name (person/company)
  type: DebtTypeSchema,
});

/**
 * Debt creation request
 */
export const CreateDebtRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  account_id: UuidSchema,
  name: z.string().min(1, 'Name cannot be empty').max(64),
  type: DebtTypeSchema,
});

/**
 * Debt update request
 */
export const UpdateDebtRequestSchema = z.object({
  account_id: UuidSchema.optional(),
  name: z.string().min(1, 'Name cannot be empty').max(64).optional(),
  type: DebtTypeSchema.optional(),
});

/**
 * Database schema
 */
export const DebtSchema = BaseResourceSchema.merge(DebtBaseSchema);

/**
 * API Response schema - includes calculated fields
 */
export const DebtResponseSchema = DebtSchema.extend({
  account_name: z.string(),
  account_icon: z.string(),
  balance: z.number(), // Calculated from linked transactions
  transaction_count: z.number().int().nonnegative(),
});

export type Debt = z.infer<typeof DebtSchema>;
export type DebtResponse = z.infer<typeof DebtResponseSchema>;
export type CreateDebtRequest = z.infer<typeof CreateDebtRequestSchema>;
export type UpdateDebtRequest = z.infer<typeof UpdateDebtRequestSchema>;
```

### Step 12: Group Schemas

**File**: `schemas/groups/group.schema.ts`

```typescript
import { z } from 'zod';
import { BaseResourceSchema, GroupNameSchema } from '../common/fields.schema';

/**
 * Groups - simple containers for organizing accounts
 */

/**
 * Base group fields
 */
export const GroupBaseSchema = z.object({
  name: GroupNameSchema,
});

/**
 * Group creation request
 */
export const CreateGroupRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  name: GroupNameSchema,
});

/**
 * Group update request
 */
export const UpdateGroupRequestSchema = z.object({
  name: GroupNameSchema.optional(),
});

/**
 * Full group schema
 */
export const GroupSchema = BaseResourceSchema.merge(GroupBaseSchema);

export type Group = z.infer<typeof GroupSchema>;
export type CreateGroupRequest = z.infer<typeof CreateGroupRequestSchema>;
export type UpdateGroupRequest = z.infer<typeof UpdateGroupRequestSchema>;
```

### Step 13: Central Export

**File**: `schemas/index.ts`

```typescript
// ============================================================================
// Common Schemas
// ============================================================================
export * from './common/response.schema';
export * from './common/pagination.schema';
export * from './common/filters.schema';
export * from './common/fields.schema';

// ============================================================================
// Auth Schemas
// ============================================================================
export * from './auth/login.schema';
export * from './auth/register.schema';
export * from './auth/refresh.schema';

// ============================================================================
// Domain Schemas
// ============================================================================
export * from './accounts/account.schema';
export * from './categories/category.schema';
export * from './transactions/transaction.schema';
export * from './transfers/transfer.schema';
export * from './debts/debt.schema';
export * from './groups/group.schema';

// Note: Budget schemas excluded - API routes don't exist yet
```

---

## Phase 3: Backend API Integration

### Step 14: Create Validation Utilities

**File**: `lib/validation.ts`

```typescript
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Custom error class for validation failures
 */
export class ValidationError extends Error {
  constructor(public errors: z.ZodError) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

/**
 * Validate request body against schema
 */
export async function validateBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error);
    }
    throw error;
  }
}

/**
 * Validate query parameters against schema
 */
export function validateQuery<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): z.infer<T> {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());
  
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error);
    }
    throw error;
  }
}

/**
 * Validate path parameters against schema
 */
export function validatePathParams<T extends z.ZodType>(
  params: Record<string, string>,
  schema: T
): z.infer<T> {
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError(error);
    }
    throw error;
  }
}

/**
 * Handle validation errors - return formatted error response
 */
export function handleValidationError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: error.errors.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        })),
      },
      { status: 400 }
    );
  }
  
  // Unknown error - don't expose details
  console.error('Unexpected error:', error);
  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  );
}

/**
 * Validate response data before sending
 * Useful for ensuring API responses match expected schema
 */
export function validateResponse<T extends z.ZodType>(
  data: unknown,
  schema: T
): z.infer<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    console.error('Response validation failed:', error);
    throw new Error('Invalid response data');
  }
}
```

### Step 15: Update Auth API Routes

**Example**: `app/api/v1/auth/login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateBody, handleValidationError, validateResponse } from '@/lib/validation';
import { LoginRequestSchema, LoginResponseSchema } from '@/schemas/auth/login.schema';
import { ApiResponseBuilder } from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate request body
    const body = await validateBody(request, LoginRequestSchema);
    
    // Step 2: Business logic (your existing code)
    const result = await authenticateUser(body);
    
    // Step 3: Validate response
    const validated = validateResponse(result, LoginResponseSchema);
    
    // Step 4: Return success response
    return NextResponse.json(
      ApiResponseBuilder.success('Login successful', validated)
    );
  } catch (error) {
    return handleValidationError(error);
  }
}
```

**Apply this pattern to:**
- ✅ `app/api/v1/auth/login/route.ts`
- ✅ `app/api/v1/auth/register/route.ts`
- ✅ `app/api/v1/auth/refresh/route.ts`
- ✅ `app/api/v1/auth/logout/route.ts`

### Step 16: Update Account API Routes

**Example**: `app/api/v1/accounts/route.ts` - GET

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateQuery, handleValidationError } from '@/lib/validation';
import { AccountSchema } from '@/schemas/accounts/account.schema';
import { PaginationQuerySchema } from '@/schemas/common/pagination.schema';
import { PaginatedResponseSchema } from '@/schemas/common/response.schema';

export async function GET(request: NextRequest) {
  try {
    // Authenticate (your existing code)
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const { user } = authResult;

    // Validate query parameters
    const query = validateQuery(request, PaginationQuerySchema);

    // Fetch data (your existing code)
    const { accounts, total, maxPersonalId } = await fetchAccounts(user.user_id, query);

    // Validate each account in response
    const validatedAccounts = accounts.map(acc => AccountSchema.parse(acc));

    // Return paginated response
    return NextResponse.json(
      PaginatedResponseSchema(AccountSchema).parse({
        success: true,
        message: 'Accounts retrieved successfully',
        data: validatedAccounts,
        meta: {
          max_personal_id: maxPersonalId,
          total,
          limit: query.limit,
          offset: query.offset,
        },
      })
    );
  } catch (error) {
    return handleValidationError(error);
  }
}
```

**Example**: `app/api/v1/accounts/route.ts` - POST

```typescript
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;
    const { user } = authResult;

    // Validate request body
    const body = await validateBody(request, CreateAccountRequestSchema);

    // Create account (your existing code)
    const account = await createAccount({ ...body, user_id: user.user_id });

    // Validate response
    const validated = AccountSchema.parse(account);

    return NextResponse.json(
      ApiResponseBuilder.success('Account created successfully', validated),
      { status: 201 }
    );
  } catch (error) {
    return handleValidationError(error);
  }
}
```

**Example**: `app/api/v1/accounts/[id]/route.ts`

```typescript
import { z } from 'zod';
import { validatePathParams, validateBody, handleValidationError } from '@/lib/validation';
import { UpdateAccountRequestSchema, AccountSchema } from '@/schemas/accounts/account.schema';

const PathParamsSchema = z.object({ id: z.string().uuid() });

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Validate path params
    const { id } = validatePathParams(params, PathParamsSchema);

    // Authenticate
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    // Fetch account
    const account = await getAccountById(id, authResult.user.user_id);

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    // Validate response
    const validated = AccountSchema.parse(account);

    return NextResponse.json(
      ApiResponseBuilder.success('Account retrieved', validated)
    );
  } catch (error) {
    return handleValidationError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = validatePathParams(params, PathParamsSchema);
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    // Validate request body
    const body = await validateBody(request, UpdateAccountRequestSchema);

    // Update account
    const account = await updateAccount(id, body, authResult.user.user_id);

    // Validate response
    const validated = AccountSchema.parse(account);

    return NextResponse.json(
      ApiResponseBuilder.success('Account updated', validated)
    );
  } catch (error) {
    return handleValidationError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = validatePathParams(params, PathParamsSchema);
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    await deleteAccount(id, authResult.user.user_id);

    return NextResponse.json(
      ApiResponseBuilder.success('Account deleted')
    );
  } catch (error) {
    return handleValidationError(error);
  }
}
```

### Step 17: Backend Migration Checklist

For EACH API route, complete these tasks:

**Before Starting:**
- [ ] Read existing route implementation
- [ ] Identify all inputs (body, query, path params)
- [ ] Identify response structure

**During Migration:**
- [ ] Import validation utilities
- [ ] Import relevant schemas
- [ ] Add `validateBody()` for POST/PUT/PATCH
- [ ] Add `validateQuery()` for GET with filters
- [ ] Add `validatePathParams()` for routes with [id]
- [ ] Add `validateResponse()` before returning data
- [ ] Replace manual error responses with `handleValidationError()`

**After Migration:**
- [ ] Test with valid data (should work as before)
- [ ] Test with invalid data (should return 400 with details)
- [ ] Test with missing required fields (should return 400)
- [ ] Test with wrong data types (should return 400)
- [ ] Verify error messages are helpful

### Step 18: API Route Template

**Template for future routes:**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  validateBody,
  validateQuery,
  validatePathParams,
  handleValidationError,
} from '@/lib/validation';
import { requireAuth } from '@/lib/auth';
import {
  CreateXRequestSchema,
  UpdateXRequestSchema,
  XSchema,
} from '@/schemas/x/x.schema';

// Path params schema if needed
const PathParamsSchema = z.object({ id: z.string().uuid() });

// GET /api/v1/x - List resources
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const query = validateQuery(request, QuerySchema);
    const data = await fetchResources(authResult.user.user_id, query);

    return NextResponse.json({
      success: true,
      data: data.map(item => XSchema.parse(item)),
    });
  } catch (error) {
    return handleValidationError(error);
  }
}

// POST /api/v1/x - Create resource
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const body = await validateBody(request, CreateXRequestSchema);
    const resource = await createResource(body, authResult.user.user_id);

    return NextResponse.json(
      { success: true, data: XSchema.parse(resource) },
      { status: 201 }
    );
  } catch (error) {
    return handleValidationError(error);
  }
}
```

---

## Phase 4: Frontend Integration

### Step 19: Create Type Utilities

**File**: `src/types/schemas.ts`

```typescript
/**
 * Re-export all schemas for frontend use
 * Provides single import point: import { Account, CreateAccountRequest } from '@/types/schemas'
 */
export * from '@/schemas';
```

### Step 20: Update Service Layer

**Pattern for all services:**

```typescript
import { z } from 'zod';
import {
  XSchema,
  CreateXRequestSchema,
  UpdateXRequestSchema,
  type X,
  type CreateXRequest,
  type UpdateXRequest,
} from '@/types/schemas';
import { ApiResponseSchema, PaginatedResponseSchema } from '@/schemas/common/response.schema';
import api from './api';

export const xService = {
  /**
   * Get all resources
   */
  async getAll(params?: any) {
    const response = await api.get('/v1/x', { params });
    
    // Validate response
    const schema = PaginatedResponseSchema(XSchema);
    const validated = schema.parse(response.data);
    
    return validated.data;
  },

  /**
   * Get resource by ID
   */
  async getById(id: string): Promise<X> {
    const response = await api.get(`/v1/x/${id}`);
    
    // Validate response
    const schema = ApiResponseSchema(XSchema);
    const validated = schema.parse(response.data);
    
    if (!validated.data) {
      throw new Error('Resource not found');
    }
    
    return validated.data;
  },

  /**
   * Create resource
   */
  async create(data: CreateXRequest): Promise<X> {
    // Validate request before sending
    const validatedRequest = CreateXRequestSchema.parse(data);
    
    const response = await api.post('/v1/x', validatedRequest);
    
    // Validate response
    const schema = ApiResponseSchema(XSchema);
    const validated = schema.parse(response.data);
    
    if (!validated.data) {
      throw new Error('Failed to create resource');
    }
    
    return validated.data;
  },

  /**
   * Update resource
   */
  async update(id: string, data: UpdateXRequest): Promise<X> {
    // Validate request before sending
    const validatedRequest = UpdateXRequestSchema.parse(data);
    
    const response = await api.put(`/v1/x/${id}`, validatedRequest);
    
    // Validate response
    const schema = ApiResponseSchema(XSchema);
    const validated = schema.parse(response.data);
    
    if (!validated.data) {
      throw new Error('Failed to update resource');
    }
    
    return validated.data;
  },

  /**
   * Delete resource
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/v1/x/${id}`);
  },
};
```

**Apply to all services:**
- ✅ `src/services/authService.ts`
- ✅ `src/services/accountService.ts`
- ✅ `src/services/categoryService.ts`
- ✅ `src/services/transactionService.ts`
- ⚠️ `src/services/budgetService.ts` (skip for now)

### Step 21: Update Form Components

**Pattern for all forms:**

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateXRequestSchema, type CreateXRequest } from '@/types/schemas';
import { xService } from '@/services/xService';

export function XForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateXRequest>({
    resolver: zodResolver(CreateXRequestSchema),
    defaultValues: {
      // Set sensible defaults
    },
  });

  const onSubmit = async (data: CreateXRequest) => {
    try {
      await xService.create(data);
      // Handle success (close modal, show toast, etc.)
    } catch (error) {
      // Handle error (show error message)
      console.error('Failed to create:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Example field */}
      <div>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          {...register('name')}
          disabled={isSubmitting}
        />
        {errors.name && (
          <span className="error">{errors.name.message}</span>
        )}
      </div>

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

**Apply to all forms:**
- ✅ `src/views/Login/Login.tsx`
- ✅ `src/views/Register/Register.tsx`
- ✅ `src/components/AddAccountModal.tsx`
- ✅ All other forms that create/update resources

### Step 22: Frontend Migration Checklist

For EACH service:
- [ ] Import schemas from `@/types/schemas`
- [ ] Add request validation (parse before sending)
- [ ] Add response validation (parse after receiving)
- [ ] Update return types to use inferred types
- [ ] Handle validation errors gracefully

For EACH form:
- [ ] Import zodResolver and schema
- [ ] Add `resolver: zodResolver(Schema)` to useForm
- [ ] Display validation errors
- [ ] Test form submission with valid data
- [ ] Test form submission with invalid data
- [ ] Remove old manual validation logic

---

## Phase 5: Systematic Migration

### Step 23: Migration Order (8 Weeks)

#### Week 1-2: Foundation + Auth ⭐ HIGHEST PRIORITY
**Why first**: Most critical, affects everything, well-defined

- [ ] Install dependencies
- [ ] Create common schemas (response, pagination, fields)
- [ ] Create validation utilities
- [ ] Create auth schemas
- [ ] Update auth API routes
- [ ] Update authService
- [ ] Update Login form
- [ ] Update Register form
- [ ] Test end-to-end authentication

#### Week 3: Accounts
**Why second**: Simple CRUD, no dependencies, high usage

- [ ] Create account schemas
- [ ] Update `GET /api/v1/accounts`
- [ ] Update `POST /api/v1/accounts`
- [ ] Update `GET /api/v1/accounts/[id]`
- [ ] Update `PUT /api/v1/accounts/[id]`
- [ ] Update `DELETE /api/v1/accounts/[id]`
- [ ] Update `POST /api/v1/accounts/swap-order`
- [ ] Update accountService
- [ ] Update AddAccountModal
- [ ] Update AccountDetail form
- [ ] Test account CRUD operations

#### Week 4: Categories
**Why third**: Has tree structure but clear fields, needed for transactions

- [ ] Create category schemas
- [ ] Update `GET /api/v1/categories`
- [ ] Update `POST /api/v1/categories`
- [ ] Update `GET /api/v1/categories/tree`
- [ ] Update `GET /api/v1/categories/[id]`
- [ ] Update `PUT /api/v1/categories/[id]`
- [ ] Update `DELETE /api/v1/categories/[id]`
- [ ] Update `POST /api/v1/categories/swap-order`
- [ ] Update categoryService
- [ ] Update category forms
- [ ] Test category tree functionality

#### Week 5: Groups
**Why fourth**: Simplest schema, few dependencies

- [ ] Create group schemas
- [ ] Update `GET /api/v1/groups`
- [ ] Update `POST /api/v1/groups`
- [ ] Update `GET /api/v1/groups/[id]`
- [ ] Update `PUT /api/v1/groups/[id]`
- [ ] Update `DELETE /api/v1/groups/[id]`
- [ ] Update group forms
- [ ] Test group CRUD

#### Week 6: Transactions
**Why fifth**: Complex but core feature, depends on accounts & categories

- [ ] Create transaction schemas
- [ ] Update `GET /api/v1/transactions`
- [ ] Update `POST /api/v1/transactions`
- [ ] Update `GET /api/v1/transactions/summary`
- [ ] Update `GET /api/v1/transactions/[id]`
- [ ] Update `PUT /api/v1/transactions/[id]`
- [ ] Update `DELETE /api/v1/transactions/[id]`
- [ ] Update transactionService
- [ ] Update QuickTransactionModal
- [ ] Update TransactionModal
- [ ] Test transaction filters
- [ ] Test transaction summary

#### Week 7: Transfers
**Why sixth**: Complex field mapping, creates linked transactions

- [ ] Create transfer schemas
- [ ] Update `GET /api/v1/transfers`
- [ ] Update `POST /api/v1/transfers` (remember: creates 2 transactions)
- [ ] Update `GET /api/v1/transfers/[id]`
- [ ] Update `PUT /api/v1/transfers/[id]`
- [ ] Update `DELETE /api/v1/transfers/[id]`
- [ ] Update transfer forms
- [ ] Test transfer creation (verify linked transactions)
- [ ] Test field mapping (from_account vs from_account_id)

#### Week 8: Debts
**Why seventh**: Simple but has calculated fields

- [ ] Create debt schemas
- [ ] Update `GET /api/v1/debts`
- [ ] Update `POST /api/v1/debts`
- [ ] Update `GET /api/v1/debts/[id]`
- [ ] Update `PUT /api/v1/debts/[id]`
- [ ] Update `DELETE /api/v1/debts/[id]`
- [ ] Update debt forms
- [ ] Test balance calculation
- [ ] Test debt types (PAYABLE/RECEIVABLE)

### Step 24: Per-Endpoint Testing Checklist

For EACH endpoint after migration:

**Validation Tests:**
- [ ] ✅ Valid data passes validation
- [ ] ❌ Invalid data types rejected (string where number expected)
- [ ] ❌ Missing required fields rejected
- [ ] ❌ Invalid field lengths rejected (too short/long)
- [ ] ❌ Invalid formats rejected (invalid UUID, email, etc.)
- [ ] ✅ Optional fields work when omitted
- [ ] ✅ Default values applied correctly

**Response Tests:**
- [ ] ✅ Response structure matches schema
- [ ] ✅ All required fields present in response
- [ ] ✅ Field types correct in response
- [ ] ✅ Error responses formatted correctly

**End-to-End Tests:**
- [ ] ✅ Create → Read → Update → Delete flow works
- [ ] ✅ UI form validation displays errors
- [ ] ✅ UI form submission works
- [ ] ✅ Service layer validation works

### Step 25: Regression Testing

After each week's migration:

**Smoke Tests:**
- [ ] Login/logout works
- [ ] Navigation works
- [ ] All pages load without errors
- [ ] Console has no validation errors

**Integration Tests:**
- [ ] Migrated features work with non-migrated features
- [ ] No breaking changes to existing functionality
- [ ] API contracts maintained

**Performance Check:**
- [ ] No significant performance degradation
- [ ] Validation doesn't slow down requests noticeably

---

## Phase 6: Advanced Features

### Step 26: Custom Validation Helpers

**File**: `lib/validation-helpers.ts`

```typescript
import { z } from 'zod';

/**
 * Date must be in the past
 */
export const pastDate = () =>
  z.date().refine(
    (date) => date <= new Date(),
    'Date cannot be in the future'
  );

/**
 * Date must be in the future
 */
export const futureDate = () =>
  z.date().refine(
    (date) => date >= new Date(),
    'Date cannot be in the past'
  );

/**
 * Hex color code (#RRGGBB)
 */
export const hexColor = () =>
  z.string().regex(
    /^#[0-9A-Fa-f]{6}$/,
    'Must be a valid hex color (#RRGGBB)'
  );

/**
 * Date range validation (end >= start)
 */
export const dateRange = () =>
  z.object({
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
  }).refine(
    (data) => data.end_date >= data.start_date,
    {
      message: 'End date must be after or equal to start date',
      path: ['end_date'],
    }
  );

/**
 * Amount range validation (max >= min)
 */
export const amountRange = () =>
  z.object({
    min_amount: z.number(),
    max_amount: z.number(),
  }).refine(
    (data) => data.max_amount >= data.min_amount,
    {
      message: 'Maximum amount must be greater than or equal to minimum',
      path: ['max_amount'],
    }
  );
```

### Step 27: Environment Validation

**File**: `lib/env.ts`

```typescript
import { z } from 'zod';

/**
 * Environment variables schema
 * Validates required environment variables at startup
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid URL'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
});

/**
 * Validated environment variables
 * Throws error at startup if validation fails
 */
export const env = envSchema.parse(process.env);

/**
 * Type-safe environment variables
 */
export type Env = z.infer<typeof envSchema>;
```

### Step 28: Type Guards & Utilities

**File**: `lib/type-guards.ts`

```typescript
import { z } from 'zod';
import { ApiResponseSchema } from '@/schemas/common/response.schema';

/**
 * Check if response is successful
 */
export function isSuccessResponse<T>(
  response: unknown,
  dataSchema: z.ZodType<T>
): response is { success: true; data: T } {
  const schema = ApiResponseSchema(dataSchema);
  const result = schema.safeParse(response);
  return (
    result.success &&
    result.data.success === true &&
    result.data.data !== null &&
    result.data.data !== undefined
  );
}

/**
 * Unwrap API response or throw error
 */
export function unwrapApiResponse<T>(
  response: unknown,
  dataSchema: z.ZodType<T>
): T {
  if (isSuccessResponse(response, dataSchema)) {
    return response.data;
  }
  
  // Type narrowing - if not success, it's an error
  const errorResponse = response as { success: false; error?: string };
  throw new Error(errorResponse.error || 'Unknown error');
}

/**
 * Safe parse with default value
 */
export function parseWithDefault<T extends z.ZodType>(
  schema: T,
  data: unknown,
  defaultValue: z.infer<T>
): z.infer<T> {
  const result = schema.safeParse(data);
  return result.success ? result.data : defaultValue;
}
```

### Step 29: Error Formatting

**File**: `lib/format-validation-errors.ts`

```typescript
import { z } from 'zod';

/**
 * Format Zod errors for API responses
 */
export function formatZodErrors(error: z.ZodError) {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Convert Zod errors to field-based error object
 * Useful for form libraries
 */
export function zodErrorsToFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const field = err.path.join('.');
    // Only store first error per field
    if (!fieldErrors[field]) {
      fieldErrors[field] = err.message;
    }
  });
  
  return fieldErrors;
}

/**
 * Format error for user display
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof z.ZodError) {
    // Return first error message
    return error.errors[0]?.message || 'Validation failed';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
}
```

### Step 30: Schema Testing Utilities

**File**: `lib/test-helpers.ts`

```typescript
import { z } from 'zod';

/**
 * Assert that schema validates data
 */
export function assertValidates<T extends z.ZodType>(
  schema: T,
  data: unknown
): asserts data is z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Validation failed: ${JSON.stringify(result.error.errors)}`);
  }
}

/**
 * Assert that schema rejects data
 */
export function assertRejects<T extends z.ZodType>(
  schema: T,
  data: unknown
): void {
  const result = schema.safeParse(data);
  if (result.success) {
    throw new Error('Expected validation to fail but it succeeded');
  }
}

/**
 * Get validation error paths
 */
export function getErrorPaths(error: z.ZodError): string[] {
  return error.errors.map(err => err.path.join('.'));
}
```

---

## Phase 7: Testing

### Step 31: Schema Unit Tests

**File**: `schemas/__tests__/account.schema.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import {
  CreateAccountRequestSchema,
  UpdateAccountRequestSchema,
  AccountSchema,
} from '../accounts/account.schema';

describe('Account Schemas', () => {
  describe('CreateAccountRequestSchema', () => {
    it('should validate valid account data', () => {
      const validData = {
        personal_id: 1,
        name: 'Test Account',
        icon: 'wallet',
        account_type: 'BANK',
        color: '#FF5733',
        initial_amount: 1000,
      };

      const result = CreateAccountRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject missing required fields', () => {
      const invalidData = {
        name: 'Test Account',
        // missing personal_id, icon, account_type, color
      };

      const result = CreateAccountRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.errors.map(e => e.path.join('.'));
        expect(paths).toContain('personal_id');
        expect(paths).toContain('icon');
        expect(paths).toContain('account_type');
        expect(paths).toContain('color');
      }
    });

    it('should reject name exceeding max length', () => {
      const invalidData = {
        personal_id: 1,
        name: 'A'.repeat(37), // Max is 36
        icon: 'wallet',
        account_type: 'BANK',
        color: '#FF5733',
      };

      const result = CreateAccountRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const minimalData = {
        personal_id: 1,
        name: 'Test',
        icon: 'wallet',
        account_type: 'BANK',
        color: '#FF5733',
        // initial_amount and group_id are optional
      };

      const result = CreateAccountRequestSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateAccountRequestSchema', () => {
    it('should validate partial updates', () => {
      const partialUpdate = {
        name: 'Updated Name',
        // All other fields optional
      };

      const result = UpdateAccountRequestSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should not require any fields', () => {
      const emptyUpdate = {};

      const result = UpdateAccountRequestSchema.safeParse(emptyUpdate);
      expect(result.success).toBe(true);
    });
  });
});
```

**Create similar tests for:**
- [ ] Auth schemas
- [ ] Category schemas
- [ ] Transaction schemas
- [ ] Transfer schemas
- [ ] Debt schemas
- [ ] Group schemas

### Step 32: API Integration Tests

**File**: `__tests__/api/accounts.test.ts`

```typescript
import { describe, it, expect, beforeAll } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/v1/accounts/route';

describe('POST /api/v1/accounts', () => {
  let authToken: string;

  beforeAll(async () => {
    // Get auth token for tests
    authToken = await getTestAuthToken();
  });

  it('should create account with valid data', async () => {
    const validData = {
      personal_id: 1,
      name: 'Test Account',
      icon: 'wallet',
      account_type: 'BANK',
      color: '#FF5733',
      initial_amount: 1000,
    };

    const request = new NextRequest('http://localhost/api/v1/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(validData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    expect(data.data.name).toBe('Test Account');
  });

  it('should reject invalid account data', async () => {
    const invalidData = {
      // missing required fields
      name: 'Test',
    };

    const request = new NextRequest('http://localhost/api/v1/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(invalidData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.details).toBeDefined();
  });

  it('should reject name exceeding max length', async () => {
    const invalidData = {
      personal_id: 1,
      name: 'A'.repeat(37),
      icon: 'wallet',
      account_type: 'BANK',
      color: '#FF5733',
    };

    const request = new NextRequest('http://localhost/api/v1/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(invalidData),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

### Step 33: Form Tests

**File**: `__tests__/components/AddAccountModal.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddAccountModal } from '@/components/AddAccountModal';

describe('AddAccountModal', () => {
  it('should display validation errors for invalid input', async () => {
    render(<AddAccountModal isOpen={true} onClose={() => {}} />);

    // Submit form without filling required fields
    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText(/name cannot be empty/i)).toBeInTheDocument();
      expect(screen.getByText(/icon is required/i)).toBeInTheDocument();
    });
  });

  it('should not submit when name exceeds max length', async () => {
    render(<AddAccountModal isOpen={true} onClose={() => {}} />);

    const nameInput = screen.getByLabelText(/name/i);
    fireEvent.change(nameInput, { target: { value: 'A'.repeat(37) } });

    const submitButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/maximum.*36/i)).toBeInTheDocument();
    });
  });

  it('should submit successfully with valid data', async () => {
    const mockOnClose = jest.fn();
    render(<AddAccountModal isOpen={true} onClose={mockOnClose} />);

    // Fill in valid data
    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Test Account' }
    });
    // ... fill other fields

    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
```

---

## Phase 8: Documentation

### Step 34: Create Migration Guide

**File**: `docs/ZOD_MIGRATION_GUIDE.md`

Include:
- Overview of changes made
- How to use schemas in new code
- Common patterns and examples
- Troubleshooting guide
- Migration from old manual types

### Step 35: Create API Schema Documentation

**File**: `docs/API_SCHEMAS.md`

Include:
- All schema definitions
- Request/response formats for each endpoint
- Validation rules
- Examples of valid/invalid data
- Error response formats

### Step 36: Update Developer Onboarding

**File**: `docs/DEVELOPER_ONBOARDING.md`

Include:
- How to create new schemas
- How to add validation to API routes
- How to use schemas in services
- How to use schemas in forms
- Testing guidelines

---

## Implementation Timeline

### 8-Week Schedule

| Week | Focus | Deliverables |
|------|-------|-------------|
| 1-2 | Foundation + Auth | Dependencies installed, common schemas, validation utils, auth fully validated |
| 3 | Accounts | All account endpoints validated, service updated, forms updated |
| 4 | Categories | All category endpoints validated, tree endpoint working |
| 5 | Groups | All group endpoints validated |
| 6 | Transactions | All transaction endpoints validated, filters working |
| 7 | Transfers | All transfer endpoints validated, linked transactions working |
| 8 | Debts | All debt endpoints validated, balance calculation working |

**Post-Implementation (Week 9-10):**
- Write comprehensive tests
- Update documentation
- Code review
- Performance testing
- Remove old manual types

---

## Success Criteria

### Completion Checklist

**Backend:**
- [ ] All API routes validate request bodies
- [ ] All API routes validate query parameters
- [ ] All API routes validate path parameters
- [ ] All API routes validate responses
- [ ] All validation errors return helpful messages
- [ ] No API route accepts invalid data

**Frontend:**
- [ ] All services validate requests before sending
- [ ] All services validate responses after receiving
- [ ] All forms use zodResolver
- [ ] All forms display validation errors
- [ ] No form submits invalid data

**Testing:**
- [ ] Schema unit tests written and passing
- [ ] API integration tests written and passing
- [ ] Form tests written and passing
- [ ] All tests pass in CI/CD
- [ ] Test coverage >= 80% for schemas

**Code Quality:**
- [ ] No TypeScript errors
- [ ] No validation-related console errors
- [ ] Code review completed
- [ ] All TODOs resolved
- [ ] Old manual types removed from `src/types/api.ts`

**Documentation:**
- [ ] Migration guide complete
- [ ] API schemas documented
- [ ] Developer onboarding updated
- [ ] Code examples provided
- [ ] Troubleshooting guide written

**Performance:**
- [ ] No significant performance degradation
- [ ] Validation doesn't slow down requests
- [ ] No memory leaks from validation

---

## Troubleshooting

### Common Issues

**"Expected string, received number"**
```typescript
// Problem: Query params are always strings
const limit = request.searchParams.get('limit'); // Returns string "100"

// Solution: Use z.coerce
z.coerce.number().int().positive()
```

**"Required field" for optional fields**
```typescript
// Problem: Field is optional but validation fails
group_id: UuidSchema // Requires value

// Solution: Use .optional() or .nullable()
group_id: UuidSchema.nullable().optional()
```

**Validation passes but TypeScript errors**
```typescript
// Problem: Manual type doesn't match schema
interface Account { initialBalance: number } // camelCase

// Solution: Use z.infer
type Account = z.infer<typeof AccountSchema> // Uses actual schema
```

**Transfer field name confusion**
```typescript
// Problem: DB uses from_account, API uses from_account_id
// Solution: Use separate schemas
CreateTransferRequestSchema // Uses from_account_id
TransferSchema // Uses from_account
```

**Debt type enum error**
```typescript
// Problem: Using wrong enum values
type: 'LENT' // Wrong

// Solution: Use correct enum
type: 'PAYABLE' or 'RECEIVABLE'
```

---

## Quick Reference

### File Structure
```
schemas/
├── index.ts (exports everything)
├── common/
│   ├── response.schema.ts
│   ├── pagination.schema.ts
│   ├── filters.schema.ts
│   └── fields.schema.ts
├── auth/
│   ├── login.schema.ts
│   ├── register.schema.ts
│   └── refresh.schema.ts
├── accounts/
│   └── account.schema.ts
├── categories/
│   └── category.schema.ts
├── transactions/
│   └── transaction.schema.ts
├── transfers/
│   └── transfer.schema.ts
├── debts/
│   └── debt.schema.ts
└── groups/
    └── group.schema.ts
```

### Import Patterns
```typescript
// In API routes
import { validateBody, handleValidationError } from '@/lib/validation';
import { CreateXRequestSchema } from '@/schemas/x/x.schema';

// In services
import { XSchema, type X } from '@/types/schemas';

// In components
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateXRequestSchema } from '@/types/schemas';
```

### Key Field Names (snake_case!)
- `personal_id` (not personalId)
- `account_type` (not accountType or type)
- `is_active` (not isActive)
- `initial_amount` (not initialBalance)
- `from_account_id` / `to_account_id` (for transfers)
- `email_or_username` (for login)

---

**Status**: ✅ Ready for Implementation  
**All schemas verified**: 100%  
**Estimated duration**: 8-10 weeks  
**Risk level**: Low (all schemas validated against actual DB/API)

**Good luck! 🚀**
