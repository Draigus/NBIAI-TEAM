import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const fs = require('fs');
const path = require('path');
const { pool } = require('../helpers/db.js');
const {
  conversationKey, getOrCreateSession, rotateSession, markUsed
} = require('../../lib/session-store');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_MS = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  // Apply the migration SQL directly so the test also proves the migration
  // file is valid, regardless of the test-DB baseline state.
  const sql = fs.readFileSync(
    path.join(__dirname, '../../migrations/077_slack_conversation_sessions.sql'), 'utf8'
  );
  await pool.query(sql);
});

beforeEach(async () => {
  await pool.query('TRUNCATE slack_conversation_sessions');
});

describe('conversationKey', () => {
  it('keys a thread separately from top-level DMs in the same channel', () => {
    expect(conversationKey('D123', '111.222')).toBe('D123:111.222');
    expect(conversationKey('D123', undefined)).toBe('D123:top');
    expect(conversationKey('D123', '111.222')).not.toBe(conversationKey('D123', undefined));
  });
});

describe('getOrCreateSession', () => {
  it('mints a new UUID session on first use', async () => {
    const s = await getOrCreateSession(pool, 'D1:top', DAY_MS);
    expect(s.isNew).toBe(true);
    expect(s.sessionId).toMatch(UUID_RE);
  });

  it('returns the same session on subsequent calls within max age', async () => {
    const first = await getOrCreateSession(pool, 'D1:top', DAY_MS);
    const second = await getOrCreateSession(pool, 'D1:top', DAY_MS);
    expect(second.isNew).toBe(false);
    expect(second.sessionId).toBe(first.sessionId);
  });

  it('rotates to a fresh session when the stored one is older than max age', async () => {
    const first = await getOrCreateSession(pool, 'D1:top', DAY_MS);
    await pool.query(
      "UPDATE slack_conversation_sessions SET updated_at = NOW() - INTERVAL '25 hours' WHERE conversation_key = $1",
      ['D1:top']
    );
    const second = await getOrCreateSession(pool, 'D1:top', DAY_MS);
    expect(second.isNew).toBe(true);
    expect(second.sessionId).not.toBe(first.sessionId);
  });

  it('keeps different conversations fully independent', async () => {
    const a = await getOrCreateSession(pool, 'D1:top', DAY_MS);
    const b = await getOrCreateSession(pool, 'D1:111.222', DAY_MS);
    expect(a.sessionId).not.toBe(b.sessionId);
  });
});

describe('rotateSession', () => {
  it('replaces the session id and resets turn_count', async () => {
    const first = await getOrCreateSession(pool, 'D1:top', DAY_MS);
    await markUsed(pool, 'D1:top');
    const rotated = await rotateSession(pool, 'D1:top');
    expect(rotated.isNew).toBe(true);
    expect(rotated.sessionId).not.toBe(first.sessionId);
    const { rows } = await pool.query(
      'SELECT session_id, turn_count FROM slack_conversation_sessions WHERE conversation_key = $1', ['D1:top']
    );
    expect(rows[0].session_id).toBe(rotated.sessionId);
    expect(rows[0].turn_count).toBe(0);
  });
});

describe('markUsed', () => {
  it('increments turn_count and refreshes updated_at', async () => {
    await getOrCreateSession(pool, 'D1:top', DAY_MS);
    await pool.query(
      "UPDATE slack_conversation_sessions SET updated_at = NOW() - INTERVAL '1 hour' WHERE conversation_key = $1",
      ['D1:top']
    );
    await markUsed(pool, 'D1:top');
    const { rows } = await pool.query(
      "SELECT turn_count, updated_at > NOW() - INTERVAL '1 minute' AS fresh FROM slack_conversation_sessions WHERE conversation_key = $1",
      ['D1:top']
    );
    expect(rows[0].turn_count).toBe(1);
    expect(rows[0].fresh).toBe(true);
  });
});
