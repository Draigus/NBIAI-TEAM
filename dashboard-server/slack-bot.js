'use strict';

// NBI AIOS Slack bot -- Socket Mode, Glen-only.
// Runs as its own PM2 process (nbi-slack-bot) so bot crashes never touch the dashboard.

require('dotenv').config();
const path = require('path');
const { App } = require('@slack/bolt');
const { Pool } = require('pg');
const { dispatch, assertModelAllowed } = require('./lib/claude-dispatch');
const {
  isAuthorised, handleButtonAction, buildDispatchPrompt, truncateForSlack,
  buildTranscript, createChannelQueue, ACK_TEXT
} = require('./lib/bot-handlers');
const { conversationKey, getOrCreateSession, rotateSession, markUsed } = require('./lib/session-store');

const GLEN_ID = process.env.GLEN_SLACK_USER_ID || '';
const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..');
const DISPATCH_MODEL = process.env.AIOS_DISPATCH_MODEL || 'claude-opus-4-6';

function log(level, msg, extra) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, src: 'slack-bot', msg, ...extra }));
}

if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN || !GLEN_ID || !process.env.DATABASE_URL) {
  log('error', 'Missing SLACK_BOT_TOKEN, SLACK_APP_TOKEN, GLEN_SLACK_USER_ID, or DATABASE_URL -- refusing to start');
  process.exit(1);
}

try {
  assertModelAllowed(DISPATCH_MODEL);
} catch (err) {
  log('error', 'AIOS_DISPATCH_MODEL rejected by model policy', { model: DISPATCH_MODEL, error: err.message });
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on('error', (err) => {
  log('error', 'Unexpected error on idle client', { error: err.message });
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

// --- Button actions ---
for (const verb of ['approve', 'skip', 'more']) {
  app.action(`aios_${verb}`, async ({ ack, body, action, client }) => {
    await ack();
    const userId = body.user && body.user.id;
    if (userId !== GLEN_ID) {
      log('warn', 'Button press from non-Glen user ignored', { userId });
      return;
    }
    try {
      const result = await handleButtonAction({ pool, verb, actionId: action.value });
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: body.message && body.message.ts, text: truncateForSlack(result.message) });
      log('info', 'Button handled', { verb, actionId: action.value, ok: result.ok });
      if (result.needsRouting && result.actionId) {
        try {
          const { buildRoutingClientBlocks } = require('./lib/bot-handlers');
          const { rows: clientRows } = await pool.query('SELECT id, name FROM clients ORDER BY name');
          const blocks = buildRoutingClientBlocks(
            { id: result.actionId, title: result.message.replace('Approved: ', '').replace('. Routing...', '') },
            clientRows
          );
          await client.chat.postMessage({
            channel: body.channel.id,
            thread_ts: body.message && body.message.ts,
            blocks,
            text: 'Where should this go?',
          });
        } catch (routeErr) {
          log('error', 'SlackBot', 'Failed to post routing question', { error: routeErr.message });
          await client.chat.postMessage({
            channel: body.channel.id,
            thread_ts: body.message && body.message.ts,
            text: `Approved but could not post routing question: ${routeErr.message}. Route from dashboard.`,
          });
        }
      }
    } catch (err) {
      log('error', 'Button handling failed', { verb, error: err.message });
      await client.chat.postMessage({ channel: body.channel.id, text: `That failed: ${err.message}` });
    }
  });
}

// --- Routing: client selection ---
app.action('aios_route_client', async ({ ack, body, action, client }) => {
  await ack();
  const userId = body.user && body.user.id;
  if (userId !== GLEN_ID) return;

  const val = action.selected_option?.value || '';
  const [actionId, clientIdOrNone] = val.split(':');
  if (!actionId) return;

  try {
    const { mergeRoutingIntoRecipe, applyRouting, buildRoutingProjectBlocks } = require('./lib/bot-handlers');
    const { executeAndReport } = require('./lib/execute-and-report');
    const threadTs = body.message && body.message.ts;

    // Guard: check action is still awaiting routing
    const { rows: checkRows } = await pool.query('SELECT execution_state, execution_recipe FROM aios_actions WHERE id = $1', [actionId]);
    if (checkRows.length === 0 || checkRows[0].execution_state !== 'awaiting_routing') {
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Already routed.' });
      return;
    }

    if (clientIdOrNone === 'none') {
      const merged = mergeRoutingIntoRecipe(checkRows[0].execution_recipe, { clientId: null, parentId: null });
      const applied = await applyRouting(pool, actionId, merged);
      if (!applied) {
        await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Already routed.' });
        return;
      }
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Filed in AIOS Inbox. Executing...' });
      const execResult = await executeAndReport(pool, actionId, {
        internalToken: process.env.AIOS_INTERNAL_TOKEN,
        baseUrl: `http://localhost:${process.env.PORT || 8888}`,
        fetch: globalThis.fetch, pool, log,
        repoRoot: path.resolve(__dirname, '..'),
      }, log);
      const status = execResult.success ? 'Done' : 'Failed';
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: `${status}: ${JSON.stringify(execResult)}` });
      return;
    }

    // Client selected -- check for initiatives under this client
    const clientId = clientIdOrNone;
    const { rows: clientNameRows } = await pool.query('SELECT name FROM clients WHERE id = $1', [clientId]);
    const clientName = clientNameRows[0]?.name || 'Unknown';
    const { rows: initiatives } = await pool.query(
      `SELECT id, title FROM tasks
       WHERE client_id = $1 AND parent_id IS NULL AND item_type = 'initiative'
         AND status NOT IN ('Done', 'Cancelled')
       ORDER BY title`,
      [clientId]
    );

    if (initiatives.length === 0) {
      const merged = mergeRoutingIntoRecipe(checkRows[0].execution_recipe, { clientId, parentId: null });
      const applied = await applyRouting(pool, actionId, merged);
      if (!applied) { await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Already routed.' }); return; }
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: `Filed under ${clientName} (new AIOS Inbox). Executing...` });
      const execResult = await executeAndReport(pool, actionId, {
        internalToken: process.env.AIOS_INTERNAL_TOKEN, baseUrl: `http://localhost:${process.env.PORT || 8888}`,
        fetch: globalThis.fetch, pool, log, repoRoot: path.resolve(__dirname, '..'),
      }, log);
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: `${execResult.success ? 'Done' : 'Failed'}: ${JSON.stringify(execResult)}` });
      return;
    }

    if (initiatives.length === 1) {
      const merged = mergeRoutingIntoRecipe(checkRows[0].execution_recipe, { clientId, parentId: initiatives[0].id });
      const applied = await applyRouting(pool, actionId, merged);
      if (!applied) { await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Already routed.' }); return; }
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: `Filed under ${clientName} > ${initiatives[0].title}. Executing...` });
      const execResult = await executeAndReport(pool, actionId, {
        internalToken: process.env.AIOS_INTERNAL_TOKEN, baseUrl: `http://localhost:${process.env.PORT || 8888}`,
        fetch: globalThis.fetch, pool, log, repoRoot: path.resolve(__dirname, '..'),
      }, log);
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: `${execResult.success ? 'Done' : 'Failed'}: ${JSON.stringify(execResult)}` });
      return;
    }

    // Multiple initiatives -- post project selection
    const projBlocks = buildRoutingProjectBlocks({ id: actionId }, clientId, clientName, initiatives);
    await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, blocks: projBlocks, text: `Which project under ${clientName}?` });
  } catch (err) {
    log('error', 'SlackBot', 'Client routing failed', { error: err.message });
    await client.chat.postMessage({ channel: body.channel.id, text: `Routing failed: ${err.message}` });
  }
});

// --- Routing: project selection ---
app.action('aios_route_project', async ({ ack, body, action, client }) => {
  await ack();
  const userId = body.user && body.user.id;
  if (userId !== GLEN_ID) return;

  const val = action.selected_option?.value || '';
  const parts = val.split(':');
  const actionId = parts[0];
  const clientId = parts[1];
  const parentIdOrInbox = parts[2];
  if (!actionId || !clientId) return;

  try {
    const { mergeRoutingIntoRecipe, applyRouting } = require('./lib/bot-handlers');
    const { executeAndReport } = require('./lib/execute-and-report');
    const threadTs = body.message && body.message.ts;

    const { rows: checkRows } = await pool.query('SELECT execution_state, execution_recipe FROM aios_actions WHERE id = $1', [actionId]);
    if (checkRows.length === 0 || checkRows[0].execution_state !== 'awaiting_routing') {
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Already routed.' });
      return;
    }

    const parentId = parentIdOrInbox === 'inbox' ? null : parentIdOrInbox;
    const merged = mergeRoutingIntoRecipe(checkRows[0].execution_recipe, { clientId, parentId });
    const applied = await applyRouting(pool, actionId, merged);
    if (!applied) {
      await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: 'Already routed.' });
      return;
    }

    const { rows: clientNameRows } = await pool.query('SELECT name FROM clients WHERE id = $1', [clientId]);
    const clientName = clientNameRows[0]?.name || 'Unknown';
    let destLabel = `${clientName} (new AIOS Inbox)`;
    if (parentId) {
      const { rows: parentRows } = await pool.query('SELECT title FROM tasks WHERE id = $1', [parentId]);
      destLabel = `${clientName} > ${parentRows[0]?.title || parentId}`;
    }

    await client.chat.postMessage({ channel: body.channel.id, thread_ts: threadTs, text: `Filed under ${destLabel}. Executing...` });

    const execResult = await executeAndReport(pool, actionId, {
      internalToken: process.env.AIOS_INTERNAL_TOKEN,
      baseUrl: `http://localhost:${process.env.PORT || 8888}`,
      fetch: globalThis.fetch, pool, log,
      repoRoot: path.resolve(__dirname, '..'),
    }, log);
    await client.chat.postMessage({
      channel: body.channel.id, thread_ts: threadTs,
      text: `${execResult.success ? 'Done' : 'Failed'}: ${JSON.stringify(execResult)}`,
    });
  } catch (err) {
    log('error', 'SlackBot', 'Project routing failed', { error: err.message });
    await client.chat.postMessage({ channel: body.channel.id, text: `Routing failed: ${err.message}` });
  }
});

// --- Free-form DMs ---
// Serialise dispatches per channel so answers come back in the order asked
// (a fast second answer overtaking a slow first one reads as a broken conversation).
const dmQueue = createChannelQueue();

// One persistent headless Claude session per conversation (channel or thread),
// mapped in Postgres. First message pays the cold start (grounding prompt +
// Slack history); every follow-up resumes the same session, which already
// holds the Brain reads and the whole conversation.
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// Fetch recent conversation so a NEW session is not stateless. If Glen asked
// inside a thread (e.g. under the morning brief), pull that thread -- which
// includes the brief itself. Otherwise pull recent top-level DM history.
async function fetchContextMessages(client, message) {
  if (message.thread_ts) {
    const res = await client.conversations.replies({ channel: message.channel, ts: message.thread_ts, limit: 20 });
    return res.messages || [];
  }
  const res = await client.conversations.history({ channel: message.channel, limit: 10 });
  return res.messages || [];
}

async function buildFreshSessionPrompt(client, message, question) {
  let transcript = '';
  try {
    const contextMessages = await fetchContextMessages(client, message);
    transcript = buildTranscript(contextMessages, { glenId: GLEN_ID, excludeTs: message.ts });
  } catch (err) {
    log('warn', 'Context fetch failed, answering without history', { error: err.message });
  }
  return buildDispatchPrompt(question, transcript);
}

app.message(async ({ message, say, client }) => {
  if (message.subtype || message.bot_id) return; // ignore edits, joins, bot echoes
  if (!isAuthorised(message, GLEN_ID)) {
    log('warn', 'DM from unauthorised user ignored', { user: message.user, channel_type: message.channel_type });
    return;
  }
  const question = (message.text || '').trim();
  if (!question) return;

  // Answer where Glen asked: inside his thread if threaded, top level otherwise.
  const replyOpts = message.thread_ts ? { thread_ts: message.thread_ts } : {};

  log('info', 'Dispatching DM to headless Claude', { chars: question.length, threaded: Boolean(message.thread_ts) });
  await say({ text: ACK_TEXT, ...replyOpts });

  await dmQueue.enqueue(message.channel, async () => {
    const key = conversationKey(message.channel, message.thread_ts);
    let session = null;
    try {
      session = await getOrCreateSession(pool, key, SESSION_MAX_AGE_MS);
    } catch (err) {
      log('warn', 'Session store unavailable, dispatching stateless', { error: err.message });
    }

    try {
      let result;
      if (!session) {
        // Session store down: stateless dispatch with full grounding, as before.
        result = await dispatch({
          prompt: await buildFreshSessionPrompt(client, message, question),
          model: DISPATCH_MODEL, cwd: REPO_ROOT, timeoutMs: 180000,
        });
      } else if (session.isNew) {
        result = await dispatch({
          prompt: await buildFreshSessionPrompt(client, message, question),
          model: DISPATCH_MODEL, cwd: REPO_ROOT, timeoutMs: 180000,
          sessionId: session.sessionId,
        });
      } else {
        try {
          result = await dispatch({
            prompt: question,
            model: DISPATCH_MODEL, cwd: REPO_ROOT, timeoutMs: 180000,
            resumeSessionId: session.sessionId,
          });
        } catch (err) {
          // Resume can fail if the on-disk session is gone or corrupt. Rotate
          // and retry fresh ONCE -- but never retry a timeout (the answer is
          // slow, not the session broken; a retry would double the wait).
          if (/timed out/.test(err.message)) throw err;
          log('warn', 'Resume failed, rotating session and retrying fresh', { error: err.message });
          session = await rotateSession(pool, key);
          result = await dispatch({
            prompt: await buildFreshSessionPrompt(client, message, question),
            model: DISPATCH_MODEL, cwd: REPO_ROOT, timeoutMs: 180000,
            sessionId: session.sessionId,
          });
        }
      }
      if (session) {
        await markUsed(pool, key).catch(err =>
          log('warn', 'markUsed failed', { error: err.message }));
      }
      await say({ text: truncateForSlack(result.text || '(empty response)'), ...replyOpts });
      log('info', 'DM answered', {
        durationMs: result.durationMs,
        session: session ? (session.isNew ? 'new' : 'resumed') : 'stateless',
      });
    } catch (err) {
      log('error', 'Dispatch failed', { error: err.message });
      await say({ text: `I could not answer that: ${err.message}`, ...replyOpts });
    }
  }).catch(err => {
    log('error', 'DM queue task failed', { error: err.message });
  });
});

app.start()
  .then(() => {
    log('info', 'Slack bot running (Socket Mode)', { model: DISPATCH_MODEL, repo: REPO_ROOT });
  })
  .catch((err) => {
    log('error', 'Slack bot failed to start', { error: err.message });
    process.exit(1);
  });
