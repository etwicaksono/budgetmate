-- Phase 3: Drop sync feature tables and columns

-- Drop SyncHistory table
DROP TABLE IF EXISTS "SyncHistory";

-- Remove all Google OAuth + sync columns from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "google_access_token";
ALTER TABLE "User" DROP COLUMN IF EXISTS "google_refresh_token";
ALTER TABLE "User" DROP COLUMN IF EXISTS "google_token_expires";
ALTER TABLE "User" DROP COLUMN IF EXISTS "google_sheet_id";
ALTER TABLE "User" DROP COLUMN IF EXISTS "google_sheet_url";
ALTER TABLE "User" DROP COLUMN IF EXISTS "google_sheet_name";
ALTER TABLE "User" DROP COLUMN IF EXISTS "last_synced_at";
