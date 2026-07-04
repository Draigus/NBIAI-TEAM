'use strict';

const VALID_TYPES = ['people', 'product', 'business', 'risk', 'process'];
const VALID_STATUSES = ['open', 'proposed', 'approved', 'rejected', 'built', 'expired'];
const FINGERPRINT_PREFIXES = ['person', 'topic', 'business', 'risk', 'process'];

function validateFingerprint(fp) {
  if (!fp || typeof fp !== 'string') return false;
  const parts = fp.split(':');
  if (parts.length < 3) return false;
  if (!FINGERPRINT_PREFIXES.includes(parts[0])) return false;
  if (parts.some(p => p.length === 0)) return false;
  return true;
}

async function checkSignal(pool, fingerprint) {
  const { rows } = await pool.query(
    'SELECT * FROM aios_signals WHERE fingerprint = $1',
    [fingerprint]
  );
  if (rows.length === 0) return { exists: false };
  return { exists: true, signal: rows[0] };
}

async function createSignal(pool, { fingerprint, signal_type, summary }) {
  if (!validateFingerprint(fingerprint)) {
    throw new Error(`Invalid fingerprint: ${fingerprint}`);
  }
  if (!VALID_TYPES.includes(signal_type)) {
    throw new Error(`Invalid signal_type: ${signal_type}. Must be one of: ${VALID_TYPES.join(', ')}`);
  }
  if (!summary) throw new Error('summary is required');

  const { rows } = await pool.query(
    `INSERT INTO aios_signals (fingerprint, signal_type, summary)
     VALUES ($1, $2, $3) RETURNING id`,
    [fingerprint, signal_type, summary]
  );
  return rows[0];
}

async function enrichSignal(pool, { signalId, newEvidence, sourceId }) {
  if (!signalId) throw new Error('signalId is required');

  const logEntry = JSON.stringify({
    ts: new Date().toISOString(),
    evidence: newEvidence,
    source_id: sourceId,
  });

  const { rows } = await pool.query(
    `UPDATE aios_signals
     SET evidence_count = evidence_count + 1,
         last_enriched = NOW(),
         enrichment_log = enrichment_log || $1::jsonb,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [`[${logEntry}]`, signalId]
  );
  if (rows.length === 0) throw new Error(`Signal not found: ${signalId}`);
  return rows[0];
}

async function transitionStatus(pool, signalId, newStatus, reason) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }
  const updates = ['status = $1', 'updated_at = NOW()'];
  const params = [newStatus];
  if (reason && newStatus === 'rejected') {
    updates.push(`rejection_reason = $${params.length + 1}`);
    params.push(reason);
  }
  params.push(signalId);
  const { rows } = await pool.query(
    `UPDATE aios_signals SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  if (rows.length === 0) throw new Error(`Signal not found: ${signalId}`);
  return rows[0];
}

async function linkAction(pool, signalId, actionId) {
  await pool.query(
    'UPDATE aios_signals SET linked_action_id = $1, status = $2, updated_at = NOW() WHERE id = $3',
    [actionId, 'proposed', signalId]
  );
}

module.exports = {
  validateFingerprint,
  checkSignal,
  createSignal,
  enrichSignal,
  transitionStatus,
  linkAction,
  VALID_TYPES,
  VALID_STATUSES,
};
