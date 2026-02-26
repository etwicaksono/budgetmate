-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "debt_id" TEXT;

-- CreateTable
CREATE TABLE "Debt" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TIMESTAMPTZ NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "account_id" TEXT NOT NULL,
    "counterparty" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "parent_debt_id" TEXT,
    "position" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" VARCHAR(64),
    "updated_by" VARCHAR(64),

    CONSTRAINT "Debt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Debt_user_id_idx" ON "Debt"("user_id");

-- CreateIndex
CREATE INDEX "Debt_account_id_idx" ON "Debt"("account_id");

-- CreateIndex
CREATE INDEX "Debt_parent_debt_id_idx" ON "Debt"("parent_debt_id");

-- CreateIndex
CREATE INDEX "Debt_counterparty_idx" ON "Debt"("counterparty");

-- CreateIndex
CREATE INDEX "Debt_status_idx" ON "Debt"("status");

-- CreateIndex
CREATE INDEX "Transaction_debt_id_idx" ON "Transaction"("debt_id");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "Debt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Debt" ADD CONSTRAINT "Debt_parent_debt_id_fkey" FOREIGN KEY ("parent_debt_id") REFERENCES "Debt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
