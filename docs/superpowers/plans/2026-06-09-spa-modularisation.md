# SPA Modularisation Implementation Plan (v2 -- Codex-reviewed)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the 30,626-line monolithic nbi_project_dashboard.html into separate CSS and JS files, reducing the HTML file to ~350 lines of shell markup and script tags.

**Architecture:** No build toolchain. No IIFEs. No namespace wrapping. Extract code into separate `.js` files served from `/public/` via traditional `<script>` tags. Top-level `var`/`let`/`function` declarations in non-module scripts are already global scope -- this means we get file separation with ZERO refactoring of function calls, onclick handlers, or global variable references. Encapsulation can be added in a future phase once files are stable.

**Why no IIFEs:** The SPA has ~483 inline `onclick="functionName()"` handlers in template-literal HTML. Wrapping extracted code in IIFEs hides those functions from global scope, silently breaking every click handler. Avoiding this is the single most important architectural decision in this plan.

**Tech Stack:** Vanilla JS (no framework), Express static serving via `/public/`, Vitest + Playwright for testing.

**Worktree:** `d:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\spa-modularise` on branch `feature/spa-modularise`. Server runs on port **8889** (staging port) so production on :8888 is untouched.

**Cache busting:** All extracted CSS/JS files use a version query string (`?v=1`) in their `<script>`/`<link>` tags. Bump on each deploy. This prevents the 7-day `express.static` cache from serving stale files after changes.

---

## Structural Map (verified against actual file)

| Section | Lines | Size |
|---|---|---|
| `<head>` + meta/links | 1-27 | 27 lines |
| Inline CSS (`<style>` block) | 28-3265 | 3,238 lines |
| Body HTML markup | 3267-3546 | 280 lines |
| Inline JS -- fallback script (Block 1) | 3547-3564 | 18 lines (stays inline) |
| Inline JS -- main application (Block 2) | 3566-30624 | 27,059 lines |
| Closing tags | 30625-30626 | 2 lines |

**Note:** There are TWO `<script>` blocks. Block 1 (18 lines) is a warn-alert-sidebar fallback that works even if main JS fails. It stays inline. Block 2 is the main application JS that gets extracted.

---

## Pre-Flight Setup

### Task 0: Worktree Environment Setup

**Files:**
- Modify: `.worktrees/spa-modularise/dashboard-server/.env` (port change)
- Verify: `.worktrees/spa-modularise/nbi_project_dashboard.html` (baseline)

- [ ] **Step 1: Install dependencies in worktree**

```bash
cd d:\OneDrive\Claude_code\NBIAI_TEAM\.worktrees\spa-modularise\dashboard-server
npm install
```

- [ ] **Step 2: Configure worktree server on port 8889**

Copy `.env` from the main repo if not present. Set PORT=8889. Ensure DATABASE_URL points to the same database (or a test database if preferred).

- [ ] **Step 3: Start the worktree server and verify**

```bash
node server.js
```

Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8889/` returns 200.

- [ ] **Step 4: Run baseline tests**

```bash
npm test
npm run test:e2e
```

Record the exact pass count as baseline. If any fail, document them as pre-existing -- do not fix them in this branch unless they are directly related to file loading.

- [ ] **Step 5: Commit baseline**

```bash
git add -A && git commit -m "chore: worktree baseline for spa-modularise"
```

---

## Phase 1: CSS Extraction (3,238 lines)

### Task 1: Extract all CSS to a single file

**Files:**
- Create: `dashboard-server/public/css/dashboard.css`
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Create CSS directory**

```bash
mkdir -p dashboard-server/public/css
```

- [ ] **Step 2: Extract the style block**

Copy lines 29-3264 (the CSS content between `<style>` and `</style>`, not the tags themselves) into `dashboard-server/public/css/dashboard.css`.

- [ ] **Step 3: Replace style block with link tag**

Replace the entire `<style>...</style>` block (lines 28-3265) with:

```html
<link href="/public/css/dashboard.css?v=1" rel="stylesheet">
```

Place after the fonts.css link.

- [ ] **Step 4: Verify file shrank**

Line count should be approximately 30,626 - 3,238 = ~27,388.

- [ ] **Step 5: Test**

```bash
npm test && npm run test:e2e
```

- [ ] **Step 6: Visual spot-check**

Load http://localhost:8889/ -- verify dashboard, kanban, gantt, command centre, mobile layout all render correctly.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/public/css/dashboard.css nbi_project_dashboard.html
git commit -m "refactor(frontend): extract inline CSS to dashboard.css (3,238 lines)"
```

### CHECKPOINT 1: Codex Review

---

## Phase 2: JS Infrastructure (extract foundational modules)

All scripts placed at the **end of `<body>`**, before `</body>`. NOT in `<head>`. This is critical -- the application JS references DOM elements that must exist before the scripts execute.

No IIFEs. No namespace wrapping. Just copy the code into a new file. Top-level declarations remain global.

### Task 2: Create JS directory and extract API/auth layer

**Files:**
- Create: `dashboard-server/public/js/nbi-api.js`
- Modify: `nbi_project_dashboard.html`

Extract `authFetch()`, `apiCall()`, `esc()`, auth state variables (`_currentUser`, `isClientUser`, `_pagePermissions`), and the login/logout functions. These are used by every other module.

- [ ] **Step 1: Create JS directory structure**

```bash
mkdir -p dashboard-server/public/js/views
mkdir -p dashboard-server/public/js/domains
```

- [ ] **Step 2: Identify the API/auth code boundaries**

Search for: `function authFetch`, `function apiCall`, `function esc(`, `let _currentUser`, `let isClientUser`, `function handleLogin`, `function handleLogout`. Note the line ranges.

- [ ] **Step 3: Extract to nbi-api.js**

Copy the identified code to `dashboard-server/public/js/nbi-api.js`. No IIFE wrapping. No modifications to the code itself.

- [ ] **Step 4: Remove from HTML, add script tag**

Delete the extracted code from the HTML. Add at end of `<body>`:

```html
<script src="/public/js/nbi-api.js?v=1"></script>
```

- [ ] **Step 5: Grep for broken references**

Search the remaining inline JS for every function name that was extracted. Ensure they are all still accessible (they will be, since they are top-level declarations in the new file).

- [ ] **Step 6: Test**

```bash
npm test && npm run test:e2e
```

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/public/js/nbi-api.js nbi_project_dashboard.html
git commit -m "refactor(frontend): extract API/auth layer to nbi-api.js"
```

### Task 3: Extract IndexedDB WAL (pure IDB code only)

**Files:**
- Create: `dashboard-server/public/js/nbi-idb.js`
- Modify: `nbi_project_dashboard.html`

Extract ONLY the IndexedDB WAL code: the IDB open/upgrade logic, WAL write/replay/clear functions, and the offline cache layer. Do NOT include config constants, state variable declarations, or sync polling -- those go in separate files.

- [ ] **Steps: identify IDB boundaries, extract, remove from HTML, add script tag, test, commit**

### Task 4: Extract config constants and state declarations

**Files:**
- Create: `dashboard-server/public/js/nbi-config.js`
- Modify: `nbi_project_dashboard.html`

Extract: SYNC_POLL_MS, API timeout constants, item type hierarchy data, and all `let`/`var` state variable declarations (tasks, settings, currentView, currentFilter, cachedUsers, dirtyTaskIds, etc.).

**Important:** These are `let`/`var` at top level of a non-module script. They will be global when in a separate file -- same behaviour as the monolith. No refactoring needed.

- [ ] **Steps: extract, remove from HTML, add script tag, test, commit**

### Task 5: Extract sync and persistence layer

**Files:**
- Create: `dashboard-server/public/js/nbi-sync.js`
- Modify: `nbi_project_dashboard.html`

Extract: `syncToAPI()`, `save()`, `markDirty()`, `mergeBriefDefaults()`, persistence helpers. 

**Critical:** The `setInterval` for sync polling must NOT be in this file. Move it to nbi-init.js (extracted in Phase 4). The sync module provides the functions; the init module starts the polling. This prevents polling from auto-starting before auth completes.

- [ ] **Steps: extract (without setInterval), remove from HTML, add script tag, test, commit**

### Task 6: Extract utility functions

**Files:**
- Create: `dashboard-server/public/js/nbi-utils.js`
- Modify: `nbi_project_dashboard.html`

Extract: tree helpers (getParent, getChildren, getDescendants), toast(), themedConfirm(), trapFocus(), async button helpers, form validation, textarea auto-resize, paste normalisation, listener registry.

No IIFE. All functions remain global.

- [ ] **Steps: extract, remove from HTML, add script tag, test, commit**

### Task 7: Extract event delegation and action wrappers

**Files:**
- Create: `dashboard-server/public/js/nbi-events.js`
- Modify: `nbi_project_dashboard.html`

Extract: the `data-action` dispatch system (lines ~3639-3658) and the `_actXxx` delegated action wrapper functions (~3659-3780).

**Note:** The `_actXxx` functions reference view-specific state and call `renderContent()`. This is acceptable because:
1. Without IIFEs, everything is global -- these functions can see renderContent when it loads later
2. The event delegation registers on DOMContentLoaded or is called from init, so all scripts will have loaded by then

- [ ] **Steps: extract, remove from HTML, add script tag, test, commit**

### CHECKPOINT 2: Codex Review

Have Codex verify:
- All infrastructure modules extracted and tests passing
- No function calls broken (grep for each extracted function name)
- Script tags are at end of `<body>`, not in `<head>`
- Sync polling `setInterval` is NOT in nbi-sync.js (it should still be in the remaining inline JS, to be moved to nbi-init.js later)

---

## Phase 3a: Simple View Renderers (~3,500 lines)

Each view is a self-contained render function that reads global state and writes to `#mainContent`. Extract one at a time, test after each.

### Task 8: Extract simple views (one commit each)

**Files to create:**
- `dashboard-server/public/js/views/nbi-dashboard.js` (~240 lines: renderDashboardView + renderTacticalDashboard)
- `dashboard-server/public/js/views/nbi-mytasks.js` (~185 lines: renderMyTasksView)
- `dashboard-server/public/js/views/nbi-people.js` (~400 lines: renderPeopleView + capacity heatmap)
- `dashboard-server/public/js/views/nbi-reports.js` (~870 lines: renderReportView)
- `dashboard-server/public/js/views/nbi-calendar.js` (~550 lines: renderCalendarView)
- `dashboard-server/public/js/views/nbi-settings.js` (~1,080 lines: renderSettingsView)
- `dashboard-server/public/js/views/nbi-chat.js` (~120 lines: embedded Claude chat widget)

**Pattern for each:** Identify the render function by name, find its boundaries (search for the next top-level function declaration), extract the entire block, remove from HTML, add `<script>` tag at end of body, test, commit.

- [ ] **For each view: extract, remove, add script tag, npm test && npm run test:e2e, commit**

### CHECKPOINT 3a: Codex Review

---

## Phase 3b: Complex View Renderers (~3,500 lines)

These views have cross-dependencies (shared DND state, detail panel opened from multiple views).

### Task 9: Extract complex views (one commit each)

**Files to create:**
- `dashboard-server/public/js/views/nbi-tasks.js` (~420 lines: renderTasksView + tree DND)
- `dashboard-server/public/js/views/nbi-kanban.js` (~310 lines: board rendering + board DND)
- `dashboard-server/public/js/views/nbi-gantt.js` (~1,115 lines: gantt rendering + select + drag + link + column resize)
- `dashboard-server/public/js/views/nbi-detail.js` (~795 lines: detail panel form)
- `dashboard-server/public/js/views/nbi-docs.js` (~830 lines: documentation view + Tiptap lazy load)

**Note on nbi-docs.js:** The documentation view has its own local `save()` function inside a closure. This must be preserved as-is during extraction -- do NOT confuse it with the global `save()` in nbi-sync.js. Since we are not using IIFEs, the local `save()` must remain inside its original closure/block scope.

**Note on nbi-gantt.js:** The gantt rendering, selection, drag, link mode, and column resize are tightly coupled. Extract them as a single file, not separate files.

- [ ] **For each view: extract, grep for cross-dependencies, test, commit**

### CHECKPOINT 3b: Codex Review

---

## Phase 3c: Additional Views (~1,700 lines)

Views that were not in the original plan but exist in the codebase.

### Task 10: Extract remaining views (one commit each)

**Files to create:**
- `dashboard-server/public/js/views/nbi-activity.js` (~553 lines: activity feed view)
- `dashboard-server/public/js/views/nbi-queue.js` (~500 lines: queue view)
- `dashboard-server/public/js/views/nbi-news.js` (~425 lines: news aggregator module)
- `dashboard-server/public/js/views/nbi-meetings.js` (~684 lines: meetings intelligence tab)

**Note on nbi-news.js:** In the monolith, the news module is lazy-loaded (only initialised when the user clicks the News tab). Extracting it to a script tag means it loads eagerly on every page load. This is a minor performance regression (~425 lines of JS parsed on load even if the user never visits News). Acceptable for now; can be converted back to lazy loading via dynamic `<script>` injection in a future optimisation pass if needed.

- [ ] **For each view: extract, test, commit**

### CHECKPOINT 3c: Codex Review

---

## Phase 4: Domain Modules (~8,500 lines)

Large domain-specific modules with their own data models and state.

### Task 11: Extract domain modules (one commit each)

**Files to create:**
- `dashboard-server/public/js/domains/nbi-hiring.js` (~4,140 lines: ATS, candidates, interviews, scorecards, offers + helpers)
- `dashboard-server/public/js/domains/nbi-leads.js` (~2,090 lines: CRM, deal stages, resource requirements)
- `dashboard-server/public/js/domains/nbi-finance.js` (~1,600 lines: finance view + expenses + report detail + individual expense)
- `dashboard-server/public/js/domains/nbi-bugs.js` (~400 lines: bug/feature tracker)

Each domain module has its own state variables (`_hiringData`, `_leadsData`, `_financeEntries`). These remain as global `let` declarations at the top of each extracted file -- same scoping as the monolith.

- [ ] **For each domain: extract, test, commit**

### Task 12: Extract remaining infrastructure modules

**Files to create:**
- `dashboard-server/public/js/nbi-sidebar.js` (~235 lines: renderSidebar, view routing)
- `dashboard-server/public/js/nbi-import.js` (~1,210 lines: CSV/Excel import + export + backup/restore)
- `dashboard-server/public/js/nbi-command.js` (~1,290 lines: Command Centre)
- `dashboard-server/public/js/nbi-warnings.js` (~360 lines: warnings sidebar)
- `dashboard-server/public/js/nbi-themes.js` (~115 lines: theme switching + mobile menu + sidebar collapse + keyboard shortcuts)
- `dashboard-server/public/js/nbi-portfolio.js` (~965 lines: Portfolio v5 neumorphic dashboard)

- [ ] **For each: extract, test, commit**

### Task 13: Extract init module (LAST)

**Files:**
- Create: `dashboard-server/public/js/nbi-init.js`
- Modify: `nbi_project_dashboard.html`

Extract the boot sequence: initial data load, IDB open, auth check, `renderAll()`, and the sync polling `setInterval`. This file loads last and starts everything.

**Critical:** The sync polling `setInterval` that was left in the inline JS during Phase 2 (Task 5) now moves here. This ensures polling starts only after all modules have loaded and auth has completed.

- [ ] **Steps: extract boot sequence, move setInterval here, test, commit**

### CHECKPOINT 4: Codex Review

Have Codex verify:
- ALL JS is extracted -- the HTML file contains only script tags, no inline `<script>` blocks (except the 18-line Block 1 fallback)
- Script tag order at end of `<body>` is correct
- All tests pass
- No `function ` declarations remain in the HTML (grep check)
- Line count of HTML file is ~350 lines

---

## Phase 5: Final Cleanup and Merge

### Task 14: Finalise the HTML file

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Verify HTML structure**

The file should now contain:
- `<head>`: meta tags, CSS link tags (fonts.css + dashboard.css)
- `<body>`: 280 lines of HTML markup + the 18-line fallback script (Block 1)
- End of `<body>`: script tags for all extracted JS files
- Total: ~350 lines

- [ ] **Step 2: Verify script tag order**

```html
<!-- Vendor (in <head>, these are libraries with no DOM refs) -->
<script src="/public/vendor/exceljs.min.js"></script>

<!-- Application JS (at end of <body>, after all HTML markup) -->
<script src="/public/js/nbi-config.js?v=1"></script>
<script src="/public/js/nbi-api.js?v=1"></script>
<script src="/public/js/nbi-idb.js?v=1"></script>
<script src="/public/js/nbi-utils.js?v=1"></script>
<script src="/public/js/nbi-sync.js?v=1"></script>
<script src="/public/js/nbi-events.js?v=1"></script>
<script src="/public/js/nbi-sidebar.js?v=1"></script>
<script src="/public/js/nbi-warnings.js?v=1"></script>
<script src="/public/js/nbi-themes.js?v=1"></script>

<!-- Views -->
<script src="/public/js/views/nbi-dashboard.js?v=1"></script>
<script src="/public/js/views/nbi-mytasks.js?v=1"></script>
<script src="/public/js/views/nbi-tasks.js?v=1"></script>
<script src="/public/js/views/nbi-kanban.js?v=1"></script>
<script src="/public/js/views/nbi-gantt.js?v=1"></script>
<script src="/public/js/views/nbi-calendar.js?v=1"></script>
<script src="/public/js/views/nbi-detail.js?v=1"></script>
<script src="/public/js/views/nbi-people.js?v=1"></script>
<script src="/public/js/views/nbi-reports.js?v=1"></script>
<script src="/public/js/views/nbi-docs.js?v=1"></script>
<script src="/public/js/views/nbi-settings.js?v=1"></script>
<script src="/public/js/views/nbi-chat.js?v=1"></script>
<script src="/public/js/views/nbi-activity.js?v=1"></script>
<script src="/public/js/views/nbi-queue.js?v=1"></script>
<script src="/public/js/views/nbi-news.js?v=1"></script>
<script src="/public/js/views/nbi-meetings.js?v=1"></script>

<!-- Domains -->
<script src="/public/js/domains/nbi-hiring.js?v=1"></script>
<script src="/public/js/domains/nbi-leads.js?v=1"></script>
<script src="/public/js/domains/nbi-finance.js?v=1"></script>
<script src="/public/js/domains/nbi-bugs.js?v=1"></script>

<!-- Features -->
<script src="/public/js/nbi-portfolio.js?v=1"></script>
<script src="/public/js/nbi-import.js?v=1"></script>
<script src="/public/js/nbi-command.js?v=1"></script>

<!-- Init (MUST be last) -->
<script src="/public/js/nbi-init.js?v=1"></script>
```

- [ ] **Step 3: Final test suite**

```bash
npm test && npm run test:e2e
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(frontend): SPA modularisation complete -- 30K monolith to ~30 modules"
```

### Task 15: Update CLAUDE.md

- [ ] **Step 1: Update Section B**

Update the Stack description: Frontend is now `nbi_project_dashboard.html` (~350 lines shell) + `dashboard.css` (3,238 lines) + ~30 JS modules in `/public/js/`. Note: no IIFEs, no namespace, no build step. All declarations are global scope via traditional script tags at end of body.

- [ ] **Step 2: Commit**

```bash
git commit -m "docs: update CLAUDE.md for modular frontend architecture"
```

### CHECKPOINT 5: Final Codex Review

Full review:
- All tests pass (same count as baseline)
- Every view renders correctly (Codex checks test results, Glen does UAT)
- No inline JS or CSS in the HTML (except 18-line fallback)
- Script loading order is correct
- Cache busting query strings on all tags
- CLAUDE.md updated

### Task 16: Merge to working branch

- [ ] **Step 1: Merge**

```bash
cd d:\OneDrive\Claude_code\NBIAI_TEAM
git merge feature/spa-modularise
```

- [ ] **Step 2: Restart production**

```bash
pm2 restart nbi-dashboard
```

- [ ] **Step 3: Glen UAT on production**

Load https://worksage.nbi-consulting.com. Full walkthrough.

- [ ] **Step 4: Clean up worktree**

```bash
git worktree remove .worktrees/spa-modularise
git branch -d feature/spa-modularise
```

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Breaking production | Worktree on separate branch + port 8889. Production untouched until merge. |
| onclick handlers stop working | No IIFEs. All functions remain in global scope. Zero refactoring of call sites. |
| Script loads before DOM ready | All app scripts at end of `<body>`, after HTML markup. Vendor libs in `<head>`. |
| Missing cross-dependency | Grep for every extracted function name before removing from HTML. |
| Stale cache after deploy | Version query strings (`?v=1`) on all script/CSS tags. Bump on deploy. |
| CSS specificity change | Extracted as single file -- no reordering, same specificity chain. |
| Sync polling starts before auth | setInterval stays in inline JS during extraction, moves to nbi-init.js last. |
| News module lazy-to-eager load | Accepted. 425 lines parsed on load even if user never visits News. Can be re-lazied later. |
| Dual save() functions | Documentation view's local save() stays in its closure scope within nbi-docs.js. Global save() is in nbi-sync.js. No conflict because no IIFEs. |
| 30+ HTTP requests on page load | Sequential `<script>` tags. Negligible on localhost. Over Cloudflare Tunnel adds some latency (HTTP/2 multiplexing helps). Measure after merge; concatenate later if >3s load. |
| Production breaks after merge | Rollback: `git revert HEAD && pm2 restart nbi-dashboard`. The merge is a single commit, cleanly revertible. |

## Summary

| Phase | Description | Files Created | Codex Checkpoint |
|---|---|---|---|
| 0 | Setup | 0 | -- |
| 1 | CSS extraction | 1 CSS file | Checkpoint 1 |
| 2 | JS infrastructure (api, idb, config, sync, utils, events) | 6 JS files | Checkpoint 2 |
| 3a | Simple views (dashboard, mytasks, people, reports, calendar, settings, chat) | 7 JS files | Checkpoint 3a |
| 3b | Complex views (tasks, kanban, gantt, detail, docs) | 5 JS files | Checkpoint 3b |
| 3c | Additional views (activity, queue, news, meetings) | 4 JS files | Checkpoint 3c |
| 4 | Domains (hiring, leads, finance, bugs) + infra (sidebar, import, command, warnings, themes, portfolio) + init | 13 JS files | Checkpoint 4 |
| 5 | Cleanup + CLAUDE.md + merge | 0 | Checkpoint 5 (final) |
| **Total** | | **1 CSS + ~35 JS files** | **7 checkpoints** |

Final HTML file: ~350 lines (head + body markup + script tags).
