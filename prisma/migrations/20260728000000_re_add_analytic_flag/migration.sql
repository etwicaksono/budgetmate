-- Re-add analytic_flag column to Category
-- Originally added in 20260428000000_add_analytic_flag, then dropped in
-- 20260624120000_add_enums_fix_relations. This restores it to match schema.prisma.
ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "analytic_flag" VARCHAR(20) NOT NULL DEFAULT 'expense';
