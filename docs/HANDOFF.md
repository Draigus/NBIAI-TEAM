# HANDOFF — Goals Competitive MTX Pipeline Complete + Red Team Needed

**Date:** 2026-04-21 ~05:15
**Session:** Brainstorm → Spec → Plan → Full execution of competitive MTX scraping pipeline
**Next session task:** Red team and critique the findings, cross-validate sources

---

## What Was Done This Session

### 1. Brainstormed Pipeline Architecture with Glen
- Iterated competitive set (started at 15, refined to 13 titles across 3 tiers)
- Glen challenged LoL inclusion (removed) and NBA 2K exclusion (added back — MyTEAM mode is valid)
- Added EA FC Mobile, Valorant, F1 as iterations
- Defined 4-table schema, longitudinal data requirement, verification methodology

### 2. Wrote and Committed Spec
`docs/superpowers/specs/2026-04-21-goals-competitive-mtx-scraping-pipeline.md`

### 3. Wrote and Committed Implementation Plan
`docs/superpowers/plans/2026-04-21-goals-competitive-mtx-scraping-pipeline.md`

### 4. Executed Pipeline (8 background agents dispatched in waves)

**Wave 1:**
- Steam API agent: EA FC 26 + FC 25 + UFL + eFootball
- Apify agent: FUT.gg, Fortnite.gg, ApexItemStore

**Wave 2:**
- Steam API Tier 2+3: Apex, NBA 2K, Madden, NHL, F1, MLB
- UFL deep dive (Reddit, official sources, community)
- Non-Steam F2P: Rocket League, Valorant, eFootball

**Wave 3:**
- Madden MUT Points + NBA 2K VC pricing
- EA FC Mobile (separate F2P product)
- SteamDB longitudinal (8 years of EA FC/FIFA pricing history + competitor price changes)

### 5. Built Infrastructure
- `scripts/steam-api-scraper.js` — queries Steam Store API for DLC pricing across all regions
- `scripts/normalise.js` — transforms raw data into unified 4-table schema
- `scripts/verify.js` — cross-reference checks, confidence assignment, gap flagging
- `scripts/output-export.js` — produces final deliverable files
- `config/competitors.json` — 13 titles with AppIDs, sources, tier assignments
- `config/regions.json` — 14 primary + 6 secondary + 25 extended Steam regions

### 6. Produced Findings Summary
`Clients/Goals/competitive_research/output/FINDINGS_SUMMARY.md` — analytical synthesis of all data

---

## Pipeline Final Status

| Metric | Value |
|---|---|
| Normalised rows | 365 |
| Competitors covered | 13 (+ EA FC 25 for YoY) |
| Citations indexed | 147 |
| Verification | PASS (0 critical) |
| Output files | 6 (ready for Google Sheets) |
| Scripts | 4 (all re-runnable) |

---

## What Needs Doing Next Session

### A. Red Team / Critique the Findings (Glen's directive)

Read `Clients/Goals/competitive_research/output/FINDINGS_SUMMARY.md` and critique:
- Are any conclusions overclaimed given the data quality?
- Are the "implications for Goals" actually supported by the evidence?
- Does the competitive set weighting make sense?
- Are there blind spots or biases in the analysis?
- Is the "preliminary recommendations" section overstepping the data?

### B. Cross-Validate Sources

For the highest-impact claims in the findings:
1. "EA has NEVER raised USD prices" — verify via SteamDB historical data in `raw/steamdb/pricing_history_ea_fc_longitudinal.json`
2. "UFL mirrors EA FC exactly" — verify via `raw/community/ufl_pricing_research_2026-04-21.json`
3. "Fortnite stealth price increase March 2026" — verify the specific numbers against community sources
4. "Madden identical to EA FC" — compare `raw/community/madden_mut_pricing_2026-04-21.json` against Steam API FC data

For each claim: check the raw source files, verify the citation URLs are real, confirm the numbers match.

### C. Remaining Data Gaps (Not Blocking But Would Strengthen)

- NHL 25 / MLB The Show: console-only (need PSPrices or manual PS Store browsing)
- Full regional pricing for community-sourced titles (only USD baseline for most)
- EA FC Mobile mid-tier exact prices (some interpolated)
- UFL full GBP/EUR per-tier pricing
- Madden regional pricing (community data is USD only)

---

## Key Findings (for quick reference)

1. **EA never raises USD prices** — restructures tiers and raises ceiling instead
2. **UFL deliberately benchmarked against EA FC** — identical tier structure at lower tiers
3. **Fortnite March 2026 stealth increase** — kept $ price, reduced V-Bucks quantities 20-25%
4. **EA cross-sport consistency** — FC, Madden, F1 all use near-identical pricing
5. **Volume discounts cluster 15-23%** — NBA 2K is the outlier at 86%
6. **Valorant ceiling** — competitive F2P players accept $25-75/skin (pure cosmetic)
7. **Industry-wide pattern** — nobody raises USD sticker price on currency packs

---

## File Locations

| What | Where |
|---|---|
| Design spec | `docs/superpowers/specs/2026-04-21-goals-competitive-mtx-scraping-pipeline.md` |
| Implementation plan | `docs/superpowers/plans/2026-04-21-goals-competitive-mtx-scraping-pipeline.md` |
| Findings summary | `Clients/Goals/competitive_research/output/FINDINGS_SUMMARY.md` |
| Config (competitors) | `Clients/Goals/competitive_research/config/competitors.json` |
| Config (regions) | `Clients/Goals/competitive_research/config/regions.json` |
| Scripts | `Clients/Goals/competitive_research/scripts/` |
| Raw Steam API data | `Clients/Goals/competitive_research/raw/steam_api/` (10 files) |
| Raw community data | `Clients/Goals/competitive_research/raw/community/` (10 files) |
| Raw longitudinal | `Clients/Goals/competitive_research/raw/steamdb/` (2 files) |
| Normalised output | `Clients/Goals/competitive_research/normalised/` |
| Final export | `Clients/Goals/competitive_research/output/` (7 files) |
| Goals existing data | `Clients/Goals/pricing_model_fresh.md` (their internal competitive comparison) |
| Goals pricing matrix | `Clients/Goals/goals_pricing_matrix.md` |

---

## Important Context for Next Session

- **Deadline:** 28 April 2026 (platform cert submission)
- **Client contact:** Jonas Rundberg (primary), Julius (Live Ops)
- **Budget:** 100K SEK (~$10K USD)
- **Goals' internal data in `pricing_model_fresh.md`** already has competitive HC pricing for 7 titles — NBI's job is to VALIDATE and EXTEND, not replace
- **Monetisation philosophy matters:** Goals is "Cosmetic + Gacha Power" (80/20 skill-to-purchased-advantage). Compare accordingly.
- **The "start high" philosophy is validated** by every competitor's behaviour
- **AppID corrections found:** EA FC 26 = 3405690 (not 2669320), UFL = 3023930 (not 1637320)
- **Console gaps (NHL, MLB) are expected** — flagged LOW severity, not blocking

---

## Parallel Workstream: Goals Plan Integrity Fix

There is ALSO a separate workstream fixing fabrications in the pricing plan document (`docs/superpowers/plans/2026-04-21-goals-studio-pricing-plan.md`). That work includes:
- Hour re-estimation (50h → 116h)
- Removing fabricated "NBI framework" references
- Updating WorkSage tasks via API
- 10 remaining task hour updates
- Rewriting execution timeline
- Filing 23 critical questions for Julius

This is tracked separately but uses the same client data.

---

## Git Log (This Session)

```
41bbcc2 docs(goals): competitive MTX findings summary for deliverable
67cae46 docs: update handoff with completed scraping pipeline status
8bf2d7e feat(goals): complete MTX pipeline — verification + output export
bc79264 data(goals): EA FC Mobile + longitudinal pricing history
712f6f0 data(goals): Madden MUT Points + NBA 2K VC pricing
9f82bb2 data(goals): 336 rows normalised across 10 competitors
507249a data(goals): Rocket League, Valorant, eFootball pricing data
00dc82e feat(goals): normalisation script + community pricing data
cf43e19 feat(goals): Steam API data + configs for MTX pipeline
d7b8fd7 feat(goals): regions config + handoff for MTX pipeline execution
7cd1979 docs: Goals MTX scraping pipeline implementation plan
dc4c33a docs: Goals competitive MTX scraping pipeline spec
```
