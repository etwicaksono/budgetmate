-- CreateTable
CREATE TABLE IF NOT EXISTS "CategoryBudget" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "basic_monthly_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "extend_monthly_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "basic_annual_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "extend_annual_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "CategoryBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CategoryBudget_category_id_key" ON "CategoryBudget"("category_id");

-- AddForeignKey
ALTER TABLE "CategoryBudget" DROP CONSTRAINT IF EXISTS "CategoryBudget_category_id_fkey";
ALTER TABLE "CategoryBudget" ADD CONSTRAINT "CategoryBudget_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SavedFilter" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "filters" JSONB NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SavedFilter_user_id_name_key" ON "SavedFilter"("user_id", "name");
CREATE INDEX IF NOT EXISTS "SavedFilter_user_id_idx" ON "SavedFilter"("user_id");

-- AddForeignKey
ALTER TABLE "SavedFilter" DROP CONSTRAINT IF EXISTS "SavedFilter_user_id_fkey";
ALTER TABLE "SavedFilter" ADD CONSTRAINT "SavedFilter_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
