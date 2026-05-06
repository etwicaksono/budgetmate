-- AlterTable
ALTER TABLE "SavedFilter" ADD COLUMN "context" VARCHAR(50) NOT NULL DEFAULT 'transaction';

-- DropIndex
DROP INDEX IF EXISTS "SavedFilter_user_id_name_key";

-- DropForeignKey constraint (if any Prisma mapped uniqueness created one implicitly, though usually just an index)
-- In Postgres, dropping a unique constraint requires knowing its name, but dropping the index usually suffices for Prisma unique mappings
-- However, Prisma generates this for @@unique:
-- DropIndex "SavedFilter_user_id_name_key" drops the constraint automatically.

-- CreateIndex
CREATE UNIQUE INDEX "SavedFilter_user_id_name_context_key" ON "SavedFilter"("user_id", "name", "context");

-- CreateIndex
CREATE INDEX "SavedFilter_user_id_context_idx" ON "SavedFilter"("user_id", "context");
