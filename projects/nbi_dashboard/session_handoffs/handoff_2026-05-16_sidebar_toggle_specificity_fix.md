# Handoff: Sidebar Toggle Specificity Fix — 2026-05-16 (Session 3)

## What Was Done

Fixed the sidebar collapse toggle button being invisible in certain themes. This was the outstanding Bug 2 from `handoff_2026-05-16_sidebar_gantt_fixes.md`.

## Root Cause

CSS specificity conflict between two rules in `nbi_project_dashboard.html`:

- **Line 307** `.sidebar__toggle { ... color: var(--text-muted); border-top: 1px solid var(--border-default); background: var(--bg-raised); }` — specificity **0,1,0**
- **Line 309** `button.sidebar__item, button.sidebar__toggle { ... color: inherit; background: none; border: none; }` — specificity **0,1,1** (element + class) — **WINS**

Line 309 is a generic button reset for sidebar items. Because `button.sidebar__toggle` was included in that selector, it stripped the toggle's intentional background, border-top separator, and theme-aware colour, replacing them with `background: none`, `border: none`, and `color: inherit`.

**Why it was theme-dependent:** `color: inherit` makes the chevron SVG (`stroke="currentColor"`) inherit whatever colour flows down from ancestors. In dark themes, that inherited colour was light text on a dark sidebar background — visible. In light themes (and potentially others with low-contrast inherited colours), the chevron was near-invisible.

## What Changed

**File:** `nbi_project_dashboard.html`, lines 307 and 309.

**Line 307 — before:**
```css
.sidebar__toggle { display: flex; align-items: center; justify-content: center; padding: 8px; cursor: pointer; color: var(--text-muted); border-top: 1px solid var(--border-default); font-size: 0.8rem; transition: color 0.12s; flex-shrink: 0; background: var(--bg-raised); }
```

**Line 307 — after:**
```css
.sidebar__toggle { display: flex; align-items: center; justify-content: center; padding: 8px; cursor: pointer; color: var(--text-muted); border-top: 1px solid var(--border-default); font: inherit; font-size: 0.8rem; transition: color 0.12s; flex-shrink: 0; background: var(--bg-raised); width: 100%; }
```
Added `font: inherit; width: 100%;` — the button resets the toggle still needs (previously inherited from the combined selector).

**Line 309 — before:**
```css
button.sidebar__item, button.sidebar__toggle { font: inherit; color: inherit; background: none; border: none; text-align: left; width: 100%; }
```

**Line 309 — after:**
```css
button.sidebar__item { font: inherit; color: inherit; background: none; border: none; text-align: left; width: 100%; }
```
Removed `button.sidebar__toggle` from the combined selector entirely.

## Verification

- **Programmatic:** `browser_evaluate` confirmed all 8 themes (dark, light, midnight, nord, solarized, dracula, emerald, command) now resolve `hasBg: true`, `hasBorder: true`, and correct `--text-muted` colour on the toggle
- **Visual:** Screenshots taken of toggle in light theme (visible chevron + border-top separator) and dark theme (same)
- **Functional:** Clicked toggle via Playwright — sidebar collapses to 56px icon-only mode, click again expands back
- **Unit tests:** 408/408 pass (Vitest)
- **E2E tests:** Not run this session — recommend running `npm run test:e2e` next session

## Server State

- PM2 `nbi-dashboard` on port 8888 — restarted with fix deployed
- Branch: `feature/command-centre`
- Change is NOT yet committed — lives in working tree only

## What's Left

1. **Glen UAT** — hard-refresh (Ctrl+Shift+R) and verify the toggle is visible in his preferred theme. Try switching themes in Settings to confirm it works across all of them.
2. **Commit** — once Glen confirms, commit with message like `fix(sidebar): resolve toggle visibility across themes (CSS specificity)`
3. **E2E run** — `npm run test:e2e` to confirm no regressions in Playwright suite
4. **Gantt sticky** — already confirmed fixed in prior session, no action needed
