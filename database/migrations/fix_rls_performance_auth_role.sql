-- Fix RLS performance issues by wrapping auth.role() in a subquery (InitPlan)

-- 1. customer_payments
DROP POLICY IF EXISTS "Allow authenticated users to manage customer_payments" ON "public"."customer_payments";
CREATE POLICY "Allow authenticated users to manage customer_payments" ON "public"."customer_payments"
FOR ALL
TO authenticated
USING ( (select auth.role()) = 'authenticated' )
WITH CHECK ( (select auth.role()) = 'authenticated' );

-- 2. expense_categories
DROP POLICY IF EXISTS "Allow authenticated users to manage expense_categories" ON "public"."expense_categories";
CREATE POLICY "Allow authenticated users to manage expense_categories" ON "public"."expense_categories"
FOR ALL
TO authenticated
USING ( (select auth.role()) = 'authenticated' )
WITH CHECK ( (select auth.role()) = 'authenticated' );

-- 3. supplier_debts
DROP POLICY IF EXISTS "Allow authenticated users to manage supplier_debts" ON "public"."supplier_debts";
CREATE POLICY "Allow authenticated users to manage supplier_debts" ON "public"."supplier_debts"
FOR ALL
TO authenticated
USING ( (select auth.role()) = 'authenticated' )
WITH CHECK ( (select auth.role()) = 'authenticated' );

-- 4. supplier_payments
DROP POLICY IF EXISTS "Allow authenticated users to manage supplier_payments" ON "public"."supplier_payments";
CREATE POLICY "Allow authenticated users to manage supplier_payments" ON "public"."supplier_payments"
FOR ALL
TO authenticated
USING ( (select auth.role()) = 'authenticated' )
WITH CHECK ( (select auth.role()) = 'authenticated' );
