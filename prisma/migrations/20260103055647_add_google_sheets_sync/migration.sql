-- AlterTable
ALTER TABLE "User" ADD COLUMN     "google_access_token" TEXT,
ADD COLUMN     "google_refresh_token" TEXT,
ADD COLUMN     "google_sheet_id" VARCHAR(255),
ADD COLUMN     "google_sheet_name" VARCHAR(255),
ADD COLUMN     "google_sheet_url" VARCHAR(500),
ADD COLUMN     "google_token_expires" TIMESTAMPTZ,
ADD COLUMN     "last_synced_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "SyncHistory" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "synced_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "direction" VARCHAR(10) NOT NULL,
    "mode" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "accounts_added" INTEGER NOT NULL DEFAULT 0,
    "accounts_updated" INTEGER NOT NULL DEFAULT 0,
    "accounts_deleted" INTEGER NOT NULL DEFAULT 0,
    "categories_added" INTEGER NOT NULL DEFAULT 0,
    "categories_updated" INTEGER NOT NULL DEFAULT 0,
    "categories_deleted" INTEGER NOT NULL DEFAULT 0,
    "transactions_added" INTEGER NOT NULL DEFAULT 0,
    "transactions_updated" INTEGER NOT NULL DEFAULT 0,
    "transactions_deleted" INTEGER NOT NULL DEFAULT 0,
    "transfers_added" INTEGER NOT NULL DEFAULT 0,
    "transfers_updated" INTEGER NOT NULL DEFAULT 0,
    "transfers_deleted" INTEGER NOT NULL DEFAULT 0,
    "labels_added" INTEGER NOT NULL DEFAULT 0,
    "labels_updated" INTEGER NOT NULL DEFAULT 0,
    "labels_deleted" INTEGER NOT NULL DEFAULT 0,
    "conflicts_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,

    CONSTRAINT "SyncHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncHistory_user_id_idx" ON "SyncHistory"("user_id");

-- CreateIndex
CREATE INDEX "SyncHistory_synced_at_idx" ON "SyncHistory"("synced_at");

-- AddForeignKey
ALTER TABLE "SyncHistory" ADD CONSTRAINT "SyncHistory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
