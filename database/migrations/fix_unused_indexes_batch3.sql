-- Drop unused indexes (non-FK)
DROP INDEX IF EXISTS "public"."idx_sales_invoices_date";
DROP INDEX IF EXISTS "public"."idx_purchase_invoices_issued";
DROP INDEX IF EXISTS "public"."idx_inquiry_items_product_name";
DROP INDEX IF EXISTS "public"."idx_inquiry_items_inquiry_id_status";

-- Replace composite index with simple FK index for contracts
CREATE INDEX IF NOT EXISTS idx_contracts_company_id ON "public"."contracts" USING btree (company_id);
DROP INDEX IF EXISTS "public"."idx_contracts_company_created_desc";
