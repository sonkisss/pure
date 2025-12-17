-- Fix RLS warnings: auth_rls_initplan for users and multiple_permissive_policies for companies

-- 1. Fix users table policies (auth_rls_initplan)
-- Wrap auth.uid() in subquery to prevent per-row evaluation
DROP POLICY IF EXISTS "Allow users to read own data" ON "public"."users";
CREATE POLICY "Allow users to read own data" ON "public"."users"
FOR SELECT
TO authenticated
USING ( auth_id = (select auth.uid()) );

DROP POLICY IF EXISTS "Allow users to update own data" ON "public"."users";
CREATE POLICY "Allow users to update own data" ON "public"."users"
FOR UPDATE
TO authenticated
USING ( auth_id = (select auth.uid()) )
WITH CHECK ( auth_id = (select auth.uid()) );

-- 2. Fix companies table policies (multiple_permissive_policies)
-- Remove redundant permissive policies, keeping only "Allow authenticated users to manage companies"
-- which was previously optimized to use (select auth.role())
DROP POLICY IF EXISTS "Allow all operations on companies for authenticated users" ON "public"."companies";
DROP POLICY IF EXISTS "Allow authenticated operations on companies" ON "public"."companies";
