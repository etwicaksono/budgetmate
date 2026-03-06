-- DropIndex
DROP INDEX IF EXISTS "Category_user_id_idx";

-- CreateIndex
CREATE INDEX "Category_user_id_type_created_at_idx" ON "Category"("user_id", "type", "created_at");
