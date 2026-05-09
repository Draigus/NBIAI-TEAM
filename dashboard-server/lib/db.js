/**
 * PostgreSQL pool factory for the NBI dashboard server.
 * Extracted from server.js — call createPool(connectionString) once at startup.
 */

const { Pool, types: pgTypes } = require('pg');
const { log } = require('./logger');

// Return Postgres DATE columns (OID 1082) as raw 'YYYY-MM-DD' strings
// instead of JS Date objects. The default pg driver parses DATE as local
// midnight then serialises via toISOString(), which shifts the date
// backwards in every timezone west of UTC and forwards in every timezone
// east of UTC. For the calendar_events table in particular that turned
// '2026-04-16' into '2026-04-15T23:00:00.000Z' on the BST dev box and
// silently dropped events off the calendar grid. String pass-through is
// the canonical fix — the frontend already treats DATE values as YYYY-MM-DD
// anywhere it builds a date cell key.
pgTypes.setTypeParser(1082, v => v);

/**
 * Create and return a configured PostgreSQL connection pool.
 * Attaches a pool-level error handler that logs unexpected idle-client errors.
 *
 * @param {string} connectionString - PostgreSQL connection string (DATABASE_URL)
 * @returns {import('pg').Pool}
 */
function createPool(connectionString) {
  /** PostgreSQL connection pool — min 5 idle connections, max 50 */
  const pool = new Pool({
    connectionString,
    min: 5,
    max: 50,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 30000,
  });
  pool.on('error', (err) => log('error', 'Pool', 'Unexpected error on idle client', { error: err.message }));
  return pool;
}

module.exports = { createPool };
