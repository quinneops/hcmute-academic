-- Add slots_bctt and slots_kltn columns to profiles table
-- These columns track lecturer capacity for BCTT (Thực tập) and KLTN (Khóa luận)

-- Add slots_bctt column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS slots_bctt INTEGER DEFAULT 0;

-- Add slots_kltn column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS slots_kltn INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN profiles.slots_bctt IS 'Số lượng sinh viên thực tập (BCTT) giảng viên có thể hướng dẫn';
COMMENT ON COLUMN profiles.slots_kltn IS 'Số lượng sinh viên khóa luận (KLTN) giảng viên có thể hướng dẫn';
