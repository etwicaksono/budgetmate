# TransactionModal Currency Handling Analysis

## 🔍 Current Implementation Analysis

### Overview
The `TransactionModal` component handles 4 scenarios:
1. **Create regular transaction** (income/expense)
2. **Update regular transaction** (income/expense)
3. **Create transfer**
4. **Update transfer**

## 📊 Current Currency Handling

### 1. Create Regular Transaction (Lines 102-115)

**Code:**
```typescript
{
  personal_id: transaction?.personal_id || 0,
  type: formData.type,
  amount: parseFloat(formData.amount),
  date: formatDateForAPI(formData.date),
  account_id: formData.account_id,
  ...(formData.type !== 'transfer' && formData.category_id && { category_id: formData.category_id }),
  currency: 'USD',  // ⚠️ HARDCODED!
  label_ids: formData.label_ids,
  // ... other fields
}
```

**Issues:**
- ❌ Currency is **hardcoded to 'USD'**
- ❌ Ignores the selected account's currency
- ❌ No way for users to change currency
- ❌ Breaks multi-currency support

**Expected Behavior:**
- ✅ Should get currency from the **selected account**
- ✅ Currency should match: `accounts.find(a => a.id === formData.account_id)?.currency`

### 2. Update Regular Transaction (Lines 87-99)

**Code:**
```typescript
{
  type: formData.type,
  amount: parseFloat(formData.amount),
  date: formatDateForAPI(formData.date),
  account_id: formData.account_id,
  ...(formData.type !== 'transfer' && formData.category_id && { category_id: formData.category_id }),
  ...(formData.description !== undefined && { description: formData.description }),
  ...(formData.payee !== undefined && { payee: formData.payee }),
  ...(formData.payment_method !== undefined && { payment_method: formData.payment_method }),
  ...(formData.payment_status !== undefined && { payment_status: formData.payment_status }),
  label_ids: formData.label_ids,
}
// NO CURRENCY FIELD
```

**Issues:**
- ⚠️ **No currency field sent** to API
- ❓ Unclear if this is intentional (API might not allow currency updates)
- ❓ What happens if user changes account? Currency should update

**Expected Behavior:**
- ✅ If account changes, should send updated currency
- ✅ Or API should automatically update currency based on new account

### 3. Create Transfer (Lines 102-115, transfer-specific parts)

**Code:**
```typescript
{
  // ... base fields
  currency: 'USD',  // ⚠️ HARDCODED!
  ...(formData.type === 'transfer' && formData.to_account_id && { to_account_id: formData.to_account_id }),
  ...(formData.type === 'transfer' && formData.to_amount && { to_amount: parseFloat(formData.to_amount) }),
}
// NO to_currency FIELD!
```

**Issues:**
- ❌ Currency hardcoded to 'USD' for source account
- ❌ **No `to_currency` field** sent to API
- ❌ Can't handle multi-currency transfers properly
- ❌ API expects `currency` and `to_currency` for transfers (see TRANSFER_OPTIMIZATION_SUMMARY.md)

**Expected Behavior:**
- ✅ Should get `currency` from **source account** (from_account)
- ✅ Should get `to_currency` from **destination account** (to_account)
- ✅ Should send both to API:
  ```typescript
  {
    from_account_id: formData.account_id,
    to_account_id: formData.to_account_id,
    amount: parseFloat(formData.amount),
    to_amount: parseFloat(formData.to_amount || formData.amount),
    currency: fromAccount.currency,      // From source account
    to_currency: toAccount.currency,     // From destination account
  }
  ```

### 4. Update Transfer (Lines 87-99)

**Code:**
Same as "Update Regular Transaction" - no currency handling at all.

**Issues:**
- ❌ No currency fields sent
- ❌ Can't update transfer amounts with proper currency info

## 🎨 UI Currency Display

### Current State
The modal **does NOT display currency anywhere**:
- ❌ No currency indicator next to amount fields
- ❌ No currency label (USD, EUR, etc.)
- ❌ Users don't know which currency they're working with
- ❌ No visual indication of multi-currency transfers

### What Should Be Shown

#### Regular Transaction
```
Amount *
┌─────────────────────────┐
│ 100.00 USD             │  ← Show currency from selected account
└─────────────────────────┘
```

#### Same-Currency Transfer
```
From Account: Checking (USD)
Amount: $100.00 USD
         ↓
To Account: Savings (USD)
Amount: $100.00 USD
```

#### Multi-Currency Transfer
```
From Account: US Bank (USD)
Amount: $100.00 USD
         ↓
To Account: EU Bank (EUR)
Amount: €92.00 EUR  ← Different currency, different amount
```

## 🐛 Problems Summary

### Critical Issues

1. **Hardcoded Currency**
   - Location: Line 108
   - Impact: All transactions default to USD regardless of account
   - Severity: 🔴 **Critical** for multi-currency users

2. **Missing Transfer Currency Fields**
   - Missing: `currency` and `to_currency` for transfers
   - Impact: Can't properly handle multi-currency transfers
   - Severity: 🔴 **Critical** for transfer optimization

3. **No Currency UI Feedback**
   - Missing: Currency display in UI
   - Impact: Users don't know which currency they're using
   - Severity: 🟡 **Medium** (UX issue)

4. **No Multi-Currency Transfer Support**
   - Missing: Different amounts for different currencies
   - Impact: Can't record accurate exchange rates
   - Severity: 🔴 **Critical** for international transfers

### Medium Issues

5. **Update Transactions Missing Currency**
   - Missing: Currency field when updating
   - Impact: Unclear behavior when changing accounts
   - Severity: 🟡 **Medium** (might be handled by API)

## ✅ Recommended Solutions

### Solution 1: Get Currency from Selected Account

**Implementation:**
```typescript
// Get selected account's currency
const selectedAccount = accounts.find(a => a.id === formData.account_id);
const accountCurrency = selectedAccount?.currency || 'USD';

// For create transaction
const transactionData = {
  // ... other fields
  currency: accountCurrency, // ✅ Use account currency
};
```

### Solution 2: Handle Transfer Currencies

**Implementation:**
```typescript
// For transfers, get both currencies
const fromAccount = accounts.find(a => a.id === formData.account_id);
const toAccount = accounts.find(a => a.id === formData.to_account_id);

const transferData = {
  from_account_id: formData.account_id,
  to_account_id: formData.to_account_id,
  amount: parseFloat(formData.amount),
  to_amount: parseFloat(formData.to_amount || formData.amount),
  currency: fromAccount?.currency || 'USD',        // ✅ Source currency
  to_currency: toAccount?.currency || 'USD',       // ✅ Destination currency
  date: formatDateForAPI(formData.date),
  description: formData.description,
};
```

### Solution 3: Display Currency in UI

**Implementation for Regular Transaction:**
```tsx
<Form.Group className="mb-3">
  <Form.Label>
    Amount <span className="text-danger">*</span>
    {selectedAccount && (
      <span className="text-muted ms-2">
        ({selectedAccount.currency})
      </span>
    )}
  </Form.Label>
  <AmountInput
    value={formData.amount}
    onChange={(value) => updateField('amount', value)}
    type={formData.type === 'income' ? 'income' : 'expense'}
    isInvalid={!!errors['amount']}
  />
</Form.Group>
```

**Implementation for Transfer:**
```tsx
<Row className="g-3 align-items-center">
  <Col xs={12} md={5}>
    <Form.Label>
      Amount <span className="text-danger">*</span>
      {fromAccount && (
        <span className="text-muted ms-2">
          ({fromAccount.currency})
        </span>
      )}
    </Form.Label>
    <AmountInput
      value={formData.amount}
      onChange={(value) => updateField('amount', value)}
      type="expense"
      isInvalid={!!errors['amount']}
    />
  </Col>
  <Col xs={12} md={2} className="d-flex justify-content-center">
    <FaArrowRight size={24} />
  </Col>
  <Col xs={12} md={5}>
    <Form.Label>
      Amount Received
      {toAccount && (
        <span className="text-muted ms-2">
          ({toAccount.currency})
        </span>
      )}
    </Form.Label>
    <AmountInput
      value={formData.to_amount || formData.amount}
      onChange={(value) => updateField('to_amount', value)}
      type="income"
      placeholder="Same as sent"
      // Enable editing for multi-currency transfers
      disabled={fromAccount?.currency === toAccount?.currency}
    />
  </Col>
</Row>
```

### Solution 4: Smart Amount Syncing for Transfers

**Current Implementation (Line 181-186):**
```typescript
const handleTransferAmountChange = useCallback(
  (value: string) => {
    // Update both amount and to_amount to keep them in sync
    updateField('amount', value);
    updateField('to_amount', value);
  },
  [updateField]
);
```

**Improved Implementation:**
```typescript
const handleTransferAmountChange = useCallback(
  (value: string) => {
    const fromAccount = accounts.find(a => a.id === formData.account_id);
    const toAccount = accounts.find(a => a.id === formData.to_account_id);
    
    // Only sync amounts if same currency
    if (fromAccount?.currency === toAccount?.currency) {
      updateField('amount', value);
      updateField('to_amount', value);
    } else {
      // Multi-currency: update only source amount
      updateField('amount', value);
      // Keep to_amount independent for manual entry
    }
  },
  [updateField, formData.account_id, formData.to_account_id, accounts]
);
```

## 📝 Implementation Checklist

### Phase 1: Critical Fixes (Required)
- [ ] Replace hardcoded `currency: 'USD'` with account currency
- [ ] Add `currency` and `to_currency` for transfer creation
- [ ] Add `to_currency` field to transfer data structure
- [ ] Update `handleSave` to get currencies from accounts

### Phase 2: UI Improvements (Important)
- [ ] Display currency next to amount labels
- [ ] Show currency indicators for both accounts in transfers
- [ ] Highlight multi-currency transfers visually
- [ ] Disable `to_amount` for same-currency transfers

### Phase 3: Smart Behavior (Nice-to-have)
- [ ] Auto-sync amounts only for same-currency transfers
- [ ] Allow independent amounts for multi-currency transfers
- [ ] Add currency exchange rate hint (optional)
- [ ] Validate multi-currency transfers (require to_amount)

## 🔗 Related Documents

- **TRANSFER_OPTIMIZATION_SUMMARY.md** - Transfer schema and API expectations
- **Document 02** (DATABASE_SCHEMA.md) - Account currency field
- **Document 09** (CRITICAL_RULES.md) - Amount sign conventions

## 🎯 Expected API Payload Examples

### Regular Transaction (Create)
```json
{
  "type": "expense",
  "amount": 100,
  "account_id": "acc_123",
  "category_id": "cat_456",
  "currency": "EUR",  // ← Should match account currency
  "date": "2025-11-22T10:00:00Z"
}
```

### Transfer (Create - Same Currency)
```json
{
  "from_account_id": "acc_usd_1",
  "to_account_id": "acc_usd_2",
  "amount": 100,
  "to_amount": null,        // ← NULL for same currency (optimization)
  "currency": "USD",
  "to_currency": null,      // ← NULL for same currency (optimization)
  "date": "2025-11-22T10:00:00Z"
}
```

### Transfer (Create - Multi-Currency)
```json
{
  "from_account_id": "acc_usd",
  "to_account_id": "acc_eur",
  "amount": 100,
  "to_amount": 92,          // ← Different amount after conversion
  "currency": "USD",        // ← From source account
  "to_currency": "EUR",     // ← From destination account
  "date": "2025-11-22T10:00:00Z"
}
```

---

**Status**: ❌ Not Implemented
**Priority**: 🔴 High (Critical for multi-currency support)
**Effort**: Medium (2-3 hours)
