# Server Modularisation — Task 10: Extract 10 Small Route Groups

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract 10 small, independent route groups from `server.js` into individual files under `routes/`, wired back via `app.use(require('./routes/X')(ctx))`, with all 387 tests still passing.

**Architecture:** Each route file exports `function(ctx) { return router; }`. Dependencies come exclusively from `ctx`. `server.js` gains 10 `app.use(require(...)(ctx))` calls placed after `app.use(requireAuth)` (line 485) and before the error handler (line 9250). The extracted routes are deleted from `server.js`.

**Tech Stack:** Node.js/Express 4 (CommonJS), Vitest (387 tests must pass after all steps)

**Worktree:** `D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/modularise-server/dashboard-server`

**Test command:** `cd D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/modularise-server/dashboard-server && npm test`

---

## Pre-flight: What Already Exists

- `routes/settings.js` — DONE (created before plan was written)
- All other 9 route files — TO CREATE

## File Map

| Route file | Routes in server.js (lines) | Deps from ctx |
|---|---|---|
| `routes/settings.js` | 5302–5332 | `pool, requireAdmin` |
| `routes/finance.js` | 2314–2355 + 995–1007 | `pool, requireNBI, requireAdmin, auditLog, syncConflicts, log` |
| `routes/time-entries.js` | 1620–1682 | `pool, isValidUuid, requireTaskAccess` |
| `routes/time-off.js` | 8324–8366 | `pool, requireAdmin, isValidUuid` |
| `routes/queue.js` | 6980–7021 | `pool, requireAdmin, log, isValidUuid, validateLength` |
| `routes/contacts.js` | 3121–3134 | `pool, requireAuth, requireAdmin, isValidUuid` |
| `routes/client-notes.js` | 3157–3203 | `pool, requireAdmin, getClientScopes, buildPatchQuery` |
| `routes/notifications.js` | 1687–1747 | `pool, requireAdmin, requireNBI, createNotification, log` |
| `routes/templates.js` | 1752–1814 | `pool, requireAdmin, isValidUuid, log` |
| `routes/slack.js` | 6945–6975 | `pool, log, verifySlackSignature, handleAppMention` |

**Mount point in server.js:** After line 485 (`app.use(requireAuth);`) — add the 10 `app.use()` calls. The `ctx` object is built inline per-route with only the deps each file needs.

**Deletion:** After adding the mounts, delete the extracted route blocks from server.js. The `finance/seed` block (lines 995–1008) gets moved to `routes/finance.js` despite living early in server.js — search by the comment `GET /api/finance/seed`.

**Special cases:**
- `routes/notifications.js`: `createNotification` is required at line 1734 as `const { createNotification } = require('./lib/notifications')(pool);` — this stays in server.js and is passed as `ctx.createNotification` to routes that need it.
- `routes/queue.js` POST route: dual-auth — accepts either `x-api-key` header OR session auth. Uses `crypto.timingSafeEqual`. Add `const crypto = require('crypto');` at top of queue.js.
- `routes/finance.js` seed route lives at line 995 (near the top of server.js), not near the other finance routes at 2314. Both blocks get extracted to `routes/finance.js`.

---

## Step 1: Create routes/finance.js

- [ ] **1a: Write the file**

```javascript
// dashboard-server/routes/finance.js
const path = require('path');
const fs = require('fs');

module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireNBI, requireAdmin, auditLog, syncConflicts, log } = ctx;

  router.get('/api/finance/seed', requireNBI, requireAdmin, async (req, res) => {
    try {
      const seedPath = path.join(__dirname, '..', 'finance-seed.json');
      if (fs.existsSync(seedPath)) {
        const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
        res.json(data);
      } else {
        res.json({ revenue: [], pipeline: [], payroll: [], targets: {}, opex: [] });
      }
    } catch(e) {
      log('error', 'Finance', 'Failed to load finance seed data', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  router.get('/api/finance', requireNBI, async (req, res) => {
    const { rows } = await pool.query('SELECT id, data, updated_by, updated_at FROM finance_data ORDER BY id DESC LIMIT 1');
    if (rows.length === 0) return res.json({ data: null, version: 0 });
    res.json({ data: rows[0].data, updatedBy: rows[0].updated_by, updatedAt: rows[0].updated_at, version: rows[0].id });
  });

  router.put('/api/finance', requireNBI, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
    const { data, expectedVersion } = req.body;
    if (!data) return res.status(400).json({ error: 'data required' });

    const requiredArrays = ['revenue', 'payroll'];
    const missing = requiredArrays.filter(k => !Array.isArray(data[k]));
    if (missing.length > 0) {
      log('warn', 'Finance', `BLOCKED corrupt save from ${req.user?.displayName}`, { missing: missing.join(', '), keysSent: Object.keys(data).join(', ') });
      return res.status(400).json({ error: `Finance data integrity check failed: missing ${missing.join(', ')}. This save was blocked to prevent data loss.` });
    }

    if (expectedVersion !== undefined) {
      const { rows: latest } = await pool.query('SELECT id, updated_by, updated_at FROM finance_data ORDER BY id DESC LIMIT 1');
      if (latest.length > 0 && latest[0].id !== expectedVersion) {
        syncConflicts?.inc();
        return res.status(409).json({
          error: 'Conflict: finance data was updated by another user. Please reload and try again.',
          currentVersion: latest[0].id,
          updatedBy: latest[0].updated_by,
          updatedAt: latest[0].updated_at
        });
      }
    }

    const updatedBy = req.user?.displayName || 'unknown';
    const { rows: inserted } = await pool.query('INSERT INTO finance_data (data, updated_by) VALUES ($1, $2) RETURNING id', [JSON.stringify(data), updatedBy]);
    await auditLog('finance', 'finance_data', 'update', updatedBy, { sections: Object.keys(data) });
    res.json({ ok: true, version: inserted[0].id });
  });

  return router;
};
```

---

## Step 2: Create routes/time-entries.js

- [ ] **2a: Write the file**

```javascript
// dashboard-server/routes/time-entries.js
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, isValidUuid, requireTaskAccess } = ctx;

  router.get('/api/tasks/:id/time-entries', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
    const allowed = await requireTaskAccess(req, res, req.params.id);
    if (!allowed) return;
    const { rows } = await pool.query('SELECT * FROM time_entries WHERE task_id = $1 ORDER BY date DESC, created_at DESC', [req.params.id]);
    res.json(rows);
  });

  router.post('/api/tasks/:id/time-entries', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid task ID' });
    const allowed = await requireTaskAccess(req, res, req.params.id);
    if (!allowed) return;
    const { hours, description, date } = req.body;
    if (!hours || hours <= 0) return res.status(400).json({ error: 'hours required (> 0)' });
    const userName = req.user?.displayName || 'Unknown';
    const entryDate = date || new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query(
      'INSERT INTO time_entries (task_id, user_name, description, hours, date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [req.params.id, userName, description || '', hours, entryDate]
    );
    await pool.query('UPDATE tasks SET hours_spent = COALESCE((SELECT SUM(hours) FROM time_entries WHERE task_id = $1), 0), updated_at = NOW() WHERE id = $1', [req.params.id]);
    res.status(201).json(rows[0]);
  });

  router.delete('/api/time-entries/:id', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid time entry ID' });
    const { rows } = await pool.query('SELECT task_id, user_name FROM time_entries WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Time entry not found' });
    const isOwner = rows[0].user_name === (req.user?.displayName || req.user?.display_name || req.user?.username);
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Can only delete your own time entries' });
    await pool.query('DELETE FROM time_entries WHERE id = $1', [req.params.id]);
    if (rows.length > 0) {
      await pool.query('UPDATE tasks SET hours_spent = COALESCE((SELECT SUM(hours) FROM time_entries WHERE task_id = $1), 0), updated_at = NOW() WHERE id = $1', [rows[0].task_id]);
    }
    res.json({ ok: true });
  });

  router.get('/api/time-entries/summary', async (req, res) => {
    const { from, to } = req.query;
    let dateFilter = '';
    const params = [];
    if (from) { params.push(from); dateFilter += ` AND te.date >= $${params.length}`; }
    if (to) { params.push(to); dateFilter += ` AND te.date <= $${params.length}`; }
    const { rows } = await pool.query(`
      SELECT te.user_name, t.client_id, c.name as client_name,
             SUM(te.hours) as total_hours, COUNT(*) as entry_count
      FROM time_entries te
      JOIN tasks t ON te.task_id = t.id
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE 1=1 ${dateFilter}
      GROUP BY te.user_name, t.client_id, c.name
      ORDER BY te.user_name, c.name
    `, params);
    res.json(rows);
  });

  return router;
};
```

---

## Step 3: Create routes/time-off.js

- [ ] **3a: Write the file**

```javascript
// dashboard-server/routes/time-off.js
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, isValidUuid } = ctx;

  router.get('/api/users/:userId/time-off', async (req, res) => {
    if (!isValidUuid(req.params.userId)) return res.status(400).json({ error: 'Invalid user ID' });
    const { rows } = await pool.query(
      'SELECT * FROM time_off WHERE user_id = $1 ORDER BY start_date',
      [req.params.userId]
    );
    res.json(rows);
  });

  router.get('/api/time-off', async (req, res) => {
    const { from, to } = req.query;
    let where = []; let vals = []; let i = 1;
    if (from) { where.push(`end_date >= $${i}`); vals.push(from); i++; }
    if (to) { where.push(`start_date <= $${i}`); vals.push(to); i++; }
    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const { rows } = await pool.query(
      `SELECT t.*, u.display_name FROM time_off t LEFT JOIN users u ON u.id = t.user_id ${whereClause} ORDER BY t.start_date`,
      vals
    );
    res.json(rows);
  });

  router.post('/api/users/:userId/time-off', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.userId)) return res.status(400).json({ error: 'Invalid user ID' });
    const { start_date, end_date, label } = req.body;
    if (!start_date || !end_date) return res.status(400).json({ error: 'start_date and end_date are required' });
    if (new Date(end_date) < new Date(start_date)) return res.status(400).json({ error: 'end_date must be >= start_date' });
    const { rows } = await pool.query(
      'INSERT INTO time_off (user_id, start_date, end_date, label) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.params.userId, start_date, end_date, label || '']
    );
    res.status(201).json(rows[0]);
  });

  router.delete('/api/time-off/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid time-off ID' });
    const { rowCount } = await pool.query('DELETE FROM time_off WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  });

  return router;
};
```

---

## Step 4: Create routes/queue.js

- [ ] **4a: Write the file**

Note: The POST route accepts both API-key auth and session auth. `crypto` is a Node.js built-in.

```javascript
// dashboard-server/routes/queue.js
const crypto = require('crypto');

module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, log, isValidUuid, validateLength } = ctx;

  router.get('/api/queue', requireAdmin, async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM task_queue ORDER BY created_at DESC');
    res.json(rows);
  });

  router.post('/api/queue', async (req, res) => {
    let submittedBy = null;
    const apiKey = req.get('x-api-key');
    const expectedKey = process.env.QUEUE_API_KEY;
    if (apiKey) {
      if (!expectedKey || apiKey.length !== expectedKey.length ||
          !crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(expectedKey))) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      submittedBy = req.body?.submitted_by || 'api-key';
    } else {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });
      const isAdmin = req.user.role === 'admin';
      if (!isAdmin && !req.user.can_submit_queue) {
        return res.status(403).json({ error: 'Queue submission not enabled for this account' });
      }
      submittedBy = req.user.displayName || 'Unknown';
    }
    const { title, description, slack_user_id, slack_channel, slack_message_ts } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'title required' });
    const lenErr = validateLength(title.trim(), 'title') || (description ? validateLength(description, 'description') : null);
    if (lenErr) return res.status(400).json({ error: lenErr });
    const { rows } = await pool.query(
      `INSERT INTO task_queue (title, description, submitted_by, slack_user_id, slack_channel, slack_message_ts)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title.trim(), description || null, submittedBy, slack_user_id || null, slack_channel || null, slack_message_ts || null]
    );
    res.status(201).json(rows[0]);
  });

  router.delete('/api/queue/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid ID' });
    await pool.query('DELETE FROM task_queue WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });

  return router;
};
```

---

## Step 5: Create routes/contacts.js

- [ ] **5a: Write the file**

Note: The task spec says only GET and POST for `/api/clients/:clientId/contacts`. The PATCH and DELETE `/api/contacts/:id` routes are NOT part of this task's scope — they remain in server.js for now.

```javascript
// dashboard-server/routes/contacts.js
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAuth, requireAdmin } = ctx;

  router.get('/api/clients/:clientId/contacts', requireAuth, async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM contacts WHERE client_id = $1 ORDER BY sort_order', [req.params.clientId]);
    res.json(rows);
  });

  router.post('/api/clients/:clientId/contacts', requireAdmin, async (req, res) => {
    const { name, role, notes, background, linkedin, sort_order, email, phone } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO contacts (client_id, name, role, notes, background, linkedin, sort_order, email, phone) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.params.clientId, name || '', role || '', notes || '', background || '', linkedin || '', sort_order || 0, email || '', phone || '']
    );
    res.status(201).json(rows[0]);
  });

  return router;
};
```

---

## Step 6: Create routes/client-notes.js

- [ ] **6a: Write the file**

```javascript
// dashboard-server/routes/client-notes.js
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, getClientScopes, buildPatchQuery } = ctx;

  router.get('/api/clients/:clientId/notes', async (req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM client_notes WHERE client_id = $1 ORDER BY meeting_date DESC NULLS LAST, created_at DESC',
      [req.params.clientId]
    );
    res.json(rows);
  });

  router.get('/api/notes', async (req, res) => {
    const { rows } = await pool.query(`
      SELECT n.*, c.name as client_name
      FROM client_notes n JOIN clients c ON n.client_id = c.id
      ORDER BY n.meeting_date DESC NULLS LAST, n.created_at DESC
    `);
    res.json(rows);
  });

  router.post('/api/clients/:clientId/notes', requireAdmin, async (req, res) => {
    const { title, content, source, source_id, source_url, meeting_date, author } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const { rows } = await pool.query(
      `INSERT INTO client_notes (client_id, title, content, source, source_id, source_url, meeting_date, author)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.params.clientId, title, content || '', source || 'manual', source_id || '', source_url || '',
       meeting_date || null, author || (req.user && req.user.display_name) || 'Unknown']
    );
    res.status(201).json(rows[0]);
  });

  router.patch('/api/notes/:id', requireAdmin, async (req, res) => {
    const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['title', 'content', 'source', 'meeting_date', 'author']);
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    updates.push('updated_at = NOW()');
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE client_notes SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
    if (rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    res.json(rows[0]);
  });

  router.delete('/api/notes/:id', requireAdmin, async (req, res) => {
    await pool.query('DELETE FROM client_notes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });

  return router;
};
```

---

## Step 7: Create routes/notifications.js

- [ ] **7a: Write the file**

Note: `createNotification` is already initialised in server.js at line 1734 from `require('./lib/notifications')(pool)`. It is passed in via ctx.

```javascript
// dashboard-server/routes/notifications.js
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, requireNBI, createNotification, log } = ctx;

  router.get('/api/notifications', async (req, res) => {
    const username = req.user?.username || '';
    const { rows } = await pool.query(
      'SELECT * FROM notifications WHERE username = $1 ORDER BY created_at DESC LIMIT 50', [username]
    );
    const unread = rows.filter(n => !n.is_read).length;
    res.json({ notifications: rows, unread });
  });

  router.post('/api/notifications', requireAdmin, async (req, res) => {
    const { username, type, title, message, link } = req.body;
    if (!username || !title) return res.status(400).json({ error: 'username and title required' });
    await createNotification(username, type || 'info', title, message || '', link || '');
    res.status(201).json({ ok: true });
  });

  router.post('/api/notifications/read', async (req, res) => {
    const username = req.user?.username || '';
    const { ids, force } = req.body;
    const dismissFilter = force ? '' : ' AND (dismissable IS NULL OR dismissable = true)';
    if (ids && ids.length > 0) {
      await pool.query(`UPDATE notifications SET is_read = true WHERE id = ANY($1) AND username = $2${dismissFilter}`, [ids, username]);
    } else {
      await pool.query(`UPDATE notifications SET is_read = true WHERE username = $1${dismissFilter}`, [username]);
    }
    res.json({ ok: true });
  });

  router.delete('/api/notifications', async (req, res) => {
    const username = req.user?.username || '';
    await pool.query('DELETE FROM notifications WHERE username = $1 AND is_read = true', [username]);
    res.json({ ok: true });
  });

  router.post('/api/notifications/clear-all', async (req, res) => {
    const username = req.user?.username || '';
    await pool.query('DELETE FROM notifications WHERE username = $1', [username]);
    res.json({ ok: true });
  });

  router.post('/api/notifications/system', requireNBI, requireAdmin, async (req, res) => {
    const { title, message } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
    const { rowCount: sent } = await pool.query(
      `INSERT INTO notifications (username, type, title, message, link, dismissable)
       SELECT username, 'system', $1, $2, '', false FROM users WHERE is_active = true`,
      [title, message]
    );
    log('info', 'Notifications', `System message sent to ${sent} users`, { title });
    res.json({ sent });
  });

  return router;
};
```

---

## Step 8: Create routes/templates.js

- [ ] **8a: Write the file**

```javascript
// dashboard-server/routes/templates.js
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, isValidUuid, log } = ctx;

  router.get('/api/templates', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM task_templates ORDER BY name');
    res.json(rows);
  });

  router.post('/api/templates', requireAdmin, async (req, res) => {
    const { name, template, recurrence } = req.body;
    if (!name || !template) return res.status(400).json({ error: 'name and template required' });
    const { rows } = await pool.query(
      'INSERT INTO task_templates (name, template, recurrence, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, JSON.stringify(template), recurrence || '', req.user?.displayName || 'unknown']
    );
    res.status(201).json(rows[0]);
  });

  router.post('/api/templates/:id/create', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid template ID' });
    const { rows } = await pool.query('SELECT * FROM task_templates WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    const tmpl = rows[0].template;
    const created = [];
    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');

      async function createFromTemplate(node, parentId) {
        const taskResult = await conn.query(
          `INSERT INTO tasks (title, parent_id, status, priority, description, assignees, hours_estimated, source)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'template') RETURNING id`,
          [node.title, parentId, node.status || 'Not started', node.priority || '', node.description || '', node.assignees || [], node.hoursEstimated || 0]
        );
        created.push({ id: taskResult.rows[0].id, title: node.title });
        if (node.children) {
          for (const child of node.children) {
            await createFromTemplate(child, taskResult.rows[0].id);
          }
        }
      }
      await createFromTemplate(tmpl, null);
      await conn.query('UPDATE task_templates SET last_created_at = NOW() WHERE id = $1', [req.params.id]);
      await conn.query('COMMIT');
      res.json({ ok: true, created });
    } catch (err) {
      await conn.query('ROLLBACK');
      log('error', 'Templates', 'Template instantiation failed, rolled back', { error: err.message });
      res.status(500).json({ error: 'Template creation failed' });
    } finally {
      conn.release();
    }
  });

  router.delete('/api/templates/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid template ID' });
    await pool.query('DELETE FROM task_templates WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });

  return router;
};
```

---

## Step 9: Create routes/slack.js

- [ ] **9a: Write the file**

```javascript
// dashboard-server/routes/slack.js
module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, log, verifySlackSignature, handleAppMention } = ctx;

  router.post('/api/slack/events', async (req, res) => {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;
    const timestamp = req.get('x-slack-request-timestamp');
    const signature = req.get('x-slack-signature');

    if (!signingSecret) {
      log('warn', 'Slack', 'SLACK_SIGNING_SECRET not configured');
      return res.status(503).json({ error: 'Slack integration not configured' });
    }

    const rawBody = req.rawBody || JSON.stringify(req.body);
    if (!verifySlackSignature(signingSecret, timestamp, rawBody, signature)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    if (req.body?.type === 'url_verification') {
      return res.json({ challenge: req.body.challenge });
    }

    res.json({ ok: true });

    const event = req.body?.event;
    if (event?.bot_id || event?.subtype === 'bot_message') return;
    if (event?.type !== 'app_mention' && event?.type !== 'message') return;

    try {
      await handleAppMention(event, pool, process.env.SLACK_BOT_TOKEN || '');
    } catch (err) {
      log('error', 'Slack', 'Failed to handle app_mention', { error: err.message });
    }
  });

  return router;
};
```

---

## Step 10: Wire all routes into server.js + delete extracted blocks

- [ ] **10a: Add mount calls in server.js**

Find line 485 (`app.use(requireAuth);`) and the block immediately after it. Add these 10 `app.use()` calls after `app.use(requireAuth);`:

```javascript
// ==================== MODULAR ROUTES ====================
app.use(require('./routes/settings')({ pool, requireAdmin }));
app.use(require('./routes/finance')({ pool, requireNBI, requireAdmin, auditLog, syncConflicts, log }));
app.use(require('./routes/time-entries')({ pool, isValidUuid, requireTaskAccess }));
app.use(require('./routes/time-off')({ pool, requireAdmin, isValidUuid }));
app.use(require('./routes/queue')({ pool, requireAdmin, log, isValidUuid, validateLength }));
app.use(require('./routes/contacts')({ pool, requireAuth, requireAdmin }));
app.use(require('./routes/client-notes')({ pool, requireAdmin, getClientScopes, buildPatchQuery }));
app.use(require('./routes/notifications')({ pool, requireAdmin, requireNBI, createNotification, log }));
app.use(require('./routes/templates')({ pool, requireAdmin, isValidUuid, log }));
app.use(require('./routes/slack')({ pool, log, verifySlackSignature, handleAppMention }));
```

- [ ] **10b: Delete the extracted route blocks from server.js**

Delete these exact line ranges (search by the comment headers, not by line number — line numbers shift as you delete):

1. `// ==================== SETTINGS ====================` block — the GET /api/settings and PUT /api/settings/:key routes (plus the SETTINGS_ALLOW_LIST const above the PUT)
2. `// ==================== FINANCE DATA ====================` block — GET /api/finance and PUT /api/finance
3. The `GET /api/finance/seed` route (search: `app.get('/api/finance/seed'`) near line 995
4. `// ==================== TIME TRACKING ====================` block — all 4 time-entries routes
5. `// ==================== TIME-OFF ====================` block — all 4 time-off routes
6. `// ==================== TASK QUEUE ====================` block — all 3 queue routes
7. The two contacts routes under `// ==================== CONTACTS ====================` (GET and POST for `/api/clients/:clientId/contacts` — leave PATCH and DELETE /api/contacts/:id in place)
8. `// ==================== CLIENT NOTES ====================` block — all 5 client-note routes
9. `// ==================== NOTIFICATIONS ====================` first block (GET, POST, POST/read, DELETE, POST/clear-all) — lines 1684–1731. The second `// ==================== NOTIFICATIONS ====================` comment at line 1733 and the `require('./lib/notifications')` line stay — notifications.js POST /system follows it. Also delete POST /api/notifications/system.
10. `// ==================== TASK TEMPLATES ====================` block — all 4 template routes
11. `// ==================== SLACK BOT ====================` block — the single POST /api/slack/events route

**Deletion order tip:** Delete from bottom to top so earlier line numbers don't shift. Order: settings (highest lines) → time-off → queue → slack → client-notes → contacts (just the 2 routes) → notifications → templates → time-entries → finance (both blocks — 2314 block first, then 995 block).

- [ ] **10c: Run tests**

```bash
cd D:/OneDrive/Claude_code/NBIAI_TEAM/.worktrees/modularise-server/dashboard-server && npm test
```

Expected: 387 passed, 0 failed.

If any test fails, the most likely causes are:
- A route deleted from server.js but mount call missing → check that all 10 `app.use()` calls are present
- A dep missing from the ctx object passed to a route → check the `const { ... } = ctx;` destructuring in the failing route file against what was passed
- `createNotification` not yet defined when `app.use(require('./routes/notifications')(...))` runs → move the `require('./lib/notifications')(pool)` line above the mount block

---

## Step 11: Verify `createNotification` is in scope before the mount

The `createNotification` const is currently defined at line 1734, which is inside the notifications route block that will be deleted. Before deleting that block, confirm that `const { createNotification } = require('./lib/notifications')(pool);` appears in server.js at or before the mount block. If the deletion accidentally removed it, re-add it right before the `// ==================== MODULAR ROUTES ====================` comment.

---

## Acceptance Criteria

- [ ] All 10 route files exist under `dashboard-server/routes/`
- [ ] All 10 `app.use()` calls present in server.js after `app.use(requireAuth)`
- [ ] None of the extracted route blocks remain in server.js
- [ ] `npm test` reports 387 passed, 0 failed
- [ ] No changes to any route path, HTTP method, request body, or response shape
