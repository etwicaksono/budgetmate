/*
  Warnings:

  - You are about to drop the column `is_system` on the `Category` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Transaction_description_trgm_idx";

-- DropIndex
DROP INDEX "Transaction_payee_trgm_idx";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "is_system";

-- CreateIndex
CREATE INDEX "Category_user_id_type_created_at_idx" ON "Category"("user_id", "type", "created_at");
