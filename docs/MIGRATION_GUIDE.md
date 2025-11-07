# Migration Guide: External API → Full-Stack Next.js

## 📋 Overview

This guide helps migrate from the external Go API to the new full-stack Next.js implementation.

**Old System**: Next.js frontend → External Go API (separate server)  
**New System**: Next.js full-stack → Internal API routes → PostgreSQL

---

## 🎯 Key Changes

### 1. API Base URL
```javascript
// OLD
const API_BASE_URL = 'http://external-api-server.com/api'

// NEW
const API_BASE_URL = '/api/v1'  // Same Next.js server
```

### 2. Response Format
```javascript
// OLD (Direct data)
{
  "id": "123",
  "name": "Account"
}

// NEW (Wrapped response)
{
  "success": true,
  "message": "Success message",
  "data": {
    "id": "123",
    "name": "Account"
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

### 3. Authentication
```javascript
// OLD (Single token)
localStorage.setItem('token', accessToken)

// NEW (Dual tokens)
localStorage.setItem('access_token', accessToken)    // 24h
localStorage.setItem('refresh_token', refreshToken)  // 7d
```

### 4. Transaction Amount Logic
```javascript
// OLD (Always positive with separate type field)
{
  "amount": 50000,
  "type": "EXPENSE"
}

// NEW (Sign determines type)
{
  "amount": -50000  // Negative = EXPENSE
  // Type calculated automatically: < 0 = EXPENSE, > 0 = INCOME
}
```

---

## 🔄 API Endpoint Mapping

### Authentication

| Old Endpoint | New Endpoint | Changes |
|-------------|-------------|---------|
| `POST /auth/register` | `POST /api/v1/auth/register` | Returns dual tokens |
| `POST /auth/login` | `POST /api/v1/auth/login` | Returns dual tokens |
| `POST /auth/refresh` | `POST /api/v1/auth/refresh` | New endpoint |
| `POST /auth/logout` | `POST /api/v1/auth/logout` | Stateless |

### Accounts

| Old Endpoint | New Endpoint | Changes |
|-------------|-------------|---------|
| `GET /accounts` | `GET /api/v1/accounts` | Wrapped response, returns balance |
| `POST /accounts` | `POST /api/v1/accounts` | Client provides personal_id |
| `GET /accounts/:id` | `GET /api/v1/accounts/:id` | Returns calculated balance |
| `PUT /accounts/:id` | `PUT /api/v1/accounts/:id` | No change |
| `DELETE /accounts/:id` | `DELETE /api/v1/accounts/:id` | No change |
| `PUT /accounts/reorder` | `PUT /api/v1/accounts/swap-order` | Renamed |

### Categories

| Old Endpoint | New Endpoint | Changes |
|-------------|-------------|---------|
| `GET /categories` | `GET /api/v1/categories` | Wrapped response |
| `POST /categories` | `POST /api/v1/categories` | Client provides personal_id |
| `GET /categories/:id` | `GET /api/v1/categories/:id` | No change |
| `PUT /categories/:id` | `PUT /api/v1/categories/:id` | Circular reference prevention |
| `DELETE /categories/:id` | `DELETE /api/v1/categories/:id` | No change |
| `GET /categories/hierarchy` | `GET /api/v1/categories/tree` | Renamed |
| `PUT /categories/reorder` | `PUT /api/v1/categories/swap-order` | Renamed |

### Transactions

| Old Endpoint | New Endpoint | Changes |
|-------------|-------------|---------|
| `GET /transactions` | `GET /api/v1/transactions` | More filters, wrapped response |
| `POST /transactions` | `POST /api/v1/transactions` | Amount sign logic, no type field |
| `GET /transactions/:id` | `GET /api/v1/transactions/:id` | Includes account/category details |
| `PUT /transactions/:id` | `PUT /api/v1/transactions/:id` | Amount sign logic |
| `DELETE /transactions/:id` | `DELETE /api/v1/transactions/:id` | No change |
| `GET /transactions/stats` | `GET /api/v1/transactions/summary` | Renamed, enhanced |

### Transfers

| Old Endpoint | New Endpoint | Changes |
|-------------|-------------|---------|
| `GET /transfers` | `GET /api/v1/transfers` | Wrapped response |
| `POST /transfers` | `POST /api/v1/transfers` | Auto-creates 2 transactions |
| `GET /transfers/:id` | `GET /api/v1/transfers/:id` | Includes linked transactions |
| `PUT /transfers/:id` | `PUT /api/v1/transfers/:id` | Updates linked transactions |
| `DELETE /transfers/:id` | `DELETE /api/v1/transfers/:id` | Deletes linked transactions |

### Groups (New Feature)

| Old Endpoint | New Endpoint | Changes |
|-------------|-------------|---------|
| N/A | `GET /api/v1/groups` | **New feature** |
| N/A | `POST /api/v1/groups` | **New feature** |
| N/A | `GET /api/v1/groups/:id` | **New feature** |
| N/A | `PUT /api/v1/groups/:id` | **New feature** |
| N/A | `DELETE /api/v1/groups/:id` | **New feature** |

### Debts (New Feature)

| Old Endpoint | New Endpoint | Changes |
|-------------|-------------|---------|
| N/A | `GET /api/v1/debts` | **New feature** |
| N/A | `POST /api/v1/debts` | **New feature** |
| N/A | `GET /api/v1/debts/:id` | **New feature** |
| N/A | `PUT /api/v1/debts/:id` | **New feature** |
| N/A | `DELETE /api/v1/debts/:id` | **New feature** |

---

## 🔧 Code Migration

### 1. Update API Service

**File**: `src/services/api.ts`

```typescript
// OLD
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

// NEW
const API_BASE_URL = '/api/v1'

// Response unwrapping (already implemented)
async request<T>(endpoint: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, options)
  const jsonData = await response.json()
  
  // Unwrap if response is wrapped
  if (jsonData.success !== undefined && jsonData.data !== undefined) {
    if (!jsonData.success) throw new Error(jsonData.message)
    return jsonData.data  // Return unwrapped data
  }
  
  return jsonData
}
```

### 2. Update Authentication

**File**: `src/contexts/AuthContext.tsx` or similar

```typescript
// OLD
const login = async (credentials) => {
  const { token, user } = await api.post('/auth/login', credentials)
  localStorage.setItem('token', token)
  setUser(user)
}

// NEW
const login = async (credentials) => {
  const { access_token, refresh_token, user } = await api.post('/auth/login', credentials)
  localStorage.setItem('access_token', access_token)
  localStorage.setItem('refresh_token', refresh_token)
  setUser(user)
}
```

### 3. Update Transaction Creation

**File**: `src/services/transactionService.ts`

```typescript
// OLD
const createTransaction = async (data) => {
  return api.post('/transactions', {
    ...data,
    amount: Math.abs(data.amount),  // Always positive
    type: data.amount >= 0 ? 'INCOME' : 'EXPENSE'
  })
}

// NEW
const createTransaction = async (data) => {
  return api.post('/transactions', {
    ...data,
    amount: data.amount  // Keep sign: + = INCOME, - = EXPENSE
    // No type field needed
  })
}
```

### 4. Update Account Service

```typescript
// OLD
const fetchAccounts = async () => {
  return api.get('/accounts')  // Returns array directly
}

// NEW  
const fetchAccounts = async () => {
  const accounts = await api.get('/accounts')  // Already unwrapped by api service
  
  // Cache personal_id
  if (accounts.length > 0) {
    const maxId = Math.max(...accounts.map(a => a.personal_id))
    localStorage.setItem('max_account_personal_id', maxId.toString())
  }
  
  return accounts
}
```

### 5. Add Personal ID Helper

**File**: `src/services/accountService.ts` (and similar for other services)

```typescript
// NEW - Add to service
export const getNextPersonalId = (): number => {
  const cached = localStorage.getItem('max_account_personal_id')
  if (cached) {
    const maxId = parseInt(cached, 10)
    const nextId = maxId + 1
    localStorage.setItem('max_account_personal_id', nextId.toString())
    return nextId
  }
  return 1
}

// Use when creating
const createAccount = async (data) => {
  if (!data.personal_id) {
    data.personal_id = getNextPersonalId()
  }
  return api.post('/accounts', data)
}
```

---

## 📝 Environment Variables

### Update `.env.local`

```bash
# OLD
NEXT_PUBLIC_API_URL=http://external-api-server.com/api

# NEW (Remove external API URL)
# API is now internal at /api/v1

# Add database connection
DATABASE_URL=postgresql://user:password@localhost:5432/financeapi

# Add JWT secrets
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# API version
API_VERSION=v1.0.0
```

---

## 🗄️ Database Migration

### No Changes Needed!
The new API uses the **same PostgreSQL database** as the old Go API.

**Schema**: Already compatible  
**Data**: No migration needed  
**Connection**: Update DATABASE_URL in `.env.local`

---

## ✅ Testing Migration

### 1. Test Authentication
```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","username":"test","password":"Test123"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"test@example.com","password":"Test123"}'

# ✅ Should return access_token + refresh_token
```

### 2. Test Accounts
```bash
export TOKEN="<access_token>"

curl -X GET http://localhost:3000/api/v1/accounts \
  -H "Authorization: Bearer $TOKEN"

# ✅ Should return wrapped response with accounts array
```

### 3. Test Transactions
```bash
# Create transaction (negative amount = EXPENSE)
curl -X POST http://localhost:3000/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "personal_id": 1,
    "date": "2025-11-07",
    "account_id": "<account_id>",
    "category_id": "<category_id>",
    "amount": -50000,
    "note": "Test expense"
  }'

# ✅ Should create EXPENSE transaction
```

### 4. Test New Features
```bash
# Test Groups (new feature)
curl -X POST http://localhost:3000/api/v1/groups \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"personal_id": 1, "name": "My Group"}'

# ✅ Should create group

# Test Debts (new feature)
curl -X POST http://localhost:3000/api/v1/debts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"personal_id": 1, "account_id": "<account_id>", "name": "John Doe", "type": "PAYABLE"}'

# ✅ Should create debt
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Update all API calls to use `/api/v1`
- [ ] Update authentication to use dual tokens
- [ ] Update transaction creation to use amount sign
- [ ] Add personal_id caching helpers
- [ ] Test all critical flows
- [ ] Update environment variables

### During Deployment
- [ ] Deploy Next.js app to hosting (Vercel, etc.)
- [ ] Ensure DATABASE_URL is set
- [ ] Ensure JWT secrets are set
- [ ] Test in production environment

### Post-Deployment
- [ ] Verify authentication works
- [ ] Verify data is loading correctly
- [ ] Check browser console for errors
- [ ] Test creating/updating records
- [ ] Monitor error logs

---

## 🆘 Troubleshooting

### Issue: 401 Unauthorized
**Cause**: Token not being sent or invalid  
**Fix**: Check Authorization header format: `Bearer <token>`

### Issue: Empty responses
**Cause**: Response unwrapping not working  
**Fix**: Check API service unwraps `{success, data}` format

### Issue: "Amount cannot be 0" error
**Cause**: Transaction amount is 0  
**Fix**: Ensure amount is non-zero (positive or negative)

### Issue: "personal_id already exists"
**Cause**: Cached personal_id is outdated  
**Fix**: Clear localStorage or fetch fresh max_personal_id

### Issue: Categories not showing
**Cause**: Response format mismatch  
**Fix**: Check that `ChildCategorySelect` uses API data directly

### Issue: 500 Internal Server Error
**Cause**: Database connection or server error  
**Fix**: Check DATABASE_URL and server logs

---

## 📊 Feature Comparison

| Feature | Old System | New System | Status |
|---------|-----------|-----------|--------|
| Authentication | Single token | Dual tokens (access + refresh) | ✅ Enhanced |
| Accounts | CRUD | CRUD + Balance calculation | ✅ Enhanced |
| Categories | CRUD + Hierarchy | CRUD + Hierarchy + Circular prevention | ✅ Enhanced |
| Transactions | CRUD | CRUD + Advanced filters + Summary | ✅ Enhanced |
| Transfers | CRUD | CRUD + Auto transaction creation | ✅ Enhanced |
| Groups | N/A | Full CRUD | ✅ **New** |
| Debts | N/A | Full CRUD with balance tracking | ✅ **New** |
| Response Format | Raw | Wrapped (standardized) | ✅ Enhanced |
| Error Handling | Mixed | Consistent | ✅ Enhanced |
| personal_id | Server-generated | Client-cached | ✅ Changed |

---

## 🎯 Migration Steps (Summary)

1. **Update Environment Variables** (`.env.local`)
2. **Update API Base URL** (`/api/v1`)
3. **Update Authentication** (dual tokens)
4. **Update Transaction Logic** (amount sign)
5. **Add personal_id Caching** (all services)
6. **Test Thoroughly** (all features)
7. **Deploy** (with database connection)
8. **Monitor** (check logs and errors)

---

## 📞 Support

**Documentation**: See `/docs` folder  
**API Reference**: `API_COMPLETE_REFERENCE.md`  
**Testing**: `TESTING_GUIDE.md`

---

**Migration Version**: 1.0.0  
**Last Updated**: 2025-11-07  
**Status**: Complete ✅
