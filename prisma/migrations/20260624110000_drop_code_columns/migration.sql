-- Drop code columns from Account and Category
-- These were only used by the Google Sheets sync feature (now removed)
ALTER TABLE "Account" DROP COLUMN IF EXISTS "code";
ALTER TABLE "Category" DROP COLUMN IF EXISTS "code";
