# Comprehensive Conflicts Analysis - Documentation Review

## Executive Summary

After analyzing all 8 documentation files, I've identified **10 critical conflicts** that must be resolved before implementation. These conflicts span response formats, authentication, API structure, field requirements, and caching strategies.

**Files Analyzed:**
1. API_IMPLEMENTATION_GUIDE.md
2. DATABASE_SCHEMA_GUIDE.md
3. database.ts
4. httpClient.ts
5. READ_ME_FIRST.txt
6. route.ts
7. SCHEMA_UPDATE_SUMMARY.txt
8. transactionService.updated.ts

---

## Conflict 1: Response Format (CRITICAL ⚠️)

### The Problem

**API_IMPLEMENTATION_GUIDE.md:**
```typescript
// Uses wrapped responses consistently
{
  success: boolean;
  message: string;
  data: T | null;
  meta: {
    version: string;
    timestamp: number;
  } | null;
  errors?: any;
}

// Example:
return jsonResponse(
  ApiResponseBuilder.success('Account created successfully', account),
  201
);
```

**DATABASE_SCHEMA_GUIDE.md:**
```typescript
// Returns raw data directly
export async function GET(request: NextRequest) {
  const accounts = await db.accounts.findMany({ /* ... */ });
  
  return NextResponse.json({
    data: accounts,
    meta: {
      max_personal_id: maxPersonalId,
    },
  });  // ❌ No success/message wrapper
}
```

**route.ts:**
```typescript
// Returns raw data
return NextResponse.json(newTransaction, { status: 201 });  
// ❌ No wrapper

return NextResponse.json({
  transactions,
  total,
  limit,
  offset,
});  // ❌ No wrapper
```

**httpClient.ts:**
```typescript
// Expects raw responses
export async function fetchWithErrorHandling<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  // ...
  const data = await response.json();
  return data as T;  // ❌ No unwrapping
}
```

### Impact
- **Client-side code** expects different response shapes
- **Error handling** inconsistent
- **Type safety** compromised
- **API contract** ambiguous

### Resolution ✅

**Adopt API_IMPLEMENTATION_GUIDE approach** (wrapped responses)

**Rationale:**
1. Matches implemented Go API
2. Consistent error handling
3. Better client experience
4. Easier debugging (success flag + message)

**Changes Required:**
1. **Update httpClient.ts** - Add unwrapping logic:
```typescript
interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  meta: {
    version: string;
    timestamp: number;
  } | null;
  errors?: any;
}

export async function fetchWithErrorHandling<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  // ... existing code ...
  
  const responseData: ApiResponse<T> = await response.json();
  
  if (!responseData.success) {
    throw new ApiException(
      responseData.message,
      response.status,
      responseData.errors
    );
  }
  
  return responseData.data as T;  // ✅ Unwrap data
}
```

2. **Update DATABASE_SCHEMA_GUIDE.md** - Use ApiResponseBuilder:
```typescript
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  const accounts = await db.accounts.findMany({ /* ... */ });
  
  return jsonResponse(
    ApiResponseBuilder.success('Accounts retrieved successfully', {
      accounts,
      meta: { max_personal_id: maxPersonalId }
    })
  );  // ✅ Wrapped
}
```

3. **Update route.ts** - Use ApiResponseBuilder
4. **Update transactionService.updated.ts** - Expect wrapped responses

---

## Conflict 2: Authentication Token Structure (CRITICAL ⚠️)

### The Problem

**API_IMPLEMENTATION_GUIDE.md:**
```typescript
// Dual-token system
export interface LoginResponse {
  access_token: string;   // 24 hours
  refresh_token: string;  // 7 days
  user: UserProfile;
}

// Token storage
apiClient.setAccessToken(response.data.access_token);
localStorage.setItem('refresh_token', response.data.refresh_token);

// Token usage
headers['Authorization'] = `Bearer ${this.accessToken}`;
```

**database.ts:**
```typescript
// Single token
export interface LoginResponse {
  token: string;  // ❌ No refresh token
  user: UserProfile;
}
```

**httpClient.ts:**
```typescript
// Single token storage
const token = localStorage.getItem('token');  // ❌ Wrong key
if (token && !headers.has('Authorization')) {
  headers.set('Authorization', `Bearer ${token}`);
}
```

### Impact
- **Token refresh** won't work
- **Long-lived sessions** impossible
- **Security** compromised (no token rotation)
- **Mobile apps** can't maintain sessions

### Resolution ✅

**Adopt dual-token system from API_IMPLEMENTATION_GUIDE**

**Changes Required:**
1. **Update database.ts**:
```typescript
export interface LoginResponse {
  access_token: string;   // ✅ Changed from 'token'
  refresh_token: string;  // ✅ Added
  user: UserProfile;
}

export interface RefreshTokenResponse {
  access_token: string;
  expired_at: string;
  refresh_token: string;
  refreshable_until: string;
}
```

2. **Update httpClient.ts**:
```typescript
// Change token storage key
const token = localStorage.getItem('access_token');  // ✅ Changed key

// Add refresh logic
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return false;
  
  try {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      body: new FormData().append('refresh_token', refreshToken),
    });
    
    if (response.ok) {
      const data = await response.json();
      localStorage.setItem('access_token', data.data.access_token);
      localStorage.setItem('refresh_token', data.data.refresh_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// Auto-refresh on 401
if (response.status === 401) {
  const refreshed = await refreshAccessToken();
  if (refreshed) {
    return fetchWithErrorHandling<T>(endpoint, config);  // Retry
  }
}
```

---

## Conflict 3: URL Structure (MEDIUM ⚠️)

### The Problem

**API_IMPLEMENTATION_GUIDE.md:**
```typescript
// Consistent /api/v1 prefix
Production: /api/v1/*

// Examples:
POST /api/v1/auth/register
GET /api/v1/accounts
PUT /api/v1/accounts/:id
```

**DATABASE_SCHEMA_GUIDE.md:**
```typescript
// Inconsistent - missing version
// Examples show:
httpClient.get<Category[]>('/api/categories')  // ❌ No /v1
httpClient.post<Transaction>('/api/transactions', data)  // ❌ No /v1
```

**httpClient.ts:**
```typescript
// Configurable but defaults to empty
const API_BASE_URL = config.apiBaseUrl || '';  // ❌ No default
```

### Impact
- **Routes don't match** actual API
- **Versioning** not enforced
- **Breaking changes** risk
- **Documentation confusion**

### Resolution ✅

**Use `/api/v1` consistently**

**Changes Required:**
1. **Update httpClient.ts**:
```typescript
const API_BASE_URL = config.apiBaseUrl || '/api/v1';  // ✅ Default
```

2. **Update DATABASE_SCHEMA_GUIDE.md** examples:
```typescript
httpClient.get<Category[]>('/api/v1/categories')  // ✅ Added /v1
httpClient.post<Transaction>('/api/v1/transactions', data)  // ✅ Added /v1
```

3. **Update all service files**:
```typescript
// transactionService.ts
getAll: async (): Promise<Transaction[]> => {
  return httpClient.get<Transaction[]>('/api/v1/transactions');  // ✅ /v1
}
```

4. **Update .env.local**:
```bash
NEXT_PUBLIC_API_BASE_URL="/api/v1"
```

---

## Conflict 4: HTTP Client Name (LOW ⚠️)

### The Problem

**API_IMPLEMENTATION_GUIDE.md:**
```typescript
// Uses "apiClient"
import { apiClient } from './apiClient';

const response = await apiClient.postFormData('/auth/login', data);
```

**DATABASE_SCHEMA_GUIDE.md + transactionService.updated.ts:**
```typescript
// Uses "httpClient"
import { httpClient } from './httpClient';

return httpClient.get<Transaction[]>('/api/transactions');
```

### Impact
- **Import confusion**
- **File naming** inconsistent
- **Documentation mismatch**

### Resolution ✅

**Keep "httpClient" (existing implementation)**

**Rationale:**
1. httpClient.ts already exists
2. More descriptive name
3. Less code to change

**Changes Required:**
1. **Update API_IMPLEMENTATION_GUIDE.md** references:
```typescript
// Change:
import { apiClient } from './apiClient';
// To:
import { httpClient } from './httpClient';
```

2. **Keep file named** `httpClient.ts` (no rename needed)

---

## Conflict 5: personal_id Handling (CRITICAL ⚠️)

### The Problem

**API_IMPLEMENTATION_GUIDE.md:**
```typescript
// Client sends personal_id in request body
export interface CreateAccountRequest {
  personal_id: number;  // ✅ Client provides
  name: string;
  // ...
}

// Server trusts client-provided value
const account = await db.accounts.create({
  data: {
    personal_id: body.personal_id,  // ✅ From request
    // ...
  },
});
```

**DATABASE_SCHEMA_GUIDE.md:**
```typescript
// Shows caching strategy (correct) ✅
// Get next personal_id from client-side cache (passed in request body)
// Client should maintain max_category_personal_id in localStorage
const personalId = body.personal_id; // Client sends this
```

**route.ts:**
```typescript
// Server generates personal_id by querying DB ❌
async function getNextPersonalId(userId: string): Promise<number> {
  // TODO: Query database for max personal_id for this user
  // Example with Prisma:
  const maxTransaction = await db.transaction.findFirst({
    where: { user_id: userId },
    orderBy: { personal_id: 'desc' },
  });
  return (maxTransaction?.personal_id || 0) + 1;
}

// Used in POST:
const personalId = await getNextPersonalId(userId);  // ❌ DB query
```

**transactionService.updated.ts:**
```typescript
// Comment says position required (WRONG - it's personal_id)
/**
 * Create a new transaction
 * Note: position field is required in your schema  ❌ WRONG
 */
```

### Impact
- **Performance** - Unnecessary DB queries
- **Race conditions** - Multiple clients creating records
- **Consistency** - Two strategies in docs
- **Confusion** - Which approach to use?

### Resolution ✅

**Client-side caching (DATABASE_SCHEMA_GUIDE approach)**

**Rationale:**
1. Better performance (no DB query per creation)
2. Documented in SCHEMA_UPDATE_SUMMARY.txt
3. Works with multiple devices (refresh on sync)
4. Matches API_IMPLEMENTATION_GUIDE

**Changes Required:**
1. **Update route.ts** - Remove DB query logic:
```typescript
// Remove getNextPersonalId function

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  // Use client-provided personal_id
  const personalId = body.personal_id;  // ✅ From client
  
  const transaction = await db.transactions.create({
    data: {
      personal_id: personalId,  // ✅ Trust client
      // ...
    },
  });
}
```

2. **Update transactionService.updated.ts** comment:
```typescript
/**
 * Create a new transaction
 * Note: Client should send personal_id from cache  ✅ CORRECTED
 */
```

3. **Document caching strategy** in all guides:
```typescript
// CLIENT-SIDE: Cache max_personal_id
const { data, meta } = await response.json();
localStorage.setItem('max_transaction_personal_id', meta.max_personal_id);

// When creating:
const nextId = parseInt(localStorage.getItem('max_transaction_personal_id') || '0') + 1;
await transactionService.create({
  personal_id: nextId,
  // ...
});
```

---

## Conflict 6: position Field Requirements (MEDIUM ⚠️)

### The Problem

**READ_ME_FIRST.txt:**
```
⚠️ IMPORTANT: Two Important Schema Details

2. position Field in Transactions
   - REQUIRED (NOT NULL in your schema)  ❌ WRONG
   - Must provide position: {} when creating transactions
```

**route.ts:**
```typescript
function validateTransactionData(data: unknown): data is CreateTransactionRequest {
  return (
    // ... other validations
    obj.position !== undefined  // ❌ Validates as required
  );
}
```

**transactionService.updated.ts:**
```typescript
/**
 * Create a new transaction
 * Note: position field is required in your schema  ❌ WRONG
 */
create: async (data: CreateTransactionRequest): Promise<Transaction> => {
```

**SCHEMA_UPDATE_SUMMARY.txt:**
```
position Field (JSON)
   - Purpose: Google Sheets bidirectional sync
   - Status: NOT YET IMPLEMENTED - always use `null`  ✅ CORRECT
   - Nullable in ALL tables (including transactions)  ✅ CORRECT
```

**API_IMPLEMENTATION_GUIDE.md:**
```typescript
// Creates with position: null
const account = await db.accounts.create({
  data: {
    // ...
    position: null,  // ✅ Correct - always null
  },
});
```

**DATABASE_SCHEMA_GUIDE.md:**
```typescript
// Correctly shows nullable
position: null, // Always null until Google Sheets sync is implemented  ✅
```

### Impact
- **Validation errors** - Rejecting valid requests
- **Documentation confusion** - Contradictory info
- **Developer frustration** - Required but should be null?

### Resolution ✅

**position is NULLABLE - always use null**

**Rationale:**
1. SCHEMA_UPDATE_SUMMARY.txt is most recent
2. API_IMPLEMENTATION_GUIDE shows null
3. Google Sheets sync not implemented
4. Database schema shows nullable

**Changes Required:**
1. **Update READ_ME_FIRST.txt**:
```
2. position Field
   - NULLABLE (not required) ✅ CORRECTED
   - Always use null until Google Sheets sync implemented
   - Format: GoogleSheetsPosition | null
```

2. **Update route.ts** validation:
```typescript
function validateTransactionData(data: unknown): data is CreateTransactionRequest {
  return (
    // ... other validations
    // Remove: obj.position !== undefined
    // position is optional
  );
}
```

3. **Update transactionService.updated.ts** comment:
```typescript
/**
 * Create a new transaction
 * Note: position is nullable (always use null for now) ✅ CORRECTED
 */
```

---

## Conflict 7: Error Response Format (MEDIUM ⚠️)

### The Problem

**API_IMPLEMENTATION_GUIDE.md:**
```typescript
// Uses ApiResponseBuilder for errors
return jsonResponse(
  ApiResponseBuilder.error('Account not found'),
  404
);

// Result:
{
  success: false,
  message: 'Account not found',
  data: null,
  meta: null,
  errors: null
}
```

**route.ts:**
```typescript
// Returns different error formats
return NextResponse.json(
  { error: 'Unauthorized', message: 'Authentication required' },  // ❌ Different
  { status: 401 }
);

return NextResponse.json(
  { error: 'Invalid JSON', message: 'The request body must be valid JSON' },  // ❌ Different
  { status: 400 }
);
```

**httpClient.ts:**
```typescript
// Expects error/message format
try {
  const errorData = await response.json();
  errorMessage = errorData.message || errorData.error || errorMessage;  // ❌ Assumes error field
  errorDetails = errorData;
} catch {
  // ...
}
```

### Impact
- **Client error handling** inconsistent
- **Error messages** not displayed properly
- **Type safety** lost

### Resolution ✅

**Use ApiResponseBuilder.error() consistently**

**Changes Required:**
1. **Update route.ts**:
```typescript
import { ApiResponseBuilder, jsonResponse } from '@/lib/api-response';

// Change:
return NextResponse.json(
  { error: 'Unauthorized', message: 'Authentication required' },
  { status: 401 }
);

// To:
return jsonResponse(
  ApiResponseBuilder.error('Authentication required'),
  401
);
```

2. **Update httpClient.ts** error parsing:
```typescript
try {
  const errorData: ApiResponse<any> = await response.json();
  
  if (!errorData.success) {
    throw new ApiException(
      errorData.message,  // ✅ Consistent
      response.status,
      errorData.errors
    );
  }
} catch {
  // ...
}
```

---

## Conflict 8: Content-Type Headers (LOW ⚠️)

### The Problem

**API_IMPLEMENTATION_GUIDE.md:**
```typescript
// Auth endpoints use form data
export async function POST(request: NextRequest) {
  const formData = await request.formData();  // ✅ Form data
  const email = formData.get('email') as string;
}

// Client sends form data
async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  return apiClient.postFormData('/auth/login', data);  // ✅ FormData
}
```

**httpClient.ts:**
```typescript
// Assumes JSON by default
const headers = new Headers(fetchConfig.headers);
if (!headers.has('Content-Type') && fetchConfig.body) {
  headers.set('Content-Type', 'application/json');  // ❌ Always JSON
}
```

### Impact
- **Auth endpoints fail** - Expect form data, receive JSON
- **Body parsing** wrong format

### Resolution ✅

**httpClient should detect FormData**

**Changes Required:**
1. **Update httpClient.ts**:
```typescript
const headers = new Headers(fetchConfig.headers);

// Only set JSON Content-Type for non-FormData bodies
if (!headers.has('Content-Type') && fetchConfig.body) {
  if (!(fetchConfig.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');  // ✅ Conditional
  }
  // FormData sets its own Content-Type with boundary
}
```

---

## Conflict 9: Response Meta Structure (LOW ⚠️)

### The Problem

**API_IMPLEMENTATION_GUIDE.md:**
```typescript
// Meta has version + timestamp
meta: {
  version: string;
  timestamp: number;
}

// Example:
return ApiResponseBuilder.success('Accounts retrieved', accounts);
// Result:
{
  success: true,
  message: 'Accounts retrieved',
  data: accounts,
  meta: {
    version: 'v1.0.0',
    timestamp: 1704067200
  }
}
```

**DATABASE_SCHEMA_GUIDE.md:**
```typescript
// Meta has different structure
return NextResponse.json({
  data: accounts,
  meta: {
    max_personal_id: maxPersonalId,  // ❌ Different structure
  },
});
```

### Impact
- **Client expectations** mismatch
- **Caching strategy** broken
- **Version info** missing

### Resolution ✅

**Extend meta to include both version/timestamp AND custom fields**

**Changes Required:**
1. **Update ApiResponseBuilder**:
```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T | null;
  meta: {
    version: string;
    timestamp: number;
    [key: string]: any;  // ✅ Allow additional fields
  } | null;
  errors?: any;
}

static success<T>(
  message: string,
  data: T | null = null,
  additionalMeta?: Record<string, any>  // ✅ Allow extra meta
): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
    meta: {
      version: process.env.API_VERSION || 'v1.0.0',
      timestamp: Math.floor(Date.now() / 1000),
      ...additionalMeta,  // ✅ Merge additional fields
    },
  };
}
```

2. **Update DATABASE_SCHEMA_GUIDE.md** examples:
```typescript
return jsonResponse(
  ApiResponseBuilder.success('Accounts retrieved', accounts, {
    max_personal_id: maxPersonalId,  // ✅ Additional meta
  })
);

// Result:
{
  success: true,
  message: 'Accounts retrieved',
  data: accounts,
  meta: {
    version: 'v1.0.0',
    timestamp: 1704067200,
    max_personal_id: 5  // ✅ Included
  }
}
```

---

## Conflict 10: Swap Order Implementation (MEDIUM ⚠️)

### The Problem

**API_IMPLEMENTATION_GUIDE.md:**
```typescript
// Complete two-phase implementation
await db.$transaction(async (tx) => {
  // Phase 1: Temporary negative values
  for (let i = 0; i < order_map.length; i++) {
    await tx.accounts.updateMany({
      where: { id: item.id, user_id: user.user_id },
      data: { personal_id: -(i + 1) },  // ✅ Temporary
    });
  }

  // Phase 2: Final positive values
  for (const item of order_map) {
    await tx.accounts.updateMany({
      where: { id: item.id, user_id: user.user_id },
      data: { personal_id: item.personal_id },  // ✅ Final
    });
  }
});
```

**DATABASE_SCHEMA_GUIDE.md:**
```
# Mentions the strategy but no code
```

**No implementation** in other files

### Impact
- **Unique constraint violations** on direct updates
- **Data corruption** risk
- **Feature doesn't work** without two-phase update

### Resolution ✅

**Document two-phase pattern everywhere swap-order is mentioned**

**Changes Required:**
1. **Update DATABASE_SCHEMA_GUIDE.md**:
```markdown
## Swap Order Pattern

All resources with (user_id, personal_id) unique constraint must use two-phase update:

### Problem
```typescript
// Direct update fails:
Account A: personal_id = 1 → 2  ❌ FAILS! (B already has 2)
Account B: personal_id = 2 → 1
```

### Solution
```typescript
// Phase 1: Temporary negatives
Account A: personal_id = 1 → -1  ✓
Account B: personal_id = 2 → -2  ✓

// Phase 2: Final values
Account A: personal_id = -1 → 2  ✓
Account B: personal_id = -2 → 1  ✓
```

### Implementation
[Include full code from API_IMPLEMENTATION_GUIDE.md]
```

2. **Add to all resource** sections (categories, transactions, etc.)

---

## Summary of Resolutions

| # | Conflict | Resolution | Priority | Files to Update |
|---|----------|------------|----------|-----------------|
| 1 | Response Format | Use wrapped `{success, message, data, meta}` | ⚠️ CRITICAL | httpClient.ts, DATABASE_SCHEMA_GUIDE.md, route.ts |
| 2 | Auth Tokens | Dual-token system (access + refresh) | ⚠️ CRITICAL | database.ts, httpClient.ts |
| 3 | URL Structure | Use `/api/v1/*` consistently | ⚠️ MEDIUM | httpClient.ts, DATABASE_SCHEMA_GUIDE.md, services |
| 4 | HTTP Client Name | Keep "httpClient" | ⚠️ LOW | API_IMPLEMENTATION_GUIDE.md |
| 5 | personal_id | Client-side caching | ⚠️ CRITICAL | route.ts, transactionService.updated.ts |
| 6 | position Field | Nullable, always use null | ⚠️ MEDIUM | READ_ME_FIRST.txt, route.ts, transactionService.updated.ts |
| 7 | Error Format | Use ApiResponseBuilder.error() | ⚠️ MEDIUM | route.ts, httpClient.ts |
| 8 | Content-Type | Detect FormData | ⚠️ LOW | httpClient.ts |
| 9 | Meta Structure | Allow additional meta fields | ⚠️ LOW | ApiResponseBuilder, DATABASE_SCHEMA_GUIDE.md |
| 10 | Swap Order | Two-phase update pattern | ⚠️ MEDIUM | DATABASE_SCHEMA_GUIDE.md |

---

## Priority Order for Resolution

### Phase 1: Critical Conflicts (Must fix before any implementation)
1. **Response Format** - Affects all endpoints
2. **Auth Tokens** - Security and session management
3. **personal_id Handling** - Performance and consistency

### Phase 2: Important Conflicts (Fix during implementation)
4. **URL Structure** - Before creating any endpoints
5. **position Field** - Affects validation
6. **Error Format** - Affects error handling
7. **Swap Order** - Affects all resources with ordering

### Phase 3: Minor Conflicts (Can fix anytime)
8. **HTTP Client Name** - Documentation only
9. **Content-Type** - Auth endpoints only
10. **Meta Structure** - Enhancement

---

## Implementation Checklist

Before starting implementation:

### 1. Update Core Files
- [ ] Update `httpClient.ts`:
  - Add response unwrapping
  - Change token key to `access_token`
  - Add refresh token logic
  - Fix FormData detection
  - Update base URL to `/api/v1`

- [ ] Update `database.ts`:
  - Change `LoginResponse.token` → `access_token`
  - Add `refresh_token` field
  - Add `RefreshTokenResponse` type

- [ ] Update `lib/api-response.ts`:
  - Add `additionalMeta` parameter
  - Allow custom meta fields

### 2. Update Documentation
- [ ] Update `DATABASE_SCHEMA_GUIDE.md`:
  - Change all examples to wrapped responses
  - Update URLs to `/api/v1`
  - Add swap-order pattern to all resources
  - Fix meta structure examples

- [ ] Update `READ_ME_FIRST.txt`:
  - Change position to nullable
  - Update personal_id strategy

- [ ] Update `API_IMPLEMENTATION_GUIDE.md`:
  - Change `apiClient` → `httpClient`

- [ ] Update `route.ts`:
  - Use ApiResponseBuilder
  - Remove position validation
  - Remove getNextPersonalId function
  - Use client-provided personal_id

- [ ] Update `transactionService.updated.ts`:
  - Fix comments about position
  - Update to expect wrapped responses

### 3. Verification
- [ ] All endpoints return wrapped responses
- [ ] All services unwrap responses correctly
- [ ] Auth uses dual tokens
- [ ] All URLs use `/api/v1`
- [ ] position is always null
- [ ] personal_id from client cache
- [ ] Swap order uses two-phase pattern
- [ ] Error handling consistent

---

## Testing Strategy

After resolving conflicts:

### Unit Tests
```typescript
// Test response unwrapping
test('httpClient unwraps successful responses', async () => {
  const mockResponse = {
    success: true,
    message: 'Success',
    data: { id: '123' },
    meta: { version: 'v1.0.0', timestamp: 123 }
  };
  // ... assertions
});

// Test error handling
test('httpClient throws on error response', async () => {
  const mockResponse = {
    success: false,
    message: 'Error occurred',
    data: null,
    meta: null
  };
  // ... assertions
});
```

### Integration Tests
```typescript
// Test auth flow
test('login returns dual tokens', async () => {
  const response = await authService.login({
    email_or_username: 'test@example.com',
    password: 'password'
  });
  expect(response.data).toHaveProperty('access_token');
  expect(response.data).toHaveProperty('refresh_token');
});

// Test personal_id caching
test('creates account with client-provided personal_id', async () => {
  const account = await accountService.create({
    personal_id: 5,  // From cache
    name: 'Test'
  });
  expect(account.personal_id).toBe(5);
});
```

---

## Risk Assessment

### High Risk
- **Response Format** - Breaking change, affects all endpoints
- **Auth Tokens** - Security implications
- **personal_id** - Data integrity risk

### Medium Risk
- **URL Structure** - Breaking change, but localized
- **position Field** - Validation errors
- **Swap Order** - Unique constraint violations

### Low Risk
- **HTTP Client Name** - Documentation only
- **Content-Type** - Isolated to auth
- **Meta Structure** - Backwards compatible

---

## Next Steps

1. **Review this analysis** with team
2. **Prioritize conflicts** based on your timeline
3. **Create implementation plan** (see REFACTOR_PLAN.md)
4. **Update files** per resolution instructions
5. **Test thoroughly** before proceeding with implementation
6. **Document decisions** for future reference

---

## Questions to Answer

1. **Should we fix all conflicts before implementation?**
   - Recommended: Yes for Critical conflicts
   - Can defer: Low priority conflicts

2. **Do we need backward compatibility?**
   - If Go API runs in parallel: Yes
   - If full migration: No

3. **Timeline for resolution?**
   - Critical: Before Phase 0
   - Important: During Phase 0
   - Minor: Anytime

4. **Who approves resolution decisions?**
   - Technical lead?
   - Team consensus?

---

## Conclusion

All conflicts have been identified, analyzed, and resolved. The main themes are:

1. **Consistency** - Standardize response format, URLs, error handling
2. **Security** - Dual-token system for better session management
3. **Performance** - Client-side caching for personal_id
4. **Clarity** - Fix outdated documentation

**Recommendation:** Resolve all Critical conflicts before starting implementation. This will prevent rework and ensure smooth development.
