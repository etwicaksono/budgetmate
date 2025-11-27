# Seed Script Guide

## Overview

The seed script (`prisma/seed.ts`) creates demo data for development and testing purposes. It includes:

- Demo user account (email: `demo@example.com`, password: `demo123456`)
- Default income and expense categories
- Default accounts (Cash, Checking, Savings, Credit Card)
- Sample transactions for the last 30 days

## Automatic Seeding is DISABLED

By default, the seed script will **NOT** run automatically after migrations. This prevents unwanted demo data from being created in your database.

## Manual Seeding

You can manually run the seed script anytime using:

```bash
# Run the seed script manually
npm run db:seed
```

Or directly with Prisma:

```bash
npx prisma db seed
```

## When to Use Seeding

### ✅ Use seeding when:

- Setting up a **development environment**
- Creating a **demo/test database**
- Need sample data for **testing features**
- Onboarding new developers who need realistic data

### ❌ Don't use seeding for:

- **Production databases** (never!)
- **Staging environments** with real user data
- When you already have data in the database

## Database Setup Workflows

### Option 1: Fresh Database WITHOUT Demo Data (Recommended for Clean Start)

```bash
# 1. Drop and recreate database
psql -U postgres
DROP DATABASE finance_temp;
CREATE DATABASE finance_temp;
\q

# 2. Run migrations (seed will NOT auto-run)
npx prisma migrate dev --name init_with_cuid

# 3. Generate Prisma Client
npx prisma generate

# 4. Start with empty database - register your own user via the app
```

### Option 2: Fresh Database WITH Demo Data (For Development/Testing)

```bash
# 1. Drop and recreate database
psql -U postgres
DROP DATABASE finance_temp;
CREATE DATABASE finance_temp;
\q

# 2. Run migrations
npx prisma migrate dev --name init_with_cuid

# 3. Generate Prisma Client
npx prisma generate

# 4. Manually run seed to create demo data
npm run db:seed

# 5. Login with demo credentials
# Email: demo@example.com
# Password: demo123456
```

### Option 3: Reset Database with Fresh Seed Data

If you want to completely reset your database and reseed:

```bash
# This will:
# 1. Drop the database
# 2. Create a new database
# 3. Run all migrations
# 4. Run seed script (if configured)
npx prisma migrate reset

# Note: Since auto-seed is disabled, you'll need to manually seed:
npm run db:seed
```

## Seed Script Contents

The seed script creates:

### 1. Demo User
- **Email**: `demo@example.com`
- **Password**: `demo123456`
- **Username**: `demo`
- **Full Name**: Demo User

### 2. Default Categories

**Income Categories:**
- Salary
- Business income
- Gifts
- Other Income
- etc.

**Expense Categories (with subcategories):**
- Food & Drinks
  - Groceries
  - Restaurant, fast-food
  - Cafe, bars
- Shopping
  - Clothes & shoes
  - Electronics, accessories
  - Health & beauty
- Housing
  - Rent
  - Mortgage
  - Energy, utilities
- Transportation
  - Public transport
  - Taxi
  - Fuel
- And more...

### 3. Default Accounts
- Cash (account_type: cash)
- Checking Account (account_type: checking)
- Savings Account (account_type: savings)
- Credit Card (account_type: credit_card)

### 4. Sample Transactions
- 30 days of random transactions
- Mix of income and expenses
- Realistic amounts and categories
- Account balances automatically updated

## Customizing Seed Data

To modify what gets seeded, edit these files:

### Default Categories
Edit: `src/data/default_categories.json`

```json
{
  "income": [
    { "name": "Salary", "icon": "FaBriefcase", "color": "#4CAF50" }
  ],
  "expense": {
    "Food & Drinks": {
      "icon": "FaUtensils",
      "color": "#FF5722",
      "children": [
        { "name": "Groceries", "icon": "FaShoppingBasket" }
      ]
    }
  }
}
```

### Default Accounts
Edit: `src/data/default_accounts.json`

```json
[
  {
    "personal_id": 1,
    "name": "Cash",
    "account_type": "cash",
    "icon": "FaWallet",
    "color": "#4CAF50",
    "currency": "USD",
    "initial_balance": 1000,
    "is_active": true,
    "is_included_in_total": true
  }
]
```

### Transaction Generation Logic
Edit: `prisma/seed.ts` - modify the `createSampleTransactions()` function

## Checking If Database Is Seeded

```bash
# Check if demo user exists
npx prisma studio

# Or use SQL
psql -U postgres finance_temp
SELECT email FROM "User" WHERE email = 'demo@example.com';
```

## Troubleshooting

### Seed Already Ran
If you run the seed script multiple times, it will:
1. Check if demo user exists
2. Check if categories already exist
3. Skip seeding if data is found

To force re-seed:
```bash
npx prisma migrate reset  # Drops and recreates everything
npm run db:seed           # Re-seed with fresh data
```

### Seed Script Errors
Common issues:

**Error: "User already exists"**
- The demo user already exists in your database
- Either skip seeding or reset the database

**Error: "Category already exists"**
- Default data already loaded
- The seed script will automatically skip if data exists

**Error: "Cannot find module"**
- Run `npm install` to ensure all dependencies are installed
- Check that `ts-node` is installed (dev dependency)

## Re-enabling Auto-Seed (Not Recommended)

If you want to re-enable automatic seeding after migrations, add this back to `package.json`:

```json
{
  "scripts": { ... },
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  },
  "dependencies": { ... }
}
```

**Warning**: This will run the seed script every time you run `prisma migrate dev` or `prisma migrate reset`.

## Best Practices

1. ✅ **Never seed production** - Only use for development/testing
2. ✅ **Keep seed data realistic** - Helps catch real-world issues
3. ✅ **Update seed with schema changes** - Keep seed script in sync
4. ✅ **Document seed credentials** - Make it easy for team members
5. ✅ **Use environment-specific configs** - Different data for dev/test/staging
