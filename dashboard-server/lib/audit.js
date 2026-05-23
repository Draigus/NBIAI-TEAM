// lib/audit.js — audit logging, data sanitisation, repeat date computation
const { log } = require('./logger');

const REDACT_FIELDS = ['password', 'token', 'reset_token', 'secret', 'api_key', 'password_hash', 'newPassword', 'currentPassword'];

function sanitiseAuditData(data) {
  if (!data || typeof data !== 'object') return data;
  const sanitised = { ...data };
  for (const field of REDACT_FIELDS) {
    if (sanitised[field]) sanitised[field] = '[REDACTED]';
  }
  return sanitised;
}

function computeNextRepeatDate(rule, from) {
  if (!rule || typeof rule !== 'object' || !rule.type) return null;
  const base = new Date(from);
  base.setHours(0, 0, 0, 0);
  const toIso = d => d.toISOString().slice(0, 10);
  const interval = Math.max(1, parseInt(rule.interval, 10) || 1);

  if (rule.type === 'daily') {
    base.setDate(base.getDate() + interval);
    return toIso(base);
  }

  if (rule.type === 'weekly') {
    const days = Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length > 0
      ? rule.daysOfWeek.map(Number).filter(n => !isNaN(n) && n >= 0 && n <= 6).sort((a, b) => a - b)
      : [];
    if (days.length === 0) {
      base.setDate(base.getDate() + 7 * interval);
      return toIso(base);
    }
    for (let i = 1; i <= 14 * interval; i++) {
      const cand = new Date(base);
      cand.setDate(cand.getDate() + i);
      if (days.includes(cand.getDay())) return toIso(cand);
    }
    return null;
  }

  if (rule.type === 'monthly') {
    base.setMonth(base.getMonth() + interval);
    return toIso(base);
  }

  if (rule.type === 'yearly') {
    const dates = Array.isArray(rule.dates) ? rule.dates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)) : [];
    if (dates.length === 0) return null;
    const todayMs = base.getTime();
    let best = null;
    for (const ds of dates) {
      const d = new Date(ds + 'T00:00:00');
      for (let yearOffset = 0; yearOffset <= 2; yearOffset++) {
        const cand = new Date(d.getFullYear() + yearOffset, d.getMonth(), d.getDate());
        if (cand.getTime() > todayMs && (!best || cand < best)) { best = cand; break; }
      }
    }
    return best ? toIso(best) : null;
  }

  return null;
}

module.exports = function createAudit(pool) {
  async function auditLog(entityType, entityId, action, changedBy, changes, conn) {
    const db = conn || pool;
    try {
      const sanitised = changes ? sanitiseAuditData(changes) : null;
      await db.query(
        'INSERT INTO audit_log (entity_type, entity_id, action, changed_by, changes) VALUES ($1, $2, $3, $4, $5)',
        [entityType, entityId, action, changedBy || 'system', sanitised ? JSON.stringify(sanitised) : null]
      );
    } catch (e) {
      log('warn', 'Audit', 'Failed to log', { error: e.message });
    }
  }

  return { auditLog, sanitiseAuditData, computeNextRepeatDate };
};
