# ATS Spec C: Intelligence Layer

Depends on: Spec A (stage transition history, threaded comments, enriched positions), Spec B (interview rounds, scorecards).

## Summary

Add reporting, notifications, and workflow automation on top of the ATS data layer: time-in-stage and time-to-hire metrics, pipeline health dashboard, stage-change notifications, stall reminders, rejection/drop-off reasons, email templates, and an onboarding checklist.

## Route File Organisation

| Route file | Responsibility |
|---|---|
| `routes/hiring.js` | Add rejection reason fields to candidate PATCH allowed fields. Add rejection enforcement logic (check `req.body` before `buildPatchQuery` runs). |
| `routes/hiring-metrics.js` (new) | Time-in-stage, time-to-hire, and conversion rate query endpoints. Complex aggregation queries that don't belong in the main hiring CRUD file. |
| `routes/hiring-notifications.js` (new) | Stage-change notification logic. Exported as a helper called from `routes/hiring.js` PATCH, not as its own router. |
| `routes/hiring-templates.js` (new) | Email template CRUD and send-from-template endpoint. |
| `routes/onboarding-checklist.js` (new) | Onboarding checklist CRUD for `/api/candidates/:id/onboarding`. Separate from hiring.js — distinct sub-resource with its own table. |

## 1. Time-in-Stage Metrics

How long candidates sit in each stage. Identifies bottlenecks.

### Data Source

Computed from `candidate_stage_history` (Spec A). No new tables needed.

Time in a stage = difference between the `moved_at` of the entry INTO that stage and the `moved_at` of the entry OUT of that stage (or NOW() if still in that stage).

### Server

**GET /api/hiring/metrics/time-in-stage** — Query params: `client_id` (required for scoping), `from` and `to` dates (optional, defaults to last 90 days).

Response:
```json
{
  "stages": [
    {
      "stage": "sourcing",
      "avg_days": 4.2,
      "median_days": 3,
      "max_days": 14,
      "candidate_count": 12
    },
    {
      "stage": "interviews",
      "avg_days": 8.7,
      "median_days": 7,
      "max_days": 22,
      "candidate_count": 8
    }
  ],
  "period": { "from": "2026-02-20", "to": "2026-05-20" }
}
```

SQL approach: for each candidate, compute time between consecutive `candidate_stage_history` entries. Group by `to_stage`, aggregate with AVG, percentile_cont(0.5) for median, MAX.

NBI users can query any client. Client users can only query their own `client_id`. Return 403 if a client user passes a foreign `client_id`.

### Frontend

- New "Metrics" sub-view on the hiring page (added to the view toggle alongside Kanban / By Client / Positions).
- Bar chart showing average days per stage. Colour-coded: green (<7 days), amber (7-14 days), red (>14 days).
- Table below the chart with avg/median/max/count per stage.
- Client dropdown and date range filter apply.

## 2. Time-to-Hire

Days from first stage entry to terminal stage, per candidate who reached hired/onboarded.

### Server

**GET /api/hiring/metrics/time-to-hire** — Query params: `client_id` (required), `from` and `to` dates (optional, defaults to last 12 months).

Response:
```json
{
  "avg_days": 32,
  "median_days": 28,
  "candidates": [
    { "id": "...", "name": "Alice", "role": "Senior Dev", "days": 24, "hired_at": "2026-04-15" },
    { "id": "...", "name": "Bob", "role": "PM", "days": 41, "hired_at": "2026-03-20" }
  ],
  "period": { "from": "2025-05-20", "to": "2026-05-20" }
}
```

SQL: for each candidate with a terminal stage entry in `candidate_stage_history`, compute `MAX(moved_at) - MIN(moved_at)` across their history. Only include candidates whose latest `to_stage` is in the terminal stages (`hired`, `onboarded`, or the client's custom terminal stage from Spec D).

Same scoping rules as time-in-stage.

### Frontend

- Shown on the same Metrics sub-view.
- Single stat card: "Average Time to Hire: 32 days" with the median below.
- Expandable table listing each hired candidate with their individual time-to-hire.

## 3. Pipeline Health Dashboard

At-a-glance view of where all candidates stand across the pipeline.

### Server

**GET /api/hiring/metrics/pipeline** — Query params: `client_id` (required), `from` and `to` dates (optional, defaults to last 90 days).

The pipeline snapshot (current candidate counts per stage) can be computed client-side from `_candidatesData`. But conversion rates require transition history data that the frontend doesn't have loaded globally.

Response:
```json
{
  "snapshot": [
    { "stage": "sourcing", "count": 5 },
    { "stage": "interviews", "count": 3 },
    { "stage": "offer", "count": 1 }
  ],
  "conversions": [
    { "from": "sourcing", "to": "interviews", "entered": 12, "advanced": 8, "rate": 0.667 },
    { "from": "interviews", "to": "offer", "entered": 8, "advanced": 3, "rate": 0.375 }
  ],
  "period": { "from": "2026-02-20", "to": "2026-05-20" }
}
```

SQL approach for conversions: resolve the client's stage order (default or custom). For each consecutive stage pair (A → B):
- `entered` = COUNT(DISTINCT candidate_id) from `candidate_stage_history` WHERE `to_stage = A` AND `moved_at` within the period.
- `advanced` = COUNT(DISTINCT candidate_id) from `candidate_stage_history` WHERE `to_stage = B` AND `moved_at` within the period AND candidate_id IN (the entered set) AND the B entry's `moved_at` is AFTER the A entry's `moved_at` for the same candidate.
- `rate` = advanced / entered.

The timestamp ordering (`B.moved_at > A.moved_at`) ensures that only forward progression counts — a candidate who went A → C → B (backward) doesn't count as an A → B conversion. Candidates who skip stages (A → C, bypassing B) don't count in the A → B conversion but DO count in A → C.

Same scoping rules as other metrics endpoints.

### Frontend

- Top section of the Metrics sub-view:
  - Funnel visualisation: horizontal bar for each stage showing candidate count. Width proportional to count. Colour matches stage palette.
  - Conversion rates between adjacent stages displayed as percentages on the arrows between bars.
- Client dropdown and date range filter apply.

## 4. Stage-Change Notifications

Notify relevant team members when a candidate moves stages.

### Schema

No new tables — uses the existing `notifications` table and `createNotification` helper already in the codebase.

### Server

In `routes/hiring.js`, after recording a stage transition in the PATCH endpoint:

1. Look up the `stage_assignees` for the NEW stage on the candidate.
2. For each assignee name, find the matching user in the `users` table.
3. Call `createNotification` for each user with type `hiring_stage_change`, message: `"${candidateName} moved to ${stageLabel} (${clientName})"`, and a link to the candidate detail.

Also notify when:
- A new scorecard is submitted for a round (notify the hiring manager / position owner).
- A candidate is archived (notify all stage assignees across all stages for that candidate).

### Frontend

Notifications already render in the alerts dropdown. The `hiring_stage_change` type just needs an icon and click handler that opens the candidate detail panel.

## 5. Stall Reminders

Alert assignees when a candidate has been sitting in a stage too long.

### Trigger

Cron job (or scheduled check within the existing cron system in `dashboard-server/cron/`). Runs daily.

### Logic

1. Query all active (non-archived) candidates.
2. For each, find their latest `candidate_stage_history` entry to determine how long they've been in the current stage.
3. If time in current stage exceeds a threshold, create a notification for the stage assignees.
4. Thresholds (configurable per client in future, hardcoded defaults for now):
   - Sourcing: 7 days
   - Interviews: 10 days
   - Offer: 5 days
   - Onboarding: 14 days
   - All other stages: 10 days
5. Only send one reminder per candidate per stage per threshold period. Don't use a single `last_stall_reminder_at` timestamp on the candidates table — that can't distinguish between stages (a candidate who moves from a stalled stage to a new stage would carry the old timestamp). Instead, check the `notifications` table for an existing `hiring_stall_reminder` notification for this candidate where `created_at` is within the last threshold period. If one exists, skip. If not, create a new notification.

### Schema

No new columns needed. The `notifications` table already exists. The stall check queries `candidate_stage_history` for the latest entry per candidate and compares `moved_at` to `NOW()`.

### Server

New function in `cron/hiring-reminders.js`:

```
checkHiringStalls() — runs daily at 08:00. Queries all active (non-archived) candidates, joins their latest candidate_stage_history entry, computes time in current stage, checks against threshold, checks notifications table for existing recent reminder, creates notification if stalled and no recent reminder exists.
```

Register in `cron/index.js` alongside existing cron jobs.

### Frontend

Stall reminders appear as standard notifications. The candidate card could also show a small clock icon when stalled (time in current stage exceeds threshold), computed client-side from the `moved_at` of the latest history entry.

## 6. Rejection/Drop-off Reasons

When a candidate is archived (rejected or withdrawn), record why.

### Schema

```sql
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS rejection_category TEXT;
```

- `rejection_category`: constrained to: `unqualified`, `culture-mismatch`, `compensation`, `candidate-withdrew`, `position-filled`, `no-response`, `failed-interview`, `other`
- `rejection_reason`: free text detail

### Server

- Add both fields to the PATCH `buildPatchQuery` allowed fields.
- Server-side validation for `rejection_category`: reject any value not in the whitelist `['unqualified', 'culture-mismatch', 'compensation', 'candidate-withdrew', 'position-filled', 'no-response', 'failed-interview', 'other']`.
- **Rejection enforcement:** In the PATCH `/api/candidates/:id` endpoint, BEFORE calling `buildPatchQuery`, inspect `req.body` directly:
  - If `req.body.archived_at` is being set (non-null value) AND the candidate is not moving to the terminal stage (`req.body.stage` is not the terminal key), then `req.body.rejection_category` must be present. If missing, return 400: "Rejection category required when archiving a candidate."
  - To determine the terminal key: look up the candidate's `client_id` (from the ownership check query or a fresh SELECT), call `getStagesForClient(client_id)`, take the last stage key.
  - This check runs before `buildPatchQuery` so the request is rejected cleanly before any DB writes.
- Exception: candidates archived via the terminal stage confirm flow (hired/onboarded) don't need a rejection reason — they succeeded. The terminal stage check above handles this.

### Frontend

- When archiving a candidate (via "Clear Candidate" or drag to archive), show a modal asking for rejection category (dropdown) and optional reason (text field) before completing the archive.
- The `hiringConfirmHire` flow (terminal stage) does NOT show this modal — it's a success archive.
- Rejection stats visible on the Metrics sub-view: pie chart or breakdown of rejection categories for the selected client and date range.

## 7. Email Templates

Pre-written templates for common candidate communications.

### Schema

```sql
CREATE TABLE hiring_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  trigger_stage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_het_client ON hiring_email_templates(client_id);
```

- `client_id`: NULL = global template available to all clients. Non-NULL = client-specific template.
- `trigger_stage`: optional — if set, this template is suggested (not auto-sent) when a candidate moves to this stage. NULL = manually triggered only.
- `body` supports placeholders: `{{candidate_name}}`, `{{candidate_email}}`, `{{role}}`, `{{client_name}}`, `{{stage}}`, `{{position_title}}`, `{{salary_range}}`, `{{location}}`, `{{start_date}}`, `{{sender_name}}` (the NBI user sending the email). The server resolves all placeholders from the candidate, position, client, and user records. Unknown placeholders are left as-is (not stripped) so the sender sees them in the preview and can fill them manually.

### Server (routes/hiring-templates.js)

- **GET /api/hiring-templates** — List templates. Query param `client_id` to filter. Returns global templates (client_id IS NULL) plus client-specific ones. Client users see only their client's templates plus globals.
- **POST /api/hiring-templates** — Create a template. NBI admin only. Body: `{ client_id, name, subject, body, trigger_stage }`.
- **PATCH /api/hiring-templates/:id** — Update a template. NBI admin only.
- **DELETE /api/hiring-templates/:id** — Delete a template. NBI admin only.
- **POST /api/hiring-templates/:id/send** — Send an email using this template for a candidate. Body: `{ candidate_id }`. Resolves placeholders from candidate and position data. Sends via the existing `sendEmailAsync` helper. From address: uses the existing `EMAIL_FROM` env var (the system's configured sender). Reply-to is set to `req.user.email` so candidate replies go to the person who sent the template, not a no-reply address. Requires the candidate to have an email set (Spec A section 2) — return 400 "Candidate has no email address" if null.

### Candidate Email Dependency

Templates need to send email to candidates. The `candidates.email` field is added in Spec A (section 2). The send endpoint should validate that the candidate has an email set before sending — return 400 "Candidate has no email address" if null.

### Frontend

- "Templates" section accessible from the hiring page (gear menu or separate sub-tab).
- Template list with name, trigger stage, and client scope.
- Template editor: name, subject, body (with placeholder hints), trigger stage dropdown, client dropdown.
- In the candidate detail panel, an "Email" action button that:
  1. Shows available templates for this candidate's client.
  2. Previews the resolved template (placeholders filled in).
  3. Sends on confirm.

## 8. Onboarding Checklist

Structured checklist for the onboarding stage, replacing the freeform links field.

### Schema

```sql
CREATE TABLE onboarding_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_oci_candidate ON onboarding_checklist_items(candidate_id);
```

### Checklist Templates

Positions can define a default onboarding checklist that auto-populates when a candidate enters the onboarding stage:

```sql
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS onboarding_template JSONB DEFAULT NULL;
```

Value: `[{ title: "Order laptop" }, { title: "Create email account" }, { title: "Schedule induction" }]`

When a candidate moves to the onboarding stage AND has zero checklist items AND the position has an `onboarding_template`, auto-create the items from the template.

### Server (routes/onboarding-checklist.js)

- **GET /api/candidates/:id/onboarding** — List checklist items, ordered by `sort_order ASC`. Scoped to candidate ownership.
- **POST /api/candidates/:id/onboarding** — Add an item. Body: `{ title }`.
- **PATCH /api/candidates/:id/onboarding/:itemId** — Update an item. Allowed fields: `title`, `completed`, `sort_order`. When `completed` changes to true, auto-set `completed_at = NOW()` and `completed_by = req.user.displayName`.
- **DELETE /api/candidates/:id/onboarding/:itemId** — Delete an item.
- Auto-populate from position template: in the PATCH `/api/candidates/:id` endpoint, when stage changes, resolve the client's stages and check if the target stage has `is_onboarding: true` (see Spec D Delta 6 — for the default stages, the `onboarding` stage has this flag). If it does, check if checklist items exist for this candidate. If not, and the candidate has a `position_id` with an `onboarding_template`, INSERT the template items inside the existing transaction. For the default global stages, the flag is hardcoded on the `onboarding` key: `{ key: 'onboarding', label: 'Onboarding', is_onboarding: true }`.

### Frontend

- The existing "Onboarding documents" section in the candidate detail panel is replaced with a full checklist.
- Each item: checkbox, title, "completed by X on date" when done.
- "Add item" input at the bottom.
- Progress bar at the top: "3 of 7 complete".
- The existing `onboarding_links` JSONB field is migrated: on first load, if `onboarding_links` has entries and no checklist items exist, auto-create checklist items with title = link URL.

## Migration

Single migration file for all Spec C schema changes:

```
migrations/048_ats_intelligence_layer.sql
```

(047 is reserved for Spec B's migration.)

## What This Spec Does NOT Cover

- Automated email sending on stage change (templates are suggested, not auto-sent — that's a future enhancement)
- Calendar integration for interview scheduling
- Per-client custom stage configuration (Spec D)
- Advanced analytics (source effectiveness, hiring velocity by client — future)
