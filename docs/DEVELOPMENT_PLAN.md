# Development Plan - Feature Improvements & New Features

**Created:** 2025-11-25  
**Status:** Active  
**Last Updated:** 2025-11-25

---

## 📊 Current Implementation Analysis

### ✅ Fully Implemented (Core Features)

| Feature | API | Frontend | Notes |
|---------|-----|----------|-------|
| Authentication | ✅ | ✅ | Login, register, refresh, logout |
| Accounts CRUD | ✅ | ✅ | Create, edit, delete, list |
| Transactions CRUD | ✅ | ✅ | With filters, pagination |
| Categories | ✅ | ✅ | Hierarchical tree, CRUD |
| Transfers | ✅ | ✅ | Multi-currency support |
| Labels | ✅ | ✅ | Create, assign to transactions |
| Personal IDs | ✅ | ✅ | User-specific sequences |
| Analytics (Basic) | ✅ | ✅ | Trends, expenses by category |
| Dashboard | ✅ | ✅ | Widgets, balance display |
| Settings | ✅ | ✅ | User preferences, locale |

### ⚠️ Partially Implemented

| Feature | API | Frontend | Gap |
|---------|-----|----------|-----|
| Budgets | ⚠️ Status only | ❌ None | Missing CRUD API & UI |
| Analytics | ⚠️ Basic | ⚠️ Basic | Missing cashflow, reports |

### ❌ Not Implemented (From Docs)

| Feature | Doc Reference | Priority |
|---------|---------------|----------|
| Recurring Transactions | Schema exists, no API/UI | High |
| Goals | Schema exists, no API/UI | Medium |
| Attachments | Schema exists, no API/UI | Medium |
| Account Groups | Schema exists, no API/UI | Low |
| Backup/Restore | Doc 11 | Medium |
| Theme System | Doc 12 | Low |
| Google Sheets Sync | Doc 13 | Low |
| Google Drive Attachments | Doc 15 | Low |
| Unit/Integration Tests | Doc 14 | High |

---

## 🎯 Priority Development Roadmap

### Phase 1: Core Feature Completion (High Priority)

#### 1.1 Budget Management System
**Effort:** 3-4 days  
**Value:** High - Core financial planning feature

**Tasks:**
- [ ] Create Budget CRUD API endpoints
  - `GET /api/v1/budgets` - List budgets
  - `POST /api/v1/budgets` - Create budget
  - `GET /api/v1/budgets/[id]` - Get budget detail
  - `PUT /api/v1/budgets/[id]` - Update budget
  - `DELETE /api/v1/budgets/[id]` - Delete budget
- [ ] Create Budget UI page (`app/(app)/budgets/page.tsx`)
- [ ] Budget creation modal with category selection
- [ ] Budget progress visualization (progress bars)
- [ ] Budget vs actual comparison
- [ ] Over-budget alerts/notifications

**Schema:** Already exists in Prisma (Budget, BudgetCategory)

---

#### 1.2 Recurring Transactions
**Effort:** 3-4 days  
**Value:** High - Automates regular transactions

**Tasks:**
- [ ] Create Recurring Transaction API endpoints
  - `GET /api/v1/recurring` - List recurring transactions
  - `POST /api/v1/recurring` - Create recurring
  - `PUT /api/v1/recurring/[id]` - Update
  - `DELETE /api/v1/recurring/[id]` - Delete
  - `POST /api/v1/recurring/[id]/process` - Manually trigger
- [ ] Create Recurring Transactions UI page
- [ ] Recurring transaction form (frequency, interval, dates)
- [ ] Auto-generation logic (cron job or on-demand)
- [ ] Next occurrence calculation
- [ ] Skip/pause functionality

**Schema:** Already exists (RecurringTransaction)

---

#### 1.3 Testing Infrastructure
**Effort:** 2-3 days  
**Value:** High - Code quality & reliability

**Tasks:**
- [ ] Set up Jest configuration
- [ ] Set up testing utilities (mock prisma, mock auth)
- [ ] Write unit tests for critical business logic:
  - Amount sign convention
  - Personal ID generation
  - Transfer creation
  - Balance calculation
- [ ] Write API integration tests
- [ ] Set up CI pipeline for tests

---

### Phase 2: Enhanced Features (Medium Priority)

#### 2.1 Goals/Savings Targets
**Effort:** 2-3 days  
**Value:** Medium - Savings motivation feature

**Tasks:**
- [ ] Create Goals API endpoints
- [ ] Goals UI page with progress tracking
- [ ] Link goals to accounts
- [ ] Goal contribution tracking
- [ ] Goal completion celebrations

**Schema:** Already exists (Goal)

---

#### 2.2 Transaction Attachments
**Effort:** 2-3 days  
**Value:** Medium - Receipt/invoice storage

**Tasks:**
- [ ] Create Attachments API endpoints
- [ ] File upload handling (local storage initially)
- [ ] Attachment preview in transaction detail
- [ ] File type validation (images, PDFs)
- [ ] Storage limits

**Schema:** Already exists (Attachment)

---

#### 2.3 Enhanced Analytics
**Effort:** 3-4 days  
**Value:** Medium - Better financial insights

**Tasks:**
- [ ] Cashflow analysis endpoint
- [ ] Income vs expense comparison
- [ ] Category spending trends over time
- [ ] Monthly/yearly summaries
- [ ] Export reports (CSV, PDF)
- [ ] Enhanced charts and visualizations

---

#### 2.4 Backup & Restore
**Effort:** 2 days  
**Value:** Medium - Data safety

**Tasks:**
- [ ] JSON export endpoint (all user data)
- [ ] Import endpoint with validation
- [ ] Conflict resolution for imports
- [ ] UI for export/import in settings

**Reference:** Doc 11

---

### Phase 3: Nice-to-Have Features (Low Priority)

#### 3.1 Account Groups
**Effort:** 1-2 days

**Tasks:**
- [ ] Account Groups API
- [ ] Group accounts in UI
- [ ] Group-level balance totals

---

#### 3.2 Theme System
**Effort:** 2-3 days

**Tasks:**
- [ ] Dark/Light mode toggle
- [ ] Theme persistence
- [ ] Custom accent colors

**Reference:** Doc 12

---

#### 3.3 Google Integrations
**Effort:** 5+ days each

- Google Sheets Sync (Doc 13)
- Google Drive Attachments (Doc 15)

---

## 📋 Quick Wins (Can Do Now)

These are small improvements that can be done quickly:

| Improvement | Effort | Impact |
|-------------|--------|--------|
| Add swap-order endpoint for accounts | 2 hours | Better UX |
| Add bulk delete for transactions | 2 hours | Better UX |
| Add transaction search by description | 1 hour | Better UX |
| Add category usage stats | 2 hours | Insights |
| Add account transaction count | 1 hour | Info |
| Improve error messages | 2 hours | Better UX |
| Add loading skeletons | 2 hours | Better UX |

---

## 🔧 Technical Debt

| Item | Priority | Notes |
|------|----------|-------|
| Consolidate `context/` and `contexts/` folders | Medium | Two folders exist |
| Add comprehensive error boundaries | Medium | Prevent crashes |
| Implement request caching | Low | Performance |
| Add rate limiting to all endpoints | Medium | Security |
| Remove mock data service | Low | Cleanup |

---

## 📅 Suggested Timeline

### Week 1-2: Core Features
- Budget Management (4 days)
- Recurring Transactions (4 days)
- Testing setup (2 days)

### Week 3: Enhanced Features
- Goals (3 days)
- Attachments (2 days)

### Week 4: Analytics & Polish
- Enhanced Analytics (3 days)
- Backup/Restore (2 days)

### Week 5+: Optional Features
- Account Groups
- Theme System
- Google Integrations

---

## 🚀 Recommended Starting Point

**Start with: Budget Management**

Why:
1. Schema already exists - just needs API + UI
2. High user value - core financial planning
3. Relatively self-contained feature
4. Good complexity for establishing patterns

**Second: Recurring Transactions**

Why:
1. Schema exists
2. Reduces manual data entry
3. Builds on transaction system

---

## 📝 Notes

- All new features should follow existing patterns in codebase
- Use React Bootstrap for UI (not Tailwind components)
- Follow amount sign convention (expenses negative)
- Always filter by user_id
- Write tests for critical business logic
- Update this document as features are completed
