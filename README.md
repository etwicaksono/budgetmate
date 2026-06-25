# BudgetMate - Smart Finance, Simplified

Take control of your personal finances with BudgetMate. A comprehensive personal finance management application built with Next.js 16, React 19, TypeScript, Prisma 7, and PostgreSQL.

## Features

- **Authentication** - JWT-based auth with encrypted token storage and refresh token mutex
- **Account Management** - Track multiple accounts (checking, savings, credit cards, cash, investments, loans)
- **Transaction Tracking** - Record income and expenses with categorization, labels, drafts, and bulk operations
- **Transfers** - Transfer money between accounts with automatic paired-transaction handling
- **Budgets** - Category-based budgeting with period tracking and status overview
- **Debts** - Track lending and borrowing with increase/repayment flows
- **Labels** - Tag transactions with custom labels for finer filtering
- **Analytics** - Dashboard with charts: cashflow, balance trends, expenses by category, income vs expenses
- **Saved Filters** - Persist and reuse filter presets per context (transactions, analytics, budgets)
- **AI Chat** - AI-powered financial assistant (Google Gemini / OpenAI)
- **Backup** - Export and import data
- **Settings** - User preferences and account configuration
- **API Docs** - Interactive OpenAPI documentation via Scalar

## Tech Stack

- **Framework**: Next.js 16, React 19
- **Language**: TypeScript 5.9+ (strict mode)
- **Database**: PostgreSQL 16+ with Prisma ORM 7
- **Authentication**: JWT with `jose`, `bcryptjs` for password hashing, encrypted token storage
- **UI**: React Bootstrap 2.10 (primary), Tailwind CSS (utilities only)
- **Icons**: react-icons/fa (Font Awesome)
- **Alerts**: SweetAlert2
- **Forms**: react-number-format (numeric inputs)
- **Validation**: Zod 3.25+
- **Charts**: Recharts 3
- **AI**: Google Generative AI (`@google/generative-ai`), OpenAI SDK
- **API Docs**: `@asteasolutions/zod-to-openapi` + `@scalar/nextjs-api-reference`
- **Drag & Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Testing**: Jest, Playwright

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd budgetmate
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_app"

# JWT Secrets (generate strong secrets in production)
JWT_ACCESS_SECRET="your-super-secret-jwt-access-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-jwt-refresh-key-change-in-production"

# App Configuration
NEXT_PUBLIC_API_URL="http://localhost:3000/api/v1"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Set up the database

Create the PostgreSQL database:

```bash
createdb finance_app
```

Apply migrations:

```bash
npm run db:migrate
```

Seed the database with default data:

```bash
npm run db:seed
```

This will create:
- Default categories (income + expense)
- Default accounts (Cash, Checking, Savings)
- Demo user with sample transactions

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Account

After seeding, you can login with:
- **Email**: demo@example.com
- **Password**: demo123456

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (TZ=UTC) |
| `npm run build` | Generate Prisma client + build for production |
| `npm run build:migrate` | Generate Prisma client + deploy migrations + build |
| `npm start` | Start production server (TZ=UTC) |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run type-check` | Run TypeScript type checking |
| `npm run validate` | Run type-check and lint |
| `npm run validate:fix` | Run type-check and lint:fix |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting with Prettier |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Create and apply migration (dev) |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed database with default data |
| `npm run db:reset` | Reset and re-seed database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run test` | Run Jest tests |
| `npm run test:watch` | Run Jest in watch mode |
| `npm run test:coverage` | Run Jest with coverage |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run analyze` | Build with bundle analysis |

## Project Structure

```
budgetmate/
├── app/                          # Next.js app directory
│   ├── (auth)/                   # Authentication pages (login, register)
│   ├── (app)/                    # Protected app pages
│   │   ├── accounts/             # Account management + detail view
│   │   ├── analytics/            # Analytics dashboard with charts
│   │   ├── budgets/              # Budget tracking per category
│   │   ├── dashboard/             # Main dashboard with summary
│   │   ├── debts/                 # Debt tracking (lend/borrow)
│   │   ├── settings/              # User settings
│   │   ├── transactions/         # Transaction list with filters
│   │   └── transfers/            # Transfer history
│   ├── api/                       # API routes
│   │   ├── ai/                    # AI chat endpoints
│   │   └── v1/                    # REST API v1
│   │       ├── auth/              # Auth endpoints (login, register, refresh, logout)
│   │       ├── accounts/          # Account CRUD + swap order
│   │       ├── transactions/      # Transaction CRUD + bulk
│   │       ├── categories/       # Category CRUD + tree
│   │       ├── transfers/        # Transfer CRUD
│   │       ├── budgets/          # Budget CRUD + status
│   │       ├── debts/            # Debt CRUD + increase/repayments
│   │       ├── labels/           # Label CRUD
│   │       ├── saved-filters/    # Saved filter CRUD + reorder
│   │       ├── analytics/        # Analytics endpoints (7 chart types)
│   │       ├── backup/           # Export/import
│   │       └── user/             # User settings
│   ├── api-docs/                  # Scalar API documentation
│   ├── layout.tsx                # Root layout with providers
│   └── page.tsx                  # Home/landing page
├── src/
│   ├── components/               # React components (by domain)
│   │   ├── accounts/             # Account components
│   │   ├── analytics/            # Analytics components
│   │   ├── budgets/              # Budget components
│   │   ├── common/               # Shared components
│   │   ├── dashboard/            # Dashboard widgets
│   │   ├── debt/                 # Debt components
│   │   ├── FilterSidebar/        # Filter sidebar + saved filters
│   │   ├── forms/                # Form components
│   │   ├── label/                # Label components
│   │   ├── modals/               # Modal components
│   │   ├── period/               # Period navigation
│   │   ├── Records/              # Transaction record list
│   │   └── transaction/          # Transaction components
│   ├── context/                  # React Context providers
│   │   ├── AuthContext.tsx       # Auth actions
│   │   ├── AuthStateContext.tsx  # Auth state
│   │   ├── DebtContext.tsx       # Debt modal state
│   │   ├── LocaleContext.tsx     # Locale/i18n
│   │   ├── ToastContext.tsx      # Toast notifications
│   │   ├── TransactionContext.tsx # Transaction modal state
│   │   └── TransactionModalContext.tsx # Transaction form modal
│   ├── features/                 # Feature-oriented modules
│   │   ├── accounts/             # Account services + types
│   │   ├── analytics/            # Analytics services
│   │   ├── auth/                  # Auth hooks + services + types
│   │   ├── backup/               # Backup services + types
│   │   ├── budgets/              # Budget services + types
│   │   ├── categories/           # Category hooks + services + types
│   │   ├── debts/                # Debt hooks + services + types
│   │   ├── labels/               # Label services + types
│   │   ├── transactions/         # Transaction hooks + services + types
│   │   └── transfers/            # Transfer services + types
│   ├── hooks/                    # Shared React hooks
│   ├── lib/                      # Core libraries
│   │   ├── ai/                    # AI providers (Gemini, OpenAI)
│   │   ├── api/                   # API response helpers
│   │   ├── auth/                  # JWT + password utilities
│   │   ├── db/                    # Prisma client
│   │   ├── openapi/               # OpenAPI schemas + registry
│   │   ├── validation/            # Zod validation schemas
│   │   ├── eventBus.ts            # Typed event bus for cross-component comms
│   │   └── timezone.ts            # Timezone utilities
│   ├── services/                  # API service layer
│   ├── types/                     # Shared TypeScript types
│   ├── utils/                    # Utility functions
│   └── data/                      # Default data (categories, accounts)
├── prisma/
│   ├── schema.prisma              # Database schema (enums + models)
│   ├── seed.ts                   # Database seeder
│   └── migrations/               # SQL migrations
├── scripts/                      # Utility scripts
├── docs/                         # Documentation
└── public/                       # Static assets
```

## API Documentation

Interactive API docs are available at `/api-docs` when the server is running.

### Authentication

- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user

### Accounts

- `GET /api/v1/accounts` - List all accounts
- `POST /api/v1/accounts` - Create new account
- `GET /api/v1/accounts/[id]` - Get account details
- `PUT /api/v1/accounts/[id]` - Update account
- `DELETE /api/v1/accounts/[id]` - Delete account (soft delete)
- `POST /api/v1/accounts/swap-order` - Reorder accounts

### Transactions

- `GET /api/v1/transactions` - List transactions with filtering
- `POST /api/v1/transactions` - Create new transaction
- `GET /api/v1/transactions/[id]` - Get transaction details
- `PUT /api/v1/transactions/[id]` - Update transaction
- `DELETE /api/v1/transactions/[id]` - Delete transaction (soft delete, auto-deletes paired transfer)
- `POST /api/v1/transactions/bulk` - Bulk operations

### Categories

- `GET /api/v1/categories` - List all categories
- `GET /api/v1/categories/tree` - Get hierarchical category tree
- `POST /api/v1/categories` - Create new category
- `GET /api/v1/categories/[id]` - Get category details
- `PUT /api/v1/categories/[id]` - Update category
- `DELETE /api/v1/categories/[id]` - Delete category

### Transfers

- `GET /api/v1/transfers` - List all transfers
- `POST /api/v1/transfers` - Create new transfer
- `GET /api/v1/transfers/[id]` - Get transfer details
- `DELETE /api/v1/transfers/[id]` - Delete transfer

### Budgets

- `GET /api/v1/budgets` - List budgets
- `POST /api/v1/budgets` - Create/update budget
- `GET /api/v1/budgets/status` - Get budget status overview
- `PUT /api/v1/budgets/[category_id]` - Update budget for category
- `DELETE /api/v1/budgets/[category_id]` - Delete budget

### Debts

- `GET /api/v1/debts` - List all debts
- `POST /api/v1/debts` - Create new debt
- `GET /api/v1/debts/[id]` - Get debt details
- `PUT /api/v1/debts/[id]` - Update debt
- `DELETE /api/v1/debts/[id]` - Delete debt
- `POST /api/v1/debts/increase/[transactionId]` - Increase debt amount
- `GET /api/v1/debts/repayments` - List repayments

### Labels

- `GET /api/v1/labels` - List all labels
- `POST /api/v1/labels` - Create new label
- `PUT /api/v1/labels/[id]` - Update label
- `DELETE /api/v1/labels/[id]` - Delete label

### Saved Filters

- `GET /api/v1/saved-filters` - List saved filters (optional `?context=` filter)
- `POST /api/v1/saved-filters` - Create saved filter
- `PUT /api/v1/saved-filters/[id]` - Update saved filter
- `DELETE /api/v1/saved-filters/[id]` - Delete saved filter
- `POST /api/v1/saved-filters/reorder` - Reorder saved filters

### Analytics

- `GET /api/v1/analytics/balance-trend` - Balance over time
- `GET /api/v1/analytics/cashflow` - Cashflow chart data
- `GET /api/v1/analytics/expenses-by-category` - Expense breakdown
- `GET /api/v1/analytics/income-vs-expenses` - Income vs expense comparison
- `GET /api/v1/analytics/income-expense-report` - Detailed report
- `GET /api/v1/analytics/trends` - Trend analysis
- `GET /api/v1/analytics/advanced-charts` - Advanced chart data

### Backup

- `GET /api/v1/backup/export` - Export user data
- `POST /api/v1/backup/import` - Import user data

### User

- `GET /api/v1/user/settings` - Get user settings
- `PUT /api/v1/user/settings` - Update user settings

### AI

- `POST /api/ai/sessions` - Create AI chat session
- `GET /api/ai/sessions` - List sessions
- `POST /api/ai/sessions/[id]/messages` - Send message to AI
- `GET /api/ai/config` - Get AI configuration

## Architecture

### Context Provider Hierarchy

```
ToastProvider
  └─ AuthStateProvider
      └─ AuthProvider
          └─ TransactionModalProvider
              └─ DebtProvider
                  └─ LocaleProvider
```

### Event System

Cross-component communication uses a typed event bus (`src/lib/eventBus.ts`):

- `dispatchAppEvent(name, payload)` - Dispatch typed events
- `onAppEvent(name, handler)` - Subscribe to typed events

All event names and payloads are defined in a single `AppEventMap` type for compile-time safety.

### Authentication Flow

1. User registers/logs in via API
2. Server generates JWT access and refresh tokens
3. Tokens are encrypted and stored in localStorage
4. AuthContext manages authentication state
5. Protected routes check authentication status
6. Token automatically refreshes when expired (with mutex to prevent concurrent refresh races)

### Data Flow

1. **User Action** → Component triggers action
2. **Service Layer** → API service makes HTTP request
3. **API Route** → Server-side handler processes request
4. **Prisma ORM** → Database query executed
5. **Response** → Data flows back through layers
6. **Event Bus** → Typed event dispatched for cross-component updates
7. **UI Update** → Components re-render with new data

## Security Features

- Password hashing with bcryptjs
- JWT authentication with token rotation
- Token encryption for client-side storage
- Refresh token mutex to prevent race conditions
- Input validation with Zod
- SQL injection protection via Prisma
- Protected API routes requiring authentication
- Soft deletes for data recovery
- CORS restricted to `NEXT_PUBLIC_APP_URL`

## Development

### Code Quality

```bash
npm run validate      # Type-check + lint
npm run validate:fix  # Type-check + lint with auto-fix
npm run format        # Format with Prettier
```

### Database Management

```bash
npm run db:studio     # Open Prisma Studio at http://localhost:5555
npm run db:migrate    # Create and apply new migration
npm run db:reset      # Reset and re-seed database
```

## Troubleshooting

### Database Connection Issues

1. Ensure PostgreSQL is running
2. Verify `DATABASE_URL` in `.env` file
3. Check database exists: `psql -l`
4. Test connection: `psql postgresql://postgres:postgres@localhost:5432/finance_app`

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Prisma Issues

```bash
npx prisma generate  # Regenerate Prisma client
npx prisma migrate deploy  # Apply pending migrations
npx prisma migrate status  # Check migration status
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
