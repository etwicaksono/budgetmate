# Phase 1: Authentication Testing Guide

## Overview
This guide provides test commands and expected responses for the authentication endpoints implemented in Phase 1.

## Prerequisites
- Database is running and accessible at `localhost:5432`
- Next.js dev server is running: `npm run dev`
- All endpoints are at: `http://localhost:3000/api/v1/auth/`

## Testing Endpoints

### 1. Register New User

**Endpoint:** `POST /api/v1/auth/register`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'
```

**Expected Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-here",
      "email": "test@example.com",
      "username": "testuser",
      "created_at": "2025-11-07T...",
      "updated_at": "2025-11-07T..."
    }
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**Error Cases:**
- `400`: Missing fields, invalid email format, short password
- `409`: Email already registered or username already taken

---

### 2. Login with Email

**Endpoint:** `POST /api/v1/auth/login`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email_or_username": "test@example.com",
    "password": "password123"
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-here",
      "email": "test@example.com",
      "username": "testuser",
      "created_at": "2025-11-07T...",
      "updated_at": "2025-11-07T..."
    }
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

---

### 3. Login with Username

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email_or_username": "testuser",
    "password": "password123"
  }'
```

**Response:** Same as email login (200)

**Error Cases:**
- `400`: Missing credentials
- `401`: Invalid email/username or password

---

### 4. Refresh Token

**Endpoint:** `POST /api/v1/auth/refresh`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expired_at": "2025-11-08T...",
    "refreshable_until": "2025-11-14T..."
  },
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**Error Cases:**
- `400`: Missing refresh token
- `401`: Invalid or expired refresh token

---

### 5. Logout

**Endpoint:** `POST /api/v1/auth/logout`

**Request:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Expected Response (200):**
```json
{
  "success": true,
  "message": "Logout successful",
  "data": null,
  "meta": {
    "version": "v1.0.0",
    "timestamp": 1699999999
  }
}
```

**Error Cases:**
- `401`: Missing or invalid access token

---

## Testing Checklist

- [ ] Register new user with valid data
- [ ] Register with duplicate email (should fail with 409)
- [ ] Register with duplicate username (should fail with 409)
- [ ] Register with invalid email format (should fail with 400)
- [ ] Register with short password (should fail with 400)
- [ ] Login with email
- [ ] Login with username
- [ ] Login with wrong password (should fail with 401)
- [ ] Login with non-existent user (should fail with 401)
- [ ] Refresh token with valid refresh_token
- [ ] Refresh token with expired token (should fail with 401)
- [ ] Logout with valid access token
- [ ] Logout without token (should fail with 401)
- [ ] Access protected endpoint with valid token
- [ ] Access protected endpoint without token (should fail with 401)

---

## Client-Side Integration

The `authService.ts` has been updated to work with the new API:

```typescript
// Login
const response = await authService.login({
  email_or_username: 'test@example.com',
  password: 'password123'
});

// Register
const response = await authService.register({
  email: 'test@example.com',
  username: 'testuser',
  password: 'password123'
});

// Logout
await authService.logout();
```

The response unwrapping is handled automatically by the API service.

---

## Token Information

### Access Token
- **Expiration:** 24 hours
- **Algorithm:** HS256
- **Payload:** `{ user_id, email, username, iat, exp }`
- **Usage:** Include in `Authorization: Bearer <token>` header

### Refresh Token
- **Expiration:** 7 days
- **Algorithm:** HS256
- **Payload:** `{ user_id, email, username, iat, exp }`
- **Usage:** Send in request body to `/auth/refresh`

---

## Environment Variables

Ensure these are set in `.env.local`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/financeapi?schema=public"
JWT_SECRET="/oXA3F1Fc3Rq1RTScIenY/l0Tu3NWuki1yvsgVR+xqE="
JWT_REFRESH_SECRET="q2FKl6/uQhCmY3JLITgX8sD2fmGYc6/cFR6Dnpbzmj4="
API_VERSION="v1.0.0"
```

---

## Next Steps

After verifying all auth endpoints work:
1. Test the client-side integration in the React app
2. Proceed to Phase 2: Account Management
3. Update any components that use authentication

---

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
psql -U postgres -h localhost -p 5432 -d financeapi

# Regenerate Prisma Client if needed
npx prisma generate
```

### Token Verification Issues
- Check JWT_SECRET matches in .env.local
- Verify token hasn't expired
- Check Authorization header format: `Bearer <token>`

### CORS Issues (if calling from different origin)
- The API is same-origin, so CORS shouldn't be an issue
- If needed, add CORS headers in route handlers
