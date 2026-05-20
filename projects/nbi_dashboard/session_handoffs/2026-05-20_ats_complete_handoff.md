# Handoff: ATS Specs A-D Complete — 2026-05-20

## What was done this session

All four ATS specs implemented, tested, and deployed. Plus UAT-driven fixes and a document preview feature.

### ATS Spec A: Data Foundation (IMPLEMENTED)

**Migration 046** — `candidate_stage_history` table, `candidate_comments` table, 7 new columns on `candidates` (email, source, source_detail, tags, consent_given, consent_date, retention_expires_at), 5 new columns on `hiring_positions` (salary_range, employment_type, location, interview_panel, requirements — requirements later removed in 047).

**Server changes:**
- `routes/hiring.js` — `HIRING_STAGES` changed: `hired` replaced with `onboarded` as terminal stage. Stage transition history auto-recorded in POST and PATCH transactions. Email/source/tags validation with `validateAndNormaliseTags()`. GDPR consent_date auto-stamp. Retention expiring filter (`?retention=expiring`). Comment count subquery in GET candidates (conditional: NBI sees all, client sees non-internal). Candidate poll endpoint `GET /api/candidates/poll?since=` for multi-user sync.
- `routes/candidate-history.js` (NEW) — `GET /api/candidates/:id/history` with client scoping.
- `routes/candidate-comments.js` (NEW) — `GET/POST/DELETE /api/candidates/:id/comments`. Internal flag (NBI-only visibility). Client users always post public. Author or admin can delete.
- `server.js` — mounts candidate-history and candidate-comments after hiring routes.

**Frontend changes:**
- `onboarded` replaces `hired` in `HIRING_STAGES`, `HIRING_STAGE_LABELS`, `hiringConfirmHire`, `hiringStageSelectChange`, `stageColors` map.
- `openCandidateDetail` decomposed into 8 helper functions: `buildCandidateHeaderHtml`, `buildCandidateProfileHtml` (adds email, source, source detail fields), `buildCandidateStageHtml`, `buildCandidateTagsHtml`, `buildCandidateStageSubHtml`, `buildCandidateGdprHtml`, `buildCandidateActionsHtml`, plus `renderCandidateComments`.
- Detail panel now has: Profile (with email, source, source detail), Stage, Assignees, Tags, Stage-specific section, Interviews (Spec B), Timeline (lazy-loaded), Comments (lazy-loaded), GDPR consent, Actions.
- Skeleton loading: panel renders immediately, timeline + comments load in parallel via `Promise.all`.
- `hiringAddTag`/`hiringRemoveTag`, `postCandidateComment`/`deleteCandidateComment` — local comment_count increment for stale badge fix.
- Candidate sync polling added to 10-second sync interval (`_lastCandidatePollTime`).
- Create modal: email and source fields added.
- Candidate cards: tag chips (max 2 + overflow), GDPR warning badge, comment count badge.

**Tests:** 34 new tests in `ats-data-foundation.test.mjs`. Fixtures updated: `createTestCandidate` accepts all new fields, `createTestHiringPosition` added.

### ATS Spec B: Interview Management (IMPLEMENTED)

**Migration 048** — `interview_rounds` table, `interview_scorecards` table (with UNIQUE on round_id + interviewer_user_id), `scorecard_criteria JSONB` on `hiring_positions`.

**Server changes:**
- `routes/interview-rounds.js` (NEW) — Full CRUD for rounds (`GET/POST/PATCH/DELETE /api/candidates/:id/interviews[/:roundId]`) and scorecards (`GET/POST/PATCH/submit/DELETE .../scorecards[/:scId]`).
- Round number auto-increments via transaction with row lock on candidate.
- Scorecard visibility (anti-anchoring): admin sees all; client sees submitted only; NBI not on panel sees submitted; NBI on panel unsubmitted sees only own draft; NBI on panel submitted sees own + all submitted.
- Criteria templates: position's `scorecard_criteria` → default 4-item template fallback.
- Submit requires `overall_rating` and `recommendation`. Once submitted, scorecard is locked.
- `routes/hiring.js` — `scorecard_criteria` added to position GET SELECT and PATCH allowed fields.
- `server.js` — mounts interview-rounds.

**Frontend changes:**
- `buildCandidateInterviewsHtml` renders rounds with status/outcome badges, schedule, duration, location.
- `loadAndRenderScorecards` fills scorecard containers asynchronously after panel opens.
- `addInterviewRound` (prompt for title), `createScorecard`, avg rating + per-interviewer breakdown display.

**Tests:** 19 new tests in `interview-management.test.mjs`. Fixtures: `createTestInterviewRound`, `createTestScorecard`.

### Document Preview + JD Attachments (UAT-DRIVEN)

**Migration 047** — dropped `requirements` column from `hiring_positions`, added `jd_filename` and `jd_original_name`.

**Server changes:**
- `routes/hiring.js` — `POST /api/hiring-positions/:id/jd` (admin, DOCX+PDF), `GET .../jd` (download), `GET .../jd/preview` (inline). `GET /api/candidates/:id/cv/preview` (inline). Requirements removed from GET/POST/PATCH allowed fields.
- `lib/email.js` — `replyTo` support added to Graph API payload.

**Frontend changes:**
- `mammoth.browser.min.js` (642KB) in `public/vendor/`, lazy-loaded on first preview click.
- `openDocumentPreview(previewUrl, downloadUrl, filename)` — reusable modal (800px wide, 85vh). DOCX via mammoth.js, PDF via iframe, error fallback.
- Position detail: JD section with Preview/Download/Upload/Replace (replaces removed requirements section).
- Candidate detail: Preview button added to CV section.
- Position cards: document icon for positions with JDs.
- `uploadPositionJD` helper function.

**Bulk attach:** `scripts/bulk-attach-jds.js` matched 23 of 30 Couch Heroes positions to JD files via explicit title mapping. Files copied to `uploads/` with multer-style names.

**Tests:** 16 new tests in `jd-attachment.test.mjs`. Fixtures: `test.docx` (real DOCX copied from JD folder), `test.pdf`.

### ATS Spec C: Intelligence Layer (IMPLEMENTED)

**Migration 049** — `rejection_reason` and `rejection_category` on `candidates`, `hiring_email_templates` table, `onboarding_checklist_items` table, `onboarding_template JSONB` on `hiring_positions`.

**Server changes:**
- `routes/hiring.js` — Rejection enforcement: requires `rejection_category` when archiving non-terminal candidate (400 if missing). `rejection_reason` and `rejection_category` in PATCH allowed fields and GET SELECT. `notifyStageAssignees()` helper: resolves display_name → username via users table, creates `hiring_stage_change` notifications with `#hiring/candidate/{id}` deep link. Notification fires after transaction commit (non-blocking). Onboarding checklist auto-populate: when candidate moves to a stage with `is_onboarding: true` flag and has 0 checklist items and has a position with `onboarding_template`, auto-creates items inside transaction.
- `routes/hiring-metrics.js` (NEW) — `GET /api/hiring/metrics/time-in-stage`, `time-to-hire`, `pipeline`. All require `client_id`, client-scoped. Time-in-stage uses `LEAD()` window function. Pipeline snapshot from candidates table + conversion rates from history.
- `routes/hiring-templates.js` (NEW) — CRUD + send. `resolvePlaceholders()` for `{{candidate_name}}`, `{{client_name}}`, etc. Send endpoint: validates candidate has email, resolves placeholders, sends via `sendEmailAsync` with `replyTo` set to sender's email.
- `routes/onboarding-checklist.js` (NEW) — `GET/POST/PATCH/DELETE /api/candidates/:id/onboarding`. Auto-increment sort_order. PATCH auto-stamps `completed_at`/`completed_by` on complete.
- `cron/index.js` — `checkHiringStalls()` daily weekday cron at 08:00. Queries active candidates with latest stage history entry, checks against thresholds (sourcing:7, interviews:10, offer:5, onboarding:14, default:10), deduplicates via notifications table.
- `server.js` — Hiring route context expanded with `createNotification`, `sendEmailAsync`, `EMAIL_FROM`. Mounts hiring-metrics, hiring-templates, onboarding-checklist.

**Frontend changes:**
- Metrics tab (4th tab on hiring view): client selector, pipeline funnel bars, time-to-hire stat cards, time-in-stage colour-coded bars (green <7d, amber 7-14d, red >14d).
- Rejection modal: on "Clear Candidate", shows modal with required category dropdown (8 options) and optional reason textarea. Terminal stage archives without modal.
- Onboarding checklist: replaces old onboarding links. Progress bar, checkboxes with strike-through, completed_by attribution, add item input.
- Notification deep links: `hashchange` listener handles `#hiring/candidate/{id}`, switches to hiring view and opens detail panel.

**Tests:** 20 new tests in `intelligence-layer.test.mjs`. Fixtures: `createTestEmailTemplate`, `createTestOnboardingItem`.

### ATS Spec D: Per-Client Custom Stages (IMPLEMENTED)

**Migration 050** — `hiring_stages JSONB DEFAULT NULL` on `clients` table.

**Server changes:**
- `routes/hiring.js` — `DEFAULT_STAGES` constant derived from `HIRING_STAGES` with `label` and `is_onboarding` flag. `getStagesForClient(clientId)` async helper: queries `clients.hiring_stages`, returns `{ stages, isCustom }`, falls back to `DEFAULT_STAGES`. Three new endpoints: `GET/PUT/DELETE /api/clients/:id/hiring-stages`. PUT validates: ≥2 stages, last key must be `onboarded`, keys unique + valid slug format, labels non-empty. PUT moves candidates from removed stage keys to first stage. DELETE resets to NULL.
- **ALL hardcoded `HIRING_STAGES.includes(stage)` validation replaced:** GET candidates filter, POST candidates, PATCH candidates — all use `getStagesForClient(candidateClientId)`. PATCH adds `candidateClientId` lookup for NBI users (client users already have it from ownership check).
- Rejection enforcement: terminal stage resolved dynamically via `getStagesForClient().stages.at(-1).key`.
- Onboarding auto-populate: checks `is_onboarding` flag on target stage object instead of hardcoded `stage === 'onboarding'`.
- `cron/index.js` — Stall check respects custom `stall_days` per stage from client's `hiring_stages` config.

**Frontend changes:**
- `_hiringStagesCache` per-client cache. `getHiringStagesForClient(clientId)` async with API fallback. `_resolvedHiringStages` pre-cached for synchronous kanban rendering.
- Kanban rendering: `kanbanStages.forEach(stageObj => ...)` replaces `HIRING_STAGES.forEach(stage => ...)`.
- `buildCandidateStageHtml` accepts 4th `candidateStages` param. Prev/next computed from resolved stages by `findIndex`. Stage dropdown uses resolved stages.
- `resolveAndCacheHiringStages()` called on initial load and client filter change.
- Stage editor modal: gear icon (admin only, client selected). Key/label/onboarding-checkbox rows. Add/remove stages. Save validates and PUTs. Reset to Default DELETEs. Both invalidate cache and re-render.

**Tests:** 14 new tests in `per-client-stages.test.mjs`.

### UAT Fixes (from Glen's review)

- Position cards: `minmax(180px, 1fr)` → `minmax(280px, 1fr)`, titles wrap instead of truncate.
- All overlays: `--bg-overlay` bumped to 0.85-0.88 opacity across all 8 themes. Individual overlay CSS classes switched from hardcoded `rgba` to `var(--bg-overlay)`.
- Position sort toggles: By Priority / By Start Date / By Status / By Client (default: Priority).
- Old read-only info grid (parsed from description) removed from position detail — replaced by structured editable fields.
- `hiringStageSelectChange`: fixed to intercept `'onboarded'` not `'hired'`.
- `stageColors` in `renderPositionCard`: `hired` → `onboarded`.

## Current State

- **Branch:** `feature/command-centre`
- **Production:** PM2 on :8888, server running, all migrations applied (046-050)
- **Tests:** 550 unit tests across 40 files, 19 E2E tests — all green
- **Test DB note:** migration 050 needed manual application to test DB (`npm run init-db` uses `.env` not `.env.test` for the DB URL). Applied via direct node script. Future migrations should check both DBs.

## Files Created This Session

### Migrations
- `dashboard-server/migrations/046_ats_data_foundation.sql`
- `dashboard-server/migrations/047_jd_attachment.sql`
- `dashboard-server/migrations/048_interview_management.sql`
- `dashboard-server/migrations/049_intelligence_layer.sql`
- `dashboard-server/migrations/050_per_client_stages.sql`

### Route Files
- `dashboard-server/routes/candidate-history.js`
- `dashboard-server/routes/candidate-comments.js`
- `dashboard-server/routes/interview-rounds.js`
- `dashboard-server/routes/hiring-metrics.js`
- `dashboard-server/routes/hiring-templates.js`
- `dashboard-server/routes/onboarding-checklist.js`

### Test Files
- `dashboard-server/tests/unit/ats-data-foundation.test.mjs` (34 tests)
- `dashboard-server/tests/unit/jd-attachment.test.mjs` (16 tests)
- `dashboard-server/tests/unit/interview-management.test.mjs` (19 tests)
- `dashboard-server/tests/unit/intelligence-layer.test.mjs` (20 tests)
- `dashboard-server/tests/unit/per-client-stages.test.mjs` (14 tests)
- `dashboard-server/tests/fixtures/test.docx`
- `dashboard-server/tests/fixtures/test.pdf`

### Other
- `dashboard-server/public/vendor/mammoth.browser.min.js` (mammoth.js 1.8.0, 642KB)
- `dashboard-server/scripts/bulk-attach-jds.js`

### Specs and Plans
- `docs/superpowers/specs/2026-05-20-ats-spec-a-data-foundation.md`
- `docs/superpowers/specs/2026-05-20-ats-spec-b-interview-management.md`
- `docs/superpowers/specs/2026-05-20-ats-spec-c-intelligence-layer.md`
- `docs/superpowers/specs/2026-05-20-ats-spec-d-per-client-stages.md`
- `docs/superpowers/specs/2026-05-20-per-client-hiring-stages-design.md`
- `docs/superpowers/specs/2026-05-20-document-preview-jd-attachment.md`
- `docs/superpowers/plans/2026-05-20-ats-spec-a-data-foundation.md`
- `docs/superpowers/plans/2026-05-20-ats-spec-b-interview-management.md`
- `docs/superpowers/plans/2026-05-20-ats-spec-c-intelligence-layer.md`
- `docs/superpowers/plans/2026-05-20-ats-spec-d-per-client-stages.md`
- `docs/superpowers/plans/2026-05-20-document-preview-jd-attachment.md`

### Modified Files
- `dashboard-server/routes/hiring.js` — heavily modified (stage history, validation, notifications, rejection, dynamic stages, JD endpoints)
- `dashboard-server/server.js` — 7 new route mounts, hiring context expanded
- `dashboard-server/lib/helpers.js` — MAX_LENGTHS expanded
- `dashboard-server/lib/email.js` — replyTo support
- `dashboard-server/cron/index.js` — checkHiringStalls + custom stall_days
- `dashboard-server/tests/helpers/fixtures.js` — 6 new factories
- `nbi_project_dashboard.html` — extensive frontend changes (detail panel decomposition, new sections, dynamic stages, stage editor, metrics view, rejection modal, onboarding checklist, document preview, position sort toggles, overlay fixes, card sizing)

## Glen's Feedback / Outstanding Items

1. **Visual quality unsatisfying** — Glen said "I'm not very pleased with it, but I want to get all of it done, and then we'll go back." All 4 specs are now done. A visual polish pass is next.
2. **Salary data not backfilled** — The `salary_range` column on positions is empty because salary data lives in the `description` text field (parsed by `_parsePositionDesc`). A backfill script could extract it. Not yet done.
3. **The existing `_parsePositionDesc` info grid was removed** from position detail for admins (replaced by structured fields). But non-admin view still falls through to the default empty case. Should show the structured fields read-only for non-admins.

## Next Steps

1. **Visual polish pass** — Glen wants to revisit the UI quality across all hiring views after functionality is complete.
2. **Salary backfill** — extract salary data from position descriptions into the `salary_range` column.
3. **UAT on all 4 specs** — Glen needs to test the full ATS flow end-to-end.
4. **E2E test coverage** — consider adding Playwright tests for the new hiring flows (stage editor, rejection modal, onboarding checklist, document preview).
