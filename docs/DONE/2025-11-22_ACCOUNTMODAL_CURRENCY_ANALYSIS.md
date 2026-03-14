# AccountModal Currency Handling Analysis

## 📊 Current Implementation

### 1. **Data Structure**

```typescript
interface AccountFormData {
  name: string;
  account_type: string;
  icon: string;
  color: string;
  initial_balance: number;
  currency: string;          // ✅ Stored as simple string
  is_active: boolean;
  is_included_in_total: boolean;
}
```

**Currency Type:** Plain string (e.g., "IDR", "USD", "EUR", "GBP")

---

### 2. **Default/Initial Value**

```typescript
const [formData, setFormData] = useState<AccountFormData>({
  name: '',
  account_type: 'checking',
  icon: 'FaUniversity',
  color: '#0891b2',
  initial_balance: 0,
  currency: 'IDR',           // ⚠️ Always defaults to IDR
  is_active: true,
  is_included_in_total: true,
});
```

**Default Currency:** IDR (Indonesian Rupiah)

---

### 3. **Currency Input UI** (Lines 241-250)

```tsx
<Col md={6}>
  <Form.Group className="mb-3">
    <Form.Label>Currency</Form.Label>
    <Form.Select
      value={formData.currency}
      onChange={(e) => handleChange('currency', e.target.value)}
      disabled={loading}
    >
      <option value="IDR">IDR - Indonesian Rupiah</option>
      <option value="USD">USD - US Dollar</option>
      <option value="EUR">EUR - Euro</option>
      <option value="GBP">GBP - British Pound</option>
    </Form.Select>
  </Form.Group>
</Col>
```

**UI Type:** Dropdown (`<Form.Select>`)
**Available Options:** 4 hardcoded currencies

| Code | Name | Status |
|------|------|--------|
| IDR | Indonesian Rupiah | Default |
| USD | US Dollar | Available |
| EUR | Euro | Available |
| GBP | British Pound | Available |

---

### 4. **Currency Change Handler**

```typescript
const handleChange = (field: keyof AccountFormData, value: string | number | boolean) => {
  setFormData((prev) => ({ ...prev, [field]: value }));
};

// Usage:
onChange={(e) => handleChange('currency', e.target.value)}
```

**Behavior:**
- ✅ Simple string assignment
- ✅ No validation
- ✅ No transformation
- ✅ Directly updates form state

---

### 5. **Edit Mode Behavior** (Lines 80-98)

```typescript
useEffect(() => {
  if (show) {
    if (initialData) {
      // Edit mode: merge with initialData
      setFormData((prev) => ({ ...prev, ...initialData }));
    } else {
      // Add mode: use defaults (IDR)
      setFormData({
        name: '',
        account_type: 'checking',
        icon: 'FaUniversity',
        color: '#0891b2',
        initial_balance: 0,
        currency: 'IDR',
        is_active: true,
        is_included_in_total: true,
      });
    }
    setError(null);
  }
}, [show, initialData]);
```

**Edit Mode:**
- ✅ Currency comes from `initialData.currency`
- ✅ If account has USD, dropdown shows USD
- ⚠️ User can change currency in edit mode

**Add Mode:**
- ✅ Always defaults to IDR

---

### 6. **Preview Display** (Lines 383-384)

```tsx
<div style={{ fontSize: '0.9rem', opacity: 0.9 }}>
  {formData.currency} {formData.initial_balance.toLocaleString('id-ID', { minimumFractionDigits: 2 })}
</div>
```

**Display Format:**
- Shows currency code (e.g., "USD 1,000.00")
- ⚠️ Uses Indonesian locale ('id-ID') regardless of currency
- ⚠️ No currency symbol (just code)

**Example Outputs:**
- IDR account: "IDR 1.000.000,00" (Indonesian format)
- USD account: "USD 1.000,00" (Indonesian format, but USD should be 1,000.00)
- EUR account: "EUR 1.000,00" (Indonesian format)

---

## 🔍 Key Characteristics

### ✅ What Works Well

1. **Simple Implementation**
   - Clean, straightforward code
   - Easy to understand
   - No complex logic

2. **Preserves Currency in Edit Mode**
   - Loads existing account currency
   - Shows correct selection in dropdown

3. **Type-Safe**
   - TypeScript interface enforces string type
   - No type errors

4. **Disabled During Save**
   - Prevents changes while saving

---

## ⚠️ Limitations & Issues

### 1. **Limited Currency Options**
- ❌ Only 4 currencies hardcoded
- ❌ No support for: JPY, AUD, CAD, CNY, INR, etc.
- ❌ Users in other countries cannot use their local currency

### 2. **Inconsistent Number Formatting**
```typescript
// ❌ Always uses Indonesian locale
formData.initial_balance.toLocaleString('id-ID', { minimumFractionDigits: 2 })
```

**Problem:**
- USD: Shows "1.000,00" instead of "1,000.00"
- EUR: Shows "1.000,00" (correct for EUR)
- GBP: Shows "1.000,00" instead of "1,000.00"

**Expected:**
- USD: "1,000.00" (US format)
- EUR: "1.000,00" (EU format)
- GBP: "1,000.00" (UK format)
- IDR: "1.000.000,00" (Indonesian format)

### 3. **No Currency Symbol**
```tsx
{formData.currency} {formData.initial_balance...}
// Shows: "USD 1.000,00"
// Should: "$1,000.00" or "US$1,000.00"
```

### 4. **No Validation**
- ❌ Currency field has no explicit validation
- ✅ Dropdown prevents invalid values (but still no runtime check)
- ❌ Could theoretically send invalid currency to API if manipulated

### 5. **Currency Change in Edit Mode**
```typescript
// User can change USD account to EUR
// This could be problematic if transactions exist
```

**Risk:**
- Changing currency on an account with existing transactions could cause data inconsistency
- Example: Account has $1000 in transactions, user changes to EUR
- Should show warning or prevent currency change if transactions exist

### 6. **Default Currency Assumption**
```typescript
currency: 'IDR',  // Always IDR
```

**Issue:**
- Not all users are in Indonesia
- Should detect user location or remember last used currency
- Could use browser locale to suggest default

---

## 📊 Comparison with TransactionModal

### TransactionModal Currency Handling
```typescript
// TransactionModal gets currency from ACCOUNT
const fromAccount = accounts.find(a => a.id === formData.account_id);
const accountCurrency = fromAccount?.currency || 'USD';

// Uses account's currency (dynamic)
currency: accountCurrency,
```

### AccountModal Currency Handling
```typescript
// AccountModal has FIXED currency options
<option value="IDR">IDR - Indonesian Rupiah</option>
<option value="USD">USD - US Dollar</option>
<option value="EUR">EUR - Euro</option>
<option value="GBP">GBP - British Pound</option>

// User selects directly
onChange={(e) => handleChange('currency', e.target.value)}
```

**Relationship:**
1. AccountModal creates accounts with specific currencies
2. TransactionModal reads currency from those accounts
3. ✅ They work together correctly
4. ⚠️ But AccountModal limits available currencies

---

## 🎯 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│ User Opens AccountModal                                      │
│ - Mode: Add → currency = 'IDR' (default)                   │
│ - Mode: Edit → currency = initialData.currency             │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ User Selects Currency from Dropdown                          │
│ - Chooses from: IDR, USD, EUR, GBP                          │
│ - handleChange('currency', selectedValue)                   │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ Preview Updates                                              │
│ - Shows: "USD 1.000,00" (Indonesian locale)                 │
│ - ⚠️ Format doesn't match currency locale                   │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ User Clicks Save                                             │
│ - Sends: { name, type, currency: "USD", ... }              │
│ - API: POST /api/v1/accounts                                │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ Database                                                     │
│ Account { name: "US Bank", currency: "USD" }               │
└─────────────────────┬───────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│ TransactionModal reads account.currency                     │
│ - All transactions use "USD"                                │
│ - Consistent with account currency ✅                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 Potential Improvements

### 1. **Expand Currency Options**

```typescript
const CURRENCY_OPTIONS = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  // ... more currencies
];

<Form.Select value={formData.currency} onChange={...}>
  {CURRENCY_OPTIONS.map(curr => (
    <option key={curr.code} value={curr.code}>
      {curr.code} - {curr.name}
    </option>
  ))}
</Form.Select>
```

### 2. **Locale-Aware Number Formatting**

```typescript
// Get locale based on currency
const getCurrencyLocale = (currency: string): string => {
  switch (currency) {
    case 'USD': return 'en-US';
    case 'EUR': return 'de-DE';
    case 'GBP': return 'en-GB';
    case 'IDR': return 'id-ID';
    case 'JPY': return 'ja-JP';
    default: return 'en-US';
  }
};

// In preview
<div>
  {formData.initial_balance.toLocaleString(
    getCurrencyLocale(formData.currency),
    {
      style: 'currency',
      currency: formData.currency,
      minimumFractionDigits: 2
    }
  )}
</div>
```

**Output Examples:**
- USD: "$1,000.00"
- EUR: "1.000,00 €"
- GBP: "£1,000.00"
- IDR: "Rp1.000.000,00"

### 3. **Show Currency Symbol**

```typescript
const getCurrencySymbol = (currency: string): string => {
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    JPY: '¥',
    IDR: 'Rp',
  };
  return symbols[currency] || currency;
};

// In preview
<div>
  {getCurrencySymbol(formData.currency)} 
  {formData.initial_balance.toLocaleString(...)}
</div>
```

### 4. **Smart Default Currency**

```typescript
// Detect user's locale
const getUserDefaultCurrency = (): string => {
  const locale = navigator.language; // e.g., "en-US", "id-ID"
  
  if (locale.startsWith('en-US')) return 'USD';
  if (locale.startsWith('en-GB')) return 'GBP';
  if (locale.startsWith('id')) return 'IDR';
  if (locale.startsWith('ja')) return 'JPY';
  // ... more mappings
  
  return 'USD'; // fallback
};

// In useState
currency: getUserDefaultCurrency(),
```

### 5. **Prevent Currency Change with Transactions**

```typescript
const handleCurrencyChange = (newCurrency: string) => {
  if (mode === 'edit' && initialData?.currency !== newCurrency) {
    // Check if account has transactions
    if (accountHasTransactions) {
      setError('Cannot change currency on accounts with existing transactions');
      return;
    }
  }
  handleChange('currency', newCurrency);
};
```

### 6. **Currency Search/Filter**

```typescript
const [currencySearch, setCurrencySearch] = useState('');

const filteredCurrencies = CURRENCY_OPTIONS.filter(curr =>
  curr.name.toLowerCase().includes(currencySearch.toLowerCase()) ||
  curr.code.toLowerCase().includes(currencySearch.toLowerCase())
);

// In UI
<Form.Control
  type="text"
  placeholder="Search currency..."
  value={currencySearch}
  onChange={(e) => setCurrencySearch(e.target.value)}
/>

<Form.Select>
  {filteredCurrencies.map(curr => ...)}
</Form.Select>
```

---

## 📝 Summary

### Current State

| Aspect | Status | Notes |
|--------|--------|-------|
| **Storage** | ✅ Good | Simple string, works well |
| **Options** | ⚠️ Limited | Only 4 currencies |
| **Default** | ⚠️ Fixed | Always IDR |
| **Validation** | ⚠️ Minimal | Dropdown prevents invalid, but no runtime check |
| **Formatting** | ❌ Inconsistent | Uses Indonesian locale for all currencies |
| **Symbol** | ❌ Missing | Shows code only (USD, EUR) instead of symbols |
| **Edit Mode** | ⚠️ Risky | Can change currency even with transactions |
| **Integration** | ✅ Good | Works correctly with TransactionModal |

### Recommendations

**Priority 1 (Critical):**
- [ ] Fix number formatting to use correct locale per currency
- [ ] Add more currency options (at least top 10 global currencies)

**Priority 2 (Important):**
- [ ] Show currency symbols in preview
- [ ] Smart default currency based on user locale
- [ ] Prevent currency change if transactions exist

**Priority 3 (Nice to Have):**
- [ ] Currency search/filter
- [ ] Exchange rate display (info only)
- [ ] Recently used currencies

---

**Analysis Date:** 2025-11-22
**Component:** `src/components/accounts/AccountModal.tsx`
**Status:** ✅ Functional but needs improvements for better UX
