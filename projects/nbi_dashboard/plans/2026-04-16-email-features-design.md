# Design: PM Report System + Due/Late Ticket Warnings

**Date:** 2026-04-16
**Bug IDs:** `ae561c32` (PM Report), `f3a5e888` (Due/Late Warnings)
**Status:** Draft for review

---

## Overview

Two daily email features that use the newly wired Microsoft Graph API (`sendEmailAsync` via `nbihub@nbi-consulting.com`). Both run as cron jobs alongside the existing backup, expense reminder, and FX rate crons.

---

## Feature 1: PM Report System (`ae561c32`)

### What it does

A weekday-morning email to each team lead summarising what changed in their team's tickets since the last report, what's due soon, and what's late or blocked.

### Recipients

Every user who is a `role='lead'` in `team_members`. Each lead gets one email covering all teams they lead. Users with no `email` field are skipped with a log warning.

### Schedule

`cron.schedule('0 8 * * 1-5')` — 08:00 Monday-Friday.

Weekend changes (Saturday + Sunday) roll into Monday's report. The query window is:
- **Monday:** from Friday 08:00 to Monday 08:00 (72h)
- **Tue-Fri:** from previous day 08:00 to today 08:00 (24h)

### Data sources

**1. Changed tickets** — from `audit_log`:
```sql
SELECT al.entity_id, al.action, al.changes, al.changed_by, al.created_at,
       t.title, t.status, t.assignees, t.due_date, t.priority
FROM audit_log al
JOIN tasks t ON t.id = al.entity_id
WHERE al.entity_type = 'task'
  AND al.created_at >= $window_start
  AND al.created_at < $window_end
  AND t.client_id IN (SELECT client_id FROM teams WHERE id IN (
    SELECT team_id FROM team_members WHERE user_id = $lead_user_id AND role = 'lead'
  ))
ORDER BY al.created_at DESC
```

**2. Due within 5 work-days** — from `tasks`:
```sql
SELECT id, title, due_date, assignees, status, priority
FROM tasks
WHERE due_date != ''
  AND due_date BETWEEN $today AND $five_workdays_ahead
  AND status NOT IN ('Done', 'Cancelled')
  AND client_id IN (...team's clients...)
ORDER BY due_date ASC
```

**3. Late tickets** — due_date in the past, not Done/Cancelled.

**4. Blocked tickets** — status = 'Blocked'.

**5. Lead updates** — from `lead_activities`:
```sql
SELECT la.*, l.title as lead_title
FROM lead_activities la
JOIN leads l ON l.id = la.lead_id
WHERE la.created_at >= $window_start
  AND la.created_at < $window_end
  AND l.client_id IN (...team's clients...)
ORDER BY la.created_at DESC
```

### Email structure

```
Subject: NBI Hub — Daily Report for [Lead Name] — [Date]

Sections:
1. SUMMARY BAR
   "12 tickets changed | 3 due this week | 2 overdue | 1 blocked"

2. OVERDUE & BLOCKED (red section, only if items exist)
   Table: Title | Assignee | Due | Days Late | Status

3. DUE THIS WEEK (amber section, only if items exist)
   Table: Title | Assignee | Due | Status

4. CHANGES SINCE LAST REPORT
   Grouped by ticket, chronological within each:
   "[Ticket Title] — 3 changes
     • Status changed from 'In progress' to 'In Review' (by Glen, 14:32)
     • Assignee added: Magnus (by Glen, 14:33)
     • Due date set to 2026-04-20 (by Glen, 14:35)"

5. LEAD UPDATES (only if items exist)
   Table: Lead | Activity | By | When

Footer: "This report covers [window]. Sent from NBI Hub."
```

### Edge cases

- **No changes and no due/late items:** Skip sending (don't spam empty reports).
- **Team lead with no team clients:** Skip with log.
- **User has no email:** Skip with `log('warn', ...)`.
- **Multiple teams:** One combined email, sections grouped per team.

---

## Feature 2: Due & Late Ticket Warning System (`f3a5e888`)

### What it does

Daily email to ticket assignees alerting them about tickets that are due today or overdue.

### Recipients

Each user in `tasks.assignees` who has a matching `users.email`. One consolidated email per user per day, not one per ticket.

### Schedule

`cron.schedule('0 9 * * 1-5')` — 09:00 Monday-Friday (one hour after PM report, so PMs see context first).

### Trigger logic

For each active (not Done/Cancelled) task with a non-empty `due_date`:
- **Due today:** `due_date = today`
- **1 day late:** `due_date = yesterday` (only on the exact day)
- **3 days late:** `due_date = 3 business days ago` (only on the exact day)
- **Daily after 3 days:** `due_date < 3 business days ago`

This means a ticket gets escalating alerts: due day, 1 day late, 3 days late, then every day.

### Data query

```sql
SELECT t.id, t.title, t.due_date, t.status, t.priority, t.assignees,
       t.client_id, c.name as client_name
FROM tasks t
LEFT JOIN clients c ON c.id = t.client_id
WHERE t.due_date != ''
  AND t.due_date <= $today
  AND t.status NOT IN ('Done', 'Cancelled')
ORDER BY t.due_date ASC
```

Then in JS, group by assignee (unnest the `assignees` array), compute days overdue, and apply the alert schedule filter (today, 1 day, 3 days, or >3 days).

### Email structure

```
Subject: NBI Hub — [N] ticket(s) need attention

Sections:
1. OVERDUE (red, grouped by severity)
   "3+ days overdue" section
   "1 day overdue" section

2. DUE TODAY (amber)
   Table: Title | Client | Due | Priority

Footer: "View in dashboard: [link]. Sent from NBI Hub."
```

### Edge cases

- **No due/late tickets for a user:** No email (don't send empty alerts).
- **Weekends:** Monday's run catches Friday-due tickets (now 3 days late) — they'll appear in the ">3 days" bucket. Tickets due on Saturday/Sunday get their "due today" alert on Monday.
- **User in assignees but not in users table:** Skip (log warning).

---

## Shared infrastructure

### Email template helper

A single `buildEmailHtml(title, sections)` function that wraps content in NBI-branded HTML (dark header bar, clean table styles, footer). Both features call this with their section data.

### Business-day calculation

A shared `addBusinessDays(date, n)` / `businessDaysBetween(a, b)` utility that skips weekends. Does NOT account for bank holidays (can be added later if needed via a holidays table or static list).

### No user preferences table (YAGNI)

Both features are low-volume (one email per person per day, max). No opt-out mechanism in v1. If Glen wants one later, we add an `email_preferences` JSONB column to `users`.

### Database changes

**None.** Both features query existing tables (`audit_log`, `tasks`, `leads`, `lead_activities`, `team_members`, `users`). No new migrations.

### New index (performance)

```sql
CREATE INDEX idx_tasks_due_date ON tasks (due_date) WHERE due_date != '';
```

Worth adding if the tasks table grows large. With 1124 tasks currently, not critical, but cheap insurance.

---

## Implementation scope

| Item | Files | Estimate |
|---|---|---|
| `buildEmailHtml` template helper | server.js | Small utility function |
| `addBusinessDays` / `businessDaysBetween` | server.js | Small utility function |
| PM Report cron job + query + email assembly | server.js | Medium — query joins + grouping logic |
| Due/Late Warning cron job + query + email assembly | server.js | Small — single query + group by assignee |
| Tests: PM report query correctness | tests/unit/ | 3-4 tests |
| Tests: Due/late warning trigger logic | tests/unit/ | 3-4 tests |
| Tests: Business-day calculation | tests/unit/ | 2-3 tests |
| Bug tracker updates | DB | Status → please_review, comments |

---

## What this does NOT include

- Email opt-out / preferences UI
- Bank holiday awareness
- Email delivery tracking / read receipts
- In-app notification mirroring (these are email-only)
- Real-time alerts (these are daily batch jobs)
