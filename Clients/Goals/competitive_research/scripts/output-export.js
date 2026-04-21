const fs = require('fs');
const path = require('path');

const NORMALISED_DIR = path.join(__dirname, '../normalised');
const RAW_DIR = path.join(__dirname, '../raw');
const OUTPUT_DIR = path.join(__dirname, '../output');

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Copy normalised CSVs to output
const csvFiles = ['current_snapshot.csv'];
for (const f of csvFiles) {
  const src = path.join(NORMALISED_DIR, f);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(OUTPUT_DIR, f));
    console.log(`Exported: ${f}`);
  }
}

// Build citation index from all raw data
const citations = [];
let citationId = 1;

function extractCitations(dir, sourceType) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));

    // Community files have urls_cited arrays
    if (raw.urls_cited) {
      for (const url of raw.urls_cited) {
        citations.push({
          citation_id: `C${String(citationId++).padStart(4, '0')}`,
          source_url: url,
          source_type: sourceType,
          capture_date: raw.scraped_date || raw.capture_date || '2026-04-21',
          capture_method: raw.scrape_method || 'web_search_aggregation',
          source_file: file,
          competitor: raw.competitor || raw.metadata?.game || 'unknown'
        });
      }
    }

    // Steam API files have source_url per entry
    if (raw.pricing && Array.isArray(raw.pricing)) {
      const urls = [...new Set(raw.pricing.map(p => p.source_url).filter(Boolean))];
      for (const url of urls.slice(0, 5)) { // limit to avoid explosion
        citations.push({
          citation_id: `C${String(citationId++).padStart(4, '0')}`,
          source_url: url,
          source_type: 'platform_api',
          capture_date: raw.metadata?.capture_date || '2026-04-21',
          capture_method: 'steam_api',
          source_file: file,
          competitor: raw.metadata?.game || 'unknown'
        });
      }
    }
  }
}

extractCitations(path.join(RAW_DIR, 'community'), 'community_tracker');
extractCitations(path.join(RAW_DIR, 'steam_api'), 'platform_api');
extractCitations(path.join(RAW_DIR, 'steamdb'), 'steamdb');

// Write citations CSV
const citHeaders = Object.keys(citations[0] || {});
const citCSV = [
  citHeaders.join(','),
  ...citations.map(c => citHeaders.map(h => {
    const v = String(c[h] || '');
    return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
  }).join(','))
].join('\n');

fs.writeFileSync(path.join(OUTPUT_DIR, 'citations.csv'), citCSV);
console.log(`Exported: citations.csv (${citations.length} citations)`);

// Copy verification report
const vReport = path.join(NORMALISED_DIR, 'verification_report.json');
if (fs.existsSync(vReport)) {
  fs.copyFileSync(vReport, path.join(OUTPUT_DIR, 'verification_report.json'));
  console.log('Exported: verification_report.json');
}

// Copy longitudinal data
const longFile = path.join(RAW_DIR, 'steamdb/pricing_history_ea_fc_longitudinal.json');
if (fs.existsSync(longFile)) {
  fs.copyFileSync(longFile, path.join(OUTPUT_DIR, 'ea_fc_pricing_history.json'));
  console.log('Exported: ea_fc_pricing_history.json');
}

const priceChanges = path.join(RAW_DIR, 'steamdb/competitor_price_changes.json');
if (fs.existsSync(priceChanges)) {
  fs.copyFileSync(priceChanges, path.join(OUTPUT_DIR, 'competitor_price_changes.json'));
  console.log('Exported: competitor_price_changes.json');
}

// Copy community comparison
const communityComp = path.join(NORMALISED_DIR, 'community_pricing_2026-04-21.json');
if (fs.existsSync(communityComp)) {
  fs.copyFileSync(communityComp, path.join(OUTPUT_DIR, 'cross_competitor_comparison.json'));
  console.log('Exported: cross_competitor_comparison.json');
}

console.log(`\nTotal files in output/: ${fs.readdirSync(OUTPUT_DIR).length}`);
console.log('Ready for Google Sheets import.');
