module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, isValidUuid, auditLog, log, validateLength, buildPatchQuery } = ctx;

  // ==================== TEAMS ====================
  //
  // Teams group users around a Client and (optionally) a specific SoW.
  // Visibility model: any authenticated user can list and read teams.
  // Mutations (create / update / delete / membership changes) are admin-only.

  const VALID_TEAM_ROLES = ['lead', 'member'];

  /**
   * GET /api/teams — List all teams with member count and client / SoW names.
   * Optional ?client_id=<uuid> filter restricts to a single client.
   */
  router.get('/api/teams', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const { client_id, include } = req.query;
    const includeMembers = include === 'members';
    let where = '';
    let vals = [];
    if (client_id) {
      if (!isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
      where = 'WHERE t.client_id = $1';
      vals = [client_id];
    }
    try {
      const { rows } = await pool.query(`
        SELECT t.id, t.name, t.description, t.client_id, t.sow_id, t.colour,
               t.created_at, t.updated_at,
               c.name AS client_name,
               s.title AS sow_title,
               (SELECT COUNT(*)::int FROM team_members WHERE team_id = t.id) AS member_count
        FROM teams t
        LEFT JOIN clients c ON c.id = t.client_id
        LEFT JOIN sows s ON s.id = t.sow_id
        ${where}
        ORDER BY c.name NULLS LAST, t.name
      `, vals);
      // Optionally join member display names. Used by the calendar modal so
      // team events can be fanned out to every team member's roster row
      // without a second round-trip (bug d4367137).
      if (includeMembers && rows.length > 0) {
        const ids = rows.map(r => r.id);
        const { rows: memberRows } = await pool.query(
          `SELECT tm.team_id, u.display_name
           FROM team_members tm
           JOIN users u ON u.id = tm.user_id
           WHERE tm.team_id = ANY($1::uuid[])`,
          [ids]
        );
        const byTeam = {};
        memberRows.forEach(m => {
          if (!byTeam[m.team_id]) byTeam[m.team_id] = [];
          byTeam[m.team_id].push(m.display_name);
        });
        rows.forEach(r => { r.member_display_names = byTeam[r.id] || []; });
      }
      res.json(rows);
    } catch (e) {
      log('error', 'Teams', 'Failed to list teams', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /**
   * GET /api/teams/:id — Single team with members array.
   * Each member entry includes user_id, display_name, username, role.
   */
  router.get('/api/teams/:id', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
    try {
      const { rows: teamRows } = await pool.query(`
        SELECT t.id, t.name, t.description, t.client_id, t.sow_id, t.colour,
               t.created_at, t.updated_at,
               c.name AS client_name,
               s.title AS sow_title
        FROM teams t
        LEFT JOIN clients c ON c.id = t.client_id
        LEFT JOIN sows s ON s.id = t.sow_id
        WHERE t.id = $1
      `, [req.params.id]);
      if (!teamRows[0]) return res.status(404).json({ error: 'Not found' });
      const { rows: memberRows } = await pool.query(`
        SELECT tm.id AS membership_id, tm.user_id, tm.role, tm.created_at,
               u.display_name, u.username
        FROM team_members tm
        JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = $1
        ORDER BY (tm.role = 'lead') DESC, u.display_name
      `, [req.params.id]);
      res.json({ ...teamRows[0], members: memberRows });
    } catch (e) {
      log('error', 'Teams', 'Failed to fetch team', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /**
   * POST /api/teams — Create a team. Admin only.
   * Body: { name, description?, client_id?, sow_id?, colour? }
   */
  router.post('/api/teams', requireAdmin, async (req, res) => {
    const { name, description, client_id, sow_id, colour } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
    const lenErr = validateLength(name, 'name');
    if (lenErr) return res.status(400).json({ error: lenErr });
    if (description) {
      const dErr = validateLength(description, 'description');
      if (dErr) return res.status(400).json({ error: dErr });
    }
    if (client_id && !isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
    if (sow_id && !isValidUuid(sow_id)) return res.status(400).json({ error: 'Invalid sow_id' });
    try {
      const { rows } = await pool.query(
        `INSERT INTO teams (name, description, client_id, sow_id, colour)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [String(name).trim(), description || null, client_id || null, sow_id || null, colour || null]
      );
      await auditLog('team', rows[0].id, 'create', req.user.displayName, { name: String(name).trim(), client_id, sow_id });
      res.status(201).json(rows[0]);
    } catch (e) {
      log('error', 'Teams', 'Failed to create team', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /**
   * PATCH /api/teams/:id — Update team metadata. Admin only.
   * Allowed fields: name, description, client_id, sow_id, colour.
   */
  router.patch('/api/teams/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
    if ('name' in req.body && !String(req.body.name || '').trim()) {
      return res.status(400).json({ error: 'name cannot be empty' });
    }
    if (req.body.client_id && !isValidUuid(req.body.client_id)) {
      return res.status(400).json({ error: 'Invalid client_id' });
    }
    if (req.body.sow_id && !isValidUuid(req.body.sow_id)) {
      return res.status(400).json({ error: 'Invalid sow_id' });
    }
    // Normalise empties to NULL so client/sow can be cleared
    const body = { ...req.body };
    ['client_id', 'sow_id', 'description', 'colour'].forEach(k => {
      if (body[k] === '') body[k] = null;
    });
    if (body.name !== undefined) body.name = String(body.name).trim();
    const { updates, vals, nextIdx } = buildPatchQuery(body, ['name', 'description', 'client_id', 'sow_id', 'colour']);
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    updates.push('updated_at = NOW()');
    vals.push(req.params.id);
    try {
      const { rows } = await pool.query(
        `UPDATE teams SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
        vals
      );
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      await auditLog('team', req.params.id, 'update', req.user.displayName, { fields: Object.keys(req.body) });
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Teams', 'Failed to update team', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** DELETE /api/teams/:id — Remove a team. Members are removed via ON DELETE CASCADE. Admin only. */
  router.delete('/api/teams/:id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
    try {
      const { rowCount } = await pool.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      await auditLog('team', req.params.id, 'delete', req.user.displayName);
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Teams', 'Failed to delete team', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /**
   * POST /api/teams/:id/members — Add a user to the team. Admin only.
   * Body: { user_id, role? }
   */
  router.post('/api/teams/:id/members', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
    const { user_id, role } = req.body || {};
    if (!user_id || !isValidUuid(user_id)) return res.status(400).json({ error: 'Valid user_id required' });
    const memberRole = role && VALID_TEAM_ROLES.includes(role) ? role : 'member';
    try {
      // Verify team exists
      const { rows: teamRows } = await pool.query('SELECT id FROM teams WHERE id = $1', [req.params.id]);
      if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });
      // Verify user exists
      const { rows: userRows } = await pool.query('SELECT id FROM users WHERE id = $1', [user_id]);
      if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });
      const { rows } = await pool.query(
        `INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)
         ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role
         RETURNING *`,
        [req.params.id, user_id, memberRole]
      );
      await auditLog('team_member', rows[0].id, 'create', req.user.displayName, { team_id: req.params.id, user_id, role: memberRole });
      res.status(201).json(rows[0]);
    } catch (e) {
      log('error', 'Teams', 'Failed to add team member', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** PATCH /api/teams/:id/members/:user_id — Change a member's role. Admin only. */
  router.patch('/api/teams/:id/members/:user_id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
    if (!isValidUuid(req.params.user_id)) return res.status(400).json({ error: 'Invalid user_id' });
    const { role } = req.body || {};
    if (!role || !VALID_TEAM_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_TEAM_ROLES.join(', ')}` });
    }
    try {
      const { rows } = await pool.query(
        `UPDATE team_members SET role = $1 WHERE team_id = $2 AND user_id = $3 RETURNING *`,
        [role, req.params.id, req.params.user_id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Membership not found' });
      await auditLog('team_member', rows[0].id, 'update', req.user.displayName, { team_id: req.params.id, user_id: req.params.user_id, role });
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Teams', 'Failed to update team member role', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** DELETE /api/teams/:id/members/:user_id — Remove a member from a team. Admin only. */
  router.delete('/api/teams/:id/members/:user_id', requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid team ID' });
    if (!isValidUuid(req.params.user_id)) return res.status(400).json({ error: 'Invalid user_id' });
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM team_members WHERE team_id = $1 AND user_id = $2`,
        [req.params.id, req.params.user_id]
      );
      if (rowCount === 0) return res.status(404).json({ error: 'Membership not found' });
      await auditLog('team_member', req.params.id, 'delete', req.user.displayName, { team_id: req.params.id, user_id: req.params.user_id });
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Teams', 'Failed to remove team member', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
