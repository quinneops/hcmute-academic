-- Appointments Table Migration - Academic Nexus App
-- Adds support for lecturer-student scheduling and office hours
-- Date: 2026-03-30

-- ============================================================================
-- PHASE 1: CREATE APPOINTMENTS TABLE
-- ============================================================================

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lecturer_id UUID NOT NULL,
  student_id UUID,
  type TEXT NOT NULL DEFAULT 'meeting', -- 'meeting', 'defense', 'feedback', 'office_hour'

  -- Scheduling
  scheduled_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 30,
  location TEXT DEFAULT 'online', -- 'online', 'in-person', or custom
  room TEXT,

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  thesis_title TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'
  notes TEXT,
  cancellation_reason TEXT,

  -- Metadata
  council_name TEXT, -- for defense sessions
  meeting_link TEXT, -- for online meetings

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_appointments_lecturer ON appointments(lecturer_id);
CREATE INDEX idx_appointments_student ON appointments(student_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_type ON appointments(type);

-- ============================================================================
-- PHASE 2: CREATE TRIGGER FOR updated_at
-- ============================================================================

-- Trigger to auto-update updated_at column
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PHASE 3: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on appointments table
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Lecturers can view their own appointments
CREATE POLICY "lecturers_view_own_appointments" ON appointments FOR SELECT
  USING (lecturer_id = auth.uid());

-- Lecturers can create appointments
CREATE POLICY "lecturers_create_appointments" ON appointments FOR INSERT
  WITH CHECK (
    auth.uid() = lecturer_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lecturer')
  );

-- Lecturers can update their own appointments
CREATE POLICY "lecturers_update_own_appointments" ON appointments FOR UPDATE
  USING (lecturer_id = auth.uid());

-- Lecturers can delete their own appointments
CREATE POLICY "lecturers_delete_own_appointments" ON appointments FOR DELETE
  USING (lecturer_id = auth.uid());

-- Students can view their own appointments
CREATE POLICY "students_view_own_appointments" ON appointments FOR SELECT
  USING (student_id = auth.uid());

-- Admins can manage all appointments
CREATE POLICY "admins_manage_appointments" ON appointments FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
