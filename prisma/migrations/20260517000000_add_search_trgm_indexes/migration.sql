-- Enable pg_trgm extension for trigram-based similarity matching.
-- This allows PostgreSQL to use GIN indexes for ILIKE '%pattern%' queries,
-- which previously forced a sequential scan regardless of any B-tree index.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index on Transaction.description (TEXT column).
-- Supports: ILIKE '%term%', LIKE '%term%', ~* 'term' with index acceleration.
-- Without this, every keyword search scans ALL rows for the user sequentially.
--
-- NOTE: In production on a live table, run this manually OUTSIDE a transaction:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Transaction_description_trgm_idx"
--     ON "Transaction" USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Transaction_description_trgm_idx"
  ON "Transaction" USING gin (description gin_trgm_ops);

-- GIN trigram index on Transaction.payee (VARCHAR(255) column).
-- Same rationale — payee search was a full sequential scan.
--
-- NOTE: In production on a live table, run this manually OUTSIDE a transaction:
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Transaction_payee_trgm_idx"
--     ON "Transaction" USING gin (payee gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Transaction_payee_trgm_idx"
  ON "Transaction" USING gin (payee gin_trgm_ops);
