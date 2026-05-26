---
source: web_research
source_id: web_2026-05-26_f2p_unit_economics_framework
source_path: https://tenjin.com/blog/unit-economics-for-f2p-games/
ingested: 2026-05-26
topics_detected: [forecast, revenue, ltv, cpi, roas, arpdau, arppu, conversion, retention, unit_economics, financial_model]
relevance_score: 9
novelty_score: 6
actionability_score: 9
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# F2P Unit Economics Framework (Tenjin)

## Key Content

A complete bottom-up financial model for forecasting F2P game revenue and profitability. The framework works backward from a revenue target to determine required player volumes, conversion rates, and pricing.

**Core metrics chain:**
Revenue Goal -> Required Payers (= Revenue / ARPPU) -> Required Acquires (= Payers / CVR) -> UA Budget (= Acquires x CPI) -> Profitability (= LTV x Acquires - UA Budget) -> ROAS (= Revenue / UA Spend)

**Worked example (45-day model):**
- D1 Retention: 45%, D7: 20%, D30: 7%
- ARPDAU: $2.00, Conversion Rate: 5%
- LTV (45 days): $12.60
- Marketing Budget: $500,000
- Predicted Revenue: $1,200,000
- Predicted Profit: $759,000
- 45-Day ROAS: 251%

**Revenue goal decomposition:** Start with target (e.g., $1.2M annually). Calculate required payers (100,000 acquired x 5% CVR = 5,000). Determine ARPPU needed ($1.2M / 5,000 = $240/year). Break into purchase frequency ($240 / 52 weeks = ~$4.62/week). Validate pricing strategy against these requirements.

**Key principle -- Start High:** "price so low because they just do not believe there's somebody who's going to spend high. You should start high because later on you're not going to be able to increase the prices."

A Google Sheets LTV calculator template is referenced (inputs: retention rates, ARPDAU, CPI, marketing budget; outputs: projected revenue, profit, ROAS).

## Decisions / Insights

- The backward-from-revenue approach is more practical than bottom-up estimation for pre-launch games because it forces teams to validate whether their assumptions produce a viable business.
- The framework explicitly connects UA team activity to product team requirements -- "What your UA team does and what your product team does needs to be synchronous."
- The troubleshooting framework is valuable for advisory work: if ARPDAU too low, adjust monetisation design; if CPI too high, refine targeting; if retention too low, fix onboarding or audience fit.
- Professional developers should build the model before development begins; it shapes game design decisions.

## Context

Published by Tenjin (mobile attribution and analytics platform). The framework is practitioner-oriented and widely used in the mobile gaming industry. The specific pLTV algorithm (claimed 98% accuracy) is proprietary and not disclosed, but the unit economics framework is fully replicable.

## Applicability

**Direct NBI use:** This is the primary revenue forecasting framework for F2P client engagements. The backward-from-revenue approach is particularly suited to investor deck preparation (where the question is "can this game make $X?") and UA budget planning.

**Client fit:** Works for any F2P game at any stage. Pre-launch: use benchmark assumptions. Soft launch: plug in real D1/D7/D30 and early ARPDAU. Live: use actual metrics for precise forecasting.

**Combination with retention curve model:** Use the Valeev power curve model to generate retention projections, then feed them into this unit economics framework for full revenue forecasting.
