-- Phase 1: Drop unused tables
DROP TABLE IF EXISTS "RecurringTransaction" CASCADE;
DROP TABLE IF EXISTS "Goal";
DROP TABLE IF EXISTS "AuditLog";

-- Drop AccountGroup (FK first, then column, then table)
ALTER TABLE "Account" DROP CONSTRAINT IF EXISTS "Account_group_id_fkey";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "group_id";
DROP TABLE IF EXISTS "AccountGroup";

-- Phase 2: Drop unused columns

-- Drop position (Json?) from 5 models
ALTER TABLE "Account"     DROP COLUMN IF EXISTS "position";
ALTER TABLE "Category"   DROP COLUMN IF EXISTS "position";
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "position";
ALTER TABLE "Transfer"   DROP COLUMN IF EXISTS "position";
ALTER TABLE "Debt"       DROP COLUMN IF EXISTS "position";

-- Drop credit_limit and interest_rate from Account
ALTER TABLE "Account" DROP COLUMN IF EXISTS "credit_limit";
ALTER TABLE "Account" DROP COLUMN IF EXISTS "interest_rate";

-- Drop reference_number and is_recurring from Transaction
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "reference_number";
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "is_recurring";
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "recurring_id";
