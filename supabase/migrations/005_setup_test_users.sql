-- Manual Test Data Setup Script
-- Run this in Supabase SQL Editor AFTER applying 004_seed_test_data.sql
-- This script creates auth.users and links to profile data

-- ============================================================================
-- IMPORTANT: This script must be run by a postgres superuser or service role
-- ============================================================================

-- ============================================================================
-- STEP 1: Create Auth Users (with temporary passwords)
-- ============================================================================
-- Note: In production, users should sign up via the app
-- For testing, we create users with known passwords

-- Function to create test user with password
CREATE OR REPLACE FUNCTION create_test_user(
  p_email TEXT,
  p_role user_role,
  p_full_name TEXT,
  p_password TEXT DEFAULT 'Test1234!'
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Create auth user
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    aud,
    role,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  )
  VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('role', p_role, 'full_name', p_full_name),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  )
  RETURNING id INTO v_user_id;

  -- Profile will be auto-created by trigger

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 2: Create Test Users
-- ============================================================================

-- Students (8 users)
SELECT create_test_user('sv20001@student.ute.vn', 'student', 'Nguyễn Văn A');
SELECT create_test_user('sv20002@student.ute.vn', 'student', 'Trần Thị B');
SELECT create_test_user('sv20003@student.ute.vn', 'student', 'Lê Văn C');
SELECT create_test_user('sv20004@student.ute.vn', 'student', 'Phạm Thị D');
SELECT create_test_user('sv20005@student.ute.vn', 'student', 'Hoàng Văn E');
SELECT create_test_user('sv20006@student.ute.vn', 'student', 'Vũ Thị F');
SELECT create_test_user('sv20007@student.ute.vn', 'student', 'Đỗ Văn G');
SELECT create_test_user('sv20008@student.ute.vn', 'student', 'Bùi Thị H');

-- Lecturers (4 users)
SELECT create_test_user('thay.nguyen@ute.edu.vn', 'lecturer', 'TS. Nguyễn Minh Trí');
SELECT create_test_user('co.tran@ute.edu.vn', 'lecturer', 'ThS. Trần Thị Lan Anh');
SELECT create_test_user('thay.le@ute.edu.vn', 'lecturer', 'PGS.TS. Lê Hoàng Dũng');
SELECT create_test_user('co.pham@ute.edu.vn', 'lecturer', 'ThS. Phạm Thị Mai');

-- Admins (2 users)
SELECT create_test_user('admin@ute.edu.vn', 'admin', 'Nguyễn Văn Admin');
SELECT create_test_user('admin2@ute.edu.vn', 'admin', 'Trần Thị Hạnh');

-- ============================================================================
-- STEP 3: Update profiles with correct IDs from auth.users
-- ============================================================================

-- Update student profiles with correct IDs
UPDATE profiles SET
  id = au.id,
  email = au.email,
  full_name = pm.full_name
FROM auth.users au
CROSS JOIN LATERAL (
  VALUES
    ('sv20001@student.ute.vn', 'Nguyễn Văn A'),
    ('sv20002@student.ute.vn', 'Trần Thị B'),
    ('sv20003@student.ute.vn', 'Lê Văn C'),
    ('sv20004@student.ute.vn', 'Phạm Thị D'),
    ('sv20005@student.ute.vn', 'Hoàng Văn E'),
    ('sv20006@student.ute.vn', 'Vũ Thị F'),
    ('sv20007@student.ute.vn', 'Đỗ Văn G'),
    ('sv20008@student.ute.vn', 'Bùi Thị H')
) AS pm(email, full_name)
WHERE au.email = pm.email
AND profiles.student_code = SUBSTRING(pm.email FROM 'sv([0-9]+)@')
AND profiles.role = 'student';

-- Update lecturer profiles
UPDATE profiles SET
  id = au.id,
  email = au.email,
  full_name = pm.full_name
FROM auth.users au
CROSS JOIN LATERAL (
  VALUES
    ('thay.nguyen@ute.edu.vn', 'TS. Nguyễn Minh Trí'),
    ('co.tran@ute.edu.vn', 'ThS. Trần Thị Lan Anh'),
    ('thay.le@ute.edu.vn', 'PGS.TS. Lê Hoàng Dũng'),
    ('co.pham@ute.edu.vn', 'ThS. Phạm Thị Mai')
) AS pm(email, full_name)
WHERE au.email = pm.email
AND profiles.role = 'lecturer';

-- Update admin profiles
UPDATE profiles SET
  id = au.id,
  email = au.email,
  full_name = pm.full_name
FROM auth.users au
CROSS JOIN LATERAL (
  VALUES
    ('admin@ute.edu.vn', 'Nguyễn Văn Admin'),
    ('admin2@ute.edu.vn', 'Trần Thị Hạnh')
) AS pm(email, full_name)
WHERE au.email = pm.email
AND profiles.role = 'admin';

-- ============================================================================
-- STEP 4: Update foreign keys in other tables
-- ============================================================================

-- Update proposals supervisor_id
UPDATE proposals p SET supervisor_id = sp.id
FROM profiles sp
WHERE p.supervisor_id = (
  SELECT id FROM profiles WHERE lecturer_code = 'GV001'
) LIMIT 1;

UPDATE proposals p SET supervisor_id = sp.id
FROM profiles sp
WHERE p.supervisor_id = (
  SELECT id FROM profiles WHERE lecturer_code = 'GV002'
) LIMIT 1;

UPDATE proposals p SET supervisor_id = sp.id
FROM profiles sp
WHERE p.supervisor_id = (
  SELECT id FROM profiles WHERE lecturer_code = 'GV003'
) LIMIT 1;

UPDATE proposals p SET supervisor_id = sp.id
FROM profiles sp
WHERE p.supervisor_id = (
  SELECT id FROM profiles WHERE lecturer_code = 'GV004'
) LIMIT 1;

-- ============================================================================
-- STEP 5: Verification Queries
-- ============================================================================

-- Check users created
SELECT
  p.role,
  COUNT(*) as count,
  STRING_AGG(p.full_name, ', ') as names
FROM profiles p
JOIN auth.users au ON au.id = p.id
GROUP BY p.role
ORDER BY p.role;

-- Check test data counts
SELECT
  'profiles' as table_name, COUNT(*) as row_count FROM profiles
UNION ALL
SELECT 'proposals', COUNT(*) FROM proposals
UNION ALL
SELECT 'registrations', COUNT(*) FROM registrations
UNION ALL
SELECT 'submissions', COUNT(*) FROM submissions
UNION ALL
SELECT 'grades', COUNT(*) FROM grades
UNION ALL
SELECT 'councils', COUNT(*) FROM councils
UNION ALL
SELECT 'defense_sessions', COUNT(*) FROM defense_sessions
UNION ALL
SELECT 'feedback', COUNT(*) FROM feedback
UNION ALL
SELECT 'notifications', COUNT(*) FROM notifications;

-- ============================================================================
-- STEP 6: Cleanup (optional - run to reset)
-- ============================================================================

-- To reset test data, uncomment and run:
-- DROP FUNCTION IF EXISTS create_test_user;
-- DELETE FROM notifications;
-- DELETE FROM feedback;
-- DELETE FROM defense_sessions;
-- DELETE FROM council_members;
-- DELETE FROM councils;
-- DELETE FROM grades;
-- DELETE FROM submissions;
-- DELETE FROM registrations;
-- DELETE FROM proposals;
-- DELETE FROM submission_rounds;
-- DELETE FROM semesters;
-- DELETE FROM profiles WHERE id IN (SELECT id FROM auth.users);
-- DELETE FROM auth.users WHERE email LIKE '%student.ute.vn' OR email LIKE '%ute.edu.vn';

-- ============================================================================
-- END OF SETUP SCRIPT
-- ============================================================================
