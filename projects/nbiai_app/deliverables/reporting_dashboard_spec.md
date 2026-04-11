# Reporting Dashboard Spec — NBIAI Team App

**Author:** Data Analyst
**Date:** 2026-03-28
**Version:** 1.0
**Status:** Draft — for VP Product and CTO review
**Project:** NBIAI Team App

---

## Document Purpose

This document specifies every widget on the Command Centre dashboard and defines the weekly CEO report format. It is the implementation spec for engineering and design. Every widget references the analytics calculations defined in `analytics_requirements.md`. Where there is a discrepancy, `analytics_requirements.md` governs.

The Command Centre is the `/` route — the first screen Glen sees on login. It must answer five questions in under five seconds:
1. Is the AI company running? (agent status)
2. Is work getting done? (task throughput)
3. Is it costing what it should? (financial health)
4. Are clients healthy? (client + pipeline)
5. Is anything on fire? (system health + alerts)

---

## Section 1: Command Centre Dashboard

### Layout

The Command Centre uses a 12-column grid. The page has four rows:

| Row | Content | Height |
|---|---|---|
| 1 — Status bar | Alerts + pending approvals banner | 48px fixed, visible only when alerts exist |
| 2 — KPI strip | Five top-line KPI cards | ~160px |
| 3 — Main panels | Agent roster (left, 8 cols) + Activity feed (right, 4 cols) | ~400px |
| 4 — Secondary panels | Throughput chart (4 cols) + Finance snapshot (4 cols) + Pipeline snapshot (4 cols) | ~320px |

All panels use the dark card style defined in the feature spec (dark background, subtle border, section label in small caps).

---

### Widget 1.1 — Alerts and Approvals Banner

**Widget name:** Alerts and Approvals Banner

**Metrics displayed:** Count of pending approvals (`approvals.status = 'pending'`), count of active threshold alerts.

**Visualisation type:** Full-width banner bar. Amber background for warnings, red background for critical alerts. Two counts shown side by side: "X pending approvals" and "Y active alerts". Each is a clickable link.

**Data source:**
- API endpoint: `GET /api/v1/approvals?status=pending` for approval count.
- Alert count is a client-side computation based on the metric thresholds defined in `analytics_requirements.md`, using data already loaded on the dashboard.

**Update frequency:** Real-time via WebSocket. A `approval_created` event on the `activity_log` triggers a push to the client.

**Drill-down:** Clicking "X pending approvals" navigates to `/approvals`. Clicking "Y active alerts" opens an alerts drawer listing each triggered threshold with a description and a link to the relevant section.

**Visibility:** Hidden entirely when both counts are zero.

---

### Widget 1.2 — KPI Strip (Five Cards)

Five individual stat cards displayed in a horizontal row. Each card has a label, a primary value, and a secondary contextual line (e.g. "vs last week" or "of £X target").

#### Card A — Monthly Revenue

**Metric:** Monthly contracted revenue (Domain 3, metric 3.1).

**Visualisation type:** Large number + progress bar against target.

**Primary value:** Sum of active retainer revenue in GBP for the current month.

**Secondary line:** "£X,XXX of £XX,XXX target" with a percentage. Progress bar fills accordingly. Green if ≥90%, amber if 70-89%, red if <70%.

**Data source:**
```
GET /api/v1/finance/revenue-summary?period=current_month
```
Query: `revenue_items` where `is_active = true`, `revenue_type = 'monthly_retainer'`, `start_date <= today`, `end_date IS NULL OR end_date >= today`. Sum `amount` (GBP).

**Update frequency:** Daily.

**Drill-down:** Click navigates to `/finance`.

---

#### Card B — Open Tasks

**Metric:** Count of tasks in non-terminal status (Domain 2, metric 2.2).

**Visualisation type:** Large number + directional delta from last week.

**Primary value:** Count of tasks where `status NOT IN ('done', 'cancelled')`.

**Secondary line:** "+X since last week" or "-X since last week" with an arrow indicator. Red arrow if growing, green arrow if shrinking.

**Data source:**
```
GET /api/v1/tasks/summary
```
Query: `tasks` where `status NOT IN ('done', 'cancelled')` and `company_id = :id`. Compare to count 7 days ago using `created_at` and `completed_at` logic.

**Update frequency:** Real-time via WebSocket on task status changes.

**Drill-down:** Click navigates to `/tasks`.

---

#### Card C — Agent Cost This Month

**Metric:** Total agent API spend this month in USD (Domain 1, metric 1.6).

**Visualisation type:** Large number + delta from same period last month.

**Primary value:** Sum of `agent_executions.cost_usd` for the current calendar month, displayed in USD (with GBP equivalent in smaller text beneath, using configured exchange rate).

**Secondary line:** "vs $X.XX last month" with percentage change.

**Data source:**
```
GET /api/v1/finance/agent-cost-summary?period=current_month
```
Query: `agent_executions` grouped by month, summing `cost_usd`.

**Update frequency:** Real-time.

**Drill-down:** Click navigates to `/finance`.

---

#### Card D — Weighted Pipeline

**Metric:** Weighted pipeline value in GBP (Domain 5, metric 3.5).

**Visualisation type:** Large number.

**Primary value:** `SUM(expected_value * probability / 100)` across active pipeline leads (not `closed_won` or `closed_lost`). Displayed in GBP.

**Secondary line:** Count of active leads shown beneath ("X active leads").

**Data source:**
```
GET /api/v1/pipeline/summary
```
Query: `pipeline_leads` where `stage NOT IN ('closed_won', 'closed_lost')`. Sum `expected_value * probability / 100`, converting to GBP using configured rate.

**Update frequency:** Real-time.

**Drill-down:** Click navigates to `/leads-clients`.

---

#### Card E — Pending Approvals

**Metric:** Count of pending Glen approvals (Domain n/a — operational status).

**Visualisation type:** Large number with red badge if count > 0.

**Primary value:** Count of `approvals` where `status = 'pending'`.

**Secondary line:** Oldest pending approval age ("Oldest: 3 hours ago").

**Data source:**
```
GET /api/v1/approvals?status=pending&limit=1&sort=created_at_asc
```

**Update frequency:** Real-time via WebSocket.

**Drill-down:** Click navigates to `/approvals`.

---

### Widget 1.3 — Agent Roster Panel

**Widget name:** Agent Roster

**Metrics displayed:** Live status of every active agent (non-terminated), current task, time on current task, model tier, budget utilisation this month.

**Visualisation type:** Table with one row per agent. Columns: Agent Name, Role, Status (coloured badge), Current Task (truncated to 60 chars), Time on Task, Model Tier badge, Budget Used %.

**Status badge colours:**
- `running` — electric blue
- `idle` — grey
- `active` — green
- `blocked` — amber
- `error` / `offline` — red
- `paused` — light grey

**Data source:**
```
GET /api/v1/agents?status=active,idle,running,blocked,paused,error
```
JOIN `agent_heartbeats` for `last_seen_at` and `status_message`. JOIN `agent_budgets` on `month_year = current_month` for budget utilisation. JOIN `tasks` on `current_task_id` for task title.

Key columns from schema:
- `agents.name`, `agents.status`, `agents.model_tier`, `agents.current_task_id`
- `agent_heartbeats.last_seen_at`, `agent_heartbeats.status_message`
- `agent_budgets.spent_usd`, `agent_budgets.budget_usd`
- `tasks.title`, `tasks.started_at`

"Time on Task" is computed as `NOW() - tasks.started_at` for in-progress tasks.

**Update frequency:** Real-time via WebSocket on `agent_heartbeats.updated_at` changes. Status badge refreshes without full page reload.

**Drill-down:** Click on an agent row navigates to the agent's detail page (`/org-chart/:agent-slug`).

**Alert state:** Rows where `status IN ('error', 'offline')` have a red left border. Rows where budget utilisation ≥ 80% have an amber right-side indicator.

---

### Widget 1.4 — Activity Feed

**Widget name:** Activity Feed

**Metrics displayed:** Most recent 20 events from `activity_log`, reverse chronological. Shows what the AI company has been doing in real time.

**Visualisation type:** Scrollable event list. Each row: icon (event type), agent/user name, event description, relative timestamp ("3 minutes ago").

**Event types and icons (Lucide React):**
- `task_completed` — CheckCircle (green)
- `task_created` — PlusCircle (blue)
- `task_blocked` — AlertCircle (amber)
- `approval_requested` — ShieldAlert (red)
- `approval_resolved` — ShieldCheck (green)
- `agent_started` — Play (blue)
- `budget_alert` — AlertTriangle (amber)
- `agent_error` — XCircle (red)

**Data source:**
```
GET /api/v1/activity?limit=20&sort=created_at_desc
```
Query: `activity_log` where `company_id = :id`, ordered by `created_at DESC`, limit 20.

JOIN `agents.name` and `users.display_name` for authorship display.

**Update frequency:** Real-time via WebSocket. New events prepend to the top of the list (with a brief fade-in animation). The list does not auto-scroll if Glen has scrolled down manually.

**Drill-down:** Clicking an event row navigates to the linked entity (task, agent, approval, as available from `activity_log.task_id`, `activity_log.agent_id`).

---

### Widget 1.5 — Throughput Chart

**Widget name:** Weekly Throughput

**Metrics displayed:** Tasks created vs tasks completed per week for the trailing 8 weeks (Domain 2, metric 2.1).

**Visualisation type:** Grouped bar chart. Two bars per week: created (blue) and completed (green). X-axis: week start dates. Y-axis: task count.

**Data source:**
```
GET /api/v1/tasks/throughput?weeks=8
```
Query:
```sql
SELECT
  DATE_TRUNC('week', created_at) AS week,
  COUNT(*) AS created,
  COUNT(*) FILTER (WHERE status = 'done' AND DATE_TRUNC('week', completed_at) = DATE_TRUNC('week', created_at)) AS completed
FROM tasks
WHERE company_id = :id
  AND created_at >= NOW() - INTERVAL '8 weeks'
GROUP BY week
ORDER BY week
```

Note: "completed this week" counts tasks where `completed_at` falls in the same week (not `created_at`), to avoid conflating task creation with task closure timing.

**Update frequency:** Daily aggregate. The chart does not refresh real-time; it refreshes at 00:00 UTC daily.

**Drill-down:** Click on a bar navigates to `/tasks` filtered to that week.

---

### Widget 1.6 — Finance Snapshot

**Widget name:** Finance Snapshot

**Metrics displayed:** Three KPIs in a compact stacked layout: (1) monthly retainer revenue vs target, (2) total agent cost this month in USD, (3) human payroll cost this month in GBP.

**Visualisation type:** Three stat rows. Each row: label, value, small badge showing change direction.

**Data source:**
```
GET /api/v1/finance/snapshot
```
Aggregates three queries:
1. Revenue: `revenue_items` active retainers sum (GBP).
2. Agent cost: `agent_executions.cost_usd` sum for current month.
3. Human payroll: `payroll_items` where `payroll_type = 'human'` and `is_active = true`, sum of `monthly_cost` (GBP).

**Update frequency:** Daily.

**Drill-down:** Click anywhere on the widget navigates to `/finance`.

---

### Widget 1.7 — Pipeline Snapshot

**Widget name:** Pipeline Snapshot

**Metrics displayed:** Three KPIs: (1) weighted pipeline value in GBP, (2) active lead count by stage (mini funnel), (3) follow-up overdue count.

**Visualisation type:** Top: large number for weighted value. Middle: horizontal mini funnel (stage name + count as coloured blocks, shrinking left-to-right proportionally). Bottom: follow-up overdue count with amber colouring if >0.

**Data source:**
```
GET /api/v1/pipeline/snapshot
```
Queries:
1. Weighted value: `pipeline_leads` sum of `expected_value * probability / 100`.
2. Stage distribution: `pipeline_leads` group by `stage` where not terminal.
3. Overdue: `pipeline_leads` where `next_action_date < CURRENT_DATE` and not terminal.

**Update frequency:** Daily.

**Drill-down:** Click navigates to `/leads-clients`.

---

### Widget 1.8 — System Health Indicator

**Widget name:** System Health

**Metrics displayed:** Three indicators: (1) execution success rate (last 1 hour), (2) average API call duration (last 1 hour), (3) WebSocket status.

**Visualisation type:** Three rows, each with a label, a value, and a RAG status dot. Green = healthy, amber = degraded, red = failing.

**RAG thresholds:**
| Metric | Green | Amber | Red |
|---|---|---|---|
| Execution success rate | ≥95% | 90-94% | <90% |
| Avg API duration (p95) | <30,000ms | 30,000-90,000ms | >90,000ms |
| WebSocket error rate | <1% | 1-5% | >5% |

**Data source:**
```
GET /api/v1/system/health
```
Aggregates:
1. `agent_executions` last 1 hour success rate.
2. `agent_executions` last 1 hour p95 `duration_ms`.
3. `activity_log` WebSocket event counts last 5 minutes.

**Update frequency:** Real-time (refreshes every 60 seconds, not WebSocket-driven for this widget).

**Drill-down:** Click navigates to Settings page system diagnostics panel.

---

## Section 2: Supporting Page Dashboards

The following pages have embedded analytics panels beyond the core Command Centre. Specified here to give engineering a complete picture before implementation begins.

### 2.1 Finance Page Analytics

**Page route:** `/finance`

**Panels:**
1. **Revenue breakdown table** — all active `revenue_items`, grouped by client. Columns: Client, Type, Amount (native currency), Currency, Start Date, End Date / "Ongoing". Total row at bottom. Sortable columns.
2. **Agent cost breakdown table** — one row per agent showing current month spend vs budget cap. Columns: Agent, Role, Model Tier, Spent (USD), Budget (USD), Utilisation %. Rows sorted by utilisation descending.
3. **Human vs agent cost trend chart** — 6-month stacked bar chart. `payroll_items` monthly_cost (GBP, stacked for all active human staff) vs agent API spend (USD converted to GBP). See analytics_requirements.md Domain 3, metric 3.3.
4. **Pipeline revenue projection** — Weighted pipeline value (from `pipeline_leads`) broken down by expected close date quarter. Simple table: Q1/Q2/Q3/Q4 rows with weighted values. Gives Glen a forward revenue view alongside current contracted base.

---

### 2.2 Leads and Clients Page Analytics

**Page route:** `/leads-clients`

**Panels:**
1. **Client health summary bar** — Three counts (green / amber / red) with coloured blocks. One-line each: "X healthy", "X needs attention", "X at risk".
2. **Pipeline funnel chart** — Horizontal bar funnel showing count of leads per stage. Stages ordered identification → closed_won. Each bar labelled with count and percentage of total.
3. **Win rate KPI card** — Trailing 90-day win rate as a large percentage. Below: all-time win rate in smaller text.
4. **Lead velocity chart** — Bar chart, monthly lead adds for trailing 6 months.
5. **Overdue follow-ups list** — Table of pipeline leads where `next_action_date < CURRENT_DATE`, sorted by overdue date ascending (most overdue first). Columns: Company, Stage, Overdue Since, Next Action (truncated), Owner Agent. Each row has a "Mark Done" quick action.

---

### 2.3 Agent Detail Page Analytics

**Page route:** `/org-chart/:agent-slug` (or equivalent agent detail route)

**Panels:**
1. **Performance stat strip** — Four cards: Completion rate (7d), Avg task duration (7d), Escalation rate (7d), Error rate (7d).
2. **Cost summary** — Current month spend (USD) vs budget cap, as a progress bar.
3. **Recent executions table** — Last 10 `agent_executions` for this agent. Columns: Task title (linked), Status, Duration, Cost (USD), Tokens (input + output), Started At. Status badges coloured per execution status.
4. **Task history** — Last 20 tasks assigned to this agent. Columns: Title, Status, Project, Started, Completed, Duration. Filter by status.

---

## Section 3: Weekly CEO Report

### 3.1 Report Purpose

The weekly CEO report is a structured summary of NBI's operational status delivered to Glen every Monday morning at 08:00 (Europe/London time). It is auto-generated by the Data Analyst agent on a scheduled task. It is a complete operational picture in under two pages — not a raw data dump. The format follows Glen's communication preferences: findings first, numbers second, no fluff.

The report is generated as a text document and optionally sent as a formatted email. Its primary delivery is as an artefact linked from the `activity_log` and visible in the app's notifications.

---

### 3.2 Report Structure

#### Section A — Headline (3 bullets, max)

The three most important things Glen needs to know this week. Written by the Data Analyst agent, not auto-populated. Each bullet is a finding with a "so what" — not just a number.

Examples of correct headline bullets:
- "Agent cost this month is tracking 12% over budget. CEO and CTO agents are the primary drivers — their context windows are loading all three tiers every run. Consider pruning Tier 3 context for routine tasks."
- "Weighted pipeline is down 23% week-on-week following the Sarge Universe close. Two proposals outstanding (Goals Studio, one unidentified). Pipeline needs replenishment."
- "All agents completed 100% of assigned tasks this week with zero errors. System is healthy."

Examples of incorrect headline bullets (too raw):
- "Tasks created: 14. Tasks completed: 12."
- "Agent cost: $47.32."

#### Section B — Agent Performance (table)

| Agent | Role | Tasks Done | Avg Duration | Cost (USD) | Budget Used | Errors |
|---|---|---|---|---|---|---|
| [Name] | [Role] | X | Xm | $X.XX | X% | X |
| ... | | | | | | |
| **Total / Avg** | | | | | | |

One row per active agent. Sorted by cost descending. Agents with zero activity this week are included but shown as "0 tasks / idle".

Flagged rows (amber text): agents with budget utilisation ≥ 80% or error rate > 0.

#### Section C — Company Throughput (2 rows)

Two numbers with commentary:
- Tasks created this week: X | Tasks completed this week: X | Net delta: +X / -X
- Backlog size: X tasks open (X blocked, X in progress, X assigned, X in review)

If any tasks have been blocked for more than 48 hours, list them by name with the blocking reason (from the most recent `task_comments` escalation entry).

#### Section D — Financial Snapshot

Three numbers, each with a one-line commentary if notable:
1. Monthly contracted revenue: £X,XXX (X% of £XX,XXX target)
2. Agent API cost this month: $X.XX (X% of monthly revenue)
3. Weighted pipeline: £X,XXX (Y active leads)

Note any revenue items that expired or were added this week.

#### Section E — Client Health

| Client | Health | Notes |
|---|---|---|
| Couch Heroes | Green | No change |
| Lighthouse Studios | Green | No change |
| [Others] | [Status] | [Any update from activity_log this week] |

Flag any client whose health changed this week. Flag any client with an overdue milestone (`clients.next_milestone_date < today`).

#### Section F — BD Pipeline

- Leads added this week: X
- Leads advanced this week: X (list by company name and stage transition)
- Leads closed (won/lost) this week: X (list by company name and outcome)
- Follow-up overdue: X leads (list company names and overdue date)

#### Section G — System Health (1 paragraph)

Factual summary of system health for the week. Include: execution success rate, any incidents (>10% error rate events), any budget hard stops triggered. If all systems were healthy all week, this is one sentence: "All systems healthy. Execution success rate X% across X total runs."

#### Section H — Action Items for Glen

A numbered list of items that require Glen's personal attention or decision. Auto-generated from:
- Pending approvals (from `approvals` where `status = 'pending'`)
- Overdue client follow-ups (from `pipeline_leads` where `next_action_date < today`)
- Budget alerts triggered this week
- Any metric that crossed an alert threshold this week
- Tasks blocked for >48 hours requiring Glen's intervention

Each item is written as a specific action, not a vague flag. For example: "Approve the draft client email from the CMO agent (Approval #47 — Goals Studio outreach)" rather than "Pending approval exists."

---

### 3.3 Report Generation — Data Queries

The Data Analyst agent generates this report by running the following queries and then interpreting the results into the structured format above. All queries are parameterised to `week_start` (Monday 00:00 local time) and `week_end` (Sunday 23:59 local time).

**Agent performance data:**
```sql
SELECT
  a.name,
  r.name AS role,
  COUNT(t.id) FILTER (WHERE t.status = 'done' AND t.completed_at BETWEEN :week_start AND :week_end) AS tasks_done,
  AVG(EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 60)
    FILTER (WHERE t.status = 'done' AND t.completed_at BETWEEN :week_start AND :week_end) AS avg_duration_min,
  SUM(ae.cost_usd) FILTER (WHERE ae.started_at BETWEEN :week_start AND :week_end) AS week_cost_usd,
  ab.spent_usd / ab.budget_usd * 100 AS budget_utilisation_pct,
  COUNT(ae.id) FILTER (WHERE ae.status = 'failed' AND ae.started_at BETWEEN :week_start AND :week_end) AS errors
FROM agents a
JOIN roles r ON r.id = a.role_id
LEFT JOIN tasks t ON t.assigned_agent_id = a.id
LEFT JOIN agent_executions ae ON ae.agent_id = a.id
LEFT JOIN agent_budgets ab ON ab.agent_id = a.id AND ab.month_year = TO_CHAR(NOW(), 'YYYY-MM')
WHERE a.company_id = :company_id
  AND a.terminated_at IS NULL
GROUP BY a.id, a.name, r.name, ab.spent_usd, ab.budget_usd
ORDER BY week_cost_usd DESC NULLS LAST
```

**Throughput data:**
```sql
SELECT
  COUNT(*) FILTER (WHERE created_at BETWEEN :week_start AND :week_end) AS created_this_week,
  COUNT(*) FILTER (WHERE status = 'done' AND completed_at BETWEEN :week_start AND :week_end) AS completed_this_week,
  COUNT(*) FILTER (WHERE status NOT IN ('done', 'cancelled')) AS open_now,
  COUNT(*) FILTER (WHERE status = 'blocked') AS blocked_now
FROM tasks
WHERE company_id = :company_id
```

**Blocked tasks (>48h):**
```sql
SELECT t.title, t.id, t.started_at,
  EXTRACT(EPOCH FROM (NOW() - t.updated_at)) / 3600 AS hours_blocked
FROM tasks t
WHERE t.company_id = :company_id
  AND t.status = 'blocked'
  AND t.updated_at < NOW() - INTERVAL '48 hours'
ORDER BY t.updated_at ASC
```

**Financial snapshot:**
```sql
-- Revenue (active retainers)
SELECT SUM(amount) AS monthly_retainer_gbp
FROM revenue_items
WHERE company_id = :company_id
  AND revenue_type = 'monthly_retainer'
  AND is_active = true
  AND start_date <= CURRENT_DATE
  AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  AND currency = 'GBP';

-- Agent cost (current month to date)
SELECT SUM(ae.cost_usd) AS month_to_date_cost_usd
FROM agent_executions ae
JOIN agents a ON a.id = ae.agent_id
WHERE a.company_id = :company_id
  AND DATE_TRUNC('month', ae.started_at) = DATE_TRUNC('month', NOW());

-- Weighted pipeline
SELECT SUM(expected_value * probability / 100.0) AS weighted_value_gbp,
       COUNT(*) AS active_lead_count
FROM pipeline_leads
WHERE company_id = :company_id
  AND stage NOT IN ('closed_won', 'closed_lost')
  AND expected_value_currency = 'GBP';
```

**Client health:**
```sql
SELECT name, health, next_milestone, next_milestone_date
FROM clients
WHERE company_id = :company_id AND is_active = true
ORDER BY
  CASE health WHEN 'red' THEN 1 WHEN 'amber' THEN 2 WHEN 'green' THEN 3 END,
  name
```

**BD pipeline weekly activity:**
```sql
-- New leads this week
SELECT COUNT(*) AS new_leads
FROM pipeline_leads
WHERE company_id = :company_id
  AND created_at BETWEEN :week_start AND :week_end;

-- Overdue follow-ups
SELECT company_name, next_action_date, stage
FROM pipeline_leads
WHERE company_id = :company_id
  AND next_action_date < CURRENT_DATE
  AND stage NOT IN ('closed_won', 'closed_lost')
ORDER BY next_action_date ASC;
```

**Pending actions for Glen:**
```sql
SELECT
  'approval' AS item_type,
  title,
  created_at,
  id
FROM approvals
WHERE company_id = :company_id AND status = 'pending'

UNION ALL

SELECT
  'overdue_followup' AS item_type,
  company_name AS title,
  next_action_date::timestamptz AS created_at,
  id
FROM pipeline_leads
WHERE company_id = :company_id
  AND next_action_date < CURRENT_DATE
  AND stage NOT IN ('closed_won', 'closed_lost')

ORDER BY created_at ASC
```

---

### 3.4 Report Schedule and Delivery

**Schedule:** Every Monday at 08:00 Europe/London time. If Monday is a UK bank holiday, generate on Tuesday at 08:00.

**Trigger:** A scheduled task in the NBIAI app task system, created by the CEO agent as a recurring assignment to the Data Analyst agent. The task is auto-created by the system; the Data Analyst agent executes it.

**Output:** The report is saved as a text artefact attached to the weekly task record (`tasks.output`). It is also written to `activity_log` with `event_type = 'weekly_report_generated'` and a link to the task record.

**Optional delivery:** If Glen's email is configured in `users.email`, the app can send the report as a plain-text email. This requires the email integration (SendGrid or equivalent) to be configured. Email delivery is a v2 feature; the in-app artefact is v1.

**Naming convention:** "Weekly CEO Report — W/C [DD MMM YYYY]" (using the Monday date of the report week).

---

### 3.5 Report Quality Standards

Before the Data Analyst agent submits the report, it must pass these checks:

1. All numerical figures referenced in the Headline section match figures in Sections B through G. No headline claim that is not backed by a figure in the body.
2. No figures labelled "GBP" that come from USD-native data without currency conversion applied.
3. Any metric that relies on an approximate calculation (as flagged in `analytics_requirements.md`) is labelled "(estimate)" in the report.
4. The Action Items section (H) contains at least one item if there are any pending approvals, overdue follow-ups, or triggered alerts. An empty Action Items section when known items exist is a report quality failure.
5. The report is written in British English. No American spellings.

If any of these checks fail, the Data Analyst agent flags the report as a draft and escalates to the COO before delivery.

---

## Section 4: Alert Delivery

Alerts are delivered through three channels in priority order:

| Priority | Channel | Condition |
|---|---|---|
| P1 — Critical | In-app banner (red) + notification bell badge | Any agent error rate >10%, budget hard stop, client goes red, execution success rate <90% |
| P2 — Warning | In-app notification bell + amber banner | Budget 80% alert, backlog growing 3 weeks, win rate <20%, follow-ups >3 overdue |
| P3 — Informational | Notification bell only | New task created by agent, approval resolved, weekly report ready |

Alert records are written to `activity_log` with an `event_type` prefix of `alert_*` (e.g. `alert_budget_80pct`, `alert_agent_error_rate`). This provides a queryable audit trail of all alerts triggered.

Alert deduplication: a P1 or P2 alert for the same condition on the same entity should not fire again for 4 hours unless the condition worsens (e.g. a budget alert fires at 80%; it does not re-fire at 81%, but does fire again at 100%).

---

## Section 5: Implementation Priorities

The following is the recommended implementation order for engineering, based on what delivers the most value to Glen earliest:

**Phase 1 (must-have for launch):**
- Widget 1.3 Agent Roster (real-time agent status is the core value proposition)
- Widget 1.1 Alerts and Approvals Banner
- Widget 1.2 Cards A (Revenue), B (Open Tasks), E (Pending Approvals)
- Widget 1.4 Activity Feed

**Phase 2 (complete the dashboard):**
- Widget 1.2 Cards C (Agent Cost), D (Pipeline)
- Widget 1.5 Throughput Chart
- Widget 1.6 Finance Snapshot
- Widget 1.7 Pipeline Snapshot
- Widget 1.8 System Health

**Phase 3 (reporting infrastructure):**
- Finance page analytics panels
- Leads and Clients page analytics panels
- Agent detail page analytics panels
- Weekly CEO report generation (Data Analyst agent scheduled task)

The schema enhancement requests in `analytics_requirements.md` (pipeline stage history table, `closed_at` column) are Phase 3 dependencies and should be scoped into the Phase 3 sprint.
