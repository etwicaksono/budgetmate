# Balance Migration Plan - Next Sprint

## 📅 Timeline: Next Sprint / Future Enhancement

**Priority:** Medium (Improvement, not critical)
**Effort:** 1 day
**Impact:** High (Code quality, data integrity)

---

## 🎯 Goals

1. Remove `current_balance` denormalized field
2. Calculate balance from transactions on-demand
3. Simplify codebase by removing balance management logic
4. Improve data integrity and auditability

---

## 📋 Pre-Migration Checklist

### 1. **Verify Current Data Integrity** ⏱️ 30 min

Run audit script to check if current_balance matches calculated:

```sql
-- Find accounts with balance drift
SELECT 
  a.id,
  a.name,
  a.current_balance as stored_balance,
  (a.initial_balance + COALESCE(SUM(t.amount), 0)) as calculated_balance,
  (a.current_balance - (a.initial_balance + COALESCE(SUM(t.amount), 0))) as drift
FROM accounts a
LEFT JOIN transactions t 
  ON t.account_id = a.id 
  AND t.deleted_at IS NULL
GROUP BY a.id
HAVING ABS(a.current_balance - (a.initial_balance + COALESCE(SUM(t.amount), 0))) > 0.01;
```

**Action if drifts found:**
- Fix drifts before migration
- Investigate root cause
- Document in migration notes

### 2. **Performance Baseline** ⏱️ 15 min

Measure current performance:

```typescript
// Test scenarios
console.time('account-list');
const accounts = await prisma.account.findMany({ 
  where: { user_id } 
});
console.timeEnd('account-list');

console.time('dashboard-balance');
const total = accounts.reduce((sum, a) => sum + a.current_balance, 0);
console.timeEnd('dashboard-balance');

console.time('transaction-create');
await createTransaction({ ... });
console.timeEnd('transaction-create');
```

Document baseline: `PERFORMANCE_BASELINE.md`

### 3. **Backup Database** ⏱️ 5 min

```bash
pg_dump -h localhost -U postgres finance_app > backup_before_balance_migration.sql
```

---

## 🚀 Migration Steps

### Step 1: Add Database Index ⏱️ 5 min

**File:** `prisma/migrations/xxx_add_balance_index/migration.sql`

```sql
-- Add index for fast balance calculation
CREATE INDEX IF NOT EXISTS idx_transactions_account_balance 
ON transactions(account_id, deleted_at) 
INCLUDE (amount);

-- Analyze table for query planner
ANALYZE transactions;
```

**Test:**
```sql
EXPLAIN ANALYZE
SELECT SUM(amount) 
FROM transactions 
WHERE account_id = 'some-id' AND deleted_at IS NULL;
-- Should use Index Scan, < 10ms
```

### Step 2: Add Balance Calculation Service ⏱️ 1 hour

**File:** `src/services/balanceService.ts`

```typescript
import { prisma } from '@/lib/db/prisma';

export class BalanceService {
  /**
   * Calculate current balance for an account
   * Formula: initial_balance + sum(transactions)
   */
  async calculateAccountBalance(accountId: string): Promise<number> {
    const result = await prisma.$queryRaw<[{ balance: number }]>`
      SELECT 
        (a.initial_balance + COALESCE(SUM(t.amount), 0))::numeric as balance
      FROM accounts a
      LEFT JOIN transactions t 
        ON t.account_id = a.id 
        AND t.deleted_at IS NULL
      WHERE a.id = ${accountId}
      GROUP BY a.id, a.initial_balance
    `;
    
    return result[0]?.balance ?? 0;
  }

  /**
   * Calculate balances for multiple accounts (optimized)
   */
  async calculateAccountBalances(accountIds: string[]): Promise<Map<string, number>> {
    const results = await prisma.$queryRaw<Array<{ id: string; balance: number }>>`
      SELECT 
        a.id,
        (a.initial_balance + COALESCE(SUM(t.amount), 0))::numeric as balance
      FROM accounts a
      LEFT JOIN transactions t 
        ON t.account_id = a.id 
        AND t.deleted_at IS NULL
      WHERE a.id = ANY(${accountIds}::text[])
      GROUP BY a.id, a.initial_balance
    `;
    
    return new Map(results.map(r => [r.id, r.balance]));
  }

  /**
   * Calculate total balance for user
   */
  async calculateUserTotalBalance(
    userId: string, 
    options?: { includeInactive?: boolean }
  ): Promise<number> {
    const result = await prisma.$queryRaw<[{ total: number }]>`
      SELECT 
        SUM(a.initial_balance + COALESCE(t.amount_sum, 0))::numeric as total
      FROM accounts a
      LEFT JOIN (
        SELECT account_id, SUM(amount) as amount_sum
        FROM transactions
        WHERE deleted_at IS NULL
        GROUP BY account_id
      ) t ON t.account_id = a.id
      WHERE a.user_id = ${userId}
        AND a.deleted_at IS NULL
        AND a.is_included_in_total = true
        ${options?.includeInactive ? prisma.sql`` : prisma.sql`AND a.is_active = true`}
    `;
    
    return result[0]?.total ?? 0;
  }

  /**
   * Calculate balance at specific date (time-travel)
   */
  async calculateBalanceAtDate(
    accountId: string, 
    date: Date
  ): Promise<number> {
    const result = await prisma.$queryRaw<[{ balance: number }]>`
      SELECT 
        (a.initial_balance + COALESCE(SUM(t.amount), 0))::numeric as balance
      FROM accounts a
      LEFT JOIN transactions t 
        ON t.account_id = a.id 
        AND t.date <= ${date}
        AND t.deleted_at IS NULL
      WHERE a.id = ${accountId}
      GROUP BY a.id, a.initial_balance
    `;
    
    return result[0]?.balance ?? 0;
  }
}

export const balanceService = new BalanceService();
```

**Test:**
```typescript
// Test calculation matches current_balance
const accounts = await prisma.account.findMany();
for (const account of accounts) {
  const calculated = await balanceService.calculateAccountBalance(account.id);
  const stored = account.current_balance.toNumber();
  
  if (Math.abs(calculated - stored) > 0.01) {
    console.error('Balance mismatch!', {
      accountId: account.id,
      stored,
      calculated
    });
  }
}
```

### Step 3: Update Account Service ⏱️ 30 min

**File:** `src/services/accountService.ts`

Add method:
```typescript
async fetchAccountsWithBalances(params?: {
  is_active?: boolean;
  group_id?: string;
}): Promise<Array<Account & { current_balance: number }>> {
  const accounts = await this.fetchAccounts(params);
  const accountIds = accounts.map(a => a.id);
  
  // Calculate all balances in one query
  const balances = await balanceService.calculateAccountBalances(accountIds);
  
  return accounts.map(account => ({
    ...account,
    current_balance: balances.get(account.id) ?? account.initial_balance
  }));
}
```

### Step 4: Update API Routes ⏱️ 1 hour

**Accounts Route:** `app/api/v1/accounts/route.ts`

```typescript
// GET /api/v1/accounts
export async function GET(request: NextRequest) {
  // ... auth logic ...
  
  const accounts = await prisma.account.findMany({
    where: { user_id: user.user_id, deleted_at: null }
  });
  
  // Calculate balances
  const balances = await balanceService.calculateAccountBalances(
    accounts.map(a => a.id)
  );
  
  const response = accounts.map(account => ({
    id: account.id,
    // ... other fields ...
    initial_balance: account.initial_balance.toNumber(),
    current_balance: balances.get(account.id) ?? account.initial_balance.toNumber(),
    // ...
  }));
  
  return successResponse(response);
}
```

**Account Detail Route:** `app/api/v1/accounts/[id]/route.ts`

```typescript
// GET /api/v1/accounts/:id
export async function GET(request: NextRequest, context: RouteParams) {
  // ... auth and ID logic ...
  
  const account = await prisma.account.findFirst({
    where: { id, user_id: user.user_id, deleted_at: null }
  });
  
  if (!account) return commonErrors.notFound('Account');
  
  // Calculate current balance
  const current_balance = await balanceService.calculateAccountBalance(id);
  
  const response = {
    id: account.id,
    // ... other fields ...
    initial_balance: account.initial_balance.toNumber(),
    current_balance,
    // ...
  };
  
  return successResponse(response);
}
```

### Step 5: Remove Balance Updates ⏱️ 2 hours

**Files to update:**
- `app/api/v1/transactions/route.ts` - Remove balance increment (line 350)
- `app/api/v1/transactions/[id]/route.ts` - Remove balance adjustments (lines 354-384, 522)
- `app/api/v1/transfers/route.ts` - Remove balance updates (lines 271-286)
- `app/api/v1/transfers/[id]/route.ts` - Remove balance reversals (lines 160-175)

**Before (transaction create):**
```typescript
await prisma.$transaction(async (tx) => {
  const created = await tx.transaction.create({ ... });
  
  // ❌ REMOVE THIS
  await tx.account.update({
    where: { id: data.account_id },
    data: { current_balance: { increment: finalAmount } }
  });
  
  return created;
});
```

**After:**
```typescript
// Just create transaction - balance auto-calculated
const created = await prisma.transaction.create({ ... });
return created;
```

**Code reduction:** ~200 lines deleted ✅

### Step 6: Database Migration ⏱️ 10 min

**File:** `prisma/migrations/xxx_remove_current_balance/migration.sql`

```sql
-- 1. Create materialized view for performance (optional but recommended)
CREATE MATERIALIZED VIEW account_balances AS
SELECT 
  a.id,
  a.user_id,
  (a.initial_balance + COALESCE(SUM(t.amount), 0)) as current_balance,
  COUNT(t.id) as transaction_count,
  MAX(t.date) as last_transaction_date
FROM accounts a
LEFT JOIN transactions t 
  ON t.account_id = a.id 
  AND t.deleted_at IS NULL
GROUP BY a.id, a.user_id, a.initial_balance;

CREATE UNIQUE INDEX idx_account_balances_id ON account_balances(id);
CREATE INDEX idx_account_balances_user ON account_balances(user_id);

-- 2. Create function to refresh balances
CREATE OR REPLACE FUNCTION refresh_account_balances()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY account_balances;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger to refresh after transactions
CREATE OR REPLACE FUNCTION transaction_balance_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh in background (async)
  PERFORM pg_notify('refresh_balances', '');
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_after_change
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH STATEMENT
EXECUTE FUNCTION transaction_balance_trigger();

-- 4. Remove current_balance column
ALTER TABLE accounts DROP COLUMN current_balance;

-- Note: Keep initial_balance - it's still needed!
```

**Rollback script (if needed):**
```sql
-- Restore current_balance column
ALTER TABLE accounts ADD COLUMN current_balance DECIMAL(15, 2) DEFAULT 0;

-- Recalculate all balances
UPDATE accounts a
SET current_balance = (
  SELECT a.initial_balance + COALESCE(SUM(t.amount), 0)
  FROM transactions t
  WHERE t.account_id = a.id 
    AND t.deleted_at IS NULL
);

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS account_balances CASCADE;
DROP FUNCTION IF EXISTS refresh_account_balances CASCADE;
DROP FUNCTION IF EXISTS transaction_balance_trigger CASCADE;
```

### Step 7: Update Prisma Schema ⏱️ 5 min

**File:** `prisma/schema.prisma`

```prisma
model Account {
  id                   String    @id @default(cuid())
  user_id              String
  personal_id          BigInt
  // ... other fields ...
  initial_balance      Decimal   @default(0) @db.Decimal(15, 2)
  // ❌ Remove this line:
  // current_balance      Decimal   @default(0) @db.Decimal(15, 2)
  
  // ... rest of model ...
}
```

Run: `npx prisma generate`

### Step 8: Update Frontend ⏱️ 30 min

**Most frontend code won't change!** API still returns `current_balance`.

Only update if using Prisma client directly:

```typescript
// Before
const balance = account.current_balance;

// After
const balance = await balanceService.calculateAccountBalance(account.id);
// Or use API response (already has calculated balance)
```

---

## 🧪 Testing Strategy

### 1. **Unit Tests** ⏱️ 1 hour

```typescript
describe('BalanceService', () => {
  it('should calculate balance correctly', async () => {
    const account = await createTestAccount({ initial_balance: 1000 });
    await createTestTransaction({ account_id: account.id, amount: 100 });
    await createTestTransaction({ account_id: account.id, amount: -50 });
    
    const balance = await balanceService.calculateAccountBalance(account.id);
    expect(balance).toBe(1050); // 1000 + 100 - 50
  });

  it('should ignore deleted transactions', async () => {
    const account = await createTestAccount({ initial_balance: 1000 });
    await createTestTransaction({ account_id: account.id, amount: 100 });
    await createTestTransaction({ 
      account_id: account.id, 
      amount: -50,
      deleted_at: new Date() // Soft deleted
    });
    
    const balance = await balanceService.calculateAccountBalance(account.id);
    expect(balance).toBe(1100); // 1000 + 100 (ignore deleted -50)
  });

  it('should handle accounts with no transactions', async () => {
    const account = await createTestAccount({ initial_balance: 500 });
    
    const balance = await balanceService.calculateAccountBalance(account.id);
    expect(balance).toBe(500);
  });

  it('should calculate balance at specific date', async () => {
    const account = await createTestAccount({ initial_balance: 1000 });
    await createTestTransaction({ 
      account_id: account.id, 
      amount: 100,
      date: new Date('2024-01-15')
    });
    await createTestTransaction({ 
      account_id: account.id, 
      amount: 200,
      date: new Date('2024-01-20')
    });
    
    const balance = await balanceService.calculateBalanceAtDate(
      account.id,
      new Date('2024-01-17')
    );
    expect(balance).toBe(1100); // Only first transaction
  });
});
```

### 2. **Integration Tests** ⏱️ 1 hour

```typescript
describe('Accounts API with calculated balance', () => {
  it('GET /api/v1/accounts should return calculated balances', async () => {
    const response = await fetch('/api/v1/accounts');
    const { data } = await response.json();
    
    // Verify each balance
    for (const account of data) {
      const calculated = await balanceService.calculateAccountBalance(account.id);
      expect(account.current_balance).toBeCloseTo(calculated, 2);
    }
  });

  it('Creating transaction should affect balance', async () => {
    const accountId = 'test-account-id';
    const balanceBefore = await balanceService.calculateAccountBalance(accountId);
    
    await fetch('/api/v1/transactions', {
      method: 'POST',
      body: JSON.stringify({
        account_id: accountId,
        amount: 100,
        type: 'income'
        // ...
      })
    });
    
    const balanceAfter = await balanceService.calculateAccountBalance(accountId);
    expect(balanceAfter).toBe(balanceBefore + 100);
  });
});
```

### 3. **Performance Tests** ⏱️ 30 min

```typescript
describe('Balance calculation performance', () => {
  it('should calculate 10 accounts in < 100ms', async () => {
    const accounts = await createTestAccounts(10);
    
    const start = Date.now();
    await balanceService.calculateAccountBalances(accounts.map(a => a.id));
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });

  it('should handle account with 10k transactions', async () => {
    const account = await createTestAccount();
    await createManyTestTransactions(account.id, 10000);
    
    const start = Date.now();
    const balance = await balanceService.calculateAccountBalance(account.id);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(50); // Should be fast with index
  });
});
```

### 4. **Manual Testing Checklist**

- [ ] Account list page loads correctly
- [ ] Account balances match expected values
- [ ] Dashboard total is correct
- [ ] Creating transaction updates balance
- [ ] Updating transaction updates balance
- [ ] Deleting transaction updates balance
- [ ] Transfer updates both account balances
- [ ] Performance is acceptable (< 100ms)
- [ ] No console errors
- [ ] Network requests look correct

---

## 📊 Success Criteria

### Must Have ✅
- [ ] All tests pass
- [ ] No data loss or corruption
- [ ] Balance calculations 100% accurate
- [ ] API responses maintain same structure
- [ ] No breaking changes to frontend

### Performance Targets 🎯
- [ ] Account list query: < 100ms
- [ ] Single balance calculation: < 20ms
- [ ] Dashboard total: < 50ms
- [ ] Transaction create: < 50ms

### Code Quality 📈
- [ ] ~200 lines of code removed
- [ ] No balance update logic in transaction routes
- [ ] Balance service has >90% test coverage
- [ ] All SQL queries use indexes

---

## 🔄 Rollback Plan

If issues arise:

### Immediate Rollback (< 5 min)
```sql
-- Restore from backup
psql finance_app < backup_before_balance_migration.sql

-- Revert application code
git revert <migration-commit>
npm run build
pm2 restart finance-app
```

### Data Fix (if balances corrupted)
```sql
-- Recalculate all balances
UPDATE accounts a
SET current_balance = (
  SELECT a.initial_balance + COALESCE(SUM(t.amount), 0)
  FROM transactions t
  WHERE t.account_id = a.id AND t.deleted_at IS NULL
)
WHERE a.id = a.id;  -- Update all
```

---

## 📅 Timeline

### Sprint Planning
- **Day 1:** Pre-migration checks, create indexes
- **Day 2:** Implement balance service, write tests
- **Day 3:** Update API routes, remove balance updates
- **Day 4:** Database migration, testing
- **Day 5:** Deploy, monitor, document

### Deployment Strategy
1. Deploy code changes (balance service) - **non-breaking**
2. Monitor for 24 hours - verify accuracy
3. Run database migration - **breaking change**
4. Monitor for issues
5. Document completion

---

## 📝 Documentation Updates

After migration:
- [ ] Update API documentation
- [ ] Update developer onboarding docs
- [ ] Create balance service usage guide
- [ ] Document materialized view maintenance
- [ ] Update architecture diagrams

---

## ✅ Sign-off Checklist

Before considering migration complete:

- [ ] All tests passing (unit, integration, performance)
- [ ] Code review completed
- [ ] Database migration tested on staging
- [ ] Performance benchmarks meet targets
- [ ] Rollback plan tested
- [ ] Documentation updated
- [ ] Team trained on new approach
- [ ] Monitoring alerts configured

---

**Status:** 📋 Planned for Next Sprint
**Owner:** TBD
**Effort:** 1 week (4-5 days)
**Dependencies:** None (can start anytime)
**Risk:** Low (with proper testing)

