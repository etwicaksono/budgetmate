# Account Update Currency Bug - Analysis & Improvement Plan

## 🐛 Issue Found

When updating an account, the **currency field is NOT included in the payload**, even though the user can change it in the UI.

---

## 🔍 Root Cause Analysis

### Flow Breakdown

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User opens AccountModal in EDIT mode                         │
│    - AccountModal shows currency dropdown                       │
│    - User sees current currency (e.g., USD)                     │
│    - User can change currency to EUR                            │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. User clicks "Save Changes"                                    │
│    - AccountModal.handleSubmit() calls onSave(formData)        │
│    - formData INCLUDES: { currency: 'EUR', ... }                │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. useAccountModal.saveAccount() receives formData              │
│    File: src/hooks/useAccountModal.ts (Lines 65-73)            │
│                                                                  │
│    ❌ BUG HERE:                                                 │
│    await accountService.updateAccount(editingAccount.id, {     │
│      name: formData.name,                                       │
│      account_type: formData.account_type,                       │
│      icon: formData.icon,                                       │
│      color: formData.color,                                     │
│      is_active: formData.is_active,                             │
│      is_included_in_total: formData.is_included_in_total,      │
│      // ❌ currency: formData.currency,  ← MISSING!            │
│    });                                                           │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. accountService.updateAccount() sends to API                  │
│    Payload: { name, account_type, icon, color, is_active, ... } │
│    ❌ Currency NOT included                                     │
└──────────────────────┬──────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. API PUT /api/v1/accounts/:id                                 │
│    Receives payload WITHOUT currency field                      │
│    ✅ API is correct (we already fixed it)                      │
│    - But currency never arrives, so it's never updated          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📝 Issue Location

**File:** `src/hooks/useAccountModal.ts`
**Lines:** 65-73
**Function:** `saveAccount()`

### Current Code (BUGGY)

```typescript
// Edit mode
else if (editingAccount) {
  await accountService.updateAccount(editingAccount.id, {
    name: formData.name,
    account_type: formData.account_type,
    icon: formData.icon,
    color: formData.color,
    is_active: formData.is_active,
    is_included_in_total: formData.is_included_in_total,
    // ❌ Missing: currency
    // ❌ Missing: initial_balance
  });
}
```

### What's Missing

| Field | Create Mode | Edit Mode | Should Include in Update? |
|-------|-------------|-----------|---------------------------|
| name | ✅ Included | ✅ Included | - |
| account_type | ✅ Included | ✅ Included | - |
| icon | ✅ Included | ✅ Included | - |
| color | ✅ Included | ✅ Included | - |
| is_active | ✅ Included | ✅ Included | - |
| is_included_in_total | ✅ Included | ✅ Included | - |
| **currency** | ✅ Included | ❌ **MISSING** | ✅ **YES** |
| initial_balance | ✅ Included | ❌ Missing | ⚠️ **NO** (historical) |

---

## 🎯 Comparison: Create vs Update

### Create Account (Lines 56-64)

```typescript
if (modalMode === 'add') {
  await accountService.createAccount({
    personal_id: 0,
    name: formData.name,
    account_type: formData.account_type,
    icon: formData.icon,
    color: formData.color,
    initial_balance: formData.initial_balance,
    currency: formData.currency,              // ✅ INCLUDED
    is_active: formData.is_active,
    is_included_in_total: formData.is_included_in_total,
  });
}
```

### Update Account (Lines 65-73)

```typescript
else if (editingAccount) {
  await accountService.updateAccount(editingAccount.id, {
    name: formData.name,
    account_type: formData.account_type,
    icon: formData.icon,
    color: formData.color,
    is_active: formData.is_active,
    is_included_in_total: formData.is_included_in_total,
    // ❌ currency is MISSING HERE
  });
}
```

---

## ⚠️ Why This Matters

### User Impact

1. **User edits account currency**
   - Changes USD → EUR in the UI
   - Clicks "Save Changes"
   - ❌ Currency doesn't actually change
   - Database still shows USD
   - Confusing for user - UI showed EUR but data didn't save

2. **Data Inconsistency**
   - User thinks account is in EUR
   - New transactions created with USD (from account)
   - Reports show wrong currency

3. **Multi-Currency Feature Broken**
   - Users can't fix currency mistakes
   - Can't migrate accounts to different currencies
   - Defeats the purpose of currency selector in edit mode

---

## 🛠️ Immediate Fix (Simple)

### Solution 1: Add currency to update payload

**File:** `src/hooks/useAccountModal.ts` (Lines 65-73)

```typescript
else if (editingAccount) {
  await accountService.updateAccount(editingAccount.id, {
    name: formData.name,
    account_type: formData.account_type,
    icon: formData.icon,
    color: formData.color,
    currency: formData.currency,              // ✅ ADD THIS LINE
    is_active: formData.is_active,
    is_included_in_total: formData.is_included_in_total,
  });
}
```

**Result:** Currency will be sent to API and updated in database.

---

## 🚀 Improvement Plan (Comprehensive)

### Level 1: Fix the Bug (Immediate) ⏱️ 2 minutes

**Action:** Add `currency: formData.currency` to update payload

```typescript
// In useAccountModal.ts, line ~70
await accountService.updateAccount(editingAccount.id, {
  name: formData.name,
  account_type: formData.account_type,
  icon: formData.icon,
  color: formData.color,
  currency: formData.currency,              // ✅ FIX
  is_active: formData.is_active,
  is_included_in_total: formData.is_included_in_total,
});
```

**Testing:**
1. Edit an account
2. Change currency from USD to EUR
3. Save
4. Verify database updated
5. Verify transactions still work

---

### Level 2: Add Safety Check (Recommended) ⏱️ 15 minutes

**Problem:** Changing currency on accounts with transactions can cause inconsistencies.

**Solution:** Warn user or prevent currency change if transactions exist.

#### Option A: Show Warning

```typescript
// In useAccountModal.ts
const saveAccount = useCallback(async (formData: AccountFormData) => {
  try {
    if (modalMode === 'add') {
      // ... create logic
    } else if (editingAccount) {
      // Check if currency changed
      if (editingAccount.currency !== formData.currency) {
        // Could fetch transaction count from API
        // For now, just warn in console
        console.warn('Currency changed for existing account:', {
          from: editingAccount.currency,
          to: formData.currency,
          accountId: editingAccount.id
        });
        
        // Or throw error to prevent change
        // throw new Error('Cannot change currency on accounts with existing transactions');
      }
      
      await accountService.updateAccount(editingAccount.id, {
        name: formData.name,
        account_type: formData.account_type,
        icon: formData.icon,
        color: formData.color,
        currency: formData.currency,
        is_active: formData.is_active,
        is_included_in_total: formData.is_included_in_total,
      });
    }
    // ...
  }
}, [modalMode, editingAccount, onSuccess, closeModal]);
```

#### Option B: Disable Currency Dropdown in Edit Mode

```typescript
// In AccountModal.tsx
<Form.Select
  value={formData.currency}
  onChange={(e) => handleChange('currency', e.target.value)}
  disabled={loading || mode === 'edit'}  // ✅ Disable in edit mode
>
```

Add help text:
```tsx
{mode === 'edit' && (
  <Form.Text className="text-muted">
    Currency cannot be changed after account creation
  </Form.Text>
)}
```

---

### Level 3: Comprehensive Validation (Future) ⏱️ 1-2 hours

**Implement proper currency change validation:**

1. **Add transaction count to account API response**
   ```typescript
   interface Account {
     // ...
     transaction_count?: number;
   }
   ```

2. **Check transaction count before allowing currency change**
   ```typescript
   if (editingAccount.transaction_count && editingAccount.transaction_count > 0) {
     if (editingAccount.currency !== formData.currency) {
       throw new Error(
         `Cannot change currency on accounts with existing transactions. ` +
         `This account has ${editingAccount.transaction_count} transactions.`
       );
     }
   }
   ```

3. **Add confirmation dialog for currency change**
   ```typescript
   if (currencyChanged && hasTransactions) {
     const confirmed = await confirmDialog(
       'Change Currency?',
       'This account has transactions. Changing currency may cause data inconsistencies. Continue?'
     );
     if (!confirmed) return;
   }
   ```

---

### Level 4: Code Quality Improvements ⏱️ 30 minutes

#### Issue 1: Duplicate Code

Current code duplicates field names in create and update:

```typescript
// Create
await accountService.createAccount({
  name: formData.name,
  account_type: formData.account_type,
  icon: formData.icon,
  // ... 8 fields
});

// Update
await accountService.updateAccount(editingAccount.id, {
  name: formData.name,
  account_type: formData.account_type,
  icon: formData.icon,
  // ... 6 fields
});
```

**Solution: Extract common payload builder**

```typescript
// Helper function
const buildAccountPayload = (formData: AccountFormData, mode: 'create' | 'update') => {
  const basePayload = {
    name: formData.name,
    account_type: formData.account_type,
    icon: formData.icon,
    color: formData.color,
    currency: formData.currency,
    is_active: formData.is_active,
    is_included_in_total: formData.is_included_in_total,
  };

  if (mode === 'create') {
    return {
      ...basePayload,
      personal_id: 0,
      initial_balance: formData.initial_balance,
    };
  }

  return basePayload;
};

// Usage
const saveAccount = useCallback(async (formData: AccountFormData) => {
  try {
    if (modalMode === 'add') {
      await accountService.createAccount(
        buildAccountPayload(formData, 'create')
      );
    } else if (editingAccount) {
      await accountService.updateAccount(
        editingAccount.id,
        buildAccountPayload(formData, 'update')
      );
    }
    // ...
  }
}, [modalMode, editingAccount, onSuccess, closeModal]);
```

---

## 📋 Implementation Checklist

### Phase 1: Critical Fix (Do Now)
- [ ] Add `currency: formData.currency` to update payload
- [ ] Test account update with currency change
- [ ] Verify database receives currency
- [ ] Test transactions created after currency change
- [ ] Commit with message: "fix: include currency in account update payload"

### Phase 2: Safety (Recommended)
- [ ] Decide: Allow currency change or disable in edit mode?
- [ ] If allow: Add warning log or validation
- [ ] If disable: Disable dropdown + add help text
- [ ] Update UI to reflect chosen approach
- [ ] Test user experience

### Phase 3: Code Quality (Future)
- [ ] Refactor: Extract `buildAccountPayload` helper
- [ ] Add TypeScript types for payload builders
- [ ] Add unit tests for payload building logic
- [ ] Document currency change policy in code comments

### Phase 4: Enhanced Validation (Future)
- [ ] Add transaction_count to Account interface
- [ ] Update API to return transaction count
- [ ] Implement transaction count check
- [ ] Add confirmation dialog for risky changes
- [ ] Add audit log for currency changes

---

## 🧪 Testing Plan

### Test Case 1: Update Currency (No Transactions)
1. Create account with USD
2. Don't create any transactions
3. Edit account, change to EUR
4. Save
5. **Expected:** Database updated, account.currency = 'EUR'
6. **Verify:** Query database or view account details

### Test Case 2: Update Currency (With Transactions)
1. Create account with USD
2. Create transaction with $100
3. Edit account, change to EUR
4. Save
5. **Current behavior:** Should work (but risky!)
6. **Future behavior:** Should warn or prevent

### Test Case 3: Update Other Fields (Keep Currency)
1. Edit account
2. Change name only (keep currency as USD)
3. Save
4. **Expected:** Name updated, currency unchanged

### Test Case 4: Create New Account
1. Create new account with EUR
2. Save
3. **Expected:** Account created with EUR
4. **Verify:** Shouldn't be affected by the fix

---

## 🎯 Recommended Approach

### Immediate Action (Today):
**Fix the bug** by adding `currency: formData.currency` to the update payload.

### Short Term (This Week):
**Disable currency changes in edit mode** to prevent data inconsistencies:
- Disable dropdown when `mode === 'edit'`
- Add help text: "Currency cannot be changed after account creation"
- Simple, safe, prevents issues

### Long Term (Future Enhancement):
**Implement smart currency migration**:
- Allow currency change if no transactions exist
- Show warning if transactions exist
- Option to convert transaction amounts (with exchange rate)
- Full audit trail

---

## 📊 Risk Assessment

| Approach | Risk | Complexity | User Impact |
|----------|------|------------|-------------|
| **Fix bug only** | ⚠️ Medium | 🟢 Low | Users can change currency (risky) |
| **Fix + Disable edit** | 🟢 Low | 🟢 Low | Users can't fix mistakes (frustrating) |
| **Fix + Validation** | 🟢 Low | 🟡 Medium | Safe, but more code |
| **Fix + Migration** | 🟡 Medium | 🔴 High | Best UX, complex implementation |

**Recommended:** **Fix + Disable edit** (safest, simplest)

---

## 💡 Additional Considerations

### Should initial_balance be updatable?

**Current:** Not included in update payload
**Reason:** It's historical data - shouldn't change after creation
**Recommendation:** Keep as-is, don't include in update

### Should we allow currency changes at all?

**Arguments FOR:**
- Users make mistakes and need to fix them
- Accounts without transactions are safe to change
- Flexibility is good

**Arguments AGAINST:**
- Changing currency on accounts with transactions causes inconsistencies
- Transaction amounts are stored in original currency
- Better to prevent than to fix data corruption

**Compromise:**
- Allow change if no transactions
- Prevent/warn if transactions exist
- Provide proper migration tool in future

---

**Status**: 🐛 Bug Identified, Fix Ready
**Priority**: 🔴 High (Data consistency issue)
**Effort**: ⏱️ 2 minutes (fix) to 1-2 hours (comprehensive)
**Date**: 2025-11-22
