'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const {
    pool, log, requireAdmin, requireNBI,
    isValidUuid, validateLength, auditLog,
    buildPatchQuery, getCached, invalidateCache,
    getClientScopes, sendEmailAsync, APP_URL,
    shiftForInsert, reorderInGroup,
  } = ctx;

  // ==================== LEADS TRACKER ====================
  // CRM pipeline for tracking sales opportunities, from initial contact through to close.
  // Supports configurable stages, resource requirements, activity logging, and revenue forecasting.

  // --- Config endpoints (pipeline stages, resource types, field options) ---

  /**
   * GET /api/leads/config
   * Return cached pipeline configuration: stages, resource types, and field option dropdowns.
   * Cache is invalidated whenever an admin modifies any config item.
   */
  router.get('/api/leads/config', requireNBI, async (req, res) => {
    const config = await getCached('leads_config', async () => {
      const stages = await pool.query('SELECT * FROM lead_pipeline_stages ORDER BY sort_order');
      const resourceTypes = await pool.query('SELECT * FROM lead_resource_types WHERE is_active = true ORDER BY sort_order');
      const fieldOptions = await pool.query('SELECT * FROM lead_field_options WHERE is_active = true ORDER BY field_name, sort_order');
      const options = {};
      fieldOptions.rows.forEach(r => {
        if (!options[r.field_name]) options[r.field_name] = [];
        options[r.field_name].push({ id: r.id, value: r.value, sort_order: r.sort_order });
      });
      return { stages: stages.rows, resourceTypes: resourceTypes.rows, fieldOptions: options };
    });
    res.json(config);
  });

  /** POST /api/leads/stages — Create a new pipeline stage (admin only) */
  router.post('/api/leads/stages', requireAdmin, async (req, res) => {
    const { name, sort_order, colour, is_closed, is_won } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      'INSERT INTO lead_pipeline_stages (name, sort_order, colour, is_closed, is_won) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, sort_order || 0, colour || '#666666', is_closed || false, is_won || false]
    );
    await auditLog('lead_config', rows[0].id, 'create', req.user.displayName, { type: 'stage', name });
    invalidateCache('leads_config');
    res.status(201).json(rows[0]);
  });

  /** PATCH /api/leads/stages/:id — Update a pipeline stage (admin only) */
  router.patch('/api/leads/stages/:id', requireAdmin, async (req, res) => {
    const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['name', 'sort_order', 'colour', 'is_closed', 'is_won']);
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE lead_pipeline_stages SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Stage not found' });
    await auditLog('lead_config', req.params.id, 'update', req.user.displayName, req.body);
    invalidateCache('leads_config');
    res.json(rows[0]);
  });

  /** DELETE /api/leads/stages/:id — Remove a stage (blocked if leads still reference it) */
  router.delete('/api/leads/stages/:id', requireAdmin, async (req, res) => {
    const count = await pool.query('SELECT count(*) FROM leads WHERE stage_id = $1', [req.params.id]);
    if (parseInt(count.rows[0].count) > 0) return res.status(409).json({ error: 'Cannot delete stage with existing leads. Move leads first.' });
    await pool.query('DELETE FROM lead_pipeline_stages WHERE id = $1', [req.params.id]);
    await auditLog('lead_config', req.params.id, 'delete', req.user.displayName, { type: 'stage' });
    invalidateCache('leads_config');
    res.json({ ok: true });
  });

  /** POST /api/leads/resource-types — Create a resource type (e.g. "Analyst", "Designer") */
  router.post('/api/leads/resource-types', requireAdmin, async (req, res) => {
    const { name, sort_order } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const { rows } = await pool.query(
      'INSERT INTO lead_resource_types (name, sort_order) VALUES ($1,$2) RETURNING *',
      [name, sort_order || 0]
    );
    await auditLog('lead_config', rows[0].id, 'create', req.user.displayName, { type: 'resource_type', name });
    invalidateCache('leads_config');
    res.status(201).json(rows[0]);
  });

  /** PATCH /api/leads/resource-types/:id — Update a resource type */
  router.patch('/api/leads/resource-types/:id', requireAdmin, async (req, res) => {
    const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['name', 'sort_order', 'is_active']);
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE lead_resource_types SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
    invalidateCache('leads_config');
    res.json(rows[0]);
  });

  /** DELETE /api/leads/resource-types/:id — Soft-delete if in use, hard-delete otherwise */
  router.delete('/api/leads/resource-types/:id', requireAdmin, async (req, res) => {
    const count = await pool.query('SELECT count(*) FROM lead_resources WHERE resource_type_id = $1', [req.params.id]);
    if (parseInt(count.rows[0].count) > 0) {
      // Soft-delete instead
      await pool.query('UPDATE lead_resource_types SET is_active = false WHERE id = $1', [req.params.id]);
      return res.json({ ok: true, soft_deleted: true });
    }
    await pool.query('DELETE FROM lead_resource_types WHERE id = $1', [req.params.id]);
    invalidateCache('leads_config');
    res.json({ ok: true });
  });

  /** POST /api/leads/field-options — Add a dropdown option for a lead field (e.g. work_type, service_line) */
  router.post('/api/leads/field-options', requireAdmin, async (req, res) => {
    const { field_name, value, sort_order } = req.body;
    if (!field_name || !value) return res.status(400).json({ error: 'field_name and value required' });
    const { rows } = await pool.query(
      'INSERT INTO lead_field_options (field_name, value, sort_order) VALUES ($1,$2,$3) RETURNING *',
      [field_name, value, sort_order || 0]
    );
    await auditLog('lead_config', rows[0].id, 'create', req.user.displayName, { type: 'field_option', field_name, value });
    invalidateCache('leads_config');
    res.status(201).json(rows[0]);
  });

  /** PATCH /api/leads/field-options/:id — Update a field option value (admin only) */
  router.patch('/api/leads/field-options/:id', requireAdmin, async (req, res) => {
    const { value, sort_order } = req.body;
    if (!value) return res.status(400).json({ error: 'value required' });
    const { rows } = await pool.query('UPDATE lead_field_options SET value = $1, sort_order = COALESCE($2, sort_order) WHERE id = $3 RETURNING *', [value, sort_order, req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Option not found' });
    invalidateCache('leads_config');
    res.json(rows[0]);
  });

  /** DELETE /api/leads/field-options/:id — Remove a field option */
  router.delete('/api/leads/field-options/:id', requireAdmin, async (req, res) => {
    await pool.query('DELETE FROM lead_field_options WHERE id = $1', [req.params.id]);
    invalidateCache('leads_config');
    res.json({ ok: true });
  });

  // --- Leads CRUD ---

  /**
   * GET /api/leads
   * Paginated lead listing with filters: stage, client, owner, priority, sector, free-text search.
   * Includes joined stage, client, contact, and resource data.
   * Sorted by stage order, then priority, then creation date.
   */
  router.get('/api/leads', requireNBI, async (req, res) => {
    let { stage_id, client_id, owner, priority, sector, search, sort, limit: qLimit, offset: qOffset, cursor } = req.query;
    const scopes = await getClientScopes(req);
    if (scopes && scopes.length === 1) { client_id = scopes[0]; }
    let where = []; let vals = []; let i = 1;

    if (stage_id) { where.push(`l.stage_id = $${i}`); vals.push(stage_id); i++; }
    if (client_id) { where.push(`l.client_id = $${i}`); vals.push(client_id); i++; }
    else if (scopes && scopes.length > 1) { where.push(`l.client_id = ANY($${i})`); vals.push(scopes); i++; }
    if (owner) { where.push(`l.deal_owner = $${i}`); vals.push(owner); i++; }
    if (priority) { where.push(`l.priority = $${i}`); vals.push(parseInt(priority)); i++; }
    if (sector) { where.push(`c.sector = $${i}`); vals.push(sector); i++; }
    if (search) {
      where.push(`(l.title ILIKE $${i} OR c.name ILIKE $${i} OR l.work_type ILIKE $${i} OR l.notes ILIKE $${i} OR l.location ILIKE $${i} OR l.deal_owner ILIKE $${i})`);
      vals.push('%' + search + '%'); i++;
    }

    // Cursor-based: filter leads created before the cursor timestamp
    if (cursor) {
      where.push(`l.created_at < $${i}`);
      vals.push(cursor);
      i++;
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';
    const limit = Math.min(parseInt(qLimit) || 200, 500);
    const offset = parseInt(qOffset) || 0;

    // Fetch limit + 1 to determine hasMore
    const fetchLimit = limit + 1;
    vals.push(fetchLimit);
    let paginationClause;
    if (cursor) {
      paginationClause = `LIMIT $${i}`;
    } else {
      vals.push(offset);
      paginationClause = `LIMIT $${i} OFFSET $${i + 1}`;
    }

    const { rows } = await pool.query(`
      SELECT l.*, l.weighted_value,
        c.name as client_name, c.sector as client_sector,
        s.name as stage_name, s.colour as stage_colour, s.sort_order as stage_sort_order,
        s.is_closed, s.is_won,
        ct.name as primary_contact_name, ct.email as primary_contact_email, ct.phone as primary_contact_phone,
        sw.title as sow_title,
        (SELECT json_agg(json_build_object('resource_type_id', lr.resource_type_id, 'quantity', lr.quantity, 'notes', lr.notes,
          'resource_name', rt.name) ORDER BY rt.sort_order)
         FROM lead_resources lr JOIN lead_resource_types rt ON lr.resource_type_id = rt.id WHERE lr.lead_id = l.id) as resources
      FROM leads l
      LEFT JOIN clients c ON l.client_id = c.id
      JOIN lead_pipeline_stages s ON l.stage_id = s.id
      LEFT JOIN contacts ct ON l.primary_contact_id = ct.id
      LEFT JOIN sows sw ON sw.id = l.sow_id
      ${whereClause}
      ORDER BY s.sort_order, l.position, l.created_at DESC
      ${paginationClause}
    `, vals);

    const hasMore = rows.length > limit;
    const leads = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && leads.length > 0 ? leads[leads.length - 1].created_at : null;

    // Count query (uses only filter params, not cursor/limit/offset)
    const countFilterWhere = [];
    const countVals = [];
    let ci = 1;
    if (stage_id) { countFilterWhere.push(`l.stage_id = $${ci}`); countVals.push(stage_id); ci++; }
    if (client_id) { countFilterWhere.push(`l.client_id = $${ci}`); countVals.push(client_id); ci++; }
    if (owner) { countFilterWhere.push(`l.deal_owner = $${ci}`); countVals.push(owner); ci++; }
    if (priority) { countFilterWhere.push(`l.priority = $${ci}`); countVals.push(parseInt(priority)); ci++; }
    if (sector) { countFilterWhere.push(`c.sector = $${ci}`); countVals.push(sector); ci++; }
    if (search) { countFilterWhere.push(`(l.title ILIKE $${ci} OR c.name ILIKE $${ci} OR l.work_type ILIKE $${ci} OR l.notes ILIKE $${ci} OR l.location ILIKE $${ci} OR l.deal_owner ILIKE $${ci})`); countVals.push('%' + search + '%'); ci++; }
    const countWhere = countFilterWhere.length > 0 ? 'WHERE ' + countFilterWhere.join(' AND ') : '';

    const countResult = await pool.query(
      `SELECT count(*) FROM leads l LEFT JOIN clients c ON l.client_id = c.id JOIN lead_pipeline_stages s ON l.stage_id = s.id LEFT JOIN contacts ct ON l.primary_contact_id = ct.id ${countWhere}`,
      countVals
    );

    res.json({ leads, total: parseInt(countResult.rows[0].count), limit, offset, nextCursor, hasMore });
  });

  /** GET /api/leads/reminders — Return open leads whose follow-up date is today or overdue */
  router.get('/api/leads/reminders', requireNBI, async (req, res) => {
    const scopes = await getClientScopes(req);
    let scopeFilter = '';
    let vals = [];
    if (scopes) {
      scopeFilter = ' AND l.client_id = ANY($1)';
      vals = [scopes];
    }
    const { rows } = await pool.query(`
      SELECT l.id, l.title, l.next_followup_date, l.next_action, l.deal_owner,
        c.name as client_name, s.name as stage_name
      FROM leads l
      LEFT JOIN clients c ON l.client_id = c.id
      JOIN lead_pipeline_stages s ON l.stage_id = s.id
      WHERE l.next_followup_date <= CURRENT_DATE AND s.is_closed = false${scopeFilter}
      ORDER BY l.next_followup_date ASC
    `, vals);
    res.json(rows);
  });

  /**
   * GET /api/leads/pipeline/summary
   * Aggregate pipeline view: deal count, ROM range, and weighted value per stage.
   * Grouped by currency. Also returns FX rates from settings for GBP conversion.
   */
  router.get('/api/leads/pipeline/summary', requireNBI, async (req, res) => {
    const scopes = await getClientScopes(req);
    const { sector } = req.query;
    let filters = [];
    let vals = [];
    let i = 1;
    if (sector) { filters.push(`c.sector = $${i}`); vals.push(sector); i++; }
    if (scopes) { filters.push(`l.client_id = ANY($${i})`); vals.push(scopes); i++; }
    const whereClause = filters.length > 0 ? 'WHERE ' + filters.join(' AND ') : '';

    const byStage = await pool.query(`
      SELECT s.id, s.name, s.colour, s.sort_order, s.is_closed, s.is_won,
        count(l.id)::int as deal_count,
        COALESCE(sum(l.rom_min), 0)::numeric as total_rom_min,
        COALESCE(sum(l.rom_max), 0)::numeric as total_rom_max,
        COALESCE(sum(l.weighted_value), 0)::numeric as total_weighted
      FROM lead_pipeline_stages s
      LEFT JOIN leads l ON l.stage_id = s.id
      LEFT JOIN clients c ON l.client_id = c.id
      ${whereClause}
      GROUP BY s.id, s.name, s.colour, s.sort_order, s.is_closed, s.is_won
      ORDER BY s.sort_order
    `, vals);

    const fxResult = await pool.query("SELECT value FROM settings WHERE key = 'fx_rates'");
    const FX_STALE_FALLBACK = { USD: 0.79, EUR: 0.86 };
    const fxRates = fxResult.rows.length > 0 ? fxResult.rows[0].value : FX_STALE_FALLBACK;

    res.json({ byStage: byStage.rows, fxRates });
  });

  /** GET /api/leads/pipeline/forecast — Monthly revenue forecast from open deals with expected close dates */
  router.get('/api/leads/pipeline/forecast', requireNBI, async (req, res) => {
    const scopes = await getClientScopes(req);
    let scopeFilter = '';
    let vals = [];
    if (scopes) {
      scopeFilter = ' AND l.client_id = ANY($1)';
      vals = [scopes];
    }
    const { rows } = await pool.query(`
      SELECT
        to_char(l.expected_close_date, 'YYYY-MM') as month,
        l.currency,
        count(*) as deal_count,
        COALESCE(sum(l.weighted_value), 0) as total_weighted,
        COALESCE(sum(l.rom_max), 0) as total_rom
      FROM leads l
      JOIN lead_pipeline_stages s ON l.stage_id = s.id
      WHERE l.expected_close_date IS NOT NULL AND s.is_closed = false${scopeFilter}
      GROUP BY to_char(l.expected_close_date, 'YYYY-MM'), l.currency
      ORDER BY month
    `, vals);
    res.json(rows);
  });

  /**
   * GET /api/leads/:id
   * Full lead detail: includes client info, resources, recent activities, and client contacts.
   */
  router.get('/api/leads/:id', requireNBI, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid lead ID' });
    const { rows } = await pool.query(`
      SELECT l.*, l.weighted_value,
        c.name as client_name, c.sector as client_sector,
        c.description as client_description, c.website as client_website,
        c.headquarters as client_hq, c.linkedin_company as client_linkedin,
        c.nbi_relationship as client_nbi_relationship,
        s.name as stage_name, s.colour as stage_colour, s.is_closed, s.is_won,
        ct.name as primary_contact_name, ct.email as primary_contact_email, ct.phone as primary_contact_phone,
        sw.title as sow_title,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', lr.id, 'lead_id', lr.lead_id, 'resource_type_id', lr.resource_type_id,
            'quantity', lr.quantity, 'notes', lr.notes, 'resource_name', rt.name
          ) ORDER BY rt.sort_order)
          FROM lead_resources lr JOIN lead_resource_types rt ON lr.resource_type_id = rt.id
          WHERE lr.lead_id = l.id),
          '[]'::json
        ) AS resources,
        COALESCE(
          (SELECT json_agg(row_to_json(la.*) ORDER BY la.created_at DESC)
           FROM (SELECT * FROM lead_activities WHERE lead_id = l.id ORDER BY created_at DESC LIMIT 50) la),
          '[]'::json
        ) AS activities,
        COALESCE(
          (SELECT json_agg(row_to_json(cc.*) ORDER BY cc.name)
           FROM contacts cc WHERE cc.client_id = l.client_id),
          '[]'::json
        ) AS client_contacts
      FROM leads l
      LEFT JOIN clients c ON l.client_id = c.id
      JOIN lead_pipeline_stages s ON l.stage_id = s.id
      LEFT JOIN contacts ct ON l.primary_contact_id = ct.id
      LEFT JOIN sows sw ON sw.id = l.sow_id
      WHERE l.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Lead not found' });
    res.json(rows[0]);
  });

  /**
   * POST /api/leads
   * Create a new lead/opportunity. Also inserts resource requirements and
   * a "created" activity log entry. Runs in a transaction.
   */
  router.post('/api/leads', requireAdmin, async (req, res) => {
    const { client_id, title, work_type, service_line, stage_id, priority, currency,
      rom_min, rom_max, rom_text, win_probability, primary_contact_id, deal_owner,
      lead_source, est_start_date, expected_close_date, last_contacted,
      next_followup_date, next_action, location, notes, time_estimate, resources } = req.body;

    if (!title) return res.status(400).json({ error: 'Title required' });
    if (!stage_id) return res.status(400).json({ error: 'Stage required' });
    const lenErr = validateLength(title, 'title') || validateLength(notes, 'notes');
    if (lenErr) return res.status(400).json({ error: lenErr });

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      // Shift all leads in the target stage down by 1 so the new lead lands at position 0
      await shiftForInsert(conn, 'leads', 'stage_id', stage_id);
      const { rows } = await conn.query(
        `INSERT INTO leads (client_id, title, work_type, service_line, stage_id, priority, currency,
          rom_min, rom_max, rom_text, win_probability, primary_contact_id, deal_owner,
          lead_source, est_start_date, expected_close_date, last_contacted,
          next_followup_date, next_action, location, notes, time_estimate, created_by, position)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,0) RETURNING *`,
        [client_id || null, title, work_type || null, service_line || null, stage_id,
          priority || null, currency || 'GBP',
          rom_min || null, rom_max || null, rom_text || null, win_probability || null,
          primary_contact_id || null, deal_owner || null, lead_source || null,
          est_start_date || null, expected_close_date || null, last_contacted || null,
          next_followup_date || null, next_action || null, location || null,
          notes || null, time_estimate || null, req.user?.displayName || 'unknown']
      );

      const leadId = rows[0].id;

      // Insert resources if provided
      if (Array.isArray(resources)) {
        for (const r of resources) {
          if (r.resource_type_id) {
            await conn.query(
              'INSERT INTO lead_resources (lead_id, resource_type_id, quantity, notes) VALUES ($1,$2,$3,$4)',
              [leadId, r.resource_type_id, r.quantity || 1, r.notes || null]
            );
          }
        }
      }

      // Create activity entry
      await conn.query(
        'INSERT INTO lead_activities (lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4)',
        [leadId, 'created', `Lead created: ${title}`, req.user?.displayName || 'unknown']
      );

      await conn.query('COMMIT');
      await auditLog('lead', leadId, 'create', req.user?.displayName, { title, stage_id, client_id });

      // Return full lead with joins
      const full = await pool.query(`
        SELECT l.*, l.weighted_value, c.name as client_name, s.name as stage_name, s.colour as stage_colour
        FROM leads l LEFT JOIN clients c ON l.client_id = c.id
        JOIN lead_pipeline_stages s ON l.stage_id = s.id WHERE l.id = $1
      `, [leadId]);
      res.status(201).json(full.rows[0]);
    } catch (e) {
      await conn.query('ROLLBACK');
      log('error', 'Leads', 'Lead creation failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
      res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      conn.release();
    }
  });

  /**
   * PATCH /api/leads/:id
   * Update lead fields. Detects stage and priority changes and creates
   * activity log entries for them automatically.
   */
  router.patch('/api/leads/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid lead ID' });
    // stage_id is routed through reorderInGroup below — NOT in patchFields.
    const patchFields = ['client_id', 'title', 'work_type', 'service_line', 'priority',
      'currency', 'rom_min', 'rom_max', 'rom_text', 'win_probability',
      'primary_contact_id', 'deal_owner', 'lead_source',
      'est_start_date', 'expected_close_date', 'last_contacted',
      'next_followup_date', 'next_action', 'location', 'notes', 'time_estimate',
      'completed_at', 'practice_area', 'sow_id'];

    const sanitisedBody = { ...req.body };
    for (const f of patchFields) {
      if (sanitisedBody[f] === '') sanitisedBody[f] = null;
    }
    const { updates, vals, nextIdx } = buildPatchQuery(sanitisedBody, patchFields);
    if (req.body.title !== undefined && !req.body.title.trim()) {
      return res.status(400).json({ error: 'Title cannot be empty' });
    }
    const wantsReorder = (req.body.stage_id !== undefined) || (req.body.position !== undefined);
    if (updates.length === 0 && !wantsReorder) return res.status(400).json({ error: 'No valid fields to update' });

    // Fetch old values for change detection + activity logging
    const oldResult = await pool.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
    if (oldResult.rows.length === 0) return res.status(404).json({ error: 'Lead not found' });
    const oldLead = oldResult.rows[0];

    // Run reorder + field update atomically
    const conn = await pool.connect();
    let updatedRow;
    try {
      await conn.query('BEGIN');

      if (wantsReorder) {
        const targetStage = (req.body.stage_id !== undefined && req.body.stage_id !== '')
          ? req.body.stage_id
          : oldLead.stage_id;
        const targetPos = (typeof req.body.position === 'number' && Number.isInteger(req.body.position))
          ? req.body.position
          : 0;
        await reorderInGroup(conn, 'leads', 'stage_id', req.params.id, targetStage, targetPos);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        vals.push(req.params.id);
        await conn.query(`UPDATE leads SET ${updates.join(', ')} WHERE id = $${nextIdx}`, vals);
      }

      const fresh = await conn.query('SELECT * FROM leads WHERE id = $1', [req.params.id]);
      updatedRow = fresh.rows[0];
      await conn.query('COMMIT');
    } catch (err) {
      await conn.query('ROLLBACK');
      log('error', 'Leads', 'PATCH failed', { error: err.message });
      return res.status(500).json({ error: 'Failed to update lead' });
    } finally {
      conn.release();
    }

    // Build change log against the freshly-updated row (includes stage_id/position)
    const changes = {};
    const allFields = [...patchFields, 'stage_id', 'position'];
    for (const f of allFields) {
      if (sanitisedBody[f] !== undefined || (f === 'position' && req.body.position !== undefined) || (f === 'stage_id' && req.body.stage_id !== undefined)) {
        const oldVal = oldLead[f];
        const newVal = updatedRow[f];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes[f] = { from: oldVal, to: newVal };
        }
      }
    }

    if (changes.stage_id) {
      // Look up stage names for the activity entry
      const oldStage = await pool.query('SELECT name FROM lead_pipeline_stages WHERE id = $1', [changes.stage_id.from]);
      const newStage = await pool.query('SELECT name FROM lead_pipeline_stages WHERE id = $1', [changes.stage_id.to]);
      const desc = `Stage changed from ${oldStage.rows[0]?.name || '?'} to ${newStage.rows[0]?.name || '?'}`;
      await pool.query(
        'INSERT INTO lead_activities (lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4)',
        [req.params.id, 'stage_change', desc, req.user?.displayName || 'unknown']
      );
    }
    if (changes.priority) {
      await pool.query(
        'INSERT INTO lead_activities (lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4)',
        [req.params.id, 'priority_change', `Priority changed from ${changes.priority.from || 'none'} to ${changes.priority.to || 'none'}`, req.user?.displayName || 'unknown']
      );
    }

    if (Object.keys(changes).length > 0) {
      await auditLog('lead', req.params.id, 'update', req.user?.displayName, changes);
    }

    // Return full lead with joins
    const full = await pool.query(`
      SELECT l.*, l.weighted_value, c.name as client_name, c.sector as client_sector,
        s.name as stage_name, s.colour as stage_colour, s.is_closed, s.is_won
      FROM leads l LEFT JOIN clients c ON l.client_id = c.id
      JOIN lead_pipeline_stages s ON l.stage_id = s.id WHERE l.id = $1
    `, [req.params.id]);
    res.json(full.rows[0]);
  });

  /** DELETE /api/leads/:id — Delete a lead and its related resources/activities (admin only) */
  router.delete('/api/leads/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid lead ID' });
    const lead = await pool.query('SELECT title FROM leads WHERE id = $1', [req.params.id]);
    await auditLog('lead', req.params.id, 'delete', req.user.displayName, { title: lead.rows[0]?.title });
    await pool.query('DELETE FROM leads WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });

  // --- Lead Resources ---

  /**
   * PUT /api/leads/:id/resources
   * Replace all resource requirements for a lead (delete + re-insert in a transaction).
   * Each resource specifies a type and quantity (e.g. 2 x Analyst, 1 x Designer).
   */
  router.put('/api/leads/:id/resources', requireAdmin, async (req, res) => {
    const { resources } = req.body;
    if (!Array.isArray(resources)) return res.status(400).json({ error: 'resources array required' });

    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      await conn.query('DELETE FROM lead_resources WHERE lead_id = $1', [req.params.id]);
      for (const r of resources) {
        if (r.resource_type_id) {
          await conn.query(
            'INSERT INTO lead_resources (lead_id, resource_type_id, quantity, notes) VALUES ($1,$2,$3,$4)',
            [req.params.id, r.resource_type_id, r.quantity || 1, r.notes || null]
          );
        }
      }
      await conn.query('COMMIT');
      res.json({ ok: true, count: resources.length });
    } catch (e) {
      await conn.query('ROLLBACK');
      log('error', 'Leads', 'Lead resources update failed', { error: e.message, stack: e.stack?.split('\n').slice(0,3).join(' | ') });
      res.status(500).json({ error: 'An internal error occurred' });
    } finally {
      conn.release();
    }
  });

  // --- Lead Activities ---

  /** GET /api/leads/:id/activities — Activity timeline for a lead, newest first */
  router.get('/api/leads/:id/activities', requireNBI, async (req, res) => {
    const { rows } = await pool.query(
      'SELECT * FROM lead_activities WHERE lead_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(rows);
  });

  /** POST /api/leads/:id/activities — Log a manual activity (call, email, meeting, etc.) against a lead */
  router.post('/api/leads/:id/activities', requireAdmin, async (req, res) => {
    const { activity_type, description } = req.body;
    if (!activity_type || !description) return res.status(400).json({ error: 'activity_type and description required' });
    const { rows } = await pool.query(
      'INSERT INTO lead_activities (lead_id, activity_type, description, performed_by) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, activity_type, description, req.user?.displayName || 'unknown']
    );
    res.status(201).json(rows[0]);
  });

  return router;
};
