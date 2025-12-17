-- Fix multiple permissive policies for customer_credit_records and customer_payments

-- customer_credit_records
-- Drop overly permissive "Enable ... for all users" policies.
-- These policies use "public" role which includes unauthenticated users if not restricted elsewhere,
-- and they conflict with the specific "Allow authenticated users to manage..." policy.
-- Assuming the intention is to only allow authenticated users to manage these records (as per the "manage" policy).
DROP POLICY IF EXISTS "Enable delete for all users" ON "public"."customer_credit_records";
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."customer_credit_records";
DROP POLICY IF EXISTS "Enable read for all users" ON "public"."customer_credit_records";
DROP POLICY IF EXISTS "Enable update for all users" ON "public"."customer_credit_records";

-- customer_payments
-- Similarly drop "Enable ... for all users" policies in favor of the authenticated management policy.
DROP POLICY IF EXISTS "Enable delete for all users" ON "public"."customer_payments";
DROP POLICY IF EXISTS "Enable insert for all users" ON "public"."customer_payments";
DROP POLICY IF EXISTS "Enable read for all users" ON "public"."customer_payments";
DROP POLICY IF EXISTS "Enable update for all users" ON "public"."customer_payments";
