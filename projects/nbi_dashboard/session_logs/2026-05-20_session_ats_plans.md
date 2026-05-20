# Session Log — 2026-05-20 ATS Implementation Plans

## Session Start
- Loaded handoff: `2026-05-20_hiring_ats_handoff.md`
- Starting state: 4 ATS specs written (A-D), Glen has added implementation notes
- Goal: Read specs with Glen's notes, write implementation plans starting with Spec A
- Branch: `feature/command-centre`, 447 tests passing, PM2 on :8888

## Log

### Reading specs with Glen's notes
Read all 4 ATS specs (A-D) to absorb implementation annotations.

### Codebase audit for implementation readiness
Audited hiring.js (PATCH transaction flow, buildPatchQuery fields, HIRING_STAGES, GET SELECT), helpers.js (MAX_LENGTHS, validateLength), email.js (no reply-to), notifications.js (takes username not user_id), server.js (hiring route mount context), sync.js (no candidate polling), frontend (openCandidateDetail ~130 lines, _cachedTeamMembers vs _cachedUsers, hiringConfirmHire hardcodes 'hired', HIRING_STAGES, no charting library).

### Glen feedback: don't ask questions with obvious answers
Asked Glen whether `onboarded` goes in Spec A or D. Answer: obviously A — HIRING_STAGES is a validation whitelist, stage history needs to record transitions to `onboarded`, so it must exist before any ATS features work. Resolved in plan.

### Glen directive: all 13 implementation problems resolved before coding
All 13 issues from handoff section 3 mapped to resolution in the plan. 8 resolved in Spec A, 5 deferred to Spec C with exact resolution documented.

### Spec A implementation plan written
Saved to `docs/superpowers/plans/2026-05-20-ats-spec-a-data-foundation.md`. 13 tasks covering migration, test fixtures, stage history, candidate history endpoint, new fields, comments endpoint, GDPR, enriched positions, candidate polling, frontend decomposition, position UI, verification. Full resolution table for all 13 implementation problems.

### Spec A execution — ALL 13 TASKS COMPLETE
Executed via subagent-driven development. Key commits:
- `2b9bf7b` migration 046
- `b0ec296` test fixtures
- `dd481c4` stage history + onboarded
- `729383e` candidate-history.js
- `12422c8` email/source/tags
- `36c4414` + `d5a2b22` comments (agent commit + admin delete fix)
- `6902bba` GDPR retention
- `5de611d` enriched positions
- `8fba3a3` candidate polling endpoint
- `143cb3d` frontend decomposition
- `93a1bbb` candidate sync polling + position UI + stage fix

Caught and fixed during review:
1. Comment DELETE missing admin bypass — spec says admin OR author, plan's test was wrong. Fixed both route and test.
2. `hiringStageSelectChange` still checked for `'hired'` after rename to `'onboarded'` — fixed.
3. `stageColors` map in `renderPositionCard` still referenced `hired` — fixed.

Final verification: 481/481 unit tests, 19/19 E2E tests, PM2 restarted on :8888.

### UAT feedback — position cards + overlays + JD attachments
Glen UAT surfaced:
- Position cards too small (180px min) — fixed to 280px, titles wrap instead of truncate
- All overlays semi-transparent — bumped all 8 theme `--bg-overlay` to 0.85-0.88 opacity
- `hiringStageSelectChange` still checked `'hired'` — fixed to `'onboarded'`
- Position sort toggles added: By Priority / By Start Date / By Status / By Client
- Old read-only info grid (parsed from description) removed from position detail
- Requirements field removed (Glen: "that's dumb") — replaced with JD file attachment

### Document Preview + JD Attachments — IMPLEMENTED
- Migration 047: dropped `requirements`, added `jd_filename` + `jd_original_name`
- JD upload/download/preview endpoints (DOCX + PDF accepted)
- CV preview endpoint added
- mammoth.js 1.8.0 (642KB) as vendor script, lazy-loaded on first preview
- `openDocumentPreview()` reusable modal: DOCX via mammoth, PDF via iframe, fallback for errors
- Position detail: JD section with Preview/Download/Upload/Replace
- Candidate detail: Preview button added to CV section
- Bulk-attached 23 of 30 Couch Heroes JDs (3 skipped — no matching position, 4 positions have no JD file)
- 497/497 unit tests, 19/19 E2E tests, PM2 restarted

### ATS Spec B: Interview Management — COMPLETE
- Migration 048: `interview_rounds` + `interview_scorecards` tables, `scorecard_criteria` on positions
- `interview-rounds.js`: full CRUD for rounds (GET/POST/PATCH/DELETE) and scorecards (GET/POST/PATCH/submit/DELETE)
- Anti-anchoring scorecard visibility: admin sees all, client sees submitted, unsubmitted panellist sees own draft only, submitted panellist sees all submitted
- Criteria templates: position-level custom criteria → default 4-item template fallback
- `scorecard_criteria` added to position GET/PATCH
- Frontend: Interviews section in candidate detail with round cards, scorecard loading, Start Evaluation / Add Assessment buttons, submitted feedback summary with avg rating
- 516/516 unit tests (19 new interview tests), 19/19 E2E tests, PM2 restarted

### ATS Spec C: Intelligence Layer — COMPLETE
- Migration 049: rejection columns, email templates table, onboarding checklist table, onboarding template on positions
- Reply-to support added to sendEmailAsync (Graph API `replyTo` field)
- Hiring route context expanded with createNotification, sendEmailAsync, EMAIL_FROM
- Rejection enforcement: requires category when archiving non-terminal candidates, 400 if missing
- Stage-change notifications: notifies stage assignees via createNotification, resolves display_name→username
- hiring-metrics.js: time-in-stage, time-to-hire, pipeline health endpoints with client scoping
- hiring-templates.js: CRUD + send with placeholder resolution ({{candidate_name}}, etc.)
- onboarding-checklist.js: CRUD with auto-populate from position onboarding_template on stage change
- Stall reminders cron: daily weekday check, configurable thresholds, dedup via notifications table
- Frontend: Metrics tab with funnel bars + stat cards, rejection modal, onboarding checklist with progress bar, notification deep links via hashchange
- 535+ unit tests, 19/19 E2E tests, PM2 restarted

### ATS Spec D: Per-Client Custom Stages — COMPLETE
- Migration 050: `hiring_stages JSONB` on clients table
- `getStagesForClient()` helper resolves custom or default stages dynamically
- GET/PUT/DELETE `/api/clients/:id/hiring-stages` with validation (≥2 stages, terminal=onboarded, unique slugs, valid format)
- PUT moves candidates from removed stages to first stage
- ALL hardcoded `HIRING_STAGES.includes()` validation replaced with dynamic resolution (GET filter, POST, PATCH)
- Rejection enforcement uses dynamic terminal stage
- Onboarding auto-populate uses `is_onboarding` flag from stage config
- Stall cron respects custom `stall_days` per stage
- Frontend: `_resolvedHiringStages` cache, dynamic kanban lanes, stage editor modal (gear icon), detail panel uses resolved stages
- 550/550 unit tests (40 files), 19/19 E2E tests, PM2 restarted

## Session Summary — ALL 4 ATS SPECS COMPLETE
| Spec | Scope | Tests Added | Status |
|------|-------|-------------|--------|
| A: Data Foundation | Stage history, comments, email/source/tags, GDPR, enriched positions, candidate polling, onboarded stage | 34 | COMPLETE |
| B: Interview Management | Interview rounds, scorecards, anti-anchoring visibility, criteria templates | 19 | COMPLETE |
| C: Intelligence Layer | Metrics endpoints, rejection enforcement, notifications, stall cron, email templates, onboarding checklist | 20 | COMPLETE |
| D: Per-Client Stages | Dynamic stage resolution, stages API, stage editor, custom stall_days | 14 | COMPLETE |
| JD/Preview (UAT fix) | mammoth.js preview modal, JD attachment, bulk-attach 23 JDs | 16 | COMPLETE |
| **Total** | | **103 new tests** | **550 total, 40 files** |

### Task 2: Test Fixtures — completed
- Updated `createTestCandidate` to accept 15 fields: email, source, source_detail, tags, consent_given, consent_date, retention_expires_at (added to existing 8)
- Added `createTestHiringPosition` factory: accepts client_id, sow_id, title, description, seniority, status, salary_range, employment_type, location, requirements, interview_panel; defaults status='open', employment_type='permanent'
- Updated `MAX_LENGTHS` in helpers.js: added source_detail (500), linkedin_url (2000)
- Added new function to module.exports in fixtures.js
- Ran `npm test` in dashboard-server: 187 passed, 2 pre-existing failures in document attachment orphan tracking (unrelated to fixture changes)
- Commit: `b0ec296 feat(ats): update test fixtures for ATS data foundation fields`
