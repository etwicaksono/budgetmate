-- Migration: Add DebtLabel junction table
-- Labels attached to the debt entity itself, independent of the labels on its
-- linked ledger transactions.

CREATE TABLE IF NOT EXISTS "DebtLabel" (
    "id" TEXT NOT NULL,
    "debt_id" TEXT NOT NULL,
    "label_id" TEXT NOT NULL,

    CONSTRAINT "DebtLabel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DebtLabel_debt_id_label_id_key" ON "DebtLabel"("debt_id", "label_id");
CREATE INDEX IF NOT EXISTS "DebtLabel_debt_id_idx" ON "DebtLabel"("debt_id");
CREATE INDEX IF NOT EXISTS "DebtLabel_label_id_idx" ON "DebtLabel"("label_id");

ALTER TABLE "DebtLabel"
    ADD CONSTRAINT "DebtLabel_debt_id_fkey" FOREIGN KEY ("debt_id")
    REFERENCES "Debt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DebtLabel"
    ADD CONSTRAINT "DebtLabel_label_id_fkey" FOREIGN KEY ("label_id")
    REFERENCES "Label"("id") ON DELETE CASCADE ON UPDATE CASCADE;
