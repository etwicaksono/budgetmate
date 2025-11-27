# 02. Database Schema Implementation

## ⚠️ IMPORTANT: After completing this document:
1. Run `npx tsc --noEmit` - Must have 0 errors
2. Run `npm run lint` - Must have 0 errors  
3. ✅ Check Phase 2 backend checklist in [Document 10](./10_IMPLEMENTATION_CHECKLIST.md#phase-2-backend-implementation)
4. 🧪 Write database tests as per [Document 14](./14_TESTING_REQUIREMENTS.md)

## 📊 Complete PostgreSQL Database Schema with Prisma

### Step 1: Initialize Prisma

```bash
# Initialize Prisma with PostgreSQL
npx prisma init

# This creates:
# - prisma/schema.prisma
# - .env (if not exists)
```

### Step 2: Complete Schema Definition

Create/Replace `prisma/schema.prisma` with this EXACT schema:

```prisma
// This is your Prisma schema file
generator client {
  provider = "prisma-client-js"
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ==================== USER MODEL ====================
model User {
  id                String    @id @default(uuid())
  email             String    @unique @db.VarChar(255)
  username          String    @unique @db.VarChar(100)
  password_hash     String    @db.VarChar(255)
  full_name         String?   @db.VarChar(255)
  avatar_url        String?   @db.VarChar(500)
  email_verified    Boolean   @default(false)
  two_factor_enabled Boolean  @default(false)
  two_factor_secret String?   @db.VarChar(255)
  timezone          String    @default("UTC") @db.VarChar(50)
  currency          String    @default("USD") @db.VarChar(3)
  date_format       String    @default("YYYY-MM-DD") @db.VarChar(20)
  number_format     String    @default("1,234.56") @db.VarChar(20)
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  deleted_at        DateTime?
  
  // Relations
  accounts          Account[]
  categories        Category[]
  transactions      Transaction[]
  transfers         Transfer[]
  labels            Label[]
  groups            AccountGroup[]
  budgets           Budget[]
  goals             Goal[]
  recurring         RecurringTransaction[]
  audit_logs        AuditLog[]
  
  @@index([email])
  @@index([username])
}

// ==================== ACCOUNT GROUP MODEL ====================
model AccountGroup {
  id          String    @id @default(uuid())
  user_id     String
  name        String    @db.VarChar(100)
  icon        String?   @db.VarChar(50)
  color       String?   @db.VarChar(7)
  position    Int
  created_at  DateTime  @default(now())
  updated_at  DateTime  @updatedAt
  
  // Relations
  user        User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  accounts    Account[]
  
  @@unique([user_id, position])
  @@index([user_id])
}

// ==================== ACCOUNT MODEL ====================
model Account {
  id                   String    @id @default(uuid())
  user_id              String
  personal_id          BigInt
  group_id             String?
  name                 String    @db.VarChar(100)
  account_type         String    @db.VarChar(50) // checking, savings, credit_card, cash, investment, loan
  currency             String    @default("USD") @db.VarChar(3)
  initial_balance      Decimal   @default(0) @db.Decimal(15, 2)
  current_balance      Decimal   @default(0) @db.Decimal(15, 2)
  credit_limit         Decimal?  @db.Decimal(15, 2)
  interest_rate        Decimal?  @db.Decimal(5, 2)
  icon                 String    @db.VarChar(50)
  color                String    @db.VarChar(7)
  is_active            Boolean   @default(true)
  is_included_in_total Boolean   @default(true)
  position             Json?
  created_at           DateTime  @default(now())
  updated_at           DateTime  @updatedAt
  deleted_at           DateTime?
  created_by           String?   @db.VarChar(64)
  updated_by           String?   @db.VarChar(64)
  
  // Relations
  user                 User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  group                AccountGroup? @relation(fields: [group_id], references: [id], onDelete: SetNull)
  transactions         Transaction[]
  transfers_from       Transfer[] @relation("FromAccount")
  transfers_to         Transfer[] @relation("ToAccount")
  goals                Goal[]
  recurring            RecurringTransaction[]
  
  @@unique([user_id, personal_id])
  @@index([user_id])
  @@index([group_id])
}

// ==================== CATEGORY MODEL ====================
model Category {
  id              String    @id @default(uuid())
  user_id         String
  personal_id     BigInt
  parent_id       String?
  name            String    @db.VarChar(100)
  type            String    @db.VarChar(20) // income, expense
  nature          String    @default("WANT") @db.VarChar(8) // WANT, NEED, MUST
  icon            String    @db.VarChar(50)
  color           String?   @db.VarChar(7)
  is_system       Boolean   @default(false)
  is_active       Boolean   @default(true)
  position        Json?
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  created_by      String?   @db.VarChar(64)
  updated_by      String?   @db.VarChar(64)
  
  // Relations
  user            User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  parent          Category? @relation("CategoryHierarchy", fields: [parent_id], references: [id], onDelete: Cascade)
  children        Category[] @relation("CategoryHierarchy")
  transactions    Transaction[]
  budget_categories BudgetCategory[]
  recurring       RecurringTransaction[]
  
  @@unique([user_id, personal_id])
  @@index([user_id])
  @@index([parent_id])
}

// ==================== TRANSACTION MODEL ====================
model Transaction {
  id               String    @id @default(uuid())
  user_id          String
  personal_id      BigInt
  account_id       String
  category_id      String?
  type             String    @db.VarChar(20) // income, expense, transfer_in, transfer_out
  amount           Decimal   @db.Decimal(15, 2)
  currency         String    @default("USD") @db.VarChar(3)
  exchange_rate    Decimal   @default(1) @db.Decimal(10, 6)
  date             DateTime  @db.Date
  description      String?   @db.Text
  payee            String?   @db.VarChar(255)
  payment_method   String?   @db.VarChar(50)
  payment_status   String?   @db.VarChar(32)
  reference_number String?   @db.VarChar(100)
  is_recurring     Boolean   @default(false)
  recurring_id     String?
  transfer_id      String?
  position         Json?
  created_at       DateTime  @default(now())
  updated_at       DateTime  @updatedAt
  deleted_at       DateTime?
  created_by       String?   @db.VarChar(64)
  updated_by       String?   @db.VarChar(64)
  
  // Relations
  user             User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  account          Account   @relation(fields: [account_id], references: [id], onDelete: Cascade)
  category         Category? @relation(fields: [category_id], references: [id], onDelete: SetNull)
  recurring        RecurringTransaction? @relation(fields: [recurring_id], references: [id], onDelete: SetNull)
  transfer         Transfer? @relation(fields: [transfer_id], references: [id], onDelete: SetNull)
  labels           TransactionLabel[]
  attachments      Attachment[]
  
  @@unique([user_id, personal_id])
  @@index([user_id, date])
  @@index([account_id])
  @@index([category_id])
  @@index([transfer_id])
}

// ==================== TRANSFER MODEL ====================
model Transfer {
  id               String    @id @default(uuid())
  user_id          String
  personal_id      BigInt
  date             DateTime  @db.Date
  from_account     String
  to_account       String
  amount           Decimal   @db.Decimal(15, 2)
  to_amount        Decimal?  @db.Decimal(15, 2)
  description      String?   @db.Text
  currency         String    @default("USD") @db.VarChar(3)
  to_currency      String?   @db.VarChar(3)
  position         Json?
  created_at       DateTime  @default(now())
  updated_at       DateTime  @updatedAt
  created_by       String?   @db.VarChar(64)
  updated_by       String?   @db.VarChar(64)
  
  // Relations
  user             User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  from_account_rel Account   @relation("FromAccount", fields: [from_account], references: [id], onDelete: Cascade)
  to_account_rel   Account   @relation("ToAccount", fields: [to_account], references: [id], onDelete: Cascade)
  transactions     Transaction[]
  
  @@unique([user_id, personal_id])
  @@index([user_id])
  @@index([from_account])
  @@index([to_account])
}

// ==================== LABEL MODEL ====================
model Label {
  id              String    @id @default(uuid())
  user_id         String
  personal_id     BigInt
  name            String    @db.VarChar(50)
  color           String    @db.VarChar(7)
  created_at      DateTime  @default(now())
  created_by      String?   @db.VarChar(64)
  updated_at      DateTime  @updatedAt
  updated_by      String?   @db.VarChar(64)
  
  // Relations
  user            User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  transactions    TransactionLabel[]
  
  @@unique([user_id, personal_id])
  @@index([user_id])
}

// ==================== TRANSACTION LABEL (JUNCTION) ====================
model TransactionLabel {
  id              String    @id @default(uuid())
  transaction_id  String
  label_id        String
  
  // Relations
  transaction     Transaction @relation(fields: [transaction_id], references: [id], onDelete: Cascade)
  label           Label     @relation(fields: [label_id], references: [id], onDelete: Cascade)
  
  @@unique([transaction_id, label_id])
  @@index([transaction_id])
  @@index([label_id])
}

// ==================== ATTACHMENT MODEL ====================
model Attachment {
  id              String    @id @default(uuid())
  transaction_id  String
  file_name       String    @db.VarChar(255)
  file_url        String    @db.VarChar(500)
  file_type       String?   @db.VarChar(50)
  file_size       Int?
  uploaded_at     DateTime  @default(now())
  
  // Relations
  transaction     Transaction @relation(fields: [transaction_id], references: [id], onDelete: Cascade)
  
  @@index([transaction_id])
}

// ==================== BUDGET MODEL ====================
model Budget {
  id                String    @id @default(uuid())
  user_id           String
  name              String    @db.VarChar(100)
  type              String    @db.VarChar(20) // category, total, envelope
  period            String    @db.VarChar(20) // monthly, quarterly, yearly
  amount            Decimal   @db.Decimal(15, 2)
  currency          String    @default("USD") @db.VarChar(3)
  start_date        DateTime  @db.Date
  end_date          DateTime? @db.Date
  is_active         Boolean   @default(true)
  alert_threshold_1 Int       @default(50)
  alert_threshold_2 Int       @default(80)
  allow_rollover    Boolean   @default(false)
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  
  // Relations
  user              User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  categories        BudgetCategory[]
  
  @@index([user_id])
}

// ==================== BUDGET CATEGORY (JUNCTION) ====================
model BudgetCategory {
  budget_id        String
  category_id      String
  allocated_amount Decimal?  @db.Decimal(15, 2)
  
  // Relations
  budget           Budget    @relation(fields: [budget_id], references: [id], onDelete: Cascade)
  category         Category  @relation(fields: [category_id], references: [id], onDelete: Cascade)
  
  @@id([budget_id, category_id])
  @@index([budget_id])
  @@index([category_id])
}

// ==================== RECURRING TRANSACTION MODEL ====================
model RecurringTransaction {
  id              String    @id @default(uuid())
  user_id         String
  account_id      String
  category_id     String?
  type            String    @db.VarChar(20)
  amount          Decimal   @db.Decimal(15, 2)
  currency        String    @db.VarChar(3)
  description     String?   @db.Text
  payee           String?   @db.VarChar(255)
  frequency       String    @db.VarChar(20) // daily, weekly, monthly, yearly
  interval_value  Int       @default(1)
  start_date      DateTime  @db.Date
  end_date        DateTime? @db.Date
  last_processed  DateTime? @db.Date
  next_due_date   DateTime? @db.Date
  is_active       Boolean   @default(true)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  
  // Relations
  user            User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  account         Account   @relation(fields: [account_id], references: [id], onDelete: Cascade)
  category        Category? @relation(fields: [category_id], references: [id], onDelete: SetNull)
  transactions    Transaction[]
  
  @@index([user_id])
  @@index([account_id])
}

// ==================== GOAL MODEL ====================
model Goal {
  id              String    @id @default(uuid())
  user_id         String
  name            String    @db.VarChar(100)
  target_amount   Decimal   @db.Decimal(15, 2)
  current_amount  Decimal   @default(0) @db.Decimal(15, 2)
  currency        String    @default("USD") @db.VarChar(3)
  target_date     DateTime? @db.Date
  account_id      String?
  icon            String?   @db.VarChar(50)
  color           String?   @db.VarChar(7)
  is_completed    Boolean   @default(false)
  created_at      DateTime  @default(now())
  updated_at      DateTime  @updatedAt
  
  // Relations
  user            User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  account         Account?  @relation(fields: [account_id], references: [id], onDelete: SetNull)
  
  @@index([user_id])
}

// ==================== AUDIT LOG MODEL ====================
model AuditLog {
  id              String    @id @default(uuid())
  user_id         String
  action          String    @db.VarChar(50)
  entity_type     String    @db.VarChar(50)
  entity_id       String?
  old_values      Json?
  new_values      Json?
  ip_address      String?   @db.Inet
  user_agent      String?   @db.Text
  created_at      DateTime  @default(now())
  
  // Relations
  user            User      @relation(fields: [user_id], references: [id], onDelete: Cascade)
  
  @@index([user_id])
  @@index([entity_type, entity_id])
}
```

### Step 3: Database Setup Commands

```bash
# 1. Generate Prisma Client
npx prisma generate

# 2. Create initial migration
npx prisma migrate dev --name init

# 3. If you need to reset database (WARNING: deletes all data)
npx prisma migrate reset

# 4. Push schema to database without migration
npx prisma db push

# 5. Open Prisma Studio to view data
npx prisma studio
```

### Step 4: Create Prisma Client Singleton

Create `src/lib/db/prisma.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

## 📊 Database Relationships Explained

### User Relations
- **One-to-Many**: User has many accounts, categories, transactions, etc.
- **Cascade Delete**: When user deleted, all related data is deleted

### Account Relations
- **Belongs to**: User (required), AccountGroup (optional)
- **Has many**: Transactions, Transfers (as source and destination)
- **Unique**: personal_id per user

### Category Hierarchy
- **Self-referencing**: Categories can have parent and children
- **Type**: income or expense
- **Nature**: WANT, NEED, or MUST classification

### Transaction Relations
- **Belongs to**: User, Account (required), Category (optional)
- **Transfer link**: Can be linked to Transfer record
- **Labels**: Many-to-many through TransactionLabel
- **Amount convention**: Negative for expenses, positive for income

### Transfer System
- **Creates**: Two linked transactions (expense in source, income in destination)
- **Currency conversion**: Supports different amounts for currency exchange
- **Atomic operation**: Must be wrapped in database transaction

### Budget System
- **Budget types**: category, total, or envelope
- **Period**: monthly, quarterly, or yearly
- **Categories**: Linked through BudgetCategory junction table
- **Alerts**: Two threshold levels (50% and 80% default)

## 🔑 Key Database Concepts

### 1. Personal ID System
```sql
-- Each user has their own sequence
User A: Transaction #1, #2, #3...
User B: Transaction #1, #2, #3...

-- Enforced by unique constraint
@@unique([user_id, personal_id])
```

### 2. Soft Deletes
```sql
-- Accounts and transactions have deleted_at field
-- Allows recovery of deleted data
deleted_at: DateTime?
```

### 3. Audit Fields
```sql
-- Track who and when created/updated records
created_at: DateTime @default(now())
updated_at: DateTime @updatedAt
created_by: String?
updated_by: String?
```

### 4. Position Field
```sql
-- JSON field for UI-specific ordering/metadata
position: Json?
```

### 5. Multi-Currency Support
```sql
-- Each account and transaction has currency
currency: String @default("USD")
exchange_rate: Decimal @default(1)
```

## 🎯 Migration Best Practices

### Development Workflow
```bash
# 1. Make schema changes
# 2. Create migration
npx prisma migrate dev --name descriptive_name

# 3. Apply to other environments
npx prisma migrate deploy
```

### Production Deployment
```bash
# 1. Test migration in staging first
# 2. Backup production database
# 3. Apply migration
npx prisma migrate deploy

# 4. Verify with
npx prisma migrate status
```

### Common Migration Commands
```bash
# View migration history
npx prisma migrate status

# Resolve failed migrations
npx prisma migrate resolve --applied "20240101000000_migration_name"

# Create migration without applying
npx prisma migrate dev --create-only
```

## ✅ Database Schema Checklist

- [ ] Prisma initialized with PostgreSQL
- [ ] Schema.prisma file created with all 13 tables
- [ ] Database migrations created and applied
- [ ] Prisma client generated
- [ ] Prisma singleton created
- [ ] All relationships properly defined
- [ ] Indexes added for performance
- [ ] Unique constraints for personal_ids
- [ ] Cascade delete rules configured
- [ ] Audit fields included

## 🚨 Common Issues and Solutions

### Issue: Migration Fails
```bash
# Reset and start fresh (WARNING: deletes data)
npx prisma migrate reset

# Or mark as applied if already in DB
npx prisma migrate resolve --applied "migration_name"
```

### Issue: Type Errors with BigInt
```typescript
// Convert BigInt to number when sending to client
const transaction = {
  ...dbTransaction,
  personal_id: Number(dbTransaction.personal_id)
}
```

### Issue: Decimal Type Handling
```typescript
// Convert Prisma Decimal to number
import { Decimal } from '@prisma/client/runtime/library'

const amount = new Decimal(100.50)
const numberAmount = amount.toNumber()
```

## 🎯 Next Steps

1. Continue to [03_AUTHENTICATION_SYSTEM.md](./03_AUTHENTICATION_SYSTEM.md) to implement JWT authentication
2. Create API endpoints as described in [04_API_IMPLEMENTATION.md](./04_API_IMPLEMENTATION.md)
3. Set up default data seeding from [07_DEFAULT_DATA_SEEDING.md](./07_DEFAULT_DATA_SEEDING.md)
