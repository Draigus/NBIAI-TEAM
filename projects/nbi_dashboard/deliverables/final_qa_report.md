# NBI WorkSage QA Pass Report

**Date:** 2026-04-14
**Endpoint:** http://localhost:8888
**Method:** curl + admin/member tokens

## Summary

- **Total tests:** 88
- **Passed:** 79
- **Failed/Bugs:** 9 (1 critical, 4 high, 4 medium/low)
- **Crashes:** 1

## Per-section results

| # | Section | Pass | Fail |
|---|---|---|---|
| 1 | Health & Auth | 8 | 0 |
| 2 | Tasks | 10 | 3 |
| 3 | Clients | 5 | 0 |
| 4 | SoWs | 8 | 1 |
| 5 | Bug Reports | 7 | 1 |
| 6 | Calendar Events | 7 | 0 |
| 7 | Teams | 7 | 1 |
| 8 | Hiring | 7 | 2 |
| 9 | Leads | 4 | 0 |
| 10 | RBAC | 7 | 1 |
| 11 | Security | 9 | 0 |
| 12 | Backup/Restore | 9 | 0 |

## Bugs Found

### CRITICAL
**BUG-1:** `/api/audit-log` accessible to non-admin users. Member token gets full 832-entry audit dump. [matches Security audit H3]

### HIGH
**BUG-2:** POST /api/tasks with non-numeric `hours_estimated` returns 500. Should 400.
**BUG-3:** `/api/clients/:id/hiring-count` always returns 0. candidates.client_id not populated from parent position.
**BUG-4:** PATCH /api/tasks/:id does not validate status enum. Accepts arbitrary strings.
**BUG-5:** PATCH /api/tasks/:id does not enforce mandatory fields on In Progress transition (despite Phase 2 adding the validator — not applied).

### MEDIUM/LOW
**BUG-6:** POST /api/bug-reports silently drops `priority`
**BUG-7:** POST /api/sows silently drops `work_package_text` (probably intentional but undocumented)
**BUG-8:** POST /api/teams only accepts British `colour`, drops US `color`
**BUG-9:** POST /api/tasks accepts start_date > end_date (calendar events correctly reject this)

## What Worked

- **SoW PDF scrubbing**: synthetic PDF with GBP 50,000, day rate, limitation of liability, confidentiality — all stripped. Only Statement of Work, Client, and Phase 1/2/3 work content retained. 5 kept, 7 filtered.
- **SQL injection defence**: parameterised everywhere
- **HTML escaping** on task title/description at input (confirms H1 from code review)
- **Bug reports enum validation** on PATCH (rejects bad status/priority)
- **Backup completeness** — all 18 tables including the 8 new ones
- **UUID handling** — never 500 on bad UUIDs, returns 400 or 404
- **Calendar event_type validation** rejects unknown types
- **Date order validation** on calendar events

## Recommended Fix Order

1. BUG-1 — admin guard on `/api/audit-log` (5 min)
2. BUG-2 — try/catch + numeric validation on task hours_estimated
3. BUG-4 — apply bug-reports enum pattern to tasks
4. BUG-5 — actually wire the mandatory-fields check that Phase 2 added
5. BUG-3 — fix hiring-count JOIN through hiring_positions
6. BUG-6/7/8 — document + consistent handling of unknown POST fields
7. BUG-9 — date order validation on tasks
