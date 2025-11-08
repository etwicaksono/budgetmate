# Zod Integration Plan - ADJUSTED FOR ACTUAL PROJECT STATE

> **Last Updated**: 2025-11-08
> **Status**: Validated against current project structure

## Critical Findings & Adjustments

### ✅ What's Correct in Original Plan
- Zod not yet installed (needs installation)
- schemas/ directory exists but is empty
- General structure and approach are sound
- Phase-based implementation strategy is good

### ⚠️ Critical Issues Found in Original Plan

#### 1. **Field Naming Convention**
- **Original Plan**: Uses camelCase (`initialBalance`, `isActive`)
- **Actual Project**: Uses snake_case (`initial_amount`, `is_active`)
- **Action**: All schemas MUST use snake_case to match database

#### 2. **Missing Fields in Original Plan**
- `personal_id` (BigInt) - Used for user-specific ordering, **required** in all resources
- `position` (Json, nullable) - Custom ordering field
- `usability` (string) - For accounts (e.g., 'ACTIVE')
- `account_type` (string) - Not just `type`
- `nature` (string) - For categories (NEED/WANT/MUST)
- `is_active` (boolean) - For categories (not `isActive`)
- `created_by`, `updated_by` (string, nullable) - Audit fields

#### 3. **Non-Existent Fields in Original Plan**
- ❌ `currency` - Accounts don't have currency field
- ❌ `tags` - Transactions don't support tags
- ❌ `rememberMe` - Login doesn't use this
- ❌ `alertThreshold` - Budgets table doesn't exist
- ❌ `exchangeRate` - Transfers don't have this

#### 4. **Field Length Constraints**
- `name`: VarChar(36) for accounts/categories, VarChar(64) for groups/debts
- `icon`: VarChar(36)
- `color`: VarChar(255) for accounts, VarChar(36) for categories
- `note`: Variable length string (nullable)

#### 5. **Auth Schema Issues**
- **Original**: `email` + `password` + `rememberMe`
- **Actual**: `email_or_username` + `password` (supports both email and username)

#### 6. **Missing API Routes**
- ❌ Budget API routes don't exist (budgetService exists but no API endpoints)
- ❌ No budgets table in database schema

#### 7. **Debt Schema Inconsistency**
- Database has: `name`, `type`, `account_id`
- API types suggest: `counterparty`, `amount`, `status`, `due_date`
- **Need to check actual API implementation**

#### 8. **Transfer Field Names**
- Schema uses: `from_account`, `to_account`
- API types use: `from_account_id`, `to_account_id`
- **Need consistent naming**

---

## Adjusted Implementation Plan

### Phase 1: Setup & Infrastructure (UNCHANGED)

#### Step 1: Install Dependencies
```bash
npm install zod
npm install @hookform/resolvers
```

#### Step 2: Create Directory Structure
```bash
mkdir -p schemas/common schemas/auth schemas/accounts schemas/categories schemas/transactions schemas/transfers schemas/debts schemas/groups
```

> **Note**: Skip `schemas/budgets` until budget API routes are implemented

---

### Phase 2: Create Base Schemas (ADJUSTED)

#### Step 3: Common Response Schema
**File**: `schemas/common/response.schema.ts`

```typescript
import { z } from 'zod';

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    message: z.string(),
    data: dataSchema.nullable(),
    meta: z.record(z.any()).nullable().optional(),
    errors: z.any().optional(),
  });

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

#### Step 4: Common Field Schemas
**File**: `schemas/common/fields.schema.ts`

```typescript
import { z } from 'zod';

// Reusable field validators matching actual database constraints
export const UuidSchema = z.string().uuid();

export const PersonalIdSchema = z.number().int().positive()
  .describe('User-specific sequential ID for ordering');

export const PositionSchema = z.any().nullable()
  .describe('JSON field for custom ordering');

export const AccountNameSchema = z.string().min(1).max(36);
export const CategoryNameSchema = z.string().min(1).max(36);
export const GroupNameSchema = z.string().min(1).max(64);
export const DebtNameSchema = z.string().min(1).max(64);

export const IconSchema = z.string().min(1).max(36);
export const AccountColorSchema = z.string().min(1).max(255);
export const CategoryColorSchema = z.string().min(1).max(36);

export const NoteSchema = z.string().nullable();

export const TimestampSchema = z.coerce.date();
export const AuditFieldSchema = z.string().max(64).nullable();

// Common base for all resources
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

#### Step 5: Pagination & Filter Schemas
**File**: `schemas/common/pagination.schema.ts`

```typescript
import { z } from 'zod';

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

export const DateRangeSchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
});

export const AmountRangeSchema = z.object({
  min_amount: z.coerce.number().optional(),
  max_amount: z.coerce.number().optional(),
});
```

#### Step 6: Auth Schemas (CORRECTED)
**File**: `schemas/auth/login.schema.ts`

```typescript
import { z } from 'zod';
import { UuidSchema } from '../common/fields.schema';

export const LoginRequestSchema = z.object({
  email_or_username: z.string().min(1, 'Email or username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const UserProfileSchema = z.object({
  id: UuidSchema,
  email: z.string().email(),
  username: z.string().min(1),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

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

export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
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

export const RefreshTokenRequestSchema = z.object({
  refresh_token: z.string().min(1),
});

export const RefreshTokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expired_at: z.string().datetime(),
  refreshable_until: z.string().datetime(),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenRequestSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
```

#### Step 7: Account Schemas (CORRECTED)
**File**: `schemas/accounts/account.schema.ts`

```typescript
import { z } from 'zod';
import { BaseResourceSchema, UuidSchema, AccountNameSchema, IconSchema, AccountColorSchema, NoteSchema } from '../common/fields.schema';

// Actual database values for account_type and usability
export const AccountTypeSchema = z.string().max(32);
export const UsabilitySchema = z.string().max(32);

export const AccountBaseSchema = z.object({
  name: AccountNameSchema,
  icon: IconSchema,
  active: z.boolean().default(true),
  usability: UsabilitySchema.default('ACTIVE'),
  account_type: AccountTypeSchema,
  color: AccountColorSchema,
  initial_amount: z.number().default(0),
  group_id: UuidSchema.nullable().optional(),
});

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

export const UpdateAccountRequestSchema = CreateAccountRequestSchema.partial().omit({ personal_id: true });

export const AccountSchema = BaseResourceSchema.merge(AccountBaseSchema).extend({
  balance: z.number(), // Calculated field
});

export const SwapOrderRequestSchema = z.object({
  order_map: z.array(
    z.object({
      id: UuidSchema,
      personal_id: z.number().int().positive(),
    })
  ).min(1),
});

export type Account = z.infer<typeof AccountSchema>;
export type CreateAccountRequest = z.infer<typeof CreateAccountRequestSchema>;
export type UpdateAccountRequest = z.infer<typeof UpdateAccountRequestSchema>;
export type SwapOrderRequest = z.infer<typeof SwapOrderRequestSchema>;
```

#### Step 8: Category Schemas (CORRECTED)
**File**: `schemas/categories/category.schema.ts`

```typescript
import { z } from 'zod';
import { BaseResourceSchema, UuidSchema, CategoryNameSchema, IconSchema, CategoryColorSchema } from '../common/fields.schema';

export const CategoryNatureSchema = z.enum(['NEED', 'WANT', 'MUST']);

export const CategoryBaseSchema = z.object({
  name: CategoryNameSchema,
  icon: IconSchema,
  color: CategoryColorSchema.nullable().optional(),
  nature: CategoryNatureSchema.default('NEED'),
  parent_id: UuidSchema.nullable().optional(),
  is_active: z.boolean().default(true),
});

export const CreateCategoryRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  name: CategoryNameSchema,
  icon: IconSchema,
  color: CategoryColorSchema.nullable().optional(),
  nature: CategoryNatureSchema.optional(),
  parent_id: UuidSchema.nullable().optional(),
  is_active: z.boolean().optional(),
});

export const UpdateCategoryRequestSchema = CreateCategoryRequestSchema.partial().omit({ personal_id: true });

export const CategorySchema = BaseResourceSchema.merge(CategoryBaseSchema);

export const CategoryTreeSchema: z.ZodType<any> = CategorySchema.extend({
  children: z.lazy(() => CategoryTreeSchema.array()),
});

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategoryRequest = z.infer<typeof CreateCategoryRequestSchema>;
export type UpdateCategoryRequest = z.infer<typeof UpdateCategoryRequestSchema>;
```

#### Step 9: Transaction Schemas (CORRECTED)
**File**: `schemas/transactions/transaction.schema.ts`

```typescript
import { z } from 'zod';
import { BaseResourceSchema, UuidSchema, NoteSchema } from '../common/fields.schema';

export const TransactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);

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

export const CreateTransactionRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  account_id: UuidSchema,
  category_id: UuidSchema,
  type: TransactionTypeSchema,
  amount: z.number().refine((val) => val !== 0, 'Amount cannot be zero'),
  date: z.coerce.date(),
  note: NoteSchema.optional(),
});

export const UpdateTransactionRequestSchema = CreateTransactionRequestSchema.partial().omit({ personal_id: true });

export const TransactionSchema = BaseResourceSchema.merge(TransactionBaseSchema);

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
export type TransactionFilters = z.infer<typeof TransactionFiltersSchema>;
export type TransactionSummary = z.infer<typeof TransactionSummarySchema>;
```

#### Step 10: Transfer Schemas (VERIFIED ✅)
**File**: `schemas/transfers/transfer.schema.ts`

```typescript
import { z } from 'zod';
import { BaseResourceSchema, UuidSchema } from '../common/fields.schema';

// Database schema uses from_account/to_account
export const TransferBaseSchema = z.object({
  date: z.coerce.date(),
  from_account: UuidSchema,
  to_account: UuidSchema,
  amount: z.number().positive('Amount must be positive'),
  note: z.string(), // Not nullable (defaults to empty string)
});

// API Request schema uses from_account_id/to_account_id
export const CreateTransferRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  from_account_id: UuidSchema,
  to_account_id: UuidSchema,
  amount: z.number().positive('Amount must be greater than 0'),
  date: z.coerce.date(),
  note: z.string().optional(),
}).refine(
  (data) => data.from_account_id !== data.to_account_id,
  { message: 'Source and destination accounts must be different', path: ['to_account_id'] }
);

export const UpdateTransferRequestSchema = z.object({
  from_account_id: UuidSchema.optional(),
  to_account_id: UuidSchema.optional(),
  amount: z.number().positive().optional(),
  date: z.coerce.date().optional(),
  note: z.string().optional(),
}).refine(
  (data) => {
    if (data.from_account_id && data.to_account_id) {
      return data.from_account_id !== data.to_account_id;
    }
    return true;
  },
  { message: 'Source and destination accounts must be different', path: ['to_account_id'] }
);

// Database schema
export const TransferSchema = BaseResourceSchema.merge(TransferBaseSchema);

// API Response schema (includes account details)
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

> **✅ VERIFIED**: DB uses `from_account`/`to_account`, API uses `from_account_id`/`to_account_id`. Note is required (defaults to empty string). Transfer creation automatically creates 2 linked transactions.

#### Step 11: Debt Schemas (VERIFIED ✅)
**File**: `schemas/debts/debt.schema.ts`

```typescript
import { z } from 'zod';
import { BaseResourceSchema, UuidSchema, DebtNameSchema } from '../common/fields.schema';

// Verified: API uses PAYABLE/RECEIVABLE (not LENT/BORROWED)
export const DebtTypeSchema = z.enum(['PAYABLE', 'RECEIVABLE']);

export const DebtBaseSchema = z.object({
  account_id: UuidSchema,
  name: DebtNameSchema, // Counterparty name (person/company)
  type: DebtTypeSchema,
});

export const CreateDebtRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  account_id: UuidSchema,
  name: z.string().min(1, 'Name cannot be empty').max(64),
  type: DebtTypeSchema,
});

export const UpdateDebtRequestSchema = z.object({
  account_id: UuidSchema.optional(),
  name: z.string().min(1, 'Name cannot be empty').max(64).optional(),
  type: DebtTypeSchema.optional(),
});

// Database schema
export const DebtSchema = BaseResourceSchema.merge(DebtBaseSchema);

// API Response schema (includes calculated fields)
export const DebtResponseSchema = DebtSchema.extend({
  account_name: z.string(),
  account_icon: z.string(),
  balance: z.number(), // Calculated from transactions
  transaction_count: z.number().int().nonnegative(),
});

export type Debt = z.infer<typeof DebtSchema>;
export type DebtResponse = z.infer<typeof DebtResponseSchema>;
export type CreateDebtRequest = z.infer<typeof CreateDebtRequestSchema>;
export type UpdateDebtRequest = z.infer<typeof UpdateDebtRequestSchema>;
```

> **✅ VERIFIED**: Debt types are PAYABLE/RECEIVABLE. Balance is calculated from linked transactions, not stored.

#### Step 12: Group Schemas (NEW)
**File**: `schemas/groups/group.schema.ts`

```typescript
import { z } from 'zod';
import { BaseResourceSchema, GroupNameSchema } from '../common/fields.schema';

export const GroupBaseSchema = z.object({
  name: GroupNameSchema,
});

export const CreateGroupRequestSchema = z.object({
  personal_id: z.number().int().positive(),
  name: GroupNameSchema,
});

export const UpdateGroupRequestSchema = z.object({
  name: GroupNameSchema.optional(),
});

export const GroupSchema = BaseResourceSchema.merge(GroupBaseSchema);

export type Group = z.infer<typeof GroupSchema>;
export type CreateGroupRequest = z.infer<typeof CreateGroupRequestSchema>;
```

#### Step 13: Central Export
**File**: `schemas/index.ts`

```typescript
// Common
export * from './common/response.schema';
export * from './common/pagination.schema';
export * from './common/filters.schema';
export * from './common/fields.schema';

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
export * from './groups/group.schema';

// Note: Budget schemas excluded until API routes are implemented
```

---

### Phase 3-8: Backend & Frontend Integration

> **Note**: Use the same structure as original plan but with corrected schema imports and field names.

**Key reminders for implementation:**
1. ✅ Use snake_case for all field names
2. ✅ Include `personal_id` in all create requests
3. ✅ Include `position` field in all schemas
4. ✅ Respect database field length constraints
5. ✅ Use actual database field names (`account_type` not `type`, `is_active` not `isActive`)
6. ⚠️ Skip budget implementation until routes exist
7. ⚠️ Verify debt schema before implementing validation

---

## Implementation Priority (Adjusted)

### Week 1-2: Foundation + Auth
- [ ] Install dependencies
- [ ] Create common schemas (response, pagination, fields)
- [ ] Create auth schemas (corrected)
- [ ] Implement auth API validation
- [ ] Update authService with validation

### Week 3: Accounts
- [ ] Create account schemas
- [ ] Update account API routes with validation
- [ ] Update accountService
- [ ] Update account forms

### Week 4: Categories
- [ ] Create category schemas
- [ ] Update category API routes (including tree endpoint)
- [ ] Update categoryService
- [ ] Update category forms

### Week 5: Groups
- [ ] Create group schemas
- [ ] Update group API routes
- [ ] Update forms that use groups

### Week 6: Transactions
- [ ] Create transaction schemas
- [ ] Update transaction API routes (including summary)
- [ ] Update transactionService
- [ ] Update transaction forms

### Week 7: Transfers (✅ Verified)
- [ ] Create transfer schemas (field naming verified)
- [ ] Update transfer API routes with validation
- [ ] Handle DB/API field name differences (from_account vs from_account_id)
- [ ] Update transfer forms
- [ ] Ensure note field is always provided

### Week 8: Debts (✅ Verified)
- [ ] Create debt schemas (types verified: PAYABLE/RECEIVABLE)
- [ ] Update debt API routes with validation
- [ ] Update debt forms
- [ ] Handle calculated fields (balance, transaction_count)

### Week 9-10: Testing & Cleanup
- [ ] Write schema unit tests
- [ ] Write API integration tests
- [ ] Update documentation
- [ ] Remove old manual types from `src/types/api.ts`

---

## Critical Verifications Completed ✅

All schemas have been verified against actual implementations:

1. ✅ **Debt API** - Uses PAYABLE/RECEIVABLE types, calculates balance from transactions
2. ✅ **Transfer API** - DB uses `from_account`/`to_account`, API uses `from_account_id`/`to_account_id`
3. ✅ **All field lengths** - Verified against Prisma schema
4. ✅ **Auth login** - Uses `email_or_username`, not separate email field

### Remaining Verifications Before Implementation:

1. **Custom validation logic** - Check existing API routes for business rules not yet captured
2. **Frontend forms** - Verify field names used in existing forms match API expectations

---

## Files to Check Before Starting

1. `app/api/v1/debts/route.ts` - Verify actual debt fields
2. `app/api/v1/transfers/route.ts` - Verify field naming
3. All API route files - Check for existing validation logic
4. `src/services/*.ts` - Check service layer patterns

---

## Migration Strategy (Adjusted)

1. **Start with Auth** (most critical, well-defined)
2. **Then Accounts** (simple CRUD, clear fields)
3. **Then Categories** (has tree structure but clear fields)
4. **Then Groups** (simplest schema)
5. **Then Transactions** (complex but clear)
6. **Then Transfers** (verify field names first)
7. **Then Debts** (verify schema first)
8. **Skip Budgets** (no API routes exist)

---

## Success Criteria (Adjusted)

- [ ] All existing API routes validate requests
- [ ] All existing API routes validate responses
- [ ] All services validate data
- [ ] All forms use zodResolver
- [ ] Schema unit tests pass
- [ ] API integration tests pass
- [ ] No TypeScript errors
- [ ] All database field constraints respected
- [ ] Documentation updated
- [ ] Old types from `src/types/api.ts` can be safely removed

---

**Last Validation**: 2025-11-08
**Validated Against**: Prisma schema, API routes, existing types
**Status**: Ready for implementation
