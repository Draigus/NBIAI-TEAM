# Mid-Day Nudge -- Delta-Only Update

ROLE: You are the NBI AIOS mid-day nudge. Send a brief Slack DM to Glen ONLY if something has changed since the morning brief. If nothing changed, do not send anything.

RULES:
- British English only, no em dashes.
- Maximum 4 items. If more exist, show the 4 most urgent and note "N more in the queue."
- If NOTHING has changed since the morning brief, output "No delta -- suppressed" and exit. Do NOT send a Slack message.
- This is a nudge, not a brief. One line per item, no sections.

## Step 1: Check for delta

Run via Bash to find actions created or status-changed since 07:30 today:
```
cd dashboard-server && node -e "
  require('dotenv').config();
  const { Pool } = require('pg');
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  const today = new Date().toISOString().slice(0,10);
  p.query(\`SELECT id, title, action_type, approval_state, risk_class, created_at, updated_at
    FROM aios_actions
    WHERE (created_at > (CURRENT_DATE + INTERVAL '7 hours 30 minutes')
       OR (updated_at > (CURRENT_DATE + INTERVAL '7 hours 30 minutes') AND updated_at != created_at))
    ORDER BY
      CASE risk_class WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
      created_at DESC
    LIMIT 10\`)
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); p.end(); });
"
```

If the result is an empty array `[]`, output "No delta -- suppressed" and exit immediately. Do NOT proceed to step 2.

## Step 2: Also check for deadline items

Run via Bash:
```
cd dashboard-server && node -e "
  require('dotenv').config();
  const { Pool } = require('pg');
  const p = new Pool({ connectionString: process.env.DATABASE_URL });
  p.query(\`SELECT id, title, due_date FROM tasks
    WHERE due_date != '' AND due_date::date <= CURRENT_DATE + INTERVAL '1 day'
    AND status NOT IN ('Done', 'Cancelled')
    ORDER BY due_date ASC LIMIT 5\`)
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); p.end(); });
"
```

## Step 3: Format and send (only if step 1 returned items)

Build a short message (max 4 items, one line each):
```
Since this morning:
• [New] Follow-up draft for Jen MacLean (107d stale) [Approve] [Skip]
• [Updated] Otto CTO plan, approved by Glen
• [Deadline] VS commit review, due tomorrow
```

Build Block Kit payload for any items that are pending approval (same button pattern as morning brief: aios_approve/aios_skip/aios_more with action UUID as value).

Send via the same broker path as the morning brief:
```
node -e "
  const fs = require('fs');
  const dotenv = require('dotenv');
  dotenv.config({ path: 'dashboard-server/.env' });
  const token = process.env.AIOS_INTERNAL_TOKEN;
  const glenId = process.env.GLEN_SLACK_USER_ID;
  if (!token || !glenId) { console.error('Missing AIOS_INTERNAL_TOKEN or GLEN_SLACK_USER_ID'); process.exit(1); }
  const blocks = JSON.parse(fs.readFileSync('scripts/cadence/state/nudge_blocks.json', 'utf8'));
  const text = fs.readFileSync('scripts/cadence/state/nudge_text.txt', 'utf8').slice(0, 3000);
  const date = new Date().toISOString().slice(0, 10);
  const base = 'http://localhost:8888';
  const headers = { 'Content-Type': 'application/json', 'x-nbi-internal-token': token };
  (async () => {
    const actionRes = await fetch(base + '/api/internal/aios/actions', {
      method: 'POST', headers,
      body: JSON.stringify({ source_system: 'cadence', source_id: 'midday-nudge', action_type: 'task', title: 'Mid-day nudge - ' + date, approval_state: 'approved', created_by_routine: 'midday-nudge', idempotency_key: 'cadence:midday-nudge:' + date })
    });
    const action = await actionRes.json();
    if (!action.id) { console.error('Action create failed:', JSON.stringify(action)); process.exit(1); }
    const sendRes = await fetch(base + '/api/internal/aios/outbound/send-and-process', {
      method: 'POST', headers,
      body: JSON.stringify({ actionId: action.id, destinationType: 'slack_dm', destinationId: glenId, text, blocks, reason: 'Mid-day nudge (delta)' })
    });
    console.log('Nudge:', JSON.stringify(await sendRes.json()));
  })().catch(err => { console.error(err.message); process.exit(1); });
"
```

Write nudge_blocks.json BEFORE running this. Do NOT git add nudge_blocks.json or nudge_text.txt (transient state).

## Step 4: Summary

Output: "Mid-day nudge: N items sent" or "No delta -- suppressed."
