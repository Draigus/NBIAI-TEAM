const fs = require('fs');
const path = require('path');

const NORMALISED_DIR = path.join(__dirname, '../normalised');
const RAW_COMMUNITY = path.join(__dirname, '../raw/community');
const RAW_STEAM = path.join(__dirname, '../raw/steam_api');
const CONFIG_DIR = path.join(__dirname, '../config');

const competitors = JSON.parse(
  fs.readFileSync(path.join(CONFIG_DIR, 'competitors.json'), 'utf8')
).competitors;

function loadCSV(filename) {
  const content = fs.readFileSync(path.join(NORMALISED_DIR, filename), 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { values.push(current); current = ''; }
      else { current += char; }
    }
    values.push(current);
    const row = {};
    headers.forEach((h, i) => row[h.trim()] = values[i]?.trim() || '');
    return row;
  });
}

function verify() {
  console.log('=== Verification Report ===\n');
  const issues = [];
  const rows = loadCSV('current_snapshot.csv');

  // Check 1: All 13 competitors have data
  const tier1 = ['EA FC 26', 'EA FC Mobile', 'UFL', 'eFootball'];
  const tier2 = ['NBA 2K', 'Madden', 'Fortnite', 'Apex Legends', 'Rocket League', 'Valorant'];
  const tier3 = ['NHL', 'F1', 'MLB'];

  const competitorNames = [...new Set(rows.map(r => r.competitor))];
  console.log(`Competitors found: ${competitorNames.length}`);
  console.log(`  ${competitorNames.join(', ')}\n`);

  for (const name of tier1) {
    const has = competitorNames.some(c => c.toLowerCase().includes(name.toLowerCase()));
    if (!has) issues.push({ severity: 'CRITICAL', msg: `Missing Tier 1: ${name}` });
  }
  for (const name of tier2) {
    const has = competitorNames.some(c => c.toLowerCase().includes(name.toLowerCase()));
    if (!has) issues.push({ severity: 'HIGH', msg: `Missing Tier 2: ${name}` });
  }
  for (const name of tier3) {
    const has = competitorNames.some(c => c.toLowerCase().includes(name.toLowerCase()));
    if (!has) issues.push({ severity: 'LOW', msg: `Missing Tier 3: ${name} (console-only, expected gap)` });
  }

  // Check 2: Tier 1 regional coverage
  const primaryRegions = ['us', 'gb', 'br', 'mx', 'fr', 'de', 'se', 'tr', 'pl', 'jp', 'sg', 'id'];
  const steamTier1 = rows.filter(r => r.competitor?.includes('FC 26') && r.platform === 'steam');
  const regions = [...new Set(steamTier1.map(r => r.region))];
  console.log(`EA FC 26 Steam regions: ${regions.length} (${regions.join(', ')})`);
  for (const reg of primaryRegions) {
    if (!regions.includes(reg)) {
      issues.push({ severity: 'MEDIUM', msg: `EA FC 26 missing region: ${reg}` });
    }
  }

  // Check 3: Source URLs present
  const noSource = rows.filter(r => !r.source_url);
  if (noSource.length > 0) {
    issues.push({ severity: 'MEDIUM', msg: `${noSource.length} rows missing source_url` });
  }

  // Check 4: Confidence assigned
  const noConf = rows.filter(r => !r.confidence);
  if (noConf.length > 0) {
    issues.push({ severity: 'MEDIUM', msg: `${noConf.length} rows missing confidence level` });
  }

  // Check 5: Price sanity
  const badPrices = rows.filter(r => {
    const usd = parseFloat(r.price_usd);
    return isNaN(usd) || usd <= 0 || usd > 500;
  });
  if (badPrices.length > 0) {
    issues.push({ severity: 'HIGH', msg: `${badPrices.length} rows with invalid/extreme USD prices` });
  }

  // Check 6: Raw data file count
  const communityFiles = fs.readdirSync(RAW_COMMUNITY).filter(f => f.endsWith('.json'));
  const steamFiles = fs.readdirSync(RAW_STEAM).filter(f => f.endsWith('.json'));
  console.log(`\nRaw data files: ${communityFiles.length} community + ${steamFiles.length} steam`);

  // Check 7: Longitudinal data exists
  const steamdbDir = path.join(__dirname, '../raw/steamdb');
  const hasLongitudinal = fs.existsSync(steamdbDir) &&
    fs.readdirSync(steamdbDir).some(f => f.includes('longitudinal'));
  if (!hasLongitudinal) {
    issues.push({ severity: 'HIGH', msg: 'Missing longitudinal pricing history data' });
  } else {
    console.log('Longitudinal data: PRESENT');
  }

  // Summary
  console.log('\n=== Issues ===');
  if (issues.length === 0) {
    console.log('  No issues found.');
  } else {
    const critical = issues.filter(i => i.severity === 'CRITICAL');
    const high = issues.filter(i => i.severity === 'HIGH');
    const medium = issues.filter(i => i.severity === 'MEDIUM');
    const low = issues.filter(i => i.severity === 'LOW');

    if (critical.length) { console.log(`\n  CRITICAL (${critical.length}):`); critical.forEach(i => console.log(`    - ${i.msg}`)); }
    if (high.length) { console.log(`\n  HIGH (${high.length}):`); high.forEach(i => console.log(`    - ${i.msg}`)); }
    if (medium.length) { console.log(`\n  MEDIUM (${medium.length}):`); medium.forEach(i => console.log(`    - ${i.msg}`)); }
    if (low.length) { console.log(`\n  LOW (${low.length}):`); low.forEach(i => console.log(`    - ${i.msg}`)); }
  }

  // Write report
  const report = {
    run_date: new Date().toISOString(),
    total_rows: rows.length,
    competitors_found: competitorNames.length,
    competitor_names: competitorNames,
    issues: issues,
    summary: {
      critical: issues.filter(i => i.severity === 'CRITICAL').length,
      high: issues.filter(i => i.severity === 'HIGH').length,
      medium: issues.filter(i => i.severity === 'MEDIUM').length,
      low: issues.filter(i => i.severity === 'LOW').length
    }
  };
  fs.writeFileSync(
    path.join(NORMALISED_DIR, 'verification_report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log(`\nReport written to: normalised/verification_report.json`);
  const critCount = issues.filter(i => i.severity === 'CRITICAL').length;
  console.log(`\nVERDICT: ${critCount === 0 ? 'PASS (no critical issues)' : 'FAIL (critical issues found)'}`);
}

verify();
