# Complete API Reference - Finance App

## 📋 Overview

**Base URL**: `/api/v1`

**Authentication**: Bearer Token (JWT)

**Response Format**: All endpoints return wrapped responses:
```json
{
  "success": boolean,
  "message": string,
  "data": object | array | null,
  "meta": {
    "version": string,
    "timestamp": number,
    [additional metadata]
  }
}
```

**Total Endpoints**: 29

---

## 🔐 Authentication (4 endpoints)

### 1. Register
- **POST** `/api/v1/auth/register`
- **Auth Required**: No
- **Request**:
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "username": "johndoe",
    "password": "SecurePassword123"
  }
  ```
- **Response**: User profile + access_token + refresh_token
- **Status Codes**: 201 (Created), 400 (Validation Error), 409 (Duplicate)

### 2. Login
- **POST** `/api/v1/auth/login`
- **Auth Required**: No
- **Request**:
  ```json
  {
    "login": "john@example.com",  // email or username
    "password": "SecurePassword123"
  }
  ```
- **Response**: User profile + access_token + refresh_token
- **Status Codes**: 200 (OK), 401 (Invalid Credentials)

### 3. Refresh Token
- **POST** `/api/v1/auth/refresh`
- **Auth Required**: Yes (Refresh Token)
- **Request**:
  ```json
  {
    "refresh_token": "eyJhbGc..."
  }
  ```
- **Response**: New access_token + refresh_token
- **Status Codes**: 200 (OK), 401 (Invalid Token)

### 4. Logout
- **POST** `/api/v1/auth/logout`
- **Auth Required**: Yes
- **Response**: Success message
- **Status Codes**: 200 (OK)
- **Note**: Stateless (client clears tokens)

---

## 💰 Accounts (6 endpoints)

### 1. List Accounts
- **GET** `/api/v1/accounts`
- **Auth Required**: Yes
- **Query Params**: 
  - `keyword` (string, optional) - Search in names
- **Response**: Array of accounts with balances
- **Meta**: `max_personal_id` for caching
- **Status Codes**: 200 (OK)

### 2. Create Account
- **POST** `/api/v1/accounts`
- **Auth Required**: Yes
- **Request**:
  ```json
  {
    "personal_id": 1,
    "name": "My Wallet",
    "icon": "💵",
    "color": "#4caf50",
    "account_type": "CASH",
    "usability": "ACTIVE",
    "initial_amount": 100000,
    "group_id": "uuid" // optional
  }
  ```
- **Status Codes**: 201 (Created), 400 (Validation), 409 (Duplicate)

### 3. Get Account
- **GET** `/api/v1/accounts/:id`
- **Auth Required**: Yes
- **Response**: Account with calculated balance
- **Status Codes**: 200 (OK), 404 (Not Found)

### 4. Update Account
- **PUT** `/api/v1/accounts/:id`
- **Auth Required**: Yes
- **Request**: Partial account fields
- **Status Codes**: 200 (OK), 404 (Not Found), 400 (Validation)

### 5. Delete Account
- **DELETE** `/api/v1/accounts/:id`
- **Auth Required**: Yes
- **Status Codes**: 200 (OK), 404 (Not Found), 400 (Has Transactions)

### 6. Swap Account Order
- **PUT** `/api/v1/accounts/swap-order`
- **Auth Required**: Yes
- **Request**:
  ```json
  {
    "order_map": [
      {"id": "uuid", "personal_id": 1},
      {"id": "uuid", "personal_id": 2}
    ]
  }
  ```
- **Status Codes**: 200 (OK), 400 (Invalid Order)

---

## 📂 Categories (7 endpoints)

### 1. List Categories
- **GET** `/api/v1/categories`
- **Auth Required**: Yes
- **Query Params**: 
  - `keyword` (string, optional)
- **Response**: Array of categories (flat list)
- **Meta**: `max_personal_id`
- **Status Codes**: 200 (OK)

### 2. Create Category
- **POST** `/api/v1/categories`
- **Auth Required**: Yes
- **Request**:
  ```json
  {
    "personal_id": 1,
    "name": "Food & Drinks",
    "icon": "🍔",
    "color": "#ff5722",
    "nature": "NEED",
    "parent_id": null, // optional
    "is_active": true
  }
  ```
- **Status Codes**: 201 (Created), 400 (Validation), 409 (Duplicate)
- **Validation**: Prevents circular parent references

### 3. Get Category
- **GET** `/api/v1/categories/:id`
- **Auth Required**: Yes
- **Response**: Single category
- **Status Codes**: 200 (OK), 404 (Not Found)

### 4. Update Category
- **PUT** `/api/v1/categories/:id`
- **Auth Required**: Yes
- **Request**: Partial category fields
- **Status Codes**: 200 (OK), 404 (Not Found), 400 (Circular Reference)

### 5. Delete Category
- **DELETE** `/api/v1/categories/:id`
- **Auth Required**: Yes
- **Status Codes**: 200 (OK), 404 (Not Found), 400 (Has Children/Transactions)

### 6. Get Category Tree
- **GET** `/api/v1/categories/tree`
- **Auth Required**: Yes
- **Response**: Hierarchical nested structure
- **Status Codes**: 200 (OK)

### 7. Swap Category Order
- **PUT** `/api/v1/categories/swap-order`
- **Auth Required**: Yes
- **Request**: Same as accounts swap-order
- **Status Codes**: 200 (OK), 400 (Invalid Order)

---

## 📝 Transactions (6 endpoints)

### 1. List Transactions
- **GET** `/api/v1/transactions`
- **Auth Required**: Yes
- **Query Params**:
  - `account_id` (string)
  - `category_id` (string)
  - `type` (INCOME | EXPENSE)
  - `start_date` (YYYY-MM-DD)
  - `end_date` (YYYY-MM-DD)
  - `min_amount` (number)
  - `max_amount` (number)
  - `keyword` (string) - Search in notes
  - `limit` (number, default: 100)
  - `offset` (number, default: 0)
- **Response**: Array with account/category details
- **Meta**: `max_personal_id`, `total`, `limit`, `offset`
- **Status Codes**: 200 (OK)

### 2. Create Transaction
- **POST** `/api/v1/transactions`
- **Auth Required**: Yes
- **Request**:
  ```json
  {
    "personal_id": 1,
    "date": "2025-11-07",
    "account_id": "uuid",
    "category_id": "uuid",
    "amount": 50000,  // positive = INCOME, negative = EXPENSE
    "note": "Lunch",  // optional
    "transfer_id": null,  // optional
    "debt_id": null  // optional
  }
  ```
- **Amount Logic**: 
  - `amount > 0` → type = INCOME
  - `amount < 0` → type = EXPENSE (stores as positive)
  - `amount = 0` → Error
- **Status Codes**: 201 (Created), 400 (Validation), 404 (Account/Category Not Found)

### 3. Get Transaction
- **GET** `/api/v1/transactions/:id`
- **Auth Required**: Yes
- **Response**: Transaction with account/category details
- **Status Codes**: 200 (OK), 404 (Not Found)

### 4. Update Transaction
- **PUT** `/api/v1/transactions/:id`
- **Auth Required**: Yes
- **Request**: Partial transaction fields
- **Status Codes**: 200 (OK), 404 (Not Found), 400 (Validation)

### 5. Delete Transaction
- **DELETE** `/api/v1/transactions/:id`
- **Auth Required**: Yes
- **Status Codes**: 200 (OK), 404 (Not Found), 400 (Part of Transfer)

### 6. Get Transaction Summary
- **GET** `/api/v1/transactions/summary`
- **Auth Required**: Yes
- **Query Params**: 
  - `start_date` (YYYY-MM-DD, optional)
  - `end_date` (YYYY-MM-DD, optional)
- **Response**:
  ```json
  {
    "total_income": 1000000,
    "total_expense": 500000,
    "net_balance": 500000,
    "transaction_count": 25,
    "by_category": [...],
    "by_account": [...]
  }
  ```
- **Status Codes**: 200 (OK)

---

## 🔄 Transfers (5 endpoints)

### 1. List Transfers
- **GET** `/api/v1/transfers`
- **Auth Required**: Yes
- **Query Params**:
  - `from_account_id` (string)
  - `to_account_id` (string)
  - `start_date` (YYYY-MM-DD)
  - `end_date` (YYYY-MM-DD)
  - `min_amount` (number)
  - `max_amount` (number)
  - `keyword` (string)
  - `limit` (number, default: 100)
  - `offset` (number, default: 0)
- **Response**: Array with account details
- **Meta**: `max_personal_id`
- **Status Codes**: 200 (OK)

### 2. Create Transfer
- **POST** `/api/v1/transfers`
- **Auth Required**: Yes
- **Request**:
  ```json
  {
    "personal_id": 1,
    "date": "2025-11-07",
    "from_account_id": "uuid",
    "to_account_id": "uuid",
    "amount": 100000,
    "note": "Monthly savings"
  }
  ```
- **What Happens**: Creates 1 transfer + 2 transactions (EXPENSE + INCOME)
- **Status Codes**: 201 (Created), 400 (Validation), 404 (Account Not Found)

### 3. Get Transfer
- **GET** `/api/v1/transfers/:id`
- **Auth Required**: Yes
- **Response**: Transfer with linked transactions
- **Status Codes**: 200 (OK), 404 (Not Found)

### 4. Update Transfer
- **PUT** `/api/v1/transfers/:id`
- **Auth Required**: Yes
- **Request**: Partial transfer fields
- **What Happens**: Updates transfer + both linked transactions
- **Status Codes**: 200 (OK), 404 (Not Found), 400 (Validation)

### 5. Delete Transfer
- **DELETE** `/api/v1/transfers/:id`
- **Auth Required**: Yes
- **What Happens**: Deletes transfer + both linked transactions (atomic)
- **Status Codes**: 200 (OK), 404 (Not Found)

---

## 📁 Groups (5 endpoints)

### 1. List Groups
- **GET** `/api/v1/groups`
- **Auth Required**: Yes
- **Query Params**: 
  - `keyword` (string, optional)
- **Response**: Array with account counts
- **Meta**: `max_personal_id`
- **Status Codes**: 200 (OK)

### 2. Create Group
- **POST** `/api/v1/groups`
- **Auth Required**: Yes
- **Request**:
  ```json
  {
    "personal_id": 1,
    "name": "Cash Accounts"
  }
  ```
- **Status Codes**: 201 (Created), 400 (Validation), 409 (Duplicate)

### 3. Get Group
- **GET** `/api/v1/groups/:id`
- **Auth Required**: Yes
- **Response**: Group with list of accounts
- **Status Codes**: 200 (OK), 404 (Not Found)

### 4. Update Group
- **PUT** `/api/v1/groups/:id`
- **Auth Required**: Yes
- **Request**:
  ```json
  {
    "name": "Updated Name"
  }
  ```
- **Status Codes**: 200 (OK), 404 (Not Found), 400 (Empty Name)

### 5. Delete Group
- **DELETE** `/api/v1/groups/:id`
- **Auth Required**: Yes
- **Status Codes**: 200 (OK), 404 (Not Found), 400 (Has Accounts)

---

## 💳 Debts (5 endpoints)

### 1. List Debts
- **GET** `/api/v1/debts`
- **Auth Required**: Yes
- **Query Params**:
  - `account_id` (string)
  - `type` (PAYABLE | RECEIVABLE)
  - `keyword` (string)
- **Response**: Array with calculated balances
- **Meta**: `max_personal_id`
- **Status Codes**: 200 (OK)

### 2. Create Debt
- **POST** `/api/v1/debts`
- **Auth Required**: Yes
- **Request**:
  ```json
  {
    "personal_id": 1,
    "account_id": "uuid",
    "name": "John Doe",
    "type": "PAYABLE"  // or RECEIVABLE
  }
  ```
- **Types**:
  - **PAYABLE**: Money you owe
  - **RECEIVABLE**: Money owed to you
- **Status Codes**: 201 (Created), 400 (Validation), 404 (Account Not Found)

### 3. Get Debt
- **GET** `/api/v1/debts/:id`
- **Auth Required**: Yes
- **Response**: Debt with linked transactions and balance
- **Status Codes**: 200 (OK), 404 (Not Found)

### 4. Update Debt
- **PUT** `/api/v1/debts/:id`
- **Auth Required**: Yes
- **Request**: Partial debt fields
- **Status Codes**: 200 (OK), 404 (Not Found), 400 (Validation)

### 5. Delete Debt
- **DELETE** `/api/v1/debts/:id`
- **Auth Required**: Yes
- **Status Codes**: 200 (OK), 404 (Not Found), 400 (Has Transactions)

---

## 🔑 Authentication Flow

### Initial Authentication
```
1. POST /api/v1/auth/register or /api/v1/auth/login
   ↓
2. Receive access_token (24h) + refresh_token (7d)
   ↓
3. Store both tokens in localStorage
   ↓
4. Use access_token in Authorization header:
   Authorization: Bearer <access_token>
```

### Token Refresh
```
1. API returns 401 (token expired)
   ↓
2. POST /api/v1/auth/refresh with refresh_token
   ↓
3. Receive new access_token + refresh_token
   ↓
4. Update stored tokens
   ↓
5. Retry original request with new token
```

### Auto-Refresh (Implemented in apiService)
The API service automatically handles token refresh when receiving 401 errors.

---

## 📊 Data Relationships

```
users
├── accounts
│   ├── groups (optional)
│   ├── transactions
│   ├── transfers (from/to)
│   └── debts
├── categories
│   ├── parent_id → categories (self-reference)
│   └── transactions
├── transactions
│   ├── account_id → accounts
│   ├── category_id → categories
│   ├── transfer_id → transfers (optional)
│   └── debt_id → debts (optional)
├── transfers
│   ├── from_account → accounts
│   ├── to_account → accounts
│   └── transactions (2 linked)
├── groups
│   └── accounts
└── debts
    ├── account_id → accounts
    └── transactions (linked)
```

---

## 🛡️ Error Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET, PUT, DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation error, invalid data |
| 401 | Unauthorized | Missing/invalid token |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate personal_id |
| 500 | Server Error | Unexpected error |

---

## 🔄 Common Patterns

### personal_id Caching
All list endpoints return `max_personal_id` in meta:
```json
{
  "meta": {
    "max_personal_id": 5
  }
}
```

Client caches this value and uses `max_personal_id + 1` for next creation.

### Pagination
```
GET /api/v1/transactions?limit=50&offset=0  // First 50
GET /api/v1/transactions?limit=50&offset=50 // Next 50
```

### Filtering
```
// Multiple filters (AND logic)
GET /api/v1/transactions?account_id=xxx&type=INCOME&start_date=2025-01-01
```

### Keyword Search
```
// Case-insensitive partial match
GET /api/v1/accounts?keyword=cash
// Matches: "Cash", "cash wallet", "CASH ACCOUNT"
```

---

## 📝 Notes

1. **Amount Handling**: 
   - Transactions: Sign determines type (+ = INCOME, - = EXPENSE)
   - Stored as positive values with explicit type field

2. **Date Format**: Always use `YYYY-MM-DD` for dates

3. **Atomic Operations**: 
   - Transfers use database transactions
   - Either all succeed or all rollback

4. **Deletion Safety**:
   - Cannot delete accounts with transactions
   - Cannot delete categories with children/transactions
   - Cannot delete groups with accounts
   - Cannot delete transfers (must delete via transfer endpoint)
   - Cannot delete debts with transactions

5. **Balance Calculation**:
   - Accounts: `initial_amount + INCOME - EXPENSE`
   - Debts (PAYABLE): `EXPENSE - INCOME` (you owe)
   - Debts (RECEIVABLE): `INCOME - EXPENSE` (they owe)

---

## 🚀 Quick Start

```bash
# 1. Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@example.com","username":"john","password":"Pass123"}'

# 2. Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"john@example.com","password":"Pass123"}'

# 3. Use token
export TOKEN="<access_token_from_login>"

# 4. Create account
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"personal_id":1,"name":"Wallet","icon":"💵","color":"#4caf50","account_type":"CASH","usability":"ACTIVE","initial_amount":100000}'

# 5. Create transaction
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"personal_id":1,"date":"2025-11-07","account_id":"<account_id>","category_id":"<category_id>","amount":-50000,"note":"Lunch"}'
```

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-07  
**Total Endpoints**: 29
