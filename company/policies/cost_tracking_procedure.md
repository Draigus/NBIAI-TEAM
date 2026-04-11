# Cost Tracking Procedure

**Owner:** CFO
**Approved by:** Glen Pryer, Managing Director
**Effective:** 28 March 2026
**Review cadence:** Monthly or when pricing/plan changes occur

---

## Purpose

This procedure defines how NBI tracks, reports, and controls AI agent operational costs. The primary cost driver is LLM token usage across Anthropic API calls. Every token spent is money spent -- this procedure ensures we know where it goes, whether it is justified, and when to intervene.

---

## 1. Cost Model Reference

### IMPORTANT: NBI Uses Subscription Billing, Not API Per-Token Billing

Glen holds a Claude Max subscription plan. The cost to NBI is a **fixed monthly subscription fee of £180/month** (March 2026). This does NOT vary with token consumption. There are no per-token charges.

Any prior cost projections expressed in dollars per token (e.g. "$297/month", "$404/month") are based on Anthropic API pricing and **do not apply to NBI**. Those figures must not be used in cost reporting.

### What Is Being Tracked

Because there are no per-token dollar costs, the CFO tracks **token usage as a percentage of plan capacity** -- not a dollar spend figure.

| Metric | Unit | Notes |
|---|---|---|
| Subscription cost | £180/month fixed | Report as fixed overhead. Never varies with usage |
| Token usage | % of monthly plan cap | The actual constraint |
| Usage by agent | % share of total consumption | Identifies high-consuming agents |
| Usage by project | % share of total consumption | Project-level efficiency |
| Usage by model tier | % split Opus/Sonnet/Haiku | Compliance with model tier strategy |

### Budget Ceiling Formula (Canon Decision, 2026-03-28)

```
Operational ceiling = Max plan monthly token allowance - 30%
```

The 30% buffer prevents hitting the hard cap, which would halt all agent operations mid-sprint. All alerting and reporting works against this ceiling (70% of plan cap), not the hard cap (100%).

**Note:** The exact Max plan monthly token allowance has not been confirmed as of 2026-03-28. CTO and CFO must determine this from the Anthropic console and document the baseline. Until confirmed, usage tracking should be relative (% of observed maximum).

### Fixed Cost Line

The £180/month subscription is NBI's only Anthropic cost. It belongs in NBI's monthly fixed overheads alongside tools and systems, not in a variable AI spend model.

---

## 2. Where Token Usage Data Comes From

### Primary Source: API Logs
The Anthropic API returns token counts (input tokens, output tokens) with every response. These are captured at the application layer.

### Secondary Source: NBIAI App Dashboard
The NBIAI App aggregates token usage data and presents it on the cost dashboard. This is the primary interface for leadership to monitor costs.

### Data Captured Per API Call:
- Timestamp
- Agent ID (which agent made the call)
- Task ID (which task the call was associated with, if applicable)
- Project ID
- Model tier used (Opus, Sonnet, Haiku)
- Input token count
- Output token count
- Running total tokens this month (for % of cap calculation)

Note: "Estimated cost" in dollar terms is NOT tracked. NBI's cost is the fixed subscription fee. Token counts are tracked for capacity management, not billing.

---

## 3. Cost Aggregation and Storage

### Where Aggregated Cost Data Lives

| Data | Location | Updated |
|---|---|---|
| Raw per-call token logs | Application database (NBIAI App) | Real-time |
| Daily cost summary | NBIAI App dashboard | Daily rollup |
| Weekly cost summary | Weekly status report (Producer compiles) | End of each week |
| Sprint cost summary | Sprint review log | End of each sprint |
| Monthly cost summary | CFO monthly report | End of each month |

### Aggregation Dimensions

Cost data is sliced by:
1. **By agent** -- which agents are the most expensive? Identifies inefficient agents or roles that need prompt optimisation.
2. **By project** -- which projects consume the most tokens? Ensures project-level ROI visibility.
3. **By model tier** -- how much is spent on Opus vs. Sonnet vs. Haiku? Ensures the model tier strategy is being followed (IC work should use Sonnet, not Opus).
4. **By task** -- cost-per-task enables cost-per-deliverable calculations.
5. **By day/week/sprint** -- trend analysis to spot cost spikes early.

---

## 4. Cost Reporting in Weekly Status Reports

The Producer includes the following cost data in each weekly status report:

1. **Total spend this week** -- absolute number and percentage of monthly budget ceiling
2. **Spend vs. previous week** -- trend direction (up/down/stable) and percentage change
3. **Projected monthly spend** -- extrapolated from the current run rate
4. **Top 3 cost drivers** -- agents, projects, or tasks consuming the most tokens
5. **Model tier compliance** -- percentage of calls using the correct tier per the model tier strategy (see CLAUDE.md)
6. **Budget ceiling status** -- green (below 60%), amber (60--80%), red (above 80%)

---

## 5. Cost Alerts

### Alert Thresholds

Thresholds are expressed as percentage of monthly token plan capacity (not dollar amounts).

| Threshold | What It Means | Action |
|---|---|---|
| 60% of plan cap consumed | On track. Informational only. | Alert to CFO and COO. No action required unless burn rate is accelerating. |
| 80% of plan cap consumed | **Warning.** Running hot. | Alert to CFO, COO, and Glen. Triggers a usage review -- see below. |
| 90% of plan cap consumed | **Critical.** Risk of hitting hard cap. | Non-essential agent activity is paused. Only critical-path work continues. CFO and Glen decide on next steps. |
| 100% of plan cap consumed | **Emergency stop.** Hard cap hit or imminent. | All discretionary agent activity halts. Only Glen can authorise resumption or upgrade of plan. |

Note: The operational ceiling is set at 70% of plan cap (100% - 30% buffer). "60% of budget ceiling" = 42% of actual plan cap. The percentages above are expressed relative to the plan cap directly for clarity.

### What Happens at the 80% Trigger

When spend reaches 80% of the budget ceiling:

1. **CFO reviews the cost breakdown** -- identifies which agents, projects, or tasks are driving the spike
2. **COO assesses operational impact** -- determines what can be deferred or optimised
3. **VP Engineering reviews model tier compliance** -- are agents using Opus when they should be using Sonnet? Are prompts unnecessarily verbose?
4. **Action plan within 24 hours** -- one of:
   - Optimise prompts to reduce token consumption
   - Defer non-critical work to the next billing cycle
   - Downgrade model tiers for specific agents or tasks
   - Request Glen's approval to increase the budget ceiling for the month

---

## 6. Cost-Per-Deliverable Calculation

To understand the real cost of what NBI produces, every deliverable should have a calculated cost.

### Formula

```
Cost per deliverable = Sum of token costs for all API calls
                       associated with tasks that contributed
                       to the deliverable
```

### How It Works

1. Each task in the NBIAI App is linked to a project and (where applicable) a deliverable
2. Each API call logs its associated task ID
3. At sprint review, the Producer calculates the total token cost for each completed deliverable by summing the costs of all associated tasks
4. This is logged in the sprint review summary

### Example

If building the NBIAI App's authentication module required 5 tasks, and those tasks collectively consumed 1.2M input tokens and 400K output tokens across Sonnet calls, the cost-per-deliverable is expressed as: **total tokens consumed = 1.6M tokens** (which represents X% of the monthly plan cap). Not as a dollar figure.

### Why This Matters

Token-per-deliverable tracking lets Glen and the CFO answer:
- Is this project using a proportionate share of our monthly capacity?
- Are some types of work disproportionately token-heavy?
- Would a different approach (e.g., more Haiku for research, less Opus for review) reduce token consumption and free up capacity for higher-value work?

---

## 7. Model Tier Cost Optimisation

The model tier strategy (defined in CLAUDE.md) exists to control costs. Compliance is tracked as follows:

| Role Tier | Expected Model | Escalation Model | Notes |
|---|---|---|---|
| IC Work | Sonnet | Opus (VP/QA review only) | Engineers, designers, analysts use Sonnet |
| PM Review | Opus | N/A | VP Product quality gate |
| Final QA | Opus | N/A | QA Lead final validation |
| Routine | Haiku | Sonnet (if Haiku insufficient) | Status checks, formatting, extraction |

**Compliance target:** 90%+ of calls at the correct tier. If compliance drops below 80%, the CTO investigates and remediates.

---

## 8. Responsibilities

| Role | Responsibility |
|---|---|
| **CFO** | Owns this procedure. Produces monthly cost reports. Triggers alerts. |
| **COO** | Owns operational response to cost alerts. Approves mid-sprint scope changes that affect cost. |
| **Producer** | Compiles weekly cost data into status reports. Calculates cost-per-deliverable at sprint review. |
| **VP Engineering** | Monitors model tier compliance. Optimises prompts and agent behaviour to reduce token waste. |
| **CTO** | Ensures the NBIAI App captures all required cost data. Maintains the cost dashboard. |
| **Glen** | Approves budget ceiling increases. Final authority on emergency stops. |

---

## 9. Monthly Cost Review

At the end of each calendar month, the CFO produces a cost review covering:

1. Total spend vs. budget ceiling
2. Spend breakdown by project, agent, and model tier
3. Month-over-month trend
4. Cost-per-deliverable for all completed deliverables
5. Model tier compliance rate
6. Any alerts triggered and actions taken
7. Recommendation: maintain current ceiling, adjust up, or adjust down

Glen reviews and approves the monthly cost review. If the ceiling needs adjusting, Glen decides.

---

## References

- `projects/nbiai_app/deliverables/cfo_cost_model.md` -- baseline cost model
- `CLAUDE.md` -- model tier strategy
- `company/policies/approval_gates.md` -- spending approval requirements
- `pipelines/sprint/sprint_pipeline.md` -- sprint-level cost tracking integration
