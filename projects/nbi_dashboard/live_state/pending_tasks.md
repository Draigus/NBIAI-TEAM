# Pending Tasks

Updated 2026-04-13 (Session A)

---

## Completed This Session

### QA Bug Fixes
- BUG-002: Amount validation <= 0
- BUG-003: XSS input sanitisation (7 endpoints, 12 fields)
- BUG-004: UUID validation on expense GET/DELETE
- BUG-006: Admin RBAC on PUT /api/finance

### Accessibility
- ARIA on modals/tabs, contrast boost, focus trapping, keyboard access

### UX Polish
- withButtonLoading, required field indicators, inline validation

### Medium Fixes
- max-width 1800px, resize handles, mobile scroll, modal tokens, zebra striping

### Features
- Multi-select filters (status/health/assignee)
- Imminent time filter (due within 3 days)
- Client page studio_size + contract_value fields

### Hub
- 25 security/quality fixes
- First QA pass (68 tests, 3 bugs fixed)

---

## UI/UX Audit Backlog (Low Priority)

1. **Replace renderAll() with targeted DOM updates** -- major architecture change
2. **Optimistic updates** for task/expense/finance changes
3. **Skeleton screens** for async-loaded content
4. **Standardise tab component HTML/class** across views
5. **Collapse dashboard standup by default**
6. **Split Settings page** into sub-pages
7. **Textarea auto-resize** during typing (only fires on panel open)

---

## Feature Requests (12 remaining, not started)

5. **Calendar view dependency display**
6. **Warnings & Alerts Sidebar** (right-hand notifications panel)
7. **PM Report System** (daily email summaries) -- blocked by SMTP
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
