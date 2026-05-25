'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const {
    pool, log, requireAdmin, requireNBI,
    isValidUuid, validateLength, auditLog,
    createNotification, upload,
    shiftForInsert, reorderInGroup,
  } = ctx;

  // Email utilities — imported directly so we don't need to change server.js ctx.
  // Keep as module reference (not destructured) so test spies can replace the function.
  const emailLib = require('../lib/email');
  const { escHtml } = require('../lib/helpers');

  /**
   * Notify all active NBI admin users by email when a client portal user
   * creates a bug report or posts a comment. Fire-and-forget — failures
   * are logged but never surface to the caller.
   */
  async function notifyAdminsOfClientActivity(subject, bodyHtml) {
    try {
      const { rows: admins } = await pool.query(
        "SELECT email, display_name FROM users WHERE role = 'admin' AND is_active = true AND client_id IS NULL"
      );
      const recipients = admins.filter(a => a.email);
      if (recipients.length === 0) return;
      const html = emailLib.buildEmailHtml('Client Portal Notification', bodyHtml);
      for (const admin of recipients) {
        emailLib.sendEmailAsync({ to: admin.email, subject, html, from: emailLib.EMAIL_FROM });
      }
    } catch (err) {
      log('error', 'BugReports', 'Failed to send client activity email notification', { error: err.message });
    }
  }

  // ==================== BUG / FEATURE REPORTS ====================

  /** GET /api/bug-reports — List all bug/feature reports (visible to all authenticated users) */
  router.get('/api/bug-reports', async (req, res) => {
    let where = [];
    let vals = [];
    let i = 1;
    const { status, type, priority } = req.query;

    // Client scoping: client users only see their company's reports
    if (req.user?.clientId) {
      where.push(`b.reporter_client_id = $${i}`);
      vals.push(req.user.clientId);
      i++;
    }

    if (status) { where.push(`b.status = $${i}`); vals.push(status); i++; }
    if (type) { where.push(`b.type = $${i}`); vals.push(type); i++; }
    if (priority) { where.push(`b.priority = $${i}`); vals.push(priority); i++; }
    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const { rows } = await pool.query(`
      SELECT b.id, b.user_id, b.type, b.title, b.description, b.page,
             b.status, b.priority, b.position, b.created_at, b.updated_at,
             b.source, b.reporter_client_id,
             (b.screenshot IS NOT NULL) AS has_screenshot,
             u.display_name AS reporter_name,
             rc.name AS reporter_client_name,
             (SELECT COUNT(*) FROM bug_report_comments c WHERE c.report_id = b.id)::int AS comment_count
      FROM bug_reports b LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN clients rc ON b.reporter_client_id = rc.id
      ${whereClause} ORDER BY b.status, b.position, b.created_at DESC
    `, vals);
    res.json({ reports: rows });
  });

  /** POST /api/bug-reports — Submit a new bug or feature report */
  router.post('/api/bug-reports', async (req, res) => {
    const { type, title, description, page, screenshot, priority } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    const descErr = validateLength(description, 'description');
    if (descErr) return res.status(400).json({ error: descErr });
    const validTypes = ['bug', 'feature'];
    const rType = validTypes.includes(type) ? type : 'bug';
    // Priority is optional at creation; admins can set it later. Non-admin submissions cannot set it.
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    let safePriority = null;
    if (priority !== undefined && priority !== null && priority !== '') {
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
      }
      // Only admins can set priority at creation time. Members get their priority silently dropped.
      if (req.user.role === 'admin') safePriority = priority;
    }
    // Limit screenshot base64 payload to ~5MB (safety valve against oversized uploads)
    const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
    const safeScreenshot = (screenshot && screenshot.length <= MAX_SCREENSHOT_BYTES) ? screenshot : null;

    // Tag source and reporter_client_id for client-submitted reports
    const source = req.user?.clientId ? 'client' : 'internal';
    const reporter_client_id = req.user?.clientId || null;

    const client = await pool.connect();
    let createdReport = null;
    try {
      await client.query('BEGIN');
      // Shift everything in the target column ('open' is the default for new bugs) down by 1
      await shiftForInsert(client, 'bug_reports', 'status', 'open');
      const { rows } = await client.query(
        `INSERT INTO bug_reports (user_id, type, title, description, page, screenshot, priority, position, source, reporter_client_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9) RETURNING *`,
        [req.user.id, rType, title.trim(), description || null, page || null, safeScreenshot, safePriority, source, reporter_client_id]
      );
      await client.query('COMMIT');
      createdReport = rows[0];
      res.status(201).json(createdReport);
    } catch (err) {
      await client.query('ROLLBACK');
      log('error', 'BugReports', 'POST failed', { error: err.message });
      res.status(500).json({ error: 'Failed to create bug report' });
    } finally {
      client.release();
    }

    // Email NBI admins when a client portal user submits a bug report
    if (createdReport && req.user?.clientId) {
      const reporterName = req.user.displayName || req.user.display_name || 'Unknown';
      // Look up the client name — clientName isn't on req.user
      let clientName = 'Client';
      try {
        const { rows: cl } = await pool.query('SELECT name FROM clients WHERE id = $1', [req.user.clientId]);
        if (cl.length > 0) clientName = cl[0].name;
      } catch (_) { /* use fallback */ }
      const truncDesc = (createdReport.description || '').slice(0, 500);
      const bugUrl = `${emailLib.APP_URL}/nbi_project_dashboard.html#bugs`;
      const priorityLabel = createdReport.priority
        ? `<strong>Priority:</strong> ${escHtml(createdReport.priority)}<br>`
        : '';
      const bodyHtml = `
        <p><strong>${escHtml(reporterName)}</strong> from <strong>${escHtml(clientName)}</strong> submitted a new ${escHtml(rType)} report.</p>
        <div style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #3b82f6;border-radius:4px">
          <h3 style="margin:0 0 8px;font-size:15px;color:#1e293b">${escHtml(createdReport.title)}</h3>
          ${priorityLabel}
          <p style="margin:0;color:#475569;font-size:13px">${escHtml(truncDesc)}${(createdReport.description || '').length > 500 ? '...' : ''}</p>
        </div>
        <p><a href="${escHtml(bugUrl)}" style="color:#3b82f6;text-decoration:underline">View in Bug Tracker</a></p>`;
      notifyAdminsOfClientActivity(
        `[WorkSage] New bug report from ${clientName}: ${createdReport.title}`,
        bodyHtml
      );
    }
  });

  /** PATCH /api/bug-reports/:id — Update status, priority, title, and/or description.
   *  Permissions: admin can change anything; reporter can change status, title, and description on own reports. */
  router.patch('/api/bug-reports/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });

    // Client scoping: client users can only modify their own company's reports
    if (req.user?.clientId) {
      const { rows: check } = await pool.query('SELECT reporter_client_id FROM bug_reports WHERE id = $1', [req.params.id]);
      if (check.length === 0) return res.status(404).json({ error: 'Not found' });
      if (check[0].reporter_client_id !== req.user.clientId) return res.status(403).json({ error: 'Access denied' });
    }

    const { status, description, priority, title } = req.body;
    if (!status && description === undefined && priority === undefined && title === undefined && req.body.position === undefined) {
      return res.status(400).json({ error: 'status, title, description, priority, or position required' });
    }

    const isAdmin = req.user.role === 'admin';

    // Look up the report to check ownership and get reporter info for notifications
    const { rows: existing } = await pool.query(
      `SELECT b.user_id, b.title, b.status AS old_status, b.priority AS old_priority, u.username AS reporter_username
       FROM bug_reports b LEFT JOIN users u ON b.user_id = u.id WHERE b.id = $1`,
      [req.params.id]
    );
    if (existing.length === 0) return res.status(404).json({ error: 'Report not found' });
    const report = existing[0];
    const isReporter = req.user.id === report.user_id;

    // Priority: admin only
    if (priority !== undefined && !isAdmin) {
      return res.status(403).json({ error: 'Only admins can set priority' });
    }
    // Status: admin or reporter
    if (status && !isAdmin && !isReporter) {
      return res.status(403).json({ error: 'Only the reporter or an admin can change status' });
    }
    // Description: admin or reporter
    if (description !== undefined && !isAdmin && !isReporter) {
      return res.status(403).json({ error: 'Only the reporter or an admin can edit the description' });
    }
    // Title: admin or reporter
    if (title !== undefined && !isAdmin && !isReporter) {
      return res.status(403).json({ error: 'Only the reporter or an admin can edit the title' });
    }

    const sets = ['updated_at = NOW()'];
    const vals = [];
    let idx = 1;

    if (status) {
      const validStatuses = ['open', 'in_progress', 'please_review', 'resolved', 'wontfix'];
      if (!validStatuses.includes(status)) return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      // Status is routed through reorderInGroup below — do NOT add to sets
    }
    if (priority !== undefined) {
      const validPriorities = ['critical', 'high', 'medium', 'low', null];
      if (priority !== null && !validPriorities.includes(priority)) {
        return res.status(400).json({ error: `Invalid priority. Must be one of: critical, high, medium, low` });
      }
      sets.push(`priority = $${idx++}`);
      vals.push(priority);
    }
    if (title !== undefined) {
      if (!title || !String(title).trim()) return res.status(400).json({ error: 'Title cannot be empty' });
      const titleErr = validateLength(title, 'title');
      if (titleErr) return res.status(400).json({ error: titleErr });
      sets.push(`title = $${idx++}`);
      vals.push(String(title).trim());
    }
    if (description !== undefined) {
      const descErr = validateLength(description, 'description');
      if (descErr) return res.status(400).json({ error: descErr });
      sets.push(`description = $${idx++}`);
      vals.push(description);
    }

    // Position / status routed through the reorder helper inside a transaction
    const wantsReorder = (status !== undefined) || (req.body.position !== undefined);
    const newPosition = req.body.position;

    const client = await pool.connect();
    let resultRow;
    try {
      await client.query('BEGIN');

      if (wantsReorder) {
        const targetStatus = status || report.old_status;
        const targetPos = (typeof newPosition === 'number' && Number.isInteger(newPosition))
          ? newPosition
          : 0;
        await reorderInGroup(client, 'bug_reports', 'status', req.params.id, targetStatus, targetPos);
      }

      if (vals.length > 0) {
        vals.push(req.params.id);
        await client.query(`UPDATE bug_reports SET ${sets.join(', ')} WHERE id = $${idx}`, vals);
      } else if (sets.length > 1) {
        // sets has only updated_at if no body fields — only worth touching if reorder didn't already update_at
        // (reorderInGroup already updates updated_at, so skip this when wantsReorder)
        if (!wantsReorder) {
          await client.query(`UPDATE bug_reports SET updated_at = NOW() WHERE id = $1`, [req.params.id]);
        }
      }

      const fresh = await client.query('SELECT * FROM bug_reports WHERE id = $1', [req.params.id]);
      resultRow = fresh.rows[0];
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      log('error', 'BugReports', 'PATCH failed', { error: err.message });
      return res.status(500).json({ error: 'Failed to update bug report' });
    } finally {
      client.release();
    }

    await auditLog('bug_report', req.params.id, 'update', req.user?.displayName || 'unknown', {
      status, priority,
      description: description !== undefined,
      title: title !== undefined,
      position: newPosition !== undefined ? newPosition : undefined,
    });

    // Send notifications for status and priority changes
    const notifyUser = report.reporter_username;
    if (notifyUser && notifyUser !== req.user.username) {
      try {
        if (status && status !== report.old_status) {
          const statusLabels = { in_progress: 'In Progress', please_review: 'Please Review', resolved: 'Resolved', wontfix: "Won't Fix", open: 'Open' };
          await createNotification(notifyUser, status === 'resolved' ? 'success' : 'info',
            `Report ${statusLabels[status] || status}`,
            `"${report.title}" has been updated to ${statusLabels[status] || status}.`,
            '/nbi_project_dashboard.html#bugs');
        }
        if (priority !== undefined && priority !== report.old_priority) {
          await createNotification(notifyUser, 'info', 'Priority updated',
            `"${report.title}" priority set to ${priority || 'unset'}.`,
            '/nbi_project_dashboard.html#bugs');
        }
      } catch (e) { log('error', 'BugReports', 'Failed to send notification', { error: e.message }); }
    }

    res.json(resultRow);
  });

  /** POST /api/bug-reports/:id/notify-review — Send a notification to the report submitter (admin only) */
  router.post('/api/bug-reports/:id/notify-review', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });
    try {
      const { rows } = await pool.query(
        `SELECT b.title, b.user_id, u.username FROM bug_reports b LEFT JOIN users u ON b.user_id = u.id WHERE b.id = $1`,
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
      const { title, username } = rows[0];
      if (username) {
        await createNotification(
          username, 'info', 'Your report needs review',
          `"${title}" has been updated to Please Review. Click to add details or mark as resolved.`,
          '/nbi_project_dashboard.html#bugs'
        );
      }
      res.json({ ok: true });
    } catch (e) {
      log('error', 'BugReports', 'Failed to send review notification', { error: e.message });
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  /** GET /api/bug-reports/:id/comments — List comments for a bug report */
  router.get('/api/bug-reports/:id/comments', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });
    // Client scoping: client users can only access comments on their company's reports
    if (req.user?.clientId) {
      const { rows: check } = await pool.query('SELECT reporter_client_id FROM bug_reports WHERE id = $1', [req.params.id]);
      if (check.length === 0) return res.status(404).json({ error: 'Not found' });
      if (check[0].reporter_client_id !== req.user.clientId) return res.status(403).json({ error: 'Access denied' });
    }
    const { rows } = await pool.query(
      'SELECT * FROM bug_report_comments WHERE report_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json(rows);
  });

  /** POST /api/bug-reports/:id/comments — Add a comment to a bug report */
  router.post('/api/bug-reports/:id/comments', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });
    // Client scoping: client users can only comment on their company's reports
    if (req.user?.clientId) {
      const { rows: check } = await pool.query('SELECT reporter_client_id FROM bug_reports WHERE id = $1', [req.params.id]);
      if (check.length === 0) return res.status(404).json({ error: 'Not found' });
      if (check[0].reporter_client_id !== req.user.clientId) return res.status(403).json({ error: 'Access denied' });
    }
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ error: 'text required' });
    const textErr = validateLength(text, 'text');
    if (textErr) return res.status(400).json({ error: textErr });
    const author = req.user?.displayName || req.user?.display_name || 'Unknown';
    const { rows } = await pool.query(
      'INSERT INTO bug_report_comments (report_id, author, text) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, author, text.trim()]
    );
    await pool.query('UPDATE bug_reports SET updated_at = NOW() WHERE id = $1', [req.params.id]);
    await auditLog('bug_comment', rows[0].id, 'create', author, { report_id: req.params.id, text: text.trim() });

    // Notify the reporter (if commenter is not the reporter) and admin (if commenter is not admin)
    try {
      const { rows: rpt } = await pool.query(
        `SELECT b.user_id, b.title, u.username AS reporter_username
         FROM bug_reports b LEFT JOIN users u ON b.user_id = u.id WHERE b.id = $1`,
        [req.params.id]
      );
      if (rpt.length > 0) {
        const { reporter_username, title } = rpt[0];
        if (reporter_username && reporter_username !== req.user.username) {
          await createNotification(reporter_username, 'info', 'New comment on your report',
            `${author} commented on "${title}".`, '/nbi_project_dashboard.html#bugs');
        }
        // Notify admin if commenter is not admin
        if (req.user.role !== 'admin') {
          const { rows: admins } = await pool.query("SELECT username FROM users WHERE role = 'admin' AND username != $1", [req.user.username]);
          for (const a of admins) {
            await createNotification(a.username, 'info', 'New bug report comment',
              `${author} commented on "${title}".`, '/nbi_project_dashboard.html#bugs');
          }
        }
      }
    } catch (e) { log('error', 'BugComments', 'Failed to send comment notification', { error: e.message }); }

    // Email NBI admins when a client portal user posts a comment
    if (req.user?.clientId) {
      try {
        const { rows: bugRow } = await pool.query('SELECT title FROM bug_reports WHERE id = $1', [req.params.id]);
        const bugTitle = bugRow.length > 0 ? bugRow[0].title : `#${req.params.id}`;
        const truncComment = text.trim().slice(0, 500);
        const bugUrl = `${emailLib.APP_URL}/nbi_project_dashboard.html#bugs`;
        const bodyHtml = `
          <p><strong>${escHtml(author)}</strong> posted a comment on bug report <strong>${escHtml(bugTitle)}</strong>.</p>
          <div style="margin:16px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #f59e0b;border-radius:4px">
            <p style="margin:0;color:#475569;font-size:13px">${escHtml(truncComment)}${text.trim().length > 500 ? '...' : ''}</p>
          </div>
          <p><a href="${escHtml(bugUrl)}" style="color:#3b82f6;text-decoration:underline">View in Bug Tracker</a></p>`;
        notifyAdminsOfClientActivity(
          `[WorkSage] New comment on bug #${req.params.id.slice(0, 8)} from ${author}`,
          bodyHtml
        );
      } catch (e) { log('error', 'BugComments', 'Failed to send client comment email notification', { error: e.message }); }
    }

    res.status(201).json(rows[0]);
  });

  /** DELETE /api/bug-reports/:id/comments/:commentId — Delete a comment (own or admin) */
  router.delete('/api/bug-reports/:id/comments/:commentId', async (req, res) => {
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.commentId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    // Client scoping: client users can only delete comments on their company's reports
    if (req.user?.clientId) {
      const { rows: check } = await pool.query('SELECT reporter_client_id FROM bug_reports WHERE id = $1', [req.params.id]);
      if (check.length === 0) return res.status(404).json({ error: 'Not found' });
      if (check[0].reporter_client_id !== req.user.clientId) return res.status(403).json({ error: 'Access denied' });
    }
    const { rows } = await pool.query(
      'SELECT author FROM bug_report_comments WHERE id = $1 AND report_id = $2',
      [req.params.commentId, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    const isOwner = rows[0].author === (req.user?.displayName || req.user?.display_name);
    if (!isOwner && req.user.role !== 'admin') return res.status(403).json({ error: 'Can only delete your own comments' });
    await pool.query('DELETE FROM bug_report_comments WHERE id = $1 AND report_id = $2',
      [req.params.commentId, req.params.id]
    );
    res.json({ ok: true });
  });

  /** DELETE /api/bug-reports/:id — Delete a report (admin only) */
  router.delete('/api/bug-reports/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });
    await pool.query('DELETE FROM bug_reports WHERE id = $1', [req.params.id]);
    await auditLog('bug_report', req.params.id, 'delete', req.user?.displayName || 'unknown', {});
    res.json({ ok: true });
  });

  /** GET /api/bug-reports/:id/screenshot — Serve the screenshot image */
  router.get('/api/bug-reports/:id/screenshot', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid report ID' });
    // Client scoping: client users can only view screenshots from their company's reports
    if (req.user?.clientId) {
      const { rows: check } = await pool.query('SELECT reporter_client_id FROM bug_reports WHERE id = $1', [req.params.id]);
      if (check.length === 0) return res.status(404).json({ error: 'Not found' });
      if (check[0].reporter_client_id !== req.user.clientId) return res.status(403).json({ error: 'Access denied' });
    }
    const { rows } = await pool.query('SELECT screenshot FROM bug_reports WHERE id = $1', [req.params.id]);
    if (rows.length === 0 || !rows[0].screenshot) return res.status(404).json({ error: 'No screenshot' });
    const data = rows[0].screenshot;
    // Screenshot is stored as base64 data URL
    const match = data.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return res.status(400).json({ error: 'Invalid screenshot format' });
    const allowedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(match[1])) return res.status(400).json({ error: 'Invalid image type' });
    const buffer = Buffer.from(match[2], 'base64');
    res.setHeader('Content-Type', match[1]);
    res.send(buffer);
  });

  return router;
};
