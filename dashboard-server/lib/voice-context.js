'use strict';

// Read-only WorkSage snapshot for the voice worker's prompt. The voice brain
// has NO tools; this block is the only data it sees, so keep it compact
// (~600 tokens) and factual. Schema verified live 2026-07-08.

const DEFAULT_TIMEOUT_MS = 1500;

// tasks.priority casing is inconsistent in production data ('Urgent', 'High',
// 'high', 'medium', '', ...) so ordering must normalise.
const WORK_ITEMS_SQL = `
  SELECT t.title, t.item_type, t.status, t.priority, t.due_date, c.name AS client
    FROM tasks t
    LEFT JOIN clients c ON c.id = t.client_id
   WHERE t.status IN ('In progress', 'Blocked', 'In Review')
   ORDER BY CASE lower(coalesce(t.priority, ''))
              WHEN 'urgent' THEN 0 WHEN 'high' THEN 1
              WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END,
            t.updated_at DESC
   LIMIT 12`;

// end_date is NULL for single-day events (see routes/calendar.js); COALESCE matches production behaviour.
const EVENTS_SQL = `
  SELECT title, event_type, start_date::text, end_date::text
    FROM calendar_events
   WHERE start_date <= CURRENT_DATE + 1 AND COALESCE(end_date, start_date) >= CURRENT_DATE
   ORDER BY start_date
   LIMIT 10`;

const BUG_COUNTS_SQL = `
  SELECT status, count(*)::int AS n
    FROM bug_reports
   WHERE status <> 'resolved'
   GROUP BY status`;

const BUG_NEWEST_SQL = `
  SELECT title FROM bug_reports
   WHERE status = 'open'
   ORDER BY created_at DESC
   LIMIT 3`;

const LEADS_SQL = `
  SELECT l.title, l.next_followup_date::text, l.next_action, s.name AS stage
    FROM leads l
    JOIN lead_pipeline_stages s ON s.id = l.stage_id
   WHERE l.completed_at IS NULL AND s.is_closed = false
     AND l.next_followup_date <= CURRENT_DATE
   ORDER BY l.next_followup_date
   LIMIT 5`;

function describeWorkItem(t) {
  const details = [t.status];
  if (t.priority) details.push(t.priority);
  if (t.client) details.push(t.client);
  if (t.due_date) details.push(`due ${t.due_date}`);
  return `- [${t.item_type}] ${t.title} (${details.join(', ')})`;
}

function formatSnapshot({ work, events, bugCounts, bugNewest, leads }) {
  const time = new Date().toTimeString().slice(0, 5);
  const lines = [`WorkSage snapshot as of ${time}:`, ''];

  lines.push('Active work items, highest priority first:');
  if (work.length === 0) lines.push('- no work items in progress');
  else work.forEach(t => lines.push(describeWorkItem(t)));

  lines.push('', 'Meetings and events today and tomorrow:');
  if (events.length === 0) lines.push('- no meetings or events');
  else events.forEach(e => lines.push(`- ${e.title} (${e.event_type}, ${e.start_date})`));

  lines.push('', 'Bug tracker:');
  if (bugCounts.length === 0) lines.push('- no open bugs');
  else {
    lines.push('- ' + bugCounts.map(b => `${b.status}: ${b.n}`).join(', '));
    bugNewest.forEach(b => lines.push(`- newest open: ${b.title}`));
  }

  lines.push('', 'Leads needing follow-up:');
  if (leads.length === 0) lines.push('- no leads needing follow-up');
  else leads.forEach(l => lines.push(
    `- ${l.title} (${l.stage}, follow up ${l.next_followup_date}${l.next_action ? ': ' + l.next_action : ''})`));

  return lines.join('\n');
}

// Resolves to the snapshot text, or null on any failure or timeout: a voice
// turn must never fail because the snapshot did.
async function buildVoiceContext(pool, { log = () => {}, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`snapshot exceeded ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    const [work, events, bugCounts, bugNewest, leads] = await Promise.race([
      Promise.all([
        pool.query(WORK_ITEMS_SQL),
        pool.query(EVENTS_SQL),
        pool.query(BUG_COUNTS_SQL),
        pool.query(BUG_NEWEST_SQL),
        pool.query(LEADS_SQL),
      ]),
      timeout,
    ]);
    return formatSnapshot({
      work: work.rows,
      events: events.rows,
      bugCounts: bugCounts.rows,
      bugNewest: bugNewest.rows,
      leads: leads.rows,
    });
  } catch (err) {
    log('warn', 'Voice', 'Snapshot build failed, turn proceeds without data', { error: err.message });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { buildVoiceContext };
