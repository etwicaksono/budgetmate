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
 * @response 200 - Success response description
 * @response 400 - Validation failure
 * @response 401 - Authentication failed
 */
export async function GET(request: NextRequest) { … }
```

Guidelines:
- Always include `@summary`, `@description`, `@tag`, and `@response` entries.
- Add `@security bearerAuth` to any route that requires authentication.
- If a handler accepts a JSON body, include `@bodyContent {Type}` or mention payload shape in the description until Scalar adds richer support.
- Keep `@summary` imperative/present tense (e.g., “List accounts”).

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
     2. Mention important query params, request bodies, and side-effects in the description.
     3. Enumerate key response codes (`200`, `201`, `204`, `400`, `401`, `404`, `409`, `500` as applicable).
     4. Include `@tag` and `@security` when relevant.
   - If a file exports multiple handlers (e.g., both `GET` and `POST`) annotate each separately.

4. **Verify Spec Generation**
   - Run `npm run dev`.
   - Visit `http://localhost:3000/api/openapi` and confirm each route now shows your summary/description.
   - For automated verification, add a future CI step that fetches `/api/openapi/schema.json` and ensures it contains no placeholder summaries.

5. **Code Review Checklist**
   - Every handler must have JSDoc.
   - Tag, summary, and description match naming conventions.
   - Error responses documented whenever the handler throws.

## Rollout Phases By Scope

### Phase 1 – Authentication & Accounts (baseline)
Focus on endpoints that gate access or power account management. Blocker for every other phase.

| Path | Status | Notes |
| --- | --- | --- |
| `auth/login/route.ts` | ✅ Done |  |
| `auth/logout/route.ts` | ✅ Done |  |
| `auth/refresh/route.ts` | ✅ Done |  |
| `auth/register/route.ts` | ✅ Done |  |
| `accounts/route.ts` | ✅ Done |  |
| `accounts/[id]/route.ts` | ✅ Done |  |
| `accounts/swap-order/route.ts` | ✅ Done |  |

✅ Exit Criteria:
- All auth/account routes show meaningful summaries and describe auth requirements in `/api/openapi`.

### Phase 2 – Catalog Metadata (Categories & Groups)
Document the taxonomy primitives the rest of the app relies on.

| Path | Status | Notes |
| --- | --- | --- |
| `categories/route.ts` | ✅ Done |  |
| `categories/[id]/route.ts` | ✅ Done |  |
| `categories/swap-order/route.ts` | ✅ Done |  |
| `categories/tree/route.ts` | ✅ Done |  |
| `groups/route.ts` | ✅ Done |  |
| `groups/[id]/route.ts` | ✅ Done |  |

✅ Exit Criteria:
- Category/group endpoints document tree semantics, reordering side effects, and error cases.

### Phase 3 – Money Movement (Transactions, Transfers, Debts)
Highest-surface routes; include detailed request/response documentation.

| Path | Status | Notes |
| --- | --- | --- |
| `transactions/route.ts` | ✅ Done |  |
| `transactions/[id]/route.ts` | ✅ Done |  |
| `transactions/summary/route.ts` | ✅ Done |  |
| `transfers/route.ts` | ✅ Done |  |
| `transfers/[id]/route.ts` | ✅ Done |  |
| `debts/route.ts` | ✅ Done |  |
| `debts/[id]/route.ts` | ✅ Done |  |

✅ Exit Criteria:
- Scalar UI highlights the intent of every money-moving endpoint, including validation failures and balance-impact notes.

### Phase 4 - Polish & Automation
- ✅ `/api/openapi` verification steps documented in `docs/CONTRIBUTING.md` (curl script + smoke checklist).
- ✅ Converted placeholder status marks (☐/☑) to ✅ so scope tracking stays accurate.
- ✅ Added `docs/api-tags.md`, refreshed `docs/CONTRIBUTING.md`, and introduced `npm run lint:jsdoc` for CI enforcement.

## Follow-Up Tasks
- ✅ Added a custom script (`npm run lint:jsdoc`) so CI can fail when a handler lacks `@summary`/`@tag`.
- ✅ Documented the tag list and sample workflow in `docs/api-tags.md` + `docs/CONTRIBUTING.md`.
- Consider adding response schema references once Scalar exposes helpers for request/response typing.
