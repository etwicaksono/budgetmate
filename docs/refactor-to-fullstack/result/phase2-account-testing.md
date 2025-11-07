# Phase 2: Account Management Testing Guide

## Overview
This guide provides test commands and expected responses for the account management endpoints implemented in Phase 2.

## Prerequisites
- Phase 1 (Authentication) completed
- User registered and logged in
- Access token obtained from login
- Database running at `localhost:5432`
- Next.js dev server running: `npm run dev`

## Base URL
All endpoints are at: `http://localhost:3000/api/v1/accounts`

## Authentication
All endpoints require authentication. Include the access token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```

---

## 1. List Accounts

**Endpoint:** `GET /api/v1/accounts`

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/accounts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**With Search:**
```bash
curl -X GET "http://localhost:3000/api/v1/accounts?keyword=cash&limit=10&offset=0" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Accounts retrieved successfully",
  "data": [
    {
      "id": "uuid-here",
      "user_id": "user-uuid",
      "personal_id": 1,
      "name": "Cash",
      "icon": "💵",
      "active": true,
      "usability": "ACTIVE",
      "account_type": "CASH",
      "color": "#4CAF50",
      "initial_amount": 1000000,
      "balance": 1250000,
      "group_id": null,
      "position": null,
      "created_at": "2025-11-07T...",
      "updated_at": "2025-11-07T..."
    }
  ],
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999,
    "max_personal_id": 1,
    "total": 1,
    "limit": 100,
    "offset": 0
  }
}
```

**Query Parameters:**
- `keyword` - Search accounts by name (case-insensitive)
- `limit` - Number of results (default: 100)
- `offset` - Pagination offset (default: 0)

---

## 2. Create Account

**Endpoint:** `POST /api/v1/accounts`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/accounts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 2,
    "name": "Bank BCA",
    "icon": "🏦",
    "active": true,
    "usability": "ACTIVE",
    "account_type": "BANK",
    "color": "#2196F3",
    "initial_amount": 5000000,
    "group_id": null
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "id": "new-uuid",
    "user_id": "user-uuid",
    "personal_id": 2,
    "name": "Bank BCA",
    "icon": "🏦",
    "active": true,
    "usability": "ACTIVE",
    "account_type": "BANK",
    "color": "#2196F3",
    "initial_amount": 5000000,
    "balance": 5000000,
    "group_id": null,
    "position": null,
    "created_at": "2025-11-07T...",
    "updated_at": "2025-11-07T..."
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**Required Fields:**
- `personal_id` - Integer (from cache, incremental)
- `name` - String (max 36 chars)
- `icon` - String (emoji or icon name)
- `account_type` - String (CASH, BANK, E_WALLET, etc.)
- `color` - String (hex color code)

**Optional Fields:**
- `active` - Boolean (default: true)
- `usability` - String (default: "ACTIVE")
- `initial_amount` - Float (default: 0)
- `group_id` - String (account group UUID)

**Error Cases:**
- `400`: Missing required fields
- `409`: Duplicate personal_id for this user

---

## 3. Get Account Detail

**Endpoint:** `GET /api/v1/accounts/:id`

**Request:**
```bash
curl -X GET http://localhost:3000/api/v1/accounts/ACCOUNT_UUID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Account retrieved successfully",
  "data": {
    "id": "uuid-here",
    "user_id": "user-uuid",
    "personal_id": 1,
    "name": "Cash",
    "icon": "💵",
    "active": true,
    "usability": "ACTIVE",
    "account_type": "CASH",
    "color": "#4CAF50",
    "initial_amount": 1000000,
    "balance": 1250000,
    "group_id": null,
    "position": null,
    "created_at": "2025-11-07T...",
    "updated_at": "2025-11-07T..."
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**Error Cases:**
- `404`: Account not found or doesn't belong to user

---

## 4. Update Account

**Endpoint:** `PUT /api/v1/accounts/:id`

**Request:**
```bash
curl -X PUT http://localhost:3000/api/v1/accounts/ACCOUNT_UUID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Cash IDR",
    "color": "#8BC34A",
    "initial_amount": 1500000
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Account updated successfully",
  "data": {
    "id": "uuid-here",
    "user_id": "user-uuid",
    "personal_id": 1,
    "name": "Cash IDR",
    "icon": "💵",
    "active": true,
    "usability": "ACTIVE",
    "account_type": "CASH",
    "color": "#8BC34A",
    "initial_amount": 1500000,
    "balance": 1750000,
    "group_id": null,
    "position": null,
    "created_at": "2025-11-07T...",
    "updated_at": "2025-11-07T..."
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**Updatable Fields:**
- `name`, `icon`, `active`, `usability`
- `account_type`, `color`
- `initial_amount`, `group_id`

**Note:** `personal_id` cannot be updated directly (use swap-order)

**Error Cases:**
- `404`: Account not found or doesn't belong to user

---

## 5. Delete Account

**Endpoint:** `DELETE /api/v1/accounts/:id`

**Request:**
```bash
curl -X DELETE http://localhost:3000/api/v1/accounts/ACCOUNT_UUID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": null,
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**Error Cases:**
- `404`: Account not found or doesn't belong to user
- `400`: Cannot delete account with existing transactions

---

## 6. Swap Account Order

**Endpoint:** `PUT /api/v1/accounts/swap-order`

**Request:**
```bash
curl -X PUT http://localhost:3000/api/v1/accounts/swap-order \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "order_map": [
      { "id": "account-uuid-1", "personal_id": 1 },
      { "id": "account-uuid-2", "personal_id": 2 },
      { "id": "account-uuid-3", "personal_id": 3 }
    ]
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Accounts reordered successfully",
  "data": {
    "updated_count": 3
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**How It Works:**
1. Send all accounts with their new personal_id order
2. Server uses two-phase update to avoid unique constraint violations
3. Phase 1: Set temporary negative values
4. Phase 2: Set final positive values

**Error Cases:**
- `400`: Invalid order_map format
- `404`: One or more accounts not found

---

## Testing Checklist

### Create Scenarios
- [ ] Create account with all required fields
- [ ] Create account with optional fields
- [ ] Create account with duplicate personal_id (should fail 409)
- [ ] Create account without authentication (should fail 401)
- [ ] Create account with invalid data types (should fail 400)

### Read Scenarios
- [ ] List all accounts (empty state)
- [ ] List all accounts (with data)
- [ ] Search accounts by keyword
- [ ] Get account detail by ID
- [ ] Get non-existent account (should fail 404)
- [ ] Get another user's account (should fail 404)

### Update Scenarios
- [ ] Update account name
- [ ] Update account color and icon
- [ ] Update initial_amount
- [ ] Update account active status
- [ ] Update non-existent account (should fail 404)

### Delete Scenarios
- [ ] Delete account without transactions
- [ ] Delete account with transactions (should fail 400)
- [ ] Delete non-existent account (should fail 404)

### Reorder Scenarios
- [ ] Swap order of 2 accounts
- [ ] Reorder multiple accounts (3+)
- [ ] Verify no unique constraint violations
- [ ] Verify all accounts updated

### Balance Calculation
- [ ] Verify balance includes initial_amount
- [ ] Verify balance includes income transactions
- [ ] Verify balance excludes expense transactions
- [ ] Verify balance calculation is accurate

---

## personal_id Caching Strategy

The client should cache `max_account_personal_id` for creating new accounts:

### On Fetch Accounts:
```javascript
const accounts = await accountService.fetchAccounts();
// Service automatically updates localStorage: 'max_account_personal_id'
```

### On Create Account:
```javascript
const nextId = accountService.getNextPersonalId(); // Gets cached value + 1

await accountService.createAccount({
  personal_id: nextId,
  name: "New Account",
  // ... other fields
});
```

### Cache Storage:
- **Key:** `max_account_personal_id`
- **Location:** `localStorage`
- **Updated:** After every `fetchAccounts()` and `createAccount()`

---

## Integration with Client

The `accountService.ts` has been updated for the new API:

```typescript
// List accounts
const accounts = await accountService.fetchAccounts();

// Create account
const newAccount = await accountService.createAccount({
  personal_id: accountService.getNextPersonalId(),
  name: "Cash",
  icon: "💵",
  account_type: "CASH",
  color: "#4CAF50",
  active: true,
  usability: "ACTIVE",
  initial_amount: 0,
  group_id: null,
});

// Update account
const updated = await accountService.updateAccount(accountId, {
  name: "Updated Name",
  color: "#FF5722",
});

// Delete account
await accountService.deleteAccount(accountId);

// Swap order
await accountService.swapAccountOrder({
  order_map: [
    { id: "uuid-1", personal_id: 1 },
    { id: "uuid-2", personal_id: 2 },
  ],
});
```

---

## Database Schema Reference

```sql
CREATE TABLE accounts (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  personal_id BIGINT NOT NULL,
  name VARCHAR(36) NOT NULL,
  icon VARCHAR(36) NOT NULL,
  active BOOLEAN DEFAULT true,
  usability VARCHAR(32),
  account_type VARCHAR(32),
  color VARCHAR(255),
  initial_amount FLOAT,
  group_id VARCHAR(36),
  position JSON,
  created_at DATE NOT NULL,
  updated_at DATE,
  UNIQUE(user_id, personal_id)
);
```

**Key Points:**
- `personal_id` is unique per user (not globally)
- `position` is nullable (for future Google Sheets sync)
- `balance` is calculated, not stored

---

## Troubleshooting

### Issue: Unique constraint violation on personal_id

**Cause:** Client sent duplicate personal_id

**Solution:**
1. Clear cache: `localStorage.removeItem('max_account_personal_id')`
2. Fetch accounts to rebuild cache
3. Try creating again

### Issue: Balance calculation incorrect

**Cause:** Transactions not properly linked

**Solution:**
1. Verify transaction `account_id` matches account `id`
2. Check transaction `type` (INCOME vs EXPENSE)
3. Verify `initial_amount` is set correctly

### Issue: Swap order fails with unique constraint

**Cause:** Server error or database issue

**Solution:**
1. Check server logs for detailed error
2. Verify all account IDs belong to user
3. Ensure transaction is properly wrapped

---

## Next Steps

After Phase 2 is complete:
1. ✅ Test all account endpoints
2. ✅ Verify client integration
3. ✅ Test UI account management features
4. 🔄 Proceed to Phase 3: Category Management
