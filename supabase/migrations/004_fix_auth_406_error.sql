-- Fix Supabase Auth 406 Error
-- This ensures the profiles table is compatible with Supabase Auth's Additional Fields feature
-- Migration: 004_fix_auth_406_error.sql

-- ============================================================================
-- PROBLEM: Supabase Auth "Additional Fields" feature causes 406 error
-- SOLUTION: Ensure table structure and RLS policies are compatible
-- ============================================================================

-- 1. Drop and recreate RLS policies to allow auth service
DROP POLICY IF EXISTS "auth_service_manage_profiles" ON profiles;
DROP POLICY IF EXISTS "enable_insert_for_auth_users" ON profiles;
DROP POLICY IF EXISTS "authenticated_users_view_profiles" ON profiles;
DROP POLICY IF EXISTS "users_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "everyone_view_profiles" ON profiles;

-- Allow authenticated users to view all profiles (needed for auth metadata queries)
CREATE POLICY "authenticated_users_view_profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow insert during auth signup
CREATE POLICY "enable_insert_for_auth_users" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to update their own profile
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 2. Ensure the profiles table has proper structure for Auth
-- (id must match auth.users.id type exactly)
ALTER TABLE profiles
  ALTER COLUMN id TYPE UUID,
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN email TYPE TEXT,
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN role TYPE TEXT,
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN role SET DEFAULT 'student';

-- 3. Grant necessary permissions
GRANT ALL ON TABLE profiles TO postgres;
GRANT ALL ON TABLE profiles TO authenticated;
GRANT ALL ON TABLE profiles TO service_role;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- 4. Ensure trigger exists for auto-creating profiles
-- (This runs BEFORE the 406 error would occur, preventing the issue)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile with minimal required fields
  INSERT INTO public.profiles (id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Backfill any missing profiles
INSERT INTO public.profiles (id, email, full_name, role, is_active, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role', 'student'),
  true,
  NOW(),
  NOW()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 6. Log for debugging
DO $$
BEGIN
  RAISE NOTICE 'Auth 406 fix applied: RLS policies updated, trigger recreated';
END $$;
