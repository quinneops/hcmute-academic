-- Academic Nexus Database Schema
-- HCM-UTE Thesis Management System
-- Generated: 2026-03-29

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

CREATE TYPE user_role AS ENUM ('student', 'lecturer', 'admin');
CREATE TYPE proposal_status AS ENUM ('draft', 'pending', 'approved', 'rejected', 'archived');
CREATE TYPE registration_status AS ENUM ('pending', 'approved', 'rejected', 'withdrawn', 'completed');
CREATE TYPE submission_status AS ENUM ('submitted', 'graded', 'late', 'resubmitted');
CREATE TYPE defense_status AS ENUM ('scheduled', 'completed', 'cancelled', 'postponed');
CREATE TYPE notification_type AS ENUM ('system', 'academic', 'deadline', 'feedback');
CREATE TYPE council_member_role AS ENUM ('chair', 'secretary', 'member', 'opponent1', 'opponent2');

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- 1. profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'student',
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
  name TEXT NOT NULL UNIQUE, -- "HK2 2024-2025"
  academic_year TEXT NOT NULL, -- "2024-2025"
  semester_number INTEGER NOT NULL CHECK (semester_number IN (1, 2, 3)),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  registration_start DATE,
  registration_end DATE,
  is_active BOOLEAN DEFAULT false,
  is_current BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_semesters_is_current ON semesters(is_current);
CREATE INDEX idx_semesters_is_active ON semesters(is_active);

-- 3. proposals (thesis topics)
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  supervisor_id UUID REFERENCES profiles(id),
  co_supervisor_id UUID REFERENCES profiles(id),
  semester_id UUID REFERENCES semesters(id),
  status proposal_status NOT NULL DEFAULT 'draft',
  max_students INTEGER DEFAULT 1,
  requirements TEXT,
  estimated_duration INTEGER, -- weeks
  is_industrial BOOLEAN DEFAULT false,
  company_name TEXT,
  company_mentor TEXT,
  views_count INTEGER DEFAULT 0,
  registrations_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_proposals_supervisor ON proposals(supervisor_id);
CREATE INDEX idx_proposals_semester ON proposals(semester_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_category ON proposals(category);
CREATE INDEX idx_proposals_tags ON proposals USING GIN(tags);

-- 4. registrations (student registers for thesis)
CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
  status registration_status NOT NULL DEFAULT 'pending',
  registration_number TEXT UNIQUE,
  motivation_letter TEXT,
  proposed_title TEXT,
  revised_description TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  review_notes TEXT,
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  final_score DECIMAL(5,2),
  final_grade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, proposal_id)
);

CREATE INDEX idx_registrations_student ON registrations(student_id);
CREATE INDEX idx_registrations_proposal ON registrations(proposal_id);
CREATE INDEX idx_registrations_status ON registrations(status);

-- 5. submission_rounds (configuration for each semester)
CREATE TABLE submission_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL CHECK (round_number BETWEEN 1 AND 4),
  name TEXT NOT NULL, -- "Đề cương chi tiết", "Báo cáo tiến độ 1", etc.
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  grace_period_hours INTEGER DEFAULT 0,
  max_file_size_mb INTEGER DEFAULT 20,
  allowed_file_types TEXT[] DEFAULT '{"pdf"}',
  is_active BOOLEAN DEFAULT false,
  weight_percentage DECIMAL(5,2) DEFAULT 25.00, -- percentage of final grade
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(semester_id, round_number)
);

CREATE INDEX idx_submission_rounds_semester ON submission_rounds(semester_id);
CREATE INDEX idx_submission_rounds_active ON submission_rounds(is_active);

-- 6. submissions (student submissions by round)
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  round_id UUID REFERENCES submission_rounds(id),
  round_number INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER, -- bytes
  file_mime_type TEXT,
  storage_path TEXT,
  checksum TEXT, -- for file integrity
  status submission_status NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  late_penalty DECIMAL(5,2) DEFAULT 0.00,
  graded_at TIMESTAMPTZ,
  graded_by UUID REFERENCES profiles(id),
  version INTEGER DEFAULT 1,
  previous_submission_id UUID REFERENCES submissions(id),
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_registration ON submissions(registration_id);
CREATE INDEX idx_submissions_round ON submissions(round_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_submitted_at ON submissions(submitted_at);

-- 7. grades (council/lecturer grades)
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  grader_id UUID REFERENCES profiles(id),
  grader_role TEXT CHECK (grader_role IN ('supervisor', 'opponent1', 'opponent2', 'council')),
  criteria_scores JSONB NOT NULL DEFAULT '{}', -- {"content": 8.5, "methodology": 7.0, ...}
  criteria_1_score DECIMAL(4,2), -- Content / Nội dung
  criteria_2_score DECIMAL(4,2), -- Methodology / Phương pháp
  criteria_3_score DECIMAL(4,2), -- Presentation / Trình bày
  criteria_4_score DECIMAL(4,2), -- Q&A / Trả lời câu hỏi
  total_score DECIMAL(4,2),
  weight_percentage DECIMAL(5,2) DEFAULT 25.00,
  feedback TEXT,
  private_notes TEXT,
  is_published BOOLEAN DEFAULT false,
  graded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_grades_submission ON grades(submission_id);
CREATE INDEX idx_grades_grader ON grades(grader_id);
CREATE INDEX idx_grades_published ON grades(is_published);

-- 8. councils (defense councils)
CREATE TABLE councils (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- "Hội đồng 1", "Hội đồng 2"
  code TEXT UNIQUE, -- "HD-2024-001"
  semester_id UUID REFERENCES semesters(id),
  chair_id UUID REFERENCES profiles(id),
  secretary_id UUID REFERENCES profiles(id),
  room TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'assigned', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_councils_semester ON councils(semester_id);
CREATE INDEX idx_councils_status ON councils(status);

-- 9. council_members
CREATE TABLE council_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  council_id UUID REFERENCES councils(id) ON DELETE CASCADE,
  member_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role council_member_role NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(council_id, member_id)
);

CREATE INDEX idx_council_members_council ON council_members(council_id);
CREATE INDEX idx_council_members_member ON council_members(member_id);

-- 10. defense_sessions
CREATE TABLE defense_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  council_id UUID REFERENCES councils(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  sequence_number INTEGER, -- order in council
  scheduled_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 45,
  room TEXT,
  status defense_status NOT NULL DEFAULT 'scheduled',
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  notes TEXT,
  result_score DECIMAL(5,2),
  result_grade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_defense_sessions_council ON defense_sessions(council_id);
CREATE INDEX idx_defense_sessions_registration ON defense_sessions(registration_id);
CREATE INDEX idx_defense_sessions_status ON defense_sessions(status);
CREATE INDEX idx_defense_sessions_scheduled ON defense_sessions(scheduled_at);

-- 11. feedback (lecturer feedback to student)
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id UUID REFERENCES registrations(id) ON DELETE CASCADE,
  lecturer_id UUID REFERENCES profiles(id),
  round_number INTEGER,
  content TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  parent_id UUID REFERENCES feedback(id), -- for threaded replies
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_registration ON feedback(registration_id);
CREATE INDEX idx_feedback_lecturer ON feedback(lecturer_id);
CREATE INDEX idx_feedback_is_read ON feedback(is_read);
CREATE INDEX idx_feedback_created ON feedback(created_at);

-- 12. notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  type notification_type NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
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
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- 13. audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
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
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);

-- 14. settings (system-wide settings)
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Student thesis progress
CREATE VIEW student_thesis_progress AS
SELECT
  r.id as registration_id,
  r.student_id,
  r.status as registration_status,
  p.title as thesis_title,
  p.supervisor_id,
  p.semester_id,
  s.name as semester_name,
  COUNT(sub.id) as total_submissions,
  MAX(sub.submitted_at) as last_submission_at,
  AVG(g.total_score) as average_score,
  ds.scheduled_at as defense_date,
  ds.status as defense_status
FROM registrations r
LEFT JOIN proposals p ON r.proposal_id = p.id
LEFT JOIN semesters s ON p.semester_id = s.id
LEFT JOIN submissions sub ON r.id = sub.registration_id
LEFT JOIN grades g ON sub.id = g.submission_id
LEFT JOIN defense_sessions ds ON r.id = ds.registration_id
GROUP BY r.id, r.student_id, r.status, p.id, p.title, p.supervisor_id, p.semester_id, s.name, ds.scheduled_at, ds.status;

-- View: Lecturer workload
CREATE VIEW lecturer_workload AS
SELECT
  p.id as lecturer_id,
  p.full_name as lecturer_name,
  COUNT(DISTINCT prop.id) as total_proposals,
  COUNT(DISTINCT CASE WHEN prop.status = 'approved' THEN prop.id END) as approved_proposals,
  COUNT(DISTINCT r.id) as total_students,
  COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END) as completed_students,
  COUNT(DISTINCT g.id) as pending_gradings
FROM profiles p
LEFT JOIN proposals prop ON p.id = prop.supervisor_id
LEFT JOIN registrations r ON prop.id = r.proposal_id
LEFT JOIN submissions s ON r.id = s.registration_id
LEFT JOIN grades g ON s.id = g.submission_id AND g.grader_id = p.id AND NOT g.is_published
WHERE p.role = 'lecturer'
GROUP BY p.id, p.full_name;

-- View: Admin dashboard stats
CREATE VIEW admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE role = 'student' AND is_active = true) as active_students,
  (SELECT COUNT(*) FROM profiles WHERE role = 'lecturer' AND is_active = true) as active_lecturers,
  (SELECT COUNT(*) FROM proposals WHERE status = 'approved') as approved_theses,
  (SELECT COUNT(*) FROM registrations WHERE status = 'pending') as pending_registrations,
  (SELECT COUNT(*) FROM submissions WHERE status = 'submitted') as pending_submissions,
  (SELECT COUNT(*) FROM defense_sessions WHERE status = 'scheduled') as scheduled_defenses,
  (SELECT COUNT(*) FROM semesters WHERE is_current = true) as current_semester_id;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_semesters_updated_at BEFORE UPDATE ON semesters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_proposals_updated_at BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_registrations_updated_at BEFORE UPDATE ON registrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_councils_updated_at BEFORE UPDATE ON councils
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate slug for proposals
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

-- Auto-create notification on new feedback
CREATE OR REPLACE FUNCTION create_feedback_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, content, type, priority, action_url)
  SELECT
    r.student_id,
    'Phản hồi mới từ giảng viên',
    LEFT(NEW.content, 100) || '...',
    'feedback'::notification_type,
    'high',
    '/student/feedback/' || NEW.id
  FROM registrations r
  WHERE r.id = NEW.registration_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_feedback_notification_after_insert AFTER INSERT ON feedback
  FOR EACH ROW EXECUTE FUNCTION create_feedback_notification();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE councils ENABLE ROW LEVEL SECURITY;
ALTER TABLE council_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE defense_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission_rounds ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- profiles policies
-- ----------------------------------------------------------------------------

-- Users can view their own profile
CREATE POLICY "users_view_own_profile" ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Students can view all lecturers
CREATE POLICY "students_view_lecturers" ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
  );

-- Admins can view all profiles
CREATE POLICY "admins_view_all_profiles" ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lecturers can view student profiles they supervise
CREATE POLICY "lecturers_view_supervisees" ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM registrations r
      JOIN proposals p ON r.proposal_id = p.id
      WHERE r.student_id = profiles.id
      AND p.supervisor_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- semesters policies
-- ----------------------------------------------------------------------------

-- Everyone can view active semesters
CREATE POLICY "everyone_view_active_semesters" ON semesters FOR SELECT
  USING (is_active = true OR is_current = true);

-- Admins can manage semesters
CREATE POLICY "admins_manage_semesters" ON semesters FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- proposals policies
-- ----------------------------------------------------------------------------

-- Everyone can view approved proposals
CREATE POLICY "everyone_view_approved_proposals" ON proposals FOR SELECT
  USING (status = 'approved');

-- Lecturers can view their own proposals (any status)
CREATE POLICY "lecturers_view_own_proposals" ON proposals FOR SELECT
  USING (supervisor_id = auth.uid());

-- Lecturers can create proposals
CREATE POLICY "lecturers_create_proposals" ON proposals FOR INSERT
  WITH CHECK (
    auth.uid() = supervisor_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lecturer')
  );

-- Lecturers can update their own proposals
CREATE POLICY "lecturers_update_own_proposals" ON proposals FOR UPDATE
  USING (supervisor_id = auth.uid());

-- Admins can manage all proposals
CREATE POLICY "admins_manage_proposals" ON proposals FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- registrations policies
-- ----------------------------------------------------------------------------

-- Students can view their own registrations
CREATE POLICY "students_view_own_registrations" ON registrations FOR SELECT
  USING (student_id = auth.uid());

-- Students can create their own registrations
CREATE POLICY "students_create_registrations" ON registrations FOR INSERT
  WITH CHECK (
    auth.uid() = student_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
  );

-- Lecturers can view registrations for their proposals
CREATE POLICY "lecturers_view_proposal_registrations" ON registrations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM proposals
      WHERE proposals.id = registrations.proposal_id
      AND proposals.supervisor_id = auth.uid()
    )
  );

-- Admins can manage all registrations
CREATE POLICY "admins_manage_registrations" ON registrations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- submissions policies
-- ----------------------------------------------------------------------------

-- Students can view their own submissions
CREATE POLICY "students_view_own_submissions" ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM registrations
      WHERE registrations.id = submissions.registration_id
      AND registrations.student_id = auth.uid()
    )
  );

-- Students can submit their own work
CREATE POLICY "students_create_submissions" ON submissions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM registrations
      WHERE registrations.id = submissions.registration_id
      AND registrations.student_id = auth.uid()
    )
  );

-- Lecturers can view submissions for their students
CREATE POLICY "lecturers_view_student_submissions" ON submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM registrations r
      JOIN proposals p ON r.proposal_id = p.id
      WHERE r.id = submissions.registration_id
      AND p.supervisor_id = auth.uid()
    )
  );

-- Admins can view all submissions
CREATE POLICY "admins_view_all_submissions" ON submissions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- grades policies
-- ----------------------------------------------------------------------------

-- Students can view their own published grades
CREATE POLICY "students_view_own_grades" ON grades FOR SELECT
  USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM submissions s
      JOIN registrations r ON s.registration_id = r.id
      WHERE s.id = grades.submission_id
      AND r.student_id = auth.uid()
    )
  );

-- Graders can view and create their own grades
CREATE POLICY "graders_manage_own_grades" ON grades FOR ALL
  USING (grader_id = auth.uid());

-- Admins can manage all grades
CREATE POLICY "admins_manage_grades" ON grades FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ----------------------------------------------------------------------------
-- notifications policies
-- ----------------------------------------------------------------------------

-- Users can view their own notifications
CREATE POLICY "users_view_own_notifications" ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "users_update_own_notifications" ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- System can create notifications (service role)
-- This is handled by triggers and service role

-- ----------------------------------------------------------------------------
-- feedback policies
-- ----------------------------------------------------------------------------

-- Students can view feedback on their registrations
CREATE POLICY "students_view_own_feedback" ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM registrations
      WHERE registrations.id = feedback.registration_id
      AND registrations.student_id = auth.uid()
    )
  );

-- Lecturers can view feedback for their students
CREATE POLICY "lecturers_view_student_feedback" ON feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM registrations r
      JOIN proposals p ON r.proposal_id = p.id
      WHERE r.id = feedback.registration_id
      AND p.supervisor_id = auth.uid()
    )
  );

-- Lecturers can create feedback
CREATE POLICY "lecturers_create_feedback" ON feedback FOR INSERT
  WITH CHECK (
    auth.uid() = lecturer_id AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lecturer')
  );

-- Students can reply to feedback
CREATE POLICY "students_reply_feedback" ON feedback FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM registrations
      WHERE registrations.id = feedback.registration_id
      AND registrations.student_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- councils policies
-- ----------------------------------------------------------------------------

-- Admins can manage councils
CREATE POLICY "admins_manage_councils" ON councils FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lecturers can view councils they are members of
CREATE POLICY "lecturers_view_councils" ON councils FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM council_members
      WHERE council_members.council_id = councils.id
      AND council_members.member_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- defense_sessions policies
-- ----------------------------------------------------------------------------

-- Students can view their own defense sessions
CREATE POLICY "students_view_own_defense" ON defense_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM registrations
      WHERE registrations.id = defense_sessions.registration_id
      AND registrations.student_id = auth.uid()
    )
  );

-- Admins can manage defense sessions
CREATE POLICY "admins_manage_defense" ON defense_sessions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default settings
INSERT INTO settings (key, value, description, is_public) VALUES
  ('system.name', '{"en": "Academic Nexus", "vi": "Hệ thống Quản lý Khóa luận"}', 'System name', true),
  ('system.logo_url', '{"light": "/logo-light.png", "dark": "/logo-dark.png"}', 'System logo', true),
  ('auth.allowed_domains', '["students.ute.vn", "ute.edu.vn"]', 'Allowed email domains for OAuth', false),
  ('submission.max_file_size_mb', '20', 'Maximum file size for submissions', true),
  ('defense.default_duration_minutes', '45', 'Default defense duration', true);

-- ============================================================================
-- STORAGE BUCKETS (to be created via Supabase dashboard or API)
-- ============================================================================

-- Bucket: submissions
-- - Path pattern: {semester_id}/{registration_id}/{submission_id}/{file_name}
-- - RLS: Students can upload to their own folder, lecturers/admins can read all

-- Bucket: attachments
-- - Path pattern: {entity_type}/{entity_id}/{file_name}
-- - For feedback attachments, proposal documents, etc.

-- Bucket: avatars
-- - Path pattern: {user_id}/{file_name}
-- - Public read, users can upload their own

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
