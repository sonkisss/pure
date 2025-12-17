-- Fix multiple permissive policies for inquiry_items and supplier_payments

-- inquiry_items
-- Drop "Allow authenticated operations on inquiry_items" (duplicate of manage policy)
DROP POLICY IF EXISTS "Allow authenticated operations on inquiry_items" ON "public"."inquiry_items";
-- Drop granular public policies which are overly permissive and redundant
DROP POLICY IF EXISTS "delete_items_authenticated" ON "public"."inquiry_items";
DROP POLICY IF EXISTS "insert_items_authenticated" ON "public"."inquiry_items";
DROP POLICY IF EXISTS "select_items_authenticated" ON "public"."inquiry_items";
DROP POLICY IF EXISTS "update_items_authenticated" ON "public"."inquiry_items";

-- supplier_payments
-- Drop "Allow users to ..." policies (overly permissive/redundant for authenticated users)
DROP POLICY IF EXISTS "Allow users to delete supplier payments" ON "public"."supplier_payments";
DROP POLICY IF EXISTS "Allow users to insert supplier payments" ON "public"."supplier_payments";
DROP POLICY IF EXISTS "Allow users to read supplier payments" ON "public"."supplier_payments";
DROP POLICY IF EXISTS "Allow users to update supplier payments" ON "public"."supplier_payments";
