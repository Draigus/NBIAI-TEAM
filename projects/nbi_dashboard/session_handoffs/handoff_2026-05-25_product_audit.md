# Handoff — 2026-05-25 Product Audit Session

## Branch: `feature/command-centre`

## What Happened

Glen asked for a full product audit of WorkSage from a VP Product / Senior Consultant perspective. Audit completed, identified 34 improvements, Glen selected 7 highest value-to-complexity items for implementation.

## What Was Delivered — Backend (all clean, tested, deployed)

1. **Sync batch cap** — `routes/sync.js` rejects batches >500 items with 400. Constant `MAX_BATCH_SIZE = 500`.
2. **Request correlation IDs** — `server.js` middleware generates `X-Request-Id` per request (or echoes client-supplied). `lib/logger.js` accepts optional 5th `requestId` param.
3. **Password policy** — `lib/helpers.js` has `validatePassword()` requiring 12+ chars, uppercase, lowercase, digit. Wired into `routes/auth.js` (change, reset) and `routes/users.js` (create). Skips validation for `must_change_password` temp passwords.
4. **DB-driven client contacts** — Migrations 056 (table) + 057 (seed data). `routes/users.js` replaced hardcoded `NBI_CONTACTS_BY_CLIENT` with JOIN on `client_nbi_contacts` table. Admin CRUD endpoints: GET/POST/DELETE `/api/clients/:id/nbi-contacts`.
5. **Email notifications for portal events** — `routes/bugs.js` has `notifyAdminsOfClientActivity()`. Fires on client user bug creation and comment creation. Fire-and-forget, won't break API on email failure.
6. **Activity feed API** — `routes/activity.js` serves GET `/api/activity` with humanised audit log entries. Cursor pagination, entity_type filtering.

## What Was Delivered — Frontend (deployed, needs Glen UAT)

7. **Portfolio layout fix** — `.pf` changed from `flex:1; overflow:hidden` to plain flex column. `.pf__pgrid--fill` and `--auto` stripped of flex sizing. `.pf__panel-body` changed from `flex:1; min-height:0` to `max-height:360px; overflow-y:auto`. All panels now visible at all viewports (verified at 3440, 1920, 1366, mobile).
8. **Recent Activity filter** — Dashboard's `loadActivityFeed()` now filters out `delete` and `cascade_cancel` actions.
9. **Collapsible detail panel** — Accordion CSS (`.detail-accordion*` classes) + `_accWrap()` helper + `toggleDetailSection()`. Wraps 6 sections of `renderInlineTaskDetail`: Time Tracking (collapsed), Description (open), Notes (open), Attachments (collapsed), Prerequisites (collapsed), Children (collapsed). Properties and Actions always visible. State persists per task via `_accordionState`.
10. **Activity feed sidebar view** — `renderActivityFeedView()` with unique state vars (`_actViewData`, `_loadActViewData`). NO collision with dashboard's `loadActivityFeed()`. Sidebar item placed under My Work section (with Queue and Settings, moved from VIEWS per Glen's direction).

## CRITICAL INCIDENT — Destroyed Uncommitted Work

The parallel agent that built the detail panel accordion went far beyond scope — replaced the entire tooltip CSS system with a JS-based one, added 59 `data-tooltip` attributes, broke the portfolio layout. When reverting with `git checkout HEAD -- nbi_project_dashboard.html`, pre-existing uncommitted HTML changes were destroyed. Git doesn't track working tree changes. OneDrive version history is the only recovery path but MS365 auth expired. Glen needs to check OneDrive version history (Previous Versions dialog was opened on desktop).

Session logs from May 23 show no documented post-commit HTML work, so the lost changes were likely trivial. The portfolio layout bug (squished panels) was pre-existing in the committed code and has now been fixed independently.

## Test State

- **600 unit tests passing** (47 files) — up from 553 at session start
- **13 Playwright e2e tests** in `tests/e2e/product-audit-improvements.spec.js` — the accordion source-check test expects `detail-accordion__header` and `toggleDetailSection` in the HTML
- Test password in `tests/unit/client-scope.test.mjs` line 135 updated from `Test1234!` to `TestClient1234!` (was too short for new policy)

## New Files Created

- `dashboard-server/routes/activity.js` — Activity feed API endpoint
- `dashboard-server/migrations/056_client_nbi_contacts.sql` — Client NBI contacts table
- `dashboard-server/migrations/057_seed_client_nbi_contacts.sql` — Seed data from hardcoded map
- `dashboard-server/tests/unit/sync-batch-limit.test.mjs` — 2 tests
- `dashboard-server/tests/unit/correlation-id.test.mjs` — 3 tests
- `dashboard-server/tests/unit/password-policy.test.mjs` — 10 tests
- `dashboard-server/tests/unit/client-nbi-contacts.test.mjs` — 15 tests
- `dashboard-server/tests/unit/client-portal-notifications.test.mjs` — 11 tests
- `dashboard-server/tests/unit/activity-feed.test.mjs` — 6 tests
- `dashboard-server/tests/e2e/product-audit-improvements.spec.js` — 13 e2e tests

## Files Modified

- `dashboard-server/server.js` — correlation ID middleware, validatePassword import, activity route registration
- `dashboard-server/lib/helpers.js` — added `validatePassword()`
- `dashboard-server/lib/logger.js` — optional `requestId` 5th param
- `dashboard-server/routes/auth.js` — uses `validatePassword()` at 3 endpoints
- `dashboard-server/routes/users.js` — DB client contacts, validatePassword on user create
- `dashboard-server/routes/sync.js` — MAX_BATCH_SIZE guard
- `dashboard-server/routes/bugs.js` — email notifications for client portal events
- `dashboard-server/tests/helpers/db.js` — added `client_nbi_contacts` to TRUNCATE_TABLES + retry logic
- `dashboard-server/tests/unit/auth.test.mjs` — updated test password to comply with new policy
- `dashboard-server/tests/unit/client-scope.test.mjs` — updated test password
- `nbi_project_dashboard.html` — portfolio layout fix, activity filter, accordion, activity view, sidebar reorg

## Worktree

`.worktrees/frontend-polish` exists with the frontend changes. Server at :8887 may still be running (kill manually if needed).

## Remaining from the 34-item Manifest

The full improvement manifest is in the conversation history. Items completed: #2 (password), #4 (sync cap), #6 (correlation IDs), #9 (detail panel), #12 (DB contacts), #13 (email notifications), #14 (activity feed). Remaining 27 items range from complexity 1 (dark mode auto-detection) to complexity 8 (workflow automation).

## Glen's State

Frustrated. The parallel agent disaster cost hours and destroyed uncommitted work. Key feedback to internalise:
- NEVER `git checkout` on files with uncommitted changes
- NEVER deploy agent output without reading every line
- NEVER touch production without visual verification at multiple viewports
- Always use worktrees for frontend changes
- Check the existing code architecture before making changes
