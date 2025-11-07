# Testing Guide - Finance App API

## 📋 Overview

This guide provides comprehensive testing scenarios for all API endpoints.

**Prerequisites**:
- Running development server (`npm run dev`)
- PostgreSQL database running
- Valid authentication token

---

## 🔧 Setup

### 1. Start Development Server
```bash
npm run dev
# Server runs at http://localhost:3000
```

### 2. Set Base URL
```bash
export BASE_URL="http://localhost:3000/api/v1"
```

### 3. Register & Login
```bash
# Register new user
curl -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123456"
  }'

# Login
curl -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "test@example.com",
    "password": "Test123456"
  }'

# Save token
export TOKEN="<access_token_from_response>"
```

---

## ✅ Test Scenarios

### Phase 1: Authentication

#### 1.1 Register Success
```bash
curl -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "password": "SecurePass123"
  }'
```
**Expected**: 201, returns user + access_token + refresh_token

#### 1.2 Register Duplicate Email
```bash
# Try registering with same email again
curl -X POST $BASE_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "john@example.com",
    "username": "janedoe",
    "password": "Pass123"
  }'
```
**Expected**: 409, "User with this email already exists"

#### 1.3 Login Success
```bash
curl -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "john@example.com",
    "password": "SecurePass123"
  }'
```
**Expected**: 200, returns user + tokens

#### 1.4 Login Invalid Credentials
```bash
curl -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "john@example.com",
    "password": "WrongPassword"
  }'
```
**Expected**: 401, "Invalid credentials"

#### 1.5 Refresh Token
```bash
export REFRESH_TOKEN="<refresh_token_from_login>"

curl -X POST $BASE_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refresh_token\": \"$REFRESH_TOKEN\"}"
```
**Expected**: 200, returns new access_token + refresh_token

---

### Phase 2: Accounts

#### 2.1 Create Account
```bash
curl -X POST $BASE_URL/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 1,
    "name": "My Wallet",
    "icon": "💵",
    "color": "#4caf50",
    "account_type": "CASH",
    "usability": "ACTIVE",
    "initial_amount": 1000000
  }'
```
**Expected**: 201, returns created account  
**Save**: `export ACCOUNT_ID="<id_from_response>"`

#### 2.2 List Accounts
```bash
curl -X GET $BASE_URL/accounts \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, array of accounts with balances

#### 2.3 Get Account Detail
```bash
curl -X GET $BASE_URL/accounts/$ACCOUNT_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, account with calculated balance

#### 2.4 Update Account
```bash
curl -X PUT $BASE_URL/accounts/$ACCOUNT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Wallet Name",
    "color": "#ff5722"
  }'
```
**Expected**: 200, returns updated account

#### 2.5 Search Accounts
```bash
curl -X GET "$BASE_URL/accounts?keyword=wallet" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, filtered results

#### 2.6 Try Delete Account with Transactions
**(Do this after creating transactions)**
```bash
curl -X DELETE $BASE_URL/accounts/$ACCOUNT_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 400, "Cannot delete account with transactions"

---

### Phase 3: Categories

#### 3.1 Create Parent Category
```bash
curl -X POST $BASE_URL/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 1,
    "name": "Food & Drinks",
    "icon": "🍔",
    "color": "#ff5722",
    "nature": "NEED",
    "is_active": true
  }'
```
**Expected**: 201, returns created category  
**Save**: `export PARENT_CATEGORY_ID="<id_from_response>"`

#### 3.2 Create Child Category
```bash
curl -X POST $BASE_URL/categories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"personal_id\": 2,
    \"name\": \"Restaurant\",
    \"icon\": \"🍽️\",
    \"color\": \"#ff5722\",
    \"nature\": \"NEED\",
    \"parent_id\": \"$PARENT_CATEGORY_ID\",
    \"is_active\": true
  }"
```
**Expected**: 201, returns child category

#### 3.3 Get Category Tree
```bash
curl -X GET $BASE_URL/categories/tree \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, hierarchical nested structure

#### 3.4 Try Circular Reference
```bash
# Try to make parent a child of its own child
curl -X PUT $BASE_URL/categories/$PARENT_CATEGORY_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"parent_id\": \"$CHILD_CATEGORY_ID\"}"
```
**Expected**: 400, "Circular reference detected"

#### 3.5 List Categories
```bash
curl -X GET $BASE_URL/categories \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, flat array of all categories

---

### Phase 5: Transactions

#### 5.1 Create Expense (Negative Amount)
```bash
curl -X POST $BASE_URL/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"personal_id\": 1,
    \"date\": \"2025-11-07\",
    \"account_id\": \"$ACCOUNT_ID\",
    \"category_id\": \"$PARENT_CATEGORY_ID\",
    \"amount\": -50000,
    \"note\": \"Lunch at restaurant\"
  }"
```
**Expected**: 201, type = EXPENSE, amount = 50000  
**Save**: `export TXN_ID="<id_from_response>"`

#### 5.2 Create Income (Positive Amount)
```bash
curl -X POST $BASE_URL/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"personal_id\": 2,
    \"date\": \"2025-11-08\",
    \"account_id\": \"$ACCOUNT_ID\",
    \"category_id\": \"$PARENT_CATEGORY_ID\",
    \"amount\": 1000000,
    \"note\": \"Monthly salary\"
  }"
```
**Expected**: 201, type = INCOME, amount = 1000000

#### 5.3 Try Create with Zero Amount
```bash
curl -X POST $BASE_URL/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"personal_id\": 3,
    \"date\": \"2025-11-08\",
    \"account_id\": \"$ACCOUNT_ID\",
    \"category_id\": \"$PARENT_CATEGORY_ID\",
    \"amount\": 0
  }"
```
**Expected**: 400, "Amount cannot be 0"

#### 5.4 List Transactions with Filters
```bash
# By date range
curl -X GET "$BASE_URL/transactions?start_date=2025-11-01&end_date=2025-11-30" \
  -H "Authorization: Bearer $TOKEN"

# By account
curl -X GET "$BASE_URL/transactions?account_id=$ACCOUNT_ID" \
  -H "Authorization: Bearer $TOKEN"

# By type
curl -X GET "$BASE_URL/transactions?type=EXPENSE" \
  -H "Authorization: Bearer $TOKEN"

# Keyword search
curl -X GET "$BASE_URL/transactions?keyword=lunch" \
  -H "Authorization: Bearer $TOKEN"

# Multiple filters
curl -X GET "$BASE_URL/transactions?account_id=$ACCOUNT_ID&type=EXPENSE&start_date=2025-11-01" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, filtered results

#### 5.5 Get Transaction Summary
```bash
curl -X GET "$BASE_URL/transactions/summary?start_date=2025-11-01&end_date=2025-11-30" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, statistics with income/expense totals

#### 5.6 Update Transaction
```bash
curl -X PUT $BASE_URL/transactions/$TXN_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": -75000,
    "note": "Updated: Lunch + Coffee"
  }'
```
**Expected**: 200, updated transaction

#### 5.7 Get Transaction Detail
```bash
curl -X GET $BASE_URL/transactions/$TXN_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, transaction with account/category details

---

### Phase 6: Transfers

#### 6.1 Create Second Account
```bash
curl -X POST $BASE_URL/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 2,
    "name": "Bank Account",
    "icon": "🏦",
    "color": "#2196f3",
    "account_type": "BANK",
    "usability": "ACTIVE",
    "initial_amount": 5000000
  }'
```
**Save**: `export ACCOUNT2_ID="<id_from_response>"`

#### 6.2 Create Transfer
```bash
curl -X POST $BASE_URL/transfers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"personal_id\": 1,
    \"date\": \"2025-11-08\",
    \"from_account_id\": \"$ACCOUNT_ID\",
    \"to_account_id\": \"$ACCOUNT2_ID\",
    \"amount\": 500000,
    \"note\": \"Monthly savings transfer\"
  }"
```
**Expected**: 201, creates 1 transfer + 2 transactions  
**Save**: `export TRANSFER_ID="<id_from_response>"`

#### 6.3 Verify Transactions Created
```bash
curl -X GET "$BASE_URL/transactions?transfer_id=$TRANSFER_ID" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 2 transactions (EXPENSE from account1, INCOME to account2)

#### 6.4 Get Transfer Detail
```bash
curl -X GET $BASE_URL/transfers/$TRANSFER_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, transfer with linked transactions

#### 6.5 Update Transfer
```bash
curl -X PUT $BASE_URL/transfers/$TRANSFER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 750000,
    "note": "Updated savings transfer"
  }'
```
**Expected**: 200, updates transfer + both transactions

#### 6.6 List Transfers
```bash
curl -X GET $BASE_URL/transfers \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, array of transfers

#### 6.7 Delete Transfer
```bash
curl -X DELETE $BASE_URL/transfers/$TRANSFER_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, deletes transfer + both transactions

---

### Phase 4: Groups

#### 4.1 Create Group
```bash
curl -X POST $BASE_URL/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 1,
    "name": "Cash Accounts"
  }'
```
**Expected**: 201, returns group  
**Save**: `export GROUP_ID="<id_from_response>"`

#### 4.2 Assign Account to Group
```bash
curl -X PUT $BASE_URL/accounts/$ACCOUNT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"group_id\": \"$GROUP_ID\"}"
```
**Expected**: 200, account updated

#### 4.3 Get Group Detail
```bash
curl -X GET $BASE_URL/groups/$GROUP_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, group with list of accounts

#### 4.4 List Groups
```bash
curl -X GET $BASE_URL/groups \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, array with account_count

#### 4.5 Try Delete Group with Accounts
```bash
curl -X DELETE $BASE_URL/groups/$GROUP_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 400, "Cannot delete group with accounts"

#### 4.6 Remove Account from Group
```bash
curl -X PUT $BASE_URL/accounts/$ACCOUNT_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"group_id": null}'
```
**Expected**: 200, account removed from group

#### 4.7 Delete Empty Group
```bash
curl -X DELETE $BASE_URL/groups/$GROUP_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, group deleted

---

### Phase 7: Debts

#### 7.1 Create Debt (Payable)
```bash
curl -X POST $BASE_URL/debts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"personal_id\": 1,
    \"account_id\": \"$ACCOUNT_ID\",
    \"name\": \"John Doe\",
    \"type\": \"PAYABLE\"
  }"
```
**Expected**: 201, balance = 0  
**Save**: `export DEBT_ID="<id_from_response>"`

#### 7.2 Record Borrowing Money
```bash
curl -X POST $BASE_URL/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"personal_id\": 10,
    \"date\": \"2025-11-09\",
    \"account_id\": \"$ACCOUNT_ID\",
    \"category_id\": \"$PARENT_CATEGORY_ID\",
    \"amount\": -500000,
    \"note\": \"Borrowed from John\",
    \"debt_id\": \"$DEBT_ID\"
  }"
```
**Expected**: 201, transaction linked to debt

#### 7.3 Check Debt Balance
```bash
curl -X GET $BASE_URL/debts/$DEBT_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, balance = 500000 (you owe)

#### 7.4 Record Paying Back
```bash
curl -X POST $BASE_URL/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"personal_id\": 11,
    \"date\": \"2025-11-10\",
    \"account_id\": \"$ACCOUNT_ID\",
    \"category_id\": \"$PARENT_CATEGORY_ID\",
    \"amount\": 200000,
    \"note\": \"Paid back to John\",
    \"debt_id\": \"$DEBT_ID\"
  }"
```
**Expected**: 201, transaction created

#### 7.5 Check Updated Balance
```bash
curl -X GET $BASE_URL/debts/$DEBT_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, balance = 300000 (you still owe)

#### 7.6 List Debts
```bash
curl -X GET $BASE_URL/debts \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, array with calculated balances

#### 7.7 Filter by Type
```bash
# Payables (you owe)
curl -X GET "$BASE_URL/debts?type=PAYABLE" \
  -H "Authorization: Bearer $TOKEN"

# Receivables (they owe you)
curl -X GET "$BASE_URL/debts?type=RECEIVABLE" \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 200, filtered results

#### 7.8 Try Delete Debt with Transactions
```bash
curl -X DELETE $BASE_URL/debts/$DEBT_ID \
  -H "Authorization: Bearer $TOKEN"
```
**Expected**: 400, "Cannot delete debt with linked transactions"

---

## 🧪 Integration Tests

### Test Flow 1: Complete Transaction Lifecycle
```bash
# 1. Create account
# 2. Create category
# 3. Create income transaction
# 4. Create expense transaction
# 5. Check account balance
# 6. Get summary
# 7. Update transaction
# 8. Delete transaction
```

### Test Flow 2: Transfer Between Accounts
```bash
# 1. Create 2 accounts
# 2. Check initial balances
# 3. Create transfer
# 4. Verify 2 transactions created
# 5. Check updated balances (source decreased, destination increased)
# 6. Update transfer amount
# 7. Verify balances updated
# 8. Delete transfer
# 9. Verify balances reverted
```

### Test Flow 3: Debt Tracking
```bash
# 1. Create debt (PAYABLE)
# 2. Borrow money (EXPENSE transaction)
# 3. Check debt balance increased
# 4. Pay back partially (INCOME transaction)
# 5. Check debt balance decreased
# 6. Pay back fully
# 7. Check debt balance = 0
```

---

## 📊 Performance Testing

### Load Test (Create Many Transactions)
```bash
for i in {1..100}; do
  curl -X POST $BASE_URL/transactions \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"personal_id\": $i,
      \"date\": \"2025-11-07\",
      \"account_id\": \"$ACCOUNT_ID\",
      \"category_id\": \"$PARENT_CATEGORY_ID\",
      \"amount\": -10000,
      \"note\": \"Test transaction $i\"
    }"
done
```

### Test Pagination
```bash
# Get first 50
curl -X GET "$BASE_URL/transactions?limit=50&offset=0" \
  -H "Authorization: Bearer $TOKEN"

# Get next 50
curl -X GET "$BASE_URL/transactions?limit=50&offset=50" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ✅ Checklist

- [ ] All authentication endpoints work
- [ ] Can create/read/update/delete accounts
- [ ] Can create category hierarchy
- [ ] Can create transactions (income/expense)
- [ ] Transaction amount sign logic works
- [ ] Can filter transactions by multiple criteria
- [ ] Can create transfers (auto-creates 2 transactions)
- [ ] Can organize accounts into groups
- [ ] Can track debts (payable/receivable)
- [ ] Balance calculations are correct
- [ ] Cannot delete resources with dependencies
- [ ] Token refresh works automatically
- [ ] personal_id caching works
- [ ] Error messages are clear

---

## 🐛 Common Issues

### "401 Unauthorized"
- Token expired or invalid
- Use refresh endpoint to get new token

### "Amount cannot be 0"
- Transaction amount is zero
- Use non-zero value (positive or negative)

### "Cannot delete X with Y"
- Resource has dependencies
- Remove dependencies first

### "personal_id already exists"
- Duplicate ID
- Increment personal_id or clear cache

---

**Testing Version**: 1.0.0  
**Last Updated**: 2025-11-07
