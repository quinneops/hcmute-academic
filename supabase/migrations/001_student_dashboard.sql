-- SQL Migration for Student Dashboard Backend Integration
-- Run this in Supabase SQL Editor to create all required tables and policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- ============================================
-- TABLES AND COLUMNS
-- ============================================

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('guide', 'template', 'regulation', 'form', 'video')),
  category TEXT NOT NULL CHECK (category IN ('academic', 'template', 'admin')),
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  download_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for documents
CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category);
CREATE INDEX IF NOT EXISTS documents_type_idx ON documents(type);

-- Proposals table (if not exists)
CREATE TABLE IF NOT EXISTS proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  supervisor_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'archived')),
  max_students INTEGER DEFAULT 1,
  registrations_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS proposals_status_idx ON proposals(status);
CREATE INDEX IF NOT EXISTS proposals_supervisor_idx ON proposals(supervisor_id);

-- Registrations table (if not exists)
CREATE TABLE IF NOT EXISTS registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn', 'completed')),
  motivation_letter TEXT,
  proposed_title TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS registrations_student_id_idx ON registrations(student_id);
CREATE INDEX IF NOT EXISTS registrations_status_idx ON registrations(status);
CREATE INDEX IF NOT EXISTS registrations_proposal_id_idx ON registrations(proposal_id);

-- Submissions: Add student_id column if not exists (for easier querying)
DO $$ BEGIN
  ALTER TABLE submissions ADD COLUMN student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS submissions_student_id_idx ON submissions(student_id);
CREATE INDEX IF NOT EXISTS submissions_round_number_idx ON submissions(round_number);

-- Feedback: Add student_id column if not exists (for messaging feature)
DO $$ BEGIN
  ALTER TABLE feedback ADD COLUMN student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE feedback ADD COLUMN subject TEXT;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE feedback ADD COLUMN is_from_student BOOLEAN NOT NULL DEFAULT FALSE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS feedback_messages_student_id_idx ON feedback(student_id);
CREATE INDEX IF NOT EXISTS feedback_messages_is_read_idx ON feedback(is_read);

-- Trigger to auto-populate student_id on submissions from registration
CREATE OR REPLACE FUNCTION populate_submission_student_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_id IS NULL THEN
    SELECT r.student_id INTO NEW.student_id
    FROM registrations r
    WHERE r.id = NEW.registration_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_populate_submission_student_id ON submissions;
CREATE TRIGGER trigger_populate_submission_student_id
  BEFORE INSERT OR UPDATE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION populate_submission_student_id();

-- Notifications table (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('system', 'academic', 'deadline', 'feedback', 'announcement', 'submission')),
  title TEXT NOT NULL,
  content TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  priority TEXT DEFAULT 'normal',
  action_url TEXT,
  action_label TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON notifications(is_read);

-- Document requests table
CREATE TABLE IF NOT EXISTS document_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS document_requests_student_id_idx ON document_requests(student_id);
CREATE INDEX IF NOT EXISTS document_requests_status_idx ON document_requests(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

-- Documents: Public read for authenticated users
DROP POLICY IF EXISTS "documents_public_read" ON documents;
CREATE POLICY "documents_public_read" ON documents
  FOR SELECT TO authenticated
  USING (true);

-- Documents: Only admins can insert/update/delete
DROP POLICY IF EXISTS "documents_admin_insert" ON documents;
CREATE POLICY "documents_admin_insert" ON documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Proposals: Students can view approved proposals
DROP POLICY IF EXISTS "proposals_student_view" ON proposals;
CREATE POLICY "proposals_student_view" ON proposals
  FOR SELECT TO authenticated
  USING (status = 'approved' OR supervisor_id = auth.uid());

-- Registrations: Students can only see their own
DROP POLICY IF EXISTS "registrations_student_select" ON registrations;
CREATE POLICY "registrations_student_select" ON registrations
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "registrations_student_insert" ON registrations;
CREATE POLICY "registrations_student_insert" ON registrations
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "registrations_student_update" ON registrations;
CREATE POLICY "registrations_student_update" ON registrations
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid());

-- Submissions: Students can only see their own
DROP POLICY IF EXISTS "submissions_student_select" ON submissions;
CREATE POLICY "submissions_student_select" ON submissions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "submissions_student_insert" ON submissions;
CREATE POLICY "submissions_student_insert" ON submissions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Feedback: Students can only see their own
DROP POLICY IF EXISTS "feedback_student_select" ON feedback;
CREATE POLICY "feedback_student_select" ON feedback
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "feedback_student_insert" ON feedback;
CREATE POLICY "feedback_student_insert" ON feedback
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR lecturer_id = auth.uid());

DROP POLICY IF EXISTS "feedback_student_update" ON feedback;
CREATE POLICY "feedback_student_update" ON feedback
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR lecturer_id = auth.uid());

-- Notifications: Users can only see their own
DROP POLICY IF EXISTS "notifications_user_select" ON notifications;
CREATE POLICY "notifications_user_select" ON notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_user_update" ON notifications;
CREATE POLICY "notifications_user_update" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Document requests: Students can create their own
DROP POLICY IF EXISTS "document_requests_student_select" ON document_requests;
CREATE POLICY "document_requests_student_select" ON document_requests
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "document_requests_student_insert" ON document_requests;
CREATE POLICY "document_requests_student_insert" ON document_requests
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- ============================================
-- FUNCTIONS
-- ============================================

-- Increment document download count
CREATE OR REPLACE FUNCTION increment_document_downloads(doc_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE documents
  SET download_count = download_count + 1
  WHERE id = doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STORAGE BUCKETS (run in Supabase Dashboard)
-- ============================================

-- Run these commands in Supabase Dashboard > Storage:
-- 1. Create bucket 'submissions' (private, authenticated users only)
-- 2. Create bucket 'documents' (private, authenticated users can read)
-- 3. Create bucket 'profiles' (public, authenticated users can upload)

-- Storage policies (run in SQL Editor):
DROP POLICY IF EXISTS "submissions_user_upload" ON storage.objects;
CREATE POLICY "submissions_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "submissions_user_view" ON storage.objects;
CREATE POLICY "submissions_user_view" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'submissions');

DROP POLICY IF EXISTS "documents_public_read" ON storage.objects;
CREATE POLICY "documents_public_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "profiles_user_upload" ON storage.objects;
CREATE POLICY "profiles_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profiles' AND (storage.foldername(name))[1] = 'avatars');

DROP POLICY IF EXISTS "profiles_public_read" ON storage.objects;
CREATE POLICY "profiles_public_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'profiles');

-- ============================================
-- SEED DATA (optional - for testing)
-- ============================================

-- Insert sample documents
INSERT INTO documents (title, type, category, file_url, file_size, download_count) VALUES
  ('Hướng dẫn viết khóa luận 2024-2025', 'guide', 'academic', '/docs/guide.pdf', 2400000, 1240),
  ('Mẫu bìa khóa luận', 'template', 'template', '/docs/cover.docx', 156000, 892),
  ('Mẫu slide bảo vệ', 'template', 'template', '/docs/slide.pptx', 3200000, 654),
  ('Quy định chấm điểm khóa luận', 'regulation', 'academic', '/docs/regulation.pdf', 890000, 523),
  ('Danh mục tài liệu tham khảo mẫu', 'guide', 'academic', '/docs/references.pdf', 445000, 412),
  ('Biểu mẫu đăng ký đề tài', 'form', 'admin', '/docs/registration.docx', 234000, 789),
  ('Giấy cam kết liêm chính học thuật', 'form', 'admin', '/docs/honesty.pdf', 178000, 356)
ON CONFLICT DO NOTHING;
