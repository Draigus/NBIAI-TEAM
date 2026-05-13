# Frontend Modularisation Design Spec

**Date:** 2026-04-20
**Status:** Approved for implementation planning
**Scope:** `nbi_project_dashboard.html` (20,022 lines) to ES module architecture

## Problem Statement

The NBI dashboard frontend is a single 20,022-line HTML file containing ~2,170 lines of CSS and ~17,600 lines of JavaScript. It has 686 functions, 176 top-level variables in a single global scope, and 59 named sections. The file is 1.2 MB on disk.

The app is scaling in three dimensions simultaneously:
1. **More views** -- new major sections (news, hiring, client management already added)
2. **Deeper views** -- client portal gaining complexity, task management growing
3. **More audiences** -- client-facing portal with distinct visibility rules

Current pain points that will worsen:
- Git merge conflicts across sections that happen to be in the same file
- Claude Code cannot hold the full file in context during edits
- All 686 functions share one global scope with 176 mutable variables -- no enforced isolation
- Every user downloads all code for all views regardless of their role
- IDE features (go-to-definition, linting) degrade in very large files

## Decision

**Approach 3: Progressive Modularisation with ES Modules.** No framework, no build step, no bundler.

Split the monolith along its existing section boundaries into ES module files. The app ships as native `<script type="module">` with no transformation. The behaviour is identical before and after migration.

Rejected alternatives:
- **Approach 1 (Harden the monolith):** IIFEs and namespacing within the single file. Buys time but does not solve the structural scaling problem. A 40k-line file with namespaced IIFEs is still a 40k-line file.
- **Approach 2 (Full framework rewrite):** React/Vue/Svelte component architecture. Correct architecture if starting fresh, but the rewrite cost is unjustifiable for a working app with one AI developer. Approach 3 is the prerequisite step for Approach 2 anyway -- it is not a dead end.

## Architecture

### Event Delegation Constraint

The app uses a single global click handler (line 2479) that resolves `data-action="functionName"` attributes by calling `window[functionName]()`. There are 428 `data-action` bindings referencing 279 unique function names, of which 188 are direct function calls (not `_act*` wrappers).

ES modules do not put exports on `window` by default. During migration, each view module explicitly registers its public actions:

```js
// In bugs.js
export function openBugDetail(id) { /* ... */ }
window.openBugDetail = openBugDetail;
```

Post-migration, the delegation system can optionally be converted to a registry pattern where views call `registerActions({ openBugDetail, submitBugReport })` and the click handler resolves from the registry instead of `window`. This is a follow-up, not a blocker.

### Inline Event Handlers in Static HTML

The login form uses `onsubmit="handleLogin(event)"` (line 2212), which resolves via global scope. There may be other inline handlers in the static HTML markup. These must also be registered on `window` by the module that defines them, or converted to `data-action` bindings during migration. Each phase should grep for inline `on*=` handlers referencing functions that just moved to a module.

### Module Init Timing

The current app boots via an inline IIFE at line 19068 that executes synchronously as the `<script>` block parses. ES modules are deferred by default -- they execute after DOM parsing completes. This is actually safe (the current IIFE queries the DOM, which requires it to be ready), but it means:

- The app initialises slightly later (after DOM parse, not during)
- `<script type="module">` is non-blocking, so the page shell renders before JS loads
- The login screen (`display: none` by default) stays hidden until JS shows it, which is correct behaviour

No code changes needed for this timing shift, but implementers should be aware that any code relying on execution-order-during-parse will break if moved to a module. The current codebase has no such reliance (verified: the IIFE at line 19068 is the only top-level executable code, and it runs after all function definitions).

### View Dispatcher

The `_renderMainContent` function (line 4294) is a switch statement that calls `renderDashboard(content)`, `renderTaskView(content)`, etc. In the modular architecture, this converts to a registry pattern:

```js
// router.js
const viewRenderers = {};
export function registerView(name, renderFn) { viewRenderers[name] = renderFn; }

function _renderMainContent(content) {
  const renderer = viewRenderers[currentView];
  if (renderer) renderer(content);
}
```

Each view module registers itself on import:

```js
// dashboard.js
import { registerView } from '../core/router.js';
registerView('dashboard', renderDashboard);
```

Adding a new view requires only creating a new module file and importing it from `app.js`. No existing files change.

## Module Structure

### Directory Layout

Express serves static files from `dashboard-server/public/` (line 595 of server.js: `app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: '7d' }))`). All new CSS and JS files go under `dashboard-server/public/`, not the repo root. The existing `dashboard-server/public/` directory already contains `fonts/` and `vendor/`.

```
dashboard-server/
  public/
    fonts/          (existing)
    vendor/         (existing -- xlsx.full.min.js)
    css/
      tokens.css
      layout.css
      components.css
      mobile.css
      views/
        dashboard.css
        tasks.css
        leads.css
        expenses.css
        bugs.css
        hiring.css
        clients.css
        settings.css
        reports.css
        sidebar.css
        people.css
        finances.css
    js/
      core/
        state.js
        router.js
        helpers.js
        ui.js
        events.js
      views/
        dashboard.js
        tasks.js
        leads.js
        expenses.js
        bugs.js
        hiring.js
        finances.js
        people.js
        reports.js
        settings.js
        sidebar.js
        themes.js
        news.js
      app.js
nbi_project_dashboard.html    (~250 lines: head + shell + auth screens + overlays)
```

### Core Module Dependency Graph

Core modules form a directed acyclic graph. No circular dependencies are permitted between core modules.

```
events.js          (no imports from other core modules)
    ↓
state.js           (imports from: events)
    ↓
helpers.js         (imports from: state -- reads tasks, settings, currentFilter, _currentUser, _apiClientsCache)
    ↓
ui.js              (imports from: helpers -- uses esc() for toast/confirm rendering)
    ↓
router.js          (imports from: state, helpers, ui, events)
```

**Verified:** `state.js` (the persistence layer: `save`, `syncToAPI`, `load`, `markDirty`, `apiCall`, `authFetch`) does not call any functions from `helpers.js`. Functions like `assigneeSelectHtml` that are currently adjacent to the persistence code in the monolith are UI renderers that will move to `helpers.js` or their owning view module during extraction.

### Misplaced Functions

During extraction, each section will contain functions that logically belong elsewhere. The spec identifies the major ones (listed under `helpers.js` contents), but smaller misplacements will be discovered during each extraction step. The rule: if a function is called by 3+ modules, it moves to the appropriate core module. If called by only its own section, it stays. If called by 2 sections, judgment call during implementation.

### Core Modules (`dashboard-server/public/js/core/`)

#### `state.js`
All shared mutable state and persistence layer.

**Contains:**
- Global state variables: `tasks`, `settings`, `currentView`, `currentFilter`, `selectedTaskIds`, `clientBriefs`, `_apiClientsCache`, `_currentUser`, `_cachedTeamMembers`, `activeDetailTaskId`, `taskSubView`, `collapsedTaskIds`, `inlineDetailVisible`, `_pagePermissions`, `useAPI`, `syncDebounceTimer`, `_dirtyTaskIds`, `_deletedTaskIds`, `_briefsDirty`, `_lastPollTime`, `_syncInFlight`
- Persistence functions: `markDirty()`, `save()`, `authFetch()`, `apiCall()`
- Auth helpers: `isClientUser()`, `isClientAdmin()`
- Sync engine and IndexedDB write-ahead log
- Login/logout flow

**Source lines:** INDEXEDDB WRITE-AHEAD LOG section (line 2673), auth functions from EVENT DELEGATION (lines 2622-2787), state declarations (lines 3064-3146)

#### `router.js`
Navigation, view switching, and render orchestration.

**Contains:**
- `switchView()`, `renderContent()`, `renderAll()`, `renderBreadcrumbs()`
- `_renderMainContent()` dispatcher (converted to registry pattern)
- `renderTabs()`
- Hash routing and history state management
- Legacy route redirects
- View registry: `registerView(name, renderFn)`
- Shell callback registry: `registerShellCallback(name, fn)` -- used by `sidebar.js` to register `renderSidebar` without creating a circular import. `renderAll()` calls `shellCallbacks.sidebar()` instead of importing sidebar directly

**Circular dependency prevention:** `renderSidebarCounts()` moves to `sidebar.js` (it is a one-liner that calls `renderSidebar()`). `router.js` never imports `sidebar.js`. Instead, `sidebar.js` registers its render function via `registerShellCallback('sidebar', renderSidebar)`, and `renderAll()` calls the registered callback. Sidebar imports `switchView` from router -- the dependency flows one direction only: sidebar -> router.

**Source lines:** TABS & ROUTING section (line 4163)

#### `helpers.js`
Pure utility functions used by 5+ sections each.

**Contains:**
- Escaping: `esc()` (498 call sites), `escAttrJs()`, `safeUrl()`
- Date: `safeParseDate()` (currently misplaced in TASK VIEW at line 7363)
- Currency: `fmtMoney()`, `currencySym()` (currently misplaced in LEADS CRM at line 12904)
- Permissions: `hasPageAccess()` (currently misplaced in SETTINGS VIEW at line 16823)
- UI primitives: `emptyState()` (currently misplaced in DASHBOARD VIEW at line 4355)
- Task tree: `getChildren()`, `getRootTasks()`, `getDescendants()`, `getRootAncestor()`, `getTaskClient()`, `clientGroupKey()`, `clientPrefix()`, `clientBadgeHtml()`, `getTaskPractice()`, `countByHealth()`, `getAllClients()`, `isTaskIncomplete()`
- Item type hierarchy: `getItemType()`, `itemTypeBadgeHtml()`, `aggHours()`, `getContractedClients()`, `getContractedClientRecords()`, `getFilteredTasks()`
- Badge rendering: `healthBadgeHtml()`, `priorityBadgeHtml()`
- Undo: `pushUndo()` (currently misplaced in CSV EXPORT at line 18268)

**Source lines:** HELPERS & TASK TREE UTILITIES (line 3398), ITEM TYPE HIERARCHY (line 3472), BADGE HELPERS (line 5707), plus misplaced functions extracted from their current sections

#### `ui.js`
Shared UI components and interaction helpers.

**Contains:**
- `toast()` (296 call sites)
- `themedConfirm()` (14+ call sites)
- Focus trap: `_trapFocus()`, `_releaseFocusTrap()`, `_activateDynamicModal()` (called by 6+ sections)
- `withButtonLoading()` (async button loading state)
- Form validation: `showFieldError()`, `clearFieldErrors()` (6+ sections)
- Textarea auto-resize
- Skeleton placeholder rendering

**Source lines:** TOAST NOTIFICATIONS (line 3612), THEMED CONFIRMATION DIALOG (line 3629), FOCUS TRAP (line 3682), ASYNC BUTTON HELPER (line 3730), INLINE FORM VALIDATION (line 3742), TEXTAREA AUTO-RESIZE FALLBACK (line 3764)

#### `events.js`
Event infrastructure only. Individual action handlers move to their view modules.

**Contains:**
- `addManagedListener()`, `cleanupListeners()` (listener registry)
- The delegation click handler (15 lines): resolves `data-action` to function call
- The delegation change handler (if present)
- Keyboard accessibility delegation (GLOBAL KEYBOARD ACCESSIBILITY section)

**Source lines:** LISTENER REGISTRY (line 2458), EVENT DELEGATION framework (line 2473, lines 2478-2495 only), GLOBAL KEYBOARD ACCESSIBILITY (line 19227)

### View Modules (`public/js/views/`)

Each view module follows the same pattern:
1. Import what it needs from core modules
2. Define its render function(s) and internal state
3. Register its view with the router
4. Register its `data-action` handlers on `window`

#### `tasks.js` (~110 functions)
**Bundles:** TASK VIEW + DETAIL PANEL + CLIENT SUMMARY PANEL + BULK OPERATIONS + TREE VIEW DRAG AND DROP + BOARD DRAG AND DROP + MARK AS BLOCKED POPUP + REPEAT TASK SECTION

**Why bundled:** 23 verified cross-calls between TASK VIEW and DETAIL PANEL. They share `updateTask`, `openDetail`, `openDetailOverlay`, `collapsedTaskIds`, `selectedTaskIds`. Splitting creates interface complexity without real isolation.

**Registers views:** `tasks`

**Internal state:** `_calMonth`, `_calYear`, `_calEventsKey`, `_ganttOffsetDays`, `ganttDayWidth`, `_ganttLinkMode`, `_ganttLinkFrom`, `_ganttDepView`, `_ganttHideArrows`, `_ganttSelectedArrow`, `_ganttLimit`, `_boardTypeFilter`, `_tasksInitialCollapse`

#### `leads.js` (~75 functions)
**Bundles:** LEADS CRM + CONTACT NOTES

**Why bundled:** Contact notes are lead-specific UI. LEADS CRM is self-contained after `fmtMoney`/`currencySym` are extracted to `helpers.js`.

**Registers views:** `leads`

**Internal state:** `_leadsConfig`, `_leadsData`, `_leadsFilter`, `_sowsCache`, `_leadDetailId`, `_leadsSortCol`, `_leadsSortDir`

#### `expenses.js` (~40 functions)
**Bundles:** EXPENSE REPORTS + INDIVIDUAL EXPENSE DETAIL + REPORT DETAIL PANEL

**Registers views:** `expenses`

#### `settings.js` (~79 functions)
**Bundles:** SETTINGS VIEW + CHANGELOG/AUDIT LOG + BACKUP & RESTORE + CONTRACT IMPORT WIZARD + DOWNLOADS/EXCEL IMPORT + CSV/EXCEL FILE IMPORT + CSV EXPORT

**Why bundled:** Settings orchestrates sub-tabs (team, config, data, bugs, changelog, news admin). Changelog is only rendered as a settings sub-tab (2 functions). CSV import/export and backup/restore are only accessible from Settings.

**Registers views:** `settings`

#### `bugs.js` (~25 functions)
**Source:** BUG / FEATURE REPORTS section (line 14857)

**Coupling:** Calls only core functions (`apiCall`, `esc`, `toast`, `renderContent`, `isClientUser`, `clearFieldErrors`, `showFieldError`, `_activateDynamicModal`). No task-data dependencies. Very clean boundary.

**Registers views:** `bugs`

#### `hiring.js` (~27 functions)
**Source:** HIRING section (line 15756)

**Coupling:** Core functions plus `getContractedClientRecords` (in `helpers.js`), `themedConfirm`, `_trapFocus`, `safeUrl`, `renderSidebar`. Clean boundary.

**Registers views:** `hiring`

#### `finances.js` (~12 functions)
**Source:** FINANCES VIEW section (line 10681)

**Coupling:** Core functions only. No cross-view dependencies.

**Registers views:** `finances`

#### `dashboard.js` (~42 functions)
**Bundles:** DASHBOARD VIEW + CHARTS (SVG) + MY TASKS VIEW

**Why bundled:** MY TASKS VIEW is a dashboard sub-view. Charts are only used by the dashboard.

**Registers views:** `dashboard`, `mytasks`

#### `people.js` (~5 functions + calendar sub-view)
**Source:** PEOPLE VIEW section (line 9890)

**Registers views:** `people`

#### `reports.js` (~2 functions)
**Source:** REPORT VIEW section (line 9438)

**Registers views:** `report`, `workload`

#### `sidebar.js` (~20 functions)
**Bundles:** SIDEBAR NAVIGATION + SIDEBAR COLLAPSE & MOBILE + WARNINGS & ALERTS SIDEBAR + MOBILE HEADER OVERFLOW MENU + MOBILE SIDEBAR KEYBOARD HANDLING

**Exports:** `renderSidebar()`, `renderSidebarCounts()`, `updateWarnAlertButton()`, `toggleWarnAlertSidebar()`

**Imports from router:** `switchView` (sidebar nav items call it on click)

**No circular dependency:** sidebar imports from router, never the reverse. Sidebar registers itself with the router via `registerShellCallback('sidebar', renderSidebar)` so `renderAll()` can invoke it without importing sidebar directly.

Not a "view" in the router sense -- it renders the persistent sidebar and warnings panel.

#### `themes.js` (~4 functions)
**Source:** THEMES section (line 18923)

Self-contained. Reads theme from localStorage, applies to `<html>` element.

#### `news.js`
News admin panels (search, feed health, prompts, sources, stories). Already semi-separate since news data comes via the `/api/news/*` proxy to the nbi-news service.

**Registers views:** `news`

### Entry Point: `app.js`

```js
// Core
import './core/events.js';
import './core/state.js';
import './core/helpers.js';
import './core/ui.js';
import './core/router.js';

// Views
import './views/dashboard.js';
import './views/tasks.js';
import './views/leads.js';
import './views/expenses.js';
import './views/bugs.js';
import './views/hiring.js';
import './views/finances.js';
import './views/people.js';
import './views/reports.js';
import './views/settings.js';
import './views/sidebar.js';  // registers shell callback, not a routed view
import './views/themes.js';
import './views/news.js';

// Initialise
import { init } from './core/state.js';
init();
```

## CSS Structure

### Core Files

| File | Approx lines | Contents |
|---|---|---|
| `tokens.css` | ~185 | Reset, `:root` design tokens, all 7 theme overrides (Dark, Light, Midnight, Nord, Solarized, Dracula, Emerald) |
| `layout.css` | ~200 | Header, sidebar, main content grid, shell structure |
| `components.css` | ~400 | Buttons, modals, toast, badges, forms, filters, multi-select dropdowns, sync indicator, empty state, skeleton placeholders, spinner, hover items, confirmation dialog, form validation, attachment rows |
| `mobile.css` | ~250 | All `@media` breakpoints, touch target overrides, mobile header restructure, mobile sidebar, finance table mobile overflow |

### View Files (`public/css/views/`)

One CSS file per view module, containing only the styles for that view's markup. Design tokens (custom properties) cascade from `tokens.css` -- no duplication needed.

| File | Approx lines | Contents |
|---|---|---|
| `dashboard.css` | ~200 | Portfolio dashboard v3/v4, KPI cards/strip, chart cards, tactical dashboard, project progress |
| `tasks.css` | ~200 | Task list, detail panel, inline detail, kanban board, gantt timeline, calendar view, task sub-view toggle, master-detail layout |
| `leads.css` | ~90 | Leads tracker styles |
| `expenses.css` | ~110 | Expense report styles |
| `bugs.css` | ~110 | Bug/feature report styles |
| `hiring.css` | ~110 | Hiring section styles |
| `clients.css` | ~20 | Client view, manage clients |
| `settings.css` | ~10 | Settings page, CSV import modal |
| `reports.css` | ~40 | Report portfolio cards, workload bars, clickable report rows |
| `sidebar.css` | ~210 | Warnings & alerts sidebar |
| `people.css` | ~50 | People calendar sub-view |
| `finances.css` | ~55 | Finance responsive layout, edit affordance |

### HTML Head

```html
<link rel="stylesheet" href="/public/css/tokens.css">
<link rel="stylesheet" href="/public/css/layout.css">
<link rel="stylesheet" href="/public/css/components.css">
<link rel="stylesheet" href="/public/css/views/dashboard.css">
<link rel="stylesheet" href="/public/css/views/tasks.css">
<!-- ... all view CSS files ... -->
<link rel="stylesheet" href="/public/css/mobile.css">  <!-- last: overrides via @media -->
```

All CSS files are loaded upfront. No lazy loading for CSS -- the total payload is ~2,170 lines which is small, and loading all styles avoids flash-of-unstyled-content on view switches.

## The HTML Shell

After migration, `nbi_project_dashboard.html` contains only:

1. **`<head>`** -- charset, viewport, title, font link, CSS `<link>` tags, `<script type="module" src="/public/js/app.js">`
2. **Auth screens** (~55 lines) -- `#loginScreen`, `#resetPasswordScreen`, `#forcePasswordChangeModal`
3. **App header** (~60 lines) -- brand, nav buttons, theme picker, user badge, mobile overflow menu
4. **Shell skeleton** (~10 lines) -- `<aside class="sidebar"><nav id="sidebarNav"></nav></aside>` + `<main id="mainLandmark">` with empty `#mainTabs`, `#breadcrumbBar`, `#mainContent`
5. **Overlay panels** (~90 lines) -- `#detailPanel`, `#bugDetailPanel`, `#candidateDetailPanel`, `#importModal`, `#toastContainer`, `#syncBadge`, `#confirmModal`, `#conflictModal`, `#blockerModal`
6. **Alerts sidebar** (~18 lines) -- `#warnAlertPanel`

Total: approximately **250 lines**. Down from 20,022.

## Migration Strategy

### Principle

Every commit leaves the app in a working state. No phase requires the next phase to be complete. The migration can be paused or abandoned at any point without leaving broken code.

### Phase 0: Staging Environment (COMPLETE)

Staging environment provisioned and verified as a complete replica of production.

| Property | Value |
|---|---|
| PM2 process | `nbi-dashboard-staging` |
| Port | 8887 |
| Database | `nbi_dashboard_staging` (PostgreSQL, baseline schema loaded from production dump) |
| NODE_ENV | `staging` |
| Config file | `dashboard-server/.env.staging` (env vars injected via PM2 ecosystem config) |
| Email | Disabled (empty Azure credentials, `staging@example.invalid`) |
| Admin users | `glen` (admin), `magnus` (admin), `staging-admin` (admin) -- all password `staging2026` |
| Verification | All 27 tables, 230 columns, 17 indexes, 10 constraints, 2 functions, 2 triggers match production schema |

**Workflow:** All modularisation work happens in a git worktree branch. Each phase is deployed to staging first, smoke-tested, then promoted to production via merge to master and PM2 restart.

### Phase 1: Infrastructure (no behaviour change)

- Create `dashboard-server/public/css/` and `dashboard-server/public/js/core/` directory structures
- Express static middleware already serves `dashboard-server/public/` at `/public` with 7-day cache (line 595 of server.js). Verify `.js` files are served with `application/javascript` MIME type (required for `<script type="module">` -- browsers reject modules served as `text/plain`). Express's `express.static` uses the `mime` package which handles this correctly by default
- Extract all CSS into separate files (pure copy-paste, zero logic dependencies)
- Update `nbi_project_dashboard.html` `<head>` to `<link>` the CSS files instead of inline `<style>`
- Remove the inline `<style>` block
- Convert any inline `on*=` handlers in static HTML to `data-action` bindings (e.g. `onsubmit="handleLogin(event)"` on the login form at line 2212)
- Test: app looks and works identically

### Phase 2: Core JS extraction

- Extract `helpers.js` -- pure functions, no state, no side effects. Lowest risk
- Extract `ui.js` -- toast, confirm, focus trap. Low risk
- Extract `events.js` -- delegation framework. The `_act*` wrappers stay inline for now
- Extract `state.js` -- global state, sync engine, auth. Medium risk (most coupled)
- Extract `router.js` -- view switching, dispatcher. Convert to registry pattern
- The inline `<script>` block shrinks but still contains all view code
- Test: app works identically

### Phase 3: View extraction (one at a time, cleanest first)

Migration order based on verified coupling analysis:

| Order | Module | Functions | Risk | Rationale |
|---|---|---|---|---|
| 1 | `themes.js` | 4 | Trivial | Self-contained, safe first test of the module pattern |
| 2 | `finances.js` | 12 | Low | No cross-view dependencies |
| 3 | `bugs.js` | 25 | Low | Calls only core functions |
| 4 | `hiring.js` | 27 | Low | Calls only core + one helper |
| 5 | `people.js` | 5 | Low | Small, read-only view |
| 6 | `reports.js` | 2 | Low | Small, read-only view |
| 7 | `expenses.js` | 40 | Medium | Bundled from 3 sections, needs `fmtMoney` in core by now |
| 8 | `sidebar.js` | 20 | Medium | Reads widely but writes nothing |
| 9 | `news.js` | 24 | Medium | Semi-separate already (nbi-news proxy) |
| 10 | `dashboard.js` | 42 | Medium | Reads widely, includes charts |
| 11 | `leads.js` | 75 | Medium-High | Large, has misplaced helpers to extract first |
| 12 | `settings.js` | 81 | Medium-High | Orchestrates many sub-tabs, includes changelog |
| 13 | `tasks.js` | 110 | High | Most coupled -- by this point all dependencies are in core |

Each view extraction is a single commit. After each commit: all existing tests pass, manual smoke test of the extracted view, and at least one other view spot-checked for regressions.

### Phase 4: Cleanup

- Remove the now-empty inline `<script>` block from `nbi_project_dashboard.html`
- Move `_act*` wrappers from EVENT DELEGATION to their respective view modules
- Trim the HTML file to the ~250-line shell
- Optional follow-up: convert `window[action]` delegation to registry pattern

## Handling Concurrent Development

Features are actively being added to the monolith in parallel CLI sessions while this migration is planned and executed. The migration must not block feature development, and feature development must not block migration.

**Rules:**

1. **Migration works on a worktree branch.** Feature work continues on master against the monolith as normal. No one waits.
2. **Before each phase starts,** re-read the monolith's current state on master. Any new sections, functions, or `data-action` bindings added since the spec was written get incorporated into the extraction plan for that phase. The spec's function counts and line numbers are a snapshot -- the implementation plan will reference section headers and function names, not line numbers.
3. **Merge direction:** After each phase passes staging verification, the worktree branch merges into master. If master has changed (new features landed), the merge happens in the worktree first, conflicts are resolved there, and staging is re-verified before promoting.
4. **New views added on master** between phases get extracted in Phase 3 in their natural coupling order. They don't require a spec revision -- the pattern is established.
5. **New functions added to existing sections on master** get included when that section's view module is extracted. No special handling needed.

## What This Does Not Cover

- **`server.js` (9,105 lines)** stays monolithic. It has a different coupling profile (Express routes are already somewhat isolated). Server modularisation is a separate design decision.
- **No build step.** No Vite, no esbuild, no webpack. If we later want bundling for code-splitting or HMR, ES modules are the native input format those tools expect.
- **No framework.** No React, Vue, or Svelte. This is structural reorganisation, not a rewrite. If we later want a framework, the modularised code is far easier to migrate than a 20k-line monolith.
- **No feature changes.** The app behaves identically before and after. No new features, no removed features, no changed behaviour.
- **No lazy loading.** All modules are loaded upfront via static imports. Dynamic `import()` for per-role code splitting (e.g. not loading admin views for client users) is a future optimisation that this structure enables but does not implement.

## Testing Strategy

- All 186 existing tests (Vitest + Playwright) must pass after every commit
- Each view extraction gets a manual smoke test of the extracted view
- Playwright E2E tests cover the critical paths (login, task visibility, bug API)
- No new tests needed specifically for the migration -- the point is identical behaviour
- If a view extraction introduces a regression, the commit is reverted and the issue diagnosed before re-attempting

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `window[action]` breaks for a migrated function | Medium | High (broken UI) | Every view extraction commit includes manual testing of all `data-action` bindings in that view |
| Circular import between modules | Low | Medium (module load failure) | Core modules are designed as a DAG: events < state < helpers < ui < router. Sidebar/router circular dependency prevented via `registerShellCallback` pattern. No view module imports another view module |
| Missing global variable in extracted view | Medium | High (runtime error) | Grep for all `let`/`const`/`var` references before extracting each view. Ensure all are imported |
| CSS specificity changes from file ordering | Low | Low (visual glitch) | CSS file order in `<head>` matches original order in the monolith |
| HTTP/1.1 connection limits with many files | Low | Low (slower load) | Cloudflare tunnel provides HTTP/2 multiplexing. ~30 files is well within normal range |
| Migration stalls partway through | Medium | Low | Every phase leaves the app working. A hybrid state (some views extracted, some inline) is stable indefinitely |
