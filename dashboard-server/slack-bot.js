'use strict';

// NBI AIOS Slack bot -- Socket Mode, Glen-only.
// Runs as its own PM2 process (nbi-slack-bot) so bot crashes never touch the dashboard.

require('dotenv').config();
const path = require('path');
const { App } = require('@slack/bolt');
const { Pool } = require('pg');
const { dispatch } = require('./lib/claude-dispatch');
const {
  isAuthorised, handleButtonAction, buildDispatchPrompt, truncateForSlack
} = require('./lib/bot-handlers');

const GLEN_ID = process.env.GLEN_SLACK_USER_ID || '';
const REPO_ROOT = process.env.REPO_ROOT || path.resolve(__dirname, '..');
const DISPATCH_MODEL = process.env.AIOS_DISPATCH_MODEL || 'claude-opus-4-6';

function log(level, msg, extra) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, src: 'slack-bot', msg, ...extra }));
}

if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_APP_TOKEN || !GLEN_ID) {
  log('error', 'Missing SLACK_BOT_TOKEN, SLACK_APP_TOKEN, or GLEN_SLACK_USER_ID -- refusing to start');
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
    } catch (err) {
      log('error', 'Button handling failed', { verb, error: err.message });
      await client.chat.postMessage({ channel: body.channel.id, text: `That failed: ${err.message}` });
    }
  });
}

// --- Free-form DMs ---
app.message(async ({ message, say }) => {
  if (message.subtype || message.bot_id) return; // ignore edits, joins, bot echoes
  if (!isAuthorised(message, GLEN_ID)) {
    log('warn', 'DM from unauthorised user ignored', { user: message.user, channel_type: message.channel_type });
    return;
  }
  const question = (message.text || '').trim();
  if (!question) return;

  log('info', 'Dispatching DM to headless Claude', { chars: question.length });
  await say('On it -- give me up to a minute.');
  try {
    const result = await dispatch({
      prompt: buildDispatchPrompt(question),
      model: DISPATCH_MODEL,
      cwd: REPO_ROOT,
      timeoutMs: 180000,
    });
    await say(truncateForSlack(result.text || '(empty response)'));
    log('info', 'DM answered', { durationMs: result.durationMs });
  } catch (err) {
    log('error', 'Dispatch failed', { error: err.message });
    await say(`I could not answer that: ${err.message}`);
  }
});

app.start()
  .then(() => {
    log('info', 'Slack bot running (Socket Mode)', { model: DISPATCH_MODEL, repo: REPO_ROOT });
  })
  .catch((err) => {
    log('error', 'Slack bot failed to start', { error: err.message });
    process.exit(1);
  });
