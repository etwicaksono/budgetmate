# Action Plan: Refactor API Routes for Explicit Type Inference

## Goal
Refactor Next.js API routes to use explicit response type wrappers that enable TypeScript static analysis and automatic OpenAPI schema generation through `@scalar/ts-to-openapi`.

## Problem Statement
Current implementation uses `Response.json()` or helper functions that wrap responses, which prevents TypeScript's static analyzer from inferring response types. This results in `"type": "null"` in the generated OpenAPI schema.

## Solution Overview
Create typed response helper functions that return explicit TypeScript types before wrapping in `Response.json()`. This allows the static analyzer to infer proper response schemas while maintaining type safety.

---

## Implementation Phases

### Phase 0: Foundation (Setup & Infrastructure)
**Goal**: Create the infrastructure for typed responses

**Tasks**:
- [x] Create `/types/api-responses.ts` with base types
- [ ] Create `/lib/typed-responses.ts` with typed response helpers
- [ ] Add response type definitions for all domain models
- [ ] Create utility types for common patterns (pagination, errors, etc.)
- [ ] Write tests for typed response helpers

**Response Helper Pattern**:
```typescript
// lib/typed-responses.ts
import type { ApiResponse, ApiErrorResponse } from '@/types/api-responses';

// Success response with explicit return type
export function successResponse<T>(message: string, data: T, meta?: Record<string, any>) {
  return {
    success: true as const,
    message,
    data,
    ...(meta && { meta })
  } satisfies ApiResponse<T>;
}

// Error response with explicit return type
export function errorResponse(message: string) {
  return {
    success: false as const,
    message
  } satisfies ApiErrorResponse;
}

// Convert typed response to HTTP Response
export function toJsonResponse<T>(
  data: T,
  status: number = 200
): Response {
  return Response.json(data, { status });
}
```

**Exit Criteria**:
- [ ] All response helper functions created and tested
- [ ] Type definitions complete for Auth and Accounts domains
- [ ] Pattern validated with at least one endpoint

---

### Phase 1: Authentication Endpoints (4 endpoints)
**Goal**: Refactor auth routes to use typed responses

**Pattern Example** (auth/login):
```typescript
// Before:
export async function POST(request: NextRequest): Promise<Response> {
  return Response.json(
    ApiResponseBuilder.success('Login successful', loginData) as ApiResponse<LoginResponse>,
    { status: 200 }
  );
}

// After:
export async function POST(request: NextRequest) {
  try {
    // ... validation and business logic ...

    const response = successResponse('Login successful', {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at?.toISOString() || user.created_at.toISOString(),
      }
    } satisfies LoginResponse);

    return toJsonResponse(response, 200);
  } catch (error) {
    const response = errorResponse('Internal server error');
    return toJsonResponse(response, 500);
  }
}
```

**Endpoints**:
| Endpoint | Status | Notes |
| --- | --- | --- |
| `auth/login/route.ts` | [ ] | Returns LoginResponse |
| `auth/logout/route.ts` | [ ] | Returns null data |
| `auth/refresh/route.ts` | [ ] | Returns RefreshTokenResponse |
| `auth/register/route.ts` | [ ] | Returns LoginResponse |

**Exit Criteria**:
- [ ] All 4 auth endpoints refactored
- [ ] OpenAPI schema shows proper types for auth endpoints
- [ ] All auth endpoints tested and working
- [ ] Response types match JSDoc documentation

---

### Phase 2: Account Endpoints (7 endpoints/operations)
**Goal**: Refactor account routes to use typed responses

**Type Definitions Needed**:
```typescript
// types/api-responses.ts additions
export interface AccountListResponse {
  data: Account[];
  meta: AccountListMeta;
}

export interface AccountResponse {
  data: Account;
}

export interface AccountDeleteResponse {
  data: null;
}
```

**Endpoints**:
| Endpoint | Operations | Status | Notes |
| --- | --- | --- | --- |
| `accounts/route.ts` | GET, POST | [ ] | List (with meta) and Create |
| `accounts/[id]/route.ts` | GET, PUT, DELETE | [ ] | Single resource operations |
| `accounts/swap-order/route.ts` | PUT | [ ] | Returns SwapOrderResult |

**Special Considerations**:
- GET `/accounts` returns array with pagination meta
- DELETE operations return `data: null`
- Ensure calculated fields (balance) are included in type

**Exit Criteria**:
- [ ] All 7 account operations refactored
- [ ] OpenAPI schema shows proper types for all operations
- [ ] Pagination meta properly typed
- [ ] All account endpoints tested and working

---

### Phase 3: Category Endpoints (5 endpoints/operations)
**Goal**: Refactor category routes including tree structure

**Type Definitions Needed**:
```typescript
// types/api-responses.ts additions
export interface Category {
  id: string;
  user_id: string;
  personal_id: number;
  name: string;
  icon: string;
  nature: string;
  color: string;
  is_active: boolean;
  parent_id: string | null;
  position: any;
  created_at: string;
  updated_at: string;
}

export interface CategoryNode extends Category {
  children: CategoryNode[];
  transactionCount?: number;
}

export interface CategoryTreeResponse {
  data: CategoryNode[];
  meta: {
    totalCategories: number;
    maxDepth: number;
  };
}
```

**Endpoints**:
| Endpoint | Operations | Status | Notes |
| --- | --- | --- | --- |
| `categories/route.ts` | GET, POST | [ ] | List and Create |
| `categories/[id]/route.ts` | GET, PUT, DELETE | [ ] | Single resource operations |
| `categories/tree/route.ts` | GET | [ ] | Nested tree structure |
| `categories/swap-order/route.ts` | PUT | [ ] | Reorder operation |

**Special Considerations**:
- Tree endpoint returns recursive CategoryNode structure
- Ensure proper typing of parent-child relationships

**Exit Criteria**:
- [ ] All category endpoints refactored
- [ ] Tree structure properly typed and validated
- [ ] OpenAPI schema shows nested types correctly
- [ ] All category endpoints tested

---

### Phase 4: Group Endpoints (3 endpoints/operations)
**Goal**: Refactor group management routes

**Type Definitions Needed**:
```typescript
// types/api-responses.ts additions
export interface Group {
  id: string;
  user_id: string;
  personal_id: number;
  name: string;
  icon: string;
  color: string;
  position: any;
  created_at: string;
  updated_at: string;
}
```

**Endpoints**:
| Endpoint | Operations | Status | Notes |
| --- | --- | --- | --- |
| `groups/route.ts` | GET, POST | [ ] | List and Create |
| `groups/[id]/route.ts` | GET, PUT, DELETE | [ ] | Single resource operations |

**Exit Criteria**:
- [ ] All group endpoints refactored
- [ ] OpenAPI schema shows proper types
- [ ] All group endpoints tested

---

### Phase 5: Transaction Endpoints (4 endpoints/operations)
**Goal**: Refactor transaction routes including summary

**Type Definitions Needed**:
```typescript
// types/api-responses.ts additions
export interface Transaction {
  id: string;
  user_id: string;
  personal_id: number;
  account_id: string;
  category_id: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionSummary {
  total: number;
  byCategory: Record<string, number>;
  byType: {
    income: number;
    expense: number;
  };
  period: {
    start: string;
    end: string;
  };
}
```

**Endpoints**:
| Endpoint | Operations | Status | Notes |
| --- | --- | --- | --- |
| `transactions/route.ts` | GET, POST | [ ] | List and Create |
| `transactions/[id]/route.ts` | GET, PUT, DELETE | [ ] | Single resource operations |
| `transactions/summary/route.ts` | GET | [ ] | Aggregation endpoint |

**Special Considerations**:
- Summary endpoint returns complex aggregated data
- May include query filters (date range, category, etc.)

**Exit Criteria**:
- [ ] All transaction endpoints refactored
- [ ] Summary structure properly typed
- [ ] OpenAPI schema shows aggregation types
- [ ] All transaction endpoints tested

---

### Phase 6: Transfer Endpoints (3 endpoints/operations)
**Goal**: Refactor money transfer routes

**Type Definitions Needed**:
```typescript
// types/api-responses.ts additions
export interface Transfer {
  id: string;
  user_id: string;
  personal_id: number;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  date: string;
  description: string | null;
  transaction_from_id: string;
  transaction_to_id: string;
  created_at: string;
  updated_at: string;
}
```

**Endpoints**:
| Endpoint | Operations | Status | Notes |
| --- | --- | --- | --- |
| `transfers/route.ts` | GET, POST | [ ] | List and Create |
| `transfers/[id]/route.ts` | GET, PUT, DELETE | [ ] | Single resource operations |

**Special Considerations**:
- Transfers create two linked transactions
- Include related transaction IDs in response

**Exit Criteria**:
- [ ] All transfer endpoints refactored
- [ ] Linked transaction IDs properly exposed
- [ ] OpenAPI schema shows complete structure
- [ ] All transfer endpoints tested

---

### Phase 7: Debt Endpoints (3 endpoints/operations)
**Goal**: Refactor debt tracking routes

**Type Definitions Needed**:
```typescript
// types/api-responses.ts additions
export interface Debt {
  id: string;
  user_id: string;
  personal_id: number;
  name: string;
  type: 'PAYABLE' | 'RECEIVABLE';
  amount: number;
  balance: number;
  description: string | null;
  created_at: string;
  updated_at: string;
}
```

**Endpoints**:
| Endpoint | Operations | Status | Notes |
| --- | --- | --- | --- |
| `debts/route.ts` | GET, POST | [ ] | List and Create |
| `debts/[id]/route.ts` | GET, PUT, DELETE | [ ] | Single resource operations |

**Special Considerations**:
- Include calculated balance
- DELETE validates no active balance

**Exit Criteria**:
- [ ] All debt endpoints refactored
- [ ] Balance calculations properly typed
- [ ] OpenAPI schema complete
- [ ] All debt endpoints tested

---

### Phase 8: Validation & Polish
**Goal**: Verify complete implementation and fix issues

**Tasks**:
- [ ] Verify all OpenAPI schemas are non-null
- [ ] Test all endpoints in Scalar UI
- [ ] Validate request body schemas are generated
- [ ] Check error response consistency
- [ ] Ensure authentication requirements show in schema
- [ ] Test pagination metadata across all list endpoints
- [ ] Verify nested/recursive types (category tree)
- [ ] Update API documentation with examples
- [ ] Run full integration test suite
- [ ] Performance test (ensure no regression)

**OpenAPI Verification Checklist**:
- [ ] All 2xx responses have proper schemas (not null)
- [ ] All 4xx/5xx responses have error schemas
- [ ] Request bodies show proper types for POST/PUT/PATCH
- [ ] Query parameters documented (filters, pagination)
- [ ] All tags properly assigned
- [ ] Security requirements shown for protected endpoints
- [ ] Response examples render correctly in Scalar UI

**Exit Criteria**:
- [ ] Zero null schemas in OpenAPI spec
- [ ] All endpoints return correct types
- [ ] Full test coverage passes
- [ ] Documentation updated
- [ ] Team review completed

---

## Technical Guidelines

### 1. Response Helper Usage
Always use the typed response helpers:
```typescript
// Success
const response = successResponse('Message', typedData);
return toJsonResponse(response, 200);

// Error
const response = errorResponse('Error message');
return toJsonResponse(response, 400);
```

### 2. Type Satisfaction
Use `satisfies` for inline type checking:
```typescript
const userData = {
  id: user.id,
  email: user.email,
  username: user.username,
} satisfies UserProfile;
```

### 3. Return Type Annotation
Let TypeScript infer the return type - don't add explicit `: Promise<Response>`:
```typescript
// Good - TypeScript infers the type
export async function GET(request: NextRequest) {
  const response = successResponse('Data', data);
  return toJsonResponse(response, 200);
}

// Bad - explicit annotation hides type info
export async function GET(request: NextRequest): Promise<Response> {
  // ...
}
```

### 4. Error Handling Pattern
Consistent error handling across all endpoints:
```typescript
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }

    // Validation
    if (!valid) {
      const response = errorResponse('Validation failed');
      return toJsonResponse(response, 400);
    }

    // Business logic
    const data = await doSomething();

    // Success
    const response = successResponse('Success', data);
    return toJsonResponse(response, 200);

  } catch (error) {
    console.error('Operation error:', error);
    const response = errorResponse('Internal server error');
    return toJsonResponse(response, 500);
  }
}
```

### 5. JSDoc Alignment
Keep JSDoc in sync with TypeScript types:
```typescript
/**
 * @summary Create new account
 * @description Creates a financial account...
 * @tag Accounts
 * @security bearerAuth
 * @bodyContent {application/json} { name: string, type: string, ... }
 * @param request
 * @response 201 - Account created successfully
 * @response 400 - Validation failure
 * @response 401 - Authentication failed
 * @response 500 - Internal server error
 */
export async function POST(request: NextRequest) {
  // Implementation uses typed responses matching @response descriptions
}
```

---

## Testing Strategy

### Unit Tests
- Test response helper functions in isolation
- Verify type inference works correctly
- Test error scenarios

### Integration Tests
- Test each endpoint after refactoring
- Verify response structure matches types
- Test error handling paths

### OpenAPI Schema Tests
```typescript
// Test helper to verify schema generation
describe('OpenAPI Schema Generation', () => {
  it('should generate non-null schema for auth/login', async () => {
    const schema = await getGeneratedSchema();
    const loginResponse = schema.paths['/api/v1/auth/login'].post.responses['200'];

    expect(loginResponse.content['application/json'].schema.type).not.toBe('null');
    expect(loginResponse.content['application/json'].schema).toHaveProperty('properties');
  });
});
```

---

## Rollback Plan

If issues arise during refactoring:

1. **Per-Endpoint Rollback**: Each endpoint can be independently reverted
2. **Git Strategy**: Use feature branches for each phase
3. **Backward Compatibility**: Old and new patterns can coexist
4. **Gradual Migration**: No need to complete all phases at once

---

## Success Metrics

- [ ] **100%** of API endpoints return typed responses
- [ ] **0** null schemas in OpenAPI spec
- [ ] **All** request/response types documented
- [ ] **Zero** regression in API functionality
- [ ] **100%** test coverage maintained
- [ ] **Improved** DX with better type inference in IDEs

---

## Timeline Estimate

| Phase | Endpoints | Estimated Time |
| --- | --- | --- |
| Phase 0: Foundation | Infrastructure | 2-3 hours |
| Phase 1: Auth | 4 endpoints | 2-3 hours |
| Phase 2: Accounts | 7 operations | 3-4 hours |
| Phase 3: Categories | 5 operations | 3-4 hours |
| Phase 4: Groups | 3 operations | 2 hours |
| Phase 5: Transactions | 4 operations | 3 hours |
| Phase 6: Transfers | 3 operations | 2 hours |
| Phase 7: Debts | 3 operations | 2 hours |
| Phase 8: Validation | Testing & Polish | 3-4 hours |
| **Total** | **~30 operations** | **~22-28 hours** |

*Note: Can be parallelized across team members*

---

## Dependencies

- TypeScript 5.x
- `@scalar/ts-to-openapi` package
- Next.js 14+ with App Router
- Existing JSDoc documentation (Phase 1 complete)

---

## Next Steps

1. Review and approve this plan
2. Create feature branch: `feat/typed-api-responses`
3. Start with Phase 0 (Foundation)
4. Implement phases sequentially or in parallel (by domain)
5. Regular reviews after each phase completion

---

## Notes

- This refactor improves both DX (IDE autocomplete) and API documentation
- No breaking changes to API consumers
- Enables automatic schema validation
- Sets foundation for future API evolution
