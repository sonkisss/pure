-- Add sale price tracking to inquiry items

DO $$
BEGIN
  -- Add sale_price column if missing
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'inquiry_items'
      AND column_name = 'sale_price'
  ) THEN
    ALTER TABLE inquiry_items
      ADD COLUMN sale_price NUMERIC(12,2) DEFAULT 0;
  END IF;

  -- Add sale_amount generated column if missing
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'inquiry_items'
      AND column_name = 'sale_amount'
  ) THEN
    ALTER TABLE inquiry_items
      ADD COLUMN sale_amount NUMERIC(15,2)
        GENERATED ALWAYS AS (quantity * sale_price) STORED;
  END IF;
END $$;

-- Backfill historical sale_price with unit_price when absent/non-positive
UPDATE inquiry_items
SET sale_price = unit_price
WHERE (sale_price IS NULL OR sale_price <= 0)
  AND unit_price IS NOT NULL;

