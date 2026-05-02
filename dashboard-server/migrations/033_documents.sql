-- 033_documents.sql
-- Tree of rich-text pages scoped to a client. Each row stores a
-- ProseMirror JSON document body. Hierarchy via parent_id self-ref.
-- Optional task_id link for "Feature breakdown" pages that target a
-- specific Project / Feature / Story / Task.
--
-- Visibility:
--   'all'      — visible to NBI staff AND client portal users in scope
--   'nbi_only' — visible to NBI staff only; client users never receive
--                this row from the API.
--
-- Body-level NBI redaction lives inside body_json (the nbiInternalBlock
-- node type) and is stripped server-side by lib/redact-nbi-internal.js
-- before send to client users.
--
-- body_text is the plain-text extraction of body_json maintained on
-- every PATCH so future search can use a trigram index instead of
-- walking the JSON. body_version supports future TipTap-major-version
-- schema migrations.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE documents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  parent_id    uuid                 REFERENCES documents(id) ON DELETE CASCADE,
  task_id      uuid                 REFERENCES tasks(id) ON DELETE SET NULL,
  title        text        NOT NULL DEFAULT 'Untitled',
  body_json    jsonb       NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb,
  body_text    text        NOT NULL DEFAULT '',
  body_version integer     NOT NULL DEFAULT 1,
  visibility   text        NOT NULL DEFAULT 'all'
               CHECK (visibility IN ('all','nbi_only')),
  sort_order   integer     NOT NULL DEFAULT 0,
  created_by   text        NOT NULL,
  updated_by   text        NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_client     ON documents(client_id);
CREATE INDEX idx_documents_parent     ON documents(parent_id);
CREATE INDEX idx_documents_task       ON documents(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_documents_visibility ON documents(visibility);
CREATE INDEX idx_documents_body_text_trgm ON documents USING gin (body_text gin_trgm_ops);
