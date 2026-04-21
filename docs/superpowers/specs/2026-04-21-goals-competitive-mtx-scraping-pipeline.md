# Goals Competitive MTX Research Pipeline — Design Spec

**Client:** Goals Studio (GOALS AB)
**Purpose:** Automated competitive research pipeline for in-app MTX pricing benchmarking
**Created:** 2026-04-21
**Status:** Approved design, pending implementation plan

---

## Context

Goals Studio is launching a F2P football game (14 May 2026, Steam/Epic/Xbox/PlayStation). NBI is contracted (SOW #1, 100K SEK) to validate their HC pricing against competitive benchmarks. This spec defines the automated pipeline that gathers, structures, and verifies competitive MTX data at scale with full citations.

The pipeline serves two purposes:
1. **Immediate:** Feed the contracted pricing deliverable (due ~28 April 2026)
2. **Ongoing:** Reusable tool for future re-runs (World Cup June 2026, new SKU launches, future client engagements)

---

## Competitive Set (13 Titles, 3 Tiers)

### Tier 1 — Deep Analysis (full data capture, all regions, full MTX catalogue, longitudinal)

| Title | Publisher | Platforms | Rationale |
|---|---|---|---|
| EA FC 26 | EA | Steam, Epic, PS, Xbox | Industry anchor. Every football gamer knows FC Points pricing. |
| EA FC Mobile | EA | iOS, Android | EA's F2P football pricing model. Direct answer to "how does the biggest competitor price a free football game?" |
| UFL | Strikerz Inc | Steam, PS, Xbox | Direct F2P football competitor, same non-P2W positioning, launched 2024. Closest comp to Goals. |
| eFootball | Konami | Steam, PS, Xbox, Mobile | F2P football, closest existing business model to Goals. |

### Tier 2 — Model Comparison (HC packs + item pricing, key regions)

| Title | Publisher | Platforms | Rationale |
|---|---|---|---|
| NBA 2K26 | 2K Games | Steam, PS, Xbox | MyTEAM = same pack-lottery economy. Sports gamers cross-shop. Shows what sports audiences accept. |
| Madden NFL 26 | EA | Steam, PS, Xbox | MUT runs the same EA economy engine as FC. Validates cross-sport pricing consistency. |
| Fortnite | Epic | All | Jonas explicitly named audience overlap. Cosmetic pricing reference already internalised by Goals' audience. |
| Apex Legends | EA | Steam, PS, Xbox | Mature F2P cosmetic economy with extensive community tracking and pricing history. |
| Rocket League | Psyonix/Epic | Steam, Epic, PS, Xbox | Jonas explicitly named as comparable. Same "competitive skill game with cosmetic monetisation" positioning. |
| Valorant | Riot | PC (own launcher) | Aggressive cosmetic pricing ceiling. Shows what competitive F2P players will pay for premium cosmetics ($25-75/skin). |

### Tier 3 — Context (HC packs only, USD + key regions)

| Title | Publisher | Platforms | Rationale |
|---|---|---|---|
| NHL 26 | EA | Steam, PS, Xbox | EA ecosystem — validates cross-sport pricing consistency. |
| F1 24/25 | EA | Steam, PS, Xbox | EA sports, Pitcoins currency. Third data point for EA pricing philosophy. |
| MLB The Show | Sony | PS, Xbox, Steam | Sony-published sports game. Different publisher, different pricing approach — useful contrast. |

### Removed (with reasoning)

- **League of Legends** — wrong genre (MOBA), wrong audience, minimal cross-shop with football gamers
- **WWE 2K** — immature economy, small player base, not where sports gamers set pricing expectations
- **Top Eleven** — football manager (not action), mobile-only, energy/time-skip model. Different purchasing psychology
- **Overwatch 2** — declining game, controversial pricing, weak reference for a 2026 launch
- **The Finals** — UFL already shows "new entrant" pricing in the actual genre. Adds noise without signal
- **NBA 2K (MyPlayer VC model)** — Note: NBA 2K IS included, but analysis focuses on MyTEAM mode (pack economy), not MyPlayer (direct stat purchase which is a fundamentally different value proposition)

### Weighting in Final Analysis

- Tier 1 findings **drive** recommendations (these are what Goals' players will directly compare against)
- Tier 2 findings **validate or challenge** Tier 1 conclusions
- Tier 3 provides **boundary context** (range, trends, patterns)

---

## Data Points Captured Per Competitor

### Core Data (all tiers)

1. **HC/VC pack pricing ladder** — number of SKUs, price per tier, HC amount per tier
2. **Effective $/HC at each tier** — discount/bonus progression curve
3. **Regional pricing** — local currency prices across target regions (see Regional Coverage below)

### Extended Data (Tier 1 + Tier 2)

4. **Item category pricing in HC** — what does a skin/kit cost? An emote/celebration? A player pack?
5. **Bundle structures** — how items are grouped, bundle discount vs individual purchase
6. **Starter/first-purchase offers** — price, value multiplier over standard, timing of offer
7. **Limited-time offer (LTO) pricing** — tracked separately from permanent store (LTOs typically 20-40% better value)
8. **Platform-specific pricing variance** — same item, different price on PS vs Steam vs Xbox

### Longitudinal Data (Tier 1 primarily, Tier 2 where available)

9. **Price change history** — every HC pack price change from launch to present, with dates
10. **Bundle/offer release timelines** — when each bundle type was introduced, pricing at introduction vs current
11. **Sales calendar** — when HC packs or bundles are discounted, frequency, discount %, seasonal triggers
12. **SKU evolution** — when new currency pack tiers were added or removed

### Metadata (all data points)

- `source_url` — direct link to where the data was obtained
- `capture_date` — when the data was scraped/verified
- `confidence` — primary / secondary / community / manual (see Verification section)
- `monetisation_philosophy` tag — Pure Cosmetic / Cosmetic + Gacha Power / Direct Power Purchase

---

## Regional Coverage

**Target: All regions each platform supports.** Fall back to key markets if full coverage is infeasible for specific titles.

**Key markets (from Goals spec):**
- **Primary:** US, Mexico, Brazil, UK, France, Germany, Spain, Italy, Portugal, Turkey, Poland, Sweden, Norway, Denmark
- **Secondary:** Japan, Korea, China, Singapore, Hong Kong, Indonesia
- **Additional (full coverage):** All ~40 Steam regions, all PS Store regions accessible via web, all Xbox Store regions

**Platform-specific regional access:**
- Steam: ~40 currencies accessible via API (`cc` parameter) — full coverage achievable
- PS Store: Web-accessible for many regions (store.playstation.com/en-{region}) — good coverage
- Xbox: Web store has regional variants — moderate coverage
- Epic: Limited regional pricing visibility — key markets only

---

## Data Schema (4 Tables + Citation Index)

### Table 1: Current Snapshot

One row per SKU per region per platform.

| Column | Type | Description |
|---|---|---|
| competitor | string | Game title |
| tier | int | Research tier (1/2/3) |
| platform | string | Steam / PS / Xbox / Epic / iOS / Android |
| region | string | Country/region code |
| sku_type | string | hc_pack / item / bundle / starter_pack / lto |
| sku_name | string | Name of the SKU |
| hc_amount | int | Amount of HC in pack (for hc_pack type) |
| bonus_amount | int | Bonus HC included (if any) |
| bonus_pct | float | Bonus percentage over base |
| price_local | float | Price in local currency |
| currency_code | string | Local currency ISO code |
| price_usd | float | Converted USD price |
| effective_usd_per_hc | float | USD / HC unit at this tier |
| discount_vs_base | float | Discount vs lowest tier (0 = base) |
| monetisation_philosophy | string | pure_cosmetic / gacha_power / direct_power |
| source_url | string | Citation URL |
| capture_date | date | When captured |
| confidence | string | primary / secondary / community / manual |

### Table 2: Price History

One row per price change event.

| Column | Type | Description |
|---|---|---|
| competitor | string | Game title |
| platform | string | Platform |
| region | string | Region |
| sku_name | string | SKU that changed |
| old_price_local | float | Previous price |
| new_price_local | float | New price |
| old_price_usd | float | Previous USD equivalent |
| new_price_usd | float | New USD equivalent |
| change_date | date | When the change occurred |
| change_type | string | launch / increase / decrease / new_sku / discontinued |
| source_url | string | Citation |
| notes | string | Context (e.g., "regional adjustment across all EUR markets") |

### Table 3: Sales & Events Calendar

One row per discount/sale event.

| Column | Type | Description |
|---|---|---|
| competitor | string | Game title |
| event_name | string | Name of sale/event |
| start_date | date | Sale start |
| end_date | date | Sale end |
| discount_pct | float | Discount percentage |
| skus_affected | string | Which SKUs were discounted |
| trigger | string | seasonal / anniversary / sporting_event / platform_sale / other |
| recurrence | string | annual / one-off / irregular |
| source_url | string | Citation |
| notes | string | Additional context |

### Table 4: Bundle/Offer Catalogue

One row per offer type (not per individual rotation instance).

| Column | Type | Description |
|---|---|---|
| competitor | string | Game title |
| offer_name | string | Bundle/offer name or category |
| offer_type | string | permanent / limited_time / rotating / seasonal / starter |
| introduced_date | date | When first available |
| contents | string | What's included |
| price_hc | int | Price in hard currency |
| price_usd_equivalent | float | USD value based on best HC rate |
| rotation_frequency | string | How often it appears (daily/weekly/biweekly/event-based) |
| availability_window | string | How long available per appearance |
| value_vs_individual | float | Discount vs buying contents individually |
| source_url | string | Citation |

### Table 5: Citation Index

Master reference linking every data point to its source.

| Column | Type | Description |
|---|---|---|
| citation_id | string | Unique reference ID |
| source_url | string | Direct URL |
| source_type | string | platform_api / platform_store_page / steamdb / psprices / community_tracker / wiki / reddit / youtube / official_blog / patch_notes / manual_capture |
| capture_date | date | When accessed |
| capture_method | string | apify_actor / api_call / browser_automation / manual |
| still_accessible | bool | URL still resolves (checked on final verification pass) |
| notes | string | Context about the source |

---

## Scraping Architecture

### Layer 1: Apify Actors (Automated Bulk)

High-volume structured sources. Each actor is a saved, re-runnable configuration.

| Actor/Approach | Target | Output |
|---|---|---|
| Web Scraper (configured per site) | SteamDB price history pages (per AppID/DLC) | Price change timeline per SKU per region |
| Web Scraper for PSPrices | PSPrices.com game pages (history tab) | Console price history + sale events |
| Web Scraper for IsThereAnyDeal | ITAD game pages | PC sale history, historical lows |
| Web Scraper for community aggregators | Fortnite.gg, ApexItemStore, FUT.gg, Rocket League Insider | Item catalogues, rotation history, bundle data |
| Reddit Scraper | Subreddits per competitor, keyword-filtered (pricing, store, MTX, currency, sale) | Dated posts about pricing changes and sales |
| Web Scraper for official blogs | EA.com, Konami, Strikerz, Epic, Riot blogs/patch notes | Bundle announcements, pricing change notices |
| Web Scraper for Wayback Machine | Historical snapshots of store pages | Point-in-time pricing data for longitudinal gaps |

### Layer 2: Platform Store Direct (Current State)

Authoritative sources for today's pricing.

| Target | Method | Coverage |
|---|---|---|
| Steam Store API | Direct API calls (`store.steampowered.com/api/appdetails?appid=X&cc=Y`) | Current pricing, all ~40 regions |
| PS Store web pages | Web scraper with region switching | Current pricing per accessible region |
| Xbox Store pages | Web scraper (xbox.com/games/store) | Current pricing, limited regional access |
| Epic Games Store | Web scraper | Current pricing, limited regional data |
| Valorant store (Riot) | Community tracker + official patch notes | Item pricing (no regional HC variance — single global price) |

### Layer 3: Manual Verification + Gap-Fill

For the 10-15% that resists automation.

| Gap Type | Method | Priority |
|---|---|---|
| UFL store (weak community tracking) | Direct game capture + official Discord monitoring | HIGH — Tier 1 comp |
| eFootball web companion pricing | Browser automation against web store | HIGH — Tier 1 comp |
| In-game-only pricing (no web exposure) | YouTube video timestamp citations + Reddit screenshot posts | MEDIUM |
| Console-only regional gaps | VPN + store browsing where web access fails | MEDIUM |
| Sales calendar confirmation | Cross-reference PSPrices/ITAD against official announcements | LOW (automated mostly covers this) |

### Execution Flow

```
Step 1: Configure Apify actors (one-time setup, reusable)
    ↓
Step 2: Run Layer 1 — bulk scrape all community/history sources
    ↓
Step 3: Run Layer 2 — current-state platform store sweep (all regions)
    ↓
Step 4: Normalise all outputs into 4-table schema
    ↓
Step 5: Verification pass — cross-reference community data against platform data
    ↓
Step 6: Flag gaps (missing regions, missing titles, low-confidence entries)
    ↓
Step 7: Layer 3 — manual fill for flagged gaps (prioritised by tier)
    ↓
Step 8: Final output — structured spreadsheet + citation index
    ↓
Step 9: Summary dashboard — key comparisons pre-calculated for deliverable
```

### EA FC Annual Reset Handling

EA FC is unique — a new game annually (FIFA 15 → FC 26). Each has its own Steam AppID. To build the longitudinal pricing curve for EA's football economy:
- Scrape DLC/pricing history for each annual release separately (SteamDB has all historical AppIDs)
- Stitch together into a unified timeline showing how EA has evolved FC Points pricing over 10+ years
- This is a deliberate one-time research task, automated via SteamDB scraping of each historical AppID

---

## Verification Methodology

### Confidence Levels

| Level | Definition | When assigned |
|---|---|---|
| `primary` | Data from platform store API/page, SteamDB (which reads Steam directly), or official publisher source | Platform API responses, official blog posts, SteamDB price history |
| `secondary` | Established community tracker with consistent update history | Fortnite.gg, FUT.gg, ApexItemStore, PSPrices, IsThereAnyDeal |
| `community` | Reddit post, forum thread, YouTube video, wiki edit | Dated community posts, video timestamps showing prices |
| `manual` | Direct in-game capture by NBI team | Screenshots, game sessions for UFL/eFootball gaps |

### Verification Rules

1. **Two-source corroboration required** for any data point used in final recommendations
2. **Primary + anything = high confidence.** Primary alone = high confidence (platform stores are authoritative)
3. **Secondary + secondary = medium-high confidence.** Two independent trackers agreeing
4. **Community alone = medium confidence.** Flagged, usable for context but not as sole basis for a recommendation
5. **Any data point older than 30 days** gets re-verification flag before inclusion in deliverable
6. **Contradicting sources** get escalated — investigate which is current, log the discrepancy

### Data Freshness Indicators

| Indicator | Meaning |
|---|---|
| GREEN | Captured/verified within 7 days of deliverable date |
| AMBER | Captured 7-30 days before deliverable, not re-verified |
| RED | Captured 30+ days before deliverable — must re-verify or exclude |

---

## Output Format

### Primary Deliverable

Google Sheets workbook with 6 tabs:
1. **Summary Dashboard** — key comparisons pre-calculated (Goals vs market median per tier, regional multipliers, discount curve comparison)
2. **Current Snapshot** (Table 1)
3. **Price History** (Table 2)
4. **Sales Calendar** (Table 3)
5. **Bundle Catalogue** (Table 4)
6. **Citations** (Table 5)

### Backup/Audit Trail

- Raw JSON datasets in Apify storage (preserved per run)
- Screenshot archive for manual captures (dated, filed per competitor)
- Actor configuration exports (for re-running)

### Summary Dashboard Pre-Calculations

- Goals' 7 HC SKUs vs market median at each tier
- Goals' discount curve vs competitor average discount curves
- Regional multiplier comparison (Goals' proposed vs competitor actual per country)
- "Are we too low?" indicator per SKU with supporting evidence
- LTO value comparison (what competitors offer in limited-time vs permanent pricing)

---

## Re-Runnability

The pipeline is designed to be re-executed:

- **Apify actors:** Saved configurations. Click "run" to re-execute with same parameters
- **Master orchestration script:** Runs all actors → collects outputs → normalises → verifies → flags gaps
- **Re-run time (automated portion):** Minutes for data collection, ~1 hour for full normalisation
- **Re-run triggers:** Before World Cup (June 2026), before Goals adds new SKUs, before next client engagement, quarterly refresh

---

## Constraints and Risks

| Risk | Impact | Mitigation |
|---|---|---|
| SteamDB rate limiting | Slows price history scraping | Batch requests, respect rate limits, cache results |
| PS Store regional access blocks | Missing console regional data | VPN fallback, PSPrices as secondary source |
| Community trackers go stale | Missing data for smaller titles | Layer 3 manual fill, flag confidence accordingly |
| EA FC annual reset complexity | Longitudinal stitching work | Dedicated one-time task, automated via AppID list |
| UFL weak community tracking | Gaps in closest competitor | Prioritise manual capture — this is Tier 1, gaps unacceptable |
| Price data decay | Numbers wrong by deliverable date | 7-day freshness requirement for final deliverable, re-verify pass before submission |
| Valorant no regional HC variance | Less useful for regional analysis | Still valuable for item pricing ceiling reference |
| Console platforms block VPN | Can't access all regional stores | Use web-accessible regions, supplement with community data |

---

## Scope Boundaries

**In scope:**
- HC/VC currency pack pricing (all tiers, all regions)
- In-game item pricing (what HC buys)
- Bundle structures and pricing
- Limited-time offer pricing (tracked separately from permanent)
- Longitudinal price history
- Sales calendars and discount patterns
- Regional pricing variations
- Platform-specific pricing differences
- Full citation trail for every data point

**Out of scope:**
- Player behaviour/conversion analysis (requires telemetry access NBI doesn't have for competitors)
- Revenue estimates per competitor (Sensor Tower/data.ai territory)
- Store UX/layout analysis (Julius handling internally)
- Economy simulation/modelling (separate workstream if needed)
- Mobile app store pricing for non-mobile titles (only relevant for EA FC Mobile and eFootball mobile)

---

## Success Criteria

1. Every Tier 1 competitor has full data across all 4 tables with GREEN freshness for the deliverable
2. Every Tier 2 competitor has HC pack + item pricing across key markets with at minimum AMBER freshness
3. Every Tier 3 competitor has HC pack baseline in USD with citation
4. Zero data points in the final deliverable with only community-level confidence and no corroboration
5. The pipeline can be re-run by NBI without rebuilding from scratch
6. Jonas can trace any number in the final report back to a specific, accessible source URL
