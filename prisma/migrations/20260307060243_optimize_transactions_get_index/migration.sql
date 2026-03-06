-- CreateIndex
CREATE INDEX "Transaction_user_id_deleted_at_date_idx" ON "Transaction"("user_id", "deleted_at", "date" DESC);
