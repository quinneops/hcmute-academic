-- Academic Nexus Migration - Reviewer Module Enhancements
-- Adds fields to the registrations table for official assessment by reviewers (Phản biện).

ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS reviewer_name TEXT,
ADD COLUMN IF NOT EXISTS reviewer_score DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS reviewer_feedback TEXT,
ADD COLUMN IF NOT EXISTS reviewer_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reviewer_submitted_at TIMESTAMPTZ;

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_registrations_reviewer ON public.registrations(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_registrations_reviewer_score ON public.registrations(reviewer_score);

-- Update RLS for reviewer
DO $$ BEGIN
    DROP POLICY IF EXISTS "reviewers_view_assigned_registrations" ON registrations;
    CREATE POLICY "reviewers_view_assigned_registrations" ON registrations FOR SELECT
      USING (reviewer_id = auth.uid());

    DROP POLICY IF EXISTS "reviewers_update_assigned_registrations" ON registrations;
    CREATE POLICY "reviewers_update_assigned_registrations" ON registrations FOR UPDATE
      USING (reviewer_id = auth.uid())
      WITH CHECK (reviewer_id = auth.uid());
EXCEPTION
    WHEN undefined_object THEN null;
END $$;
