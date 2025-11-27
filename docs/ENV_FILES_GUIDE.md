# Environment Files Guide

## Which File is Used?

### Priority Order (Highest to Lowest)

1. **`.env.local`** ✅ - Used by Prisma migrations (highest priority)
2. `.env` - Used as fallback if `.env.local` doesn't exist

### Current Setup

Both files exist in your project:

- **`.env`** - Committed to git, contains example/default values
- **`.env.local`** - Gitignored, contains your actual local configuration

**For Prisma migrations, `.env.local` is used!**

## Current Database Configs

### .env (Committed to Git)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_temp"
```

### .env.local (Local Only, Gitignored)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_temp"
```

**Currently both point to the same database: `finance_temp`**

## How Prisma Loads Environment Variables

When you run Prisma commands:

```bash
npx prisma migrate dev
npx prisma db push
npx prisma studio
```

Prisma loads environment variables in this order:
1. `.env.local` (if exists) ⬅️ **Your migrations use this!**
2. `.env` (if exists and `.env.local` doesn't)
3. System environment variables

## Best Practices

### ✅ Recommended Setup

**`.env`** (Committed to Git)
- Contains **example values** and **documentation**
- Safe to commit (no real credentials)
- Team members copy this to create their `.env.local`

```env
# Database - Example configuration
# Copy this file to .env.local and update with your actual values
DATABASE_URL="postgresql://postgres:password@localhost:5432/finance_app"

# JWT Secrets - Generate your own strong secrets
JWT_ACCESS_SECRET="change-me-to-a-random-string"
JWT_REFRESH_SECRET="change-me-to-another-random-string"
```

**`.env.local`** (Gitignored, Local Only)
- Contains **actual values** for your local development
- Never committed to git
- Each developer has their own version

```env
# Database - My actual local database
DATABASE_URL="postgresql://postgres:mypassword@localhost:5432/finance_temp"

# JWT Secrets - My actual secrets
JWT_ACCESS_SECRET="my-actual-super-secret-key-abc123xyz"
JWT_REFRESH_SECRET="my-actual-refresh-secret-key-def456uvw"
```

### Current Gitignore Status

```gitignore
.env*.local   ✅ Ignored (correct)
.env          ⚠️ NOT ignored (tracked in git)
```

## Verifying Which Database is Used

To confirm which database Prisma will use:

```bash
# Check the DATABASE_URL that Prisma sees
npx prisma db execute --stdin <<< "SELECT current_database();"

# Or check environment variable
echo $env:DATABASE_URL  # Windows PowerShell
```

## Different Databases for Different Purposes

You can use different database configurations in each file:

### .env (Example for team)
```env
# Example database name
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_app"
```

### .env.local (Your actual config)
```env
# Option 1: Development database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_dev"

# Option 2: Testing database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_test"

# Option 3: Your personal database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_myname"
```

## Switching Databases

To use a different database for migrations:

### Option 1: Edit .env.local (Recommended)
```bash
# Edit .env.local
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/my_new_db"

# Run migration
npx prisma migrate dev --name init_with_cuid
```

### Option 2: Temporary Override (One-time)
```bash
# Windows PowerShell
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/temp_db"
npx prisma migrate dev --name test_migration

# Linux/Mac
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/temp_db" npx prisma migrate dev --name test_migration
```

### Option 3: Create Additional Env Files
```bash
# Create separate env files for different environments
.env.development  # Development database
.env.test         # Testing database
.env.staging      # Staging database

# Use specific file
npx dotenv -e .env.test -- npx prisma migrate dev
```

## Common Scenarios

### Scenario 1: Fresh Database Setup

```bash
# 1. Create new database
psql -U postgres
CREATE DATABASE finance_fresh;
\q

# 2. Update .env.local
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_fresh"

# 3. Run migrations (uses .env.local automatically)
npx prisma migrate dev --name init_with_cuid
```

### Scenario 2: Multiple Developers

**Developer A (.env.local)**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_alice"
```

**Developer B (.env.local)**
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_bob"
```

Both developers use the same `.env` (example values) but have their own `.env.local` with personal databases.

### Scenario 3: CI/CD Pipeline

In CI/CD, you typically:
1. Don't have `.env.local` (gitignored)
2. Set `DATABASE_URL` as environment variable
3. Use `.env` as fallback for other non-secret values

```yaml
# GitHub Actions example
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Troubleshooting

### Migration uses wrong database

**Check which file exists and has priority:**
```bash
# Check if .env.local exists
Test-Path .env.local  # Windows PowerShell

# View current DATABASE_URL
Get-Content .env.local | Select-String "DATABASE_URL"
```

**Solution:** Update DATABASE_URL in `.env.local` (not `.env`)

### Can't connect to database

**Check connection string format:**
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# Example with special characters in password (URL encode them)
DATABASE_URL="postgresql://user:p%40ssw0rd@localhost:5432/mydb"
```

**Verify database exists:**
```bash
psql -U postgres -l | grep finance_temp
```

### Changes in .env not taking effect

**Remember:** `.env.local` overrides `.env`!

**Solution:** Update `.env.local` instead:
```bash
# Edit the correct file
code .env.local  # Or use any text editor
```

## Summary

| File | Used For | Committed to Git | Priority |
|------|----------|------------------|----------|
| `.env.local` | **Actual local values** | ❌ No (gitignored) | 🥇 **Highest** |
| `.env` | Example/default values | ✅ Yes (tracked) | 🥈 Fallback |
| System ENV | CI/CD, production | N/A | 🥉 Lowest |

**For your migrations: Edit `.env.local` to change the database!**
