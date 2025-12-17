-- Fix unindexed foreign keys and unused indexes

-- 1. Add missing indexes for foreign keys
-- expenses -> contract_id
CREATE INDEX IF NOT EXISTS idx_expenses_contract_id ON "public"."expenses" USING btree (contract_id);

-- purchase_invoices -> created_by
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_created_by ON "public"."purchase_invoices" USING btree (created_by);

-- sales_invoices -> created_by
CREATE INDEX IF NOT EXISTS idx_sales_invoices_created_by ON "public"."sales_invoices" USING btree (created_by);


-- 2. Drop unused indexes
DROP INDEX IF EXISTS "public"."idx_supplier_debts_created_at";
DROP INDEX IF EXISTS "public"."idx_supplier_payments_supplier_date";
DROP INDEX IF EXISTS "public"."idx_companies_company_name";
DROP INDEX IF EXISTS "public"."idx_expenses_amount";
DROP INDEX IF EXISTS "public"."idx_users_auth_id";
