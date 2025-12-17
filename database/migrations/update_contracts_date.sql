-- Migration: Change contract_month to contract_date in contracts table
-- Date: 2025-12-09

-- 1. Add contract_date column
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_date DATE;

-- 2. Migrate existing data
-- Converts year/month to the 1st day of that month
-- Handles both integer and string storage of contract_month
UPDATE contracts 
SET contract_date = make_date(contract_year, contract_month::integer, 1)
WHERE contract_date IS NULL 
  AND contract_year IS NOT NULL 
  AND contract_month IS NOT NULL;

-- 3. Update comments/metadata if needed
COMMENT ON COLUMN contracts.contract_date IS '签订日期';

-- Note: contract_month column is preserved for safety. 
-- Run the following command when verified:
-- ALTER TABLE contracts DROP COLUMN contract_month;
