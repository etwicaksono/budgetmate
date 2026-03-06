-- DropIndex
DROP INDEX IF EXISTS "Transaction_account_id_idx";

-- CreateIndex
CREATE INDEX "Transaction_account_id_deleted_at_idx" ON "Transaction"("account_id", "deleted_at");
