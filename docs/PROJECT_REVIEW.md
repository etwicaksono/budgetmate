# Finance App — Project Review and Improvement Suggestions

This review covers key aspects of the codebase based on files including [`package.json`](package.json:1), [`tsconfig.json`](tsconfig.json:1), [`RootLayout`](app/layout.tsx:1), [`ProtectedShell`](app/components/ProtectedShell.tsx:1), [`ApiService.request()`](src/services/api.ts:92), [`AuthProvider`](src/context/AuthContext.tsx:1), [`RequireAuth`](app/RequireAuth.tsx:1), [`TokenCrypto`](src/utils/crypto.ts:13), and centralized config [`src/config/index.ts`](src/config/index.ts).

Highlights
- Modern React with route guards and context-based auth.
- Centralized API layer with token refresh logic.
- Web Crypto AES-GCM for client-side token protection.

Cleanup Summary (2025-10-22)
- Removed MUI stack: @mui/material, @emotion/react, @emotion/styled; consolidated styling on Bootstrap per [`package.json`](package.json:12).
- Refactored toast notifications to react-bootstrap in [`ToastAlert`](src/components/ToastAlert.tsx:1).
- Deleted obsolete ambient module declaration [`src/types/toast-alert.d.ts`](src/types/toast-alert.d.ts:1) to prevent type shadowing.
- Restored and retained [`recharts`](package.json:20) due to active usage in [`Dashboard`](src/pages/Dashboard/Dashboard.tsx:1) and [`Reports`](src/pages/Reports/Reports.tsx:1), and fixed related typings for labels and data.
- Resolved ESLint warnings in pie label formatter within [`Reports`](src/pages/Reports/Reports.tsx:96).

Risks and Opportunities
- Current stack is Next.js 14 App Router.
- UI library consolidated to Bootstrap to reduce bundle size and inconsistency.
- Missing request timeouts and abort handling despite configured `timeout`.
- Broad any/unknown types reduce API type safety and error discoverability.
- TS target set to ES5 limits modern optimizations and can increase polyfill needs.

Architecture and Structure
- Consider feature-based directories (features/accounts, features/transactions) to co-locate page, components, hooks, and tests. Current pages and components separation is fine but can be improved for scalability.
- Barrel files are present (e.g., pages index.tsx), continue consistent exports to simplify imports.
- Add a global error boundary component to catch runtime errors and show a user-friendly fallback.

Routing and Code-Splitting
- Use Next.js App Router idioms. Prefer `dynamic(() => import(...))` for heavy charts/pages (Dashboard, Reports) to reduce initial bundle.
- Route protection is implemented via [`ProtectedShell`](app/components/ProtectedShell.tsx:1) and [`RequireAuth`](app/RequireAuth.tsx:1); keep this pattern and ensure a loading fallback.
- Align redirect behavior between login and protected areas using a single guard in [`RequireAuth`](app/RequireAuth.tsx:1) to ensure consistent back navigation.

TypeScript Configuration
- Update target and libs to modern standards for React 18:
  - Change compilerOptions.target from ES5 to ES2020+ and include "es2020", "dom" libs. Reference current target at [`tsconfig.json`](tsconfig.json:3).
- Introduce path aliases via tsconfig.compilerOptions.paths to reduce deep relative imports (e.g., @components, @pages, @services).
- Enable incremental builds if migrating to Vite or tsup; currently `"noEmit": true` is fine for React builds.

Dependency Management and Build Tooling
- Next.js 14 is in use; enable the Next.js ESLint plugin in [`package.json`](package.json:33) and consider `@next/bundle-analyzer` for bundle insights.
- UI library is consolidated to Bootstrap; avoid reintroducing parallel UI systems to keep CSS/JS overlap low.
- Lock TypeScript to a current major (TS 5.x) and align @typescript-eslint to matching major ranges.
- Add Prettier and an `.editorconfig`, and wire husky + lint-staged to enforce formatting on commit.

API Layer Improvements
- Respect configured timeouts by adding AbortController and timers inside [`ApiService.request()`](src/services/api.ts:92). Currently `API_CONFIG.timeout` is set in [`src/config/index.ts`](src/config/index.ts:31) but unused.
- Implement exponential backoff and jitter for transient 5xx or network failures before exhausting `retryAttempts`.
- Strengthen typing: define per-endpoint response/request interfaces and use generics consistently rather than `unknown`/`Record<string, unknown>`.
- Normalize non-JSON responses: replace the fallback `(response as unknown) as T` in [`ApiService.request()`](src/services/api.ts:146) with explicit handlers (blob/text) based on content-type.
- Centralize 401 handling: the current refresh logic in [`ApiService.refreshAccessToken()`](src/services/api.ts:275) is solid; consider delegating to [`authService.refreshToken`](src/services/authService.ts:138) for single source of truth.
- Add a small middleware layer for request/response transforms (e.g., automatic snake_case to camelCase conversion).

Authentication and Security
- Token storage: Encryption via AES-GCM in [`TokenCrypto.encryptToken()`](src/utils/crypto.ts:71) and decryption in [`TokenCrypto.decryptToken()`](src/utils/crypto.ts:106) is good. Add:
  - Key rotation policy and versioning inside the stored JWK; rotate on logout/login or after N days.
  - Fallback for environments without Web Crypto (SSR or older browsers) to avoid hard failures in [`TokenCrypto.ensureCrypto()`](src/utils/crypto.ts:29).
  - Attach token metadata (issuedAt/exp) and proactively logout/refresh slightly before expiry.
- Logout robustness: [`authService.logout`](src/services/authService.ts:106) clears storage even on API failure; keep that, and also invalidate refresh token server-side if supported.
- Consider secure cookies for refresh tokens to reduce XSS exposure; keep access token in memory or encrypted store.

Auth Context and UX
- Show toast feedback in [`AuthProvider`](src/context/AuthContext.tsx:236) using [`ToastAlert`](src/components/ToastAlert.tsx) which is good. Add:
  - Pending state and disable buttons during login/logout to prevent duplicate submissions.
  - Persist minimal user profile in storage under [`APP_CONFIG.storageKeys.userData`](src/config/index.ts:41) after encryption or at least schema validation.
- Extract AuthProvider side-effects (initial token check) into a dedicated hook for testability.

Error Handling and Observability
- Replace console.error with a logging utility that can fan out to Sentry/console depending on env.
- Add user-friendly messages for network errors and map common HTTP codes to guidance.
- Add a global error boundary using [`app/global-error.tsx`](app/global-error.tsx:1) or segment-level `error.tsx` to catch render errors.

Data Fetching and State
- Introduce TanStack Query for server state: caching, retries, background refresh, and mutation status would simplify logic across pages (e.g., transactions, budgets).
- Co-locate hooks with features; example: `useCategoryData.tsx` already exists—formalize pattern and testing around it.

Performance
- Lazy-load heavy pages and charts; [`recharts`](package.json:26) can be sizable—defer load until needed.
- Audit images in `public/images` and `src/images` for optimized sizes and WebP/AVIF formats where appropriate.
- Use React.memo and memoized selectors for frequently rendered lists (transactions).

Accessibility and i18n
- Ensure all interactive controls have accessible names and roles; ensure spinners in [`ProtectedShell`](app/components/ProtectedShell.tsx:1) and [`RequireAuth`](app/RequireAuth.tsx:1) include aria-live for loading states on complex pages.
- Plan for i18n using react-intl or i18next; externalize strings from pages.

Testing Strategy
- Add unit tests for utils: [`numericInput`](src/utils/numericInput.ts) and crypto.
- Add integration tests for auth flow covering [`RequireAuth`](app/RequireAuth.tsx:1) and the authenticated layout [`ProtectedShell`](app/components/ProtectedShell.tsx:1).
- Use MSW (Mock Service Worker) to simulate API responses and token refresh scenarios across [`ApiService.request()`](src/services/api.ts:92).

Documentation
- Expand [`README.md`](README.md) with environment variables, scripts, and workflow examples.
- Document API contract and error shapes referenced in [`ApiErrorResponse`](src/services/api.ts:12) for backend alignment.
- Add a CONTRIBUTING.md and CODING_STANDARDS.md to codify patterns.

CI/CD
- Add GitHub Actions for type-check, lint, test, and build on pull requests.
- Gate merges on passing checks and minimum coverage thresholds.

Environment and Configuration
- Ensure `.env.example` includes `API_BASE_URL` and other required keys; document defaults mirrored in [`API_CONFIG.baseURL`](src/config/index.ts:30).
- Consider runtime-config injection (window.__APP_CONFIG__) for containerized deployments rather than build-time env only.

Prioritized Action Plan
- High priority
  - Adopt dynamic imports for heavy charts/pages in Next.js and enable the Next.js ESLint plugin and bundle analyzer.
  - Implement request timeout and AbortController in [`ApiService.request()`](src/services/api.ts:92) with retry/backoff.
  - Consolidate UI library to a single system (Bootstrap is already selected).
  - Upgrade TypeScript to 5.x and set `target` to ES2020+ in [`tsconfig.json`](tsconfig.json:3).
- Medium priority
  - Introduce TanStack Query and error boundary.
  - Add Prettier, EditorConfig, husky + lint-staged, and GitHub Actions.
  - Expand tests with MSW and RTL for auth and API flows.
- Low priority
  - i18n groundwork, logging abstraction, key rotation, and runtime config.

Appendix: Suggested Code Snippets (outline)
- Abortable fetch wrapper for [`ApiService.request()`](src/services/api.ts:92) honoring [`API_CONFIG.timeout`](src/config/index.ts:31).
- React.lazy route setup in [`App.tsx`](src/App.tsx:31) with Suspense fallback.
- ErrorBoundary component usage wrapping [`App.tsx`](src/App.tsx:28).

End of review.