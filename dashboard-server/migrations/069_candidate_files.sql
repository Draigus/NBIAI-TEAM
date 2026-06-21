-- 069_candidate_files.sql
-- File uploads and URL links attached to hiring candidates.
-- Separate from the rich-text documents system — these are raw files
-- (PDFs, Word docs, images) and external URL bookmarks.

CREATE TABLE IF NOT EXISTS candidate_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  file_type text NOT NULL CHECK (file_type IN ('upload', 'url')),
  title text NOT NULL,
  filename text,
  stored_name text,
  mime_type text,
  size_bytes integer,
  url text,
  uploaded_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_candidate_files_candidate ON candidate_files(candidate_id);
