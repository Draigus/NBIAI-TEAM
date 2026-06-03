// dashboard-server/tests/unit/slack-bot.test.mjs
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const crypto = require('crypto');
const { pool, truncate } = require('../helpers/db.js');

afterAll(() => {
  const { stopAbbreviationRefresh } = require('../../lib/slack-bot');
  stopAbbreviationRefresh();
});

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

describe('parseSlackMessage (enhanced)', () => {
  let parseSlackMessage;
  const ABBREVS = new Set(['ch', 'lh', 'nbi', 'go', 'su', 'pl']);

  beforeEach(() => {
    ({ parseSlackMessage } = require('../../lib/slack-bot'));
  });

  it('extracts full metadata: client, type, assignee, title', () => {
    const r = parseSlackMessage('<@U123> CH task for Aris: Fix login timeout', ABBREVS);
    expect(r.clientAbbr).toBe('CH');
    expect(r.itemType).toBe('task');
    expect(r.assigneeRaw).toBe('Aris');
    expect(r.title).toBe('Fix login timeout');
    expect(r.description).toBeNull();
  });

  it('extracts client + assignee, defaults type to null', () => {
    const r = parseSlackMessage('<@U123> LH for Magnus: Review spec', ABBREVS);
    expect(r.clientAbbr).toBe('LH');
    expect(r.itemType).toBeNull();
    expect(r.assigneeRaw).toBe('Magnus');
    expect(r.title).toBe('Review spec');
  });

  it('extracts client + type, no assignee', () => {
    const r = parseSlackMessage('<@U123> NBI feature: Build integration', ABBREVS);
    expect(r.clientAbbr).toBe('NBI');
    expect(r.itemType).toBe('feature');
    expect(r.assigneeRaw).toBeNull();
    expect(r.title).toBe('Build integration');
  });

  it('bare title with no metadata', () => {
    const r = parseSlackMessage('<@U123> Fix the broken button', ABBREVS);
    expect(r.clientAbbr).toBeNull();
    expect(r.itemType).toBeNull();
    expect(r.assigneeRaw).toBeNull();
    expect(r.title).toBe('Fix the broken button');
  });

  it('handles tokens in any order (type before client)', () => {
    const r = parseSlackMessage('<@U123> task CH for Aris: Works in any order', ABBREVS);
    expect(r.clientAbbr).toBe('CH');
    expect(r.itemType).toBe('task');
    expect(r.assigneeRaw).toBe('Aris');
    expect(r.title).toBe('Works in any order');
  });

  it('is case-insensitive for tokens', () => {
    const r = parseSlackMessage('<@U123> ch TASK For aris: Title', ABBREVS);
    expect(r.clientAbbr).toBe('ch');
    expect(r.itemType).toBe('TASK');
    expect(r.assigneeRaw).toBe('aris');
    expect(r.title).toBe('Title');
  });

  it('captures "for X" as assigneeRaw even if X is not a real user (pass 2 decides)', () => {
    const r = parseSlackMessage('<@U123> Deploy fix for production', ABBREVS);
    expect(r.assigneeRaw).toBe('production');
    expect(r.title).toBe('Deploy fix');
  });

  it('returns null title when only metadata with trailing colon', () => {
    const r = parseSlackMessage('<@U123> CH task for Aris:', ABBREVS);
    expect(r.title).toBeNull();
  });

  it('captures greedy assignee when no colon', () => {
    const r = parseSlackMessage('<@U123> CH task for Aris Fix login', ABBREVS);
    expect(r.clientAbbr).toBe('CH');
    expect(r.itemType).toBe('task');
    expect(r.assigneeRaw).toBe('Aris Fix login');
    expect(r.title).toBeNull();
  });

  it('extracts description from subsequent lines', () => {
    const r = parseSlackMessage('<@U123> CH task for Aris: Fix\nDetails here\nMore info', ABBREVS);
    expect(r.title).toBe('Fix');
    expect(r.description).toBe('Details here\nMore info');
  });

  it('strips multiple bot mentions', () => {
    const r = parseSlackMessage('<@U1> <@U2> CH Fix it', ABBREVS);
    expect(r.clientAbbr).toBe('CH');
    expect(r.title).toBe('Fix it');
  });

  it('returns null title for empty message after mention removal', () => {
    const r = parseSlackMessage('<@U123>', ABBREVS);
    expect(r.title).toBeNull();
  });

  it('handles message with no mention', () => {
    const r = parseSlackMessage('Just a plain message', ABBREVS);
    expect(r.title).toBe('Just a plain message');
  });

  it('handles story type without client', () => {
    const r = parseSlackMessage('<@U123> story for Glen: User can export CSV', ABBREVS);
    expect(r.clientAbbr).toBeNull();
    expect(r.itemType).toBe('story');
    expect(r.assigneeRaw).toBe('Glen');
    expect(r.title).toBe('User can export CSV');
  });

  it('works with empty abbreviation set', () => {
    const r = parseSlackMessage('<@U123> CH task for Aris: Fix login', new Set());
    expect(r.clientAbbr).toBeNull();
    expect(r.itemType).toBe('task');
    expect(r.title).toBe('CH Fix login');
    expect(r.assigneeRaw).toBe('Aris');
  });
});

describe('resolveClient', () => {
  let resolveClient;

  beforeEach(async () => {
    ({ resolveClient } = require('../../lib/slack-bot'));
    await truncate();
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Couch Heroes', 'CH')");
  });

  it('resolves a known abbreviation', async () => {
    const result = await resolveClient(pool, 'CH');
    expect(result).not.toBeNull();
    expect(result.name).toBe('Couch Heroes');
    expect(result.abbreviation).toBe('CH');
    expect(result.id).toBeDefined();
  });

  it('resolves case-insensitively', async () => {
    const result = await resolveClient(pool, 'ch');
    expect(result).not.toBeNull();
    expect(result.name).toBe('Couch Heroes');
  });

  it('returns null for unknown abbreviation', async () => {
    const result = await resolveClient(pool, 'XX');
    expect(result).toBeNull();
  });

  it('returns null for null input', async () => {
    const result = await resolveClient(pool, null);
    expect(result).toBeNull();
  });
});

describe('resolveAssignee', () => {
  let resolveAssignee;

  beforeEach(async () => {
    ({ resolveAssignee } = require('../../lib/slack-bot'));
    await truncate();
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('glen', 'Glen Pryer', 'x', 'admin', true)");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('magnus', 'Magnus Pryer', 'x', 'admin', true)");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('inactive', 'Inactive User', 'x', 'member', false)");
  });

  it('resolves exact full name match', async () => {
    const r = await resolveAssignee(pool, 'Glen Pryer');
    expect(r.resolved).toBe(true);
    expect(r.displayName).toBe('Glen Pryer');
  });

  it('resolves exact full name case-insensitively', async () => {
    const r = await resolveAssignee(pool, 'glen pryer');
    expect(r.resolved).toBe(true);
    expect(r.displayName).toBe('Glen Pryer');
  });

  it('resolves first name via prefix match', async () => {
    const r = await resolveAssignee(pool, 'Glen');
    expect(r.resolved).toBe(true);
    expect(r.displayName).toBe('Glen Pryer');
  });

  it('returns not_found for unknown name', async () => {
    const r = await resolveAssignee(pool, 'Nobody');
    expect(r.resolved).toBe(false);
    expect(r.raw).toBe('Nobody');
    expect(r.reason).toBe('not_found');
  });

  it('returns not_found for empty string', async () => {
    const r = await resolveAssignee(pool, '');
    expect(r.resolved).toBe(false);
    expect(r.reason).toBe('not_found');
  });

  it('does not match inactive users', async () => {
    const r = await resolveAssignee(pool, 'Inactive User');
    expect(r.resolved).toBe(false);
    expect(r.reason).toBe('not_found');
  });

  it('returns not_found for null input', async () => {
    const r = await resolveAssignee(pool, null);
    expect(r.resolved).toBe(false);
    expect(r.reason).toBe('not_found');
  });
});

describe('loadClientAbbreviations', () => {
  let loadClientAbbreviations;

  beforeEach(async () => {
    ({ loadClientAbbreviations } = require('../../lib/slack-bot'));
    await truncate();
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Couch Heroes', 'CH')");
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Lighthouse Studios', 'LH')");
    await pool.query("INSERT INTO clients (name) VALUES ('No Abbrev Client')");
  });

  it('returns a Set of lowercase abbreviations', async () => {
    const set = await loadClientAbbreviations(pool);
    expect(set).toBeInstanceOf(Set);
    expect(set.has('ch')).toBe(true);
    expect(set.has('lh')).toBe(true);
    expect(set.size).toBe(2);
  });
});

describe('buildSlackReply', () => {
  let buildSlackReply;

  beforeEach(() => {
    ({ buildSlackReply } = require('../../lib/slack-bot'));
  });

  it('builds a full success reply with all metadata', () => {
    const reply = buildSlackReply({
      title: 'Fix login timeout',
      itemType: 'task',
      clientName: 'Couch Heroes',
      assigneeName: 'Aris',
      assigneeResolved: true,
      clientResolved: true,
      queueId: 'abc-123',
    });
    expect(reply).toContain('✅ Queued: *Fix login timeout*');
    expect(reply).toContain('📋 Task');
    expect(reply).toContain('👤 Aris');
    expect(reply).toContain('🏢 Couch Heroes');
    expect(reply).toContain('🆔 abc-123');
    expect(reply).toContain('🔗');
  });

  it('flags unresolved assignee with warning', () => {
    const reply = buildSlackReply({
      title: 'Fix login timeout',
      itemType: 'task',
      clientName: 'Couch Heroes',
      assigneeName: 'Nobody',
      assigneeResolved: false,
      clientResolved: true,
      queueId: 'abc-123',
    });
    expect(reply).toContain('⚠️ "Nobody" (not matched to a user)');
    expect(reply).not.toContain('👤');
  });

  it('flags unresolved client with warning', () => {
    const reply = buildSlackReply({
      title: 'Fix login timeout',
      itemType: 'task',
      clientName: null,
      clientAbbr: 'XX',
      assigneeName: 'Aris',
      assigneeResolved: true,
      clientResolved: false,
      queueId: 'abc-123',
    });
    expect(reply).toContain('⚠️ "XX" (unknown client)');
    expect(reply).not.toContain('🏢');
  });

  it('builds minimal reply with no metadata', () => {
    const reply = buildSlackReply({
      title: 'Fix the broken button',
      itemType: 'task',
      queueId: 'abc-123',
    });
    expect(reply).toContain('✅ Queued: *Fix the broken button*');
    expect(reply).toContain('📋 Task');
    expect(reply).toContain('🆔 abc-123');
    expect(reply).not.toContain('👤');
    expect(reply).not.toContain('🏢');
  });

  it('builds error reply for empty title', () => {
    const reply = buildSlackReply({ title: null });
    expect(reply).toContain('❌');
    expect(reply).toContain('Usage:');
  });

  it('builds degraded reply with DB error warning', () => {
    const reply = buildSlackReply({
      title: 'Fix login timeout',
      itemType: 'task',
      queueId: 'abc-123',
      warnings: ['db_error'],
    });
    expect(reply).toContain('⚠️');
    expect(reply).toContain('queued without metadata');
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

describe('handleAppMention (enhanced)', () => {
  let handleAppMention, loadClientAbbreviations;

  beforeEach(async () => {
    ({ handleAppMention, loadClientAbbreviations } = require('../../lib/slack-bot'));
    await truncate();
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Couch Heroes', 'CH')");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('aris', 'Aris', 'x', 'member', true)");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('glen', 'Glen Pryer', 'x', 'admin', true)");
    await loadClientAbbreviations(pool);
  });

  it('queues a task with full metadata', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> CH task for Aris: Fix login timeout\nThe session expires too fast',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(true);
    expect(result.item.title).toBe('Fix login timeout');
    expect(result.item.description).toBe('The session expires too fast');
    expect(result.item.item_type).toBe('task');
    expect(result.item.assignee).toBe('Aris');
    expect(result.item.client_id).toBeDefined();

    const { rows } = await pool.query('SELECT * FROM task_queue');
    expect(rows).toHaveLength(1);
    expect(rows[0].client_id).toBeDefined();
    expect(rows[0].assignee).toBe('Aris');
    expect(rows[0].item_type).toBe('task');
  });

  it('queues with default type when not specified', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> CH for Aris: Fix it',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.item.item_type).toBe('task');
  });

  it('re-merges "for X" into title when X is not a known user', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> CH Deploy fix for production',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(true);
    expect(result.item.title).toBe('Deploy fix for production');
    expect(result.item.assignee).toBeNull();
  });

  it('queues with null client_id when abbreviation is unknown', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> XX for Aris: Some task',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(true);
    expect(result.item.client_id).toBeNull();
    expect(result.item.title).toContain('XX');
  });

  it('returns queued:false for an empty message', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT>',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(false);
  });

  it('resolves first-name assignee to full display_name', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> for Glen: Review the spec',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(true);
    expect(result.item.assignee).toBe('Glen Pryer');
  });

  it('stores raw assignee text when not found and warns', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> CH for Nobody: Some task',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(true);
    expect(result.item.assignee).toBe('Nobody');
    expect(result.warnings).toContain('assignee_not_found');
  });
});

// Lazy-load app to avoid server.js side effects during pure unit tests
let _app;
function getApp() {
  if (!_app) {
    const request = require('supertest');
    _app = { request, app: require('../../server.js') };
  }
  return _app;
}

describe('POST /api/slack/events (non-async)', () => {
  const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || 'test_slack_signing_secret';

  function buildSignedRequest(body) {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = signPayload(SIGNING_SECRET, ts, bodyStr);
    return { bodyStr, ts, sig };
  }

  it('responds to url_verification challenge', async () => {
    const body = { type: 'url_verification', challenge: 'test_challenge_token' };
    const { bodyStr, ts, sig } = buildSignedRequest(body);
    const res = await getApp().request(getApp().app)
      .post('/api/slack/events')
      .set('Content-Type', 'application/json')
      .set('x-slack-request-timestamp', ts)
      .set('x-slack-signature', sig)
      .send(bodyStr);
    expect(res.status).toBe(200);
    expect(res.body.challenge).toBe('test_challenge_token');
  });

  it('rejects requests with invalid signature', async () => {
    const res = await getApp().request(getApp().app)
      .post('/api/slack/events')
      .set('Content-Type', 'application/json')
      .set('x-slack-request-timestamp', String(Math.floor(Date.now() / 1000)))
      .set('x-slack-signature', 'v0=invalid')
      .send(JSON.stringify({ type: 'event_callback' }));
    expect(res.status).toBe(401);
  });
});

describe('POST /api/queue with API key', () => {
  const API_KEY = process.env.QUEUE_API_KEY || 'test_queue_api_key_abc123';

  beforeEach(async () => { await truncate(); });

  it('accepts submission with valid API key (no user session)', async () => {
    const res = await getApp().request(getApp().app)
      .post('/api/queue')
      .set('X-API-Key', API_KEY)
      .send({ title: 'API key task', description: 'From external tool' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('API key task');
    expect(res.body.submitted_by).toBe('api-key');
  });

  it('rejects submission with invalid API key', async () => {
    const res = await getApp().request(getApp().app)
      .post('/api/queue')
      .set('X-API-Key', 'wrong_key')
      .send({ title: 'Should fail' });
    expect(res.status).toBe(401);
  });

  it('still rejects unauthenticated requests (no key, no session)', async () => {
    const res = await getApp().request(getApp().app)
      .post('/api/queue')
      .send({ title: 'Should also fail' });
    expect(res.status).toBe(401);
  });

  it('accepts submission with metadata fields', async () => {
    const { rows: clients } = await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Test Client', 'TC') RETURNING id");
    const clientId = clients[0].id;

    const res = await getApp().request(getApp().app)
      .post('/api/queue')
      .set('X-API-Key', API_KEY)
      .send({
        title: 'Task with metadata',
        description: 'Has all fields',
        client_id: clientId,
        assignee: 'Glen Pryer',
        item_type: 'feature',
      });
    expect(res.status).toBe(201);
    expect(res.body.client_id).toBe(clientId);
    expect(res.body.assignee).toBe('Glen Pryer');
    expect(res.body.item_type).toBe('feature');
  });

  it('defaults item_type to task when not provided', async () => {
    const res = await getApp().request(getApp().app)
      .post('/api/queue')
      .set('X-API-Key', API_KEY)
      .send({ title: 'No type specified' });
    expect(res.status).toBe(201);
    expect(res.body.item_type).toBe('task');
  });

  it('defaults invalid item_type to task', async () => {
    const res = await getApp().request(getApp().app)
      .post('/api/queue')
      .set('X-API-Key', API_KEY)
      .send({ title: 'Bad type', item_type: 'epic' });
    expect(res.status).toBe(201);
    expect(res.body.item_type).toBe('task');
  });
});

// LAST: async handler test — fires handleAppMention after res.json, must run after all other tests
describe('POST /api/slack/events (async handler)', () => {
  const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || 'test_slack_signing_secret';

  function buildSignedRequest(body) {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = signPayload(SIGNING_SECRET, ts, bodyStr);
    return { bodyStr, ts, sig };
  }

  it('returns 200 and queues item with metadata for valid app_mention', async () => {
    await truncate();
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Couch Heroes', 'CH')");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('aris', 'Aris', 'x', 'member', true)");
    const { loadClientAbbreviations } = require('../../lib/slack-bot');
    await loadClientAbbreviations(pool);

    const body = {
      type: 'event_callback',
      event: {
        type: 'app_mention',
        text: '<@UBOTID> CH for Aris: New item from Slack\nWith a description',
        user: 'USENDER',
        channel: 'CCHANNEL',
        ts: '111.222',
      },
    };
    const { bodyStr, ts, sig } = buildSignedRequest(body);
    const res = await getApp().request(getApp().app)
      .post('/api/slack/events')
      .set('Content-Type', 'application/json')
      .set('x-slack-request-timestamp', ts)
      .set('x-slack-signature', sig)
      .send(bodyStr);
    expect(res.status).toBe(200);

    // Async handler runs after res.json — poll until INSERT completes
    let rows = [];
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(r => setTimeout(r, 250));
      ({ rows } = await pool.query('SELECT * FROM task_queue'));
      if (rows.length > 0) break;
    }
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('New item from Slack');
    expect(rows[0].slack_user_id).toBe('USENDER');
    expect(rows[0].item_type).toBe('task');
    expect(rows[0].assignee).toBe('Aris');
    expect(rows[0].client_id).toBeDefined();
  });
});
