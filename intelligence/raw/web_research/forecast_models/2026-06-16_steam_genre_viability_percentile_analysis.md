---
source: web_research
source_id: web_2026-06-16_steam_genre_viability_percentile_analysis
source_path: https://eastshade.com/genre-viability-on-steam-and-other-trends-an-analysis-using-review-count/
ingested: 2026-06-16
topics_detected: [forecast, market_sizing, steam, pc, genre_viability, percentile_analysis, demand_supply, tag_analysis, indie]
relevance_score: 8
novelty_score: 8
actionability_score: 8
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# Genre Viability Assessment via Tag-Level Percentile Analysis — Steam Demand/Supply Framework

## Key Content

A developer-authored methodology (Eastshade Studios, republished on Game Developer) for evaluating the commercial viability of specific Steam sub-genres using review-count data at the tag level. The methodological contribution is replacing mean/average revenue comparisons — which are skewed by outliers — with percentile-based probability distributions. The question asked is "what percentage of games in this tag exceed threshold X?" rather than "what is the average revenue?". This produces a more honest and usable market sizing signal, particularly for studios entering crowded genres.

### Process

**Step 1: Collect tag-level review data**

Operate at the Steam tag level (e.g., "Metroidvania", "Cozy", "Soulslike", "Deckbuilder"), not broad genre labels (RPG, Action). Tags are more granular and more predictive of commercial comp performance.

Data source: SteamSpy public API or manually compiled from Steam store pages. Required fields: game title, tags, review count, launch price, launch date.

**Step 2: Apply filtering criteria**

- Minimum 30 games per tag (below this, statistical signal is too weak)
- Maximum 2,000 games per tag (above this, the tag is too ambiguous — e.g., "Indie" has 50,000+ entries)
- Exclude Early Access titles (distort completion-stage review counts)

**Step 3: Calculate revenue estimates per game**

Apply the review-count formula:

`Net Revenue ≈ Review Count × 50 × US Price × 0.38`

(The 0.38 net multiplier accounts for regional pricing, discounts, platform cut, VAT, and returns. See extract `2026-06-16_steam_review_count_revenue_framework` for full genre-specific multiplier table and lifetime curve.)

**Step 4: Build percentile distributions for each tag**

For each tag, calculate P10, P25, P50, P75, P90.

Do not report averages alone. Averages are systematically distorted by breakout hits — a single game at $50M pulls the average of 200 titles well above their actual median. P50 is the baseline; P75/P90 describe the opportunity ceiling.

**Step 5: Convert to viability probability**

For a given revenue threshold (e.g., "cover a 2-year solo dev budget of $150K"):

`Viability % = Games in tag exceeding threshold ÷ Total games in tag`

This directly answers "what percentage of games attempting this genre made enough money?" — a more honest framing than "what is the market size?"

**Step 6: Assess demand/supply balance**

High viability % = healthy genre (demand exceeds supply, or genre is broad enough to absorb new entrants). Low viability % = oversupply signal.

From the Eastshade analysis: the "Moddable" tag showed high viability despite 500+ titles, suggesting moddability expands the addressable audience regardless of supply pressure — the tag characteristic matters, not just the count.

### Decision Rule

| Condition | Signal |
|---|---|
| P50 revenue > client minimum viable AND viability % > 20% | Genre passes baseline market sizing test |
| P50 < minimum viable AND viability % < 10% | Recommend genre pivot; document clearly |
| Mixed signals | Report both metrics and let client decide with full visibility |

### Important Limitation

This framework estimates genre-level market patterns, not the addressable market for a specific game. Game quality, marketing execution, and timing are separate variables not captured here.

### Data Currency

The Eastshade analysis used 2021–2022 data. For current engagements, fresh data runs are required per engagement. Key changes since 2022: action-roguelite saturation (2024), co-op demand surge, farming/life-sim strength. Do not apply historical viability percentages to current engagements without re-running against a current dataset.

## NBI Application Notes

Use at the earliest stage of development advisory (concept / pre-production) to prevent clients from entering genres where the revenue maths does not work at their scale. Translates "is there a market for this?" into a probability statement: "In the [Tag] genre, X% of games with comparable positioning exceeded your minimum viable revenue threshold." Present P50 and P75 explicitly; show the viability probability. Do not use for mobile (Steam-specific tag structure has no mobile equivalent — use the TAM/SAM/SOM framework instead). Requires a fresh dataset pull per engagement.
