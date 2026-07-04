'use strict';

const { WebClient } = require('@slack/web-api');

function createBroker({ pool, log, slackBotToken, glenSlackUserId, maxDmsPerDay = 20, _slackClient }) {
  const configured = Boolean(glenSlackUserId && slackBotToken);

  const slack = _slackClient || (configured ? new WebClient(slackBotToken) : null);
  const GLEN_ID = glenSlackUserId || '';

  if (!configured) {
    log('warn', 'OutboundBroker', 'Starting in disabled mode -- GLEN_SLACK_USER_ID or SLACK_BOT_TOKEN missing', {});
  }

  function validateDestination(type, id) {
    if (type === 'slack_dm') {
      if (!GLEN_ID) return { valid: false, reason: 'Broker not configured: GLEN_SLACK_USER_ID is blank' };
      return id === GLEN_ID
        ? { valid: true }
        : { valid: false, reason: `${id} not on allowlist for slack_dm (only ${GLEN_ID} allowed)` };
    }
    if (type === 'email_draft') return { valid: true };
    return { valid: false, reason: `Unknown destination type: ${type}` };
  }

  async function queueMessage({ actionId, destinationType, destinationId, draftText, draftBlocks, reason }) {
    if (!actionId) throw new Error('actionId is required -- no orphan sends');
    if (!configured && destinationType === 'slack_dm') {
      throw new Error('Broker not configured: GLEN_SLACK_USER_ID or SLACK_BOT_TOKEN missing');
    }
    const v = validateDestination(destinationType, destinationId);
    if (!v.valid) throw new Error(v.reason);

    const { rows } = await pool.query(
      `INSERT INTO aios_outbound_queue (action_id, destination_type, destination_id, draft_text, draft_blocks, reason)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [actionId, destinationType, destinationId, draftText, draftBlocks ? JSON.stringify(draftBlocks) : null, reason || '']
    );
    log('info', 'OutboundBroker', 'Queued', { id: rows[0].id, type: destinationType, actionId, hasBlocks: Boolean(draftBlocks) });
    return { id: rows[0].id };
  }

  async function processQueue() {
    if (!configured) return { sent: 0, failed: 0, skipped: 'broker not configured' };

    // Recover stale in_progress rows (crashed/restarted before completion)
    try {
      const { rowCount: recovered } = await pool.query(
        `UPDATE aios_outbound_queue SET delivery_status = 'pending'
         WHERE delivery_status = 'in_progress' AND created_at < NOW() - INTERVAL '5 minutes'`
      );
      if (recovered > 0) log('warn', 'OutboundBroker', 'Recovered stale claims', { count: recovered });
    } catch (recErr) {
      log('warn', 'OutboundBroker', 'Stale claim recovery failed', { error: recErr.message });
    }

    const client = await pool.connect();
    let sent = 0, failed = 0, rateLimited = 0;

    try {
      await client.query('BEGIN');

      const { rows: pending } = await client.query(
        `UPDATE aios_outbound_queue
         SET delivery_status = 'in_progress'
         WHERE id IN (
           SELECT id FROM aios_outbound_queue
           WHERE delivery_status = 'pending' AND approval_status = 'approved'
             AND destination_type = 'slack_dm'
           ORDER BY created_at ASC LIMIT 10
           FOR UPDATE SKIP LOCKED
         )
         RETURNING *`
      );

      await client.query('COMMIT');

      for (const item of pending) {
        try {
          const { rows: rateRows } = await pool.query(
            `SELECT COUNT(*) as count FROM aios_outbound_queue
             WHERE destination_type = 'slack_dm' AND delivery_status = 'sent'
             AND sent_at > NOW() - INTERVAL '24 hours'`
          );
          if (parseInt(rateRows[0].count, 10) >= maxDmsPerDay) {
            await pool.query(
              `UPDATE aios_outbound_queue SET delivery_status = 'pending', failure_reason = 'Rate limited, will retry' WHERE id = $1`,
              [item.id]
            );
            rateLimited++;
            continue;
          }

          const msg = {
            channel: item.destination_id,
            text: item.draft_text,
            unfurl_links: false,
            unfurl_media: false,
          };
          if (item.draft_blocks) {
            msg.blocks = typeof item.draft_blocks === 'string' ? JSON.parse(item.draft_blocks) : item.draft_blocks;
          }
          const result = await slack.chat.postMessage(msg);

          await pool.query(
            `UPDATE aios_outbound_queue SET delivery_status = 'sent', sent_at = NOW() WHERE id = $1`,
            [item.id]
          );
          log('info', 'OutboundBroker', 'Slack DM sent', {
            id: item.id, actionId: item.action_id, ts: result.ts,
          });
          sent++;
        } catch (err) {
          log('error', 'OutboundBroker', 'Send failed', { id: item.id, error: err.message });
          await pool.query(
            `UPDATE aios_outbound_queue SET delivery_status = 'failed', failure_reason = $2 WHERE id = $1`,
            [item.id, err.message]
          );
          failed++;
        }
      }
    } catch (txErr) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      log('error', 'OutboundBroker', 'Transaction failed', { error: txErr.message });
    } finally {
      client.release();
    }

    return { sent, failed, rateLimited };
  }

  async function getQueueStatus() {
    const { rows } = await pool.query(
      `SELECT delivery_status, COUNT(*) as count FROM aios_outbound_queue GROUP BY delivery_status`
    );
    const status = {};
    for (const row of rows) status[row.delivery_status] = parseInt(row.count, 10);
    return status;
  }

  return { validateDestination, queueMessage, processQueue, getQueueStatus, configured };
}

module.exports = { createBroker };
