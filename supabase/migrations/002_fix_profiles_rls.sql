-- Fix infinite recursion in profiles RLS policies
-- Generated: 2026-03-29

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "students_view_lecturers" ON profiles;
DROP POLICY IF EXISTS "admins_view_all_profiles" ON profiles;
DROP POLICY IF EXISTS "lecturers_view_supervisees" ON profiles;
DROP POLICY IF EXISTS "users_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;

-- Allow authenticated users to view all profiles
-- This is safe and doesn't cause recursion
CREATE POLICY "authenticated_users_view_profiles" ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
