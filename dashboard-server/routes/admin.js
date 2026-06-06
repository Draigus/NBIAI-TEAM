'use strict';

const os = require('os');
const { detectImportFormat, parseExcelFile, parseCSVFile, mapRowsToTasks } = require('../lib/import-parser');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const VALID_STATUSES = new Set(['Not started', 'Planning', 'In progress', 'Done', 'Blocked', 'Cancelled']);
const SETTINGS_KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;

function validateRestoreClients(rows) {
  for (let i = 0; i < rows.length; i++) {
    const c = rows[i];
    if (!c.id || !UUID_RE.test(c.id)) return `clients[${i}].id: invalid UUID`;
    if (!c.name || typeof c.name !== 'string' || c.name.trim().length === 0) return `clients[${i}].name: required`;
    if (c.name.length > 200) return `clients[${i}].name: too long (max 200)`;
  }
  return null;
}

function validateRestoreTasks(rows) {
  for (let i = 0; i < rows.length; i++) {
    const t = rows[i];
    if (!t.id || !UUID_RE.test(t.id)) return `tasks[${i}].id: invalid UUID`;
    if (!t.title || typeof t.title !== 'string' || t.title.trim().length === 0) return `tasks[${i}].title: required`;
    if (t.title.length > 500) return `tasks[${i}].title: too long (max 500)`;
    if (t.status && !VALID_STATUSES.has(t.status)) return `tasks[${i}].status: invalid value "${t.status}"`;
    if (t.parent_id && !UUID_RE.test(t.parent_id)) return `tasks[${i}].parent_id: invalid UUID`;
    if (t.client_id && !UUID_RE.test(t.client_id)) return `tasks[${i}].client_id: invalid UUID`;
  }
  return null;
}

function validateRestoreSettings(rows) {
  for (let i = 0; i < rows.length; i++) {
    const s = rows[i];
    if (!s.key || typeof s.key !== 'string') return `settings[${i}].key: required`;
    if (!SETTINGS_KEY_RE.test(s.key)) return `settings[${i}].key: invalid format`;
  }
  return null;
}

function validateRestoreLeads(rows) {
  for (let i = 0; i < rows.length; i++) {
    const l = rows[i];
    if (!l.id || !UUID_RE.test(l.id)) return `leads[${i}].id: invalid UUID`;
    if (!l.title || typeof l.title !== 'string') return `leads[${i}].title: required`;
    if (l.client_id && !UUID_RE.test(l.client_id)) return `leads[${i}].client_id: invalid UUID`;
    if (l.stage_id && !UUID_RE.test(l.stage_id)) return `leads[${i}].stage_id: invalid UUID`;
  }
  return null;
}

function validateRestoreUsers(rows) {
  for (let i = 0; i < rows.length; i++) {
    const u = rows[i];
    if (!u.id || !UUID_RE.test(u.id)) return `users[${i}].id: invalid UUID`;
    if (u.role && !['admin', 'member'].includes(u.role)) return `users[${i}].role: invalid`;
  }
  return null;
}

function validateRestoreGenericUUID(rows, tableName) {
  for (let i = 0; i < rows.length; i++) {
    if (!rows[i].id || !UUID_RE.test(rows[i].id)) return `${tableName}[${i}].id: invalid UUID`;
  }
  return null;
}

// ==================== CLEANSE CONFIG ====================

const CLEANSE_CATEGORIES = [
  { id: 'tasks', label: 'Projects & Tasks', tier: 'standard', tables: ['tasks'], cascades: [], nullifies: [], childQueries: { task_notes: 'SELECT count(*) FROM task_notes', task_comments: 'SELECT count(*) FROM task_comments', task_attachments: 'SELECT count(*) FROM task_attachments', time_entries: 'SELECT count(*) FROM time_entries' } },
  { id: 'leads', label: 'Leads & Pipeline', tier: 'standard', tables: ['leads'], cascades: [], nullifies: [], childQueries: { lead_resources: 'SELECT count(*) FROM lead_resources', lead_activities: 'SELECT count(*) FROM lead_activities' } },
  { id: 'contacts', label: 'Contacts', tier: 'standard', tables: ['contacts'], cascades: [], nullifies: ['leads.primary_contact_id'], childQueries: {} },
  { id: 'client_notes', label: 'Client Notes', tier: 'standard', tables: ['client_notes'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'sows', label: 'SoWs', tier: 'standard', tables: ['sows'], cascades: [], nullifies: ['tasks.sow_id', 'hiring_positions.sow_id', 'teams.sow_id'], childQueries: {} },
  { id: 'expenses', label: 'Expenses', tier: 'standard', tables: ['expenses', 'expense_reports', 'expense_receipts'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'bugs', label: 'Bug Reports', tier: 'standard', tables: ['bug_reports'], cascades: [], nullifies: [], childQueries: { bug_report_comments: 'SELECT count(*) FROM bug_report_comments' } },
  { id: 'hiring', label: 'Hiring', tier: 'standard', tables: ['hiring_positions', 'candidates'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'calendar', label: 'Calendar Events', tier: 'standard', tables: ['calendar_events'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'finance', label: 'Finance Data', tier: 'standard', tables: ['finance_data'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'notifications', label: 'Notifications', tier: 'standard', tables: ['notifications'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'audit_log', label: 'Audit Log', tier: 'standard', tables: ['audit_log'], cascades: [], nullifies: [], childQueries: {} },
  { id: 'clients', label: 'Clients', tier: 'nuclear', tables: ['clients'], cascades: ['contacts', 'leads', 'client_notes', 'sows'], nullifies: ['tasks.client_id', 'users.client_id', 'hiring_positions.client_id', 'candidates.client_id', 'calendar_events.client_id', 'bug_reports.reporter_client_id'], childQueries: { contacts: 'SELECT count(*) FROM contacts', leads: 'SELECT count(*) FROM leads', lead_resources: 'SELECT count(*) FROM lead_resources', lead_activities: 'SELECT count(*) FROM lead_activities', client_notes: 'SELECT count(*) FROM client_notes', sows: 'SELECT count(*) FROM sows', client_activity_log: 'SELECT count(*) FROM client_activity_log' } },
];

const VALID_CATEGORY_IDS = new Set(CLEANSE_CATEGORIES.map(c => c.id));
const CLEANSE_LOCAL_STORAGE_MAP = {
  tasks: ['nbi_dashboard_tasks', 'nbi_dashboard_briefs'],
  finance: ['nbi_finance_data'],
  clients: ['nbi_dashboard_tasks', 'nbi_dashboard_briefs', 'nbi_dashboard_settings'],
  leads: [],
  contacts: [],
  client_notes: [],
  sows: [],
  expenses: [],
  bugs: [],
  hiring: [],
  calendar: [],
  notifications: [],
  audit_log: [],
};

module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, log, fs, path, requireNBI, requireAdmin, isValidUuid, auditLog, upload, pdfParse, uploadDir, createNotification, _msalClient } = ctx;

router.get('/api/audit-log', requireNBI, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const cursor = req.query.cursor || null; // ISO timestamp for cursor-based pagination
    const offset = parseInt(req.query.offset) || 0;
    const entityType = req.query.entity_type || null;
    const action = req.query.action || null;
    // Cap search length to avoid slow ILIKE queries
    const search = req.query.search ? String(req.query.search).slice(0, 200) : null;

    let where = [];
    let vals = [];
    let i = 1;
    if (entityType) { where.push(`a.entity_type = $${i}`); vals.push(entityType); i++; }
    if (action) { where.push(`a.action = $${i}`); vals.push(action); i++; }
    if (search) { where.push(`(a.changed_by ILIKE $${i} OR t.title ILIKE $${i})`); vals.push('%' + search + '%'); i++; }

    // Cursor-based: filter rows older than the cursor timestamp
    if (cursor) {
      where.push(`a.created_at < $${i}`);
      vals.push(cursor);
      i++;
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    // Fetch limit + 1 to determine hasMore without a separate count query
    const fetchLimit = limit + 1;
    vals.push(fetchLimit);
    let paginationClause;
    if (cursor) {
      // Cursor mode: no OFFSET
      paginationClause = `LIMIT $${i}`;
    } else {
      // Offset mode (backward compat): LIMIT + OFFSET
      vals.push(offset);
      paginationClause = `LIMIT $${i} OFFSET $${i + 1}`;
    }

    const { rows } = await pool.query(`
      SELECT a.*, t.title as entity_title
      FROM audit_log a
      LEFT JOIN tasks t ON a.entity_id = t.id AND a.entity_type = 'task'
      ${whereClause}
      ORDER BY a.created_at DESC
      ${paginationClause}
    `, vals);

    const hasMore = rows.length > limit;
    const entries = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && entries.length > 0 ? entries[entries.length - 1].created_at : null;

    // Count query only for non-cursor mode (backward compat) or first page
    const filterVals = cursor
      ? vals.slice(0, -1).filter((_, idx) => idx < i - 2) // exclude cursor and fetchLimit
      : vals.slice(0, -2).filter((_, idx) => idx < where.length - (cursor ? 1 : 0));
    const countWhereFilters = [];
    let ci = 1;
    if (entityType) { countWhereFilters.push(`a.entity_type = $${ci}`); ci++; }
    if (action) { countWhereFilters.push(`a.action = $${ci}`); ci++; }
    if (search) { countWhereFilters.push(`(a.changed_by ILIKE $${ci} OR t.title ILIKE $${ci})`); ci++; }
    const countWhere = countWhereFilters.length > 0 ? 'WHERE ' + countWhereFilters.join(' AND ') : '';
    const countVals = [];
    if (entityType) countVals.push(entityType);
    if (action) countVals.push(action);
    if (search) countVals.push('%' + search + '%');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM audit_log a LEFT JOIN tasks t ON a.entity_id = t.id AND a.entity_type = 'task' ${countWhere}`,
      countVals
    );
    const total = parseInt(countResult.rows[0].count);

    res.json({ entries, total, limit, offset, nextCursor, hasMore });
  } catch (err) {
    log('error', 'Audit', 'Query error', { error: err.message });
    res.status(500).json({ error: 'Failed to fetch audit log', entries: [], total: 0 });
  }
});

router.get('/api/health', async (req, res) => {
  const checks = { db: 'unknown', news: 'unknown' };
  let anyFailed = false;
  try {
    await pool.query('SELECT 1');
    checks.db = 'connected';
  } catch (e) {
    checks.db = 'connection failed';
    anyFailed = true;
    log('error', 'Health', 'DB connectivity check failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
  }
  if (process.env.NODE_ENV === 'test') {
    checks.news = 'skipped';
  } else {
    try {
      const newsResp = await fetch('http://127.0.0.1:8890/health', { signal: AbortSignal.timeout(3000) });
      checks.news = newsResp.ok ? 'ok' : `http ${newsResp.status}`;
    } catch (e) {
      checks.news = 'unreachable';
      anyFailed = true;
    }
  }
  res.status(anyFailed ? 503 : 200).json({ status: anyFailed ? 'degraded' : 'ok', ...checks });
});

router.get('/api/seed-data', requireNBI, requireAdmin, async (req, res) => {
  try {
    const seedPath = path.join(__dirname, 'seed-data.csv');
    if (fs.existsSync(seedPath)) {
      const csv = fs.readFileSync(seedPath, 'utf-8');
      res.json({ csv });
    } else {
      res.json({ csv: null, message: 'No seed data file found. Place seed-data.csv in the server directory.' });
    }
  } catch(e) {
    log('error', 'Sync', 'Failed to load seed data', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

router.get('/api/backup', requireNBI, requireAdmin, async (req, res) => {
  try {
    const tasks = await pool.query('SELECT * FROM tasks ORDER BY created_at');
    const clients = await pool.query('SELECT * FROM clients ORDER BY name');
    const comments = await pool.query('SELECT * FROM task_comments ORDER BY created_at');
    const notes = await pool.query('SELECT * FROM task_notes ORDER BY created_at');
    const finance = await pool.query('SELECT data FROM finance_data ORDER BY id DESC LIMIT 1');
    const users = await pool.query('SELECT id, username, display_name, email, role, created_at FROM users ORDER BY id');
    const settings = await pool.query('SELECT * FROM settings');
    const leads = await pool.query('SELECT * FROM leads ORDER BY created_at');
    const expenses = await pool.query('SELECT * FROM expenses ORDER BY created_at DESC');
    const auditLog = await pool.query('SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 10000');
    const bugReports = await pool.query('SELECT id, user_id, type, title, description, page, status, priority, created_at, updated_at FROM bug_reports ORDER BY created_at DESC');
    const bugComments = await pool.query('SELECT * FROM bug_report_comments ORDER BY created_at');
    // SoWs — work_package_text is already filtered (pricing/legal stripped) so safe to include in backups
    const sows = await pool.query('SELECT * FROM sows ORDER BY created_at');
    const calendarEvents = await pool.query('SELECT * FROM calendar_events ORDER BY created_at');
    // Teams + memberships
    const teams = await pool.query('SELECT * FROM teams ORDER BY created_at');
    const teamMembers = await pool.query('SELECT * FROM team_members ORDER BY created_at');
    // Hiring tables (positions first because candidates may FK them)
    const hiringPositions = await pool.query('SELECT * FROM hiring_positions ORDER BY created_at');
    const candidates = await pool.query('SELECT * FROM candidates ORDER BY created_at');

    // Add uploads manifest to backup
    const uploadsDir = path.join(__dirname, 'uploads');
    let uploadManifest = [];
    try {
      if (fs.existsSync(uploadsDir)) {
        uploadManifest = fs.readdirSync(uploadsDir).map(f => {
          const stat = fs.statSync(path.join(uploadsDir, f));
          return { name: f, size: stat.size, modified: stat.mtime.toISOString() };
        });
      }
    } catch (e) { /* ignore */ }

    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      exportedBy: req.user?.displayName || 'unknown',
      tables: {
        tasks: tasks.rows,
        clients: clients.rows,
        task_comments: comments.rows,
        task_notes: notes.rows,
        finance_data: finance.rows[0]?.data || null,
        users: users.rows,
        settings: settings.rows,
        leads: leads.rows,
        expenses: expenses.rows,
        audit_log: auditLog.rows,
        bug_reports: bugReports.rows,
        bug_report_comments: bugComments.rows,
        sows: sows.rows,
        calendar_events: calendarEvents.rows,
        teams: teams.rows,
        team_members: teamMembers.rows,
        hiring_positions: hiringPositions.rows,
        candidates: candidates.rows,
      },
      uploadManifest,
    };
    res.setHeader('Content-Disposition', `attachment; filename="nbi-dashboard-backup-${new Date().toISOString().slice(0,10)}.json"`);
    res.json(backup);
  } catch(e) {
    log('error', 'Backup', 'Failed to export backup', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

router.post('/api/restore', requireAdmin, async (req, res) => {
  const { backup } = req.body;
  if (!backup || !backup.tables) return res.status(400).json({ error: 'Invalid backup format' });

  const validators = [
    ['clients', validateRestoreClients],
    ['tasks', validateRestoreTasks],
    ['settings', validateRestoreSettings],
    ['leads', validateRestoreLeads],
    ['users', validateRestoreUsers],
  ];
  for (const [table, validator] of validators) {
    if (backup.tables[table] && Array.isArray(backup.tables[table])) {
      const err = validator(backup.tables[table]);
      if (err) return res.status(400).json({ error: `Restore validation failed: ${err}` });
    }
  }
  for (const table of ['task_comments', 'expenses', 'audit_log', 'bug_reports', 'bug_report_comments',
      'calendar_events', 'teams', 'team_members', 'hiring_positions', 'candidates', 'sows']) {
    if (backup.tables[table] && Array.isArray(backup.tables[table])) {
      const err = validateRestoreGenericUUID(backup.tables[table], table);
      if (err) return res.status(400).json({ error: `Restore validation failed: ${err}` });
    }
  }

  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');

    // Restore clients first (tasks depend on them)
    if (backup.tables.clients) {
      for (const c of backup.tables.clients) {
        await conn.query('INSERT INTO clients (id, name, created_at) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2', [c.id, c.name, c.created_at]);
      }
    }

    // Restore tasks
    if (backup.tables.tasks) {
      for (const t of backup.tables.tasks) {
        await conn.query(`INSERT INTO tasks (id, title, parent_id, client_id, status, priority, health_state, description, assignees, hours_estimated, hours_spent, due_date, start_date, end_date, source, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
          ON CONFLICT (id) DO UPDATE SET title=$2, parent_id=$3, client_id=$4, status=$5, priority=$6, health_state=$7, description=$8, assignees=$9, hours_estimated=$10, hours_spent=$11, due_date=$12, start_date=$13, end_date=$14, source=$15, updated_at=$17`,
          [t.id, t.title, t.parent_id, t.client_id, t.status, t.priority, t.health_state, t.description, t.assignees, t.hours_estimated, t.hours_spent, t.due_date, t.start_date || '', t.end_date || '', t.source, t.created_at, t.updated_at]);
      }
    }

    // Restore comments
    if (backup.tables.task_comments) {
      for (const c of backup.tables.task_comments) {
        await conn.query('INSERT INTO task_comments (id, task_id, author, text, created_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING', [c.id, c.task_id, c.author, c.text, c.created_at]);
      }
    }

    // Restore finance data
    if (backup.tables.finance_data) {
      await conn.query('INSERT INTO finance_data (data, updated_by) VALUES ($1, $2)', [JSON.stringify(backup.tables.finance_data), 'restore']);
    }

    // Restore users — metadata only (display_name, role, is_active). NEVER restore password hashes.
    if (backup.tables.users) {
      for (const u of backup.tables.users) {
        await conn.query(`UPDATE users SET display_name = COALESCE($2, display_name), role = COALESCE($3, role), is_active = COALESCE($4, is_active) WHERE id = $1`,
          [u.id, u.display_name, u.role, u.is_active]);
      }
    }

    // Restore settings (ON CONFLICT key DO UPDATE)
    if (backup.tables.settings) {
      for (const s of backup.tables.settings) {
        await conn.query('INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, COALESCE($3, NOW())) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = COALESCE($3, NOW())',
          [s.key, typeof s.value === 'string' ? s.value : JSON.stringify(s.value), s.updated_at]);
      }
    }

    // Restore leads (ON CONFLICT id DO UPDATE)
    if (backup.tables.leads) {
      for (const l of backup.tables.leads) {
        await conn.query(`INSERT INTO leads (id, client_id, title, work_type, service_line, stage_id, priority, currency, rom_min, rom_max, rom_text, win_probability, deal_owner, lead_source, notes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
          ON CONFLICT (id) DO UPDATE SET client_id=$2, title=$3, work_type=$4, service_line=$5, stage_id=$6, priority=$7, currency=$8, rom_min=$9, rom_max=$10, rom_text=$11, win_probability=$12, deal_owner=$13, lead_source=$14, notes=$15, updated_at=$17`,
          [l.id, l.client_id, l.title, l.work_type, l.service_line, l.stage_id, l.priority, l.currency, l.rom_min, l.rom_max, l.rom_text, l.win_probability, l.deal_owner, l.lead_source, l.notes, l.created_at, l.updated_at]);
      }
    }

    // Restore expenses (ON CONFLICT id DO UPDATE)
    if (backup.tables.expenses) {
      for (const e of backup.tables.expenses) {
        await conn.query(`INSERT INTO expenses (id, user_id, date, amount, currency, category_id, description, status, notes, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
          ON CONFLICT (id) DO UPDATE SET user_id=$2, date=$3, amount=$4, currency=$5, category_id=$6, description=$7, status=$8, notes=$9, updated_at=$11`,
          [e.id, e.user_id, e.date, e.amount, e.currency, e.category_id, e.description, e.status, e.notes, e.created_at, e.updated_at]);
      }
    }

    // Audit log — append-only, never overwrite existing entries
    if (backup.tables.audit_log) {
      for (const a of backup.tables.audit_log) {
        await conn.query('INSERT INTO audit_log (id, entity_type, entity_id, action, changed_by, changes, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
          [a.id, a.entity_type, a.entity_id, a.action, a.changed_by, a.changes ? JSON.stringify(a.changes) : null, a.created_at]);
      }
    }

    // Bug reports (must come before comments due to FK dependency)
    if (backup.tables.bug_reports) {
      for (const b of backup.tables.bug_reports) {
        await conn.query(
          `INSERT INTO bug_reports (id, user_id, type, title, description, page, status, priority, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
          [b.id, b.user_id, b.type, b.title, b.description, b.page, b.status, b.priority, b.created_at, b.updated_at]
        );
      }
    }
    if (backup.tables.bug_report_comments) {
      for (const c of backup.tables.bug_report_comments) {
        await conn.query(
          `INSERT INTO bug_report_comments (id, report_id, author, text, created_at)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING`,
          [c.id, c.report_id, c.author, c.text, c.created_at]
        );
      }
    }

    // Calendar events
    if (backup.tables.calendar_events) {
      for (const ev of backup.tables.calendar_events) {
        await conn.query(
          `INSERT INTO calendar_events (id, user_id, title, event_type, start_date, end_date, client_id, visibility, description, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO UPDATE SET title=$3, event_type=$4, start_date=$5, end_date=$6, client_id=$7, visibility=$8, description=$9, updated_at=$11`,
          [ev.id, ev.user_id, ev.title, ev.event_type, ev.start_date, ev.end_date, ev.client_id, ev.visibility, ev.description, ev.created_at, ev.updated_at]
        );
      }
    }

    // Teams + memberships (depend on clients/sows/users which are restored above)
    if (backup.tables.teams) {
      for (const t of backup.tables.teams) {
        await conn.query(
          `INSERT INTO teams (id, name, description, client_id, sow_id, colour, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET name=$2, description=$3, client_id=$4, sow_id=$5, colour=$6, updated_at=$8`,
          [t.id, t.name, t.description, t.client_id, t.sow_id, t.colour, t.created_at, t.updated_at]
        );
      }
    }
    if (backup.tables.team_members) {
      for (const tm of backup.tables.team_members) {
        await conn.query(
          `INSERT INTO team_members (id, team_id, user_id, role, created_at)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
          [tm.id, tm.team_id, tm.user_id, tm.role, tm.created_at]
        );
      }
    }

    // Hiring positions (must come before candidates due to FK; safe re-run via ON CONFLICT)
    if (backup.tables.hiring_positions) {
      for (const p of backup.tables.hiring_positions) {
        await conn.query(
          `INSERT INTO hiring_positions (id, client_id, sow_id, title, description, seniority, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO UPDATE SET client_id=$2, sow_id=$3, title=$4, description=$5, seniority=$6, status=$7, updated_at=$9`,
          [p.id, p.client_id, p.sow_id, p.title, p.description, p.seniority, p.status, p.created_at, p.updated_at]
        );
      }
    }
    if (backup.tables.candidates) {
      for (const ca of backup.tables.candidates) {
        await conn.query(
          `INSERT INTO candidates (id, position_id, client_id, name, role, linkedin_url, cv_filename, due_date, stage, notes, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (id) DO UPDATE SET position_id=$2, client_id=$3, name=$4, role=$5, linkedin_url=$6, cv_filename=$7, due_date=$8, stage=$9, notes=$10, updated_at=$12`,
          [ca.id, ca.position_id, ca.client_id, ca.name, ca.role, ca.linkedin_url, ca.cv_filename, ca.due_date, ca.stage, ca.notes, ca.created_at, ca.updated_at]
        );
      }
    }

    // SoWs (must come before tasks if tasks reference sow_id, but tasks restore is above; safe because sow_id allows NULL)
    if (backup.tables.sows) {
      for (const s of backup.tables.sows) {
        await conn.query(
          `INSERT INTO sows (id, client_id, title, start_date, end_date, status, work_package_text, extraction_stats, uploaded_by, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (id) DO UPDATE SET title=$3, start_date=$4, end_date=$5, status=$6, work_package_text=$7, extraction_stats=$8, updated_at=$11`,
          [s.id, s.client_id, s.title, s.start_date, s.end_date, s.status, s.work_package_text, s.extraction_stats ? (typeof s.extraction_stats === 'string' ? s.extraction_stats : JSON.stringify(s.extraction_stats)) : null, s.uploaded_by, s.created_at, s.updated_at]
        );
      }
    }

    await conn.query('COMMIT');
    await auditLog('system', 'backup', 'restore', req.user?.displayName, { exportedAt: backup.exportedAt });
    res.json({ ok: true, message: 'Backup restored successfully' });
  } catch(e) {
    await conn.query('ROLLBACK');
    log('error', 'Backup', 'Failed to restore backup', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  } finally {
    conn.release();
  }
});

router.get('/api/import/scan-downloads', requireAdmin, async (req, res) => {
  const downloadsDir = path.join(os.homedir(), 'Downloads');
  try {
    const files = [];

    // Only scan these known subdirectories (avoid scanning dozens of unrelated folders)
    const knownSubdirs = ['msteams dload', 'Spreadsheets', 'expense'];

    /**
     * Scan a directory for importable files (.xlsx, .xls, .csv).
     * @param {string} dir - Absolute path to scan
     * @param {string} prefix - Display prefix for nested paths (e.g. 'subfolder/')
     */
    async function scanDir(dir, prefix) {
      let entries;
      try { entries = fs.readdirSync(dir); } catch(e) { return; }
      for (const name of entries) {
        if (name.startsWith('~$')) continue;
        const fullPath = path.join(dir, name);
        let stat;
        try { stat = fs.statSync(fullPath); } catch(e) { continue; }
        // Recurse into known subdirectories only (one level deep)
        if (stat.isDirectory() && !prefix && knownSubdirs.includes(name)) { await scanDir(fullPath, name); continue; }
        const ext = path.extname(name).toLowerCase();
        if (!['.csv', '.xlsx', '.xls'].includes(ext)) continue;
        const relPath = prefix ? prefix + '/' + name : name;
        let format = { format: 'unknown', label: 'Unknown' };
        let sheetCount = 1;
        let rowCount = 0;
        let planName = '';
        try {
          if (ext === '.csv') {
            const parsed = parseCSVFile(fullPath);
            if (parsed) { format = detectImportFormat(parsed.headers); rowCount = parsed.rowCount; }
          } else {
            const parsed = await parseExcelFile(fullPath, true);
            if (parsed.sheets.length > 0) {
              format = detectImportFormat(parsed.sheets[0].headers);
              sheetCount = parsed.sheetNames.length;
              rowCount = parsed.sheets[0].rowCount;
            }
            // Extract Planner plan name from parsed sheets
            // Plan name sheet layout: Row 0 = ["Plan name", "<actual name>"], Row 1 = ["Plan ID", "<id>"]
            if (parsed.sheetNames.includes('Plan name')) {
              const pnSheet = parsed.sheets.find(s => s.name === 'Plan name');
              if (pnSheet && pnSheet.headers[0] === 'Plan name' && pnSheet.headers[1]) {
                planName = String(pnSheet.headers[1]);
              }
            }
          }
        } catch(e) { /* skip unparseable files */ }
        files.push({
          name: relPath, ext, folder: prefix || '',
          size: stat.size,
          modified: stat.mtime.toISOString(),
          format: format.format,
          formatLabel: format.label,
          sheetCount, rowCount, planName,
        });
      }
    }

    await scanDir(downloadsDir, '');
    files.sort((a, b) => new Date(b.modified) - new Date(a.modified));
    res.json({ dir: downloadsDir, files });
  } catch(e) {
    log('error', 'Import', 'Cannot read Downloads folder', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

router.post('/api/import/parse-file', requireAdmin, async (req, res) => {
  const { filename, sheet } = req.body;
  if (!filename) return res.status(400).json({ error: 'filename required' });
  // Security: allow files from Downloads or one subdirectory deep, no path traversal
  const parts = filename.replace(/\\/g, '/').split('/');
  if (parts.length > 2 || parts.some(p => p === '..' || p === '.')) return res.status(400).json({ error: 'Invalid path' });
  const safeParts = parts.map(p => path.basename(p));
  const safeName = safeParts.join('/');
  const fullPath = path.join(os.homedir(), 'Downloads', ...safeParts);
  if (!fs.existsSync(fullPath)) return res.status(404).json({ error: 'File not found' });

  try {
    const ext = path.extname(safeName).toLowerCase();
    if (ext === '.csv') {
      const parsed = parseCSVFile(fullPath);
      if (!parsed) return res.status(400).json({ error: 'Empty CSV' });
      const format = detectImportFormat(parsed.headers);
      const mapped = mapRowsToTasks(format.format, parsed.headers, parsed.rows);
      res.json({
        filename: safeName, type: 'csv',
        format: format.format, formatLabel: format.label,
        headers: parsed.headers,
        totalRows: parsed.rowCount,
        preview: mapped.slice(0, 10),
        tasks: mapped,
      });
    } else {
      const parsed = await parseExcelFile(fullPath);
      if (parsed.sheets.length === 0) return res.status(400).json({ error: 'Empty spreadsheet' });
      const targetSheet = sheet ? parsed.sheets.find(s => s.name === sheet) : parsed.sheets[0];
      if (!targetSheet) return res.status(400).json({ error: 'Sheet not found' });
      const format = detectImportFormat(targetSheet.headers);
      const mapped = mapRowsToTasks(format.format, targetSheet.headers, targetSheet.rows || targetSheet.sample);
      res.json({
        filename: safeName, type: 'xlsx',
        format: format.format, formatLabel: format.label,
        headers: targetSheet.headers,
        sheets: parsed.sheetNames,
        activeSheet: targetSheet.name,
        totalRows: targetSheet.rowCount,
        preview: mapped.slice(0, 10),
        tasks: mapped,
      });
    }
  } catch(e) {
    log('error', 'Import', 'File parse failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    res.status(500).json({ error: 'An internal error occurred' });
  }
});

router.post('/api/contract/extract', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  let text = '';
  try {
    if (req.file.mimetype === 'application/pdf' && pdfParse) {
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfData = await pdfParse(dataBuffer);
      text = pdfData.text;
    } else {
      // Plain text or fallback
      text = fs.readFileSync(req.file.path, 'utf8');
    }
  } catch(e) {
    log('error', 'Import', 'Contract file parse failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
    return res.status(500).json({ error: 'An internal error occurred' });
  }

  // Extract potential tasks, milestones, deliverables using regex heuristics
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 5);
  const extracted = [];
  const patterns = [
    /(?:deliverable|milestone|task|action|objective|requirement|phase)\s*[\d.:)\-]*\s*(.+)/i, // Labelled items
    /^\d+[.)]\s+(.+)/,                                    // Numbered lists (e.g. "1. ..." or "1) ...")
    /^[\u2022\u2023\u25CF\u25CB\-\*]\s+(.+)/,              // Bullet-pointed items (Unicode + ASCII bullets)
    /(?:shall|must|will)\s+(.{15,})/i,                     // Contractual obligation language
    /(?:due|deadline|by)\s+(\d{1,2}[\s\/\-]\w+[\s\/\-]\d{2,4})/i, // Date references
  ];

  lines.forEach((line, i) => {
    for (const pat of patterns) {
      const m = line.match(pat);
      if (m) {
        const title = (m[1] || line).substring(0, 120).trim();
        if (title.length > 10 && !extracted.find(e => e.title === title)) {
          // Try to find a date in the line
          const dateMatch = line.match(/(\d{1,2}[\s\/\-](?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[\s\/\-]\d{2,4})/i);
          extracted.push({
            title,
            type: line.match(/milestone/i) ? 'milestone' : line.match(/deliverable/i) ? 'deliverable' : 'task',
            dueDate: dateMatch ? dateMatch[1] : '',
            sourceLine: i + 1,
          });
        }
        break;
      }
    }
  });

  // Uploaded file is retained in uploads/ for project attachment

  res.json({
    filename: req.file.originalname,
    storedFilename: req.file.filename,  // For attaching to project after import
    totalLines: lines.length,
    extracted,
    rawPreview: text.substring(0, 2000),
  });
});

router.get('/api/admin/cleanse/preview', requireNBI, requireAdmin, async (req, res) => {
  try {
    const categories = [];
    for (const cat of CLEANSE_CATEGORIES) {
      const countResult = await pool.query(`SELECT count(*)::int AS n FROM ${cat.tables[0]}`);
      const count = countResult.rows[0].n;
      const children = {};
      for (const [key, sql] of Object.entries(cat.childQueries)) {
        const r = await pool.query(sql);
        children[key] = r.rows[0].count ? parseInt(r.rows[0].count, 10) : 0;
      }
      categories.push({
        id: cat.id,
        label: cat.label,
        tier: cat.tier,
        count,
        cascades: cat.cascades,
        nullifies: cat.nullifies,
        children,
      });
    }
    res.json({ categories });
  } catch (e) {
    log('error', 'Cleanse', 'Preview failed', { error: e.message });
    res.status(500).json({ error: 'Failed to generate cleanse preview' });
  }
});

router.post('/api/admin/cleanse', requireNBI, requireAdmin, async (req, res) => {
  const { categories, confirmation } = req.body;

  if (confirmation !== 'DELETE ALL SELECTED DATA') {
    return res.status(400).json({ error: 'Invalid confirmation string. Must be exactly: DELETE ALL SELECTED DATA' });
  }
  if (!Array.isArray(categories) || categories.length === 0) {
    return res.status(400).json({ error: 'At least one category must be selected' });
  }
  const invalid = categories.filter(c => !VALID_CATEGORY_IDS.has(c));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Invalid category IDs: ${invalid.join(', ')}` });
  }

  const selected = new Set(categories);
  if (selected.has('clients')) {
    for (const dep of ['contacts', 'leads', 'client_notes', 'sows']) {
      selected.add(dep);
    }
  }

  let filesToDelete = [];
  try {
    if (selected.has('tasks')) {
      const { rows } = await pool.query('SELECT filename FROM task_attachments');
      filesToDelete.push(...rows.map(r => r.filename));
    }
    if (selected.has('expenses')) {
      const { rows } = await pool.query('SELECT filename FROM expense_receipts');
      filesToDelete.push(...rows.map(r => r.filename));
    }
  } catch (e) {
    log('warn', 'Cleanse', 'Failed to pre-query filenames', { error: e.message });
  }

  const conn = await pool.connect();
  const deleted = {};
  const nullified = {};

  try {
    await conn.query('BEGIN');

    if (selected.has('clients')) {
      const r = await conn.query('DELETE FROM client_activity_log');
      deleted.client_activity_log = r.rowCount;
    }

    if (selected.has('clients')) {
      const r = await conn.query('UPDATE bug_reports SET reporter_client_id = NULL WHERE reporter_client_id IS NOT NULL');
      nullified['bug_reports.reporter_client_id'] = r.rowCount;
    }

    if (selected.has('tasks') || selected.has('bugs') || selected.has('clients')) {
      const types = [];
      if (selected.has('tasks')) types.push('task', 'project');
      if (selected.has('bugs')) types.push('bug_report');
      if (selected.has('clients')) types.push('client');
      if (types.length > 0) {
        const r = await conn.query('DELETE FROM attachments WHERE entity_type = ANY($1)', [types]);
        if (r.rowCount > 0) deleted.attachments = (deleted.attachments || 0) + r.rowCount;
      }
    }

    if (selected.has('contacts') && !selected.has('leads')) {
      const r = await conn.query('UPDATE leads SET primary_contact_id = NULL WHERE primary_contact_id IS NOT NULL');
      nullified['leads.primary_contact_id'] = r.rowCount;
    }

    if (selected.has('leads')) {
      const r1 = await conn.query('DELETE FROM lead_resources');
      deleted.lead_resources = r1.rowCount;
      const r2 = await conn.query('DELETE FROM lead_activities');
      deleted.lead_activities = r2.rowCount;
    }

    if (selected.has('leads')) {
      const r = await conn.query('DELETE FROM leads');
      deleted.leads = r.rowCount;
    }

    if (selected.has('contacts')) {
      const r = await conn.query('DELETE FROM contacts');
      deleted.contacts = r.rowCount;
    }

    if (selected.has('client_notes')) {
      const r = await conn.query('DELETE FROM client_notes');
      deleted.client_notes = r.rowCount;
    }

    if (selected.has('sows')) {
      const r1 = await conn.query('UPDATE tasks SET sow_id = NULL WHERE sow_id IS NOT NULL');
      nullified['tasks.sow_id'] = r1.rowCount;
      const r2 = await conn.query('UPDATE hiring_positions SET sow_id = NULL WHERE sow_id IS NOT NULL');
      nullified['hiring_positions.sow_id'] = r2.rowCount;
      const r3 = await conn.query('UPDATE teams SET sow_id = NULL WHERE sow_id IS NOT NULL');
      nullified['teams.sow_id'] = r3.rowCount;
    }

    if (selected.has('sows')) {
      const r = await conn.query('DELETE FROM sows');
      deleted.sows = r.rowCount;
    }

    if (selected.has('tasks')) {
      const rNotes = await conn.query('DELETE FROM task_notes');
      deleted.task_notes = rNotes.rowCount;
      const rComments = await conn.query('DELETE FROM task_comments');
      deleted.task_comments = rComments.rowCount;
      const rAttach = await conn.query('DELETE FROM task_attachments');
      deleted.task_attachments = rAttach.rowCount;
      const rTime = await conn.query('DELETE FROM time_entries');
      deleted.time_entries = rTime.rowCount;
      const rSnap = await conn.query('DELETE FROM dashboard_snapshots');
      deleted.dashboard_snapshots = rSnap.rowCount;
      const r = await conn.query('DELETE FROM tasks');
      deleted.tasks = r.rowCount;
    }

    if (selected.has('clients')) {
      const r1 = await conn.query('UPDATE tasks SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['tasks.client_id'] = r1.rowCount;
      const r2 = await conn.query('UPDATE users SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['users.client_id'] = r2.rowCount;
      const r3 = await conn.query('UPDATE hiring_positions SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['hiring_positions.client_id'] = r3.rowCount;
      const r4 = await conn.query('UPDATE candidates SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['candidates.client_id'] = r4.rowCount;
      const r5 = await conn.query('UPDATE calendar_events SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['calendar_events.client_id'] = r5.rowCount;
      const r6 = await conn.query('DELETE FROM client_reports');
      deleted.client_reports = r6.rowCount;
      const r7 = await conn.query('UPDATE teams SET client_id = NULL WHERE client_id IS NOT NULL');
      nullified['teams.client_id'] = r7.rowCount;
      const r = await conn.query('DELETE FROM clients');
      deleted.clients = r.rowCount;
    }

    if (selected.has('expenses')) {
      const r1 = await conn.query('DELETE FROM expense_receipts');
      deleted.expense_receipts = r1.rowCount;
      const r2 = await conn.query('DELETE FROM expenses');
      deleted.expenses = r2.rowCount;
      const r3 = await conn.query('DELETE FROM expense_reports');
      deleted.expense_reports = r3.rowCount;
    }

    if (selected.has('bugs')) {
      const r1 = await conn.query('DELETE FROM bug_report_comments');
      deleted.bug_report_comments = r1.rowCount;
      const r2 = await conn.query('DELETE FROM bug_reports');
      deleted.bug_reports = r2.rowCount;
    }

    if (selected.has('hiring')) {
      const r1 = await conn.query('DELETE FROM candidates');
      deleted.candidates = r1.rowCount;
      const r2 = await conn.query('DELETE FROM hiring_positions');
      deleted.hiring_positions = r2.rowCount;
    }

    if (selected.has('calendar')) {
      const r = await conn.query('DELETE FROM calendar_events');
      deleted.calendar_events = r.rowCount;
    }

    if (selected.has('finance')) {
      const r = await conn.query('DELETE FROM finance_data');
      deleted.finance_data = r.rowCount;
    }

    if (selected.has('notifications')) {
      const r = await conn.query('DELETE FROM notifications');
      deleted.notifications = r.rowCount;
    }

    if (selected.has('audit_log')) {
      const r = await conn.query('DELETE FROM audit_log');
      deleted.audit_log = r.rowCount;
    }

    await conn.query('COMMIT');
  } catch (e) {
    await conn.query('ROLLBACK');
    log('error', 'Cleanse', 'Transaction failed — rolled back', { error: e.message, stack: e.stack?.split('\n').slice(0, 3).join(' | ') });
    return res.status(500).json({ error: 'Cleanse failed — all changes rolled back. ' + e.message });
  } finally {
    conn.release();
  }

  for (const filename of filesToDelete) {
    try {
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      log('warn', 'Cleanse', 'Failed to delete file', { filename, error: e.message });
    }
  }

  if (!selected.has('audit_log')) {
    await auditLog('system', null, 'cleanse', req.user?.displayName || req.user?.username, { categories: [...selected], deleted });
  } else {
    log('info', 'Cleanse', 'Data cleanse completed (audit_log was included in deletion)', { categories: [...selected], deleted });
  }

  const localStorageKeys = [...new Set(
    [...selected].flatMap(cat => CLEANSE_LOCAL_STORAGE_MAP[cat] || [])
  )];

  res.json({ deleted, nullified, localStorageKeys });
});

// Granola manual sync trigger
let lastGranolaSyncTrigger = 0;
router.post('/api/admin/granola-sync', requireNBI, requireAdmin, async (req, res) => {
  const now = Date.now();
  if (now - lastGranolaSyncTrigger < 5 * 60 * 1000) {
    return res.status(429).json({ error: 'Granola sync can only be triggered once every 5 minutes' });
  }
  lastGranolaSyncTrigger = now;
  try {
    const { syncGranolaMeetings } = require('../lib/granola-sync');
    const result = await syncGranolaMeetings({ pool, log, createNotification, _msalClient: _msalClient || null });
    res.json(result);
  } catch (e) {
    log('error', 'Admin', 'Manual Granola sync failed', { error: e.message });
    res.status(500).json({ error: e.message });
  }
});

  return router;
};
