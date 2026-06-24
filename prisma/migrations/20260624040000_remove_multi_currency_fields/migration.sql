-- Remove multi-currency support: drop currency, exchange_rate, to_currency, to_amount columns
-- All amounts are now IDR only

-- User
ALTER TABLE "User" DROP COLUMN IF EXISTS "currency";

-- Account
ALTER TABLE "Account" DROP COLUMN IF EXISTS "currency";

-- Transaction
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "Transaction" DROP COLUMN IF EXISTS "exchange_rate";

-- Transfer
ALTER TABLE "Transfer" DROP COLUMN IF EXISTS "to_amount";
ALTER TABLE "Transfer" DROP COLUMN IF EXISTS "currency";
ALTER TABLE "Transfer" DROP COLUMN IF EXISTS "to_currency";

-- RecurringTransaction
ALTER TABLE "RecurringTransaction" DROP COLUMN IF EXISTS "currency";

-- Goal
ALTER TABLE "Goal" DROP COLUMN IF EXISTS "currency";
