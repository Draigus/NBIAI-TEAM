'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid, validateLength, auditLog, createNotification } = ctx;

  const {
    resolveHiringCapabilities,
    redactHiringSettings,
  } = require('../lib/hiring-plan-permissions');

  // -- Helpers ---------------------------------------------------------------

  function resolveClientId(req) {
    if (req.user.clientId) return req.user.clientId;
    const qid = req.query.client_id;
    if (qid && isValidUuid(qid)) return qid;
    return null;
  }

  function isNbiAdmin(user) {
    return !!user && !user.clientId && user.role === 'admin';
  }

  function canConfigure(user) {
    return isNbiAdmin(user) || (!!user.clientId && user.clientRole === 'admin');
  }

  async function loadSettings(clientId) {
    const { rows } = await pool.query(
      'SELECT * FROM hiring_client_settings WHERE client_id = $1',
      [clientId]
    );
    return rows[0] || null;
  }

  async function loadDepartments(clientId) {
    const { rows } = await pool.query(
      'SELECT * FROM hiring_departments WHERE client_id = $1 ORDER BY name',
      [clientId]
    );
    return rows;
  }

  async function loadRecruiterIds(clientId) {
    const { rows } = await pool.query(
      'SELECT user_id FROM hiring_recruiters WHERE client_id = $1',
      [clientId]
    );
    return rows.map(r => r.user_id);
  }

  // -- GET /api/hiring-settings ----------------------------------------------

  router.get('/api/hiring-settings', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });

      const clientId = resolveClientId(req);
      if (!clientId) return res.status(400).json({ error: 'client_id required' });

      const settings = await loadSettings(clientId);
      const departments = await loadDepartments(clientId);
      const recruiterUserIds = await loadRecruiterIds(clientId);

      const caps = resolveHiringCapabilities({
        user: req.user,
        clientId,
        settings,
        departments,
        recruiterUserIds,
      });

      const baseSettings = settings || {
        client_id: clientId,
        coo_user_id: null,
        finance_director_user_id: null,
        fte_on_cost_pct: '0',
        contractor_on_cost_pct: '0',
        psc_on_cost_pct: '0',
        permitted_currencies: ['GBP'],
      };

      const redacted = redactHiringSettings(baseSettings, caps);

      res.json({
        ...redacted,
        departments,
        recruiter_user_ids: recruiterUserIds,
      });
    } catch (err) {
      log('error', 'HiringPlan', 'GET /api/hiring-settings failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -- PATCH /api/hiring-settings --------------------------------------------

  router.patch('/api/hiring-settings', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });
      if (!canConfigure(req.user)) return res.status(403).json({ error: 'Admin access required' });

      const clientId = resolveClientId(req);
      if (!clientId) return res.status(400).json({ error: 'client_id required' });

      const body = req.body;

      if (body.permitted_currencies) {
        if (!Array.isArray(body.permitted_currencies) || !body.permitted_currencies.includes('GBP')) {
          return res.status(400).json({ error: 'permitted_currencies must include GBP' });
        }
      }

      const client = await pool.query('BEGIN');

      const fields = [];
      const vals = [];
      let idx = 2;

      const settable = ['coo_user_id', 'finance_director_user_id', 'fte_on_cost_pct', 'contractor_on_cost_pct', 'psc_on_cost_pct', 'permitted_currencies'];
      for (const key of settable) {
        if (key in body) {
          const val = key === 'permitted_currencies' ? JSON.stringify(body[key]) : body[key];
          fields.push(`${key} = $${idx}`);
          vals.push(val);
          idx++;
        }
      }

      fields.push(`updated_by_user_id = $${idx}`);
      vals.push(req.user.id);
      idx++;

      fields.push(`updated_at = NOW()`);

      const upsertSql = `
        INSERT INTO hiring_client_settings (client_id, ${settable.filter(k => k in body).join(', ')}${settable.some(k => k in body) ? ', ' : ''}updated_by_user_id)
        VALUES ($1${vals.map((_, i) => `, $${i + 2}`).join('')})
        ON CONFLICT (client_id) DO UPDATE SET ${fields.join(', ')}
        RETURNING *
      `;

      const { rows: [settings] } = await pool.query(upsertSql, [clientId, ...vals]);

      if (body.recruiter_user_ids && Array.isArray(body.recruiter_user_ids)) {
        await pool.query('DELETE FROM hiring_recruiters WHERE client_id = $1', [clientId]);
        for (const uid of body.recruiter_user_ids) {
          if (isValidUuid(uid)) {
            await pool.query(
              'INSERT INTO hiring_recruiters (client_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [clientId, uid]
            );
          }
        }
      }

      await pool.query('COMMIT');

      auditLog('hiring_settings', clientId, 'update', req.user.display_name || req.user.username, body);

      const departments = await loadDepartments(clientId);
      const recruiterUserIds = await loadRecruiterIds(clientId);

      res.json({
        ...settings,
        permitted_currencies: settings.permitted_currencies,
        departments,
        recruiter_user_ids: recruiterUserIds,
      });
    } catch (err) {
      try { await pool.query('ROLLBACK'); } catch (_) {}
      log('error', 'HiringPlan', 'PATCH /api/hiring-settings failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -- GET /api/hiring-settings/departments ----------------------------------

  router.get('/api/hiring-settings/departments', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });

      const clientId = resolveClientId(req);
      if (!clientId) return res.status(400).json({ error: 'client_id required' });

      const departments = await loadDepartments(clientId);
      res.json(departments);
    } catch (err) {
      log('error', 'HiringPlan', 'GET departments failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -- POST /api/hiring-settings/departments ---------------------------------

  router.post('/api/hiring-settings/departments', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });
      if (!canConfigure(req.user)) return res.status(403).json({ error: 'Admin access required' });

      const clientId = resolveClientId(req);
      if (!clientId) return res.status(400).json({ error: 'client_id required' });

      const { name, director_user_id } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'name is required' });
      }

      const trimmed = name.trim();

      const { rows: existing } = await pool.query(
        'SELECT id FROM hiring_departments WHERE client_id = $1 AND LOWER(name) = LOWER($2)',
        [clientId, trimmed]
      );
      if (existing.length > 0) {
        return res.status(409).json({ error: 'A department with this name already exists' });
      }

      const { rows: [dept] } = await pool.query(
        `INSERT INTO hiring_departments (client_id, name, director_user_id)
         VALUES ($1, $2, $3) RETURNING *`,
        [clientId, trimmed, director_user_id && isValidUuid(director_user_id) ? director_user_id : null]
      );

      auditLog('hiring_department', dept.id, 'create', req.user.display_name || req.user.username, { name: trimmed, director_user_id: dept.director_user_id, client_id: clientId });

      res.status(201).json(dept);
    } catch (err) {
      log('error', 'HiringPlan', 'POST department failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -- PATCH /api/hiring-settings/departments/:id ----------------------------

  router.patch('/api/hiring-settings/departments/:id', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });
      if (!canConfigure(req.user)) return res.status(403).json({ error: 'Admin access required' });

      const { id } = req.params;
      if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid department id' });

      const { rows: [existing] } = await pool.query('SELECT * FROM hiring_departments WHERE id = $1', [id]);
      if (!existing) return res.status(404).json({ error: 'Department not found' });

      if (req.user.clientId && existing.client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Client scope violation' });
      }

      const updates = [];
      const vals = [id];
      let idx = 2;

      if ('name' in req.body && typeof req.body.name === 'string') {
        updates.push(`name = $${idx}`);
        vals.push(req.body.name.trim());
        idx++;
      }
      if ('director_user_id' in req.body) {
        updates.push(`director_user_id = $${idx}`);
        vals.push(req.body.director_user_id);
        idx++;
      }
      if ('is_active' in req.body) {
        updates.push(`is_active = $${idx}`);
        vals.push(!!req.body.is_active);
        idx++;
      }

      if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

      updates.push(`updated_at = NOW()`);

      const { rows: [updated] } = await pool.query(
        `UPDATE hiring_departments SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
        vals
      );

      auditLog('hiring_department', id, 'update', req.user.display_name || req.user.username, req.body);

      res.json(updated);
    } catch (err) {
      log('error', 'HiringPlan', 'PATCH department failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -- DELETE /api/hiring-settings/departments/:id ---------------------------

  router.delete('/api/hiring-settings/departments/:id', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });
      if (!canConfigure(req.user)) return res.status(403).json({ error: 'Admin access required' });

      const { id } = req.params;
      if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid department id' });

      const { rows: [existing] } = await pool.query('SELECT * FROM hiring_departments WHERE id = $1', [id]);
      if (!existing) return res.status(404).json({ error: 'Department not found' });

      if (req.user.clientId && existing.client_id !== req.user.clientId) {
        return res.status(403).json({ error: 'Client scope violation' });
      }

      const { rows: refs } = await pool.query(
        'SELECT id FROM hiring_positions WHERE department_id = $1 LIMIT 1',
        [id]
      );

      if (refs.length > 0) {
        const { rows: [deactivated] } = await pool.query(
          'UPDATE hiring_departments SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
          [id]
        );

        auditLog('hiring_department', id, 'deactivate', req.user.display_name || req.user.username, { reason: 'referenced by positions' });

        return res.json(deactivated);
      }

      await pool.query('DELETE FROM hiring_departments WHERE id = $1', [id]);

      auditLog('hiring_department', id, 'delete', req.user.display_name || req.user.username, { name: existing.name });

      res.status(204).send();
    } catch (err) {
      log('error', 'HiringPlan', 'DELETE department failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
