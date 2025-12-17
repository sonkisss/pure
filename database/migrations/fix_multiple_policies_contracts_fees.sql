-- Fix multiple permissive policies for contracts and custom_fees

-- contracts
-- Drop redundant policies, keeping "Allow authenticated users to manage contracts"
DROP POLICY IF EXISTS "Allow all operations on contracts for authenticated users" ON "public"."contracts";
DROP POLICY IF EXISTS "Allow authenticated operations on contracts" ON "public"."contracts";

-- custom_fees
-- Drop granular policies in favor of the single "Allow authenticated users to manage custom_fees" policy
DROP POLICY IF EXISTS "Allow authenticated users to delete custom fees" ON "public"."custom_fees";
DROP POLICY IF EXISTS "Allow authenticated users to insert custom fees" ON "public"."custom_fees";
DROP POLICY IF EXISTS "Allow authenticated users to read custom fees" ON "public"."custom_fees";
DROP POLICY IF EXISTS "Allow authenticated users to update custom fees" ON "public"."custom_fees";
