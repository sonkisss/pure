-- Fix index issues (Batch 2)

-- 1. Restore idx_users_auth_id (required for Foreign Key performance)
-- Previously dropped as "unused", but flagged as "Unindexed Foreign Key" immediately after.
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON "public"."users" USING btree (auth_id);

-- 2. Drop truly unused indexes (verified not Foreign Key indexes or redundant)
-- idx_inquiry_items_inquiry_id IS a FK index (verified), so we keep it to avoid "Unindexed Foreign Key" warning.
-- Dropping other complex/unused indexes:

DROP INDEX IF EXISTS "public"."idx_expenses_year";
DROP INDEX IF EXISTS "public"."idx_contracts_company_year_status";
DROP INDEX IF EXISTS "public"."idx_contracts_company_year_amount";
DROP INDEX IF EXISTS "public"."idx_contract_details_contract_id_product";
