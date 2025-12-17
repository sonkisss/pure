-- Fix RLS performance issues by wrapping auth.role() in a subquery (InitPlan) - Batch 3 (All remaining)

-- companies
DROP POLICY IF EXISTS "Allow authenticated operations on companies" ON "public"."companies";
CREATE POLICY "Allow authenticated operations on companies" ON "public"."companies" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON "public"."companies";
CREATE POLICY "Allow authenticated users to manage companies" ON "public"."companies" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

-- contract_details
DROP POLICY IF EXISTS "Allow authenticated operations on contract_details" ON "public"."contract_details";
CREATE POLICY "Allow authenticated operations on contract_details" ON "public"."contract_details" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage contract_details" ON "public"."contract_details";
CREATE POLICY "Allow authenticated users to manage contract_details" ON "public"."contract_details" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

-- contracts
DROP POLICY IF EXISTS "Allow authenticated operations on contracts" ON "public"."contracts";
CREATE POLICY "Allow authenticated operations on contracts" ON "public"."contracts" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage contracts" ON "public"."contracts";
CREATE POLICY "Allow authenticated users to manage contracts" ON "public"."contracts" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

-- customers
DROP POLICY IF EXISTS "Allow authenticated operations on customers" ON "public"."customers";
CREATE POLICY "Allow authenticated operations on customers" ON "public"."customers" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage customers" ON "public"."customers";
CREATE POLICY "Allow authenticated users to manage customers" ON "public"."customers" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

-- expenses
DROP POLICY IF EXISTS "Allow authenticated operations on expenses" ON "public"."expenses";
CREATE POLICY "Allow authenticated operations on expenses" ON "public"."expenses" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage expenses" ON "public"."expenses";
CREATE POLICY "Allow authenticated users to manage expenses" ON "public"."expenses" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

-- inquiries
DROP POLICY IF EXISTS "Allow authenticated operations on inquiries" ON "public"."inquiries";
CREATE POLICY "Allow authenticated operations on inquiries" ON "public"."inquiries" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage inquiries" ON "public"."inquiries";
CREATE POLICY "Allow authenticated users to manage inquiries" ON "public"."inquiries" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

-- inquiry_items
DROP POLICY IF EXISTS "Allow authenticated operations on inquiry_items" ON "public"."inquiry_items";
CREATE POLICY "Allow authenticated operations on inquiry_items" ON "public"."inquiry_items" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage inquiry_items" ON "public"."inquiry_items";
CREATE POLICY "Allow authenticated users to manage inquiry_items" ON "public"."inquiry_items" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

-- profit_calculations
DROP POLICY IF EXISTS "Allow authenticated users to manage profit calculations" ON "public"."profit_calculations";
CREATE POLICY "Allow authenticated users to manage profit calculations" ON "public"."profit_calculations" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

-- suppliers
DROP POLICY IF EXISTS "Allow authenticated operations on suppliers" ON "public"."suppliers";
CREATE POLICY "Allow authenticated operations on suppliers" ON "public"."suppliers" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated users to manage suppliers" ON "public"."suppliers";
CREATE POLICY "Allow authenticated users to manage suppliers" ON "public"."suppliers" FOR ALL TO authenticated USING ((select auth.role()) = 'authenticated') WITH CHECK ((select auth.role()) = 'authenticated');

-- users
DROP POLICY IF EXISTS "Allow authenticated read users" ON "public"."users";
CREATE POLICY "Allow authenticated read users" ON "public"."users" FOR SELECT TO authenticated USING ((select auth.role()) = 'authenticated');
