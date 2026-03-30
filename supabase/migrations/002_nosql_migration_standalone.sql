-- Run this SQL in your Supabase SQL Editor
-- Go to: https://hhqwraokxkynkmushugf.supabase.co/project/editor/sql
-- Copy and paste this entire script, then click "Run"

-- ============================================================================
-- NoSQL Database Migration - Academic Nexus App
-- ============================================================================

-- Drop existing tables (cascade handles FK dependencies)
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS defense_sessions CASCADE;
DROP TABLE IF EXISTS council_members CASCADE;
DROP TABLE IF EXISTS councils CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS grades CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS submission_rounds CASCADE;
DROP TABLE IF EXISTS registrations CASCADE;
DROP TABLE IF EXISTS proposals CASCADE;
DROP TABLE IF EXISTS semesters CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop old views
DROP VIEW IF EXISTS admin_dashboard_stats CASCADE;
DROP VIEW IF EXISTS lecturer_workload CASCADE;
DROP VIEW IF EXISTS student_thesis_progress CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS create_feedback_notification_after_insert ON feedback;
DROP TRIGGER IF EXISTS generate_proposal_slug_before_insert ON proposals;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_semesters_updated_at ON semesters;
DROP TRIGGER IF EXISTS update_proposals_updated_at ON proposals;
DROP TRIGGER IF EXISTS update_registrations_updated_at ON registrations;
DROP TRIGGER IF EXISTS update_submissions_updated_at ON submissions;
DROP TRIGGER IF EXISTS update_councils_updated_at ON councils;
DROP TRIGGER IF EXISTS update_feedback_updated_at ON feedback;

-- Drop functions
DROP FUNCTION IF EXISTS create_feedback_notification();
DROP FUNCTION IF EXISTS generate_proposal_slug();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop enums
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS proposal_status CASCADE;
DROP TYPE IF EXISTS registration_status CASCADE;
DROP TYPE IF EXISTS submission_status CASCADE;
DROP TYPE IF EXISTS defense_status CASCADE;
DROP TYPE IF EXISTS notification_type CASCADE;
DROP TYPE IF EXISTS council_member_role CASCADE;

-- ============================================================================
-- CREATE NEW SCHEMA
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student',
  student_code TEXT UNIQUE,
  lecturer_code TEXT UNIQUE,
  department TEXT,
  faculty TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_student_code ON profiles(student_code);

-- 2. semesters
CREATE TABLE semesters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  academic_year TEXT NOT NULL,
  semester_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  registration_start DATE,
  registration_end DATE,
  is_active BOOLEAN DEFAULT false,
  is_current BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  rounds JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_semesters_is_current ON semesters(is_current);
CREATE INDEX idx_semesters_is_active ON semesters(is_active);

-- 3. proposals
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  supervisor_id UUID,
  supervisor_name TEXT,
  supervisor_email TEXT,
  co_supervisor_id UUID,
  co_supervisor_name TEXT,
  co_supervisor_email TEXT,
  semester_id UUID,
  semester_name TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  max_students INTEGER DEFAULT 1,
  requirements TEXT,
  estimated_duration INTEGER,
  is_industrial BOOLEAN DEFAULT false,
  company_name TEXT,
  company_mentor TEXT,
  views_count INTEGER DEFAULT 0,
  registrations_summary JSONB DEFAULT '[]'::jsonb,
  registrations_count INTEGER DEFAULT 0,
  approved_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_proposals_supervisor ON proposals(supervisor_id);
CREATE INDEX idx_proposals_semester ON proposals(semester_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_registrations ON proposals USING GIN (registrations_summary);

-- 4. registrations (embeds submissions, grades, feedback, defense)
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  student_code TEXT,
  proposal_id UUID,
  proposal_title TEXT,
  proposal_supervisor_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  registration_number TEXT UNIQUE,
  motivation_letter TEXT,
  proposed_title TEXT,
  revised_description TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  reviewed_by_name TEXT,
  review_notes TEXT,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  submissions JSONB DEFAULT '[]'::jsonb,
  final_score DECIMAL(5,2),
  final_grade TEXT,
  feedback_thread JSONB DEFAULT '[]'::jsonb,
  defense_session JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_registrations_student ON registrations(student_id);
CREATE INDEX idx_registrations_proposal ON registrations(proposal_id);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_submissions ON registrations USING GIN (submissions);
CREATE INDEX idx_registrations_feedback ON registrations USING GIN (feedback_thread);

-- 5. councils
CREATE TABLE councils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  semester_id UUID,
  semester_name TEXT,
  chair_id UUID,
  chair_name TEXT,
  secretary_id UUID,
  secretary_name TEXT,
  members JSONB DEFAULT '[]'::jsonb,
  room TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  defenses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_councils_semester ON councils(semester_id);
CREATE INDEX idx_councils_status ON councils(status);
CREATE INDEX idx_councils_defenses ON councils USING GIN (defenses);

-- 6. notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_name TEXT,
  title TEXT NOT NULL,
  content TEXT,
  type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  action_url TEXT,
  action_label TEXT,
  metadata JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- 7. audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_name TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- 8. settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON semesters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_councils_updated_at BEFORE UPDATE ON councils
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION generate_proposal_slug()
RETURNS TRIGGER AS $$
BEGIN
  NEW.slug = LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(NEW.title, '[^a-zA-Z0-9 ]', ''),
        ' +', '-'
      ),
      '^[-]+|[-]+$', ''
    )
  ) || '-' || SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_proposal_slug_before_insert BEFORE INSERT ON proposals
  FOR EACH ROW WHEN (NEW.slug IS NULL)
  EXECUTE FUNCTION generate_proposal_slug();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE councils ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- profiles policies
CREATE POLICY "users_view_own_profile" ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "everyone_view_profiles" ON profiles FOR SELECT
  USING (true);

-- semesters policies
CREATE POLICY "everyone_view_active_semesters" ON semesters FOR SELECT
  USING (is_active = true OR is_current = true);

CREATE POLICY "admins_manage_semesters" ON semesters FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- proposals policies
CREATE POLICY "everyone_view_approved_proposals" ON proposals FOR SELECT
  USING (status = 'approved');

CREATE POLICY "lecturers_view_own_proposals" ON proposals FOR SELECT
  USING (supervisor_id = auth.uid());

CREATE POLICY "lecturers_create_proposals" ON proposals FOR INSERT
  WITH CHECK (
    auth.uid() = supervisor_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lecturer')
  );

CREATE POLICY "lecturers_update_own_proposals" ON proposals FOR UPDATE
  USING (supervisor_id = auth.uid());

CREATE POLICY "admins_manage_proposals" ON proposals FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- registrations policies
CREATE POLICY "students_view_own_registrations" ON registrations FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "students_create_registrations" ON registrations FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
  );

CREATE POLICY "lecturers_view_own_registrations" ON registrations FOR SELECT
  USING (proposal_supervisor_id = auth.uid());

CREATE POLICY "admins_manage_registrations" ON registrations FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- councils policies
CREATE POLICY "admins_manage_councils" ON councils FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "lecturers_view_councils" ON councils FOR SELECT
  USING (chair_id = auth.uid() OR secretary_id = auth.uid());

-- notifications policies
CREATE POLICY "users_view_own_notifications" ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users_update_own_notifications" ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- audit_logs policies
CREATE POLICY "users_view_own_logs" ON audit_logs FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "admins_view_all_logs" ON audit_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- settings policies
CREATE POLICY "everyone_view_public_settings" ON settings FOR SELECT
  USING (is_public = true);

CREATE POLICY "admins_manage_settings" ON settings FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- SEED DATA
-- ============================================================================

INSERT INTO settings (key, value, description, is_public) VALUES
  ('system.name', '{"en": "Academic Nexus", "vi": "Hệ thống Quản lý Khóa luận"}', 'System name', true),
  ('system.logo_url', '{"light": "/logo-light.png", "dark": "/logo-dark.png"}', 'System logo', true),
  ('submission.max_file_size_mb', '20', 'Maximum file size for submissions', true),
  ('defense.default_duration_minutes', '45', 'Default defense duration', true);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
