-- Fix multiple permissive policies for contract_attachments and contract_details

-- contract_attachments
-- Drop the overly permissive "Allow all operations" which likely conflicts with specific authenticated policies
-- and is a security risk if not intended. The specific "Allow authenticated users to manage..." policy remains.
DROP POLICY IF EXISTS "Allow all operations" ON "public"."contract_attachments";

-- contract_details
-- Drop the duplicate/unoptimized "Allow all operations on contract_details for authenticated user"
DROP POLICY IF EXISTS "Allow all operations on contract_details for authenticated user" ON "public"."contract_details";

-- Drop one of the two identical optimized policies. Keeping "Allow authenticated users to manage contract_details"
-- to match the naming convention of other tables.
DROP POLICY IF EXISTS "Allow authenticated operations on contract_details" ON "public"."contract_details";
