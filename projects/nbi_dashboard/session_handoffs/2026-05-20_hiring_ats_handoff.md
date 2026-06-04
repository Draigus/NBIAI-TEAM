# Handoff: Hiring Board + ATS Specs — 2026-05-20

## What was done this session

### 1. Hiring Board Client Scoping (IMPLEMENTED + DEPLOYED)

The hiring board was locked to NBI-only users. Now it's scoped per user:

**Server changes** (`dashboard-server/routes/hiring.js`):
- GET `/api/candidates`, GET `/api/candidates/:id`, GET `/api/hiring-positions`, GET `/api/candidates/:id/cv` — removed `requireNBI`, auto-scope client users to their `client_id`
- POST `/api/candidates` — client users can create, auto-locked to their client_id
- PATCH `/api/candidates/:id` — client users can edit/drag their own candidates, ownership check before transaction
- POST `/api/candidates/:id/cv` — client users can upload CVs for their own candidates
- DELETE candidates and all positions CRUD — still admin-only

**Frontend changes** (`nbi_project_dashboard.html`):
- `_clientAllowedViews` — added `'hiring'`
- Sidebar hiring tab — visible to all users, badge count respects active filter
- `renderHiringView` — client users see kanban only (no "By Client" toggle), no client dropdown, "Create Candidate Card" visible
- Create modal — client dropdown hidden for client users, pre-selects active filter for NBI users, null-safe `#ccClient` access
- Detail panel — fully editable for client users, only the client dropdown is hidden
- NBI default filter — `window._hiringFilterClient` set to NBI Operations client ID (`22eb76a7-4842-4c1d-8e2e-dd9ea01b3e0a`) on both login paths (form login at line ~3682, session restore at line ~24393)
- Finance load — skipped for client users (`if (!isClientUser()) await loadFinanceFromDB()`) to prevent 403 toast
- `/api/clients` fetch — added to the login-form Promise.all so `_apiClientsCache` is populated before the NBI filter init runs

**Bug fixes during implementation:**
- Added `archived_at` and `stage_assignees` to the candidates list SELECT (were missing — archived filter and warning markers never worked on list view)
- Hiring lane CSS — `flex: 0 0 180px` changed to `flex: 1 1 200px` with min-width, text sizes bumped from 0.7rem to 0.75-0.85rem

**Tests:**
- `tests/unit/hiring-client-scope.test.mjs` — 13 tests covering all scoping scenarios
- `tests/unit/hiring-stages-resolution.test.mjs` — exists but is for the per-client stages feature (Spec D), not yet implemented
- All 447 tests pass

**Visual verification:** Created temp Couch Heroes client user, logged in via Playwright, confirmed: hiring tab visible, only CH candidates shown (Lili in Onboarding), no client dropdown, create button present, no error toasts, zero 403 responses. User deleted after verification.

### 2. ATS Specs (WRITTEN, NOT IMPLEMENTED)

Four specs at `docs/superpowers/specs/`:

- **Spec A: Data Foundation** (`2026-05-20-ats-spec-a-data-foundation.md`)
  - Stage transition history table + auto-recording in PATCH/POST
  - Candidate email field
  - Source tracking (enum + detail)
  - Tags (JSONB array with validation)
  - Enriched positions (salary, type, location, requirements, interview panel with user_ids)
  - Threaded comments (replacing single notes field, internal/public visibility, migration SQL)
  - GDPR retention flags (consent + expiry + backfill)
  - Migration: `046_ats_data_foundation.sql`
  - New route files: `candidate-comments.js`, `candidate-history.js`

- **Spec B: Interview Management** (`2026-05-20-ats-spec-b-interview-management.md`)
  - Interview rounds per candidate (title, schedule, status, outcome)
  - Scorecards with criteria ratings, strengths/concerns, recommendation
  - Independent feedback (hidden until submitted to prevent anchoring)
  - Criteria templates from positions
  - UNIQUE constraint on (round_id, interviewer_user_id)
  - Migration: `047_ats_interview_management.sql`
  - New route file: `interview-rounds.js`

- **Spec C: Intelligence Layer** (`2026-05-20-ats-spec-c-intelligence-layer.md`)
  - Time-in-stage and time-to-hire metrics endpoints
  - Pipeline health with conversion rates (server-computed)
  - Stage-change notifications (via existing notification system)
  - Stall reminders (daily cron, check notifications table for dedup)
  - Rejection/drop-off reasons (enforced on archive, except terminal stage)
  - Email templates with placeholder resolution and reply-to
  - Onboarding checklist (structured items replacing freeform links, position templates, `is_onboarding` flag trigger)
  - Migration: `048_ats_intelligence_layer.sql`
  - New route files: `hiring-metrics.js`, `hiring-notifications.js` (helper, not router), `hiring-templates.js`, `onboarding-checklist.js`

- **Spec D: Per-Client Stages** (`2026-05-20-ats-spec-d-per-client-stages.md`)
  - Deltas from original per-client stages design accounting for Specs A-C
  - Key decisions: `is_onboarding` flag (not second-to-last stage assumption), `stall_days` per stage, terminal stage resolution for rejection enforcement
  - Original plan at `docs/superpowers/plans/2026-05-20-per-client-hiring-stages.md` — needs updating after Spec A-C are implemented

### 3. Implementation Problems Identified (NOT YET IN SPECS)

Glen is adding these to the specs. Key ones:

1. `_cachedTeamMembers` is name strings not user objects — panel editor needs `_cachedUsers`
2. `createNotification` takes `username` not user_id — need lookup
3. Hiring route context in server.js missing `createNotification`, `sendEmailAsync`, `EMAIL_FROM`
4. Detail panel needs skeleton + lazy-load (3+ API calls for sub-resources)
5. PATCH candidate endpoint becoming god function — need clear side-effect ordering
6. `validateLength` needs explicit max for new fields not in `MAX_LENGTHS`
7. Comment count badge stale after posting — need local increment
8. No multi-user sync for hiring data (only tasks polled)
9. Notification deep-link format `#hiring/candidate/{uuid}` needed
10. `openCandidateDetail` needs decomposition into helper functions
11. Charts are CSS-only (flex bars) — no library
12. `sendEmailAsync` doesn't support reply-to — needs `replyTo` in Graph API payload
13. Client users can't see NBI user IDs — correct but needs acknowledging

## Current State

- Production server running on PM2 (:8888), 447 tests passing
- Branch: `feature/command-centre`
- No uncommitted changes related to ATS (specs are new files, not committed yet)
- The hiring client scoping changes are in the working tree (modified but not committed)

## Next Steps

1. Glen adds implementation notes to the specs
2. Write implementation plans for Spec A (first)
3. Execute Spec A
4. Then B, C, D in order

## Files Modified This Session

- `dashboard-server/routes/hiring.js` — client scoping, removed requireNBI from read/write endpoints
- `dashboard-server/lib/auth-middleware.js` — no changes (just read for context)
- `nbi_project_dashboard.html` — client scoping frontend, hiring lane CSS, sidebar visibility, NBI default filter, finance load skip
- `dashboard-server/tests/unit/hiring-client-scope.test.mjs` — NEW, 13 tests
- `docs/superpowers/specs/2026-05-20-per-client-hiring-stages-design.md` — NEW, original per-client stages spec
- `docs/superpowers/plans/2026-05-20-per-client-hiring-stages.md` — NEW, implementation plan (needs updating after ATS)
- `docs/superpowers/specs/2026-05-20-ats-spec-a-data-foundation.md` — NEW
- `docs/superpowers/specs/2026-05-20-ats-spec-b-interview-management.md` — NEW
- `docs/superpowers/specs/2026-05-20-ats-spec-c-intelligence-layer.md` — NEW
- `docs/superpowers/specs/2026-05-20-ats-spec-d-per-client-stages.md` — NEW
