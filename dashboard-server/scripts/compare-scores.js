const fs = require('fs');
const path = require('path');

const CLAUDE_DIR = 'd:/tmp/question_review';
const CODEX_DIR = 'd:/tmp';

function parseScores(content) {
  const scores = {};
  const lines = content.split('\n');
  let currentId = null;

  for (const line of lines) {
    const idMatch = line.match(/^ID:\s*([0-9a-f-]+)/i);
    if (idMatch) {
      currentId = idMatch[1].length >= 36 ? idMatch[1] : idMatch[1];
    }

    const scoreMatch = line.match(/^SCORE:\s*(\d+)/i);
    if (scoreMatch && currentId) {
      if (!scores[currentId]) scores[currentId] = {};
      scores[currentId].score = parseInt(scoreMatch[1]);
    }

    const verdictMatch = line.match(/^VERDICT:\s*(KEEP|REWORK|CUT)/i);
    if (verdictMatch && currentId) {
      if (!scores[currentId]) scores[currentId] = {};
      scores[currentId].verdict = verdictMatch[1].toUpperCase();
    }

    const reasonMatch = line.match(/^REASON:\s*(.+)/i);
    if (reasonMatch && currentId) {
      if (!scores[currentId]) scores[currentId] = {};
      scores[currentId].reason = reasonMatch[1].trim();
    }
  }

  return scores;
}

function loadAllScores(dir, prefix) {
  const all = {};
  const files = fs.readdirSync(dir).filter(f => f.startsWith(prefix) && f.endsWith('.md'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    const scores = parseScores(content);
    Object.assign(all, scores);
  }
  return all;
}

// Load Claude scores (multiple files with claude_scores_ prefix)
const claude = loadAllScores(CLAUDE_DIR, 'claude_scores_');
// Load Codex scores (multiple files with codex_scores_ prefix)
const codex = loadAllScores(CODEX_DIR, 'codex_scores_');

console.log('Claude scored:', Object.keys(claude).length);
console.log('Codex scored:', Object.keys(codex).length);

// Build prefix lookup for Codex (uses 8-char UUID prefixes)
const codexByPrefix = {};
for (const id of Object.keys(codex)) {
  const prefix = id.substring(0, 8);
  codexByPrefix[prefix] = { id, ...codex[id] };
}

// Match Claude full UUIDs to Codex short IDs via prefix
const bothIds = [];
const matchedCodex = {};
for (const claudeId of Object.keys(claude)) {
  const prefix = claudeId.substring(0, 8);
  if (codexByPrefix[prefix]) {
    bothIds.push(claudeId);
    matchedCodex[claudeId] = codexByPrefix[prefix];
  }
}
// Also try direct match (if Codex used full UUIDs)
for (const claudeId of Object.keys(claude)) {
  if (codex[claudeId] && !matchedCodex[claudeId]) {
    bothIds.push(claudeId);
    matchedCodex[claudeId] = codex[claudeId];
  }
}
console.log('Scored by both:', bothIds.length);

// Compare
let agree = 0;
let disagreeVerdict = 0;
let disagreeScore = 0;
const disagreements = [];

for (const id of bothIds) {
  const c = claude[id];
  const x = matchedCodex[id];

  if (!c.verdict || !x.verdict) continue;

  if (c.verdict === x.verdict) {
    agree++;
    if (Math.abs(c.score - x.score) >= 3) {
      disagreeScore++;
    }
  } else {
    disagreeVerdict++;
    disagreements.push({
      id,
      claude: { score: c.score, verdict: c.verdict, reason: c.reason },
      codex: { score: x.score, verdict: x.verdict, reason: x.reason },
      scoreDiff: c.score - x.score,
    });
  }
}

console.log('\n=== VERDICT AGREEMENT ===');
console.log('Same verdict:', agree);
console.log('Different verdict:', disagreeVerdict);
console.log('Agreement rate:', (agree / (agree + disagreeVerdict) * 100).toFixed(1) + '%');

// Score distribution comparison
const claudeScores = Object.values(claude).map(v => v.score).filter(Boolean);
const codexScores = Object.values(codex).map(v => v.score).filter(Boolean);
const claudeAvg = claudeScores.reduce((a, b) => a + b, 0) / claudeScores.length;
const codexAvg = codexScores.reduce((a, b) => a + b, 0) / codexScores.length;
console.log('\n=== AVERAGE SCORES ===');
console.log('Claude average:', claudeAvg.toFixed(2));
console.log('Codex average:', codexAvg.toFixed(2));
console.log('Difference:', (claudeAvg - codexAvg).toFixed(2), claudeAvg > codexAvg ? '(Claude higher)' : '(Codex higher)');

// Verdict distribution
const claudeVerdicts = { KEEP: 0, REWORK: 0, CUT: 0 };
const codexVerdicts = { KEEP: 0, REWORK: 0, CUT: 0 };
Object.values(claude).forEach(v => { if (v.verdict) claudeVerdicts[v.verdict]++; });
Object.values(codex).forEach(v => { if (v.verdict) codexVerdicts[v.verdict]++; });

console.log('\n=== VERDICT DISTRIBUTION ===');
console.log('        KEEP    REWORK  CUT');
console.log('Claude:', claudeVerdicts.KEEP, '   ', claudeVerdicts.REWORK, '   ', claudeVerdicts.CUT);
console.log('Codex: ', codexVerdicts.KEEP, '   ', codexVerdicts.REWORK, '   ', codexVerdicts.CUT);

// Sort disagreements by score difference (biggest first)
disagreements.sort((a, b) => Math.abs(b.scoreDiff) - Math.abs(a.scoreDiff));

// Write full disagreement report
let report = '# Claude vs Codex Score Disagreements\n\n';
report += `Generated: ${new Date().toISOString().split('T')[0]}\n\n`;
report += `## Summary\n\n`;
report += `- Claude scored: ${Object.keys(claude).length}\n`;
report += `- Codex scored: ${Object.keys(codex).length}\n`;
report += `- Scored by both: ${bothIds.length}\n`;
report += `- Same verdict: ${agree} (${(agree / (agree + disagreeVerdict) * 100).toFixed(1)}%)\n`;
report += `- Different verdict: ${disagreeVerdict}\n`;
report += `- Claude avg: ${claudeAvg.toFixed(2)} | Codex avg: ${codexAvg.toFixed(2)}\n\n`;
report += `## Verdict Distribution\n\n`;
report += `| | KEEP | REWORK | CUT |\n|---|---|---|---|\n`;
report += `| Claude | ${claudeVerdicts.KEEP} | ${claudeVerdicts.REWORK} | ${claudeVerdicts.CUT} |\n`;
report += `| Codex | ${codexVerdicts.KEEP} | ${codexVerdicts.REWORK} | ${codexVerdicts.CUT} |\n\n`;

// Group disagreements by type
const keepVsRework = disagreements.filter(d =>
  (d.claude.verdict === 'KEEP' && d.codex.verdict === 'REWORK') ||
  (d.claude.verdict === 'REWORK' && d.codex.verdict === 'KEEP'));
const keepVsCut = disagreements.filter(d =>
  (d.claude.verdict === 'KEEP' && d.codex.verdict === 'CUT') ||
  (d.claude.verdict === 'CUT' && d.codex.verdict === 'KEEP'));
const reworkVsCut = disagreements.filter(d =>
  (d.claude.verdict === 'REWORK' && d.codex.verdict === 'CUT') ||
  (d.claude.verdict === 'CUT' && d.codex.verdict === 'REWORK'));

report += `## Disagreement Types\n\n`;
report += `- KEEP vs REWORK: ${keepVsRework.length}\n`;
report += `- KEEP vs CUT: ${keepVsCut.length}\n`;
report += `- REWORK vs CUT: ${reworkVsCut.length}\n\n`;

report += `## All Disagreements (sorted by score difference)\n\n`;
for (const d of disagreements) {
  report += `### ${d.id}\n\n`;
  report += `| | Score | Verdict | Reason |\n|---|---|---|---|\n`;
  report += `| Claude | ${d.claude.score} | ${d.claude.verdict} | ${d.claude.reason || 'N/A'} |\n`;
  report += `| Codex | ${d.codex.score} | ${d.codex.verdict} | ${d.codex.reason || 'N/A'} |\n`;
  report += `| Diff | ${d.scoreDiff > 0 ? '+' : ''}${d.scoreDiff} | | |\n\n`;
}

fs.writeFileSync('d:/tmp/question_review/SCORE_COMPARISON.md', report);
console.log('\nFull report written to d:/tmp/question_review/SCORE_COMPARISON.md');
console.log('Disagreements:', disagreeVerdict);
