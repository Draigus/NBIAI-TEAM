module.exports = function(ctx) {
  const router = require('express').Router();
  const {
    pool, requireAdmin, getClientScopes, isValidUuid, auditLog, log,
    validateLength, buildPatchQuery,
  } = ctx;

  /** GET /api/clients — List all clients with their task count (used for client selector and CRM list) */
  router.get('/api/clients', async (req, res) => {
    const scopes = await getClientScopes(req);
    if (scopes) {
      const { rows } = await pool.query(
        `SELECT c.*, COALESCE(tc.cnt, 0)::int as task_count
         FROM clients c
         LEFT JOIN (SELECT client_id, count(*) as cnt FROM tasks GROUP BY client_id) tc ON tc.client_id = c.id
         WHERE c.id = ANY($1) ORDER BY c.name`,
        [scopes]
      );
      return res.json(rows);
    }
    const { rows } = await pool.query(`
      SELECT c.*, COALESCE(tc.cnt, 0)::int as task_count
      FROM clients c
      LEFT JOIN (SELECT client_id, count(*) as cnt FROM tasks GROUP BY client_id) tc ON tc.client_id = c.id
      ORDER BY c.name
    `);
    res.json(rows);
  });

  /** GET /api/clients/:id — Get a single client with its contacts (single query) */
  router.get('/api/clients/:id', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    const { rows } = await pool.query(`
      SELECT c.*,
        COALESCE(
          (SELECT json_agg(row_to_json(ct.*) ORDER BY ct.sort_order)
           FROM contacts ct WHERE ct.client_id = c.id),
          '[]'::json
        ) AS contacts
      FROM clients c WHERE c.id = $1
    `, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  });

  /** POST /api/clients — Create a new client record */
  router.post('/api/clients', requireAdmin, async (req, res) => {
    const { name, description, founded, headquarters, employees, revenue, website, linkedin_company, nbi_relationship, sector, studio_size, contract_value, current_studio_project, abbreviation, practice_area } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const lenErr = validateLength(name, 'name');
    if (lenErr) return res.status(400).json({ error: lenErr });
    // G2 / decision D84: practice_area is MANDATORY and must be one of the
    // two valid slugs. "general" is rejected going forward. The second slug
    // was renamed from organisational_health → organisational_performance
    // in migration 025 per Glen's decision to reframe as Performance.
    const VALID_PRACTICES = ['gaming', 'organisational_performance'];
    if (!practice_area || !VALID_PRACTICES.includes(practice_area)) {
      return res.status(400).json({ error: `practice_area is required and must be one of: ${VALID_PRACTICES.join(', ')}` });
    }
    // Abbreviation must be 1-6 uppercase alphanumeric characters if provided
    const abbr = abbreviation ? String(abbreviation).trim().toUpperCase() : null;
    if (abbr && !/^[A-Z0-9]{1,6}$/.test(abbr)) {
      return res.status(400).json({ error: 'Abbreviation must be 1-6 letters or digits' });
    }
    const { rows } = await pool.query(
      `INSERT INTO clients (name, description, founded, headquarters, employees, revenue, website, linkedin_company, nbi_relationship, sector, studio_size, contract_value, current_studio_project, abbreviation, practice_area)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [name, description || '', founded || '', headquarters || '', employees || '', revenue || '', website || '', linkedin_company || '', nbi_relationship || '', sector || null, studio_size != null ? parseInt(studio_size, 10) || null : null, contract_value != null ? parseFloat(contract_value) || null : null, current_studio_project || null, abbr, practice_area]
    );
    res.status(201).json(rows[0]);
  });

  /** PATCH /api/clients/:id — Update client fields */
  router.patch('/api/clients/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    // Normalise the abbreviation to uppercase and validate shape before building the patch
    if (req.body.abbreviation !== undefined) {
      if (req.body.abbreviation === '' || req.body.abbreviation === null) {
        req.body.abbreviation = null;
      } else {
        const abbr = String(req.body.abbreviation).trim().toUpperCase();
        if (!/^[A-Z0-9]{1,6}$/.test(abbr)) {
          return res.status(400).json({ error: 'Abbreviation must be 1-6 letters or digits' });
        }
        req.body.abbreviation = abbr;
      }
    }
    const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['name', 'description', 'founded', 'headquarters', 'employees', 'revenue', 'website', 'linkedin_company', 'nbi_relationship', 'sector', 'studio_size', 'contract_value', 'current_studio_project', 'practice_area', 'abbreviation']);
    if (req.body.name !== undefined && !req.body.name.trim()) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    updates.push(`updated_at = NOW()`);
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE clients SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`, vals);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  });

  /**
   * POST /api/clients/:id/research — Trigger client portfolio research.
   * v1 placeholder: returns empty fields set. Admin only.
   */
  router.post('/api/clients/:id/research', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    const { rows: clientRows } = await pool.query('SELECT id, name, website FROM clients WHERE id = $1', [req.params.id]);
    if (clientRows.length === 0) return res.status(404).json({ error: 'Client not found' });
    const client = clientRows[0];

    // v1 stub: no real research integration yet. Return zero verified fields so
    // the frontend never receives hallucinated data.
    const result = {
      researched: true,
      fields: {},
      unverified: [],
      note: 'Research pipeline not yet integrated with search API. No fields populated. This is a v1 placeholder that keeps the API stable for frontend integration.',
      inputs: { name: client.name, website: client.website || null },
      ranAt: new Date().toISOString(),
      ranBy: req.user?.displayName || 'unknown'
    };

    // Persist the structured result for audit/history.
    try {
      await pool.query(
        'UPDATE clients SET research_data = $1, research_updated_at = NOW(), updated_at = NOW() WHERE id = $2',
        [JSON.stringify(result), req.params.id]
      );
      await auditLog('client', req.params.id, 'research', req.user?.displayName || 'unknown', { fieldsCount: Object.keys(result.fields).length, placeholder: true });
    } catch (e) {
      log('error', 'ClientResearch', 'Failed to persist research result', { error: e.message, clientId: req.params.id });
      // Still return the result so the frontend can show the placeholder note
    }

    res.json(result);
  });

  /** DELETE /api/clients/:id — Remove a client (admin only, cascades to tasks) */
  router.delete('/api/clients/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid client ID' });
    // Unlink tasks from this client before deleting
    await pool.query('UPDATE tasks SET client_id = NULL, updated_at = NOW() WHERE client_id = $1', [req.params.id]);
    await pool.query('DELETE FROM clients WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  });

  return router;
};
