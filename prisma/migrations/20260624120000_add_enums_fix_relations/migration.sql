-- Migration: Add enums, fix relations, remove redundant indexes
-- This migration also fixes drift between migration history and current DB state
-- Idempotent: safe to re-run if partially applied

-- ============================================================
-- Part 1: Fix drift (tables/columns already dropped from DB but not in migration history)
-- ============================================================

-- Drop tables that were already removed from DB but still in migration history
DROP TABLE IF EXISTS "Attachment" CASCADE;
DROP TABLE IF EXISTS "Budget" CASCADE;
DROP TABLE IF EXISTS "BudgetCategory" CASCADE;

-- Drop columns already removed from DB
ALTER TABLE "CategoryBudget" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "Debt" DROP COLUMN IF EXISTS "parent_debt_id";
ALTER TABLE "User" DROP COLUMN IF EXISTS "avatar_url";
ALTER TABLE "User" DROP COLUMN IF EXISTS "two_factor_enabled";
ALTER TABLE "User" DROP COLUMN IF EXISTS "two_factor_secret";

-- Drop FKs that were already removed from DB
ALTER TABLE "SavedFilter" DROP CONSTRAINT IF EXISTS "SavedFilter_user_id_fkey";
ALTER TABLE "Transfer" DROP CONSTRAINT IF EXISTS "Transfer_from_account_fkey";
ALTER TABLE "Transfer" DROP CONSTRAINT IF EXISTS "Transfer_to_account_fkey";
ALTER TABLE "Debt" DROP CONSTRAINT IF EXISTS "Debt_parent_debt_id_fkey";

-- Drop indexes that were already removed from DB
DROP INDEX IF EXISTS "Account_user_id_idx";
DROP INDEX IF EXISTS "Debt_counterparty_idx";
DROP INDEX IF EXISTS "Debt_parent_debt_id_idx";
DROP INDEX IF EXISTS "User_email_idx";
DROP INDEX IF EXISTS "User_username_idx";

-- Drop analytic_flag column from Category (already removed from DB)
ALTER TABLE "Category" DROP COLUMN IF EXISTS "analytic_flag";

-- ============================================================
-- Part 2: Add enums (idempotent via DO blocks)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE "AccountType" AS ENUM ('checking', 'savings', 'credit_card', 'cash', 'investment', 'loan');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CategoryType" AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CategoryNature" AS ENUM ('WANT', 'NEED', 'MUST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('income', 'expense', 'transfer_in', 'transfer_out', 'debt_in', 'debt_out');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DebtType" AS ENUM ('lend', 'borrow');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "DebtStatus" AS ENUM ('active', 'settled', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SavedFilterContext" AS ENUM ('transaction', 'analytics');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AiChatRole" AS ENUM ('user', 'assistant', 'tool');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Part 3: Convert String columns to enums
-- Strategy: add new enum column, copy data, drop old column, rename new column
-- Idempotent: each block checks if the old string column still exists
-- ============================================================

-- Account.account_type: String -> AccountType
-- This one drops and recreates, so handle separately
DO $$ BEGIN
  -- If old string column exists, convert it
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Account' AND column_name = 'account_type'
    AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "Account" DROP COLUMN "account_type";
    ALTER TABLE "Account" ADD COLUMN "account_type" "AccountType" NOT NULL DEFAULT 'checking';
  END IF;
  -- If enum column doesn't exist at all, create it
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Account' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE "Account" ADD COLUMN "account_type" "AccountType" NOT NULL DEFAULT 'checking';
  END IF;
END $$;

-- Category.type: String -> CategoryType
DO $$ BEGIN
  -- If old string column exists, do full conversion
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Category' AND column_name = 'type'
    AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "Category" ADD COLUMN "type_new" "CategoryType";
    UPDATE "Category" SET "type_new" = CASE
      WHEN "type" = 'income' THEN 'income'::"CategoryType"
      WHEN "type" = 'expense' THEN 'expense'::"CategoryType"
      ELSE 'expense'::"CategoryType"
    END;
    ALTER TABLE "Category" DROP COLUMN "type";
    ALTER TABLE "Category" RENAME COLUMN "type_new" TO "type";
  END IF;
  -- Ensure NOT NULL is set (might have been skipped in partial run)
  ALTER TABLE "Category" ALTER COLUMN "type" SET NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Category.nature: String -> CategoryNature
DO $$ BEGIN
  -- If old string column exists, do full conversion
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Category' AND column_name = 'nature'
    AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "Category" ADD COLUMN "nature_new" "CategoryNature";
    UPDATE "Category" SET "nature_new" = CASE
      WHEN "nature" = 'WANT' THEN 'WANT'::"CategoryNature"
      WHEN "nature" = 'NEED' THEN 'NEED'::"CategoryNature"
      WHEN "nature" = 'MUST' THEN 'MUST'::"CategoryNature"
      ELSE 'WANT'::"CategoryNature"
    END;
    ALTER TABLE "Category" DROP COLUMN "nature";
    ALTER TABLE "Category" RENAME COLUMN "nature_new" TO "nature";
  END IF;
  -- Ensure DEFAULT and NOT NULL are set (might have been skipped in partial run)
  ALTER TABLE "Category" ALTER COLUMN "nature" SET DEFAULT 'WANT';
  ALTER TABLE "Category" ALTER COLUMN "nature" SET NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Transaction.type: String -> TransactionType
DO $$ BEGIN
  -- If old string column exists, do full conversion
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Transaction' AND column_name = 'type'
    AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "Transaction" ADD COLUMN "type_new" "TransactionType";
    UPDATE "Transaction" SET "type_new" = CASE
      WHEN "type" = 'income' THEN 'income'::"TransactionType"
      WHEN "type" = 'expense' THEN 'expense'::"TransactionType"
      WHEN "type" = 'transfer_in' THEN 'transfer_in'::"TransactionType"
      WHEN "type" = 'transfer_out' THEN 'transfer_out'::"TransactionType"
      WHEN "type" = 'debt_in' THEN 'debt_in'::"TransactionType"
      WHEN "type" = 'debt_out' THEN 'debt_out'::"TransactionType"
      ELSE 'expense'::"TransactionType"
    END;
    ALTER TABLE "Transaction" DROP COLUMN "type";
    ALTER TABLE "Transaction" RENAME COLUMN "type_new" TO "type";
  END IF;
  -- Ensure NOT NULL is set
  ALTER TABLE "Transaction" ALTER COLUMN "type" SET NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Debt.type: String -> DebtType
DO $$ BEGIN
  -- If old string column exists, do full conversion
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Debt' AND column_name = 'type'
    AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "Debt" ADD COLUMN "type_new" "DebtType";
    UPDATE "Debt" SET "type_new" = CASE
      WHEN "type" = 'lend' THEN 'lend'::"DebtType"
      WHEN "type" = 'borrow' THEN 'borrow'::"DebtType"
      ELSE 'borrow'::"DebtType"
    END;
    ALTER TABLE "Debt" DROP COLUMN "type";
    ALTER TABLE "Debt" RENAME COLUMN "type_new" TO "type";
  END IF;
  -- Ensure NOT NULL is set
  ALTER TABLE "Debt" ALTER COLUMN "type" SET NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Debt.status: String -> DebtStatus
DO $$ BEGIN
  -- If old string column exists, do full conversion
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Debt' AND column_name = 'status'
    AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "Debt" ADD COLUMN "status_new" "DebtStatus";
    UPDATE "Debt" SET "status_new" = CASE
      WHEN "status" = 'active' THEN 'active'::"DebtStatus"
      WHEN "status" = 'settled' THEN 'settled'::"DebtStatus"
      WHEN "status" = 'cancelled' THEN 'cancelled'::"DebtStatus"
      ELSE 'active'::"DebtStatus"
    END;
    ALTER TABLE "Debt" DROP COLUMN "status";
    ALTER TABLE "Debt" RENAME COLUMN "status_new" TO "status";
  END IF;
  -- Ensure DEFAULT and NOT NULL are set
  ALTER TABLE "Debt" ALTER COLUMN "status" SET DEFAULT 'active';
  ALTER TABLE "Debt" ALTER COLUMN "status" SET NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- SavedFilter.context: String -> SavedFilterContext
DO $$ BEGIN
  -- If old string column exists, do full conversion
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'SavedFilter' AND column_name = 'context'
    AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "SavedFilter" ADD COLUMN "context_new" "SavedFilterContext";
    UPDATE "SavedFilter" SET "context_new" = CASE
      WHEN "context" = 'transaction' THEN 'transaction'::"SavedFilterContext"
      WHEN "context" = 'analytics' THEN 'analytics'::"SavedFilterContext"
      ELSE 'transaction'::"SavedFilterContext"
    END;
    ALTER TABLE "SavedFilter" DROP COLUMN "context";
    ALTER TABLE "SavedFilter" RENAME COLUMN "context_new" TO "context";
  END IF;
  -- Ensure DEFAULT and NOT NULL are set
  ALTER TABLE "SavedFilter" ALTER COLUMN "context" SET DEFAULT 'transaction';
  ALTER TABLE "SavedFilter" ALTER COLUMN "context" SET NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- AiChatMessage.role: String -> AiChatRole
DO $$ BEGIN
  -- If old string column exists, do full conversion
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AiChatMessage' AND column_name = 'role'
    AND data_type = 'character varying'
  ) THEN
    ALTER TABLE "AiChatMessage" ADD COLUMN "role_new" "AiChatRole";
    UPDATE "AiChatMessage" SET "role_new" = CASE
      WHEN "role" = 'user' THEN 'user'::"AiChatRole"
      WHEN "role" = 'assistant' THEN 'assistant'::"AiChatRole"
      WHEN "role" = 'tool' THEN 'tool'::"AiChatRole"
      ELSE 'user'::"AiChatRole"
    END;
    ALTER TABLE "AiChatMessage" DROP COLUMN "role";
    ALTER TABLE "AiChatMessage" RENAME COLUMN "role_new" TO "role";
  END IF;
  -- Ensure NOT NULL is set
  ALTER TABLE "AiChatMessage" ALTER COLUMN "role" SET NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- ============================================================
-- Part 4: Add missing relations (idempotent)
-- ============================================================

-- SavedFilter -> User relation
DO $$ BEGIN
  ALTER TABLE "SavedFilter" DROP CONSTRAINT IF EXISTS "SavedFilter_user_id_fkey";
  ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AiChatSession -> User relation
DO $$ BEGIN
  ALTER TABLE "AiChatSession" DROP CONSTRAINT IF EXISTS "AiChatSession_user_id_fkey";
  ALTER TABLE "AiChatSession" ADD CONSTRAINT "AiChatSession_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Part 5: Add missing indexes (idempotent)
-- ============================================================

CREATE INDEX IF NOT EXISTS "Debt_status_idx" ON "Debt"("status");
CREATE INDEX IF NOT EXISTS "SavedFilter_user_id_context_idx" ON "SavedFilter"("user_id", "context");
CREATE UNIQUE INDEX IF NOT EXISTS "SavedFilter_user_id_name_context_key" ON "SavedFilter"("user_id", "name", "context");
