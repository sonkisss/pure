-- Change RLS policies from "authenticated" to "public" (anon)
-- This is necessary because the application uses custom authentication 
-- and does not establish a Supabase Auth session, so all requests are "anon".

-- 1. Customers
DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."customers";
CREATE POLICY "Enable all for public" ON "public"."customers" FOR ALL TO public USING (true) WITH CHECK (true);

-- 2. Customer Credit Records
DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."customer_credit_records";
CREATE POLICY "Enable all for public" ON "public"."customer_credit_records" FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. Customer Payments
DROP POLICY IF EXISTS "Allow authenticated users to select customer_payments" ON "public"."customer_payments";
-- (Add other dropped policies if any, or just create the catch-all)
CREATE POLICY "Enable all for public" ON "public"."customer_payments" FOR ALL TO public USING (true) WITH CHECK (true);

-- 4. Expenses
DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."expenses";
CREATE POLICY "Enable all for public" ON "public"."expenses" FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. Expense Categories
DROP POLICY IF EXISTS "Allow authenticated users to manage expense categories" ON "public"."expense_categories";
DROP POLICY IF EXISTS "Allow authenticated users to read expense categories" ON "public"."expense_categories";
CREATE POLICY "Enable all for public" ON "public"."expense_categories" FOR ALL TO public USING (true) WITH CHECK (true);

-- 6. Companies
DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."companies";
CREATE POLICY "Enable all for public" ON "public"."companies" FOR ALL TO public USING (true) WITH CHECK (true);

-- 7. Contracts & Details & Attachments
DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."contracts";
CREATE POLICY "Enable all for public" ON "public"."contracts" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."contract_details";
CREATE POLICY "Enable all for public" ON "public"."contract_details" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."contract_attachments";
CREATE POLICY "Enable all for public" ON "public"."contract_attachments" FOR ALL TO public USING (true) WITH CHECK (true);

-- 8. Inquiries & Items
DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."inquiries";
CREATE POLICY "Enable all for public" ON "public"."inquiries" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."inquiry_items";
CREATE POLICY "Enable all for public" ON "public"."inquiry_items" FOR ALL TO public USING (true) WITH CHECK (true);

-- 9. Custom Fees & Profit
DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."custom_fees";
CREATE POLICY "Enable all for public" ON "public"."custom_fees" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."profit_calculations";
CREATE POLICY "Enable all for public" ON "public"."profit_calculations" FOR ALL TO public USING (true) WITH CHECK (true);

-- 10. Suppliers & Debts & Payments
DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."suppliers";
CREATE POLICY "Enable all for public" ON "public"."suppliers" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."supplier_debts";
CREATE POLICY "Enable all for public" ON "public"."supplier_debts" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."supplier_debt_items";
CREATE POLICY "Enable all for public" ON "public"."supplier_debt_items" FOR ALL TO public USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated" ON "public"."supplier_payments";
CREATE POLICY "Enable all for public" ON "public"."supplier_payments" FOR ALL TO public USING (true) WITH CHECK (true);

-- 11. Users
DROP POLICY IF EXISTS "Allow authenticated read users" ON "public"."users";
CREATE POLICY "Allow public read users" ON "public"."users" FOR SELECT TO public USING (true);
