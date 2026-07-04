'use strict';

// Pure logic for the Slack bot: authorisation, block building, button handling,
// dispatch prompt construction. No Bolt imports here -- keeps it unit-testable.

const SLACK_TEXT_CAP = 3500;
const ACK_TEXT = 'On it -- give me up to a minute.';
const TRANSCRIPT_MSG_CAP = 2000;   // per-message char cap in the transcript
const TRANSCRIPT_TOTAL_CAP = 10000; // total transcript char cap

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

// Turn Slack history messages into a compact labelled transcript for the
// dispatch prompt. Oldest first; drops the triggering message, ack noise, and
// empty texts; truncates long messages; drops oldest first when over budget.
function buildTranscript(messages, { glenId, excludeTs } = {}) {
  const usable = (messages || [])
    .filter(m => m && typeof m.text === 'string' && m.text.trim())
    .filter(m => m.ts !== excludeTs)
    .filter(m => m.text.trim() !== ACK_TEXT)
    .sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

  const lines = usable.map(m => {
    const who = m.user === glenId ? 'Glen' : 'WorkSage';
    let text = m.text.trim();
    if (text.length > TRANSCRIPT_MSG_CAP) text = text.slice(0, TRANSCRIPT_MSG_CAP) + ' [truncated]';
    return `${who}: ${text}`;
  });

  // Keep the most recent lines within the total budget
  const kept = [];
  let total = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (total + lines[i].length + 1 > TRANSCRIPT_TOTAL_CAP) break;
    kept.unshift(lines[i]);
    total += lines[i].length + 1;
  }
  return kept.join('\n');
}

function buildDispatchPrompt(question, transcript) {
  const parts = [
    'You are the NBI AIOS Slack bot answering a direct message from Glen Pryer.',
    'Ground your answer: read NBI_Brain.md first, and any brain/ module or intelligence/banks/ file the topic requires.',
    'Rules: British English, never use em dashes, be direct and concise (this is a Slack message, aim under 2500 characters).',
    'Never fabricate. If you cannot verify a fact from the repo or Brain, say "unverified" rather than guessing.',
    'Do not write to session logs or any repo file. Read-only research, then answer.',
  ];
  if (transcript) {
    parts.push(
      '',
      'Conversation so far (most recent Slack messages in this DM, oldest first). Glen\'s new message below responds to this context -- do not ask him to repeat it:',
      transcript
    );
  }
  parts.push('', `Glen's message: ${question}`);
  return parts.join('\n');
}

// Per-channel FIFO queue so concurrent DM dispatches answer in the order asked.
function createChannelQueue() {
  const tails = new Map();
  return {
    enqueue(channel, task) {
      const tail = tails.get(channel) || Promise.resolve();
      const run = tail.then(() => task());
      // The stored tail swallows rejection so one failure never breaks the chain;
      // callers still see the rejection via the returned promise.
      tails.set(channel, run.catch(() => {}));
      return run;
    },
  };
}

function truncateForSlack(text) {
  if (text.length <= SLACK_TEXT_CAP) return text;
  return text.slice(0, SLACK_TEXT_CAP - 11) + '[truncated]';
}

module.exports = {
  isAuthorised, buildActionBlocks, handleButtonAction, buildDispatchPrompt, truncateForSlack,
  buildTranscript, createChannelQueue, ACK_TEXT,
};
