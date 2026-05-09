module.exports = function(ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, isValidUuid, getClientScopes, auditLog, log } = ctx;

  // ==================== CALENDAR EVENTS ====================
  // Personal/team/business calendar events that show up in the calendar view
  // alongside tasks. Visibility model:
  //   private  — only the owner (and admin)
  //   team     — everyone in the team
  //   client   — team plus anyone whose assigned tasks share the event's client
  //   public   — everyone
  // Event types: vacation, sick_leave, bank_holiday, uto, business, other.

  // firm_closed (2026-04-15, Glen): admin-only event type representing an
  // NBI-wide closure. Distinct from bank_holiday which is UK statutory.
  const VALID_EVENT_TYPES = ['vacation', 'sick_leave', 'bank_holiday', 'firm_closed', 'uto', 'business', 'other'];
  const ADMIN_ONLY_EVENT_TYPES = ['firm_closed'];
  const VALID_EVENT_VISIBILITY = ['private', 'team', 'client', 'public'];

  /**
   * Build the WHERE clause (and params) that enforces visibility for the
   * current user. Admins see everything. Regular users see:
   *   - their own events, regardless of visibility
   *   - any event marked team or public
   *   - any client-scoped event whose client_id matches a client the user is
   *     assigned to via at least one task (assignees array contains displayName)
   */
  async function buildCalendarVisibilityClause(req, startParamIdx) {
    if (req.user?.role === 'admin') return { clause: 'TRUE', params: [], nextIdx: startParamIdx };
    // Resolve the user's assigned clients via tasks.assignees.
    // Failure is logged (code review M9) but tolerated — a DB hiccup here should degrade
    // to "no client matches" rather than bring the calendar view down.
    let assignedClientIds = [];
    let memberTeamIds = [];
    try {
      const { rows } = await pool.query(
        `SELECT DISTINCT client_id FROM tasks WHERE $1 = ANY(assignees) AND client_id IS NOT NULL`,
        [req.user?.displayName || '']
      );
      assignedClientIds = rows.map(r => r.client_id);
    } catch (e) {
      log('warn', 'Calendar', 'Failed to resolve assigned clients for visibility; falling back to owner/team/public only', {
        error: e.message,
        user: req.user?.displayName
      });
    }
    // Resolve teams this user belongs to — needed so team events (user_id is
    // null, team_id set) are visible to every member of that team.
    try {
      const { rows } = await pool.query(
        `SELECT team_id FROM team_members WHERE user_id = $1`,
        [req.user?.id || null]
      );
      memberTeamIds = rows.map(r => r.team_id);
    } catch (e) {
      log('warn', 'Calendar', 'Failed to resolve team memberships for visibility', { error: e.message });
    }

    const params = [];
    let i = startParamIdx;
    // Owner clause
    params.push(req.user?.id || null);
    const ownerIdx = i++;
    // Visibility list — applies only to events WITHOUT a team_id. An event
    // that's tagged to a team is only visible to that team's members, even
    // if visibility is 'team' or 'public'. This matches the user-mental
    // model: tagging an event to a team means "this is team-private".
    params.push(['team', 'public']);
    const visListIdx = i++;
    let clause = `(user_id = $${ownerIdx} OR (team_id IS NULL AND visibility = ANY($${visListIdx}::text[]))`;
    if (assignedClientIds.length > 0) {
      params.push(assignedClientIds);
      const clientListIdx = i++;
      clause += ` OR (visibility = 'client' AND client_id = ANY($${clientListIdx}::uuid[]))`;
    }
    if (memberTeamIds.length > 0) {
      params.push(memberTeamIds);
      const teamListIdx = i++;
      clause += ` OR team_id = ANY($${teamListIdx}::uuid[])`;
    }
    clause += ')';
    return { clause, params, nextIdx: i };
  }

  /** GET /api/calendar-events?from=YYYY-MM-DD&to=YYYY-MM-DD&user_id=&client_id= — List events with visibility enforcement */
  router.get('/api/calendar-events', async (req, res) => {
    const { from, to } = req.query;
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!from || !to || !dateRe.test(from) || !dateRe.test(to)) {
      return res.status(400).json({ error: 'from and to (YYYY-MM-DD) are required' });
    }
    try {
      // Date range overlap: an event overlaps [from, to] when
      //   start_date <= to AND COALESCE(end_date, start_date) >= from
      const params = [from, to];
      let i = 3;
      let where = `(ce.start_date <= $2::date AND COALESCE(ce.end_date, ce.start_date) >= $1::date)`;

      if (req.query.user_id) {
        if (!isValidUuid(req.query.user_id)) return res.status(400).json({ error: 'Invalid user_id' });
        params.push(req.query.user_id);
        where += ` AND ce.user_id = $${i++}`;
      }
      if (req.query.client_id) {
        if (!isValidUuid(req.query.client_id)) return res.status(400).json({ error: 'Invalid client_id' });
        params.push(req.query.client_id);
        where += ` AND ce.client_id = $${i++}`;
      }
      // team_id filter — return all events from any user in the given team.
      if (req.query.team_id) {
        if (!isValidUuid(req.query.team_id)) return res.status(400).json({ error: 'Invalid team_id' });
        try {
          const memberRows = await pool.query(
            'SELECT user_id FROM team_members WHERE team_id = $1',
            [req.query.team_id]
          );
          const memberIds = memberRows.rows.map(r => r.user_id);
          if (memberIds.length === 0) {
            return res.json([]);
          }
          params.push(memberIds);
          where += ` AND ce.user_id = ANY($${i++}::uuid[])`;
        } catch (e) {
          log('error', 'Calendar', 'Failed to resolve team members for filter', { error: e.message });
          return res.status(500).json({ error: 'An internal error occurred' });
        }
      }

      const vis = await buildCalendarVisibilityClause(req, i);
      const sql = `
        SELECT ce.*, u.display_name AS user_display_name, c.name AS client_name, t.name AS team_name
        FROM calendar_events ce
        LEFT JOIN users u ON u.id = ce.user_id
        LEFT JOIN clients c ON c.id = ce.client_id
        LEFT JOIN teams t ON t.id = ce.team_id
        WHERE ${where} AND ${vis.clause}
        ORDER BY ce.start_date ASC, ce.created_at ASC
      `;
      const { rows } = await pool.query(sql, [...params, ...vis.params]);
      res.json(rows);
    } catch (e) {
      log('error', 'Calendar', 'Failed to list calendar events', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** GET /api/calendar-events/:id — Fetch one event, respecting visibility */
  router.get('/api/calendar-events/:id', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid event ID' });
    try {
      const vis = await buildCalendarVisibilityClause(req, 2);
      const { rows } = await pool.query(
        `SELECT ce.*, u.display_name AS user_display_name, c.name AS client_name, t.name AS team_name
         FROM calendar_events ce
         LEFT JOIN users u ON u.id = ce.user_id
         LEFT JOIN clients c ON c.id = ce.client_id
         LEFT JOIN teams t ON t.id = ce.team_id
         WHERE ce.id = $1 AND ${vis.clause}`,
        [req.params.id, ...vis.params]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Event not found' });
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Calendar', 'Failed to fetch calendar event', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** POST /api/calendar-events — Create a new event. Regular users create for themselves;
   *  admins may target any user. If team_id is provided the event is a team event —
   *  user_id becomes null and the event applies to all members of that team.
   *  Non-admins can only create team events for teams they are a member of. */
  router.post('/api/calendar-events', async (req, res) => {
    const { title, event_type, start_date, end_date, client_id, visibility, description, team_id } = req.body || {};
    if (!title || typeof title !== 'string') return res.status(400).json({ error: 'title is required' });
    if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) return res.status(400).json({ error: 'Invalid event_type' });
    if (ADMIN_ONLY_EVENT_TYPES.includes(event_type) && req.user?.role !== 'admin') {
      return res.status(403).json({ error: `Only admins can create ${event_type} events` });
    }
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (!start_date || !dateRe.test(start_date)) return res.status(400).json({ error: 'start_date (YYYY-MM-DD) is required' });
    if (end_date && !dateRe.test(end_date)) return res.status(400).json({ error: 'Invalid end_date' });
    if (end_date && end_date < start_date) return res.status(400).json({ error: 'end_date must be on or after start_date' });
    const vis = visibility && VALID_EVENT_VISIBILITY.includes(visibility) ? visibility : 'team';
    if (client_id && !isValidUuid(client_id)) return res.status(400).json({ error: 'Invalid client_id' });
    if (team_id && !isValidUuid(team_id)) return res.status(400).json({ error: 'Invalid team_id' });

    // Team event path — user_id is null, team_id points to the target team
    let userId = req.user?.id;
    let teamId = null;
    if (team_id) {
      teamId = team_id;
      const { rows: teamRows } = await pool.query('SELECT id FROM teams WHERE id = $1', [team_id]);
      if (teamRows.length === 0) return res.status(404).json({ error: 'Team not found' });
      if (req.user?.role !== 'admin') {
        const { rows: membership } = await pool.query(
          'SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2',
          [team_id, req.user?.id]
        );
        if (membership.length === 0) return res.status(403).json({ error: 'Only team members or admins can create team events' });
      }
      userId = null; // team event — not tied to a single user
    } else if (req.body?.user_id && req.body.user_id !== userId) {
      // Admin creating for another specific user
      if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Only admin can create events for other users' });
      if (!isValidUuid(req.body.user_id)) return res.status(400).json({ error: 'Invalid user_id' });
      userId = req.body.user_id;
    }

    try {
      const { rows } = await pool.query(
        `INSERT INTO calendar_events (user_id, team_id, title, event_type, start_date, end_date, client_id, visibility, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [userId, teamId, title.trim().slice(0, 255), event_type, start_date, end_date || null, client_id || null, vis, description || null]
      );
      await auditLog('calendar_event', rows[0].id, 'create', req.user?.displayName, { title, event_type, team_id: teamId });
      res.status(201).json(rows[0]);
    } catch (e) {
      log('error', 'Calendar', 'Failed to create calendar event', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** PATCH /api/calendar-events/:id — Update an event. Owner or admin only. */
  router.patch('/api/calendar-events/:id', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid event ID' });
    const { rows: existing } = await pool.query('SELECT * FROM calendar_events WHERE id = $1', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Event not found' });
    const ev = existing[0];
    if (req.user?.role !== 'admin' && ev.user_id !== req.user?.id) {
      return res.status(403).json({ error: 'Only the owner or an admin can edit this event' });
    }

    const allowed = ['title', 'event_type', 'start_date', 'end_date', 'client_id', 'visibility', 'description', 'team_id'];
    const updates = [];
    const params = [];
    let i = 1;
    for (const k of allowed) {
      if (k in req.body) {
        if (k === 'event_type' && req.body[k] && !VALID_EVENT_TYPES.includes(req.body[k])) return res.status(400).json({ error: 'Invalid event_type' });
        if (k === 'event_type' && ADMIN_ONLY_EVENT_TYPES.includes(req.body[k]) && req.user?.role !== 'admin') {
          return res.status(403).json({ error: `Only admins can set event_type to ${req.body[k]}` });
        }
        if (k === 'visibility' && req.body[k] && !VALID_EVENT_VISIBILITY.includes(req.body[k])) return res.status(400).json({ error: 'Invalid visibility' });
        if ((k === 'start_date' || k === 'end_date') && req.body[k] && !/^\d{4}-\d{2}-\d{2}$/.test(req.body[k])) return res.status(400).json({ error: `Invalid ${k}` });
        if (k === 'client_id' && req.body[k] && !isValidUuid(req.body[k])) return res.status(400).json({ error: 'Invalid client_id' });
        if (k === 'team_id' && req.body[k] && !isValidUuid(req.body[k])) return res.status(400).json({ error: 'Invalid team_id' });
        updates.push(`${k} = $${i++}`);
        params.push(req.body[k] === '' ? null : req.body[k]);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    updates.push(`updated_at = NOW()`);
    params.push(req.params.id);
    try {
      const { rows } = await pool.query(
        `UPDATE calendar_events SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
        params
      );
      await auditLog('calendar_event', req.params.id, 'update', req.user?.displayName, req.body);
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Calendar', 'Failed to update calendar event', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  /** DELETE /api/calendar-events/:id — Delete an event. Owner or admin only. Returns 404 on missing. */
  router.delete('/api/calendar-events/:id', async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid event ID' });
    const { rows: existing } = await pool.query('SELECT user_id FROM calendar_events WHERE id = $1', [req.params.id]);
    if (existing.length === 0) return res.status(404).json({ error: 'Event not found' });
    if (req.user?.role !== 'admin' && existing[0].user_id !== req.user?.id) {
      return res.status(403).json({ error: 'Only the owner or an admin can delete this event' });
    }
    await pool.query('DELETE FROM calendar_events WHERE id = $1', [req.params.id]);
    await auditLog('calendar_event', req.params.id, 'delete', req.user?.displayName);
    res.json({ ok: true });
  });

  return router;
};
