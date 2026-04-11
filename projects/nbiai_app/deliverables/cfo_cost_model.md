# NBIAI App -- AI Agent Cost Model and Budget Framework

**Author:** CFO Agent
**Date:** 2026-03-28
**Version:** 1.0
**Status:** Submitted to CEO for review
**Project:** NBIAI Team App

---

## Document Purpose

This document models the real operating cost of running NBI's 18-agent AI company through the NBIAI app. Every agent execution consumes Anthropic API tokens. This cost has not previously been modelled. It is now.

The document covers four areas:
1. Token cost model with three usage scenarios
2. Budget framework with caps, alerts, and escalation triggers
3. Build vs buy financial analysis
4. Financial risk assessment with mitigations

All API costs are in USD ($). All NBI revenue and business figures are in GBP (£). Where conversion is needed, a rate of $1.00 = £0.79 is used (March 2026 approximate).

---

## 1. Token Cost Model

### 1.1 Anthropic API Pricing

| Model | Input (per MTok) | Output (per MTok) |
|---|---|---|
| Claude Opus 4.6 | $15.00 | $75.00 |
| Claude Sonnet 4.6 | $3.00 | $15.00 |
| Claude Haiku 4.5 | $0.80 | $4.00 |

MTok = 1,000,000 tokens.

### 1.2 Token Consumption per Agent Run

Every agent execution loads the same context structure:

| Context Component | Tokens |
|---|---|
| Tier 1 knowledge (company overview, org chart, policies) | ~3,000 |
| Tier 2 knowledge (role-specific domain knowledge) | ~2,000 |
| Tier 3 knowledge (project brief, requirements, status) | ~1,500 |
| System prompt (persona, responsibilities, workflows) | ~1,000 |
| Task context (the specific instruction and any conversation history) | ~500 |
| **Total input per run** | **~8,000** |

Average output per run: **~2,000 tokens**.

These are conservative baselines. In practice, complex tasks (code generation, financial modelling, architecture documents) will produce significantly more output. Multi-turn conversations within a single execution will compound input tokens as conversation history grows. The model below uses single-turn averages.

### 1.3 Cost per Run by Model Tier

| Model Tier | Input Cost (8,000 tokens) | Output Cost (2,000 tokens) | Total Cost per Run |
|---|---|---|---|
| Opus | $0.1200 | $0.1500 | **$0.2700** |
| Sonnet | $0.0240 | $0.0300 | **$0.0540** |
| Haiku | $0.0064 | $0.0080 | **$0.0144** |

Opus is 5x the cost of Sonnet per run. Sonnet is 3.75x the cost of Haiku. This makes model tier assignment a genuine financial decision, not just a quality preference.

### 1.4 Agent Roster by Model Tier

**Opus agents (8):**

| # | Agent | Primary Use |
|---|---|---|
| 1 | CEO | Orchestration, strategic delegation |
| 2 | COO | Operations management, cross-functional coordination |
| 3 | CFO | Financial modelling, budget tracking |
| 4 | CTO | Architecture decisions, technical review |
| 5 | VP Engineering | Engineering management, code review |
| 6 | VP Product | Product roadmap, requirements |
| 7 | CMO / Head of BD | Pipeline management, outreach drafting |
| 8 | QA Lead (final pass) | Final quality gate before Glen |

**Sonnet agents (10):**

| # | Agent | Primary Use |
|---|---|---|
| 1 | Producer | Project tracking, status reports |
| 2 | Data Analyst | Data processing, analytical briefs |
| 3 | Senior Engineer | Complex feature implementation |
| 4 | Engineer | Feature implementation, bug fixes |
| 5 | DevOps | Deployment, infrastructure |
| 6 | QA Lead (initial pass) | Test planning, initial review |
| 7 | QA Engineer | Test execution, defect logging |
| 8 | UI/UX Lead | Design system, interface review |
| 9 | UI/UX Designer | Wireframes, front-end styling |
| 10 | Head of People | Hiring support, team admin |

**Note:** QA Lead is counted once in Opus (final review pass) and once in Sonnet (initial test planning pass), reflecting the dual-tier design specified in the org chart.

**Haiku agents:** None currently assigned. Haiku is designated for routine tasks (status checks, formatting, data extraction) but no agent role runs exclusively on Haiku. Haiku costs are included in the pricing table for reference and for future use in automated sub-tasks.

### 1.5 Cost per Agent per Month (22 Working Days)

#### Opus Agents

| Scenario | Runs/Day | Runs/Month | Cost/Agent/Month |
|---|---|---|---|
| Light | 2 | 44 | $11.88 |
| Moderate | 5 | 110 | $29.70 |
| Heavy | 10 | 220 | $59.40 |

#### Sonnet Agents

| Scenario | Runs/Day | Runs/Month | Cost/Agent/Month |
|---|---|---|---|
| Light | 2 | 44 | $2.38 |
| Moderate | 5 | 110 | $5.94 |
| Heavy | 10 | 220 | $11.88 |

### 1.6 Total Company Monthly Cost (All 18 Agents)

| Scenario | Opus Total (8 agents) | Sonnet Total (10 agents) | Company Total (USD) | Company Total (GBP) |
|---|---|---|---|---|
| **Light** | $95.04 | $23.76 | **$118.80** | **£93.85** |
| **Moderate** | $237.60 | $59.40 | **$297.00** | **£234.63** |
| **Heavy** | $475.20 | $118.80 | **$594.00** | **£469.26** |

### 1.7 Cost as Percentage of NBI Monthly Revenue

Baseline contracted monthly revenue: **£16,650** (as specified by CEO).

| Scenario | Monthly AI Cost (GBP) | % of Revenue | Assessment |
|---|---|---|---|
| **Light** | £93.85 | **0.56%** | Negligible |
| **Moderate** | £234.63 | **1.41%** | Manageable |
| **Heavy** | £469.26 | **2.82%** | Acceptable |

**Key finding:** At the modelled token consumption rates, AI agent costs are well within acceptable bounds across all three scenarios. Even under the Heavy scenario, total spend is under 3% of monthly revenue.

**Important caveat:** These figures assume single-turn, short-context runs. In practice, the following will increase costs substantially:

- Multi-turn conversations (input tokens compound as history grows)
- Large code generation tasks (output tokens can be 10-20x the 2,000 average)
- Context window filling (agents loading full codebases, long documents)
- Agent-to-agent delegation chains (one task triggers multiple agent runs)

A realistic "Heavy with complexity" scenario could see individual runs consuming 50,000-100,000 input tokens and 10,000-20,000 output tokens, which would multiply the per-run cost by 5-10x. This is modelled in the risk section below.

### 1.8 Break-Even Analysis: When Does AI Spend Become Material?

"Material" threshold: **>5% of monthly revenue = >£832.50/month = >$1,053.80/month**.

| Model Tier | Cost per Run | Runs to Hit £832.50 ($1,053.80) |
|---|---|---|
| Opus only | $0.2700 | 3,903 runs/month |
| Sonnet only | $0.0540 | 19,515 runs/month |
| Mixed (current ratio) | $0.0659 weighted avg | 15,991 runs/month |

**Weighted average calculation:** (8 Opus runs x $0.27 + 10 Sonnet runs x $0.054) / 18 = $0.1500 per run across the roster... but this assumes equal run frequency. A more useful figure:

At the current 8:10 Opus/Sonnet split, assuming equal runs per agent:
- Each "round" of all 18 agents running once = (8 x $0.27) + (10 x $0.054) = $2.16 + $0.54 = **$2.70 per full company cycle**
- Cycles to hit material threshold: $1,053.80 / $2.70 = **390 full company cycles per month**
- That is **17.7 full cycles per working day** -- far beyond any reasonable operating pattern

**Conclusion:** Under the single-turn model, it is extremely unlikely that token costs alone will breach 5% of revenue. The risk lies in complex, multi-turn executions (see Section 4).

### 1.9 Stress Test: Complex Execution Scenario

What if agents routinely handle complex tasks?

| Parameter | Baseline | Complex |
|---|---|---|
| Input tokens per run | 8,000 | 80,000 |
| Output tokens per run | 2,000 | 15,000 |
| Opus cost per run | $0.27 | $2.325 |
| Sonnet cost per run | $0.054 | $0.465 |

Under the Complex scenario at Moderate frequency (5 runs/day/agent, 22 days):

| | Opus (8 agents) | Sonnet (10 agents) | Total |
|---|---|---|---|
| Monthly cost | $2,046.00 | $511.50 | **$2,557.50** |
| GBP equivalent | £1,616.43 | £404.09 | **£2,020.43** |
| % of revenue | 9.71% | 2.43% | **12.13%** |

This exceeds the 5% materiality threshold. Complex, multi-turn agent work at moderate frequency is where costs become a genuine concern.

---

## 2. Budget Framework

### 2.1 Monthly Budget Caps per Agent

Based on the Moderate scenario with headroom for occasional complex tasks:

| Model Tier | Recommended Monthly Cap per Agent | Rationale |
|---|---|---|
| Opus | **$75.00** (~£59.25) | 2.5x Moderate baseline ($29.70). Allows for complex tasks without triggering alerts on routine spikes |
| Sonnet | **$25.00** (~£19.75) | 4.2x Moderate baseline ($5.94). Higher multiplier because Sonnet agents do IC work that can vary significantly in complexity |
| Haiku | **$5.00** (~£3.95) | Generous cap for routine sub-tasks if deployed |

### 2.2 Company-Wide Monthly AI Spend Budget

| Budget Line | Amount (USD) | Amount (GBP) |
|---|---|---|
| Opus agents (8 x $75) | $600.00 | £474.00 |
| Sonnet agents (10 x $25) | $250.00 | £197.50 |
| Haiku reserve | $20.00 | £15.80 |
| Contingency (15%) | $130.50 | £103.10 |
| **Total monthly budget** | **$1,000.50** | **£790.40** |

**Recommended monthly budget: $1,000 (£790).**

This is 4.75% of monthly revenue at £16,650 -- just under the 5% materiality threshold, providing a meaningful operational budget without crossing into concerning territory.

### 2.3 Alert Thresholds

| Threshold | Trigger | Action |
|---|---|---|
| **Per-agent 80%** | Agent reaches 80% of its monthly cap | Warning to CFO and CEO. Agent continues operating. Review whether the agent's workload is appropriate |
| **Per-agent 100%** | Agent reaches 100% of its monthly cap | Hard stop. Agent cannot execute further runs until the cap is raised or the month resets. Escalate to CEO for override decision |
| **Company 70%** | Total company spend reaches $700 | Early warning to CFO. Review burn rate and project whether the monthly budget will hold |
| **Company 85%** | Total company spend reaches $850 | Alert to CEO and CFO. Evaluate whether to throttle non-critical agents for the remainder of the month |
| **Company 100%** | Total company spend reaches $1,000 | Hard stop for all non-essential agents. Only CEO and CTO retain execution capability. Escalate to Glen |

### 2.4 Reporting Cadence

| Report | Frequency | Recipient | Content |
|---|---|---|---|
| AI Spend Dashboard | Real-time (in-app) | All users | Current spend by agent, by tier, vs budget |
| Weekly AI Cost Summary | Weekly (Monday) | CEO | Week-over-week spend, top-consuming agents, anomaly flags |
| Monthly AI Cost Report | Monthly (1st of month) | CEO, Glen | Full month spend vs budget, cost per task category, trend analysis, forecast |
| Quarterly Cost Review | Quarterly | CEO, Glen, Bryan | AI costs in context of total NBI operating costs, ROI assessment, budget adjustment recommendations |

### 2.5 Escalation Triggers Requiring Glen's Attention

| Trigger | Threshold | Reason |
|---|---|---|
| Monthly spend exceeds budget | >$1,000/month | This is real money leaving the business |
| Single agent consumes >$150 in a month | 2x the Opus cap | Indicates either a runaway process or a fundamentally different usage pattern that needs strategic review |
| AI costs exceed 5% of monthly revenue | >£832.50/month | Crosses from operational expense into strategic cost category |
| Budget increase requested | Any | CFO can recommend; only Glen approves increased AI spend |
| Anthropic pricing change | Any | Price changes directly affect operating costs; Glen needs to know |

---

## 3. Build vs Buy Analysis

### 3.1 Cost of Building the NBIAI App

The NBIAI app is being built entirely by AI agents within the NBIAI team itself. There is no human engineering time being consumed. The "cost" is agent execution time.

**Estimated build effort (agent runs):**

| Phase | Agent Runs (Estimate) | Primary Agents | Estimated Token Cost |
|---|---|---|---|
| Architecture and design | ~50 | CTO, VP Eng, VP Product (Opus) | ~$13.50 |
| Feature specification | ~30 | VP Product (Opus) | ~$8.10 |
| Core implementation | ~200 | Sr Engineer, Engineer (Sonnet) | ~$10.80 |
| Frontend build | ~150 | UI/UX Lead, Designer (Sonnet) | ~$8.10 |
| DevOps and deployment | ~40 | DevOps (Sonnet) | ~$2.16 |
| QA and testing | ~80 | QA Lead (Opus+Sonnet), QA Eng (Sonnet) | ~$6.48 |
| Project management | ~60 | CEO, COO, Producer | ~$13.50 |
| Documentation | ~30 | Various | ~$3.24 |
| **Total build** | **~640 runs** | | **~$65.88** |

If we assume complex runs (higher token counts) for implementation work, multiply by 5x for a more realistic figure: **~$330 total build cost**.

**If we value agent time at a nominal human-equivalent rate:**

This is a thought exercise only -- the agents are not humans and the cost is purely API tokens. But for comparison: if the 640 agent runs were instead done by a mid-level developer at £50/hour, with each "run" representing approximately 30 minutes of human work, the equivalent human cost would be:

- 640 runs x 0.5 hours x £50/hour = **£16,000**

The actual API cost of ~$330 (£261) represents a **98.4% cost reduction** compared to equivalent human effort. Even accounting for the imperfect comparison, the economics are striking.

### 3.2 Estimated SaaS Alternative Cost

No direct equivalent to the NBIAI app exists as a SaaS product today. The closest comparisons:

| Alternative | Estimated Monthly Cost | What It Provides | What It Lacks |
|---|---|---|---|
| **Paperclip (if SaaS)** | $200-500/month (estimated) | Multi-agent orchestration, role definitions | NBI-specific knowledge architecture, approval gates, financial tracking |
| **CrewAI Enterprise** | $300-1,000/month | Agent orchestration, task delegation | Custom org chart, NBI knowledge tiers, client-specific workflows |
| **LangChain/LangSmith** | $100-400/month | Agent frameworks, monitoring | Everything else -- this is tooling, not a solution |
| **Custom GPT Teams** | $75-150/month (seats) | Per-agent GPTs with custom instructions | No orchestration, no inter-agent communication, no approval gates |

**API costs would be additional** on top of any SaaS fee, as all of these platforms still consume the same Anthropic (or OpenAI) API tokens underneath.

Realistic SaaS alternative: **$400-800/month platform fee + $300-600/month API costs = $700-1,400/month total**.

### 3.3 Recommendation: Was Building the Right Call?

**Yes. Building was the correct financial decision.** The reasoning:

1. **Build cost was trivial.** At ~$330 in API costs (even at the generous complex-run estimate), the app effectively cost nothing to build compared to any alternative
2. **No SaaS platform fits NBI's requirements.** The three-tier knowledge architecture, NBI-specific approval gates, client context switching, and the exact org chart structure would require extensive customisation on any platform. Customisation costs would likely exceed the build cost
3. **Ongoing costs are lower.** Running the app costs $118-594/month in API tokens. A SaaS alternative would cost $700-1,400/month (platform fee + equivalent API costs). NBI saves $500-800/month by owning the platform
4. **No vendor lock-in on the orchestration layer.** NBI is locked to Anthropic for the models (for now), but the orchestration, knowledge architecture, and workflow logic are owned. If a cheaper model provider emerges, NBI can switch without re-platforming
5. **The app is itself a potential product.** If NBI commercialises the NBIAI framework (as a version of PlaySage or a standalone offering), the IP is fully owned. A SaaS dependency would prevent this

**Annual cost comparison:**

| Option | Year 1 Cost | Ongoing Annual Cost |
|---|---|---|
| NBIAI app (built) | ~£261 build + ~£2,817 API (Moderate) | ~£2,817 |
| SaaS alternative | ~£5,500-13,300 | ~£6,600-13,300 |

---

## 4. Financial Risk Assessment

### Risk 1: Runaway Token Spend (Agent in a Loop)

**Severity:** HIGH
**Likelihood:** MEDIUM

**Scenario:** An agent enters a recursive loop -- for example, the QA Lead rejects work, the Engineer regenerates, QA rejects again, and this cycle repeats without human intervention. Each cycle burns tokens on both agents. A 50-iteration loop between an Opus agent and a Sonnet agent would cost:

- 50 x ($0.27 + $0.054) = $16.20 at baseline
- 50 x ($2.325 + $0.465) = $139.50 at complex-run rates

This is manageable in isolation but dangerous if multiple agents enter loops simultaneously.

**Mitigations:**
1. **Hard iteration cap:** No agent-to-agent exchange may exceed 5 rounds without escalation to a human (Glen or designated approver). Implement in the execution layer
2. **Per-run cost tracking:** Every execution logs its token consumption. If a single run exceeds 100,000 input tokens or 50,000 output tokens, flag it immediately
3. **Circuit breaker pattern:** If an agent's spend rate exceeds 3x its daily average, pause the agent and alert the CEO
4. **Cooldown period:** After any agent-to-agent rejection cycle, enforce a 60-second cooldown before the next iteration to prevent rapid-fire loops

### Risk 2: Budget Exhaustion Blocking All Agents Mid-Project

**Severity:** HIGH
**Likelihood:** LOW (with budget framework in place)

**Scenario:** A critical project is in flight. Heavy agent activity in the first three weeks of the month exhausts the budget. All agents are stopped with work incomplete, deliverables half-finished, and a client deadline approaching.

**Mitigations:**
1. **Reserve budget:** 15% of the monthly budget ($150) is held as contingency, not allocated to any agent. This reserve is only released by the CEO for critical path work
2. **Daily burn rate monitoring:** If spend is on pace to exhaust the budget before month-end (i.e., daily average x remaining days > remaining budget), alert the CFO at the point this becomes apparent, not at exhaustion
3. **Priority-based throttling:** Define agent priority tiers. If budget pressure emerges, throttle low-priority agents first (Head of People, Data Analyst) before touching critical-path agents (Engineers, QA, CTO)
4. **Emergency budget release:** Glen can authorise a one-time budget increase of up to $500 for genuine project emergencies. This is documented and reviewed in the monthly cost report

**Agent priority tiers for throttling:**

| Priority | Agents | Rationale |
|---|---|---|
| Critical (last to throttle) | CEO, CTO, VP Engineering, Senior Engineer | Strategic decisions and active build work |
| High | Engineer, QA Lead, QA Engineer, DevOps | Active implementation and quality assurance |
| Standard | COO, CFO, VP Product, CMO, Producer | Operational management -- can pause briefly |
| Low (first to throttle) | Data Analyst, Head of People, UI/UX Designer, UI/UX Lead | Important but not time-critical in a budget emergency |

### Risk 3: Concentration Risk (Anthropic API Dependency)

**Severity:** HIGH
**Likelihood:** LOW (for outage), MEDIUM (for pricing changes)

**Scenario A -- Outage:** Anthropic's API goes down. All 18 agents stop. No work gets done. If this happens during a client delivery window, NBI misses a deadline through no fault of its own.

**Scenario B -- Price increase:** Anthropic increases pricing. A 2x price increase would double all figures in this document. The Heavy scenario would go from £469/month to £938/month. The complex-execution Moderate scenario would jump from £2,020 to £4,041.

**Scenario C -- Model deprecation:** Anthropic deprecates a model tier. If Opus is discontinued or replaced with a more expensive model, the 8 Opus agents would need to migrate, potentially at higher cost.

**Mitigations:**
1. **Abstraction layer:** The NBIAI app's agent execution layer should abstract the model provider. The app calls a model service, not Anthropic directly. If a provider change is needed, only the service adapter changes, not every agent configuration
2. **Multi-provider readiness:** Evaluate whether critical Sonnet-tier work could run on alternative models (e.g., Google Gemini, open-source models via API). Do not implement today, but architect the execution layer so that swapping a model provider requires changing configuration, not code
3. **Local fallback investigation:** For Haiku-tier routine tasks, evaluate whether a locally-hosted small model could serve as a fallback. This eliminates API dependency for non-critical work
4. **Price change monitoring:** Track Anthropic's pricing announcements. If a price increase is announced, immediately re-run this cost model and present updated figures to Glen before the increase takes effect
5. **SLA awareness:** Anthropic does not currently offer SLAs for API availability. NBI should not make client commitments that are contingent on real-time AI agent execution. Agents should work ahead of deadlines, not on them

### Risk 4: Cost Opacity (Not Knowing What You Are Spending)

**Severity:** MEDIUM
**Likelihood:** HIGH (without the controls in this document)

**Scenario:** Without tracking, NBI could accumulate $500-2,000/month in API costs without anyone noticing until the Anthropic invoice arrives. For a small business with tight margins, untracked expenses are unacceptable.

**Mitigations:**
1. **Implement the budget framework in Section 2** -- this is not optional
2. **Per-execution cost logging:** Every agent run must log: agent name, model tier, input tokens, output tokens, calculated cost, timestamp. This is the minimum viable tracking
3. **In-app spend dashboard:** The NBIAI app must display current spend vs budget on the main dashboard. This should be visible to Glen at all times
4. **Monthly reconciliation:** CFO reconciles tracked spend against Anthropic's actual invoice. Any discrepancy is investigated

---

## 5. Summary and Recommendations

### Key Figures

| Metric | Value |
|---|---|
| Cost per Opus run (baseline) | $0.27 |
| Cost per Sonnet run (baseline) | $0.054 |
| Monthly cost, Light scenario | $118.80 (£93.85) -- 0.56% of revenue |
| Monthly cost, Moderate scenario | $297.00 (£234.63) -- 1.41% of revenue |
| Monthly cost, Heavy scenario | $594.00 (£469.26) -- 2.82% of revenue |
| Monthly cost, Complex Moderate scenario | $2,557.50 (£2,020.43) -- 12.13% of revenue |
| Recommended monthly budget | $1,000 (£790) -- 4.75% of revenue |
| Break-even (5% materiality, baseline runs) | ~390 full company cycles/month |
| Build cost of NBIAI app | ~$330 (£261) |
| Equivalent SaaS annual cost | £6,600-13,300/year |

### Recommendations to CEO

1. **Approve the $1,000/month AI budget.** This provides adequate headroom for Moderate usage with room for occasional complex tasks, while staying under the 5% materiality threshold

2. **Implement per-execution cost tracking as a Phase 1 requirement.** The NBIAI app must log token consumption and cost for every agent run. This is a non-negotiable feature, not a nice-to-have

3. **Implement hard caps and circuit breakers before going live.** The iteration cap (5 rounds max for agent-to-agent exchanges) and per-agent budget caps must be in the execution layer from day one

4. **Monitor the Complex execution pattern.** The baseline model is comfortable. The complex execution model is not. Real-world usage will likely fall between the two. The first month of live operation should be treated as a calibration period, with daily spend reviews

5. **Confirm this budget with Glen.** Under my escalation rules, any budget allocation change requires Glen's approval. The $1,000/month recommendation needs his sign-off

6. **Add cost tracking to the technical architecture.** The CTO should add token usage logging and budget enforcement to the agent execution layer specification. I will coordinate with the CTO on the schema requirements

### Revenue Context Note

This model uses £16,650/month as the baseline contracted revenue figure, as specified. For reference, NBI's current contracted revenue from the Brain file shows Lighthouse Studios (£350,000/year) and Couch Heroes (£300,000/year) totalling £650,000/year or approximately £54,167/month. If the higher figure is used, all percentage-of-revenue calculations improve significantly (e.g., Moderate scenario drops from 1.41% to 0.43%). The cost model's conclusions hold under either baseline: AI agent costs are manageable at standard usage patterns and become a concern only under sustained complex-execution workloads.

---

*This document will be updated monthly as real usage data becomes available. All projections will be replaced with actuals after the first full month of NBIAI app operation.*
