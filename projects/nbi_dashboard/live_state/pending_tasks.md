# Pending Tasks

Updated 2026-04-11 (Session C)

---

## Completed This Session

### Data Cleanup
- Attempted reparent of hiring tasks — REVERTED. Those are Couch Heroes client tasks, not NBI internal.

### Server Code Review — ALL Issues Fixed
- Metrics endpoint localhost-only, orphaned JSDoc fixed, 8 functions documented
- Dead code removed, structured logging, archiver top-level require
- Screenshot size limit, UUID validation on 8 endpoints, entity type whitelist
- Auth bypass tightened, N+1 sync fix, audit log error handling

### Frontend Code Review — In Progress
- 16 dead functions being removed
- ~80 JSDoc additions being applied
- Dead/duplicate/empty CSS being cleaned

### MD File Updates
- decisions.md: D68-D77 added
- work_completed.md: items 155-163 added
- pending_tasks.md: this file rewritten
- conversation_context.md: to update

---

## Active

### QA Test Plan & Execution
- Needs comprehensive pass after code review changes
- Verify server health, all views, detail panels, mobile

---

## Feature Requests (16 open from bug triage)

### Partially Implemented
1. **Multi-select filters** — single-select exists, needs checkboxes
2. **Time-based filters** (Imminent/Late) — overdue works, no "Imminent" filter
3. **Client Page** — detail page + contacts exist, needs studio size + contract values fields
4. **Due & Late email warnings** — detection works, no emails (blocked by SMTP)

### Not Started
5. **Calendar view dependency display**
6. **Warnings & Alerts Sidebar** (right-hand notifications panel)
7. **PM Report System** (daily email summaries) — also blocked by SMTP
8. **SoW Upload on leads**
9. **"Complete" marker for Won leads**
10. **Hiring Page** (candidate pipeline)
11. **HC/Org Performance Page & Board**
12. **Report Editing post-submission**
13. **Embed files via Sharepoint link**
14. **Add SoW layer to hierarchy** (Client > SoW > Project > Feature > Story > Task)

---

## Planned

### Telemetry + BI Analytics Dashboard (3 sprints)
- Plan saved in `.claude/plans/serialized-hatching-anchor.md`
- Scheduled reminder: Tuesday 15 April 9am

### Finance P&L Enhancement
- Glen wants more detailed true P&L
- Consulting metrics should dynamically reflect P&L data

---

## On Hold (waiting on external input)

### SMTP Configuration
- Emails log to console (async, non-blocking)
- Needs Glen's SMTP provider details
- Blocks: email warnings, PM reports, password reset

### QuickBooks Time API Integration
- Blocked on Bryan Rasmussen's API token

### Excel Import Template
- NBI_Dashboard_Import_Template_v2.xlsx ready
- Needs Glen to populate with real project data and test import
