# Contributing Guide

This project’s public API surface lives under `app/api/v1/**`. Every handler must publish consumer-friendly metadata so Scalar can generate a readable `/api/openapi` spec. Follow the steps below before sending a pull request.

## 1. JSDoc Requirements

1. Add a `/** ... */` JSDoc block immediately above every exported HTTP handler (`GET`, `POST`, etc.).
2. Each block **must** include `@summary`, `@description`, `@tag`, and at least one `@response` entry.
3. Add `@security bearerAuth` to any route that requires authentication.
4. Include `@bodyContent {Type}` when the handler accepts JSON payloads (describe the shape inline until richer tooling becomes available).
5. Keep summaries imperative (“Create account”), note important validation rules in the description, and list expected error responses (`400`, `401`, `404`, `409`, `500`, etc.).
6. Pick a tag from [`docs/api-tags.md`](./api-tags.md). If you need a new tag, document it there before using it.

## 2. Local Verification

Before opening a PR:

1. `npm install` (once) and update your `.env` as usual.
2. Run the code linters:  
   ```bash
   npm run lint
   ```
3. Run the JSDoc enforcement script (fails if a handler misses `@summary` or `@tag`):  
   ```bash
   npm run lint:jsdoc
   ```
4. Smoke the OpenAPI endpoint:
   ```bash
   npm run dev &
   DEV_PID=$!
   curl -s http://localhost:3000/api/openapi | head
   kill $DEV_PID
   ```
   Confirm the JSON contains your new `@summary`/`@description` text. (On Windows, start `npm run dev` in a second terminal and visit `http://localhost:3000/api/openapi`.)

## 3. Commit Checklist

- [ ] All handlers touched in this change include up-to-date JSDoc blocks.
- [ ] `npm run lint` and `npm run lint:jsdoc` pass.
- [ ] `/api/openapi` reflects the intended summaries/descriptions when running `npm run dev`.
- [ ] Documentation updates (README, `docs/api-tags.md`, etc.) were made when introducing new tags or conventions.

## 4. Continuous Integration Notes

- `npm run lint:jsdoc` is safe to run in CI to guard against undocumented handlers.
- Extend this script or add an ESLint rule if we need deeper validation (e.g., enforcing `@response` coverage).
- Future automation ideas live in `docs/add-jsdoc.md#follow-up-tasks`.
