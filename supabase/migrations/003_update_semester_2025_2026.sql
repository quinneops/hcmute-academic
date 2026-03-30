-- Update Semester to 2025-2026
-- Run this SQL in Supabase SQL Editor: https://hhqwraokxkynkmushugf.supabase.co/project/editor/sql

-- ============================================================================
-- Option 1: Update existing semester (nếu có học kỳ 2024-2025)
-- ============================================================================

-- Update học kỳ hiện tại từ 2024-2025 sang 2025-2026
UPDATE semesters
SET
  name = 'HK2 2025-2026',
  academic_year = '2025-2026',
  semester_number = 2,
  start_date = '2025-08-01',
  end_date = '2026-01-31',
  registration_start = '2025-07-01',
  registration_end = '2025-08-15',
  updated_at = NOW()
WHERE academic_year = '2024-2025' AND semester_number = 2;

-- Hoặc update theo tên
UPDATE semesters
SET
  name = 'HK2 2025-2026',
  academic_year = '2025-2026',
  semester_number = 2,
  start_date = '2025-08-01',
  end_date = '2026-01-31',
  registration_start = '2025-07-01',
  registration_end = '2025-08-15',
  updated_at = NOW()
WHERE name LIKE '%2024-2025%';

-- ============================================================================
-- Option 2: Insert mới học kỳ 2025-2026 (nếu chưa có)
-- ============================================================================

INSERT INTO semesters (
  name,
  academic_year,
  semester_number,
  start_date,
  end_date,
  registration_start,
  registration_end,
  is_active,
  is_current,
  metadata,
  rounds
) VALUES (
  'HK2 2025-2026',
  '2025-2026',
  2,
  '2025-08-01',
  '2026-01-31',
  '2025-07-01',
  '2025-08-15',
  true,
  true,
  '{}'::jsonb,
  '[]'::jsonb
) ON CONFLICT (name) DO UPDATE SET
  academic_year = '2025-2026',
  semester_number = 2,
  start_date = '2025-08-01',
  end_date = '2026-01-31',
  registration_start = '2025-07-01',
  registration_end = '2025-08-15',
  is_active = true,
  is_current = true,
  updated_at = NOW();

-- ============================================================================
-- Verify: Kiểm tra học kỳ đã update
-- ============================================================================

SELECT
  id,
  name,
  academic_year,
  semester_number,
  start_date,
  end_date,
  is_current
FROM semesters
WHERE academic_year = '2025-2026' OR name LIKE '%2025-2026%';
