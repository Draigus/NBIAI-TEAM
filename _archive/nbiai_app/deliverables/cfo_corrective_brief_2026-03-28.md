# CEO Corrective Brief: CFO Cost Modelling Error

**To:** CFO Agent
**From:** CEO Agent
**Date:** 28 March 2026
**Classification:** Internal -- Corrective Action
**Review required by:** Immediate. No cost modelling or cost reporting should be issued using the old framework until this correction is absorbed and the revised model is in place.

---

## The Error

In the C-suite cross-functional review of the 33-role company structure, the CFO submitted cost projections as follows:

| Scenario | Monthly Cost |
|---|---|
| Phase 1 (8 roles) | ~$160/month |
| All 33 agents (moderate use) | ~$297--$404/month |
| Hard limit | $1,000/month |

These figures are wrong. They are based on **Anthropic API per-token pricing** -- the pay-as-you-go commercial API, where each input token and output token is billed at a per-million-token rate (e.g. Opus: $15/M input, $75/M output).

**Glen is not on the API. Glen is on the Claude Max subscription plan.**

This is a fundamental error in the cost model. Every dollar figure the CFO produced is hypothetical pricing for a billing model that does not apply to NBI. Presenting these figures to Glen as NBI's actual costs was misleading, even if unintentionally so.

---

## The Correct Cost Model

### What Glen Actually Pays

Glen holds a Claude Max subscription. His March 2026 invoice: **£180/month flat fee.**

That is the entirety of NBI's current Anthropic cost. Not $160, not $297, not $404. **£180/month** -- fixed, regardless of how many agents we run or how many tokens we consume, provided we stay within the plan's usage cap.

### The Actual Constraint

The constraint is not cost. The constraint is **token usage capacity** -- how much of the monthly usage allowance we consume before hitting the plan's rate limit.

The Max plan provides a monthly usage cap. Anthropic does not explicitly display this cap as a token count on invoices or in the standard account view. However, the cap exists and governs how much we can run.

**The spend cap formula (already a canon decision) is:**

```
Operational ceiling = Max plan monthly token allowance - 30%
```

The 30% buffer exists so we never hit the hard cap and halt operations mid-sprint. This is correct. What was wrong was expressing this in dollars based on API pricing. It should be expressed in **tokens** or **% of plan capacity**.

### What the CFO Should Be Tracking

The CFO's cost model must now reflect two distinct things:

**1. Subscription cost (GBP, fixed)**

| Item | Cost | Cadence | Currency |
|---|---|---|---|
| Claude Max plan | £180 | Monthly flat fee | GBP |

This is NBI's actual financial exposure to Anthropic. It does not vary with token usage. It only changes if the plan tier changes.

**2. Usage capacity consumption (tokens, variable)**

| Metric | What to Track |
|---|---|
| Monthly token usage | Total tokens consumed across all agents and all sessions |
| Usage % of plan cap | Tokens used / plan cap x 100 |
| Usage by agent | Which agents consumed how many tokens this month |
| Usage by project | Which projects drove the most consumption |
| Usage by model tier | Opus vs Sonnet vs Haiku split |
| Usage trend | Week-on-week direction (increasing, stable, decreasing) |

The CFO does not report "we spent $X on AI agents this month." The CFO reports "we consumed Y% of our monthly token allowance, at a fixed cost of £180 to NBI."

---

## What Changes in the CFO's Work

### Immediate Corrections Required

1. **Remove all dollar-cost projections from cost reporting.** The "$160/month for Phase 1" and "$404/month for 33 agents" figures must not be referenced going forward. They are based on a billing model that does not apply.

2. **Update the cost_tracking_procedure.md** to replace dollar-cost tracking with token-usage-% tracking. The alert thresholds (60%, 80%, 90%, 100%) are still valid -- they now apply to percentage of token capacity, not percentage of a dollar budget.

3. **Remove the $1,000/month hard limit reference.** That figure was a hypothetical API spend cap. It is not a relevant constraint under a subscription model.

4. **Establish the actual token cap baseline.** The CFO must work with the CTO to identify NBI's actual Max plan monthly token allowance. This should be determined by:
   - Checking the Anthropic console usage dashboard for historical usage data
   - Testing to understand at what point rate limiting activates
   - Documenting the finding as the operational baseline in the cost model

5. **Reclassify the £180/month subscription as an operational overhead, not a variable cost.** It belongs in NBI's fixed monthly overhead, not in a per-project or per-agent cost model.

### What the Cost Model Should Say Going Forward

| Element | Old (Wrong) | New (Correct) |
|---|---|---|
| Primary cost metric | $ per token consumed | % of monthly token allowance consumed |
| Fixed subscription cost | Buried or ignored | £180/month, fixed overhead |
| Per-agent cost | $X/month based on usage | Tokens consumed as % of plan cap |
| Alert thresholds | 60/80/90/100% of $1,000 | 60/80/90/100% of token allowance |
| Emergency stop | At $1,000 | At 100% of token allowance |
| Monthly report headline | "Projected spend: $297/month" | "Usage: X% of plan cap at £180/month subscription" |

---

## The Broader Issue: What This Failure Reveals

The CFO submitted cost analysis that was technically plausible (the API pricing figures are real Anthropic numbers) but contextually wrong (they do not apply to Glen's billing arrangement). This is exactly the kind of error that gets caught by cross-functional review -- but only if the CFO has loaded the right context.

The CFO's Tier 2 knowledge (`roles/cfo/knowledge/financial_context.md`) contains detailed NBI business financials but no information about how NBI's AI infrastructure is billed. The CFO was working from incomplete context.

**This is partly a knowledge gap and partly an analysis gap.** A CFO who had asked "what billing model does Glen actually use?" before building the cost model would have caught this. The instinct to assume API per-token billing (which is how most AI cost analysis is done in the industry) was reasonable. The failure was not stress-testing the assumption before presenting it as a financial finding.

Going forward: before presenting any cost analysis to the C-suite or to Glen, the CFO confirms the billing model with the CTO. Do not assume.

---

## Required Actions

| Action | Deadline | Done? |
|---|---|---|
| Acknowledge this corrective brief | Immediate | |
| Update financial_context.md with AI billing section | This session | |
| Update cost_tracking_procedure.md with corrected framework | This session | |
| Determine actual Max plan token allowance (with CTO) | Next session | |
| Reissue the C-suite cost model with correct methodology | Next session | |

---

## CEO Assessment

This is a correctable error. The cost tracking framework is otherwise sound -- the alert thresholds, the aggregation dimensions, the reporting cadence, the model tier compliance tracking -- all of this is valid and should be retained. The error was in the underlying cost unit (dollars per token vs subscription capacity percentage).

The CFO's other work in this session (financial context, NSI transition modelling, revenue analysis) was not affected by this error and remains valid.

The quality bar for CFO cost analysis is 8/10. A cost model that presents inapplicable pricing as NBI's actual financial exposure does not meet that bar. The correction must be made before the cost framework is used again.

---

*Issued by CEO Agent, 28 March 2026.*
