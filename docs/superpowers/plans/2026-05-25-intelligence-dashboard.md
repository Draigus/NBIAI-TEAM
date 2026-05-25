# Intelligence Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add intelligence pipeline visibility to WorkSage — a Morning Brief card in the Command Centre and a dedicated Intelligence tab showing bank health, research findings, pipeline activity, and pending actions.

**Architecture:** Server reads markdown files from `intelligence/` directory, parses them into JSON, serves via REST endpoints. Frontend renders two components: a brief card inside the existing CC tab system, and a full Intelligence tab in the main navigation. No database tables — all data from files.

**Tech Stack:** Express routes (routes/intelligence.js), markdown parsing (lib/intelligence.js), vanilla JS frontend in nbi_project_dashboard.html.

**Spec:** `docs/superpowers/specs/2026-05-25-intelligence-dashboard-design.md`
**Mockup:** `docs/superpowers/mockups/intelligence-dashboard-mockup.html`

---

## File Map

### New files:
```
dashboard-server/lib/intelligence.js       — Markdown file parser for intelligence/ directory
dashboard-server/routes/intelligence.js    — REST endpoints for brief, banks, research, pipeline
```

### Modified files:
```
dashboard-server/server.js                 — Mount intelligence routes (~line 438)
nbi_project_dashboard.html                 — CC brief card + Intelligence tab + CSS
```

---

## Task 1: Build the Markdown File Parser

**Files:**
- Create: `dashboard-server/lib/intelligence.js`

- [ ] **Step 1: Create the intelligence parser module**

Write `dashboard-server/lib/intelligence.js`:

```javascript
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
    } else if (currentSection && line.startsWith('  - ') || line.startsWith('  * ')) {
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
      const summary = summaryContent || '';

      const shelfLifeMap = {
        industry_current: '7d', client_patterns: '14d',
        forecast_models: '30d', games_pitch_decks: '30d',
        production_methods: '60d', personal_insights: null,
        client_couch_heroes: null
      };

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
        slug,
        lines,
        capacity: Math.round((lines / 500) * 100),
        sources: sourcesMatch ? parseInt(sourcesMatch[1]) : 0,
        lastCompiled,
        shelfLife: shelfLife || '∞',
        status,
        roles: rolesMatch ? rolesMatch[1].trim() : '',
        summary
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
      header,
      findings,
      raw: chunk
    });
  }
  return entries;
}

function readPipelineState() {
  const raw = safeRead(path.join(INTEL_DIR, 'pipeline_state.md'));
  if (!raw) return null;
  const { meta, body } = parseFrontmatter(raw);

  const sources = [];
  const sourceMatch = body.match(/## Last Ingestion Run Per Source[\s\S]*?\n\n/);
  if (sourceMatch) {
    const rows = sourceMatch[0].split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Source'));
    rows.forEach(row => {
      const cells = row.split('|').map(c => c.trim()).filter(Boolean);
      if (cells.length >= 5) {
        sources.push({ name: cells[0], lastRun: cells[1], produced: parseInt(cells[2]) || 0, promoted: parseInt(cells[3]) || 0, nextScheduled: cells[4] });
      }
    });
  }

  const pendingMatch = body.match(/## Pending Review[\s\S]*?(?=\n## |$)/);
  const pending = [];
  if (pendingMatch) {
    pendingMatch[0].split('\n').filter(l => l.startsWith('- ')).forEach(l => pending.push(l.replace('- ', '').trim()));
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
```

- [ ] **Step 2: Commit**

```bash
git add dashboard-server/lib/intelligence.js
git commit -m "feat: add intelligence file parser library"
```

---

## Task 2: Build the Routes

**Files:**
- Create: `dashboard-server/routes/intelligence.js`
- Modify: `dashboard-server/server.js` (~line 438)

- [ ] **Step 1: Create the routes file**

Write `dashboard-server/routes/intelligence.js`:

```javascript
'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { requireNBI } = ctx;
  const intel = require('../lib/intelligence');

  router.get('/api/intelligence/brief', requireNBI, (req, res) => {
    const brief = intel.readBrief();
    if (!brief) return res.status(404).json({ error: 'No intelligence brief found' });
    res.json(brief);
  });

  router.get('/api/intelligence/banks', requireNBI, (req, res) => {
    res.json(intel.readBanks());
  });

  router.get('/api/intelligence/research', requireNBI, (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    res.json(intel.readResearchLog(limit));
  });

  router.get('/api/intelligence/pipeline', requireNBI, (req, res) => {
    const state = intel.readPipelineState();
    if (!state) return res.status(404).json({ error: 'No pipeline state found' });
    res.json(state);
  });

  router.get('/api/intelligence/extract/:source/:filename', requireNBI, (req, res) => {
    const { source, filename } = req.params;
    const allowed = ['claude_sessions', 'chatgpt', 'onedrive', 'downloads', 'gmail', 'granola', 'slack'];
    if (!allowed.includes(source)) return res.status(400).json({ error: 'Invalid source' });
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const extract = intel.readExtract(source, filename);
    if (!extract) return res.status(404).json({ error: 'Extract not found' });
    res.json(extract);
  });

  return router;
};
```

- [ ] **Step 2: Mount the routes in server.js**

In `dashboard-server/server.js`, after line 438 (the command-centre mount), add:

```javascript
// ==================== INTELLIGENCE PIPELINE ====================
app.use(require('./routes/intelligence')({ requireNBI }));
```

- [ ] **Step 3: Commit**

```bash
git add dashboard-server/routes/intelligence.js dashboard-server/server.js
git commit -m "feat: add intelligence API routes (brief, banks, research, pipeline, extracts)"
```

---

## Task 3: Add the Morning Brief Card to Command Centre

**Files:**
- Modify: `nbi_project_dashboard.html` (~line 22556 CC tab bar, ~line 22570 CC body render)

- [ ] **Step 1: Add 'intel' to the CC tab array**

At line 22562 (after the comms tab), add the intel tab:

```javascript
  var tabs = [
    { id: 'work', label: 'Work' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'money', label: 'Money' },
    { id: 'aios', label: 'AIOS' },
    { id: 'comms', label: 'Comms' },
    { id: 'intel', label: 'Intel' }
  ];
```

- [ ] **Step 2: Add the render dispatch for the intel tab**

At line 22574 (after the comms conditional), add:

```javascript
  else if (_ccTab === 'intel') html += _ccRenderIntelTab();
```

- [ ] **Step 3: Write the _ccRenderIntelTab function**

Add before the `renderCommandCentre` function (around line 22399):

```javascript
function _ccRenderIntelTab() {
  var html = '<div class="cc-intel">';
  html += '<div class="cc-intel-loading" id="ccIntelContent">Loading intelligence brief...</div>';
  html += '</div>';

  setTimeout(function() {
    fetch('/api/intelligence/brief').then(function(r) { return r.json(); }).then(function(brief) {
      var el = document.getElementById('ccIntelContent');
      if (!el) return;
      var h = '';

      // Brief card
      h += '<div class="cc-intel-brief">';
      h += '<div class="cc-intel-hdr">';
      h += '<span class="cc-intel-title">Intelligence Brief</span>';
      h += '<span class="cc-intel-date">' + (brief.generated || 'Unknown') + (brief.stale ? ' <span class="cc-intel-stale">(stale)</span>' : '') + '</span>';
      h += '</div>';

      var sections = brief.sections || {};
      var sectionKeys = Object.keys(sections);
      sectionKeys.forEach(function(key) {
        var items = sections[key];
        if (!items || !items.length) return;
        var isAction = key.toLowerCase().indexOf('action') >= 0;
        h += '<div class="cc-intel-section">';
        h += '<div class="cc-intel-section-hdr" onclick="this.parentElement.classList.toggle(\'collapsed\')">';
        if (isAction) h += '<span class="cc-intel-dot"></span>';
        h += '<span class="cc-intel-arrow">&#9662;</span> ' + key;
        h += ' <span class="cc-intel-count">(' + items.length + ')</span>';
        h += '</div>';
        h += '<div class="cc-intel-section-body"><ul>';
        items.forEach(function(item) { h += '<li>' + item + '</li>'; });
        h += '</ul></div></div>';
      });

      h += '</div>';

      // Bank health summary
      fetch('/api/intelligence/banks').then(function(r) { return r.json(); }).then(function(banks) {
        h += '<div class="cc-intel-banks">';
        h += '<div class="cc-intel-hdr"><span class="cc-intel-title">Bank Health</span></div>';
        h += '<table class="cc-intel-table"><thead><tr><th>Bank</th><th>Lines</th><th>Capacity</th><th>Sources</th><th>Status</th></tr></thead><tbody>';
        var totalLines = 0, totalSources = 0;
        banks.forEach(function(b) {
          totalLines += b.lines;
          totalSources += b.sources;
          var barColor = b.status === 'fresh' ? 'var(--success)' : b.status === 'stale' ? 'var(--danger)' : 'var(--warning)';
          var statusClass = 'cc-intel-status--' + b.status;
          h += '<tr>';
          h += '<td><strong>' + b.slug.replace(/_/g, ' ') + '</strong></td>';
          h += '<td>' + b.lines + '</td>';
          h += '<td><div class="cc-intel-bar"><div class="cc-intel-bar-fill" style="width:' + b.capacity + '%;background:' + barColor + '"></div></div>' + b.capacity + '%</td>';
          h += '<td>' + b.sources + '</td>';
          h += '<td><span class="' + statusClass + '">' + b.status.charAt(0).toUpperCase() + b.status.slice(1) + '</span></td>';
          h += '</tr>';
        });
        h += '</tbody></table>';
        h += '<div class="cc-intel-total">' + totalLines + ' lines &middot; ' + totalSources + ' source refs</div>';
        h += '</div>';

        // Recent research
        return fetch('/api/intelligence/research?limit=5');
      }).then(function(r) { return r.json(); }).then(function(entries) {
        if (entries.length) {
          h += '<div class="cc-intel-research">';
          h += '<div class="cc-intel-hdr"><span class="cc-intel-title">Recent Research</span></div>';
          entries.forEach(function(entry) {
            h += '<div class="cc-intel-research-group">';
            h += '<div class="cc-intel-research-date">' + (entry.date || '') + ' <span class="cc-intel-domain">' + (entry.domain || '') + '</span></div>';
            entry.findings.forEach(function(f) {
              var scoreClass = f.relevance >= 8 ? 'cc-intel-score--high' : 'cc-intel-score--mid';
              h += '<div class="cc-intel-finding"><span class="cc-intel-score ' + scoreClass + '">' + f.relevance + '</span><span>' + f.title + '</span></div>';
            });
            h += '</div>';
          });
          h += '</div>';
        }

        // Pipeline activity
        return fetch('/api/intelligence/pipeline');
      }).then(function(r) { return r.json(); }).then(function(state) {
        h += '<div class="cc-intel-pipeline">';
        h += '<div class="cc-intel-hdr"><span class="cc-intel-title">Pipeline Activity</span></div>';
        h += '<div class="cc-intel-sources">';
        state.sources.forEach(function(s) {
          var dotClass = s.lastRun === 'never' ? 'cc-intel-dot--amber' : 'cc-intel-dot--green';
          h += '<div class="cc-intel-source"><span>' + s.name + '</span><span><span class="cc-intel-source-dot ' + dotClass + '"></span>' + s.lastRun + '</span></div>';
        });
        h += '</div></div>';

        el.innerHTML = h;
      }).catch(function() { el.innerHTML = h; });
    }).catch(function(err) {
      var el = document.getElementById('ccIntelContent');
      if (el) el.innerHTML = '<div style="color:var(--text-muted);padding:20px;">Intelligence brief not available. Run /intel-brief to generate.</div>';
    });
  }, 0);

  return html;
}
```

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: add Intel tab to Command Centre with brief, banks, research, pipeline"
```

---

## Task 4: Add the Intelligence Tab to Main Navigation

**Files:**
- Modify: `nbi_project_dashboard.html` (line 5637 tabs array, line 5638 labels, line 5795 renderContent dispatch)

- [ ] **Step 1: Register the Intelligence tab**

At line 5637, add `'intelligence'` to the tabs array:

```javascript
const tabs = ['dashboard', 'tasks', 'workload', 'people', 'leads', 'expenses', 'finances', 'news', 'intelligence', 'settings'];
```

At line 5638, add the label:

```javascript
const labels = { dashboard: 'Portfolio', tasks: 'Projects', workload: 'Workload', report: 'Report', people: 'People', leads: 'Leads', expenses: 'Expenses', finances: 'Finances', news: 'News', intelligence: 'Intelligence', settings: 'Settings' };
```

- [ ] **Step 2: Add permission filtering (admin only)**

At line 5642, add the intelligence check:

```javascript
if (t === 'finances' || t === 'leads' || t === 'expenses') return hasPageAccess(t);
if (t === 'intelligence') return currentUser && currentUser.role === 'admin';
```

- [ ] **Step 3: Add render dispatch**

At line 5795 (after the commandcentre line), add:

```javascript
else if (currentView === 'intelligence') renderIntelligenceView(content);
```

- [ ] **Step 4: Write the renderIntelligenceView function**

Add the full Intelligence tab renderer. This is the dedicated view with KPI strip, bank health table, research findings, pipeline activity, and pending actions — matching the mockup:

```javascript
function renderIntelligenceView(container) {
  container.innerHTML = '<div class="intel-loading">Loading intelligence...</div>';

  Promise.all([
    fetch('/api/intelligence/brief').then(function(r) { return r.json(); }).catch(function() { return null; }),
    fetch('/api/intelligence/banks').then(function(r) { return r.json(); }).catch(function() { return []; }),
    fetch('/api/intelligence/research?limit=10').then(function(r) { return r.json(); }).catch(function() { return []; }),
    fetch('/api/intelligence/pipeline').then(function(r) { return r.json(); }).catch(function() { return null; })
  ]).then(function(results) {
    var brief = results[0], banks = results[1], research = results[2], pipeline = results[3];
    var h = '<div class="intel-view">';

    // KPI strip
    var totalLines = 0, totalSources = 0, totalExtracts = 0, staleCount = 0;
    banks.forEach(function(b) { totalLines += b.lines; totalSources += b.sources; if (b.status === 'stale') staleCount++; });
    if (pipeline) pipeline.sources.forEach(function(s) { totalExtracts += s.produced; });

    h += '<div class="intel-kpis">';
    var kpis = [
      { value: banks.length, label: 'Active Banks', color: '' },
      { value: totalLines.toLocaleString(), label: 'Total Lines', color: 'var(--success)' },
      { value: totalExtracts, label: 'Raw Extracts', color: '' },
      { value: totalSources, label: 'Source Refs', color: '' },
      { value: staleCount, label: 'Stale Banks', color: staleCount > 0 ? 'var(--danger)' : 'var(--success)' }
    ];
    kpis.forEach(function(k) {
      h += '<div class="intel-kpi"><div class="intel-kpi-value"' + (k.color ? ' style="color:' + k.color + '"' : '') + '>' + k.value + '</div><div class="intel-kpi-label">' + k.label + '</div></div>';
    });
    h += '</div>';

    // Bank health table
    h += '<div class="pf__panel" style="margin-bottom:16px">';
    h += '<div class="pf__panel-hdr"><h2>Bank Health</h2></div>';
    h += '<div class="pf__panel-body" style="padding:0;overflow-x:auto">';
    h += '<table class="intel-bank-table"><thead><tr><th>Bank</th><th>Lines</th><th>Capacity</th><th>Sources</th><th>Last Compiled</th><th>Shelf Life</th><th>Status</th></tr></thead><tbody>';
    banks.forEach(function(b) {
      var barColor = b.capacity > 80 ? 'var(--warning)' : 'var(--success)';
      if (b.status === 'stale') barColor = 'var(--danger)';
      h += '<tr>';
      h += '<td><strong class="intel-bank-name">' + b.slug.replace(/_/g, ' ').replace(/\b\w/g, function(c) { return c.toUpperCase(); }) + '</strong><br><span class="intel-bank-slug">' + b.slug + '</span></td>';
      h += '<td>' + b.lines + '</td>';
      h += '<td><div class="intel-cap-bar"><div class="intel-cap-fill" style="width:' + b.capacity + '%;background:' + barColor + '"></div></div>' + b.capacity + '%</td>';
      h += '<td>' + b.sources + '</td>';
      h += '<td>' + (b.lastCompiled || 'never') + '</td>';
      h += '<td>' + b.shelfLife + '</td>';
      h += '<td><span class="intel-status intel-status--' + b.status + '">' + b.status.charAt(0).toUpperCase() + b.status.slice(1) + '</span></td>';
      h += '</tr>';
    });
    h += '</tbody></table>';
    h += '<div style="padding:12px 16px;font-size:13px;color:var(--text-secondary);border-top:1px solid var(--border)">';
    h += '<strong>' + totalLines.toLocaleString() + '</strong> total lines across <strong>' + totalSources + '</strong> source references';
    h += '</div></div></div>';

    // Two-column: Research + Pipeline/Pending
    h += '<div class="intel-columns">';

    // Research findings
    h += '<div class="pf__panel">';
    h += '<div class="pf__panel-hdr"><h2>Recent Research</h2></div>';
    h += '<div class="pf__panel-body">';
    if (research.length) {
      research.forEach(function(entry) {
        h += '<div class="intel-research-group">';
        h += '<div class="intel-research-date">' + (entry.date || '') + ' <span class="intel-domain-badge">' + (entry.domain || '') + '</span></div>';
        entry.findings.forEach(function(f) {
          var cls = f.relevance >= 8 ? 'intel-score--high' : 'intel-score--mid';
          h += '<div class="intel-finding"><span class="intel-score ' + cls + '">' + f.relevance + '</span><span class="intel-finding-text">' + f.title + '</span></div>';
        });
        h += '</div>';
      });
    } else {
      h += '<div style="color:var(--text-muted)">No research runs yet.</div>';
    }
    h += '</div></div>';

    // Pipeline + Pending column
    h += '<div class="intel-right-col">';

    // Pipeline activity
    h += '<div class="pf__panel" style="margin-bottom:16px">';
    h += '<div class="pf__panel-hdr"><h2>Pipeline Activity</h2></div>';
    h += '<div class="pf__panel-body">';
    if (pipeline && pipeline.sources) {
      pipeline.sources.forEach(function(s) {
        var dotClass = s.lastRun === 'never' ? 'intel-dot--amber' : 'intel-dot--green';
        h += '<div class="intel-source-row"><span class="intel-source-name">' + s.name + '</span><span><span class="intel-source-dot ' + dotClass + '"></span>' + s.lastRun + '</span></div>';
      });
    }
    h += '</div></div>';

    // Pending actions
    if (pipeline && pipeline.pending && pipeline.pending.length) {
      h += '<div class="pf__panel">';
      h += '<div class="pf__panel-hdr"><h2>Pending</h2><span class="intel-pending-badge">' + pipeline.pending.length + '</span></div>';
      h += '<div class="pf__panel-body">';
      pipeline.pending.forEach(function(p) {
        h += '<div class="intel-pending-item">' + p + '</div>';
      });
      h += '</div></div>';
    }

    h += '</div>'; // right col
    h += '</div>'; // columns
    h += '</div>'; // intel-view

    container.innerHTML = h;
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: add Intelligence tab to main navigation with full dashboard view"
```

---

## Task 5: Add CSS Styles

**Files:**
- Modify: `nbi_project_dashboard.html` (CSS section)

- [ ] **Step 1: Add the intelligence CSS**

Find the CSS section in nbi_project_dashboard.html (inside `<style>` tags). Add at the end of the existing styles:

```css
/* === INTELLIGENCE === */
.cc-intel { padding: 16px; }
.cc-intel-brief, .cc-intel-banks, .cc-intel-research, .cc-intel-pipeline {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; overflow: hidden;
}
.cc-intel-hdr { padding: 12px 16px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; }
.cc-intel-title { font-size: 15px; font-weight: 600; }
.cc-intel-date { font-size: 12px; color: var(--text-muted); }
.cc-intel-stale { color: var(--warning); font-weight: 600; }
.cc-intel-section { padding: 10px 16px; border-bottom: 1px solid var(--border); }
.cc-intel-section:last-child { border-bottom: none; }
.cc-intel-section.collapsed .cc-intel-section-body { display: none; }
.cc-intel-section.collapsed .cc-intel-arrow { transform: rotate(-90deg); display: inline-block; }
.cc-intel-section-hdr { cursor: pointer; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.cc-intel-arrow { font-size: 10px; color: var(--text-muted); transition: transform 0.15s; display: inline-block; }
.cc-intel-count { font-size: 11px; color: var(--text-secondary); font-weight: 400; }
.cc-intel-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--warning); display: inline-block; }
.cc-intel-section-body ul { list-style: none; padding: 8px 0 0 18px; }
.cc-intel-section-body li { font-size: 13px; color: var(--text-secondary); padding: 3px 0; line-height: 1.4; }
.cc-intel-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.cc-intel-table th { text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
.cc-intel-table td { padding: 8px 12px; border-bottom: 1px solid rgba(42,46,61,0.5); }
.cc-intel-table tr:hover { background: var(--bg-hover, #242838); }
.cc-intel-bar { width: 60px; height: 5px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 4px; }
.cc-intel-bar-fill { height: 100%; border-radius: 3px; }
.cc-intel-status--fresh { color: var(--success); font-weight: 600; font-size: 12px; }
.cc-intel-status--stale { color: var(--danger); font-weight: 600; font-size: 12px; }
.cc-intel-status--approaching { color: var(--warning); font-weight: 600; font-size: 12px; }
.cc-intel-total { padding: 10px 16px; font-size: 13px; color: var(--text-secondary); border-top: 1px solid var(--border); }
.cc-intel-research-group { margin-bottom: 12px; }
.cc-intel-research-date { font-size: 12px; font-weight: 600; color: var(--accent); margin-bottom: 6px; }
.cc-intel-domain { font-size: 11px; background: rgba(79,140,255,0.15); color: var(--accent); padding: 1px 8px; border-radius: 8px; margin-left: 6px; }
.cc-intel-finding { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; color: var(--text-secondary); }
.cc-intel-score { font-size: 11px; font-weight: 700; min-width: 24px; height: 18px; border-radius: 3px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.cc-intel-score--high { background: rgba(52,211,153,0.15); color: var(--success); }
.cc-intel-score--mid { background: rgba(79,140,255,0.15); color: var(--accent); }
.cc-intel-sources { padding: 0; }
.cc-intel-source { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid rgba(42,46,61,0.4); }
.cc-intel-source:last-child { border-bottom: none; }
.cc-intel-source-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.cc-intel-dot--green { background: var(--success); }
.cc-intel-dot--amber { background: var(--warning); }

/* Intelligence tab (main nav) */
.intel-view { padding: 0; }
.intel-kpis { display: flex; gap: 20px; padding: 16px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 16px; }
.intel-kpi { text-align: center; flex: 1; }
.intel-kpi-value { font-size: 22px; font-weight: 700; }
.intel-kpi-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.3px; }
.intel-bank-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.intel-bank-table th { text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid var(--border); }
.intel-bank-table td { padding: 10px 14px; border-bottom: 1px solid rgba(42,46,61,0.5); }
.intel-bank-table tr:hover { background: var(--bg-hover, #242838); }
.intel-bank-name { color: var(--text-primary); }
.intel-bank-slug { font-size: 11px; color: var(--text-muted); font-family: 'SF Mono', Consolas, monospace; }
.intel-cap-bar { width: 80px; height: 6px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 6px; }
.intel-cap-fill { height: 100%; border-radius: 3px; }
.intel-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
.intel-status--fresh { background: rgba(52,211,153,0.15); color: var(--success); }
.intel-status--stale { background: rgba(248,113,113,0.15); color: var(--danger); }
.intel-status--approaching { background: rgba(251,191,36,0.15); color: var(--warning); }
.intel-columns { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
.intel-right-col { display: flex; flex-direction: column; gap: 16px; }
.intel-research-group { margin-bottom: 14px; padding-bottom: 14px; border-bottom: 1px solid var(--border); }
.intel-research-group:last-child { border-bottom: none; }
.intel-research-date { font-size: 12px; font-weight: 600; color: var(--accent); margin-bottom: 6px; }
.intel-domain-badge { font-size: 11px; background: rgba(79,140,255,0.15); color: var(--accent); padding: 1px 8px; border-radius: 8px; margin-left: 6px; }
.intel-finding { display: flex; align-items: flex-start; gap: 8px; padding: 6px 0; }
.intel-score { font-size: 11px; font-weight: 700; min-width: 26px; height: 20px; border-radius: 4px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.intel-score--high { background: rgba(52,211,153,0.15); color: var(--success); }
.intel-score--mid { background: rgba(79,140,255,0.15); color: var(--accent); }
.intel-finding-text { font-size: 13px; color: var(--text-secondary); }
.intel-source-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 13px; border-bottom: 1px solid rgba(42,46,61,0.4); }
.intel-source-row:last-child { border-bottom: none; }
.intel-source-name { font-weight: 500; }
.intel-source-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.intel-dot--green { background: var(--success); }
.intel-dot--amber { background: var(--warning); }
.intel-pending-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600; background: rgba(251,191,36,0.15); color: var(--warning); }
.intel-pending-item { padding: 8px 0; font-size: 13px; color: var(--text-secondary); border-bottom: 1px solid rgba(42,46,61,0.4); }
.intel-pending-item:last-child { border-bottom: none; }
@media (max-width: 900px) { .intel-columns { grid-template-columns: 1fr; } }
```

- [ ] **Step 2: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: add intelligence CSS styles for CC Intel tab and main Intelligence tab"
```

---

## Task 6: Verify End-to-End

- [ ] **Step 1: Start the server**

```bash
cd dashboard-server && npm start
```

- [ ] **Step 2: Verify API endpoints**

```bash
curl http://localhost:8888/api/intelligence/brief
curl http://localhost:8888/api/intelligence/banks
curl http://localhost:8888/api/intelligence/research?limit=5
curl http://localhost:8888/api/intelligence/pipeline
```

Each should return JSON. Brief should have `generated`, `sections`, `stale` fields. Banks should be an array of 7 objects. Research should have entries with findings arrays. Pipeline should have sources array.

- [ ] **Step 3: Verify in browser**

Open `http://localhost:8888/nbi_project_dashboard.html`. Log in as Glen (admin).

Check:
1. Command Centre > Intel tab shows the brief card with collapsible sections, bank health table, research findings, and pipeline activity
2. Main nav shows "Intelligence" tab (admin only)
3. Intelligence tab shows KPI strip, full bank health table with capacity bars, research findings with scores, pipeline sources with status dots, pending actions

- [ ] **Step 4: Run existing tests to confirm no regressions**

```bash
npm test
```

All 396+ tests should pass.

- [ ] **Step 5: Commit verification**

```bash
git add -A
git commit -m "verify: intelligence dashboard renders correctly in CC and main nav"
```
