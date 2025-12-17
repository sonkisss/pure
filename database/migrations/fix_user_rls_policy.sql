-- Fix: RLS references user_metadata (Security Vulnerability)
-- Description: Replace insecure user_metadata check with auth.uid() check
-- Date: 2025-12-12

-- 1. Add auth_id column to users table if it doesn't exist
ALTER TABLE "public"."users" 
ADD COLUMN IF NOT EXISTS "auth_id" UUID REFERENCES auth.users(id);

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON "public"."users"(auth_id);

-- 3. Backfill auth_id based on username matching phone or email
-- This attempts to link existing users by matching username to phone or email in auth.users
DO $$
BEGIN
  -- Only run update if we can access auth.users (requires appropriate permissions)
  BEGIN
    UPDATE "public"."users" pu
    SET auth_id = au.id
    FROM "auth"."users" au
    WHERE 
      (au.phone IS NOT NULL AND pu.username = au.phone) 
      OR 
      (au.email IS NOT NULL AND pu.username = au.email)
      AND pu.auth_id IS NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not backfill auth_id from auth.users: %', SQLERRM;
  END;
END $$;

-- 4. Drop the insecure policy
DROP POLICY IF EXISTS "Allow users to update own data" ON "public"."users";

-- 5. Create new secure policy
-- Only allows access if auth_id matches the authenticated user's ID
CREATE POLICY "Allow users to update own data" ON "public"."users"
FOR UPDATE
TO authenticated
USING (
  auth_id = auth.uid()
)
WITH CHECK (
  auth_id = auth.uid()
);

-- 6. Ensure SELECT policy exists
DROP POLICY IF EXISTS "Allow users to read own data" ON "public"."users";
CREATE POLICY "Allow users to read own data" ON "public"."users"
FOR SELECT
TO authenticated
USING (
  auth_id = auth.uid()
);
