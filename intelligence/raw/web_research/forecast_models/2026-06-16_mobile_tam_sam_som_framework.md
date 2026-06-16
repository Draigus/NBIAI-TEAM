---
source: web_research
source_id: web_2026-06-16_mobile_tam_sam_som_framework
source_path: https://adapty.io/blog/tam-sam-som/
ingested: 2026-06-16
topics_detected: [forecast, market_sizing, mobile, tam_sam_som, addressable_market, f2p, genre_analysis, platform_strategy]
relevance_score: 8
novelty_score: 6
actionability_score: 8
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Mobile Game TAM/SAM/SOM Framework — Genre and Platform Addressable Market Calculation

## Key Content

A structured three-tier market sizing framework adapted specifically for mobile games, published by Adapty (mobile monetisation platform). Unlike generic business TAM/SAM/SOM frameworks, this version incorporates game-specific filters (genre, platform OS, monetisation model, regional pricing) and explicitly addresses the "1% fallacy" common in studio pitch decks. Designed for developers and advisors who need defensible market size estimates using publicly available data sources.

### Tier 1: Total Addressable Market (TAM)

Run all three calculation paths and triangulate:

**Top-Down:**
`TAM = Total gaming segment revenue × Genre share %`

Use Newzoo free annual report, Sensor Tower State of Gaming, or Statista for segment revenue. These are estimates — treat as order-of-magnitude only.

**Bottom-Up (more defensible for pitches):**
`TAM = Total gamers in category × Annual ARPU for genre`

Chain: smartphone user count in target markets × % who play games × % who play target genre × ARPU for genre. Each assumption is separately auditable, which makes this method stronger in due diligence contexts.

**Value Theory:**
Revenue capturable from unique value versus alternatives. Less common for games but applicable when creating a new sub-genre or mechanic category.

### Tier 2: Serviceable Addressable Market (SAM)

`SAM = TAM × Platform Filter × Geography Filter × Genre Filter × Monetisation Filter × Demographic Filter`

Filter reference values (sourced from Adapty methodology, based on Sensor Tower and data.ai published data):

| Filter | Reference Value |
|---|---|
| iOS vs Android (US revenue split) | iOS ~56% of US mobile game revenue; Android dominates emerging market volume |
| North America share of global mobile game revenue | ~35% |
| Western markets combined | ~55% |
| F2P vs premium audience | Distinct pools with different ARPU; do not blend |

**Worked example — action mobile F2P, US-only, iOS:**

| Step | Multiplier | Running Total |
|---|---|---|
| Global mobile gaming TAM | — | ~$90B |
| North America only | ×35% | ~$31.5B |
| iOS platform | ×56% | ~$17.6B |
| Action game players (~25% of mobile gamers) | ×25% | ~$4.4B |
| SAM | — | ~$4.4B |

### Tier 3: Serviceable Obtainable Market (SOM)

**Revenue-based (top-down):**
`SOM = SAM × Realistic market share %`

For indie or early-stage studio: 0.01%–0.1% of SAM is realistic in Year 1–3. Above 1% requires a credible explanation backed by UA budget, distribution deal, or IP advantage.

**Bottom-up (more credible in pitch contexts):**
`SOM = Reachable Installs × Conversion Rate × ARPU`

- Reachable installs: UA budget ÷ CPI for genre in target market
- Conversion rate: 1–5% F2P IAP; genre-specific (mid-core strategy ~3–5%, casual hyper ~0.5–2%)
- ARPU: use GameAnalytics genre benchmarks as proxy (free download annually)

**Cross-validation rule:** Run both top-down and bottom-up. Divergence under 5x = acceptable. Divergence of 10x+ = broken assumption; find it before proceeding.

### Anti-Patterns to Flag in Client Materials

- "We only need 1% of a huge market" with no UA mechanism — reject immediately
- TAM figures from analyst reports applied without platform/genre filtering — inflates by 10–50x
- ARPU from different geography applied to target market — can overstate by 3–5x
- CPI benchmarks from pre-2022 sources — iOS ATT (14.5+) fundamentally changed mobile UA costs

### Public Data Sources for Each Input

| Input | Source |
|---|---|
| Global/regional gaming market revenue | Newzoo free annual report, Sensor Tower State of Gaming |
| Genre share by platform | Sensor Tower top genre revenue charts (free tier) |
| Genre ARPU benchmarks | GameAnalytics Benchmark Report (free annual download) |
| UA cost / CPI by genre | AppsFlyer Performance Index, Liftoff Mobile Gaming Apps Report (published annually) |
| Conversion rates by genre | GameAnalytics Benchmark Report |

## NBI Application Notes

Use for mobile game market sizing in client pitches, investment decks, and publishing discussions. Particularly valuable for mid-core and F2P genre analysis where the addressable slice is heavily filtered by platform, geography, and monetisation behaviour. Run before any mobile revenue projection. For hyper-casual specifically: adjust the framework to use ad revenue per DAU as the primary value driver (IAP conversion is negligible in that sub-genre). Always pair SOM output with an LTV/CPI ratio check — a large SOM is irrelevant if UA costs exceed lifetime value.
