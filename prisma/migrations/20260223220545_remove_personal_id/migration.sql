/*
  Warnings:

  - You are about to drop the column `personal_id` on the `Account` table. All the data in the column will be lost.
  - You are about to drop the column `personal_id` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `personal_id` on the `Label` table. All the data in the column will be lost.
  - You are about to drop the column `personal_id` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `personal_id` on the `Transfer` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Account_user_id_personal_id_key";

-- DropIndex
DROP INDEX "Category_user_id_personal_id_key";

-- DropIndex
DROP INDEX "Label_user_id_personal_id_key";

-- DropIndex
DROP INDEX "Transaction_user_id_personal_id_key";

-- DropIndex
DROP INDEX "Transfer_user_id_personal_id_key";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "personal_id";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "personal_id";

-- AlterTable
ALTER TABLE "Label" DROP COLUMN "personal_id";

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "personal_id";

-- AlterTable
ALTER TABLE "Transfer" DROP COLUMN "personal_id";
