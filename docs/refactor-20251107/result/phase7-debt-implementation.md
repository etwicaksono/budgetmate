# Phase 7: Debt Management - Implementation Summary

## ✅ Status: COMPLETE

All 5 debt endpoints implemented for tracking money owed/owing.

---

## 📋 Overview

**Goal**: Implement debt tracking system

**Priority**: LOW (Optional feature for personal finance)

**Duration**: Implemented in 1 session

**Key Feature**: Track debts (money you owe) and receivables (money owed to you)

---

## 🎯 Implemented Endpoints

### 1. **GET /api/v1/debts** - List Debts
**Purpose**: Retrieve all debts with balances calculated from linked transactions

**Query Parameters**:
- `account_id` (optional) - Filter by account
- `type` (optional) - Filter by type (PAYABLE or RECEIVABLE)
- `keyword` (optional) - Search in debtor/creditor names (case-insensitive)

**Response**:
```json
{
  "success": true,
  "message": "Debts retrieved successfully",
  "data": [
    {
      "id": "debt-uuid",
      "user_id": "user-uuid",
      "personal_id": 1,
      "account_id": "account-uuid",
      "account_name": "Cash",
      "account_icon": "💵",
      "name": "John Doe",
      "type": "PAYABLE",
      "balance": 500000,
      "transaction_count": 3,
      "created_at": "2025-11-07T...",
      "updated_at": "2025-11-07T..."
    },
    {
      "id": "debt-uuid-2",
      "user_id": "user-uuid",
      "personal_id": 2,
      "account_id": "account-uuid",
      "account_name": "Bank",
      "account_icon": "🏦",
      "name": "Jane Smith",
      "type": "RECEIVABLE",
      "balance": 300000,
      "transaction_count": 2,
      "created_at": "2025-11-07T...",
      "updated_at": "2025-11-07T..."
    }
  ],
  "meta": {
    "max_personal_id": 2,
    "total": 2
  }
}
```

**Features**:
- Returns calculated balance from all linked transactions
- Returns account details (name, icon)
- Returns transaction count
- Filtered by type, account, or keyword
- Sorted by personal_id

**Balance Calculation**:
- **PAYABLE** (You owe money):
  - EXPENSE transaction → Increases debt (borrowing more)
  - INCOME transaction → Decreases debt (paying back)
- **RECEIVABLE** (They owe you):
  - INCOME transaction → Increases receivable (they borrowed more)
  - EXPENSE transaction → Decreases receivable (they paid back)

---

### 2. **POST /api/v1/debts** - Create Debt
**Purpose**: Create a new debt record

**Request Body**:
```json
{
  "personal_id": 1,
  "account_id": "account-uuid",
  "name": "John Doe",
  "type": "PAYABLE"
}
```

**Validations**:
- ✅ All required fields present
- ✅ type must be "PAYABLE" or "RECEIVABLE"
- ✅ name cannot be empty
- ✅ personal_id must be unique per user
- ✅ account must exist and belong to user

**Debt Types**:
- **PAYABLE**: Money you owe to someone
- **RECEIVABLE**: Money someone owes to you

**Response**:
```json
{
  "success": true,
  "message": "Debt created successfully",
  "data": {
    "id": "debt-uuid",
    "user_id": "user-uuid",
    "personal_id": 1,
    "account_id": "account-uuid",
    "account_name": "Cash",
    "account_icon": "💵",
    "name": "John Doe",
    "type": "PAYABLE",
    "balance": 0,
    "transaction_count": 0,
    "created_at": "2025-11-07T...",
    "updated_at": "2025-11-07T..."
  }
}
```

**Example**:
```bash
curl -X POST http://localhost:3000/api/v1/debts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 1,
    "account_id": "cash-account-uuid",
    "name": "John Doe",
    "type": "PAYABLE"
  }'
```

---

### 3. **GET /api/v1/debts/:id** - Get Debt Detail
**Purpose**: Retrieve a single debt with linked transactions

**Response**:
```json
{
  "success": true,
  "message": "Debt retrieved successfully",
  "data": {
    "id": "debt-uuid",
    "user_id": "user-uuid",
    "personal_id": 1,
    "account_id": "account-uuid",
    "account_name": "Cash",
    "account_icon": "💵",
    "name": "John Doe",
    "type": "PAYABLE",
    "balance": 500000,
    "transaction_count": 3,
    "created_at": "2025-11-07T...",
    "updated_at": "2025-11-07T...",
    "transactions": [
      {
        "id": "txn-uuid-1",
        "date": "2025-11-01",
        "type": "EXPENSE",
        "amount": 300000,
        "category_id": "cat-uuid",
        "category_name": "Loan",
        "category_icon": "💰",
        "note": "Borrowed money"
      },
      {
        "id": "txn-uuid-2",
        "date": "2025-11-05",
        "type": "EXPENSE",
        "amount": 200000,
        "category_id": "cat-uuid",
        "category_name": "Loan",
        "category_icon": "💰",
        "note": "Additional loan"
      }
    ]
  }
}
```

**Features**:
- Returns complete debt details
- Includes all linked transactions sorted by date (most recent first)
- Shows balance calculated from transactions
- Returns 404 if not found or doesn't belong to user

**Example**:
```bash
curl -X GET http://localhost:3000/api/v1/debts/DEBT_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. **PUT /api/v1/debts/:id** - Update Debt
**Purpose**: Update debt details

**Request Body** (all fields optional):
```json
{
  "name": "John Doe Jr.",
  "type": "RECEIVABLE",
  "account_id": "new-account-uuid"
}
```

**Validations**:
- ✅ Debt exists and belongs to user
- ✅ name cannot be empty (if provided)
- ✅ type must be PAYABLE or RECEIVABLE (if provided)
- ✅ account must exist and belong to user (if changed)

**Response**:
```json
{
  "success": true,
  "message": "Debt updated successfully",
  "data": {
    "id": "debt-uuid",
    "user_id": "user-uuid",
    "personal_id": 1,
    "account_id": "new-account-uuid",
    "account_name": "Bank",
    "account_icon": "🏦",
    "name": "John Doe Jr.",
    "type": "RECEIVABLE",
    "balance": 500000,
    "transaction_count": 3,
    "created_at": "2025-11-07T...",
    "updated_at": "2025-11-08T..."
  }
}
```

**Note**: Changing type (PAYABLE ↔ RECEIVABLE) will reverse the balance calculation.

**Example**:
```bash
curl -X PUT http://localhost:3000/api/v1/debts/DEBT_UUID \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe (Updated)"
  }'
```

---

### 5. **DELETE /api/v1/debts/:id** - Delete Debt
**Purpose**: Delete a debt with no linked transactions

**Validations**:
- ✅ Debt exists and belongs to user
- ✅ Debt must have no linked transactions
- ✅ If debt has transactions, returns 400 error

**Response**:
```json
{
  "success": true,
  "message": "Debt deleted successfully",
  "data": null
}
```

**Error if debt has transactions**:
```json
{
  "success": false,
  "message": "Cannot delete debt with linked transactions. Remove transactions first.",
  "data": null
}
```

**Example**:
```bash
curl -X DELETE http://localhost:3000/api/v1/debts/DEBT_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔗 Integration with Transactions

### Linking Transaction to Debt

When creating or updating a transaction, you can specify a `debt_id`:

**Create Transaction for Debt**:
```bash
POST /api/v1/transactions
{
  "personal_id": 1,
  "date": "2025-11-07",
  "account_id": "cash-uuid",
  "category_id": "loan-category-uuid",
  "amount": -300000,  # Negative = EXPENSE (borrowing)
  "note": "Borrowed from John",
  "debt_id": "debt-uuid"  # ← Link to debt
}
```

**Update Transaction's Debt**:
```bash
PUT /api/v1/transactions/TXN_UUID
{
  "debt_id": "debt-uuid"  # Link to debt
}
```

**Remove Transaction from Debt**:
```bash
PUT /api/v1/transactions/TXN_UUID
{
  "debt_id": null  # Unlink from debt
}
```

---

## 📊 Database Schema

### debts Table
```sql
CREATE TABLE debts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  personal_id BIGINT NOT NULL,
  account_id VARCHAR(36) NOT NULL,
  name VARCHAR(64) NOT NULL,
  type VARCHAR(16) NOT NULL,
  position JSON,
  created_at DATE NOT NULL,
  created_by VARCHAR(64),
  updated_at DATE,
  updated_by VARCHAR(64),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE (user_id, personal_id)
);
```

### transactions.debt_id Link
```sql
ALTER TABLE transactions
ADD COLUMN debt_id VARCHAR(36),
ADD FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE RESTRICT;
```

**Note**: `ON DELETE RESTRICT` prevents deleting debts with linked transactions.

---

## 🧪 Testing Scenarios

### 1. Create Debt (You Owe Money)
```bash
# Create PAYABLE debt (you owe John $500)
curl -X POST http://localhost:3000/api/v1/debts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 1,
    "account_id": "cash-uuid",
    "name": "John Doe",
    "type": "PAYABLE"
  }'
```

**Verify**:
- ✅ Debt created
- ✅ balance is 0 (no transactions yet)
- ✅ type is PAYABLE

### 2. Record Borrowing Money
```bash
# You borrowed $500 from John
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 1,
    "date": "2025-11-07",
    "account_id": "cash-uuid",
    "category_id": "loan-category-uuid",
    "amount": -500000,
    "note": "Borrowed from John",
    "debt_id": "john-debt-uuid"
  }'
```

**Verify**:
- ✅ Transaction created with debt_id
- ✅ GET /api/v1/debts shows balance = 500000 (you owe $500k)

### 3. Record Paying Back
```bash
# You paid back $200
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 2,
    "date": "2025-11-08",
    "account_id": "cash-uuid",
    "category_id": "loan-category-uuid",
    "amount": 200000,
    "note": "Paid back to John",
    "debt_id": "john-debt-uuid"
  }'
```

**Verify**:
- ✅ GET /api/v1/debts shows balance = 300000 (you owe $300k now)
- ✅ transaction_count = 2

### 4. Create Receivable (Someone Owes You)
```bash
# Create RECEIVABLE debt (Jane owes you $1000)
curl -X POST http://localhost:3000/api/v1/debts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 2,
    "account_id": "bank-uuid",
    "name": "Jane Smith",
    "type": "RECEIVABLE"
  }'
```

### 5. Record Lending Money
```bash
# You lent $1000 to Jane
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 3,
    "date": "2025-11-07",
    "account_id": "bank-uuid",
    "category_id": "loan-category-uuid",
    "amount": 1000000,
    "note": "Lent to Jane",
    "debt_id": "jane-debt-uuid"
  }'
```

**Verify**:
- ✅ GET /api/v1/debts shows Jane's balance = 1000000 (she owes you)

### 6. Get Debt Detail
```bash
curl -X GET http://localhost:3000/api/v1/debts/john-debt-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verify**:
- ✅ Returns debt details
- ✅ Includes all linked transactions
- ✅ Shows correct balance

### 7. List All Debts
```bash
curl -X GET http://localhost:3000/api/v1/debts \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verify**:
- ✅ Shows all debts with balances
- ✅ PAYABLEs show money you owe
- ✅ RECEIVABLEs show money owed to you

### 8. Filter by Type
```bash
# Show only PAYABLEs (your debts)
curl -X GET "http://localhost:3000/api/v1/debts?type=PAYABLE" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Show only RECEIVABLEs (money owed to you)
curl -X GET "http://localhost:3000/api/v1/debts?type=RECEIVABLE" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 9. Try to Delete Debt with Transactions
```bash
curl -X DELETE http://localhost:3000/api/v1/debts/john-debt-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verify**:
- ❌ Returns 400 error
- ❌ Error message: "Cannot delete debt with linked transactions..."

### 10. Delete Empty Debt
```bash
# First, create a debt
curl -X POST http://localhost:3000/api/v1/debts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 99,
    "account_id": "cash-uuid",
    "name": "Temp Person",
    "type": "PAYABLE"
  }'

# Then delete it (no transactions linked)
curl -X DELETE http://localhost:3000/api/v1/debts/temp-debt-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Verify**:
- ✅ Debt deleted successfully

---

## 🎯 Use Cases

### 1. **Track Personal Loans**
```
Debts (PAYABLE)
├─ John Doe: $500 (borrowed for emergency)
├─ Bank Loan: $10,000 (car loan)
└─ Credit Card: $2,000 (monthly balance)

Receivables (RECEIVABLE)
├─ Jane Smith: $300 (lent for vacation)
└─ Bob Johnson: $150 (dinner split)
```

### 2. **Track Business Debts**
```
Accounts Payable
├─ Vendor A: $5,000
├─ Vendor B: $3,000
└─ Rent: $2,000

Accounts Receivable
├─ Client X: $10,000
├─ Client Y: $7,500
└─ Client Z: $5,000
```

### 3. **Track Split Bills**
```
Split with Roommates
├─ Alice owes you: $100 (utilities)
├─ Bob owes you: $150 (groceries)
└─ You owe Charlie: $75 (dinner)
```

---

## 📈 Balance Calculation Examples

### PAYABLE (You Owe Money)
```
Initial: $0
+ EXPENSE $500 = $500 (you borrowed)
+ EXPENSE $200 = $700 (borrowed more)
- INCOME $300 = $400 (paid back)
Final balance: $400 (you still owe)
```

### RECEIVABLE (They Owe You)
```
Initial: $0
+ INCOME $1000 = $1000 (you lent)
- EXPENSE $200 = $800 (they paid back)
+ INCOME $500 = $1300 (you lent more)
Final balance: $1300 (they still owe)
```

---

## 🎯 Success Criteria

- [x] List debts with calculated balances
- [x] Create debt (PAYABLE or RECEIVABLE)
- [x] Get debt detail with transactions
- [x] Update debt details
- [x] Delete debts without transactions
- [x] Prevent deleting debts with transactions
- [x] Filter by type and account
- [x] Keyword search in names
- [x] Link transactions to debts
- [x] Calculate balances from transactions
- [x] personal_id caching support
- [x] TypeScript compilation success
- [x] Build success
- [x] All routes registered

---

## 🚀 Build Results

```
✅ TypeScript compilation: SUCCESS
✅ Production build: SUCCESS
✅ Routes registered:
   - ƒ /api/v1/debts (GET, POST)
   - ƒ /api/v1/debts/[id] (GET, PUT, DELETE)

Total routes: 29 API endpoints
```

---

## 📝 Notes

### Debt Deletion Rules
- ✅ Can delete debt if it has 0 transactions
- ❌ Cannot delete debt if it has transactions
- **Workflow**: Unlink/delete transactions first, then delete debt

### Transaction Linking
- Transactions can link to 0 or 1 debt (optional)
- Setting `debt_id` to `null` unlinks transaction
- Deleting transaction doesn't affect debt

### Type Conversion
- Changing type from PAYABLE to RECEIVABLE (or vice versa) reverses balance
- **Be careful** when changing type as it affects balance calculation

### Personal ID Management
- Debts have their own personal_id sequence
- Max personal_id returned in list endpoint for caching

### Future Enhancements
- Add due dates and reminders
- Add interest calculation
- Add payment schedules
- Add debt consolidation
- Add debt reports/analytics

---

## 🔄 Integration with Other Features

### With Transactions
- Transactions can be linked to debts via `debt_id`
- Linked transactions contribute to debt balance
- Deletion prevented (must unlink first)

### With Accounts
- Each debt is associated with an account
- Debt transactions affect account balance
- Can filter debts by account

### With Analytics
- Can show total debts vs receivables
- Track debt payoff progress
- Analyze lending/borrowing patterns

### With UI
- Show debt summaries on dashboard
- Debt tracking page with balances
- Payment reminders
- Debt vs receivable comparison charts

---

## ✅ Phase 7 Complete!

**Total API Endpoints: 29**
- Authentication: 4
- Accounts: 6
- Categories: 7
- Transactions: 6
- Transfers: 5
- Groups: 5
- Debts: 5 ← NEW!

**Next Step**: Phase 8: Documentation & Cleanup
