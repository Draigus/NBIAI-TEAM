# Handoff: Sidebar Collapse & Gantt Sticky Fixes — 2026-05-16

## Two Bugs Reported by Glen

### Bug 1: Gantt ITEM Column Not Staying Pinned — FIXED
**Symptom:** On the timeline/gantt view, the ITEM column (left labels) scrolls out of view when scrolling far enough to the right. It should stay pinned (sticky) at all times.

**Root Cause:** `.gantt__row` elements are flex children of `.gantt__body` (column flex). `align-items: stretch` (default) constrains rows to the body's width (~1200px viewport), but row CONTENT (label 260px + timeline ~5000px) is much wider. The sticky label's containing block is the row (1200px), so it can only stick until `scrollLeft > row-width - label-width` (~940px), then it scrolls away.

**Fix Applied (working, confirmed by Glen):**
- Added CSS variable `--gantt-content-w` on the `.gantt` container (line ~8326): `--gantt-content-w: ${_ganttLabelWidth + timelineW}px`
- Added `min-width: var(--gantt-content-w)` to `.gantt__body` (line ~1124) and `.gantt__header` (line ~1116)
- This forces body and header to be as wide as the full timeline content, so rows stretched to body width are wide enough for sticky to work across the entire scroll range
- Also reverted an earlier attempt that changed `.tasks-layout__main` from `overflow-x: hidden` to `overflow-x: clip` — that was NOT the issue and was reverted

**Files changed:** `nbi_project_dashboard.html`
- CSS: `.gantt__header` and `.gantt__body` got `min-width: var(--gantt-content-w)`
- JS: gantt container inline style now includes `--gantt-content-w:${_ganttLabelWidth + timelineW}px`

---

### Bug 2: Sidebar Collapse Toggle Button Gone — NOT FIXED (CSS-only approach fails in Glen's browser)
**Symptom:** The chevron arrow at the bottom of the sidebar that collapses it to icon-only mode is not visible. The sidebar cannot be collapsed.

**Timeline of what was tried:**
1. The scroll refactor (commit `fba13a0`, May 13) removed `fixScrollHeights()` which explicitly set `sidebarNav.style.height` and `.flex = 'none'`. The CSS flex chain was supposed to replace it.
2. Added `min-height: 0` to `.sidebar__nav` — didn't help
3. Added `position: absolute; bottom: 0` on toggle — toggle still invisible, plus `button.sidebar__toggle` rule at line 309 has higher specificity (0,1,1 vs 0,1,0) and sets `background: none; border: none; color: inherit`, overriding the toggle's own styles
4. Added explicit `height: calc(var(--vh-full) - var(--header-h))` to `.sidebar` — didn't help in Glen's browser
5. Restored the JS `fixSidebarNavHeight()` function (same as old `fixScrollHeights` sidebar logic) — THIS WORKED
6. Ran Playwright diagnostic — CSS flex chain works PERFECTLY in Chromium (nav=996px, toggle=32px, toggle visible). So the CSS is correct but something in Glen's browser prevents it from working.
7. Removed JS hack, deployed pure CSS — waiting for Glen to test (current state)

**Current CSS state (deployed):**
```css
.sidebar { height: calc(var(--vh-full) - var(--header-h)); display: flex; flex-direction: column; overflow: hidden; }
.sidebar__nav { flex: 1; min-height: 0; overflow-y: auto; }
.sidebar__toggle { flex-shrink: 0; background: var(--bg-raised); }
button.sidebar__item, button.sidebar__toggle { background: none; border: none; color: inherit; } /* <-- higher specificity, overrides toggle styles */
```

**What the next session needs to do:**
1. Ask Glen if the pure CSS deploy (current) shows the toggle. If YES, done.
2. If NO, ask Glen to open DevTools (F12), inspect `.sidebar__toggle`, and report:
   - Computed `height` of `.sidebar__toggle`
   - Computed `height` of `.sidebar__nav` (should be ~996px, if it's `auto` or matches scrollHeight, flex isn't constraining)
   - Whether `.sidebar__nav` has any inline styles (from old cached code or other JS)
   - The browser name and version
3. If DevTools isn't productive, restore the JS fix — it works and is functionally identical to what was running pre-refactor:
```javascript
function fixSidebarNavHeight() {
  if (window.innerWidth < 768) return;
  const sn = document.getElementById('sidebarNav');
  if (!sn) return;
  const toggle = sn.nextElementSibling;
  const toggleH = toggle ? toggle.offsetHeight : 0;
  const top = sn.getBoundingClientRect().top;
  sn.style.height = Math.max(200, window.innerHeight - top - toggleH) + 'px';
  sn.style.flex = 'none';
  sn.style.overflowY = 'auto';
}
```
Place it at line ~23503 (before SIDEBAR COLLAPSE section), call it from `renderSidebar()` after innerHTML set, also on `resize` and on load.

**Known specificity issue:** `button.sidebar__toggle` at line 309 sets `background: none; border: none; color: inherit` which overrides `.sidebar__toggle`'s own `background: var(--bg-raised)` and `color: var(--text-muted)`. The toggle still renders (SVG chevron inherits text colour) but has no visible background or border. This has always been the case and the toggle was usable before, but fixing it would make the toggle more prominent. To fix: either split the selector or use `.sidebar__toggle` with `!important`.

---

## Files Modified This Session
- `nbi_project_dashboard.html` — gantt sticky fix (working), sidebar CSS changes (under test)

## Server State
- PM2 `nbi-dashboard` on port 8888 — running with current code (pure CSS sidebar, no JS hack)
- Branch: `feature/command-centre`
- No uncommitted changes to tracked files (all changes appear committed by auto-save or prior session)

## Key Commit Context
- `396bc23` — last known commit before this session's changes
- `fba13a0` — scroll refactor that removed `fixScrollHeights()` (root cause of sidebar regression)
- Multiple intermediate commits may exist from other sessions between May 13-16
