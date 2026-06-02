---
source: web_research
source_id: web_2026-06-02_ismail_budget_viability_framework
source_path: https://ltpf.ramiismail.com/budget-viability/
ingested: 2026-06-02
topics_detected: [forecast, production_cost, budget, viability, indie, boxleiter, methodology]
relevance_score: 9
novelty_score: 7
actionability_score: 9
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Ismail Budget Viability Framework for Game Development

## Key Content

Rami Ismail's "Levelling the Playing Field" (LTPF) provides a complete, replicable framework for estimating game development budgets and assessing commercial viability. Two distinct models:

### 1. Budget Estimation Formula

**Budget = Sum(Person_Salary x Months x FTE) x 1.30**

Process: (1) List every person who will work on the game. (2) For each person, determine monthly salary -- Ismail defaults to $1,600-$2,200/month for younger/indie developers if not discussed. (3) Multiply salary by months of work. (4) Adjust by FTE (1.0 = 40hr/wk, 0.5 = 20hr/wk, 0.25 = 10hr/wk). (5) Sum all personnel costs. (6) Apply a 30% safety margin to the total.

**Budget tier benchmarks:**
- Small indie (first projects): $75,000-$250,000
- Mid-sized indie (established, several shipped titles): $750,000-$2,500,000
- Large indie: $5,000,000+

### 2. Commercial Viability Assessment

Uses the **Boxleiter Number** (~57 units sold per Steam review, updated by Simon Carless) to convert required sales into a review target that can be benchmarked against comparable titles.

**Break-even threshold:** Budget x 1.43 (accounts for ~30% platform cut). This is the minimum gross revenue needed.

**Three-tier comparable analysis:**
- Low comparable: 70% of break-even units needed (worst case)
- Middle comparable: 125% of break-even units (moderate success)
- High comparable: 300% of break-even units (target for publisher ROI)

**Viability gate -- all three must be true:**
1. Every team member can sustain themselves through delays on this budget
2. The game can credibly generate 3-4x the budget in revenue
3. The game is demonstrably better than the low comparable, competitive with middle, and could rival the high

### Key Philosophy

"Too high a budget at worst looks arrogant -- too low a budget at best looks incompetent." The budget should reflect actual development needs, not funding negotiation tactics. The game's budget has no relevance to how much money can be asked for.

## Decisions / Insights

- The 30% safety margin is non-negotiable in Ismail's framework. It covers scope creep, delays, and unforeseen costs. This aligns with industry practice but Ismail makes it explicit as a fixed multiplier rather than a judgement call.
- The Boxleiter Number provides a concrete, observable proxy for sales volume. Instead of guessing revenue, you count Steam reviews on comparable titles and multiply by 57. This grounds the viability check in public data.
- The three-tier comparable approach forces honest assessment: if your game cannot credibly outperform the worst comparable, it should not proceed at that budget.
- Ismail explicitly warns against the "publisher's lie" -- the notion that publishers know what games will sell. His framework empowers studios to self-assess viability using public data.

## Context

Rami Ismail is a veteran indie developer (Vlambeer -- Ridiculous Fishing, Nuclear Throne) turned industry advisor. LTPF is his free online resource for indie studios navigating business fundamentals. The Boxleiter Number was originally identified by Jake Birkett, refined by Simon Carless (GameDiscoverCo).

## Applicability

**Direct NBI use:** This is the primary budget estimation methodology for indie-to-mid-tier client engagements. The formula works in a spreadsheet with zero infrastructure. The viability check using the Boxleiter Number can be run by any analyst with Steam access.

**Client fit:** Any studio building a budget for a pitch, publisher conversation, or internal greenlight. Works for teams of 1-30 people. The comparable analysis is particularly valuable for investor decks where NBI needs to ground revenue projections in observable market data.

**Limitations:** The salary defaults ($1,600-$2,200/month) reflect developing-world or junior rates; UK/US rates are typically $4,000-$8,000/month fully loaded. The Boxleiter Number is Steam-specific and does not apply to console-only or mobile titles. The framework does not cover marketing spend estimation.
