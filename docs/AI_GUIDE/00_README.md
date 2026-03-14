# 🤖 AI Agent Guide - Personal Finance Management Application

## Overview

**Status: ✅ PRODUCTION READY** - The core application is complete. This guide serves as architecture reference for maintenance and new feature development.

This is a personal finance management application built with Next.js 15+ and PostgreSQL, following a monolithic architecture with strict REST API separation.

## 🎯 Before Adding Features - MANDATORY READING

### **⚡ Quick Reference:**
- **[00C_QUICK_START_SUMMARY.md](./00C_QUICK_START_SUMMARY.md)** - Architecture overview and key patterns

### **📖 Essential References:**
- **[00A_UI_UX_REFERENCE.md](./00A_UI_UX_REFERENCE.md)** - UI patterns (React Bootstrap, NOT Tailwind)
- **[00B_CODE_PRINCIPLES.md](./00B_CODE_PRINCIPLES.md)** - SOLID, DRY, KISS principles
- **[09_CRITICAL_RULES.md](./09_CRITICAL_RULES.md)** - **MUST-FOLLOW** rules (amount signs, transfers, etc.)

**Review these before making any changes to ensure consistency.**

---

## 📚 Guide Structure

This implementation guide is split into the following documents:

### Core Documents
1. **[01_PROJECT_STRUCTURE.md](./01_PROJECT_STRUCTURE.md)** - Complete project structure and setup instructions
   - **[01A_STRICT_CONFIGS.md](./01A_STRICT_CONFIGS.md)** - Strict TypeScript & ESLint configurations for bug prevention
2. **[02_DATABASE_SCHEMA.md](./02_DATABASE_SCHEMA.md)** - Full PostgreSQL database schema with Prisma
3. **[03_AUTHENTICATION_SYSTEM.md](./03_AUTHENTICATION_SYSTEM.md)** - JWT authentication and authorization
4. **[04_API_IMPLEMENTATION.md](./04_API_IMPLEMENTATION.md)** - Complete REST API implementation
5. **[05_FRONTEND_FOUNDATION.md](./05_FRONTEND_FOUNDATION.md)** - Frontend architecture and components
   - ⚠️ **NOTE**: This document references Tailwind CSS. **IGNORE Tailwind/Shadcn references.** Use React Bootstrap patterns instead.
   - **[05A_FRONTEND_UI_OVERRIDE.md](./05A_FRONTEND_UI_OVERRIDE.md)** - 🚨 **MANDATORY OVERRIDE**: React Bootstrap implementation guide (replaces UI sections from Document 05)
6. **[06_CONTEXT_STATE_MANAGEMENT.md](./06_CONTEXT_STATE_MANAGEMENT.md)** - React Context and state management
7. **[07_DEFAULT_DATA_SEEDING.md](./07_DEFAULT_DATA_SEEDING.md)** - Default categories and accounts
8. **[08_SERVICES_LAYER.md](./08_SERVICES_LAYER.md)** - API service layer implementation
9. **[09_CRITICAL_RULES.md](./09_CRITICAL_RULES.md)** - Critical implementation rules and conventions
10. **[10_IMPLEMENTATION_CHECKLIST.md](./10_IMPLEMENTATION_CHECKLIST.md)** - Validation checklist and common issues

### 🚀 Additional Features (Optional)
11. **[11_BACKUP_RESTORE_FEATURE.md](./11_BACKUP_RESTORE_FEATURE.md)** - Data export/import for backup and restore
12. **[12_THEME_SYSTEM.md](./12_THEME_SYSTEM.md)** - Complete theming system with dark/light/custom modes
    - **[12A_THEME_API_ENDPOINTS.md](./12A_THEME_API_ENDPOINTS.md)** - API endpoints for theme preferences
13. **[13_GOOGLE_SHEETS_INTEGRATION.md](./13_GOOGLE_SHEETS_INTEGRATION.md)** - Bidirectional Google Sheets sync using personal_id as key
    - **[13A_GOOGLE_SHEETS_FRONTEND_SERVICE.md](./13A_GOOGLE_SHEETS_FRONTEND_SERVICE.md)** - Frontend service implementation
14. **[14_TESTING_REQUIREMENTS.md](./14_TESTING_REQUIREMENTS.md)** - 🚨 **MANDATORY**: Unit, integration, and E2E testing requirements
15. **[15_GOOGLE_DRIVE_ATTACHMENTS.md](./15_GOOGLE_DRIVE_ATTACHMENTS.md)** - Transaction attachments stored in user's Google Drive
    - **[15A_GOOGLE_ECOSYSTEM_INTEGRATION.md](./15A_GOOGLE_ECOSYSTEM_INTEGRATION.md)** - Complete Google ecosystem overview

---

## 🎯 Key Requirements

### Technical Stack

**⚠️ UPDATED: Use React Bootstrap, NOT Tailwind/Shadcn**

- **Frontend**: Next.js 15+, React 19, TypeScript 5.3+
- **UI Framework**: ~~Tailwind CSS~~, ~~Shadcn UI~~ → **React Bootstrap 2.10+** (see [00A_UI_UX_REFERENCE.md](./00A_UI_UX_REFERENCE.md))
- **Icons**: react-icons/fa (Font Awesome)
- **Alerts**: SweetAlert2 (user confirmations and toasts)
- **Forms**: react-number-format (numeric inputs)
- **Drag & Drop**: @dnd-kit (sortable lists/widgets)
- **State**: React Context API (primary), Zustand (optional for complex state)
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL 16+, Prisma ORM 5.8+
- **Auth**: JWT (jose library), bcryptjs
- **Validation**: Zod 3.22+
- **Charts**: Recharts or Chart.js (reference old project)
- **Date Handling**: date-fns or native Intl API

### Architecture Principles
1. **Monolithic with API Separation**: Frontend and backend in same codebase but communicate only via REST APIs
2. **Type Safety**: End-to-end TypeScript with strict mode
3. **Security First**: JWT authentication, encrypted token storage, input validation
4. **User Isolation**: Multi-tenant architecture with user_id filtering
5. **Extensible Design**: New features can be added without breaking existing functionality (see docs 11 & 12 for examples)

### Core Features
- Multi-account management (bank, cash, credit cards)
- Transaction tracking with categories and labels
- Hierarchical category system (70+ default categories)
- Budget management and tracking
- Analytics and reporting
- Transfer between accounts
- Data import/export
- Recurring transactions
- **Data Backup & Restore** (JSON export/import) - Document 11
- **Theme System** (Dark/Light/Custom themes) - Document 12
- **Google Sheets Sync** (Bidirectional sync with personal_id as key) - Document 13
- **Transaction Attachments** (Store receipts/invoices in Google Drive) - Document 15

## 🚀 Implementation Phases

### Phase 1: Foundation (Day 1-2)
- Project initialization
- Database setup
- Environment configuration
- Folder structure creation

### Phase 2: Backend Core (Day 3-4)
- JWT authentication system
- Auth endpoints with auto-seeding
- Middleware implementation
- Response builders

### Phase 3: API Endpoints (Day 5-7)
- Account management
- Transaction CRUD with personal_id logic
- Category hierarchy
- Transfer system
- Analytics endpoints

### Phase 4: Frontend Foundation (Day 8-9)
- UI framework setup
- Context providers
- Service layer
- Authentication pages

### Phase 5: Dashboard Features (Day 10-12)
- Dashboard layout
- Account management UI
- Transaction modal
- Category tree
- Analytics charts

### Phase 6: Testing & Polish (Day 13-14)
- Unit testing
- Integration testing
- Performance optimization
- Security audit
- Bug fixes

## ⚠️ Critical Conventions

### 1. Amount Sign Convention
```typescript
// ALWAYS:
// - Expenses: NEGATIVE amounts
// - Income: POSITIVE amounts
const expense = -100.00;  // $100 expense
const income = 500.00;    // $500 income
```

### 2. Personal ID System
Each user has their own sequential numbering:
- User A: Transaction #1, #2, #3...
- User B: Transaction #1, #2, #3...

### 3. Context Provider Order
```tsx
<ToastProvider>           // Level 1
  <AuthStateProvider>     // Level 2
    <AuthProvider>        // Level 3
      <TransactionModalProvider> // Level 4
```

### 4. API Response Format
```typescript
// Success
{ success: true, data: {...}, meta: {...} }

// Error
{ success: false, error: { code: "...", message: "..." } }
```

## 📂 Required File Structure

```
finance-app/
├── app/                    # Next.js App Router
├── src/
│   ├── components/        # UI components
│   ├── context/          # React contexts
│   ├── services/         # API services
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Core utilities
│   ├── types/           # TypeScript types
│   ├── utils/           # Helper functions
│   └── data/            # Static data
├── prisma/              # Database
├── public/              # Static assets
└── tests/               # Test files
```

## 🔍 How to Use This Guide

### Step 0: Prerequisites (MUST DO FIRST)
1. **Read [00A_UI_UX_REFERENCE.md](./00A_UI_UX_REFERENCE.md)** - Understand the existing UI patterns
2. **Read [00B_CODE_PRINCIPLES.md](./00B_CODE_PRINCIPLES.md)** - Understand SOLID, DRY, KISS principles
3. **Browse `../old/` codebase** - Familiarize yourself with the existing implementation

### Step 1: Implementation Flow
1. **Start with Document 01**: Read the project structure guide first
2. **Follow Sequentially**: Each document builds on the previous
3. **Reference Old Code**: When implementing a feature, ALWAYS check the equivalent in `../old/`
4. **Refactor, Don't Copy**: Use SOLID/DRY/KISS principles to improve code quality while maintaining functionality
5. **Test Each Phase**: Verify each implementation phase before proceeding
6. **Check Document 09**: Review critical rules before implementing each feature

### Step 2: Quality Checks (After EACH Document)
⚠️ **CRITICAL: After EACH document implementation**:
   - Run `npx tsc --noEmit` to verify TypeScript has 0 errors
   - Run `npm run lint` to verify ESLint has 0 errors  
   - Run `npm test` to verify all tests pass
   - ✅ **Check the relevant section in Document 10 checklist**
   - **Write tests** for the features you just implemented (see Document 14)
   - **Visual comparison**: Compare UI side-by-side with old project

### Step 3: Validation
7. **Use Document 10**: Final validation checklist for the complete implementation
8. **UI/UX Verification**: Ensure pixel-perfect consistency with old project

## 🎯 Success Criteria

The implementation is successful when:
- All 13 database tables are created correctly
- User registration creates 70+ categories and 3 default accounts
- JWT authentication works with encrypted token storage
- All CRUD operations follow REST conventions
- Transactions use proper amount sign convention
- Transfers create two linked transactions
- Personal IDs are user-specific and sequential
- All contexts work in the correct hierarchy
- Analytics calculate accurately
- The app is production-ready

## 🆘 Support References

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Shadcn UI Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook)

## 📝 Important Notes

1. **Follow Existing Patterns**: Match the codebase conventions
2. **TypeScript Strict**: Use strict mode, avoid 'any' types
3. **Error Handling**: Implement at every level
4. **Testing**: Test with real data, not just mocks
5. **Documentation**: Document any new features appropriately

---

## 📁 Documentation File Guidelines

**IMPORTANT: When creating documentation, follow these rules:**

| Document Type | Location | Example |
|--------------|----------|---------|
| Feature docs | `docs/` | `docs/RECURRING_TRANSACTIONS.md` |
| Architecture guides | `docs/ai-guide/` | `docs/ai-guide/16_NEW_FEATURE.md` |
| Bug fixes/session logs | `docs/archive/` | `docs/archive/2025-01-15_BUG_FIX.md` |

**❌ DO NOT** create `.md` files in the project root directory.
**✅ DO** place all documentation in the `docs/` folder structure.

See [docs/README.md](../README.md) for complete documentation guidelines.

---

**Reference [09_CRITICAL_RULES.md](./09_CRITICAL_RULES.md) before making changes.**
