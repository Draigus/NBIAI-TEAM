# Handoff: Bug Fixes, CC Merge, and Live Issue Sprint

**Date:** 2026-05-13
**Branch:** `feature/command-centre` (also merged to `master` mid-session at 219d692)
**Session length:** Full day — bug fixes, UI iteration with Glen live, auth/permissions fixes, CC Phase 2 design

---

## What Was Done

### 1. Synced + Committed All Uncommitted Code
5 commits catching up staged changes from previous session. All verified: 396/396 unit tests, 47/47 e2e tests.

### 2. Bug Fixes (4 open bugs from tracker + critical scroll regression)
| Bug ID | Fix |
|--------|-----|
| 1cf2a501 | Bug detail panel: switched from display:none/flex to transform approach |
| 0b50308b | Lighthouse Filter: deleted stale "Lighthouse Studios" client (0 tasks, dupe of Lighthouse Games) |
| 551b8601 | +New Useability: added hierarchical parent picker (Client > Project > Feature > Story) |
| 39ef99de | Scoped Timeline: hover parent rows for scope icon, click to isolate subtree |
| (no ID) | CRITICAL: restored `fixScrollHeights()` accidentally deleted in CC v2 rewrite |

### 3. E2E Test Cleanup
- Deleted untracked scroll.spec.js and cc-scroll-debug.js
- Rewrote playwright.global-setup.js: migrate + truncate instead of full schema reset
- Fixed timeouts in 5 spec files
- Result: 47/47 passing

### 4. Branch Merge
Fast-forward merged `feature/command-centre` → `master` (57 commits). Tests verified green before merge.

### 5. CC Phase 2 Design Spec
Wrote `docs/superpowers/specs/2026-05-13-command-centre-phase2-design.md` — "Dreaming Engine" nightly cron with 7 analysis functions. Glen needs to review before implementation starts.

### 6. UI Iteration (Glen Live Feedback)
- Quick-add bar: moved into filter bar, added type selector, compacted to single row with Show buttons and filter pills
- Bug tracker kanban: cards wrap side-by-side in wider lanes
- Capacity proration: hours now prorated by task overlap with each week
- Near Completion: shows features instead of projects, with client name
- CC header: compacted to single horizontal row

### 7. Auth/Permissions Fixes (Critical — Affected Live Users)

**User role corrections:**
- Ruan, Stavros, Amir: changed from `admin` to `member` (they're employees, not admins)
- James, Justin: restored `client_id` (they're Lighthouse Games clients)
- Lorenza: untouched (Couch Heroes client)
- All other NBI staff: cleared `client_id` that was incorrectly set

**Page permissions (DB settings.page_permissions):**
```json
{ "leads": "admin", "expenses": "all", "finances": "admin", "commandcentre": ["glen"] }
```

**403 toast fix:** `authFetch()` now suppresses 403 toasts on GET requests — client users no longer see red error popups on page load.

**Infinite retry loop fix:** `loadDashboardSnapshots`, `loadLeadsConfig`, `loadLeads` all had a bug where null sentinel values weren't cleared on failure, causing infinite request loops that hammered the server and triggered rate limiting. Fixed by setting fallback empty values after all retry attempts exhaust.

**New lead creation fix:** POST /api/clients requires `practice_area` since migration D84. The inline client creation from the new lead form now sends `practice_area: 'gaming'` and checks for existing client names before POSTing (avoids UNIQUE constraint error). Also added `withButtonLoading` catch handler so errors are surfaced instead of silently swallowed.

### 8. Scroll Fixes (Ongoing — NOT FULLY RESOLVED)

**The scroll problem is systemic.** `fixScrollHeights()` sets explicit pixel heights on `#mainContent` and `#sidebarNav` using `getBoundingClientRect()`. This works for the top-level containers but inner panels (inline detail, slide-in panels) need the same treatment.

**Latest fix (ec72258):** Extended `fixScrollHeights()` to also set explicit heights on `.tasks-layout`, `.tasks-layout__main`, and `.tasks-layout__detail`. Also cleaned up all the `!important` CSS hacks that were papering over the root cause.

**Status:** Glen needs to verify this works. If the inline detail panel STILL doesn't scroll after hard refresh, the next step is to:
1. Check if `fixScrollHeights()` is actually running (add a console.log)
2. Inspect the computed styles in DevTools to see what's overriding
3. Consider restructuring so `#mainContent` uses `overflow: hidden` and inner panels handle their own scroll

### 9. Other Fixes
- Date picker dark theme: `color-scheme: dark` scoped to date/time inputs only (global broke scrollbar rendering)
- Description field: removed from `isTaskIncomplete()` — now advisory, not blocking
- Lead delete button: added to detail panel header (admin only)
- Modal overlay: forced `position:fixed !important` and `z-index:9999` on `.modal-overlay` class — all 14 modals now float correctly
- Gantt scope + search: scoped item's parentId nulled for root rendering; search injects missing ancestors for complete tree
- Cron snapshot: restored `due_date::date` cast in dashboard snapshot query

---

## Server State

- PM2 `nbi-dashboard` running on :8888
- PM2 `nbi-dashboard-staging` on :8887
- Cloudflare tunnel running
- All cron jobs registered
- 396 unit tests passing (as of pre-merge verification)
- 47 e2e tests passing (as of pre-merge verification)

---

## Current User Roles (CRITICAL — DO NOT CHANGE WITHOUT GLEN)

**NBI Admins (role: admin):** Glen Pryer, Tom Rieger, Magnus Pryer, Devin Rieger
**NBI Employees (role: member):** Ruan, Stavros, Amir Didar, Steve, Patrice, Jandur, boop
**Clients:** James + Justin (Lighthouse Games), Lorenza (Couch Heroes)

**Access rules:**
- Leads + Finances: admin only
- Expenses: all NBI staff
- Command Centre: Glen only
- Clients see only their scoped data, no Leads/Finances/Expenses/CC

---

## Pending UAT

1. **Inline detail panel scroll** — latest fix (ec72258) needs Glen verification
2. **CC Phase 2 design spec** — Glen to review `docs/superpowers/specs/2026-05-13-command-centre-phase2-design.md`
3. **All previous please_review bugs** (74 items) — still awaiting Glen UAT from prior sessions
4. **New commits on feature/command-centre** need merging to master (feature/command-centre is now ahead of master again)

---

## Open Bugs (not yet fixed)

| Bug | Notes |
|-----|-------|
| Scroll on inline detail panel | May be fixed by ec72258, needs verification |
| Data not saving for employees | Was caused by incorrect client_id on user records — cleared. Needs confirmation from Stavros/Ruan |

---

## Files Changed This Session (significant)

| File | Changes |
|------|---------|
| `nbi_project_dashboard.html` | ~30 commits: scroll fixes, UI compaction, auth gating, gantt scope/search, bug tracker kanban, capacity proration, near completion features, lead creation, modal overlay, date picker, delete button |
| `dashboard-server/cron/index.js` | due_date::date cast fix |
| `dashboard-server/tests/e2e/*` | 6 files: cleanup + timeout fixes |
| `docs/superpowers/specs/2026-05-13-command-centre-phase2-design.md` | CC Phase 2 design spec |
| `projects/nbi_dashboard/live_state/pending_tasks.md` | Updated to current state |
| `projects/nbi_dashboard/session_logs/2026-05-13_session.md` | Session log |
