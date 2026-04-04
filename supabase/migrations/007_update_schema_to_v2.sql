-- Academic Nexus Migration - V2 Schema Update
-- Enhances current db.sql with BCTT/KLTN tracks, TBM role, and academic prerequisites

-- 1. Create Enums
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

-- 2. Update profiles table (TBM & Slots)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_tbm BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS specialization TEXT,
ADD COLUMN IF NOT EXISTS bctt_slots INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS kltn_slots INTEGER DEFAULT 5;

-- 3. Update proposals table (Types & Flags)
ALTER TABLE public.proposals
ADD COLUMN IF NOT EXISTS type proposal_type DEFAULT 'KLTN',
ADD COLUMN IF NOT EXISTS is_open_for_registration BOOLEAN DEFAULT true;

-- 4. Update registrations table (Denormalization & Status)
ALTER TABLE public.registrations
ADD COLUMN IF NOT EXISTS proposal_type proposal_type,
ADD COLUMN IF NOT EXISTS post_defense_edit_status post_defense_status DEFAULT 'none',
ADD COLUMN IF NOT EXISTS editing_file_url TEXT;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_registrations_student_type ON public.registrations(student_id, proposal_type);

-- 5. Academic Prerequisite (Trigger)
CREATE OR REPLACE FUNCTION check_kltn_prerequisite()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check if the new registration is for KLTN
    IF EXISTS (
        SELECT 1 FROM public.proposals 
        WHERE id = NEW.proposal_id AND type = 'KLTN'
    ) THEN
        -- Check if student has a completed BCTT
        IF NOT EXISTS (
            SELECT 1 FROM public.registrations
            WHERE student_id = NEW.student_id 
            AND proposal_type = 'BCTT' 
            AND status = 'completed'
        ) THEN
            RAISE EXCEPTION 'Sinh viên phải hoàn thành BCTT trước khi đăng ký KLTN.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_kltn_prerequisite_trigger ON public.registrations;
CREATE TRIGGER check_kltn_prerequisite_trigger
BEFORE INSERT ON public.registrations
FOR EACH ROW EXECUTE FUNCTION check_kltn_prerequisite();

-- 6. TBM RLS Policies
-- TBM can view all proposals
DO $$ BEGIN
    DROP POLICY IF EXISTS "tbm_view_all_proposals" ON proposals;
    CREATE POLICY "tbm_view_all_proposals" ON proposals FOR SELECT
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_tbm = true));
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- TBM can manage all registrations
DO $$ BEGIN
    DROP POLICY IF EXISTS "tbm_manage_all_registrations" ON registrations;
    CREATE POLICY "tbm_manage_all_registrations" ON registrations FOR ALL
      USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_tbm = true));
EXCEPTION
    WHEN undefined_object THEN null;
END $$;
