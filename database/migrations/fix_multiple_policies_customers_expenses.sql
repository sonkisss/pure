-- Fix multiple permissive policies for customers and expense_categories

-- customers
-- Drop "Allow authenticated operations on customers" (duplicate of manage policy)
DROP POLICY IF EXISTS "Allow authenticated operations on customers" ON "public"."customers";
-- Drop granular public policies which are overly permissive and redundant
DROP POLICY IF EXISTS "delete_customers_authenticated" ON "public"."customers";
DROP POLICY IF EXISTS "insert_customers_authenticated" ON "public"."customers";
DROP POLICY IF EXISTS "select_customers_authenticated" ON "public"."customers";
DROP POLICY IF EXISTS "update_customers_authenticated" ON "public"."customers";

-- expense_categories
-- Drop "Enable ... for all users" policies which are overly permissive and redundant
DROP POLICY IF EXISTS "Enable delete access for all users on expense_categories" ON "public"."expense_categories";
DROP POLICY IF EXISTS "Enable insert access for all users on expense_categories" ON "public"."expense_categories";
DROP POLICY IF EXISTS "Enable read access for all users on expense_categories" ON "public"."expense_categories";
DROP POLICY IF EXISTS "Enable update access for all users on expense_categories" ON "public"."expense_categories";
