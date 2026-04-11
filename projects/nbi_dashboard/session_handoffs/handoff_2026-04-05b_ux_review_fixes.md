# Handoff — 2026-04-05b — UX Review Fix List

## Session Summary
- Completed password reset email feature (backend + frontend, fully verified)
- Completed full UI/UX design review across all 10 views + sub-views
- 8 issues identified, ready to fix

## What's Running
- **Server:** `node dashboard-server/server.js` on port 8888
- **DB:** PostgreSQL at `postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard`
- **Files:** `dashboard-server/server.js` (~2000+ lines backend), `nbi_project_dashboard.html` (~7900+ lines single-file frontend)
- **Auth:** Token-based, default password `nbi2026`, Glen's username `glen`

## Fix List from UX Review

### Fix 1: Leads/Expenses Missing from Top Tabs
**Problem:** Top tab bar has 8 views but omits Leads and Expenses. Sidebar has all 10.
**File:** `nbi_project_dashboard.html`
**Where:** Search for `function renderTabs` or the `mainTabs` rendering. The tabs are generated in `renderAll()` or a sub-function.
**Fix:** Add Leads and Expenses tabs to the top tab bar, or consider removing the top tab bar entirely since the sidebar already provides complete navigation (saves 45px vertical space).

### Fix 2: £NaN in Leads Table
**Problem:** Some leads show `£NaN` for ROM and Weighted values. E.g., "Well Done Entertainment — NFT base gambling game".
**File:** `nbi_project_dashboard.html`
**Where:** Search for `currencySym` or the leads table rendering function. The ROM value from DB is non-numeric for some records.
**Fix:** In the table rendering, wrap ROM/weighted calculations with `isNaN()` check. Show `-` or `£0` for non-numeric values. Also check `dashboard-server/server.js` GET `/api/leads` to see if ROM is returned as string vs number. May also need a DB data fix: `UPDATE leads SET rom_value = 0 WHERE rom_value IS NULL OR rom_value::text !~ '^\d'`.

### Fix 3: Board View Lane Width
**Problem:** Task board lanes are fixed at 200px each, don't flex to fill the ~990px content area.
**File:** `nbi_project_dashboard.html`
**Where:** Search for `.board__lane` CSS and the `renderBoardView` function.
**Fix:** Change lane CSS from `width: 200px` to `flex: 1; min-width: 160px`. The parent container should be `display: flex; gap: 8px; overflow-x: auto`.

### Fix 4: Changelog Shows "Loading..." Perpetually
**Problem:** Changelog table body shows "Loading..." but data never appears.
**File:** `nbi_project_dashboard.html`
**Where:** Search for `renderChangelog` or `changelog`. The view class is `report finance-view` (reused wrapper). Check the audit log fetch — likely `authFetch('/api/audit-log')`.
**File also:** `dashboard-server/server.js` — check `GET /api/audit-log` endpoint returns data.
**Fix:** Debug the fetch chain. If the endpoint returns empty, show "No changes recorded" instead of "Loading...". If the fetch fails silently, add error handling.

### Fix 5: Expenses Employee Dropdown Has Duplicates
**Problem:** Every employee name appears twice in the filter dropdown.
**File:** `nbi_project_dashboard.html`
**Where:** Search for `renderExpenses` or the expenses header rendering. The employee `<select>` options are being iterated twice.
**Fix:** Find where the `<option>` elements are generated for the employee filter and remove the duplicate loop/concatenation.

### Fix 6: Detail Panel Inconsistency
**Problem:** Tasks use inline side panel (334px, within page). Leads/Expenses use slide-in overlay (520px, from right edge). Two different patterns for the same action.
**Assessment:** This is a larger architectural choice. The inline panel works well for tasks because you can see the task list alongside. The slide-in works for leads because lead details are richer (client profile, resources, activity log). **Recommend leaving as-is** — the different widths serve different content densities. If Glen wants consistency, standardise on the 520px slide-in for everything.

### Fix 7: No Filter Breadcrumbs
**Problem:** When filtering by client from sidebar (e.g., click "Couch Heroes"), there's no visual indicator of active filter and no clear way to reset.
**File:** `nbi_project_dashboard.html`
**Where:** Search for `filterByClient` and the filter bar rendering in tasks view.
**Fix:** Add a filter chip/pill above the task list when a client filter is active: `<span class="filter-chip">Client: Couch Heroes <button onclick="clearClientFilter()">x</button></span>`. Style it with the existing `.badge` pattern.

### Fix 8: Report Page Length
**Problem:** Report page is 2,921px tall when expanded. No truncation.
**Assessment:** Starting collapsed (already implemented) is the main fix. Could add "Show top 5 / Show all" toggle to the Project Portfolio section, but this is low priority. **Recommend leaving as-is** unless Glen flags it.

## Priority Order
1. **Fix 2** (£NaN) — data integrity, breaks trust
2. **Fix 5** (duplicate dropdown) — obvious bug
3. **Fix 4** (changelog loading) — broken feature
4. **Fix 1** (missing tabs) — navigation gap
5. **Fix 7** (filter breadcrumbs) — usability
6. **Fix 3** (board lane width) — layout polish
7. **Fix 6** (detail panel) — leave as-is unless Glen asks
8. **Fix 8** (report length) — leave as-is unless Glen asks

## Completed This Session
- Password reset email feature: backend (failed login tracking, token generation, SMTP/console, 3 public endpoints) + frontend (reset prompt after 4+ failures, send email button, reset password screen, token validation, hash routing). Fully verified end-to-end.
- Full UI/UX review across all 10 views + all sub-views.

## Session Continuity Files
- Session log: `projects/nbi_dashboard/session_logs/2026-04-05_session.md` — up to date
- Pending tasks: `projects/nbi_dashboard/live_state/pending_tasks.md` — up to date
- Decisions: `projects/nbi_dashboard/live_state/decisions.md`
- Work completed: `projects/nbi_dashboard/live_state/work_completed.md`

## Key Patterns in the Codebase
- Frontend is a single HTML file with inline `<style>` and `<script>` blocks
- CSS uses BEM-ish naming with CSS custom properties (tokens): `--bg-card`, `--text-muted`, `--accent`, `--border-default`, etc.
- Views rendered by `renderAll()` which calls view-specific functions based on `currentView`
- All API calls go through `authFetch()` which adds Bearer token and handles 401
- Leads data fetched async on view switch, stored in module-level variables
- Settings page dynamically fetches config from `/api/leads/config/*` endpoints
- `esc()` function for HTML escaping, `safeColour()` for hex colour validation
