// dashboard-server/tests/helpers/auth.js
//
// Test authentication helper. Mints a valid session row directly in
// the test DB (bypassing the login flow) and returns the raw token
// for use in Authorization: Bearer ... headers.
//
// Same pattern as the round-trip test during the double-escape
// migration earlier today, formalised as a reusable helper.

const crypto = require('crypto');
const { pool } = require('./db');

/**
 * Hash a token the same way server.js does. Must stay in sync with
 * `function hashToken` near line 269 of server.js.
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Mint a session for the given user. Returns the raw (unhashed) token
 * suitable for use in an Authorization header. The hashed version is
 * written to the sessions table.
 *
 * @param {string} userId - UUID of an existing row in the users table
 * @param {object} options
 * @param {number} options.expiresInMinutes - default 60
 * @returns {Promise<string>} raw bearer token
 */
async function mintSession(userId, options = {}) {
  const expiresInMinutes = options.expiresInMinutes || 60;
  const rawToken = `test_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  const hashed = hashToken(rawToken);
  await pool.query(
    `INSERT INTO sessions (user_id, token, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
    [userId, hashed, String(expiresInMinutes)]
  );
  return rawToken;
}

module.exports = { mintSession, hashToken };
