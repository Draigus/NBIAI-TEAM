# Documentation Tab Spec — 2026-05-02

Frozen spec captured from the brainstorm Glen approved on 2026-05-02. Implementation plan at `docs/superpowers/plans/2026-05-02-documentation-tab.md`.

## Design decisions (Glen-approved)

1. **Audience.** NBI staff + configured client portal users.

2. **Editor.** TipTap (ProseMirror) loaded via ESM imports from a CDN with subresource-integrity hashes; falls back to a self-hosted bundle on CDN failure. No build step.

3. **Visibility — two layers.**
   - **Page-level** flag (`documents.visibility = 'all' | 'nbi_only'`).
   - **Block-level** via a custom `nbiInternalBlock` TipTap node.
   - **Server-side strip** when serving to client portal users — redacted content **never leaves the server**, no placeholder, no whitespace gap.

4. **Permissions — per-user with per-client defaults.**
   - Per-user flags on `users`: `docs_view`, `docs_edit`, `docs_create`, `docs_upload`.
   - Per-client defaults on `clients`: `doc_default_view/edit/create/upload`.
   - Defaults pre-populate per-user flags **at user creation time**. Subsequent default edits do NOT cascade. Per-user flags always win.
   - NBI staff get all four flags `true` by default. Client portal users default to read-only (`docs_view=true`, others `false`) until an NBI admin opens it up.

5. **Slack integration — tier 1 only in v1.**
   - Paste a Slack permalink in the editor → custom `slackCard` node renders a styled card with channel + message id parsed from the URL + "Open in Slack" button.
   - Click opens the deep link in Slack desktop / web.
   - Live thread fetch, channel pull-into-doc, OAuth bot install — **all v2.** v1 schema (`slackCard` node attributes) is forward-compatible with v2's cached fields.

6. **Image upload.**
   - Toolbar button + drag-and-drop into the editor + clipboard paste.
   - Stored in `dashboard-server/uploads/` (same dir as task attachments).
   - Served via authenticated `/api/documents/:id/attachments/:filename`.
   - 5 MB file cap, jpg/png/gif/webp only.
   - Image-in-NBI-block leak fix: server checks the image's scope inside the doc body before serving to client users.

7. **Entry points.**
   - Sidebar "Documentation" item.
   - Contextual "📄 Docs" link on every Gantt client header (after the P/F/S/T depth buttons).
   - Contextual "📄 Docs" link on every Portfolio per-client card.

## v1 scope (in)

- Tree CRUD with drag-to-reparent (HTML5 drag-and-drop with cursor-Y intent for above/into/below).
- Bold / italic / underline / strikethrough / H1-H3 / bulleted + numbered lists / blockquote / inline code / horizontal rule.
- Hyperlinks (paste, type, toolbar; rendered with `target="_blank"`).
- Image upload via toolbar / drag-and-drop / clipboard paste.
- NBI-internal block node (visually distinct purple panel for NBI users; server strips for client users).
- Page-level visibility toggle (`all` / `nbi_only`).
- Slack permalink → smart-link card.
- Per-user permission flags configurable in Settings → Users.
- Per-client defaults pre-populating new client portal user accounts.
- Autosave on every edit (debounced 800 ms) + visible "Saved Ns ago" indicator.
- Optimistic concurrency via ETag / If-Match → 409 Conflict modal with Reload / Overwrite / Compare buttons.
- Autosave retry queue with exponential backoff + localStorage unsaved-edits backup + recovery prompt.
- Sidebar item + Gantt + Portfolio entry points.
- 6 default pages seeded on first open per client: Overview / Contacts / Risks / Decisions / Architecture / Notes.
- `body_text` plain-text shadow column for cheap future search (extractor uses same recursive walker as redactor).
- Mobile breakpoint (≤ 768 px → tree collapses behind hamburger).
- Keyboard shortcuts: Ctrl+B / I / U / S / K / Shift+I.
- ARIA tree + treeitem roles, aria-live save-state announcer.
- Attachment orphan tracking with 24-hour grace + nightly sweep cron.
- Backup coverage extended to `documents` + `document_attachments` tables and uploaded files.

## v1 scope (out — explicit non-goals)

- Page version history / restore.
- Real-time collaboration (cursor presence, OT, CRDT). Optimistic concurrency covers two-writer races; cursor presence is v2.
- Templates beyond the seeded 6.
- Cross-doc search UI (the `body_text` column is ready but no UI in v1).
- PDF / Word export.
- Comments on doc pages.
- @mentions / notifications.
- Internationalisation.
- Slack tier 2/3 (live thread fetch, channel pull, OAuth bot install).

## Architectural decisions sourced from the plan

- **TipTap version pin + SRI**. Pinned 2.5.9; SRI hashes computed once and stored in `dashboard-server/public/vendor/tiptap/manifest.json`. Loader attempts esm.sh first, falls back to local bundle on failure or 1500 ms timeout.
- **Storage format**: ProseMirror JSON in `body_json` (jsonb). Plain-text shadow in `body_text` (text + GIN trigram index).
- **Redaction**: pure function `redactNbiInternal(node)` walks the JSON and drops every `nbiInternalBlock` node. Same helper exposes `extractPlainText(node, { dropNbiInternal })` for the search-shadow column.
- **Concurrency**: PATCH `/api/documents/:id` requires `If-Match: <updated_at_ms>`. Mismatch returns 409 with current state.
- **Image scoping**: GET `/api/documents/:id/attachments/:filename` runs `imageInScope(body, filename, { dropNbiInternal })` for client portal users; 404 if image only lives inside an NBI block.
- **Attachment lifecycle**: PATCH that removes an image from body sets `orphaned_at = now()`; nightly cron at 03:30 sweeps `orphaned_at < now() - 24h` and unlinks files.
- **Editor schema versioning**: `documents.body_version` integer column to enable future TipTap-major-version migrations.
