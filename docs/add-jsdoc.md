# Plan: Add JSDoc Metadata To Every API Handler

## Goals
- Ensure every Next.js API route under `app/api/v1/**` exposes `@summary`, `@description`, tags, request/response notes, and error documentation so Scalar generates a friendly OpenAPI spec.
- Keep the guidance repeatable: devs should know exactly how to document new handlers.
- Provide verification steps so we can trust `/api/openapi` in CI/CD or local development.

## Directory Scope

```
app/api/v1/
├── accounts/[id]/route.ts
├── accounts/route.ts
├── accounts/swap-order/route.ts
├── auth/login/route.ts
├── auth/logout/route.ts
├── auth/refresh/route.ts
├── auth/register/route.ts
├── categories/[id]/route.ts
├── categories/route.ts
├── categories/swap-order/route.ts
├── categories/tree/route.ts
├── debts/[id]/route.ts
├── debts/route.ts
├── groups/[id]/route.ts
├── groups/route.ts
├── transactions/[id]/route.ts
├── transactions/route.ts
├── transactions/summary/route.ts
├── transfers/[id]/route.ts
└── transfers/route.ts
```

Unless otherwise noted, each file exports one or more HTTP handlers (`GET`, `POST`, `PUT`, `DELETE`, etc.) that need JSDoc blocks.

## Standard JSDoc Template

```ts
/**
 * @summary Short, user-facing headline (≤ 10 words).
 * @description Longer explanation covering business context, notable behaviors, and caveats.
 * @tag Accounts
 * @security bearerAuth
 * @param request
 * @response 200 - Success response with detailed data structure (e.g., `{ data: Account[], meta: { total: number } }`)
 * @response 201 - Resource created successfully (e.g., `{ data: Account, id: string }`)
 * @response 204 - No content (successful deletion/update with no body)
 * @response 400 - Validation failure (e.g., `{ error: string, details?: ValidationError[] }`)
 * @response 401 - Authentication failed (e.g., `{ error: "Unauthorized" }`)
 * @response 403 - Forbidden (insufficient permissions)
 * @response 404 - Resource not found (e.g., `{ error: "Account not found" }`)
 * @response 409 - Conflict (e.g., duplicate resource)
 * @response 500 - Internal server error (e.g., `{ error: string }`)
 */
export async function GET(request: NextRequest) { … }
```

Guidelines:
- **Always include** `@summary`, `@description`, `@tag`, and `@response` entries.
- **Add `@security bearerAuth`** to any route that requires authentication.
- **Tag Assignment** (see `docs/api-tags.md` for full reference):
  - `Auth` - Login, registration, logout, token refresh
  - `Accounts` - Account CRUD and ordering
  - `Categories` - Category catalog, reordering, tree views
  - `Groups` - Account grouping
  - `Transactions` - Transaction CRUD, lists, summaries
  - `Transfers` - Money movement between accounts
  - `Debts` - Payable/receivable tracking
- **Response Documentation**:
  - Include **specific data structures** in response descriptions (e.g., `{ data: Account[], meta: { total: number } }`)
  - Document **all relevant HTTP status codes** (200, 201, 204, 400, 401, 403, 404, 409, 500)
  - Provide **example error response shapes** (e.g., `{ error: string, details?: ValidationError[] }`)
  - For collection responses, mention pagination/meta fields if applicable
- **Request Body Documentation**:
  - If a handler accepts a JSON body, include `@bodyContent {Type}` with the payload shape
  - Example: `@bodyContent {application/json} { name: string, type: "checking" | "savings", balance: number }`
  - Mention required vs. optional fields in the description
- **Keep `@summary` imperative/present tense** (e.g., "List accounts", "Create new transaction")
- **Query Parameters**: Document in `@description` if the endpoint accepts filters, pagination, or sorting params

## Comprehensive Examples by Handler Type

### Example 1: GET Collection (with pagination)
```ts
/**
 * @summary List all user accounts
 * @description Retrieves all financial accounts for the authenticated user. Supports filtering by account type and sorting by name or balance. Results include account metadata and current balance.
 * @tag Accounts
 * @security bearerAuth
 * @param request - Query params: ?type=checking|savings&sort=name|balance&order=asc|desc
 * @response 200 - Success: `{ data: Account[], meta: { total: number, page: number, limit: number } }`
 * @response 401 - Authentication failed: `{ error: "Unauthorized" }`
 * @response 500 - Internal server error: `{ error: string }`
 */
export async function GET(request: NextRequest) { … }
```

### Example 2: POST Create Resource
```ts
/**
 * @summary Create a new transaction
 * @description Creates a new financial transaction and updates the associated account balance. Requires valid categoryId and accountId. Transaction date defaults to current time if not provided.
 * @tag Transactions
 * @security bearerAuth
 * @param request
 * @bodyContent {application/json} { amount: number, categoryId: string, accountId: string, date?: string, description?: string, type: "income" | "expense" }
 * @response 201 - Transaction created: `{ data: Transaction, id: string }`
 * @response 400 - Validation failure: `{ error: string, details: ValidationError[] }`
 * @response 401 - Authentication failed: `{ error: "Unauthorized" }`
 * @response 404 - Category or account not found: `{ error: "Resource not found", resource: string }`
 * @response 500 - Internal server error: `{ error: string }`
 */
export async function POST(request: NextRequest) { … }
```

### Example 3: PUT Update Resource
```ts
/**
 * @summary Update account details
 * @description Updates an existing account's name, type, or metadata. Balance cannot be modified directly; use transactions instead. Returns the updated account.
 * @tag Accounts
 * @security bearerAuth
 * @param request
 * @bodyContent {application/json} { name?: string, type?: "checking" | "savings" | "credit", currency?: string }
 * @response 200 - Account updated: `{ data: Account }`
 * @response 400 - Validation failure: `{ error: string, details: ValidationError[] }`
 * @response 401 - Authentication failed: `{ error: "Unauthorized" }`
 * @response 403 - Forbidden: User does not own this account
 * @response 404 - Account not found: `{ error: "Account not found" }`
 * @response 500 - Internal server error: `{ error: string }`
 */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) { … }
```

### Example 4: DELETE Resource
```ts
/**
 * @summary Delete a debt record
 * @description Permanently deletes a debt record and its associated transaction history. This action cannot be undone. Debts with active balances should be settled before deletion.
 * @tag Debts
 * @security bearerAuth
 * @param request
 * @response 204 - Debt successfully deleted (no content)
 * @response 401 - Authentication failed: `{ error: "Unauthorized" }`
 * @response 403 - Forbidden: User does not own this debt
 * @response 404 - Debt not found: `{ error: "Debt not found" }`
 * @response 409 - Conflict: Debt has active balance: `{ error: "Cannot delete debt with active balance", balance: number }`
 * @response 500 - Internal server error: `{ error: string }`
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) { … }
```

### Example 5: Unauthenticated Endpoint (Auth)
```ts
/**
 * @summary User login
 * @description Authenticates a user with email and password. Returns access and refresh tokens on success. Tokens expire after 24 hours.
 * @tag Auth
 * @param request
 * @bodyContent {application/json} { email: string, password: string }
 * @response 200 - Login successful: `{ accessToken: string, refreshToken: string, user: { id: string, email: string, name: string } }`
 * @response 400 - Validation failure: `{ error: string, details: ValidationError[] }`
 * @response 401 - Invalid credentials: `{ error: "Invalid email or password" }`
 * @response 429 - Too many attempts: `{ error: "Too many login attempts", retryAfter: number }`
 * @response 500 - Internal server error: `{ error: string }`
 */
export async function POST(request: NextRequest) { … }
```

### Example 6: Special Operation (Tree/Aggregation)
```ts
/**
 * @summary Get category tree hierarchy
 * @description Returns all categories organized in a nested tree structure. Includes parent-child relationships, display order, and usage counts. Useful for rendering category selectors and budget reports.
 * @tag Categories
 * @security bearerAuth
 * @param request
 * @response 200 - Category tree: `{ data: CategoryNode[], meta: { totalCategories: number, maxDepth: number } }` where CategoryNode = `{ id: string, name: string, children: CategoryNode[], transactionCount: number }`
 * @response 401 - Authentication failed: `{ error: "Unauthorized" }`
 * @response 500 - Internal server error: `{ error: string }`
 */
export async function GET(request: NextRequest) { … }
```

## Implementation Steps

1. **Inventory & Ownership**
   - Copy the directory list above into the issue tracker or task board.
   - Assign folders to engineers if multiple people will contribute.

2. **Define Tag Taxonomy**
   - Agree on a small, consistent set of tags (e.g., `Auth`, `Accounts`, `Categories`, `Transactions`, `Transfers`, `Debts`, `Groups`).
   - Document the mapping in `docs/api-tags.md` (follow-up task).

3. **Annotate Handlers (per file)**
   - For each exported HTTP function:
     1. Add the JSDoc block using the template.
     2. **Assign the correct `@tag`** from the tag taxonomy (Auth, Accounts, Categories, Groups, Transactions, Transfers, Debts).
     3. **Document response data structures** for each status code:
        - Success responses (200/201): Include actual data shape (e.g., `{ data: Account[], meta: { total: number } }`)
        - Created responses (201): Show the created resource structure
        - No content (204): Note when used for deletions/updates
        - Error responses (400/401/403/404/409/500): Provide error object shapes
     4. Mention important query params, request bodies, and side-effects in the description.
     5. Include `@security bearerAuth` for authenticated endpoints.
     6. For POST/PUT/PATCH handlers, add `@bodyContent` with the expected payload structure.
   - If a file exports multiple handlers (e.g., both `GET` and `POST`) annotate each separately with appropriate response codes for that method.

4. **Verify Spec Generation**
   - Run `npm run dev`.
   - Visit `http://localhost:3000/api/openapi` and confirm each route now shows your summary/description.
   - For automated verification, add a future CI step that fetches `/api/openapi/schema.json` and ensures it contains no placeholder summaries.

5. **Code Review Checklist**
   - Every handler must have JSDoc with all required fields.
   - **Tag validation**: Each handler has exactly one `@tag` from the approved list (Auth, Accounts, Categories, Groups, Transactions, Transfers, Debts).
   - **Response data validation**:
     - All success responses (200/201/204) document the exact data structure returned
     - All error responses document the error object shape
     - Status codes match the handler's actual behavior
   - Summary and description match naming conventions (imperative, concise).
   - `@security bearerAuth` present on all authenticated endpoints.
   - Request body structure documented with `@bodyContent` for POST/PUT/PATCH handlers.
   - Query parameters and filters mentioned in `@description` when applicable.

## Rollout Phases By Scope

### Phase 1 – Authentication & Accounts (baseline)
Focus on endpoints that gate access or power account management. Blocker for every other phase.

| Path | Status | Notes |
| --- | --- | --- |
| `auth/login/route.ts` | [ ] Done |  |
| `auth/logout/route.ts` | [ ] Done |  |
| `auth/refresh/route.ts` | [ ] Done |  |
| `auth/register/route.ts` | [ ] Done |  |
| `accounts/route.ts` | [ ] Done |  |
| `accounts/[id]/route.ts` | [ ] Done |  |
| `accounts/swap-order/route.ts` | [ ] Done |  |

[ ] Exit Criteria:
- All auth/account routes show meaningful summaries and describe auth requirements in `/api/openapi`.
- Each handler has the correct `@tag` (Auth or Accounts).
- Response structures are fully documented (e.g., login returns `{ token: string, user: User }`, account list returns `{ data: Account[] }`).
- All relevant status codes documented (200/201/204/400/401/404/409/500).

### Phase 2 – Catalog Metadata (Categories & Groups)
Document the taxonomy primitives the rest of the app relies on.

| Path | Status | Notes |
| --- | --- | --- |
| `categories/route.ts` | [ ] Done |  |
| `categories/[id]/route.ts` | [ ] Done |  |
| `categories/swap-order/route.ts` | [ ] Done |  |
| `categories/tree/route.ts` | [ ] Done |  |
| `groups/route.ts` | [ ] Done |  |
| `groups/[id]/route.ts` | [ ] Done |  |

[ ] Exit Criteria:
- Category/group endpoints document tree semantics, reordering side effects, and error cases.
- Each handler tagged with `Categories` or `Groups`.
- Response data structures include tree/hierarchy shapes where applicable (e.g., `categories/tree` returns nested structure).
- Swap-order endpoints document expected request body and success/error responses.

### Phase 3 – Money Movement (Transactions, Transfers, Debts)
Highest-surface routes; include detailed request/response documentation.

| Path | Status | Notes |
| --- | --- | --- |
| `transactions/route.ts` | [ ] Done |  |
| `transactions/[id]/route.ts` | [ ] Done |  |
| `transactions/summary/route.ts` | [ ] Done |  |
| `transfers/route.ts` | [ ] Done |  |
| `transfers/[id]/route.ts` | [ ] Done |  |
| `debts/route.ts` | [ ] Done |  |
| `debts/[id]/route.ts` | [ ] Done |  |

[ ] Exit Criteria:
- Scalar UI highlights the intent of every money-moving endpoint, including validation failures and balance-impact notes.
- Each handler tagged with `Transactions`, `Transfers`, or `Debts`.
- All request bodies fully documented (e.g., transaction creation requires `{ amount: number, categoryId: string, accountId: string, date: string, ... }`).
- Response data shows complete resource structures including relationships (e.g., transfers include linked transaction IDs).
- Summary endpoint documents aggregation structure (e.g., `{ total: number, byCategory: Record<string, number> }`).

### Phase 4 - Polish & Automation
- [ ] `/api/openapi` verification steps documented in `docs/CONTRIBUTING.md` (curl script + smoke checklist).
- [ ] Converted placeholder status marks (☐/☑) to [ ] so scope tracking stays accurate.
- [ ] Added `docs/api-tags.md`, refreshed `docs/CONTRIBUTING.md`, and introduced `npm run lint:jsdoc` for CI enforcement.

## Tag & Response Validation Guide

### Tag Assignment Quick Reference
Use this table to ensure correct tag assignment for each endpoint:

| Endpoint Pattern | Correct Tag | Example |
| --- | --- | --- |
| `/api/v1/auth/**` | `Auth` | login, register, refresh |
| `/api/v1/accounts/**` | `Accounts` | CRUD, swap-order |
| `/api/v1/categories/**` | `Categories` | CRUD, tree, swap-order |
| `/api/v1/groups/**` | `Groups` | CRUD |
| `/api/v1/transactions/**` | `Transactions` | CRUD, summary |
| `/api/v1/transfers/**` | `Transfers` | CRUD |
| `/api/v1/debts/**` | `Debts` | CRUD |

### Response Data Structure Patterns

**Success Patterns:**
- **Single Resource**: `{ data: Resource }`
- **Collection**: `{ data: Resource[], meta?: { total: number, page?: number } }`
- **Created**: `{ data: Resource, id: string }`
- **No Content**: `204` with no body

**Error Patterns:**
- **Validation**: `{ error: string, details?: ValidationError[] }`
- **Not Found**: `{ error: "Resource not found", resource?: string }`
- **Unauthorized**: `{ error: "Unauthorized" }`
- **Forbidden**: `{ error: "Forbidden", reason?: string }`
- **Conflict**: `{ error: string, conflictingField?: string }`
- **Server Error**: `{ error: string }`

### Common Response Code Combinations by Method

| Method | Success Codes | Common Error Codes |
| --- | --- | --- |
| GET (collection) | 200 | 401, 500 |
| GET (single) | 200 | 401, 404, 500 |
| POST | 201 | 400, 401, 404 (related resources), 409, 500 |
| PUT/PATCH | 200 | 400, 401, 403, 404, 500 |
| DELETE | 204 | 401, 403, 404, 409 (dependencies), 500 |

## Follow-Up Tasks
- [ ] Added a custom script (`npm run lint:jsdoc`) so CI can fail when a handler lacks `@summary`/`@tag`.
- [ ] Documented the tag list and sample workflow in `docs/api-tags.md` + `docs/CONTRIBUTING.md`.
- [ ] Create validation script to check:
  - Every handler has exactly one `@tag` from approved list
  - All `@response` codes include data structure examples
  - POST/PUT/PATCH handlers include `@bodyContent`
  - Authenticated endpoints have `@security bearerAuth`
- Consider adding response schema references once Scalar exposes helpers for request/response typing.
