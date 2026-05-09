# Pending Tasks

Updated 2026-05-08

---

## Awaiting Glen UAT

Features merged to master, tests green (387), PM2 running. Glen needs to test at worksage.nbi-consulting.com.

### Bug Batch (8 items, all set to please_review in Bug Tracker)
- Sort order deterministic on reload
- People filter hides unassigned tasks at all levels
- Detail panel no longer jumps during multi-user sync
- 5-digit years blocked with toast error
- CSV import due dates parsed correctly
- Features/stories show auto-calculated dates (greyed out)
- Date paste normalises DD/MM/YYYY and named month formats
- Warning notifications show timestamps

### Gantt Timeline Drag
- Bars should land exactly where dropped (timezone fix)
- Dates on bar should match ticket detail panel
- Glen reported initial fix was still off - latest fix deployed, needs retest

### Connected Statuses (c7e48ddf) — please_review
- Mark a parent Done/Cancelled/Blocked and all children cascade
- All siblings terminal → parent auto-completes (Done if all Done, else Cancelled)

### Prerequisites Blocked (f5a6bff2) — please_review
- Block or cancel a prerequisite → its dependants become Blocked automatically

### Scroll Preservation (9bb9eb1a, 2e005a41, 94b12f59) — please_review
- Background sync no longer resets scroll position in any view
- Gantt horizontal/vertical scroll preserved across sync
- Re-render skipped when inline detail panel is open

### Portfolio Chart Redesign
- Bar+donut layout: backlog bar on left, WIP donut on right

### Gantt Scroll-to-Today
- Gantt auto-scrolls to today line on first open (bars no longer off-screen)

### Client Portal (Lorenza / Couch Heroes)
- Lorenza can now log in and see only Couch Heroes data
- localStorage cache clears on user switch (no cross-user data leak)

### Queue Detail Panel (merged `3dcb2dc`)
- Click queue items to open slide-in detail panel
- Select client + type, fill in fields, Promote or Dismiss

### Client Portal Features (merged `8b74230`)
- Create a client user, log in, verify force password change
- Confirm client filter lock, company name in header, scoped views
- Test client admin team management (invite/deactivate/reset)
- Verify NBI admin sees Source column in Bug Tracker

### News Aggregator M4: Search + Admin (merged `40a3ab1`)
- News tab Search subtab: search terms return highlighted results
- Settings > News: Feed Health, Prompts, Sources, Stories admin panels

---

### Wave 2 Quick Fixes (9 items, all set to please_review/resolved in Bug Tracker)
- c057f2f9: Breadcrumb filter bar hidden on non-task views
- 7cc027e5: Date validation waits for 4-digit year
- b2628531: Gantt row labels stay visible on horizontal scroll
- 366d49fd: Search only matches title/description/notes/assignees
- c52c8027: Assignee on stories confirmed working (resolved)
- 1e8de733: Percentage shown on all tasks with estimated hours
- d765b863: Documentation hyperlinks now clickable
- 544fc78a: NBI Only block toggles off (no nesting)
- a1ec1a84: Repeat section in both detail panels

---

## Open Bugs

| Bug | Status | Notes |
|---|---|---|
| Hide Done Sometimes Hides All Tasks | open | Reported by Amir, unreproducible. Code logic is correct. Monitoring. |
| Documentation: mobile responsive layout never visually verified | please_review | CSS exists, needs real device or DevTools narrow viewport test |

---

## On Hold (waiting on external input)

### QuickBooks Time API Integration
- Blocked on Bryan Rasmussen's API token
- Native `time_entries` table exists for manual logging

### Slack App Icon
- Glen has the image, needs to upload at api.slack.com > Basic Information > Display Information

---

## Backlog - Needs Brainstorming Before Implementation

- Frontend modularisation (13,500+ line monolith)
- People dashboard redesign
- Data cleanse tool
