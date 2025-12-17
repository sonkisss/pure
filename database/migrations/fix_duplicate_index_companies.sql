-- Fix duplicate index on companies table
-- Both idx_companies_company_name and idx_companies_name index the company_name column.
-- We will keep idx_companies_company_name as it is more descriptive and matches the column name.

DROP INDEX IF EXISTS "public"."idx_companies_name";
