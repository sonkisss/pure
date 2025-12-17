-- Fix RLS performance issues by wrapping auth.role() in a subquery (InitPlan) - Batch 2

-- 1. contract_attachments
DROP POLICY IF EXISTS "Allow authenticated users to manage contract_attachments" ON "public"."contract_attachments";
CREATE POLICY "Allow authenticated users to manage contract_attachments" ON "public"."contract_attachments"
FOR ALL
TO authenticated
USING ( (select auth.role()) = 'authenticated' )
WITH CHECK ( (select auth.role()) = 'authenticated' );

-- 2. custom_fees
DROP POLICY IF EXISTS "Allow authenticated users to manage custom_fees" ON "public"."custom_fees";
CREATE POLICY "Allow authenticated users to manage custom_fees" ON "public"."custom_fees"
FOR ALL
TO authenticated
USING ( (select auth.role()) = 'authenticated' )
WITH CHECK ( (select auth.role()) = 'authenticated' );

-- 3. customer_credit_records
DROP POLICY IF EXISTS "Allow authenticated users to manage customer_credit_records" ON "public"."customer_credit_records";
CREATE POLICY "Allow authenticated users to manage customer_credit_records" ON "public"."customer_credit_records"
FOR ALL
TO authenticated
USING ( (select auth.role()) = 'authenticated' )
WITH CHECK ( (select auth.role()) = 'authenticated' );

-- 4. supplier_debt_items
DROP POLICY IF EXISTS "Allow authenticated users to manage supplier_debt_items" ON "public"."supplier_debt_items";
CREATE POLICY "Allow authenticated users to manage supplier_debt_items" ON "public"."supplier_debt_items"
FOR ALL
TO authenticated
USING ( (select auth.role()) = 'authenticated' )
WITH CHECK ( (select auth.role()) = 'authenticated' );
