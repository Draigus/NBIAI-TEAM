const fs = require('fs');

const CODEX_DIR = 'd:/tmp';
const files = fs.readdirSync(CODEX_DIR).filter(f => f.startsWith('codex_scores_') && f.endsWith('.md'));

const byDiscipline = {};
let totalKeep = 0, totalRework = 0, totalCut = 0;

for (const file of files) {
  const disc = file.replace('codex_scores_', '').replace('.md', '');
  const content = fs.readFileSync(CODEX_DIR + '/' + file, 'utf8');
  const lines = content.split('\n');

  const stats = { keep: 0, rework: 0, cut: 0, scores: [], ids: { rework: [], cut: [] } };
  let currentId = null;

  for (const line of lines) {
    const idMatch = line.match(/^ID:\s*([0-9a-f-]+)/i);
    if (idMatch) currentId = idMatch[1];

    const scoreMatch = line.match(/^SCORE:\s*(\d+)/i);
    if (scoreMatch) stats.scores.push(parseInt(scoreMatch[1]));

    const verdictMatch = line.match(/^VERDICT:\s*(KEEP|REWORK|CUT)/i);
    if (verdictMatch && currentId) {
      const v = verdictMatch[1].toUpperCase();
      if (v === 'KEEP') stats.keep++;
      else if (v === 'REWORK') { stats.rework++; stats.ids.rework.push(currentId); }
      else if (v === 'CUT') { stats.cut++; stats.ids.cut.push(currentId); }
    }
  }

  const avg = stats.scores.length ? (stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length).toFixed(2) : 'N/A';
  const total = stats.keep + stats.rework + stats.cut;
  const keepPct = total ? (stats.keep / total * 100).toFixed(0) : 0;

  byDiscipline[disc] = stats;
  totalKeep += stats.keep;
  totalRework += stats.rework;
  totalCut += stats.cut;

  console.log(`${disc.padEnd(15)} | ${String(total).padStart(4)} total | ${String(stats.keep).padStart(4)} KEEP (${keepPct}%) | ${String(stats.rework).padStart(4)} REWORK | ${String(stats.cut).padStart(3)} CUT | avg ${avg}`);
}

console.log('---');
const grandTotal = totalKeep + totalRework + totalCut;
console.log(`${'TOTAL'.padEnd(15)} | ${String(grandTotal).padStart(4)} total | ${String(totalKeep).padStart(4)} KEEP (${(totalKeep/grandTotal*100).toFixed(0)}%) | ${String(totalRework).padStart(4)} REWORK | ${String(totalCut).padStart(3)} CUT`);

console.log('\n=== CUT QUESTIONS (delete these) ===');
for (const [disc, stats] of Object.entries(byDiscipline)) {
  if (stats.ids.cut.length > 0) {
    console.log(`${disc}: ${stats.ids.cut.join(', ')}`);
  }
}

console.log('\n=== REWORK counts by discipline ===');
for (const [disc, stats] of Object.entries(byDiscipline)) {
  if (stats.ids.rework.length > 0) {
    console.log(`${disc}: ${stats.ids.rework.length} questions need rework`);
  }
}
