const fs = require('fs');
const path = require('path');

const RAW_DIR = path.join(__dirname, '../raw');
const OUTPUT_DIR = path.join(__dirname, '../normalised');
const CONFIG_DIR = path.join(__dirname, '../config');

const competitors = JSON.parse(
  fs.readFileSync(path.join(CONFIG_DIR, 'competitors.json'), 'utf8')
).competitors;

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

const REGION_CURRENCY = {
  us: 'USD', gb: 'GBP', br: 'BRL', mx: 'MXN', fr: 'EUR', de: 'EUR',
  se: 'EUR', tr: 'USD', pl: 'EUR', jp: 'JPY', kr: 'KRW', sg: 'SGD',
  id: 'IDR', ca: 'CAD', au: 'AUD', nz: 'NZD', ru: 'RUB', cn: 'CNY',
  hk: 'HKD', tw: 'TWD', th: 'THB', ph: 'PHP', my: 'MYR', in: 'INR',
  ar: 'ARS', cl: 'CLP', co: 'COP', pe: 'PEN', za: 'ZAR', ae: 'AED',
  sa: 'SAR', il: 'ILS', ua: 'UAH', cz: 'CZK', hu: 'HUF', ro: 'RON',
  dk: 'DKK', no: 'NOK', vn: 'VND', kw: 'KWD', pk: 'PKR', qa: 'QAR'
};

const NAME_CANON = {
  'EA SPORTS FC 26': 'EA FC 26',
  'EA SPORTS FC 25': 'EA FC 25',
  'NBA 2K25 (2K Games)': 'NBA 2K25'
};

function toUSD(amount, currency) {
  if (currency === 'USD') return amount;
  const rate = FX_RATES[currency];
  if (!rate) return null;
  return parseFloat((amount * rate).toFixed(4));
}

function getCompetitorConfig(name) {
  return competitors.find(c =>
    c.name.toLowerCase() === name.toLowerCase() ||
    name.toLowerCase().includes(c.name.toLowerCase().replace(/\s+\d+$/, ''))
  );
}

function normaliseSteamAPI() {
  const dir = path.join(RAW_DIR, 'steam_api');
  if (!fs.existsSync(dir)) return [];

  const rows = [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const pricing = raw.pricing || raw;
    if (!Array.isArray(pricing)) continue;

    for (const item of pricing) {
      if (!item.price_in_cents && item.price_in_cents !== 0) continue;
      if (!item.points_amount) continue;

      const rawName = item.competitor || raw.metadata?.game || '';
      const canonName = NAME_CANON[rawName] || rawName;
      const config = getCompetitorConfig(canonName);
      const priceLocal = item.price_in_cents / 100;
      const currency = item.currency || REGION_CURRENCY[item.region] || null;
      const priceUSD = toUSD(priceLocal, currency);
      const hcAmount = item.points_amount || null;

      rows.push({
        competitor: canonName,
        tier: config?.tier || null,
        platform: 'steam',
        region: item.region,
        sku_type: 'hc_pack',
        sku_name: item.dlc_name || item.dlc_full_name,
        hc_amount: hcAmount,
        bonus_amount: 0,
        bonus_pct: 0,
        price_local: priceLocal,
        currency_code: currency,
        price_usd: priceUSD,
        effective_usd_per_hc: hcAmount && priceUSD ? parseFloat((priceUSD / hcAmount).toFixed(6)) : null,
        discount_vs_base: null,
        monetisation_philosophy: config?.monetisation_philosophy || null,
        source_url: item.source_url,
        capture_date: item.capture_date,
        confidence: 'primary'
      });
    }
  }

  return rows;
}

function normaliseCommunityData() {
  const dir = path.join(RAW_DIR, 'community');
  if (!fs.existsSync(dir)) return [];

  const rows = [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));

  const KNOWN_TIER_KEYS = [
    'apex_coins_purchase_tiers', 'v_bucks_purchase_tiers', 'fc_points_purchase_tiers',
    'credits_purchase_tiers', 'vp_purchase_tiers', 'coins_purchase_tiers',
    'lp_purchase_tiers', 'cp_purchase_tiers', 'purchase_tiers',
    'currency_packs', 'premium_currency_packs'
  ];

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    const competitor = raw.competitor;
    const config = getCompetitorConfig(competitor || '');
    const sourceUrl = raw.urls_cited?.[0] || '';
    const captureDate = raw.scraped_date;
    const canonCompetitor = NAME_CANON[competitor] || competitor;

    const tierKeys = KNOWN_TIER_KEYS.filter(k => raw[k]?.tiers && Array.isArray(raw[k].tiers));

    for (const currencyKey of tierKeys) {
      const tiers = raw[currencyKey].tiers;
      const currencyName = currencyKey.replace('_purchase_tiers', '').replace('_packs', '');

      const hasSteamPrimary = ['EA FC 26', 'EA FC 25', 'NBA 2K25'].includes(canonCompetitor);
      if (hasSteamPrimary && currencyName.includes('fc_points')) continue;

      const isSoftCurrency = currencyName === 'cp' || currencyName.includes('credit_points');
      const skuType = isSoftCurrency ? 'sc_pack' : 'hc_pack';

      for (const tier of tiers) {
        const coins = tier.coins || tier.amount || tier.points || tier.vbucks
          || tier.fc_points || tier.lp_amount || tier.cp_amount || tier.v_bucks
          || tier.credits || tier.vp || 0;
        const priceUSD = tier.price_usd || tier.price || 0;
        const bonus = tier.bonus_coins || tier.bonus || 0;

        rows.push({
          competitor: canonCompetitor,
          tier: config?.tier || raw.tier || null,
          platform: 'multi',
          region: 'us',
          sku_type: skuType,
          sku_name: `${coins} ${currencyName.replace(/_/g, ' ')}`,
          hc_amount: coins,
          bonus_amount: bonus,
          bonus_pct: bonus && coins ? parseFloat(((bonus / (coins - bonus)) * 100).toFixed(1)) : 0,
          price_local: priceUSD,
          currency_code: 'USD',
          price_usd: priceUSD,
          effective_usd_per_hc: coins && priceUSD ? parseFloat((priceUSD / coins).toFixed(6)) : null,
          discount_vs_base: null,
          monetisation_philosophy: config?.monetisation_philosophy || raw.monetisation_philosophy || null,
          source_url: sourceUrl,
          capture_date: captureDate,
          confidence: 'secondary'
        });
      }
    }
  }

  return rows;
}

function calculateDiscountVsBase(rows) {
  const groups = {};
  for (const row of rows) {
    const key = `${row.competitor}|${row.platform}|${row.region}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  for (const group of Object.values(groups)) {
    group.sort((a, b) => (a.price_usd || 999) - (b.price_usd || 999));
    const baseRate = group[0]?.effective_usd_per_hc;
    if (!baseRate) continue;

    for (const row of group) {
      if (row.effective_usd_per_hc && baseRate) {
        row.discount_vs_base = parseFloat((1 - (row.effective_usd_per_hc / baseRate)).toFixed(4));
      }
    }
  }
}

function toCSV(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map(h => {
      const v = row[h];
      if (v === null || v === undefined) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(','));
  }
  return lines.join('\n');
}

function main() {
  console.log('=== Normalisation Pipeline ===\n');

  const steamRows = normaliseSteamAPI();
  console.log(`Steam API: ${steamRows.length} rows`);

  const communityRows = normaliseCommunityData();
  console.log(`Community: ${communityRows.length} rows`);

  const allRows = [...steamRows, ...communityRows];
  calculateDiscountVsBase(allRows);
  console.log(`Total: ${allRows.length} rows\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const csv = toCSV(allRows);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'current_snapshot.csv'), csv);
  console.log(`Written: current_snapshot.csv (${allRows.length} rows)`);

  // Summary by competitor
  const summary = {};
  for (const row of allRows) {
    if (!summary[row.competitor]) summary[row.competitor] = { rows: 0, regions: new Set() };
    summary[row.competitor].rows++;
    summary[row.competitor].regions.add(row.region);
  }

  console.log('\n=== Per-Competitor Summary ===');
  for (const [name, data] of Object.entries(summary)) {
    console.log(`  ${name}: ${data.rows} rows, ${data.regions.size} regions`);
  }
}

main();
