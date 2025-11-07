# Deployment Guide - Finance App

## 📋 Overview

This guide covers deploying the full-stack Finance App to production.

**Stack**: Next.js 16 + PostgreSQL + Prisma

**Recommended Platforms**:
- **Frontend/API**: Vercel, Netlify, or AWS
- **Database**: Railway, Supabase, Neon, or AWS RDS

---

## 🚀 Quick Deploy (Vercel + Railway)

### Step 1: Deploy Database (Railway)

1. **Create Railway Account**: https://railway.app
2. **Create New Project**
3. **Add PostgreSQL Database**
4. **Copy Connection String**:
   ```
   postgres://user:password@host:port/database
   ```

### Step 2: Deploy Application (Vercel)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Import to Vercel**: https://vercel.com
   - Connect GitHub repository
   - Configure project

3. **Add Environment Variables**:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret-key
   JWT_REFRESH_SECRET=your-refresh-secret
   API_VERSION=v1.0.0
   NODE_ENV=production
   ```

4. **Deploy**:
   - Vercel automatically builds and deploys
   - Runs Prisma migrations

---

## 🔧 Manual Deployment

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database accessible
- Domain name (optional)

### 1. Build Application
```bash
# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Build Next.js
npm run build

# Test production build locally
npm start
```

### 2. Database Setup

#### Option A: Existing PostgreSQL
```bash
# Set DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:port/database"

# Push schema (if new database)
npx prisma db push

# Or run migrations
npx prisma migrate deploy
```

#### Option B: Managed PostgreSQL (Railway/Supabase/Neon)
1. Create database instance
2. Copy connection string
3. Add to environment variables
4. Run migrations

### 3. Environment Variables

Create `.env.production`:
```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Secrets (Generate with: openssl rand -base64 32)
JWT_SECRET=your-production-secret-key
JWT_REFRESH_SECRET=your-production-refresh-secret

# API
API_VERSION=v1.0.0
NODE_ENV=production

# Next.js (Optional)
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### 4. Deploy to Server

#### Option A: VPS (DigitalOcean, AWS EC2, etc.)

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Clone repository
git clone https://github.com/your-username/finance-app.git
cd finance-app

# 4. Install dependencies
npm install

# 5. Setup environment
cp .env.example .env.production
nano .env.production  # Edit with your values

# 6. Build application
npm run build

# 7. Start with PM2
npm install -g pm2
pm2 start npm --name "finance-app" -- start
pm2 save
pm2 startup
```

#### Option B: Docker

**Dockerfile**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate

# Copy application
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/financeapp
      - JWT_SECRET=your-secret
      - JWT_REFRESH_SECRET=your-refresh-secret
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=financeapp
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Deploy**:
```bash
docker-compose up -d
```

---

## 🔐 Security Checklist

### Before Deployment

- [ ] **Generate Strong Secrets**
  ```bash
  # JWT Secret
  openssl rand -base64 32
  
  # JWT Refresh Secret
  openssl rand -base64 32
  ```

- [ ] **Update Environment Variables**
  - Set production DATABASE_URL
  - Set JWT_SECRET and JWT_REFRESH_SECRET
  - Set NODE_ENV=production

- [ ] **Remove Development Files**
  - Don't commit `.env.local`
  - Don't commit `.env.production`
  - Add to `.gitignore`

- [ ] **Database Security**
  - Use SSL connection (`?sslmode=require`)
  - Restrict database access by IP
  - Use strong database password

- [ ] **API Security**
  - Rate limiting (if using Vercel, it's built-in)
  - CORS configuration (if needed)
  - Input validation (already implemented)

### After Deployment

- [ ] **Test Authentication**
  - Register new user
  - Login works
  - Token refresh works

- [ ] **Test All Endpoints**
  - Run through TESTING_GUIDE.md
  - Verify all CRUD operations

- [ ] **Monitor Logs**
  - Check for errors
  - Monitor performance

- [ ] **Setup Monitoring** (Optional)
  - Sentry for error tracking
  - Vercel Analytics
  - PostgreSQL monitoring

---

## 🌐 Platform-Specific Guides

### Vercel

**Pros**:
- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Automatic Prisma setup

**Setup**:
1. Connect GitHub
2. Import project
3. Add environment variables
4. Deploy

**Build Command**: `npm run build` (auto-detected)  
**Output Directory**: `.next` (auto-detected)  
**Install Command**: `npm install` (auto-detected)

**Prisma Configuration**:
Vercel automatically runs:
```bash
npx prisma generate
npx prisma migrate deploy
```

### Netlify

**Setup**:
1. Connect GitHub
2. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
3. Add environment variables
4. Deploy

**netlify.toml**:
```toml
[build]
  command = "npx prisma generate && npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

### AWS (Amplify/Elastic Beanstalk)

**Amplify**:
1. Connect repository
2. Configure build:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
           - npx prisma generate
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: .next
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
3. Add environment variables
4. Deploy

---

## 📊 Database Management

### Migrations

**Development**:
```bash
# Create migration
npx prisma migrate dev --name description

# Apply migration
npx prisma migrate deploy
```

**Production**:
```bash
# Apply migrations
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status
```

### Backup

**PostgreSQL Backup**:
```bash
# Backup database
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

**Automated Backups** (Railway/Supabase):
- Built-in daily backups
- Point-in-time recovery
- Automatic snapshots

### Monitoring

**Check Database Health**:
```bash
# Connect to database
psql $DATABASE_URL

# Check table sizes
SELECT 
  relname as table,
  pg_size_pretty(pg_total_relation_size(relid)) as size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

# Check active connections
SELECT * FROM pg_stat_activity;
```

---

## 🚨 Troubleshooting

### Build Fails

**Error**: "Cannot find module '@prisma/client'"
```bash
# Solution
npx prisma generate
npm run build
```

**Error**: "DATABASE_URL environment variable not set"
```bash
# Solution
# Add DATABASE_URL to environment variables
```

### Database Connection Issues

**Error**: "Connection refused"
```bash
# Check:
1. Database is running
2. DATABASE_URL is correct
3. Network allows connection
4. SSL is configured if required
```

**Error**: "Too many connections"
```bash
# Solution: Use connection pooling
DATABASE_URL="postgresql://user:password@host:port/db?connection_limit=5"
```

### Runtime Errors

**Error**: "JWT secret not set"
```bash
# Solution: Add JWT_SECRET to environment
```

**Error**: "Invalid token"
```bash
# Check:
1. JWT_SECRET matches between deployments
2. Token hasn't expired
3. Token refresh is working
```

---

## 📈 Performance Optimization

### 1. Database Optimization

```prisma
// Add indexes to frequently queried fields
model transactions {
  // ...
  @@index([user_id, date])
  @@index([account_id])
  @@index([category_id])
  @@index([transfer_id])
  @@index([debt_id])
}
```

Apply indexes:
```bash
npx prisma db push
```

### 2. Connection Pooling

Use PgBouncer or connection pooling URL:
```bash
DATABASE_URL="postgresql://user:password@host:port/db?pgbouncer=true&connection_limit=1"
```

### 3. Caching

**Redis Cache** (Optional):
```typescript
// lib/cache.ts
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
})

// Cache user data
export async function getCachedUser(userId: string) {
  const cached = await redis.get(`user:${userId}`)
  if (cached) return cached
  
  // Fetch from database
  const user = await db.users.findUnique({ where: { id: userId } })
  await redis.set(`user:${userId}`, user, { ex: 3600 }) // 1 hour
  return user
}
```

### 4. CDN & Static Assets

**Vercel**: Automatic CDN  
**Other Platforms**: Use Cloudflare, CloudFront, or similar

---

## 🔄 CI/CD Pipeline

### GitHub Actions

**.github/workflows/deploy.yml**:
```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## ✅ Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] Application builds successfully
- [ ] Health check endpoint responds (/)
- [ ] Authentication works (register/login)
- [ ] Can create/read/update/delete resources
- [ ] Balance calculations correct
- [ ] Token refresh works
- [ ] Error logging configured
- [ ] Backups scheduled
- [ ] Monitoring setup
- [ ] Documentation updated
- [ ] Team notified

---

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Railway Docs**: https://docs.railway.app
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs

---

**Deployment Version**: 1.0.0  
**Last Updated**: 2025-11-07
