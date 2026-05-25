---
source: claude
source_id: handoff_2026-04-06a_ux_overhaul
source_path: projects/nbi_dashboard/session_handoffs/handoff_2026-04-06a_ux_overhaul.md
ingested: 2026-05-25
topics_detected: [ux-philosophy, navigation-design, dashboard-terminology, data-import]
relevance_score: 9
novelty_score: 9
actionability_score: 9
bank_candidates: [personal_insights, production_methods]
new_bank_suggestions: []
sensitivity_class: internal
extract_type: decision
---

# Glen's Dashboard Philosophy: 22 UX Decisions in One Session

## Key Content

Largest single decision session. Glen renamed tabs based on function: "We call it the dashboard, but the report IS the dashboard, and what is called the dashboard should be current workload." He killed the MD/PM/IC role toggle ("not adding value"), demanded overdue items show ALL entries grouped by client with severity bands by days late (14+ deep red, 7-14 medium, 1-3 standard), separated Blocked from At Risk ("different purposes, different actions"), insisted standup show only active work collapsed by default sorted by urgency, moved revenue/utilisation KPIs to Finance ("project-focused KPIs only on dashboard"), refused to auto-fill health state ("auto-filling my health is not a solution"), and ordered paying clients first in all views.

Also imported 968 tasks from 19 MS Teams Planner exports, growing the dashboard from 156 to 1,127 tasks.

## Decisions / Insights

- D25: Tab naming should reflect function, not convention -- "Dashboard" = the executive view, "Workload" = current work
- D26: Role-based toggles (MD/PM/IC) removed when they don't earn their keep
- D27-D28: Overdue, Blocked, At Risk must be visually distinct with different severity treatments
- D30: Standup = active work only, collapsed by default, sorted by urgency (blocked/overdue people first)
- D31: Dashboard KPIs are project health, not financial metrics
- D32: Never auto-derive health state -- Glen controls this manually
- D34: Client ordering = paying clients first, always (Couch Heroes > Lighthouse > Sarge > Goals > alpha)
- D39: Portfolio view = sortable table, not cards
- D41: Search must require Enter key, not live-search on keystroke
- D42: Assignee must be dropdown with all employees, not free text

## Context

This session established the permanent UX patterns for WorkSage. These 22 decisions (D25-D46) are referenced in every subsequent session.

## Applicability

- Any new WorkSage view must follow client-priority ordering via `clientSortOrder()`
- Health state is always manual -- never implement auto-calculation
- Standup-style views show only active work, never backlog
- Tables beat cards for data-dense views -- Glen prefers sorting/filtering over visual browsing
