# Bugs Found During Testing - 2025-11-22

## 🐛 Bug #1: Initial Balance Not Sent on Update

**Status:** ✅ Analyzed (Solution: Disable field in edit mode)
**Priority:** Medium
**File:** `src/hooks/useAccountModal.ts`

**Description:**
When editing an account, `initial_balance` is not included in the update payload, even though the UI allows changing it.

**Solution:**
Disable field in edit mode (initial balance is historical data and shouldn't change).

**Document:** `INITIAL_BALANCE_BUG_ANALYSIS.md`

---

## 🐛 Bug #2: Multi-Currency Transfer Validation Error

**Status:** ✅ FIXED (Commit `f427b63`)
**Priority:** 🔴 High (Blocks multi-currency transfers)
**Severity:** Critical (Core feature broken)

### Description

When creating a **multi-currency transfer** (USD → EUR) with different amounts:
- **UI:** Works correctly, shows multi-currency badge, allows different amounts
- **API:** Returns validation error

### Error Response

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Validation failed",
        "details": [
            {
                "code": "custom",
                "message": "Same-currency transfers must have matching source and destination amounts",
                "path": ["to_amount"]
            }
        ]
    }
}
```

### Steps to Reproduce

1. Create a transfer
2. From: USD account
3. To: EUR account (different currency)
4. Amount: 100 USD
5. To Amount: 92 EUR (different amount)
6. Click Save
7. ❌ Validation error returned

### Expected Behavior

- ✅ Multi-currency transfer should be created
- ✅ Allow different amounts (100 vs 92)
- ✅ Store both currencies and amounts

### Actual Behavior

- ❌ Validation rejects with "same-currency" error
- ❌ Transfer not created

### Root Cause (Suspected)

**File:** Likely `src/lib/validation/transfer.ts` or API transfer route validation

**Issue:** Validation logic incorrectly identifies multi-currency transfer as same-currency, or doesn't account for `to_currency` being different.

**Validation might be:**
```typescript
// ❌ WRONG: Checks accounts without considering currency
if (to_amount !== amount) {
  throw new Error("Same-currency transfers must have matching amounts");
}

// ✅ CORRECT: Should be
if (from_currency === to_currency && to_amount !== amount) {
  throw new Error("Same-currency transfers must have matching amounts");
}
```

### Where to Look

**Possible locations:**
1. `src/lib/validation/transfer.ts` - Transfer schema validation
2. `app/api/v1/transfers/route.ts` - API validation logic
3. Check for `.refine()` or `.superRefine()` in Zod schema

### Test Data

```json
{
  "type": "transfer",
  "from_account_id": "clq123...",  // USD account
  "to_account_id": "clq456...",    // EUR account
  "amount": 100,
  "to_amount": 92,
  "currency": "USD",
  "to_currency": "EUR",
  "date": "2025-11-22T10:00:00Z"
}
```

### Impact

- 🔴 **Blocks multi-currency transfer feature**
- 🔴 **Core functionality broken**
- 🟡 Same-currency transfers still work
- 🟡 UI works correctly (only API issue)

### Fix Applied ✅

**Commit:** `f427b63`
**Files Changed:**
- `src/components/transaction/TransactionModal.tsx` (Line 124)
- `src/components/transactions/GlobalTransactionModal.tsx` (Lines 29, 59)

**What was fixed:**
1. TransactionModal now conditionally sends `to_currency` (only if destination account has currency)
2. GlobalTransactionModal now includes `to_currency` when creating/updating transfers

**Before:**
```typescript
// ❌ to_currency not passed to API
const transferData = {
  currency: 'USD',
  // Missing: to_currency
};
```

**After:**
```typescript
// ✅ to_currency included
const transferData = {
  currency: 'USD',
  ...(transactionData.to_currency && { to_currency: transactionData.to_currency }),
};
```

---

## 📊 Bug Summary

| Bug # | Description | Priority | Status | Blocks |
|-------|-------------|----------|--------|--------|
| #1 | Initial balance not sent on update | 🟡 Medium | ✅ Analyzed | - |
| #2 | Multi-currency validation error | 🔴 High | ✅ FIXED (`f427b63`) | - |

---

## 🧪 Testing Status

### ✅ Tests Passed

1. ✅ Create account with USD
2. ✅ Create account with EUR
3. ✅ Edit account currency (USD→GBP)
4. ✅ Transaction with USD account (shows currency label)
5. ✅ Transaction with EUR account (shows currency label)
6. ✅ Same-currency transfer (USD→USD)
   - ✅ Destination disabled
   - ✅ Amounts synced
   - ✅ Saves successfully

### ✅ Tests Fixed and Passed

7. ✅ Multi-currency transfer (USD→EUR) - **FIXED**
   - ✅ UI works correctly
   - ✅ Badge and help text show
   - ✅ Can enter different amounts
   - ✅ API accepts and creates transfer (Fixed in `f427b63`)

### ✅ Tests Completed

8. ✅ Category update operations (PASSED)
9. ✅ Transfer detail operations (PASSED)
   - Note: No delete button on transfer items (by design)
10. ✅ Test documentation complete

---

## ✅ Completed Actions

### Bug #2 Fix
1. ✅ Found root cause in GlobalTransactionModal
2. ✅ Fixed to_currency passing in create/update transfers
3. ✅ Tested - multi-currency transfers work
4. ✅ Committed fix (`f427b63`)

### Short Term
1. Decide on Bug #1 solution (disable or allow initial_balance edit)
2. Complete remaining tests
3. Document all results

### Long Term (Next Sprint)
- Balance migration (see `BALANCE_MIGRATION_PLAN.md`)

---

**Date:** 2025-11-22
**Session:** Testing after currency implementation
**Tester:** User
**Environment:** Development
