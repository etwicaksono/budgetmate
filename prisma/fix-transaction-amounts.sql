-- ===============================================================
-- FIX TRANSACTION AMOUNT SIGNS
-- ===============================================================
-- This script fixes transactions that have incorrect amount signs
-- according to Document 09: Critical Implementation Rules
--
-- CRITICAL CONVENTION:
-- - EXPENSE transactions MUST have NEGATIVE amounts
-- - INCOME transactions MUST have POSITIVE amounts
-- - TRANSFER_OUT transactions MUST have NEGATIVE amounts
-- - TRANSFER_IN transactions MUST have POSITIVE amounts
-- ===============================================================

BEGIN;

-- ===============================================================
-- 1. Check current state (for verification)
-- ===============================================================
SELECT 
  'BEFORE FIX' as status,
  type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN amount < 0 THEN 1 END) as negative_count,
  COUNT(CASE WHEN amount > 0 THEN 1 END) as positive_count,
  COUNT(CASE WHEN amount = 0 THEN 1 END) as zero_count
FROM "Transaction"
WHERE deleted_at IS NULL
GROUP BY type
ORDER BY type;

-- ===============================================================
-- 2. Fix EXPENSE transactions with POSITIVE amounts
-- ===============================================================
UPDATE "Transaction"
SET 
  amount = -ABS(amount),
  updated_at = NOW(),
  updated_by = COALESCE(updated_by, created_by, user_id)
WHERE 
  type = 'expense'
  AND amount > 0
  AND deleted_at IS NULL;

-- ===============================================================
-- 3. Fix INCOME transactions with NEGATIVE amounts  
-- ===============================================================
UPDATE "Transaction"
SET 
  amount = ABS(amount),
  updated_at = NOW(),
  updated_by = COALESCE(updated_by, created_by, user_id)
WHERE 
  type = 'income'
  AND amount < 0
  AND deleted_at IS NULL;

-- ===============================================================
-- 4. Fix TRANSFER_OUT transactions with POSITIVE amounts
-- ===============================================================
UPDATE "Transaction"
SET 
  amount = -ABS(amount),
  updated_at = NOW(),
  updated_by = COALESCE(updated_by, created_by, user_id)
WHERE 
  type = 'transfer_out'
  AND amount > 0
  AND deleted_at IS NULL;

-- ===============================================================
-- 5. Fix TRANSFER_IN transactions with NEGATIVE amounts
-- ===============================================================
UPDATE "Transaction"
SET 
  amount = ABS(amount),
  updated_at = NOW(),
  updated_by = COALESCE(updated_by, created_by, user_id)
WHERE 
  type = 'transfer_in'
  AND amount < 0
  AND deleted_at IS NULL;

-- ===============================================================
-- 6. Verify the fix (should show all correct signs)
-- ===============================================================
SELECT 
  'AFTER FIX' as status,
  type,
  COUNT(*) as total_count,
  COUNT(CASE WHEN amount < 0 THEN 1 END) as negative_count,
  COUNT(CASE WHEN amount > 0 THEN 1 END) as positive_count,
  COUNT(CASE WHEN amount = 0 THEN 1 END) as zero_count,
  -- Verify correctness
  CASE 
    WHEN type IN ('expense', 'transfer_out') AND COUNT(CASE WHEN amount > 0 THEN 1 END) > 0 THEN '❌ STILL HAS POSITIVE'
    WHEN type IN ('income', 'transfer_in') AND COUNT(CASE WHEN amount < 0 THEN 1 END) > 0 THEN '❌ STILL HAS NEGATIVE'
    ELSE '✅ CORRECT'
  END as validation_status
FROM "Transaction"
WHERE deleted_at IS NULL
GROUP BY type
ORDER BY type;

-- ===============================================================
-- 7. Show summary of changes made
-- ===============================================================
SELECT 
  'SUMMARY' as report_type,
  COUNT(*) as total_transactions_checked,
  COUNT(CASE WHEN type = 'expense' AND amount < 0 THEN 1 END) as expense_negative_count,
  COUNT(CASE WHEN type = 'income' AND amount > 0 THEN 1 END) as income_positive_count,
  COUNT(CASE WHEN type = 'transfer_out' AND amount < 0 THEN 1 END) as transfer_out_negative_count,
  COUNT(CASE WHEN type = 'transfer_in' AND amount > 0 THEN 1 END) as transfer_in_positive_count
FROM "Transaction"
WHERE deleted_at IS NULL;

-- ===============================================================
-- 8. List any remaining violations (should be empty)
-- ===============================================================
SELECT 
  id,
  personal_id,
  type,
  amount,
  date,
  description,
  account_id,
  user_id,
  CASE 
    WHEN type IN ('expense', 'transfer_out') AND amount > 0 THEN '❌ Should be NEGATIVE'
    WHEN type IN ('income', 'transfer_in') AND amount < 0 THEN '❌ Should be POSITIVE'
    ELSE 'Unknown violation'
  END as issue
FROM "Transaction"
WHERE 
  deleted_at IS NULL
  AND (
    (type IN ('expense', 'transfer_out') AND amount > 0)
    OR
    (type IN ('income', 'transfer_in') AND amount < 0)
  )
ORDER BY date DESC
LIMIT 100;

COMMIT;

-- ===============================================================
-- USAGE INSTRUCTIONS:
-- ===============================================================
-- 
-- Option 1: Run directly in PostgreSQL
-- psql -U your_username -d your_database -f fix-transaction-amounts.sql
--
-- Option 2: Run from Prisma Studio or pgAdmin
-- Copy and paste this entire script into the SQL query window
--
-- Option 3: Run programmatically (safest for production)
-- See the companion TypeScript script: scripts/fix-transaction-amounts.ts
--
-- ⚠️ IMPORTANT:
-- - This script is IDEMPOTENT (safe to run multiple times)
-- - Creates a backup of affected rows via updated_at timestamp
-- - Uses ABS() to ensure correct magnitude, then applies correct sign
-- - Wrapped in BEGIN/COMMIT for atomic execution
-- - Test on development database first!
-- ===============================================================
