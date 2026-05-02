# Import Wizard — CSV Hierarchy Support Implementation Plan

**Goal:** Fix the dashboard's UI Import button so the LH Backlog Builder CSV (and any future hierarchy CSV with `_temp_id` / `_temp_parent_id` / `item_type` columns) loads with the full Project > Feature > Story > Task tree intact, correct client tag, dates, hours, assignees, and success factors. Closes bug `df1fb00b` (Backlog Importation Failure).

**Architecture:** Three-layer change. (1) Server: add a new format detector branch `nbi-hierarchy-csv` and a matching mapper that preserves all 17 columns. Extend `POST /api/tasks/bulk` to accept the new fields, resolve client name to UUID, and inherit client_id from `_temp_parent_id` when omitted on children. (2) Frontend wizard: branch `executeDownloadsImport` so hierarchy-format files POST direct to `/api/tasks/bulk` with `_temp_id` linking, bypassing the legacy title-based parent resolver that collides on duplicate feature titles. (3) Preview UI: surface item-type counts and data-quality warnings (duplicate titles, orphan parents, "confirMedium" corruption) so the user sees what they're about to load.

**Tech Stack:** Node.js + Express, PostgreSQL via `pg`, Vitest + Supertest for unit/integration tests, Playwright for e2e, vanilla JS frontend.

---

## File Structure

- **Modify** `dashboard-server/server.js` — `detectImportFormat` (line 2114), `mapRowsToTasks` (line 2344), `POST /api/tasks/bulk` (line 4656). Add module exports for the two helper functions so they can be unit-tested directly.
- **Modify** `nbi_project_dashboard.html` — `executeDownloadsImport` (line 17545) branch on `data.format === 'nbi-hierarchy-csv'` to call `/api/tasks/bulk` directly. `renderDownloadsPreview` (line 17472) to show hierarchy stats + DQ warnings.
- **Create** `dashboard-server/tests/unit/import-hierarchy.test.mjs` — already written. Covers detector, mapper, and bulk endpoint integration.

## Self-imposed scope limits

- **Out of scope:** Auto-mapping assignee text names ("Marie", "Ruan", "Stavros", "Amir") to user UUIDs. The `assignees` column is `text[]` so the names persist as-is; manual reconciliation comes after.
- **Out of scope:** Wiping the existing 253 mis-imported Couch Heroes rows. That's Glen's call after this fix is verified.
- **Out of scope:** Migrating other formats (planner, ms-project, ch-artifacts) to use the bulk endpoint. They keep their existing path.
- **Backwards compatibility:** existing `nbi-csv` flow must remain unchanged. Regression test included.

---

## Task 1: Server — Format Detector

**Files:**
- Modify: `dashboard-server/server.js:2114-2135`
- Test: `dashboard-server/tests/unit/import-hierarchy.test.mjs` (already written)

- [x] Tests already written — section "detectImportFormat (hierarchy CSV)"
- [x] Verified RED: `npx vitest run tests/unit/import-hierarchy.test.mjs` shows 22/23 fail
- [ ] Add detector branch returning `nbi-hierarchy-csv` when `_temp_id` AND `_temp_parent_id` AND `item_type` are all in the headers
- [ ] Place the new branch FIRST in the cascade (more specific than `nbi-csv` which only checks `task`/`status`/`priority`)
- [ ] Re-run vitest — detector tests should pass; mapper and bulk tests still red

## Task 2: Server — Mapper Branch

**Files:**
- Modify: `dashboard-server/server.js:2344-2528`

- [ ] Add a new `case 'nbi-hierarchy-csv'` block to the switch in `mapRowsToTasks`
- [ ] Read every column the CSV provides: `_temp_id`, `_temp_parent_id`, `item_type`, `task` (→title), `description`, `status`, `priority`, `hours_estimated`, `assignees`, `client_id` (→client name), `practice_area`, `start_date`, `end_date`, `due_date`, `success_factor`, `collaborations`, `notes`
- [ ] Add a `parseDdMmYyyy` helper that converts `dd/mm/yyyy` → `yyyy-mm-dd` and leaves blanks blank and ISO strings unchanged
- [ ] Split `assignees` on `,` `;` and `/` (the CSV mostly uses single names, but be tolerant)
- [ ] Drop rows with empty `task` field (e.g. CSV typo at S2.1)
- [ ] Run vitest — mapper tests pass

## Task 3: Server — Bulk Endpoint Extensions

**Files:**
- Modify: `dashboard-server/server.js:4656-4705`

- [ ] Accept `client` (text, e.g. "Lighthouse Games") in addition to `client_id` (UUID); resolve via `SELECT id FROM clients WHERE name = $1`
- [ ] Return 400 with a helpful error referencing the unknown client name when resolution fails
- [ ] Persist `start_date`, `end_date`, `success_factor`, `practice_area`, `collaborations` on insert (the columns exist on the `tasks` table)
- [ ] Two-pass parent resolution: pass 1 inserts everything keyed by `_temp_id`, pass 2 sets `parent_id` AND propagates `client_id` from the parent down to any child where `client_id` is NULL after pass 1
- [ ] Run vitest — all 22 tests pass + existing 201 tests still green

## Task 4: Server — Module Exports

**Files:**
- Modify: `dashboard-server/server.js:9366-9384`

- [ ] Export `detectImportFormat` and `mapRowsToTasks` for direct unit testing
- [ ] Re-run vitest — confirm imports resolve

## Task 5: Frontend — Hierarchy Import Path

**Files:**
- Modify: `nbi_project_dashboard.html:17545-17640` (executeDownloadsImport)

- [ ] Branch on `_downloadsImportData.format === 'nbi-hierarchy-csv'`
- [ ] Build payload preserving `_temp_id`, `_temp_parent_id`, `item_type`, `start_date`, `end_date`, `due_date`, `success_factor`, `practice_area`, `collaborations`, `assignees`, `hours_estimated`, `priority`, `description`, `notes`
- [ ] POST to `/api/tasks/bulk` directly (skip the legacy local mutation + sync flow)
- [ ] On success: `await loadAllTasks()` to refresh in-memory state, render the kanban
- [ ] On failure: surface the error message (especially "client X not found")
- [ ] Apply the override fields: when "Assign to Client" dropdown has a value, override every task's client; when "Parent Project" dropdown has a value, set it as `_temp_parent_id` for all rows whose `_temp_parent_id` is empty (so the imported tree hangs under that parent)

## Task 6: Frontend — Preview UI Stats

**Files:**
- Modify: `nbi_project_dashboard.html:17472-17533` (renderDownloadsPreview)

- [ ] When `data.format === 'nbi-hierarchy-csv'`, render a compact stats block above the preview table: counts of project/feature/story/task rows, distinct client names, count of orphan rows (parent_id present but not in idMap)
- [ ] Render a warnings block listing duplicate feature/story titles (e.g. F2 and F3 both "Alpha Ready Dashboards"), empty-title rows, and any cell containing the corrupt strings `confirMedium` or `Criticalical`
- [ ] Don't block the import — these are informational

## Task 7: Verification

- [ ] `npm run test:all` (vitest + playwright) green
- [ ] Restart staging PM2 (`pm2 restart nbi-dashboard-staging`)
- [ ] Drop the LH Backlog Builder CSV through the wizard via Chrome MCP
- [ ] Confirm in DB: ~1 project + ~9 features + ~30 stories + ~250 tasks under Lighthouse client_id, with parent_id chains intact, assignees text populated, dates ISO, success factors present
- [ ] Screenshot the result in WorkSage
- [ ] Commit + push feature branch + report finished for Glen UAT
