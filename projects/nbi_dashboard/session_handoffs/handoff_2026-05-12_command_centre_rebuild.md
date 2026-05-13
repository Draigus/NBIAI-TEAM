# Handoff: Command Centre Rebuild Session

**Date:** 2026-05-12
**Branch:** `feature/command-centre`
**Context:** Continuation of Phase 1 build. This session fixed infrastructure issues (scroll, MEMORY_DIR, data flow) and attempted visual polish. Visual quality is still far below the approved mockups. Glen rates it 4/10. The Briefing tab is "kind of trash" and the Dashboard is "flashy boxes crammed onto a page."

## What Was Done This Session

### Infrastructure fixes (solid, keep these)
1. **Scroll fix** - After 8+ failed CSS/JS approaches across 2 sessions, the root cause was identified: the flex height chain from `.shell` -> `.main` -> `.main__content` doesn't propagate correctly in the real SPA (works in isolated test pages). Fix: `height: calc(100vh - var(--header-h, 52px)); overflow-y: auto` on `.cc-page` — uses viewport units directly, bypassing the entire parent chain. CONFIRMED WORKING.

2. **MEMORY_DIR path fix** - Changed `REPO_ROOT.replace(/[:\\\/]/g, '-')` to `REPO_ROOT.replace(/[^a-zA-Z0-9]/g, '-')` in `command-centre.js`. Old regex missed underscores. Memory scanner now finds all 37 files.

3. **Briefing data loads on both tabs** - Changed the render flow so `/api/command-centre/briefing` is called regardless of which tab is active. Today's Focus card on Dashboard tab can now pull from calendar, overdue tasks, blocked items, and bugs (not just bugs from snapshot).

4. **Double Refresh button removed** - Was generating two buttons.

### Visual changes (mixed quality, needs ground-up redo)
- **CC page has its own dark theme** scoped via CSS custom properties (`--cc-bg`, `--cc-t1`, etc.) — not the SPA theme
- **Animated gradient mesh background** on `.cc-page::before`
- **Gradient text** on greeting name
- **Glassmorphic card CSS** with accent bars, hover glows, staggered animations
- **Hero cards** have colour variants (green/amber/red)
- **Action buttons** on list items (Open Bug, Join, Open, Review, etc.)
- **Filter chips** on Work Queue
- **Sparkline** on Sessions card
- **Click feedback** (green tick flash on action buttons)
- **Today's Focus** pulls from mixed sources (bugs + overdue + blocked)
- **Grid changed to 2-column default** (3-col only above 1600px)
- **Today's Focus card is full-width**

### What's still wrong (Glen's assessment: 4/10)
- Every section is a flat list in a box. No visual variety.
- No charts, progress bars, expandable cards, or visual intelligence
- Cards all look the same — no hierarchy telling you what matters
- The mockups had: shimmer progress bars, expandable/collapsible sections, tag badges, timeline with glowing dots, "Nudge Tom" buttons, priority breakdown grids, curated intelligent summaries
- What shipped: text lists in dark boxes with coloured borders

## The Real Problem

The render functions were written from scratch to generate HTML. They should have been written by COPYING the approved mockup HTML and replacing hardcoded text with template expressions. The mockup HTML IS the spec. Every `<div>`, every class, every inline style in the mockup is intentional. The render functions ignore all of that and generate simplified structures.

### The correct approach for the next session:

1. Open `cc-v4.html` (Dashboard mockup) side by side with `ccRenderDashboard()` and each `ccCard*()` function
2. For EACH card, copy the mockup's HTML structure exactly
3. Replace hardcoded text (e.g., "Gantt dependency arrows misaligned") with `esc(item.title)`
4. Replace hardcoded numbers with live data variables
5. Keep ALL CSS classes, inline styles, and structural elements from the mockup
6. The render function's job is ONLY to inject live data into the mockup's HTML template

Same process for `cc-briefing-v3b.html` and the briefing render functions.

## Source Videos / Concepts

Glen's vision comes from merging two concepts:
- **Nate Herk's AIOS** (https://github.com/nateherkai/AIS-OS) — 4 Cs framework, 3 Ms operator brain, /audit and /level-up skills, weekly self-improvement rituals
- **Jack Roberts' Claude OS** — Self-improving skills with learnings.md + eval.json, scheduled heartbeat workflows, shared business context, skill chaining through handoffs

The CC should be the CONTROL SURFACE for the entire AI operating system. Not a data display page. A place where Glen sits, surveys everything, and ACTS. Where the system tells HIM what needs attention.

## File Locations

| File | Purpose |
|---|---|
| `.superpowers/brainstorm/15405-1778494096/content/cc-v4.html` | Dashboard tab mockup (APPROVED) — use this as THE template |
| `.superpowers/brainstorm/15405-1778494096/content/cc-briefing-v3b.html` | Briefing tab mockup (APPROVED) — use this as THE template |
| `docs/superpowers/specs/2026-05-11-command-centre-design.md` | Full design spec |
| `dashboard-server/routes/command-centre.js` | Route module (backend) — SOLID, don't change |
| `dashboard-server/tests/unit/command-centre.test.mjs` | Unit tests — 9 passing |
| `nbi_project_dashboard.html` | SPA — CSS at ~line 2625, renderers at ~line 19500 |
| `dashboard-server/public/cc-scroll-test.html` | Scroll test page (cleanup: delete) |
| `dashboard-server/tests/e2e/cc-scroll-debug.js` | Scroll debug script (cleanup: delete) |

## Scroll Architecture (DO NOT CHANGE)

The scroll fix is:
```css
.cc-page {
  height: calc(100vh - var(--header-h, 52px));
  overflow-y: auto; overflow-x: hidden;
}
```
This works because it uses viewport units directly, bypassing the SPA's flex height chain which breaks for unknown reasons. The `.main__content:has(> .cc-page) { padding: 0; }` CSS rule plus `el.style.padding = '0'` in JS (belt-and-suspenders) removes the parent padding.

**DO NOT** try: `flex: 1; min-height: 0`, absolute positioning, JS height calculation, or any approach that depends on the parent flex chain propagating height. They all fail in the real SPA despite working in isolated test pages.

## Server State
- PM2 running on :8888 (production), branch `feature/command-centre`
- 396 unit tests passing
- Azure AD: Calendars.Read permission granted
- Calendar reads gpryer@nbi-consulting.com (CC_CALENDAR_USER env var)

## Screenshots

Glen provided 5 screenshots on 2026-05-12 showing the current state:
- Dashboard tab: dark background works, hero rings work, 2-col grid, cards are flat lists
- Briefing tab: all sections render with live data, but every section is visually identical (list in box)
- Calendar: shows real events with times and meeting links
- Work queue: filter chips present, 3 overdue/due/blocked columns work
- Bug status: critical open, awaiting review, hotspots with tag chips
- Claude state: shows session log, outstanding work items, recent decisions
- Client deliveries: Couch Heroes + Lighthouse Games with real tasks
- Knowledge flags: stale memory references detected

Glen's quote: "its now just flashy boxes crammed onto a page"
