-- migration: add auto_approve and ai criteria to proposals
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS auto_approve BOOLEAN DEFAULT false;
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS ai_screening_criteria TEXT;
