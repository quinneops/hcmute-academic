-- Create documents table for NoSQL schema
-- Simple table without foreign keys

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,  -- 'thesis', 'form', 'guide', etc.
  category TEXT NOT NULL,  -- 'academic', 'administrative', etc.
  file_url TEXT NOT NULL,
  file_size INTEGER,
  download_count INTEGER DEFAULT 0,
  uploaded_by UUID,  -- No FK, just store user ID
  uploaded_by_name TEXT,  -- Denormalized
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_type ON documents(type);
CREATE INDEX idx_documents_public ON documents(is_public);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Anyone can view public documents
CREATE POLICY "public_documents_view" ON documents
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Only admins can insert/update/delete
CREATE POLICY "admins_manage_documents" ON documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
