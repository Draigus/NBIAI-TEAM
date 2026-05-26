---
source: web_research
source_id: web_2026-05-26_marketing_pnl_roas_framework
source_path: https://mobiledevmemo.com/ltv-roas-marketing-p-and-l/
ingested: 2026-05-26
topics_detected: [forecast, ltv, roas, ua, cash_flow, payback, cohort, marketing, financial_model]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Marketing P&L Framework Using LTV and ROAS (Seufert / Mobile Dev Memo)

## Key Content

A sophisticated cash-flow modelling framework for UA campaigns that goes beyond simple LTV > CPI profitability checks. Introduces the concept of "Projected Receivable" and "Cash at Risk" to model the actual financial dynamics of user acquisition.

**Core formula -- Projected Receivable:**
Per-user Projected Receivable = Total LTV - Recorded Revenue to Date.
Example: At day 20 of a 90-day LTV model worth $1, the per-user Projected Receivable is $0.33 ($1 - $0.67).

**Total Cohort Projected Receivables:**
Sum of (Per-user Projected Receivable x Users Acquired Per Day) across all active cohorts. This represents total current assets financed but not yet received.

**Cash at Risk:**
Peak Cumulative Spend - Peak Cumulative Revenue Received. In the worked example, $20,000 total spend but only $10,530 actual capital required due to early-stage revenue recoup.

**P&L construction (4 steps):**
1. Map cumulative monetisation curve to daily incremental values.
2. Stack cohorts by acquisition day -- compound daily revenue contributions across all live cohorts.
3. Track four metrics simultaneously: Daily Cost, Daily Revenue, Cumulative Cost, Cumulative Revenue.
4. Identify three break-even milestones: Daily P&L break-even (day 92), Cumulative break-even (day 100 for limited campaign, day 257 for continuous), and Maximum Cash at Risk point.

**Worked example:**
CPI $1, 1,000 users/day, 90-day LTV of $1, 20-day revenue recoup at 67%.
Limited campaign (20 days): Total spend $20,000, max cash at risk $10,530, break-even day 100, 180-day profit $2,820 (14.3% margin).
Continuous campaign (360 days): Total spend $360,000, revenue $375,590, 8.6% margin.

## Decisions / Insights

- The critical insight is that LTV > CPI is necessary but not sufficient. Cash timing matters enormously -- a profitable campaign can bankrupt a studio if the payback window exceeds available capital.
- "67% ROAS by Day 20" sounds aggressive, yet "after 20 days of campaigns, less than half of all spend has been recouped." This gap between metric appearance and cash reality is where studios get into trouble.
- Cohort stacking reveals that continuous acquisition campaigns require much more working capital than their per-cohort economics suggest. The break-even point for continuous campaigns is dramatically later (day 257 vs day 100).
- "Without making considerations for recoup timelines and overall cash at risk, a company isn't being systematic with its advertising spend."

## Context

Eric Seufert is the foremost authority on mobile game marketing economics. He founded Mobile Dev Memo, advises major mobile studios, and literally wrote the book on freemium economics. This framework is the industry reference for UA financial planning.

## Applicability

**Direct NBI use:** Essential for any client engagement involving UA budget planning or investor modelling. The Cash at Risk calculation is particularly important for indie/mid-tier studios with limited runway -- it answers "how much cash do I actually need to fund my UA campaigns?"

**Client fit:** Most valuable for studios transitioning from soft launch to scaled UA. The framework transforms the conversation from "what's my LTV?" to "how much capital do I need, and when does it come back?"

**Combines with:** Pair with the Valeev retention model (to generate the LTV curve) and the Tenjin unit economics framework (to set the revenue targets). This Seufert framework then models the cash flow dynamics of actually executing the UA plan.
