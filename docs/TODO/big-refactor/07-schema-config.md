# Schema, Scripts & Config Refactor TODO

## Summary
The current Prisma schema and supporting config are functional, but they are not yet in a clean state for a large-scale refactor. The biggest risks are schema/migration drift, weak data-integrity enforcement, redundant indexes, and a few high-risk config choices (especially build-time migrations and permissive CORS).

The main themes:
- Several models use free-form `String` fields where enums would make the domain safer and more readable.
- Some relations are missing from the schema even though the migrations created foreign keys.
- A few models are denormalized in ways that will be hard to scale (`Transfer` account references, junction tables with surrogate IDs, redundant budget fields).
- The migration history is noisy, includes an empty migration, and contains a lot of destructive add/remove churn. This is a strong candidate for squashing after the schema stabilizes.
- The diagnostic scripts are mostly one-off utilities; only the data-fix script looks worth keeping as a maintained ops tool.

## Prisma Schema Issues
- **Missing enums for closed sets**: `Account.account_type`, `Category.type`, `Category.analytic_flag`, `Category.nature`, `Transaction.type`, `Transaction.payment_status`, `Debt.type`, `Debt.status`, `SavedFilter.context`, and `AiChatMessage.role` are all `String` fields even though the allowed values are finite. This weakens validation and makes drift likely. Relevant lines: `prisma/schema.prisma:48-49`, `77-79`, `106`, `111-113`, `218-223`, `246`, `277`.
- **Schema/migration drift**: `SavedFilter` and `AiChatSession` both have `user_id` columns but no Prisma relation fields/back-relations, even though the migrations created foreign keys. `Debt` is missing the `parent_debt_id` self-relation that exists in migration history, and `CategoryBudget.currency` is missing even though the migration created it. Relevant lines: `prisma/schema.prisma:199-211`, `214-238`, `241-270`.
- **Transfer is not normalized enough**: `Transfer.from_account` and `Transfer.to_account` are plain strings, not relations to `Account`. That makes referential integrity and query optimization harder. Relevant lines: `prisma/schema.prisma:143-162`.
- **Audit strategy is inconsistent**: some models carry full audit fields (`created_by`, `updated_by`, `deleted_at`), while others only have timestamps or no soft-delete support at all (`SavedFilter`, `AiChatSession`, `CategoryBudget`, `TransactionLabel`, `AiChatMessage`). That inconsistency will matter during a refactor. Relevant lines: `prisma/schema.prisma:16-40`, `44-69`, `166-181`, `199-211`, `241-285`.
- **Redundant indexes**: `User.email` and `User.username` already have `@unique`, so the extra `@@index([email])` and `@@index([username])` are duplicate write overhead. `Account` also has a standalone `@@index([user_id])` that is likely redundant because the composite index starts with `user_id`. Relevant lines: `prisma/schema.prisma:18-19`, `39-40`, `67-68`.
- **Potentially destructive cascade behavior**: `Transaction.account` and `Transaction.user` cascade on hard delete, and `Category.parent` cascades to children. For a financial system, hard deletion of historical data is usually a bad default; soft delete plus restrict/set-null is safer. Relevant lines: `prisma/schema.prisma:63-65`, `90-93`, `123-127`, `157-158`, `230-232`.
- **Business rules are only enforced in scripts, not the database**: amount sign conventions for `Transaction.type` are handled by repair scripts, but there is no DB-level check constraint. That makes future bad data easy to introduce. Relevant lines: `prisma/schema.prisma:106-118`.
- **A few names are awkward or inconsistent**: `Account.order` is a reserved/awkward column name, `Debt.account_rel` is an odd relation name, and `analytic_flag` duplicates the meaning of `type`. Relevant lines: `prisma/schema.prisma:55`, `78`, `230-232`.
- **Junction tables could be leaner**: `TransactionLabel` uses a surrogate `id` plus a unique compound key, and `CategoryBudget` uses a surrogate `id` plus a unique `category_id`. Those are workable, but composite primary keys would be simpler and smaller. Relevant lines: `prisma/schema.prisma:184-195`, `199-211`.

## Project Config Issues
- **`package.json` build script couples build and schema migration**: `build` runs `prisma migrate deploy` before `next build`, which adds side effects, slows builds, and can break CI/CD if the DB is unavailable during build. Build and deploy should be separated. Relevant lines: `package.json:7`.
- **TypeScript packages are in the wrong dependency bucket**: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, and likely `@types/react-color` should live in `devDependencies`, not `dependencies`. Relevant lines: `package.json:42-45`, `67`, `75-78`.
- **ESLint plugin dependency is implicit**: `eslint.config.mjs` imports `@next/eslint-plugin-next`, but that package is not declared directly in `package.json`. This can become brittle during dependency refreshes. Relevant lines: `eslint.config.mjs:6`, `package.json:81-89`.
- **`next.config.js` has a bad CORS setup**: `Access-Control-Allow-Origin: *` together with `Access-Control-Allow-Credentials: true` is invalid/unsafe for credentialed requests. Relevant lines: `next.config.js:6-18`.
- **`reactStrictMode` is disabled**: this removes a useful safety net during a refactor. Relevant lines: `next.config.js:3`.
- **Public env vars are duplicated in `next.config.js`**: `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_URL` are already public; inlining them in Next config hard-codes build-time values into the client bundle. Relevant lines: `next.config.js:20-24`.
- **Image host config contains a placeholder**: `your-cdn.com` should not ship as a real remote pattern. Relevant lines: `next.config.js:27-38`.
- **`next.config.js` uses an experimental server-actions setting**: keep this only if it is required and confirmed for the current Next.js version. Relevant lines: `next.config.js:41-46`.
- **`tsconfig.json` contains dead emit settings**: `declaration`, `declarationMap`, and `sourceMap` do nothing with `noEmit: true`. The alias block is also more verbose than needed (`@/*` already covers the subpaths). Relevant lines: `tsconfig.json:36-40`, `49-82`.
- **`tsconfig.json` excludes config files from checking**: that is fine for JS configs, but if the repo moves to TS-based config files, they will be skipped unless the include/exclude rules are revisited. Relevant lines: `tsconfig.json:101-110`.
- **`.env.example` needs cleanup**: it is generally organized, but `SWIFTROUTER_MODELS` contains a likely typo (`qwen2.-vl-72b-instruct`), and the file mixes required/optional secrets without much guidance. Relevant lines: `.env.example:21-28`.
- **`eslint.config.mjs` is not strict enough for a refactor**: `no-unused-vars` is only a warning, and `no-console` still allows `log`/`table` with a TODO to remove them later. For a maintainable codebase, this should be tightened. Relevant lines: `eslint.config.mjs:47-63`.
- **No Docker/deployment config found**: I did not find a `Dockerfile`, `docker-compose.yml`, or similar deployment manifest in the repo root. That is not necessarily wrong, but it means deployment is currently handled elsewhere or not defined in-repo.

## Per-File Findings

### prisma/schema.prisma
- **Issues**:
  - Duplicate unique + non-unique indexes on `email` and `username` (`@@unique` already creates indexes). `prisma/schema.prisma:18-19`, `39-40`.
  - Missing `User` relations for `SavedFilter` and `AiChatSession`, despite corresponding foreign keys in migration history. `prisma/schema.prisma:241-270`.
  - `Debt` is missing `parent_debt_id` / self-relation that exists in the migration history. `prisma/schema.prisma:214-238`.
  - `CategoryBudget.currency` is absent even though the migration created it; this is a schema/history mismatch. `prisma/schema.prisma:199-211`.
  - `Transfer.from_account` / `to_account` are raw strings rather than relations to `Account`. `prisma/schema.prisma:143-162`.
  - No enums for the closed-value fields listed above. `prisma/schema.prisma:48-49`, `77-79`, `106`, `218-223`, `246`, `277`.
  - `order` is an awkward reserved-like column name, and `account_rel` is a poor relation name. `prisma/schema.prisma:55`, `230-232`.
  - Amount sign rules are not enforced by the schema. `prisma/schema.prisma:106-118`.
- **Refactor TODO**:
  - Introduce enums for transaction/category/debt/status/context/role/account-type fields.
  - Restore missing relations and align them with the actual database constraints.
  - Rename `order` → `sort_order` and `account_rel` → `account`.
  - Replace raw account strings in `Transfer` with FKs.
  - Decide whether `CategoryBudget` and `TransactionLabel` should use composite primary keys.
  - Add DB-level check constraints for amount/type integrity.
- **Priority**: high

### package.json
- **Issues**:
  - `build` runs database migrations during build, which is too much responsibility for a build step. `package.json:7`.
  - Type-only packages are in `dependencies` instead of `devDependencies`. `package.json:42-45`, `67`, `75-78`.
  - Maintenance/diagnostic scripts are incomplete: there is a script for `fix-transaction-amounts`, but not for the balance-check utilities if they are meant to stay. `package.json:29`, `71-73`.
  - The ESLint config imports `@next/eslint-plugin-next`, but it is not declared explicitly here. `package.json:81-89`, `eslint.config.mjs:6`.
- **Refactor TODO**:
  - Move TypeScript type packages to `devDependencies`.
  - Split DB migration execution out of the `build` pipeline.
  - Add or remove maintenance scripts so the repo has one clear operational story.
  - Declare any direct ESLint plugin dependencies explicitly.
- **Priority**: high

### tsconfig.json
- **Issues**:
  - Emit-related settings are dead weight with `noEmit: true`. `tsconfig.json:36-40`.
  - Path aliases are more verbose than necessary; `@/*` already subsumes the narrower aliases. `tsconfig.json:49-82`.
  - Config files are excluded from type checking; fine for now, but something to revisit if config moves to TypeScript. `tsconfig.json:101-110`.
- **Refactor TODO**:
  - Remove emit-only settings unless the repo will start emitting declarations from a separate build config.
  - Collapse redundant alias definitions.
  - Revisit whether config files should be part of the type-checking surface.
- **Priority**: medium

### next.config.js
- **Issues**:
  - `reactStrictMode` is disabled. `next.config.js:3`.
  - CORS headers are unsafe/invalid for credentialed requests (`*` with credentials). `next.config.js:6-18`.
  - Public env vars are re-injected at build time unnecessarily. `next.config.js:20-24`.
  - `your-cdn.com` is a placeholder that should not be committed as-is. `next.config.js:27-38`.
  - `experimental.serverActions` should be verified against the current Next.js release before relying on it. `next.config.js:41-46`.
- **Refactor TODO**:
  - Turn strict mode back on.
  - Replace wildcard credentialed CORS with explicit allowed origins.
  - Remove the env duplication or document why the values must be inlined.
  - Replace placeholder image hosts with real config or environment-driven values.
- **Priority**: high

### .env.example
- **Issues**:
  - One model entry appears malformed: `qwen2.-vl-72b-instruct`. `.env.example:23-28`.
  - Required vs optional values are not clearly separated, which makes setup easier to misuse. `.env.example:1-29`.
  - Public URLs are already represented in `next.config.js`, which can create confusion about the source of truth. `.env.example:8-10`, `next.config.js:20-24`.
- **Refactor TODO**:
  - Fix the typo in the model list.
  - Mark variables as required/optional and add short usage notes.
  - Make sure the app reads public URLs from one place only.
- **Priority**: medium

### eslint.config.mjs
- **Issues**:
  - The config depends on `@next/eslint-plugin-next` without an explicit package declaration. `eslint.config.mjs:6`.
  - `no-unused-vars` is only a warning, which is softer than the repo’s overall strictness. `eslint.config.mjs:50-57`.
  - `no-console` still allows `log` and `table`, and the TODO suggests this is temporary. `eslint.config.mjs:61-62`.
- **Refactor TODO**:
  - Declare the Next ESLint plugin explicitly or switch to a config pattern that does not require manual plugin wiring.
  - Decide whether unused vars should be warnings or errors, and align with the TypeScript compiler.
  - Tighten console usage policy once debugging is done.
- **Priority**: medium

### Makefile
- **Issues**:
  - The Makefile is Windows-specific (`if exist`, `rmdir`, `pause`, `set /p`), so it is not portable for Linux/macOS CI or deployment automation. `Makefile:201-216`, `241-248`.
  - The `commit` target is interactive and stages everything, which is risky for a shared repo. `Makefile:241-248`.
- **Refactor TODO**:
  - Replace Windows-only commands with cross-platform task runners or npm scripts.
  - Remove or rewrite the interactive commit target.
- **Priority**: low

### scripts/check-balance-data.ts
- **Issues**:
  - The script aggregates across all users and does not accept a user/account filter, so its output is not representative in a multi-tenant app. `scripts/check-balance-data.ts:9-23`, `39-58`.
  - It uses `Number(...)` on Prisma decimals, which can introduce precision loss in finance code. `scripts/check-balance-data.ts:25-28`, `60-63`, `69-74`.
  - The logic is diagnostic only and hardcodes a 30-day window. `scripts/check-balance-data.ts:34-58`.
- **Refactor TODO**:
  - Convert this into a parameterized audit tool or remove it if it is no longer part of the workflow.
  - Keep money values as decimals, not JS numbers, unless the output is strictly informational.
- **Priority**: medium

### scripts/check-transaction-amounts.ts
- **Issues**:
  - The script is mostly a printout and does not validate anything meaningful beyond the last 10 transactions. `scripts/check-transaction-amounts.ts:7-22`, `24-35`.
  - It hardcodes `Currency: IDR`, which is stale relative to the current schema direction. `scripts/check-transaction-amounts.ts:30`.
  - It also converts decimals to JS numbers. `scripts/check-transaction-amounts.ts:29-33`.
- **Refactor TODO**:
  - Either promote it to a proper validator with exit codes or remove it.
  - Stop hardcoding currency if the system is IDR-only by design; otherwise wire currency through the model.
- **Priority**: medium

### scripts/test-balance-api.ts
- **Issues**:
  - This is not really an API test; it recomputes a balance from DB state and prints a JSON-shaped payload. `scripts/test-balance-api.ts:41-102`.
  - `findFirst()` makes the target user nondeterministic. `scripts/test-balance-api.ts:7-13`.
  - It uses `Number(...)` on decimals, which risks precision loss. `scripts/test-balance-api.ts:32-35`, `66-77`.
- **Refactor TODO**:
  - Replace this with an actual automated test, or delete it if it was only a temporary debugging aid.
  - Parameterize the user selection and preserve decimal precision.
- **Priority**: medium

### scripts/fix-transaction-amounts.ts
- **Issues**:
  - This is useful, but it is effectively a maintenance migration in code form; it should be treated as an operational tool, not normal app logic. `scripts/fix-transaction-amounts.ts:27-229`.
  - The validation uses `toNumber()`, which is okay for counts but still not ideal for finance precision. `scripts/fix-transaction-amounts.ts:45-47`, `209-210`.
- **Refactor TODO**:
  - Keep this script, but add a dry-run mode or explicit confirmation flag before it mutates production data.
  - Prefer decimal-safe comparisons everywhere that money is involved.
- **Priority**: medium

### prisma/create_balance_index.sql
- **Issues**:
  - The index is useful, but it lives outside Prisma migration management, so it can silently diverge from schema history. `prisma/create_balance_index.sql:3-8`.
  - The index name and shape do not match the one created in a later migration, which can be confusing when debugging query plans. `prisma/create_balance_index.sql:3-5`, `prisma/migrations/20260307044544_optimize_transactions_balance_query/migration.sql:1-6`.
- **Refactor TODO**:
  - Move this into the migration history if it is still needed, or document clearly why it must remain a standalone operational SQL file.
- **Priority**: medium

### prisma/fix-transaction-amounts.sql
- **Issues**:
  - This script still selects `personal_id`, but that column was removed in `20260223220545_remove_personal_id`. It will fail on the current schema. `prisma/fix-transaction-amounts.sql:120-133`.
  - It duplicates the TypeScript repair script, so there are two sources of truth for the same operation. `prisma/fix-transaction-amounts.sql:32-81`, `prisma/fix-transaction-amounts.sql:157-165`.
- **Refactor TODO**:
  - Delete or rewrite this file to match the current schema.
  - Keep only one repair path for amount-sign cleanup.
- **Priority**: high

### prisma/config.ts
- **Issues**:
  - Minimal and generally fine, but it assumes `DATABASE_URL` exists without any explicit validation or fallback. `prisma/config.ts:4-8`.
- **Refactor TODO**:
  - Add a clearer failure mode if the datasource URL is missing.
- **Priority**: low

### prisma/migrations/20251121201137_init_with_cuid/migration.sql
- **Issues**:
  - This baseline contains many models and columns that no longer exist in the current schema, plus a large number of indexes and FKs that were later dismantled. That is normal historically, but it is not a clean long-term migration chain. `prisma/migrations/20251121201137_init_with_cuid/migration.sql:1-446`.
- **Refactor TODO**:
  - Treat this as a candidate for squashing into a new baseline once the schema is frozen.
- **Priority**: high

### prisma/migrations/20260203190828_add_credit_debt_models/migration.sql
- **Issues**:
  - Empty/no-op migration file; no SQL or explanatory comment. There is no functional value here. 
- **Refactor TODO**:
  - Remove it if it was accidental, or regenerate a clean migration if something was meant to happen here.
- **Priority**: medium

### prisma/migrations/20260225180454_add_debts_table/migration.sql
- **Issues**:
  - Introduces `parent_debt_id` and a self-relation, but the current schema no longer reflects that column/relation. That is a schema/history mismatch that must be resolved. `prisma/migrations/20260225180454_add_debts_table/migration.sql:8-56`.
- **Refactor TODO**:
  - Either restore the self-relation in `schema.prisma` or add a follow-up migration that drops it cleanly.
- **Priority**: high

### prisma/migrations/20260428000002_add_missing_feature_tables/migration.sql
- **Issues**:
  - Uses `IF NOT EXISTS`/`IF EXISTS` patterns that make the migration less deterministic than a normal Prisma migration. `prisma/migrations/20260428000002_add_missing_feature_tables/migration.sql:1-43`.
  - Creates `CategoryBudget` and `SavedFilter` in a shape that later schema changes only partially represent, contributing to drift. `prisma/migrations/20260428000002_add_missing_feature_tables/migration.sql:1-43`.
- **Refactor TODO**:
  - If these features are still relevant, keep them but clean up the schema to match.
  - If not, treat them as part of the history to be squashed.
- **Priority**: medium

### prisma/migrations/20260506045000_add_context_to_saved_filter/migration.sql
- **Issues**:
  - The comments show uncertainty about whether dropping the unique index is enough to drop the underlying constraint, which suggests the migration was not cleanly generated. `prisma/migrations/20260506045000_add_context_to_saved_filter/migration.sql:4-10`.
  - The migration style is manual and comment-heavy rather than reproducible from schema intent.
- **Refactor TODO**:
  - Prefer a regenerated Prisma migration or a raw SQL migration with less ambiguity.
- **Priority**: medium

### prisma/migrations/20260624040000_remove_multi_currency_fields/migration.sql
- **Issues**:
  - This is a destructive migration that drops currency-related columns. That may be fine if multi-currency is gone for good, but it is irreversible and should have been accompanied by explicit data migration/backfill planning. `prisma/migrations/20260624040000_remove_multi_currency_fields/migration.sql:1-24`.
  - The current schema still does not clearly align with the budget/currency history, especially for `CategoryBudget.currency`. 
- **Refactor TODO**:
  - Verify the data loss is intentional and acceptable.
  - Add a follow-up cleanup migration for any leftover schema drift.
- **Priority**: high

### prisma/migrations/20260624080000_drop_unused_tables_and_columns/migration.sql
- **Issues**:
  - Drops multiple tables and columns outright, including `RecurringTransaction`, `Goal`, `AuditLog`, `AccountGroup`, and several columns. This is a major destructive cleanup step, not a routine migration. `prisma/migrations/20260624080000_drop_unused_tables_and_columns/migration.sql:1-27`.
- **Refactor TODO**:
  - Keep only if these features are permanently retired and the data loss is acceptable.
  - If the refactor is still in progress, consider squashing or staging this more carefully.
- **Priority**: high

### prisma/migrations/20260624090000_drop_sync_feature/migration.sql
- **Issues**:
  - No major issue beyond being part of the broader destructive cleanup sequence. It removes sync feature tables/columns outright. `prisma/migrations/20260624090000_drop_sync_feature/migration.sql:1-14`.
- **Refactor TODO**:
  - Keep only if Google Sheets sync is definitely retired.
- **Priority**: low

### prisma/migrations/20260624110000_drop_code_columns/migration.sql
- **Issues**:
  - No major issue beyond being another cleanup step that depends on the feature being fully retired. `prisma/migrations/20260624110000_drop_code_columns/migration.sql:1-4`.
- **Refactor TODO**:
  - Keep only if the sync feature is gone everywhere.
- **Priority**: low

### Remaining migration files reviewed
The following migration files were also reviewed and did not have standalone issues beyond being part of the noisy historical chain:
- `prisma/migrations/20251122214352_add_balance_calculation_index/migration.sql`
- `prisma/migrations/20251124230515_add_timezone_support/migration.sql`
- `prisma/migrations/20260103055647_add_google_sheets_sync/migration.sql`
- `prisma/migrations/20260103205658_add_code_field_for_simplified_sync/migration.sql`
- `prisma/migrations/20260307044231_optimize_accounts_get_index/migration.sql`
- `prisma/migrations/20260307044544_optimize_transactions_balance_query/migration.sql`
- `prisma/migrations/20260307051215_optimize_categories_get_index/migration.sql`
- `prisma/migrations/20260307060243_optimize_transactions_get_index/migration.sql`
- `prisma/migrations/20260428000000_add_analytic_flag/migration.sql`
- `prisma/migrations/20260517000000_add_search_trgm_indexes/migration.sql`
- `prisma/migrations/20260604000000_add_has_ai_access/migration.sql`
- `prisma/migrations/20260604000001_add_ai_chat_tables/migration.sql`
- `prisma/migrations/20260608000000_add_transaction_is_draft/migration.sql`
- `prisma/migrations/migration_lock.toml`

## Refactor Priority Summary
1. Fix schema drift and relation gaps in Prisma (`SavedFilter`, `AiChatSession`, `Debt.parent_debt_id`, `CategoryBudget.currency`, `Transfer` relations).
2. Add enums and database constraints for the domain rules that are currently enforced only in scripts.
3. Clean up build/config behavior (`build` migration coupling, CORS, strict mode, dependency placement).
4. Decide which scripts are long-lived maintenance tools and which should be deleted or converted to tests.
5. Plan a migration squash/baseline once the final schema is stable.
