-- Add index for fast balance calculation
-- This index will speed up SUM(amount) queries on transactions
CREATE INDEX IF NOT EXISTS idx_transactions_account_balance 
ON "Transaction"(account_id, deleted_at) 
WHERE deleted_at IS NULL;

-- Analyze table for query planner optimization
ANALYZE "Transaction";
