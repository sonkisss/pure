-- Sync inquiry_items table columns with schema definition

DO $$
BEGIN
  -- Tax rate column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inquiry_items' AND column_name = 'tax_rate'
  ) THEN
    ALTER TABLE inquiry_items
      ADD COLUMN tax_rate NUMERIC(5,4) DEFAULT 0.13;
  END IF;

  -- Tax amount generated column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inquiry_items' AND column_name = 'tax_amount'
  ) THEN
    ALTER TABLE inquiry_items
      ADD COLUMN tax_amount NUMERIC(15,2)
        GENERATED ALWAYS AS (
          COALESCE(quantity, 0) * COALESCE(unit_price, 0) * COALESCE(tax_rate, 0)
        ) STORED;
  END IF;

  -- Amount with tax generated column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inquiry_items' AND column_name = 'amount_with_tax'
  ) THEN
    ALTER TABLE inquiry_items
      ADD COLUMN amount_with_tax NUMERIC(15,2)
        GENERATED ALWAYS AS (
          COALESCE(quantity, 0) * COALESCE(unit_price, 0) * (1 + COALESCE(tax_rate, 0))
        ) STORED;
  END IF;

  -- Delivery time column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inquiry_items' AND column_name = 'delivery_time'
  ) THEN
    ALTER TABLE inquiry_items
      ADD COLUMN delivery_time VARCHAR(100);
  END IF;

  -- Status column with default and check constraint
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inquiry_items' AND column_name = 'status'
  ) THEN
    ALTER TABLE inquiry_items
      ADD COLUMN status VARCHAR(20) DEFAULT 'pending';
    ALTER TABLE inquiry_items
      ADD CONSTRAINT inquiry_items_status_check
        CHECK (status IN ('pending', 'matched', 'unmatched', 'multiple'));
  END IF;

  -- Updated_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inquiry_items' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE inquiry_items
      ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

