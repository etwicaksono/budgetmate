-- AlterTable
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "analytic_flag" VARCHAR(20) NOT NULL DEFAULT 'expense';
