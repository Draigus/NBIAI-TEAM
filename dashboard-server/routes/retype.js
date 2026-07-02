'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid, auditLog, ITEM_TYPES, CANONICAL_ORDER, getCanonicalIndex, isDescendantOrder, requireTaskAccess } = ctx;

  const UNDO_EXPIRY_SECONDS = 30;

  /**
   * PATCH /api/tasks/:id/retype
   * Re-type an item and cascade to all descendants.
   */
  router.patch('/api/tasks/:id/retype', async (req, res) => {
    const { id } = req.params;
    const { newType } = req.body;

    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid task id' });
    if (!newType || !ITEM_TYPES.includes(newType)) {
      return res.status(400).json({ error: `Invalid newType. Must be one of: ${ITEM_TYPES.join(', ')}` });
    }

    const ok = await requireTaskAccess(req, res, id);
    if (!ok) return;

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');

      // Lock target item
      const { rows: [item] } = await conn.query(
        'SELECT id, item_type, parent_id, sort_order, version FROM tasks WHERE id = $1 FOR UPDATE',
        [id]
      );
      if (!item) {
        await conn.query('ROLLBACK');
        return res.status(404).json({ error: 'Task not found' });
      }

      const oldIdx = getCanonicalIndex(item.item_type);
      const newIdx = getCanonicalIndex(newType);
      const offset = newIdx - oldIdx;

      // No-op if same type
      if (offset === 0) {
        await conn.query('ROLLBACK');
        return res.status(200).json({ undoToken: null, changes: [] });
      }

      // Validate parent constraint: if item has a parent, newType must be below parent's type
      if (item.parent_id) {
        const { rows: [parent] } = await conn.query(
          'SELECT item_type FROM tasks WHERE id = $1',
          [item.parent_id]
        );
        if (parent && !isDescendantOrder(parent.item_type, newType)) {
          await conn.query('ROLLBACK');
          return res.status(400).json({ error: `Cannot retype to ${newType}: must be below parent type ${parent.item_type}` });
        }
      } else {
        // No parent: newType must be initiative
        if (newType !== 'initiative') {
          await conn.query('ROLLBACK');
          return res.status(400).json({ error: 'Root items must be initiative type' });
        }
      }

      // Get ALL descendants (including the item itself) via recursive CTE
      // Note: FOR UPDATE cannot be applied to recursive CTEs in PostgreSQL,
      // so we fetch IDs first, then lock them with a separate SELECT FOR UPDATE.
      const { rows: treeIds } = await conn.query(`
        WITH RECURSIVE tree AS (
          SELECT id FROM tasks WHERE id = $1
          UNION ALL
          SELECT t.id FROM tasks t JOIN tree tr ON t.parent_id = tr.id
        )
        SELECT id FROM tree
      `, [id]);

      const idList = treeIds.map(r => r.id);

      // Lock all affected rows and fetch their current state
      const { rows: descendants } = await conn.query(
        `SELECT id, item_type, parent_id, sort_order, version
         FROM tasks WHERE id = ANY($1) FOR UPDATE`,
        [idList]
      );

      // Compute new types with clamping
      const maxIdx = CANONICAL_ORDER.length - 1; // 4 = task
      const changeSet = [];
      for (const d of descendants) {
        const dOldIdx = getCanonicalIndex(d.item_type);
        let dNewIdx = dOldIdx + offset;
        if (dNewIdx < 0) dNewIdx = 0;
        if (dNewIdx > maxIdx) dNewIdx = maxIdx;
        const dNewType = CANONICAL_ORDER[dNewIdx];
        changeSet.push({
          id: d.id,
          previousType: d.item_type,
          newType: dNewType,
          previousParentId: d.parent_id,
          newParentId: d.parent_id, // may be updated by fix-nesting below
          previousSortOrder: d.sort_order,
          version: d.version,
        });
      }

      // Build lookup for the change set
      const changeMap = new Map();
      for (const c of changeSet) changeMap.set(c.id, c);

      // Fix equal-type nesting: after clamping, if a child has same or higher
      // type index as its parent in the change set, reparent it to the nearest
      // valid ancestor (walk up the parent chain until we find one with a
      // strictly lower type index, or the item outside the change set).
      //
      // We need the full parent chain for ancestor lookups
      const parentMap = new Map();
      for (const d of descendants) parentMap.set(d.id, d.parent_id);

      for (const c of changeSet) {
        if (!c.newParentId) continue; // root item, no parent to check

        const parentChange = changeMap.get(c.newParentId);
        if (!parentChange) continue; // parent not in change set, no conflict

        const parentNewIdx = getCanonicalIndex(parentChange.newType);
        const childNewIdx = getCanonicalIndex(c.newType);

        if (childNewIdx <= parentNewIdx) {
          // Need to reparent: walk up ancestor chain to find a valid ancestor
          let ancestorId = parentChange.newParentId;
          while (ancestorId) {
            const ancestorChange = changeMap.get(ancestorId);
            if (ancestorChange) {
              const ancestorIdx = getCanonicalIndex(ancestorChange.newType);
              if (ancestorIdx < childNewIdx) {
                break; // valid ancestor found
              }
              ancestorId = ancestorChange.newParentId;
            } else {
              // Ancestor not in change set -- it's a stable node above the cascade
              break;
            }
          }
          c.newParentId = ancestorId;
        }
      }

      // Apply all changes
      for (const c of changeSet) {
        await conn.query(
          `UPDATE tasks SET item_type = $1, parent_id = $2, version = version + 1, updated_at = NOW()
           WHERE id = $3`,
          [c.newType, c.newParentId, c.id]
        );
      }

      // Store undo token
      const undoChanges = changeSet.map(c => ({
        id: c.id,
        previousType: c.previousType,
        newType: c.newType,
        previousParentId: c.previousParentId,
        newParentId: c.newParentId,
        previousSortOrder: c.previousSortOrder,
        version: c.version, // version BEFORE the cascade bump
      }));

      const { rows: [tokenRow] } = await conn.query(
        `INSERT INTO retype_undo_tokens (actor_user_id, root_item_id, changes, expires_at)
         VALUES ($1, $2, $3, NOW() + ($4 || ' seconds')::interval)
         RETURNING id`,
        [req.user?.id || null, id, JSON.stringify(undoChanges), String(UNDO_EXPIRY_SECONDS)]
      );

      await conn.query('COMMIT');

      // Audit log (fire and forget, outside transaction)
      auditLog('task', id, 'retype', req.user?.displayName, {
        newType,
        previousType: item.item_type,
        descendantsAffected: changeSet.length,
        undoToken: tokenRow.id,
      });

      return res.json({
        undoToken: tokenRow.id,
        changes: changeSet.map(c => ({
          id: c.id,
          previousType: c.previousType,
          newType: c.newType,
        })),
      });
    } catch (err) {
      await conn.query('ROLLBACK');
      log('error', 'Retype', 'Cascade failed', { error: err.message, taskId: id });
      return res.status(500).json({ error: 'Retype failed' });
    } finally {
      conn.release();
    }
  });

  /**
   * PATCH /api/tasks/retype-undo
   * Revert a retype cascade using a server-held undo token.
   */
  router.patch('/api/tasks/retype-undo', async (req, res) => {
    const { undoToken } = req.body;

    if (!undoToken || !isValidUuid(undoToken)) {
      return res.status(400).json({ error: 'Invalid undoToken' });
    }

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');

      // Purge expired tokens first
      await conn.query('DELETE FROM retype_undo_tokens WHERE expires_at < NOW()');

      // Load token
      const { rows: [tokenRow] } = await conn.query(
        'SELECT id, actor_user_id, root_item_id, changes FROM retype_undo_tokens WHERE id = $1 FOR UPDATE',
        [undoToken]
      );

      if (!tokenRow) {
        await conn.query('ROLLBACK');
        return res.status(410).json({ error: 'Undo token not found or expired' });
      }

      const changes = tokenRow.changes; // JSONB auto-parsed by pg

      // Verify no rows were modified since the cascade
      for (const c of changes) {
        const { rows: [row] } = await conn.query(
          'SELECT version FROM tasks WHERE id = $1 FOR UPDATE',
          [c.id]
        );
        if (!row) {
          await conn.query('ROLLBACK');
          return res.status(409).json({ error: `Task ${c.id} was deleted after cascade` });
        }
        // The cascade bumped version by 1, so current should be capturedVersion + 1
        if (row.version !== c.version + 1) {
          await conn.query('ROLLBACK');
          return res.status(409).json({ error: `Task ${c.id} was modified by another user after the cascade` });
        }
      }

      // Restore all previous types, parents, and sort orders
      for (const c of changes) {
        await conn.query(
          `UPDATE tasks SET item_type = $1, parent_id = $2, sort_order = $3, version = version + 1, updated_at = NOW()
           WHERE id = $4`,
          [c.previousType, c.previousParentId, c.previousSortOrder, c.id]
        );
      }

      // Delete the used token
      await conn.query('DELETE FROM retype_undo_tokens WHERE id = $1', [undoToken]);

      await conn.query('COMMIT');

      // Audit log
      auditLog('task', tokenRow.root_item_id, 'retype_undo', req.user?.displayName, {
        undoToken,
        reverted: changes.length,
      });

      return res.json({ reverted: changes.length });
    } catch (err) {
      await conn.query('ROLLBACK');
      log('error', 'RetypeUndo', 'Undo failed', { error: err.message, undoToken });
      return res.status(500).json({ error: 'Undo failed' });
    } finally {
      conn.release();
    }
  });

  return router;
};
