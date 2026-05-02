# Goals Competitive MTX Scraping Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, automated pipeline that scrapes MTX pricing data from 13 competitor titles, normalises it into a structured 4-table schema, verifies citations, and outputs to a Google Sheets workbook ready for the Goals Studio deliverable.

**Architecture:** Apify actors handle bulk web scraping (community sites, SteamDB, PSPrices). Steam Store API provides authoritative regional pricing. Node.js scripts normalise raw scraped data into the 4-table schema. Google Sheets is the output format. The pipeline is orchestrated via a master script that runs actors → collects → normalises → verifies → outputs.

**Tech Stack:** Apify (web scraping platform + actors), Node.js (normalisation/orchestration scripts), Steam Store API (public, no auth), Google Sheets API (output), jq/csvkit (data wrangling)

**Spec:** `docs/superpowers/specs/2026-04-21-goals-competitive-mtx-scraping-pipeline.md`

**Timeline:** 6 days (21-27 April 2026). Tier 1 current-state data by Day 3. Full dataset by Day 5. Verification + output by Day 6.

---

## File Structure

```
Clients/Goals/competitive_research/
├── config/
│   ├── competitors.json          # Master list: titles, AppIDs, URLs, tier assignments
│   ├── regions.json              # Region codes, currencies, platform mappings
│   └── sources.json              # Source URLs per competitor per data type
├── scripts/
│   ├── steam-api-scraper.js      # Steam Store API queries (regional pricing)
│   ├── normalise.js              # Raw data → 4-table schema transformer
│   ├── verify.js                 # Cross-reference checker, confidence assigner
│   ├── output-sheets.js          # Push normalised data to Google Sheets
│   └── orchestrate.js            # Master script: run all → collect → normalise → verify → output
├── raw/                          # Raw scraped data (JSON per source per run)
│   ├── steam_api/
│   ├── steamdb/
│   ├── psprices/
│   ├── community/
│   └── reddit/
├── normalised/                   # Normalised 4-table CSVs (intermediate output)
│   ├── current_snapshot.csv
│   ├── price_history.csv
│   ├── sales_calendar.csv
│   └── bundle_catalogue.csv
└── output/
    └── citations.csv             # Citation index
```

---

## Phase 1: Infrastructure & Configuration (Day 1)

### Task 1: Competitor Configuration

**Files:**
- Create: `Clients/Goals/competitive_research/config/competitors.json`

- [ ] **Step 1: Create config directory**

```bash
mkdir -p "Clients/Goals/competitive_research/config"
```

- [ ] **Step 2: Write competitors.json with all 13 titles**

```json
{
  "competitors": [
    {
      "name": "EA FC 26",
      "tier": 1,
      "publisher": "EA",
      "platforms": ["steam", "epic", "ps", "xbox"],
      "steam_appid": "2669320",
      "monetisation_philosophy": "gacha_power",
      "sources": {
        "steamdb": "https://steamdb.info/app/2669320/dlc/",
        "psprices": "https://psprices.com/region-us/game/ea-fc-26",
        "community": "https://www.fut.gg/",
        "official_blog": "https://www.ea.com/games/ea-sports-fc"
      },
      "subreddit": "r/EASportsFC",
      "notes": "Annual release. Historical AppIDs: FIFA 15=313340, 16=399640, 17=457570, 18=560130, 19=738720, 20=945360, 21=1089860, 22=1313860, 23=1811260, FC24=2195250, FC25=2409710"
    },
    {
      "name": "EA FC Mobile",
      "tier": 1,
      "publisher": "EA",
      "platforms": ["ios", "android"],
      "monetisation_philosophy": "gacha_power",
      "sources": {
        "community": "https://www.futbin.com/",
        "official_blog": "https://www.ea.com/games/ea-sports-fc/fc-mobile"
      },
      "subreddit": "r/FUTMobile",
      "notes": "Separate F2P product from console FC. Different economy and pricing."
    },
    {
      "name": "UFL",
      "tier": 1,
      "publisher": "Strikerz Inc",
      "platforms": ["steam", "ps", "xbox"],
      "steam_appid": "1637320",
      "monetisation_philosophy": "gacha_power",
      "sources": {
        "steamdb": "https://steamdb.info/app/1637320/dlc/",
        "official_blog": "https://www.ufl.com/news"
      },
      "subreddit": "r/UFL",
      "notes": "Direct F2P football competitor. Weak community tracking — manual gap-fill prioritised."
    },
    {
      "name": "eFootball",
      "tier": 1,
      "publisher": "Konami",
      "platforms": ["steam", "ps", "xbox", "ios", "android"],
      "steam_appid": "1665460",
      "monetisation_philosophy": "gacha_power",
      "sources": {
        "steamdb": "https://steamdb.info/app/1665460/dlc/",
        "official_blog": "https://www.konami.com/efootball/en/"
      },
      "subreddit": "r/eFootball",
      "notes": "F2P football. Has web companion for some store functions."
    },
    {
      "name": "NBA 2K26",
      "tier": 2,
      "publisher": "2K Games",
      "platforms": ["steam", "ps", "xbox"],
      "steam_appid": null,
      "monetisation_philosophy": "gacha_power",
      "sources": {
        "community": "https://2kdb.net/",
        "official_blog": "https://nba.2k.com/2k26"
      },
      "subreddit": "r/NBA2k",
      "notes": "MyTEAM mode is the relevant comparison (pack economy). Not MyPlayer VC-for-stats. AppID TBC (use 2K25 2316480 as proxy if 2K26 not yet listed)."
    },
    {
      "name": "Madden NFL 26",
      "tier": 2,
      "publisher": "EA",
      "platforms": ["steam", "ps", "xbox"],
      "steam_appid": null,
      "monetisation_philosophy": "gacha_power",
      "sources": {
        "steamdb": null,
        "community": "https://www.mut.gg/",
        "official_blog": "https://www.ea.com/games/madden-nfl"
      },
      "subreddit": "r/MaddenUltimateTeam",
      "notes": "MUT = same EA economy engine as FC. AppID TBC (use Madden 25=2666670 as proxy)."
    },
    {
      "name": "Fortnite",
      "tier": 2,
      "publisher": "Epic Games",
      "platforms": ["epic", "ps", "xbox"],
      "monetisation_philosophy": "pure_cosmetic",
      "sources": {
        "community": "https://fortnite.gg/shop",
        "official_blog": "https://www.fortnite.com/news"
      },
      "subreddit": "r/FortNiteBR",
      "notes": "Not on Steam. V-Bucks pricing from Epic Store + console stores. Jonas named as audience overlap."
    },
    {
      "name": "Apex Legends",
      "tier": 2,
      "publisher": "EA",
      "platforms": ["steam", "ps", "xbox"],
      "steam_appid": "1172470",
      "monetisation_philosophy": "pure_cosmetic",
      "sources": {
        "steamdb": "https://steamdb.info/app/1172470/dlc/",
        "community": "https://apexitemstore.com/",
        "official_blog": "https://www.ea.com/games/apex-legends/news"
      },
      "subreddit": "r/apexlegends",
      "notes": "Mature F2P cosmetic economy. Extensive community tracking."
    },
    {
      "name": "Rocket League",
      "tier": 2,
      "publisher": "Psyonix/Epic",
      "platforms": ["epic", "ps", "xbox"],
      "monetisation_philosophy": "pure_cosmetic",
      "sources": {
        "community": "https://rocket-league.com/items/shop",
        "official_blog": "https://www.rocketleague.com/news"
      },
      "subreddit": "r/RocketLeague",
      "notes": "Removed from Steam 2020. Credits pricing from Epic + console stores. Jonas named as comparable."
    },
    {
      "name": "Valorant",
      "tier": 2,
      "publisher": "Riot Games",
      "platforms": ["pc_riot"],
      "monetisation_philosophy": "pure_cosmetic",
      "sources": {
        "community": "https://valorantstore.net/",
        "official_blog": "https://playvalorant.com/en-us/news/"
      },
      "subreddit": "r/VALORANT",
      "notes": "Own launcher (no Steam/Epic). Known for aggressive cosmetic pricing ($25-75/skin). Ceiling reference."
    },
    {
      "name": "NHL 26",
      "tier": 3,
      "publisher": "EA",
      "platforms": ["steam", "ps", "xbox"],
      "steam_appid": null,
      "monetisation_philosophy": "gacha_power",
      "sources": {
        "official_blog": "https://www.ea.com/games/nhl"
      },
      "subreddit": "r/NHLHUT",
      "notes": "HUT = same EA economy engine. Validates cross-sport pricing. AppID TBC (use NHL 25 as proxy)."
    },
    {
      "name": "F1 24",
      "tier": 3,
      "publisher": "EA",
      "platforms": ["steam", "ps", "xbox"],
      "steam_appid": "2488620",
      "monetisation_philosophy": "pure_cosmetic",
      "sources": {
        "steamdb": "https://steamdb.info/app/2488620/dlc/"
      },
      "subreddit": "r/F1Game",
      "notes": "EA sports, Pitcoins currency. Third EA data point for pricing philosophy."
    },
    {
      "name": "MLB The Show",
      "tier": 3,
      "publisher": "Sony/San Diego Studio",
      "platforms": ["ps", "xbox", "steam"],
      "steam_appid": null,
      "monetisation_philosophy": "gacha_power",
      "sources": {
        "community": "https://theshow.com/",
        "official_blog": "https://theshow.com/news/"
      },
      "subreddit": "r/MLBTheShow",
      "notes": "Sony-published sports. Diamond Dynasty mode. Different publisher perspective."
    }
  ]
}
```

- [ ] **Step 3: Write regions.json**

```json
{
  "primary_markets": [
    {"code": "us", "currency": "USD", "steam_cc": "us", "ps_region": "en-us"},
    {"code": "mx", "currency": "MXN", "steam_cc": "mx", "ps_region": "es-mx"},
    {"code": "br", "currency": "BRL", "steam_cc": "br", "ps_region": "pt-br"},
    {"code": "gb", "currency": "GBP", "steam_cc": "gb", "ps_region": "en-gb"},
    {"code": "fr", "currency": "EUR", "steam_cc": "fr", "ps_region": "fr-fr"},
    {"code": "de", "currency": "EUR", "steam_cc": "de", "ps_region": "de-de"},
    {"code": "es", "currency": "EUR", "steam_cc": "es", "ps_region": "es-es"},
    {"code": "it", "currency": "EUR", "steam_cc": "it", "ps_region": "it-it"},
    {"code": "pt", "currency": "EUR", "steam_cc": "pt", "ps_region": "pt-pt"},
    {"code": "tr", "currency": "TRY", "steam_cc": "tr", "ps_region": "tr-tr"},
    {"code": "pl", "currency": "PLN", "steam_cc": "pl", "ps_region": "pl-pl"},
    {"code": "se", "currency": "SEK", "steam_cc": "se", "ps_region": "sv-se"},
    {"code": "no", "currency": "NOK", "steam_cc": "no", "ps_region": "no-no"},
    {"code": "dk", "currency": "DKK", "steam_cc": "dk", "ps_region": "da-dk"}
  ],
  "secondary_markets": [
    {"code": "jp", "currency": "JPY", "steam_cc": "jp", "ps_region": "ja-jp"},
    {"code": "kr", "currency": "KRW", "steam_cc": "kr", "ps_region": "ko-kr"},
    {"code": "cn", "currency": "CNY", "steam_cc": "cn", "ps_region": null},
    {"code": "sg", "currency": "SGD", "steam_cc": "sg", "ps_region": "en-sg"},
    {"code": "hk", "currency": "HKD", "steam_cc": "hk", "ps_region": "zh-hk"},
    {"code": "id", "currency": "IDR", "steam_cc": "id", "ps_region": "id-id"}
  ],
  "extended_steam_regions": [
    "ar", "au", "ca", "cl", "co", "cz", "hu", "il", "in", "kw", "my",
    "nz", "pe", "ph", "pk", "qa", "ro", "ru", "sa", "th", "tw", "ua",
    "ae", "vn", "za"
  ]
}
```

- [ ] **Step 4: Commit configuration**

```bash
git add Clients/Goals/competitive_research/config/
git commit -m "feat(goals): add competitor and region configuration for MTX pipeline"
```

---

### Task 2: Steam Store API Scraper

**Files:**
- Create: `Clients/Goals/competitive_research/scripts/steam-api-scraper.js`

- [ ] **Step 1: Create scripts directory and write the scraper**

```bash
mkdir -p "Clients/Goals/competitive_research/scripts"
```

```javascript
// steam-api-scraper.js
// Queries Steam Store API for DLC/add-on pricing across all configured regions
// Steam API is public, no auth needed. Rate limit: ~1 req/sec to be safe.

const fs = require('fs');
const path = require('path');

const competitors = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../config/competitors.json'), 'utf8'
)).competitors;

const regions = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../config/regions.json'), 'utf8'
));

const allRegions = [
  ...regions.primary_markets,
  ...regions.secondary_markets,
  ...regions.extended_steam_regions.map(code => ({ code, steam_cc: code }))
];

const OUTPUT_DIR = path.join(__dirname, '../raw/steam_api');
const DELAY_MS = 1100; // respect rate limits

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAppDetails(appId, cc) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=${cc}&filters=price_overview`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data[appId]?.success ? data[appId].data : null;
}

async function fetchDLCList(appId) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=dlc`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data[appId]?.data?.dlc || [];
}

async function scrapeTitle(competitor) {
  if (!competitor.steam_appid) {
    console.log(`SKIP: ${competitor.name} — no Steam AppID`);
    return;
  }

  console.log(`\nScraping: ${competitor.name} (AppID: ${competitor.steam_appid})`);

  // Get DLC list (currency packs are listed as DLC on Steam)
  const dlcIds = await fetchDLCList(competitor.steam_appid);
  console.log(`  Found ${dlcIds.length} DLC items`);

  const results = [];

  for (const dlcId of dlcIds) {
    // Get DLC name first (from any region)
    const baseInfo = await fetchAppDetails(dlcId, 'us');
    await sleep(DELAY_MS);
    if (!baseInfo) continue;

    const dlcName = baseInfo.name || `DLC_${dlcId}`;

    // Skip non-currency DLC (e.g., soundtrack, editions)
    // Heuristic: currency packs usually contain numbers or "points/coins/credits/currency"
    const isCurrencyPack = /\d|point|coin|credit|currency|pack|token|v-?buck|fc\s?point/i.test(dlcName);

    for (const region of allRegions) {
      const cc = region.steam_cc || region.code;
      const details = await fetchAppDetails(dlcId, cc);
      await sleep(DELAY_MS);

      if (details?.price_overview) {
        results.push({
          competitor: competitor.name,
          platform: 'steam',
          region: cc,
          currency: details.price_overview.currency,
          dlc_id: dlcId,
          dlc_name: dlcName,
          is_currency_pack: isCurrencyPack,
          price_initial: details.price_overview.initial,
          price_final: details.price_overview.final,
          discount_percent: details.price_overview.discount_percent,
          price_formatted: details.price_overview.final_formatted,
          capture_date: new Date().toISOString().split('T')[0],
          source_url: `https://store.steampowered.com/app/${dlcId}/?cc=${cc}`
        });
      }
    }

    console.log(`  ${dlcName}: ${results.filter(r => r.dlc_id === dlcId).length} regional prices captured`);
  }

  // Write output
  const outputPath = path.join(OUTPUT_DIR, `${competitor.steam_appid}_${competitor.name.replace(/\s+/g, '_')}.json`);
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`  Written: ${outputPath} (${results.length} rows)`);
}

async function main() {
  const steamTitles = competitors.filter(c => c.steam_appid);
  console.log(`Steam API scraper: ${steamTitles.length} titles to process`);
  console.log(`Regions: ${allRegions.length} per title`);

  for (const title of steamTitles) {
    await scrapeTitle(title);
  }

  console.log('\nDone.');
}

main().catch(console.error);
```

- [ ] **Step 2: Test with a single title/region to verify API works**

```bash
cd "Clients/Goals/competitive_research"
node -e "
  fetch('https://store.steampowered.com/api/appdetails?appids=1172470&cc=us&filters=dlc')
    .then(r => r.json())
    .then(d => console.log('Apex DLC count:', d['1172470'].data.dlc.length))
    .catch(console.error)
"
```

Expected: prints the number of Apex Legends DLC items (should be 50+)

- [ ] **Step 3: Commit**

```bash
git add Clients/Goals/competitive_research/scripts/steam-api-scraper.js
git commit -m "feat(goals): Steam Store API scraper for regional HC pricing"
```

---

### Task 3: Apify Actor Configurations

**Files:**
- Create: `Clients/Goals/competitive_research/config/apify-actors.json`

This task documents the Apify actor configurations needed. Each actor is configured and run via the Apify platform (MCP tools or web console).

- [ ] **Step 1: Document actor configurations**

```json
{
  "actors": [
    {
      "id": "steamdb_price_history",
      "purpose": "Scrape SteamDB price history pages for longitudinal data",
      "actor": "apify/web-scraper",
      "targets": "SteamDB DLC price history pages (one per DLC AppID)",
      "url_pattern": "https://steamdb.info/app/{dlc_id}/pricelist/",
      "extract": ["date", "region", "price", "currency", "change_type"],
      "notes": "SteamDB may require proxy. Respect robots.txt. Rate limit to 1 req/2sec.",
      "priority": "HIGH — provides longitudinal data for all Steam titles"
    },
    {
      "id": "psprices_history",
      "purpose": "Scrape PSPrices game pages for console price history + sale events",
      "actor": "apify/web-scraper",
      "targets": "PSPrices game pages (history tab)",
      "url_pattern": "https://psprices.com/region-{region}/game/{slug}/history",
      "extract": ["date", "price", "currency", "discount_pct", "ps_plus_price"],
      "notes": "PSPrices has good coverage of US/EU. Weaker in APAC.",
      "priority": "HIGH — console price history"
    },
    {
      "id": "isthereanydeal",
      "purpose": "Scrape IsThereAnyDeal for PC sale history",
      "actor": "apify/web-scraper",
      "targets": "ITAD game pages (DLC section)",
      "url_pattern": "https://isthereanydeal.com/game/{slug}/info/",
      "extract": ["store", "date", "price", "discount_pct", "historical_low"],
      "notes": "Covers Steam, Epic, and other PC stores. Good for sale calendar.",
      "priority": "MEDIUM — supplements SteamDB for sale events"
    },
    {
      "id": "fortnite_gg",
      "purpose": "Scrape Fortnite.gg for full item shop history",
      "actor": "apify/web-scraper",
      "targets": "Fortnite.gg shop history pages",
      "url_pattern": "https://fortnite.gg/shop",
      "extract": ["item_name", "rarity", "price_vbucks", "type", "first_seen", "last_seen", "appearances"],
      "notes": "Excellent coverage. Full rotation history available.",
      "priority": "HIGH — Tier 2, Jonas named audience overlap"
    },
    {
      "id": "apex_item_store",
      "purpose": "Scrape ApexItemStore for shop rotation and pricing",
      "actor": "apify/web-scraper",
      "targets": "ApexItemStore.com pages",
      "url_pattern": "https://apexitemstore.com/",
      "extract": ["item_name", "rarity", "price_coins", "type", "bundle_contents", "date"],
      "notes": "Good community tracker. Updates daily.",
      "priority": "HIGH — Tier 2, mature economy"
    },
    {
      "id": "fut_gg",
      "purpose": "Scrape FUT.gg for EA FC store data, pack prices",
      "actor": "apify/web-scraper",
      "targets": "FUT.gg packs and store pages",
      "url_pattern": "https://www.fut.gg/packs/",
      "extract": ["pack_name", "price_fc_points", "price_coins", "contents", "odds", "available_dates"],
      "notes": "Primary EA FC community tracker for pack pricing.",
      "priority": "HIGH — Tier 1"
    },
    {
      "id": "reddit_scraper",
      "purpose": "Scrape subreddits for pricing discussions, sale announcements, store screenshots",
      "actor": "apify/reddit-scraper",
      "targets": "Configured subreddits per competitor",
      "search_terms": ["pricing", "store", "MTX", "currency", "sale", "discount", "pack prices", "bundle", "how much", "worth it"],
      "extract": ["title", "body", "url", "date", "subreddit", "score", "comments"],
      "notes": "Filter by score > 10 to reduce noise. Date-stamp everything.",
      "priority": "MEDIUM — gap-fill and citation source"
    },
    {
      "id": "valorant_store",
      "purpose": "Scrape Valorant store trackers for skin pricing",
      "actor": "apify/web-scraper",
      "targets": "valorantstore.net or equivalent",
      "url_pattern": "https://valorantstore.net/",
      "extract": ["item_name", "type", "price_vp", "bundle_name", "bundle_price"],
      "notes": "Valorant has no regional HC variance (global pricing). Item pricing is the value.",
      "priority": "MEDIUM — Tier 2, ceiling reference"
    }
  ]
}
```

- [ ] **Step 2: Commit**

```bash
git add Clients/Goals/competitive_research/config/apify-actors.json
git commit -m "feat(goals): Apify actor configurations for MTX scraping pipeline"
```

---

### Task 4: Data Normalisation Script

**Files:**
- Create: `Clients/Goals/competitive_research/scripts/normalise.js`

- [ ] **Step 1: Write normalisation script**

```javascript
// normalise.js
// Transforms raw scraped data from various sources into the 4-table schema.
// Input: JSON files in raw/ directories
// Output: CSV files in normalised/ directory

const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(__dirname, '../raw');
const OUTPUT_DIR = path.join(__dirname, '../normalised');

// USD exchange rates (update before each run)
const FX_RATES = {
  USD: 1, GBP: 1.34, EUR: 1.17, SEK: 0.11, NOK: 0.10, DKK: 0.16,
  BRL: 0.18, MXN: 0.06, JPY: 0.0069, KRW: 0.00075, CNY: 0.14,
  TRY: 0.031, PLN: 0.26, SGD: 0.75, HKD: 0.13, IDR: 0.000063,
  CAD: 0.74, AUD: 0.66, NZD: 0.61, ARS: 0.0011, CLP: 0.0011,
  COP: 0.00024, CZK: 0.045, HUF: 0.0028, ILS: 0.28, INR: 0.012,
  MYR: 0.22, PEN: 0.27, PHP: 0.018, PKR: 0.0036, QAR: 0.27,
  RON: 0.24, RUB: 0.011, SAR: 0.27, THB: 0.029, TWD: 0.031,
  UAH: 0.024, AED: 0.27, VND: 0.000040, ZAR: 0.055, KWD: 3.26
};

function toUSD(amount, currency) {
  const rate = FX_RATES[currency];
  if (!rate) {
    console.warn(`Unknown currency: ${currency}`);
    return null;
  }
  return parseFloat((amount * rate).toFixed(4));
}

function normaliseSteamApiData() {
  const steamDir = path.join(RAW_DIR, 'steam_api');
  if (!fs.existsSync(steamDir)) return [];

  const rows = [];
  const files = fs.readdirSync(steamDir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(steamDir, file), 'utf8'));
    for (const item of data) {
      if (!item.is_currency_pack) continue; // only currency packs for Table 1

      const priceLocal = item.price_final / 100; // Steam prices are in cents
      const priceUSD = toUSD(priceLocal, item.currency);

      rows.push({
        competitor: item.competitor,
        tier: null, // filled from config lookup
        platform: 'steam',
        region: item.region,
        sku_type: 'hc_pack',
        sku_name: item.dlc_name,
        hc_amount: extractHCAmount(item.dlc_name),
        bonus_amount: 0,
        bonus_pct: 0,
        price_local: priceLocal,
        currency_code: item.currency,
        price_usd: priceUSD,
        effective_usd_per_hc: null, // calculated after hc_amount extraction
        discount_vs_base: null, // calculated across tiers
        monetisation_philosophy: null, // from config
        source_url: item.source_url,
        capture_date: item.capture_date,
        confidence: 'primary'
      });
    }
  }

  return rows;
}

function extractHCAmount(name) {
  // Extract numeric HC amount from DLC names like "1000 FC Points" or "2800 V-Bucks"
  const match = name.match(/(\d[\d,]*)\s*(fc\s?points?|v-?bucks?|coins?|credits?|apex\s?coins?|points?|vc|pitcoins?)/i);
  if (match) return parseInt(match[1].replace(/,/g, ''));

  // Fallback: first number in name
  const numMatch = name.match(/(\d[\d,]+)/);
  return numMatch ? parseInt(numMatch[1].replace(/,/g, '')) : null;
}

function calculateDerivedFields(rows) {
  // Group by competitor + region, calculate effective $/HC and discount vs base
  const groups = {};
  for (const row of rows) {
    const key = `${row.competitor}|${row.region}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  for (const [key, group] of Object.entries(groups)) {
    // Sort by price ascending
    group.sort((a, b) => (a.price_usd || 0) - (b.price_usd || 0));

    const baseRate = group[0]?.hc_amount && group[0]?.price_usd
      ? group[0].price_usd / group[0].hc_amount
      : null;

    for (const row of group) {
      if (row.hc_amount && row.price_usd) {
        row.effective_usd_per_hc = parseFloat((row.price_usd / row.hc_amount).toFixed(6));
        if (baseRate) {
          row.discount_vs_base = parseFloat((1 - (row.effective_usd_per_hc / baseRate)).toFixed(4));
        }
      }
    }
  }

  return rows;
}

function writeCSV(rows, filename) {
  if (rows.length === 0) return;
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(','))
  ].join('\n');

  fs.writeFileSync(path.join(OUTPUT_DIR, filename), csv);
  console.log(`Written: ${filename} (${rows.length} rows)`);
}

async function main() {
  console.log('Normalising raw data into 4-table schema...\n');

  // Table 1: Current Snapshot
  const steamRows = normaliseSteamApiData();
  // TODO: Add community data normalisation as raw data arrives
  const allCurrentRows = calculateDerivedFields(steamRows);
  writeCSV(allCurrentRows, 'current_snapshot.csv');

  console.log('\nNormalisation complete.');
}

main().catch(console.error);
```

- [ ] **Step 2: Commit**

```bash
git add Clients/Goals/competitive_research/scripts/normalise.js
git commit -m "feat(goals): data normalisation script for 4-table schema"
```

---

## Phase 2: Tier 1 Data Collection (Days 1-3)

### Task 5: Execute Steam API Scrape — Tier 1 Titles

- [ ] **Step 1: Run Steam API scraper for Tier 1 titles only (EA FC, UFL, eFootball)**

```bash
cd "Clients/Goals/competitive_research"
node scripts/steam-api-scraper.js --tier 1
```

Note: This will take several hours due to rate limiting (1 req/sec × number of DLC × ~40 regions). Run in background.

- [ ] **Step 2: Verify output files exist and contain data**

```bash
ls -la raw/steam_api/
cat raw/steam_api/2669320_EA_FC_26.json | jq 'length'
```

- [ ] **Step 3: Run normalisation on collected data**

```bash
node scripts/normalise.js
cat normalised/current_snapshot.csv | head -20
```

- [ ] **Step 4: Commit raw data**

```bash
git add raw/steam_api/ normalised/
git commit -m "data(goals): Tier 1 Steam API pricing data captured"
```

---

### Task 6: Run Apify Actors — Tier 1 Community Sources

- [ ] **Step 1: Run FUT.gg scraper for EA FC pack/item pricing**

Use Apify MCP tool: `call-actor` with web-scraper configured for FUT.gg packs page. Extract pack names, FC Points prices, contents, availability.

- [ ] **Step 2: Run Reddit scraper for UFL and eFootball pricing discussions**

Use Apify MCP tool: `call-actor` with reddit-scraper targeting r/UFL and r/eFootball with search terms: "price", "store", "coins", "currency pack", "MTX", "how much".

- [ ] **Step 3: Scrape eFootball official site for current store offerings**

Use Apify MCP tool: web-scraper configured for Konami eFootball store pages.

- [ ] **Step 4: Store raw outputs**

```bash
mkdir -p raw/community
# Save Apify dataset outputs to raw/community/{source}_{date}.json
git add raw/community/
git commit -m "data(goals): Tier 1 community source data (FUT.gg, Reddit, eFootball)"
```

---

### Task 7: SteamDB Price History — Tier 1

- [ ] **Step 1: Run SteamDB price history scraper for EA FC 26 DLC**

Use Apify web-scraper targeting `https://steamdb.info/app/{dlc_id}/pricelist/` for each EA FC 26 DLC item identified in Task 5.

- [ ] **Step 2: Run SteamDB history for UFL and eFootball DLC**

Same approach for AppIDs 1637320 (UFL) and 1665460 (eFootball).

- [ ] **Step 3: Run SteamDB history for historical EA FC AppIDs**

Scrape DLC price history for FIFA 20 (945360), FIFA 21 (1089860), FIFA 22 (1313860), FIFA 23 (1811260), FC 24 (2195250), FC 25 (2409710) to build the longitudinal EA football pricing curve.

- [ ] **Step 4: Store and commit**

```bash
mkdir -p raw/steamdb
# Save outputs to raw/steamdb/
git add raw/steamdb/
git commit -m "data(goals): SteamDB price history — Tier 1 + historical EA FC"
```

---

## Phase 3: Tier 2 + Tier 3 Data Collection (Days 3-5)

### Task 8: Execute Steam API Scrape — Tier 2 & 3 Titles

- [ ] **Step 1: Run Steam API scraper for remaining titles with Steam AppIDs**

Apex (1172470), F1 24 (2488620), plus proxy AppIDs for NBA 2K25 (2316480), Madden 25 (2666670).

- [ ] **Step 2: Verify and normalise**

```bash
node scripts/normalise.js
wc -l normalised/current_snapshot.csv
```

- [ ] **Step 3: Commit**

```bash
git add raw/steam_api/ normalised/
git commit -m "data(goals): Tier 2+3 Steam API pricing data"
```

---

### Task 9: Apify Actors — Tier 2 Community Sources

- [ ] **Step 1: Fortnite.gg shop history scrape**
- [ ] **Step 2: ApexItemStore scrape**
- [ ] **Step 3: Rocket League Insider / RL item shop scrape**
- [ ] **Step 4: Valorant store tracker scrape**
- [ ] **Step 5: 2KDB (NBA 2K MyTEAM) scrape**
- [ ] **Step 6: MUT.gg (Madden) scrape**

Each uses Apify web-scraper with site-specific configuration from `apify-actors.json`.

- [ ] **Step 7: Store and commit all community data**

```bash
git add raw/community/
git commit -m "data(goals): Tier 2 community source data"
```

---

### Task 10: PSPrices + IsThereAnyDeal — Console History + Sales Calendar

- [ ] **Step 1: Run PSPrices scraper for all Tier 1 + 2 titles**

Extract: price history, sale events with dates, PS Plus discounts.

- [ ] **Step 2: Run IsThereAnyDeal scraper for PC sale history**

Extract: historical low prices, sale dates, store-specific discounts.

- [ ] **Step 3: Normalise into Table 2 (Price History) and Table 3 (Sales Calendar)**

```bash
node scripts/normalise.js --tables history,sales
```

- [ ] **Step 4: Commit**

```bash
git add raw/psprices/ raw/itad/ normalised/
git commit -m "data(goals): console price history + sales calendar data"
```

---

## Phase 4: Manual Gap-Fill + Verification (Days 5-6)

### Task 11: UFL Manual Data Capture

UFL has weak community tracking. This requires direct research.

- [ ] **Step 1: Document UFL store structure from official Discord + Reddit**

Search r/UFL for posts showing store screenshots, currency pack pricing, bundle offerings. Save permalink URLs as citations.

- [ ] **Step 2: Cross-reference with Steam API data already captured**

Verify UFL DLC pricing from Steam matches what the community reports as in-game pricing.

- [ ] **Step 3: Fill bundle catalogue (Table 4) for UFL from patch notes + official site**

Scrape https://www.ufl.com/news for store/economy announcements.

- [ ] **Step 4: Commit UFL gap-fill data**

```bash
git add raw/manual/
git commit -m "data(goals): UFL manual gap-fill — store structure and bundle data"
```

---

### Task 12: Verification Pass

**Files:**
- Create: `Clients/Goals/competitive_research/scripts/verify.js`

- [ ] **Step 1: Write verification script**

```javascript
// verify.js
// Cross-references data points between sources, assigns confidence, flags gaps

const fs = require('fs');
const path = require('path');

const NORMALISED_DIR = path.join(__dirname, '../normalised');

function loadCSV(filename) {
  const content = fs.readFileSync(path.join(NORMALISED_DIR, filename), 'utf8');
  const lines = content.split('\n');
  const headers = lines[0].split(',');
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(','); // simplified — production version needs proper CSV parsing
    const row = {};
    headers.forEach((h, i) => row[h] = values[i]);
    return row;
  });
}

function verifyCurrentSnapshot() {
  const rows = loadCSV('current_snapshot.csv');
  const issues = [];

  // Check 1: Every Tier 1 competitor has data
  const tier1Names = ['EA FC 26', 'EA FC Mobile', 'UFL', 'eFootball'];
  for (const name of tier1Names) {
    const has = rows.some(r => r.competitor === name);
    if (!has) issues.push({ severity: 'CRITICAL', message: `Missing Tier 1 competitor: ${name}` });
  }

  // Check 2: Primary markets covered for Tier 1
  const primaryRegions = ['us', 'gb', 'br', 'mx', 'fr', 'de', 'jp'];
  for (const name of tier1Names) {
    const regions = new Set(rows.filter(r => r.competitor === name).map(r => r.region));
    for (const region of primaryRegions) {
      if (!regions.has(region)) {
        issues.push({ severity: 'HIGH', message: `${name} missing region: ${region}` });
      }
    }
  }

  // Check 3: Confidence levels assigned
  const noConfidence = rows.filter(r => !r.confidence);
  if (noConfidence.length > 0) {
    issues.push({ severity: 'MEDIUM', message: `${noConfidence.length} rows missing confidence level` });
  }

  // Check 4: Source URLs present
  const noSource = rows.filter(r => !r.source_url);
  if (noSource.length > 0) {
    issues.push({ severity: 'HIGH', message: `${noSource.length} rows missing source_url (citation)` });
  }

  // Check 5: Price sanity (no $0, no > $500 for a single HC pack)
  const badPrices = rows.filter(r => {
    const usd = parseFloat(r.price_usd);
    return usd <= 0 || usd > 500;
  });
  if (badPrices.length > 0) {
    issues.push({ severity: 'HIGH', message: `${badPrices.length} rows with suspicious prices (<=0 or >$500)` });
  }

  return issues;
}

function main() {
  console.log('Running verification pass...\n');

  const issues = verifyCurrentSnapshot();

  if (issues.length === 0) {
    console.log('✓ All checks passed');
  } else {
    console.log(`Found ${issues.length} issues:\n`);
    for (const issue of issues) {
      console.log(`  [${issue.severity}] ${issue.message}`);
    }
  }

  // Write issues report
  fs.writeFileSync(
    path.join(NORMALISED_DIR, 'verification_report.json'),
    JSON.stringify({ run_date: new Date().toISOString(), issues }, null, 2)
  );
}

main();
```

- [ ] **Step 2: Run verification**

```bash
node scripts/verify.js
```

- [ ] **Step 3: Address all CRITICAL and HIGH issues from the report**

- [ ] **Step 4: Commit**

```bash
git add scripts/verify.js normalised/verification_report.json
git commit -m "feat(goals): verification script + initial verification pass"
```

---

## Phase 5: Output Assembly (Days 6-7)

### Task 13: Google Sheets Output

**Files:**
- Create: `Clients/Goals/competitive_research/scripts/output-sheets.js`

- [ ] **Step 1: Create Google Sheets template manually**

Create a Google Sheets workbook with 6 tabs:
1. Summary Dashboard
2. Current Snapshot
3. Price History
4. Sales Calendar
5. Bundle Catalogue
6. Citations

- [ ] **Step 2: Write output script (or manually populate from CSVs)**

For the deliverable timeline, manually importing the normalised CSVs into Google Sheets may be faster than building a Sheets API integration. The script approach is for re-runnability.

```javascript
// output-sheets.js
// Pushes normalised CSV data to Google Sheets via API
// Requires: GOOGLE_SHEETS_API_KEY env var, sheet ID

const fs = require('fs');
const path = require('path');

// For initial delivery: export CSVs and import to Sheets manually
// For re-runnability: implement Sheets API push here

function exportForManualImport() {
  const NORMALISED_DIR = path.join(__dirname, '../normalised');
  const OUTPUT_DIR = path.join(__dirname, '../output');
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = ['current_snapshot.csv', 'price_history.csv', 'sales_calendar.csv', 'bundle_catalogue.csv'];

  for (const file of files) {
    const src = path.join(NORMALISED_DIR, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(OUTPUT_DIR, file));
      console.log(`Exported: ${file}`);
    }
  }

  console.log(`\nCSVs ready for Google Sheets import in: ${OUTPUT_DIR}/`);
}

exportForManualImport();
```

- [ ] **Step 3: Run export**

```bash
node scripts/output-sheets.js
```

- [ ] **Step 4: Import CSVs into Google Sheets (manual step)**

- [ ] **Step 5: Build Summary Dashboard tab**

Pre-calculated comparisons:
- Goals' 7 HC SKUs vs market median at each tier
- Goals' discount curve vs competitor average
- Regional multiplier comparison per country
- "Are we too low?" indicator per SKU

- [ ] **Step 6: Commit output scripts**

```bash
git add scripts/output-sheets.js
git commit -m "feat(goals): Google Sheets output export script"
```

---

### Task 14: Final Freshness Audit + Deliverable Check

- [ ] **Step 1: Re-run verification script**

```bash
node scripts/verify.js
```

All CRITICAL/HIGH issues must be resolved.

- [ ] **Step 2: Check data freshness**

Every data point in the deliverable must be captured within 7 days of submission date (27 April). Any AMBER/RED freshness items need re-scraping.

- [ ] **Step 3: Verify citation URLs are still accessible**

Spot-check 20% of source URLs to confirm they still resolve.

- [ ] **Step 4: Final commit**

```bash
git add normalised/ output/
git commit -m "data(goals): final verified dataset for deliverable"
```

---

## Parallel Execution Map

Tasks that can run simultaneously:

```
Day 1:  [Task 1] + [Task 2] + [Task 3] + [Task 4] — all config/setup, independent
Day 1-3: [Task 5 Steam API Tier 1] || [Task 6 Community Tier 1] || [Task 7 SteamDB History]
Day 3-5: [Task 8 Steam API Tier 2+3] || [Task 9 Community Tier 2] || [Task 10 PSPrices/ITAD]
Day 5-6: [Task 11 UFL Gap-Fill] → [Task 12 Verification]
Day 6-7: [Task 13 Output] → [Task 14 Final Audit]
```

Tasks 5, 6, and 7 are fully independent and should run in parallel.
Tasks 8, 9, and 10 are fully independent and should run in parallel.
Task 12 depends on all prior data tasks completing.
Task 14 depends on Task 13.

---

## Risk Mitigations During Execution

| Risk | If it happens | Fallback |
|---|---|---|
| SteamDB blocks scraping | Rate limit hit or IP blocked | Use cached Wayback Machine snapshots of SteamDB pages |
| Steam API rate limiting | Scraper takes too long | Prioritise primary markets only, extend to full regions in re-run |
| Community site structure changes | Scraper breaks mid-run | Fix selector, re-run. Raw data from partial run is still usable |
| UFL has almost no online price data | Manual gap-fill insufficient | Direct game capture (screenshots) as primary source |
| Apify actor quota exceeded | Too many runs | Prioritise Tier 1, defer Tier 3 community sources |
| Google Sheets too large | 100K+ rows | Split into multiple workbooks per tier, link with summary |

---

## Definition of Done

- [ ] All 4 Tier 1 competitors have complete current snapshot data (all regions, all SKUs)
- [ ] All 6 Tier 2 competitors have HC pack + key item pricing (primary + secondary markets)
- [ ] All 3 Tier 3 competitors have HC pack baseline (USD)
- [ ] Price history (Table 2) populated for all Steam titles + EA FC longitudinal curve
- [ ] Sales calendar (Table 3) populated from PSPrices + ITAD
- [ ] Bundle catalogue (Table 4) populated for Tier 1 titles minimum
- [ ] Every row has a source_url and confidence level
- [ ] Verification script passes with zero CRITICAL issues
- [ ] Google Sheets workbook populated and summary dashboard built
- [ ] Pipeline scripts committed and re-runnable
