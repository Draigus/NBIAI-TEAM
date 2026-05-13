const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://nbiai:NbiAi2026!SecureDb@localhost:5432/nbi_dashboard' });

async function run() {
  try {
    const stats = await pool.query(
      "SELECT c.id as client_id, c.name as client_name," +
      " COUNT(*) FILTER (WHERE t.status NOT IN ('Done','Cancelled')) as active_tasks," +
      " COUNT(*) FILTER (WHERE t.status = 'Done') as done_tasks," +
      " COUNT(*) as total_tasks," +
      " COUNT(*) FILTER (WHERE t.item_type = 'project' AND t.status NOT IN ('Done','Cancelled')) as active_projects," +
      " COUNT(*) FILTER (WHERE t.due_date IS NOT NULL AND t.due_date != '' AND t.due_date::date < CURRENT_DATE AND t.status NOT IN ('Done','Cancelled')) as overdue_count," +
      " COUNT(*) FILTER (WHERE (t.health_state = 'Blocked' OR t.status = 'Blocked') AND t.status NOT IN ('Done','Cancelled')) as blocked_count," +
      " COUNT(*) FILTER (WHERE t.health_state = 'Red' AND t.status NOT IN ('Done','Cancelled')) as at_risk_count," +
      " COUNT(*) FILTER (WHERE t.health_state = 'Yellow' AND t.status NOT IN ('Done','Cancelled')) as yellow_count" +
      " FROM tasks t JOIN clients c ON c.id = t.client_id GROUP BY c.id, c.name ORDER BY c.name"
    );
    console.log('=== CLIENT_STATS ===');
    console.log(JSON.stringify(stats.rows, null, 2));

    const msCols = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name='milestones' ORDER BY ordinal_position"
    );
    console.log('=== MS_SCHEMA ===');
    console.log(JSON.stringify(msCols.rows));

    const ms = await pool.query(
      "SELECT m.id, m.title, m.target_date, c.name as client_name" +
      " FROM milestones m JOIN clients c ON c.id = m.client_id" +
      " ORDER BY m.target_date ASC NULLS LAST"
    );
    console.log('=== MILESTONES ===');
    console.log(JSON.stringify(ms.rows, null, 2));

    const wl = await pool.query(
      "SELECT unnest(t.assignees) as person, COUNT(*) as task_count" +
      " FROM tasks t WHERE t.status NOT IN ('Done','Cancelled')" +
      " AND array_length(t.assignees, 1) > 0 GROUP BY person ORDER BY task_count DESC"
    );
    console.log('=== WORKLOAD ===');
    console.log(JSON.stringify(wl.rows, null, 2));

    const totals = await pool.query(
      "SELECT" +
      " COUNT(DISTINCT t.client_id) FILTER (WHERE t.status NOT IN ('Done','Cancelled')) as active_clients," +
      " COUNT(*) FILTER (WHERE t.item_type = 'project' AND t.status NOT IN ('Done','Cancelled')) as active_projects_total," +
      " COUNT(*) FILTER (WHERE t.status NOT IN ('Done','Cancelled')) as active_tasks_total," +
      " COUNT(*) FILTER (WHERE t.status = 'Done') as done_total," +
      " COUNT(*) as all_total," +
      " COUNT(*) FILTER (WHERE t.due_date IS NOT NULL AND t.due_date != '' AND t.due_date::date < CURRENT_DATE AND t.status NOT IN ('Done','Cancelled')) as overdue_total," +
      " COUNT(*) FILTER (WHERE (t.health_state = 'Blocked' OR t.status = 'Blocked') AND t.status NOT IN ('Done','Cancelled')) as blocked_total," +
      " COUNT(*) FILTER (WHERE t.health_state = 'Red' AND t.status NOT IN ('Done','Cancelled')) as at_risk_total" +
      " FROM tasks t"
    );
    console.log('=== TOTALS ===');
    console.log(JSON.stringify(totals.rows, null, 2));

    const attn = await pool.query(
      "SELECT t.id, t.title, t.status, t.health_state, t.due_date, t.assignees, t.item_type," +
      " c.name as client_name, p.title as parent_title" +
      " FROM tasks t JOIN clients c ON c.id = t.client_id LEFT JOIN tasks p ON p.id = t.parent_id" +
      " WHERE t.status NOT IN ('Done','Cancelled')" +
      " AND (t.health_state IN ('Blocked', 'Red') OR t.status = 'Blocked' OR (t.due_date IS NOT NULL AND t.due_date != '' AND t.due_date::date < CURRENT_DATE))" +
      " ORDER BY CASE WHEN t.health_state = 'Blocked' OR t.status = 'Blocked' THEN 0" +
      " WHEN t.due_date IS NOT NULL AND t.due_date != '' AND t.due_date::date < CURRENT_DATE THEN 1 ELSE 2 END, t.due_date ASC NULLS LAST LIMIT 10"
    );
    console.log('=== ATTENTION ===');
    console.log(JSON.stringify(attn.rows, null, 2));

    const completing = await pool.query(
      "WITH pp AS (" +
      " SELECT t.id, t.title, t.item_type, c.name as client_name, t.health_state," +
      " COUNT(*) FILTER (WHERE child.status = 'Done') as done_children," +
      " COUNT(*) as total_children" +
      " FROM tasks t JOIN clients c ON c.id = t.client_id" +
      " LEFT JOIN tasks child ON child.parent_id = t.id" +
      " WHERE t.item_type IN ('project','feature') AND t.status NOT IN ('Done','Cancelled')" +
      " GROUP BY t.id, t.title, t.item_type, c.name, t.health_state HAVING COUNT(*) > 1" +
      ") SELECT *, ROUND(done_children::numeric / total_children * 100) as pct FROM pp" +
      " WHERE ROUND(done_children::numeric / total_children * 100) BETWEEN 60 AND 99 ORDER BY pct DESC LIMIT 6"
    );
    console.log('=== COMPLETING ===');
    console.log(JSON.stringify(completing.rows, null, 2));

    const teamByClient = await pool.query(
      "SELECT DISTINCT c.name as client_name, unnest(t.assignees) as person" +
      " FROM tasks t JOIN clients c ON c.id = t.client_id" +
      " WHERE t.status NOT IN ('Done','Cancelled') AND array_length(t.assignees, 1) > 0" +
      " ORDER BY c.name, person"
    );
    console.log('=== TEAM_BY_CLIENT ===');
    console.log(JSON.stringify(teamByClient.rows, null, 2));

    let leads;
    try {
      leads = await pool.query("SELECT COUNT(*) as cnt FROM leads WHERE stage NOT IN ('Won','Lost','Archived')");
    } catch(e) {
      leads = { rows: [{ cnt: 0 }] };
    }
    console.log('=== LEADS ===');
    console.log(JSON.stringify(leads.rows, null, 2));

  } catch(e) { console.error('ERROR:', e.message); }
  pool.end();
}
run();
