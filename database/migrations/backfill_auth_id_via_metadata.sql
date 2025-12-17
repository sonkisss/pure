-- Backfill auth_id using user_metadata (safe for admin migration)
-- This links public.users to auth.users using the username stored in metadata
DO $$
BEGIN
  UPDATE "public"."users" pu
  SET auth_id = au.id
  FROM "auth"."users" au
  WHERE 
    pu.auth_id IS NULL 
    AND (
      pu.username = (au.raw_user_meta_data ->> 'username')
    );
END $$;
