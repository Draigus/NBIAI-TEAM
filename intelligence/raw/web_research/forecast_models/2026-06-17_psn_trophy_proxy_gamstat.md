---
source: web_research
source_id: web_2026-06-17_psn_trophy_proxy_gamstat
source_path: https://gamstat.com/how/
ingested: 2026-06-17
topics_detected: [forecast, market_sizing, playstation, psn, player_count, trophy_proxy, sales_estimate, console, methodology]
relevance_score: 7
novelty_score: 8
actionability_score: 6
bank_candidates: [forecast_models]
new_bank_suggestions: []
sensitivity_class: public
extract_type: methodology
---

# PSN Trophy-Count as PlayStation Sales Proxy — Gamstat Methodology

## Key Content

Gamstat.com is the PlayStation equivalent of the Steam review-count proxy approach. It uses the PSN public API to build a player-count estimation methodology, producing the only documented replicable public-data approach for estimating PlayStation game reach.

### Core methodology (three stages)

**Stage 1 — Relative player relationships via trophy data**
Sample approximately 8 million PSN accounts via the public PSN API. For every public account, the trophy list exposes which games have been launched (even games with zero trophies earned appear in the list with the date first played). Calculate what percentage of sampled accounts have the game in their trophy list.

**Stage 2 — Temporal trends**
Plot trophy earn dates across the sample to reconstruct a launch-curve shape and identify when player spikes occurred (correlates with sales events, PS Plus inclusion, price drops).

**Stage 3 — Absolute scaling via MyPS4Life calibration**
Sony's December 2024 "My PS4 Life" promotional data disclosed trophy rarity percentages paired with absolute player counts for hundreds of titles. This provided an anchor dataset enabling conversion from relative sample percentages to absolute player figures. Without this calibration layer, the methodology produced only relative comparisons; after it, absolute estimates became possible.

**Margin of error:** ±10% for titles with sufficient sample size. Error increases substantially for games with small player counts.

### Player counts vs. sales — the critical distinction

The methodology measures player engagement, not purchases. A single PS Plus download contributes one player count but zero purchase revenue. Players can also share physical discs. For indie premium titles (not PS Plus included, not heavily shared), player counts are a reasonable purchase proxy. For F2P or PS Plus catalogue titles, player counts substantially overstate unit purchases.

**Adjustment workflow for NBI use:**
1. Look up the comparable title on gamstat.com
2. Note the player count and approximate date range
3. Verify whether the comp was included in PS Plus catalogue during the relevant period (check PS Plus historical lists — widely documented online)
4. If PS Plus included: player count is not a purchases proxy — set aside or use for reach/MAU estimate only
5. If premium only: player count ≈ purchase count. Multiply by the game's launch price (net of typical 20% regional/discount adjustment) for gross revenue estimate

### Archive status — important limitation

Gamstat's active data collection has stopped. The PSN API access that powered it was restricted following the December 2024 MyPS4Life calibration event. The site is in "Archive" mode. Current data is not updating. The database is useful for historical comp research (titles launched before 2025) but not for live tracking of 2025+ launches.

### Switch equivalent: confirmed gap

No equivalent public methodology exists for Nintendo Switch. Nintendo does not expose public account data, trophy/achievement data, or wishlist counts equivalent to PSN. eShop ratings are visible per title but are not equivalent to PSN trophy engagement counts. This gap is confirmed — not a research failure.

## NBI Application Notes

Gamstat is a useful calibration tool for PlayStation comp research. NBI analysts should pull player counts for 3–5 comparable indie titles on gamstat.com, note the trophy-list player figures, check whether any comp was PS Plus included during the measurement period (adjusting or discarding those comps accordingly), and use the resulting purchase-implied range to bracket PlayStation SAM for a client's genre. Because the database is archived, the most reliable application is for historical comps — titles launched before mid-2025. For 2025+ console launches, the gamstat data no longer updates but the historical calibration data remains valid for genre-level comp research. Combine with the console-as-percentage-of-Steam framework (see companion extract) for cross-validation.
