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

function parseSlackMessage(text) {
  const cleaned = (text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return { title: null, description: null };
  return {
    title: lines[0],
    description: lines.length > 1 ? lines.slice(1).join('\n') : null,
  };
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

module.exports = { verifySlackSignature, parseSlackMessage, postSlackReply, handleAppMention };
