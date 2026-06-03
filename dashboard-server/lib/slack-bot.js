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

function parseSlackMessage(text, abbreviations) {
  const cleaned = (text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
  const nlIndex = cleaned.indexOf('\n');
  const firstLine = nlIndex === -1 ? cleaned : cleaned.slice(0, nlIndex).trim();
  const description = nlIndex === -1 ? null : cleaned.slice(nlIndex + 1).trim() || null;

  if (!firstLine) return { title: null, description, clientAbbr: null, itemType: null, assigneeRaw: null };

  const abbrSet = abbreviations || new Set();
  const tokens = firstLine.split(/\s+/);
  let clientAbbr = null;
  let itemType = null;
  let assigneeRaw = null;
  const remainder = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];
    const tokLower = tok.toLowerCase();

    if (tok === ':') { i++; break; }
    if (tok.endsWith(':')) {
      const word = tok.slice(0, -1);
      const wordLower = word.toLowerCase();
      if (!clientAbbr && abbrSet.has(wordLower)) { clientAbbr = word; }
      else if (!itemType && ITEM_TYPES.has(wordLower)) { itemType = word; }
      else { remainder.push(word); }
      i++;
      break;
    }

    if (!clientAbbr && abbrSet.has(tokLower)) {
      clientAbbr = tok;
      i++;
      continue;
    }

    if (!itemType && ITEM_TYPES.has(tokLower)) {
      itemType = tok;
      i++;
      continue;
    }

    if (tokLower === 'for' && !assigneeRaw && i + 1 < tokens.length) {
      i++;
      const nameParts = [];
      while (i < tokens.length) {
        const nt = tokens[i];
        if (nt === ':') { i++; break; }
        if (nt.endsWith(':')) {
          nameParts.push(nt.slice(0, -1));
          i++;
          break;
        }
        nameParts.push(nt);
        i++;
      }
      assigneeRaw = nameParts.join(' ') || null;
      break;
    }

    remainder.push(tok);
    i++;
  }

  while (i < tokens.length) {
    remainder.push(tokens[i]);
    i++;
  }

  const title = remainder.join(' ').trim() || null;
  return { title, description, clientAbbr, itemType, assigneeRaw };
}

let _abbrCache = new Set();
let _abbrCacheTimer = null;

async function loadClientAbbreviations(dbPool) {
  const { rows } = await dbPool.query(
    "SELECT abbreviation FROM clients WHERE abbreviation IS NOT NULL AND abbreviation != ''"
  );
  _abbrCache = new Set(rows.map(r => r.abbreviation.toLowerCase()));
  return _abbrCache;
}

function getClientAbbreviations() {
  return _abbrCache;
}

function startAbbreviationRefresh(dbPool, intervalMs) {
  if (_abbrCacheTimer) clearInterval(_abbrCacheTimer);
  _abbrCacheTimer = setInterval(() => {
    loadClientAbbreviations(dbPool).catch(() => {});
  }, intervalMs || 3600000);
}

function stopAbbreviationRefresh() {
  if (_abbrCacheTimer) { clearInterval(_abbrCacheTimer); _abbrCacheTimer = null; }
}

async function resolveClient(dbPool, abbr) {
  if (!abbr) return null;
  const { rows } = await dbPool.query(
    'SELECT id, name, abbreviation FROM clients WHERE LOWER(abbreviation) = LOWER($1) LIMIT 1',
    [abbr]
  );
  return rows[0] || null;
}

async function resolveAssignee(dbPool, rawName) {
  if (!rawName || !rawName.trim()) return { resolved: false, raw: rawName || '', reason: 'not_found' };

  const name = rawName.trim();

  const { rows: exact } = await dbPool.query(
    'SELECT display_name FROM users WHERE LOWER(display_name) = LOWER($1) AND is_active = true LIMIT 1',
    [name]
  );
  if (exact.length === 1) return { resolved: true, displayName: exact[0].display_name };

  const { rows: prefix } = await dbPool.query(
    "SELECT display_name FROM users WHERE LOWER(display_name) LIKE (LOWER($1) || ' %') AND is_active = true LIMIT 2",
    [name]
  );
  if (prefix.length === 1) return { resolved: true, displayName: prefix[0].display_name };
  if (prefix.length > 1) return { resolved: false, raw: name, reason: 'ambiguous' };

  return { resolved: false, raw: name, reason: 'not_found' };
}

const WORKSAGE_URL = 'https://worksage.nbi-consulting.com/nbi_project_dashboard.html';

function buildSlackReply(opts) {
  const { title, itemType, clientName, clientAbbr, assigneeName,
          assigneeResolved, clientResolved, queueId, warnings } = opts || {};

  if (!title) {
    return '❌ Couldn\'t parse a task from that message.\nUsage: @WorkSage [CH|LH|NBI] [task|story|feature] for [Name]: Title';
  }

  const lines = [];
  lines.push(`✅ Queued: *${title}*`);

  const typeName = (itemType || 'task').charAt(0).toUpperCase() + (itemType || 'task').slice(1).toLowerCase();
  const parts = [`📋 ${typeName}`];

  if (assigneeName && assigneeResolved) {
    parts.push(`👤 ${assigneeName}`);
  } else if (assigneeName && !assigneeResolved) {
    parts.push(`⚠️ "${assigneeName}" (not matched to a user)`);
  }

  if (clientName && clientResolved) {
    parts.push(`🏢 ${clientName}`);
  } else if (clientAbbr && !clientResolved) {
    parts.push(`⚠️ "${clientAbbr}" (unknown client)`);
  }

  lines.push(parts.join(' · '));

  if (warnings && warnings.includes('db_error')) {
    lines.push('⚠️ Couldn\'t look up client/assignee — queued without metadata');
  }

  if (queueId) lines.push(`🆔 ${queueId}`);
  lines.push(`🔗 ${WORKSAGE_URL}`);

  return lines.join('\n');
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
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ ok: false, error: 'parse_error' }); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function handleAppMention(event, dbPool, botToken) {
  const { title, description } = parseSlackMessage(event.text);
  if (!title) return { queued: false };

  const { rows } = await dbPool.query(
    `INSERT INTO task_queue (title, description, submitted_by, slack_user_id, slack_channel, slack_message_ts)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [title, description, `slack:${event.user}`, event.user, event.channel, event.ts]
  );
  const item = rows[0];

  await postSlackReply(
    botToken,
    event.channel,
    `Queued: *${title}*\nID: \`${item.id}\``,
    event.ts
  );

  return { queued: true, item };
}

module.exports = {
  verifySlackSignature, parseSlackMessage, postSlackReply, handleAppMention,
  loadClientAbbreviations, getClientAbbreviations, startAbbreviationRefresh, stopAbbreviationRefresh,
  resolveClient, resolveAssignee, buildSlackReply,
};
