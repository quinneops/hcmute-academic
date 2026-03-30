-- Academic Nexus - Admin Features Migration
-- Run: 2026-03-30
-- Purpose: Add indexes, functions, and triggers for admin dashboard features

-- ============================================================================
-- 1. PERFORMANCE INDEXES FOR ADMIN QUERIES
-- ============================================================================

-- Indexes for admin dashboard overview stats
CREATE INDEX IF NOT EXISTS profiles_role_active_idx ON profiles(role, is_active);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles(created_at DESC);

-- Indexes for semester filtering
CREATE INDEX IF NOT EXISTS semesters_is_current_idx ON semesters(is_current);
CREATE INDEX IF NOT EXISTS semesters_is_active_start_date_idx ON semesters(is_active, start_date DESC);

-- Indexes for thesis/proposal stats by status
CREATE INDEX IF NOT EXISTS proposals_status_semester_idx ON proposals(status, semester_id);
CREATE INDEX IF NOT EXISTS proposals_created_at_idx ON proposals(created_at DESC);

-- Indexes for registration stats
CREATE INDEX IF NOT EXISTS registrations_status_idx ON registrations(status);
CREATE INDEX IF NOT EXISTS registrations_created_at_idx ON registrations(created_at DESC);

-- Indexes for defense sessions stats
CREATE INDEX IF NOT EXISTS defense_sessions_status_idx ON defense_sessions(status);
CREATE INDEX IF NOT EXISTS defense_sessions_scheduled_at_idx ON defense_sessions(scheduled_at DESC);

-- Indexes for council management
CREATE INDEX IF NOT EXISTS councils_status_idx ON councils(status);
CREATE INDEX IF NOT EXISTS councils_semester_idx ON councils(semester_id);

-- Indexes for user management
CREATE INDEX IF NOT EXISTS profiles_role_search_idx ON profiles(role, full_name, email);
CREATE INDEX IF NOT EXISTS profiles_is_active_idx ON profiles(is_active);

-- ============================================================================
-- 2. HELPER FUNCTIONS FOR ADMIN DASHBOARD
-- ============================================================================

-- Function: Get total students count
CREATE OR REPLACE FUNCTION get_total_students_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM profiles
  WHERE role = 'student' AND is_active = true
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function: Get total lecturers count
CREATE OR REPLACE FUNCTION get_total_lecturers_count()
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM profiles
  WHERE role = 'lecturer' AND is_active = true
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function: Get thesis stats by status
CREATE OR REPLACE FUNCTION get_thesis_stats_by_status(p_semester_id UUID DEFAULT NULL)
RETURNS TABLE(status TEXT, count BIGINT) AS $$
BEGIN
  IF p_semester_id IS NOT NULL THEN
    RETURN QUERY
    SELECT p.status::TEXT, COUNT(*)
    FROM proposals p
    WHERE p.semester_id = p_semester_id
    GROUP BY p.status;
  ELSE
    RETURN QUERY
    SELECT p.status::TEXT, COUNT(*)
    FROM proposals p
    GROUP BY p.status;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get registration stats by status
CREATE OR REPLACE FUNCTION get_registration_stats_by_status(p_semester_id UUID DEFAULT NULL)
RETURNS TABLE(status TEXT, count BIGINT) AS $$
BEGIN
  IF p_semester_id IS NOT NULL THEN
    RETURN QUERY
    SELECT r.status::TEXT, COUNT(*)
    FROM registrations r
    JOIN proposals p ON r.proposal_id = p.id
    WHERE p.semester_id = p_semester_id
    GROUP BY r.status;
  ELSE
    RETURN QUERY
    SELECT r.status::TEXT, COUNT(*)
    FROM registrations r
    GROUP BY r.status;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get defense stats by status
CREATE OR REPLACE FUNCTION get_defense_stats_by_status(p_semester_id UUID DEFAULT NULL)
RETURNS TABLE(status TEXT, count BIGINT) AS $$
BEGIN
  IF p_semester_id IS NOT NULL THEN
    RETURN QUERY
    SELECT ds.status::TEXT, COUNT(*)
    FROM defense_sessions ds
    JOIN registrations r ON ds.registration_id = r.id
    JOIN proposals p ON r.proposal_id = p.id
    WHERE p.semester_id = p_semester_id
    GROUP BY ds.status;
  ELSE
    RETURN QUERY
    SELECT ds.status::TEXT, COUNT(*)
    FROM defense_sessions ds
    GROUP BY ds.status;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. TRIGGERS FOR AUTO-UPDATE STATS
-- ============================================================================

-- Function: Update semester is_current flag when a new semester is set as current
CREATE OR REPLACE FUNCTION unset_other_current_semesters()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    UPDATE semesters
    SET is_current = false
    WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER unset_other_current_semesters_trigger
  BEFORE INSERT OR UPDATE OF is_current ON semesters
  FOR EACH ROW
  EXECUTE FUNCTION unset_other_current_semesters();

-- ============================================================================
-- 4. DEPARTMENT STATS VIEW
-- ============================================================================

-- View for department statistics
CREATE OR REPLACE VIEW admin_department_stats AS
SELECT
  p.department AS department_name,
  COUNT(DISTINCT pr.id) AS theses_count,
  COALESCE(AVG(r.final_score), 0) AS avg_score,
  COALESCE(
    ROUND(
      COUNT(DISTINCT CASE WHEN r.status = 'completed' THEN r.id END)::NUMERIC /
      NULLIF(COUNT(DISTINCT r.id), 0)::NUMERIC * 100,
      0
    ),
    0
  )::INTEGER AS completion_rate
FROM profiles p
LEFT JOIN registrations r ON r.student_id = p.id
LEFT JOIN proposals pr ON r.proposal_id = pr.id
WHERE p.role = 'lecturer' AND p.is_active = true
GROUP BY p.department
ORDER BY theses_count DESC;

-- ============================================================================
-- 5. ADMIN NOTIFICATIONS TRIGGER
-- ============================================================================

-- Function: Create notification when proposal status changes to approved
CREATE OR REPLACE FUNCTION create_proposal_approved_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO notifications (user_id, title, content, type, priority)
    SELECT
      pr.supervisor_id,
      'Đề tài đã được phê duyệt',
      'Đề tài "' || NEW.title || '" đã được phê duyệt',
      'academic'::notification_type,
      'normal'
    FROM proposals pr
    WHERE pr.id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_proposal_approved_notification_trigger
  AFTER UPDATE OF status ON proposals
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE FUNCTION create_proposal_approved_notification();

-- Function: Create notification when defense is scheduled
CREATE OR REPLACE FUNCTION create_defense_scheduled_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.scheduled_at IS NOT NULL AND OLD.scheduled_at IS NULL THEN
    INSERT INTO notifications (user_id, title, content, type, priority)
    SELECT
      r.student_id,
      'Lịch bảo vệ đã được sắp xếp',
      'Bảo vệ khóa luận vào ' || TO_CHAR(NEW.scheduled_at, 'HH24:MI DD/MM/YYYY') || ' tại ' || COALESCE(NEW.room, 'Chưa xác định'),
      'academic'::notification_type,
      'high'
    FROM registrations r
    WHERE r.id = NEW.registration_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_defense_scheduled_notification_trigger
  AFTER UPDATE OF scheduled_at ON defense_sessions
  FOR EACH ROW
  WHEN (NEW.scheduled_at IS NOT NULL AND OLD.scheduled_at IS NULL)
  EXECUTE FUNCTION create_defense_scheduled_notification();
