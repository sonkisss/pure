-- Revert "RLS Performance Optimization" (wrapping auth.role in subquery)
-- and restore simple, robust policies for all business tables.
-- This fixes issues where data is hidden due to complex policy evaluation.

-- 1. Companies
ALTER TABLE "public"."companies" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated operations on companies" ON "public"."companies";
DROP POLICY IF EXISTS "Allow authenticated users to manage companies" ON "public"."companies";
CREATE POLICY "Enable all for authenticated" ON "public"."companies" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Contracts & Details & Attachments
ALTER TABLE "public"."contracts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated operations on contracts" ON "public"."contracts";
DROP POLICY IF EXISTS "Allow authenticated users to manage contracts" ON "public"."contracts";
CREATE POLICY "Enable all for authenticated" ON "public"."contracts" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."contract_details" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated operations on contract_details" ON "public"."contract_details";
DROP POLICY IF EXISTS "Allow authenticated users to manage contract_details" ON "public"."contract_details";
CREATE POLICY "Enable all for authenticated" ON "public"."contract_details" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."contract_attachments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage contract_attachments" ON "public"."contract_attachments";
CREATE POLICY "Enable all for authenticated" ON "public"."contract_attachments" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Inquiries & Items
ALTER TABLE "public"."inquiries" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated operations on inquiries" ON "public"."inquiries";
DROP POLICY IF EXISTS "Allow authenticated users to manage inquiries" ON "public"."inquiries";
CREATE POLICY "Enable all for authenticated" ON "public"."inquiries" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."inquiry_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated operations on inquiry_items" ON "public"."inquiry_items";
DROP POLICY IF EXISTS "Allow authenticated users to manage inquiry_items" ON "public"."inquiry_items";
CREATE POLICY "Enable all for authenticated" ON "public"."inquiry_items" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Expenses & Custom Fees & Profit
ALTER TABLE "public"."expenses" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated operations on expenses" ON "public"."expenses";
DROP POLICY IF EXISTS "Allow authenticated users to manage expenses" ON "public"."expenses";
CREATE POLICY "Enable all for authenticated" ON "public"."expenses" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."custom_fees" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage custom_fees" ON "public"."custom_fees";
CREATE POLICY "Enable all for authenticated" ON "public"."custom_fees" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."profit_calculations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage profit calculations" ON "public"."profit_calculations";
CREATE POLICY "Enable all for authenticated" ON "public"."profit_calculations" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Suppliers & Debts & Payments
ALTER TABLE "public"."suppliers" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated operations on suppliers" ON "public"."suppliers";
DROP POLICY IF EXISTS "Allow authenticated users to manage suppliers" ON "public"."suppliers";
CREATE POLICY "Enable all for authenticated" ON "public"."suppliers" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."supplier_debts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage supplier_debts" ON "public"."supplier_debts";
CREATE POLICY "Enable all for authenticated" ON "public"."supplier_debts" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."supplier_debt_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage supplier_debt_items" ON "public"."supplier_debt_items";
CREATE POLICY "Enable all for authenticated" ON "public"."supplier_debt_items" FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE "public"."supplier_payments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated users to manage supplier_payments" ON "public"."supplier_payments";
CREATE POLICY "Enable all for authenticated" ON "public"."supplier_payments" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Users (Read only for listing)
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read users" ON "public"."users";
CREATE POLICY "Allow authenticated read users" ON "public"."users" FOR SELECT TO authenticated USING (true);

-- 7. Ensure Customers & Records are also simple (Reinforce previous fix)
-- Drop the specific ones I created in previous step just to be consistent with "Enable all" naming, 
-- OR just leave them. I'll leave them if they work, but to be safe I'll add "Enable all" and drop others?
-- No, let's just make sure they exist. 
-- My previous migration created "Allow authenticated users to select customers" etc.
-- I will NOT touch them again to avoid redundancy errors, 
-- UNLESS I drop them first.
-- Let's standardise "customers" to "Enable all" too for consistency.

DROP POLICY IF EXISTS "Allow authenticated users to select customers" ON "public"."customers";
DROP POLICY IF EXISTS "Allow authenticated users to insert customers" ON "public"."customers";
DROP POLICY IF EXISTS "Allow authenticated users to update customers" ON "public"."customers";
DROP POLICY IF EXISTS "Allow authenticated users to delete customers" ON "public"."customers";
-- Drop potentially lingering ones
DROP POLICY IF EXISTS "Allow authenticated operations on customers" ON "public"."customers";
DROP POLICY IF EXISTS "Allow authenticated users to manage customers" ON "public"."customers";

CREATE POLICY "Enable all for authenticated" ON "public"."customers" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customer Credit Records
DROP POLICY IF EXISTS "Allow authenticated users to select customer_credit_records" ON "public"."customer_credit_records";
DROP POLICY IF EXISTS "Allow authenticated users to insert customer_credit_records" ON "public"."customer_credit_records";
DROP POLICY IF EXISTS "Allow authenticated users to update customer_credit_records" ON "public"."customer_credit_records";
DROP POLICY IF EXISTS "Allow authenticated users to delete customer_credit_records" ON "public"."customer_credit_records";
DROP POLICY IF EXISTS "Allow authenticated users to manage customer_credit_records" ON "public"."customer_credit_records";

CREATE POLICY "Enable all for authenticated" ON "public"."customer_credit_records" FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Customer Payments
DROP POLICY IF EXISTS "Allow authenticated users to select customer_payments" ON "public"."customer_payments";
DROP POLICY IF EXISTS "Allow authenticated users to insert customer_payments" ON "public"."customer_payments";
DROP POLICY IF EXISTS "Allow authenticated users to update customer_payments" ON "public"."customer_payments";
DROP POLICY IF EXISTS "Allow authenticated users to delete customer_payments" ON "public"."customer_payments";
DROP POLICY IF EXISTS "Allow authenticated users to manage customer_payments" ON "public"."customer_payments";

CREATE POLICY "Enable all for authenticated" ON "public"."customer_payments" FOR ALL TO authenticated USING (true) WITH CHECK (true);
