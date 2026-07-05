'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const { checkSignal, createSignal, enrichSignal, linkAction } = require('../lib/signal-registry');
const { routeAction } = require('../lib/autonomy-router');

const WATERMARK_KEY = 'signal_engine_watermark';

// Audit fix 2026-07-05 (finding 6): filter on IMPORT time (created_at), not the
// meeting's own date. A meeting imported late (Granola delay, backfill, retried
// detail fetch) carries an old meeting date; a meeting-date watermark would skip
// it permanently. Import-time semantics make late arrivals impossible to miss,
// and the aios_actions idempotency key protects against reprocessing overlap.
async function fetchNewMeetings(pool) {
  const { rows: wmRows } = await pool.query(
    'SELECT value FROM settings WHERE key = $1', [WATERMARK_KEY]
  );
  const watermark = wmRows.length > 0 ? wmRows[0].value : null;

  let query, params;
  if (watermark) {
    query = `SELECT item_id, created_at, data FROM meeting_items
             WHERE section = 'meetings'
               AND created_at > $1::timestamptz
             ORDER BY created_at ASC`;
    params = [watermark];
  } else {
    query = `SELECT item_id, created_at, data FROM meeting_items
             WHERE section = 'meetings'
               AND created_at > NOW() - INTERVAL '7 days'
             ORDER BY created_at ASC`;
    params = [];
  }

  const { rows } = await pool.query(query, params);
  return rows.map(r => ({ item_id: r.item_id, _imported_at: r.created_at, ...r.data }));
}

// Routes the signal through autonomy routing, inserts the aios_action, and
// links it to the signal (setting signal status to 'proposed'). Shared by the
// fresh-signal path and the materially-new re-raise path.
async function createActionForSignal(pool, signalData, signalId) {
  const {
    fingerprint, title, description, source_quote, confidence, risk_class,
    action_type, source_system, source_id, source_timestamp, proposed_action,
    execution_recipe,
  } = signalData;

  const autoSettingsResult = await pool.query(
    "SELECT value FROM settings WHERE key = 'signal_engine_auto_categories'"
  ).catch(() => ({ rows: [] }));
  const rawVal = autoSettingsResult.rows.length > 0 ? autoSettingsResult.rows[0].value : null;
  const autoCategories = Array.isArray(rawVal) ? rawVal : [];

  const routing = routeAction(
    { confidence, risk_class, action_type, execution_recipe },
    { autoCategories }
  );

  const idempotencyKey = `signal-engine:${fingerprint}:${source_id || 'no-source'}`;
  const { rows: actionRows } = await pool.query(
    `INSERT INTO aios_actions (
       source_system, source_id, source_timestamp, source_quote,
       action_type, title, description, proposed_action,
       risk_class, confidence, approval_state, execution_state,
       created_by_routine, idempotency_key, signal_id, execution_recipe
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending','signal-engine',$12,$13,$14)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING id`,
    [
      source_system || 'granola', source_id, source_timestamp, source_quote,
      action_type || 'proposal', title, description, proposed_action,
      risk_class || 'low', confidence || 'medium', routing.approval_state,
      idempotencyKey, signalId,
      execution_recipe ? JSON.stringify(execution_recipe) : null,
    ]
  );

  const actionId = actionRows.length > 0 ? actionRows[0].id : null;
  if (actionId) {
    await linkAction(pool, signalId, actionId);
  }
  return { actionId, routing };
}

async function processSignal(pool, signalData) {
  const { fingerprint, signal_type, title, source_quote, source_id, materially_new } = signalData;

  const check = await checkSignal(pool, fingerprint);

  if (check.exists) {
    if (check.signal.status === 'built' || check.signal.status === 'expired') {
      return { action: 'skipped_closed', signal_id: check.signal.id };
    }
    if (check.signal.status === 'rejected') {
      if (!materially_new) {
        return { action: 'skipped_rejected', signal_id: check.signal.id };
      }
      // Audit fix 2026-07-05 (finding 5): a materially-new mention of a rejected
      // signal must produce a fresh proposal Glen can see, not a silent enrich.
      // linkAction transitions the signal back to 'proposed'.
      await enrichSignal(pool, {
        signalId: check.signal.id,
        newEvidence: source_quote || title,
        sourceId: source_id,
      });
      const { actionId, routing } = await createActionForSignal(pool, signalData, check.signal.id);
      return { action: 'reraised', signal_id: check.signal.id, action_id: actionId, routing };
    }
    const enriched = await enrichSignal(pool, {
      signalId: check.signal.id,
      newEvidence: source_quote || title,
      sourceId: source_id,
    });
    return { action: 'enriched', signal_id: enriched.id, evidence_count: enriched.evidence_count };
  }

  const signal = await createSignal(pool, { fingerprint, signal_type, summary: title });
  const { actionId, routing } = await createActionForSignal(pool, signalData, signal.id);

  return {
    action: 'created',
    signal_id: signal.id,
    action_id: actionId,
    routing,
  };
}

async function updateWatermark(pool, timestamp) {
  const ts = timestamp || new Date().toISOString();
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
     ON CONFLICT (key) DO UPDATE SET value = $2::jsonb`,
    [WATERMARK_KEY, JSON.stringify(ts)]
  );
}

async function main() {
  const [,, command, ...args] = process.argv;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    switch (command) {
      case 'fetch-meetings': {
        const meetings = await fetchNewMeetings(pool);
        // max_imported_at is the watermark hint: pass it to update-watermark --ts
        // so the watermark advances exactly to the last processed import, never
        // past meetings that arrive while the engine is running.
        const maxImportedAt = meetings.reduce((max, m) => {
          const ts = m._imported_at ? new Date(m._imported_at).toISOString() : null;
          return ts && (!max || ts > max) ? ts : max;
        }, null);
        console.log(JSON.stringify({ meetings, max_imported_at: maxImportedAt }, null, 2));
        break;
      }
      case 'process-signal': {
        const jsonArg = args.find(a => a.startsWith('--json='));
        const jsonStr = jsonArg
          ? jsonArg.slice(7)
          : args[args.indexOf('--json') + 1];
        if (!jsonStr) { console.error('--json required'); process.exit(1); }
        const result = await processSignal(pool, JSON.parse(jsonStr));
        console.log(JSON.stringify(result));
        break;
      }
      case 'check-signal': {
        const fp = args.find(a => a.startsWith('--fingerprint='))?.slice(14)
          || args[args.indexOf('--fingerprint') + 1];
        if (!fp) { console.error('--fingerprint required'); process.exit(1); }
        const result = await checkSignal(pool, fp);
        console.log(JSON.stringify(result));
        break;
      }
      case 'update-watermark': {
        const ts = args.find(a => a.startsWith('--ts='))?.slice(5)
          || args[args.indexOf('--ts') + 1]
          || undefined;
        await updateWatermark(pool, ts);
        console.log(JSON.stringify({ ok: true, key: WATERMARK_KEY }));
        break;
      }
      default:
        console.error(`Unknown command: ${command}. Valid: fetch-meetings, process-signal, check-signal, update-watermark`);
        process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { fetchNewMeetings, processSignal, updateWatermark };
