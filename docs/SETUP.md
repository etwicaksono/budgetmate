# Quick Setup Guide

## Prerequisites Checklist

Before running the application, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] PostgreSQL 14+ installed and running
- [ ] Git installed
- [ ] A code editor (VS Code recommended)

## Step-by-Step Setup

### 1. Database Setup

**Create the database:**
```bash
# Using psql
createdb finance_db

# Or manually in PostgreSQL
psql -U postgres
CREATE DATABASE finance_db;
\q
```

**Verify database exists:**
```bash
psql -l | grep finance_db
```

### 2. Environment Configuration

Create `.env` file in the project root with your database credentials:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/finance_db"
JWT_ACCESS_SECRET="your-access-secret-key-here"
JWT_REFRESH_SECRET="your-refresh-secret-key-here"
NEXT_PUBLIC_API_URL="http://localhost:3000/api/v1"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Important**: Replace `USERNAME` and `PASSWORD` with your PostgreSQL credentials.

### 3. Install Dependencies

```bash
npm install
```

### 4. Database Schema & Seeding

```bash
# Push schema to database (creates all tables)
npm run db:push

# Seed with default data (categories, accounts, demo user)
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Verification

### Test Database Connection

```bash
# Open Prisma Studio
npm run db:studio

# Should open http://localhost:5555
# You should see all tables: User, Account, Category, Transaction, etc.
```

### Test Registration

**Option 1: Using the UI**
1. Go to http://localhost:3000
2. Click "Create Account"
3. Fill in the form and submit

**Option 2: Using curl**
```bash
curl http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test123456!",
    "full_name": "Test User"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "test@example.com",
      "username": "testuser",
      "full_name": "Test User"
    },
    "access_token": "...",
    "refresh_token": "..."
  }
}
```

### Test Login with Demo Account

**Credentials:**
- Email: `demo@example.com`
- Password: `demo123456`

**Using UI:**
1. Go to http://localhost:3000
2. Click "Sign In"
3. Enter demo credentials
4. Should redirect to dashboard with sample data

**Using curl:**
```bash
curl http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email_or_username": "demo@example.com",
    "password": "demo123456"
  }'
```

## What Gets Created on Registration

When you register a new account, the system automatically creates:

### Categories (83 total)
**Income Categories (11):**
- Salary/Wages
- Freelance/Self-Employment
- Business Income
- Investment Income (Dividends, Interest, Rental, Capital Gains)
- Gifts/Donations Received
- Tax Refunds
- Other Income

**Expense Categories (72):**
- Housing (11 subcategories: Rent, Mortgage, Utilities, etc.)
- Transportation (8 subcategories: Fuel, Parking, Public Transit, etc.)
- Food (6 subcategories: Groceries, Dining Out, etc.)
- Healthcare (6 subcategories: Insurance, Doctor, Pharmacy, etc.)
- Entertainment (8 subcategories: Movies, Sports, Hobbies, etc.)
- Shopping (7 subcategories: Clothing, Electronics, etc.)
- Personal Care (4 subcategories: Haircuts, Cosmetics, etc.)
- Education (5 subcategories: Tuition, Books, etc.)
- Finance (5 subcategories: Bank Fees, Interest, etc.)
- Other (12 subcategories: Gifts, Donations, etc.)

### Default Accounts (3 total)
1. **Cash** - Starting balance: $500
2. **Checking Account** - Starting balance: $2,000
3. **Savings Account** - Starting balance: $5,000

**Total starting balance: $7,500**

### Demo User Sample Data
The demo user additionally includes:
- 41 sample transactions across different categories
- Mix of income and expenses
- Recent date range for testing

## Common Issues

### Issue: "Environment variable not found: DATABASE_URL"

**Solution:**
- Make sure `.env` file exists in the project root
- Verify the file contains `DATABASE_URL=`
- Run `npm run db:push` again

### Issue: "Connection refused" or "ECONNREFUSED"

**Solution:**
- Check if PostgreSQL is running: `pg_isready`
- Start PostgreSQL service if needed
- Verify port 5432 is not blocked

### Issue: "Database 'finance_db' does not exist"

**Solution:**
```bash
createdb finance_db
```

### Issue: Registration returns "INTERNAL_ERROR"

**Possible Causes:**
1. Database not seeded - Run `npm run db:seed`
2. Database schema not pushed - Run `npm run db:push`
3. PostgreSQL not running - Start PostgreSQL
4. Check server logs in terminal for specific error

### Issue: Styles not loading

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build

# Restart dev server
npm run dev
```

## Development Commands

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run lint             # Check for linting errors
npm run lint:fix         # Auto-fix linting errors
npm run type-check       # Check TypeScript types
npm run validate         # Run type-check + lint

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:seed          # Seed database with default data
npm run db:studio        # Open Prisma Studio (database GUI)
npm run db:reset         # Reset and re-seed database

# Testing (future)
npm run test             # Run tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
```

## Project Health Check

Run this to verify everything is working:

```bash
# 1. Type checking
npm run type-check

# 2. Linting
npm run lint

# 3. Build
npm run build

# 4. Database connection
npm run db:studio
```

All should complete without errors!

## Next Steps

After successful setup:

1. **Explore the Demo Account**: Login with demo credentials to see sample data
2. **Create Your Account**: Register with your own credentials
3. **Add Transactions**: Start tracking your income and expenses
4. **Create Categories**: Customize categories for your needs
5. **Set Up Accounts**: Add your real bank accounts

## Need Help?

- Check the main [README.md](./README.md) for detailed documentation
- Review error messages in the terminal
- Check PostgreSQL logs for database issues
- Verify all prerequisites are installed correctly

## Security Reminders

- Never commit `.env` files to version control
- Use strong passwords (minimum 8 characters with special characters)
- Change JWT secrets in production
- Keep dependencies updated
- Use HTTPS in production

---

Happy budgeting! 💰📊
