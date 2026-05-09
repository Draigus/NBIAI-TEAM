'use strict';

const crypto = require('crypto');
const PDFDocument = require('pdfkit');

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, requireAdmin, requireNBI, isValidUuid, auditLog, escHtml } = ctx;

  // ==================== CLIENT STATUS REPORTS ====================

  /** POST /api/clients/:id/reports -- Generate a client status report snapshot.
   *  Admin-only: generates a public share token that bypasses auth, so creation is gated.
   *  UUID-validated, audit-logged (code review M5). */
  router.post('/api/clients/:id/reports', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    const clientResult = await pool.query('SELECT * FROM clients WHERE id = $1', [req.params.id]);
    if (clientResult.rows.length === 0) return res.status(404).json({ error: 'Client not found' });
    const client = clientResult.rows[0];

    // Gather all task data for this client
    const tasksResult = await pool.query(
      `SELECT t.*, c.name as client_name FROM tasks t
       LEFT JOIN clients c ON t.client_id = c.id
       WHERE t.client_id = $1 ORDER BY t.created_at, t.title, t.id`, [req.params.id]
    );
    const clientTasks = tasksResult.rows;

    // Compute KPIs
    const total = clientTasks.length;
    const done = clientTasks.filter(t => t.status === 'Done').length;
    const inProgress = clientTasks.filter(t => t.status === 'In progress').length;
    const blocked = clientTasks.filter(t => t.health_state === 'Blocked').length;
    const overdue = clientTasks.filter(t => t.due_date && t.status !== 'Done' && t.status !== 'Cancelled' && new Date(t.due_date) < new Date()).length;
    const hrsSpent = clientTasks.reduce((s, t) => s + (t.hours_spent || 0), 0);
    const hrsEst = clientTasks.reduce((s, t) => s + (t.hours_estimated || 0), 0);
    const completePct = total > 0 ? Math.round(done / total * 100) : 0;

    // Group by status
    const statusBreakdown = {};
    clientTasks.forEach(t => { statusBreakdown[t.status] = (statusBreakdown[t.status] || 0) + 1; });

    // Group by project (root tasks)
    const projects = clientTasks.filter(t => !t.parent_id).map(p => {
      const kids = clientTasks.filter(t => t.parent_id === p.id);
      const pDone = kids.filter(k => k.status === 'Done').length;
      return { title: p.title, status: p.status, health: p.health_state, total: kids.length + 1, done: pDone, pct: kids.length > 0 ? Math.round(pDone / kids.length * 100) : (p.status === 'Done' ? 100 : 0) };
    });

    // Build report data
    const reportData = {
      clientName: client.name,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user?.displayName || 'system',
      kpis: { total, done, inProgress, blocked, overdue, hrsSpent: Math.round(hrsSpent * 10) / 10, hrsEst: Math.round(hrsEst * 10) / 10, completePct },
      statusBreakdown,
      projects,
      blockedTasks: clientTasks.filter(t => t.health_state === 'Blocked').map(t => ({ title: t.title, status: t.status, assignees: t.assignees })),
      overdueTasks: clientTasks.filter(t => t.due_date && t.status !== 'Done' && t.status !== 'Cancelled' && new Date(t.due_date) < new Date()).map(t => ({ title: t.title, dueDate: t.due_date, assignees: t.assignees })),
    };

    // Save with share token. 30-day expiry (was 90 -- code review M5 recommended shorter default).
    const shareToken = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const { rows } = await pool.query(
      `INSERT INTO client_reports (client_id, client_name, share_token, report_data, generated_by, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, share_token, created_at`,
      [req.params.id, client.name, shareToken, JSON.stringify(reportData), req.user?.displayName || 'system', expiresAt]
    );

    // Audit so we have a record of every public share token ever created
    await auditLog('client_report', rows[0].id, 'create', req.user?.displayName, {
      client_id: req.params.id,
      client_name: client.name,
      expires_at: expiresAt
    });

    res.status(201).json({
      id: rows[0].id,
      shareToken: rows[0].share_token,
      shareUrl: `/api/reports/${rows[0].share_token}/html`,
      pdfUrl: `/api/reports/${rows[0].share_token}/pdf`,
      createdAt: rows[0].created_at,
    });
  });

  /** GET /api/clients/:id/reports — List past reports for a client */
  router.get('/api/clients/:id/reports', async (req, res) => {
    const { rows } = await pool.query(
      'SELECT id, share_token, generated_by, created_at FROM client_reports WHERE client_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.params.id]
    );
    res.json(rows);
  });

  /** DELETE /api/reports/:id/revoke — Revoke a share token (admin only, B-B7) */
  router.delete('/api/reports/:id/revoke', requireNBI, requireAdmin, async (req, res) => {
    const { rowCount } = await pool.query('DELETE FROM client_reports WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Report not found' });
    res.json({ ok: true });
  });

  /** GET /api/reports/:token — Public JSON data (no auth required) */
  router.get('/api/reports/:token', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM client_reports WHERE share_token = $1', [req.params.token]);
    if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    if (rows[0].expires_at && new Date(rows[0].expires_at) < new Date()) return res.status(410).json({ error: 'Report expired' });
    res.json(rows[0].report_data);
  });

  /** GET /api/reports/:token/html — Public styled HTML report page (no auth required).
   *  Adds X-Robots-Tag and Referrer-Policy headers + meta tags so tokens don't leak
   *  via search indexing or the Referer header (security audit M10). */
  router.get('/api/reports/:token/html', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM client_reports WHERE share_token = $1', [req.params.token]);
    if (rows.length === 0) return res.status(404).send('Report not found');
    if (rows[0].expires_at && new Date(rows[0].expires_at) < new Date()) return res.status(410).send('Report expired');

    // Tell search engines not to index and tell browsers not to send a Referer on outbound links
    res.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    res.set('Referrer-Policy', 'no-referrer');

    const d = rows[0].report_data;
    const date = new Date(d.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const statusColours = { Done: '#22c55e', 'In progress': '#3b82f6', 'Not started': '#6b7280', 'In Review': '#f59e0b', Blocked: '#2563eb', Planning: '#06b6d4', Drafted: '#2563eb', Cancelled: '#ef4444' };

    // All user-supplied data is escaped via escHtml() to prevent XSS in this public endpoint
    let html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet">
  <meta name="referrer" content="no-referrer">
  <title>${escHtml(d.clientName)} — Status Report</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Inter,-apple-system,sans-serif;background:#0a0a0a;color:#e8e8e8;line-height:1.6;padding:40px 20px}
    .container{max-width:900px;margin:0 auto}
    .header{border-bottom:2px solid #2a2a2a;padding-bottom:24px;margin-bottom:32px}
    .header h1{font-size:1.8rem;font-weight:700;margin-bottom:4px}
    .header .meta{color:#999;font-size:0.85rem}
    .brand{color:#0066FF;font-size:0.75rem;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:12px}
    .kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:16px;margin-bottom:32px}
    .kpi{background:#141414;border:1px solid #2a2a2a;border-radius:8px;padding:16px;text-align:center}
    .kpi .value{font-size:1.6rem;font-weight:700}
    .kpi .label{font-size:0.72rem;color:#999;text-transform:uppercase;letter-spacing:1px;margin-top:4px}
    .section{margin-bottom:32px}
    .section h2{font-size:0.8rem;color:#999;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:16px}
    .bar{display:flex;height:20px;border-radius:4px;overflow:hidden;background:#1e1e1e;margin-bottom:6px}
    .bar-seg{min-width:2px}
    table{width:100%;border-collapse:collapse;font-size:0.85rem}
    th{text-align:left;padding:8px 12px;border-bottom:2px solid #2a2a2a;color:#999;font-size:0.72rem;text-transform:uppercase;letter-spacing:1px}
    td{padding:8px 12px;border-bottom:1px solid #1e1e1e}
    .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.72rem;font-weight:600}
    .pct-bar{width:100%;height:6px;background:#1e1e1e;border-radius:3px;overflow:hidden}
    .pct-fill{height:100%;background:#22c55e;border-radius:3px}
    .footer{margin-top:48px;padding-top:24px;border-top:1px solid #2a2a2a;color:#666;font-size:0.75rem;text-align:center}
    @media(max-width:600px){.kpi-grid{grid-template-columns:repeat(2,1fr)}}
  </style></head><body><div class="container">
  <div class="header"><div class="brand">NBI Analytics</div><h1>${escHtml(d.clientName)}</h1><div class="meta">Status Report &mdash; ${escHtml(date)} &mdash; Prepared by ${escHtml(d.generatedBy)}</div></div>`;

    // KPIs (numeric values are safe but escaped defensively)
    html += `<div class="kpi-grid">
    <div class="kpi"><div class="value">${escHtml(String(d.kpis.total))}</div><div class="label">Total Tasks</div></div>
    <div class="kpi"><div class="value" style="color:#22c55e">${escHtml(String(d.kpis.completePct))}%</div><div class="label">Complete</div></div>
    <div class="kpi"><div class="value" style="color:#3b82f6">${escHtml(String(d.kpis.inProgress))}</div><div class="label">In Progress</div></div>
    <div class="kpi"><div class="value" style="color:${d.kpis.overdue > 0 ? '#ef4444' : '#22c55e'}">${escHtml(String(d.kpis.overdue))}</div><div class="label">Overdue</div></div>
    <div class="kpi"><div class="value" style="color:${d.kpis.blocked > 0 ? '#2563eb' : '#22c55e'}">${escHtml(String(d.kpis.blocked))}</div><div class="label">Blocked</div></div>
    <div class="kpi"><div class="value">${escHtml(String(d.kpis.hrsSpent))}h</div><div class="label">Hours Spent</div></div>
  </div>`;

    // Status breakdown bar
    html += `<div class="section"><h2>Status Breakdown</h2><div class="bar">`;
    Object.entries(d.statusBreakdown).forEach(([status, count]) => {
      const pct = (count / d.kpis.total) * 100;
      html += `<div class="bar-seg" style="width:${pct}%;background:${statusColours[status] || '#666'}" title="${escHtml(status)}: ${count} (${Math.round(pct)}%)"></div>`;
    });
    html += `</div><div style="display:flex;flex-wrap:wrap;gap:12px;font-size:0.78rem;color:#999">`;
    Object.entries(d.statusBreakdown).forEach(([status, count]) => {
      html += `<span><span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${statusColours[status] || '#666'};margin-right:4px"></span>${escHtml(status)}: ${count}</span>`;
    });
    html += `</div></div>`;

    // Projects
    if (d.projects.length > 0) {
      html += `<div class="section"><h2>Projects</h2><table><thead><tr><th>Project</th><th>Status</th><th>Health</th><th>Progress</th><th>Tasks</th></tr></thead><tbody>`;
      d.projects.forEach(p => {
        html += `<tr><td><strong>${escHtml(p.title)}</strong></td><td><span class="badge" style="background:${statusColours[p.status] || '#666'}20;color:${statusColours[p.status] || '#666'}">${escHtml(p.status)}</span></td>`;
        html += `<td>${escHtml(p.health || '-')}</td><td><div class="pct-bar"><div class="pct-fill" style="width:${p.pct}%"></div></div><span style="font-size:0.7rem;color:#999">${p.pct}%</span></td><td>${p.total}</td></tr>`;
      });
      html += `</tbody></table></div>`;
    }

    // Blocked tasks
    if (d.blockedTasks.length > 0) {
      html += `<div class="section"><h2>Blocked Items</h2><table><thead><tr><th>Task</th><th>Status</th><th>Assigned To</th></tr></thead><tbody>`;
      d.blockedTasks.forEach(t => { html += `<tr><td>${escHtml(t.title)}</td><td>${escHtml(t.status)}</td><td>${escHtml((t.assignees || []).join(', ') || '-')}</td></tr>`; });
      html += `</tbody></table></div>`;
    }

    // Overdue tasks
    if (d.overdueTasks.length > 0) {
      html += `<div class="section"><h2>Overdue Items</h2><table><thead><tr><th>Task</th><th>Due Date</th><th>Assigned To</th></tr></thead><tbody>`;
      d.overdueTasks.forEach(t => { html += `<tr><td>${escHtml(t.title)}</td><td style="color:#ef4444">${escHtml(t.dueDate)}</td><td>${escHtml((t.assignees || []).join(', ') || '-')}</td></tr>`; });
      html += `</tbody></table></div>`;
    }

    html += `<div class="footer">Generated by NBI Analytics Dashboard &mdash; ${escHtml(date)}</div></div></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });

  /** GET /api/reports/:token/pdf — Public PDF download (no auth required) */
  router.get('/api/reports/:token/pdf', async (req, res) => {
    const { rows } = await pool.query('SELECT * FROM client_reports WHERE share_token = $1', [req.params.token]);
    if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
    if (rows[0].expires_at && new Date(rows[0].expires_at) < new Date()) return res.status(410).json({ error: 'Report expired' });

    const d = rows[0].report_data;
    const date = new Date(d.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${d.clientName.replace(/[^a-zA-Z0-9]/g, '_')}_Status_Report_${date.replace(/\s/g, '_')}.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(10).fillColor('#0066FF').text('NBI ANALYTICS', { align: 'left' });
    doc.moveDown(0.5);
    doc.fontSize(22).fillColor('#1a1a1a').text(d.clientName);
    doc.fontSize(12).fillColor('#666').text(`Status Report — ${date}`);
    doc.fontSize(10).fillColor('#999').text(`Prepared by ${d.generatedBy}`);
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
    doc.moveDown(1);

    // KPIs
    doc.fontSize(14).fillColor('#1a1a1a').text('Key Metrics');
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#333');
    doc.text(`Total Tasks: ${d.kpis.total}    Complete: ${d.kpis.completePct}%    In Progress: ${d.kpis.inProgress}    Overdue: ${d.kpis.overdue}    Blocked: ${d.kpis.blocked}`);
    doc.text(`Hours Spent: ${d.kpis.hrsSpent}h / ${d.kpis.hrsEst}h estimated`);
    doc.moveDown(1);

    // Projects table
    if (d.projects.length > 0) {
      doc.fontSize(14).fillColor('#1a1a1a').text('Projects');
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#999');
      doc.text('PROJECT', 50, doc.y, { width: 200, continued: true });
      doc.text('STATUS', 260, doc.y, { width: 80, continued: true });
      doc.text('PROGRESS', 350, doc.y, { width: 80, continued: true });
      doc.text('TASKS', 440, doc.y);
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
      doc.moveDown(0.3);

      d.projects.forEach(p => {
        if (doc.y > 720) { doc.addPage(); }
        doc.fontSize(9).fillColor('#333');
        doc.text(p.title.substring(0, 35), 50, doc.y, { width: 200, continued: true });
        doc.text(p.status, 260, doc.y, { width: 80, continued: true });
        doc.text(`${p.pct}%`, 350, doc.y, { width: 80, continued: true });
        doc.text(`${p.total}`, 440, doc.y);
        doc.moveDown(0.2);
      });
      doc.moveDown(1);
    }

    // Blocked items
    if (d.blockedTasks.length > 0) {
      if (doc.y > 650) doc.addPage();
      doc.fontSize(14).fillColor('#1a1a1a').text('Blocked Items');
      doc.moveDown(0.5);
      d.blockedTasks.forEach(t => {
        doc.fontSize(9).fillColor('#333').text(`• ${t.title} — ${(t.assignees || []).join(', ') || 'Unassigned'}`);
      });
      doc.moveDown(1);
    }

    // Overdue items
    if (d.overdueTasks.length > 0) {
      if (doc.y > 650) doc.addPage();
      doc.fontSize(14).fillColor('#1a1a1a').text('Overdue Items');
      doc.moveDown(0.5);
      d.overdueTasks.forEach(t => {
        doc.fontSize(9).fillColor('#cc0000').text(`• ${t.title} — due ${t.dueDate}`);
      });
      doc.moveDown(1);
    }

    // Footer
    doc.fontSize(8).fillColor('#999').text(`Generated by NBI Analytics Dashboard — ${date}`, 50, 770, { align: 'center', width: 495 });

    doc.end();
  });

  return router;
};
