-- Fix profiles RLS and add auto-create profile trigger
-- Generated: 2026-03-29
-- Updated: 2026-03-30 - Removed user_role enum references (now TEXT)

-- ============================================================================
-- PART 1: Fix RLS policies to avoid infinite recursion
-- ============================================================================

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "students_view_lecturers" ON profiles;
DROP POLICY IF EXISTS "admins_view_all_profiles" ON profiles;
DROP POLICY IF EXISTS "lecturers_view_supervisees" ON profiles;
DROP POLICY IF EXISTS "authenticated_users_view_profiles" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "everyone_view_profiles" ON profiles;
DROP POLICY IF EXISTS "users_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "enable_insert_for_auth_users" ON profiles;

-- Create fixed policies that reference auth.users instead of profiles
-- Allow all authenticated users to view all profiles
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

-- Allow auth service to insert profiles during signup
CREATE POLICY "enable_insert_for_auth_users" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- PART 2: Add trigger to auto-create profile when user signs up
-- ============================================================================

-- Function to create profile when user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),  -- TEXT, not user_role enum
    true
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- PART 3: Backfill profiles for existing users without profiles
-- ============================================================================

INSERT INTO public.profiles (id, email, full_name, role, is_active)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  COALESCE(u.raw_user_meta_data->>'role', 'student'),  -- TEXT, not user_role enum
  true
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
