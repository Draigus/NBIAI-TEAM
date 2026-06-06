'use strict';

const crypto = require('crypto');

/**
 * cron/index.js — All scheduled jobs and their builder/helper functions.
 *
 * Factory pattern: receives a context object with shared deps,
 * returns an object of exported functions. Also registers cron
 * schedules if cron is available.
 */
module.exports = function(ctx) {
  const { cron, pool, log, fs, path, runBackup, validateBackup, createNotification,
          invalidateCache, fxBreaker, withRetry, sendEmailAsync, EMAIL_FROM, APP_URL,
          buildEmailHtml, buildEmailTable, buildEmailSection, addBusinessDays,
          businessDaysBetween, pickFilesToDelete, uploadDir, _msalClient } = ctx;
  const CRON_TZ = { timezone: 'Europe/London' };

async function computeDashboardSnapshot() {
  const today = new Date().toISOString().slice(0, 10);
  const { rows: [snap] } = await pool.query(`
    SELECT
      count(*) FILTER (WHERE parent_id IS NULL AND title IS NOT NULL AND trim(title) != 'New Task'
                        AND status NOT IN ('Done','Cancelled')) as active_projects,
      count(*) FILTER (WHERE due_date != '' AND due_date::date < CURRENT_DATE AND status NOT IN ('Done','Cancelled')) as overdue_count,
      count(*) FILTER (WHERE health_state = 'Blocked' AND status NOT IN ('Done','Cancelled')) as blocked_count,
      count(*) FILTER (WHERE health_state = 'Red' AND status NOT IN ('Done','Cancelled')) as at_risk_count,
      COALESCE(sum(hours_spent) FILTER (WHERE true), 0) as hours_spent,
      COALESCE(sum(hours_estimated) FILTER (WHERE true), 0) as hours_estimated,
      count(*) FILTER (WHERE status NOT IN ('Done','Cancelled')) as tasks_planned,
      count(*) FILTER (WHERE created_at::date = $1::date) as tasks_added,
      count(*) FILTER (WHERE status = 'Done') as tasks_completed,
      count(DISTINCT title) FILTER (WHERE (due_date != '' AND due_date::date < CURRENT_DATE OR health_state = 'Red')
                                     AND status NOT IN ('Done','Cancelled')
                                     AND parent_id IS NULL AND title IS NOT NULL AND trim(title) != 'New Task') as problem_projects
    FROM tasks
  `, [today]);

  const activeProjects = parseInt(snap.active_projects) || 0;
  const problemProjects = parseInt(snap.problem_projects) || 0;

  let activeLeadsCount = 0;
  try {
    const { rows: [lc] } = await pool.query(
      `SELECT count(*) as cnt FROM leads l
       JOIN lead_pipeline_stages s ON l.stage_id = s.id
       WHERE s.is_closed = false`
    );
    activeLeadsCount = parseInt(lc.cnt) || 0;
  } catch (e) { /* leads table may not exist in test env */ }

  return {
    snapshot_date: today,
    active_projects: activeProjects,
    overdue_count: parseInt(snap.overdue_count) || 0,
    blocked_count: parseInt(snap.blocked_count) || 0,
    at_risk_count: parseInt(snap.at_risk_count) || 0,
    hours_spent: parseFloat(snap.hours_spent).toFixed(1),
    hours_estimated: parseFloat(snap.hours_estimated).toFixed(1),
    tasks_planned: parseInt(snap.tasks_planned) || 0,
    tasks_added: parseInt(snap.tasks_added) || 0,
    tasks_completed: parseInt(snap.tasks_completed) || 0,
    on_track_count: Math.max(0, activeProjects - problemProjects),
    active_leads_count: activeLeadsCount,
  };
}

async function buildPmReportEmails(todayStr, windowStart, windowEnd) {
  const today = todayStr || new Date().toISOString().slice(0, 10);

  // Default window: previous business day 08:00 to today 08:00
  // Monday: window starts Friday 08:00
  if (!windowStart || !windowEnd) {
    const todayDate = new Date(today + 'T08:00:00');
    const dow = todayDate.getDay();
    const daysBack = dow === 1 ? 3 : 1; // Monday = 3 days back (from Friday)
    const startDate = new Date(todayDate);
    startDate.setDate(startDate.getDate() - daysBack);
    windowStart = startDate.toISOString();
    windowEnd = todayDate.toISOString();
  }

  const fiveAhead = addBusinessDays(today, 5);

  // Get all team leads with their teams and client scopes
  const { rows: leads } = await pool.query(`
    SELECT u.id AS user_id, u.username, u.display_name, u.email,
           t.id AS team_id, t.name AS team_name, t.client_id
    FROM team_members tm
    JOIN users u ON u.id = tm.user_id
    JOIN teams t ON t.id = tm.team_id
    WHERE tm.role = 'lead' AND u.is_active = true
  `);

  // Group by user (a lead can lead multiple teams)
  const byUser = {};
  for (const row of leads) {
    if (!row.email) continue;
    if (!byUser[row.user_id]) {
      byUser[row.user_id] = { username: row.username, name: row.display_name, email: row.email, clientIds: new Set() };
    }
    if (row.client_id) byUser[row.user_id].clientIds.add(row.client_id);
  }

  // Admins always get a portfolio-wide report (all clients), even when team
  // leads exist. Team leads still get their client-scoped reports alongside.
  const { rows: admins } = await pool.query(`
    SELECT id AS user_id, username, display_name, email
    FROM users WHERE role = 'admin' AND is_active = true AND email IS NOT NULL AND email != '' AND email LIKE '%@%'
  `);
  const { rows: allClients } = await pool.query(`SELECT id FROM clients`);
  const allClientIds = allClients.map(c => c.id);
  for (const admin of admins) {
    if (!byUser[admin.user_id]) {
      byUser[admin.user_id] = { username: admin.username, name: admin.display_name, email: admin.email, clientIds: new Set(allClientIds) };
    } else {
      for (const cid of allClientIds) byUser[admin.user_id].clientIds.add(cid);
    }
  }

  const emails = [];
  for (const [userId, lead] of Object.entries(byUser)) {
    const clientIds = [...lead.clientIds];
    if (clientIds.length === 0) continue;

    // 1. Changed tickets (from audit_log)
    const { rows: changes } = await pool.query(`
      SELECT al.entity_id, al.action, al.changes, al.changed_by, al.created_at,
             tk.title, tk.status
      FROM audit_log al
      JOIN tasks tk ON tk.id = al.entity_id::uuid
      WHERE al.entity_type = 'task'
        AND al.created_at >= $1 AND al.created_at < $2
        AND tk.client_id = ANY($3)
      ORDER BY al.created_at DESC
    `, [windowStart, windowEnd, clientIds]);

    // 2. Overdue tasks
    const { rows: overdue } = await pool.query(`
      SELECT id, title, due_date, assignees, status, priority
      FROM tasks WHERE due_date != '' AND due_date < $1
        AND status NOT IN ('Done', 'Cancelled') AND client_id = ANY($2)
      ORDER BY due_date ASC
    `, [today, clientIds]);

    // 3. Due within 5 business days
    const { rows: dueSoon } = await pool.query(`
      SELECT id, title, due_date, assignees, status, priority
      FROM tasks WHERE due_date != '' AND due_date >= $1 AND due_date <= $2
        AND status NOT IN ('Done', 'Cancelled') AND client_id = ANY($3)
      ORDER BY due_date ASC
    `, [today, fiveAhead, clientIds]);

    // 4. Blocked tasks
    const { rows: blocked } = await pool.query(`
      SELECT id, title, due_date, assignees, status
      FROM tasks WHERE status = 'Blocked' AND client_id = ANY($1)
    `, [clientIds]);

    // 5. Not started (past start date)
    const { rows: notStarted } = await pool.query(`
      SELECT id, title, start_date, assignees, priority
      FROM tasks WHERE start_date != '' AND start_date < $1
        AND status = 'Not started' AND client_id = ANY($2)
      ORDER BY start_date ASC
    `, [today, clientIds]);

    // 6. Lead activity updates
    const { rows: leadUpdates } = await pool.query(`
      SELECT la.activity_type, la.description, la.performed_by, la.created_at,
             l.title AS lead_title
      FROM lead_activities la
      JOIN leads l ON l.id = la.lead_id
      WHERE la.created_at >= $1 AND la.created_at < $2
        AND l.client_id = ANY($3)
      ORDER BY la.created_at DESC
    `, [windowStart, windowEnd, clientIds]);

    // Deduplicate changes: group by task, then by (changes JSON + changed_by), keep latest
    const dedupedByTask = {};
    for (const c of changes) {
      if (!dedupedByTask[c.entity_id]) dedupedByTask[c.entity_id] = { title: c.title, seen: new Map() };
      const changeData = typeof c.changes === 'string' ? JSON.parse(c.changes) : c.changes;
      const key = JSON.stringify(changeData) + '||' + c.changed_by;
      const existing = dedupedByTask[c.entity_id].seen.get(key);
      if (!existing || new Date(c.created_at) > new Date(existing.created_at)) {
        dedupedByTask[c.entity_id].seen.set(key, { ...c, _parsed: changeData });
      }
    }
    const dedupedChangeCount = Object.values(dedupedByTask).reduce((s, t) => s + t.seen.size, 0);

    // If nothing to report, skip
    if (dedupedChangeCount === 0 && overdue.length === 0 && dueSoon.length === 0 && blocked.length === 0 && notStarted.length === 0 && leadUpdates.length === 0) continue;

    // Build summary bar
    const summaryParts = [];
    if (dedupedChangeCount > 0) summaryParts.push(`${dedupedChangeCount} change${dedupedChangeCount === 1 ? '' : 's'}`);
    if (dueSoon.length > 0) summaryParts.push(`${dueSoon.length} due this week`);
    if (overdue.length > 0) summaryParts.push(`${overdue.length} overdue`);
    if (blocked.length > 0) summaryParts.push(`${blocked.length} blocked`);
    if (notStarted.length > 0) summaryParts.push(`${notStarted.length} not started`);
    if (leadUpdates.length > 0) summaryParts.push(`${leadUpdates.length} lead update${leadUpdates.length === 1 ? '' : 's'}`);
    const summaryHtml = `<p style="background:#f1f5f9;padding:12px 16px;border-radius:6px;font-size:14px;color:#475569">${summaryParts.join(' &middot; ')}</p>`;

    let sectionsHtml = summaryHtml;

    // Overdue & Blocked
    if (overdue.length > 0 || blocked.length > 0) {
      const items = [...overdue.map(tk => ({ ...tk, _reason: `${businessDaysBetween(tk.due_date, today)}d late` })),
                     ...blocked.map(tk => ({ ...tk, _reason: 'Blocked' }))];
      const cols = [
        { label: 'Ticket', key: 'title' },
        { label: 'Assignee', key: '_assigneeStr' },
        { label: 'Due', key: 'due_date' },
        { label: 'Issue', key: '_reason', style: 'color:#dc2626;font-weight:600' },
      ];
      const rows = items.map(tk => ({ ...tk, _assigneeStr: (tk.assignees || []).join(', ') }));
      sectionsHtml += buildEmailSection('Overdue & Blocked', '#dc2626', buildEmailTable(cols, rows));
    }

    // Due this week
    if (dueSoon.length > 0) {
      const cols = [
        { label: 'Ticket', key: 'title' },
        { label: 'Assignee', key: '_assigneeStr' },
        { label: 'Due', key: 'due_date' },
        { label: 'Status', key: 'status' },
      ];
      const rows = dueSoon.map(tk => ({ ...tk, _assigneeStr: (tk.assignees || []).join(', ') }));
      sectionsHtml += buildEmailSection('Due This Week', '#f59e0b', buildEmailTable(cols, rows));
    }

    // Not Started (past start date)
    if (notStarted.length > 0) {
      const cols = [
        { label: 'Task', key: 'title' },
        { label: 'Start Date', key: 'start_date' },
        { label: 'Priority', key: 'priority' },
        { label: 'Assignee', key: '_assigneeStr' },
      ];
      const rows = notStarted.map(tk => ({ ...tk, priority: tk.priority || '-', _assigneeStr: (tk.assignees || []).join(', ') || 'Unassigned' }));
      sectionsHtml += buildEmailSection('Not Started (past start date)', '#f59e0b', buildEmailTable(cols, rows));
    }

    // Changes \u2014 use pre-deduped data from above
    if (dedupedChangeCount > 0) {
      let changesHtml = '';
      for (const [taskId, { title, seen }] of Object.entries(dedupedByTask)) {
        const unique = [...seen.values()];
        if (unique.length === 0) continue;
        changesHtml += `<div style="margin:8px 0"><strong>${title}</strong> &mdash; ${unique.length} change${unique.length === 1 ? '' : 's'}<ul style="margin:4px 0;padding-left:20px">`;
        for (const e of unique) {
          const changeData = e._parsed;
          const desc = changeData ? Object.entries(changeData).map(([k, v]) =>
            typeof v === 'object' && v.from !== undefined ? `${k}: ${v.from} \u2192 ${v.to}` : `${k}: ${JSON.stringify(v)}`
          ).join(', ') : e.action;
          const time = new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          changesHtml += `<li style="font-size:13px;color:#475569">${desc} (by ${e.changed_by}, ${time})</li>`;
        }
        changesHtml += '</ul></div>';
      }
      sectionsHtml += buildEmailSection('Changes Since Last Report', '#3b82f6', changesHtml);
    }

    // Lead updates
    if (leadUpdates.length > 0) {
      const cols = [
        { label: 'Lead', key: 'lead_title' },
        { label: 'Activity', key: 'activity_type' },
        { label: 'By', key: 'performed_by' },
        { label: 'When', key: '_time' },
      ];
      const rows = leadUpdates.map(la => ({
        ...la,
        _time: new Date(la.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      }));
      sectionsHtml += buildEmailSection('Lead Updates', '#8b5cf6', buildEmailTable(cols, rows));

    }

    const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const subject = `NBI Hub \u2014 Daily Report for ${lead.name || lead.username} \u2014 ${dateLabel}`;
    emails.push({
      to: lead.email,
      subject,
      html: buildEmailHtml(subject, `<p>Hi ${lead.name || lead.username},</p>${sectionsHtml}`),
    });
  }

  return emails;
}

// PM Daily Report — 08:00 weekdays
if (cron) {
  cron.schedule('0 8 * * 1-5', async () => {
    log('info', 'Cron', 'Running PM daily report emails');
    try {
      const emails = await buildPmReportEmails();
      for (const mail of emails) sendEmailAsync(mail);
      log('info', 'Cron', `PM reports: ${emails.length} email(s) queued`);
    } catch (e) {
      log('error', 'Cron', 'PM report job failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'PM daily report scheduled for 08:00 weekdays');
}

async function matchSubjectToTask(subject) {
  if (!subject || !subject.trim()) return { taskId: null, clientId: null, confidence: 'none', matchedClient: null, matchedTask: null };

  const subjectLower = subject.toLowerCase().trim();

  // Step 1: Score all clients against the subject
  const { rows: clients } = await pool.query('SELECT id, name FROM clients ORDER BY name');

  let bestClient = null;
  let bestClientScore = 0;
  let confidence = 'none';

  for (const client of clients) {
    const clientLower = client.name.toLowerCase();

    // Exact substring match (highest score)
    if (subjectLower.includes(clientLower)) {
      const score = clientLower.length; // longer match = better
      if (score > bestClientScore) {
        bestClient = client;
        bestClientScore = score;
        confidence = 'high';
      }
      continue;
    }

    // Partial word match: check what fraction of client name words appear in subject
    const clientWords = clientLower.split(/\s+/);
    const matchedWords = clientWords.filter(w => w.length > 2 && subjectLower.includes(w));
    const ratio = matchedWords.length / clientWords.length;
    if (ratio >= 0.5) {
      const score = matchedWords.join('').length;
      if (score > bestClientScore) {
        bestClient = client;
        bestClientScore = score;
        confidence = ratio >= 1.0 ? 'high' : 'low';
      }
    }
  }

  if (!bestClient) return { taskId: null, clientId: null, confidence: 'none', matchedClient: null, matchedTask: null };

  // Step 2: Find the best matching task under this client
  const { rows: tasks } = await pool.query(`
    SELECT id, title, item_type, parent_id, updated_at
    FROM tasks
    WHERE client_id = $1 AND status NOT IN ('Done', 'Cancelled')
    ORDER BY updated_at DESC
  `, [bestClient.id]);

  if (tasks.length === 0) {
    return { taskId: null, clientId: bestClient.id, confidence, matchedClient: bestClient.name, matchedTask: null };
  }

  // Strip the client name from the subject to get the remainder for task matching
  const clientLower = bestClient.name.toLowerCase();
  let remainder = subjectLower.replace(clientLower, '').replace(/^[\s\-:]+|[\s\-:]+$/g, '').trim();

  // Score tasks by title match against the remainder
  let bestTask = null;
  let bestTaskScore = 0;

  if (remainder.length > 0) {
    for (const task of tasks) {
      const titleLower = task.title.toLowerCase();
      if (remainder.includes(titleLower) || titleLower.includes(remainder)) {
        const score = Math.min(titleLower.length, remainder.length);
        if (score > bestTaskScore) {
          bestTask = task;
          bestTaskScore = score;
        }
        continue;
      }
      const titleWords = titleLower.split(/\s+/).filter(w => w.length > 2);
      const matchCount = titleWords.filter(w => remainder.includes(w)).length;
      if (matchCount > 0 && matchCount > bestTaskScore) {
        bestTask = task;
        bestTaskScore = matchCount;
      }
    }
  }

  // Fall back to most recently updated project for this client
  if (!bestTask) {
    bestTask = tasks.find(t => t.item_type === 'project') || tasks[0];
  }

  return {
    taskId: bestTask.id,
    clientId: bestClient.id,
    confidence,
    matchedClient: bestClient.name,
    matchedTask: bestTask.title,
  };
}

/**
 * Extract <a href="...">text</a> links from HTML.
 * Returns [{url, title}].
 */
function extractLinksFromHtml(html) {
  const links = [];
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match;
  while ((match = re.exec(html)) !== null) {
    const url = match[1].trim();
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      links.push({ url, title: title.slice(0, 255) || url });
    }
  }
  return links;
}

/**
 * Process a single inbound email message from Graph API.
 * opts.skipGraphApi = true to skip marking as read + downloading attachments (for testing).
 * Returns { matched, skipped, taskId, confidence, error }
 */
async function processOneInboundEmail(message, opts = {}) {
  const fromAddr = message.from?.emailAddress?.address || '';
  const emailFrom = process.env.EMAIL_FROM || 'nbihub@nbi-consulting.com';

  // Skip emails from ourselves
  if (fromAddr.toLowerCase() === emailFrom.toLowerCase()) {
    return { skipped: true, reason: 'self' };
  }

  const subject = message.subject || '(no subject)';
  const bodyHtml = message.body?.content || '';
  const senderName = message.from?.emailAddress?.name || fromAddr;

  // Step 1: Match subject to client/task
  const match = await matchSubjectToTask(subject);

  // Fallback: if client matched but no task, attach to the client entity
  const entityType = match.taskId ? 'task' : (match.clientId ? 'client' : null);
  const entityId = match.taskId || match.clientId;

  if (!entityId) {
    log('warn', 'InboundEmail', 'No match for email', { subject, from: fromAddr });
    return { matched: false, confidence: 'none', subject };
  }

  if (match.taskId && fromAddr) {
    const { rows: senderRows } = await pool.query(
      'SELECT client_id FROM users WHERE email = $1 AND is_active = true',
      [fromAddr.toLowerCase()]
    );
    if (senderRows.length > 0 && senderRows[0].client_id) {
      let currentId = match.taskId;
      let depth = 0;
      let rootClientId = null;
      while (currentId && depth < 10) {
        const { rows: t } = await pool.query('SELECT parent_id, client_id FROM tasks WHERE id = $1', [currentId]);
        if (t.length === 0) break;
        if (!t[0].parent_id) { rootClientId = t[0].client_id; break; }
        currentId = t[0].parent_id;
        depth++;
      }
      if (rootClientId && rootClientId !== senderRows[0].client_id) {
        log('warn', 'InboundEmail', 'Client user email rejected — task belongs to different client', {
          sender: fromAddr, taskId: match.taskId, senderClient: senderRows[0].client_id, taskClient: rootClientId
        });
        return { matched: false, reason: 'client_scope_mismatch' };
      }
    }
  }

  const uploadedBy = match.confidence === 'high'
    ? 'nbihub (email)'
    : 'nbihub (email - verify match)';

  // Step 2: Save email body as HTML file
  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(4).toString('hex');
  const htmlFilename = `${timestamp}-${randomHex}.html`;
  const htmlPath = path.join(uploadDir, htmlFilename);
  const originalName = `Email from ${senderName} - ${subject.slice(0, 100)}.html`;

  fs.writeFileSync(htmlPath, bodyHtml, 'utf8');
  const htmlSize = Buffer.byteLength(bodyHtml, 'utf8');

  await pool.query(
    `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by)
     VALUES ($1, $2, $3, $4, $5, 'text/html', $6)`,
    [entityType, entityId, htmlFilename, originalName, htmlSize, uploadedBy]
  );

  // Step 3: Extract and store URL links
  const links = extractLinksFromHtml(bodyHtml);
  for (const link of links) {
    await pool.query(
      `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by, link_url, link_title)
       VALUES ($1, $2, NULL, NULL, NULL, 'link', $3, $4, $5)`,
      [entityType, entityId, uploadedBy, link.url, link.title]
    );
  }

  // Step 4: Download file attachments via Graph API (if any)
  if (message.hasAttachments && !opts.skipGraphApi) {
    try {
      const token = await _getGraphToken();
      const attRes = await fetch(
        `https://graph.microsoft.com/v1.0/users/${emailFrom}/messages/${message.id}/attachments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (attRes.ok) {
        const attData = await attRes.json();
        for (const att of (attData.value || [])) {
          if (att['@odata.type'] !== '#microsoft.graph.fileAttachment') continue;
          if (!att.contentBytes) continue;
          const attSize = att.size || 0;
          if (attSize > 25 * 1024 * 1024) {
            log('warn', 'InboundEmail', 'Skipping oversized attachment', { name: att.name, size: attSize });
            continue;
          }
          const ext = path.extname(att.name || '.bin');
          const attFilename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
          const attPath = path.join(uploadDir, attFilename);
          fs.writeFileSync(attPath, Buffer.from(att.contentBytes, 'base64'));

          await pool.query(
            `INSERT INTO attachments (entity_type, entity_id, filename, original_name, size_bytes, mime_type, uploaded_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [entityType, entityId, attFilename, att.name, attSize, att.contentType || 'application/octet-stream', uploadedBy]
          );
        }
      }
    } catch (e) {
      log('error', 'InboundEmail', 'Failed to download attachments', { messageId: message.id, error: e.message });
    }
  }

  // Step 5: Create notification for low-confidence matches
  if (match.confidence === 'low') {
    const { rows: admins } = await pool.query("SELECT username FROM users WHERE role = 'admin' AND is_active = true");
    for (const admin of admins) {
      await createNotification(
        admin.username, 'email', 'Email auto-matched (low confidence)',
        `"${subject}" from ${senderName} was matched to ${match.matchedClient} / ${match.matchedTask}. Please verify.`,
        entityId, true
      );
    }
  }

  // Step 6: Mark email as read in Graph API
  if (!opts.skipGraphApi) {
    try {
      const token = await _getGraphToken();
      await fetch(
        `https://graph.microsoft.com/v1.0/users/${emailFrom}/messages/${message.id}`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true })
        }
      );
    } catch (e) {
      log('error', 'InboundEmail', 'Failed to mark email as read', { messageId: message.id, error: e.message });
    }
  }

  log('info', 'InboundEmail', 'Processed email', {
    subject, from: fromAddr, entityType, entityId,
    client: match.matchedClient, task: match.matchedTask,
    confidence: match.confidence, links: links.length,
  });

  return { matched: true, taskId: match.taskId, entityType, entityId, confidence: match.confidence, client: match.matchedClient, task: match.matchedTask };
}

/**
 * Poll nbihub inbox for unread emails and process each.
 * Called by the cron job every 5 minutes.
 */
async function processInboundEmails() {
  if (!_msalClient) {
    log('info', 'InboundEmail', 'Graph API not configured, skipping inbox poll');
    return;
  }

  const token = await _getGraphToken();
  const emailFrom = process.env.EMAIL_FROM || 'nbihub@nbi-consulting.com';

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/users/${emailFrom}/mailFolders/Inbox/messages?$filter=isRead%20eq%20false&$select=id,subject,from,body,hasAttachments,receivedDateTime&$top=20&$orderby=receivedDateTime%20asc`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph API inbox poll failed ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const messages = data.value || [];

  if (messages.length === 0) return;

  log('info', 'InboundEmail', `Processing ${messages.length} unread email(s)`);

  let processed = 0;
  let matched = 0;
  let skipped = 0;

  for (const msg of messages) {
    try {
      const result = await processOneInboundEmail(msg);
      if (result.skipped) skipped++;
      else if (result.matched) matched++;
      processed++;
    } catch (e) {
      log('error', 'InboundEmail', 'Failed to process email', { messageId: msg.id, subject: msg.subject, error: e.message });
      // Mark as read anyway to prevent infinite retry loops
      try {
        await fetch(
          `https://graph.microsoft.com/v1.0/users/${emailFrom}/messages/${msg.id}`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ isRead: true })
          }
        );
      } catch (_) { /* swallow */ }
    }
  }

  log('info', 'InboundEmail', `Inbox poll complete: ${processed} processed, ${matched} matched, ${skipped} skipped`);
}

/**
 * Build warning emails for tasks that are due today or overdue.
 * Returns an array of { to, subject, html } mail option objects.
 * Exported for testing — the cron job calls this then sends each.
 */
async function buildDueWarningEmails(todayStr) {
  const today = todayStr || new Date().toISOString().slice(0, 10);

  // All active tasks where due_date <= today
  const { rows: tasks } = await pool.query(`
    SELECT t.id, t.title, t.due_date, t.status, t.priority, t.assignees,
           c.name AS client_name
    FROM tasks t
    LEFT JOIN clients c ON c.id = t.client_id
    WHERE t.due_date != '' AND t.due_date <= $1
      AND t.status NOT IN ('Done', 'Cancelled')
    ORDER BY t.due_date ASC
  `, [today]);

  if (tasks.length === 0) return [];

  // Collect all unique assignee usernames
  const allAssignees = [...new Set(tasks.flatMap(t => t.assignees || []))];
  if (allAssignees.length === 0) return [];

  // Fetch email addresses for those users
  const { rows: users } = await pool.query(
    'SELECT username, email, display_name FROM users WHERE display_name = ANY($1) AND email IS NOT NULL AND is_active = true',
    [allAssignees]
  );
  const emailMap = Object.fromEntries(users.map(u => [u.display_name, { email: u.email, name: u.display_name }]));

  // Group tasks by assignee
  const byAssignee = {};
  for (const task of tasks) {
    for (const assignee of (task.assignees || [])) {
      if (!emailMap[assignee]) continue;
      if (!byAssignee[assignee]) byAssignee[assignee] = [];
      byAssignee[assignee].push(task);
    }
  }

  // Build one email per assignee
  const emails = [];
  for (const [username, userTasks] of Object.entries(byAssignee)) {
    const { email, name } = emailMap[username];
    const overdue = userTasks.filter(t => t.due_date < today);
    const dueToday = userTasks.filter(t => t.due_date === today);

    let sectionsHtml = '';
    if (overdue.length > 0) {
      const cols = [
        { label: 'Ticket', key: 'title' },
        { label: 'Client', key: 'client_name' },
        { label: 'Due', key: 'due_date' },
        { label: 'Days Late', key: '_daysLate', style: 'color:#dc2626;font-weight:600' },
      ];
      const rows = overdue.map(t => ({
        ...t,
        _daysLate: businessDaysBetween(t.due_date, today)
      }));
      sectionsHtml += buildEmailSection(`Overdue (${overdue.length})`, '#dc2626', buildEmailTable(cols, rows));
    }
    if (dueToday.length > 0) {
      const cols = [
        { label: 'Ticket', key: 'title' },
        { label: 'Client', key: 'client_name' },
        { label: 'Priority', key: 'priority' },
      ];
      sectionsHtml += buildEmailSection(`Due Today (${dueToday.length})`, '#f59e0b', buildEmailTable(cols, dueToday));
    }

    const total = userTasks.length;
    const subject = `NBI Hub \u2014 ${total} ticket${total === 1 ? '' : 's'} need${total === 1 ? 's' : ''} attention`;
    emails.push({
      to: email,
      subject,
      html: buildEmailHtml(subject, `<p>Hi ${name || username},</p>${sectionsHtml}`),
    });
  }

  return emails;
}

// Due & Late Ticket Warnings — 09:00 weekdays
if (cron) {
  cron.schedule('0 9 * * 1-5', async () => {
    log('info', 'Cron', 'Running due/late ticket warning emails');
    try {
      const emails = await buildDueWarningEmails();
      for (const mail of emails) sendEmailAsync(mail);
      log('info', 'Cron', `Due/late warnings: ${emails.length} email(s) queued`);
    } catch (e) {
      log('error', 'Cron', 'Due/late warning job failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Due/late ticket warnings scheduled for 09:00 weekdays');
}

// Inbound Email Polling — DISABLED per Glen 2026-05-08: created 64k spam notifications
// from bounce-back emails. Functions retained in code but cron disabled.
// if (cron) {
//   cron.schedule('*/10 * * * *', async () => {
//     try {
//       await processInboundEmails();
//     } catch (e) {
//       log('error', 'Cron', 'Inbound email poll failed', { error: e.message });
//     }
//   }, CRON_TZ);
//   log('info', 'Cron', 'Inbound email polling scheduled every 10 minutes');
// }

// Daily dashboard snapshot at 00:05 UTC
if (cron) {
  cron.schedule('5 0 * * *', async () => {
    try {
      const snap = await computeDashboardSnapshot();
      await pool.query(
        `INSERT INTO dashboard_snapshots (snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count, hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed, on_track_count, active_leads_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (snapshot_date) DO NOTHING`,
        [snap.snapshot_date, snap.active_projects, snap.overdue_count, snap.blocked_count, snap.at_risk_count, snap.hours_spent, snap.hours_estimated, snap.tasks_planned, snap.tasks_added, snap.tasks_completed, snap.on_track_count, snap.active_leads_count]
      );
      log('info', 'Cron', 'Dashboard snapshot recorded', { date: snap.snapshot_date });
    } catch (e) {

      log('error', 'Cron', 'Dashboard snapshot failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Dashboard snapshot scheduled for 00:05 daily (Europe/London)');
}

// G1: Orphaned attachment sweep
async function runAttachmentSweep() {
  try {
    const { rows: candidates } = await pool.query(
      `SELECT id, stored_name, orphaned_at
         FROM document_attachments
         WHERE orphaned_at IS NOT NULL`
    );
    const toDelete = pickFilesToDelete(new Date(), candidates);
    if (toDelete.length === 0) {
      log('info', 'Cron', 'Attachment sweep: nothing to remove');
      return { deleted: 0 };
    }
    // Unlink files first; if the unlink fails (other than ENOENT) we still
    // delete the DB row because the row is the source of truth and a
    // missing file just means a manual cleanup happened earlier.
    await Promise.all(toDelete.map(async f => {
      try {
        await fs.promises.unlink(path.join(uploadDir, f.stored_name));
      } catch (err) {
        if (err.code !== 'ENOENT') {
          log('warn', 'Cron', `Sweep unlink failed for ${f.stored_name}: ${err.message}`);
        }
      }
    }));
    const ids = toDelete.map(f => f.id);
    const result = await pool.query(
      `DELETE FROM document_attachments
         WHERE id = ANY($1::uuid[])
           AND orphaned_at IS NOT NULL
           AND orphaned_at < now() - interval '24 hours'`,
      [ids]
    );
    if (result.rowCount !== toDelete.length) {
      log('warn', 'Cron',
        `Sweep race detected: ${toDelete.length} candidates, ${result.rowCount} deleted (rest cleared by concurrent PATCH)`);
    }
    log('info', 'Cron', `Attachment sweep deleted ${result.rowCount} orphans`);
    return { deleted: result.rowCount };
  } catch (err) {
    log('error', 'Cron', `Attachment sweep failed: ${err.message}`);
    return { deleted: 0, error: err.message };
  }
}
if (cron) {
  cron.schedule('30 3 * * *', runAttachmentSweep, CRON_TZ);
  log('info', 'Cron', 'Attachment sweep scheduled for 03:30 daily (Europe/London)');
}

// Bootstrap today's snapshot on startup if it doesn't exist yet
(async () => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows } = await pool.query('SELECT 1 FROM dashboard_snapshots WHERE snapshot_date = $1', [today]);
    if (rows.length === 0) {
      const snap = await computeDashboardSnapshot();
      await pool.query(
        `INSERT INTO dashboard_snapshots (snapshot_date, active_projects, overdue_count, blocked_count, at_risk_count, hours_spent, hours_estimated, tasks_planned, tasks_added, tasks_completed, on_track_count, active_leads_count)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (snapshot_date) DO NOTHING`,
        [snap.snapshot_date, snap.active_projects, snap.overdue_count, snap.blocked_count, snap.at_risk_count, snap.hours_spent, snap.hours_estimated, snap.tasks_planned, snap.tasks_added, snap.tasks_completed, snap.on_track_count, snap.active_leads_count]
      );
      log('info', 'Startup', 'Bootstrapped dashboard snapshot', { date: today });
    }
  } catch (e) {
    log('warn', 'Startup', 'Dashboard snapshot bootstrap failed', { error: e.message });
  }
})();

if (cron && runBackup) {
  cron.schedule('0 2 * * *', async () => {
    log('info', 'Cron', 'Running scheduled database backup...');
    try {
      await runBackup();
      // Validate the latest backup
      const backupDir = path.join(__dirname, 'backups');
      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json')).sort().reverse();
      if (files.length > 0) {
        const result = await validateBackup(path.join(backupDir, files[0]), pool, log);
        if (!result.valid) {
          log('error', 'Backup', 'Backup validation failed', { issues: result.issues });
          // Notify admin
          try { await pool.query("INSERT INTO notifications (username, type, title, message, link) VALUES ('glen', 'warning', 'Backup Validation Failed', $1, '/nbi_project_dashboard.html#settings')", [result.issues.join('; ')]); } catch(e) {}
        } else {
          log('info', 'Backup', 'Backup validated successfully');
        }
      }
    } catch (e) { log('error', 'Backup', 'Backup failed', { error: e.message }); }
  }, CRON_TZ);
}

// Weekly cleanup of orphaned contract PDFs older than 90 days (B-B17)
if (cron) {
  cron.schedule('0 3 * * 0', async () => {
    try {
      const uploadsDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadsDir)) return;
      const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
      let removed = 0;
      for (const f of fs.readdirSync(uploadsDir)) {
        if (!f.endsWith('.pdf')) continue;
        const fp = path.join(uploadsDir, f);
        const stat = fs.statSync(fp);
        if (stat.mtimeMs < cutoff) { fs.unlinkSync(fp); removed++; }
      }
      if (removed > 0) log('info', 'Cron', `Cleaned up ${removed} orphaned PDF(s) older than 90 days`);
    } catch (e) { log('warn', 'Cron', 'PDF cleanup failed', { error: e.message }); }
  }, CRON_TZ);
}

// Nightly Dreaming Engine — deterministic analysis cron (Phase 2)
if (cron) {
  const { runDreamingEngine } = require('./dreaming');
  cron.schedule('0 3 * * *', async () => {
    log('info', 'Cron', 'Running Dreaming Engine...');
    try {
      await runDreamingEngine({ pool, log, fs, path });
    } catch (e) {
      log('error', 'Cron', 'Dreaming Engine failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Dreaming Engine scheduled for 03:00 daily');
}

// Monthly expense report reminder — 25th of every month at 9:00 AM
if (cron) {
  cron.schedule('0 9 25 * *', async () => {
    log('info', 'Cron', 'Sending monthly expense report reminders');
    try {
      const { rows: users } = await pool.query('SELECT username, display_name FROM users WHERE is_active = true');
      let sent = 0;
      for (const user of users) {
        try {
          await createNotification(
            user.username,
            'expense_reminder',
            'Expense Report Reminder',
            `Hi ${user.display_name}, please submit your expense report for this month. Go to Expenses to create or update your report.`,
            '/nbi_project_dashboard.html#expenses',
            false
          );
          sent++;
        } catch (e) {
          log('warn', 'Cron', `Expense reminder failed for ${user.username}`, { error: e.message });
        }
      }
      log('info', 'Cron', `Expense reminders sent to ${sent}/${users.length} users`);
    } catch(e) {
      log('error', 'Cron', 'Failed to send expense reminders', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Monthly expense reminder scheduled for 25th at 09:00');
}

// Daily FX rate auto-refresh at 6:00 AM
if (cron) {
  cron.schedule('0 6 * * *', async () => {
    try {
      const resp = await fxBreaker.fire(() => withRetry(
        () => fetch('https://api.frankfurter.dev/latest?from=GBP&to=USD,EUR,SEK', { signal: AbortSignal.timeout(10000) }),
        { maxAttempts: 3, backoffMs: 1000, log }
      ));
      if (resp.ok) {
        const data = await resp.json();
        const rates = {};
        for (const [currency, rate] of Object.entries(data.rates)) rates[currency] = 1 / rate;
        await pool.query(
          "INSERT INTO settings (key, value) VALUES ('fx_rates', $1) ON CONFLICT (key) DO UPDATE SET value = $1",
          [JSON.stringify(rates)]
        );
        invalidateCache('fx_rates');
        log('info', 'FX', 'Exchange rates updated', rates);
      } else {
        log('warn', 'FX', 'Frankfurter API returned non-OK status', { status: resp.status });
      }
    } catch (e) {
      log('error', 'FX', 'Failed to fetch exchange rates', { err: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Daily FX rate refresh scheduled for 06:00');
}


// ==================== HIRING STALL REMINDERS ====================

const STALL_THRESHOLDS = { sourcing: 7, interviews: 10, offer: 5, onboarding: 14 };
const DEFAULT_STALL_DAYS = 10;

async function checkHiringStalls() {
  try {
    const { rows: candidates } = await pool.query(`
      SELECT ca.id, ca.name, ca.stage, ca.stage_assignees, ca.client_id,
             c.name AS client_name,
             latest.moved_at AS stage_entered_at,
             EXTRACT(EPOCH FROM (NOW() - latest.moved_at)) / 86400 AS days_in_stage
      FROM candidates ca
      JOIN clients c ON ca.client_id = c.id
      LEFT JOIN LATERAL (
        SELECT moved_at FROM candidate_stage_history
        WHERE candidate_id = ca.id ORDER BY moved_at DESC LIMIT 1
      ) latest ON true
      WHERE ca.archived_at IS NULL
        AND latest.moved_at IS NOT NULL
    `);

    let sent = 0;
    for (const cand of candidates) {
      let threshold = STALL_THRESHOLDS[cand.stage] || DEFAULT_STALL_DAYS;
      if (cand.client_id) {
        try {
          const { rows: [clientRow] } = await pool.query('SELECT hiring_stages FROM clients WHERE id = $1', [cand.client_id]);
          if (clientRow && clientRow.hiring_stages && Array.isArray(clientRow.hiring_stages)) {
            const stageObj = clientRow.hiring_stages.find(s => s.key === cand.stage);
            if (stageObj && typeof stageObj.stall_days === 'number') threshold = stageObj.stall_days;
          }
        } catch (e) { /* use default threshold */ }
      }
      if (cand.days_in_stage < threshold) continue;

      const { rows: existing } = await pool.query(
        `SELECT id FROM notifications
         WHERE type = 'hiring_stall_reminder'
           AND link LIKE $1
           AND created_at > NOW() - INTERVAL '1 day' * $2`,
        [`%${cand.id}%`, threshold]
      );
      if (existing.length > 0) continue;

      const assignees = cand.stage_assignees ? cand.stage_assignees[cand.stage] : null;
      if (!Array.isArray(assignees) || assignees.length === 0) continue;

      const days = Math.floor(cand.days_in_stage);
      const title = `${cand.name || 'Candidate'} stalled in ${cand.stage} for ${days} days (${cand.client_name})`;
      const link = `#hiring/candidate/${cand.id}`;

      for (const displayName of assignees) {
        const { rows: [user] } = await pool.query(
          'SELECT username FROM users WHERE display_name = $1 AND is_active = true LIMIT 1',
          [displayName]
        );
        if (user) {
          await createNotification(user.username, 'hiring_stall_reminder', title, '', link);
          sent++;
        }
      }
    }
    log('info', 'Cron', `Hiring stall check: ${sent} reminder(s) sent for ${candidates.length} active candidates`);
  } catch (e) {
    log('error', 'Cron', 'Hiring stall check failed', { error: e.message });
  }
}

if (cron) {
  cron.schedule('0 8 * * 1-5', checkHiringStalls, CRON_TZ);
  log('info', 'Cron', 'Hiring stall reminders scheduled for weekdays at 08:00');
}

// Granola meeting sync — 07:00 daily
if (cron && process.env.GRANOLA_API_KEY) {
  const { syncGranolaMeetings } = require('../lib/granola-sync');
  cron.schedule('0 7 * * *', async () => {
    log('info', 'Cron', 'Running Granola meeting sync...');
    try {
      const result = await syncGranolaMeetings({ pool, log, createNotification, _msalClient });
      log('info', 'Cron', 'Granola sync finished', result);
    } catch (e) {
      log('error', 'Cron', 'Granola sync failed', { error: e.message });
    }
  }, CRON_TZ);
  log('info', 'Cron', 'Granola meeting sync scheduled for 07:00 daily');
}

  return {
    computeDashboardSnapshot,
    buildPmReportEmails,
    matchSubjectToTask,
    extractLinksFromHtml,
    processOneInboundEmail,
    processInboundEmails,
    buildDueWarningEmails,
    runAttachmentSweep,
    checkHiringStalls,
    runDreamingEngine: require('./dreaming').runDreamingEngine,
  };
};
