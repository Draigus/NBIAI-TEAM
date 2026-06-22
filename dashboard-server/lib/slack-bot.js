// dashboard-server/lib/slack-bot.js
const crypto = require('crypto');
const https = require('https');

function verifySlackSignature(signingSecret, timestamp, rawBody, signature) {
  if (!timestamp || !signature || !signingSecret || !rawBody) return false;
  const fiveMinAgo = Math.floor(Date.now() / 1000) - 300;
  if (parseInt(timestamp, 10) < fiveMinAgo) return false;

  const baseString = `v0:${timestamp}:${rawBody}`;
  const computed = 'v0=' + crypto.createHmac('sha256', signingSecret).update(baseString).digest('hex');

  if (computed.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

const ITEM_TYPES = new Set(['project', 'feature', 'story', 'task']);

// Entity extraction parser — finds known clients, users, and item types anywhere in the message
function parseSlackMessage(text, entities) {
  const cleaned = (text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
  const nlIndex = cleaned.indexOf('\n');
  const firstLine = nlIndex === -1 ? cleaned : cleaned.slice(0, nlIndex).trim();
  const description = nlIndex === -1 ? null : cleaned.slice(nlIndex + 1).trim() || null;

  if (!firstLine) return { title: null, description, clientMatch: null, userMatch: null, itemType: null };

  const { clients, users } = entities || { clients: [], users: [] };
  let line = firstLine;

  // Extract client — longest match first, word-boundary safe
  let clientMatch = null;
  const sortedClients = [...clients].sort((a, b) => b.label.length - a.label.length);
  for (const c of sortedClients) {
    const re = new RegExp('\\b' + escapeRegex(c.label) + '\\b', 'i');
    const m = line.match(re);
    if (m) {
      clientMatch = c;
      line = (line.slice(0, m.index) + line.slice(m.index + m[0].length)).replace(/\s{2,}/g, ' ').trim();
      break;
    }
  }

  // Extract user — longest match first, word-boundary safe
  let userMatch = null;
  const sortedUsers = [...users].sort((a, b) => b.label.length - a.label.length);
  for (const u of sortedUsers) {
    const re = new RegExp('\\b' + escapeRegex(u.label) + '\\b', 'i');
    const m = line.match(re);
    if (m) {
      userMatch = u;
      line = (line.slice(0, m.index) + line.slice(m.index + m[0].length)).replace(/\s{2,}/g, ' ').trim();
      break;
    }
  }

  // Extract item type keyword
  let itemType = null;
  const typeRe = /\b(project|feature|story|task)\b/i;
  const typeMatch = line.match(typeRe);
  if (typeMatch) {
    itemType = typeMatch[1].toLowerCase();
    line = (line.slice(0, typeMatch.index) + line.slice(typeMatch.index + typeMatch[0].length)).replace(/\s{2,}/g, ' ').trim();
  }

  // Strip leading filler words ("for", "to", "a", "the", ":") from what remains
  line = line.replace(/^[\s:]+/, '').replace(/[\s:]+$/, '');
  line = line.replace(/^(for|to|a|the|please|can you|could you)\s+/i, '').trim();

  const title = line || null;
  return { title, description, clientMatch, userMatch, itemType };
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Entity cache — holds clients (name + abbreviation) and users (display_name + first name)
let _entityCache = { clients: [], users: [] };
let _entityCacheTimer = null;

async function loadEntityCache(dbPool) {
  const { rows: clientRows } = await dbPool.query(
    "SELECT id, name, abbreviation FROM clients WHERE name IS NOT NULL"
  );
  const clients = [];
  for (const r of clientRows) {
    clients.push({ label: r.name, id: r.id, name: r.name, abbreviation: r.abbreviation });
    if (r.abbreviation) {
      clients.push({ label: r.abbreviation, id: r.id, name: r.name, abbreviation: r.abbreviation });
    }
  }

  const { rows: userRows } = await dbPool.query(
    "SELECT display_name FROM users WHERE is_active = true AND display_name IS NOT NULL"
  );
  const users = [];
  for (const r of userRows) {
    users.push({ label: r.display_name, displayName: r.display_name });
    const firstName = r.display_name.split(' ')[0];
    if (firstName !== r.display_name) {
      users.push({ label: firstName, displayName: r.display_name });
    }
  }

  _entityCache = { clients, users };
  return _entityCache;
}

function getEntityCache() {
  return _entityCache;
}

function startEntityRefresh(dbPool, intervalMs) {
  if (_entityCacheTimer) clearInterval(_entityCacheTimer);
  _entityCacheTimer = setInterval(() => {
    loadEntityCache(dbPool).catch(e => { try { require('./logger').log('warn', 'SlackBot', 'Entity cache refresh failed', { error: e.message }); } catch (_) {} });
  }, intervalMs || 3600000);
}

function stopEntityRefresh() {
  if (_entityCacheTimer) { clearInterval(_entityCacheTimer); _entityCacheTimer = null; }
}

// Kept for backwards compat with existing route wiring
const loadClientAbbreviations = loadEntityCache;
const getClientAbbreviations = getEntityCache;
const startAbbreviationRefresh = startEntityRefresh;
const stopAbbreviationRefresh = stopEntityRefresh;

const WORKSAGE_URL = 'https://worksage.nbi-consulting.com/nbi_project_dashboard.html';

function buildSlackReply(opts) {
  const { title, itemType, clientName, assigneeName,
          assigneeResolved, clientResolved, queueId, createdAsTask, warnings } = opts || {};

  if (!title) {
    return '❌ Couldn\'t parse a task from that message.\nTry: @WorkSage [client] [person] what needs doing';
  }

  const lines = [];
  if (createdAsTask) {
    lines.push(`✅ Created: *${title}*`);
  } else {
    lines.push(`📥 Queued for triage: *${title}*`);
  }

  const typeName = (itemType || 'task').charAt(0).toUpperCase() + (itemType || 'task').slice(1).toLowerCase();
  const parts = [`📋 ${typeName}`];

  if (assigneeName && assigneeResolved) {
    parts.push(`👤 ${assigneeName}`);
  }

  if (clientName && clientResolved) {
    parts.push(`🏢 ${clientName}`);
  }

  lines.push(parts.join(' · '));

  if (warnings && warnings.includes('db_error')) {
    lines.push('⚠️ Couldn\'t look up client/assignee — queued without metadata');
  }

  if (!createdAsTask) {
    lines.push('_No client matched — queued for manual triage_');
  }

  lines.push(`🔗 ${WORKSAGE_URL}`);

  return lines.join('\n');
}

function slackApiCall(token, method, params, timeoutMs) {
  if (!token) return Promise.resolve(null);
  const qs = new URLSearchParams(params).toString();
  return new Promise((resolve) => {
    const req = https.request({
      hostname: 'slack.com',
      path: `/api/${method}?${qs}`,
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: timeoutMs || 3000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

async function lookupSlackUser(token, userId) {
  if (!token || !userId) return null;
  const result = await slackApiCall(token, 'users.info', { user: userId });
  if (!result || !result.ok) return null;
  return result.user?.real_name || result.user?.profile?.display_name || result.user?.name || null;
}

function postSlackReply(token, channel, text, threadTs) {
  if (!token) return Promise.resolve({ skipped: true });
  const payload = JSON.stringify({ channel, text, thread_ts: threadTs });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'slack.com',
      path: '/api/chat.postMessage',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
      timeout: 5000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ ok: false, error: 'parse_error' }); }
      });
    });
    req.on('error', () => resolve({ ok: false, error: 'network_error' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'timeout' }); });
    req.write(payload);
    req.end();
  });
}

async function handleAppMention(event, dbPool, botToken) {
  const entities = getEntityCache();
  const parsed = parseSlackMessage(event.text, entities);

  if (!parsed.title) {
    const errorReply = buildSlackReply({ title: null });
    await postSlackReply(botToken, event.channel, errorReply, event.ts);
    return { queued: false };
  }

  const clientId = parsed.clientMatch?.id || null;
  const clientName = parsed.clientMatch?.name || null;
  const clientResolved = !!parsed.clientMatch;
  const assigneeName = parsed.userMatch?.displayName || null;
  const assigneeResolved = !!parsed.userMatch;
  const itemType = parsed.itemType || 'task';
  const warnings = [];

  let submittedBy = `slack:${event.user}`;
  try {
    const realName = await lookupSlackUser(botToken, event.user);
    if (realName) submittedBy = realName;
  } catch { /* fall back to slack ID */ }

  // If client is resolved, create a real task directly. Otherwise queue for triage.
  let item;
  let createdAsTask = false;

  if (clientResolved) {
    const { rows } = await dbPool.query(
      `INSERT INTO tasks (title, description, client_id, item_type, status, assignees, source)
       VALUES ($1, $2, $3, $4, 'Not started', $5, 'slack') RETURNING *`,
      [parsed.title, parsed.description || '', clientId, itemType, assigneeName ? [assigneeName] : []]
    );
    item = rows[0];
    createdAsTask = true;
  } else {
    const { rows } = await dbPool.query(
      `INSERT INTO task_queue (title, description, submitted_by, slack_user_id, slack_channel, slack_message_ts, client_id, assignee, item_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [parsed.title, parsed.description, submittedBy, event.user, event.channel, event.ts,
       clientId, assigneeName, itemType]
    );
    item = rows[0];
  }

  const reply = buildSlackReply({
    title: parsed.title,
    itemType,
    clientName,
    assigneeName,
    assigneeResolved,
    clientResolved,
    queueId: item.id,
    createdAsTask,
    warnings,
  });
  await postSlackReply(botToken, event.channel, reply, event.ts);

  return { queued: !createdAsTask, created: createdAsTask, item, warnings };
}

module.exports = {
  verifySlackSignature, parseSlackMessage, postSlackReply, handleAppMention,
  loadClientAbbreviations, getClientAbbreviations, startAbbreviationRefresh, stopAbbreviationRefresh,
  loadEntityCache, getEntityCache, startEntityRefresh, stopEntityRefresh,
  buildSlackReply, lookupSlackUser,
};
