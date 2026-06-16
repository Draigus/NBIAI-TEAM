---
source: web_research
source_id: web_2026-06-16_steam_genre_comp_analysis_framework
source_path: https://howtomarketagame.com/2024/07/16/what-games-are-selling-q2-2024/
ingested: 2026-06-16
topics_detected: [forecast, market_sizing, steam, pc, genre_analysis, competitive_analysis, comps, indie, mid_tier]
relevance_score: 9
novelty_score: 7
actionability_score: 9
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Steam Genre Comp Analysis — Five-Phase Market Sizing via Tag Filtering and Revenue Cohort Analysis

## Key Content

A practitioner-developed methodology by Chris Zukowski (How to Market a Game) for constructing a genre-specific comparable-game dataset on Steam and deriving bottom-up market size estimates. Refined through quarterly Steam market analyses over multiple years. Requires only public Steam data and spreadsheet tools. The core innovation is progressive tag-based filtering (not genre labels) to build a precise comp set, followed by cohort analysis to identify realistic revenue anchors.

### Five-Phase Process

**Phase 1: Define the genre precisely using Steam tags**

Steam genre labels are too broad. Use tag combinations to define the specific sub-genre. Example for "2D side-scrolling roguelite":
- Tag 1: `Rogue-like` or `Rogue-lite`
- Tag 2: `2D` or `Pixel Graphics`
- Tag 3: `Platformer` or `Side Scroller`

Start with a broad dataset (SteamSpy or Gamalytics free exports), apply tag filters in Excel/Sheets using SEARCH formulas. Expect to reduce a 40,000-row dataset to 30–100 comparable games.

**Phase 2: Filter for minimum market signal**

Remove games with fewer than 10 reviews (excludes asset flips). Optionally apply a 700+ follower filter (~7,000 wishlists equivalent) to focus on games with genuine market traction.

**Phase 3: Apply revenue estimation**

Run each comparable through the review-count formula (see extract `2026-06-16_steam_review_count_revenue_framework`). Calculate estimated lifetime revenue for each title. Produce:
- P25, P50 (median), P75, P90 for the comp set

Do not report averages — they are distorted by outliers. A single hit game can pull the comp set average 5–10x above the median.

**Phase 4: Anchor to a realistic target**

For indie-to-mid-tier studios: P50 = floor, P75 = realistic target, P90 = genre hit potential (useful for market sizing ceiling but not financial planning). Identify the 1–2 comps that best match the client's scope (team size, budget) and use those as primary anchors.

**Phase 5: Qualitative cohort validation**

Group the 6–10 closest comps into archetypes:
- Ugly high-earners (strong gameplay, weak visuals) — reveals quality > polish
- Polished underperformers — reveals table-stakes vs. differentiators
- Solo dev projects — scope reference for single-developer clients
- Low-marketing successes — reveals word-of-mouth viability for a given genre

Time-box each game review to 60 minutes maximum.

### Genre Viability Benchmarks (Q2 2024, sourced from How to Market a Game quarterly analysis)

The 1,000-review threshold proxies commercial success (~$300K gross at typical indie pricing):
- Only 2.44% of all Steam releases achieve 1,000 reviews
- Approximately 500 games per year reach this level from 18,000+ releases

Genre success rates (% of releases exceeding 1,000 reviews):
| Genre | Success Rate |
|---|---|
| Open World Survival Craft | ~24.5% |
| Farming / Life Sim | ~20.8% |
| Co-op focused | Strong (51 hits in H1 2024 = ~21% of all hits) |
| Action-Roguelite | Declining — 17 hits (2023) to ~1 (H1 2024) |

Revenue concentration (from 5,773-game 2024 analysis):
- Published games: median ~$16,222 vs. self-published median ~$3,285
- Top 10% of AA games capture ~83.92% of total AA revenue

Genre demand signals (2024–2025): Co-op, Survival Craft, Farming strong. Action-roguelites, 2D Platformers, Puzzle — oversupplied despite demand.

### Data Sources Required

- SteamSpy.com free export or Gamalytics free tier (tag-level dataset)
- Steam store pages (review counts, launch prices — public)
- Developer postmortems and press releases for calibration (optional)

## NBI Application Notes

Use this at the start of any PC game advisory engagement to establish genre-level revenue bands before any financial modelling. Pairs with the review-count revenue framework. Present P50 and P75 estimates, not averages. When clients cite P90 examples ("Hades made $X"), use the framework to make explicit that this is a ~10% outcome. Flag genre saturation signals — action-roguelites are a live example of a genre where the market sizing looked strong 2 years ago but has deteriorated.
