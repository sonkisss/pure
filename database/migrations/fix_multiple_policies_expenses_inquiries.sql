-- Fix multiple permissive policies for expenses and inquiries

-- expenses
-- Drop "Allow all users to ..." policies (overly permissive/redundant public access)
DROP POLICY IF EXISTS "Allow all users to delete expenses" ON "public"."expenses";
DROP POLICY IF EXISTS "Allow all users to insert expenses" ON "public"."expenses";
DROP POLICY IF EXISTS "Allow all users to read expenses" ON "public"."expenses";
DROP POLICY IF EXISTS "Allow all users to update expenses" ON "public"."expenses";
-- Drop "Allow authenticated operations on expenses" (duplicate of manage policy)
DROP POLICY IF EXISTS "Allow authenticated operations on expenses" ON "public"."expenses";

-- inquiries
-- Drop "Allow authenticated operations on inquiries" (duplicate of manage policy)
DROP POLICY IF EXISTS "Allow authenticated operations on inquiries" ON "public"."inquiries";
-- Drop granular public policies which are overly permissive and redundant
DROP POLICY IF EXISTS "delete_inquiries_authenticated" ON "public"."inquiries";
DROP POLICY IF EXISTS "insert_inquiries_authenticated" ON "public"."inquiries";
DROP POLICY IF EXISTS "select_inquiries_authenticated" ON "public"."inquiries";
DROP POLICY IF EXISTS "update_inquiries_authenticated" ON "public"."inquiries";
