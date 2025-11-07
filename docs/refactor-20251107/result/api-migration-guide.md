# API Migration Guide

## Overview
This project is migrating from an external Go API to a full-stack Next.js implementation with local API routes.

## Configuration Changes

### Environment Variables

The `NEXT_PUBLIC_API_BASE_URL` has been updated in all environment files:

**Before (External Go API):**
```bash
NEXT_PUBLIC_API_BASE_URL=https://finance-api-445780166095.asia-southeast2.run.app/api/v1
```

**After (Local Next.js API):**
```bash
NEXT_PUBLIC_API_BASE_URL=/api/v1
```

### Files Updated

- ✅ `.env.local` - Development environment
- ✅ `.env.development` - Development build
- ✅ `.env.production` - Production build

## How It Works

### Relative Path API Calls

By using `/api/v1` as the base URL:
- Client requests go to the same origin
- No CORS issues
- Next.js automatically routes `/api/*` to API route handlers
- Works in both development and production

### Example Flow

1. **Client makes request:**
   ```typescript
   apiService.post('/auth/login', credentials)
   ```

2. **Resolved to:**
   ```
   /api/v1/auth/login
   ```

3. **Next.js routes to:**
   ```
   app/api/v1/auth/login/route.ts
   ```

4. **Server executes:**
   - Validates credentials
   - Queries database with Prisma
   - Returns wrapped response

## Migration Progress

### ✅ Phase 0: Foundation
- Prisma setup
- Core utilities (auth, response builders)
- Type definitions

### ✅ Phase 1: Authentication (CURRENT)
- `/api/v1/auth/register` - User registration
- `/api/v1/auth/login` - User login
- `/api/v1/auth/refresh` - Token refresh
- `/api/v1/auth/logout` - User logout

### 🔄 Upcoming Phases

- Phase 2: Account Management
- Phase 3: Category Management
- Phase 5: Transaction Management
- Phase 6: Transfer Management

## Testing the Migration

### 1. Restart Development Server

After changing environment variables, restart the dev server:

```bash
# Stop current server (Ctrl+C)
# Start fresh
npm run dev
```

### 2. Verify API URL

Open browser console and check network requests:
- Should hit: `http://localhost:3000/api/v1/auth/login`
- NOT: `https://finance-api-445780166095.asia-southeast2.run.app/api/v1/auth/login`

### 3. Test Login

```javascript
// In browser console:
fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email_or_username: 'test@example.com',
    password: 'password123'
  })
})
.then(r => r.json())
.then(console.log)
```

## Rollback Instructions

If you need to temporarily switch back to the Go API:

```bash
# In .env.local, change:
NEXT_PUBLIC_API_BASE_URL=/api/v1

# To:
NEXT_PUBLIC_API_BASE_URL=https://finance-api-445780166095.asia-southeast2.run.app/api/v1

# Restart server
npm run dev
```

## Production Deployment

For production deployment:

1. **Same Server Deployment (Recommended):**
   ```bash
   # .env.production
   NEXT_PUBLIC_API_BASE_URL=/api/v1
   ```
   - Database credentials in environment variables
   - JWT secrets configured

2. **Separate API Server (If Needed):**
   ```bash
   # .env.production
   NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com/api/v1
   ```
   - Configure CORS on API server
   - Ensure JWT secrets match

## Environment Variable Reference

### Client-Side (NEXT_PUBLIC_*)
- `NEXT_PUBLIC_API_BASE_URL` - API base URL
- `NEXT_PUBLIC_APP_NAME` - Application name
- `NEXT_PUBLIC_APP_VERSION` - Application version
- `NEXT_PUBLIC_STORAGE_*` - Storage encryption keys
- `NEXT_PUBLIC_MODAL_TIMEOUT` - Modal timeout

### Server-Side Only
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Access token secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `API_VERSION` - API version for responses

## Troubleshooting

### Issue: Still hitting external API

**Solution:**
1. Check environment variable: `echo $NEXT_PUBLIC_API_BASE_URL`
2. Restart dev server completely
3. Clear browser cache/hard refresh
4. Check browser network tab for actual request URL

### Issue: CORS errors

**Cause:** Only happens if API_BASE_URL points to different origin

**Solution:** Use relative path `/api/v1` for same-origin requests

### Issue: Database connection failed

**Check:**
1. PostgreSQL is running: `psql -U postgres -h localhost -p 5432`
2. Database exists: `\l` in psql
3. DATABASE_URL is correct in `.env.local`

### Issue: JWT verification failed

**Check:**
1. JWT_SECRET matches between registration and login
2. Token hasn't expired
3. Token format in Authorization header: `Bearer <token>`

## Next Steps

1. ✅ Restart dev server to apply new environment variables
2. ✅ Test login flow with local API
3. ✅ Verify network requests go to localhost
4. 🔄 Continue to Phase 2 (Account Management)
