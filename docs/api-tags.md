# API Tag Reference

The OpenAPI tags used throughout `app/api/v1/**` group handlers by the problem they solve so Scalar renders friendly sections. Use the table below when creating new routes.

| Tag | Description | Representative Routes |
| --- | --- | --- |
| Auth | Login, registration, logout, and token refresh flows. | `app/api/v1/auth/*` |
| Accounts | CRUD + ordering endpoints for financial accounts. | `app/api/v1/accounts/**` |
| Categories | Category catalog, reordering, and tree views. | `app/api/v1/categories/**` |
| Groups | Account grouping endpoints. | `app/api/v1/groups/**` |
| Transactions | Single-transaction CRUD plus list/summary APIs. | `app/api/v1/transactions/**` |
| Transfers | Money movement between two accounts (and linked transactions). | `app/api/v1/transfers/**` |
| Debts | Payable/receivable trackers and their transaction history. | `app/api/v1/debts/**` |

## Authoring Checklist

1. Pick exactly one tag per handler from the table above (add new tags sparingly and document them here first).
2. Keep `@summary` ≤ 10 words and present-tense (e.g., “List accounts”).
3. Use `@description` for business context (auth, validation, side-effects).
4. Include `@security bearerAuth` on every authenticated endpoint.
5. Enumerate meaningful `@response` entries (`200/201` + relevant errors).
6. When a JSON body is required, add a `@bodyContent {Type}` line that outlines the payload shape.
