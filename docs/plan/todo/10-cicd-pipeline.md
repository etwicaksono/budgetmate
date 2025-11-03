# CI/CD Pipeline Setup

## Objective
Implement automated CI/CD pipeline for testing, building, and deploying the Finance Web Application.

## Implementation Prompt

```
Set up comprehensive CI/CD pipeline with:

1. CONTINUOUS INTEGRATION
- Automated testing on every commit
- Code quality checks
- Security vulnerability scanning
- Build verification
- Performance testing

2. CONTINUOUS DEPLOYMENT
- Staging environment auto-deploy
- Production deployment with approval
- Blue-green deployments
- Rollback capabilities
- Environment-specific configs

3. MONITORING & ALERTS
- Build status notifications
- Deployment tracking
- Error monitoring
- Performance monitoring
- Uptime monitoring
```

## GitHub Actions Configuration

### 1. Main CI Pipeline
```yaml
# .github/workflows/ci.yml
name: Continuous Integration

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18.x'

jobs:
  lint:
    name: Lint Code
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Check formatting
        run: npm run format:check

  type-check:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run TypeScript compiler
        run: npm run type-check

  test:
    name: Run Tests
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:ci
      
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

  build:
    name: Build Application
    runs-on: ubuntu-latest
    needs: [lint, type-check, test]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build application
        run: npm run build
        env:
          NEXT_PUBLIC_API_BASE_URL: ${{ secrets.API_BASE_URL }}
      
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build-files
          path: .next/
          retention-days: 7
      
      - name: Analyze bundle size
        run: |
          npm run analyze -- --json > bundle-stats.json
          echo "Bundle size analysis completed"
      
      - name: Check bundle size limits
        run: npx size-limit

  security:
    name: Security Scan
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Snyk Security Scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=medium
      
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      
      - name: Upload security results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: snyk.sarif

  lighthouse:
    name: Lighthouse CI
    runs-on: ubuntu-latest
    needs: build
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Download build artifacts
        uses: actions/download-artifact@v3
        with:
          name: build-files
          path: .next/
      
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

### 2. Deployment Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

jobs:
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    if: github.event.inputs.environment == 'staging' || github.ref_type == 'tag'
    environment:
      name: staging
      url: https://staging.finance.app
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for staging
        run: npm run build:staging
        env:
          NEXT_PUBLIC_API_BASE_URL: ${{ secrets.STAGING_API_URL }}
          NEXT_PUBLIC_APP_ENV: staging
      
      - name: Deploy to Vercel Staging
        run: |
          npx vercel --prod \
            --token=${{ secrets.VERCEL_TOKEN }} \
            --env NEXT_PUBLIC_API_BASE_URL=${{ secrets.STAGING_API_URL }} \
            --build-env NEXT_PUBLIC_API_BASE_URL=${{ secrets.STAGING_API_URL }}
      
      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TEST_URL: https://staging.finance.app
      
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "Staging deployment completed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "✅ Staging deployment successful\n*Version:* ${{ github.ref_name }}\n*URL:* https://staging.finance.app"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: deploy-staging
    if: github.event.inputs.environment == 'production' || startsWith(github.ref, 'refs/tags/v')
    environment:
      name: production
      url: https://finance.app
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for production
        run: npm run build
        env:
          NEXT_PUBLIC_API_BASE_URL: ${{ secrets.PRODUCTION_API_URL }}
          NEXT_PUBLIC_APP_ENV: production
      
      - name: Run production tests
        run: npm run test:production
      
      - name: Deploy to Vercel Production
        run: |
          npx vercel --prod \
            --token=${{ secrets.VERCEL_TOKEN }} \
            --env NEXT_PUBLIC_API_BASE_URL=${{ secrets.PRODUCTION_API_URL }} \
            --build-env NEXT_PUBLIC_API_BASE_URL=${{ secrets.PRODUCTION_API_URL }}
      
      - name: Verify deployment
        run: |
          curl -f https://finance.app || exit 1
      
      - name: Create release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref_name }}
          release_name: Release ${{ github.ref_name }}
          body: |
            Production deployment completed
            
            ## Changes
            ${{ github.event.head_commit.message }}
          draft: false
          prerelease: false
      
      - name: Notify team
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "🚀 Production deployment completed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "🎉 *Production deployment successful*\n*Version:* ${{ github.ref_name }}\n*URL:* https://finance.app\n*Deployed by:* ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 3. Rollback Workflow
```yaml
# .github/workflows/rollback.yml
name: Rollback Production

on:
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to rollback to'
        required: true

jobs:
  rollback:
    name: Rollback to Previous Version
    runs-on: ubuntu-latest
    environment:
      name: production
    
    steps:
      - uses: actions/checkout@v3
        with:
          ref: ${{ github.event.inputs.version }}
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build previous version
        run: npm run build
        env:
          NEXT_PUBLIC_API_BASE_URL: ${{ secrets.PRODUCTION_API_URL }}
      
      - name: Deploy rollback
        run: |
          npx vercel --prod \
            --token=${{ secrets.VERCEL_TOKEN }} \
            --env NEXT_PUBLIC_API_BASE_URL=${{ secrets.PRODUCTION_API_URL }}
      
      - name: Notify rollback
        uses: slackapi/slack-github-action@v1
        with:
          payload: |
            {
              "text": "⚠️ Production rollback completed",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "⏮️ *Production rolled back*\n*To version:* ${{ github.event.inputs.version }}\n*Initiated by:* ${{ github.actor }}"
                  }
                }
              ]
            }
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

### 4. Lighthouse CI Configuration
```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      url: ['http://localhost:3000'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
```

### 5. Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000

CMD ["node", "server.js"]
```

## Success Criteria
- [ ] CI runs on every commit
- [ ] All tests passing
- [ ] Security scans implemented
- [ ] Auto-deploy to staging
- [ ] Manual approval for production
- [ ] Rollback capability working
- [ ] Monitoring and alerts configured
