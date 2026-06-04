'use strict';

const STALE_DAYS = 90;

function daysSince(date) {
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
}

async function analyse(ctx) {
  const { fs, path } = ctx;
  const insights = [];
  const staleFiles = [];

  const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '../../..');
  const home = process.env.USERPROFILE || process.env.HOME || '';
  const projectKey = REPO_ROOT.replace(/[^a-zA-Z0-9]/g, '-');
  const MEMORY_DIR = path.join(home, '.claude', 'projects', projectKey, 'memory');

  if (!fs.existsSync(MEMORY_DIR)) {
    return { insights, stale_report: { memory_files: [] } };
  }

  const files = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');

  files.forEach(f => {
    const fp = path.join(MEMORY_DIR, f);
    let stat, content;
    try { stat = fs.statSync(fp); } catch { return; }
    try { content = fs.readFileSync(fp, 'utf8'); } catch { return; }

    const age = daysSince(stat.mtime);
    const refMatches = content.match(/`([^`]+\.(js|ts|md|py|html))`/g) || [];
    const brokenRefs = [];
    refMatches.forEach(ref => {
      const cleanRef = ref.replace(/`/g, '');
      const fullPath = path.join(REPO_ROOT, cleanRef);
      if (!fs.existsSync(fullPath)) brokenRefs.push(cleanRef);
    });

    if (age > STALE_DAYS || brokenRefs.length > 0) {
      staleFiles.push({ name: f.replace('.md', ''), days_stale: age, broken_refs: brokenRefs.length > 0, broken_ref_count: brokenRefs.length });
    }
  });

  if (staleFiles.length > 0) {
    const withBroken = staleFiles.filter(f => f.broken_refs);
    const justOld = staleFiles.filter(f => !f.broken_refs);
    if (withBroken.length > 0) {
      insights.push({
        category: 'drift', severity: 'warning',
        title: withBroken.length + ' memory files have broken references',
        body: withBroken.slice(0, 5).map(f => f.name).join(', '),
        evidence: withBroken.slice(0, 5).map(f => 'memory:' + f.name),
        action: 'Update or remove stale memory entries.', related_4c: 'context',
      });
    }
    if (justOld.length > 3) {
      insights.push({
        category: 'stale', severity: 'info',
        title: justOld.length + ' memory files older than ' + STALE_DAYS + ' days',
        body: 'These may contain outdated information.',
        evidence: justOld.slice(0, 5).map(f => 'memory:' + f.name),
        action: 'Review for relevance.', related_4c: 'context',
      });
    }
  }

  return { insights, stale_report: { memory_files: staleFiles } };
}

module.exports = { analyse };
