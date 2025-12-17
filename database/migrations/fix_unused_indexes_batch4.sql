-- Drop unused non-FK indexes for inquiry_items
DROP INDEX IF EXISTS "public"."idx_inquiry_items_match_status";
DROP INDEX IF EXISTS "public"."idx_inquiry_items_product_spec";
DROP INDEX IF EXISTS "public"."idx_inquiry_items_sale_price";
DROP INDEX IF EXISTS "public"."idx_inquiry_items_supplier";
DROP INDEX IF EXISTS "public"."idx_inquiry_items_unit_price";
DROP INDEX IF EXISTS "public"."idx_inquiry_items_updated_at";

-- Note: idx_inquiry_items_inquiry_id and idx_inquiry_items_matched_product_id are retained as they are FK indexes
