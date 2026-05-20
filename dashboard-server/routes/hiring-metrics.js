'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid } = ctx;

  // ==================== HIRING METRICS ====================
  //
  // Analytics endpoints for the hiring pipeline.
  // Three read-only metrics endpoints:
  //   - time-in-stage: average/median/max days per stage
  //   - time-to-hire:  days from first entry to onboarded
  //   - pipeline:      snapshot of active candidates per stage + conversion rates

  /**
   * Verify auth and client-scoping for metrics requests.
   * Returns { from, to } date strings on success, or null after sending an error response.
   * client_id is required. client users can only query their own client.
   * @param {object} req
   * @param {object} res
   * @param {string} defaultDaysAgo - number of days back for default `from`
   */
  async function resolveParams(req, res, defaultDaysAgo) {
    if (!req.user) {
      res.status(401).json({ error: 'Auth required' });
      return null;
    }

    const { client_id, from, to } = req.query;

    if (!client_id) {
      res.status(400).json({ error: 'client_id is required' });
      return null;
    }
    if (!isValidUuid(client_id)) {
      res.status(400).json({ error: 'Invalid client_id' });
      return null;
    }

    // Client-scoped users may only query their own client
    if (req.user.clientId && req.user.clientId !== client_id) {
      res.status(403).json({ error: 'Access denied' });
      return null;
    }

    const today = new Date();
    const defaultFrom = new Date(today);
    defaultFrom.setDate(defaultFrom.getDate() - defaultDaysAgo);

    const fromDate = from || defaultFrom.toISOString().slice(0, 10);
    const toDate = to || today.toISOString().slice(0, 10);

    return { client_id, from: fromDate, to: toDate };
  }

  // --------------------------------------------------------------------------
  // GET /api/hiring/metrics/time-in-stage
  // --------------------------------------------------------------------------
  router.get('/api/hiring/metrics/time-in-stage', async (req, res) => {
    const params = await resolveParams(req, res, 90);
    if (!params) return;

    const { client_id, from, to } = params;

    try {
      const { rows } = await pool.query(
        `WITH transitions AS (
           SELECT csh.candidate_id,
                  csh.to_stage AS stage,
                  csh.moved_at AS entered_at,
                  LEAD(csh.moved_at) OVER (PARTITION BY csh.candidate_id ORDER BY csh.moved_at) AS exited_at
           FROM candidate_stage_history csh
           JOIN candidates ca ON ca.id = csh.candidate_id
           WHERE ca.client_id = $1
             AND csh.moved_at BETWEEN $2::date AND ($3::date + INTERVAL '1 day')
         )
         SELECT stage,
                ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at)) / 86400)::numeric, 1) AS avg_days,
                ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at)) / 86400)::numeric, 0) AS median_days,
                ROUND(MAX(EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at)) / 86400)::numeric, 0) AS max_days,
                COUNT(DISTINCT candidate_id)::int AS candidate_count
         FROM transitions
         WHERE stage IS NOT NULL
         GROUP BY stage
         ORDER BY stage`,
        [client_id, from, to]
      );

      res.json({
        stages: rows,
        period: { from, to },
      });
    } catch (e) {
      log('error', 'HiringMetrics', 'time-in-stage failed', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // --------------------------------------------------------------------------
  // GET /api/hiring/metrics/time-to-hire
  // --------------------------------------------------------------------------
  router.get('/api/hiring/metrics/time-to-hire', async (req, res) => {
    // Default: 12 months back
    const params = await resolveParams(req, res, 365);
    if (!params) return;

    const { client_id, from, to } = params;

    try {
      // Find candidates who reached 'onboarded' within the period,
      // and compute the span from their very first stage entry.
      const { rows } = await pool.query(
        `WITH onboarded AS (
           SELECT csh.candidate_id,
                  MAX(csh.moved_at) AS hired_at
           FROM candidate_stage_history csh
           JOIN candidates ca ON ca.id = csh.candidate_id
           WHERE ca.client_id = $1
             AND csh.to_stage = 'onboarded'
             AND csh.moved_at BETWEEN $2::date AND ($3::date + INTERVAL '1 day')
           GROUP BY csh.candidate_id
         ),
         first_entry AS (
           SELECT csh.candidate_id,
                  MIN(csh.moved_at) AS started_at
           FROM candidate_stage_history csh
           JOIN onboarded o ON o.candidate_id = csh.candidate_id
           GROUP BY csh.candidate_id
         )
         SELECT ca.id,
                ca.name,
                ca.role,
                o.hired_at,
                ROUND(EXTRACT(EPOCH FROM (o.hired_at - fe.started_at)) / 86400) AS days
         FROM onboarded o
         JOIN first_entry fe ON fe.candidate_id = o.candidate_id
         JOIN candidates ca ON ca.id = o.candidate_id
         ORDER BY o.hired_at DESC`,
        [client_id, from, to]
      );

      // Compute aggregate stats in JS to avoid a second DB round-trip
      let avg_days = null;
      let median_days = null;
      if (rows.length > 0) {
        const dayValues = rows.map(r => Number(r.days));
        avg_days = Math.round(dayValues.reduce((s, v) => s + v, 0) / dayValues.length);
        const sorted = [...dayValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        median_days = sorted.length % 2 === 0
          ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
          : sorted[mid];
      }

      res.json({
        avg_days,
        median_days,
        candidates: rows.map(r => ({
          id: r.id,
          name: r.name,
          role: r.role,
          days: Number(r.days),
          hired_at: r.hired_at,
        })),
        period: { from, to },
      });
    } catch (e) {
      log('error', 'HiringMetrics', 'time-to-hire failed', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // --------------------------------------------------------------------------
  // GET /api/hiring/metrics/pipeline
  // --------------------------------------------------------------------------
  router.get('/api/hiring/metrics/pipeline', async (req, res) => {
    const params = await resolveParams(req, res, 90);
    if (!params) return;

    const { client_id, from, to } = params;

    try {
      // Snapshot: active candidates per stage right now
      const { rows: snapshotRows } = await pool.query(
        `SELECT stage, COUNT(*)::int AS count
         FROM candidates
         WHERE client_id = $1
           AND archived_at IS NULL
         GROUP BY stage
         ORDER BY stage`,
        [client_id]
      );

      // Conversions: for each stage pair (A -> B), count candidates who passed through both
      // within the period. We use a self-join on candidate_stage_history.
      const { rows: conversionRows } = await pool.query(
        `SELECT h1.to_stage AS from_stage,
                h2.to_stage AS to_stage,
                COUNT(DISTINCT h1.candidate_id)::int AS count
         FROM candidate_stage_history h1
         JOIN candidate_stage_history h2
           ON h2.candidate_id = h1.candidate_id
          AND h2.moved_at > h1.moved_at
         JOIN candidates ca ON ca.id = h1.candidate_id
         WHERE ca.client_id = $1
           AND h1.moved_at BETWEEN $2::date AND ($3::date + INTERVAL '1 day')
           AND h1.to_stage IS NOT NULL
           AND h2.to_stage IS NOT NULL
           -- only direct neighbours (no skipped stages)
           AND h2.from_stage = h1.to_stage
         GROUP BY h1.to_stage, h2.to_stage
         ORDER BY h1.to_stage, h2.to_stage`,
        [client_id, from, to]
      );

      res.json({
        snapshot: snapshotRows,
        conversions: conversionRows,
        period: { from, to },
      });
    } catch (e) {
      log('error', 'HiringMetrics', 'pipeline failed', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
