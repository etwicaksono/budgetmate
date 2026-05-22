# BudgetMate - Smart Finance, Simplified

Take control of your personal finances with BudgetMate. A comprehensive personal finance management application built with Next.js 15+, TypeScript, Prisma, and PostgreSQL.

## Features

- 🔐 **Authentication System** - Secure JWT-based authentication with token encryption
- 💰 **Account Management** - Track multiple accounts (checking, savings, credit cards, cash, investments)
- 💳 **Transaction Tracking** - Record income and expenses with detailed categorization
- 📊 **Categories** - Hierarchical category system with 70+ pre-configured categories
- 🔄 **Transfers** - Transfer money between accounts with automatic balance updates
- 📈 **Dashboard** - Overview of financial health with summary cards
- 🎨 **Modern UI** - Responsive design with React Bootstrap
- 🔒 **Type-Safe** - Full TypeScript coverage with strict mode

## Tech Stack

- **Frontend**: Next.js 15+, React 19, TypeScript 5.3+
- **Backend**: Next.js API Routes, Prisma ORM 5.8+
- **Database**: PostgreSQL 16+
- **Authentication**: JWT with jose library, bcryptjs for password hashing
- **UI Framework**: React Bootstrap 2.10+ (primary), Tailwind CSS (utilities only)
- **Icons**: react-icons/fa (Font Awesome)
- **Alerts**: SweetAlert2
- **Forms**: react-number-format (numeric inputs)
- **Validation**: Zod 3.22+
- **State Management**: React Context API, Zustand
- **Charts**: Recharts

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

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
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_db"

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
createdb finance_db
```

Push the Prisma schema to the database:

```bash
npm run db:push
```

Seed the database with default data:

```bash
npm run db:seed
```

This will create:
- 83 default categories (11 income + 72 expense)
- 3 default accounts (Cash, Checking, Savings)
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

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run type-check` - Run TypeScript type checking
- `npm run validate` - Run type-check and lint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema to database
- `npm run db:seed` - Seed database with default data
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
budgetmate/
├── app/                      # Next.js app directory
│   ├── (auth)/              # Authentication pages (login, register)
│   ├── dashboard/           # Protected dashboard pages
│   ├── api/v1/              # API routes
│   │   ├── auth/           # Authentication endpoints
│   │   ├── accounts/       # Account management endpoints
│   │   ├── transactions/   # Transaction endpoints
│   │   ├── categories/     # Category endpoints
│   │   └── transfers/      # Transfer endpoints
│   ├── layout.tsx          # Root layout with providers
│   └── page.tsx            # Home/landing page
├── src/
│   ├── components/         # React components
│   │   ├── DashboardLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── ProtectedRoute.tsx
│   ├── context/           # React Context providers
│   │   ├── ToastContext.tsx
│   │   ├── AuthStateContext.tsx
│   │   ├── AuthContext.tsx
│   │   └── TransactionModalContext.tsx
│   ├── services/          # API service layer
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── accountService.ts
│   │   ├── transactionService.ts
│   │   ├── categoryService.ts
│   │   ├── transferService.ts
│   │   └── analyticsService.ts
│   ├── lib/               # Utility libraries
│   │   ├── auth/         # JWT and password utilities
│   │   ├── api/          # API response builders
│   │   └── validation/   # Zod schemas
│   ├── utils/            # Utility functions
│   └── data/             # Default data (categories, accounts)
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Database seeder
└── tests/                # Test files (future)

```

## API Documentation

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

### Transactions

- `GET /api/v1/transactions` - List transactions with filtering
- `POST /api/v1/transactions` - Create new transaction
- `GET /api/v1/transactions/[id]` - Get transaction details
- `PUT /api/v1/transactions/[id]` - Update transaction
- `DELETE /api/v1/transactions/[id]` - Delete transaction (soft delete)

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

## Architecture

### Context Provider Hierarchy

The application uses a specific provider hierarchy for proper dependency management:

```
ToastProvider (Level 1)
  └─ AuthStateProvider (Level 2)
      └─ AuthProvider (Level 3)
          └─ TransactionModalProvider (Level 4)
```

### Authentication Flow

1. User registers/logs in via API
2. Server generates JWT access and refresh tokens
3. Tokens are encrypted and stored in localStorage
4. AuthContext manages authentication state
5. Protected routes check authentication status
6. Token automatically refreshes when expired

### Data Flow

1. **User Action** → Component triggers action
2. **Service Layer** → API service makes HTTP request
3. **API Route** → Server-side handler processes request
4. **Prisma ORM** → Database query executed
5. **Response** → Data flows back through layers
6. **Context Update** → Global state updated if needed
7. **UI Update** → Component re-renders with new data

## Security Features

- ✅ Password hashing with bcryptjs
- ✅ JWT authentication with token rotation
- ✅ Token encryption for client-side storage
- ✅ Rate limiting on authentication endpoints
- ✅ Input validation with Zod
- ✅ SQL injection protection via Prisma
- ✅ Protected API routes requiring authentication
- ✅ Soft deletes for data recovery

## Development

### Code Quality

The project maintains high code quality standards:

- **TypeScript Strict Mode** - All strict flags enabled
- **ESLint** - Comprehensive linting rules
- **Type Coverage** - 100% TypeScript coverage
- **Zero Warnings** - No lint or type warnings

Run quality checks:

```bash
npm run validate  # Runs type-check and lint
```

### Database Management

View and manage database:

```bash
npm run db:studio  # Opens Prisma Studio at http://localhost:5555
```

Reset database:

```bash
npm run db:reset  # Resets and re-seeds database
```

## Troubleshooting

### Database Connection Issues

If you get database connection errors:

1. Ensure PostgreSQL is running
2. Verify DATABASE_URL in `.env` file
3. Check database exists: `psql -l`
4. Test connection: `psql postgresql://postgres:postgres@localhost:5432/finance_db`

### Port Already in Use

If port 3000 is in use:

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### Prisma Issues

If Prisma throws errors:

```bash
npx prisma generate  # Regenerate Prisma client
npx prisma db push   # Re-sync database schema
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built following modern Next.js best practices
- UI inspired by popular finance management applications
- Architecture designed for scalability and maintainability
