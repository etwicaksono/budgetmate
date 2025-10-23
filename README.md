# FinanceApp — Personal Finance Management (Next.js + TypeScript)

FinanceApp is a personal finance web application built with Next.js App Router and TypeScript. It helps you track income and expenses, manage budgets, and visualize your financial health.

Features

- User authentication (login/register), protected routes, and session handling
- Dashboard with accounts overview and widgets
- Transaction management with categories, notes, and quick entry
- Budgeting per category with progress indicators
- Reports and analytics with charts (spending breakdown, income vs expense, cash flow)
- Settings for categories, currencies, and templates

Tech Stack

- Next.js (App Router) [package.json](package.json)
- React 18, TypeScript 5 [tsconfig.json](tsconfig.json)
- React Bootstrap [app/layout.tsx](app/layout.tsx:1)
- Recharts for data visualization [package.json](package.json)
- SweetAlert2 for alerts [package.json](package.json)

Quick Start

- Prerequisites: Node.js 18.18+ and npm 9+
- Install dependencies:
  - npm install
- Run the dev server:
  - npm run dev
- Open http://localhost:3000
- Production build:
  - npm run build
  - npm start
- Lint:
  - npm run lint

Environment Variables

- API base URL: REACT_APP_API_BASE_URL
  - Example: http://localhost:8080/api/v1
  - Default: If not set, [API_CONFIG.baseURL](src/config/index.ts:30) falls back to http://localhost:8080/api/v1
- Create a .env.local file in the project root to override defaults.
- Note: This project currently reads REACT_APP_* in client code via [src/config/index.ts](src/config/index.ts:29). If you prefer Next.js public envs, use NEXT_PUBLIC_API_BASE_URL and update [src/config/index.ts](src/config/index.ts:29) accordingly, or expose variables through [next.config.js](next.config.js:1).

Scripts

- dev: next dev
- build: next build
- start: next start
- lint: next lint

Project Structure

app/
- layout.tsx
- providers.tsx
- RequireAuth.tsx
- components/
  - ProtectedShell.tsx
- accounts/
  - page.tsx
- budgets/
  - page.tsx
- login/
  - page.tsx
- register/
  - page.tsx
- reports/
  - page.tsx
- settings/
  - page.tsx
- transactions/
  - page.tsx

src/
- components/
  - Header.tsx
  - PeriodNavigation.tsx
  - PeriodRangeSelector.tsx
  - ToastAlert.tsx
- context/
  - AuthContext.tsx
- features/
  - transactions/
    - Transactions.tsx and related components
- services/
  - api.ts
  - authService.ts
- styles/
  - App.css
  - main.css
- utils/
  - crypto.ts
- views/
  - Accounts/, Budgets/, Dashboard/, Reports/, settings/

Key Implementation Notes

- API client: [ApiService.request()](src/services/api.ts:92) centralizes fetch calls, JSON handling, and token refresh on 401.
- Token refresh: When access token is invalid, a refresh is attempted via /auth/refresh; on failure, auth is cleared and the user is redirected to /login.
- Auth context: [useAuth](src/context/AuthContext.tsx:81) and [AuthProvider](src/context/AuthContext.tsx:89) manage login/logout and encrypted token storage with toasts.
- Route protection: [ProtectedShell](app/components/ProtectedShell.tsx:1) wraps pages in a container and [RequireAuth](app/RequireAuth.tsx:1) enforces authentication with a loading spinner.
- Crypto: Client-side AES-GCM encryption utilities live in [src/utils/crypto.ts](src/utils/crypto.ts); keys are managed via [APP_CONFIG.storageKeys](src/config/index.ts:38).
- Global styles and Bootstrap are imported in [app/layout.tsx](app/layout.tsx:1).

Security and Storage

- Access and refresh tokens are encrypted before being stored in localStorage.
- Storage keys and timeouts are centralized in [APP_CONFIG](src/config/index.ts:35) and [CRYPTO_CONFIG](src/config/index.ts:47).

Troubleshooting

- API base URL not set: The default [API_CONFIG.baseURL](src/config/index.ts:30) is used.
- Unexpected logout: If refresh fails, [ApiService.request()](src/services/api.ts:92) clears auth and navigates to /login.

Documentation and Roadmap

- See the in-depth review and suggestions in [docs/PROJECT_REVIEW.md](docs/PROJECT_REVIEW.md:1).