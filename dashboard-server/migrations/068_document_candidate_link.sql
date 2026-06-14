-- 068_document_candidate_link.sql
-- Link documents to hiring candidates so each candidate card can have
-- rich-text documentation (interview notes, assessments, etc.).

ALTER TABLE documents ADD COLUMN IF NOT EXISTS candidate_id uuid REFERENCES candidates(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_documents_candidate ON documents(candidate_id) WHERE candidate_id IS NOT NULL;
