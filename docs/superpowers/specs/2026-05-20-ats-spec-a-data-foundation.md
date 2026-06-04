# ATS Spec A: Data Foundation

## Summary

Add the data layer that the full ATS builds on: stage transition history, candidate source tracking, candidate tags, enriched hiring positions, threaded comments replacing the single notes field, and GDPR data retention flags. This spec covers schema, API endpoints, and frontend integration for each.

## Route File Organisation

Following the existing modular pattern (e.g. `client-notes.js` is a sub-resource of clients in its own file):

| Route file | Responsibility |
|---|---|
| `routes/hiring.js` | Existing — positions CRUD, candidates CRUD. Add `source`, `source_detail`, `tags`, GDPR fields to existing candidate endpoints. Stage transition history auto-recording goes here (it's part of the PATCH candidate flow). |
| `routes/candidate-comments.js` (new) | Threaded comments: GET/POST/DELETE on `/api/candidates/:id/comments`. Own file because it's a distinct sub-resource with its own table and auth rules. |
| `routes/candidate-history.js` (new) | Stage transition history read endpoint: GET `/api/candidates/:id/history`. Own file to keep the read API separate from the write-side (which is embedded in hiring.js PATCH). |

The enriched position fields (`salary_range`, `employment_type`, `location`, `requirements`, `interview_panel`) are added to the existing position endpoints in `routes/hiring.js` — they're just new columns on the same table, not a new sub-resource.

## 1. Stage Transition History

Track every stage change with who moved them and when. This is the backbone for time-in-stage, time-to-hire, and pipeline analytics (Spec C).

### Schema

```sql
CREATE TABLE candidate_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  moved_by TEXT NOT NULL,
  moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);
CREATE INDEX idx_csh_candidate ON candidate_stage_history(candidate_id);
CREATE INDEX idx_csh_moved_at ON candidate_stage_history(moved_at);
```

### Server

- **Auto-record on stage change (PATCH):** In the PATCH `/api/candidates/:id` endpoint, the existing `reorderInGroup` block (line 310-322 of hiring.js) already fetches the old stage via `SELECT stage FROM candidates WHERE id = $1` inside the transaction. When `body.stage !== undefined` and differs from `oldRow.rows[0].stage`, insert a history row INSIDE the same transaction, AFTER the reorder but BEFORE the commit:
  ```sql
  INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by)
  VALUES ($1, $2, $3, $4)
  ```
  Use `dbClient` (the transaction connection), not `pool`. `moved_by` = `req.user.displayName`.

- **Auto-record on create (POST):** In POST `/api/candidates`, the endpoint already uses a transaction (`dbClient`) with `shiftForInsert`. After the INSERT RETURNING (which gives the new candidate ID), add a history row INSIDE the same transaction:
  ```sql
  INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by)
  VALUES ($1, NULL, $2, $3)
  ```
  `$1` = `createdRow.id`, `$2` = `targetStage`, `$3` = `req.user.displayName`.

- **GET /api/candidates/:id/history** (in `routes/candidate-history.js`) — Returns the transition history for a candidate, ordered by `moved_at ASC`. Client users scoped to their own candidates (verify `candidate.client_id === req.user.clientId`). NBI users can access any.

### Frontend

- New "Timeline" section in the candidate detail panel, below the existing notes section.
- Rendered as a vertical timeline: each entry shows the stage badge (from → to), who moved it, when (relative date like "3 days ago"), and any notes.
- Read-only — transitions are recorded automatically, not manually entered.

## 2. Candidate Email

The `candidates` table has no email field. This is needed for email templates (Spec C) and is a core profile field.

### Schema

```sql
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS email TEXT;
```

### Server

- Add `email` to POST and PATCH `buildPatchQuery` allowed fields.
- Add `email` to the GET candidates list SELECT.
- Server-side validation: basic format check (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`). Not unique — the same person could be a candidate at multiple clients. Max 320 characters (RFC 5321 limit).

### Frontend

- New "Email" field in the candidate detail panel Profile section, between LinkedIn URL and Due date.
- Email field in the create candidate modal.

## 3. Candidate Source Tracking

Record where each candidate came from so you can measure which channels produce hires.

### Schema

```sql
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS source_detail TEXT;
```

- `source`: constrained to: `referral`, `linkedin`, `inbound`, `agency`, `job-board`, `internal`, `other`
- `source_detail`: free text for specifics (e.g. referrer name, agency name, which job board). Max 500 characters.

### Server

- Add `source` and `source_detail` to the POST `/api/candidates` allowed fields and the PATCH allowed fields.
- Add both to the GET candidates list SELECT.
- Server-side validation: reject any `source` value not in the whitelist `['referral', 'linkedin', 'inbound', 'agency', 'job-board', 'internal', 'other']`. Return 400 with the allowed values in the error message.
- Validate `source_detail` length (max 500 characters via `validateLength`).

### Frontend

- Two new fields in the candidate detail panel Profile section:
  - Source: dropdown with the enum values
  - Source detail: text input, placeholder adapts to source (e.g. "Referrer name" when source is "referral", "Agency name" when "agency")
- Source dropdown in the create candidate modal.
- Source column visible on the position detail candidate table.

## 4. Candidate Tags

Free-form tags for filtering and shortlisting beyond basic fields.

### Schema

```sql
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
```

Array of strings: `["strong-culture-fit", "senior", "greek-speaking"]`

### Validation Rules

- Tags are lowercased and trimmed on save.
- Duplicate tags silently deduplicated.
- Max 20 tags per candidate.
- Max 50 characters per tag.
- Empty strings stripped.

### Server

- Add `tags` to POST and PATCH allowed fields in `buildPatchQuery`.
- Add `tags` to the GET candidates list SELECT.
- Server-side validation: must be an array of strings. Apply the normalisation rules above (lowercase, trim, dedup, strip empties) before saving. Reject if any tag exceeds 50 chars or total count exceeds 20.
- No separate endpoint — tags are a field on the candidate, updated via the existing PATCH.

### Frontend

- Tag chips displayed on the candidate card (below the stage badge, max 2 visible + "+N more" overflow).
- Tag editor in the detail panel: existing tags as removable chips, text input to add new ones (comma or Enter to confirm).
- Filter-by-tag option in the hiring view filters bar (multi-select dropdown populated from all tags in `_candidatesData`).

## 5. Enriched Hiring Positions

Positions currently have title, description, seniority, and status. Add structured fields for a proper job spec.

### Schema

```sql
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS salary_range TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'permanent';
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS requirements JSONB DEFAULT '[]'::jsonb;
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS interview_panel JSONB DEFAULT '[]'::jsonb;
```

- `salary_range`: free text (e.g. "£45,000-£55,000" or "$80-100k USD")
- `employment_type`: `permanent`, `contract`, `freelance`
- `location`: free text (e.g. "Remote", "London office", "Hybrid - Athens")
- `requirements`: array of strings — key requirements/qualifications for the role
- `interview_panel`: array of objects — `[{ user_id: "uuid-here", name: "Glen Pryer", role: "Final interview" }, { user_id: "uuid-here", name: "Dino", role: "Culture fit" }]`. Each entry stores the `user_id` (FK to users table) for reliable matching, plus `name` for display and `role` for context. Spec B uses `user_id` to determine scorecard visibility and panel membership — name-only matching is fragile (display name changes, abbreviations, typos). This defines WHO is on the panel. Spec B adds scorecards and feedback collection ON TOP of this.

### Server

- Add all new fields to POST, PATCH, and GET hiring-positions endpoints.
- `employment_type` validated against the allowed values.

### Frontend

- Position detail panel updated to show/edit all new fields:
  - Salary range: text input
  - Employment type: dropdown
  - Location: text input
  - Requirements: editable list (add/remove, like onboarding links)
  - Interview panel: editable list with user dropdown (populated from `_cachedTeamMembers` mapped to user IDs), role text input, and remove button per row. When a user is selected from the dropdown, `user_id` and `name` are both stored in the JSONB. The dropdown uses the same team member list that the stage assignees use.
- Position card updated to show salary range and location in the metadata row.

## 6. Threaded Comments

Replace the single `notes` text field with a proper comment thread. Multiple team members can leave timestamped comments on a candidate.

### Schema

```sql
CREATE TABLE candidate_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cc_candidate ON candidate_comments(candidate_id);
```

- `author_user_id`: FK to users table for ownership checks (delete own comments).
- `internal`: when true, the comment is only visible to NBI users, not client users. This lets NBI leave internal notes like "client likes this candidate but we think they're weak" without the client seeing it.

The existing `candidates.notes` field is kept for backwards compatibility but the UI shifts to comments.

**Notes migration:** Handled as a one-time SQL statement in the migration file (046), not a runtime side-effect:

```sql
INSERT INTO candidate_comments (candidate_id, author, body, internal, created_at)
SELECT id, 'System Migration', notes, true, COALESCE(updated_at, created_at, NOW())
FROM candidates
WHERE notes IS NOT NULL AND notes != ''
  AND id NOT IN (SELECT DISTINCT candidate_id FROM candidate_comments);
```

This runs once during migration. Migrated comments are marked `internal = true` (notes were NBI-only before comments existed) and timestamped with the candidate's last update time. The `candidates.notes` column is kept but the frontend no longer reads or writes to it — all new content goes through the comments API.

### Server

- **GET /api/candidates/:id/comments** — List comments for a candidate, ordered by `created_at ASC`. Client users scoped to their own candidates AND filtered to exclude `internal = true` comments. NBI users see all comments.
- **POST /api/candidates/:id/comments** — Add a comment. Body: `{ body, internal }`. `author` and `author_user_id` auto-set from `req.user`. Client users cannot set `internal = true` (server ignores the field for client users — their comments are always public).
- **DELETE /api/candidates/:id/comments/:commentId** — Delete a comment. Only the comment author (`author_user_id` matches `req.user.id`) or an admin can delete. Returns 403 otherwise.
- Body text validated with `validateLength` (max 5000 characters). Empty body rejected.

### Candidate List SELECT Update

Add a comment count subquery to the GET `/api/candidates` list SELECT so the card can show a comment count badge without fetching the full thread.

In the GET candidates endpoint, check `req.user.clientId` to determine which subquery to use:

- **NBI users** (`req.user.clientId` is null): count all comments.
  ```sql
  (SELECT COUNT(*)::int FROM candidate_comments cc WHERE cc.candidate_id = ca.id) AS comment_count
  ```
- **Client users** (`req.user.clientId` is set): count only public comments.
  ```sql
  (SELECT COUNT(*)::int FROM candidate_comments cc WHERE cc.candidate_id = ca.id AND cc.internal = false) AS comment_count
  ```

Build the subquery string before the main SELECT based on `req.user.clientId`, then interpolate it into the query. No parameterised input needed — it's a static SQL fragment chosen by a server-side boolean, not user input.

### Frontend

- Replace the "Notes" section in the candidate detail panel with a "Comments" section.
- Comment thread: each comment shows author, relative timestamp, body text. Author's own comments have a delete button.
- Input field at the bottom with a "Post" button. Enter to submit.
- If the candidate has legacy `notes` content and zero comments, show a subtle "Migrated from notes" label on the auto-migrated first comment.

## 7. GDPR Data Retention Flags

Legal requirement for UK operations — candidate data must not be kept indefinitely without consent.

### Schema

```sql
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS consent_given BOOLEAN DEFAULT false;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS consent_date TIMESTAMPTZ;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS retention_expires_at TIMESTAMPTZ;
```

- `consent_given`: whether the candidate has given consent to store their data
- `consent_date`: when consent was recorded
- `retention_expires_at`: when the data should be reviewed/purged

### Server

- Add all three fields to POST and PATCH `buildPatchQuery` allowed fields.
- Add all three to the GET candidates list SELECT.
- **Auto-set on INSERT:** In the POST `/api/candidates` endpoint, if `retention_expires_at` is not provided, set it to `NOW() + INTERVAL '12 months'` in the INSERT query. This is a server-side default applied at insertion time, not a database column default (so it's based on actual creation time, not migration time).
- **Auto-stamp consent date:** When PATCH sets `consent_given = true` and `consent_date` is not provided, auto-set `consent_date = NOW()`.
- **GET /api/candidates?retention=expiring** — Filter: returns only candidates whose `retention_expires_at` is within 30 days of now or already past. NBI users only. Applied as an additional WHERE clause alongside existing filters.
- **No auto-purge.** Expiry is a flag for human review, not automated deletion. The workflow is: admin sees the warning, reviews the candidate, then either extends retention (updates `retention_expires_at`) or archives/deletes the record manually.

### Frontend

- "Data Consent" section in the candidate detail panel:
  - Checkbox: "Consent given" with date auto-stamped on check
  - Date field: "Retention expires" — editable, defaults to 12 months from creation
- Warning badge on candidate cards where `retention_expires_at` is past or within 30 days.
- Optional "Expiring Data" filter in the hiring view filters bar (shows only candidates needing review).

## Migration

Single migration file covering all schema changes:

```
migrations/046_ats_data_foundation.sql
```

All columns use `ADD COLUMN IF NOT EXISTS` and `DEFAULT NULL/[]` to be safe for reruns.

**Data backfills in the migration:**

1. Notes → comments migration (see section 5 above).
2. GDPR retention backfill for existing candidates:
   ```sql
   UPDATE candidates SET retention_expires_at = created_at + INTERVAL '12 months'
   WHERE retention_expires_at IS NULL;
   ```
   This ensures existing candidates are visible in the "expiring" GDPR filter. Without this, candidates created before the migration would have NULL retention and be invisible to GDPR review.

## Existing Data: `hired` Stage Transition

The global default stages add `onboarded` after `hired`. Under the old model, `hired` was the terminal stage — candidates reaching it had `archived_at` set. Under the new model, `hired` is a regular pre-terminal stage and `onboarded` is the terminal.

**No data migration needed.** Existing candidates in stage `hired` with `archived_at` set are completed hires from before the change. They remain archived in the `hired` lane (visible only with "Show archived" toggled on). New candidates flow through the full pipeline including `onboarded`. The `hiringConfirmHire` function now archives candidates at the `onboarded` stage, not `hired`.

---

## What This Spec Does NOT Cover

- Time-in-stage / time-to-hire reporting UI (Spec C — depends on transition history from this spec)
- Stage-change notifications (Spec C)
- Interview scorecards and structured feedback (Spec B)
- Stall reminders and email templates (Spec C)
- Per-client custom stages (Spec D)
- Resume parsing, job board distribution, candidate self-scheduling (out of scope)
