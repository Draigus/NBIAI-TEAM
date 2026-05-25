/**
 * Structured JSON logger for the NBI dashboard server.
 * Extracted from server.js — all route modules import log() from here.
 */

// ==================== STRUCTURED LOGGER ====================
const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const LOG_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

/**
 * Structured JSON logger. Writes to stdout (info/debug/warn) or stderr (error).
 * @param {'error'|'warn'|'info'|'debug'} level - Log severity
 * @param {string} prefix - Module/section tag (e.g. 'Auth', 'Sync', 'Tasks')
 * @param {string} message - Human-readable log message
 * @param {Object} [data] - Optional structured data to include in the log entry
 * @param {string} [requestId] - Optional correlation ID to trace the request through logs
 */
function log(level, prefix, message, data, requestId) {
  if (LOG_LEVELS[level] > LOG_LEVEL) return;
  const entry = { ts: new Date().toISOString(), level, prefix, message };
  if (requestId) entry.requestId = requestId;
  if (data) entry.data = data;
  const line = JSON.stringify(entry);
  if (level === 'error') process.stderr.write(line + '\n');
  else process.stdout.write(line + '\n');
}

module.exports = { log, LOG_LEVELS, LOG_LEVEL };
