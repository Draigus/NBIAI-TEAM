---
source: web_research
source_id: web_2026-07-29_payer-ltv-two-step-method
source_path: https://blog.playio.co/calculate-ltv-mobile-games-accurately
ingested: 2026-07-29
topics_detected: [ltv_modelling, payer_segmentation, cohort_analysis, revenue_forecasting, soft_launch]
relevance_score: 8
novelty_score: 6
actionability_score: 7
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Payer vs Non-Payer LTV Separation: The Two-Step Cohort Method for Mobile Games

## Key Content

A common error in mobile game LTV modelling is calculating a single aggregate LTV across the entire player base. This produces a number that understates payer value (diluted by the majority of free players) and overstates non-payer value. The result is UA bidding that is either systematically too conservative (if the game's payer rate is low but whale LTV is high) or too aggressive (if the studio mistakes average-user LTV for payer LTV).

The correct approach is a two-step calculation that models payers and non-payers separately, then combines them into an install-basis LTV for UA bidding purposes.

### The Two-Step Formula

**Step 1: Payer LTV**

```
Payer LTV = Average purchase value x Average purchase frequency x Average payer lifetime
```

This is calculated only on the paying user population. It answers: if we acquire 100 paying users, what is the expected lifetime revenue per paying user?

**Step 2: Install-basis LTV**

```
Install LTV = Payer LTV x Payer conversion rate
```

This converts the payer-cohort number back to the install basis, which is what UA channels can actually target and measure.

Example: if Payer LTV = $45 and 4% of installs ever pay, then Install LTV = $45 x 0.04 = $1.80. UA bids should not exceed approximately $0.60 (at 3:1 LTV:CPI ratio) to maintain healthy unit economics.

The separation matters because the inputs to each calculation behave very differently across cohorts. Payer conversion rate varies strongly by acquisition channel (a Meta campaign targeting lookalikes of existing payers can yield 6-8% conversion; broad interest targeting may yield 1-2%). Payer LTV varies by geography (South Korea players ARPPU may be 3-4x a Latin American equivalent). If these are combined into one number before segmenting, the channel and geo effects compound in unpredictable ways.

### Segmentation Criteria for Payer LTV

The article identifies four dimensions where separate payer LTV calculations produce materially different results:

**Platform:** iOS vs Android. iOS payers consistently show higher ARPPU, often 1.5-2.5x Android in tier-1 markets. This is attributable to App Store payment friction being lower and iOS user demographics skewing toward higher disposable income.

**Geography:** Tier-1 (US, UK, Germany, Japan, South Korea, Australia) vs Tier-2 (Brazil, Mexico, SEA) vs Tier-3 (emerging markets). Revenue per payer in Tier-1 markets can exceed Tier-3 by 10-20x. LTV should be calculated separately per geo tier, not averaged.

**Acquisition channel:** Meta vs Google vs organic vs cross-promotion vs influencer. The author notes that LTV by channel can differ by 2-3x even within the same geo and platform. This is driven by intent signal quality: organic installs correlate with higher payer rates; broad interest targeting installs correlate with low payer rates.

**Monetisation stream:** IAP LTV and advertising revenue LTV must be calculated separately and then combined for hybrid-monetised games. Ad revenue scales with DAU independently of payer behaviour; combining them before modelling creates apparent ARPDAU stability that masks divergent trends in each stream.

### Lifecycle-Stage Approaches

The appropriate LTV method depends on how much cohort data is available:

**Pre-launch:** Use genre ARPDAU benchmarks from GameAnalytics, Sensor Tower, or Data.ai combined with estimated genre lifetimes. This produces order-of-magnitude estimates only. Acknowledge plus or minus 50% uncertainty in any pre-launch LTV.

**Soft launch (D1-D30 data available):** Fit a power function or exponential curve to D1, D7, D14, D30 retention data points. Integrate the area under the fitted curve to estimate user lifetime. Apply genre-appropriate ARPDAU against that lifetime. This is the most actionable method for NBI's typical client at pitch stage.

**Post-launch (mature cohorts):** Cohort analysis tracking cumulative ARPU over time. If cohorts from 6+ months ago are available, the actual revenue-per-user curve can be plotted and projected. This is the ground truth method.

### Early Behavioural Predictors

The article identifies three D1-D3 signals that are strongly predictive of eventual payer status:

- **D1 and D3 retention**: high early retention correlates with eventual conversion to payer (the game retained long enough to present monetisation offers)
- **First in-game purchase occurrence**: if it happens within D3, this user's long-term spend trajectory is materially higher than first-purchase at D14+
- **Tutorial completion**: non-completers churn before monetisation opportunity; completing the tutorial is a prerequisite, not a predictor, of spend

These early signals allow payer LTV models to be partially validated within the first week of a cohort's life, enabling fast UA campaign decisions.

### Sample Size Warnings

The method produces unstable results with small cohorts. Because a small number of whale users generate disproportionate revenue, cohorts of fewer than several hundred users will have LTV estimates dominated by whether those whales happen to appear in the cohort.

Practical minimum: 500 users per segment per lifecycle stage for meaningful LTV segmentation. For payer-specific metrics (ARPPU, payer lifetime), minimum 50 paying users per segment before computing segment-level statistics.

### The 3:1 Ratio Benchmark

The article establishes a standard UA viability benchmark: **LTV:CPI ratio should be at least 3:1** for healthy unit economics. The CPI ceiling is therefore Install LTV divided by 3. This is the maximum bid NBI clients should accept on any acquisition channel.

For a hybrid game at soft launch: Install LTV estimated at $2.00. Maximum viable CPI = $0.67. Any channel exceeding this CPI at target scale needs LTV validation before commitment.

## Decisions / Insights

- Always calculate payer LTV first on the paying cohort, then back-calculate to install basis via conversion rate; never start with blended ARPU
- Segment by platform, geography tier, and acquisition channel before computing LTV; blended numbers obscure 2-3x variation that is directly actionable in UA bidding
- For hybrid games, compute IAP LTV and ad revenue LTV separately before combining; conflating them masks divergent trends
- Apply the 3:1 LTV:CPI ratio to set campaign bid ceilings; present this to clients as a mechanical check, not a soft guideline
- Minimum 500 installs and 50 payers per segment before quoting LTV; with smaller cohorts, acknowledge the estimate is directional only

## Context

Source is Playio's product analytics blog. Playio is a mobile gaming platform; the content is practitioner-level rather than academic. The two-step formula is industry standard; what makes this article useful is the specific segmentation criteria and the clear statement of the install-basis conversion step, which is often omitted in generic LTV discussions. No validation study cited; this is synthesised practitioner methodology. Two-step formula and 3:1 ratio confirmed accessible and present 2026-07-29.

## Applicability

This is NBI's default LTV methodology for client work. The two-step calculation should be the starting point for any engagement where the deliverable includes LTV estimates or UA bid guidance.

Minimum viable implementation: spreadsheet with five inputs per segment (average purchase value, purchase frequency, payer lifetime, payer conversion rate, installs). Produces install LTV and CPI ceiling per segment. Can be extended with curve-fit retention data when D30 cohorts are available.

Limitation: "average purchase frequency" is misleading for games with skewed payer distributions. A game with 80% one-time payers and 20% recurring high-spenders will have a purchase frequency average that describes neither population accurately. Where payer distribution is skewed, split further: one-time payers vs recurring payers as separate sub-cohorts within the payer population.
