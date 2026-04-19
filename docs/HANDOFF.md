# Handoff — 2026-04-19 Evening Session (Projects Tab Crash + Bug Fixes)

## What happened this session

Glen reported the **Projects tab wouldn't load**. Diagnosing it took a while because automated tests (Playwright, syntax checks, function-existence scans) all passed clean. The bug only manifested when the user had `taskSubView = 'board'` stored in localStorage, which none of the clean-session tests hit. Adding a visible `window.onerror` overlay to the page finally surfaced the error: `ReferenceError: BOARD_LANE_CAP is not defined`.

### Bugs found and fixed

| # | Bug | Root cause | Fix | File | Line |
|---|-----|-----------|-----|------|------|
| 1 | **Projects tab crash** (the blocker) | Constant defined as `BOARD_BOARD_LANE_CAP` (doubled "BOARD") but referenced as `BOARD_LANE_CAP` -- ReferenceError killed renderBoardView, which killed renderTaskView, which killed the entire view switch | Renamed definition to `BOARD_LANE_CAP` | nbi_project_dashboard.html | 2987 |
| 2 | **CSP blocks self-hosted fonts** | `font-src` directive only allowed `fonts.gstatic.com` but fonts were self-hosted in `/public/fonts/` since commit 4c736ac | Added `'self'` to `font-src` | dashboard-server/server.js | 557 |
| 3 | **Logout kills all event handlers** | `cleanupListeners()` on logout removed 10 document/window-level handlers (click delegation, keyboard shortcuts, drag-drop, popstate, resize, online/offline) that were never re-registered on login | Changed all persistent handlers from `addManagedListener` to plain `addEventListener` | nbi_project_dashboard.html | multiple |
| 4 | **removeRepeatDate** (from prior session QA) | `idx` arrives as string from `data-arg`, but `filter((_, i) => i !== idx)` does strict comparison -- `2 !== '2'` is always true, so no dates ever removed | Added `parseInt(idx, 10)` | nbi_project_dashboard.html | 8988 |
| 5 | **_actSetInlineDetail** (from prior session QA) | `_BOOL` map converts `'true'` to boolean `true` before function receives it, then function compared `true === 'true'` which is always false | Changed to `!!v` | nbi_project_dashboard.html | 2467 |

### Post-fix verification

- 272 `data-action` handler references checked -- all resolve to existing functions
- 38 ALL_CAPS constants checked -- all defined and correctly referenced, no typos remaining
- Playwright screenshot test confirms Projects tab renders correctly after logout/re-login cycle
- Page tested through both `localhost:8888` and `worksage.nbi-consulting.com` (Cloudflare tunnel) -- both clean

## Uncommitted changes

Two files with substantive changes (not yet committed):

### `nbi_project_dashboard.html` (102 insertions, 75 deletions)

- **Bug fixes 1, 3, 4, 5** listed above
- **Portfolio Dashboard v4 panel refinements** (carried over from prior session, not yet committed):
  - `renderPfTimeline`: rewritten to group by client, provide fallback dates for projects without start/end, sticky month header, scrollable panel body
  - `renderPfWorkTypes`: removed `_leadsConfig` dependency, filters zero-count entries, shows count beside each bar
  - CSS: `.pf__panels` grid gets fixed height (`min(780px, calc(100vh - 300px))`), panels get `min-height: 0` and `overflow-y: auto` for scroll, responsive breakpoints updated

### `dashboard-server/server.js` (1 line)

- **Bug fix 2**: `font-src 'self' fonts.gstatic.com` (was `font-src fonts.gstatic.com`)
- PM2 was restarted to pick up this change

## State of the codebase

- **Branch:** `master`
- **Last commit:** `6d716b9 fix(dashboard): donut leader-line geometry + sizing polish`
- **PM2:** running, pid 41080, restart 92
- **Tests:** 128 vitest + 47 Playwright were green as of the prior session QA (not re-run this session since changes were targeted fixes, not structural)
- **Temp files to clean up:** `projects_tab_test.png`, `projects_after_relogin.png`, `projects_tab_worksage.png` in repo root (Playwright debug screenshots, not committed)

## What to do next session

1. **Commit the uncommitted changes** -- suggest a single commit: `fix(dashboard): BOARD_LANE_CAP typo, CSP font-src, event handler persistence, portfolio panel polish`
2. **Run the full test suite** (`npm test` and `npm run test:all`) to confirm nothing regressed
3. **Manual UAT** -- click through all major views (Dashboard, Projects tree/board/gantt/calendar, People, Leads, Finances, Bugs, Settings). The board sub-view specifically was the one that was crashing.
4. **Consider adding a board-view Playwright test** -- the bug was only triggered with `taskSubView = 'board'` in localStorage, which no existing test covers

## Lessons learned

- **Clean-session Playwright tests miss localStorage-dependent bugs.** The board view crash only happened when `nbi_task_subview` was set to `'board'` in localStorage. All automated tests used fresh sessions with the default tree view.
- **Injecting a visible error overlay** (`window.onerror` with a red banner) was the thing that actually found the bug. Worth keeping that pattern in the debugging toolkit.
- **`addManagedListener` + `cleanupListeners` is a footgun.** Any handler registered through the managed system gets destroyed on logout. The fix (plain `addEventListener` for persistent handlers) is correct but the `addManagedListener` function is now unused. It can be removed in a cleanup pass, or kept if session-scoped listeners are ever needed in future.

## Previous handoff context (audit sprint)

The prior session completed the WorkSage audit fix sprint: 78 items shipped, 11 closed as non-issues, 39 parked for Tier 4 architecture. Full details in the git history and prior session handoffs in `projects/nbi_dashboard/session_handoffs/`.
