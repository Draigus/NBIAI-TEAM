'use strict';

// Pure logic for the Slack bot: authorisation, block building, button handling,
// dispatch prompt construction. No Bolt imports here -- keeps it unit-testable.

const SLACK_TEXT_CAP = 3500;

function isAuthorised(event, glenSlackUserId) {
  if (!glenSlackUserId) return false;
  return event.user === glenSlackUserId && event.channel_type === 'im';
}

function buildActionBlocks(action) {
  const risk = action.risk_class ? ` · risk: ${action.risk_class}` : '';
  return [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${action.title}*\n_${action.action_type}${risk}_` },
    },
    {
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: 'Approve' }, style: 'primary', action_id: 'aios_approve', value: action.id },
        { type: 'button', text: { type: 'plain_text', text: 'Skip' }, action_id: 'aios_skip', value: action.id },
        { type: 'button', text: { type: 'plain_text', text: 'Tell me more' }, action_id: 'aios_more', value: action.id },
      ],
    },
  ];
}

async function handleButtonAction({ pool, verb, actionId }) {
  if (verb === 'approve') {
    const { rows } = await pool.query(
      `UPDATE aios_actions SET approval_state = 'approved', feedback_signal = 'approved_unchanged', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [actionId]
    );
    if (rows.length === 0) return { ok: false, message: 'Action not found (already handled elsewhere?)' };
    return { ok: true, message: `Approved: ${rows[0].title}. Recorded. (Execution engine lands in Phase 2 -- this records your decision.)` };
  }
  if (verb === 'skip') {
    const { rows } = await pool.query(
      `UPDATE aios_actions SET approval_state = 'rejected', feedback_signal = 'rejected_not_worth', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [actionId]
    );
    if (rows.length === 0) return { ok: false, message: 'Action not found (already handled elsewhere?)' };
    return { ok: true, message: `Skipped: ${rows[0].title}.` };
  }
  if (verb === 'more') {
    const { rows } = await pool.query('SELECT * FROM aios_actions WHERE id = $1', [actionId]);
    if (rows.length === 0) return { ok: false, message: 'Action not found.' };
    const a = rows[0];
    const parts = [
      `*${a.title}*`,
      a.description ? `Why: ${a.description}` : null,
      a.proposed_action ? `Proposed: ${a.proposed_action}` : null,
      a.source_quote ? `Source quote: "${a.source_quote}"` : null,
      `Source: ${a.source_system}${a.source_id ? ' / ' + a.source_id : ''}`,
    ].filter(Boolean);
    return { ok: true, message: parts.join('\n') };
  }
  return { ok: false, message: `Unknown verb: ${verb}` };
}

function buildDispatchPrompt(question) {
  return [
    'You are the NBI AIOS Slack bot answering a direct message from Glen Pryer.',
    'Ground your answer: read NBI_Brain.md first, and any brain/ module or intelligence/banks/ file the topic requires.',
    'Rules: British English, never use em dashes, be direct and concise (this is a Slack message, aim under 2500 characters).',
    'Never fabricate. If you cannot verify a fact from the repo or Brain, say "unverified" rather than guessing.',
    'Do not write to session logs or any repo file. Read-only research, then answer.',
    '',
    `Glen's message: ${question}`,
  ].join('\n');
}

function truncateForSlack(text) {
  if (text.length <= SLACK_TEXT_CAP) return text;
  return text.slice(0, SLACK_TEXT_CAP - 11) + '[truncated]';
}

module.exports = { isAuthorised, buildActionBlocks, handleButtonAction, buildDispatchPrompt, truncateForSlack };
