// dashboard-server/tests/unit/slack-bot.test.mjs
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const crypto = require('crypto');
const { pool, truncate } = require('../helpers/db.js');

// Helper: compute a valid Slack signature for test payloads
function signPayload(secret, timestamp, body) {
  const baseString = `v0:${timestamp}:${body}`;
  return 'v0=' + crypto.createHmac('sha256', secret).update(baseString).digest('hex');
}

const TEST_SECRET = 'test_signing_secret_abc123';
const TEST_BODY = '{"type":"event_callback","event":{"type":"app_mention","text":"hello"}}';

describe('verifySlackSignature', () => {
  let verifySlackSignature;

  it('loads the module', () => {
    ({ verifySlackSignature } = require('../../lib/slack-bot'));
    expect(typeof verifySlackSignature).toBe('function');
  });

  it('returns true for a valid signature', () => {
    ({ verifySlackSignature } = require('../../lib/slack-bot'));
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = signPayload(TEST_SECRET, ts, TEST_BODY);
    expect(verifySlackSignature(TEST_SECRET, ts, TEST_BODY, sig)).toBe(true);
  });

  it('returns false for an invalid signature', () => {
    ({ verifySlackSignature } = require('../../lib/slack-bot'));
    const ts = String(Math.floor(Date.now() / 1000));
    expect(verifySlackSignature(TEST_SECRET, ts, TEST_BODY, 'v0=bad')).toBe(false);
  });

  it('returns false for a timestamp older than 5 minutes', () => {
    ({ verifySlackSignature } = require('../../lib/slack-bot'));
    const oldTs = String(Math.floor(Date.now() / 1000) - 400);
    const sig = signPayload(TEST_SECRET, oldTs, TEST_BODY);
    expect(verifySlackSignature(TEST_SECRET, oldTs, TEST_BODY, sig)).toBe(false);
  });

  it('returns false when timestamp is missing', () => {
    ({ verifySlackSignature } = require('../../lib/slack-bot'));
    expect(verifySlackSignature(TEST_SECRET, null, TEST_BODY, 'v0=abc')).toBe(false);
  });

  it('returns false when signature is missing', () => {
    ({ verifySlackSignature } = require('../../lib/slack-bot'));
    const ts = String(Math.floor(Date.now() / 1000));
    expect(verifySlackSignature(TEST_SECRET, ts, TEST_BODY, null)).toBe(false);
  });
});

describe('parseSlackMessage', () => {
  let parseSlackMessage;

  it('extracts title from a single-line message after removing mention', () => {
    ({ parseSlackMessage } = require('../../lib/slack-bot'));
    const result = parseSlackMessage('<@U12345ABC> Fix the login page');
    expect(result.title).toBe('Fix the login page');
    expect(result.description).toBeNull();
  });

  it('extracts title and description from multi-line message', () => {
    ({ parseSlackMessage } = require('../../lib/slack-bot'));
    const result = parseSlackMessage('<@U12345ABC> Fix the login page\nThe submit button does nothing when clicked\nAlso the password field is missing');
    expect(result.title).toBe('Fix the login page');
    expect(result.description).toBe('The submit button does nothing when clicked\nAlso the password field is missing');
  });

  it('returns null title for empty message after mention removal', () => {
    ({ parseSlackMessage } = require('../../lib/slack-bot'));
    const result = parseSlackMessage('<@U12345ABC>');
    expect(result.title).toBeNull();
    expect(result.description).toBeNull();
  });

  it('handles multiple mentions', () => {
    ({ parseSlackMessage } = require('../../lib/slack-bot'));
    const result = parseSlackMessage('<@U12345ABC> <@UOTHER> Deploy the new build');
    expect(result.title).toBe('Deploy the new build');
  });

  it('handles message with no mention', () => {
    ({ parseSlackMessage } = require('../../lib/slack-bot'));
    const result = parseSlackMessage('Just a plain message');
    expect(result.title).toBe('Just a plain message');
  });
});

describe('postSlackReply', () => {
  let postSlackReply;

  it('returns { skipped: true } when token is empty', async () => {
    ({ postSlackReply } = require('../../lib/slack-bot'));
    const result = await postSlackReply('', 'C123', 'hello', '123.456');
    expect(result.skipped).toBe(true);
  });
});

describe('handleAppMention', () => {
  let handleAppMention;

  beforeEach(async () => { await truncate(); });

  it('inserts a queue item from a valid mention event', async () => {
    ({ handleAppMention } = require('../../lib/slack-bot'));
    const event = {
      type: 'app_mention',
      text: '<@U12345> Fix the login page\nButtons are broken',
      user: 'U99SENDER',
      channel: 'C88CHANNEL',
      ts: '1234567890.123456',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(true);
    expect(result.item.title).toBe('Fix the login page');
    expect(result.item.description).toBe('Buttons are broken');
    expect(result.item.slack_user_id).toBe('U99SENDER');
    expect(result.item.slack_channel).toBe('C88CHANNEL');
    expect(result.item.slack_message_ts).toBe('1234567890.123456');

    const { rows } = await pool.query('SELECT * FROM task_queue');
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('Fix the login page');
  });

  it('returns queued:false for an empty message', async () => {
    ({ handleAppMention } = require('../../lib/slack-bot'));
    const event = {
      type: 'app_mention',
      text: '<@U12345>',
      user: 'U99SENDER',
      channel: 'C88CHANNEL',
      ts: '1234567890.123456',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(false);

    const { rows } = await pool.query('SELECT * FROM task_queue');
    expect(rows).toHaveLength(0);
  });
});
