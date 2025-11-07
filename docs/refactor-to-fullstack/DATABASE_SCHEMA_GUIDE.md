# Your Database Schema - Migration Guide

## Database Overview

Based on your `finance-api.sql` file, here's your complete database structure:

### Tables
1. **users** - User accounts
2. **accounts** - Financial accounts (Cash, Bank, E-wallet, etc.)
3. **categories** - Transaction categories (hierarchical with parent_id)
4. **transactions** - Income/Expense transactions
5. **transfers** - Money transfers between accounts
6. **debts** - Debt tracking
7. **groups** - Account groups

## Complete Table Schemas

### 1. users Table
```sql
CREATE TABLE "public"."users" (
  "id" varchar(36) PRIMARY KEY,
  "name" varchar(64) NOT NULL,
  "email" varchar(36) NOT NULL,
  "username" varchar(36) NOT NULL,
  "password" varchar(255) NOT NULL,  -- bcrypt hashed ($2y$)
  "created_at" date NOT NULL,
  "created_by" varchar(64),
  "updated_at" date,
  "updated_by" varchar(64)
)
```

**Key Notes:**
- `id` is UUID (varchar 36)
- `username` is used for login
- `password` is bcrypt hashed with `$2y$` prefix
- No `personal_id` in this table

---

### 2. accounts Table
```sql
CREATE TABLE "public"."accounts" (
  "id" varchar(36) PRIMARY KEY,
  "user_id" varchar(36) NOT NULL,          -- FK to users
  "personal_id" int8 NOT NULL,             -- Per-user sequence
  "name" varchar(36) NOT NULL,
  "icon" varchar(36) NOT NULL,
  "active" bool NOT NULL,
  "usability" varchar(32) NOT NULL,
  "account_type" varchar(32) NOT NULL,
  "color" varchar(255) NOT NULL,
  "initial_amount" float8,                 -- Nullable
  "group_id" varchar(36),                  -- FK to groups, Nullable
  "position" json,                         -- Nullable
  "created_at" date NOT NULL,
  "created_by" varchar(64),
  "updated_at" date,
  "updated_by" varchar(64),
  UNIQUE ("user_id", "personal_id")
)
```

**Key Notes:**
- `usability` values: "USABLE" (from your data)
- `account_type` values: "Cash", "Checking account", "General", "Savings account"
- `initial_amount` is the starting balance (can be null)
- `group_id` is optional (for grouping accounts)
- **Unique constraint** on (user_id, personal_id)

**Foreign Keys:**
- `user_id` → users(id) ON DELETE RESTRICT ON UPDATE CASCADE
- `group_id` → groups(id) ON DELETE RESTRICT ON UPDATE CASCADE

---

### 3. categories Table
```sql
CREATE TABLE "public"."categories" (
  "id" varchar(36) PRIMARY KEY,
  "personal_id" int8 NOT NULL,             -- Per-user sequence
  "user_id" varchar(36) NOT NULL,          -- FK to users
  "parent_id" varchar(36),                 -- FK to categories, Nullable
  "name" varchar(36) NOT NULL,
  "icon" varchar(36) NOT NULL,
  "nature" varchar(8) NOT NULL,
  "is_active" bool NOT NULL,
  "position" json,                         -- Nullable
  "created_at" date NOT NULL,
  "created_by" varchar(64),
  "updated_at" date,
  "updated_by" varchar(64),
  "color" varchar(36),                     -- Nullable
  UNIQUE ("personal_id", "user_id")
)
```

**Key Notes:**
- `nature` values: "NEED", "WANT", "MUST" (for budgeting)
- `parent_id` creates hierarchical categories (null = root category)
- **Unique constraint** on (personal_id, user_id)

**Foreign Keys:**
- `user_id` → users(id) ON DELETE RESTRICT ON UPDATE CASCADE
- `parent_id` → categories(id) ON DELETE RESTRICT ON UPDATE CASCADE (self-reference)

**Example Hierarchy from your data:**
```
Food & Drinks (parent_id: null)
  ├── Bar, cafe, snack
  ├── Groceries, main meal
  └── Restaurant, fast-food
```

---

### 4. transactions Table
```sql
CREATE TABLE "public"."transactions" (
  "id" varchar(36) PRIMARY KEY,
  "user_id" varchar(36) NOT NULL,          -- FK to users
  "personal_id" int8 NOT NULL,             -- Per-user sequence
  "date" date NOT NULL,
  "account_id" varchar(36) NOT NULL,
  "category_id" varchar(36) NOT NULL,
  "amount" float8 NOT NULL,
  "type" varchar(16) NOT NULL,
  "note" text,                             -- Nullable
  "position" json,                         -- Nullable (Google Sheets sync)
  "transfer_id" varchar(36),               -- Nullable
  "debt_id" varchar(36),                   -- FK to debts, Nullable
  "created_at" date NOT NULL,
  "created_by" varchar(64),
  "updated_at" date,
  "updated_by" varchar(64),
  UNIQUE ("user_id", "personal_id")
)
```

**Key Notes:**
- `position` is nullable (for Google Sheets integration)
- `type` values: "INCOME", "EXPENSE"
- `transfer_id` links to transfers table (for transfer transactions)
- `debt_id` links to debts table (for debt-related transactions)
- **Unique constraint** on (user_id, personal_id)

**Foreign Keys:**
- `user_id` → users(id) ON DELETE RESTRICT ON UPDATE CASCADE
- `debt_id` → debts(id) ON DELETE RESTRICT ON UPDATE CASCADE

---

### 5. transfers Table
```sql
CREATE TABLE "public"."transfers" (
  "id" varchar(36) PRIMARY KEY,
  "user_id" varchar(36) NOT NULL,          -- FK to users
  "personal_id" int8 NOT NULL,             -- Per-user sequence
  "date" date NOT NULL,
  "from_account" varchar(64) NOT NULL,     -- FK to accounts
  "to_account" varchar(64) NOT NULL,       -- FK to accounts
  "amount" float8 NOT NULL,
  "note" text NOT NULL,
  "position" json,                         -- Nullable
  "created_at" date NOT NULL,
  "created_by" varchar(64),
  "updated_at" date,
  "updated_at" date,
  "updated_by" varchar(64)
)
```

**Key Notes:**
- `note` is NOT NULL (required)
- Creates two linked transactions (expense from from_account, income to to_account)
- Both transactions will have the same `transfer_id` pointing to this transfer

**Foreign Keys:**
- `user_id` → users(id) ON DELETE RESTRICT ON UPDATE RESTRICT
- `from_account` → accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE
- `to_account` → accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE

---

### 6. debts Table
```sql
CREATE TABLE "public"."debts" (
  "id" varchar(36) PRIMARY KEY,
  "user_id" varchar(36) NOT NULL,          -- FK to users
  "personal_id" int8 NOT NULL,             -- Per-user sequence
  "account_id" varchar(36) NOT NULL,       -- FK to accounts
  "name" varchar(64) NOT NULL,
  "type" varchar(16) NOT NULL,
  "position" json,                         -- Nullable
  "created_at" date NOT NULL,
  "created_by" varchar(64),
  "updated_at" date,
  "updated_by" varchar(64)
)
```

**Key Notes:**
- Used for debt tracking
- Linked to transactions via `debt_id`
- `type` likely: "LOAN", "DEBT", etc. (not enough sample data to confirm)

**Foreign Keys:**
- `user_id` → users(id) ON DELETE RESTRICT ON UPDATE CASCADE
- `account_id` → accounts(id) ON DELETE RESTRICT ON UPDATE CASCADE

---

### 7. groups Table
```sql
CREATE TABLE "public"."groups" (
  "id" varchar(36) PRIMARY KEY,
  "user_id" varchar(36) NOT NULL,          -- FK to users
  "personal_id" int8 NOT NULL,             -- Per-user sequence
  "name" varchar(64) NOT NULL,
  "created_at" date NOT NULL,
  "created_by" varchar(64),
  "updated_at" date,
  "updated_by" varchar(64)
)
```

**Key Notes:**
- Simple grouping for accounts
- Accounts can optionally belong to a group

**Foreign Keys:**
- `user_id` → users(id) ON DELETE RESTRICT ON UPDATE CASCADE

## Key Schema Details

### Important Fields

#### personal_id
Every table (except users) has a `personal_id` field:
- This is an auto-incrementing number **per user**
- Each user has their own sequence: user1 has transactions 1,2,3... user2 has transactions 1,2,3...
- **DO NOT query the database every time** - use caching strategy (see below)

#### Caching Strategy for personal_id

To avoid database queries on every creation, cache the max personal_id value:

**1. When fetching list data (GET requests):**
```typescript
// Get data with count
const transactions = await db.transactions.findMany({
  where: { user_id: userId },
  orderBy: { personal_id: 'desc' },
});

// Cache the max personal_id
const maxPersonalId = transactions[0]?.personal_id || 0;
localStorage.setItem('max_transaction_personal_id', maxPersonalId.toString());
```

**2. When creating new records:**
```typescript
// Increment from cache, not database!
const cachedMax = parseInt(localStorage.getItem('max_transaction_personal_id') || '0');
const nextPersonalId = cachedMax + 1;

// Update cache after successful creation
localStorage.setItem('max_transaction_personal_id', nextPersonalId.toString());
```

**3. Local Storage Keys Convention:**
```typescript
// Use consistent naming:
'max_account_personal_id'
'max_category_personal_id'
'max_transaction_personal_id'
'max_transfer_personal_id'
'max_debt_personal_id'
'max_group_personal_id'
```

**4. Cache Invalidation:**
- Refresh cache whenever list data is re-fetched
- On multi-device scenarios, refresh on app focus/reload
- Consider using application state management (Redux, Zustand, etc.) instead of localStorage for better reactivity

## Google Sheets Integration (position field)

### Purpose
The `position` JSON field in all tables is designed to support bidirectional synchronization with Google Sheets. It stores a mapping of each database field to its corresponding cell location in Google Sheets.

### Field Structure

Each `position` object maps database field names to Google Sheets cell locations:

```typescript
interface GoogleSheetsCellPosition {
  a1: string;   // A1 notation with sheet name: "'SheetName'!A1"
  col: number;  // Column number (1-based, e.g., A=1, B=2, etc.)
  row: number;  // Row number (1-based)
}

interface GoogleSheetsPosition {
  [fieldName: string]: GoogleSheetsCellPosition;
}
```

### Example

For an account record synced to Google Sheets "Liquid Assets" tab, row 8:

```json
{
  "id": {
    "a1": "'Liquid Assets'!B8",
    "col": 2,
    "row": 8
  },
  "code": {
    "a1": "'Liquid Assets'!D8",
    "col": 4,
    "row": 8
  },
  "name": {
    "a1": "'Liquid Assets'!E8",
    "col": 5,
    "row": 8
  },
  "active": {
    "a1": "'Liquid Assets'!M8",
    "col": 13,
    "row": 8
  },
  "ownership": {
    "a1": "'Liquid Assets'!L8",
    "col": 12,
    "row": 8
  },
  "usability": {
    "a1": "'Liquid Assets'!C8",
    "col": 3,
    "row": 8
  }
}
```

### Current Implementation Status

**Status**: Not yet implemented

**Current Usage**: Always use `null` for the `position` field:

```typescript
// When creating records
const account = await db.accounts.create({
  data: {
    // ... other fields
    position: null,  // Always null for now
  }
});
```

### Nullability

- **All tables**: `position` is **nullable** (including transactions)
- **Default value**: `null`
- **Required**: No - this field is optional

### Future Usage

When Google Sheets sync is implemented:

1. **On Sync from Sheets → Database**:
   - Read data from Google Sheets
   - Store cell positions in `position` field
   - Enables tracking which cells to update

2. **On Update Database → Sheets**:
   - Read `position` field to find cell locations
   - Update specific cells in Google Sheets
   - Maintain bidirectional sync

3. **Field Mapping**:
   - Only fields present in the `position` object are synced
   - Missing fields in `position` = not synced to Sheets
   - Allows partial sync (e.g., only sync certain fields)

### Benefits

- **Precise Updates**: Know exactly which cells to update in Sheets
- **Multi-Sheet Support**: `a1` includes sheet name
- **Flexible Mapping**: Different fields can be in different columns
- **Partial Sync**: Only map fields that need syncing

#### created_by / updated_by
All tables have audit fields:
- `created_by` - user_id who created the record
- `updated_by` - user_id who last updated the record
- These are varchar(64), not foreign keys

#### Unique Constraints
Tables have composite unique constraints:
- accounts: `(user_id, personal_id)`
- categories: `(personal_id, user_id)`
- transactions: `(user_id, personal_id)`

This ensures each user has unique personal_ids.

## TypeScript Types

All types are in `src/types/database.ts` and match your schema exactly:

```typescript
import type {
  Transaction,
  CreateTransactionRequest,
  Account,
  Category,
  Transfer,
  Debt,
  Group,
} from '@/types/database';
```

## Service Files to Create

### Priority Order

1. **categoryService.ts** (Easiest - no complex relationships)
2. **accountService.ts** (Depends on groups optionally)
3. **transactionService.ts** (Core feature)
4. **transferService.ts** (Simpler than transactions)
5. **debtService.ts** (If using debt tracking)
6. **groupService.ts** (Simple, for account grouping)

## Example: Category Service

```typescript
// src/services/categoryService.ts
import { httpClient } from './httpClient';
import type { Category, CreateCategoryRequest } from '@/types/database';

export const categoryService = {
  getAll: async (): Promise<Category[]> => {
    return httpClient.get<Category[]>('/api/categories');
  },

  getById: async (id: string): Promise<Category> => {
    return httpClient.get<Category>(`/api/categories/${id}`);
  },

  create: async (data: CreateCategoryRequest): Promise<Category> => {
    return httpClient.post<Category>('/api/categories', data);
  },

  update: async (id: string, data: Partial<CreateCategoryRequest>): Promise<Category> => {
    return httpClient.put<Category>(`/api/categories/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return httpClient.delete<void>(`/api/categories/${id}`);
  },

  // Get category tree (parents with children)
  getTree: async (): Promise<Category[]> => {
    return httpClient.get<Category[]>('/api/categories/tree');
  },
};
```

## Example: Account Service

```typescript
// src/services/accountService.ts
import { httpClient } from './httpClient';
import type { Account, CreateAccountRequest } from '@/types/database';

export const accountService = {
  getAll: async (): Promise<Account[]> => {
    return httpClient.get<Account[]>('/api/accounts');
  },

  getById: async (id: string): Promise<Account> => {
    return httpClient.get<Account>(`/api/accounts/${id}`);
  },

  create: async (data: CreateAccountRequest): Promise<Account> => {
    return httpClient.post<Account>('/api/accounts', data);
  },

  update: async (id: string, data: Partial<CreateAccountRequest>): Promise<Account> => {
    return httpClient.put<Account>(`/api/accounts/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    return httpClient.delete<void>(`/api/accounts/${id}`);
  },

  // Get account balance (with initial_amount + all transactions)
  getBalance: async (id: string): Promise<{ balance: number }> => {
    return httpClient.get<{ balance: number }>(`/api/accounts/${id}/balance`);
  },
};
```

## Database Client Setup

### Prisma ORM

1. Install Prisma:
```bash
npm install @prisma/client
npm install -D prisma
```

2. Initialize Prisma:
```bash
npx prisma init
```

3. Import your schema:
```bash
# Put your connection string in .env
DATABASE_URL="postgresql://user:password@localhost:5432/finance_db"

# Use db pull to generate schema from existing database
npx prisma db pull

# Generate Prisma Client
npx prisma generate
```

4. Create database client:
```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
```

5. Use in Route Handlers:
```typescript
import { db } from '@/lib/db';

// Query transactions
const transactions = await db.transactions.findMany({
  where: { user_id: userId },
  orderBy: { date: 'desc' },
});
```

## Route Handler Examples

### Categories Route Handler

```typescript
// app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Category, CreateCategoryRequest } from '@/types/database';

async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  // Your auth logic
  return 'user-id';
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: CreateCategoryRequest = await request.json();
  
  // Get next personal_id from client-side cache (passed in request body)
  // Client should maintain max_category_personal_id in localStorage
  const personalId = body.personal_id; // Client sends this

  const category = await db.categories.create({
    data: {
      id: crypto.randomUUID(),
      user_id: userId,
      personal_id: personalId,
      name: body.name,
      icon: body.icon,
      nature: body.nature,
      parent_id: body.parent_id || null,
      color: body.color || null,
      is_active: body.is_active ?? true,
      position: null, // Always null until Google Sheets sync is implemented
      created_at: new Date(),
      created_by: userId,
      updated_at: null,
      updated_by: null,
    },
  });

  return NextResponse.json(category, { status: 201 });
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const categories = await db.categories.findMany({
    where: { user_id: userId, is_active: true },
    orderBy: { personal_id: 'asc' },
  });

  // Return data with max personal_id for client-side caching
  const maxPersonalId = categories[0]?.personal_id || 0;
  
  return NextResponse.json({
    data: categories,
    meta: {
      max_personal_id: maxPersonalId, // Client caches this
    },
  });
}
```

### Accounts Route Handler

```typescript
// app/api/accounts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { Account, CreateAccountRequest } from '@/types/database';

async function getCurrentUserId(request: NextRequest): Promise<string | null> {
  // Your auth logic
  return 'user-id';
}

export async function POST(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body: CreateAccountRequest = await request.json();
  
  // Get next personal_id from client-side cache (passed in request body)
  const personalId = body.personal_id; // Client sends this

  const account = await db.accounts.create({
    data: {
      id: crypto.randomUUID(),
      user_id: userId,
      personal_id: personalId,
      name: body.name,
      icon: body.icon,
      account_type: body.account_type,
      color: body.color,
      initial_amount: body.initial_amount || null,
      group_id: body.group_id || null,
      active: body.active ?? true,
      usability: body.usability || 'USABLE',
      position: null, // Always null until Google Sheets sync
      created_at: new Date(),
      created_by: userId,
      updated_at: null,
      updated_by: null,
    },
  });

  return NextResponse.json(account, { status: 201 });
}

export async function GET(request: NextRequest) {
  const userId = await getCurrentUserId(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accounts = await db.accounts.findMany({
    where: { user_id: userId, active: true },
    orderBy: { personal_id: 'asc' },
  });

  // Return data with max personal_id for client-side caching
  const maxPersonalId = accounts[0]?.personal_id || 0;

  return NextResponse.json({
    data: accounts,
    meta: {
      max_personal_id: maxPersonalId,
    },
  });
}
```

## Important Notes

### 1. Category Hierarchy
Your categories have a parent-child relationship:
- `parent_id` references another category
- Query pattern: Get all root categories (parent_id = null), then their children

### 2. Position Field - Google Sheets Integration
The `position` field stores Google Sheets cell mappings (see detailed section above):
```typescript
// Always use null until Google Sheets sync is implemented
const transaction = await transactionService.create({
  // ... other fields
  position: null, // Always null for now
});
```

### 3. Account Types
From your data, account types include:
- "Cash"
- "Checking account"
- "General"
- "Savings account"
etc.

### 4. Category Nature Values
- "NEED" - Essential expenses
- "WANT" - Optional expenses  
- "MUST" - Mandatory expenses

### 5. Transfer Relationships
Transfers create two transactions:
- One from `from_account` (expense)
- One to `to_account` (income)
- Both transactions reference the transfer via `transfer_id`

## Authentication

Your `users` table uses username for login:

```typescript
// Login endpoint
export async function POST(request: NextRequest) {
  const { username, password } = await request.json();
  
  const user = await db.users.findUnique({
    where: { username },
  });
  
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  
  // Verify password (your password is bcrypt hashed with $2y$)
  const isValid = await bcrypt.compare(password, user.password);
  
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );
  
  return NextResponse.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
    },
  });
}
```

## Migration Checklist

- [ ] Set up database connection (Prisma or pg)
- [ ] Create `src/types/database.ts` (already provided)
- [ ] Add `src/services/httpClient.ts`
- [ ] Create `src/lib/db.ts` (database client)
- [ ] Create `src/lib/auth.ts` (JWT verification)
- [ ] Migrate categoryService + create Route Handlers
- [ ] Migrate accountService + create Route Handlers
- [ ] Migrate transactionService + create Route Handlers
- [ ] Migrate transferService + create Route Handlers
- [ ] Migrate debtService + create Route Handlers (if used)
- [ ] Migrate groupService + create Route Handlers (if used)
- [ ] Update authService + create Route Handlers
- [ ] Test all endpoints
- [ ] Remove Go backend

## Common Queries

### Get account balance
```typescript
const account = await db.accounts.findUnique({
  where: { id: accountId },
});

const transactions = await db.transactions.findMany({
  where: { account_id: accountId },
});

const transactionSum = transactions.reduce((sum, t) => {
  return sum + (t.type === 'INCOME' ? t.amount : -t.amount);
}, 0);

const balance = (account.initial_amount || 0) + transactionSum;
```

### Get category tree
```typescript
const categories = await db.categories.findMany({
  where: { user_id: userId, is_active: true },
});

// Build tree structure
const rootCategories = categories.filter(c => !c.parent_id);
const childCategories = categories.filter(c => c.parent_id);

const tree = rootCategories.map(root => ({
  ...root,
  children: childCategories.filter(c => c.parent_id === root.id),
}));
```

### Get transactions with related data
```typescript
const transactions = await db.transactions.findMany({
  where: { user_id: userId },
  include: {
    account: {
      select: { name: true, icon: true, color: true },
    },
    category: {
      select: { name: true, icon: true, color: true, nature: true },
    },
  },
  orderBy: { date: 'desc' },
});
```

## Need Help?

- Check the updated `transactionService.updated.ts` for the correct service pattern
- Check `app/api/transactions/route.ts` for the correct Route Handler pattern
- All types are in `src/types/database.ts` and match your schema exactly
