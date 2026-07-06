'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { Pool } = require('pg');

async function findStaleLeads(pool) {
  const { rows } = await pool.query(`
    SELECT l.id, l.title, l.last_contacted, l.next_followup_date, l.next_action,
           l.deal_owner, l.notes,
           c.name as contact_name, c.email as contact_email,
           CASE
             WHEN l.last_contacted IS NULL OR (CURRENT_DATE - l.last_contacted) > 30 THEN 'overdue'
             WHEN (CURRENT_DATE - l.last_contacted) >= 14 THEN 'at_risk'
             ELSE 'active'
           END as staleness,
           COALESCE(CURRENT_DATE - l.last_contacted, 999) as days_stale
    FROM leads l
    JOIN lead_pipeline_stages s ON l.stage_id = s.id
    LEFT JOIN contacts c ON l.primary_contact_id = c.id
    WHERE s.is_closed = false
      AND (l.last_contacted IS NULL OR (CURRENT_DATE - l.last_contacted) >= 14)
    ORDER BY COALESCE(CURRENT_DATE - l.last_contacted, 999) DESC
  `);
  return rows;
}

function buildFollowUpDraft(lead) {
  const name = lead.contact_name || lead.title;
  const firstName = name.split(' ')[0];
  const context = lead.next_action || 'our last conversation';
  const daysSince = lead.days_stale || 'some time';

  const subject = `Following up - ${firstName}`;
  const body = [
    `Hi ${firstName},`,
    '',
    `I wanted to follow up on ${context}. It has been a while since we last connected${lead.last_contacted ? ` (${lead.last_contacted})` : ''} and I wanted to check in on where things stand.`,
    '',
    '[Glen: personalise this before sending]',
    '',
    'Best regards,',
    'Glen',
  ].join('\n');

  const draft = { subject, body };
  if (lead.contact_email) draft.to = lead.contact_email;
  return draft;
}

async function main() {
  const [,, command] = process.argv;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    switch (command) {
      case 'find-stale': {
        const leads = await findStaleLeads(pool);
        console.log(JSON.stringify(leads, null, 2));
        break;
      }
      case 'build-draft': {
        const leadJson = process.argv[3];
        if (!leadJson) { console.error('Usage: lead-scan-cli.js build-draft <json>'); process.exit(1); }
        const draft = buildFollowUpDraft(JSON.parse(leadJson));
        console.log(JSON.stringify(draft));
        break;
      }
      default:
        console.error('Usage: lead-scan-cli.js find-stale | build-draft <json>');
        process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });

module.exports = { findStaleLeads, buildFollowUpDraft };
