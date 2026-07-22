'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid, validateLength, auditLog, createNotification } = ctx;

  const {
    FINANCIAL_FIELDS,
    BUDGET_FIELDS,
    MATERIAL_FIELDS,
    resolveHiringCapabilities,
    redactHiringRole,
    redactHiringSettings,
  } = require('../lib/hiring-plan-permissions');

  const { buildCostMatrix, moneyFromPence } = require('../lib/hiring-costs');
  const { buildHiringPlanWorkbook, writeWorkbookResponse } = require('../lib/hiring-export');

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

  // -- Plan CRUD helpers ------------------------------------------------------

  const EMPLOYMENT_ALIASES = { permanent: 'fte', contract: 'contractor', freelance: 'psc' };
  const CANONICAL_TYPES = new Set(['fte', 'contractor', 'psc']);
  const financialSet = new Set(FINANCIAL_FIELDS);

  function canonicalEmploymentType(raw) {
    if (!raw) return null;
    const lower = String(raw).toLowerCase().trim();
    return EMPLOYMENT_ALIASES[lower] || (CANONICAL_TYPES.has(lower) ? lower : null);
  }

  function deriveRecruitingStatus(role) {
    if (role.status === 'closed') {
      return role.close_reason === 'filled' ? 'hired' : 'closed';
    }
    if (role.status === 'paused') return 'paused';
    if (role.recruiting_started_at) return 'recruiting';
    return 'not_started';
  }

  function deriveDaysOpen(role) {
    if (!role.recruiting_started_at) return null;
    const start = new Date(role.recruiting_started_at);
    const end = role.closed_at ? new Date(role.closed_at) : new Date();
    return Math.max(0, Math.floor((end - start) / 86400000));
  }

  async function loadCapabilities(req, clientId) {
    const settings = await loadSettings(clientId);
    const departments = await loadDepartments(clientId);
    const recruiterUserIds = await loadRecruiterIds(clientId);
    return resolveHiringCapabilities({ user: req.user, clientId, settings, departments, recruiterUserIds });
  }

  function partitionFields(body, caps) {
    const out = {};
    for (const key of Object.keys(body)) {
      if (financialSet.has(key) && !caps.edit_financials) continue;
      out[key] = body[key];
    }
    return out;
  }

  function validatePlanRole(fields, settings) {
    const et = fields.employment_type;
    if (et === 'fte' && fields.compensation_basis && fields.compensation_basis !== 'annual') {
      return 'FTE compensation basis must be annual';
    }
    if (fields.compensation_basis === 'daily' && !fields.expected_workdays_per_month) {
      return 'Daily rates require expected_workdays_per_month';
    }
    if (fields.compensation_currency && settings) {
      const permitted = settings.permitted_currencies || ['GBP'];
      if (!permitted.includes(fields.compensation_currency)) {
        return `Currency ${fields.compensation_currency} is not permitted for this client`;
      }
    }
    if (fields.target_start_month) {
      const d = new Date(fields.target_start_month);
      if (isNaN(d.getTime()) || d.getUTCDate() !== 1) {
        return 'target_start_month must be the first of a month (YYYY-MM-01)';
      }
    }
    if (fields.compensation_min != null && fields.compensation_max != null) {
      if (Number(fields.compensation_min) > Number(fields.compensation_max)) {
        return 'compensation_min cannot exceed compensation_max';
      }
    }
    return null;
  }

  // -- GET /api/hiring-plan ---------------------------------------------------

  router.get('/api/hiring-plan', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });

      const clientId = resolveClientId(req);
      if (!clientId) return res.status(400).json({ error: 'client_id required' });

      const caps = await loadCapabilities(req, clientId);

      const { rows: roles } = await pool.query(`
        SELECT hp.*,
          COALESCE(cc.counts, '{}'::jsonb) AS candidate_counts,
          COALESCE(cc.total, 0) AS candidate_total
        FROM hiring_positions hp
        LEFT JOIN LATERAL (
          SELECT
            jsonb_object_agg(stage, cnt) AS counts,
            SUM(cnt)::int AS total
          FROM (
            SELECT c.stage, COUNT(*)::int AS cnt
            FROM candidates c
            WHERE c.position_id = hp.id
            GROUP BY c.stage
          ) sub
        ) cc ON true
        WHERE hp.client_id = $1
        ORDER BY
          CASE WHEN hp.target_start_month IS NULL THEN 1 ELSE 0 END,
          hp.target_start_month ASC,
          hp.priority ASC NULLS LAST,
          hp.title ASC
      `, [clientId]);

      const redacted = roles.map(r => {
        const base = redactHiringRole(r, caps);
        base.recruiting_status = deriveRecruitingStatus(r);
        base.days_open = deriveDaysOpen(r);
        return base;
      });

      res.json({ roles: redacted, capabilities: caps });
    } catch (err) {
      log('error', 'HiringPlan', 'GET /api/hiring-plan failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -- POST /api/hiring-plan --------------------------------------------------

  router.post('/api/hiring-plan', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });

      const clientId = req.body.client_id || resolveClientId(req);
      if (!clientId) return res.status(400).json({ error: 'client_id required' });

      const caps = await loadCapabilities(req, clientId);
      if (!caps.create_requirement) return res.status(403).json({ error: 'Cannot create requirements' });

      if (!req.body.title || typeof req.body.title !== 'string' || req.body.title.trim().length === 0) {
        return res.status(400).json({ error: 'title is required' });
      }

      const filtered = partitionFields(req.body, caps);
      const et = canonicalEmploymentType(filtered.employment_type);

      const settings = await loadSettings(clientId);
      const validationErr = validatePlanRole({ ...filtered, employment_type: et }, settings);
      if (validationErr) return res.status(400).json({ error: validationErr });

      const cols = [
        'client_id', 'title', 'description', 'seniority', 'discipline', 'location',
        'employment_type', 'department_id', 'priority', 'target_start_month',
        'requirement_type', 'hiring_manager_user_id', 'requested_by_user_id',
        'approval_status', 'approval_submitted_at', 'planning_version',
        'compensation_min', 'compensation_max', 'budgeted_compensation',
        'compensation_currency', 'compensation_basis', 'expected_workdays_per_month',
        'fx_rate_to_gbp', 'fx_rate_effective_date', 'fx_rate_source_note',
        'on_cost_override_pct',
      ];

      const vals = [
        clientId,
        filtered.title.trim(),
        filtered.description || null,
        filtered.seniority || null,
        filtered.discipline || null,
        filtered.location || null,
        et || 'fte',
        filtered.department_id && isValidUuid(filtered.department_id) ? filtered.department_id : null,
        filtered.priority != null ? filtered.priority : null,
        filtered.target_start_month || null,
        filtered.requirement_type || null,
        filtered.hiring_manager_user_id && isValidUuid(filtered.hiring_manager_user_id) ? filtered.hiring_manager_user_id : null,
        req.user.id,
        'pending',
        new Date(),
        1,
        filtered.compensation_min != null ? filtered.compensation_min : null,
        filtered.compensation_max != null ? filtered.compensation_max : null,
        filtered.budgeted_compensation != null ? filtered.budgeted_compensation : null,
        filtered.compensation_currency || null,
        filtered.compensation_basis || null,
        filtered.expected_workdays_per_month != null ? filtered.expected_workdays_per_month : null,
        filtered.fx_rate_to_gbp != null ? filtered.fx_rate_to_gbp : null,
        filtered.fx_rate_effective_date || null,
        filtered.fx_rate_source_note || null,
        filtered.on_cost_override_pct != null ? filtered.on_cost_override_pct : null,
      ];

      const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
      const { rows: [role] } = await pool.query(
        `INSERT INTO hiring_positions (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        vals
      );

      auditLog('hiring_position', role.id, 'create', req.user.display_name || req.user.username, {
        title: role.title, department_id: role.department_id, employment_type: role.employment_type,
      });

      res.status(201).json(role);
    } catch (err) {
      log('error', 'HiringPlan', 'POST /api/hiring-plan failed', { error: err.message, stack: err.stack });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -- PATCH /api/hiring-plan/:id ---------------------------------------------

  router.patch('/api/hiring-plan/:id', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });

      const { id } = req.params;
      if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid role id' });

      if (req.body.planning_version == null) {
        return res.status(400).json({ error: 'planning_version is required for updates' });
      }
      const expectedVersion = Number(req.body.planning_version);

      const { rows: [existing] } = await pool.query('SELECT * FROM hiring_positions WHERE id = $1', [id]);
      if (!existing) return res.status(404).json({ error: 'Role not found' });

      const clientId = existing.client_id;
      const caps = await loadCapabilities(req, clientId);

      if (!caps.edit_requirement && !caps.edit_financials) {
        return res.status(403).json({ error: 'Cannot edit this role' });
      }

      const filtered = partitionFields(req.body, caps);
      delete filtered.planning_version;
      delete filtered.client_id;
      delete filtered.id;

      if (filtered.employment_type) {
        filtered.employment_type = canonicalEmploymentType(filtered.employment_type) || filtered.employment_type;
      }

      const settings = await loadSettings(clientId);
      const merged = { ...existing, ...filtered };
      const validationErr = validatePlanRole(merged, settings);
      if (validationErr) return res.status(400).json({ error: validationErr });

      const setClauses = [];
      const vals = [id, expectedVersion];
      let idx = 3;

      const updatable = [
        'title', 'description', 'seniority', 'discipline', 'location',
        'employment_type', 'department_id', 'priority', 'target_start_month',
        'requirement_type', 'hiring_manager_user_id',
        'compensation_min', 'compensation_max', 'budgeted_compensation',
        'compensation_currency', 'compensation_basis', 'expected_workdays_per_month',
        'fx_rate_to_gbp', 'fx_rate_effective_date', 'fx_rate_source_note',
        'on_cost_override_pct',
      ];

      for (const key of updatable) {
        if (key in filtered) {
          setClauses.push(`${key} = $${idx}`);
          vals.push(filtered[key]);
          idx++;
        }
      }

      if (setClauses.length === 0) return res.status(400).json({ error: 'No fields to update' });

      const materialChanged = existing.approval_status === 'approved' &&
        MATERIAL_FIELDS.some(f => f in filtered && String(filtered[f]) !== String(existing[f]));

      if (materialChanged) {
        setClauses.push(`approval_status = 'pending'`);
        setClauses.push(`approval_submitted_at = NOW()`);
      }

      setClauses.push(`planning_version = planning_version + 1`);
      setClauses.push(`updated_at = NOW()`);

      const { rows: [updated], rowCount } = await pool.query(
        `UPDATE hiring_positions SET ${setClauses.join(', ')}
         WHERE id = $1 AND planning_version = $2
         RETURNING *`,
        vals
      );

      if (rowCount === 0) {
        const { rows: [current] } = await pool.query('SELECT * FROM hiring_positions WHERE id = $1', [id]);
        return res.status(409).json({ error: 'Version conflict', current: redactHiringRole(current, caps) });
      }

      if (materialChanged) {
        const changedFields = {};
        for (const f of MATERIAL_FIELDS) {
          if (f in filtered && String(filtered[f]) !== String(existing[f])) {
            changedFields[f] = { from: existing[f], to: filtered[f] };
          }
        }
        await pool.query(
          `INSERT INTO hiring_approval_events (position_id, client_id, event_type, from_approval_status, to_approval_status, actor_user_id, actor_name, position_snapshot)
           VALUES ($1, $2, 'reopened_for_approval', 'approved', 'pending', $3, $4, $5::jsonb)`,
          [id, clientId, req.user.id, req.user.display_name || req.user.username, JSON.stringify({ changed_fields: changedFields, ...updated })]
        );

        await notifyApprovalChange(clientId, updated, 'reopened', req.user);
      }

      auditLog('hiring_position', id, 'update', req.user.display_name || req.user.username, filtered);

      res.json(redactHiringRole(updated, caps));
    } catch (err) {
      log('error', 'HiringPlan', 'PATCH /api/hiring-plan/:id failed', { error: err.message, stack: err.stack });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -- Notification helper ---------------------------------------------------

  const VALID_DENIAL_REASONS = new Set(['beyond_financial_boundaries', 'not_current_priority', 'lacks_information', 'other']);

  async function notifyApprovalChange(clientId, role, action, actor) {
    try {
      const settings = await loadSettings(clientId);
      const recruiterIds = await loadRecruiterIds(clientId);
      const targets = new Set();

      if (action === 'approved') {
        if (role.requested_by_user_id) targets.add(role.requested_by_user_id);
        if (role.hiring_manager_user_id) targets.add(role.hiring_manager_user_id);
        if (settings && settings.finance_director_user_id) targets.add(settings.finance_director_user_id);
        for (const uid of recruiterIds) targets.add(uid);
      } else if (action === 'denied') {
        if (role.requested_by_user_id) targets.add(role.requested_by_user_id);
        if (role.hiring_manager_user_id) targets.add(role.hiring_manager_user_id);
        if (settings && settings.finance_director_user_id) targets.add(settings.finance_director_user_id);
      } else {
        if (settings && settings.coo_user_id) targets.add(settings.coo_user_id);
        if (settings && settings.finance_director_user_id) targets.add(settings.finance_director_user_id);
      }

      targets.delete(actor.id);

      const title = action === 'approved'
        ? `${role.title} approved`
        : action === 'denied'
          ? `${role.title} denied`
          : `${role.title} returned to Pending`;

      for (const uid of targets) {
        try {
          const { rows: [user] } = await pool.query('SELECT username FROM users WHERE id = $1 AND is_active = true', [uid]);
          if (user) {
            await createNotification(user.username, `hiring_plan_${action}`, title, '', '#hiring');
          }
        } catch (e) {
          log('warn', 'HiringPlan', 'Notification send failed', { user_id: uid, error: e.message });
        }
      }
    } catch (e) {
      log('warn', 'HiringPlan', 'Notification batch failed', { error: e.message });
    }
  }

  // -- POST /api/hiring-plan/:id/approve --------------------------------------

  router.post('/api/hiring-plan/:id/approve', async (req, res) => {
    const client = await pool.connect();
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });

      const { id } = req.params;
      if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid role id' });

      const expectedVersion = req.body.planning_version;
      if (expectedVersion == null) return res.status(400).json({ error: 'planning_version required' });

      await client.query('BEGIN');

      const { rows: [role] } = await client.query('SELECT * FROM hiring_positions WHERE id = $1 FOR UPDATE', [id]);
      if (!role) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Role not found' }); }

      if (role.planning_version !== Number(expectedVersion)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Version conflict', current: role });
      }

      const caps = await loadCapabilities(req, role.client_id);
      if (!caps.approve_or_deny) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Not authorised to approve' });
      }

      await client.query(
        `UPDATE hiring_positions SET
           approval_status = 'approved',
           recruiting_started_at = COALESCE(recruiting_started_at, NOW()),
           planning_version = planning_version + 1,
           updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      await client.query(
        `INSERT INTO hiring_approval_events (position_id, client_id, event_type, from_approval_status, to_approval_status, actor_user_id, actor_name, position_snapshot)
         VALUES ($1, $2, 'approved', $3, 'approved', $4, $5, $6::jsonb)`,
        [id, role.client_id, role.approval_status, req.user.id, req.user.display_name || req.user.username, JSON.stringify(role)]
      );

      await client.query('COMMIT');

      const { rows: [updated] } = await pool.query('SELECT * FROM hiring_positions WHERE id = $1', [id]);

      auditLog('hiring_position', id, 'approve', req.user.display_name || req.user.username, {
        from_status: role.approval_status, to_status: 'approved',
      });

      await notifyApprovalChange(role.client_id, updated, 'approved', req.user);

      res.json(updated);
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      log('error', 'HiringPlan', 'approve failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  // -- POST /api/hiring-plan/:id/deny -----------------------------------------

  router.post('/api/hiring-plan/:id/deny', async (req, res) => {
    const client = await pool.connect();
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });

      const { id } = req.params;
      if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid role id' });

      const { planning_version, denial_reason, denial_comment } = req.body;
      if (planning_version == null) return res.status(400).json({ error: 'planning_version required' });

      if (!denial_reason || !VALID_DENIAL_REASONS.has(denial_reason)) {
        return res.status(400).json({ error: 'Invalid denial_reason' });
      }
      if (denial_reason === 'other' && (!denial_comment || denial_comment.trim().length === 0)) {
        return res.status(400).json({ error: 'denial_comment required for Other reason' });
      }

      await client.query('BEGIN');

      const { rows: [role] } = await client.query('SELECT * FROM hiring_positions WHERE id = $1 FOR UPDATE', [id]);
      if (!role) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Role not found' }); }

      if (role.planning_version !== Number(planning_version)) {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'Version conflict', current: role });
      }

      const caps = await loadCapabilities(req, role.client_id);
      if (!caps.approve_or_deny) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Not authorised to deny' });
      }

      await client.query(
        `UPDATE hiring_positions SET
           approval_status = 'denied',
           planning_version = planning_version + 1,
           updated_at = NOW()
         WHERE id = $1`,
        [id]
      );

      await client.query(
        `INSERT INTO hiring_approval_events (position_id, client_id, event_type, from_approval_status, to_approval_status, actor_user_id, actor_name, denial_reason, denial_comment, position_snapshot)
         VALUES ($1, $2, 'denied', $3, 'denied', $4, $5, $6, $7, $8::jsonb)`,
        [id, role.client_id, role.approval_status, req.user.id, req.user.display_name || req.user.username, denial_reason, denial_comment || null, JSON.stringify(role)]
      );

      await client.query('COMMIT');

      const { rows: [updated] } = await pool.query('SELECT * FROM hiring_positions WHERE id = $1', [id]);

      auditLog('hiring_position', id, 'deny', req.user.display_name || req.user.username, {
        from_status: role.approval_status, to_status: 'denied', denial_reason,
      });

      await notifyApprovalChange(role.client_id, updated, 'denied', req.user);

      res.json(updated);
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      log('error', 'HiringPlan', 'deny failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      client.release();
    }
  });

  // -- GET /api/hiring-plan/costs ----------------------------------------------

  const VALID_COST_HORIZONS = new Set([12, 24, 36]);

  router.get('/api/hiring-plan/costs', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });

      const clientId = resolveClientId(req);
      if (!clientId) return res.status(400).json({ error: 'client_id required' });

      const months = Number(req.query.months);
      if (!VALID_COST_HORIZONS.has(months)) {
        return res.status(400).json({ error: 'months must be 12, 24 or 36' });
      }

      const startMonth = req.query.start_month;
      if (!startMonth || !/^\d{4}-\d{2}-01$/.test(startMonth)) {
        return res.status(400).json({ error: 'start_month must be a first-of-month date (YYYY-MM-01)' });
      }
      const smMonth = Number(startMonth.slice(5, 7));
      if (smMonth < 1 || smMonth > 12) {
        return res.status(400).json({ error: 'start_month must be a valid date' });
      }

      const caps = await loadCapabilities(req, clientId);
      if (!caps.view_financials) {
        return res.status(403).json({ error: 'Financial access required' });
      }

      const settings = await loadSettings(clientId);

      const { rows: roles } = await pool.query(
        'SELECT * FROM hiring_positions WHERE client_id = $1',
        [clientId]
      );

      const matrix = buildCostMatrix(roles, settings, { startMonth, months });

      const titleMap = new Map(roles.map(r => [r.id, r.title]));
      const rows = matrix.rows.map(row => ({
        ...row,
        title: titleMap.get(row.role_id) || null,
        monthly_base_gbp: moneyFromPence(row.monthly_base_gbp_pence),
        monthly_loaded_gbp: moneyFromPence(row.monthly_loaded_gbp_pence),
      }));

      const formatTotals = (t) => ({
        ...t,
        horizon_base_gbp: moneyFromPence(t.horizon_base_gbp_pence),
        horizon_loaded_gbp: moneyFromPence(t.horizon_loaded_gbp_pence),
      });

      res.json({
        months: matrix.months,
        rows,
        totals: {
          approved: formatTotals(matrix.totals.approved),
          pending: formatTotals(matrix.totals.pending),
          combined: formatTotals(matrix.totals.combined),
        },
        incompleteRoleIds: matrix.incompleteRoleIds,
      });
    } catch (err) {
      log('error', 'HiringPlan', 'GET /api/hiring-plan/costs failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -- GET /api/hiring-plan/export.xlsx ----------------------------------------

  router.get('/api/hiring-plan/export.xlsx', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });

      const clientId = resolveClientId(req);
      if (!clientId) return res.status(400).json({ error: 'client_id required' });

      const caps = await loadCapabilities(req, clientId);
      const settings = caps.view_financials ? await loadSettings(clientId) : null;

      const { rows: roles } = await pool.query(`
        SELECT hp.*,
          COALESCE(cc.counts, '{}'::jsonb) AS candidate_counts,
          COALESCE(cc.total, 0) AS candidate_total,
          hd.name AS department_name
        FROM hiring_positions hp
        LEFT JOIN LATERAL (
          SELECT
            jsonb_object_agg(stage, cnt) AS counts,
            SUM(cnt)::int AS total
          FROM (
            SELECT c.stage, COUNT(*)::int AS cnt
            FROM candidates c
            WHERE c.position_id = hp.id
            GROUP BY c.stage
          ) sub
        ) cc ON true
        LEFT JOIN hiring_departments hd ON hd.id = hp.department_id
        WHERE hp.client_id = $1
        ORDER BY
          CASE WHEN hp.target_start_month IS NULL THEN 1 ELSE 0 END,
          hp.target_start_month ASC,
          hp.priority ASC NULLS LAST,
          hp.title ASC
      `, [clientId]);

      const redacted = roles.map(r => {
        const base = redactHiringRole(r, caps);
        base.department_name = r.department_name;
        base.candidate_counts = r.candidate_counts;
        base.candidate_total = r.candidate_total;
        return base;
      });

      let costMatrix = null;
      if (caps.view_financials) {
        const now = new Date();
        const startMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        costMatrix = buildCostMatrix(roles, settings, { startMonth, months: 24 });
      }

      const { rows: [clientRow] } = await pool.query('SELECT name FROM clients WHERE id = $1', [clientId]);
      const clientName = clientRow ? clientRow.name : '';
      const dateStr = new Date().toISOString().slice(0, 10);
      const safeClientName = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');

      const wb = buildHiringPlanWorkbook(redacted, costMatrix, settings, caps, {
        generatedAt: new Date().toISOString(),
        clientName,
      });

      auditLog('hiring_export', clientId, 'export', req.user.display_name || req.user.username, {
        sheets: wb.worksheets.map(s => s.name),
      });

      await writeWorkbookResponse(wb, res, `Hiring_Plan_${safeClientName}_${dateStr}.xlsx`);
    } catch (err) {
      log('error', 'HiringPlan', 'GET export.xlsx failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // -- GET /api/hiring-plan/:id/history ---------------------------------------

  router.get('/api/hiring-plan/:id/history', async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Auth required' });

      const { id } = req.params;
      if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid role id' });

      const { rows } = await pool.query(
        `SELECT id, position_id, event_type, from_approval_status, to_approval_status,
                actor_user_id, actor_name, denial_reason, denial_comment, created_at
         FROM hiring_approval_events
         WHERE position_id = $1
         ORDER BY created_at ASC`,
        [id]
      );

      res.json(rows);
    } catch (err) {
      log('error', 'HiringPlan', 'GET history failed', { error: err.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
