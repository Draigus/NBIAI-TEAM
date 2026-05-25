/**
 * Shared helpers for the NBI dashboard server.
 * Extracted from server.js — item type hierarchy, business-day utilities,
 * query builders, kanban position helpers, UUID/length validation,
 * token hashing, and HTML escaping.
 *
 * NOT included here (handled in later tasks):
 *   - buildEmailHtml / buildEmailTable / buildEmailSection (email builders)
 *   - Circuit breakers (ocrBreaker, fxBreaker)
 */

const crypto = require('crypto');

// ==================== ITEM TYPE HIERARCHY ====================
const ITEM_TYPES = ['project', 'feature', 'story', 'task'];
const VALID_CHILD_TYPE = { project: 'feature', feature: 'story', story: 'task', task: null };
const VALID_PARENT_TYPE = { project: null, feature: 'project', story: 'feature', task: 'story' };

/** Infer item_type from the parent's type. If no parent, default to 'project'. */
function inferItemType(parentType) {
  if (!parentType) return 'project';
  return VALID_CHILD_TYPE[parentType] || 'task';
}

// ==================== BUSINESS-DAY UTILITIES ====================

/** Add N business days to a YYYY-MM-DD string. Skips weekends. */
function addBusinessDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  let remaining = n;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return d.toISOString().slice(0, 10);
}

/** Count business days between two YYYY-MM-DD strings. Negative if b < a. */
function businessDaysBetween(a, b) {
  const da = new Date(a + 'T12:00:00');
  const db = new Date(b + 'T12:00:00');
  const sign = db >= da ? 1 : -1;
  const start = sign === 1 ? da : db;
  const end = sign === 1 ? db : da;
  let count = 0;
  const cur = new Date(start);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count * sign;
}

// ==================== HELPERS ====================

/**
 * Build a parameterised SET clause for PATCH endpoints.
 * Only includes fields present in both the request body and the allow-list.
 * Used by all PATCH handlers to avoid inline query building.
 * @param {Object} body - Request body
 * @param {string[]} allowedFields - Whitelist of column names
 * @returns {{ updates: string[], vals: any[], nextIdx: number }}
 */
function buildPatchQuery(body, allowedFields) {
  // Validate column names against a strict pattern to prevent SQL injection
  const SAFE_COL = /^[a-z_][a-z0-9_]*$/;
  const updates = []; const vals = []; let i = 1;
  for (const f of allowedFields) {
    if (!SAFE_COL.test(f)) throw new Error(`Invalid column name: ${f}`);
    if (body[f] !== undefined) { updates.push(`${f} = $${i}`); vals.push(body[f]); i++; }
  }
  return { updates, vals, nextIdx: i };
}

// =============================================================================
// Kanban position helpers (migration 021 / decision D79)
// =============================================================================

// Whitelist of (table -> groupCol) pairs that are valid for the position
// helpers. New kanban boards must be added here. The helpers refuse to
// operate on anything outside this list, which prevents SQL injection via
// the dynamic identifier interpolation.
const POSITION_TABLES = {
  tasks:        { groupCol: 'status' },
  bug_reports:  { groupCol: 'status' },
  candidates:   { groupCol: 'stage' },
  leads:        { groupCol: 'stage_id' },
};

function _validatePositionTable(table, groupCol) {
  if (!POSITION_TABLES[table]) throw new Error(`Invalid table for position helper: ${table}`);
  if (POSITION_TABLES[table].groupCol !== groupCol) {
    throw new Error(`Invalid column for position helper on ${table}: ${groupCol}`);
  }
}

/**
 * Shift every row in the target group down by 1 to make room for an INSERT
 * at position 0. MUST be called inside an active transaction (caller passes
 * the pg client). Caller then runs the actual INSERT with position = 0.
 *
 * @param {pg.PoolClient} client - active transaction client
 * @param {string} table - one of POSITION_TABLES keys
 * @param {string} groupCol - the group key column
 * @param {*} groupVal - the group value to shift
 */
async function shiftForInsert(client, table, groupCol, groupVal) {
  _validatePositionTable(table, groupCol);
  await client.query(
    `UPDATE ${table} SET position = position + 1 WHERE ${groupCol} = $1`,
    [groupVal]
  );
}

/**
 * Move a row to a new (group, position) inside an active transaction.
 *
 * Steps:
 *   1. Fetch the row's current group + position (FOR UPDATE).
 *   2. Compute target column length and clamp newPos.
 *   3. If group + position unchanged: no-op.
 *   4. If group changed: shift old group above the vacated slot up by -1.
 *   5. Shift target group from clampedPos onwards down by +1 (excluding rowId).
 *   6. UPDATE the row's group + position + updated_at.
 */
async function reorderInGroup(client, table, groupCol, rowId, newGroup, newPos) {
  _validatePositionTable(table, groupCol);
  if (!Number.isInteger(newPos) || newPos < 0) {
    throw new Error(`reorderInGroup: newPos must be a non-negative integer, got ${newPos}`);
  }

  const cur = await client.query(
    `SELECT ${groupCol} AS grp, position FROM ${table} WHERE id = $1 FOR UPDATE`,
    [rowId]
  );
  if (cur.rows.length === 0) throw new Error(`reorderInGroup: row not found ${rowId}`);
  const oldGroup = cur.rows[0].grp;
  const oldPos = cur.rows[0].position;
  const sameGroup = oldGroup === newGroup
    || (oldGroup != null && newGroup != null && String(oldGroup) === String(newGroup));

  const lengthRes = await client.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${groupCol} = $1`,
    [newGroup]
  );
  const targetLen = lengthRes.rows[0].n;
  // Same-group: moved row is already counted, valid range 0..len-1.
  // Cross-group: moved row not yet in target, valid range 0..len.
  const maxPos = sameGroup ? Math.max(0, targetLen - 1) : targetLen;
  const clampedPos = Math.min(newPos, maxPos);

  if (sameGroup && clampedPos === oldPos) return;

  if (sameGroup) {
    if (clampedPos < oldPos) {
      // Move up: shift [clampedPos .. oldPos-1] down by +1
      await client.query(
        `UPDATE ${table} SET position = position + 1
         WHERE ${groupCol} = $1 AND position >= $2 AND position < $3 AND id <> $4`,
        [oldGroup, clampedPos, oldPos, rowId]
      );
    } else {
      // Move down: shift (oldPos .. clampedPos] up by -1
      await client.query(
        `UPDATE ${table} SET position = position - 1
         WHERE ${groupCol} = $1 AND position > $2 AND position <= $3 AND id <> $4`,
        [oldGroup, oldPos, clampedPos, rowId]
      );
    }
  } else {
    // Cross-column: close gap in old group
    await client.query(
      `UPDATE ${table} SET position = position - 1
       WHERE ${groupCol} = $1 AND position > $2`,
      [oldGroup, oldPos]
    );
    // Open slot in new group
    await client.query(
      `UPDATE ${table} SET position = position + 1
       WHERE ${groupCol} = $1 AND position >= $2 AND id <> $3`,
      [newGroup, clampedPos, rowId]
    );
  }

  await client.query(
    `UPDATE ${table} SET ${groupCol} = $1, position = $2, updated_at = NOW() WHERE id = $3`,
    [newGroup, clampedPos, rowId]
  );
}

/** UUID v4 format regex for parameter validation */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isValidUuid(s) { return typeof s === 'string' && UUID_RE.test(s); }

/** Input length limits — prevents oversized payloads reaching the DB */
const MAX_LENGTHS = { title: 500, description: 10000, notes: 5000, name: 200, email: 254, body: 50000, source_detail: 500, linkedin_url: 2000 };

/**
 * Validate that a string does not exceed the maximum allowed length.
 * @param {*} value - The value to check
 * @param {string} field - Field name (used for error message and MAX_LENGTHS lookup)
 * @param {number} [max] - Override max length; falls back to MAX_LENGTHS[field] or 10000
 * @returns {string|null} Error message if exceeded, null if valid
 */
function validateLength(value, field, max) {
  if (typeof value === 'string' && value.length > (max || MAX_LENGTHS[field] || 10000)) {
    return `${field} exceeds maximum length of ${max || MAX_LENGTHS[field] || 10000} characters`;
  }
  return null;
}

/**
 * Validate a new password against the complexity policy.
 * Requires 12+ characters, at least one uppercase, one lowercase, and one digit.
 * @param {string} password - The password to validate
 * @returns {{ valid: true } | { valid: false, message: string }}
 */
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 12) {
    return { valid: false, message: 'Password must be at least 12 characters and include uppercase, lowercase, and a digit' };
  }
  const missing = [];
  if (!/[A-Z]/.test(password)) missing.push('uppercase letter');
  if (!/[a-z]/.test(password)) missing.push('lowercase letter');
  if (!/[0-9]/.test(password)) missing.push('digit');
  if (missing.length > 0) {
    return { valid: false, message: `Password must include at least one ${missing.join(', one ')}` };
  }
  return { valid: true };
}

/** Hash a session token with SHA-256 before storing or looking up in the DB */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Escape HTML special characters to prevent XSS in server-rendered pages.
 * Used in the public client report HTML endpoint.
 * @param {string} str - Raw string to escape
 * @returns {string} Escaped string safe for HTML interpolation
 */
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

module.exports = {
  ITEM_TYPES,
  VALID_CHILD_TYPE,
  VALID_PARENT_TYPE,
  inferItemType,
  addBusinessDays,
  businessDaysBetween,
  buildPatchQuery,
  POSITION_TABLES,
  shiftForInsert,
  reorderInGroup,
  isValidUuid,
  UUID_RE,
  validateLength,
  MAX_LENGTHS,
  hashToken,
  escHtml,
  validatePassword,
};
