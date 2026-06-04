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
    const projectKey = REPO_ROOT.replace(/[^a-zA-Z0-9]/g, '-');
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
        SELECT COALESCE(priority, 'unset') as priority, count(*)::int as count FROM bug_reports WHERE status NOT IN ('resolved', 'closed', 'wont_fix') GROUP BY priority
      `);
      const byPriority = { critical: 0, urgent: 0, high: 0, medium: 0, low: 0, unset: 0 };
      prioQ.rows.forEach(r => { byPriority[r.priority] = r.count; });

      const recentQ = await pool.query(`
        SELECT b.id, b.title, b.status, b.priority, c.text as comment, c.created_at
        FROM bug_report_comments c JOIN bug_reports b ON b.id = c.report_id
        ORDER BY c.created_at DESC LIMIT 10
      `);

      const openBugsQ = await pool.query(`
        SELECT id, title, status, priority, created_at FROM bug_reports
        WHERE status IN ('open', 'in_progress') ORDER BY
          CASE priority WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
          created_at DESC LIMIT 10
      `);

      return { by_status: byStatus, by_priority: byPriority, recent_activity: recentQ.rows, open_bugs: openBugsQ.rows };
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

      const userEmail = process.env.CC_CALENDAR_USER || 'gpryer@nbi-consulting.com';
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
      if (rows.length === 0) return res.status(404).json({ data: null, error: 'No snapshot exists. Trigger a refresh.' });
      res.json({ data: rows[0], error: null });
    } catch (e) {
      log('error', 'CC', 'Failed to read snapshot', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });

  /** POST /api/command-centre/refresh — run scanners, upsert today's snapshot */
  let _lastRefresh = 0;
  router.post('/api/command-centre/refresh', requireNBI, async (req, res) => {
    const now = Date.now();
    if (now - _lastRefresh < 30000) return res.status(429).json({ data: null, error: 'Refresh rate limited. Wait 30 seconds.' });
    _lastRefresh = now;
    try {
      const data = await computeSnapshot();
      const today = new Date().toISOString().slice(0, 10);
      const { rows: existing } = await pool.query(
        'SELECT data FROM cc_snapshots WHERE snapshot_date = $1', [today]
      );
      if (existing.length > 0 && existing[0].data && existing[0].data.dreaming) {
        data.dreaming = existing[0].data.dreaming;
      }
      const { rows } = await pool.query(
        `INSERT INTO cc_snapshots (snapshot_date, data) VALUES ($1, $2)
         ON CONFLICT (snapshot_date) DO UPDATE SET data = $2, updated_at = NOW()
         RETURNING *`,
        [today, JSON.stringify(data)]
      );
      log('info', 'CC', 'Snapshot refreshed', { date: today });
      res.json({ data: rows[0], error: null });
    } catch (e) {
      log('error', 'CC', 'Refresh failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
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
      res.json({ data: rows, error: null });
    } catch (e) {
      res.status(500).json({ data: null, error: e.message });
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
      const overdueQ = await pool.query(`SELECT id, title, status, priority, due_date, client_id FROM tasks WHERE due_date IS NOT NULL AND due_date != '' AND due_date::date < $1::date AND status NOT IN ('Done','Cancelled') AND item_type IN ('story','task') ORDER BY due_date`, [todayStr]);
      const dueTodayQ = await pool.query(`SELECT id, title, status, priority, due_date, client_id FROM tasks WHERE due_date IS NOT NULL AND due_date != '' AND due_date::date = $1::date AND status NOT IN ('Done','Cancelled') AND item_type IN ('story','task')`, [todayStr]);
      const endOfWeek = new Date(today); endOfWeek.setDate(endOfWeek.getDate() + (5 - endOfWeek.getDay()));
      const dueWeekQ = await pool.query(`SELECT id, title, status, priority, due_date, client_id FROM tasks WHERE due_date IS NOT NULL AND due_date != '' AND due_date::date > $1::date AND due_date::date <= $2::date AND status NOT IN ('Done','Cancelled') AND item_type IN ('story','task') ORDER BY due_date`, [todayStr, endOfWeek.toISOString().slice(0, 10)]);
      const blockedQ = await pool.query(`SELECT id, title, status, priority, due_date, client_id FROM tasks WHERE status = 'Blocked' AND status NOT IN ('Done','Cancelled') ORDER BY priority`);

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
        WHERE t.due_date IS NOT NULL AND t.due_date != '' AND t.due_date::date BETWEEN $1::date AND ($1::date + 14) AND t.status NOT IN ('Done','Cancelled')
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

      // Fires: cross-client problems, prioritised
      const fires = [];

      // Critical/urgent bugs
      critBugsQ.rows.forEach(b => {
        fires.push({
          severity: b.priority === 'critical' ? 'CRITICAL' : 'URGENT',
          title: b.title,
          client: 'WorkSage',
          type: 'bug',
          link_type: 'bug',
          link_id: b.id,
          age_days: daysSince(b.created_at),
        });
      });

      // Overdue tasks with client names
      const overdueWithClients = await pool.query(`
        SELECT t.id, t.title, t.due_date, t.priority, c.name as client_name
        FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
        WHERE t.due_date IS NOT NULL AND t.due_date != ''
          AND t.due_date::date < $1::date
          AND t.status NOT IN ('Done','Cancelled')
          AND t.item_type IN ('story','task','feature')
        ORDER BY t.due_date
      `, [todayStr]);

      overdueWithClients.rows.forEach(t => {
        const daysLate = daysSince(t.due_date);
        fires.push({
          severity: daysLate + 'D LATE',
          title: t.title,
          client: t.client_name || 'Unassigned',
          type: 'task',
          link_type: 'task',
          link_id: t.id,
          age_days: daysLate,
        });
      });

      // Blocked items
      blockedQ.rows.forEach(t => {
        fires.push({
          severity: 'BLOCKED',
          title: t.title,
          client: 'WorkSage',
          type: 'task',
          link_type: 'task',
          link_id: t.id,
          age_days: t.due_date ? daysSince(t.due_date) : 0,
        });
      });

      // Sort: CRITICAL first, then by age descending
      fires.sort((a, b) => {
        const sev = { CRITICAL: 0, URGENT: 1, BLOCKED: 2 };
        const aS = sev[a.severity] ?? 3;
        const bS = sev[b.severity] ?? 3;
        if (aS !== bS) return aS - bS;
        return b.age_days - a.age_days;
      });

      res.json({
        data: {
          date: todayStr,
          critical,
          fires,
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
          dreaming: snapRows.length > 0 && snapRows[0].data.dreaming ? snapRows[0].data.dreaming : null,
        },
        error: null,
      });
    } catch (e) {
      log('error', 'CC', 'Briefing failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });

  /** GET /api/command-centre/skill/:name — single skill detail */
  router.get('/api/command-centre/skill/:name', requireNBI, async (req, res) => {
    const { name } = req.params;
    const skillDir = path.join(SKILLS_DIR, name);
    if (!fs.existsSync(skillDir)) return res.status(404).json({ data: null, error: 'Skill not found' });
    try {
      const skillMd = safeReadFile(path.join(skillDir, 'SKILL.md')) || '';
      const learnings = safeReadFile(path.join(skillDir, 'learnings.md')) || null;
      const fm = parseFrontmatter(skillMd);
      let files = [];
      try { files = fs.readdirSync(skillDir, { recursive: true }); } catch {}
      res.json({
        data: { name, frontmatter: fm, content: skillMd, learnings, files },
        error: null,
      });
    } catch (e) {
      res.status(500).json({ data: null, error: e.message });
    }
  });

  /** GET /api/command-centre/client-work — per-client task balance + velocity */
  router.get('/api/command-centre/client-work', requireNBI, async (req, res) => {
    try {
      // Per-client task counts
      const clientsQ = await pool.query(`
        SELECT c.name as client_name, c.id as client_id,
          COUNT(*) FILTER (WHERE t.status = 'Done') as done,
          COUNT(*) FILTER (WHERE t.status IN ('In Progress','In Review')) as in_progress,
          COUNT(*) FILTER (WHERE t.status NOT IN ('Done','Cancelled','In Progress','In Review')) as todo,
          COUNT(*) as total
        FROM tasks t
        JOIN clients c ON t.client_id = c.id
        WHERE t.item_type IN ('story','task')
          AND t.status != 'Cancelled'
        GROUP BY c.name, c.id
        ORDER BY total DESC
      `);

      // Weekly velocity (last 4 weeks)
      const velocityQ = await pool.query(`
        SELECT
          DATE_TRUNC('week', updated_at)::date as week_start,
          COUNT(*) as completed
        FROM tasks
        WHERE status = 'Done'
          AND updated_at >= NOW() - INTERVAL '28 days'
          AND item_type IN ('story','task')
        GROUP BY DATE_TRUNC('week', updated_at)
        ORDER BY week_start
      `);

      // Summary stats
      const statsQ = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status NOT IN ('Done','Cancelled')) as open_tasks,
          COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date != '' AND due_date::date < CURRENT_DATE AND status NOT IN ('Done','Cancelled')) as overdue,
          COUNT(*) FILTER (WHERE status = 'Blocked') as blocked,
          COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date != '' AND due_date::date = CURRENT_DATE AND status NOT IN ('Done','Cancelled')) as due_today,
          COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date != '' AND due_date::date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 AND status NOT IN ('Done','Cancelled')) as due_this_week
        FROM tasks
        WHERE item_type IN ('story','task')
      `);

      res.json({
        data: {
          clients: clientsQ.rows.map(r => ({
            name: r.client_name,
            id: r.client_id,
            done: parseInt(r.done),
            in_progress: parseInt(r.in_progress),
            todo: parseInt(r.todo),
            total: parseInt(r.total),
          })),
          velocity: velocityQ.rows.map(r => ({
            week_start: r.week_start,
            completed: parseInt(r.completed),
          })),
          stats: statsQ.rows[0] ? {
            open_tasks: parseInt(statsQ.rows[0].open_tasks),
            overdue: parseInt(statsQ.rows[0].overdue),
            blocked: parseInt(statsQ.rows[0].blocked),
            due_today: parseInt(statsQ.rows[0].due_today),
            due_this_week: parseInt(statsQ.rows[0].due_this_week),
          } : {},
        },
        error: null,
      });
    } catch (e) {
      log('error', 'CC', 'client-work failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });

  /** GET /api/command-centre/pipeline — leads funnel, stale leads, follow-ups, analytics */
  router.get('/api/command-centre/pipeline', requireNBI, async (req, res) => {
    try {
      // 1. Pipeline by stage
      const stagesQ = await pool.query(`
        SELECT s.name, s.sort_order, s.colour,
          COUNT(l.id)::int as count,
          COALESCE(SUM(l.weighted_value), 0)::numeric as weighted_total
        FROM lead_pipeline_stages s
        LEFT JOIN leads l ON l.stage_id = s.id AND l.completed_at IS NULL
        WHERE s.is_closed = false
        GROUP BY s.name, s.sort_order, s.colour
        ORDER BY s.sort_order
      `);

      // 2. Stale leads — not contacted in 14+ days
      const staleQ = await pool.query(`
        SELECT l.id, l.title, l.last_contacted, l.weighted_value,
          c.name as contact_name, s.name as stage_name, s.colour as stage_colour
        FROM leads l
        LEFT JOIN contacts c ON l.primary_contact_id = c.id
        JOIN lead_pipeline_stages s ON l.stage_id = s.id
        WHERE l.completed_at IS NULL
          AND (l.last_contacted IS NULL OR l.last_contacted < CURRENT_DATE - 14)
        ORDER BY l.last_contacted NULLS FIRST
        LIMIT 20
      `);

      // 3. Upcoming follow-ups — next 7 days
      const followupsQ = await pool.query(`
        SELECT l.id, l.title, l.next_followup_date, l.next_action, l.weighted_value,
          c.name as contact_name, s.name as stage_name, s.colour as stage_colour
        FROM leads l
        LEFT JOIN contacts c ON l.primary_contact_id = c.id
        JOIN lead_pipeline_stages s ON l.stage_id = s.id
        WHERE l.next_followup_date IS NOT NULL
          AND l.next_followup_date <= CURRENT_DATE + 7
          AND l.completed_at IS NULL
        ORDER BY l.next_followup_date
        LIMIT 20
      `);

      // 4. Conversion rate (90 days)
      const conversionQ = await pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE s.is_won)::int as won,
          COUNT(*)::int as total
        FROM leads l
        JOIN lead_pipeline_stages s ON l.stage_id = s.id
        WHERE l.created_at >= NOW() - INTERVAL '90 days'
      `);

      // 5. Deal velocity
      const velocityQ = await pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (l.completed_at - l.created_at)) / 86400)::numeric(10,1) as avg_days
        FROM leads l
        WHERE l.completed_at IS NOT NULL
          AND l.created_at >= NOW() - INTERVAL '90 days'
      `);

      // 6. Weekly trend (8 weeks)
      const trendQ = await pool.query(`
        SELECT
          DATE_TRUNC('week', d.week)::date as week,
          COALESCE(n.count, 0)::int as new_leads,
          COALESCE(c.count, 0)::int as closed_leads
        FROM generate_series(
          DATE_TRUNC('week', NOW() - INTERVAL '56 days'),
          DATE_TRUNC('week', NOW()),
          '1 week'
        ) d(week)
        LEFT JOIN (
          SELECT DATE_TRUNC('week', created_at)::date as week, COUNT(*) as count
          FROM leads WHERE created_at >= NOW() - INTERVAL '56 days'
          GROUP BY 1
        ) n ON n.week = d.week::date
        LEFT JOIN (
          SELECT DATE_TRUNC('week', completed_at)::date as week, COUNT(*) as count
          FROM leads WHERE completed_at IS NOT NULL AND completed_at >= NOW() - INTERVAL '56 days'
          GROUP BY 1
        ) c ON c.week = d.week::date
        ORDER BY d.week
      `);

      // 7. Total weighted pipeline
      const totalQ = await pool.query(`
        SELECT COALESCE(SUM(weighted_value), 0)::numeric as total_weighted
        FROM leads WHERE completed_at IS NULL
      `);

      // Compute conversion rate
      const convRow = conversionQ.rows[0] || { won: '0', total: '0' };
      const won = parseInt(convRow.won) || 0;
      const total = parseInt(convRow.total) || 0;
      const conversion_rate = total > 0 ? Math.round((won / total) * 100) : 0;

      // Deal velocity
      const velRow = velocityQ.rows[0] || { avg_days: null };
      const avg_deal_days = velRow.avg_days != null ? parseFloat(velRow.avg_days) : null;

      // Total pipeline
      const totalRow = totalQ.rows[0] || { total_weighted: '0' };
      const total_weighted_pipeline = parseFloat(totalRow.total_weighted) || 0;

      res.json({
        data: {
          stages: stagesQ.rows.map(r => ({
            name: r.name,
            sort_order: r.sort_order,
            colour: r.colour,
            count: parseInt(r.count),
            weighted_total: parseFloat(r.weighted_total),
          })),
          stale_leads: staleQ.rows,
          upcoming_followups: followupsQ.rows,
          analytics: {
            total_weighted_pipeline,
            conversion_rate,
            avg_deal_days,
            trend: trendQ.rows.map(r => ({
              week: r.week,
              new_leads: parseInt(r.new_leads),
              closed_leads: parseInt(r.closed_leads),
            })),
          },
        },
        error: null,
      });
    } catch (e) {
      log('error', 'CC', 'pipeline failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });

  /** GET /api/command-centre/aios-detail — expanded Four Cs data, recommendations, 30-day history */
  router.get('/api/command-centre/aios-detail', requireNBI, async (req, res) => {
    try {
      // 1. Latest snapshot
      const { rows } = await pool.query(
        'SELECT data, snapshot_date, updated_at FROM cc_snapshots ORDER BY snapshot_date DESC LIMIT 1'
      );
      if (rows.length === 0) {
        return res.status(404).json({ data: null, error: 'No snapshot exists. Trigger a refresh first.' });
      }
      const snap = rows[0];
      const snapData = snap.data;
      const four_cs = snapData.four_cs || {};

      // 2. Generate recommendations from snapshot data
      const recommendations = [];

      // Brain modules stale > 30 days
      const modules = (snapData.brain && snapData.brain.modules) ? snapData.brain.modules : [];
      modules.forEach(m => {
        if (m.last_modified && daysSince(m.last_modified) > STALE_DAYS) {
          recommendations.push({
            category: 'context',
            severity: 'amber',
            title: 'Verify brain/' + m.name + '.md',
            detail: 'Last modified ' + daysSince(m.last_modified) + ' days ago',
            action: 'refresh',
          });
        }
      });

      // Skills without learnings (if >5 such skills)
      const skillsList = Array.isArray(snapData.skills) ? snapData.skills : (snapData.skills && snapData.skills.skills ? snapData.skills.skills : []);
      const skillsNoLearnings = skillsList.filter(s => !s.has_learnings);
      if (skillsNoLearnings.length > 5) {
        recommendations.push({
          category: 'capabilities',
          severity: 'info',
          title: skillsNoLearnings.length + ' skills have no learnings captured',
          detail: 'Run evals or capture learnings to improve skill quality',
          action: 'improve',
        });
      }

      // Missing connection buckets
      const buckets = (snapData.connections && snapData.connections.buckets) ? snapData.connections.buckets : {};
      Object.entries(buckets).forEach(([name, b]) => {
        if (b.status === 'missing') {
          recommendations.push({
            category: 'connections',
            severity: 'red',
            title: 'Connect ' + name + ' data source',
            detail: 'No sources configured for ' + name + ' bucket',
            action: 'connect',
          });
        }
      });

      // Stale memory files
      const memFiles = (snapData.memory && snapData.memory.files) ? snapData.memory.files : [];
      const staleMemFiles = memFiles.filter(f => f.is_stale);
      if (staleMemFiles.length > 0) {
        recommendations.push({
          category: 'context',
          severity: 'amber',
          title: staleMemFiles.length + ' memory files reference moved targets',
          detail: staleMemFiles.map(f => f.name).join(', '),
          action: 'review',
        });
      }

      // Dormant roles (no knowledge or freshness > 90 days)
      const roles = (snapData.brain && snapData.brain.roles) ? snapData.brain.roles : [];
      const dormantRoles = roles.filter(r => !r.has_knowledge || (r.knowledge_freshness !== null && r.knowledge_freshness > 90));
      if (dormantRoles.length > 0) {
        recommendations.push({
          category: 'capabilities',
          severity: 'amber',
          title: dormantRoles.length + ' roles have stale or missing knowledge',
          detail: dormantRoles.map(r => r.name).join(', '),
          action: 'refresh',
        });
      }

      // Low cadence score
      if (four_cs.cadence && four_cs.cadence.score < 5) {
        recommendations.push({
          category: 'cadence',
          severity: 'info',
          title: 'Cadence score is low (' + four_cs.cadence.score + '/10)',
          detail: 'Consider setting up analysis crons and automated reporting',
          action: 'plan',
        });
      }

      // 3. 30-day history
      const { rows: histRows } = await pool.query(
        `SELECT snapshot_date, data->'four_cs' as four_cs
         FROM cc_snapshots
         WHERE snapshot_date >= CURRENT_DATE - 30
         ORDER BY snapshot_date`
      );
      const history = histRows.map(r => ({ date: r.snapshot_date, four_cs: r.four_cs }));

      res.json({
        data: {
          four_cs,
          snapshot_date: snap.snapshot_date,
          last_updated: snap.updated_at,
          recommendations,
          history,
        },
        error: null,
      });
    } catch (e) {
      log('error', 'CC', 'aios-detail failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });

  // ——— Project Health + Client Signals (F6 + F8) ———
  router.get('/api/command-centre/project-health', requireNBI, async (req, res) => {
    try {
      // 1. Per-client task health
      const healthQ = await pool.query(
        `SELECT
          c.id as client_id, c.name as client_name,
          COUNT(t.id)::int as total,
          COUNT(t.id) FILTER (WHERE t.status = 'Done')::int as done,
          COUNT(t.id) FILTER (WHERE t.due_date IS NOT NULL AND t.due_date != '' AND t.due_date::date < CURRENT_DATE AND t.status NOT IN ('Done','Cancelled'))::int as overdue,
          COUNT(t.id) FILTER (WHERE t.status = 'Blocked')::int as blocked,
          MAX(t.updated_at) as last_activity
        FROM clients c
        LEFT JOIN tasks t ON t.client_id = c.id AND t.item_type IN ('story','task') AND t.status != 'Cancelled'
        GROUP BY c.id, c.name
        HAVING COUNT(t.id) > 0
        ORDER BY c.name`
      );

      // 2. Upcoming milestones (next 90 days)
      const milestonesQ = await pool.query(
        `SELECT
          m.id, m.title, m.target_date, c.name as client_name,
          COUNT(mi.task_id)::int as total_items,
          COUNT(mi.task_id) FILTER (WHERE t.status = 'Done')::int as done_items
        FROM milestones m
        JOIN clients c ON m.client_id = c.id
        LEFT JOIN milestone_items mi ON mi.milestone_id = m.id
        LEFT JOIN tasks t ON t.id = mi.task_id
        WHERE m.target_date >= CURRENT_DATE
          AND m.target_date <= CURRENT_DATE + 90
        GROUP BY m.id, m.title, m.target_date, c.name
        ORDER BY m.target_date`
      );

      // 3. Active SOWs
      const sowsQ = await pool.query(
        `SELECT s.id, s.title, s.start_date, s.end_date, s.status, c.name as client_name
        FROM sows s
        JOIN clients c ON s.client_id = c.id
        WHERE s.status = 'active'
        ORDER BY s.end_date`
      );

      // Compute risk per client
      const clientHealth = healthQ.rows.map(r => {
        const total = parseInt(r.total, 10) || 1;
        const done = parseInt(r.done, 10) || 0;
        const overdue = parseInt(r.overdue, 10) || 0;
        const blocked = parseInt(r.blocked, 10) || 0;
        const overduePct = overdue / total;
        const blockedPct = blocked / total;
        const daysSinceActivity = r.last_activity ? daysSince(r.last_activity) : 999;
        let risk = 'green';
        if (overduePct > 0.3 || blockedPct > 0.2 || daysSinceActivity > 14) risk = 'red';
        else if (overduePct > 0.15 || blockedPct > 0.1 || daysSinceActivity > 7) risk = 'amber';
        return {
          client_id: r.client_id,
          client_name: r.client_name,
          total: parseInt(r.total, 10),
          done,
          overdue,
          blocked,
          pct_complete: Math.round((done / total) * 100),
          days_since_activity: daysSinceActivity,
          risk,
        };
      });

      // Flag SOWs expiring within 60 days
      const sowStatus = sowsQ.rows.map(s => ({
        ...s,
        days_remaining: s.end_date ? Math.ceil((new Date(s.end_date) - Date.now()) / 86400000) : null,
        expiring_soon: s.end_date ? (new Date(s.end_date) - Date.now()) / 86400000 <= 60 : false,
      }));

      res.json({
        data: {
          client_health: clientHealth,
          milestones: milestonesQ.rows,
          sow_status: sowStatus,
        },
        error: null,
      });
    } catch (e) {
      log('error', 'CC', 'project-health failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });

  // ——— Team Workload (F9) ———
  router.get('/api/command-centre/team-workload', requireNBI, async (req, res) => {
    try {
      // 1. Per-assignee active tasks grouped by client
      const workloadQ = await pool.query(
        `SELECT
          a as assignee, c.name as client_name,
          COUNT(*)::int as active_count
        FROM tasks t
        LEFT JOIN clients c ON t.client_id = c.id
        CROSS JOIN LATERAL unnest(t.assignees) AS a
        WHERE t.assignees IS NOT NULL AND array_length(t.assignees, 1) > 0
          AND t.status NOT IN ('Done', 'Cancelled')
          AND t.item_type IN ('story', 'task')
        GROUP BY a, c.name
        ORDER BY a, active_count DESC`
      );

      // 2. Time logged this week
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      const weekStartStr = weekStart.toISOString().slice(0, 10);
      const timeQ = await pool.query(
        `SELECT user_name, SUM(hours)::numeric(10,1) as total_hours
        FROM time_entries
        WHERE date >= $1
        GROUP BY user_name
        ORDER BY total_hours DESC`,
        [weekStartStr]
      );

      // 3. SPOF detection (>80% of a client's active tasks assigned to one person)
      const spofQ = await pool.query(
        `WITH expanded AS (
          SELECT client_id, unnest(assignees) as assignee
          FROM tasks
          WHERE status NOT IN ('Done','Cancelled') AND item_type IN ('story','task')
            AND assignees IS NOT NULL AND array_length(assignees, 1) > 0
        ),
        client_totals AS (
          SELECT client_id, COUNT(*)::int as total FROM expanded GROUP BY client_id
        ),
        assignee_counts AS (
          SELECT client_id, assignee, COUNT(*)::int as cnt FROM expanded GROUP BY client_id, assignee
        )
        SELECT
          ac.assignee, c.name as client_name,
          ac.cnt as assignee_count, ct.total as client_total,
          ROUND(ac.cnt::numeric / ct.total * 100)::int as pct
        FROM assignee_counts ac
        JOIN client_totals ct ON ct.client_id = ac.client_id
        JOIN clients c ON c.id = ac.client_id
        WHERE ct.total >= 3 AND ac.cnt::numeric / ct.total > 0.8
        ORDER BY pct DESC`
      );

      // 4. Group workload by assignee (server-side)
      const assigneeMap = {};
      workloadQ.rows.forEach(r => {
        if (!assigneeMap[r.assignee]) assigneeMap[r.assignee] = { name: r.assignee, total: 0, clients: [] };
        assigneeMap[r.assignee].total += parseInt(r.active_count, 10) || 0;
        assigneeMap[r.assignee].clients.push({ client: r.client_name || 'Unassigned', count: parseInt(r.active_count, 10) || 0 });
      });
      const assignees = Object.values(assigneeMap).sort((a, b) => b.total - a.total);

      // 5. Capacity alerts
      const alerts = [];
      assignees.forEach(a => {
        if (a.total > 15) alerts.push({ type: 'overloaded', name: a.name, count: a.total });
        else if (a.total === 0) alerts.push({ type: 'idle', name: a.name, count: 0 });
      });

      // 6. Parse time_logged hours as numbers
      const timeLogged = timeQ.rows.map(r => ({
        user_name: r.user_name,
        hours: parseFloat(r.total_hours) || 0,
      }));

      res.json({
        data: {
          assignees,
          time_logged: timeLogged,
          spof: spofQ.rows,
          alerts,
        },
        error: null,
      });
    } catch (e) {
      log('error', 'CC', 'team-workload failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });

  // ——— Handoff Hub (F12) ———
  router.get('/api/command-centre/handoffs', requireNBI, (req, res) => {
    try {
      const projectsDir = path.join(REPO_ROOT, 'projects');
      const projects = [];

      if (!fs.existsSync(projectsDir)) {
        return res.json({ data: { projects: [] }, error: null });
      }

      const projectDirs = fs.readdirSync(projectsDir, { withFileTypes: true })
        .filter(d => d.isDirectory());

      projectDirs.forEach(pd => {
        const handoffsDir = path.join(projectsDir, pd.name, 'session_handoffs');
        if (!fs.existsSync(handoffsDir)) return;

        const handoffFiles = fs.readdirSync(handoffsDir)
          .filter(f => f.endsWith('.md'))
          .sort()
          .reverse();

        if (handoffFiles.length === 0) return;

        const latestFile = handoffFiles[0];
        const latestPath = path.join(handoffsDir, latestFile);
        const stat = safeStat(latestPath);
        const content = safeReadFile(latestPath) || '';

        // Parse title from first H1
        const titleMatch = content.match(/^#\s+(.+)/m);
        const title = titleMatch ? titleMatch[1].trim() : latestFile.replace('.md', '');

        // Extract "What's Next" section
        let whatsNext = '';
        const nextMatch = content.match(/##\s+(?:What.*?Next|Next Session|What the Next).+?\n([\s\S]*?)(?=\n##\s|$)/i);
        if (nextMatch) {
          whatsNext = nextMatch[1].trim().split('\n').slice(0, 5).join('\n');
        }

        // Extract branch name if mentioned
        const branchMatch = content.match(/(?:branch|Branch)[:\s]+`?([^\s`\n]+)`?/i);
        const branch = branchMatch ? branchMatch[1] : null;

        // Extract date from filename (handoff_YYYY-MM-DD_...)
        const dateMatch = latestFile.match(/(\d{4}-\d{2}-\d{2})/);
        const date = dateMatch ? dateMatch[1] : (stat ? stat.mtime.toISOString().slice(0, 10) : null);

        projects.push({
          project: pd.name,
          handoff_count: handoffFiles.length,
          latest_handoff: {
            filename: latestFile,
            title,
            date,
            branch,
            whats_next: whatsNext,
            path: 'projects/' + pd.name + '/session_handoffs/' + latestFile,
          },
        });
      });

      // Sort by most recent handoff first
      projects.sort((a, b) => {
        const aDate = a.latest_handoff.date || '';
        const bDate = b.latest_handoff.date || '';
        return bDate.localeCompare(aDate);
      });

      res.json({ data: { projects }, error: null });
    } catch (e) {
      log('error', 'CC', 'handoffs scan failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });

  // ——— Financial Pulse (F7) ———
  router.get('/api/command-centre/financial-pulse', requireNBI, async (req, res) => {
    try {
      // 1. Fetch latest finance_data row
      const fdResult = await pool.query(
        'SELECT data, updated_at FROM finance_data ORDER BY id DESC LIMIT 1'
      );
      if (!fdResult.rows.length) {
        return res.status(404).json({ data: null, error: 'No finance data available' });
      }

      const S = fdResult.rows[0].data || {};
      const lastUpdated = fdResult.rows[0].updated_at;

      const revenueItems = S.revenue || [];
      const payrollItems = S.payroll || [];
      const pipelineItems = S.pipeline || [];
      const opexItems = S.opex || [];

      // 2. KPI calculations (mirrors Finances view logic)
      const contractedRevenue = revenueItems.reduce((s, r) => s + (r.annual || 0), 0);
      const annualPayroll = payrollItems.reduce((s, p) => s + (p.annual || 0), 0);
      const employerCostPct = parseFloat(S.employerCostPct != null ? S.employerCostPct : 15) / 100;
      const billableStaffCost = payrollItems.filter(p => p.billable).reduce((s, p) => s + (p.annual || 0), 0);
      const billableFullCost = Math.round(billableStaffCost * (1 + employerCostPct));
      const totalStaffFullCost = Math.round(annualPayroll * (1 + employerCostPct));
      const grossProfit = contractedRevenue - billableFullCost;
      const grossMarginPct = contractedRevenue > 0 ? Math.round(grossProfit / contractedRevenue * 100) : 0;
      const annualOpex = opexItems.reduce((s, e) => s + ((e.amount || 0) * 12), 0);
      const totalOverheads = (totalStaffFullCost - billableFullCost) + annualOpex;
      const netProfit = grossProfit - totalOverheads;
      const netMarginPct = contractedRevenue > 0 ? Math.round(netProfit / contractedRevenue * 100) : 0;
      const monthlyBurn = Math.round((totalStaffFullCost / 12) + (annualOpex / 12));
      const pipelineTotal = pipelineItems.reduce((s, p) => s + ((p.low || 0) + (p.high || 0)) / 2, 0);
      const currentYear = new Date().getFullYear();
      const annualTarget = (S.targets || {})['y' + currentYear] || 0;
      const targetPct = annualTarget > 0 ? Math.round(contractedRevenue / annualTarget * 100) : 0;

      // 3. Additional DB queries
      const clientsResult = await pool.query(
        'SELECT name, contract_value FROM clients WHERE contract_value IS NOT NULL AND contract_value > 0 ORDER BY contract_value DESC'
      );
      const sowsResult = await pool.query(
        "SELECT title, client_id, end_date FROM sows WHERE status = 'active' AND end_date IS NOT NULL AND end_date <= CURRENT_DATE + 60 ORDER BY end_date"
      );

      const byClient = clientsResult.rows.map(r => ({ name: r.name, value: Number(r.contract_value) }));
      const contractsTotal = byClient.reduce((s, r) => s + r.value, 0);

      res.json({
        data: {
          revenue: {
            annual_contracted: contractedRevenue,
            monthly: Math.round(contractedRevenue / 12),
            by_client: revenueItems.map(r => ({ client: r.client, annual: r.annual || 0, type: r.type || '', status: r.status || '' })),
            target: annualTarget,
            target_pct: targetPct,
          },
          costs: {
            annual_payroll: annualPayroll,
            annual_full_cost: totalStaffFullCost,
            annual_opex: annualOpex,
            monthly_burn: monthlyBurn,
            headcount: payrollItems.length,
            billable_count: payrollItems.filter(p => p.billable).length,
          },
          margins: {
            gross_profit: grossProfit,
            gross_margin_pct: grossMarginPct,
            net_profit: netProfit,
            net_margin_pct: netMarginPct,
          },
          pipeline: {
            total_value: Math.round(pipelineTotal),
            count: pipelineItems.length,
          },
          contracts: {
            total_value: contractsTotal,
            by_client: byClient,
            expiring_sows: sowsResult.rows,
          },
          last_updated: lastUpdated,
        },
        error: null,
      });
    } catch (e) {
      log('error', 'CC', 'financial-pulse failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });

  // Export computeSnapshot for Phase 2 cron
  router._computeSnapshot = computeSnapshot;

  return router;
};