-- Fix multiple permissive policies for suppliers and users

-- suppliers
-- Drop "Allow authenticated operations on suppliers" (duplicate of manage policy)
DROP POLICY IF EXISTS "Allow authenticated operations on suppliers" ON "public"."suppliers";
-- Drop granular public policies which are overly permissive and redundant
DROP POLICY IF EXISTS "delete_suppliers_authenticated" ON "public"."suppliers";
DROP POLICY IF EXISTS "insert_suppliers_authenticated" ON "public"."suppliers";
DROP POLICY IF EXISTS "select_suppliers_authenticated" ON "public"."suppliers";
DROP POLICY IF EXISTS "update_suppliers_authenticated" ON "public"."suppliers";

-- users
-- Drop various redundant policies in favor of a single management policy
DROP POLICY IF EXISTS "Allow authenticated read users" ON "public"."users";
DROP POLICY IF EXISTS "Allow users to read own data" ON "public"."users";
DROP POLICY IF EXISTS "Allow users to update own data" ON "public"."users";
DROP POLICY IF EXISTS "users_full_access_for_authenticated" ON "public"."users";

-- Create standardized policy for users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'users'
        AND policyname = 'Allow authenticated users to manage users'
    ) THEN
        CREATE POLICY "Allow authenticated users to manage users" ON "public"."users"
        AS PERMISSIVE FOR ALL
        TO authenticated
        USING ((select auth.role()) = 'authenticated')
        WITH CHECK ((select auth.role()) = 'authenticated');
    END IF;
END $$;
