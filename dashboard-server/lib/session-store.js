'use strict';

// Postgres-backed mapping of Slack conversations to persistent headless
// Claude session ids. One session per conversation (channel or thread) so the
// bot resumes with full context instead of cold-starting on every message.
// Survives PM2 restarts (which happen on every deploy).

const crypto = require('crypto');

function conversationKey(channel, threadTs) {
  return `${channel}:${threadTs || 'top'}`;
}

// Returns { sessionId, isNew }. Reuses the stored session if it was used
// within maxAgeMs; otherwise mints a fresh one (stale sessions grow without
// bound and drift from current business state).
async function getOrCreateSession(pool, key, maxAgeMs) {
  const { rows } = await pool.query(
    'SELECT session_id, updated_at FROM slack_conversation_sessions WHERE conversation_key = $1',
    [key]
  );
  if (rows.length > 0) {
    const age = Date.now() - new Date(rows[0].updated_at).getTime();
    if (age <= maxAgeMs) return { sessionId: rows[0].session_id, isNew: false };
  }
  return rotateSession(pool, key);
}

// Mint a fresh session for the conversation (first use, expiry, or a resume
// that failed because the on-disk session is gone).
async function rotateSession(pool, key) {
  const sessionId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO slack_conversation_sessions (conversation_key, session_id, turn_count, created_at, updated_at)
     VALUES ($1, $2, 0, NOW(), NOW())
     ON CONFLICT (conversation_key)
     DO UPDATE SET session_id = EXCLUDED.session_id, turn_count = 0, created_at = NOW(), updated_at = NOW()`,
    [key, sessionId]
  );
  return { sessionId, isNew: true };
}

async function markUsed(pool, key) {
  await pool.query(
    'UPDATE slack_conversation_sessions SET turn_count = turn_count + 1, updated_at = NOW() WHERE conversation_key = $1',
    [key]
  );
}

module.exports = { conversationKey, getOrCreateSession, rotateSession, markUsed };
