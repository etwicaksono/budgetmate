# Comprehensive Testing Plan - Currency & API Fixes

## 🎯 Testing Session: 2025-11-22

### Changes to Test:
1. ✅ Account currency update fix (commit `3646674`)
2. ✅ Dynamic currency handling in TransactionModal (commit `9775b21`)
3. ✅ Account API ID parameter fix (commit `6703dfd`)
4. ✅ Categories & Transfers API ID fixes (commit `dcf915e`)

---

## 🧪 Test Suite

### Test 1: Account Currency - Create New Account ⏱️ 2 min

**Purpose:** Verify accounts can be created with different currencies

**Steps:**
1. Navigate to Accounts page
2. Click "Add" button
3. Fill in account details:
   - Name: "US Bank Account"
   - Type: Checking
   - Currency: **USD**
   - Initial Balance: 1000
4. Click "Add Account"

**Expected Results:**
- ✅ Account created successfully
- ✅ Account appears in list
- ✅ Balance shows "USD 1,000.00" or "IDR 1,000.00" (depending on format)

**Pass/Fail:** ________

**Notes:**
```
Account ID: ___________
Currency in DB: ___________
```

---

### Test 2: Account Currency - Create EUR Account ⏱️ 2 min

**Purpose:** Test another currency

**Steps:**
1. Click "Add" button again
2. Fill in:
   - Name: "EU Bank Account"
   - Type: Savings
   - Currency: **EUR**
   - Initial Balance: 500
3. Click "Add Account"

**Expected Results:**
- ✅ Account created successfully
- ✅ Shows EUR currency

**Pass/Fail:** ________

---

### Test 3: Account Currency - Edit Existing Account ⏱️ 3 min

**Purpose:** Verify currency update fix works

**Steps:**
1. Click on the USD account from Test 1
2. Edit modal opens with current data
3. Change currency from **USD → GBP**
4. Click "Save Changes"
5. Close modal
6. Click account again to verify

**Expected Results:**
- ✅ Save succeeds without errors
- ✅ Account currency updates to GBP
- ✅ When reopened, dropdown shows GBP selected

**Critical:** This tests commit `3646674` (currency field in update payload)

**Pass/Fail:** ________

**Notes:**
```
Before: USD
After: ___________
DB check: ___________
```

---

### Test 4: Transaction - Create with USD Account ⏱️ 2 min

**Purpose:** Verify transactions use account currency

**Steps:**
1. Navigate to Transactions page
2. Click "Add Transaction"
3. Select transaction type: **Expense**
4. Select account: **US Bank Account (USD)** or the GBP one from Test 3
5. Enter amount: 50
6. Select category: Groceries (or any)
7. Note the currency label next to "Amount" field

**Expected Results:**
- ✅ Amount field shows: "Amount * (USD)" or "Amount * (GBP)"
- ✅ Currency matches selected account
- ✅ Transaction saves successfully
- ✅ Transaction list shows correct currency

**Critical:** This tests commit `9775b21` (dynamic currency from account)

**Pass/Fail:** ________

**Notes:**
```
Account selected: ___________
Currency shown in UI: ___________
Transaction created: ___________
```

---

### Test 5: Transaction - Create with EUR Account ⏱️ 2 min

**Purpose:** Test different currency

**Steps:**
1. Create another transaction (Expense)
2. Select account: **EU Bank Account (EUR)**
3. Enter amount: 30
4. Select category: Food (or any)

**Expected Results:**
- ✅ Amount field shows: "Amount * (EUR)"
- ✅ Transaction saves with EUR
- ✅ Dashboard shows EUR transactions correctly

**Pass/Fail:** ________

---

### Test 6: Transfer - Same Currency (USD → USD) ⏱️ 3 min

**Purpose:** Test same-currency transfer with auto-sync

**Steps:**
1. Create another USD account first (if needed):
   - Name: "US Savings"
   - Currency: USD
   - Balance: 500
2. Create Transfer:
   - From: US Bank (USD)
   - To: US Savings (USD)
   - Amount: 100
3. **Observe UI:**
   - Both amount fields show "(USD)"
   - Destination amount should be **disabled** and auto-synced
   - No "Multi-currency" badge

**Expected Results:**
- ✅ Source amount shows (USD)
- ✅ Destination amount shows (USD)
- ✅ Destination amount is disabled/locked
- ✅ Amounts stay in sync when changing source
- ✅ Transfer saves successfully
- ✅ Both accounts updated correctly

**Critical:** This tests smart amount syncing from commit `9775b21`

**Pass/Fail:** ________

**Notes:**
```
Source currency: ___________
Destination currency: ___________
Destination disabled: Yes / No
Amounts synced: Yes / No
```

---

### Test 7: Transfer - Multi-Currency (USD → EUR) ⏱️ 3 min

**Purpose:** Test multi-currency transfer with independent amounts

**Steps:**
1. Create Transfer:
   - From: US Bank (USD)
   - To: EU Bank (EUR)
   - Source Amount: 100
2. **Observe UI:**
   - Source shows "(USD)"
   - Destination shows "(EUR)" with **"Multi-currency" badge**
   - Help text appears: "Converting from USD to EUR..."
   - Destination amount is **editable**
3. Enter destination amount: 92 (simulating exchange rate)
4. Save transfer

**Expected Results:**
- ✅ Multi-currency badge appears
- ✅ Help text shows
- ✅ Destination amount is editable
- ✅ Can enter different amount (92 vs 100)
- ✅ Transfer saves with both amounts: 100 USD and 92 EUR
- ✅ Both accounts updated with correct amounts

**Critical:** This tests multi-currency transfer support from commit `9775b21`

**Pass/Fail:** ________

**Notes:**
```
Source: USD 100
Destination: EUR ___________
Badge shown: Yes / No
Help text shown: Yes / No
Destination editable: Yes / No
```

---

### Test 8: Account Update API - ID Parameter ⏱️ 2 min

**Purpose:** Verify account update works (ID parameter fix)

**Steps:**
1. Go to Accounts page
2. Click on any account
3. Change the **name** only
4. Click "Save Changes"
5. Check browser DevTools Network tab

**Expected Results:**
- ✅ PUT request to `/api/v1/accounts/{id}` succeeds
- ✅ Status: 200 OK
- ✅ No "missing ID" error
- ✅ Name updates successfully

**Critical:** This tests commit `6703dfd` (ID parameter fix)

**Pass/Fail:** ________

**Network Log:**
```
Request URL: ___________
Status: ___________
Response: ___________
```

---

### Test 9: Category Update - ID Parameter ⏱️ 2 min

**Purpose:** Verify category operations work

**Steps:**
1. Navigate to Categories page (if exists) or Settings
2. Try to edit a category (change name/color)
3. Save
4. Check Network tab

**Expected Results:**
- ✅ PUT request succeeds
- ✅ No ID parameter errors

**Critical:** This tests commit `dcf915e` (categories ID fix)

**Pass/Fail:** ________

---

### Test 10: Transfer View/Delete - ID Parameter ⏱️ 2 min

**Purpose:** Verify transfer detail operations work

**Steps:**
1. Navigate to Transactions page
2. Find a transfer (shows arrow icon)
3. Click on transfer to view details
4. Try to delete the transfer
5. Check Network tab

**Expected Results:**
- ✅ GET request to `/api/v1/transfers/{id}` succeeds
- ✅ DELETE request succeeds (if deleting)
- ✅ No ID parameter errors

**Critical:** This tests commit `dcf915e` (transfers ID fix)

**Pass/Fail:** ________

---

## 📊 Test Results Summary

| Test # | Test Name | Pass/Fail | Critical Issues | Notes |
|--------|-----------|-----------|-----------------|-------|
| 1 | Create USD Account | ⬜ | | |
| 2 | Create EUR Account | ⬜ | | |
| 3 | Edit Currency USD→GBP | ⬜ | **HIGH PRIORITY** | |
| 4 | Transaction USD | ⬜ | **HIGH PRIORITY** | |
| 5 | Transaction EUR | ⬜ | | |
| 6 | Same-Currency Transfer | ⬜ | **HIGH PRIORITY** | |
| 7 | Multi-Currency Transfer | ⬜ | **HIGH PRIORITY** | |
| 8 | Account Update API | ⬜ | **HIGH PRIORITY** | |
| 9 | Category Update | ⬜ | | |
| 10 | Transfer Operations | ⬜ | | |

**Overall Pass Rate:** _____ / 10

---

## 🐛 Issues Found

### Issue 1:
**Description:**
**Severity:** Critical / High / Medium / Low
**Steps to Reproduce:**
**Expected:**
**Actual:**

### Issue 2:
**Description:**
**Severity:** Critical / High / Medium / Low
**Steps to Reproduce:**
**Expected:**
**Actual:**

---

## ✅ Test Checklist

**Prerequisites:**
- [ ] Dev server running
- [ ] Browser DevTools open (Network tab)
- [ ] Database accessible (for verification)
- [ ] Clean test data or known state

**Post-Testing:**
- [ ] All tests documented
- [ ] Issues logged
- [ ] Pass rate calculated
- [ ] Next steps identified

---

## 🔧 DevTools Monitoring

During testing, watch for:

**Console Errors:**
```
❌ Any errors related to currency
❌ "Cannot read property 'currency' of undefined"
❌ ID parameter errors
```

**Network Requests:**
```
✅ Status 200 for updates
❌ Status 400/500 errors
✅ Correct payload in request body
```

**Payload Inspection (Account Update):**
```json
{
  "name": "Updated Name",
  "account_type": "checking",
  "icon": "FaWallet",
  "color": "#0891b2",
  "currency": "GBP",  // ✅ Should be present
  "is_active": true,
  "is_included_in_total": true
}
```

---

## 🚀 Next Steps After Testing

**If All Tests Pass:**
- ✅ Mark all changes as production-ready
- ✅ Consider deploying to staging
- ✅ Move to Option 2 (Currency UX improvements)

**If Issues Found:**
- 🐛 Log all issues
- 🔴 Fix critical issues first
- 🟡 Schedule medium/low priority fixes
- 🔄 Re-test after fixes

---

**Tester:** ___________
**Date:** 2025-11-22
**Duration:** ___________
**Environment:** Development
