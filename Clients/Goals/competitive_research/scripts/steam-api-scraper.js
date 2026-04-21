const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, '../config');
const OUTPUT_DIR = path.join(__dirname, '../raw/steam_api');

const competitors = JSON.parse(
  fs.readFileSync(path.join(CONFIG_DIR, 'competitors.json'), 'utf8')
).competitors;

const regionsConfig = JSON.parse(
  fs.readFileSync(path.join(CONFIG_DIR, 'regions.json'), 'utf8')
);

const allRegions = [
  ...regionsConfig.primary_markets.map(r => r.steam_cc),
  ...regionsConfig.secondary_markets.map(r => r.steam_cc),
  ...regionsConfig.extended_steam_regions
];

const DELAY_MS = 1200;
const TIER_FILTER = process.argv.includes('--tier')
  ? parseInt(process.argv[process.argv.indexOf('--tier') + 1])
  : null;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(`  Fetch error: ${url} — ${e.message}`);
    return null;
  }
}

async function getDLCList(appId) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${appId}`;
  const data = await fetchJSON(url);
  if (!data || !data[appId]?.success) return [];
  return data[appId].data?.dlc || [];
}

async function getDLCPrice(dlcId, cc) {
  const url = `https://store.steampowered.com/api/appdetails?appids=${dlcId}&cc=${cc}`;
  const data = await fetchJSON(url);
  if (!data || !data[dlcId]?.success) return null;
  return data[dlcId].data;
}

function isCurrencyPack(name) {
  return /\d[\d,]*\s*(fc\s?point|v.?buck|coin|credit|apex\s?coin|point|vc|pitcoin|token|gem|diamond|stubs)/i.test(name)
    || /pack.*\d|bundle.*\d|\d.*pack|\d.*bundle/i.test(name);
}

async function scrapeTitle(competitor) {
  if (!competitor.steam_appid) {
    console.log(`SKIP: ${competitor.name} — no Steam AppID`);
    return { competitor: competitor.name, skipped: true, reason: 'no_appid' };
  }

  console.log(`\n=== ${competitor.name} (AppID: ${competitor.steam_appid}, Tier ${competitor.tier}) ===`);

  const dlcIds = await getDLCList(competitor.steam_appid);
  await sleep(DELAY_MS);
  console.log(`  Found ${dlcIds.length} DLC items`);

  if (dlcIds.length === 0) {
    console.log(`  WARNING: No DLC found. Game may use in-app purchases not listed as DLC.`);
    return { competitor: competitor.name, dlc_count: 0, results: [] };
  }

  const results = [];

  for (const dlcId of dlcIds) {
    const baseInfo = await getDLCPrice(dlcId, 'us');
    await sleep(DELAY_MS);
    if (!baseInfo) continue;

    const dlcName = baseInfo.name || `DLC_${dlcId}`;
    const currencyPack = isCurrencyPack(dlcName);

    console.log(`  ${dlcName} ${currencyPack ? '[CURRENCY]' : '[OTHER]'}`);

    for (const cc of allRegions) {
      const details = await getDLCPrice(dlcId, cc);
      await sleep(DELAY_MS);

      if (details?.price_overview) {
        results.push({
          competitor: competitor.name,
          tier: competitor.tier,
          platform: 'steam',
          region: cc,
          currency: details.price_overview.currency,
          dlc_id: dlcId,
          dlc_name: dlcName,
          is_currency_pack: currencyPack,
          price_cents: details.price_overview.final,
          price_local: details.price_overview.final / 100,
          price_formatted: details.price_overview.final_formatted,
          discount_percent: details.price_overview.discount_percent,
          capture_date: new Date().toISOString().split('T')[0],
          source_url: `https://store.steampowered.com/app/${dlcId}/?cc=${cc}`,
          confidence: 'primary'
        });
      }
    }

    const regionCount = results.filter(r => r.dlc_id === dlcId).length;
    console.log(`    → ${regionCount} regional prices captured`);
  }

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const filename = `${competitor.steam_appid}_${competitor.name.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
  const outputPath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log(`  Written: ${filename} (${results.length} total rows)`);

  return { competitor: competitor.name, dlc_count: dlcIds.length, results_count: results.length };
}

async function main() {
  let titles = competitors.filter(c => c.steam_appid);
  if (TIER_FILTER) {
    titles = titles.filter(c => c.tier === TIER_FILTER);
    console.log(`Filtering to Tier ${TIER_FILTER} only`);
  }

  console.log(`Steam API Scraper`);
  console.log(`Titles: ${titles.length}`);
  console.log(`Regions per title: ${allRegions.length}`);
  console.log(`Estimated time: ${Math.ceil(titles.length * 10 * allRegions.length * DELAY_MS / 60000)} minutes (varies by DLC count)\n`);

  const summary = [];
  for (const title of titles) {
    const result = await scrapeTitle(title);
    summary.push(result);
  }

  console.log('\n=== SUMMARY ===');
  for (const s of summary) {
    if (s.skipped) {
      console.log(`  ${s.competitor}: SKIPPED (${s.reason})`);
    } else {
      console.log(`  ${s.competitor}: ${s.dlc_count} DLC, ${s.results_count} price points captured`);
    }
  }
}

main().catch(console.error);
