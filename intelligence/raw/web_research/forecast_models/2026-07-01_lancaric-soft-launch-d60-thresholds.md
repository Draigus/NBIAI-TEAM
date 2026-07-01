---
source: web_research
source_id: web_2026-07-01_lancaric-soft-launch-d60-thresholds
source_path: https://lancaric.me/how-to-soft-launch-a-mobile-game-in-2024/
ingested: 2026-07-01
topics_detected: [forecast, soft_launch, go_no_go, retention, d60, ua, creative_testing, monetisation, sample_size]
relevance_score: 8
novelty_score: 7
actionability_score: 8
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Soft Launch Go/No-Go Thresholds: Lančarič 2024 Framework

## Key Content

**Source:** Matej Lančarič, UA Expert (formerly SuperScale Director of UA). Published February 9, 2024 at lancaric.me.

### The D60 Flattening Threshold

The central finding is that **D60 retention of 6-8% is the "magic" profitability threshold** -- a game achieving this, even with a below-standard D1, can sustain profitable user acquisition.

Key counter-intuitive case: A game with **D1 retention of only 25%** (well below the oft-quoted 40% industry standard) generated $2M/month in revenue because long-term retention was strong. This challenges the convention of using D1 as a primary go/no-go signal.

**The principle:** The ratio between D1/D3/D7 is more predictive than the absolute D1 value. A steep D1-to-D3 drop followed by a shallow D3-to-D7 slope is a different problem from the inverse. Diagnose the slope, not the snapshot.

### Retention Interpretation by Stage

| Day | What It Measures | Benchmark Use |
|-----|-----------------|---------------|
| D1 | First-session quality | Directional only; 25%+ viable if long-tail is strong |
| D7 | Habit loop formation | D1:D7 ratio more important than either in isolation |
| D30 | Metagame / depth | Required for LTV model reliability |
| D60 | Profitability floor | 6-8% = can sustain paid UA; below 4% = investigate or kill |

### UA Creative Testing Sample Size Requirements

Specific thresholds for statistically significant creative testing during soft launch:
- **Minimum:** 50 conversions per creative in 4 days
- **Recommended:** 100 conversions per creative in 7 days

Below these thresholds, creative performance data is directional only and should not drive budget allocation.

### Ad Monetisation Threshold

For games with ad monetisation (IAA): **Impression per DAU above 4.0** means rewarded video placements will impact UA profitability in a meaningful way. Below 4.0, the ad revenue contribution is insufficient to offset CPI at scale.

### Kill Criteria

"If your last 2-3 builds did not improve the KPIs and your game is consistently underperforming against benchmarks, it may be time to say goodbye."

This is a process gate, not a single-metric threshold: iterate until 2-3 consecutive build cycles fail to move the needle.

### Timeline Requirements

- Soft launch duration: 3-6 months (down from the previous 6-9 month recommendation)
- Minimum cohort for statistically significant retention data: approximately 200 daily new users
- LTV model reliability requires approximately 6 months of cohort aging before meaningful D60+ extrapolation

## Decisions / Insights

- The 40% D1 benchmark is widely quoted but misleading as a standalone kill signal. The slope between D1 and D7 and the eventual flattening at D60+ are more predictive of commercial viability.
- A game at D1=25% but D60=8% (flat) has better UA economics than a game at D1=45% but D60=3% (still declining). The former has a stable base audience; the latter is burning through users.
- The impression/DAU > 4.0 threshold is specific and immediately testable in any live game with rewarded video. If below 4.0, increasing ad monetisation requires product changes (more placement points, higher eCPM targeting) before scale.
- 200 daily new users as the minimum cohort size is a concrete resource planning input: it tells you the minimum soft launch marketing spend required to generate valid data.

## Context

Matej Lančarič is a UA practitioner with direct experience scaling mobile games. The 2024 version of this article reflects post-IDFA/ATT market conditions where iOS soft launches generate less signal than Android. The D60 threshold is from real campaign data, not theoretical modelling.

## Applicability

**Direct NBI use:** When advising clients entering or exiting soft launch, use D60 6-8% as the viability floor rather than the D1=40% convention. Present the D1/D7 ratio analysis as the diagnostic step before applying any threshold.

**Minimum viable implementation:** Track D1, D7, D30, D60 in any analytics platform (GameAnalytics free tier covers this). Compare ratio shape against genre comps before applying kill criteria.

**Limitation:** Data comes from a practitioner perspective; no sample sizes or statistical methodology disclosed for the benchmark numbers themselves. Treat as calibrated industry intuition rather than peer-reviewed data.
