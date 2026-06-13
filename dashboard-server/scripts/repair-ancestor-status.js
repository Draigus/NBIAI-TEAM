// scripts/repair-ancestor-status.js
//
// One-off data repair for bug c2c2b046: ancestors stuck at 'Not started'
// while a descendant is active (Planning / In progress / In Review / Drafted).
// The activation roll-up now prevents new occurrences; this fixes history.
//
// Dry run (default):  node scripts/repair-ancestor-status.js
// Apply:              node scripts/repair-ancestor-status.js --apply
//
// Rule mirrors lib/status-cascade.js: ancestor gets 'Planning' when its most
// advanced active descendant is Planning, otherwise 'In progress'. Only rows
// currently at 'Not started' are touched.

require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const APPLY = process.argv.includes('--apply');

(async () => {
  // For every 'Not started' task, find its active descendants (if any).
  const { rows } = await pool.query(`
    WITH RECURSIVE rel AS (
      SELECT id AS ancestor_id, id AS node_id FROM tasks
      UNION ALL
      SELECT rel.ancestor_id, t.id FROM tasks t JOIN rel ON t.parent_id = rel.node_id
    )
    SELECT a.id, a.title, a.item_type,
           BOOL_OR(d.status IN ('In progress', 'In Review', 'Drafted')) AS has_strong,
           BOOL_OR(d.status = 'Planning') AS has_planning,
           COUNT(*) FILTER (WHERE d.status IN ('Planning', 'In progress', 'In Review', 'Drafted')) AS active_descendants
    FROM tasks a
    JOIN rel ON rel.ancestor_id = a.id AND rel.node_id != a.id
    JOIN tasks d ON d.id = rel.node_id
    WHERE a.status = 'Not started'
    GROUP BY a.id, a.title, a.item_type
    HAVING COUNT(*) FILTER (WHERE d.status IN ('Planning', 'In progress', 'In Review', 'Drafted')) > 0
    ORDER BY a.title
  `);

  if (rows.length === 0) {
    console.log('No inconsistent ancestors found. Nothing to do.');
  } else {
    console.log(`${rows.length} 'Not started' ancestor(s) with active descendants:`);
    for (const r of rows) {
      const target = r.has_strong ? 'In progress' : 'Planning';
      console.log(`  [${r.item_type}] "${r.title}" (${r.id}) — ${r.active_descendants} active descendant(s) -> ${target}`);
      if (APPLY) {
        await pool.query(
          "UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 AND status = 'Not started'",
          [target, r.id]
        );
      }
    }
    console.log(APPLY ? 'Applied.' : 'Dry run only — re-run with --apply to write changes.');
  }
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
