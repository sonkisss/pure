-- Restore RLS policies for customers table
-- Dropped in fix_multiple_policies_customers_expenses.sql

-- Enable RLS (just in case)
ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to select customers
CREATE POLICY "Allow authenticated users to select customers" 
ON "public"."customers" 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert customers
CREATE POLICY "Allow authenticated users to insert customers" 
ON "public"."customers" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update customers
CREATE POLICY "Allow authenticated users to update customers" 
ON "public"."customers" 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete customers
CREATE POLICY "Allow authenticated users to delete customers" 
ON "public"."customers" 
FOR DELETE 
TO authenticated 
USING (true);

-- Restore expense_categories policies
ALTER TABLE "public"."expense_categories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to select expense_categories" 
ON "public"."expense_categories" 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert expense_categories" 
ON "public"."expense_categories" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update expense_categories" 
ON "public"."expense_categories" 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete expense_categories" 
ON "public"."expense_categories" 
FOR DELETE 
TO authenticated 
USING (true);

-- Restore customer_credit_records policies
ALTER TABLE "public"."customer_credit_records" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to select customer_credit_records" 
ON "public"."customer_credit_records" 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert customer_credit_records" 
ON "public"."customer_credit_records" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update customer_credit_records" 
ON "public"."customer_credit_records" 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete customer_credit_records" 
ON "public"."customer_credit_records" 
FOR DELETE 
TO authenticated 
USING (true);

-- Restore customer_payments policies
ALTER TABLE "public"."customer_payments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to select customer_payments" 
ON "public"."customer_payments" 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow authenticated users to insert customer_payments" 
ON "public"."customer_payments" 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update customer_payments" 
ON "public"."customer_payments" 
FOR UPDATE 
TO authenticated 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete customer_payments" 
ON "public"."customer_payments" 
FOR DELETE 
TO authenticated 
USING (true);
