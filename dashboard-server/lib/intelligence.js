'use strict';

const fs = require('fs');
const path = require('path');

const INTEL_DIR = path.resolve(__dirname, '../../intelligence');

function safeRead(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); }
  catch { return null; }
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const m = line.match(/^(\w[\w_]*):\s*(.+)$/);
    if (m) {
      let val = m[2].trim();
      if (val.startsWith('[') && val.endsWith(']')) {
        val = val.slice(1, -1).split(',').map(s => s.trim());
      }
      meta[m[1]] = val;
    }
  });
  return { meta, body: content.slice(match[0].length).trim() };
}

function readBrief() {
  const raw = safeRead(path.join(INTEL_DIR, 'synthesis', 'intelligence_brief.md'));
  if (!raw) return null;
  const lines = raw.split('\n');
  const dateMatch = lines[0] && lines[0].match(/(\d{4}-\d{2}-\d{2})/);
  const generated = dateMatch ? dateMatch[1] : null;

  const sections = {};
  let currentSection = null;
  let currentItems = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentSection) sections[currentSection] = currentItems;
      currentSection = line.replace('## ', '').trim();
      currentItems = [];
    } else if (currentSection && line.startsWith('- ')) {
      currentItems.push(line.replace(/^- \*\*.*?\*\*\s*/, '').replace(/^- /, '').trim());
    } else if (currentSection && (line.startsWith('  - ') || line.startsWith('  * '))) {
      currentItems.push(line.replace(/^\s+[-*]\s*/, '').trim());
    }
  }
  if (currentSection) sections[currentSection] = currentItems;

  const now = new Date();
  const genDate = generated ? new Date(generated + 'T07:00:00Z') : null;
  const stale = genDate ? (now - genDate) > 24 * 60 * 60 * 1000 : true;

  return { generated, stale, sections, raw_markdown: raw };
}

function readBanks() {
  const banksDir = path.join(INTEL_DIR, 'banks');
  const summariesDir = path.join(INTEL_DIR, 'synthesis', 'bank_summaries');
  if (!fs.existsSync(banksDir)) return [];

  const shelfLifeMap = {
    industry_current: '7d', client_patterns: '14d',
    forecast_models: '30d', games_pitch_decks: '30d',
    production_methods: '60d', personal_insights: null,
    client_couch_heroes: null
  };

  return fs.readdirSync(banksDir)
    .filter(f => f.endsWith('.md'))
    .map(f => {
      const slug = f.replace('.md', '');
      const content = safeRead(path.join(banksDir, f));
      if (!content) return null;
      const lines = content.split('\n').length;

      const compiledMatch = content.match(/Last compiled:\*?\*?\s*(\d{4}-\d{2}-\d{2})/i);
      const sourcesMatch = content.match(/Sources:\*?\*?\s*(\d+)/i);
      const rolesMatch = content.match(/Role associations:\*?\*?\s*(.+)/i);

      const summaryContent = safeRead(path.join(summariesDir, f));

      const lastCompiled = compiledMatch ? compiledMatch[1] : null;
      const shelfLife = shelfLifeMap[slug] || '30d';
      let status = 'fresh';
      if (lastCompiled && shelfLife) {
        const days = parseInt(shelfLife);
        const age = (Date.now() - new Date(lastCompiled + 'T00:00:00Z')) / (1000 * 60 * 60 * 24);
        if (age > days) status = 'stale';
        else if (age > days * 0.75) status = 'approaching';
      }

      return {
        slug, lines,
        capacity: Math.round((lines / 500) * 100),
        sources: sourcesMatch ? parseInt(sourcesMatch[1]) : 0,
        lastCompiled,
        shelfLife: shelfLife || '∞',
        status,
        roles: rolesMatch ? rolesMatch[1].trim() : '',
        summary: summaryContent || ''
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.lines - a.lines);
}

function readResearchLog(limit) {
  limit = limit || 20;
  const raw = safeRead(path.join(INTEL_DIR, 'research_log.md'));
  if (!raw) return [];
  const entries = [];
  const chunks = raw.split(/^## /m).slice(1);
  for (const chunk of chunks.slice(0, limit)) {
    const lines = chunk.split('\n');
    const header = lines[0].trim();
    const dateMatch = header.match(/(\d{4}-\d{2}-\d{2})/);
    const domainMatch = header.match(/\|\s*(\S+)/);
    const findings = [];
    let inFindings = false;
    for (const line of lines) {
      if (line.includes('Findings Kept') || line.includes('extracts')) inFindings = true;
      if (inFindings && line.startsWith('| ') && !line.includes('---') && !line.includes('Extract')) {
        const cells = line.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 4) {
          findings.push({ title: cells[0], relevance: parseInt(cells[1]) || 0, novelty: parseInt(cells[2]) || 0, actionability: parseInt(cells[3]) || 0, reason: cells[4] || '' });
        }
      }
    }
    entries.push({
      date: dateMatch ? dateMatch[1] : null,
      domain: domainMatch ? domainMatch[1] : header,
      header, findings, raw: chunk
    });
  }
  return entries;
}

function readPipelineState() {
  const raw = safeRead(path.join(INTEL_DIR, 'pipeline_state.md'));
  if (!raw) return null;

  const sources = [];
  const sourceBlock = raw.match(/## Last Ingestion Run Per Source[\s\S]*?\n\n/);
  if (sourceBlock) {
    sourceBlock[0].split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Source')).forEach(row => {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 5) {
        sources.push({ name: cells[0], lastRun: cells[1], produced: parseInt(cells[2]) || 0, promoted: parseInt(cells[3]) || 0, nextScheduled: cells[4] });
      }
    });
  }

  const pending = [];
  const pendingBlock = raw.match(/## Pending Review[\s\S]*?(?=\n## |$)/);
  if (pendingBlock) {
    pendingBlock[0].split('\n').filter(l => l.startsWith('- ')).forEach(l => pending.push(l.replace('- ', '').trim()));
  }

  return { sources, pending, raw_markdown: raw };
}

function readExtract(source, filename) {
  const filePath = path.join(INTEL_DIR, 'raw', source, filename);
  const raw = safeRead(filePath);
  if (!raw) return null;
  const { meta, body } = parseFrontmatter(raw);
  return { meta, body, raw };
}

module.exports = { readBrief, readBanks, readResearchLog, readPipelineState, readExtract };
