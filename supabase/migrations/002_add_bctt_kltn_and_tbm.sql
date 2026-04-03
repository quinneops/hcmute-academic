-- Academic Nexus Migration 002
-- Add BCTT/KLTN flow and TBM role
-- Generated: 2026-04-03

-- 1. Create Enums for new statuses if needed
DO $$ BEGIN
    CREATE TYPE proposal_type AS ENUM ('BCTT', 'KLTN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_defense_status AS ENUM ('none', 'pending_supervisor', 'pending_chair', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Update proposals table
ALTER TABLE proposals 
ADD COLUMN IF NOT EXISTS type proposal_type DEFAULT 'KLTN',
ADD COLUMN IF NOT EXISTS is_open_for_registration BOOLEAN DEFAULT false;

-- 3. Update profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS is_tbm BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS specialization TEXT,
ADD COLUMN IF NOT EXISTS bctt_slots INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS kltn_slots INTEGER DEFAULT 5;

-- 4. Update registrations table
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS proposal_type proposal_type,
ADD COLUMN IF NOT EXISTS post_defense_edit_status post_defense_status DEFAULT 'none',
ADD COLUMN IF NOT EXISTS editing_file_url TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_registrations_student_type ON registrations(student_id, proposal_type);

-- 5. Update submissions table
ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS turnitin_report_url TEXT,
ADD COLUMN IF NOT EXISTS internship_confirmation_url TEXT;

-- 6. Add policy for TBM (Example: TBM can view all proposals even if not supervisor)
CREATE POLICY "tbm_view_all_proposals" ON proposals FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_tbm = true)
  );

-- 7. Add policy for TBM to manage registrations
CREATE POLICY "tbm_manage_all_registrations" ON registrations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_tbm = true)
  );

-- 8. Add constraint: Student can't register KLTN if BCTT not passed (Logic check)
-- This is better handled in the application layer OR a complex trigger.
-- For now, we'll implement it as a trigger.

CREATE OR REPLACE FUNCTION check_kltn_prerequisite()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if the new registration is for KLTN
    IF EXISTS (
        SELECT 1 FROM proposals 
        WHERE id = NEW.proposal_id AND type = 'KLTN'
    ) THEN
        -- Check if student has a completed BCTT
        IF NOT EXISTS (
            SELECT 1 FROM registrations r
            JOIN proposals p ON r.proposal_id = p.id
            WHERE r.student_id = NEW.student_id 
            AND p.type = 'BCTT' 
            AND r.status = 'completed'
        ) THEN
            RAISE EXCEPTION 'Sinh viên phải hoàn thành BCTT trước khi đăng ký KLTN.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_kltn_prerequisite_trigger
BEFORE INSERT ON registrations
FOR EACH ROW EXECUTE FUNCTION check_kltn_prerequisite();
