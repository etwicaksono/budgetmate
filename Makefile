# Finance App - Development Makefile
# Quick commands for common development tasks

.PHONY: help
help: ## Show this help message
	@echo ==================================================
	@echo Finance App - Available Commands
	@echo ==================================================
	@echo DEVELOPMENT:
	@echo   dev            - Start development server
	@echo   build          - Build for production
	@echo   start          - Start production server
	@echo   dev-clean      - Clean and start dev server
	@echo QUALITY CHECKS:
	@echo   check          - Run type-check only
	@echo   lint           - Run ESLint
	@echo   lint-fix       - Run ESLint with auto-fix
	@echo   validate       - Run type-check + lint
	@echo   validate-fix   - Run type-check + lint-fix
	@echo   format         - Format code with Prettier
	@echo   format-check   - Check code formatting
	@echo DATABASE (PRISMA):
	@echo   db-generate    - Generate Prisma client
	@echo   db-migrate     - Run database migrations
	@echo   db-push        - Push schema to database
	@echo   db-seed        - Seed database with default data
	@echo   db-reset       - Reset database (WARNING: deletes all data)
	@echo   db-studio      - Open Prisma Studio GUI
	@echo   db-mcp         - Start MCP PostgreSQL server
	@echo TESTING:
	@echo   test           - Run all tests
	@echo   test-watch     - Run tests in watch mode
	@echo   test-coverage  - Run tests with coverage
	@echo CLEANUP:
	@echo   clean          - Remove .next build directory
	@echo   clean-cache    - Remove .next and node_modules cache
	@echo   clean-all      - Remove all generated files (use with caution)
	@echo   fresh          - Clean all + reinstall dependencies
	@echo GIT:
	@echo   status         - Git status
	@echo   diff           - Git diff
	@echo   log            - Git log (last 10 commits)
	@echo   commit         - Stage all and commit (interactive)
	@echo SHORTCUTS:
	@echo   d              - Alias for 'dev'
	@echo   b              - Alias for 'build'
	@echo   c              - Alias for 'check'
	@echo   l              - Alias for 'lint'
	@echo   v              - Alias for 'validate'
	@echo ==================================================

# ===========================
# DEVELOPMENT COMMANDS
# ===========================

.PHONY: dev d
dev d: ## Start development server
	@echo [DEV] Starting development server...
	@npm run dev

.PHONY: build b
build b: ## Build for production
	@echo [BUILD] Building for production...
	@npm run build

.PHONY: start
start: ## Start production server
	@echo [START] Starting production server...
	@npm run start

.PHONY: dev-clean
dev-clean: clean ## Clean cache and start dev server
	@echo [DEV] Starting clean development server...
	@npm run dev

# ===========================
# QUALITY CHECKS
# ===========================

.PHONY: check c
check c: ## Run TypeScript type checking
	@echo [CHECK] Running TypeScript type check...
	@npm run type-check

.PHONY: check-watch
check-watch: ## Run TypeScript type checking in watch mode
	@echo [CHECK] Running TypeScript type check in watch mode...
	@npm run type-check:watch

.PHONY: lint l
lint l: ## Run ESLint
	@echo [LINT] Running ESLint...
	@npm run lint

.PHONY: lint-fix
lint-fix: ## Run ESLint with auto-fix
	@echo [LINT] Running ESLint with auto-fix...
	@npm run lint:fix

.PHONY: validate v
validate v: ## Run type-check + lint
	@echo [VALIDATE] Running type-check and lint...
	@npm run validate

.PHONY: validate-fix
validate-fix: ## Run type-check + lint-fix
	@echo [VALIDATE] Running type-check and lint-fix...
	@npm run validate:fix

.PHONY: format
format: ## Format code with Prettier
	@echo [FORMAT] Formatting code...
	@npm run format

.PHONY: format-check
format-check: ## Check code formatting
	@echo [FORMAT] Checking code formatting...
	@npm run format:check

.PHONY: pre-commit
pre-commit: ## Run pre-commit checks (validate + format-check)
	@echo [PRE-COMMIT] Running pre-commit checks...
	@npm run pre-commit

# ===========================
# DATABASE (PRISMA)
# ===========================

.PHONY: db-generate
db-generate: ## Generate Prisma client
	@echo [DB] Generating Prisma client...
	@npm run db:generate

.PHONY: db-migrate
db-migrate: ## Run database migrations
	@echo [DB] Running database migrations...
	@npm run db:migrate

.PHONY: db-push
db-push: ## Push schema to database (no migration)
	@echo [DB] Pushing schema to database...
	@npm run db:push

.PHONY: db-seed
db-seed: ## Seed database with default data
	@echo [DB] Seeding database...
	@npm run db:seed

.PHONY: db-reset
db-reset: ## Reset database (WARNING: deletes all data!)
	@echo [DB] WARNING: This will delete all data!
	@echo Press Ctrl+C to cancel, or
	@pause
	@npm run db:reset

.PHONY: db-studio
db-studio: ## Open Prisma Studio
	@echo [DB] Opening Prisma Studio...
	@npm run db:studio

.PHONY: db-mcp
db-mcp: ## Start MCP PostgreSQL server
	@echo [DB] Starting MCP PostgreSQL server...
	@npx -y @modelcontextprotocol/server-postgres postgresql://postgres:postgres@localhost:5432/finance_app

.PHONY: db-setup
db-setup: db-generate db-migrate db-seed ## Complete database setup (generate + migrate + seed)
	@echo [DB] Database setup complete!

# ===========================
# TESTING
# ===========================

.PHONY: test
test: ## Run all tests
	@echo [TEST] Running tests...
	@npm test

.PHONY: test-watch
test-watch: ## Run tests in watch mode
	@echo [TEST] Running tests in watch mode...
	@npm run test:watch

.PHONY: test-coverage
test-coverage: ## Run tests with coverage
	@echo [TEST] Running tests with coverage...
	@npm run test:coverage

.PHONY: test-e2e
test-e2e: ## Run E2E tests
	@echo [TEST] Running E2E tests...
	@npm run test:e2e

# ===========================
# CLEANUP COMMANDS
# ===========================

.PHONY: clean
clean: ## Remove .next build directory
	@echo [CLEAN] Removing .next directory...
	@if exist .next (rmdir /s /q .next && echo [CLEAN] .next removed) else (echo [CLEAN] .next not found)

.PHONY: clean-cache
clean-cache: ## Remove .next and node_modules cache
	@echo [CLEAN] Removing caches...
	@if exist .next (rmdir /s /q .next && echo [CLEAN] .next removed) else (echo [CLEAN] .next not found)
	@if exist node_modules\.cache (rmdir /s /q node_modules\.cache && echo [CLEAN] Cache removed) else (echo [CLEAN] Cache not found)

.PHONY: clean-all
clean-all: ## Remove all generated files (use with caution!)
	@echo [CLEAN] WARNING: This will remove node_modules and all generated files!
	@echo Press Ctrl+C to cancel, or
	@pause
	@if exist .next (rmdir /s /q .next && echo [CLEAN] .next removed)
	@if exist node_modules (rmdir /s /q node_modules && echo [CLEAN] node_modules removed)
	@if exist package-lock.json (del /f package-lock.json && echo [CLEAN] package-lock.json removed)
	@echo [CLEAN] Cleanup complete!

.PHONY: fresh
fresh: clean-all ## Complete fresh install (clean-all + npm install)
	@echo [FRESH] Installing dependencies...
	@npm install
	@echo [FRESH] Fresh install complete!

# ===========================
# GIT COMMANDS
# ===========================

.PHONY: status
status: ## Git status
	@git status

.PHONY: diff
diff: ## Git diff
	@git diff

.PHONY: log
log: ## Git log (last 10 commits)
	@git log --oneline -10

.PHONY: commit
commit: ## Stage all changes and commit (interactive)
	@echo [GIT] Current status:
	@git status
	@echo [GIT] Staging all changes...
	@git add -A
	@echo [GIT] Please enter commit message:
	@set /p msg="Commit message: " && git commit -m "%msg%"

.PHONY: push
push: ## Push to remote
	@echo [GIT] Pushing to remote...
	@git push

.PHONY: pull
pull: ## Pull from remote
	@echo [GIT] Pulling from remote...
	@git pull

# ===========================
# INSTALLATION & SETUP
# ===========================

.PHONY: install
install: ## Install dependencies
	@echo [INSTALL] Installing dependencies...
	@npm install

.PHONY: setup
setup: install db-setup ## Complete project setup (install + db-setup)
	@echo [SETUP] Project setup complete!
	@echo [SETUP] Run 'make dev' to start development server

# ===========================
# UTILITY COMMANDS
# ===========================

.PHONY: analyze
analyze: ## Analyze bundle size
	@echo [ANALYZE] Analyzing bundle size...
	@npm run analyze

.PHONY: info
info: ## Show project information
	@echo ==================================================
	@echo Project Information
	@echo ==================================================
	@echo Node version:
	@node --version
	@echo NPM version:
	@npm --version
	@echo Next.js version:
	@npm list next --depth=0
	@echo TypeScript version:
	@npm list typescript --depth=0
	@echo Git branch:
	@git branch --show-current
	@echo ==================================================

.PHONY: deps
deps: ## Show outdated dependencies
	@echo [DEPS] Checking for outdated dependencies...
	@npm outdated

.PHONY: update
update: ## Update dependencies (interactive)
	@echo [UPDATE] Updating dependencies...
	@npm update

# ===========================
# QUICK WORKFLOWS
# ===========================

.PHONY: quick-check
quick-check: check lint ## Quick validation (type-check + lint)
	@echo [QUICK-CHECK] Quick check passed!

.PHONY: full-check
full-check: validate format-check test ## Full validation (validate + format + test)
	@echo [FULL-CHECK] Full check passed!

.PHONY: rebuild
rebuild: clean build ## Clean and rebuild
	@echo [REBUILD] Rebuild complete!

# Default target
.DEFAULT_GOAL := help
