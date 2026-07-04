'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');
const { checkSignal, createSignal, enrichSignal, linkAction } = require('../lib/signal-registry');
const { routeAction } = require('../lib/autonomy-router');

const WATERMARK_KEY = 'signal_engine_watermark';

async function fetchNewMeetings(pool) {
  const { rows: wmRows } = await pool.query(
    'SELECT value FROM settings WHERE key = $1', [WATERMARK_KEY]
  );
  const watermark = wmRows.length > 0 ? wmRows[0].value : null;

  let query, params;
  if (watermark) {
    query = `SELECT item_id, data FROM meeting_items
             WHERE section = 'meetings'
               AND (data->>'date')::timestamptz > $1::timestamptz
             ORDER BY (data->>'date')::timestamptz ASC`;
    params = [watermark];
  } else {
    query = `SELECT item_id, data FROM meeting_items
             WHERE section = 'meetings'
               AND (data->>'date')::timestamptz > NOW() - INTERVAL '7 days'
             ORDER BY (data->>'date')::timestamptz ASC`;
    params = [];
  }

  const { rows } = await pool.query(query, params);
  return rows.map(r => ({ item_id: r.item_id, ...r.data }));
}

async function processSignal(pool, signalData) {
  const {
    fingerprint, signal_type, title, description, source_quote,
    confidence, risk_class, action_type, source_system, source_id,
    source_timestamp, proposed_action, execution_recipe, materially_new,
  } = signalData;

  const check = await checkSignal(pool, fingerprint);

  if (check.exists) {
    if (check.signal.status === 'rejected' && !materially_new) {
      return { action: 'skipped_rejected', signal_id: check.signal.id };
    }
    if (check.signal.status === 'built' || check.signal.status === 'expired') {
      return { action: 'skipped_closed', signal_id: check.signal.id };
    }
    const enriched = await enrichSignal(pool, {
      signalId: check.signal.id,
      newEvidence: source_quote || title,
      sourceId: source_id,
    });
    return { action: 'enriched', signal_id: enriched.id, evidence_count: enriched.evidence_count };
  }

  const signal = await createSignal(pool, { fingerprint, signal_type, summary: title });

  const autoSettingsResult = await pool.query(
    "SELECT value FROM settings WHERE key = 'signal_engine_auto_categories'"
  ).catch(() => ({ rows: [] }));
  const autoCategories = autoSettingsResult.rows.length > 0
    ? JSON.parse(autoSettingsResult.rows[0].value || '[]')
    : [];

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
      idempotencyKey, signal.id,
      execution_recipe ? JSON.stringify(execution_recipe) : null,
    ]
  );

  const actionId = actionRows.length > 0 ? actionRows[0].id : null;
  if (actionId) {
    await linkAction(pool, signal.id, actionId);
  }

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
    `INSERT INTO settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2`,
    [WATERMARK_KEY, ts]
  );
}

async function main() {
  const [,, command, ...args] = process.argv;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    switch (command) {
      case 'fetch-meetings': {
        const meetings = await fetchNewMeetings(pool);
        console.log(JSON.stringify(meetings, null, 2));
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
