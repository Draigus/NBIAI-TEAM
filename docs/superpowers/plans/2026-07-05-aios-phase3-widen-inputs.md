# AIOS Phase 3: Widen Inputs and Rhythm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the bank recompilation pipeline and leads tracker to the Signal Engine so intelligence and stale leads become actionable proposals, add a mid-day nudge for delta-only updates, and make the cadence runner self-healing with retry logic and incident actions on persistent failure.

**Architecture:** Phase 3 is mostly cadence prompt work on top of Phase 2 infrastructure. The Signal Engine CLI (`processSignal`), executor (with recipes), quality gates, outbound broker, and Slack bot are all live. New work: (1) a step in the recompile-banks prompt that routes delta items through `processSignal`, (2) a nightly lead-scan cadence task with a CLI for querying staleness and an email-draft executor recipe, (3) a mid-day nudge prompt at 14:00 that sends delta-only updates, (4) cadence runner retry logic with incident actions. Gmail OAuth is blocked -- email drafts route through Microsoft Graph (working connector).

**Tech Stack:** Node.js, PostgreSQL (`pg`), headless `claude -p`, Microsoft Graph connector (`~/.claude/connectors/lib/msgraph.js`), PowerShell (cadence runner), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-04-aios-signal-engine-design.md` (Phase 3 section, lines 332-341)

**Worktree rule:** This plan touches 4+ files in `dashboard-server/`. Execute in a worktree.

**Environment facts the engineer needs:**

- Repo root: `D:\OneDrive\Claude_code\NBIAI_TEAM`. Dashboard server: `dashboard-server/`.
- Signal Engine CLI: `dashboard-server/scripts/signal-engine-cli.js`. Exports `processSignal(pool, signalData)` -- takes fingerprint, signal_type, title, description, source_quote, confidence, risk_class, action_type, source_system, source_id, proposed_action, execution_recipe. Returns `{ action: 'created'|'enriched'|'skipped_rejected'|'skipped_closed', signal_id, action_id?, routing? }`.
- Executor: `dashboard-server/lib/executor.js`. `registerRecipe(type, handler)` pattern. Existing recipes: `task_create`, `initiative_build`, `research_brief`. Cron runs every 5 min.
- Leads table: `last_contacted DATE`, `next_followup_date DATE`, `stage_id UUID FK -> lead_pipeline_stages`. Index on `next_followup_date`. Staleness: OVERDUE >30d, AT_RISK 14-30d.
- Connectors: `C:\Users\gpbea\.claude\connectors\cli.js`. Microsoft Graph `sendEmail` is working. Gmail `createDraft` exists but blocked on Google OAuth credentials (Glen-side setup). Use msgraph for now.
- Cadence: `scripts/cadence/run-cadence.ps1 -Task <name>`. Prompts in `scripts/cadence/prompts/`. Model map: `scripts/cadence/model-map.json`. Routines registry: `company/routines.md`. State: `scripts/cadence/state/routine_runs.json`.
- Morning brief runs at 07:30 weekdays. Mid-day slot at 14:00 is free. Recompile-banks runs at 21:30 daily.
- Brain delta: `intelligence/synthesis/brain_delta.md` (regenerated 2026-07-05, clean). New delta items appended by recompile-banks.
- `settings` table `value` column is `jsonb` -- values must be JSON.stringify'd.

---

## Task 1: Bank recompile -> Signal Engine routing

**Files:**
- Modify: `scripts/cadence/prompts/recompile-banks.md`

Add a step after the brain_delta.md write that scans new delta items for client relevance and routes them through the Signal Engine CLI as proposals.

- [ ] **Step 1: Read the current recompile-banks prompt**

Read: `scripts/cadence/prompts/recompile-banks.md`
Find the step that writes brain_delta.md (step 4 or similar). The new step inserts AFTER it.

- [ ] **Step 2: Add the Signal Engine routing step**

After the step that writes/appends to `intelligence/synthesis/brain_delta.md`, add:

```markdown
N. ROUTE CLIENT-RELEVANT DELTA ITEMS THROUGH THE SIGNAL ENGINE.

For each new delta item you wrote in the previous step, assess: does this item have a SPECIFIC, NAMED client impact? (e.g. "Couch Heroes should audit loot boxes against PEGI 16" or "Brain says GBP 300K but actuals are GBP 360K for Couch Heroes"). Generic industry news without a named client stays bank-only -- do NOT create signals for it.

For each client-relevant item, run via Bash:
```
cd dashboard-server && node scripts/signal-engine-cli.js process-signal --json '<JSON>'
```

Use this mapping:
- Brain discrepancy (fact contradicts Brain) → signal_type: "process", action_type: "proposal", execution_recipe: { type: "brain_edit" }
- Client advisory opportunity (regulation/market change affects named client) → signal_type: "business", action_type: "proposal", execution_recipe: { type: "task_create" }
- Risk item (compliance deadline, client exposure) → signal_type: "risk", action_type: "risk", execution_recipe: { type: "task_create" }

Fingerprint format -- the prefix MUST be one of `person|topic|business|risk|process` (the signal registry's `validateFingerprint` rejects anything else). Use the prefix matching the signal_type, with the bank slug folded into the second segment:
- Business: `business:<entity_slug>:<topic_slug>` (e.g. `business:couch_heroes:pegi16_lootbox_audit`)
- Risk: `risk:<domain>:<issue_slug>` (e.g. `risk:compliance:pegi16_lootbox`)
- Process/Brain discrepancy: `process:brain_delta:<entity_topic_slug>` (e.g. `process:brain_delta:ch_revenue_figure`)

The source bank goes in `source_id` (the bank slug), NOT in the fingerprint.

Set source_system to "bank-recompilation", source_id to the bank slug, confidence based on source quality (web research with URL = high, single extract = medium).

If zero items are client-relevant, that is a valid outcome. Report: "Delta items routed: N signals created, M skipped (not client-relevant)."
```

- [ ] **Step 3: Commit**

```bash
git add scripts/cadence/prompts/recompile-banks.md
git commit -m "feat(aios): route bank delta items through Signal Engine for client-relevant proposals"
```

---

## Task 2: Stale-lead scan CLI + cadence task

**Files:**
- Create: `dashboard-server/scripts/lead-scan-cli.js`
- Create: `scripts/cadence/prompts/lead-scan.md`
- Modify: `scripts/cadence/model-map.json`
- Test: `dashboard-server/tests/unit/lead-scan-cli.test.mjs`

A nightly scan that queries leads for staleness and creates aios_actions with pre-written email draft content.

- [ ] **Step 1: Write the failing tests**

Create `dashboard-server/tests/unit/lead-scan-cli.test.mjs`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

function makeMockPool(queuedResults = []) {
  const queue = [...queuedResults];
  return {
    query: vi.fn(async () => {
      if (queue.length === 0) return { rows: [], rowCount: 0 };
      return queue.shift();
    }),
  };
}

describe('lead-scan-cli', () => {
  let cli;
  beforeEach(async () => {
    vi.resetModules();
    cli = require('../../scripts/lead-scan-cli');
  });

  describe('findStaleLeads', () => {
    it('returns leads overdue >30 days', async () => {
      const pool = makeMockPool([{
        rows: [
          { id: 'l-1', title: 'Jen MacLean', last_contacted: '2026-03-19', staleness: 'overdue', days_stale: 107, next_action: 'Follow up on GDC conversation', contact_email: 'jen@example.com', contact_name: 'Jen MacLean' },
        ],
        rowCount: 1,
      }]);
      const leads = await cli.findStaleLeads(pool);
      expect(leads).toHaveLength(1);
      expect(leads[0].staleness).toBe('overdue');
      expect(leads[0].days_stale).toBe(107);
    });

    it('returns empty array when no stale leads', async () => {
      const pool = makeMockPool([{ rows: [], rowCount: 0 }]);
      const leads = await cli.findStaleLeads(pool);
      expect(leads).toHaveLength(0);
    });
  });

  describe('buildFollowUpDraft', () => {
    it('generates email subject and body for a stale lead', () => {
      const draft = cli.buildFollowUpDraft({
        title: 'Jen MacLean',
        contact_name: 'Jen MacLean',
        next_action: 'Follow up on GDC conversation',
        days_stale: 107,
        last_contacted: '2026-03-19',
      });
      expect(draft.subject).toContain('Jen');
      expect(draft.body).toContain('GDC');
      expect(draft.to).toBeUndefined();
    });

    it('includes contact email when available', () => {
      const draft = cli.buildFollowUpDraft({
        title: 'Mike Palan',
        contact_name: 'Mike Palan',
        contact_email: 'mike@enoma.com',
        next_action: 'Enoma Capital intro',
        days_stale: 45,
      });
      expect(draft.to).toBe('mike@enoma.com');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/lead-scan-cli.test.mjs`
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement the lead-scan CLI**

Create `dashboard-server/scripts/lead-scan-cli.js`:

```javascript
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
             WHEN (CURRENT_DATE - l.last_contacted) > 14 THEN 'at_risk'
             ELSE 'active'
           END as staleness,
           COALESCE(CURRENT_DATE - l.last_contacted, 999) as days_stale
    FROM leads l
    JOIN lead_pipeline_stages s ON l.stage_id = s.id
    LEFT JOIN contacts c ON l.primary_contact_id = c.id
    WHERE s.is_closed = false
      AND (l.last_contacted IS NULL OR (CURRENT_DATE - l.last_contacted) > 14)
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
        const leadJson = process.argv[4];
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/lead-scan-cli.test.mjs`
Expected: ALL tests PASS.

- [ ] **Step 5: Write the cadence prompt**

Create `scripts/cadence/prompts/lead-scan.md`:

```markdown
# Lead Scan -- Nightly Stale-Lead Check

ROLE: You are the NBI AIOS lead scanner. Check the BD pipeline for stale leads and create follow-up draft actions.

RULES:
- British English only, no em dashes.
- Never fabricate contact details. If an email address is not in the leads data, leave the draft without a "to" address and flag it.
- Draft emails are TEMPLATES for Glen to personalise. Include a "[Glen: personalise this before sending]" marker in every draft body.
- Maximum 5 draft actions per run. If more leads are stale, prioritise by days_stale descending.

## Step 1: Find stale leads

Run via Bash:
```
cd dashboard-server && node scripts/lead-scan-cli.js find-stale
```

If the output is an empty array `[]`, report "No stale leads" and exit.

## Step 2: For each stale lead (max 5, most overdue first)

Generate a follow-up draft. Run via Bash:
```
cd dashboard-server && node scripts/lead-scan-cli.js build-draft '<lead JSON from step 1>'
```

Then create an aios_action for each draft. Run via Bash:
```
cd dashboard-server && node scripts/signal-engine-cli.js process-signal --json '{
  "fingerprint": "business:lead_<lead_id>:followup",
  "signal_type": "business",
  "title": "Follow-up draft for <contact_name> (<days_stale> days stale)",
  "description": "<next_action or context>",
  "source_quote": "Last contacted: <last_contacted>",
  "confidence": "high",
  "risk_class": "low",
  "action_type": "draft",
  "source_system": "lead-scan",
  "source_id": "<lead_id>",
  "proposed_action": "<draft subject + body summary>",
  "execution_recipe": {
    "type": "email_draft",
    "to": "<contact_email or null>",
    "subject": "<draft subject>",
    "body": "<draft body>",
    "lead_id": "<lead_id>"
  }
}'
```

If the CLI returns `{"action":"enriched"}`, the lead was already flagged in a previous scan. Skip it -- do not create duplicate draft actions.

## Step 3: Summary

Report: "Lead scan: N stale leads found, M draft actions created, K already flagged."

Commit state:
```
git add scripts/cadence/state/routine_runs.json && git commit -m "chore(cadence): lead-scan run [cadence]"
```
```

- [ ] **Step 6: Add model-map entry**

In `scripts/cadence/model-map.json`, add `"lead-scan": "claude-sonnet-4-6"` to the tasks object (this is mechanical work, Sonnet is fine).

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/scripts/lead-scan-cli.js dashboard-server/tests/unit/lead-scan-cli.test.mjs scripts/cadence/prompts/lead-scan.md scripts/cadence/model-map.json
git commit -m "feat(aios): stale-lead scan CLI and cadence task with follow-up draft actions"
```

---

## Task 3: Email draft executor recipe

**Files:**
- Modify: `C:\Users\gpbea\.claude\connectors\lib\msgraph.js` (add createDraft -- the connector has NO draft function today)
- Modify: `dashboard-server/lib/executor.js`
- Modify: `dashboard-server/tests/unit/executor-recipes.test.mjs`

Add an `email_draft` recipe to the executor that creates email DRAFTS (never sends) via the Microsoft Graph connector.

**CRITICAL (verified 2026-07-05):** `msgraph.js` exposes only `sendEmail`, which POSTs to `/sendMail` and sends immediately. There is NO `--draft` flag and NO draft function. Using `sendEmail` here would send unpersonalised follow-ups to real BD contacts, violating the spec's "drafts only, never sends" principle. The connector must gain a `createDraft` function first (Graph endpoint: `POST /users/{user}/messages` creates a message in the Drafts folder -- documented in the msgraph manifest as "not yet wrapped").

- [ ] **Step 1: Add createDraft to the msgraph connector**

In `C:\Users\gpbea\.claude\connectors\lib\msgraph.js`, READ the file first, then add after the `sendEmail` function (mirroring its parameter style):

```javascript
export async function createDraft(params) {
  const { to, subject, body: content, cc, bcc } = params;
  const user = USER();
  const message = {
    subject,
    body: { contentType: 'HTML', content: content || '' },
  };
  if (to) message.toRecipients = to.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
  if (cc) message.ccRecipients = cc.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
  if (bcc) message.bccRecipients = bcc.split(',').map(e => ({ emailAddress: { address: e.trim() } }));
  // POST /users/{user}/messages creates the message in the Drafts folder. It is NOT sent.
  return graphFetch(`/users/${user}/messages`, { method: 'POST', body: message });
}
```

The connectors CLI auto-discovers exports, so `node cli.js msgraph createDraft --to ... --subject ... --body ...` becomes available with no CLI changes.

Verify the action is discovered:
```powershell
node "C:\Users\gpbea\.claude\connectors\cli.js" msgraph
```
Expected: `"createDraft"` now appears in the actions array.

Live smoke test (creates a real draft in Glen's Drafts folder -- harmless, deletable):
```powershell
node "C:\Users\gpbea\.claude\connectors\cli.js" msgraph createDraft --to "Gpryer@nbi-consulting.com" --subject "AIOS draft smoke test - safe to delete" --body "Verifying createDraft lands in Drafts, not Sent."
```
Expected: JSON response with an `id` and `isDraft: true`. Confirm with Glen (or via searchEmail) that it is in Drafts and NOT in Sent Items before proceeding.

- [ ] **Step 2: Write the failing executor tests**

Append to `dashboard-server/tests/unit/executor-recipes.test.mjs`:

```javascript
  describe('email_draft recipe', () => {
    it('is registered', () => {
      expect(executor.getRecipeType({ execution_recipe: { type: 'email_draft' } })).toBe('email_draft');
    });

    it('builds a createDraft command (never sendEmail)', () => {
      const cmd = executor.buildDraftCommand({
        execution_recipe: {
          type: 'email_draft',
          to: 'jen@example.com',
          subject: 'Following up - Jen',
          body: 'Hi Jen, ...',
        },
      });
      expect(cmd).toContain('msgraph');
      expect(cmd).toContain('createDraft');
      expect(cmd).not.toContain('sendEmail');
      expect(cmd).toContain('jen@example.com');
      expect(cmd).toContain('Following up');
    });

    it('returns a no-recipient marker command when email is missing', () => {
      const cmd = executor.buildDraftCommand({
        execution_recipe: {
          type: 'email_draft',
          to: null,
          subject: 'Follow up',
          body: 'Draft body',
        },
      });
      expect(cmd).not.toContain('--to');
      expect(cmd).toContain('[NO RECIPIENT]');
    });
  });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/executor-recipes.test.mjs`
Expected: new tests FAIL (buildDraftCommand not exported).

- [ ] **Step 4: Implement the email draft recipe**

In `dashboard-server/lib/executor.js`, READ the file first, then add before the `module.exports` line:

```javascript
const CONNECTORS_CLI = 'C:\\Users\\gpbea\\.claude\\connectors\\cli.js';

function buildDraftCommand(action) {
  const recipe = action.execution_recipe || {};
  const to = recipe.to;
  const subject = recipe.subject || 'Follow up';
  const body = recipe.body || '';

  if (!to) {
    return `echo "[NO RECIPIENT] Draft prepared but no email address available. Subject: ${subject.replace(/"/g, '\\"')}"`;
  }

  const escapedSubject = subject.replace(/"/g, '\\"');
  const escapedBody = body.replace(/"/g, '\\"').replace(/\n/g, '<br>');
  return `node "${CONNECTORS_CLI}" msgraph createDraft --to "${to}" --subject "${escapedSubject}" --body "${escapedBody}"`;
}

async function executeEmailDraftRecipe(action, ctx) {
  const recipe = action.execution_recipe || {};
  if (!recipe.to) {
    return {
      success: true,
      recipe_type: 'email_draft',
      note: 'Draft action recorded but no recipient email available. Glen must add the email and send manually.',
      subject: recipe.subject,
    };
  }

  const cmd = buildDraftCommand(action);
  try {
    const { execSync } = require('child_process');
    const output = execSync(cmd, { cwd: ctx.repoRoot || '.', timeout: 30000, windowsHide: true });
    return {
      success: true,
      recipe_type: 'email_draft',
      to: recipe.to,
      subject: recipe.subject,
      output: output.toString().slice(0, 200),
    };
  } catch (err) {
    return { success: false, error: `Draft creation failed: ${err.message}` };
  }
}

registerRecipe('email_draft', executeEmailDraftRecipe);
```

Add `buildDraftCommand` to `module.exports`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/executor-recipes.test.mjs`
Expected: ALL tests PASS (existing + new).

- [ ] **Step 6: Commit**

Note: msgraph.js lives OUTSIDE this repo (in ~/.claude/connectors, which has its own git). Commit the two repos separately:

```bash
cd C:/Users/gpbea/.claude/connectors && git add lib/msgraph.js && git commit -m "feat(msgraph): createDraft -- POST /messages lands in Drafts folder, never sends"
```

```bash
git add dashboard-server/lib/executor.js dashboard-server/tests/unit/executor-recipes.test.mjs
git commit -m "feat(aios): email draft executor recipe via msgraph createDraft (drafts only, never sends)"
```

---

## Task 4: Mid-day nudge cadence task

**Files:**
- Create: `scripts/cadence/prompts/midday-nudge.md`
- Modify: `scripts/cadence/model-map.json`

A delta-only update at 14:00 -- only new items since the morning brief, max 4, suppressed when empty.

- [ ] **Step 1: Write the cadence prompt**

Create `scripts/cadence/prompts/midday-nudge.md`:

```markdown
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
• [Updated] Otto CTO plan — approved by Glen
• [Deadline] VS commit review — due tomorrow
```

Build Block Kit payload for any items that are pending approval (same button pattern as morning brief: aios_approve/aios_skip/aios_more with action UUID as value).

Send via the same broker path as the morning brief:
```
cd dashboard-server && node -e "
  const fs = require('fs');
  require('dotenv').config();
  const token = process.env.AIOS_INTERNAL_TOKEN;
  const glenId = process.env.GLEN_SLACK_USER_ID;
  const blocks = JSON.parse(fs.readFileSync('scripts/cadence/state/nudge_blocks.json', 'utf8'));
  const text = fs.readFileSync('scripts/cadence/state/nudge_text.txt', 'utf8').slice(0, 3000);
  (async () => {
    const actionRes = await fetch('http://localhost:8888/api/internal/aios/actions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-nbi-internal-token': token },
      body: JSON.stringify({ source_system: 'cadence', source_id: 'midday-nudge', action_type: 'task', title: 'Mid-day nudge - ' + new Date().toISOString().slice(0,10), approval_state: 'approved', created_by_routine: 'midday-nudge', idempotency_key: 'cadence:midday-nudge:' + new Date().toISOString().slice(0,10) })
    });
    const action = await actionRes.json();
    const sendRes = await fetch('http://localhost:8888/api/internal/aios/outbound/send-and-process', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-nbi-internal-token': token },
      body: JSON.stringify({ actionId: action.id, destinationType: 'slack_dm', destinationId: glenId, text, blocks, reason: 'Mid-day nudge (delta)' })
    });
    console.log('Nudge:', JSON.stringify(await sendRes.json()));
  })().catch(err => { console.error(err.message); process.exit(1); });
"
```

Write nudge_blocks.json BEFORE running this. Do NOT git add nudge_blocks.json or nudge_text.txt (transient state).

## Step 4: Summary

Output: "Mid-day nudge: N items sent" or "No delta -- suppressed."
```

- [ ] **Step 2: Add model-map entry**

Add `"midday-nudge": "claude-sonnet-4-6"` to `scripts/cadence/model-map.json`.

- [ ] **Step 3: Commit**

```bash
git add scripts/cadence/prompts/midday-nudge.md scripts/cadence/model-map.json
git commit -m "feat(aios): mid-day nudge cadence task -- delta-only Slack update at 14:00"
```

---

## Task 5: Cadence failure auto-repair

**Files:**
- Modify: `scripts/cadence/run-cadence.ps1`

Add retry logic for transient failures and incident-action creation for persistent failures.

- [ ] **Step 1: Read the current runner**

Read: `scripts/cadence/run-cadence.ps1`
Find the section where the Claude CLI is invoked and exit codes are handled (around lines 86-110).

- [ ] **Step 2: Add retry and incident logic**

After the `& claude -p $prompt --model $Model --permission-mode bypassPermissions` invocation and the exit-code capture, replace the simple success/failed recording with:

```powershell
$exitCode = $LASTEXITCODE
$status = 'success'

if ($exitCode -ne 0) {
    # Retry once for transient failures
    "[$(Get-Date -Format o)] WARN: task '$Task' failed (exit $exitCode), retrying once..." | Out-File $log -Append -Encoding utf8
    Start-Sleep -Seconds 10
    & claude -p $prompt --model $Model --permission-mode bypassPermissions 2>&1 |
        Out-File $log -Append -Encoding utf8
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        $status = 'failed'
        "[$(Get-Date -Format o)] ERROR: task '$Task' failed after retry (exit $exitCode)" | Out-File $log -Append -Encoding utf8

        # Create incident action via the internal API
        try {
            $incidentBody = @{
                source_system = 'cadence'
                source_id = $Task
                action_type = 'incident'
                title = "Cadence task '$Task' failed after retry (exit $exitCode)"
                description = "Check log: $log"
                risk_class = 'medium'
                confidence = 'high'
                idempotency_key = "cadence-failure:${Task}:$(Get-Date -Format 'yyyy-MM-dd')"
                created_by_routine = 'run-cadence'
            } | ConvertTo-Json -Compress
            $headers = @{
                'Content-Type' = 'application/json'
                'x-nbi-internal-token' = $env:AIOS_INTERNAL_TOKEN
            }
            if ($env:AIOS_INTERNAL_TOKEN) {
                Invoke-RestMethod -Uri 'http://localhost:8888/api/internal/aios/actions' -Method POST -Headers $headers -Body $incidentBody -ErrorAction SilentlyContinue | Out-Null
                "[$(Get-Date -Format o)] Incident action created for failed task '$Task'" | Out-File $log -Append -Encoding utf8
            }
        } catch {
            "[$(Get-Date -Format o)] WARN: could not create incident action: $($_.Exception.Message)" | Out-File $log -Append -Encoding utf8
        }
    } else {
        $status = 'success'
        "[$(Get-Date -Format o)] OK: task '$Task' succeeded on retry" | Out-File $log -Append -Encoding utf8
    }
}
```

This replaces the existing single-shot exit code handling. The existing `$status` variable and routine_runs.json update code remain unchanged.

- [ ] **Step 3: Test with a dry run**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cadence/run-cadence.ps1 -Task nonexistent-task -DryRun
```

Expected: exit 0 with DRYRUN output (the prompt-missing check fires before DryRun, but DryRun fires before the Claude invocation -- verify which takes precedence and adjust if needed).

- [ ] **Step 4: Commit**

```bash
git add scripts/cadence/run-cadence.ps1
git commit -m "feat(cadence): auto-retry on transient failure, incident actions on persistent failure"
```

---

## Task 6: Registration + E2E verification

**Files:**
- Modify: `company/routines.md` (add new tasks to registry)

- [ ] **Step 1: Update routines.md**

Read `company/routines.md` and add these entries to the Local cadence tasks table:

```markdown
| signal-engine | After intel-ingest (manual or scheduled) | Analyses new Granola meetings via LLM, extracts signals at all altitude levels, creates aios_actions proposals | aios_actions, aios_signals (DB) | Proposals surfaced in morning brief |
| lead-scan | Weekdays 20:00 | Scans BD pipeline for stale leads (>14 days), creates follow-up draft actions | aios_actions (DB) | Drafts surfaced in morning brief |
| midday-nudge | Weekdays 14:00 | Delta-only update: new actions since morning brief, deadline items. Suppressed when empty | nudge_blocks.json, nudge_text.txt (transient, not committed) | Slack DM to Glen (only if delta exists) |
```

- [ ] **Step 2: Run the lead-scan manually**

```powershell
cd d:\OneDrive\Claude_code\NBIAI_TEAM
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cadence/run-cadence.ps1 -Task lead-scan
```

Check the log for stale leads found and draft actions created. Verify in the database:

```powershell
cd dashboard-server && node -e "require('dotenv').config(); const { Pool } = require('pg'); const p = new Pool({ connectionString: process.env.DATABASE_URL }); p.query(\"SELECT title, action_type FROM aios_actions WHERE created_by_routine = 'signal-engine' AND action_type = 'draft' ORDER BY created_at DESC LIMIT 5\").then(r => { r.rows.forEach(a => console.log(a.action_type, '|', a.title)); p.end(); });"
```

- [ ] **Step 3: Run the mid-day nudge manually**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/cadence/run-cadence.ps1 -Task midday-nudge
```

If there are delta items (actions created/changed since 07:30 today), Glen should receive a Slack DM. If no delta, the log should say "No delta -- suppressed."

- [ ] **Step 4: Register Task Scheduler entries**

Create Windows Task Scheduler entries for the new tasks (Glen or Glen-supervised):

```powershell
# Signal Engine -- after intel-ingest, ~19:30
schtasks /Create /TN "NBI\signal-engine" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\OneDrive\Claude_code\NBIAI_TEAM\scripts\cadence\run-cadence.ps1 -Task signal-engine" /SC DAILY /ST 19:30 /F

# Lead scan -- weekdays 20:00
schtasks /Create /TN "NBI\lead-scan" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\OneDrive\Claude_code\NBIAI_TEAM\scripts\cadence\run-cadence.ps1 -Task lead-scan" /SC WEEKLY /D MON,TUE,WED,THU,FRI /ST 20:00 /F

# Mid-day nudge -- weekdays 14:00
schtasks /Create /TN "NBI\midday-nudge" /TR "powershell -NoProfile -ExecutionPolicy Bypass -File D:\OneDrive\Claude_code\NBIAI_TEAM\scripts\cadence\run-cadence.ps1 -Task midday-nudge" /SC WEEKLY /D MON,TUE,WED,THU,FRI /ST 14:00 /F
```

- [ ] **Step 5: Commit routines update**

```bash
git add company/routines.md
git commit -m "docs(routines): register signal-engine, lead-scan, midday-nudge cadence tasks"
```

---

## Acceptance Criteria (from spec)

1. **Stale lead -> approvable draft:** A lead overdue >30 days produces an aios_action with pre-written email draft. On approval, the executor creates the draft via Microsoft Graph (or records it for manual send if no email address).
2. **Intelligence with client relevance -> proposal:** A bank recompilation finding a client-relevant fact produces an aios_action proposal via the Signal Engine.
3. **Nudge sends only on delta days:** The mid-day nudge sends a Slack DM only when actions have been created/changed since the morning brief. On quiet days, it suppresses.
4. **Level-up produces buildable proposal:** The Monday LEVEL-UP section in the morning brief already handles this (implemented in Phase 1). No code change needed -- the spec's "weekly session log analysis proposing one automation" is already built into the brief prompt.

## Dependency Notes

- Task 1 is independent (prompt-only change).
- Tasks 2-3 are sequential: lead-scan CLI (T2) -> email draft recipe (T3).
- Task 4 is independent (new prompt, no code deps).
- Task 5 is independent (runner change).
- Task 6 depends on all others (E2E verification).

Parallelism: Tasks 1, 4, 5 can run in parallel. Tasks 2-3 are sequential. Task 6 runs last.

## Out of Scope (Phase 4)

- Voice at the desk
- Gmail as engine input (blocked on Google OAuth)
- Calendar integration
- Slack ingestion (blocked on user-level token)
- Switching email drafts from Microsoft Graph to Gmail (deferred until OAuth setup)
