# Handoff — 2026-05-14 Bug Sprint & Lead Filtering

## Branch & Server State

- **Branch:** `feature/command-centre` (uncommitted changes on top of 8bc59db)
- **PM2:** `nbi-dashboard` running on `:8888` (restart #43), `nbi-dashboard-staging` on `:8887`
- **Tests:** 396/396 unit green, 18/19 e2e green (1 pre-existing mobile screenshot timeout in `mobile-screenshots.spec.js`)
- **Uncommitted files:** `nbi_project_dashboard.html`, `dashboard-server/routes/clients.js`, `dashboard-server/routes/sows.js` — all deployed live but not yet committed

## What Was Done This Session

### 1. Alert Panel in Command Theme — RESOLVED
The alert panel wasn't visible in the command theme. The CSS override at line 219 (`#warnAlertPanel { position: fixed; z-index: 10001 }`) was already correct. The inline fallback toggle function used `cssText` which left orphaned `display:none` inline styles. Replaced with classList approach matching the main function. Playwright verified open/close/reopen cycle.

### 2. Non-Won Leads Filtered from Client Dropdowns — DONE
**Server (`routes/clients.js`):** `/api/clients` now returns `has_active_work` boolean per client. True when client has tasks OR a lead in a "Won" (`is_won = true`) stage.

**Frontend (`nbi_project_dashboard.html`):** Filtered in 6 locations:
- `getAllClients()` and `getContractedClients()` — filter `_apiClientsCache` by `has_active_work`
- `renderManageClients()` — filters API response before rendering
- Client summary / portfolio view (line 5900)
- Gantt milestone loading (line 8247)
- Documentation client dropdown (line 12879)
- Milestone preloading (line 3390)

**Intentionally unfiltered:** Leads page, Finances page, admin Settings (user portal scope dropdowns).

**Result:** 7 active clients shown, 6 lead-only/orphan clients hidden from task-related UI.

### 3. Client Practice Areas & Sectors — CORRECTED
Glen's correction: sectors should be practice-level (Gaming / Org Health), not 13 individual industries.

**Sector options in `lead_field_options`:** Gaming, Org Health, Technology, Entertainment

**Client assignments updated in DB:**
- **Gaming:** Couch Heroes, Enoma Capital, Goals Studio, Lighthouse Games, NBI Operations, Playsage, Sarge Universe
- **Org Health (`organisational_performance`):** Anser, HHS, Morgan Stanley, Prince George County, Social Security Admin, The Insight Collective

### 4. Bug Sprint — 5 Bugs Fixed

| Bug ID | Title | Fix | Status |
|--------|-------|-----|--------|
| 0cf3e54a | No Sectors for Org Perf | Added Org Health sector; corrected practice_area on 6 clients | `please_review` |
| 443be122 | Filtering to myself shows others | Investigated — filter works, ancestor rows show for hierarchy context. Needs Glen's specific repro if still wrong | `please_review` |
| cfba16bf | Parent Blocked → Children Blocked | Frontend now cascades Blocked to children instantly (was 10s sync delay) | `please_review` |
| a4cf7cae | Still Cannot Upload SoW | Added .txt file support alongside PDF. Better error when PDF fails | `please_review` |
| fc68f488 | Duplicate Tasks | Duplicate button in both detail panels. Copies all fields, resets status | `please_review` |

### 5. Gantt Stack Overflow — FIXED
`depChainDepth()` at line 8342 had no cycle detection. Two tasks (ce0825f7 ↔ 3d9f2fb5) had a circular dependency causing infinite recursion. Added `_depVisiting` set to detect cycles and return depth 0.

### 6. Bug 8 (Sort Order) — VERIFIED COMPLETE
Migration 045, server PATCH, sync, tree view sorting, and DnD reorder all in place. Added missing bug comment.

## Files Changed (Uncommitted)

| File | Changes |
|------|---------|
| `nbi_project_dashboard.html` | Lead filtering (6 locations), alert panel cleanup, Blocked cascade in `updateTask()` + `saveMarkAsBlocked()`, `duplicateTask()` function + buttons, cycle detection in `depChainDepth()`, SoW .txt accept, docs dropdown filter |
| `dashboard-server/routes/clients.js` | `has_active_work` computed boolean in GET `/api/clients` |
| `dashboard-server/routes/sows.js` | Accept .txt files, text filter pipeline, better PDF error messages |

## Database Changes (Already Applied to Production)

- `lead_field_options`: Sectors are now Gaming, Org Health, Technology, Entertainment (was Gaming, Technology, Entertainment)
- `clients`: 6 clients updated from `practice_area = 'gaming'` to `'organisational_performance'`, sector set to 'Org Health'
- Bug comments added to: 421bd26e, 0cf3e54a, 443be122, cfba16bf, a4cf7cae, fc68f488

## Awaiting Glen UAT

### From This Session
- Lead filtering — check client dropdowns, Manage Clients, portfolio view. Lead-only clients should be gone.
- Sector tabs on Leads page — should show Gaming / Org Health / Technology / Entertainment
- Blocked cascade — block a parent item, confirm children go Blocked instantly
- Duplicate button — open any task detail panel, click Duplicate
- SoW upload — try uploading a .txt file
- Gantt prerequisite view with Lighthouse Games → Phase 2 Telemetery QA (was crashing)

### From Previous Sessions (Still Awaiting)
- Command Centre v2 (zone layout, tabs, keyboard shortcuts)
- 14 older bugs at `please_review` (see pending_tasks.md for full list)
- Connected Statuses (parent Done/Cancelled cascades)
- Prerequisites Blocked (dependant auto-block)
- Scroll Preservation
- Portfolio Chart Redesign
- Client Portal features
- News Aggregator M4
- Email Reports (first live test was morning cron runs)

## Open Bugs Remaining
| Bug ID | Title | Notes |
|--------|-------|-------|
| 443be122 | Filtering to myself shows others | Needs Glen's specific repro steps — the filter logic is correct |

All other open bugs were fixed this session.

## Key Context for Next Session
- The `has_active_work` flag is computed on every `/api/clients` call (no caching issue). When a lead reaches "Won" stage, the client automatically appears in all dropdowns.
- The circular dependency between tasks ce0825f7 ↔ 3d9f2fb5 still exists in the data — the code now handles it gracefully but the data should be cleaned up if Glen identifies which dependency is wrong.
- The Manage Clients view is a sub-view of the Leads page (`_leadsSubView === 'manage'`). It calls `/api/clients` directly and caches ALL clients, then filters the display list by `has_active_work`.
- SoW upload still only handles PDF and .txt. Glen's actual files are .doc/.docx — he'll need to export to text first. Adding native DOCX support would require a new dependency (e.g., mammoth.js).
