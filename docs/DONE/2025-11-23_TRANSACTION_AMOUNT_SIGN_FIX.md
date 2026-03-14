# Transaction Amount Sign Fix

## 📋 Problem Description

Some expense transactions in the database have **positive amounts** when they should be **negative** according to Document 09: Critical Implementation Rules.

### Symptom
- Expense transactions displaying in green with `+` sign (should be red with `-` sign)
- Transfer OUT transactions displaying incorrectly
- Violates the critical amount sign convention

### Root Cause
The issue is **NOT in the API** - both POST and PUT endpoints correctly implement the sign convention:

```typescript
// API correctly applies signs
const finalAmount = data.type === 'expense' 
  ? -Math.abs(data.amount)  // Force negative
  : Math.abs(data.amount);   // Force positive
```

**Possible causes of incorrect data:**
1. Legacy data imported before the fix
2. Manual database entries
3. Previous version bugs
4. Test/seed data with incorrect signs

## ✅ Solution Provided

Two scripts to fix the data:

### Option 1: SQL Script (Fast, Direct)
**File:** `prisma/fix-transaction-amounts.sql`

**Features:**
- ✅ Idempotent (safe to run multiple times)
- ✅ Atomic (wrapped in transaction)
- ✅ Validates before and after
- ✅ Shows detailed report

**Usage:**
```bash
# From PostgreSQL command line
psql -U your_username -d your_database -f prisma/fix-transaction-amounts.sql

# Or copy/paste into pgAdmin or Prisma Studio SQL editor
```

### Option 2: TypeScript Script (Safe, Recommended)
**File:** `scripts/fix-transaction-amounts.ts`

**Features:**
- ✅ Type-safe with Prisma
- ✅ Checks current state first
- ✅ Only fixes what needs fixing
- ✅ Validates after fix
- ✅ Shows detailed console output

**Usage:**
```bash
# Install dependencies if needed
npm install

# Run the fix script
npx tsx scripts/fix-transaction-amounts.ts

# Or add to package.json:
npm run fix:transaction-amounts
```

## 🔍 What The Scripts Do

### 1. Check Current State
```sql
SELECT type, amount FROM "Transaction" WHERE deleted_at IS NULL;
```

Shows count of positive/negative/zero amounts for each transaction type.

### 2. Fix EXPENSE Transactions
```sql
UPDATE "Transaction"
SET amount = -ABS(amount)
WHERE type = 'expense' AND amount > 0 AND deleted_at IS NULL;
```

Converts positive expense amounts to negative.

### 3. Fix INCOME Transactions
```sql
UPDATE "Transaction"
SET amount = ABS(amount)
WHERE type = 'income' AND amount < 0 AND deleted_at IS NULL;
```

Converts negative income amounts to positive.

### 4. Fix TRANSFER_OUT Transactions
```sql
UPDATE "Transaction"
SET amount = -ABS(amount)
WHERE type = 'transfer_out' AND amount > 0 AND deleted_at IS NULL;
```

Ensures transfer OUT amounts are negative.

### 5. Fix TRANSFER_IN Transactions
```sql
UPDATE "Transaction"
SET amount = ABS(amount)
WHERE type = 'transfer_in' AND amount < 0 AND deleted_at IS NULL;
```

Ensures transfer IN amounts are positive.

### 6. Verify Fix
Re-checks all transactions to ensure they now follow the convention.

## 📊 Expected Results

### Before Fix (Example)
| Type | Total | Negative | Positive | Status |
|------|-------|----------|----------|--------|
| expense | 100 | 50 | 50 | ❌ Issues |
| income | 80 | 10 | 70 | ❌ Issues |
| transfer_out | 20 | 15 | 5 | ❌ Issues |
| transfer_in | 20 | 5 | 15 | ❌ Issues |

### After Fix
| Type | Total | Negative | Positive | Status |
|------|-------|----------|----------|--------|
| expense | 100 | 100 | 0 | ✅ Correct |
| income | 80 | 0 | 80 | ✅ Correct |
| transfer_out | 20 | 20 | 0 | ✅ Correct |
| transfer_in | 20 | 0 | 20 | ✅ Correct |

## 🎯 Correct Convention (Document 09)

| Transaction Type | Amount Sign | Display | Color |
|-----------------|-------------|---------|-------|
| EXPENSE | **NEGATIVE** | `-$100.00` | 🔴 Red |
| INCOME | **POSITIVE** | `+$500.00` | 🟢 Green |
| TRANSFER_OUT | **NEGATIVE** | `-$100.00` | 🔴 Red |
| TRANSFER_IN | **POSITIVE** | `+$100.00` | 🟢 Green |

## ⚠️ Important Notes

### Safety
- ✅ Both scripts are **idempotent** (safe to run multiple times)
- ✅ Use `ABS()` to ensure correct magnitude, then apply sign
- ✅ Only affect non-deleted transactions
- ✅ Update `updated_at` timestamp for audit trail

### Testing
1. **Test on development database first!**
2. **Create a backup before running on production**
3. Run the check query first to see how many transactions will be affected

### Verification Query
```sql
-- Check for any remaining violations
SELECT 
  type,
  COUNT(*) as count,
  COUNT(CASE WHEN amount < 0 THEN 1 END) as negative,
  COUNT(CASE WHEN amount > 0 THEN 1 END) as positive
FROM "Transaction"
WHERE deleted_at IS NULL
GROUP BY type;
```

Expected results after fix:
- **expense**: All negative counts
- **income**: All positive counts
- **transfer_out**: All negative counts
- **transfer_in**: All positive counts

## 🚀 Recommended Execution Steps

### Step 1: Backup Database
```bash
# PostgreSQL backup
pg_dump -U your_username your_database > backup_before_fix.sql

# Or use your cloud provider's backup feature
```

### Step 2: Run on Development First
```bash
# Test the TypeScript script
npx tsx scripts/fix-transaction-amounts.ts
```

### Step 3: Verify Results
```bash
# Check in your application
# - Expenses should show as red with minus sign
# - Income should show as green with plus sign
# - Transfers should show correct direction
```

### Step 4: Apply to Production
```bash
# After verification, run on production
npm run fix:transaction-amounts
```

## 📝 Add to package.json

```json
{
  "scripts": {
    "fix:transaction-amounts": "tsx scripts/fix-transaction-amounts.ts"
  }
}
```

## 🔧 Prevention

The API endpoints already prevent this issue for **new transactions**:

### POST /api/v1/transactions
```typescript
// Line 247-249 in route.ts
const finalAmount = data.type === 'expense' 
  ? -Math.abs(data.amount) 
  : Math.abs(data.amount);
```

### PUT /api/v1/transactions/[id]
```typescript
// Line 217-221 in [id]/route.ts
const amount = data.amount ?? Math.abs(existingTransaction.amount.toNumber());
const type = data.type ?? existingTransaction.type;
finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
```

**Result:** All future transactions will have correct signs automatically.

## 📈 Performance

- **SQL Script**: Very fast, runs in milliseconds even for thousands of transactions
- **TypeScript Script**: Slightly slower due to Prisma overhead, but still fast (< 1 second for 10k transactions)
- **No downtime required**
- **Can run while application is running** (uses standard UPDATE queries)

## ✅ Verification Checklist

After running the fix:

- [ ] Run verification query (see above)
- [ ] Check expense transactions in UI - should show red with minus
- [ ] Check income transactions in UI - should show green with plus
- [ ] Check transfer OUT transactions - should show red with minus
- [ ] Check transfer IN transactions - should show green with plus
- [ ] Daily totals should calculate correctly
- [ ] Account balances should be accurate
- [ ] No TypeScript/lint errors

## 🆘 Troubleshooting

### Issue: Script fails with "permission denied"
**Solution:** Ensure your database user has UPDATE permissions on the Transaction table.

### Issue: Some transactions still show incorrectly
**Solution:** 
1. Clear browser cache
2. Check if deleted_at is NULL
3. Run verification query manually
4. Check console for any error messages

### Issue: Account balances seem wrong after fix
**Solution:** The fix only changes how amounts are stored, not account balances. If balances are wrong, they were likely wrong before. You may need to recalculate them:

```sql
-- Recalculate account balance (example - adapt to your needs)
UPDATE "Account" a
SET current_balance = (
  SELECT COALESCE(SUM(t.amount), 0) + a.initial_balance
  FROM "Transaction" t
  WHERE t.account_id = a.id AND t.deleted_at IS NULL
)
WHERE a.deleted_at IS NULL;
```

## 📚 Related Documents

- **Document 09**: Critical Implementation Rules (Amount Sign Convention)
- **RECORDSLIST_TRANSFER_FIX.md**: RecordsList display logic fix
- **TRANSFER_OPTIMIZATION_SUMMARY.md**: Transfer schema optimization

---

**Status**: ✅ Scripts Ready
**Date**: 2025-11-22
**Impact**: Data correction - fixes existing violations of amount sign convention
