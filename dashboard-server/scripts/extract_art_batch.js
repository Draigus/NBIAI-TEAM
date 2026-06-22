require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const fs = require('fs');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // First get schema
  const schema = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'interview_question_bank' ORDER BY ordinal_position"
  );
  console.log('Columns:', schema.rows.map(r => r.column_name).join(', '));

  const ids = JSON.parse(fs.readFileSync('d:/tmp/art_rework_ids.json', 'utf8'));
  const batch1 = ids.slice(0, 75);

  // Use LIKE ANY to match prefix
  const result = await pool.query(
    "SELECT * FROM interview_question_bank WHERE id::text LIKE ANY($1)",
    [batch1.map(id => id + '%')]
  );

  console.log('Found', result.rows.length, 'questions');

  if (result.rows.length > 0) {
    const cols = Object.keys(result.rows[0]);
    console.log('Row columns:', cols.join(', '));
  }

  // Write output with position_titles
  let output = '';
  const roleCounts = {};
  const byPosition = {};
  for (const row of result.rows) {
    const cat = row.category || 'unknown';
    const pos = row.position_titles || 'unknown';
    roleCounts[cat] = (roleCounts[cat] || 0) + 1;
    if (!byPosition[pos]) byPosition[pos] = {};
    if (!byPosition[pos][cat]) byPosition[pos][cat] = [];
    byPosition[pos][cat].push(row.id.substring(0, 8));
    output += '=== ID: ' + row.id.substring(0, 8) + ' | Category: ' + cat + ' | Position: ' + pos + ' ===\n';
    output += row.question_text + '\n\n';
  }
  fs.writeFileSync('d:/tmp/art_batch1_current.md', output);
  console.log('Written to d:/tmp/art_batch1_current.md');

  console.log('\nCategory distribution:');
  for (const [role, count] of Object.entries(roleCounts).sort((a, b) => b[1] - a[1])) {
    console.log('  ' + role + ': ' + count);
  }

  console.log('\nBy position + category:');
  for (const [pos, cats] of Object.entries(byPosition).sort()) {
    for (const [cat, ids2] of Object.entries(cats)) {
      console.log('  ' + pos + ' / ' + cat + ' (' + ids2.length + '): ' + ids2.join(', '));
    }
  }

  // Check missing
  const found = new Set(result.rows.map(row => row.id.substring(0, 8)));
  const missing = batch1.filter(id => !found.has(id));
  if (missing.length > 0) {
    console.log('\nMissing IDs:', missing.join(', '));
  }

  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
