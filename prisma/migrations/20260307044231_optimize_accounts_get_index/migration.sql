-- CreateIndex
CREATE INDEX "Account_user_id_deleted_at_order_created_at_idx" ON "Account"("user_id", "deleted_at", "order", "created_at");
