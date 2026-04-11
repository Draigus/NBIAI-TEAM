# Feature Brief: Staff Performance Review

**Priority:** High
**Requested by:** COO (RYG operational review, 2026-03-28)
**Depends on:** SMART performance review policy (canon decision 2026-03-28)

---

## Summary

Add a Staff Performance Review section to the NBIAI App that tracks agent performance over time, stores SMART-structured feedback, records coaching interventions, and surfaces team health metrics on the dashboard. This feature operationalises the SMART performance review policy and integrates performance data with the existing execution log.

---

## Requirements

### 1. Performance Review Records

- Each agent has a performance review history accessible from their Role Detail page (new tab or sub-section within existing tabs).
- Reviews are created at two cadences: **end of project** and **monthly** (whichever comes first).
- Each review record contains:
  - Agent ID and name
  - Review period (start date, end date)
  - Review type (project completion / monthly / ad-hoc coaching)
  - Reviewer (which agent or manager conducted the review)
  - Overall rating (numerical scale, TBD by Head of People)
  - SMART feedback items (see below)
  - Status (draft / submitted / acknowledged)

### 2. SMART Feedback Logging

Each feedback item within a review must follow the SMART structure:

| Field | Description |
|---|---|
| Specific | What exactly was observed (good or bad) |
| Measurable | Quantifiable evidence (e.g., "delivered 4 of 5 tasks on time", "3 bugs found in QA pass") |
| Achievable | Whether the expectation was reasonable given constraints |
| Relevant | How this connects to the agent's KPIs and project goals |
| Time-bound | The period this feedback covers |

- Multiple SMART items per review (no limit).
- Each item tagged as: strength, improvement area, or critical issue.
- Free-text notes field for additional context.

### 3. Coaching History

- Separate from formal reviews -- coaching entries can be created at any time.
- Each coaching entry contains:
  - Date
  - Agent being coached
  - Coach (manager agent)
  - Issue description
  - Expected improvement (SMART-structured)
  - Deadline for improvement
  - Follow-up outcome (improved / ongoing / escalated / replaced)
- Coaching entries linked to related review records where applicable.
- Poor performance triggers immediate coaching entry (policy requirement: "coached immediately with expected immediate improvement").

### 4. Trend Visualisation

- Line chart or sparkline showing agent performance ratings over time (longitudinal tracking per policy).
- Filterable by: agent, role, project, review type, date range.
- Comparison view: overlay multiple agents on the same chart for team-level assessment.
- Highlight coaching interventions as markers on the timeline.

### 5. Execution Log Integration

- Correlate agent performance review data with execution metrics from the existing `execution/runner.ts` pipeline:
  - Task completion rate
  - Average execution time
  - Tool call efficiency (actual vs. budget)
  - Error/retry rate
  - Quality gate pass rate (first-pass vs. iteration count)
- Surface these metrics alongside SMART feedback in the review form so reviewers have objective data when writing assessments.
- Enable drill-down from a review to the specific executions that informed it.

### 6. Dashboard Widget -- Team Health

- New widget on the main Dashboard showing team health at a glance:
  - Number of agents with current (not overdue) reviews
  - Number of open coaching interventions
  - Agents flagged as "critical issue" in most recent review
  - Average team rating trend (last 3 months)
  - Agents with improving vs. declining trend indicators
- Widget links through to the full Performance Review section.

---

## Schema Considerations

New tables likely needed:
- `performance_reviews` -- review records with agent, period, type, rating, status
- `review_feedback_items` -- SMART-structured feedback items linked to a review
- `coaching_entries` -- standalone coaching records linked to agents and optionally to reviews

These should integrate with the existing `agents`, `tasks`, and `activity_log` tables.

---

## Acceptance Criteria

- A manager agent can create, edit, and submit a performance review for any of their direct reports.
- Each review contains at least one SMART feedback item.
- Coaching entries can be created independently of formal reviews.
- The trend visualisation shows at least 3 data points before rendering a trend line.
- The dashboard widget accurately reflects current team state.
- Execution metrics are pulled from real execution data, not manually entered.
- All data is scoped to the company (multi-tenancy consistent with existing app patterns).
- British English throughout. No em dashes.

---

## Open Questions

1. What numerical rating scale should be used? (e.g., 1--5, 1--10, or qualitative tiers like Exceptional / Meets Expectations / Below Expectations)
2. Should agents be able to view their own reviews, or is this manager-only?
3. Should the system auto-generate draft reviews from execution data, or is review creation always manual?
