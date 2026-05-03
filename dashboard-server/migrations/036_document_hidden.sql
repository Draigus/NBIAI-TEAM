-- 036_document_hidden.sql
-- Add hidden (soft-archive) flag to documents table.
-- Hidden pages are invisible to users without docs_edit permission.
ALTER TABLE documents ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;
