'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, requireAdmin, requireNBI, addBusinessDays } = ctx;

  // ==================== RESOURCE PLANNING ====================

  /** GET /api/resource-planning/capacity — Per-user weekly capacity vs committed hours (8 weeks forward) */
  router.get('/api/resource-planning/capacity', async (req, res) => {
    const weeks = parseInt(req.query.weeks) || 8;
    const users = (await pool.query('SELECT id, username, display_name, capacity_hours_per_week, resource_type_ids FROM users ORDER BY display_name')).rows;
    const activeTasks = (await pool.query(
      `SELECT t.assignees, t.hours_estimated, t.start_date, t.end_date, t.due_date, t.status, t.created_at
       FROM tasks t WHERE t.status NOT IN ('Done', 'Cancelled')`
    )).rows;

    // Build week ranges starting from current Monday
    // JS getDay(): 0=Sun, 1=Mon..6=Sat. Offset formula maps any day back to its Monday.
    const now = new Date(); now.setHours(0,0,0,0);
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Sunday wraps to previous Monday
    const startMonday = new Date(now); startMonday.setDate(now.getDate() + mondayOffset);

    const weekRanges = [];
    for (let w = 0; w < weeks; w++) {
      const wStart = new Date(startMonday); wStart.setDate(startMonday.getDate() + w * 7);
      const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
      weekRanges.push({ start: wStart, end: wEnd, label: wStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) });
    }

    // Fetch time-off entries covering the capacity window
    const windowStart = weekRanges[0].start.toISOString().slice(0,10);
    const windowEnd = weekRanges[weekRanges.length - 1].end.toISOString().slice(0,10);

    const timeOffRows = (await pool.query(
      'SELECT user_id, start_date, end_date FROM time_off WHERE end_date >= $1 AND start_date <= $2',
      [windowStart, windowEnd]
    )).rows;
    const timeOffByUser = {};
    timeOffRows.forEach(r => {
      if (!timeOffByUser[r.user_id]) timeOffByUser[r.user_id] = [];
      timeOffByUser[r.user_id].push({ start: new Date(r.start_date), end: new Date(r.end_date) });
    });

    // Count business days (Mon-Fri) of time-off overlapping a given week
    function countTimeOffDays(entries, weekStart, weekEnd) {
      if (!entries || entries.length === 0) return 0;
      let days = 0;
      for (const e of entries) {
        const overlapStart = e.start > weekStart ? e.start : weekStart;
        const overlapEnd = e.end < weekEnd ? e.end : weekEnd;
        for (let d = new Date(overlapStart); d <= overlapEnd; d.setDate(d.getDate() + 1)) {
          const dow = d.getDay();
          if (dow >= 1 && dow <= 5) days++;
        }
      }
      return days;
    }

    // For each user, calculate committed hours per week
    // Build name variants for partial-match (e.g. "Glen" matches "Glen Pryer")
    const userNameVariants = {};
    users.forEach(u => {
      const dn = (u.display_name || '').toLowerCase();
      const parts = dn.split(/\s+/);
      userNameVariants[u.id] = [dn, ...parts]; // full name + each word
    });
    const result = users.map(u => {
      const variants = userNameVariants[u.id] || [];
      const userTimeOff = timeOffByUser[u.id] || [];
      const userWeeks = weekRanges.map(wr => {
        let committed = 0;
        activeTasks.forEach(t => {
          if (!t.assignees) return;
          const matched = t.assignees.some(a => {
            const al = a.toLowerCase().trim();
            return al === (u.display_name || '').toLowerCase() || variants.includes(al) || al.startsWith(variants[0]) || variants[0].startsWith(al);
          });
          if (!matched) return;
          const taskStart = t.start_date ? new Date(t.start_date + 'T00:00:00') : new Date(t.created_at);
          const taskEnd = t.end_date ? new Date(t.end_date + 'T00:00:00') : t.due_date ? new Date(t.due_date + 'T00:00:00') : new Date(taskStart.getTime() + 14 * 24 * 60 * 60 * 1000);
          if (taskEnd < wr.start || taskStart > wr.end) return;
          const taskWeeks = Math.max(1, Math.ceil((taskEnd - taskStart) / (7 * 24 * 60 * 60 * 1000)));
          const hrsPerWeek = (t.hours_estimated || 0) / taskWeeks;
          committed += hrsPerWeek;
        });
        const baseCapacity = u.capacity_hours_per_week || 40;
        const offDays = countTimeOffDays(userTimeOff, wr.start, wr.end);
        const hrsPerDay = baseCapacity / 5;
        const capacity = Math.max(0, baseCapacity - offDays * hrsPerDay);
        return {
          label: wr.label,
          start: wr.start.toISOString().slice(0,10),
          committed: Math.round(committed * 10) / 10,
          capacity: Math.round(capacity * 10) / 10,
          utilisation: capacity > 0 ? Math.round(committed / capacity * 100) : 0,
          timeOffDays: offDays,
        };
      });
      return {
        id: u.id, name: u.display_name, username: u.username,
        capacityPerWeek: u.capacity_hours_per_week || 40,
        resourceTypeIds: u.resource_type_ids || [],
        weeks: userWeeks,
      };
    });

    res.json({ users: result, weekLabels: weekRanges.map(w => w.label) });
  });

  /** GET /api/resource-planning/deal-readiness/:leadId — Check if we can staff a lead's required roles */
  router.get('/api/resource-planning/deal-readiness/:leadId', async (req, res) => {
    // Get lead's resource requirements
    const resources = (await pool.query(
      `SELECT lr.resource_type_id, lr.quantity, rt.name as role_name
       FROM lead_resources lr JOIN lead_resource_types rt ON lr.resource_type_id = rt.id
       WHERE lr.lead_id = $1`, [req.params.leadId]
    )).rows;

    if (resources.length === 0) return res.json({ canStaff: true, readiness: [], message: 'No resource requirements defined' });

    // Get all users with their resource type mappings
    const users = (await pool.query('SELECT id, display_name, resource_type_ids, capacity_hours_per_week FROM users')).rows;

    const readiness = resources.map(r => {
      // Find users who have this resource type in their skills
      const qualified = users.filter(u => (u.resource_type_ids || []).includes(r.resource_type_id));
      return {
        role: r.role_name,
        needed: r.quantity,
        available: qualified.length,
        canFill: qualified.length >= r.quantity,
        users: qualified.map(u => ({ id: u.id, name: u.display_name })),
      };
    });

    const canStaff = readiness.every(r => r.canFill);
    res.json({ canStaff, readiness });
  });

  return router;
};
