# Frontend Modularisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 20,026-line monolithic `nbi_project_dashboard.html` into ES modules (no build step) so each view is an independent file, enabling parallel development, better tooling, and isolation.

**Architecture:** Progressive extraction along existing section boundaries. CSS first (zero logic risk), then 5 core JS modules forming a DAG (`events` < `state` < `helpers` < `ui` < `router`), then 13 view modules extracted one at a time from cleanest to most coupled. Every commit leaves the app fully functional. All work is done in a worktree branch, deployed to staging (port 8887) for verification, then merged to master.

**Tech Stack:** Vanilla ES modules (`<script type="module">`), Express static serving, PM2 process management, PostgreSQL, Vitest + Playwright for testing.

**Spec:** `docs/superpowers/specs/2026-04-20-frontend-modularisation-design.md`

---

## Pre-Flight

Before starting any task, the implementer must:

1. Create a worktree branch: `git worktree add ../nbi-modularise feature/frontend-modularisation`
2. Work exclusively in the worktree. Master stays clean for concurrent feature work.
3. After each task's commit, deploy to staging: `pm2 restart nbi-dashboard-staging`
4. Smoke-test the affected view in staging (`http://localhost:8887`) before moving on.

### Key reference points in the monolith (as of commit `40a3ab1`, 20,026 lines):

| Section | Lines |
|---|---|
| CSS (inline `<style>`) | 28-2200 |
| Static HTML body | 2201-2442 |
| JS (`<script>`) | 2443-20024 |
| Listener registry | 2462-2475 |
| Event delegation | 2477-2495 |
| Delegated action wrappers | 2497-2620 |
| Auth + state declarations | 2621-3397 |
| Helpers & task tree utilities | 3398-3471 |
| Item type hierarchy | 3472-3611 |
| Toast, confirm, focus trap, ui | 3612-3778 |
| Sidebar navigation | 3790-3999 |
| Tabs & routing | 4163-4351 |
| Dashboard view | 4352-5655 |
| Charts (SVG) | 5656-5706 |
| Badge helpers | 5707-5727 |
| My tasks view | 5728-5912 |
| Multi-select filter helpers | 5913-5988 |
| Task view | 5989-7697 |
| Client summary panel | 7698-8112 |
| Bulk operations | 8113-8157 |
| Tree view drag and drop | 8158-8274 |
| Board drag and drop | 8275-8401 |
| Detail panel | 8402-9048 |
| Repeat task section | 9049-9159 |
| Mark as blocked popup | 9160-9437 |
| Report view | 9438-9889 |
| People view | 9890-10342 |
| Finances view | 10681-10889 |
| Expense reports | 10890-12757 |
| Changelog/audit log | 12758-12852 |
| Leads CRM | 12853-14850 |
| Bug/feature reports | 14851-15749 |
| Hiring | 15750-16515 |
| Settings view | 16516-18094 |
| CSV export | 18095-18169 |
| Loading, sync, offline, conflict, undo | 18170-18296 |
| News admin | 18297-18854 |
| Backup & restore | 18855-18927 |
| Themes | 18928-18983 |
| Mobile header overflow | 18984-19016 |
| Sidebar collapse & mobile | 19017-19108 |
| Keyboard accessibility | 19109-19230 |
| Warnings & alerts sidebar | 19261-19584 |
| Focus trap on detail panel | 19585-19597 |
| News aggregator module | 19599-20023 |
| Init IIFE | 19068-19107 |

### Existing tests (baseline):

- 23 test files, 186 tests (all passing)
- Unit tests: `dashboard-server/tests/unit/*.test.mjs` (Vitest)
- E2E tests: `dashboard-server/tests/e2e/*.spec.js` (Playwright)
- Run unit: `cd dashboard-server && npx vitest --run`
- Run all: `cd dashboard-server && npm run test:all`

### CSS section-to-file mapping:

| Spec target file | Source CSS sections (line ranges) |
|---|---|
| `tokens.css` | Reset & Tokens (28-54), Light (55-87), Midnight (88-106), Nord (107-126), Solarized (127-146), Dracula (147-165), Emerald (166-197) |
| `layout.css` | Header (198-204), Theme picker (205-216), Buttons (217-227), Layout (228-263), Main content (264-273) |
| `components.css` | Toast+hover+spinner (876-914), Badges (550-562), Filter bar (613-617), Multi-select filter (618-657), Modal width tokens (1917-1922), Confirmation dialog (1923-1935), Form validation (1936-1944), Sync pending (1945-1947), Attachment rows (1406-1580), Login screen (1293-1318), Manage clients (1901-1916) |
| `mobile.css` | Mobile & tablet (1143-1292), Touch targets (1948-1958), Mobile header (1959-1987), Finance table mobile (1988-1994) |
| `views/dashboard.css` | KPI cards (274-276), Tactical dashboard (277-369), Portfolio v3 (370-515), Chart cards (516-535), Project progress (536-549) |
| `views/tasks.css` | Task list (563-612), Tasks master-detail (658-665), Detail panel (666-730), Task sub-view toggle (915-923), Kanban (924-951), Gantt (952-1009), Calendar (1010-1029) |
| `views/leads.css` | Leads tracker (1319-1405) |
| `views/expenses.css` | Expense reports (1581-1687) |
| `views/bugs.css` | Bug/feature reports (1688-1795) |
| `views/hiring.css` | Hiring (1796-1900) |
| `views/clients.css` | Client view (731-738) |
| `views/settings.css` | Settings (835-839), CSV import modal (840-875) |
| `views/reports.css` | Report view (739-776), Report portfolio cards (1030-1051), Report workload bars (1052-1064), Clickable report rows (1065-1068) |
| `views/sidebar.css` | Warnings & alerts sidebar (1995-2200) |
| `views/people.css` | People calendar (1069-1113) |
| `views/finances.css` | Finance edit (777-783), Finance responsive (784-834) |
| `views/news.css` | News admin badges (2195-2200) |
| `print.css` | Print (1114-1142) |

---

## Task 1: Create Directory Structure

**Files:**
- Create: `dashboard-server/public/css/` (directory)
- Create: `dashboard-server/public/css/views/` (directory)
- Create: `dashboard-server/public/js/` (directory)
- Create: `dashboard-server/public/js/core/` (directory)
- Create: `dashboard-server/public/js/views/` (directory)

- [ ] **Step 1: Create all directories**

```bash
mkdir -p dashboard-server/public/css/views
mkdir -p dashboard-server/public/js/core
mkdir -p dashboard-server/public/js/views
```

- [ ] **Step 2: Add .gitkeep files so git tracks empty dirs**

```bash
touch dashboard-server/public/css/.gitkeep
touch dashboard-server/public/css/views/.gitkeep
touch dashboard-server/public/js/.gitkeep
touch dashboard-server/public/js/core/.gitkeep
touch dashboard-server/public/js/views/.gitkeep
```

- [ ] **Step 3: Verify Express serves .js as application/javascript**

Create a test file and check the MIME type:

```bash
echo 'export const test = true;' > dashboard-server/public/js/mime-test.js
curl -sI http://localhost:8887/public/js/mime-test.js | grep -i content-type
```

Expected output should contain: `application/javascript` (Express's `mime` package handles this by default).

- [ ] **Step 4: Clean up test file and commit**

```bash
rm dashboard-server/public/js/mime-test.js
git add dashboard-server/public/css dashboard-server/public/js
git commit -m "chore: create css and js directory structure for frontend modularisation"
```

---

## Task 2: Extract `tokens.css`

**Files:**
- Create: `dashboard-server/public/css/tokens.css`
- Modify: `nbi_project_dashboard.html`

This is the first CSS extraction. It covers all design tokens, the reset rule, and all 7 theme overrides (lines 28-197 of the monolith).

- [ ] **Step 1: Copy CSS lines 28-197 to tokens.css**

Open `nbi_project_dashboard.html` and copy lines 28 through 197 (from `/* ===== RESET & TOKENS ===== */` through the closing `}` of the Emerald theme) into a new file `dashboard-server/public/css/tokens.css`.

The file starts with:
```css
/* ===== RESET & TOKENS ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg-base: #0a0a0a; --bg-raised: #111111; --bg-surface: #161616;
```

And ends with the closing brace of the Emerald theme section.

- [ ] **Step 2: Add `<link>` tag to HTML `<head>` and remove extracted CSS**

In `nbi_project_dashboard.html`, add this line after the fonts link (after line 26 `<link href="/public/fonts/fonts.css" rel="stylesheet">`):

```html
<link rel="stylesheet" href="/public/css/tokens.css">
```

Then delete lines 28-197 from the inline `<style>` block (the reset+tokens+all themes).

- [ ] **Step 3: Verify app renders identically**

```bash
pm2 restart nbi-dashboard-staging
```

Open `http://localhost:8887` in a browser. Verify:
- The login screen renders with correct styling
- After login, the dashboard loads with the default dark theme
- Switch to Light, Midnight, Nord, Solarized, Dracula, and Emerald themes -- each applies correctly

- [ ] **Step 4: Run tests**

```bash
cd dashboard-server && npx vitest --run
```

Expected: 186 tests pass (CSS changes don't affect unit/API tests, but confirms nothing broke).

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/css/tokens.css nbi_project_dashboard.html
git commit -m "refactor: extract design tokens and theme CSS to tokens.css"
```

---

## Task 3: Extract `layout.css`

**Files:**
- Create: `dashboard-server/public/css/layout.css`
- Modify: `nbi_project_dashboard.html`

Covers: Header (198-204), Theme picker (205-216), Buttons (217-227), Layout (228-263), Main content (264-273).

- [ ] **Step 1: Copy CSS lines 198-273 to layout.css**

Extract from `/* ===== HEADER ===== */` through the end of `/* ===== MAIN CONTENT ===== */` section. Note: after Task 2, these line numbers have shifted because tokens were removed. Use the section header comments as anchors, not absolute line numbers.

- [ ] **Step 2: Add `<link>` tag and remove extracted CSS**

Add after the tokens.css link:
```html
<link rel="stylesheet" href="/public/css/layout.css">
```

Delete the extracted lines from the inline `<style>`.

- [ ] **Step 3: Verify in staging browser**

```bash
pm2 restart nbi-dashboard-staging
```

Check: header renders correctly, sidebar layout works, main content area fills correctly, buttons style properly.

- [ ] **Step 4: Run tests**

```bash
cd dashboard-server && npx vitest --run
```

Expected: 186 pass.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/css/layout.css nbi_project_dashboard.html
git commit -m "refactor: extract layout CSS (header, buttons, grid) to layout.css"
```

---

## Task 4: Extract `components.css`

**Files:**
- Create: `dashboard-server/public/css/components.css`
- Modify: `nbi_project_dashboard.html`

Covers scattered component sections. These are **not contiguous** in the monolith -- gather them from multiple locations using section header comments as anchors:

- Badges (starting at `/* ===== BADGES ===== */`)
- Filter bar (`/* ===== FILTER BAR ===== */`)
- Multi-select filter (`/* ===== MULTI-SELECT FILTER ===== */`)
- Toast, hover item, spinner, skeleton (`/* ===== TOAST ===== */` through skeleton placeholders)
- Sync status indicator (`/* ===== SYNC STATUS INDICATOR ===== */`)
- Empty state (`/* ===== EMPTY STATE ===== */`)
- Attachment rows (`/* ===== ATTACHMENT ROWS ===== */`)
- Login screen (`/* ===== LOGIN SCREEN ===== */`)
- Manage clients (`/* ===== MANAGE CLIENTS ===== */`)
- Modal width tokens (`/* ===== MODAL WIDTH TOKENS ===== */`)
- Confirmation dialog (`/* ===== THEMED CONFIRMATION DIALOG ===== */`)
- Form validation (`/* ===== FORM VALIDATION ===== */`)
- Sync pending (`/* ===== SYNC PENDING STATE ===== */`)

- [ ] **Step 1: Copy all component CSS sections to components.css**

Collect each section by finding its header comment and copying until the next section header. Order them logically in the output file (buttons/badges first, then forms, then modals, then indicators).

- [ ] **Step 2: Add `<link>` tag and remove extracted CSS**

Add after layout.css link:
```html
<link rel="stylesheet" href="/public/css/components.css">
```

Delete all extracted sections from inline `<style>`.

- [ ] **Step 3: Verify in staging browser**

```bash
pm2 restart nbi-dashboard-staging
```

Check: badges render, toast notifications appear, confirmation dialogs work, filter dropdowns open, login screen styles correctly, sync indicator shows, empty states display.

- [ ] **Step 4: Run tests**

```bash
cd dashboard-server && npx vitest --run
```

Expected: 186 pass.

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/public/css/components.css nbi_project_dashboard.html
git commit -m "refactor: extract shared component CSS (badges, toast, modals, filters) to components.css"
```

---

## Task 5: Extract View CSS Files

**Files:**
- Create: `dashboard-server/public/css/views/dashboard.css`
- Create: `dashboard-server/public/css/views/tasks.css`
- Create: `dashboard-server/public/css/views/leads.css`
- Create: `dashboard-server/public/css/views/expenses.css`
- Create: `dashboard-server/public/css/views/bugs.css`
- Create: `dashboard-server/public/css/views/hiring.css`
- Create: `dashboard-server/public/css/views/clients.css`
- Create: `dashboard-server/public/css/views/settings.css`
- Create: `dashboard-server/public/css/views/reports.css`
- Create: `dashboard-server/public/css/views/sidebar.css`
- Create: `dashboard-server/public/css/views/people.css`
- Create: `dashboard-server/public/css/views/finances.css`
- Create: `dashboard-server/public/css/views/news.css`
- Create: `dashboard-server/public/css/print.css`
- Modify: `nbi_project_dashboard.html`

Each view CSS file contains only the styles for that view. Use the CSS section-to-file mapping table above.

- [ ] **Step 1: Create each view CSS file**

For each file in the mapping table above, find the source CSS sections by their header comments and copy them to the target file. Key examples:

**dashboard.css** contains: KPI cards, Tactical dashboard, Portfolio v3, Chart cards, Project progress.

**tasks.css** contains: Task list, Tasks master-detail layout, Detail panel (inline + overlay), Task sub-view toggle, Kanban board, Gantt timeline, Calendar view.

**sidebar.css** contains: Warnings & alerts sidebar.

**news.css** contains: News admin badges (only ~6 lines: `.news-admin-badge` and variants).

**print.css** contains: Print styles (all `@media print` rules).

- [ ] **Step 2: Add all `<link>` tags and remove all extracted CSS**

Add these after the components.css link, in this order:

```html
<link rel="stylesheet" href="/public/css/views/dashboard.css">
<link rel="stylesheet" href="/public/css/views/tasks.css">
<link rel="stylesheet" href="/public/css/views/leads.css">
<link rel="stylesheet" href="/public/css/views/expenses.css">
<link rel="stylesheet" href="/public/css/views/bugs.css">
<link rel="stylesheet" href="/public/css/views/hiring.css">
<link rel="stylesheet" href="/public/css/views/clients.css">
<link rel="stylesheet" href="/public/css/views/settings.css">
<link rel="stylesheet" href="/public/css/views/reports.css">
<link rel="stylesheet" href="/public/css/views/sidebar.css">
<link rel="stylesheet" href="/public/css/views/people.css">
<link rel="stylesheet" href="/public/css/views/finances.css">
<link rel="stylesheet" href="/public/css/views/news.css">
<link rel="stylesheet" href="/public/css/print.css">
```

Delete all extracted CSS from the inline `<style>` block. After this, the entire `<style>...</style>` block should be gone.

- [ ] **Step 3: Verify no inline `<style>` remains**

```bash
grep -c '<style>' nbi_project_dashboard.html
```

Expected: 0 (or only if there are inline styles on elements, but the `<style>` block should be removed).

- [ ] **Step 4: Add `mobile.css` as the last CSS file**

Create `dashboard-server/public/css/mobile.css` containing: Mobile & tablet, Touch target overrides, Mobile header restructure, Finance table mobile overflow.

Add as the last `<link>` (after print.css):
```html
<link rel="stylesheet" href="/public/css/mobile.css">
```

Mobile CSS must be last because its `@media` rules override other files.

- [ ] **Step 5: Verify every view in staging browser**

```bash
pm2 restart nbi-dashboard-staging
```

Check each view systematically:
- Dashboard (dark theme and light theme)
- Tasks (list, board, gantt, calendar sub-views)
- Leads
- Expenses
- Bugs
- Hiring
- People
- Finances
- Reports
- Settings
- News
- Sidebar warnings panel
- Login screen
- Mobile viewport (resize browser or use devtools)
- Print preview (Ctrl+P)

- [ ] **Step 6: Run tests**

```bash
cd dashboard-server && npx vitest --run
```

Expected: 186 pass.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/public/css/ nbi_project_dashboard.html
git commit -m "refactor: extract all view CSS to separate files, remove inline style block"
```

---

## Task 6: Convert Inline HTML Event Handlers

**Files:**
- Modify: `nbi_project_dashboard.html`

The static HTML has inline `on*=` handlers that must work after JS moves to ES modules. There are 4 in static markup:

1. `onsubmit="handleLogin(event)"` (line 2212)
2. `onsubmit="submitPasswordReset(event)"` (line 2237)
3. `onchange="document.getElementById('loginPass').type=..."` (line 2218 -- show password toggle)
4. `onchange="toggleBlockerType('internal')"` and `onchange="toggleBlockerType('external')"` (lines 2392-2393)

- [ ] **Step 1: Convert login form to data-action**

Replace:
```html
<form id="loginForm" onsubmit="handleLogin(event)">
```
With:
```html
<form id="loginForm">
```

The form submission will be handled via a managed listener in `state.js` (added during core JS extraction):
```js
document.getElementById('loginForm').addEventListener('submit', handleLogin);
```

- [ ] **Step 2: Convert reset form to data-action**

Replace:
```html
<form id="resetForm" onsubmit="submitPasswordReset(event)">
```
With:
```html
<form id="resetForm">
```

Similarly handled via managed listener in `state.js`:
```js
document.getElementById('resetForm').addEventListener('submit', submitPasswordReset);
```

- [ ] **Step 3: Convert show-password checkbox**

Replace:
```html
<input type="checkbox" onchange="document.getElementById('loginPass').type=this.checked?'text':'password'">
```
With:
```html
<input type="checkbox" id="showPasswordToggle">
```

Listener added in `state.js`:
```js
document.getElementById('showPasswordToggle')?.addEventListener('change', function() {
  document.getElementById('loginPass').type = this.checked ? 'text' : 'password';
});
```

- [ ] **Step 4: Convert blocker type checkboxes**

Replace:
```html
<input type="checkbox" id="blockerInternalChk" onchange="toggleBlockerType('internal')">
```
With:
```html
<input type="checkbox" id="blockerInternalChk" data-action="toggleBlockerType" data-arg0="internal">
```

And:
```html
<input type="checkbox" id="blockerExternalChk" onchange="toggleBlockerType('external')">
```
With:
```html
<input type="checkbox" id="blockerExternalChk" data-action="toggleBlockerType" data-arg0="external">
```

**Important:** The event delegation handler (line 2479) only listens for `click` events. `data-action` on a checkbox triggers on click (which fires before change), so this works. But verify that `toggleBlockerType` doesn't depend on the checkbox being checked/unchecked at the time it runs. If it reads `this.checked`, it will need to be adjusted to read `el.checked` (the checkbox is the clicked element).

Check the function:
```bash
grep -A5 'function toggleBlockerType' nbi_project_dashboard.html
```

If it references `this.checked`, the function needs updating to use `document.getElementById('blocker' + capitalize(which) + 'Chk').checked`.

- [ ] **Step 5: Verify no static-HTML inline handlers remain**

```bash
grep -n 'onsubmit=\|onclick=\|onchange=\|oninput=\|onfocus=\|onblur=' nbi_project_dashboard.html | grep -v '<script' | head -20
```

The only results should be `onkeydown=` handlers on menu items (lines 2278-2282, 2297-2300) which are keyboard-accessibility shims. These are acceptable to leave as-is since they are simple `this.click()` delegations. However, if any `onchange=` or `onsubmit=` remains in static markup, convert it now.

**Note:** There are ~170 inline handlers in JS-generated HTML (inside template strings in `<script>`). These do NOT need conversion now -- they will be handled when each view module is extracted (Phase 3), because the functions they call will be on `window` via the `window.fnName = fnName` pattern.

- [ ] **Step 6: Test login flow end-to-end in staging**

```bash
pm2 restart nbi-dashboard-staging
```

Test in browser:
1. Load `http://localhost:8887` -- login screen should appear
2. Enter credentials `glen` / `staging2026` -- should log in successfully
3. Log out, try `http://localhost:8887/#reset-password/test` -- reset screen should appear
4. Open blocker modal on a task -- internal/external checkboxes should toggle correctly

- [ ] **Step 7: Run tests**

```bash
cd dashboard-server && npx vitest --run
```

Expected: 186 pass.

- [ ] **Step 8: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "refactor: convert inline HTML event handlers to data-action or managed listeners"
```

---

## Task 7: Extract `events.js` (Core Module 1/5)

**Files:**
- Create: `dashboard-server/public/js/core/events.js`
- Modify: `nbi_project_dashboard.html`

`events.js` is the lowest-level core module -- it has no imports from other core modules. It contains the listener registry and event delegation framework only.

- [ ] **Step 1: Create events.js**

```js
// Listener registry
const _listenerRegistry = [];

export function addManagedListener(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  _listenerRegistry.push({ target, event, handler, options });
}

export function cleanupListeners() {
  _listenerRegistry.forEach(({ target, event, handler, options }) => {
    target.removeEventListener(event, handler, options);
  });
  _listenerRegistry.length = 0;
}

// Event delegation
const _BOOL = { 'true': true, 'false': false, 'null': null };
document.addEventListener('click', function(e) {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  if (el.hasAttribute('data-stop')) e.stopPropagation();
  if (el.hasAttribute('data-prevent')) e.preventDefault();
  const action = el.dataset.action;
  const fn = window[action];
  if (typeof fn !== 'function') return;
  const args = [];
  if (el.hasAttribute('data-pass-event')) args.push(e);
  for (let i = 0; el.dataset['arg' + i] !== undefined; i++) {
    const v = el.dataset['arg' + i];
    args.push(v in _BOOL ? _BOOL[v] : v);
  }
  if (el.hasAttribute('data-pass-el')) args.push(el);
  fn.apply(null, args);
});
```

Also register on `window` for backward compatibility during migration:
```js
window.addManagedListener = addManagedListener;
window.cleanupListeners = cleanupListeners;
```

- [ ] **Step 2: Remove extracted code from monolith**

In `nbi_project_dashboard.html`, delete the LISTENER REGISTRY section (lines 2462-2475) and EVENT DELEGATION framework (lines 2477-2495, the `_BOOL` const and click handler only -- NOT the `_act*` wrappers that follow).

- [ ] **Step 3: Add module script tag to HTML**

Add before the existing `<script>` tag:
```html
<script type="module" src="/public/js/core/events.js"></script>
```

**Important:** The existing `<script>` (non-module) still contains all other code. The module loads and executes its delegation handler. Since ES modules are deferred, the delegation handler registers after the inline script runs, but this is fine -- the click handler just needs to exist before any user clicks happen, and the DOM isn't interactive until after all scripts load.

- [ ] **Step 4: Verify delegation still works in staging**

```bash
pm2 restart nbi-dashboard-staging
```

Test: Log in, click sidebar items (uses `data-action="switchView"`), click "New" button (uses `data-action="addTask"`), click theme picker. All `data-action` bindings should work.

- [ ] **Step 5: Run tests**

```bash
cd dashboard-server && npx vitest --run
```

Expected: 186 pass.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/public/js/core/events.js nbi_project_dashboard.html
git commit -m "refactor: extract event delegation and listener registry to events.js"
```

---

## Task 8: Extract `helpers.js` (Core Module 2/5)

**Files:**
- Create: `dashboard-server/public/js/core/helpers.js`
- Modify: `nbi_project_dashboard.html`

`helpers.js` contains pure utility functions used across 5+ view modules. These are currently scattered across the monolith. The implementer must grep for each function to find its current location.

- [ ] **Step 1: Identify all helper functions and their current locations**

Run these greps to locate each function:

```bash
grep -n '^function esc(' nbi_project_dashboard.html
grep -n '^function escAttrJs(' nbi_project_dashboard.html
grep -n '^function safeUrl(' nbi_project_dashboard.html
grep -n '^function safeParseDate(' nbi_project_dashboard.html
grep -n '^function fmtMoney(' nbi_project_dashboard.html
grep -n '^function currencySym(' nbi_project_dashboard.html
grep -n '^function hasPageAccess(' nbi_project_dashboard.html
grep -n '^function emptyState(' nbi_project_dashboard.html
grep -n '^function getChildren(' nbi_project_dashboard.html
grep -n '^function getRootTasks(' nbi_project_dashboard.html
grep -n '^function getDescendants(' nbi_project_dashboard.html
grep -n '^function getRootAncestor(' nbi_project_dashboard.html
grep -n '^function getTaskClient(' nbi_project_dashboard.html
grep -n '^function clientGroupKey(' nbi_project_dashboard.html
grep -n '^function clientPrefix(' nbi_project_dashboard.html
grep -n '^function clientBadgeHtml(' nbi_project_dashboard.html
grep -n '^function getTaskPractice(' nbi_project_dashboard.html
grep -n '^function countByHealth(' nbi_project_dashboard.html
grep -n '^function getAllClients(' nbi_project_dashboard.html
grep -n '^function isTaskIncomplete(' nbi_project_dashboard.html
grep -n '^function getItemType(' nbi_project_dashboard.html
grep -n '^function itemTypeBadgeHtml(' nbi_project_dashboard.html
grep -n '^function aggHours(' nbi_project_dashboard.html
grep -n '^function getContractedClients(' nbi_project_dashboard.html
grep -n '^function getContractedClientRecords(' nbi_project_dashboard.html
grep -n '^function getFilteredTasks(' nbi_project_dashboard.html
grep -n '^function healthBadgeHtml(' nbi_project_dashboard.html
grep -n '^function priorityBadgeHtml(' nbi_project_dashboard.html
grep -n '^function pushUndo(' nbi_project_dashboard.html
grep -n '^function multiSelectChanged(' nbi_project_dashboard.html
grep -n '^function multiSelectAll(' nbi_project_dashboard.html
grep -n '^function assigneeSelectHtml(' nbi_project_dashboard.html
```

- [ ] **Step 2: Create helpers.js with all identified functions**

Create `dashboard-server/public/js/core/helpers.js`. The file imports shared state it needs to read:

```js
import { tasks, settings, currentFilter, _currentUser, _apiClientsCache, _pagePermissions, _cachedTeamMembers } from './state.js';
```

**Wait -- `state.js` doesn't exist yet.** During this transitional phase, helpers reads these from `window` since the monolith's inline script puts them on `window` implicitly (they're global variables). Once `state.js` is extracted in the next task, update the import.

For now, read state from `window`:
```js
// Transitional: read shared state from window until state.js is extracted
function _st(name) { return window[name]; }
```

Then define every helper function, exporting it and also putting it on `window`:

```js
export function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
window.esc = esc;
```

Repeat for every function identified in Step 1. Copy the exact implementation from the monolith -- do not rewrite or refactor.

For functions that read global state (like `getFilteredTasks` which reads `tasks` and `currentFilter`), replace direct variable references with `_st('tasks')` and `_st('currentFilter')` temporarily.

- [ ] **Step 3: Remove extracted functions from monolith**

Delete each extracted function from `nbi_project_dashboard.html`. Use `grep -n` to find exact line numbers, then remove each function body.

**Critical check:** After removing each function, verify it's on `window` by searching for any direct calls. Since every function is `window.fnName = fnName`, the existing code (which calls them without `window.` prefix) still resolves them as globals.

- [ ] **Step 4: Add script tag**

Add before the existing `<script>`:
```html
<script type="module" src="/public/js/core/helpers.js"></script>
```

- [ ] **Step 5: Verify in staging browser**

```bash
pm2 restart nbi-dashboard-staging
```

Test: Log in, navigate to tasks view (exercises `getFilteredTasks`, `esc`, `healthBadgeHtml`, `priorityBadgeHtml`), open a task detail (exercises `safeParseDate`), go to leads (exercises `fmtMoney`, `currencySym`), go to settings (exercises `hasPageAccess`).

- [ ] **Step 6: Run tests**

```bash
cd dashboard-server && npx vitest --run
```

Expected: 186 pass.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/public/js/core/helpers.js nbi_project_dashboard.html
git commit -m "refactor: extract helper utilities (esc, badges, task tree, filters) to helpers.js"
```

---

## Task 9: Extract `ui.js` (Core Module 3/5)

**Files:**
- Create: `dashboard-server/public/js/core/ui.js`
- Modify: `nbi_project_dashboard.html`

Contains: `toast()`, `themedConfirm()`, focus trap, `withButtonLoading()`, form validation, textarea auto-resize.

- [ ] **Step 1: Create ui.js**

```js
import { esc } from './helpers.js';
```

Copy these sections from the monolith:
- TOAST NOTIFICATIONS (starting at `/* ===== TOAST ===== */` comment in JS)
- THEMED CONFIRMATION DIALOG
- FOCUS TRAP (ACCESSIBILITY)
- ASYNC BUTTON HELPER
- INLINE FORM VALIDATION
- TEXTAREA AUTO-RESIZE FALLBACK

Export and register on `window`:
```js
export function toast(msg, type) { /* exact copy from monolith */ }
window.toast = toast;

export function themedConfirm(opts) { /* exact copy from monolith */ }
window.themedConfirm = themedConfirm;

export function _trapFocus(container) { /* exact copy */ }
window._trapFocus = _trapFocus;

export function _releaseFocusTrap(container) { /* exact copy */ }
window._releaseFocusTrap = _releaseFocusTrap;

export function _activateDynamicModal(el) { /* exact copy */ }
window._activateDynamicModal = _activateDynamicModal;

export function withButtonLoading(btn, asyncFn) { /* exact copy */ }
window.withButtonLoading = withButtonLoading;

export function showFieldError(inputEl, msg) { /* exact copy */ }
window.showFieldError = showFieldError;

export function clearFieldErrors(container) { /* exact copy */ }
window.clearFieldErrors = clearFieldErrors;
```

- [ ] **Step 2: Remove extracted sections from monolith**

Delete the TOAST NOTIFICATIONS, THEMED CONFIRMATION DIALOG, FOCUS TRAP, ASYNC BUTTON HELPER, INLINE FORM VALIDATION, and TEXTAREA AUTO-RESIZE FALLBACK sections from the monolith.

- [ ] **Step 3: Add script tag**

Add after helpers.js:
```html
<script type="module" src="/public/js/core/ui.js"></script>
```

- [ ] **Step 4: Verify in staging**

```bash
pm2 restart nbi-dashboard-staging
```

Test: Trigger a toast (edit a task and save), trigger a confirm dialog (delete a task), check focus trap (open detail panel, tab through it), check form validation (submit empty bug report form).

- [ ] **Step 5: Run tests**

```bash
cd dashboard-server && npx vitest --run
```

Expected: 186 pass.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/public/js/core/ui.js nbi_project_dashboard.html
git commit -m "refactor: extract UI components (toast, confirm, focus trap, validation) to ui.js"
```

---

## Task 10: Extract `state.js` (Core Module 4/5)

**Files:**
- Create: `dashboard-server/public/js/core/state.js`
- Modify: `dashboard-server/public/js/core/helpers.js` (update `_st()` references to real imports)
- Modify: `nbi_project_dashboard.html`

This is the most coupled extraction. `state.js` contains the sync engine, auth, IndexedDB WAL, and init.

**Key constraint:** ES modules are deferred -- they execute AFTER the inline `<script>` parses. The inline script's state variable declarations (`let tasks = []`, `let settings = {}`, etc.) are needed at parse time by the remaining inline code. Therefore, this task extracts **functions only**, not variable declarations. State variables stay in the inline script during transition and move to `state.js` in Task 25 when the inline script is fully emptied.

During transition, `state.js` functions access shared state via bare names (which resolve to globals in the inline script's scope) or `window.` references.

- [ ] **Step 1: Create state.js with state functions only**

Copy these function groups from the monolith into `state.js`:

- Auth functions: `isClientUser()`, `isClientAdmin()`, `showLoginScreen()`, `showApp()`, `checkForcePasswordChange()`, `handleLogin()`, `submitPasswordReset()`, `checkHashForReset()`, `sendPasswordResetEmail()`, `backToLogin()`
- Persistence: `markDirty()`, `save()`, `authFetch()`, `apiCall()`, `syncToAPI()`, `load()`
- IndexedDB WAL: `openIDB()`, `idbPut()`, `idbClear()`, `replayWAL()`
- Sync engine: `loadTeamMembers()`, `loadPagePermissions()`, `loadBugReports()`, `loadAllTeams()`, `loadAllSows()`, `restartPollingIntervals()`, `pollForChanges()`
- Init: the `init()` function (currently an IIFE at line 19068 -- convert to a named exported function)

Each function reads/writes global variables via `window.` or bare names (which resolve to globals since modules have their own scope).

**For each function, register on `window`:**
```js
export async function handleLogin(e) { /* exact copy */ }
window.handleLogin = handleLogin;
```

Also set up the form listeners that were converted in Task 6:
```js
document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
document.getElementById('resetForm')?.addEventListener('submit', submitPasswordReset);
document.getElementById('showPasswordToggle')?.addEventListener('change', function() {
  document.getElementById('loginPass').type = this.checked ? 'text' : 'password';
});
```

The `init()` function is exported and called from `app.js` later. For now, during the transition, call it at the end of `state.js`:

```js
export async function init() {
  // exact copy of the IIFE body from line 19068
}

// Self-invoke during transition (removed when app.js takes over)
init();
```

- [ ] **Step 2: Remove extracted functions from monolith**

Delete all the functions listed above from the inline script. Also delete the init IIFE at line 19068-19107.

**Do NOT delete the state variable declarations** (lines 2622-3397). They stay in the inline script for now.

- [ ] **Step 3: Update helpers.js**

Remove the `_st()` transitional helper if it was used. Since state variables are still on `window`, helpers can reference them as bare names (they'll resolve from the module's perspective as... wait, no. ES modules have their own scope. `tasks` inside helpers.js won't resolve to the global `tasks` variable. It needs `window.tasks`.)

Update `helpers.js` to reference `window.tasks`, `window.settings`, etc. wherever it reads shared state. Or add this at the top of helpers.js:

```js
// Transitional: access shared state from window until state.js owns declarations
const _w = (name) => window[name];
```

And use `_w('tasks')` or just `window.tasks` directly. Choose the approach that makes the code clearest to read.

- [ ] **Step 4: Add script tag**

Add after events.js, before helpers.js:
```html
<script type="module" src="/public/js/core/state.js"></script>
```

Order is now: events.js, state.js, helpers.js, ui.js.

- [ ] **Step 5: Verify login, data load, and sync in staging**

```bash
pm2 restart nbi-dashboard-staging
```

Test:
1. Load page -- should show login screen
2. Log in as `glen` / `staging2026` -- should load data and render dashboard
3. Edit a task title and save -- sync indicator should appear, change should persist
4. Log out and back in -- changes should still be there
5. Open another browser tab -- poll sync should keep them in sync

- [ ] **Step 6: Run tests**

```bash
cd dashboard-server && npx vitest --run
```

Expected: 186 pass.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/public/js/core/state.js dashboard-server/public/js/core/helpers.js nbi_project_dashboard.html
git commit -m "refactor: extract auth, sync engine, and persistence to state.js"
```

---

## Task 11: Extract `router.js` (Core Module 5/5)

**Files:**
- Create: `dashboard-server/public/js/core/router.js`
- Modify: `nbi_project_dashboard.html`

Contains: `switchView()`, `renderContent()`, `renderAll()`, `renderBreadcrumbs()`, `renderTabs()`, view registry, shell callback registry.

- [ ] **Step 1: Create router.js**

```js
// View registry -- views register themselves on import
const viewRenderers = {};
export function registerView(name, renderFn) {
  viewRenderers[name] = renderFn;
}
window.registerView = registerView;

// Shell callback registry -- sidebar registers itself here to avoid circular import
const shellCallbacks = {};
export function registerShellCallback(name, fn) {
  shellCallbacks[name] = fn;
}
window.registerShellCallback = registerShellCallback;

export function switchView(view) {
  // exact copy from monolith, but _renderMainContent uses the registry:
  // replace the switch/if chain with: viewRenderers[currentView]?.(content)
  window.currentView = view;
  renderContent();
}
window.switchView = switchView;

export function renderContent() { /* exact copy */ }
window.renderContent = renderContent;

export function renderAll() {
  // exact copy, but replace renderSidebar() call with:
  shellCallbacks.sidebar?.();
  renderTabs();
  renderContent();
}
window.renderAll = renderAll;

export function renderTabs() { /* exact copy */ }
window.renderTabs = renderTabs;

export function renderBreadcrumbs() { /* exact copy */ }
window.renderBreadcrumbs = renderBreadcrumbs;

function _renderMainContent(content) {
  const renderer = viewRenderers[window.currentView];
  if (renderer) {
    renderer(content);
  }
}
```

**Critical:** The `_renderMainContent` function currently has an `if/else` chain with 13+ branches. Replace it with the registry lookup. But during transition, the view modules haven't registered yet, so add a fallback that calls `window['render' + capitalise(currentView) + 'View']` or similar. Or simpler: keep the `if/else` chain as a fallback for any view that hasn't registered yet:

```js
function _renderMainContent(content) {
  const renderer = viewRenderers[window.currentView];
  if (renderer) {
    renderer(content);
    return;
  }
  // Fallback for views not yet extracted to modules
  const fallback = window['_renderMainContent_fallback'];
  if (typeof fallback === 'function') fallback(content);
}
```

In the monolith's inline script, rename the old `_renderMainContent` to `_renderMainContent_fallback` so unextracted views still work.

- [ ] **Step 2: Remove extracted functions from monolith**

Delete `switchView`, `renderContent`, `renderAll`, `renderTabs`, `renderBreadcrumbs` from the inline script. Rename the remaining `_renderMainContent` to `_renderMainContent_fallback`.

Also move `renderSidebarCounts` to where sidebar.js will pick it up (for now, leave it in the inline script since sidebar.js isn't extracted yet).

- [ ] **Step 3: Add script tag**

Add after ui.js:
```html
<script type="module" src="/public/js/core/router.js"></script>
```

- [ ] **Step 4: Verify navigation in staging**

```bash
pm2 restart nbi-dashboard-staging
```

Test every sidebar item: Dashboard, Tasks, Leads, Expenses, Bugs, Hiring, People, Finances, Reports, Settings, News. Each should render correctly via the fallback chain.

- [ ] **Step 5: Run tests**

```bash
cd dashboard-server && npx vitest --run
```

Expected: 186 pass.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/public/js/core/router.js nbi_project_dashboard.html
git commit -m "refactor: extract router with view registry and shell callbacks to router.js"
```

---

## Task 12: Extract `themes.js` (View Module 1/13)

**Files:**
- Create: `dashboard-server/public/js/views/themes.js`
- Modify: `nbi_project_dashboard.html`

Themes is the simplest module (~4 functions, fully self-contained). This is the first view extraction and validates the entire module pattern.

- [ ] **Step 1: Find all theme functions**

```bash
grep -n 'function.*[Tt]heme' nbi_project_dashboard.html
```

Expected functions: `applyTheme()`, `toggleThemeDropdown()`, `selectTheme()`, `renderThemeDropdown()` (or similar names -- verify from grep output).

- [ ] **Step 2: Create themes.js**

```js
// Copy all theme functions from the THEMES section (line 18928+)
// Export and register on window

export function applyTheme(name) { /* exact copy */ }
window.applyTheme = applyTheme;

export function toggleThemeDropdown(e) { /* exact copy */ }
window.toggleThemeDropdown = toggleThemeDropdown;

// ... etc for all theme functions
```

Themes reads the current theme from localStorage and applies to `<html data-theme="...">`. No imports from other modules needed.

- [ ] **Step 3: Remove theme functions from monolith**

Delete the THEMES section from the inline script.

- [ ] **Step 4: Add script tag**

Add after router.js:
```html
<script type="module" src="/public/js/views/themes.js"></script>
```

- [ ] **Step 5: Verify all 7 themes in staging**

```bash
pm2 restart nbi-dashboard-staging
```

Click the theme picker. Switch between all 7 themes. Verify each applies correctly. Refresh the page -- the chosen theme should persist.

- [ ] **Step 6: Run tests and commit**

```bash
cd dashboard-server && npx vitest --run
git add dashboard-server/public/js/views/themes.js nbi_project_dashboard.html
git commit -m "refactor: extract themes to themes.js module"
```

---

## Task 13: Extract `finances.js` (View Module 2/13)

**Files:**
- Create: `dashboard-server/public/js/views/finances.js`
- Modify: `nbi_project_dashboard.html`

~12 functions. No cross-view dependencies. Clean boundary.

- [ ] **Step 1: Find all finance functions**

```bash
grep -n '^function.*[Ff]inance\|^function.*fmtMoney\|^function.*currencySym\|^async function.*[Ff]inance\|^function.*FX\|^function.*fx' nbi_project_dashboard.html
```

Also search the FINANCES VIEW section header to find its boundaries.

- [ ] **Step 2: Create finances.js**

Copy all functions from the FINANCES VIEW section. Note: `fmtMoney` and `currencySym` were already extracted to `helpers.js` in Task 8. Import them if needed, or verify they're on `window`.

Register the view:
```js
import { registerView } from '../core/router.js';

// ... all finance functions, exported and registered on window ...

registerView('finances', renderFinancesView);
```

- [ ] **Step 3: Remove from monolith, add script tag, verify, test, commit**

Follow the same pattern as Task 12. Verify: navigate to Finances view, check FX rate display, check editable finance rows, check P&L sections.

```bash
git commit -m "refactor: extract finances view to finances.js module"
```

---

## Task 14: Extract `bugs.js` (View Module 3/13)

**Files:**
- Create: `dashboard-server/public/js/views/bugs.js`
- Modify: `nbi_project_dashboard.html`

~25 functions. Calls only core functions. Very clean boundary.

- [ ] **Step 1: Find all bug functions**

```bash
grep -n '^function.*[Bb]ug\|^async function.*[Bb]ug\|^function.*openBugDetail\|^function.*submitBugReport\|^function.*openBugReportModal\|^function.*loadBugReports' nbi_project_dashboard.html
```

- [ ] **Step 2: Create bugs.js**

Copy all functions from the BUG / FEATURE REPORTS section. Import core functions as needed. Register the view:

```js
import { registerView } from '../core/router.js';

registerView('bugs', renderBugView);
```

- [ ] **Step 3: Remove from monolith, add script tag, verify, test, commit**

Verify: navigate to bug tracker, open a bug detail, submit a new bug report, filter bugs.

```bash
git commit -m "refactor: extract bug tracker to bugs.js module"
```

---

## Task 15: Extract `hiring.js` (View Module 4/13)

**Files:**
- Create: `dashboard-server/public/js/views/hiring.js`
- Modify: `nbi_project_dashboard.html`

~27 functions. Clean boundary.

- [ ] **Step 1-3: Same pattern as previous view extractions**

Source: HIRING section.

Verify: navigate to hiring view, open candidate detail, filter candidates, add new candidate.

```bash
git commit -m "refactor: extract hiring view to hiring.js module"
```

---

## Task 16: Extract `people.js` (View Module 5/13)

**Files:**
- Create: `dashboard-server/public/js/views/people.js`
- Modify: `nbi_project_dashboard.html`

~5 functions + calendar sub-view. Small, read-only view.

- [ ] **Step 1-3: Same pattern**

Source: PEOPLE VIEW section.

Verify: navigate to people view, check calendar sub-view, check team member display.

```bash
git commit -m "refactor: extract people view to people.js module"
```

---

## Task 17: Extract `reports.js` (View Module 6/13)

**Files:**
- Create: `dashboard-server/public/js/views/reports.js`
- Modify: `nbi_project_dashboard.html`

~2 functions. Small, read-only view.

- [ ] **Step 1-3: Same pattern**

Source: REPORT VIEW section. Registers views: `report`, `workload`.

Verify: navigate to reports, check portfolio cards, workload bars, detailed project table, client summary.

```bash
git commit -m "refactor: extract report view to reports.js module"
```

---

## Task 18: Extract `expenses.js` (View Module 7/13)

**Files:**
- Create: `dashboard-server/public/js/views/expenses.js`
- Modify: `nbi_project_dashboard.html`

~40 functions. Bundles 3 sections: EXPENSE REPORTS + INDIVIDUAL EXPENSE DETAIL + REPORT DETAIL PANEL.

- [ ] **Step 1: Find all expense functions**

```bash
grep -n '^function.*[Ee]xpense\|^async function.*[Ee]xpense\|^function.*renderExpense\|^function.*openExpense\|^function.*submitExpense' nbi_project_dashboard.html
```

- [ ] **Step 2: Create expenses.js bundling all 3 sections**

```js
import { registerView } from '../core/router.js';

// ... all expense report functions ...
// ... all individual expense detail functions ...
// ... all report detail panel functions ...

registerView('expenses', renderExpensesView);
```

- [ ] **Step 3: Remove from monolith, verify, test, commit**

Verify: navigate to expenses, open an expense report, view individual expenses, check detail panel.

```bash
git commit -m "refactor: extract expense reports (3 sections) to expenses.js module"
```

---

## Task 19: Extract `sidebar.js` (View Module 8/13)

**Files:**
- Create: `dashboard-server/public/js/views/sidebar.js`
- Modify: `nbi_project_dashboard.html`

Bundles: SIDEBAR NAVIGATION + SIDEBAR COLLAPSE & MOBILE + WARNINGS & ALERTS SIDEBAR + MOBILE HEADER OVERFLOW MENU + MOBILE SIDEBAR KEYBOARD HANDLING.

- [ ] **Step 1: Find all sidebar and warning functions**

```bash
grep -n '^function.*[Ss]idebar\|^function.*[Ww]arn\|^function.*[Aa]lert\|^function.*renderSidebar\|^function.*toggleMobileSidebar\|^function.*toggleSidebarCollapse\|^function.*toggleWarnAlert\|^function.*switchWarnAlert\|^function.*updateWarnAlert\|^function.*renderNotifications\|^function.*toggleHeaderOverflow\|^function.*overflow' nbi_project_dashboard.html
```

- [ ] **Step 2: Create sidebar.js**

```js
import { registerShellCallback } from '../core/router.js';

// ... all sidebar functions ...
// ... all warnings & alerts functions ...
// ... mobile overflow menu functions ...

export function renderSidebar() { /* exact copy */ }
window.renderSidebar = renderSidebar;

export function renderSidebarCounts() { /* exact copy */ }
window.renderSidebarCounts = renderSidebarCounts;

// Register with router via shell callback (no circular dependency)
registerShellCallback('sidebar', renderSidebar);
```

- [ ] **Step 3: Remove from monolith, verify, test, commit**

Verify: sidebar renders, nav items switch views, collapse/expand works, mobile sidebar works, warnings panel opens/closes, notification count badge updates.

```bash
git commit -m "refactor: extract sidebar, warnings, and mobile overflow to sidebar.js module"
```

---

## Task 20: Extract `news.js` (View Module 9/13)

**Files:**
- Create: `dashboard-server/public/js/views/news.js`
- Modify: `nbi_project_dashboard.html`

The news module is already semi-separate. It has its own state (`_newsState`), its own API client (`newsApi`), its own escape function (`newsEsc`), and its own templates.

- [ ] **Step 1: Find all news functions**

```bash
grep -n '^function.*[Nn]ews\|^async function.*[Nn]ews\|^const newsApi\|^let _newsState\|^let _newsModuleLoaded\|^const newsTemplates' nbi_project_dashboard.html
```

- [ ] **Step 2: Create news.js**

Copy the entire NEWS ADMIN section and the NEWS AGGREGATOR MODULE section into one file. This includes `newsApi`, `_newsState`, `_newsModuleLoaded`, `newsTemplates`, `newsEsc`, `newsFormatDate`, `newsDigestTitle`, `renderNewsView`, `renderNewsOrLoad`, `loadNewsModule`, `renderNewsSearchView`, `executeNewsSearch`, and all news admin functions.

```js
import { registerView } from '../core/router.js';

// ... all news code ...

registerView('news', renderNewsOrLoad);
```

- [ ] **Step 3: Remove from monolith, verify, test, commit**

Verify: navigate to news tab, check digest loads, check archive, check search, check news admin panels.

```bash
git commit -m "refactor: extract news module (digest, search, admin) to news.js"
```

---

## Task 21: Extract `dashboard.js` (View Module 10/13)

**Files:**
- Create: `dashboard-server/public/js/views/dashboard.js`
- Modify: `nbi_project_dashboard.html`

Bundles: DASHBOARD VIEW + CHARTS (SVG) + MY TASKS VIEW. ~42 functions.

- [ ] **Step 1: Find all dashboard functions**

```bash
grep -n '^function.*[Dd]ashboard\|^function.*renderDashboard\|^function.*portfolio\|^function.*tactical\|^function.*renderMyTasks\|^function.*standup\|^function.*renderChart\|^function.*drawSVG\|^function.*selectPortfolioClient\|^function.*pfGantt\|^function.*loadDashboardSnapshots\|^function.*loadPortfolioLeadCount' nbi_project_dashboard.html
```

Include state variables: `_portfolioSelectedClient`, `_portfolioSnapshots`, `_portfolioAttentionExpanded`, `_portfolioLeadCount`, `_portfolioBottomAttentionExpanded`, `_pfGanttDayWidth`, `_pfGanttOffsetDays`, `_expandedStandupPeople`, `_standupDoneExpanded`, `_expandedClientCards`, `_myTasksSort`, `_scrollRestoreTarget`.

- [ ] **Step 2: Create dashboard.js**

```js
import { registerView } from '../core/router.js';

// Internal state
let _portfolioSelectedClient = null;
// ... etc

// ... all dashboard + chart + my tasks functions ...

registerView('dashboard', renderDashboard);
registerView('mytasks', renderMyTasksView);
```

- [ ] **Step 3: Remove from monolith, verify, test, commit**

Verify: dashboard renders (portfolio v4, tactical mode), charts draw, my tasks view works, standup mode works.

```bash
git commit -m "refactor: extract dashboard, charts, and my-tasks to dashboard.js module"
```

---

## Task 22: Extract `leads.js` (View Module 11/13)

**Files:**
- Create: `dashboard-server/public/js/views/leads.js`
- Modify: `nbi_project_dashboard.html`

~75 functions. Bundles: LEADS CRM + CONTACT NOTES. Medium-high risk.

- [ ] **Step 1: Verify helper dependencies are extracted**

Before extracting leads, confirm these are in `helpers.js` (extracted in Task 8):
- `fmtMoney()`
- `currencySym()`
- `getContractedClients()`
- `getContractedClientRecords()`

```bash
grep 'fmtMoney\|currencySym\|getContractedClients\|getContractedClientRecords' dashboard-server/public/js/core/helpers.js
```

If any are missing, extract them to helpers.js first.

- [ ] **Step 2: Create leads.js**

Copy all functions from LEADS CRM and CONTACT NOTES sections. Include internal state: `_leadsConfig`, `_leadsData`, `_leadsFilter`, `_sowsCache`, `_leadDetailId`, `_leadsSortCol`, `_leadsSortDir`.

```js
import { registerView } from '../core/router.js';

registerView('leads', renderLeadsView);
```

- [ ] **Step 3: Remove from monolith, verify, test, commit**

Verify: navigate to leads CRM, open lead detail, add contact note, filter leads, check SOW display, check pipeline stages.

```bash
git commit -m "refactor: extract leads CRM and contact notes to leads.js module"
```

---

## Task 23: Extract `settings.js` (View Module 12/13)

**Files:**
- Create: `dashboard-server/public/js/views/settings.js`
- Modify: `nbi_project_dashboard.html`

~79 functions. Bundles: SETTINGS VIEW + CHANGELOG/AUDIT LOG + BACKUP & RESTORE + CONTRACT IMPORT WIZARD + DOWNLOADS/EXCEL IMPORT + CSV/EXCEL FILE IMPORT + CSV EXPORT + USER MANAGEMENT + CLIENT TEAM MANAGEMENT + TIME TRACKING + NOTIFICATIONS + TASK TEMPLATES.

This is the second-most coupled module. Many sub-tabs.

- [ ] **Step 1: Find all settings functions**

```bash
grep -n '^function.*[Ss]etting\|^function.*renderSettings\|^function.*Changelog\|^function.*changelog\|^function.*[Bb]ackup\|^function.*[Rr]estore\|^function.*[Ii]mport\|^function.*[Ee]xport\|^function.*CSV\|^function.*csv\|^function.*parseCSV\|^function.*confirmImport\|^function.*renderUserManagement\|^function.*renderClientTeam\|^function.*renderTimeTracking\|^function.*renderNotificationSettings\|^function.*renderTaskTemplates\|^function.*renderContractImport\|^function.*renderDownloads\|^function.*renderNewsAdmin' nbi_project_dashboard.html
```

- [ ] **Step 2: Create settings.js**

Bundle all settings sub-tab renderers and their supporting functions. Include internal state for each sub-feature.

```js
import { registerView } from '../core/router.js';

registerView('settings', renderSettingsView);
```

- [ ] **Step 3: Move `_act*` wrappers that only settings uses**

Check which `_act*` wrappers from the delegated action wrappers section (currently still in the inline script) only serve settings functions. Move them into `settings.js` and register on `window`.

- [ ] **Step 4: Remove from monolith, verify, test, commit**

Verify: navigate to settings, check each sub-tab (team, config, data, bugs, changelog, news admin), import a CSV, export CSV, check backup/restore, check user management, check client team management.

```bash
git commit -m "refactor: extract settings (all sub-tabs, import/export, user mgmt) to settings.js module"
```

---

## Task 24: Extract `tasks.js` (View Module 13/13)

**Files:**
- Create: `dashboard-server/public/js/views/tasks.js`
- Modify: `nbi_project_dashboard.html`

~110 functions. The largest and most coupled view module. Bundles: TASK VIEW + DETAIL PANEL + CLIENT SUMMARY PANEL + BULK OPERATIONS + TREE VIEW DRAG AND DROP + BOARD DRAG AND DROP + MARK AS BLOCKED POPUP + REPEAT TASK SECTION.

This is extracted last because by this point all its dependencies are in core modules.

- [ ] **Step 1: Audit remaining dependencies**

Before extracting, verify all cross-module calls are satisfied:

```bash
grep -c 'esc(\|toast(\|themedConfirm(\|apiCall(\|authFetch(\|renderContent(\|renderAll(\|switchView(\|markDirty(\|save(' nbi_project_dashboard.html
```

All of these should already be on `window` from core module extractions.

- [ ] **Step 2: Create tasks.js**

Copy ALL functions from: TASK VIEW, DETAIL PANEL, CLIENT SUMMARY PANEL, BULK OPERATIONS, TREE VIEW DnD, BOARD DnD, MARK AS BLOCKED POPUP, REPEAT TASK SECTION, MULTI-SELECT FILTER HELPERS.

Include all internal state:
```js
let _calMonth, _calYear, _calEventsKey;
let _ganttOffsetDays = 0, ganttDayWidth = 12;
let _ganttLinkMode = false, _ganttLinkFrom = null;
let _ganttDepView = false, _ganttHideArrows = false;
let _ganttSelectedArrow = null, _ganttLimit = 100;
let _boardTypeFilter = '';
let _tasksInitialCollapse = true;
// ... etc
```

Register:
```js
import { registerView } from '../core/router.js';

registerView('tasks', renderTaskView);
```

- [ ] **Step 3: Move all remaining `_act*` wrappers**

All `_act*` wrappers in the delegated action wrappers section should now be distributed to their owning view modules. Move each one to the module that contains its target function. Register each on `window`.

For example:
```js
// _actSetBoardTypeFilter belongs in tasks.js
function _actSetBoardTypeFilter(v) { _boardTypeFilter = v; window.renderContent(); }
window._actSetBoardTypeFilter = _actSetBoardTypeFilter;
```

- [ ] **Step 4: Remove from monolith, verify, test, commit**

Verify **thoroughly** -- this is the riskiest extraction:
- Task list view: sorting, filtering, grouping, tree expand/collapse
- Detail panel: open, edit fields, save, close
- Inline detail: toggle, edit
- Board view: drag and drop, column filters
- Gantt view: zoom, pan, link mode, dependency arrows
- Calendar view: navigate months, filter team
- Bulk operations: select multiple, bulk set status/priority/health
- Mark as blocked: open popup, fill fields, save
- Repeat task: set repeat schedule, verify
- Client summary panel: open, view tasks

```bash
cd dashboard-server && npx vitest --run
git commit -m "refactor: extract task view (detail, board, gantt, calendar, bulk ops) to tasks.js module"
```

---

## Task 25: Create `app.js` Entry Point and Clean Up HTML

**Files:**
- Create: `dashboard-server/public/js/app.js`
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Create app.js**

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
import './views/sidebar.js';
import './views/themes.js';
import './views/news.js';

// Initialise
import { init } from './core/state.js';
init();
```

- [ ] **Step 2: Replace all individual `<script type="module">` tags with single entry point**

Remove all the individual `<script type="module" src="...">` tags added during Tasks 7-24. Replace with:

```html
<script type="module" src="/public/js/app.js"></script>
```

- [ ] **Step 3: Remove the inline `<script>` block**

The inline `<script>...</script>` block should now be empty (or contain only variable declarations and the `_renderMainContent_fallback`). Delete the entire `<script>...</script>` block.

If any state variable declarations are still in the inline script, move them to `state.js` now.

- [ ] **Step 4: Move state variable declarations to state.js**

Update `state.js` to own all state declarations. Remove the `window.` transitional bridges -- use proper ES module exports instead. Update all view modules to import state they need:

```js
// In tasks.js
import { tasks, selectedTaskIds, collapsedTaskIds, activeDetailTaskId } from '../core/state.js';
import { setActiveDetailTaskId } from '../core/state.js';
```

**This is optional for now** -- the `window.` bridge works fine and can be cleaned up in a follow-up. The priority is getting the monolith split. Do this step only if time permits and the team agrees.

- [ ] **Step 5: Verify the HTML file is ~250 lines**

```bash
wc -l nbi_project_dashboard.html
```

Expected: approximately 250 lines (head + shell + auth screens + overlays). No CSS, no JS.

- [ ] **Step 6: Verify EVERYTHING in staging**

```bash
pm2 restart nbi-dashboard-staging
```

Full regression test:
1. Login/logout cycle
2. Dashboard -- all modes
3. Tasks -- all 5 sub-views (list, board, gantt, calendar, detail)
4. Leads -- full CRUD
5. Expenses -- full CRUD
6. Bugs -- submit and view
7. Hiring -- view and filter
8. People -- view and calendar
9. Finances -- view and edit
10. Reports -- all sections
11. Settings -- all sub-tabs
12. News -- digest, archive, search
13. Themes -- all 7
14. Sidebar warnings
15. Mobile viewport
16. Multi-tab sync

- [ ] **Step 7: Run ALL tests**

```bash
cd dashboard-server && npm run test:all
```

Expected: All 186 tests pass.

- [ ] **Step 8: Commit**

```bash
git add dashboard-server/public/js/app.js nbi_project_dashboard.html dashboard-server/public/js/core/state.js
git commit -m "refactor: create app.js entry point, remove inline script, HTML shell is ~250 lines"
```

---

## Task 26: Final Cleanup

**Files:**
- Modify: Various JS module files
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Remove `_renderMainContent_fallback` if it exists**

If the fallback function was kept during transition, remove it now. All views use the registry.

- [ ] **Step 2: Verify no `_act*` wrappers remain in monolith**

```bash
grep '_act[A-Z]' nbi_project_dashboard.html
```

Expected: 0 results. All should be in their respective view modules.

- [ ] **Step 3: Remove `.gitkeep` files**

```bash
rm dashboard-server/public/css/.gitkeep dashboard-server/public/css/views/.gitkeep
rm dashboard-server/public/js/.gitkeep dashboard-server/public/js/core/.gitkeep dashboard-server/public/js/views/.gitkeep
```

- [ ] **Step 4: Update the HTML file comment header**

Update the architecture comment at the top of `nbi_project_dashboard.html`:

```html
<!--
  NBI Project Dashboard — Single-page project management tool
  Built for NBI Gaming / NBI Analytics Ltd

  Architecture:
    - HTML shell (~250 lines) with external CSS and ES modules
    - CSS: /public/css/ (tokens, layout, components, mobile, view-specific)
    - JS:  /public/js/app.js → core/ (events, state, helpers, ui, router) + views/
    - Backend: dashboard-server/server.js (Express + PostgreSQL)
    - Auth: Token-based sessions, stored in cookies
    - Sync: Incremental changes with 10-second polling for multi-user support
-->
```

- [ ] **Step 5: Run full test suite one final time**

```bash
cd dashboard-server && npm run test:all
```

Expected: All 186 tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: final cleanup — remove transitional code, update docs"
```

---

## Task 27: Promote to Production

- [ ] **Step 1: Merge worktree branch into master**

```bash
cd d:/OneDrive/Claude_code/NBIAI_TEAM
git merge feature/frontend-modularisation
```

If there are merge conflicts (from features added on master during migration):
1. Resolve conflicts in the worktree
2. Re-deploy to staging and re-test
3. Then merge

- [ ] **Step 2: Restart production PM2**

```bash
pm2 restart nbi-dashboard
```

- [ ] **Step 3: Verify production**

Open `https://worksage.nbi-consulting.com` in a browser. Run the same full regression as Task 25 Step 6.

- [ ] **Step 4: Clean up worktree**

```bash
git worktree remove ../nbi-modularise
```

- [ ] **Step 5: Tag the release**

```bash
git tag -a v2.0.0-modular -m "Frontend modularised: 20k-line monolith split into ES modules"
```

---

## Summary

| Phase | Tasks | What changes |
|---|---|---|
| Infrastructure | 1-6 | Directories, CSS extraction, inline handler conversion |
| Core JS | 7-11 | 5 core modules: events, helpers, ui, state, router |
| View extraction | 12-24 | 13 view modules, cleanest to most coupled |
| Cleanup | 25-27 | app.js entry point, HTML shell, production promotion |

**Total commits:** ~27 (one per task)
**Risk gradient:** Low (CSS, themes) → Medium (core, clean views) → High (tasks, settings) → Low (cleanup)
**Rollback:** Any commit can be reverted independently. The hybrid state (some views extracted, some inline) is stable.
