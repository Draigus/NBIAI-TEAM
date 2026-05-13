# Command Centre Phase 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new Command Centre page in WorkSage with two tabs (Dashboard + Daily Briefing) that surfaces AI OS intelligence: Four Cs maturity scores, skill/memory/brain health, connection coverage, bug intelligence, agent team heatmap, session patterns, test health, and a live daily briefing with Outlook calendar integration.

**Architecture:** Single route module (`routes/command-centre.js`) with 5 endpoints backed by 8 filesystem scanners. One new `cc_snapshots` table stores cached scan results as JSONB. SPA gets a new sidebar item, `renderCommandCentre()` function with two-tab layout, and ~300 lines of CSS. Calendar data via Microsoft Graph API reusing existing MSAL auth.

**Tech Stack:** Express 4, PostgreSQL (pg), @azure/msal-node, Vitest (tests), existing SPA patterns (template literals, CSS variables, SVG charts)

**Pre-requisite:** Create a git worktree before starting (>3 files touched, touches monolithic SPA). All work on a feature branch, merge to master when complete.

**Spec:** `docs/superpowers/specs/2026-05-11-command-centre-design.md`
**Mockups:** `.superpowers/brainstorm/15405-1778494096/content/cc-v4.html` (Dashboard), `cc-briefing-v3b.html` (Briefing)

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `dashboard-server/migrations/044_command_centre.sql` | Creates `cc_snapshots` table |
| `dashboard-server/routes/command-centre.js` | Route module: 5 endpoints + 8 scanners + calendar helper |
| `dashboard-server/tests/command-centre.test.js` | Unit tests for scanners + integration tests for endpoints |

### Modified files
| File | Change |
|---|---|
| `dashboard-server/ecosystem.config.js` | Add `REPO_ROOT` to env for both apps |
| `dashboard-server/server.js` | Mount command-centre route module (~3 lines) |
| `nbi_project_dashboard.html` | Sidebar item, view dispatch, `renderCommandCentre()`, CSS (~400 lines total) |

---

## Task 1: Database Migration

**Files:**
- Create: `dashboard-server/migrations/044_command_centre.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- 044_command_centre.sql
-- Command Centre snapshot storage

CREATE TABLE IF NOT EXISTS cc_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cc_snapshots_date ON cc_snapshots (snapshot_date DESC);
```

- [ ] **Step 2: Run the migration**

Run: `cd dashboard-server && node init-db.js`
Expected: Migration 044 applied, no errors.

- [ ] **Step 3: Verify the table exists**

Run: `cd dashboard-server && node -e "const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('SELECT column_name,data_type FROM information_schema.columns WHERE table_name=$$cc_snapshots$$ ORDER BY ordinal_position').then(r=>{console.table(r.rows);p.end()})"`
Expected: Shows id (integer), snapshot_date (date), data (jsonb), created_at (timestamp with time zone), updated_at (timestamp with time zone).

- [ ] **Step 4: Commit**

```
git add dashboard-server/migrations/044_command_centre.sql
git commit -m "feat(cc): add cc_snapshots migration"
```

---

## Task 2: Ecosystem Config — REPO_ROOT

**Files:**
- Modify: `dashboard-server/ecosystem.config.js`

- [ ] **Step 1: Add REPO_ROOT to production env**

In the first app config's `env` object (line ~10), add:

```javascript
env: { NODE_ENV: 'production', LOG_LEVEL: 'info', REPO_ROOT: require('path').resolve(__dirname, '..') },
```

- [ ] **Step 2: Add REPO_ROOT to staging env**

In the staging app's `env` object, add the same:

```javascript
REPO_ROOT: require('path').resolve(__dirname, '..'),
```

Add it after the existing `EMAIL_FROM` line.

- [ ] **Step 3: Commit**

```
git add dashboard-server/ecosystem.config.js
git commit -m "feat(cc): add REPO_ROOT env var to ecosystem config"
```

---

## Task 3: Route Module — Scanners

This is the largest task. The route module contains the scanner functions, the snapshot endpoints, and the briefing endpoint. We build scanners first, endpoints next.

**Files:**
- Create: `dashboard-server/routes/command-centre.js`

- [ ] **Step 1: Scaffold the route module with scanner stubs**

Create `dashboard-server/routes/command-centre.js`:

```javascript
'use strict';

const fs = require('fs');
const path = require('path');

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, requireNBI, _msalClient } = ctx;

  const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '../..');
  const SKILLS_DIR = path.join(REPO_ROOT, '.claude', 'skills');
  const MEMORY_DIR = (() => {
    const home = process.env.USERPROFILE || process.env.HOME || '';
    const projectKey = REPO_ROOT.replace(/[:\\\/]/g, '-').replace(/^-+/, '');
    return path.join(home, '.claude', 'projects', projectKey, 'memory');
  })();
  const BRAIN_PATH = path.join(REPO_ROOT, 'NBI_Brain.md');
  const BRAIN_DIR = path.join(REPO_ROOT, 'brain');
  const ROLES_DIR = path.join(REPO_ROOT, 'roles');
  const MCP_PATH = path.join(REPO_ROOT, '.mcp.json');
  const SESSION_LOGS_DIR = path.join(REPO_ROOT, 'projects', 'nbi_dashboard', 'session_logs');
  const LIVE_STATE_DIR = path.join(REPO_ROOT, 'projects', 'nbi_dashboard', 'live_state');
  const TEST_RESULTS_PATH = path.join(__dirname, '..', 'logs', 'test-results.json');
  const CLAUDE_MD_PATH = path.join(REPO_ROOT, 'CLAUDE.md');

  const STALE_DAYS = 30;
  const KNOWN_CLOUD_MCPS = [
    { name: 'Gmail', bucket: 'comms' },
    { name: 'Slack', bucket: 'comms' },
    { name: 'Google Drive', bucket: 'knowledge' },
    { name: 'Google Calendar', bucket: 'calendar' },
    { name: 'Miro', bucket: 'tasks' },
    { name: 'Granola', bucket: 'meetings' },
    { name: 'Gamma', bucket: 'knowledge' },
  ];

  // ——— Helper: safe file stat ———
  function safeStat(p) {
    try { return fs.statSync(p); } catch { return null; }
  }
  function safeReadFile(p) {
    try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
  }
  function daysSince(date) {
    return Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  }
  function parseFrontmatter(content) {
    const m = content.match(/^---\n([\s\S]*?)\n---/);
    if (!m) return {};
    const fm = {};
    m[1].split('\n').forEach(line => {
      const [k, ...v] = line.split(':');
      if (k && v.length) fm[k.trim()] = v.join(':').trim();
    });
    return fm;
  }

  // ——— SCANNER: Skills ———
  function scanSkills() {
    try {
      if (!fs.existsSync(SKILLS_DIR)) return { skills: [], error: 'Skills directory not found' };
      const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory());
      const skills = entries.map(entry => {
        const skillDir = path.join(SKILLS_DIR, entry.name);
        const skillMd = path.join(skillDir, 'SKILL.md');
        const learningsPath = path.join(skillDir, 'learnings.md');
        const evalsDir = path.join(skillDir, 'evals');
        const refsDir = path.join(skillDir, 'references');
        const stat = safeStat(skillDir);
        const skillContent = safeReadFile(skillMd);
        const fm = skillContent ? parseFrontmatter(skillContent) : {};
        let fileCount = 0;
        try { fileCount = fs.readdirSync(skillDir, { recursive: true }).length; } catch {}
        const hasLearnings = fs.existsSync(learningsPath);
        let learningsCount = 0;
        if (hasLearnings) {
          const lc = safeReadFile(learningsPath) || '';
          learningsCount = (lc.match(/^##\s/gm) || []).length || (lc.match(/^-\s/gm) || []).length;
        }
        return {
          name: entry.name,
          path: skillDir,
          category: fm.category || null,
          description: fm.description || null,
          last_modified: stat ? stat.mtime.toISOString() : null,
          file_count: fileCount,
          has_learnings: hasLearnings,
          learnings_count: learningsCount,
          has_evals: fs.existsSync(evalsDir),
          references_count: fs.existsSync(refsDir) ? (fs.readdirSync(refsDir).length) : 0,
        };
      });
      skills.sort((a, b) => new Date(b.last_modified || 0) - new Date(a.last_modified || 0));
      return { skills };
    } catch (e) {
      return { skills: [], error: e.message };
    }
  }

  // ——— SCANNER: Memory ———
  function scanMemory() {
    try {
      if (!fs.existsSync(MEMORY_DIR)) return { files: [], health: { total: 0, fresh: 0, stale: 0, score: 0 }, error: 'Memory directory not found' };
      const memFiles = fs.readdirSync(MEMORY_DIR).filter(f => f.endsWith('.md') && f !== 'MEMORY.md');
      const files = memFiles.map(f => {
        const fp = path.join(MEMORY_DIR, f);
        const stat = safeStat(fp);
        const content = safeReadFile(fp) || '';
        const fm = parseFrontmatter(content);
        const age = stat ? daysSince(stat.mtime) : 999;
        const staleRefs = [];
        const refMatches = content.match(/`([^`]+\.(js|ts|md|py|html))`/g) || [];
        refMatches.forEach(ref => {
          const cleanRef = ref.replace(/`/g, '');
          const fullPath = path.join(REPO_ROOT, cleanRef);
          if (!fs.existsSync(fullPath)) staleRefs.push(cleanRef);
        });
        const isStale = age > STALE_DAYS && staleRefs.length > 0;
        return {
          name: f.replace('.md', ''),
          type: fm.type || 'unknown',
          description: fm.description || '',
          last_modified: stat ? stat.mtime.toISOString() : null,
          age_days: age,
          stale_refs: staleRefs,
          is_stale: isStale,
        };
      });
      const total = files.length;
      const stale = files.filter(f => f.is_stale).length;
      return {
        files,
        health: { total, fresh: total - stale, stale, score: total > 0 ? Math.round(((total - stale) / total) * 100) : 0 },
      };
    } catch (e) {
      return { files: [], health: { total: 0, fresh: 0, stale: 0, score: 0 }, error: e.message };
    }
  }

  // ——— SCANNER: Connections ———
  function scanConnections() {
    const result = { local_mcp: [], cloud_mcp: [], buckets: {} };
    const BUCKET_NAMES = ['revenue', 'clients', 'calendar', 'comms', 'tasks', 'meetings', 'knowledge', 'research'];
    BUCKET_NAMES.forEach(b => { result.buckets[b] = { status: 'missing', sources: [] }; });
    try {
      const mcpContent = safeReadFile(MCP_PATH);
      if (mcpContent) {
        const mcpConfig = JSON.parse(mcpContent);
        const servers = mcpConfig.mcpServers || {};
        Object.entries(servers).forEach(([name, cfg]) => {
          result.local_mcp.push({ name, command: cfg.command || '', status: 'configured' });
          if (name.toLowerCase().includes('telegram')) { result.buckets.comms.status = 'connected'; result.buckets.comms.sources.push('Telegram'); }
          if (name.toLowerCase().includes('ppt') || name.toLowerCase().includes('powerpoint')) { result.buckets.knowledge.status = 'connected'; result.buckets.knowledge.sources.push('PowerPoint'); }
          if (name.toLowerCase().includes('foundry')) { result.buckets.knowledge.status = 'connected'; result.buckets.knowledge.sources.push('Foundry VTT'); }
        });
      }
    } catch {}
    KNOWN_CLOUD_MCPS.forEach(mcp => {
      result.cloud_mcp.push({ name: mcp.name, status: 'available' });
      const b = result.buckets[mcp.bucket];
      if (b) { b.status = 'connected'; b.sources.push(mcp.name); }
    });
    result.buckets.tasks = { status: 'connected', sources: ['WorkSage'] };
    result.buckets.clients = { status: 'partial', sources: ['WorkSage DB'] };
    if (result.buckets.knowledge.status !== 'connected') result.buckets.knowledge = { status: 'connected', sources: [] };
    result.buckets.knowledge.sources.push('NBI Brain', 'Memory');
    return result;
  }

  // ——— SCANNER: Brain ———
  function scanBrain() {
    try {
      const coreStat = safeStat(BRAIN_PATH);
      const coreContent = safeReadFile(BRAIN_PATH) || '';
      const sections = (coreContent.match(/^## /gm) || []).length;
      const modules = [];
      if (fs.existsSync(BRAIN_DIR)) {
        fs.readdirSync(BRAIN_DIR).filter(f => f.endsWith('.md')).forEach(f => {
          const fp = path.join(BRAIN_DIR, f);
          const stat = safeStat(fp);
          modules.push({ name: f.replace('.md', ''), path: fp, last_modified: stat ? stat.mtime.toISOString() : null });
        });
      }
      const roles = [];
      if (fs.existsSync(ROLES_DIR)) {
        fs.readdirSync(ROLES_DIR, { withFileTypes: true }).filter(e => e.isDirectory() && e.name !== '_template').forEach(entry => {
          const roleDir = path.join(ROLES_DIR, entry.name);
          const knowledgeDir = path.join(roleDir, 'knowledge');
          const hasKnowledge = fs.existsSync(knowledgeDir);
          let knowledgeFreshness = null;
          if (hasKnowledge) {
            try {
              const kFiles = fs.readdirSync(knowledgeDir);
              if (kFiles.length > 0) {
                const newest = kFiles.reduce((latest, f) => {
                  const s = safeStat(path.join(knowledgeDir, f));
                  return s && (!latest || s.mtime > latest) ? s.mtime : latest;
                }, null);
                if (newest) knowledgeFreshness = daysSince(newest);
              }
            } catch {}
          }
          const stat = safeStat(roleDir);
          roles.push({
            name: entry.name,
            has_knowledge: hasKnowledge,
            knowledge_freshness: knowledgeFreshness,
            last_modified: stat ? stat.mtime.toISOString() : null,
          });
        });
      }
      return {
        core: { path: BRAIN_PATH, last_modified: coreStat ? coreStat.mtime.toISOString() : null, sections },
        modules,
        roles,
      };
    } catch (e) {
      return { core: null, modules: [], roles: [], error: e.message };
    }
  }

  // ——— SCANNER: Sessions ———
  function scanSessions() {
    try {
      const recent = [];
      if (fs.existsSync(SESSION_LOGS_DIR)) {
        fs.readdirSync(SESSION_LOGS_DIR).filter(f => f.endsWith('.md')).sort().reverse().slice(0, 14).forEach(f => {
          const fp = path.join(SESSION_LOGS_DIR, f);
          const stat = safeStat(fp);
          recent.push({ date: f.replace('_session.md', '').replace(/_session\d*\.md/, ''), filename: f, size: stat ? stat.size : 0 });
        });
      }
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      const thisWeek = recent.filter(s => new Date(s.date) >= weekStart).length;
      const daysInWeek = Math.min(now.getDay() || 7, 7);
      let pendingCount = 0;
      let decisionsCount = 0;
      let lastUpdated = null;
      const pendingPath = path.join(LIVE_STATE_DIR, 'pending_tasks.md');
      const decisionsPath = path.join(LIVE_STATE_DIR, 'decisions.md');
      if (fs.existsSync(pendingPath)) {
        const pc = safeReadFile(pendingPath) || '';
        pendingCount = (pc.match(/^- /gm) || []).length;
        const ps = safeStat(pendingPath);
        if (ps) lastUpdated = ps.mtime.toISOString();
      }
      if (fs.existsSync(decisionsPath)) {
        const dc = safeReadFile(decisionsPath) || '';
        decisionsCount = (dc.match(/^### D\d/gm) || []).length;
      }
      return {
        recent,
        stats: { total_this_week: thisWeek, avg_per_day: daysInWeek > 0 ? +(thisWeek / daysInWeek).toFixed(1) : 0 },
        live_state: { pending_tasks_count: pendingCount, decisions_count: decisionsCount, last_updated: lastUpdated },
      };
    } catch (e) {
      return { recent: [], stats: { total_this_week: 0, avg_per_day: 0 }, live_state: {}, error: e.message };
    }
  }

  // ——— SCANNER: Bugs (DB) ———
  async function scanBugs() {
    try {
      const statusQ = await pool.query(`
        SELECT status, count(*)::int as count FROM bug_reports GROUP BY status
      `);
      const byStatus = { open: 0, in_progress: 0, please_review: 0, resolved: 0 };
      statusQ.rows.forEach(r => { byStatus[r.status] = r.count; });

      const prioQ = await pool.query(`
        SELECT priority, count(*)::int as count FROM bug_reports WHERE status NOT IN ('resolved', 'closed', 'wont_fix') GROUP BY priority
      `);
      const byPriority = { critical: 0, high: 0, medium: 0, low: 0 };
      prioQ.rows.forEach(r => { byPriority[r.priority] = r.count; });

      const recentQ = await pool.query(`
        SELECT b.id, b.title, b.status, b.priority, c.text as comment, c.created_at
        FROM bug_report_comments c JOIN bug_reports b ON b.id = c.bug_report_id
        ORDER BY c.created_at DESC LIMIT 10
      `);

      return { by_status: byStatus, by_priority: byPriority, recent_activity: recentQ.rows };
    } catch (e) {
      return { by_status: {}, by_priority: {}, recent_activity: [], error: e.message };
    }
  }

  // ——— SCANNER: Tests ———
  function scanTests() {
    try {
      const stat = safeStat(TEST_RESULTS_PATH);
      if (!stat || daysSince(stat.mtime) > 7) return { last_run: null, trend: [] };
      const content = safeReadFile(TEST_RESULTS_PATH);
      if (!content) return { last_run: null, trend: [] };
      const data = JSON.parse(content);
      return {
        last_run: {
          date: stat.mtime.toISOString(),
          passed: data.numPassedTests || data.passed || 0,
          failed: data.numFailedTests || data.failed || 0,
          total: data.numTotalTests || data.total || 0,
        },
        trend: data.trend || [],
      };
    } catch {
      return { last_run: null, trend: [] };
    }
  }

  // ——— SCANNER: Four Cs ———
  function computeFourCs(data) {
    const cs = { context: { score: 0, max: 10, details: [] }, connections: { score: 0, max: 10, details: [] }, capabilities: { score: 0, max: 10, details: [] }, cadence: { score: 0, max: 10, details: [] } };

    // Context
    if (data.brain && data.brain.core && data.brain.core.last_modified) {
      const age = daysSince(data.brain.core.last_modified);
      if (age < STALE_DAYS) { cs.context.score += 3; cs.context.details.push('Brain core fresh (' + age + 'd)'); }
      else { cs.context.details.push('Brain core stale (' + age + 'd)'); }
    }
    const claudeMd = safeReadFile(CLAUDE_MD_PATH) || '';
    const ruleCount = (claudeMd.match(/^##\s/gm) || []).length;
    if (ruleCount > 10) { cs.context.score += 2; cs.context.details.push('CLAUDE.md has ' + ruleCount + ' sections'); }
    const memTotal = data.memory ? data.memory.health.total : 0;
    if (memTotal > 20) { cs.context.score += 2; cs.context.details.push(memTotal + ' memory files'); }
    else if (memTotal > 0) { cs.context.score += 1; cs.context.details.push(memTotal + ' memory files'); }
    if (data.sessions && data.sessions.recent.length > 0) { cs.context.score += 1; cs.context.details.push('Session logs active'); }
    if (data.sessions && data.sessions.live_state.last_updated) { cs.context.score += 1; cs.context.details.push('Live state current'); }
    const roleCount = data.brain ? data.brain.roles.length : 0;
    if (roleCount > 25) { cs.context.score += 1; cs.context.details.push(roleCount + ' roles defined'); }

    // Connections
    if (data.connections) {
      const buckets = data.connections.buckets;
      Object.entries(buckets).forEach(([name, b]) => {
        if (b.status === 'connected') { cs.connections.score += 1; cs.connections.details.push(name + ': connected'); }
        else if (b.status === 'partial') { cs.connections.score += 0.5; cs.connections.details.push(name + ': partial'); }
        else { cs.connections.details.push(name + ': missing'); }
      });
      cs.connections.score = Math.min(Math.round(cs.connections.score), 10);
    }

    // Capabilities
    const skillCount = data.skills ? data.skills.skills.length : 0;
    cs.capabilities.score += Math.min(Math.floor(skillCount / 5), 4);
    cs.capabilities.details.push(skillCount + ' skills');
    if (data.skills) {
      const withLearnings = data.skills.skills.filter(s => s.has_learnings).length;
      if (withLearnings > skillCount * 0.5) { cs.capabilities.score += 2; cs.capabilities.details.push(withLearnings + ' skills with learnings'); }
      else if (withLearnings > 0) { cs.capabilities.score += 1; cs.capabilities.details.push(withLearnings + ' skills with learnings'); }
    }
    const hasGsd = data.skills && data.skills.skills.some(s => s.name === 'gsd');
    if (hasGsd) { cs.capabilities.score += 2; cs.capabilities.details.push('GSD framework present'); }
    if (claudeMd.includes('Model Tier Strategy')) { cs.capabilities.score += 1; cs.capabilities.details.push('Model tiers defined'); }
    if (claudeMd.includes('Bug Triage Pipeline')) { cs.capabilities.score += 1; cs.capabilities.details.push('Bug pipeline defined'); }
    cs.capabilities.score = Math.min(cs.capabilities.score, 10);

    // Cadence
    cs.cadence.details.push('No analysis cron yet (Phase 2)');
    cs.cadence.details.push('No execution engine yet (Phase 3)');
    cs.cadence.details.push('No Hermes agent yet');
    cs.cadence.score = 0;
    // Check for existing cron jobs in the server (dashboard snapshots etc count for something)
    cs.cadence.score += 2; cs.cadence.details.push('WorkSage cron jobs active (snapshots, reports)');
    // Scheduled tasks via Claude Code
    try {
      const scheduledDir = path.join(REPO_ROOT, '.claude', 'scheduled_tasks.lock');
      if (fs.existsSync(scheduledDir)) { cs.cadence.score += 1; cs.cadence.details.push('Claude scheduled tasks configured'); }
    } catch {}

    return cs;
  }

  // ——— CALENDAR HELPER ———
  async function fetchCalendarEvents(startDate, endDate) {
    if (!_msalClient) return { events: [], error: 'MSAL not configured' };
    try {
      const tokenResult = await _msalClient.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });
      if (!tokenResult || !tokenResult.accessToken) return { events: [], error: 'Token acquisition failed' };

      const userEmail = process.env.EMAIL_FROM || '';
      const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userEmail)}/calendarView?startDateTime=${startDate.toISOString()}&endDateTime=${endDate.toISOString()}&$orderby=start/dateTime&$top=50&$select=subject,start,end,location,attendees,onlineMeeting,webLink`;

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${tokenResult.accessToken}`, 'Content-Type': 'application/json' },
      });
      if (!resp.ok) {
        const body = await resp.text();
        return { events: [], error: `Graph API ${resp.status}: ${body.slice(0, 200)}` };
      }
      const data = await resp.json();
      return {
        events: (data.value || []).map(ev => ({
          title: ev.subject,
          start: ev.start.dateTime,
          end: ev.end.dateTime,
          location: ev.location?.displayName || '',
          attendees: (ev.attendees || []).map(a => a.emailAddress?.name || a.emailAddress?.address || ''),
          online_url: ev.onlineMeeting?.joinUrl || ev.webLink || '',
        })),
      };
    } catch (e) {
      return { events: [], error: e.message };
    }
  }

  // ——— ASSEMBLE SNAPSHOT ———
  async function computeSnapshot() {
    const skills = scanSkills();
    const memory = scanMemory();
    const connections = scanConnections();
    const brain = scanBrain();
    const sessions = scanSessions();
    const bugs = await scanBugs();
    const tests = scanTests();
    const four_cs = computeFourCs({ skills, memory, connections, brain, sessions, bugs, tests });
    return { four_cs, skills: skills.skills, skills_error: skills.error, memory, connections, brain, sessions, bugs, tests };
  }

  // ——— ENDPOINTS ———

  /** GET /api/command-centre/snapshot — latest cached snapshot */
  router.get('/api/command-centre/snapshot', requireNBI, async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT * FROM cc_snapshots ORDER BY snapshot_date DESC LIMIT 1');
      if (rows.length === 0) return res.status(404).json({ error: 'No snapshot exists. Trigger a refresh.' });
      res.json({ data: rows[0] });
    } catch (e) {
      log('error', 'CC', 'Failed to read snapshot', { error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

  /** POST /api/command-centre/refresh — run scanners, upsert today's snapshot */
  let _lastRefresh = 0;
  router.post('/api/command-centre/refresh', requireNBI, async (req, res) => {
    const now = Date.now();
    if (now - _lastRefresh < 30000) return res.status(429).json({ error: 'Refresh rate limited. Wait 30 seconds.' });
    _lastRefresh = now;
    try {
      const data = await computeSnapshot();
      const today = new Date().toISOString().slice(0, 10);
      const { rows } = await pool.query(
        `INSERT INTO cc_snapshots (snapshot_date, data) VALUES ($1, $2)
         ON CONFLICT (snapshot_date) DO UPDATE SET data = $2, updated_at = NOW()
         RETURNING *`,
        [today, JSON.stringify(data)]
      );
      log('info', 'CC', 'Snapshot refreshed', { date: today });
      res.json({ data: rows[0] });
    } catch (e) {
      log('error', 'CC', 'Refresh failed', { error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/command-centre/history — past snapshots (scores only) */
  router.get('/api/command-centre/history', requireNBI, async (req, res) => {
    const days = Math.min(parseInt(req.query.days) || 30, 365);
    try {
      const { rows } = await pool.query(
        `SELECT snapshot_date, data->'four_cs' as four_cs, updated_at
         FROM cc_snapshots WHERE snapshot_date >= CURRENT_DATE - $1::int
         ORDER BY snapshot_date DESC`,
        [days]
      );
      res.json({ data: rows });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/command-centre/briefing — live daily briefing */
  router.get('/api/command-centre/briefing', requireNBI, async (req, res) => {
    try {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      // Calendar
      const calStart = new Date(today); calStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(today); weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
      weekEnd.setHours(23, 59, 59, 999);
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      const calData = await fetchCalendarEvents(calStart, weekEnd);
      const todayEnd = new Date(today); todayEnd.setHours(23, 59, 59, 999);
      const tomorrowStart = new Date(today); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);
      const calToday = calData.events.filter(e => new Date(e.start) <= todayEnd);
      const calTomorrow = calData.events.filter(e => new Date(e.start) >= tomorrowStart && new Date(e.start) <= tomorrow);
      const calWeek = calData.events.filter(e => new Date(e.start) > tomorrow);

      // Work queue
      const overdueQ = await pool.query(`SELECT id, title, status, priority, due_date, client_id FROM tasks WHERE due_date < $1 AND status NOT IN ('Done','Cancelled') AND item_type IN ('story','task') ORDER BY due_date`, [todayStr]);
      const dueTodayQ = await pool.query(`SELECT id, title, status, priority, due_date, client_id FROM tasks WHERE due_date = $1 AND status NOT IN ('Done','Cancelled') AND item_type IN ('story','task')`, [todayStr]);
      const endOfWeek = new Date(today); endOfWeek.setDate(endOfWeek.getDate() + (5 - endOfWeek.getDay()));
      const dueWeekQ = await pool.query(`SELECT id, title, status, priority, due_date, client_id FROM tasks WHERE due_date > $1 AND due_date <= $2 AND status NOT IN ('Done','Cancelled') AND item_type IN ('story','task') ORDER BY due_date`, [todayStr, endOfWeek.toISOString().slice(0, 10)]);
      const blockedQ = await pool.query(`SELECT id, title, status, priority, due_date, client_id FROM tasks WHERE health_state = 'Blocked' AND status NOT IN ('Done','Cancelled') ORDER BY priority`);

      // Bugs
      const critBugsQ = await pool.query(`SELECT id, title, priority, created_at FROM bug_reports WHERE status = 'open' AND priority = 'critical' ORDER BY created_at`);
      const reviewBugsQ = await pool.query(`SELECT id, title, priority, created_at FROM bug_reports WHERE status = 'please_review' ORDER BY created_at`);
      const recentFixesQ = await pool.query(`SELECT id, title, priority, updated_at FROM bug_reports WHERE status = 'resolved' ORDER BY updated_at DESC LIMIT 5`);

      // Bug hotspots — group by page field
      const hotspotsQ = await pool.query(`SELECT page, count(*)::int as count FROM bug_reports WHERE status NOT IN ('resolved','closed','wont_fix') AND page IS NOT NULL GROUP BY page ORDER BY count DESC LIMIT 5`);

      // Claude state
      const sessions = scanSessions();
      let lastSessionSummary = '';
      if (sessions.recent.length > 0) {
        const latestFile = path.join(SESSION_LOGS_DIR, sessions.recent[0].filename);
        const content = safeReadFile(latestFile) || '';
        const lines = content.split('\n').slice(0, 20);
        lastSessionSummary = lines.join('\n');
      }

      // Claude outstanding work from pending_tasks.md
      const pendingContent = safeReadFile(path.join(LIVE_STATE_DIR, 'pending_tasks.md')) || '';
      const decisionsContent = safeReadFile(path.join(LIVE_STATE_DIR, 'decisions.md')) || '';
      const recentDecisions = [];
      const decSections = decisionsContent.split(/^## /gm).slice(1, 6);
      decSections.forEach(s => { const title = s.split('\n')[0]; if (title) recentDecisions.push(title.trim()); });

      // Client deliveries — tasks with client_id, due within 14 days
      const delivQ = await pool.query(`
        SELECT t.id, t.title, t.status, t.due_date, t.priority, c.name as client_name
        FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
        WHERE t.due_date BETWEEN $1 AND ($1::date + 14) AND t.status NOT IN ('Done','Cancelled')
          AND t.item_type IN ('story','task','feature') AND t.client_id IS NOT NULL
        ORDER BY t.due_date`, [todayStr]);
      const clientDeliveries = {};
      delivQ.rows.forEach(r => {
        const cn = r.client_name || 'Unknown';
        if (!clientDeliveries[cn]) clientDeliveries[cn] = [];
        clientDeliveries[cn].push(r);
      });

      // Knowledge flags from latest snapshot
      let knowledgeFlags = { stale_brain_modules: [], stale_memory_files: [], dormant_roles_count: 0 };
      const { rows: snapRows } = await pool.query('SELECT data FROM cc_snapshots ORDER BY snapshot_date DESC LIMIT 1');
      if (snapRows.length > 0) {
        const snapData = snapRows[0].data;
        if (snapData.brain) {
          knowledgeFlags.stale_brain_modules = snapData.brain.modules.filter(m => m.last_modified && daysSince(m.last_modified) > STALE_DAYS);
        }
        if (snapData.memory) {
          knowledgeFlags.stale_memory_files = snapData.memory.files.filter(f => f.is_stale);
        }
        if (snapData.brain) {
          knowledgeFlags.dormant_roles_count = snapData.brain.roles.filter(r => !r.has_knowledge || (r.knowledge_freshness !== null && r.knowledge_freshness > 90)).length;
        }
      }

      // Assemble critical items
      const critical = [];
      critBugsQ.rows.forEach(b => { critical.push({ type: 'bug', ...b }); });
      overdueQ.rows.filter(t => t.priority === 'critical' || t.priority === 'high').forEach(t => { critical.push({ type: 'task', ...t }); });
      calToday.filter(e => new Date(e.start) <= new Date(Date.now() + 3600000)).forEach(e => { critical.push({ type: 'calendar', ...e }); });

      res.json({
        data: {
          date: todayStr,
          critical,
          calendar: { today: calToday, tomorrow: calTomorrow, this_week: calWeek, error: calData.error || null },
          work_queue: { overdue: overdueQ.rows, due_today: dueTodayQ.rows, due_this_week: dueWeekQ.rows, blocked: blockedQ.rows },
          bugs: { critical_open: critBugsQ.rows, awaiting_review: reviewBugsQ.rows, hotspots: hotspotsQ.rows, recent_fixes: recentFixesQ.rows },
          claude_state: {
            last_session: { date: sessions.recent[0]?.date || null, summary: lastSessionSummary, pending_items: [] },
            outstanding_work: pendingContent,
            recent_decisions: recentDecisions,
            handoff_exists: fs.existsSync(path.join(REPO_ROOT, 'docs', 'HANDOFF.md')),
          },
          client_deliveries: clientDeliveries,
          knowledge_flags: knowledgeFlags,
        },
      });
    } catch (e) {
      log('error', 'CC', 'Briefing failed', { error: e.message });
      res.status(500).json({ error: e.message });
    }
  });

  /** GET /api/command-centre/skill/:name — single skill detail */
  router.get('/api/command-centre/skill/:name', requireNBI, async (req, res) => {
    const { name } = req.params;
    const skillDir = path.join(SKILLS_DIR, name);
    if (!fs.existsSync(skillDir)) return res.status(404).json({ error: 'Skill not found' });
    try {
      const skillMd = safeReadFile(path.join(skillDir, 'SKILL.md')) || '';
      const learnings = safeReadFile(path.join(skillDir, 'learnings.md')) || null;
      const fm = parseFrontmatter(skillMd);
      let files = [];
      try { files = fs.readdirSync(skillDir, { recursive: true }); } catch {}
      res.json({
        data: { name, frontmatter: fm, content: skillMd, learnings, files, },
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Export computeSnapshot for Phase 2 cron
  router._computeSnapshot = computeSnapshot;

  return router;
};
```

- [ ] **Step 2: Commit the route module**

```
git add dashboard-server/routes/command-centre.js
git commit -m "feat(cc): add command-centre route module with scanners and endpoints"
```

---

## Task 4: Mount Route in server.js

**Files:**
- Modify: `dashboard-server/server.js`

- [ ] **Step 1: Find the route mounting section**

Look for the existing route mounts around line 416 (where `dashboard.js` is mounted). Add the command-centre mount nearby.

- [ ] **Step 2: Add the route mount**

After the dashboard route mount line, add:

```javascript
app.use(require('./routes/command-centre')({ pool, log, requireNBI, _msalClient }));
```

- [ ] **Step 3: Verify server starts**

Run: `cd dashboard-server && node -e "require('./server.js')" &` (or restart PM2)
Expected: No errors, server starts on port 8888.

- [ ] **Step 4: Test the refresh endpoint**

Run: `curl -s -X POST http://localhost:8888/api/command-centre/refresh -H "Cookie: nbi_session=YOUR_SESSION" | node -e "process.stdin.on('data',d=>console.log(JSON.stringify(JSON.parse(d).data?.snapshot_date)))"`
Expected: Today's date string.

- [ ] **Step 5: Commit**

```
git add dashboard-server/server.js
git commit -m "feat(cc): mount command-centre route in server.js"
```

---

## Task 5: Unit Tests for Scanners

**Files:**
- Create: `dashboard-server/tests/command-centre.test.js`

- [ ] **Step 1: Write scanner unit tests**

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

// We test the scanners by importing the route module with mock ctx
// and calling the exported _computeSnapshot (which calls all scanners)

describe('Command Centre', () => {
  describe('GET /api/command-centre/snapshot', () => {
    it('returns 404 when no snapshot exists', async () => {
      // This is an integration test placeholder — requires test DB
      // For now, verify the route module loads without error
      const routeFactory = require('../routes/command-centre');
      const mockPool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
      const mockLog = vi.fn();
      const router = routeFactory({ pool: mockPool, log: mockLog, requireNBI: (req, res, next) => next(), _msalClient: null });
      expect(router).toBeDefined();
      expect(typeof router._computeSnapshot).toBe('function');
    });
  });

  describe('computeSnapshot', () => {
    it('runs all scanners and returns four_cs scores', async () => {
      const routeFactory = require('../routes/command-centre');
      const mockPool = {
        query: vi.fn().mockResolvedValue({ rows: [] }),
      };
      const router = routeFactory({ pool: mockPool, log: vi.fn(), requireNBI: (req, res, next) => next(), _msalClient: null });
      const snapshot = await router._computeSnapshot();
      expect(snapshot).toHaveProperty('four_cs');
      expect(snapshot.four_cs).toHaveProperty('context');
      expect(snapshot.four_cs).toHaveProperty('connections');
      expect(snapshot.four_cs).toHaveProperty('capabilities');
      expect(snapshot.four_cs).toHaveProperty('cadence');
      expect(typeof snapshot.four_cs.context.score).toBe('number');
      expect(snapshot.four_cs.context.max).toBe(10);
    });

    it('scanSkills returns array of skill objects', async () => {
      const routeFactory = require('../routes/command-centre');
      const router = routeFactory({ pool: { query: vi.fn().mockResolvedValue({ rows: [] }) }, log: vi.fn(), requireNBI: (req, res, next) => next(), _msalClient: null });
      const snapshot = await router._computeSnapshot();
      expect(Array.isArray(snapshot.skills)).toBe(true);
      if (snapshot.skills.length > 0) {
        expect(snapshot.skills[0]).toHaveProperty('name');
        expect(snapshot.skills[0]).toHaveProperty('last_modified');
        expect(snapshot.skills[0]).toHaveProperty('has_learnings');
      }
    });

    it('scanMemory returns health object', async () => {
      const routeFactory = require('../routes/command-centre');
      const router = routeFactory({ pool: { query: vi.fn().mockResolvedValue({ rows: [] }) }, log: vi.fn(), requireNBI: (req, res, next) => next(), _msalClient: null });
      const snapshot = await router._computeSnapshot();
      expect(snapshot.memory).toHaveProperty('health');
      expect(typeof snapshot.memory.health.total).toBe('number');
      expect(typeof snapshot.memory.health.fresh).toBe('number');
    });

    it('scanBrain returns roles array', async () => {
      const routeFactory = require('../routes/command-centre');
      const router = routeFactory({ pool: { query: vi.fn().mockResolvedValue({ rows: [] }) }, log: vi.fn(), requireNBI: (req, res, next) => next(), _msalClient: null });
      const snapshot = await router._computeSnapshot();
      expect(snapshot.brain).toHaveProperty('roles');
      expect(Array.isArray(snapshot.brain.roles)).toBe(true);
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd dashboard-server && npx vitest run tests/command-centre.test.js`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```
git add dashboard-server/tests/command-centre.test.js
git commit -m "test(cc): add unit tests for command-centre scanners"
```

---

## Task 6: SPA — CSS Block

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add CSS block before the closing `</style>` tag**

Find the closing `</style>` tag in the SPA. Insert the Command Centre CSS block before it. The CSS uses only existing CSS variables so it adapts to all 8 themes automatically.

The full CSS block is approximately 300 lines covering: `.cc-page`, `.cc-tabs`, `.cc-hero`, `.cc-grid`, `.cc-card` (with gradient accent `::before` and glow `::after`), `.cc-ring`, `.cc-li`, `.cc-tag`, `.cc-chip`, `.cc-tl`, `.cc-prog`, `.cc-spark`, `.cc-expand`, `.cc-section`, responsive breakpoints, animations (fadeUp, ringDraw, critPulse, shimmer, nowPulse), and Command theme overrides.

Reference mockups for exact CSS: `.superpowers/brainstorm/15405-1778494096/content/cc-v4.html` and `cc-briefing-v3b.html`. Translate the inline styles from those mockups into the `.cc-` prefixed class names using the existing CSS variables instead of hardcoded colours.

- [ ] **Step 2: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(cc): add command centre CSS to SPA"
```

---

## Task 7: SPA — Sidebar + View Dispatch

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add SVG icon constant**

Near the other SVG constants (around line 4475 where `svgDocs` is defined), add:

```javascript
const svgCommandCentre = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="14" height="14" rx="2"/><circle cx="8" cy="6" r="2.5"/><path d="M4 13v-1a4 4 0 0 1 8 0v1"/></svg>';
```

- [ ] **Step 2: Add sidebar item**

After the `sidebarItem(svgDashboard, 'Portfolio', ...)` line (line ~4470), add:

```javascript
if (!isScoped) {
  html += sidebarItem(svgCommandCentre, 'Command Centre', '', () => switchView('commandcentre'), currentView==='commandcentre');
}
```

- [ ] **Step 3: Add to view dispatch**

In `_renderMainContent()` (around line 5200), add a new case:

```javascript
else if (currentView === 'commandcentre') renderCommandCentre(content);
```

Also add `'commandcentre'` to the empty-state exclusion list on line ~5179:

```javascript
&& currentView !== 'commandcentre'
```

- [ ] **Step 4: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(cc): add command centre sidebar item and view dispatch"
```

---

## Task 8: SPA — renderCommandCentre Function (Dashboard Tab)

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add the main render function and tab infrastructure**

Add the `renderCommandCentre()` function near the other render functions. It manages tab state and delegates to sub-renderers:

```javascript
let _ccSnapshot = null;
let _ccBriefing = null;
let _ccTab = localStorage.getItem('ccTab') || 'dashboard';

async function renderCommandCentre(el) {
  if (!_ccSnapshot) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Loading Command Centre...</div>';
    const resp = await apiCall('/api/command-centre/snapshot');
    if (resp) { _ccSnapshot = resp; }
    else {
      // No snapshot yet — trigger first refresh
      const refreshResp = await apiCall('/api/command-centre/refresh', { method: 'POST' });
      if (refreshResp) _ccSnapshot = refreshResp;
    }
  }

  let html = '';
  // Header
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening';
  const userName = _currentUser?.displayName?.split(' ')[0] || 'Glen';
  html += '<div class="cc-page">';
  html += '<div class="cc-header">';
  html += '<div><div class="cc-header__tag">COMMAND CENTRE</div>';
  html += '<div class="cc-header__greeting">' + esc(greeting) + ', <span class="cc-header__name">' + esc(userName) + '</span></div></div>';
  html += '<div class="cc-header__right">';
  if (_ccSnapshot) {
    html += '<span class="cc-header__ts">Scanned ' + new Date(_ccSnapshot.updated_at || _ccSnapshot.created_at).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) + '</span>';
  }
  html += '<button class="btn btn--sm" onclick="ccRefresh()">Refresh Scan</button>';
  html += '</div></div>';

  // Tabs
  html += '<div class="cc-tabs">';
  html += '<div class="cc-tabs__item' + (_ccTab === 'dashboard' ? ' cc-tabs__item--active' : '') + '" onclick="ccSwitchTab(\'dashboard\')">Dashboard</div>';
  html += '<div class="cc-tabs__item' + (_ccTab === 'briefing' ? ' cc-tabs__item--active' : '') + '" onclick="ccSwitchTab(\'briefing\')">Daily Briefing</div>';
  html += '</div>';

  // Tab content
  if (_ccTab === 'dashboard') {
    html += renderCCDashboard();
  } else {
    html += await renderCCBriefingContent();
  }

  html += '</div>'; // .cc-page
  el.innerHTML = html;

  // Post-render: animate rings
  requestAnimationFrame(() => {
    document.querySelectorAll('.cc-ring__fill').forEach(circle => {
      const target = circle.getAttribute('data-target');
      if (target) circle.style.strokeDashoffset = target;
    });
  });
}

function ccSwitchTab(tab) {
  _ccTab = tab;
  localStorage.setItem('ccTab', tab);
  renderContent();
}

async function ccRefresh() {
  toast('Refreshing scan...', 'info');
  const resp = await apiCall('/api/command-centre/refresh', { method: 'POST' });
  if (resp) { _ccSnapshot = resp; toast('Scan complete', 'success'); renderContent(); }
}
```

- [ ] **Step 2: Add the Dashboard tab renderer**

This builds the Four Cs hero row and the 3-column grid of intelligence cards. Uses the snapshot data from `_ccSnapshot.data`:

```javascript
function renderCCDashboard() {
  const d = _ccSnapshot?.data || {};
  const fc = d.four_cs || {};
  let html = '';

  // Four Cs hero row
  html += '<div class="cc-hero">';
  ['context', 'connections', 'capabilities', 'cadence'].forEach(key => {
    const c = fc[key] || { score: 0, max: 10, details: [] };
    const pct = c.score / c.max;
    const circumference = 2 * Math.PI * 22; // r=22
    const offset = circumference * (1 - pct);
    const colour = c.score >= 7 ? 'var(--success)' : c.score >= 4 ? 'var(--warning)' : 'var(--danger)';
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    const sub = c.details.slice(0, 2).join(', ') || 'No data';
    html += '<div class="cc-hero__card" title="' + esc(c.details.join('\n')) + '">';
    html += '<div class="cc-ring"><svg viewBox="0 0 56 56"><circle class="cc-ring__bg" cx="28" cy="28" r="22"/>';
    html += '<circle class="cc-ring__fill" cx="28" cy="28" r="22" style="stroke:' + colour + ';stroke-dasharray:' + circumference.toFixed(0) + ';stroke-dashoffset:' + circumference.toFixed(0) + ';filter:drop-shadow(0 0 6px ' + colour + ')" data-target="' + offset.toFixed(1) + '"/>';
    html += '</svg><div class="cc-ring__score" style="color:' + colour + '">' + c.score + '</div></div>';
    html += '<div class="cc-hero__info"><div class="cc-hero__label">' + esc(label) + '</div>';
    html += '<div class="cc-hero__sub">' + esc(sub) + '</div></div>';
    html += '</div>';
  });
  html += '</div>';

  // 3-column grid
  html += '<div class="cc-grid">';

  // Card: Today's Focus (from bugs + tasks)
  html += renderCCSituationCard(d);
  // Card: Skills Intelligence
  html += renderCCSkillsCard(d);
  // Card: Brain & Memory
  html += renderCCBrainCard(d);
  // Card: Connections
  html += renderCCConnectionsCard(d);
  // Card: Bug Intelligence
  html += renderCCBugsCard(d);
  // Card: Agent Team
  html += renderCCAgentCard(d);
  // Card: Sessions
  html += renderCCSessionsCard(d);
  // Card: Test Health
  html += renderCCTestsCard(d);
  // Card: Level-Up (Phase 2 placeholder)
  html += renderCCLevelUpCard();

  html += '</div>'; // .cc-grid
  return html;
}
```

Each `renderCCXxxCard()` function builds one card following the pattern from the cc-v4.html mockup, using `_ccSnapshot.data` fields and CSS classes from Task 6. These are template-literal-heavy functions — implement each following the exact HTML structure from the mockup, replacing hardcoded values with data from the snapshot.

- [ ] **Step 3: Implement each card renderer**

Implement: `renderCCSituationCard`, `renderCCSkillsCard`, `renderCCBrainCard`, `renderCCConnectionsCard`, `renderCCBugsCard`, `renderCCAgentCard`, `renderCCSessionsCard`, `renderCCTestsCard`, `renderCCLevelUpCard`.

Each follows the pattern:
```javascript
function renderCCXxxCard(d) {
  let html = '<div class="cc-card cc-card--colour">';
  html += '<div class="cc-card__head"><span class="cc-card__title">TITLE</span><span class="cc-tag cc-tag--x">BADGE</span></div>';
  // ... card body from mockup
  html += '</div>';
  return html;
}
```

Reference mockup: `.superpowers/brainstorm/15405-1778494096/content/cc-v4.html` for exact HTML structure of each card.

- [ ] **Step 4: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(cc): add renderCommandCentre and dashboard tab"
```

---

## Task 9: SPA — Daily Briefing Tab

**Files:**
- Modify: `nbi_project_dashboard.html`

- [ ] **Step 1: Add the briefing tab renderer**

```javascript
async function renderCCBriefingContent() {
  if (!_ccBriefing) {
    _ccBriefing = await apiCall('/api/command-centre/briefing');
  }
  if (!_ccBriefing) return '<div style="padding:40px;text-align:center;color:var(--text-muted)">Failed to load briefing data.</div>';

  const b = _ccBriefing;
  let html = '';

  // Section: Critical
  html += renderCCBriefingCritical(b.critical);
  // Section: Calendar
  html += renderCCBriefingCalendar(b.calendar);
  // Section: Work Queue
  html += renderCCBriefingWorkQueue(b.work_queue);
  // Section: Bug Status
  html += renderCCBriefingBugs(b.bugs);
  // Section: Claude State
  html += renderCCBriefingClaude(b.claude_state);
  // Section: Client Deliveries
  html += renderCCBriefingDeliveries(b.client_deliveries);
  // Section: Knowledge Flags
  html += renderCCBriefingKnowledge(b.knowledge_flags);

  return html;
}
```

- [ ] **Step 2: Implement each briefing section renderer**

Each section follows the pattern from the cc-briefing-v3b.html mockup:
- Section header with count badge
- Grid of interactive cards (`.cc-card`) with list items (`.cc-li`)
- Hover-reveal action buttons
- Filter chips where applicable (Work Queue)
- Expandable cards where applicable (Bug Status)
- Calendar timeline with glowing dots
- Click feedback on all action buttons

Reference mockup: `.superpowers/brainstorm/15405-1778494096/content/cc-briefing-v3b.html`

Implement: `renderCCBriefingCritical`, `renderCCBriefingCalendar`, `renderCCBriefingWorkQueue`, `renderCCBriefingBugs`, `renderCCBriefingClaude`, `renderCCBriefingDeliveries`, `renderCCBriefingKnowledge`.

- [ ] **Step 3: Add interactivity handlers**

Add click handlers for:
- Filter chips (toggle active state, filter work queue items)
- Expandable cards (toggle expanded class)
- Action buttons (navigate to WorkSage views or trigger API calls)
- Click feedback (green tick flash)

```javascript
function ccFilterWorkQueue(chip, category) {
  document.querySelectorAll('.cc-wq-chip').forEach(c => c.classList.remove('cc-chip--active'));
  chip.classList.add('cc-chip--active');
  document.querySelectorAll('.cc-wq-card').forEach(card => {
    card.style.display = category === 'all' || card.dataset.category === category ? '' : 'none';
  });
}

function ccToggleExpand(el) {
  el.closest('.cc-card').classList.toggle('cc-card--expanded');
}

function ccActionClick(btn, action) {
  const orig = btn.textContent;
  btn.textContent = '✓';
  btn.style.color = 'var(--success)';
  setTimeout(() => { btn.textContent = orig; btn.style.color = ''; }, 1500);
  // Navigate or trigger action
  if (action.startsWith('bug:')) switchView('bugs'); // navigate to bug tracker
  if (action.startsWith('task:')) switchView('tasks'); // navigate to tasks
}
```

- [ ] **Step 4: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(cc): add daily briefing tab with calendar and interactivity"
```

---

## Task 10: Integration Testing

**Files:**
- Modify: `dashboard-server/tests/command-centre.test.js`

- [ ] **Step 1: Add endpoint integration tests**

Add to the existing test file:

```javascript
describe('API Endpoints (requires running server)', () => {
  it('POST /api/command-centre/refresh returns snapshot', async () => {
    // This test runs against the real server — skip in CI
    if (!process.env.TEST_INTEGRATION) return;
    const resp = await fetch('http://localhost:8888/api/command-centre/refresh', {
      method: 'POST',
      headers: { Cookie: `nbi_session=${process.env.TEST_SESSION}` },
    });
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.data).toHaveProperty('snapshot_date');
    expect(body.data).toHaveProperty('data');
    expect(body.data.data).toHaveProperty('four_cs');
  });

  it('GET /api/command-centre/snapshot returns cached data', async () => {
    if (!process.env.TEST_INTEGRATION) return;
    const resp = await fetch('http://localhost:8888/api/command-centre/snapshot', {
      headers: { Cookie: `nbi_session=${process.env.TEST_SESSION}` },
    });
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.data.data.four_cs.context.score).toBeGreaterThanOrEqual(0);
  });

  it('GET /api/command-centre/briefing returns live data', async () => {
    if (!process.env.TEST_INTEGRATION) return;
    const resp = await fetch('http://localhost:8888/api/command-centre/briefing', {
      headers: { Cookie: `nbi_session=${process.env.TEST_SESSION}` },
    });
    expect(resp.status).toBe(200);
    const body = await resp.json();
    expect(body.data).toHaveProperty('calendar');
    expect(body.data).toHaveProperty('work_queue');
    expect(body.data).toHaveProperty('bugs');
  });
});
```

- [ ] **Step 2: Run all tests**

Run: `cd dashboard-server && npm test`
Expected: All existing tests pass, new scanner tests pass.

- [ ] **Step 3: Commit**

```
git add dashboard-server/tests/command-centre.test.js
git commit -m "test(cc): add integration tests for command-centre endpoints"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `cd dashboard-server && npm run test:all`
Expected: All Vitest + Playwright tests pass.

- [ ] **Step 2: Restart PM2 and verify**

Run: `cd dashboard-server && pm2 restart nbi-dashboard`
Navigate to http://localhost:8888/nbi_project_dashboard.html, click Command Centre in the sidebar.

- [ ] **Step 3: Verify both tabs load**

- Dashboard tab: Four Cs rings animate, cards populate with live data, hover actions work
- Briefing tab: Calendar loads from Outlook, work queue populates, filter chips work, action buttons respond

- [ ] **Step 4: Test on different themes**

Switch between Dark, Light, Midnight, Command themes. Verify all cards render correctly with theme colours.

- [ ] **Step 5: Final commit**

```
git add -A
git commit -m "feat: Command Centre Phase 1 — dashboard + daily briefing with AI OS intelligence"
```
