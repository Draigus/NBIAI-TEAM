'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, requireAuth, requireNBI } = ctx;

  const ACTION_LABELS = {
    create: 'created',
    update: 'updated',
    delete: 'deleted',
    status_change: 'changed status of',
    assign: 'assigned',
    comment: 'commented on',
    import: 'imported',
  };

  const ENTITY_LABELS = {
    task: 'task',
    client: 'client',
    lead: 'lead',
    contact: 'contact',
    bug_report: 'bug report',
    candidate: 'candidate',
    expense: 'expense',
    calendar_event: 'calendar event',
    document: 'document',
    user: 'user',
    setting: 'setting',
    finance: 'finance data',
    position: 'position',
  };

  function humanise(entry) {
    const actor = entry.changed_by || 'System';
    const verb = ACTION_LABELS[entry.action] || entry.action;
    const entityType = ENTITY_LABELS[entry.entity_type] || entry.entity_type;
    const entityName = entry.entity_title || '';
    const summary = entityName
      ? `${actor} ${verb} ${entityType} "${entityName}"`
      : `${actor} ${verb} a ${entityType}`;

    let detail = null;
    if (entry.changes && typeof entry.changes === 'object') {
      if (entry.changes.status) {
        detail = `Status: ${entry.changes.status.from || '?'} → ${entry.changes.status.to || entry.changes.status}`;
      } else if (entry.changes.health) {
        detail = `Health: ${entry.changes.health.from || '?'} → ${entry.changes.health.to || entry.changes.health}`;
      } else if (entry.changes.assignees) {
        detail = `Assignees updated`;
      }
    }

    return {
      id: entry.id,
      summary,
      detail,
      actor,
      action: entry.action,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      entityTitle: entry.entity_title || null,
      createdAt: entry.created_at,
    };
  }

  router.get('/api/activity', requireAuth, requireNBI, async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const cursor = req.query.cursor || null;
    const entityType = req.query.entity_type || null;
    const since = req.query.since || null;

    const where = [];
    const vals = [];
    let i = 1;

    if (entityType) { where.push(`a.entity_type = $${i}`); vals.push(entityType); i++; }
    if (cursor) { where.push(`a.created_at < $${i}`); vals.push(cursor); i++; }
    if (since) { where.push(`a.created_at >= $${i}`); vals.push(since); i++; }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';
    vals.push(limit + 1);

    const { rows } = await pool.query(`
      SELECT a.*, t.title as entity_title
      FROM audit_log a
      LEFT JOIN tasks t ON a.entity_id = t.id AND a.entity_type = 'task'
      ${whereClause}
      ORDER BY a.created_at DESC
      LIMIT $${i}
    `, vals);

    const hasMore = rows.length > limit;
    const entries = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && entries.length > 0 ? entries[entries.length - 1].created_at : null;

    res.json({
      entries: entries.map(humanise),
      nextCursor,
      hasMore,
    });
  });

  return router;
};
