# Pending Tasks

Updated 2026-04-20

---

## Awaiting Glen UAT

Both features are merged to master, 186/186 tests green, PM2 running. Glen needs to test at worksage.nbi-consulting.com.

### Client Portal (merged `8b74230`)
- Create a client user, log in, verify force password change
- Confirm client filter lock, company name in header, scoped views
- Test client admin team management (invite/deactivate/reset)
- Verify NBI admin sees Source column in Bug Tracker

### News Aggregator M4: Search + Admin (merged `40a3ab1`)
- News tab Search subtab: search terms return highlighted results
- Settings > News: Feed Health, Prompts, Sources, Stories admin panels
- Merge/split stories, regenerate, add sources

---

## On Hold (waiting on external input)

### QuickBooks Time API Integration
- Blocked on Bryan Rasmussen's API token

### Excel Import Template
- NBI_Dashboard_Import_Template_v2.xlsx ready
- Needs Glen to populate with real project data and test import

---

## Backlog — Needs Brainstorming Before Implementation

These items are open in the bug tracker or identified in the master workload roadmap. Each needs a dedicated brainstorming session and spec before code.

### L1-L4: Large feature work (from master plan phases 6-10)
- **Gantt Chart enhancements** (`86be4df5`) — dependency arrows in calendar detail (O6)
- **SoW layer in hierarchy** (`cb32b7f9`) — Client > SoW > Project > Feature > Story > Task (Z6)
- **Hiring Page full spec** (`b7a2f97f`) — Glen's detailed spec with stage-specific fields, arrows, auto-archive
- **Telemetry + BI Analytics Dashboard** — 3-sprint plan saved in `.claude/plans/serialized-hatching-anchor.md`
- **Real research backend** — Brave/Tavily/Anthropic to replace stub client research

### Semantically ambiguous
- **c73af494 By Employee Sort Incomplete** — needs Glen to clarify (sort vs filter)

---

## UI/UX Audit Backlog (Low Priority)

1. **Optimistic updates** for task/expense/finance changes
2. **Standardise tab component HTML/class** across views
3. **Split Settings page** into sub-pages (currently 5 tabs, could be routes)

---

## Feature Requests (older backlog, not started)

- **Calendar view dependency display**
- **Warnings & Alerts Sidebar** (right-hand notifications panel)
- **PM Report System** (daily email summaries) — blocked by SMTP
- **SoW Upload on leads**
- **Report Editing post-submission**
- **Embed files via Sharepoint link**

---

## Completed (removed from pending — reference only)

Items previously listed here that are now shipped on master:

| Item | Commit | When |
|---|---|---|
| G1 — Collapsible sidebar | `357c542` | 2026-04-15 |
| G2 — Practice filters | `a99c9c7` | 2026-04-15 |
| G3 — Mobile UI pass | `1033c1a` | 2026-04-15 |
| G4 — Sortable People tables | `56231a2` | 2026-04-15 |
| G5 — Client-scoped users | `8b74230` | 2026-04-20 |
| Kanban drag-to-reorder | `e9b6166` | 2026-04-15 |
| Test infrastructure | `e26ed85` | 2026-04-15 |
| News M1-M4 | `40a3ab1` | 2026-04-20 |
