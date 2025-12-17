-- Ensure inquiry_items has total_price generated column

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'inquiry_items'
      AND column_name = 'total_price'
  ) THEN
    ALTER TABLE inquiry_items
      ADD COLUMN total_price NUMERIC(15,2)
        GENERATED ALWAYS AS (quantity * unit_price) STORED;
  END IF;
END $$;

