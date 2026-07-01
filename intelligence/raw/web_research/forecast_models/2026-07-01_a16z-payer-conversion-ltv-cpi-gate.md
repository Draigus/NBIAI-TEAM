---
source: web_research
source_id: web_2026-07-01_a16z-payer-conversion-ltv-cpi-gate
source_path: https://a16z.com/mobile-game-soft-launch/
ingested: 2026-07-01
topics_detected: [forecast, soft_launch, go_no_go, payer_conversion, ltv, cpi, casual, midcore, revenue_concentration]
relevance_score: 8
novelty_score: 6
actionability_score: 7
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Soft Launch Go/No-Go: a16z Payer Conversion Benchmarks and LTV > CPI Gate

## Key Content

**Source:** Doug McCracken and Joshua Lu, Andreessen Horowitz (a16z). Published October 17, 2023.

### The Core Gate: LTV Must Exceed CPI

The definitive go/no-go criterion is a single inequality: **LTV > CPI**. If lifetime value does not exceed the cost to acquire the user, the game will lose money at scale regardless of retention performance. This is the terminal check after retention and engagement pass.

"If LTVs don't exceed CPIs you will be losing money."

Everything else in soft launch -- D1 retention, D30 curves, crash rates -- is diagnostic. LTV > CPI is the binary gate.

### Payer Conversion Benchmarks by Genre

| Genre | Typical Payer Conversion |
|-------|--------------------------|
| Casual | ~2% |
| Midcore | ~5% |

These are the baseline rates for planning. A game below these rates for its genre has a monetisation problem, not just a marketing problem.

Revenue concentration: **80% of IAP revenue comes from the top 20% of payers**. This means conversion rate improvement (getting more users to pay anything) has outsized revenue impact -- adding one dolphin is worth acquiring five minnows.

### Three Sequential Go/No-Go Questions

The framework structures the decision as three sequential questions, each a prerequisite for the next:

**Question 1: Is the core gameplay loop sufficiently engaging?**
Evidence: FTUE (first-time user experience) completion rate, D1 and D7 retention.
Threshold: Retention must reach and hold genre-appropriate benchmarks.

**Question 2: Does retention compound over time?**
Evidence: D30 retention viability.
Timing caveat: D30 data takes 60+ days to accumulate from soft launch start. To avoid this wait, use the **D1:D7:D30 ratio as a curve-shape proxy** -- if the ratio shape matches a healthy historical game, project D30 from early data rather than waiting.

**Question 3: Can monetisation sustain growth?**
Evidence: LTV > CPI, validated payer conversion rate against genre benchmarks.

### D1:D7:D30 Ratio as a Curve Proxy

A critical practical technique: when the game is too early in soft launch to have statistically valid D30 data, compare the **ratio of D1:D7** against historical games with known D30 outcomes. If the ratio shape (the slope) matches a game that went on to achieve acceptable D30, use that as a directional signal while waiting for actuals.

Example: a game with D1=35% and D7=14% has a D1/D7 ratio of 0.40. If historical games with this ratio produced D30 in the 7-9% range for this genre, treat D30 ≈ 8% as the working assumption while the cohort ages.

### Sample Size Requirements

The article stresses that statistically significant monetisation signals require "enough test players" given that payer rates are low single digits. At 2% payer conversion, a cohort of 1,000 installs produces only ~20 payers -- insufficient for price-point A/B testing. The practical implication: soft launch cohorts for midcore games need 5,000+ installs before payer conversion rates are meaningful.

(No minimum install count is specified in the article; the 5,000+ figure is derived from the statistical constraint implied by the 2% base rate.)

## Decisions / Insights

- The LTV > CPI gate prevents the trap of scaling a game with good retention but insufficient monetisation. Strong D30 alone does not guarantee profitability if CPIs in the target market are high.
- The 80/20 revenue concentration means NBI clients should design monetisation around whale retention first, not average player conversion. Losing one whale costs more than losing ten casual payers.
- The D1:D7 ratio proxy technique allows teams to make provisionally-confident D30 projections after 2-3 weeks of soft launch rather than waiting 60+ days. This is especially valuable for clients under timeline or funding pressure.
- Genre benchmarks (2% casual, 5% midcore) give NBI a reference point when clients ask "is our conversion rate normal?" They are calibrated VC-sourced numbers, not platform averages.

## Context

McCracken and Lu are investing partners at a16z Games. The framework reflects their perspective from evaluating dozens of mobile game pitches and post-mortems. It is a practitioner heuristic, not a peer-reviewed study, but carries VC-level credibility and is consistent with other sources (Lančarič, Segwise).

## Applicability

**Direct NBI use:** Use the three-question gate as a structured framework when advising clients on whether to proceed to global launch. Pair with genre-specific payer conversion benchmarks to contextualise client data.

**Minimum viable implementation:** Requires tracking installs, payers, ARPDAU, and D1/D7/D30 retention. Any analytics platform (GameAnalytics, Amplitude, Firebase) covers this. LTV calculation: ARPDAU × expected player lifetime (days), or use cohort revenue tracking at D30/D60.

**Limitation:** Casual and midcore are broad genre labels. Genre-specific benchmarks for sub-genres (match-3, 4X strategy, idle RPG) will differ from these averages. Use as a floor check, not a pass/fail line.
