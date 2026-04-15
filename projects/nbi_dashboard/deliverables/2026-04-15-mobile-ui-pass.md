# Deliverable: Mobile UI pass for iPhone 11 (G3)

**Date:** 2026-04-15
**Commit:** (filled in after merge)
**Plan item:** G3 in `.claude/plans/iridescent-imagining-kitten.md`
**Target viewport:** iPhone 11 portrait, 414 × 896 CSS pixels

## Problem

Glen reported "some views looked awful in their layout on the screen on an iPhone 11." A code audit of `nbi_project_dashboard.html` found that while Dashboard, Workload, Projects tree, Leads kanban, Clients and Settings had mobile `@media` breakpoints, the following views did NOT have the scroll-snap kanban treatment that Leads uses and were showing "one lane plus a sliver" on 414px:

- Projects **Board** view (Tasks kanban)
- **Bug Tracker** kanban
- **Hiring** kanban

Plus a few smaller issues:
- People tab Workload Overview sort toolbar (added in G4) could overflow on narrow screens
- `.rw-name` bar-chart label column at `min-width: 100px` cut the bar short on narrow widths

## What shipped

All edits in `nbi_project_dashboard.html` inside the existing `@media (max-width: 480px)` block around line 980. Specific rules added:

```css
/* Bug Tracker kanban — scroll-snap lanes */
.bug-tracker__kanban { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; gap: 8px; padding-bottom: 8px; }
.bug-tracker__kanban > .bug-lane { flex: 0 0 100%; min-width: 100%; max-width: 100%; scroll-snap-align: start; }

/* Hiring kanban — scroll-snap lanes */
.hiring-kanban { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; gap: 8px; padding-bottom: 8px; }
.hiring-kanban > .hiring-lane { flex: 0 0 100%; min-width: 100%; max-width: 100%; scroll-snap-align: start; }

/* Tasks Board — scroll-snap lanes at 92% so the next lane peeks through */
.board { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; gap: 8px; }
.board > .board__lane { flex: 0 0 92%; min-width: 92%; max-width: 92%; scroll-snap-align: start; }

/* People tab — G4 sort toolbar wrap */
.report__section .task-subview-toggle { flex-wrap: wrap; gap: 4px; }

/* People tab — Workload Overview bar chart density */
.rw-name { min-width: 72px !important; font-size: 0.72rem; }
.rw-bar { height: 16px; }
.rw-nums { font-size: 0.68rem; gap: 4px; }
```

## Verification

Full 8-screen capture via `tests/e2e/mobile-screenshots.spec.js` at 414×896, using test fixture data seeded fresh per run. Screenshots in `./2026-04-15-mobile-screenshots/`:

| # | View | File | Status |
|---|---|---|---|
| 01 | Dashboard (Portfolio Report) | `01-dashboard.png` | Clean — KPI grid in 2 cols, segmented tabs wrap, client cards stack |
| 02 | Workload | `02-workload.png` | Clean — 3-col metric grid, warning boxes stack, standup section collapsible |
| 03 | Projects Board | `03-projects-board.png` | **Fixed** — Backlog lane at 92% width with next lane peeking; swipeable |
| 04 | People | `04-people.png` | Clean — G4 sort toolbar wraps, Workload bars render at 72px name column, Capacity + Hours-by-Client tables fit |
| 05 | Reports | `05-reports.png` | Clean — KPI grid in 2 cols, client overview stacks, Progress by Project table horizontal-scroll on overflow |
| 06 | Bug Tracker kanban | `06-bug-tracker-kanban.png` | **Fixed** — OPEN lane fills width, scroll-snap to next status |
| 07 | Hiring kanban | `07-hiring-kanban.png` | **Fixed** — SOURCED lane fills width, scroll-snap to next stage |
| 08 | Leads kanban | `08-leads-kanban.png` | Clean — existing 900px scroll-snap treatment still works, shows "Mobile Active (1/1)" lane counter |

## Tests

- Unit suite: 62 passing (unchanged by this CSS-only change)
- E2E suite: 12 passing (existing tests unchanged; mobile-screenshots.spec.js is tagged `@mobile-audit` and runs when explicitly invoked, not by default)
- Full `npm run test:all` remains green

## Scope NOT covered

- The Reports `Progress by Project` table uses horizontal-scroll on overflow at 480px (inherited from the general `.report-table` rule). That's functional but not ideal — a true card-per-row mobile fallback would be cleaner. Deferred as a polish follow-up.
- Hiring "By Client" sub-view uses a `.hiring-grid` card layout that's already responsive. Not audited in detail because it wasn't flagged as problematic.
- The top tablist already has `overflow-x: auto` at 480px (line 953). Verified in the screenshots above — "Lea..." peeks at the right edge indicating the scroll is enabled.
- Settings view already had extensive mobile handling from an earlier C6 audit (line 974-979).

## Follow-ups

None required for this phase. Card-per-row mobile fallback for the Progress by Project table is a nice-to-have, not a blocker.
