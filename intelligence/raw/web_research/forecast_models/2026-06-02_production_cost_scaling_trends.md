---
source: web_research
source_id: web_2026-06-02_production_cost_scaling_trends
source_path: https://ziva.sh/blogs/game-development-cost-trend
ingested: 2026-06-02
topics_detected: [forecast, production_cost, inflation, team_size, scaling, aaa, methodology]
relevance_score: 7
novelty_score: 6
actionability_score: 7
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: benchmark_data
---

# Game Development Production Cost Scaling Trends (Ziva, 2026)

## Key Content

A five-year trend analysis (2022-2026) of game development costs using a "studio-level build-up" methodology. The key finding: game development costs are compounding at ~7.8% per year, driven by labour cost inflation and team size growth.

### 1. Global Game Development Spend (Year-over-Year)

| Year | Total Spend | YoY Growth |
|---|---|---|
| 2022 | ~$37B | -- |
| 2023 | ~$40B | +8.1% |
| 2024 | ~$44B | +10.0% |
| 2025 | ~$47B | +6.8% |
| 2026 | ~$50B | +6.4% |

4-year CAGR: ~7.8%. Total increase: 35%.

### 2. Labour Cost Inflation

US game developer fully-loaded compensation:
- 2022: ~$95,000/year
- 2026: ~$115,000/year
- CAGR: ~5%/year

Senior engineers and technical artists saw steepest increases (~8%/year), driven by competition from big tech and remote work premium.

### 3. Team Size Escalation

| Tier | 2022 | 2026 | Growth |
|---|---|---|---|
| AAA average team | 220 people | 300 people | +36% |

Specific examples:
- Rockstar: ~1,000 on GTA V to ~2,000 on GTA VI
- CD Projekt: ~500 on Cyberpunk 2077 base to ~600 on Phantom Liberty

### 4. Production Cost Formula

The Kevuru Games formula for team-based estimation:

**Cost = (Hourly_Rate x 8) x (Team_Size x 20) x Months**

Where 8 = hours/day, 20 = working days/month.

Worked example: ($40/hr x 8) x (10 people x 20 days) x 6 months = $384,000.

This gives a quick bottom-up estimate from three inputs: average hourly rate, team size, and duration.

### 5. Tier Benchmarks (2026)

| Tier | Budget Range | Team Size |
|---|---|---|
| Indie | $50K-$500K | 1-15 |
| Mid-tier / Triple-i | $5M-$20M | 50-100 |
| AA | $20M-$50M | 100-200 |
| AAA | $100M+ | 200-800+ |

The "missing middle" between indie ($500K) and mid-tier ($5M) is noted as increasingly rare.

### 6. Marketing Cost Benchmarks

From published AAA examples:
- GTA V: $150M development + $115M marketing (marketing = 77% of dev)
- Call of Duty: Modern Warfare 2: $50M development + $200M marketing (marketing = 400% of dev)
- General rule: marketing = 20-100% of development budget

## Decisions / Insights

- The 7.8% annual cost CAGR is the single most important macro input for multi-year production budgets. A project budgeted today for 2028 delivery should inflate costs by ~25% over a 3-year development cycle.
- The "missing middle" observation ($500K-$5M gap) confirms the bifurcation of the market. NBI clients tend to fall into this gap -- too large for bootstrap budgets, too small for publisher-level investment. This is where accurate budget estimation adds the most value.
- The Kevuru formula (Rate x 8 x Team x 20 x Months) is simpler than Ismail's per-person approach but useful for quick sanity checks. The two methods should produce similar results and can cross-validate.
- Team size is growing faster than per-person costs, meaning the total cost escalation is multiplicative: more people x more expensive people = 7.8% compound growth.

## Context

Ziva's analysis uses a "studio-level build-up" methodology: Steam developer counts, annual release data, team size adjustments from GDC surveys, and loaded labour cost inflation. The AAA examples (GTA V, CoD:MW2) are well-documented public figures. The $37B-$50B global spend figures align with Newzoo and PwC gaming market reports.

## Applicability

**Direct NBI use:** The 7.8% cost CAGR and the $95K-$115K loaded labour cost range provide inflation adjustments for any multi-year budget forecast. The tier benchmarks offer quick classification of where a client's project sits.

**Client fit:** Studios planning multi-year projects who need to account for cost escalation. Also useful for investor pitch reviews where NBI needs to assess whether a budget is realistic for the stated scope.

**Limitations:** Global spend figures are estimates with significant uncertainty bands. The analysis is top-down (industry-level) rather than bottom-up (studio-level), so it captures trends but not individual project variance. The $115K loaded cost is US-centric; UK rates are typically 15-20% lower, Eastern Europe 40-60% lower.
