-- Academic Nexus - Lecturer Features Migration
-- Run: 2026-03-29
-- Purpose: Add indexes, functions, and triggers for lecturer dashboard features

-- ============================================================================
-- 1. PERFORMANCE INDEXES
-- ============================================================================

-- Indexes for lecturer queries performance
CREATE INDEX IF NOT EXISTS proposals_supervisor_status_idx ON proposals(supervisor_id, status);
CREATE INDEX IF NOT EXISTS proposals_supervisor_semester_idx ON proposals(supervisor_id, semester_id);
CREATE INDEX IF NOT EXISTS registrations_proposal_status_idx ON registrations(proposal_id, status);
CREATE INDEX IF NOT EXISTS registrations_student_status_idx ON registrations(student_id, status);
CREATE INDEX IF NOT EXISTS submissions_round_status_idx ON submissions(round_id, status);
CREATE INDEX IF NOT EXISTS submissions_registration_status_idx ON submissions(registration_id, status);
CREATE INDEX IF NOT EXISTS grades_grader_published_idx ON grades(grader_id, is_published);
CREATE INDEX IF NOT EXISTS grades_submission_idx ON grades(submission_id);
CREATE INDEX IF NOT EXISTS feedback_lecturer_created_idx ON feedback(lecturer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS feedback_registration_idx ON feedback(registration_id);
CREATE INDEX IF NOT EXISTS defense_sessions_scheduled_status_idx ON defense_sessions(scheduled_at, status);
CREATE INDEX IF NOT EXISTS defense_sessions_registration_idx ON defense_sessions(registration_id);
CREATE INDEX IF NOT EXISTS council_members_member_idx ON council_members(member_id);

-- ============================================================================
-- 2. HELPER FUNCTIONS FOR LECTURER DASHBOARD
-- ============================================================================

-- Function: Get lecturer's total students count
CREATE OR REPLACE FUNCTION get_lecturer_student_count(lecturer_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT r.student_id)
  FROM registrations r
  JOIN proposals p ON r.proposal_id = p.id
  WHERE p.supervisor_id = lecturer_uuid
  AND r.status NOT IN ('withdrawn', 'rejected')
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function: Get pending grading count for lecturer
CREATE OR REPLACE FUNCTION get_pending_grading_count(lecturer_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)
  FROM submissions s
  JOIN registrations r ON s.registration_id = r.id
  JOIN proposals p ON r.proposal_id = p.id
  WHERE p.supervisor_id = lecturer_uuid
  AND s.status = 'submitted'
  AND NOT EXISTS (
    SELECT 1 FROM grades g
    WHERE g.submission_id = s.id AND g.grader_id = lecturer_uuid
  )
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function: Get upcoming defenses count for lecturer (next 7 days)
CREATE OR REPLACE FUNCTION get_upcoming_defense_count(lecturer_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)
  FROM defense_sessions ds
  JOIN registrations r ON ds.registration_id = r.id
  JOIN proposals p ON r.proposal_id = p.id
  WHERE p.supervisor_id = lecturer_uuid
  AND ds.status = 'scheduled'
  AND ds.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function: Get pending proposals count for lecturer
CREATE OR REPLACE FUNCTION get_pending_proposals_count(lecturer_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)
  FROM proposals
  WHERE supervisor_id = lecturer_uuid
  AND status = 'pending'
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- 3. NOTIFICATION TRIGGERS
-- ============================================================================

-- Trigger: Auto-create notification when grade is published
CREATE OR REPLACE FUNCTION create_grade_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_published = true AND (OLD.id IS NULL OR OLD.is_published = false) THEN
    INSERT INTO notifications (user_id, title, content, type, priority, action_url, metadata)
    SELECT
      r.student_id,
      'Bài nộp của bạn đã được chấm',
      'Điểm: ' || COALESCE(NEW.total_score::TEXT, 'Chờ công bố') ||
        CASE
          WHEN NEW.feedback IS NOT NULL AND LENGTH(NEW.feedback) > 0
          THEN ' - ' || LEFT(NEW.feedback, 100)
          ELSE ''
        END,
      'academic'::notification_type,
      'high',
      '/student/grading',
      jsonb_build_object(
        'submission_id', s.id,
        'grade_id', NEW.id,
        'score', NEW.total_score
      )
    FROM submissions s
    JOIN registrations r ON s.registration_id = r.id
    WHERE s.id = NEW.submission_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_grade_notification_after_insert ON grades;
CREATE TRIGGER create_grade_notification_after_insert
  AFTER INSERT ON grades
  FOR EACH ROW
  EXECUTE FUNCTION create_grade_notification();

DROP TRIGGER IF EXISTS create_grade_notification_after_update ON grades;
CREATE TRIGGER create_grade_notification_after_update
  AFTER UPDATE ON grades
  FOR EACH ROW
  WHEN (NEW.is_published = true AND OLD.is_published = false)
  EXECUTE FUNCTION create_grade_notification();

-- Trigger: Auto-create notification when feedback is sent to student
CREATE OR REPLACE FUNCTION create_feedback_notification_for_student()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, title, content, type, priority, action_url, metadata)
  SELECT
    r.student_id,
    'Góp ý mới từ giảng viên',
    LEFT(NEW.content, 150) || CASE WHEN LENGTH(NEW.content) > 150 THEN '...' ELSE '' END,
    'feedback'::notification_type,
    'high',
    '/student/feedback',
    jsonb_build_object(
      'feedback_id', NEW.id,
      'lecturer_id', NEW.lecturer_id
    )
  FROM registrations r
  WHERE r.id = NEW.registration_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_feedback_notification_on_insert ON feedback;
CREATE TRIGGER create_feedback_notification_on_insert
  AFTER INSERT ON feedback
  FOR EACH ROW
  EXECUTE FUNCTION create_feedback_notification_for_student();

-- Trigger: Auto-create notification when proposal is approved/rejected
CREATE OR REPLACE FUNCTION create_proposal_decision_notification()
RETURNS TRIGGER AS $$
DECLARE
  student_uuid UUID;
BEGIN
  -- Get the student who registered for this proposal
  SELECT r.student_id INTO student_uuid
  FROM registrations r
  WHERE r.proposal_id = NEW.id
  AND r.status = 'approved'
  LIMIT 1;

  IF student_uuid IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, content, type, priority, action_url)
    VALUES (
      student_uuid,
      CASE
        WHEN NEW.status = 'approved' THEN 'Đề cương đã được phê duyệt'
        WHEN NEW.status = 'rejected' THEN 'Đề cương cần chỉnh sửa'
        ELSE NULL
      END,
      CASE
        WHEN NEW.status = 'approved' THEN 'Đề tài của bạn đã được giảng viên phê duyệt.'
        WHEN NEW.status = 'rejected' THEN COALESCE(NEW.review_notes, 'Giảng viên yêu cầu chỉnh sửa đề cương.')
        ELSE NULL
      END,
      'academic'::notification_type,
      'high',
      '/student/proposals'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_proposal_decision_notification_after_update ON proposals;
CREATE TRIGGER create_proposal_decision_notification_after_update
  AFTER UPDATE ON proposals
  FOR EACH ROW
  WHEN (
    (NEW.status = 'approved' AND OLD.status != 'approved') OR
    (NEW.status = 'rejected' AND OLD.status != 'rejected')
  )
  EXECUTE FUNCTION create_proposal_decision_notification();

-- ============================================================================
-- 4. RLS POLICIES VERIFICATION/UPDATES FOR LECTURER
-- ============================================================================

-- Ensure lecturers can view their own profile
DROP POLICY IF EXISTS lecturers_view_own_profile ON profiles;
CREATE POLICY lecturers_view_own_profile ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Ensure lecturers can view students they supervise
DROP POLICY IF EXISTS lecturers_view_supervised_students ON profiles;
CREATE POLICY lecturers_view_supervised_students ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM registrations r
      JOIN proposals p ON r.proposal_id = p.id
      WHERE r.student_id = profiles.id
      AND p.supervisor_id = auth.uid()
    )
  );

-- ============================================================================
-- 5. VIEWS FOR LECTURER DASHBOARD
-- ============================================================================

-- View: Lecturer dashboard overview
CREATE OR REPLACE VIEW lecturer_dashboard_overview AS
SELECT
  p.id as lecturer_id,
  get_lecturer_student_count(p.id) as total_students,
  get_pending_grading_count(p.id) as pending_grading,
  get_upcoming_defense_count(p.id) as upcoming_defenses,
  get_pending_proposals_count(p.id) as pending_proposals
FROM profiles p
WHERE p.role = 'lecturer';

-- View: Lecturer's students with progress
CREATE OR REPLACE VIEW lecturer_students_progress AS
SELECT
  p.id as lecturer_id,
  s.id as student_id,
  s.full_name as student_name,
  s.student_code,
  s.email as student_email,
  s.avatar_url,
  prop.id as proposal_id,
  prop.title as thesis_title,
  r.status as registration_status,
  r.final_score,
  r.final_grade,
  r.completed_at,
  COUNT(DISTINCT sub.id) as total_submissions,
  MAX(sub.submitted_at) as last_submission_at,
  ds.scheduled_at as defense_date,
  ds.status as defense_status
FROM profiles p
JOIN proposals prop ON p.id = prop.supervisor_id
JOIN registrations r ON prop.id = r.proposal_id
JOIN profiles s ON r.student_id = s.id
LEFT JOIN submissions sub ON r.id = sub.registration_id
LEFT JOIN defense_sessions ds ON r.id = ds.registration_id
WHERE p.role = 'lecturer'
GROUP BY p.id, s.id, prop.id, r.id, ds.scheduled_at, ds.status;

-- ============================================================================
-- 6. STORAGE POLICIES (if not exists)
-- ============================================================================

-- Ensure lecturers can view submissions in their folder
DROP POLICY IF EXISTS lecturers_view_student_submissions_storage ON storage.objects;
CREATE POLICY lecturers_view_student_submissions_storage ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions' AND
    EXISTS (
      SELECT 1 FROM registrations r
      JOIN proposals p ON r.proposal_id = p.id
      WHERE p.supervisor_id = auth.uid()
      AND (storage.foldername(name))[2] = r.id::text
    )
  );

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

COMMENT ON_migration IS '2026-03-29: Added indexes, helper functions, notification triggers, and views for lecturer dashboard features';
