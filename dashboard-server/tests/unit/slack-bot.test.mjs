// dashboard-server/tests/unit/slack-bot.test.mjs
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const crypto = require('crypto');
const { pool, truncate } = require('../helpers/db.js');

afterAll(() => {
  const { stopEntityRefresh } = require('../../lib/slack-bot');
  stopEntityRefresh();
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

describe('parseSlackMessage (entity extraction)', () => {
  let parseSlackMessage;
  const ENTITIES = {
    clients: [
      { label: 'Couch Heroes', id: 'c1', name: 'Couch Heroes', abbreviation: 'CH' },
      { label: 'CH', id: 'c1', name: 'Couch Heroes', abbreviation: 'CH' },
      { label: 'Lighthouse Studios', id: 'c2', name: 'Lighthouse Studios', abbreviation: 'LH' },
      { label: 'LH', id: 'c2', name: 'Lighthouse Studios', abbreviation: 'LH' },
      { label: 'NBI Operations', id: 'c3', name: 'NBI Operations', abbreviation: 'NBI' },
      { label: 'NBI', id: 'c3', name: 'NBI Operations', abbreviation: 'NBI' },
    ],
    users: [
      { label: 'Glen Pryer', displayName: 'Glen Pryer' },
      { label: 'Glen', displayName: 'Glen Pryer' },
      { label: 'Aris', displayName: 'Aris' },
      { label: 'Magnus Pryer', displayName: 'Magnus Pryer' },
      { label: 'Magnus', displayName: 'Magnus Pryer' },
    ],
  };

  beforeEach(() => {
    ({ parseSlackMessage } = require('../../lib/slack-bot'));
  });

  it('extracts full client name, user, and title from natural language', () => {
    const r = parseSlackMessage('<@U123> Couch Heroes Glen time to make the donuts', ENTITIES);
    expect(r.clientMatch.name).toBe('Couch Heroes');
    expect(r.userMatch.displayName).toBe('Glen Pryer');
    expect(r.title).toBe('time to make the donuts');
  });

  it('extracts abbreviation as client', () => {
    const r = parseSlackMessage('<@U123> CH Aris fix the login page', ENTITIES);
    expect(r.clientMatch.name).toBe('Couch Heroes');
    expect(r.userMatch.displayName).toBe('Aris');
    expect(r.title).toBe('fix the login page');
  });

  it('extracts item type keyword', () => {
    const r = parseSlackMessage('<@U123> CH feature Aris build the dashboard', ENTITIES);
    expect(r.clientMatch.name).toBe('Couch Heroes');
    expect(r.itemType).toBe('feature');
    expect(r.userMatch.displayName).toBe('Aris');
    expect(r.title).toBe('build the dashboard');
  });

  it('handles natural "for" phrasing without breaking', () => {
    const r = parseSlackMessage('<@U123> Couch Heroes for Glen Pryer to build a new feature', ENTITIES);
    expect(r.clientMatch.name).toBe('Couch Heroes');
    expect(r.userMatch.displayName).toBe('Glen Pryer');
    expect(r.title).not.toBeNull();
    expect(r.title.length).toBeGreaterThan(0);
  });

  it('handles "deploy fix for production" without false assignee match', () => {
    const r = parseSlackMessage('<@U123> CH deploy fix for production', ENTITIES);
    expect(r.clientMatch.name).toBe('Couch Heroes');
    expect(r.userMatch).toBeNull();
    expect(r.title).toBe('deploy fix for production');
  });

  it('bare title with no entities', () => {
    const r = parseSlackMessage('<@U123> Fix the broken button', ENTITIES);
    expect(r.clientMatch).toBeNull();
    expect(r.userMatch).toBeNull();
    expect(r.itemType).toBeNull();
    expect(r.title).toBe('Fix the broken button');
  });

  it('prefers full client name over abbreviation in same message', () => {
    const r = parseSlackMessage('<@U123> Couch Heroes fix it', ENTITIES);
    expect(r.clientMatch.name).toBe('Couch Heroes');
    expect(r.title).toBe('fix it');
  });

  it('prefers full user name over first name', () => {
    const r = parseSlackMessage('<@U123> Glen Pryer review the spec', ENTITIES);
    expect(r.userMatch.displayName).toBe('Glen Pryer');
    expect(r.title).toBe('review the spec');
  });

  it('is case-insensitive', () => {
    const r = parseSlackMessage('<@U123> couch heroes glen fix login', ENTITIES);
    expect(r.clientMatch.name).toBe('Couch Heroes');
    expect(r.userMatch.displayName).toBe('Glen Pryer');
    expect(r.title).toBe('fix login');
  });

  it('extracts description from subsequent lines', () => {
    const r = parseSlackMessage('<@U123> CH Aris fix the thing\nMore details here', ENTITIES);
    expect(r.title).toBe('fix the thing');
    expect(r.description).toBe('More details here');
  });

  it('strips filler words from remaining title', () => {
    const r = parseSlackMessage('<@U123> CH Aris to fix the login', ENTITIES);
    expect(r.title).toBe('fix the login');
  });

  it('returns null title for empty message', () => {
    const r = parseSlackMessage('<@U123>', ENTITIES);
    expect(r.title).toBeNull();
  });

  it('works with no entities provided', () => {
    const r = parseSlackMessage('<@U123> Just a message', { clients: [], users: [] });
    expect(r.clientMatch).toBeNull();
    expect(r.userMatch).toBeNull();
    expect(r.title).toBe('Just a message');
  });

  it('strips multiple bot mentions', () => {
    const r = parseSlackMessage('<@U1> <@U2> CH fix it', ENTITIES);
    expect(r.clientMatch.name).toBe('Couch Heroes');
    expect(r.title).toBe('fix it');
  });

  it('handles message with no mention', () => {
    const r = parseSlackMessage('Just a plain message', ENTITIES);
    expect(r.title).toBe('Just a plain message');
  });
});

describe('loadEntityCache', () => {
  let loadEntityCache;

  beforeEach(async () => {
    ({ loadEntityCache } = require('../../lib/slack-bot'));
    await truncate();
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Couch Heroes', 'CH')");
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Lighthouse Studios', 'LH')");
    await pool.query("INSERT INTO clients (name) VALUES ('No Abbrev Client')");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('glen', 'Glen Pryer', 'x', 'admin', true)");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('inactive', 'Inactive User', 'x', 'member', false)");
  });

  it('loads clients with both name and abbreviation entries', async () => {
    const cache = await loadEntityCache(pool);
    const labels = cache.clients.map(c => c.label);
    expect(labels).toContain('Couch Heroes');
    expect(labels).toContain('CH');
    expect(labels).toContain('Lighthouse Studios');
    expect(labels).toContain('LH');
    expect(labels).toContain('No Abbrev Client');
  });

  it('loads active users with full name and first name', async () => {
    const cache = await loadEntityCache(pool);
    const labels = cache.users.map(u => u.label);
    expect(labels).toContain('Glen Pryer');
    expect(labels).toContain('Glen');
    expect(labels).not.toContain('Inactive User');
  });
});

describe('buildSlackReply', () => {
  let buildSlackReply;

  beforeEach(() => {
    ({ buildSlackReply } = require('../../lib/slack-bot'));
  });

  it('shows Created for direct task creation', () => {
    const reply = buildSlackReply({
      title: 'Fix login timeout',
      itemType: 'task',
      clientName: 'Couch Heroes',
      assigneeName: 'Aris',
      assigneeResolved: true,
      clientResolved: true,
      queueId: 'abc-123',
      createdAsTask: true,
    });
    expect(reply).toContain('✅ Created: *Fix login timeout*');
    expect(reply).toContain('👤 Aris');
    expect(reply).toContain('🏢 Couch Heroes');
    expect(reply).not.toContain('triage');
  });

  it('shows Queued for triage when no client', () => {
    const reply = buildSlackReply({
      title: 'Fix the broken button',
      itemType: 'task',
      queueId: 'abc-123',
      createdAsTask: false,
    });
    expect(reply).toContain('📥 Queued for triage');
    expect(reply).toContain('triage');
  });

  it('builds error reply for empty title', () => {
    const reply = buildSlackReply({ title: null });
    expect(reply).toContain('❌');
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

describe('handleAppMention (entity extraction)', () => {
  let handleAppMention, loadEntityCache;

  beforeEach(async () => {
    ({ handleAppMention, loadEntityCache } = require('../../lib/slack-bot'));
    await truncate();
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Couch Heroes', 'CH')");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('aris', 'Aris', 'x', 'member', true)");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('glen', 'Glen Pryer', 'x', 'admin', true)");
    await loadEntityCache(pool);
  });

  it('creates a real task when client is recognised', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> Couch Heroes Aris fix the login timeout\nIt expires too fast',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.created).toBe(true);
    expect(result.queued).toBe(false);
    expect(result.item.title).toBe('fix the login timeout');
    expect(result.item.description).toBe('It expires too fast');
    expect(result.item.item_type).toBe('task');
    expect(result.item.source).toBe('slack');

    const { rows } = await pool.query('SELECT * FROM tasks WHERE source = $1', ['slack']);
    expect(rows).toHaveLength(1);
    expect(rows[0].assignees).toContain('Aris');
    expect(rows[0].client_id).toBeDefined();
    expect(rows[0].status).toBe('Not started');
  });

  it('creates task with abbreviation', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> CH Aris fix it',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.created).toBe(true);
    expect(result.item.client_id).toBeDefined();
  });

  it('falls back to queue when no client recognised', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> fix the broken button',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.created).toBe(false);
    expect(result.queued).toBe(true);

    const { rows: tasks } = await pool.query('SELECT * FROM tasks WHERE source = $1', ['slack']);
    expect(tasks).toHaveLength(0);
    const { rows: queue } = await pool.query('SELECT * FROM task_queue');
    expect(queue).toHaveLength(1);
  });

  it('resolves first name to full display_name in assignees', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> CH Glen review the spec',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.created).toBe(true);

    const { rows } = await pool.query('SELECT assignees FROM tasks WHERE source = $1', ['slack']);
    expect(rows[0].assignees).toContain('Glen Pryer');
  });

  it('creates task without assignee when no user matches', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT> CH deploy fix for production',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.created).toBe(true);
    expect(result.item.title).toBe('deploy fix for production');

    const { rows } = await pool.query('SELECT assignees FROM tasks WHERE source = $1', ['slack']);
    expect(rows[0].assignees).toEqual([]);
  });

  it('returns queued:false and created:undefined for empty message', async () => {
    const event = {
      type: 'app_mention',
      text: '<@UBOT>',
      user: 'USENDER', channel: 'CCHAN', ts: '111.222',
    };
    const result = await handleAppMention(event, pool, '');
    expect(result.queued).toBe(false);
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

describe('POST /api/slack/command', () => {
  const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || 'test_slack_signing_secret';

  beforeEach(async () => {
    await truncate();
    await pool.query("INSERT INTO clients (name, abbreviation) VALUES ('Couch Heroes', 'CH')");
    await pool.query("INSERT INTO users (username, display_name, password_hash, role, is_active) VALUES ('aris', 'Aris', 'x', 'member', true)");
    const { loadEntityCache } = require('../../lib/slack-bot');
    await loadEntityCache(pool);
  });

  function signedFormRequest(params) {
    const bodyStr = new URLSearchParams(params).toString();
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = signPayload(SIGNING_SECRET, ts, bodyStr);
    return { bodyStr, ts, sig };
  }

  it('creates a task from slash command with client and user', async () => {
    const params = { text: 'Couch Heroes Aris fix the login', user_id: 'USENDER', channel_id: 'CCHAN', command: '/worksage' };
    // supertest .type('form').send(obj) produces consistent encoding we can sign
    const bodyStr = require('querystring').stringify(params);
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = signPayload(SIGNING_SECRET, ts, bodyStr);
    const res = await getApp().request(getApp().app)
      .post('/api/slack/command')
      .set('x-slack-request-timestamp', ts)
      .set('x-slack-signature', sig)
      .type('form')
      .send(bodyStr);
    expect(res.status).toBe(200);
    expect(res.body.response_type).toBe('in_channel');
    expect(res.body.text).toContain('Created');
    expect(res.body.text).toContain('fix the login');

    const { rows } = await pool.query("SELECT * FROM tasks WHERE source = 'slack'");
    expect(rows).toHaveLength(1);
    expect(rows[0].assignees).toContain('Aris');
    expect(rows[0].client_id).toBeDefined();
  });

  it('queues when no client recognised', async () => {
    const { bodyStr, ts, sig } = signedFormRequest({
      text: 'fix something broken', user_id: 'USENDER', channel_id: 'CCHAN', command: '/worksage',
    });
    const res = await getApp().request(getApp().app)
      .post('/api/slack/command')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('x-slack-request-timestamp', ts)
      .set('x-slack-signature', sig)
      .send(bodyStr);
    expect(res.status).toBe(200);
    expect(res.body.text).toContain('Queued');
  });

  it('rejects invalid signature', async () => {
    const res = await getApp().request(getApp().app)
      .post('/api/slack/command')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('x-slack-request-timestamp', String(Math.floor(Date.now() / 1000)))
      .set('x-slack-signature', 'v0=invalid')
      .send('text=test&user_id=U1&channel_id=C1');
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
    const { loadEntityCache } = require('../../lib/slack-bot');
    await loadEntityCache(pool);

    const body = {
      type: 'event_callback',
      event: {
        type: 'app_mention',
        text: '<@UBOTID> Couch Heroes Aris fix the login\nWith a description',
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

    let rows = [];
    for (let attempt = 0; attempt < 20; attempt++) {
      await new Promise(r => setTimeout(r, 250));
      ({ rows } = await pool.query("SELECT * FROM tasks WHERE source = 'slack'"));
      if (rows.length > 0) break;
    }
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe('fix the login');
    expect(rows[0].item_type).toBe('task');
    expect(rows[0].assignees).toContain('Aris');
    expect(rows[0].client_id).toBeDefined();
  });
});
