---
source: web_research
source_id: web_2026-05-26_gameanalytics_2025_retention_benchmarks
source_path: https://gamedevreports.substack.com/p/gameanalytics-mobile-gaming-benchmarks
ingested: 2026-05-26
topics_detected: [forecast, retention, benchmarks, d1, d7, d28, genre, platform, region, session, engagement]
relevance_score: 8
novelty_score: 5
actionability_score: 8
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: data_point
---

# GameAnalytics 2025 Mobile Gaming Retention Benchmarks

## Key Content

The industry's largest retention benchmark dataset: 11,600 games, 1.48 billion+ combined MAU, across 9 regions and 16 genres (iOS and Android).

**D1 Retention:**
- Top 25%: 26.48%-27.69% (down from 28-29% in 2023)
- Bottom 25%: 10%-11.5%
- iOS top 25%: 31%-33%
- Android top 25%: 25%-27%

**D7 Retention:**
- Median: 3.42%-3.94% (down from 4-5% in 2023)
- Top 25%: 7%-8%
- Bottom 25%: ~1.5%

**D28 Retention:**
- 75% of projects have D28 retention below 3%

**Session metrics:**
- Median daily playtime: 22 minutes (top 2%: up to 4 hours)
- Session length top 25%: 8-9 minutes; median: 5-6 minutes
- Average sessions per day: 4 (midcore: 6-7)
- Android users exceed iOS in session frequency

**Regional retention (D1 / D7 / D28):**
- Best: Middle East (22.64% / 4.91% / 1.49%)
- Worst: Africa and Asia

**Regional playtime:**
- Highest: Africa (26.85 min); Lowest: Asia (21-22 min)

**Regional session length:**
- Longest: Oceania (6.85 min); Shortest: Africa and Asia (~5 min)

**Regional sessions per day:**
- Highest: Africa (5.45), Middle East (4.71); Lowest: North America (3.67)

**Genre performance:**
- Arcade: highest D1 but poor long-term retention
- Board, card, puzzle, casino: best medium-to-long-term retention
- Multiplayer: leads in session length

**Year-over-year trend:** Retention is declining across the board. D1 top quartile dropped 1-2 percentage points from 2023 to 2025. D7 median declined similarly.

## Decisions / Insights

- The declining retention trend means LTV models built on 2023 benchmarks will overestimate. NBI should use 2025 benchmarks as the baseline and apply a conservative haircut for 2026 projections.
- The iOS/Android retention gap (5-6 percentage points at D1 top quartile) is significant for revenue modelling. iOS users retain better and typically monetise higher -- platform mix in the TAM directly affects LTV projections.
- Genre selection is the single biggest determinant of achievable retention. A puzzle game with D1 retention of 25% is performing at median; a strategy game at 25% is performing in the top quartile. Genre-appropriate benchmarks must be used.
- The Middle East showing highest retention across all timeframes is notable for market sizing -- MENA mobile gaming may be undervalued in typical Western-centric forecasts.
- Session frequency (4 avg, 6-7 midcore) combined with session length (5-6 min median) implies ~22 minutes of daily engagement at median -- consistent with the playtime data. This triangulation validates the dataset.

## Context

GameAnalytics is the largest free analytics platform for mobile games, giving them access to a uniquely broad dataset. This is their annual benchmark report, widely used as the industry standard. Data summarised via gamedevreports.substack.com (Alexey Zagumyonnov's regular digest of industry data reports).

## Applicability

**Direct NBI use:** These are the default benchmark assumptions for any client revenue model where game-specific data is not yet available. The genre and platform breakdowns allow NBI to set realistic expectations during pitch deck preparation.

**Client fit:** Essential reference for every mobile game client engagement. Use to validate client retention claims ("you say D1 is 40% -- that would put you in the top 10% of all mobile games; is that realistic?") and to calibrate LTV models.

**Pairing:** Feed these benchmarks into the Valeev retention curve model as starting assumptions, then into the Tenjin unit economics framework for full revenue projections.
