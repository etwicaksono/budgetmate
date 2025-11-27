# Makefile Quick Reference Guide

This Makefile provides convenient shortcuts for common development tasks.

## 📖 Quick Start

```bash
make            # Show help
make help       # Show help
make d          # Start development server (short for 'make dev')
```

## 🚀 Most Common Commands

### Development
```bash
make dev        # Start development server (npm run dev)
make d          # Same as above (shortcut)
make build      # Build for production
make b          # Same as above (shortcut)
```

### Quality Checks
```bash
make check      # TypeScript type-check (FAST!)
make c          # Same as above (shortcut)
make lint       # Run ESLint
make l          # Same as above (shortcut)
make validate   # Type-check + Lint
make v          # Same as above (shortcut)
```

### Database
```bash
make db-migrate # Run migrations
make db-studio  # Open Prisma Studio GUI
make db-seed    # Seed database
make db-setup   # Generate + Migrate + Seed (complete setup)
```

### Git
```bash
make status     # Git status
make diff       # Git diff
make log        # Last 10 commits
```

## 📋 All Available Commands

### DEVELOPMENT
- `make dev` / `make d` - Start development server
- `make build` / `make b` - Build for production
- `make start` - Start production server
- `make dev-clean` - Clean cache and start dev server

### QUALITY CHECKS
- `make check` / `make c` - Run type-check only (fast!)
- `make lint` / `make l` - Run ESLint
- `make lint-fix` - Run ESLint with auto-fix
- `make validate` / `make v` - Run type-check + lint
- `make validate-fix` - Run type-check + lint-fix
- `make format` - Format code with Prettier
- `make format-check` - Check code formatting
- `make pre-commit` - Run all pre-commit checks

### DATABASE (PRISMA)
- `make db-generate` - Generate Prisma client
- `make db-migrate` - Run database migrations
- `make db-push` - Push schema to database (no migration)
- `make db-seed` - Seed database with default data
- `make db-reset` - Reset database ⚠️ (DELETES ALL DATA!)
- `make db-studio` - Open Prisma Studio GUI
- `make db-setup` - Complete setup (generate + migrate + seed)

### TESTING
- `make test` - Run all tests
- `make test-watch` - Run tests in watch mode
- `make test-coverage` - Run tests with coverage report
- `make test-e2e` - Run E2E tests

### CLEANUP
- `make clean` - Remove .next build directory
- `make clean-cache` - Remove .next and node_modules cache
- `make clean-all` - Remove ALL generated files ⚠️ (use with caution!)
- `make fresh` - Clean all + reinstall dependencies

### GIT
- `make status` - Git status
- `make diff` - Git diff
- `make log` - Git log (last 10 commits)
- `make commit` - Stage all and commit (interactive)
- `make push` - Push to remote
- `make pull` - Pull from remote

### UTILITIES
- `make info` - Show project information (versions, branch, etc.)
- `make deps` - Show outdated dependencies
- `make update` - Update dependencies
- `make analyze` - Analyze bundle size

### QUICK WORKFLOWS
- `make quick-check` - Fast validation (type-check + lint)
- `make full-check` - Complete validation (validate + format + test)
- `make rebuild` - Clean and rebuild
- `make setup` - Complete project setup (install + db-setup)

## 💡 Pro Tips

### 1. Use Shortcuts for Speed
Instead of typing full commands, use single letters:
```bash
make c    # check
make l    # lint
make v    # validate
make d    # dev
make b    # build
```

### 2. Chain Commands (if needed)
```bash
# Clean before dev
make clean dev

# Validate before build
make v && make b

# Full check before commit
make full-check && make commit
```

### 3. Quick Development Workflow
```bash
# Morning: Start fresh
make pull && make d

# Before commit
make v         # Validate code
make status    # Check what changed
make commit    # Commit changes

# Build check
make b         # Ensure build works
```

### 4. Database Reset Workflow
```bash
# Reset and reseed database
make db-reset && make db-seed

# Or use the combo command
make db-setup
```

### 5. Troubleshooting
```bash
# Clean build issues
make clean && make d

# Complete fresh start
make fresh && make db-setup && make d

# Check versions
make info
```

## 🎯 Common Workflows

### Start Working
```bash
make d          # Start dev server
```

### Before Committing
```bash
make v          # Validate (type-check + lint)
make test       # Run tests
make commit     # Commit changes
```

### Deploy Preparation
```bash
make validate   # Check code quality
make test       # Run tests
make build      # Build for production
```

### Fix Build Issues
```bash
make clean      # Clear cache
make d          # Try dev again
```

### Database Issues
```bash
make db-reset   # Reset database
make db-seed    # Reseed data
```

### Fresh Start
```bash
make fresh      # Clean + reinstall
make db-setup   # Setup database
make d          # Start dev
```

## ⚡ Performance Tips

- Use `make c` (check) instead of `make v` (validate) for faster type-checking
- Use `make quick-check` for pre-commit instead of `make full-check`
- Run `make clean` periodically to free up space

## 🆘 Troubleshooting

### Command Not Found
```bash
# Make sure you're in the project root
cd D:/Project/FinanceApp/experiment-rewrite/finance-app

# Then run make commands
make help
```

### Clean Start Needed
```bash
# Nuclear option - complete fresh start
make fresh
make db-setup
make d
```

---

**Need help?** Run `make help` to see all available commands!
