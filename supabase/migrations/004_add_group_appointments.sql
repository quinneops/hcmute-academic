-- Appointments Table Migration - Support Group Appointments
-- Adds student_ids array for group meetings
-- Date: 2026-03-30

-- Add student_ids column (array of UUIDs)
ALTER TABLE appointments
  ADD COLUMN student_ids UUID[],
  ADD COLUMN is_group_appointment BOOLEAN DEFAULT FALSE;

-- Migrate existing data: copy student_id to student_ids[1]
UPDATE appointments
  SET student_ids = ARRAY[student_id]
  WHERE student_id IS NOT NULL;

-- Create index for querying by student_id in array
CREATE INDEX idx_appointments_student_ids ON appointments USING GIN(student_ids);

-- Add comment
COMMENT ON COLUMN appointments.student_ids IS 'Array of student IDs for group appointments';
COMMENT ON COLUMN appointments.is_group_appointment IS 'True if this is a group meeting with multiple students';
