-- 034_document_attachments.sql
-- Image uploads embedded into documents. Files stored on disk under
-- uploads/ — same directory as task_attachments — but indexed via this
-- table so we can scope visibility, enforce size limits, and clean up
-- when a document is deleted.
--
-- orphaned_at: when an image is removed from the document body the row
-- is marked orphaned (not immediately deleted) so an undo / accidental
-- removal has a 24-hour grace window. A nightly sweep cron physically
-- deletes the row + file when orphaned_at is older than 24 hours.

CREATE TABLE document_attachments (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   uuid        NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  filename      text        NOT NULL,
  stored_name   text        NOT NULL UNIQUE,
  mime_type     text        NOT NULL,
  size_bytes    integer     NOT NULL,
  uploaded_by   text        NOT NULL,
  orphaned_at   timestamptz NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_document_attachments_doc      ON document_attachments(document_id);
CREATE INDEX idx_document_attachments_orphaned ON document_attachments(orphaned_at) WHERE orphaned_at IS NOT NULL;
