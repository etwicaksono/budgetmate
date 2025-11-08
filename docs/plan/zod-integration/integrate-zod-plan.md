# Zod Integration Plan for Next.js Finance Application

> **For AI Agent**: Follow this plan step-by-step. Each step is numbered and includes specific actions to take.

## Quick Navigation
- [Phase 1: Setup](#phase-1-setup--infrastructure) (Steps 1-2)
- [Phase 2: Base Schemas](#phase-2-create-base-schemas) (Steps 3-13)
- [Phase 3: Backend Integration](#phase-3-backend-api-integration) (Steps 14-18)
- [Phase 4: Frontend Integration](#phase-4-frontend-integration) (Steps 19-22)
- [Phase 5: Migration](#phase-5-systematic-migration) (Steps 23-25)
- [Phase 6: Advanced Features](#phase-6-advanced-features) (Steps 26-30)
- [Phase 7: Testing](#phase-7-testing) (Steps 31-33)
- [Phase 8: Documentation](#phase-8-documentation) (Steps 34-36)

---

## Phase 1: Setup & Infrastructure

### Step 1: Install Dependencies

```bash
npm install zod
npm install @hookform/resolvers
```

### Step 2: Create Directory Structure

```bash
mkdir -p schemas/{common,auth,accounts,categories,transactions,transfers,debts,groups,budgets}
```

---

## Phase 2: Create Base Schemas

### Step 3: Create Common Response Schema

**File**: `schemas/common/response.schema.ts`

```typescript
import { z } from 'zod';

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
  });

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    }),
  });
```

### Step 4: Create Pagination Schema

**File**: `schemas/common/pagination.schema.ts`

```typescript
import { z } from 'zod';

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
```

### Step 5: Create Filter Schemas

**File**: `schemas/common/filters.schema.ts`

```typescript
import { z } from 'zod';

export const DateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const AmountRangeSchema = z.object({
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
});

export const SearchQuerySchema = z.object({
  search: z.string().optional(),
});
```

### Step 6: Create Auth Schemas

**Files to create**:
1. `schemas/auth/login.schema.ts`
2. `schemas/auth/register.schema.ts`
3. `schemas/auth/refresh.schema.ts`

**Example - Login Schema**:

```typescript
import { z } from 'zod';

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  rememberMe: z.boolean().optional().default(false),
});

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().optional(),
  }),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
```

### Step 7: Create Account Schemas

**File**: `schemas/accounts/account.schema.ts`

```typescript
import { z } from 'zod';

export const AccountTypeSchema = z.enum(['CASH', 'BANK', 'CREDIT_CARD', 'INVESTMENT', 'LOAN', 'OTHER']);

export const AccountBaseSchema = z.object({
  name: z.string().min(1).max(100),
  type: AccountTypeSchema,
  currency: z.string().length(3).toUpperCase(),
  initialBalance: z.number().default(0),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().default(true),
});

export const CreateAccountSchema = AccountBaseSchema;
export const UpdateAccountSchema = AccountBaseSchema.partial();

export const AccountSchema = AccountBaseSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  currentBalance: z.number(),
  order: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Account = z.infer<typeof AccountSchema>;
export type CreateAccount = z.infer<typeof CreateAccountSchema>;
export type UpdateAccount = z.infer<typeof UpdateAccountSchema>;
```

### Step 8: Create Category Schemas

**File**: `schemas/categories/category.schema.ts`

```typescript
import { z } from 'zod';

export const CategoryTypeSchema = z.enum(['INCOME', 'EXPENSE']);

export const CategoryBaseSchema = z.object({
  name: z.string().min(1).max(100),
  type: CategoryTypeSchema,
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
  parentId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const CreateCategorySchema = CategoryBaseSchema;
export const UpdateCategorySchema = CategoryBaseSchema.partial();

export const CategorySchema = CategoryBaseSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  order: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Category = z.infer<typeof CategorySchema>;
```

### Step 9: Create Transaction Schemas

**File**: `schemas/transactions/transaction.schema.ts`

```typescript
import { z } from 'zod';

export const TransactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);

export const TransactionBaseSchema = z.object({
  amount: z.number().refine((val) => val !== 0, 'Amount cannot be zero'),
  type: TransactionTypeSchema,
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  date: z.coerce.date(),
  description: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const CreateTransactionSchema = TransactionBaseSchema.refine(
  (data) => {
    if (data.type === 'EXPENSE' && data.amount > 0) return false;
    if (data.type === 'INCOME' && data.amount < 0) return false;
    return true;
  },
  { message: 'Amount sign must match transaction type', path: ['amount'] }
);

export const TransactionSchema = TransactionBaseSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Transaction = z.infer<typeof TransactionSchema>;
```

### Step 10: Create Transfer Schemas

**File**: `schemas/transfers/transfer.schema.ts`

```typescript
import { z } from 'zod';

export const TransferBaseSchema = z.object({
  amount: z.number().positive(),
  fromAccountId: z.string().uuid(),
  toAccountId: z.string().uuid(),
  date: z.coerce.date(),
  description: z.string().max(500).optional(),
  exchangeRate: z.number().positive().optional().default(1),
}).refine(
  (data) => data.fromAccountId !== data.toAccountId,
  { message: 'Source and destination must be different', path: ['toAccountId'] }
);

export const CreateTransferSchema = TransferBaseSchema;
export const TransferSchema = TransferBaseSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Transfer = z.infer<typeof TransferSchema>;
```

### Step 11: Create Debt Schemas

**File**: `schemas/debts/debt.schema.ts`

```typescript
import { z } from 'zod';

export const DebtTypeSchema = z.enum(['LENT', 'BORROWED']);
export const DebtStatusSchema = z.enum(['ACTIVE', 'PAID', 'CANCELLED']);

export const DebtBaseSchema = z.object({
  type: DebtTypeSchema,
  amount: z.number().positive(),
  currency: z.string().length(3).toUpperCase(),
  personName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  dueDate: z.coerce.date().optional(),
  status: DebtStatusSchema.default('ACTIVE'),
});

export const DebtSchema = DebtBaseSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Debt = z.infer<typeof DebtSchema>;
```

### Step 12: Create Budget Schemas

**File**: `schemas/budgets/budget.schema.ts`

```typescript
import { z } from 'zod';

export const BudgetPeriodSchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);

export const BudgetBaseSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  period: BudgetPeriodSchema,
  categoryId: z.string().uuid().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  alertThreshold: z.number().min(0).max(100).default(80),
  isActive: z.boolean().default(true),
});

export const BudgetSchema = BudgetBaseSchema.extend({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  spent: z.number().nonnegative().default(0),
  remaining: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Budget = z.infer<typeof BudgetSchema>;
```

### Step 13: Create Central Export

**File**: `schemas/index.ts`

```typescript
// Common
export * from './common/response.schema';
export * from './common/pagination.schema';
export * from './common/filters.schema';

// Auth
export * from './auth/login.schema';
export * from './auth/register.schema';
export * from './auth/refresh.schema';

// Domain
export * from './accounts/account.schema';
export * from './categories/category.schema';
export * from './transactions/transaction.schema';
export * from './transfers/transfer.schema';
export * from './debts/debt.schema';
export * from './budgets/budget.schema';
```

---

## Phase 3: Backend API Integration

### Step 14: Create Validation Utilities

**File**: `lib/validation.ts`

```typescript
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export class ValidationError extends Error {
  constructor(public errors: z.ZodError) {
    super('Validation failed');
    this.name = 'ValidationError';
  }
}

export async function validateBody<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): Promise<z.infer<T>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) throw new ValidationError(error);
    throw error;
  }
}

export function validateQuery<T extends z.ZodType>(
  request: NextRequest,
  schema: T
): z.infer<T> {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) throw new ValidationError(error);
    throw error;
  }
}

export function validatePathParams<T extends z.ZodType>(
  params: Record<string, string>,
  schema: T
): z.infer<T> {
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) throw new ValidationError(error);
    throw error;
  }
}

export function handleValidationError(error: unknown): NextResponse {
  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        details: error.errors.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
        })),
      },
      { status: 400 }
    );
  }
  
  return NextResponse.json(
    { success: false, error: 'Internal server error' },
    { status: 500 }
  );
}
```

### Step 15: Update Auth API Routes

**Pattern for all auth routes**:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateBody, handleValidationError } from '@/lib/validation';
import { LoginRequestSchema, LoginResponseSchema } from '@/schemas/auth/login.schema';

export async function POST(request: NextRequest) {
  try {
    const body = await validateBody(request, LoginRequestSchema);
    const result = await authenticateUser(body);
    const validated = LoginResponseSchema.parse(result);
    
    return NextResponse.json({ success: true, data: validated });
  } catch (error) {
    return handleValidationError(error);
  }
}
```

Apply this pattern to:
- `app/api/v1/auth/login/route.ts`
- `app/api/v1/auth/register/route.ts`
- `app/api/v1/auth/refresh/route.ts`
- `app/api/v1/auth/logout/route.ts`

### Step 16: Update Account API Routes

**File**: `app/api/v1/accounts/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateBody, validateQuery, handleValidationError } from '@/lib/validation';
import { CreateAccountSchema, AccountSchema } from '@/schemas/accounts/account.schema';
import { PaginationQuerySchema } from '@/schemas/common/pagination.schema';

export async function GET(request: NextRequest) {
  try {
    const query = validateQuery(request, PaginationQuerySchema);
    const { accounts, total } = await fetchAccounts(query);
    
    return NextResponse.json({
      data: accounts.map(a => AccountSchema.parse(a)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    return handleValidationError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await validateBody(request, CreateAccountSchema);
    const userId = await getUserIdFromRequest(request);
    const account = await createAccount({ ...body, userId });
    
    return NextResponse.json(
      { success: true, data: AccountSchema.parse(account) },
      { status: 201 }
    );
  } catch (error) {
    return handleValidationError(error);
  }
}
```

**File**: `app/api/v1/accounts/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateBody, validatePathParams, handleValidationError } from '@/lib/validation';
import { UpdateAccountSchema, AccountSchema } from '@/schemas/accounts/account.schema';

const PathParamsSchema = z.object({ id: z.string().uuid() });

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = validatePathParams(params, PathParamsSchema);
    const account = await getAccountById(id);
    
    if (!account) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: AccountSchema.parse(account) });
  } catch (error) {
    return handleValidationError(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = validatePathParams(params, PathParamsSchema);
    const body = await validateBody(request, UpdateAccountSchema);
    const account = await updateAccount(id, body);
    
    return NextResponse.json({ success: true, data: AccountSchema.parse(account) });
  } catch (error) {
    return handleValidationError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = validatePathParams(params, PathParamsSchema);
    await deleteAccount(id);
    
    return NextResponse.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    return handleValidationError(error);
  }
}
```

### Step 17: Create API Route Template

**For AI Agent**: Use this template for all remaining API routes:

```typescript
// 1. Import validation utilities and schemas
import { validateBody, validateQuery, validatePathParams, handleValidationError } from '@/lib/validation';
import { CreateXSchema, XSchema } from '@/schemas/x/x.schema';

// 2. Define path params schema if needed
const PathParamsSchema = z.object({ id: z.string().uuid() });

// 3. Implement GET (list)
export async function GET(request: NextRequest) {
  try {
    const query = validateQuery(request, QuerySchema);
    const data = await fetchResources(query);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleValidationError(error);
  }
}

// 4. Implement POST (create)
export async function POST(request: NextRequest) {
  try {
    const body = await validateBody(request, CreateXSchema);
    const resource = await createResource(body);
    return NextResponse.json({ success: true, data: XSchema.parse(resource) }, { status: 201 });
  } catch (error) {
    return handleValidationError(error);
  }
}

// 5. Implement GET by ID, PUT, DELETE similarly
```

### Step 18: Migration Checklist for Backend

For each endpoint, complete these tasks:

- [ ] Create/update schema file
- [ ] Import validation utilities
- [ ] Add validation to GET (query params)
- [ ] Add validation to POST (body)
- [ ] Add validation to PUT/PATCH (body + path params)
- [ ] Add validation to DELETE (path params)
- [ ] Add error handling
- [ ] Test with valid data
- [ ] Test with invalid data

---

## Phase 4: Frontend Integration

### Step 19: Create Type Utilities

**File**: `src/types/schemas.ts`

```typescript
// Re-export all schemas for frontend use
export * from '@/schemas';
```

### Step 20: Update Service Layer

**Pattern for all services**:

```typescript
import { z } from 'zod';
import { XSchema, CreateXSchema, UpdateXSchema, type X } from '@/types/schemas';
import { ApiResponseSchema, PaginatedResponseSchema } from '@/schemas/common/response.schema';
import api from './api';

export const xService = {
  async getAll(params?: any) {
    const response = await api.get('/x', { params });
    const schema = PaginatedResponseSchema(XSchema);
    return schema.parse(response.data);
  },

  async getById(id: string): Promise<X> {
    const response = await api.get(\`/x/\${id}\`);
    const schema = ApiResponseSchema(XSchema);
    const validated = schema.parse(response.data);
    if (!validated.data) throw new Error('Not found');
    return validated.data;
  },

  async create(data: CreateX): Promise<X> {
    const validatedData = CreateXSchema.parse(data);
    const response = await api.post('/x', validatedData);
    const schema = ApiResponseSchema(XSchema);
    const validated = schema.parse(response.data);
    if (!validated.data) throw new Error('Failed to create');
    return validated.data;
  },

  async update(id: string, data: UpdateX): Promise<X> {
    const validatedData = UpdateXSchema.parse(data);
    const response = await api.put(\`/x/\${id}\`, validatedData);
    const schema = ApiResponseSchema(XSchema);
    const validated = schema.parse(response.data);
    if (!validated.data) throw new Error('Failed to update');
    return validated.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(\`/x/\${id}\`);
  },
};
```

Apply to all services:
- `src/services/authService.ts`
- `src/services/accountService.ts`
- `src/services/categoryService.ts`
- `src/services/transactionService.ts`
- `src/services/budgetService.ts`

### Step 21: Update Form Components

**Pattern for all forms**:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateXSchema, type CreateX } from '@/types/schemas';

export function XForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateX>({
    resolver: zodResolver(CreateXSchema),
    defaultValues: {
      // Set defaults here
    },
  });

  const onSubmit = async (data: CreateX) => {
    try {
      await xService.create(data);
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('fieldName')} />
      {errors.fieldName && <span>{errors.fieldName.message}</span>}
      <button type="submit">Submit</button>
    </form>
  );
}
```

Apply to forms in:
- `src/views/Login/Login.tsx`
- `src/views/Register/Register.tsx`
- `src/components/AddAccountModal.tsx`
- All other forms

### Step 22: Frontend Migration Checklist

For each service/component:

- [ ] Import schemas from `@/types/schemas`
- [ ] Add request validation in services
- [ ] Add response validation in services
- [ ] Update service return types
- [ ] Add `zodResolver` to forms
- [ ] Display validation errors
- [ ] Test form submission
- [ ] Remove old manual types

---

## Phase 5: Systematic Migration

### Step 23: Migration Order

**Week 1-2**: Auth
- [ ] Auth schemas
- [ ] Auth API routes
- [ ] Auth services
- [ ] Login/Register forms

**Week 3**: Simple Resources
- [ ] Accounts (CRUD + swap-order)
- [ ] Groups (CRUD)

**Week 4**: Hierarchical Resources
- [ ] Categories (CRUD + tree + swap-order)

**Week 5**: Financial Resources
- [ ] Debts (CRUD)
- [ ] Budgets (CRUD)

**Week 6-7**: Complex Resources
- [ ] Transactions (CRUD + summary)
- [ ] Transfers (CRUD)

**Week 8**: Service Layer
- [ ] Update all services with validation

**Week 9**: Components
- [ ] Update all forms with zodResolver

**Week 10**: Testing & Documentation

### Step 24: Per-Endpoint Checklist

For EACH endpoint:

**Backend**:
1. Create schema file
2. Define all schema variants (base, create, update, response)
3. Export types
4. Update API route with validation
5. Add error handling
6. Test with valid/invalid data

**Frontend**:
7. Update service with validation
8. Update component/form with zodResolver
9. Test end-to-end

### Step 25: Testing Strategy

For each migrated endpoint:
- [ ] Test successful request with valid data
- [ ] Test request with invalid data types
- [ ] Test request with missing required fields
- [ ] Test request with boundary values
- [ ] Verify error messages are clear
- [ ] Verify response structure matches schema

---

## Phase 6: Advanced Features

### Step 26: Custom Validation Helpers

**File**: `lib/validation-helpers.ts`

```typescript
import { z } from 'zod';

export const pastDate = () =>
  z.date().refine((date) => date <= new Date(), 'Date cannot be in the future');

export const futureDate = () =>
  z.date().refine((date) => date >= new Date(), 'Date cannot be in the past');

export const currencyCode = () =>
  z.string().length(3).toUpperCase().regex(/^[A-Z]{3}$/);

export const positiveAmount = () => z.number().positive().finite();

export const hexColor = () => z.string().regex(/^#[0-9A-Fa-f]{6}$/);

export const dateRange = () =>
  z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  }).refine(
    (data) => data.endDate >= data.startDate,
    { message: 'End date must be after start date', path: ['endDate'] }
  );
```

### Step 27: Schema Composition

**File**: `schemas/common/base.schema.ts`

```typescript
import { z } from 'zod';

export const TimestampSchema = z.object({
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const UserOwnedSchema = z.object({
  userId: z.string().uuid(),
});

export const ResourceSchema = z.object({
  id: z.string().uuid(),
}).merge(UserOwnedSchema).merge(TimestampSchema);

// Use in domain schemas
export const AccountSchema = ResourceSchema.extend({
  name: z.string(),
  // ... other fields
});
```

### Step 28: Environment Validation

**File**: `lib/env.ts`

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXT_PUBLIC_API_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']),
});

export const env = envSchema.parse(process.env);
```

### Step 29: Type Guards

**File**: `lib/type-guards.ts`

```typescript
import { z } from 'zod';
import { ApiResponseSchema } from '@/schemas/common/response.schema';

export function isSuccessResponse<T>(
  response: unknown,
  dataSchema: z.ZodType<T>
): response is { success: true; data: T } {
  const schema = ApiResponseSchema(dataSchema);
  const result = schema.safeParse(response);
  return result.success && result.data.success === true && result.data.data !== undefined;
}

export function unwrapApiResponse<T>(response: unknown, dataSchema: z.ZodType<T>): T {
  if (isSuccessResponse(response, dataSchema)) {
    return response.data;
  }
  throw new Error('Invalid response');
}
```

### Step 30: Error Formatting

**File**: `lib/format-validation-errors.ts`

```typescript
import { z } from 'zod';

export function formatZodErrors(error: z.ZodError) {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

export function zodErrorsToFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  error.errors.forEach((err) => {
    const field = err.path.join('.');
    if (!fieldErrors[field]) {
      fieldErrors[field] = err.message;
    }
  });
  return fieldErrors;
}
```

---

## Phase 7: Testing

### Step 31: Schema Unit Tests

**File**: `schemas/__tests__/account.schema.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { CreateAccountSchema } from '../accounts/account.schema';

describe('CreateAccountSchema', () => {
  it('should validate valid data', () => {
    const data = { name: 'Test', type: 'BANK', currency: 'USD' };
    const result = CreateAccountSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject invalid data', () => {
    const data = { name: '', type: 'INVALID', currency: 'US' };
    const result = CreateAccountSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
```

### Step 32: API Integration Tests

**File**: `__tests__/api/accounts.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { POST } from '@/app/api/v1/accounts/route';

describe('POST /api/v1/accounts', () => {
  it('should create account with valid data', async () => {
    const request = new NextRequest('http://localhost/api/v1/accounts', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', type: 'BANK', currency: 'USD' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
  });

  it('should reject invalid data', async () => {
    const request = new NextRequest('http://localhost/api/v1/accounts', {
      method: 'POST',
      body: JSON.stringify({ name: '', type: 'INVALID' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

### Step 33: Form Tests

Test forms with React Testing Library to ensure validation works correctly.

---

## Phase 8: Documentation

### Step 34: Migration Guide

Create `docs/ZOD_MIGRATION_GUIDE.md` with:
- Overview of changes
- Usage patterns
- Examples
- Best practices
- Troubleshooting

### Step 35: API Documentation

Create `docs/API_SCHEMAS.md` with:
- Schema definitions
- Request/response formats
- Validation rules
- Examples

### Step 36: Developer Onboarding

Create `docs/DEVELOPER_ONBOARDING.md` with:
- Quick start guide
- Common tasks
- Code review checklist
- Getting help

---

## Implementation Timeline

### 10-Week Schedule

**Week 1-2**: Foundation
- Setup, common schemas, auth implementation

**Week 3**: Simple Resources
- Accounts, Groups

**Week 4**: Hierarchical Resources
- Categories

**Week 5**: Financial Resources
- Debts, Budgets

**Week 6-7**: Complex Resources
- Transactions, Transfers

**Week 8**: Service Layer
- Update all services

**Week 9**: Components
- Update all forms

**Week 10**: Testing & Documentation
- Write tests, complete docs

---

## Success Criteria

### Completion Checklist

- [ ] All API routes validate requests
- [ ] All API routes validate responses
- [ ] All services validate data
- [ ] All forms use zodResolver
- [ ] Schema unit tests written
- [ ] API integration tests pass
- [ ] Documentation complete
- [ ] No manual types remaining
- [ ] Code review passed

---

## Key Commands for AI Agent

### Create a new schema:
```bash
# 1. Create file
touch schemas/domain/resource.schema.ts

# 2. Define schemas (base, create, update, response)
# 3. Export types
```

### Update an API route:
```bash
# 1. Import validation utilities
# 2. Import schemas
# 3. Add validation to each HTTP method
# 4. Add error handling
# 5. Test endpoint
```

### Update a service:
```bash
# 1. Import schemas
# 2. Add request validation
# 3. Add response validation
# 4. Update return types
```

### Update a form:
```bash
# 1. Import zodResolver and schema
# 2. Use resolver in useForm
# 3. Display errors
# 4. Test submission
```

---

## Troubleshooting

### Common Issues

**"Expected string, received number"**
→ Use `z.coerce.number()` for query params

**"Required field" for optional fields**
→ Use `.optional()` or `.nullable()`

**Validation passes but TypeScript errors**
→ Use `z.infer<typeof Schema>` for types

---

## Resources

- [Zod Documentation](https://zod.dev)
- [React Hook Form + Zod](https://react-hook-form.com/get-started#SchemaValidation)
- Project schemas: `schemas/` directory

---

## For AI Agent: Quick Reference

### Order of Operations
1. Create schema → 2. Update API route → 3. Update service → 4. Update form → 5. Test

### Files to Create/Modify per Resource
- `schemas/[resource]/[resource].schema.ts`
- `app/api/v1/[resource]/route.ts`
- `app/api/v1/[resource]/[id]/route.ts`
- `src/services/[resource]Service.ts`
- Form components that use the resource

### Testing Steps
1. Test with valid data
2. Test with invalid data
3. Test with missing fields
4. Test with wrong types
5. Verify error messages

---

**End of Plan**