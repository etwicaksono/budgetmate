# Finance App Documentation

## Project Status: ✅ Production Ready

The application rewrite is complete. This documentation now serves as reference for **maintenance and new feature development**.

---

## 📝 Documentation Guidelines for AI Agents

**IMPORTANT: When creating new documentation, follow these rules:**

### File Location Rules
| Document Type | Location | Naming Convention |
|--------------|----------|-------------------|
| Feature documentation | `docs/` | `FEATURE_NAME.md` (e.g., `RECURRING_TRANSACTIONS.md`) |
| Architecture/implementation guides | `docs/ai-guide/` | `XX_TOPIC_NAME.md` (e.g., `16_NEW_FEATURE.md`) |
| Bug fixes, session logs, analysis | `docs/archive/` | `YYYY-MM-DD_DESCRIPTION.md` or `DESCRIPTIVE_NAME.md` |
| API documentation | `docs/` | `API_FEATURE_NAME.md` |

### ❌ DO NOT
- Create `.md` files in the project root directory
- Use generic names like `NOTES.md`, `TODO.md`, `TEMP.md`
- Create documentation outside the `docs/` folder

### ✅ DO
- Place all documentation in appropriate `docs/` subdirectory
- Use SCREAMING_SNAKE_CASE for filenames
- Include date prefix for session/historical docs in archive
- Update `docs/README.md` when adding significant new documentation

---

## 📚 Documentation Structure

### Developer Guides (docs/)
| Document | Description |
|----------|-------------|
| [SETUP.md](./SETUP.md) | Quick start setup guide |
| [ENV_FILES_GUIDE.md](./ENV_FILES_GUIDE.md) | Environment configuration |
| [MAKEFILE_GUIDE.md](./MAKEFILE_GUIDE.md) | Build commands reference |
| [SEED_GUIDE.md](./SEED_GUIDE.md) | Database seeding guide |
| [GLOBAL_TRANSACTION_MODAL.md](./GLOBAL_TRANSACTION_MODAL.md) | Transaction modal system |
| [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) | Code usage examples |

### Architecture Reference (docs/ai-guide/)
Core implementation documentation - use as reference when adding features:

| Document | Description |
|----------|-------------|
| [00_README.md](./ai-guide/00_README.md) | Architecture overview |
| [00A_UI_UX_REFERENCE.md](./ai-guide/00A_UI_UX_REFERENCE.md) | UI patterns (React Bootstrap) |
| [00B_CODE_PRINCIPLES.md](./ai-guide/00B_CODE_PRINCIPLES.md) | SOLID, DRY, KISS principles |
| [01_PROJECT_STRUCTURE.md](./ai-guide/01_PROJECT_STRUCTURE.md) | Folder structure |
| [02_DATABASE_SCHEMA.md](./ai-guide/02_DATABASE_SCHEMA.md) | Prisma schema reference |
| [03_AUTHENTICATION_SYSTEM.md](./ai-guide/03_AUTHENTICATION_SYSTEM.md) | JWT auth system |
| [04_API_IMPLEMENTATION.md](./ai-guide/04_API_IMPLEMENTATION.md) | REST API patterns |
| [05_FRONTEND_FOUNDATION.md](./ai-guide/05_FRONTEND_FOUNDATION.md) | Frontend architecture |
| [06_CONTEXT_STATE_MANAGEMENT.md](./ai-guide/06_CONTEXT_STATE_MANAGEMENT.md) | React Context patterns |
| [09_CRITICAL_RULES.md](./ai-guide/09_CRITICAL_RULES.md) | **Must-follow rules** |

### Optional Features (docs/ai-guide/)
| Document | Description |
|----------|-------------|
| [11_BACKUP_RESTORE_FEATURE.md](./ai-guide/11_BACKUP_RESTORE_FEATURE.md) | Data export/import |
| [12_THEME_SYSTEM.md](./ai-guide/12_THEME_SYSTEM.md) | Theming system |
| [13_GOOGLE_SHEETS_INTEGRATION.md](./ai-guide/13_GOOGLE_SHEETS_INTEGRATION.md) | Google Sheets sync |
| [15_GOOGLE_DRIVE_ATTACHMENTS.md](./ai-guide/15_GOOGLE_DRIVE_ATTACHMENTS.md) | File attachments |

### Archive (docs/archive/)
Historical documents from development sessions - bug fixes, migrations, analysis docs.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15+, React 19, TypeScript |
| **UI Framework** | React Bootstrap, react-icons/fa, SweetAlert2 |
| **Backend** | Next.js API Routes |
| **Database** | PostgreSQL 16+, Prisma ORM |
| **Auth** | JWT (jose), bcryptjs |
| **Validation** | Zod |
| **State** | React Context, Zustand |

---

## ⚠️ Critical Rules

Before making changes, review [09_CRITICAL_RULES.md](./ai-guide/09_CRITICAL_RULES.md):

1. **Amount Signs**: Expenses = negative, Income = positive
2. **Personal IDs**: User-specific sequential numbering
3. **Transfers**: Must create TWO linked transactions
4. **Provider Order**: Toast → AuthState → Auth → TransactionModal
5. **User Isolation**: Always filter by user_id
6. **Token Security**: Always encrypt before localStorage

---

## 🚀 Quick Commands

```bash
make dev          # Start development server
make check        # TypeScript check
make lint         # ESLint check
make validate     # Both checks
make db-studio    # Open Prisma Studio
make db-seed      # Seed database
```

See [MAKEFILE_GUIDE.md](./MAKEFILE_GUIDE.md) for full command reference.
