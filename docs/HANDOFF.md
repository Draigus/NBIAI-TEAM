# Handoff: Goals Competitive MTX Scraping Pipeline

**Date:** 2026-04-21
**Session:** Brainstorming → Spec → Plan → Execution started
**Context:** Glen Pryer working on Goals Studio SOW #1 (100K SEK, due 28 April 2026)

---

## What Was Done This Session

1. **Brainstormed** the competitive research pipeline architecture with Glen
2. **Wrote and committed spec:** `docs/superpowers/specs/2026-04-21-goals-competitive-mtx-scraping-pipeline.md`
3. **Wrote and committed plan:** `docs/superpowers/plans/2026-04-21-goals-competitive-mtx-scraping-pipeline.md`
4. **Created directory structure:** `Clients/Goals/competitive_research/` with config/, scripts/, raw/, normalised/, output/
5. **Wrote regions.json config** — 14 primary markets, 6 secondary, 25 extended Steam regions
6. **Dispatched 2 background agents:**
   - Steam API agent: querying EA FC 26 (AppID 2669320), UFL (1637320), eFootball (1665460) DLC pricing across 13 regions
   - Apify agent: scraping FUT.gg, Fortnite.gg, ApexItemStore for item/pack pricing data

---

## Key Decisions Made

- **13 titles across 3 tiers** (not the original 15 — removed LoL, OW2, The Finals; added EA FC Mobile, NBA 2K, Valorant, F1, Madden, NHL, MLB)
- **NBA 2K IS included** (MyTEAM mode, not MyPlayer VC-for-stats). Glen challenged the initial exclusion.
- **League of Legends removed** — wrong genre/audience for football game comparison
- **Longitudinal data required** — price history from launch, bundle timelines, sales calendars
- **4-table schema:** Current Snapshot, Price History, Sales Calendar, Bundle Catalogue + Citation Index
- **3-layer scraping:** Apify actors (bulk), Steam API (authoritative regional), Manual gap-fill (UFL/eFootball)
- **All regions if feasible**, fall back to key markets (14 primary + 6 secondary)
- **Verification:** two-source corroboration, confidence levels (primary/secondary/community/manual)
- **Reusable tool** — not one-shot, not fully scheduled. Re-runnable on demand.

---

## What Needs To Happen Next

### Immediate (check agent results)

- [ ] Check Steam API agent output in `Clients/Goals/competitive_research/raw/steam_api/`
- [ ] Check Apify agent output — what data was collected, what gaps remain
- [ ] Write `competitors.json` config (full version from the plan — Task 1 Step 2)

### Phase 2: Continue Data Collection (Days 2-3)

- [ ] Run Steam API scraper for Tier 2 titles (Apex 1172470, F1 2488620, NBA 2K proxy 2316480, Madden proxy 2666670)
- [ ] Run Apify actors for: Rocket League Insider, Valorant store tracker, 2KDB, MUT.gg
- [ ] Run SteamDB price history scraper for longitudinal data (all Steam titles)
- [ ] Run PSPrices scraper for console price history
- [ ] Run IsThereAnyDeal for PC sale history
- [ ] EA FC Mobile — needs iOS/Android store research (different from Steam)

### Phase 3: UFL Manual Gap-Fill

UFL has weak community tracking. Needs:
- Reddit r/UFL mining for store screenshots and pricing posts
- Official Discord monitoring
- Direct game capture if needed
- This is HIGH PRIORITY — UFL is Tier 1

### Phase 4: Normalisation + Verification (Days 5-6)

- [ ] Write and run normalise.js on all collected data
- [ ] Write and run verify.js — resolve all CRITICAL/HIGH issues
- [ ] Cross-reference community data against platform API data
- [ ] Two-source corroboration check

### Phase 5: Output (Days 6-7)

- [ ] Populate Google Sheets workbook (6 tabs)
- [ ] Build summary dashboard with pre-calculated comparisons
- [ ] Final freshness audit (all data < 7 days old)

---

## File Locations

| What | Where |
|---|---|
| Design spec | `docs/superpowers/specs/2026-04-21-goals-competitive-mtx-scraping-pipeline.md` |
| Implementation plan | `docs/superpowers/plans/2026-04-21-goals-competitive-mtx-scraping-pipeline.md` |
| Config | `Clients/Goals/competitive_research/config/` |
| Scripts | `Clients/Goals/competitive_research/scripts/` |
| Raw scraped data | `Clients/Goals/competitive_research/raw/` |
| Normalised output | `Clients/Goals/competitive_research/normalised/` |
| Final export | `Clients/Goals/competitive_research/output/` |
| Goals existing pricing data | `Clients/Goals/pricing_model_fresh.md` |
| Goals monetisation design | `Clients/Goals/gg-monetization.md` |
| Goals pricing matrix | `Clients/Goals/goals_pricing_matrix.md` |

---

## Important Context

- **Deadline:** 28 April 2026 (platform certification submission deadline drives this)
- **Client contact:** Jonas Rundberg (primary), Julius (Live Ops)
- **Goals' existing competitive data** in `pricing_model_fresh.md` covers: EA FC, Fortnite, Apex, LoL, eFootball, The Finals, OW2 — NBI's job is to VALIDATE and EXTEND, not recreate
- **Monetisation philosophy tags matter:** Goals is "Cosmetic + Gacha Power" (player packs give gameplay-relevant players). Compare appropriately.
- **EA FC Mobile is separate from EA FC 26** — different economy, different pricing, different product
- **UFL is the closest direct competitor** — prioritise gap-fill even if manual
- **Sales calendar note:** Many F2P games NEVER discount HC (Fortnite V-Bucks never officially discounted). This is itself valuable data.
- **EA FC annual reset:** Build longitudinal curve across FIFA 20→FC 26 using historical AppIDs (945360, 1089860, 1313860, 1811260, 2195250, 2409710, 2669320)

---

## Git State

- Branch: master
- Last commits:
  - `7cd1979` — implementation plan
  - `dc4c33a` — design spec
- Uncommitted: regions.json config file, directory structure
- Background agents still running (Steam API + Apify scraping)
