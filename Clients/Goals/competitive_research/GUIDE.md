# Competitive MTX Pricing Research — Guide

**Client:** Goals (Strikerz-adjacent football game, Swedish developer)
**Prepared by:** NBI Analytics
**Date:** 2026-04-21
**Quality score:** 86/100 (post red-team review)

---

## What This Is

A competitive pricing benchmark covering hard currency (HC) pack pricing across 12 titles in the football and F2P gaming space. It tells Goals what their competitors charge for premium currency, how those prices are structured, and what patterns the industry follows when adjusting prices.

This is **not** a pricing recommendation document. It provides the data foundation for pricing decisions. The actual tier amounts, regional multipliers, and launch pricing should be set using this data alongside Goals' internal revenue model, player demographics, and willingness-to-pay research.

---

## What's In The Box

All files live in `Clients/Goals/competitive_research/output/`.

### For Reading

| File | What It Is | Start Here? |
|---|---|---|
| **FINDINGS_SUMMARY.md** | Analytical synthesis — 9 sections covering benchmarks, trends, and observations. Every claim has an inline source citation. | Yes — read this first |
| **RED_TEAM_REPORT.md** | Quality audit trail. Shows what was wrong, what was fixed, and the scoring methodology. | Read if you want to understand data confidence |

### For Spreadsheets

| File | What It Is | How To Use |
|---|---|---|
| **current_snapshot.csv** | 315 normalised price points across 12 competitors (HC + SC packs only; battle passes excluded). One row per SKU per region. | Import into Google Sheets. Filter by `competitor` column to compare titles. Filter by `region` for regional pricing analysis. |
| **citations.csv** | 147 source URLs indexed by competitor. | Cross-reference if anyone asks "where did this number come from?" |
| **ea_fc_pricing_history.json** | EA FC/FIFA Points pricing from 2018 to 2026, year by year. | Open in a JSON viewer. Shows exactly how EA evolved their tier structure over 8 years. |
| **verification_report.json** | Pipeline health check output. | Confirms data quality: 0 critical/high/medium issues. |
| **competitor_price_changes.json** | Historical price changes across competitors. | Reference for the "how do publishers change prices" narrative. |
| **cross_competitor_comparison.json** | Side-by-side comparison: what does $10/$20/$50/$100 buy in each game? | Good for slide decks or quick comparisons. |

---

## How To Read The Findings

### Source Citations

Every claim in FINDINGS_SUMMARY.md has a source key in square brackets. The Source Key table at the top maps these to raw data files:

- **[S-FC26]** = Steam Store API data for EA FC 26
- **[C-UFL]** = Community research for UFL (28 source URLs)
- **[L-EA]** = Longitudinal EA FC pricing history (2018-2026)
- etc.

To verify any claim: find the source key, open the referenced file in `raw/`, and check the specific field mentioned.

### Sections At A Glance

1. **HC Pack Pricing Benchmarks** — What every competitor charges at entry and top tier. The comparison tables.
2. **EA Cross-Sport Consistency** — EA FC and Madden use near-identical pricing. F1 uses the same architecture but at different price points.
3. **Longitudinal Trends** — 8 years of EA FC pricing evolution. The "never raise USD prices" evidence.
4. **UFL** — Goals' closest direct competitor. First 3 tiers match EA FC; upper tiers diverge.
5. **Valorant** — The cosmetic pricing ceiling. Shows how high F2P players will go for skins.
6. **Industry Pricing Patterns** — How each publisher handles price changes without raising sticker prices.
7. **Platform Observations** — Regional quirks (Turkey priced in USD, Korea geo-restricted, etc.).
8. **Gaps and Citation Health** — What's missing and which source URLs are still live.
9. **Cross-Reference vs Goals' Internal Pricing** — NBI findings compared against Goals' own pricing matrix. Identifies the $0.99 micro-entry gap.
10. **Soft Currency Benchmark** — UFL Credit Points (CP) pricing. The only competitor with purchasable soft currency in the dataset.
11. **Data Observations** — What the data suggests (not recommendations). Scope notes on power-to-cosmetic ratio gap.

---

## How To Use The CSV

### Import

Open `current_snapshot.csv` in Google Sheets or Excel. 315 rows, 18 columns.

### Key Columns

| Column | What It Means |
|---|---|
| `competitor` | Game title (12 unique values) |
| `tier` | Competitive tier (1 = direct football comp, 2 = relevant F2P, 3 = context only) |
| `platform` | `steam` (API data) or `multi` (community data, usually multi-platform) |
| `region` | Steam region code (us, gb, br, mx, fr, de, se, tr, pl, jp, sg, id) |
| `hc_amount` | How many currency units you get |
| `price_local` | Price in local currency |
| `currency_code` | Which currency (USD, GBP, EUR, BRL, etc.) |
| `price_usd` | Price converted to USD |
| `effective_usd_per_hc` | Cost per single currency unit in USD |
| `discount_vs_base` | Volume discount compared to the cheapest pack for that competitor/region |
| `confidence` | `primary` (Steam API, direct store) or `secondary` (community aggregation) |

### Useful Filters

- **"Show me EA FC 26 pricing across all regions":** Filter `competitor` = EA FC 26, `platform` = steam
- **"Compare entry tiers across all football games":** Filter `tier` = 1, `region` = us, sort by `price_usd` ascending
- **"What's the volume discount curve for each game?":** Filter `region` = us, pivot by `competitor`, look at `discount_vs_base` column
- **"Which regions are cheapest for EA FC?":** Filter `competitor` = EA FC 26, `hc_amount` = 500, sort by `price_usd`

### EA FC 25 Data

96 rows are EA FC 25 (previous year). These are included for year-on-year comparison, not as a current competitor. Filter them out (`competitor` != EA FC 25) if you only want current data.

---

## Re-Running The Pipeline

If you need to refresh data or add competitors:

```bash
cd Clients/Goals/competitive_research

# 1. Add/update raw data files in raw/steam_api/ or raw/community/
# 2. Update config/competitors.json if adding a new title

# 3. Normalise
node scripts/normalise.js

# 4. Verify
node scripts/verify.js

# 5. Export to output/
node scripts/output-export.js
```

### Adding A New Competitor

1. Add an entry to `config/competitors.json` with name, tier, publisher, platforms, monetisation_philosophy
2. Add raw data as a JSON file in `raw/community/` or `raw/steam_api/`
3. Community data files need a `*_purchase_tiers.tiers` array with `amount` and `price_usd` fields
4. Steam API data needs a `pricing` array with `price_in_cents`, `points_amount`, and `region` fields
5. Run the pipeline (normalise → verify → export)

### Updating FX Rates

The `FX_RATES` object in `scripts/normalise.js` contains hardcoded rates from 2026-04-21. If using this data months later, update the rates or note the staleness.

---

## Known Limitations

1. **Single-day snapshot** — All data captured 2026-04-21. Prices may have changed since.
2. **Community data is USD-only** — Non-EA competitors only have US pricing. Regional analysis is limited to EA titles + F1.
3. **Console-only games missing** — NHL 25 and MLB The Show 25 have no Steam DLC. Need PSPrices scraping for those.
4. **Soft currency not benchmarked** — UFL's CP packs ($0.99-$8.99) are documented in the raw data but not in the normalised output or analysis.
5. **3 citation URLs are dead** — Fortnite announcement (403), EA FIFA 23 pricing update (overwritten), Apex item store (403). All have backup citations.
6. **Longitudinal data relies on community sites** — fifauteam.com and fifplay.com, not EA's official archives.
