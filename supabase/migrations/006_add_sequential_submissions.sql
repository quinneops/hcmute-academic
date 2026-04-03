-- Sequential Submissions Migration
-- Enforces sequential submission order and supports multiple documents per milestone
-- Date: 2026-04-01

-- ============================================================================
-- PHASE 1: UPDATE SEMESTERS.ROUNDS STRUCTURE
-- ============================================================================

-- Add submission_order column to rounds JSONB structure
-- This defines the required order: Proposal → Draft → Interim → Final → Slide → Defense

-- First, let's update existing rounds to include order and type info
UPDATE semesters
SET rounds = (
  SELECT jsonb_agg(
    round || jsonb_build_object(
      'order', idx,
      'type', CASE
        WHEN round->>'name' ILIKE '%proposal%' OR round->>'name' ILIKE '%đề cương%' THEN 'proposal'
        WHEN round->>'name' ILIKE '%draft%' OR round->>'name' ILIKE '%nháp%' THEN 'draft'
        WHEN round->>'name' ILIKE '%interim%' OR round->>'name' ILIKE '%giữa kỳ%' THEN 'interim'
        WHEN round->>'name' ILIKE '%final%' OR round->>'name' ILIKE '%cuối%' THEN 'final'
        WHEN round->>'name' ILIKE '%slide%' OR round->>'name' ILIKE '%bảo vệ%' THEN 'slide'
        WHEN round->>'name' ILIKE '%defense%' OR round->>'name' ILIKE '%phản biện%' THEN 'defense'
        ELSE 'other'
      END
    )
  )
  FROM (
    SELECT value as round, ordinality - 1 as idx
    FROM jsonb_array_elements(rounds) WITH ORDINALITY
  ) subq
)
WHERE rounds IS NOT NULL AND jsonb_array_length(rounds) > 0;

-- Set default rounds if not set (standard 6-step process)
UPDATE semesters
SET rounds = '[
  {"id": "round-1", "name": "Proposal", "order": 0, "type": "proposal", "is_active": true},
  {"id": "round-2", "name": "Draft", "order": 1, "type": "draft", "is_active": true},
  {"id": "round-3", "name": "Interim", "order": 2, "type": "interim", "is_active": true},
  {"id": "round-4", "name": "Final", "order": 3, "type": "final", "is_active": true},
  {"id": "round-5", "name": "Slide", "order": 4, "type": "slide", "is_active": true},
  {"id": "round-6", "name": "Defense", "order": 5, "type": "defense", "is_active": true}
]'::jsonb
WHERE rounds IS NULL OR jsonb_array_length(rounds) = 0;

-- ============================================================================
-- PHASE 2: UPDATE REGISTRATIONS STRUCTURE
-- ============================================================================

-- Add next_allowed_round_type column to track which round type student can submit
-- This is computed but stored for performance
ALTER TABLE registrations
ADD COLUMN IF NOT EXISTS next_allowed_round_type TEXT DEFAULT 'proposal';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_registrations_next_round ON registrations(next_allowed_round_type);

-- Update existing registrations to calculate next_allowed_round_type
UPDATE registrations
SET next_allowed_round_type = (
  CASE
    WHEN jsonb_array_length(submissions) = 0 THEN 'proposal'
    ELSE (
      SELECT 'defense' -- Default to defense if all complete
      WHERE NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(submissions) s
        WHERE (s->>'status')::text != 'graded'
      )
    )
  END
)
WHERE next_allowed_round_type IS NULL;

-- ============================================================================
-- PHASE 3: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get the next allowed round type for a registration
CREATE OR REPLACE FUNCTION get_next_allowed_round(registration_id UUID)
RETURNS TEXT AS $$
DECLARE
  reg_submissions JSONB;
  last_graded_order INTEGER;
  next_type TEXT;
BEGIN
  -- Get submissions from registration
  SELECT submissions INTO reg_submissions
  FROM registrations
  WHERE id = registration_id;

  -- If no submissions, first round is allowed
  IF reg_submissions IS NULL OR jsonb_array_length(reg_submissions) = 0 THEN
    RETURN 'proposal';
  END IF;

  -- Find the highest order round that has been graded
  SELECT COALESCE(MAX((s->>'order')::INTEGER), -1) INTO last_graded_order
  FROM jsonb_array_elements(reg_submissions) s
  WHERE s->>'status' = 'graded';

  -- Get active rounds ordered by order
  SELECT (r->>'type')::TEXT INTO next_type
  FROM (
    SELECT value as r
    FROM jsonb_array_elements(
      (SELECT rounds FROM semesters WHERE is_current = true LIMIT 1)
    )
    WHERE value->>'is_active' = 'true'
    ORDER BY (value->>'order')::INTEGER
  ) rounds
  WHERE (r->>'order')::INTEGER > last_graded_order
  LIMIT 1;

  -- If no next round found, all rounds are complete
  IF next_type IS NULL THEN
    RETURN 'defense'; -- All complete
  END IF;

  RETURN next_type;
END;
$$ LANGUAGE plpgsql;

-- Function to validate if a submission can be made
CREATE OR REPLACE FUNCTION can_submit_to_round(
  registration_id UUID,
  submission_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  allowed_type TEXT;
BEGIN
  allowed_type := get_next_allowed_round(registration_id);

  -- If already completed all rounds, only defense allows (for final presentation)
  IF allowed_type = 'defense' THEN
    RETURN submission_type = 'defense';
  END IF;

  -- Check if submission type matches allowed type
  RETURN submission_type = allowed_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PHASE 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- GIN index on submissions for querying by type and status
CREATE INDEX IF NOT EXISTS idx_registrations_submissions_type
ON registrations USING GIN ((
  (SELECT jsonb_agg(value->>'type')
   FROM jsonb_array_elements(submissions)
   WHERE value->>'type' IS NOT NULL)
));

-- ============================================================================
-- PHASE 5: UPDATE TRIGGERS
-- ============================================================================

-- Trigger to update next_allowed_round_type after submission insert/update
CREATE OR REPLACE FUNCTION update_next_allowed_round()
RETURNS TRIGGER AS $$
BEGIN
  NEW.next_allowed_round_type := get_next_allowed_round(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_registration_next_round_after_submission
AFTER INSERT OR UPDATE OF submissions ON registrations
FOR EACH ROW
EXECUTE FUNCTION update_next_allowed_round();

-- ============================================================================
-- PHASE 6: SEED DEFAULT ROUNDS FOR ACTIVE SEMESTERS
-- ============================================================================

-- Ensure all active semesters have the standard 6 rounds
UPDATE semesters
SET rounds = '[
  {"id": "round-1", "name": "Proposal", "order": 0, "type": "proposal", "is_active": true, "description": "Đề cương nghiên cứu"},
  {"id": "round-2", "name": "Draft", "order": 1, "type": "draft", "is_active": true, "description": "Bản nháp"},
  {"id": "round-3", "name": "Interim", "order": 2, "type": "interim", "is_active": true, "description": "Báo cáo giữa kỳ"},
  {"id": "round-4", "name": "Final", "order": 3, "type": "final", "is_active": true, "description": "Báo cáo cuối kỳ"},
  {"id": "round-5", "name": "Slide", "order": 4, "type": "slide", "is_active": true, "description": "Slide bảo vệ"},
  {"id": "round-6", "name": "Defense", "order": 5, "type": "defense", "is_active": true, "description": "Bảo vệ khóa luận"}
]'::jsonb
WHERE is_active = true
  AND (rounds IS NULL OR jsonb_array_length(rounds) = 0);

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
