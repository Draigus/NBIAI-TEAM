# Analytics Requirements — NBIAI Team App

**Author:** Data Analyst
**Date:** 2026-03-28
**Version:** 1.0
**Status:** Draft — for VP Product and CTO review
**Project:** NBIAI Team App

---

## Document Purpose

This document defines every metric the NBIAI Team App must track and report. It is the source of truth for analytics engineering. Each metric is specified with its exact calculation (referencing actual DB columns from schema.ts), its UI placement, update frequency, and any alerting thresholds.

The primary audience for these metrics is Glen Pryer. He is running an AI company — he needs to know whether the company is working, what it is costing, and whether it is generating commercial return. The metrics in this document are designed to answer those three questions at a glance.

**Data quality note:** All metrics derived from `agent_executions.cost_usd` are in USD (Anthropic billing currency). All metrics derived from `revenue_items.amount` and `payroll_items.monthly_cost` are in the item's native currency (primarily GBP for human costs, USD for agent API costs). The UI must display currency codes clearly alongside all monetary values. Currency conversion for blended comparisons should use a configurable exchange rate stored in `companies.settings`.

---

## Domain 1: Agent Performance

### 1.1 Task Completion Rate

**What it measures:** The proportion of tasks assigned to an agent that reach `done` status without being cancelled. Tells Glen whether agents are reliably finishing work or dropping tasks. A low rate is the first signal that a role configuration, prompt, or context problem exists.

**Calculation:**
```sql
COUNT(*) FILTER (WHERE t.status = 'done')
/ NULLIF(COUNT(*) FILTER (WHERE t.status IN ('done', 'cancelled')), 0) * 100

FROM tasks t
WHERE t.assigned_agent_id = :agent_id
  AND t.created_at >= :period_start
```

Expressed as a percentage. Excludes tasks still in-flight (`backlog`, `assigned`, `in_progress`, `blocked`, `review`) from the denominator — only terminal states are counted. Calculated per agent and as a company-wide aggregate.

**UI placement:** Agent detail page (per-agent stat card), Command Centre dashboard (company aggregate).

**Update frequency:** Real-time (recomputed on each task status change via PostgreSQL NOTIFY trigger on `tasks.status`).

**Threshold alerts:** Alert Glen when any individual agent's 7-day rolling completion rate drops below 70%.

---

### 1.2 Average Task Duration

**What it measures:** Mean wall-clock time from task start to task completion. Tracks whether agents are executing at a reasonable pace and helps identify runaway tasks or model tier mismatches (an Opus agent taking 45 minutes on a formatting task is a cost problem).

**Calculation:**
```sql
AVG(EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 60)

FROM tasks t
WHERE t.assigned_agent_id = :agent_id
  AND t.status = 'done'
  AND t.started_at IS NOT NULL
  AND t.completed_at IS NOT NULL
  AND t.created_at >= :period_start
```

Result is in minutes. Report as mean and p95 (95th percentile) to surface outlier tasks that distort the average.

**UI placement:** Agent detail page (stat card), Tasks page (column on completed task table).

**Update frequency:** Daily aggregate. Real-time for in-progress task elapsed time display.

**Threshold alerts:** Alert when any individual task exceeds 120 minutes of elapsed time without completion (potential hang or runaway execution).

---

### 1.3 Escalation Rate

**What it measures:** The proportion of tasks that generate an escalation comment (i.e., the agent flagged being blocked or needing human input). High escalation rates indicate unclear task briefs, missing knowledge context, or role scope creep.

**Calculation:**
```sql
COUNT(DISTINCT tc.task_id) FILTER (WHERE tc.comment_type = 'escalation')
/ NULLIF(COUNT(DISTINCT t.id), 0) * 100

FROM tasks t
LEFT JOIN task_comments tc ON tc.task_id = t.id
WHERE t.assigned_agent_id = :agent_id
  AND t.created_at >= :period_start
```

Expressed as a percentage. Calculated per agent.

**UI placement:** Agent detail page.

**Update frequency:** Daily.

**Threshold alerts:** Alert when escalation rate for any agent exceeds 25% in a rolling 7-day window.

---

### 1.4 Execution Error Rate

**What it measures:** The proportion of agent execution runs that end in `failed` status. Captures API errors, timeouts, and Claude refusals. Distinguished from task cancellations, which are intentional. This is a system reliability metric.

**Calculation:**
```sql
COUNT(*) FILTER (WHERE ae.status = 'failed')
/ NULLIF(COUNT(*), 0) * 100

FROM agent_executions ae
WHERE ae.agent_id = :agent_id
  AND ae.started_at >= :period_start
```

Expressed as a percentage. Calculated per agent and company-wide.

**UI placement:** System Health section of Command Centre dashboard, Agent detail page.

**Update frequency:** Real-time.

**Threshold alerts:** Alert immediately when error rate on any agent exceeds 10% in a rolling 1-hour window (likely indicates a systemic API or configuration issue).

---

### 1.5 Cost Per Task

**What it measures:** Mean USD API cost incurred per completed task per agent. The core unit economics metric. If an agent is completing tasks for $0.12 each and producing £500 of value, Glen has a strong ROI argument. If a task is costing $8, something is wrong with the context assembly or model tier choice.

**Calculation:**
```sql
SUM(ae.cost_usd) / NULLIF(COUNT(DISTINCT ae.task_id), 0)

FROM agent_executions ae
WHERE ae.agent_id = :agent_id
  AND ae.task_id IS NOT NULL
  AND ae.status = 'completed'
  AND ae.started_at >= :period_start
```

Note: a single task may involve multiple executions (e.g. a paused task resumed after approval). All execution costs against a task ID are summed before dividing.

**UI placement:** Agent detail page (stat card), Finance page (agent cost breakdown table).

**Update frequency:** Daily.

**Threshold alerts:** None by default. Glen can configure per-role thresholds in agent config.

---

### 1.6 Cost Per Agent Per Month

**What it measures:** Total USD API spend for each agent in the current calendar month. The operational cost headline for running each AI team member. Compared against `agent_budgets.budget_usd` to show budget utilisation.

**Calculation:**
```sql
-- Current month actuals (from execution records):
SUM(ae.cost_usd)

FROM agent_executions ae
WHERE ae.agent_id = :agent_id
  AND DATE_TRUNC('month', ae.started_at) = DATE_TRUNC('month', NOW())

-- Budget utilisation:
ab.spent_usd / ab.budget_usd * 100 AS utilisation_pct

FROM agent_budgets ab
WHERE ab.agent_id = :agent_id
  AND ab.month_year = TO_CHAR(NOW(), 'YYYY-MM')
```

The `agent_budgets.spent_usd` column is the running total maintained by the application after each execution. Use this for real-time display; use the raw execution sum for monthly reporting to ensure accuracy in case of budget table lag.

**UI placement:** Finance page (agent cost table), Command Centre dashboard (agent cost summary widget), Agent detail page.

**Update frequency:** Real-time (updated after each execution completes).

**Threshold alerts:**
- 80% budget utilisation: amber alert (email + in-app). `agent_budgets.alert_sent_at` tracks whether the alert has been sent.
- 100% budget utilisation: red alert. Hard stop enforced by execution layer. `agent_budgets.hard_stop_at` records the event.

---

## Domain 2: Company Throughput

### 2.1 Tasks Created vs Completed Per Week

**What it measures:** A two-line comparison: how many new tasks are entering the system each week versus how many are being closed. If creates consistently outpace completions, the backlog is growing — the company has a capacity or throughput problem. If completions consistently outpace creates, the team is clearing debt.

**Calculation:**
```sql
-- Created per week:
COUNT(*) FILTER (
  WHERE DATE_TRUNC('week', t.created_at) = DATE_TRUNC('week', :week_date)
) AS tasks_created,

-- Completed per week:
COUNT(*) FILTER (
  WHERE t.status = 'done'
  AND DATE_TRUNC('week', t.completed_at) = DATE_TRUNC('week', :week_date)
) AS tasks_completed

FROM tasks t
WHERE t.company_id = :company_id
```

Run for the trailing 12 weeks to populate the trend chart.

**UI placement:** Command Centre dashboard (trend chart widget), weekly CEO report.

**Update frequency:** Daily aggregate for trend chart. Real-time count for current week.

**Threshold alerts:** Alert when created > completed for 3 consecutive weeks (backlog growth trend).

---

### 2.2 Backlog Growth / Shrink Rate

**What it measures:** The net change in the number of open tasks week-on-week. A positive number means the backlog is growing; negative means it is shrinking. Combines with 2.1 to give a full picture of throughput health.

**Calculation:**
```sql
-- Open task count (snapshot):
COUNT(*) FILTER (
  WHERE t.status NOT IN ('done', 'cancelled')
) AS open_tasks_now

FROM tasks t
WHERE t.company_id = :company_id

-- Week-on-week delta:
open_tasks_now - open_tasks_last_week AS backlog_delta
```

`open_tasks_last_week` requires a snapshot or is derived by counting tasks in non-terminal statuses where `created_at < 7 days ago AND (completed_at IS NULL OR completed_at > 7 days ago)`.

**UI placement:** Command Centre dashboard (KPI card with directional arrow).

**Update frequency:** Daily.

**Threshold alerts:** Alert when open task count exceeds 50 (configurable threshold).

---

### 2.3 Blocked Task Rate

**What it measures:** The percentage of currently open tasks in `blocked` status. Even one chronically blocked task can hold up a project milestone. A high blocked rate is a signal for Glen to review and either resolve the blockers himself or reassign.

**Calculation:**
```sql
COUNT(*) FILTER (WHERE t.status = 'blocked')
/ NULLIF(COUNT(*) FILTER (WHERE t.status NOT IN ('done', 'cancelled')), 0) * 100

FROM tasks t
WHERE t.company_id = :company_id
```

**UI placement:** Command Centre dashboard (KPI card), Tasks page (filter badge showing blocked count).

**Update frequency:** Real-time.

**Threshold alerts:** Alert when blocked task rate exceeds 20%, or when any individual task has been in `blocked` status for more than 48 hours.

---

### 2.4 Average Time-in-Status Per Status

**What it measures:** How long tasks spend on average in each status before transitioning. Identifies pipeline bottlenecks — for example, if tasks spend an average of 3 hours in `review` before moving to `done`, the review process may need streamlining.

**Calculation:**

This metric requires `task_comments` status change records (type: `status_change`, metadata contains `{ "from": "...", "to": "..." }`).

```sql
-- For each status transition pair, compute time between consecutive status_change events:
AVG(
  EXTRACT(EPOCH FROM (next_change.created_at - tc.created_at)) / 3600
) AS avg_hours_in_status

FROM task_comments tc
JOIN task_comments next_change
  ON next_change.task_id = tc.task_id
  AND next_change.comment_type = 'status_change'
  AND next_change.created_at > tc.created_at
WHERE tc.comment_type = 'status_change'
  AND (tc.metadata->>'to') = :status_name
-- Join ensures next_change is the immediate next status_change event (requires a window function approach)
```

Implementation note: a CTE with `LEAD()` window function over `task_comments` ordered by `created_at` per `task_id` is the correct approach. Engineering should implement this as a pre-computed daily aggregate to avoid expensive window function scans on the full comments table.

**UI placement:** Tasks page (funnel visualisation showing avg hours per status column).

**Update frequency:** Daily aggregate.

**Threshold alerts:** None by default. Glen configures per-status thresholds if needed.

---

## Domain 3: Financial Health

### 3.1 Monthly Contracted Revenue vs Target

**What it measures:** Current month's contracted revenue (sum of active retainers + any milestone payments due this month) compared to a manually set monthly revenue target. The top-line health indicator for the business. NBI runs on retainers and project contracts — this number tells Glen immediately whether the revenue base is where it needs to be.

**Calculation:**
```sql
-- Monthly contracted revenue (retainers):
SUM(ri.amount) FILTER (
  WHERE ri.revenue_type = 'monthly_retainer'
  AND ri.is_active = true
  AND ri.start_date <= CURRENT_DATE
  AND (ri.end_date IS NULL OR ri.end_date >= CURRENT_DATE)
) AS monthly_retainer_revenue,

-- One-off / milestone revenue due this month:
SUM(ri.amount) FILTER (
  WHERE ri.revenue_type IN ('one_off', 'milestone')
  AND ri.is_active = true
  AND DATE_TRUNC('month', ri.start_date::timestamptz) = DATE_TRUNC('month', NOW())
) AS one_off_revenue_this_month

FROM revenue_items ri
WHERE ri.company_id = :company_id
```

Note: amounts are in the currency stored in `ri.currency`. GBP items can be summed directly. USD items require conversion using the configured exchange rate in `companies.settings` before combining into a GBP total for display.

The monthly target is stored in `companies.settings` as a configurable value (e.g. `settings.monthly_revenue_target_gbp`).

**UI placement:** Finance page (hero KPI card at top), Command Centre dashboard (revenue widget).

**Update frequency:** Daily (revenue items change infrequently; daily refresh is sufficient).

**Threshold alerts:** Alert when current month contracted revenue falls below 80% of target.

---

### 3.2 Agent Cost as Percentage of Revenue

**What it measures:** Total agent API cost (USD, converted to GBP) as a percentage of monthly contracted revenue. Tracks whether the AI team is consuming a disproportionate share of revenue. A well-run AI company should have agent costs represent a small fraction of the revenue they help generate.

**Calculation:**
```sql
-- Total agent cost this month (USD):
SUM(ae.cost_usd) AS total_agent_cost_usd

FROM agent_executions ae
WHERE ae.started_at >= DATE_TRUNC('month', NOW())

-- Converted to GBP using configured rate, then:
(total_agent_cost_gbp / monthly_contracted_revenue_gbp) * 100 AS agent_cost_pct
```

**UI placement:** Finance page (KPI card alongside revenue). Expressed as a percentage with the absolute GBP equivalent shown beneath.

**Update frequency:** Daily.

**Threshold alerts:** Alert when agent cost exceeds 5% of monthly revenue (configurable). Early warning that AI spend is becoming material relative to income.

---

### 3.3 Payroll Cost Trend (Human vs Agent)

**What it measures:** Month-over-month trend of human payroll costs versus agent API costs. Tracks the cost composition of running the company over time. As NBI's AI team matures, Glen will want to see the ratio shift — agent work should substitute for or augment human capacity, not simply add cost on top.

**Calculation:**
```sql
-- Human payroll (monthly, from payroll_items):
SUM(pi.monthly_cost) FILTER (WHERE pi.payroll_type = 'human' AND pi.is_active = true)
  AS human_monthly_cost

-- Agent payroll (actual API spend this month, from executions):
SUM(ae.cost_usd) AS agent_cost_usd_this_month

FROM payroll_items pi, agent_executions ae
WHERE pi.company_id = :company_id
  AND DATE_TRUNC('month', ae.started_at) = :month
```

Run for trailing 6 months to populate the trend chart. Human costs use `payroll_items.monthly_cost` (budget/contracted). Agent costs use actual execution spend from `agent_executions`. Both displayed in GBP (agent costs converted at configured rate).

**UI placement:** Finance page (stacked bar chart, human vs agent, 6-month trend).

**Update frequency:** Monthly.

**Threshold alerts:** None. Informational trend only.

---

### 3.4 Pipeline Conversion Rate

**What it measures:** The percentage of pipeline leads that advance from `identification` to `closed_won`. Tracks commercial effectiveness. Broken down by stage (identification → qualification → outreach → discovery → proposal → negotiation → closed_won) to identify which stage has the highest drop-off.

**Calculation:**
```sql
-- Overall win rate:
COUNT(*) FILTER (WHERE pl.stage = 'closed_won')
/ NULLIF(COUNT(*) FILTER (WHERE pl.stage IN ('closed_won', 'closed_lost')), 0) * 100
  AS win_rate_pct

-- Stage-by-stage conversion (requires comparing entries vs exits per stage):
-- Use created_at and updated_at timestamps plus stage values to derive transitions
-- Implementation: track stage changes via updated_at + current stage; historical stage data
-- requires a pipeline_lead_history table if full funnel tracking is needed.
-- In v1, compute approximate conversion using current stage distribution.

FROM pipeline_leads pl
WHERE pl.company_id = :company_id
  AND pl.created_at >= :period_start
```

**Data quality flag:** The current schema stores only the current pipeline stage, not a full stage history. Accurate funnel drop-off analysis requires a `pipeline_lead_stage_history` table recording each stage transition with a timestamp. This is flagged as a schema enhancement request to engineering. Until implemented, the win rate (closed won / total terminal) is calculable; stage-by-stage conversion rates are estimates only.

**UI placement:** Leads & Clients page (funnel chart), weekly CEO report.

**Update frequency:** Daily.

**Threshold alerts:** Alert when win rate drops below 20% on a trailing 90-day basis.

---

### 3.5 Weighted Pipeline Value

**What it measures:** Sum of expected contract values weighted by probability. The single number that represents the realistic revenue potential of the current pipeline. Glen uses this to gauge whether NBI is on track to hit revenue targets for the next quarter.

**Calculation:**
```sql
SUM(
  (pl.expected_value * pl.probability / 100.0)
) AS weighted_pipeline_value

FROM pipeline_leads pl
WHERE pl.company_id = :company_id
  AND pl.stage NOT IN ('closed_won', 'closed_lost')
```

`pl.expected_value` is in `pl.expected_value_currency`. Convert to GBP for display using the configured exchange rate. Amounts are from `pipeline_leads.expected_value` and `pipeline_leads.probability`.

**UI placement:** Leads & Clients page (KPI card at top), Command Centre dashboard (pipeline widget), Finance page.

**Update frequency:** Real-time (updated when pipeline_leads records change).

**Threshold alerts:** Alert when weighted pipeline value falls below 3x monthly revenue target (forward coverage threshold — configurable).

---

## Domain 4: Client Health

### 4.1 Active Client Count

**What it measures:** Number of active client records (clients.is_active = true). Simple headcount of current paying or active-engagement clients. NBI's revenue is concentrated across a small number of clients — tracking this number matters.

**Calculation:**
```sql
COUNT(*) FILTER (WHERE c.is_active = true)
FROM clients c
WHERE c.company_id = :company_id
```

**UI placement:** Command Centre dashboard (KPI card), Leads & Clients page (page header stat).

**Update frequency:** Real-time.

**Threshold alerts:** Alert if active client count drops below 3 (configurable minimum — below this NBI has dangerous revenue concentration risk).

---

### 4.2 Client Health Distribution

**What it measures:** Count of active clients in each RAG health state (green / amber / red). Gives Glen an immediate visual scan of the portfolio. Any red client requires his personal attention. Any amber client needs a plan.

**Calculation:**
```sql
COUNT(*) FILTER (WHERE c.health = 'green') AS green_count,
COUNT(*) FILTER (WHERE c.health = 'amber') AS amber_count,
COUNT(*) FILTER (WHERE c.health = 'red')  AS red_count

FROM clients c
WHERE c.company_id = :company_id
  AND c.is_active = true
```

**UI placement:** Command Centre dashboard (RAG distribution bar or status indicators), Leads & Clients page (client cards with health badge).

**Update frequency:** Real-time (health field is manually updated via UI).

**Threshold alerts:** Immediate alert when any client is set to `red` status.

---

### 4.3 Follow-up Compliance Rate

**What it measures:** The percentage of pipeline leads with overdue `next_action_date` values where no follow-up has been recorded. Tracks whether the CMO agent (and Glen) are staying on top of BD pipeline hygiene. A lead with an overdue next action date is a lead that is silently going cold.

**Calculation:**
```sql
-- Overdue follow-ups:
COUNT(*) FILTER (
  WHERE pl.next_action_date < CURRENT_DATE
  AND pl.stage NOT IN ('closed_won', 'closed_lost')
) AS overdue_followup_count,

-- Total active leads requiring follow-up:
COUNT(*) FILTER (
  WHERE pl.next_action_date IS NOT NULL
  AND pl.stage NOT IN ('closed_won', 'closed_lost')
) AS leads_with_followup_date,

-- Compliance rate (not overdue / total with a date):
(leads_with_followup_date - overdue_followup_count)
  / NULLIF(leads_with_followup_date, 0) * 100 AS compliance_rate_pct

FROM pipeline_leads pl
WHERE pl.company_id = :company_id
```

**UI placement:** Leads & Clients page (KPI card). Overdue count shown as a badge on the sidebar nav item.

**Update frequency:** Real-time (date comparison against CURRENT_DATE, recomputed on page load).

**Threshold alerts:** Alert when overdue follow-up count exceeds 3, or compliance rate drops below 80%.

---

## Domain 5: BD Pipeline

### 5.1 Lead Velocity

**What it measures:** Number of new pipeline leads added per month over the trailing 6 months. Tracks whether NBI's BD engine is generating enough top-of-funnel activity. NBI's client acquisition is currently relationship-driven; this metric makes that visible and holds the CMO agent accountable for pipeline sourcing activity.

**Calculation:**
```sql
COUNT(*) AS leads_added,
DATE_TRUNC('month', pl.created_at) AS month

FROM pipeline_leads pl
WHERE pl.company_id = :company_id
  AND pl.created_at >= NOW() - INTERVAL '6 months'
GROUP BY DATE_TRUNC('month', pl.created_at)
ORDER BY month
```

**UI placement:** Leads & Clients page (bar chart, monthly lead adds).

**Update frequency:** Daily aggregate.

**Threshold alerts:** Alert when a calendar month passes with fewer than 2 new leads added (configurable minimum — signals BD activity has stalled).

---

### 5.2 Stage Conversion Rates

**What it measures:** What percentage of leads that reach each stage advance to the next stage. Identifies where NBI loses prospects. NBI's typical drop-off point is at the proposal-to-negotiation transition (price sensitivity). Tracking this formally makes it visible.

**Calculation:** See note under 3.4 (Pipeline Conversion Rate). Full stage-by-stage conversion requires a `pipeline_lead_stage_history` table. In v1, report current stage distribution as a proxy:

```sql
COUNT(*) AS lead_count,
pl.stage

FROM pipeline_leads pl
WHERE pl.company_id = :company_id
GROUP BY pl.stage
ORDER BY ARRAY_POSITION(
  ARRAY['identification','qualification','outreach','discovery','proposal','negotiation','closed_won','closed_lost'],
  pl.stage::text
)
```

**Data quality flag:** This is a snapshot of current lead distribution, not a historical funnel with stage-by-stage transition rates. Accurate conversion rates require the schema enhancement noted in 3.4. Flagged to engineering as a v2 requirement.

**UI placement:** Leads & Clients page (horizontal funnel chart).

**Update frequency:** Daily.

**Threshold alerts:** None specific. Visual representation is the primary value here.

---

### 5.3 Average Deal Cycle Time

**What it measures:** Mean number of days from a lead's `created_at` to its `updated_at` when it moved to `closed_won`. Tracks how long NBI's sales cycle takes from identification to close. NBI's deals are relationship-driven and tend to be long; this metric contextualises that and tracks whether cycle times are improving or deteriorating.

**Calculation:**
```sql
AVG(
  EXTRACT(EPOCH FROM (pl.updated_at - pl.created_at)) / 86400
) AS avg_days_to_close

FROM pipeline_leads pl
WHERE pl.company_id = :company_id
  AND pl.stage = 'closed_won'
  AND pl.created_at >= :period_start
```

**Data quality flag:** This uses `updated_at` as a proxy for close date, which is accurate only if the record was updated when the stage was changed to `closed_won`. Engineering should add a `closed_at` timestamp column to `pipeline_leads` in v2. Until then, this is an approximation — flagged as such in the UI.

**UI placement:** Leads & Clients page (stat card under pipeline section).

**Update frequency:** Weekly.

**Threshold alerts:** None.

---

### 5.4 Win Rate

**What it measures:** Percentage of pipeline leads in terminal stages that ended in `closed_won` versus `closed_lost`. The commercial effectiveness headline. NBI's win rate on scoped proposals is the single most important leading indicator of revenue health.

**Calculation:**
```sql
COUNT(*) FILTER (WHERE pl.stage = 'closed_won')
/ NULLIF(COUNT(*) FILTER (WHERE pl.stage IN ('closed_won', 'closed_lost')), 0) * 100
  AS win_rate_pct

FROM pipeline_leads pl
WHERE pl.company_id = :company_id
  AND pl.created_at >= :period_start
```

Report on a trailing 12-month and all-time basis.

**UI placement:** Leads & Clients page (KPI card), weekly CEO report.

**Update frequency:** Daily.

**Threshold alerts:** Alert when trailing 90-day win rate drops below 20%.

---

## Domain 6: System Health

### 6.1 Agent Execution Success Rate

**What it measures:** Percentage of agent execution runs that complete successfully (`completed`) versus failing (`failed`, `cancelled`). The health signal for the AI execution layer. Anything below 95% needs investigation.

**Calculation:**
```sql
COUNT(*) FILTER (WHERE ae.status = 'completed')
/ NULLIF(COUNT(*) FILTER (WHERE ae.status IN ('completed', 'failed', 'cancelled')), 0) * 100
  AS success_rate_pct

FROM agent_executions ae
WHERE ae.company_id IS NOT NULL  -- all executions for this company via agent join
  AND ae.started_at >= :period_start
```

Join on `agents.company_id` to scope to the correct company.

**UI placement:** Command Centre dashboard (system health widget), Settings page (system status panel).

**Update frequency:** Real-time.

**Threshold alerts:** Alert immediately when rolling 1-hour success rate drops below 90%.

---

### 6.2 Average API Call Duration

**What it measures:** Mean execution duration in milliseconds for completed agent execution runs. Tracks latency in the Claude API response layer. Material increases in duration suggest API-side latency, context window bloat, or over-complex prompts.

**Calculation:**
```sql
AVG(ae.duration_ms) AS avg_duration_ms,
PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ae.duration_ms) AS p95_duration_ms

FROM agent_executions ae
WHERE ae.status = 'completed'
  AND ae.duration_ms IS NOT NULL
  AND ae.started_at >= :period_start
```

Report as mean and p95. `ae.duration_ms` is computed on execution completion.

**UI placement:** Command Centre dashboard (system health widget). Trend line over trailing 24 hours.

**Update frequency:** Real-time.

**Threshold alerts:** Alert when p95 duration exceeds 90,000ms (90 seconds) on a 1-hour rolling basis.

---

### 6.3 WebSocket Connection Stability

**What it measures:** Percentage of time the WebSocket server is reporting active connections without error. The NBIAI app uses PostgreSQL LISTEN/NOTIFY piped to WebSocket for real-time updates. If connections are unstable, Glen will see stale data on the Command Centre.

**Calculation:** This is an application-layer metric, not directly computable from the existing schema. The WebSocket server should log connection events (connect, disconnect, error) to the `activity_log` table using `event_type` values like `ws_connected`, `ws_disconnected`, `ws_error`.

```sql
-- WebSocket error rate (proxy metric):
COUNT(*) FILTER (WHERE al.event_type = 'ws_error')
/ NULLIF(COUNT(*) FILTER (WHERE al.event_type LIKE 'ws_%'), 0) * 100
  AS ws_error_rate_pct

FROM activity_log al
WHERE al.company_id = :company_id
  AND al.created_at >= NOW() - INTERVAL '1 hour'
```

**Engineering dependency:** WebSocket server must emit `ws_error` events to `activity_log`. This is a schema usage requirement, not a schema change.

**UI placement:** Command Centre dashboard (system health widget — green/amber/red indicator).

**Update frequency:** Real-time.

**Threshold alerts:** Alert when WebSocket error rate exceeds 5% in a 5-minute window.

---

### 6.4 Error Rate by Endpoint

**What it measures:** Count of HTTP 4xx and 5xx responses per API endpoint per hour. Identifies which routes are failing most frequently. This is a backend observability metric that Glen does not need to see in the main UI, but which the CTO and engineering team need for diagnostics.

**Calculation:** This requires API request logging, which is not currently modelled in the schema. Fastify's built-in request logging (pino) should be configured to write structured error logs. These are aggregated at the application layer (or via a log drain) rather than in PostgreSQL.

**Data source note:** This metric is flagged as requiring an application-level logging solution (e.g. Railway's built-in log drain, or a future integration with a log aggregation service). It is out of scope for PostgreSQL-based analytics in v1.

**UI placement:** Settings page (system diagnostics panel, visible to board role only). Not on Command Centre dashboard.

**Update frequency:** Near-real-time (depends on log drain latency).

**Threshold alerts:** Alert engineering when any endpoint returns 10+ errors in a 5-minute window.

---

## Metric Index Summary

| Metric | Domain | DB Source Tables | Update Frequency | Alert |
|---|---|---|---|---|
| Task completion rate | Agent performance | `tasks` | Real-time | <70% per agent (7d) |
| Average task duration | Agent performance | `tasks` | Daily / real-time | >120 min elapsed |
| Escalation rate | Agent performance | `tasks`, `task_comments` | Daily | >25% (7d rolling) |
| Execution error rate | Agent performance | `agent_executions` | Real-time | >10% (1h rolling) |
| Cost per task | Agent performance | `agent_executions` | Daily | Configurable |
| Cost per agent per month | Agent performance | `agent_executions`, `agent_budgets` | Real-time | 80% and 100% budget |
| Tasks created vs completed | Throughput | `tasks` | Daily / real-time | Creates > completions 3 weeks running |
| Backlog growth/shrink rate | Throughput | `tasks` | Daily | >50 open tasks |
| Blocked task rate | Throughput | `tasks` | Real-time | >20%, or task blocked >48h |
| Average time-in-status | Throughput | `task_comments` | Daily aggregate | Configurable |
| Monthly contracted revenue vs target | Financial | `revenue_items` | Daily | <80% of target |
| Agent cost as % of revenue | Financial | `agent_executions`, `revenue_items` | Daily | >5% |
| Payroll cost trend | Financial | `payroll_items`, `agent_executions` | Monthly | None |
| Pipeline conversion rate | Financial | `pipeline_leads` | Daily | Win rate <20% (90d) |
| Weighted pipeline value | Financial | `pipeline_leads` | Real-time | <3x monthly target |
| Active client count | Client health | `clients` | Real-time | <3 active clients |
| Client health distribution | Client health | `clients` | Real-time | Any client goes red |
| Follow-up compliance rate | Client health | `pipeline_leads` | Real-time | >3 overdue or <80% |
| Lead velocity | BD pipeline | `pipeline_leads` | Daily | <2 leads/month |
| Stage conversion rates | BD pipeline | `pipeline_leads` | Daily | None |
| Average deal cycle time | BD pipeline | `pipeline_leads` | Weekly | None |
| Win rate | BD pipeline | `pipeline_leads` | Daily | <20% (90d rolling) |
| Execution success rate | System health | `agent_executions` | Real-time | <90% (1h rolling) |
| Average API call duration | System health | `agent_executions` | Real-time | p95 >90,000ms |
| WebSocket stability | System health | `activity_log` | Real-time | >5% error rate (5m) |
| Error rate by endpoint | System health | Application logs | Near-real-time | 10+ errors (5m) |

---

## Schema Enhancement Requests (for Engineering)

The following are gaps identified during analytics requirements analysis. These require schema changes or additions:

1. **`pipeline_lead_stage_history` table** — Required for accurate stage-by-stage conversion rate analysis. Should record `lead_id`, `from_stage`, `to_stage`, `changed_at`, `changed_by_agent_id`. Without this, funnel analytics are approximate only.

2. **`pipeline_leads.closed_at` column** — A dedicated close date timestamp rather than relying on `updated_at` as a proxy. Required for accurate deal cycle time calculation.

3. **WebSocket event logging** — The WebSocket server should emit structured events (`ws_connected`, `ws_disconnected`, `ws_error`) to the `activity_log` table for connection stability monitoring.

4. **`companies.settings` revenue target field** — The monthly revenue target used in metric 3.1 should be stored as `settings.monthly_revenue_target_gbp` in the `companies.settings` JSONB column. This is a configuration addition, not a schema change.

These are v2 items. v1 analytics can proceed with the caveats noted against the affected metrics.
