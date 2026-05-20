# ATS Spec C: Intelligence Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reporting, notifications, and workflow automation on top of the ATS data layer — metrics endpoints, stage-change notifications, stall reminders, rejection reasons, email templates, and onboarding checklist.

**Architecture:** Migration 049 adds rejection columns, email templates table, and onboarding checklist table. Three new route files (`hiring-metrics.js`, `hiring-templates.js`, `onboarding-checklist.js`) keep the code focused. A notification helper in `hiring.js` fires on stage change. A new cron function checks for stalled candidates daily. `sendEmailAsync` gains reply-to support. The hiring route context in `server.js` gets `createNotification`, `sendEmailAsync`, `EMAIL_FROM` added.

**Tech Stack:** Node.js + Express 4, PostgreSQL, node-cron, Microsoft Graph API (email), Vitest + supertest.

**Spec:** `docs/superpowers/specs/2026-05-20-ats-spec-c-intelligence-layer.md`

**Deferred problems resolved in this plan:**
- Problem #2: `createNotification` takes `username` — resolved by looking up username from display name in stage_assignees
- Problem #3: Hiring route context missing notification/email deps — resolved by expanding `server.js:441` mount call
- Problem #9: Notification deep-link `#hiring/candidate/{uuid}` — set in notification `link` field
- Problem #12: `sendEmailAsync` no reply-to — resolved by adding `replyTo` to Graph API payload

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `dashboard-server/migrations/049_intelligence_layer.sql` | Create | Rejection columns on candidates, email templates table, onboarding checklist table, onboarding template on positions |
| `dashboard-server/lib/email.js` | Modify | Add `replyTo` support to Graph API payload |
| `dashboard-server/routes/hiring.js` | Modify | Add rejection fields to PATCH allowed list + enforcement, add stage-change notification helper |
| `dashboard-server/routes/hiring-metrics.js` | Create | Time-in-stage, time-to-hire, pipeline health endpoints |
| `dashboard-server/routes/hiring-templates.js` | Create | Email template CRUD + send endpoint |
| `dashboard-server/routes/onboarding-checklist.js` | Create | Onboarding checklist item CRUD |
| `dashboard-server/cron/index.js` | Modify | Add `checkHiringStalls` daily cron function |
| `dashboard-server/server.js` | Modify | Expand hiring route context, mount 3 new routes |
| `dashboard-server/tests/unit/intelligence-layer.test.mjs` | Create | Tests for metrics, rejection, templates, onboarding, stalls |
| `dashboard-server/tests/helpers/fixtures.js` | Modify | Add email template and onboarding item factories |
| `nbi_project_dashboard.html` | Modify | Metrics sub-view, rejection modal, email template UI, onboarding checklist UI, notification click handlers |

---

## Task 1: Migration 049

**Files:**
- Create: `dashboard-server/migrations/049_intelligence_layer.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 049_intelligence_layer.sql
-- Rejection reasons, email templates, onboarding checklist

-- Rejection tracking on candidates
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS rejection_category TEXT;

-- Email templates for candidate communications
CREATE TABLE IF NOT EXISTS hiring_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  trigger_stage TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_het_client ON hiring_email_templates(client_id);

-- Onboarding checklist items per candidate
CREATE TABLE IF NOT EXISTS onboarding_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_oci_candidate ON onboarding_checklist_items(candidate_id);

-- Onboarding checklist template on positions
ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS onboarding_template JSONB DEFAULT NULL;
```

- [ ] **Step 2: Apply to test and prod DBs**

```
cd dashboard-server && npm run init-db
```
```javascript
node -e "require('dotenv').config();const {Pool}=require('pg');const fs=require('fs');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(fs.readFileSync('migrations/049_intelligence_layer.sql','utf8')).then(()=>{console.log('049 applied');p.end()}).catch(e=>{console.error(e);p.end()})"
```

- [ ] **Step 3: Commit**

```
git add dashboard-server/migrations/049_intelligence_layer.sql
git commit -m "feat(ats): migration 049 — rejection reasons, email templates, onboarding checklist"
```

---

## Task 2: Add reply-to to `sendEmailAsync`

**Files:**
- Modify: `dashboard-server/lib/email.js:38-45`

- [ ] **Step 1: Add replyTo to Graph API payload**

In `_sendViaGraph`, after `toRecipients` in the message body (line 42), add:

```javascript
  const body = {
    message: {
      subject: mailOptions.subject,
      body: { contentType: mailOptions.html ? 'HTML' : 'Text', content: mailOptions.html || mailOptions.text || '' },
      toRecipients,
      ...(mailOptions.replyTo ? { replyTo: [{ emailAddress: { address: mailOptions.replyTo } }] } : {}),
    },
    saveToSentItems: false
  };
```

- [ ] **Step 2: Commit**

```
git add dashboard-server/lib/email.js
git commit -m "feat(email): add replyTo support to Graph API sendMail"
```

---

## Task 3: Expand Hiring Route Context + Test Fixtures

**Files:**
- Modify: `dashboard-server/server.js:441`
- Modify: `dashboard-server/tests/helpers/fixtures.js`

- [ ] **Step 1: Expand hiring route mount context**

At `server.js:441`, change:
```javascript
app.use(require('./routes/hiring')({ pool, log, requireAdmin, requireNBI, isValidUuid, validateLength, auditLog, upload, uploadDir, shiftForInsert, reorderInGroup, buildPatchQuery }));
```
to:
```javascript
app.use(require('./routes/hiring')({ pool, log, requireAdmin, requireNBI, isValidUuid, validateLength, auditLog, upload, uploadDir, shiftForInsert, reorderInGroup, buildPatchQuery, createNotification, sendEmailAsync, EMAIL_FROM }));
```

- [ ] **Step 2: Add test fixtures**

Add to `fixtures.js`:

```javascript
async function createTestEmailTemplate(opts = {}) {
  const { rows } = await pool.query(
    `INSERT INTO hiring_email_templates (client_id, name, subject, body, trigger_stage)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [
      opts.client_id || null,
      opts.name || 'Test Template',
      opts.subject || 'Test Subject',
      opts.body || 'Hello {{candidate_name}}',
      opts.trigger_stage || null,
    ]
  );
  return rows[0];
}

async function createTestOnboardingItem(opts = {}) {
  if (!opts.candidate_id) throw new Error('createTestOnboardingItem: candidate_id required');
  const { rows } = await pool.query(
    `INSERT INTO onboarding_checklist_items (candidate_id, title, completed, completed_at, completed_by, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      opts.candidate_id,
      opts.title || 'Test item',
      opts.completed || false,
      opts.completed_at || null,
      opts.completed_by || null,
      opts.sort_order || 0,
    ]
  );
  return rows[0];
}
```

Add both to exports.

- [ ] **Step 3: Run tests to confirm no regressions**

```
cd dashboard-server && npm test
```

- [ ] **Step 4: Commit**

```
git add dashboard-server/server.js dashboard-server/tests/helpers/fixtures.js
git commit -m "feat(ats): expand hiring route context + intelligence layer fixtures"
```

---

## Task 4: Rejection Enforcement + Rejection Fields

**Files:**
- Modify: `dashboard-server/routes/hiring.js`
- Create: `dashboard-server/tests/unit/intelligence-layer.test.mjs`

- [ ] **Step 1: Write failing tests**

Create `dashboard-server/tests/unit/intelligence-layer.test.mjs`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const request = require('supertest');
const { pool, truncate } = require('../helpers/db.js');
const { mintSession } = require('../helpers/auth.js');
const { createTestUser, createTestClient, createTestCandidate, createTestHiringPosition, createTestEmailTemplate, createTestOnboardingItem } = require('../helpers/fixtures.js');
const app = require('../../server.js');

beforeEach(async () => { await truncate(); });

const VALID_REJECTION_CATEGORIES = ['unqualified', 'culture-mismatch', 'compensation', 'candidate-withdrew', 'position-filled', 'no-response', 'failed-interview', 'other'];

describe('Rejection enforcement', () => {
  it('requires rejection_category when archiving a non-terminal candidate', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Alice', stage: 'interviews' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ archived_at: new Date().toISOString() })
      .expect(400);
  });

  it('accepts archiving with rejection_category', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Bob', stage: 'interviews' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ archived_at: new Date().toISOString(), rejection_category: 'unqualified', rejection_reason: 'Lacks required experience' })
      .expect(200);

    expect(res.body.rejection_category).toBe('unqualified');
    expect(res.body.rejection_reason).toBe('Lacks required experience');
  });

  it('does NOT require rejection when archiving at terminal stage (onboarded)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Carla', stage: 'onboarded' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ archived_at: new Date().toISOString() })
      .expect(200);
  });

  it('rejects invalid rejection_category', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'Dan', stage: 'sourcing' });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ archived_at: new Date().toISOString(), rejection_category: 'bad-vibes' })
      .expect(400);
  });
});
```

- [ ] **Step 2: Add rejection fields to PATCH**

In `hiring.js` PATCH handler, add `rejection_reason` and `rejection_category` to the `buildPatchQuery` allowed fields list.

Add `rejection_category` validation before `buildPatchQuery`:

```javascript
    const VALID_REJECTION_CATEGORIES = ['unqualified', 'culture-mismatch', 'compensation', 'candidate-withdrew', 'position-filled', 'no-response', 'failed-interview', 'other'];
    if (body.rejection_category !== undefined && body.rejection_category !== null) {
      if (!VALID_REJECTION_CATEGORIES.includes(body.rejection_category)) {
        return res.status(400).json({ error: `Invalid rejection_category. Must be one of: ${VALID_REJECTION_CATEGORIES.join(', ')}` });
      }
    }
```

Add rejection enforcement BEFORE `buildPatchQuery`. This checks `req.body` directly (not `body`) since it runs before the body copy:

```javascript
    // Rejection enforcement: require rejection_category when archiving a non-terminal candidate
    if (body.archived_at && body.archived_at !== null) {
      const terminalStage = HIRING_STAGES[HIRING_STAGES.length - 1]; // 'onboarded'
      // Determine the candidate's current or target stage
      const archiveStage = body.stage || null;
      // If archiving with a stage change to terminal, no rejection needed
      if (archiveStage !== terminalStage) {
        // Need to check current stage if no stage change in this request
        if (!archiveStage) {
          const { rows: [current] } = await pool.query('SELECT stage FROM candidates WHERE id = $1', [req.params.id]);
          if (current && current.stage !== terminalStage && !body.rejection_category) {
            return res.status(400).json({ error: 'Rejection category required when archiving a candidate' });
          }
        } else if (!body.rejection_category) {
          return res.status(400).json({ error: 'Rejection category required when archiving a candidate' });
        }
      }
    }
```

- [ ] **Step 3: Add rejection fields to GET SELECT**

In the candidates GET SELECT, add `ca.rejection_reason, ca.rejection_category` after the existing GDPR fields.

- [ ] **Step 4: Run tests**

```
cd dashboard-server && npx vitest run tests/unit/intelligence-layer.test.mjs
```

- [ ] **Step 5: Run full suite**

```
cd dashboard-server && npm test
```

- [ ] **Step 6: Commit**

```
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/intelligence-layer.test.mjs
git commit -m "feat(ats): rejection enforcement + rejection fields on candidate PATCH"
```

---

## Task 5: Stage-Change Notifications

**Files:**
- Modify: `dashboard-server/routes/hiring.js`

This resolves Problems #2, #3, and #9.

- [ ] **Step 1: Write failing tests**

Append to `intelligence-layer.test.mjs`:

```javascript
describe('Stage-change notifications', () => {
  it('creates notification for stage assignees when candidate moves stages', async () => {
    const admin = await createTestUser({ role: 'admin', username: 'admin_notif' });
    const assignee = await createTestUser({ role: 'member', display_name: 'Assignee User', username: 'assignee_notif' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({
      name: 'Notification Test',
      stage: 'sourcing',
      stage_assignees: JSON.stringify({ interviews: [assignee.display_name] }),
    });

    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'interviews' })
      .expect(200);

    const { rows } = await pool.query(
      "SELECT * FROM notifications WHERE username = $1 AND type = 'hiring_stage_change'",
      [assignee.username]
    );
    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].link).toContain(candidate.id);
  });
});
```

- [ ] **Step 2: Add notification helper to hiring.js**

Destructure `createNotification` from `ctx` at the top of the hiring module (it was added to the context in Task 3):

```javascript
  const {
    pool, log, requireAdmin, requireNBI,
    isValidUuid, validateLength, auditLog,
    upload, uploadDir,
    shiftForInsert, reorderInGroup,
    buildPatchQuery,
    createNotification, sendEmailAsync, EMAIL_FROM,
  } = ctx;
```

Add a helper function after the existing validation helpers:

```javascript
  async function notifyStageAssignees(candidateId, candidateName, newStage, clientName) {
    try {
      const { rows: [candidate] } = await pool.query('SELECT stage_assignees FROM candidates WHERE id = $1', [candidateId]);
      if (!candidate || !candidate.stage_assignees) return;
      const assignees = candidate.stage_assignees[newStage];
      if (!Array.isArray(assignees) || assignees.length === 0) return;
      const stageLabel = HIRING_STAGE_LABELS ? HIRING_STAGE_LABELS[newStage] : newStage;
      const title = `${candidateName} moved to ${stageLabel}${clientName ? ` (${clientName})` : ''}`;
      const link = `#hiring/candidate/${candidateId}`;
      for (const displayName of assignees) {
        const { rows: [user] } = await pool.query('SELECT username FROM users WHERE display_name = $1 AND is_active = true LIMIT 1', [displayName]);
        if (user) {
          await createNotification(user.username, 'hiring_stage_change', title, '', link);
        }
      }
    } catch (e) {
      log('error', 'Hiring', 'Failed to send stage-change notifications', { error: e.message });
    }
  }
```

Note: the `HIRING_STAGE_LABELS` constant is only on the frontend, not in this server file. Use a simple labels map:

```javascript
  const STAGE_LABELS = { sourcing: 'Sourcing', interviews: 'Interviews', offer: 'Offer', onboarding: 'Onboarding', onboarded: 'Onboarded' };
```

And reference `STAGE_LABELS[newStage] || newStage` in the helper.

- [ ] **Step 3: Call notification helper after stage transitions**

In the PATCH handler, after the transaction COMMIT (after line 583) and before the auditLog call (line 592), add:

```javascript
    // Fire stage-change notifications (non-blocking, after commit)
    if (wantsReorder && body.stage !== undefined) {
      const { rows: [freshCandidate] } = await pool.query('SELECT name, client_id FROM candidates WHERE id = $1', [req.params.id]);
      if (freshCandidate) {
        const { rows: [client] } = freshCandidate.client_id
          ? await pool.query('SELECT name FROM clients WHERE id = $1', [freshCandidate.client_id])
          : { rows: [null] };
        notifyStageAssignees(req.params.id, freshCandidate.name || 'Candidate', body.stage, client ? client.name : null);
      }
    }
```

- [ ] **Step 4: Run tests**

```
cd dashboard-server && npx vitest run tests/unit/intelligence-layer.test.mjs
```

- [ ] **Step 5: Commit**

```
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/intelligence-layer.test.mjs
git commit -m "feat(ats): stage-change notifications for hiring assignees"
```

---

## Task 6: Metrics Endpoints

**Files:**
- Create: `dashboard-server/routes/hiring-metrics.js`
- Modify: `dashboard-server/server.js`

- [ ] **Step 1: Write failing tests**

Append to `intelligence-layer.test.mjs`:

```javascript
describe('Hiring metrics', () => {
  it('GET /api/hiring/metrics/time-in-stage returns stage durations', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'MetricsCo' });
    const candidate = await createTestCandidate({ name: 'MetricsCandidate', client_id: client.id });

    // Create history entries with known durations
    await pool.query(
      "INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by, moved_at) VALUES ($1, NULL, 'sourcing', 'Admin', NOW() - INTERVAL '10 days')",
      [candidate.id]
    );
    await pool.query(
      "INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by, moved_at) VALUES ($1, 'sourcing', 'interviews', 'Admin', NOW() - INTERVAL '5 days')",
      [candidate.id]
    );

    const res = await request(app)
      .get(`/api/hiring/metrics/time-in-stage?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.stages).toBeDefined();
    expect(Array.isArray(res.body.stages)).toBe(true);
    const sourcing = res.body.stages.find(s => s.stage === 'sourcing');
    expect(sourcing).toBeDefined();
    expect(sourcing.avg_days).toBeGreaterThanOrEqual(4);
  });

  it('GET /api/hiring/metrics/time-to-hire returns hire duration', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'HireCo' });
    const candidate = await createTestCandidate({ name: 'HiredPerson', client_id: client.id, stage: 'onboarded' });

    await pool.query(
      "INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by, moved_at) VALUES ($1, NULL, 'sourcing', 'Admin', NOW() - INTERVAL '30 days')",
      [candidate.id]
    );
    await pool.query(
      "INSERT INTO candidate_stage_history (candidate_id, from_stage, to_stage, moved_by, moved_at) VALUES ($1, 'offer', 'onboarded', 'Admin', NOW() - INTERVAL '2 days')",
      [candidate.id]
    );

    const res = await request(app)
      .get(`/api/hiring/metrics/time-to-hire?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.candidates).toBeDefined();
    expect(res.body.candidates.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/hiring/metrics/pipeline returns snapshot and conversions', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'PipelineCo' });
    await createTestCandidate({ name: 'PipeA', client_id: client.id, stage: 'sourcing' });
    await createTestCandidate({ name: 'PipeB', client_id: client.id, stage: 'interviews' });

    const res = await request(app)
      .get(`/api/hiring/metrics/pipeline?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.snapshot).toBeDefined();
    expect(Array.isArray(res.body.snapshot)).toBe(true);
    expect(res.body.snapshot.length).toBeGreaterThanOrEqual(1);
  });

  it('client user cannot query metrics for another client', async () => {
    const clientA = await createTestClient({ name: 'MetricsA' });
    const clientB = await createTestClient({ name: 'MetricsB' });
    const userA = await createTestUser({ role: 'member', client_id: clientA.id, client_role: 'member' });
    const token = await mintSession(userA.id);

    await request(app)
      .get(`/api/hiring/metrics/time-in-stage?client_id=${clientB.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(403);
  });
});
```

- [ ] **Step 2: Create `hiring-metrics.js`**

Create `dashboard-server/routes/hiring-metrics.js`:

```javascript
'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid } = ctx;

  // GET /api/hiring/metrics/time-in-stage?client_id=&from=&to=
  router.get('/api/hiring/metrics/time-in-stage', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const clientId = req.user.clientId || req.query.client_id;
    if (!clientId) return res.status(400).json({ error: 'client_id required' });
    if (!isValidUuid(clientId)) return res.status(400).json({ error: 'Invalid client_id' });
    if (req.user.clientId && req.user.clientId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const from = req.query.from || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const to = req.query.to || new Date().toISOString().slice(0, 10);

    try {
      const { rows } = await pool.query(`
        WITH transitions AS (
          SELECT csh.candidate_id, csh.to_stage AS stage,
                 csh.moved_at AS entered_at,
                 LEAD(csh.moved_at) OVER (PARTITION BY csh.candidate_id ORDER BY csh.moved_at) AS exited_at
          FROM candidate_stage_history csh
          JOIN candidates ca ON ca.id = csh.candidate_id
          WHERE ca.client_id = $1
            AND csh.moved_at BETWEEN $2::date AND ($3::date + INTERVAL '1 day')
        )
        SELECT stage,
               ROUND(AVG(EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at)) / 86400)::numeric, 1) AS avg_days,
               ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at)) / 86400)::numeric, 0) AS median_days,
               ROUND(MAX(EXTRACT(EPOCH FROM (COALESCE(exited_at, NOW()) - entered_at)) / 86400)::numeric, 0) AS max_days,
               COUNT(DISTINCT candidate_id)::int AS candidate_count
        FROM transitions
        WHERE stage IS NOT NULL
        GROUP BY stage
        ORDER BY stage
      `, [clientId, from, to]);

      res.json({ stages: rows, period: { from, to } });
    } catch (e) {
      log('error', 'HiringMetrics', 'time-in-stage failed', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // GET /api/hiring/metrics/time-to-hire?client_id=&from=&to=
  router.get('/api/hiring/metrics/time-to-hire', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const clientId = req.user.clientId || req.query.client_id;
    if (!clientId) return res.status(400).json({ error: 'client_id required' });
    if (!isValidUuid(clientId)) return res.status(400).json({ error: 'Invalid client_id' });
    if (req.user.clientId && req.user.clientId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const from = req.query.from || new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
    const to = req.query.to || new Date().toISOString().slice(0, 10);

    try {
      const { rows } = await pool.query(`
        SELECT ca.id, ca.name, ca.role,
               MIN(csh.moved_at) AS first_entry,
               MAX(csh.moved_at) AS last_entry,
               ROUND(EXTRACT(EPOCH FROM (MAX(csh.moved_at) - MIN(csh.moved_at))) / 86400) AS days
        FROM candidates ca
        JOIN candidate_stage_history csh ON csh.candidate_id = ca.id
        WHERE ca.client_id = $1
          AND ca.stage IN ('onboarded')
          AND csh.moved_at BETWEEN $2::date AND ($3::date + INTERVAL '1 day')
        GROUP BY ca.id, ca.name, ca.role
        HAVING COUNT(*) >= 2
        ORDER BY MAX(csh.moved_at) DESC
      `, [clientId, from, to]);

      const avg = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + Number(r.days), 0) / rows.length) : 0;
      const sorted = [...rows].sort((a, b) => Number(a.days) - Number(b.days));
      const median = sorted.length > 0 ? Number(sorted[Math.floor(sorted.length / 2)].days) : 0;

      res.json({
        avg_days: avg,
        median_days: median,
        candidates: rows.map(r => ({ id: r.id, name: r.name, role: r.role, days: Number(r.days), hired_at: r.last_entry })),
        period: { from, to },
      });
    } catch (e) {
      log('error', 'HiringMetrics', 'time-to-hire failed', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // GET /api/hiring/metrics/pipeline?client_id=&from=&to=
  router.get('/api/hiring/metrics/pipeline', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const clientId = req.user.clientId || req.query.client_id;
    if (!clientId) return res.status(400).json({ error: 'client_id required' });
    if (!isValidUuid(clientId)) return res.status(400).json({ error: 'Invalid client_id' });
    if (req.user.clientId && req.user.clientId !== clientId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      // Snapshot: current candidate counts per stage
      const { rows: snapshot } = await pool.query(`
        SELECT stage, COUNT(*)::int AS count
        FROM candidates
        WHERE client_id = $1 AND archived_at IS NULL
        GROUP BY stage
        ORDER BY stage
      `, [clientId]);

      // Conversion rates from transition history
      const from = req.query.from || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
      const to = req.query.to || new Date().toISOString().slice(0, 10);

      const { rows: conversions } = await pool.query(`
        WITH stage_entries AS (
          SELECT candidate_id, to_stage AS stage, moved_at,
                 ROW_NUMBER() OVER (PARTITION BY candidate_id, to_stage ORDER BY moved_at) AS rn
          FROM candidate_stage_history
          WHERE candidate_id IN (SELECT id FROM candidates WHERE client_id = $1)
            AND moved_at BETWEEN $2::date AND ($3::date + INTERVAL '1 day')
        ),
        first_entries AS (
          SELECT candidate_id, stage, moved_at FROM stage_entries WHERE rn = 1
        )
        SELECT a.stage AS from_stage, b.stage AS to_stage,
               COUNT(DISTINCT a.candidate_id)::int AS entered,
               COUNT(DISTINCT b.candidate_id)::int AS advanced,
               CASE WHEN COUNT(DISTINCT a.candidate_id) > 0
                    THEN ROUND(COUNT(DISTINCT b.candidate_id)::numeric / COUNT(DISTINCT a.candidate_id), 3)
                    ELSE 0 END AS rate
        FROM first_entries a
        JOIN first_entries b ON a.candidate_id = b.candidate_id AND b.moved_at > a.moved_at
        GROUP BY a.stage, b.stage
        ORDER BY a.stage, b.stage
      `, [clientId, from, to]);

      res.json({ snapshot, conversions, period: { from, to } });
    } catch (e) {
      log('error', 'HiringMetrics', 'pipeline failed', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
```

- [ ] **Step 3: Mount in server.js**

After the interview-rounds mount (line 444), add:

```javascript
app.use(require('./routes/hiring-metrics')({ pool, log, isValidUuid }));
```

- [ ] **Step 4: Run tests**

```
cd dashboard-server && npx vitest run tests/unit/intelligence-layer.test.mjs
```

- [ ] **Step 5: Run full suite**

```
cd dashboard-server && npm test
```

- [ ] **Step 6: Commit**

```
git add dashboard-server/routes/hiring-metrics.js dashboard-server/server.js dashboard-server/tests/unit/intelligence-layer.test.mjs
git commit -m "feat(ats): metrics endpoints — time-in-stage, time-to-hire, pipeline health"
```

---

## Task 7: Email Templates CRUD + Send

**Files:**
- Create: `dashboard-server/routes/hiring-templates.js`
- Modify: `dashboard-server/server.js`

- [ ] **Step 1: Write failing tests**

Append to `intelligence-layer.test.mjs`:

```javascript
describe('Email templates', () => {
  it('POST creates a template (admin only)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);

    const res = await request(app)
      .post('/api/hiring-templates')
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'Offer Letter', subject: 'Offer from {{client_name}}', body: 'Dear {{candidate_name}}, we are pleased to offer you the role of {{position_title}}.' })
      .expect(201);

    expect(res.body.name).toBe('Offer Letter');
  });

  it('GET lists templates (global + client-specific)', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'TemplateCo' });

    await createTestEmailTemplate({ name: 'Global Template' });
    await createTestEmailTemplate({ name: 'Client Template', client_id: client.id });

    const res = await request(app)
      .get(`/api/hiring-templates?client_id=${client.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('POST /send resolves placeholders and requires candidate email', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'EmailTest' }); // no email

    const template = await createTestEmailTemplate({
      name: 'Welcome',
      subject: 'Welcome {{candidate_name}}',
      body: 'Hello {{candidate_name}}, welcome to {{client_name}}.',
    });

    await request(app)
      .post(`/api/hiring-templates/${template.id}/send`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ candidate_id: candidate.id })
      .expect(400); // no email on candidate
  });

  it('PATCH updates a template', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const template = await createTestEmailTemplate({ name: 'Old Name' });

    const res = await request(app)
      .patch(`/api/hiring-templates/${template.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ name: 'New Name' })
      .expect(200);

    expect(res.body.name).toBe('New Name');
  });

  it('DELETE removes a template', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const template = await createTestEmailTemplate({ name: 'Delete Me' });

    await request(app)
      .delete(`/api/hiring-templates/${template.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
  });
});
```

- [ ] **Step 2: Create `hiring-templates.js`**

Create `dashboard-server/routes/hiring-templates.js`:

```javascript
'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, requireAdmin, requireNBI, isValidUuid, validateLength, sendEmailAsync, EMAIL_FROM, buildPatchQuery } = ctx;

  function resolvePlaceholders(text, data) {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined && data[key] !== null ? String(data[key]) : match;
    });
  }

  // GET /api/hiring-templates?client_id=
  router.get('/api/hiring-templates', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    const clientId = req.user.clientId || req.query.client_id || null;
    try {
      let query, vals;
      if (clientId) {
        query = 'SELECT * FROM hiring_email_templates WHERE client_id IS NULL OR client_id = $1 ORDER BY name';
        vals = [clientId];
      } else {
        query = 'SELECT * FROM hiring_email_templates ORDER BY name';
        vals = [];
      }
      const { rows } = await pool.query(query, vals);
      res.json(rows);
    } catch (e) {
      log('error', 'HiringTemplates', 'Failed to list templates', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // POST /api/hiring-templates
  router.post('/api/hiring-templates', requireNBI, requireAdmin, async (req, res) => {
    const { client_id, name, subject, body: bodyText, trigger_stage } = req.body || {};
    if (!name || !name.trim()) return res.status(400).json({ error: 'name required' });
    if (!subject || !subject.trim()) return res.status(400).json({ error: 'subject required' });
    if (!bodyText || !bodyText.trim()) return res.status(400).json({ error: 'body required' });
    try {
      const { rows } = await pool.query(
        `INSERT INTO hiring_email_templates (client_id, name, subject, body, trigger_stage)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [client_id || null, name.trim(), subject.trim(), bodyText.trim(), trigger_stage || null]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      log('error', 'HiringTemplates', 'Failed to create template', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // PATCH /api/hiring-templates/:id
  router.patch('/api/hiring-templates/:id', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid template ID' });
    const { updates, vals, nextIdx } = buildPatchQuery(req.body, ['client_id', 'name', 'subject', 'body', 'trigger_stage']);
    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
    updates.push('updated_at = NOW()');
    vals.push(req.params.id);
    try {
      const { rows } = await pool.query(
        `UPDATE hiring_email_templates SET ${updates.join(', ')} WHERE id = $${nextIdx} RETURNING *`,
        vals
      );
      if (!rows[0]) return res.status(404).json({ error: 'Not found' });
      res.json(rows[0]);
    } catch (e) {
      log('error', 'HiringTemplates', 'Failed to update template', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // DELETE /api/hiring-templates/:id
  router.delete('/api/hiring-templates/:id', requireNBI, requireAdmin, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid template ID' });
    try {
      const { rowCount } = await pool.query('DELETE FROM hiring_email_templates WHERE id = $1', [req.params.id]);
      if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ ok: true });
    } catch (e) {
      log('error', 'HiringTemplates', 'Failed to delete template', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // POST /api/hiring-templates/:id/send
  router.post('/api/hiring-templates/:id/send', requireNBI, async (req, res) => {
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid template ID' });
    const { candidate_id } = req.body || {};
    if (!candidate_id || !isValidUuid(candidate_id)) return res.status(400).json({ error: 'candidate_id required' });
    try {
      const { rows: [template] } = await pool.query('SELECT * FROM hiring_email_templates WHERE id = $1', [req.params.id]);
      if (!template) return res.status(404).json({ error: 'Template not found' });

      const { rows: [candidate] } = await pool.query(
        `SELECT ca.*, c.name AS client_name, p.title AS position_title, p.salary_range, p.location
         FROM candidates ca
         LEFT JOIN clients c ON ca.client_id = c.id
         LEFT JOIN hiring_positions p ON ca.position_id = p.id
         WHERE ca.id = $1`,
        [candidate_id]
      );
      if (!candidate) return res.status(404).json({ error: 'Candidate not found' });
      if (!candidate.email) return res.status(400).json({ error: 'Candidate has no email address' });

      const data = {
        candidate_name: candidate.name || '',
        candidate_email: candidate.email,
        role: candidate.role || '',
        client_name: candidate.client_name || '',
        stage: candidate.stage || '',
        position_title: candidate.position_title || '',
        salary_range: candidate.salary_range || '',
        location: candidate.location || '',
        start_date: candidate.start_date || '',
        sender_name: req.user.displayName || '',
      };

      const resolvedSubject = resolvePlaceholders(template.subject, data);
      const resolvedBody = resolvePlaceholders(template.body, data);

      sendEmailAsync({
        to: candidate.email,
        subject: resolvedSubject,
        html: resolvedBody,
        replyTo: req.user.email || undefined,
      });

      res.json({ ok: true, to: candidate.email, subject: resolvedSubject });
    } catch (e) {
      log('error', 'HiringTemplates', 'Failed to send template', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
```

- [ ] **Step 3: Mount in server.js**

After the metrics mount, add:
```javascript
app.use(require('./routes/hiring-templates')({ pool, log, requireAdmin, requireNBI, isValidUuid, validateLength, sendEmailAsync, EMAIL_FROM, buildPatchQuery }));
```

- [ ] **Step 4: Run tests**

```
cd dashboard-server && npx vitest run tests/unit/intelligence-layer.test.mjs
```

- [ ] **Step 5: Commit**

```
git add dashboard-server/routes/hiring-templates.js dashboard-server/server.js dashboard-server/tests/unit/intelligence-layer.test.mjs
git commit -m "feat(ats): email template CRUD + send with placeholder resolution"
```

---

## Task 8: Onboarding Checklist CRUD + Auto-Populate

**Files:**
- Create: `dashboard-server/routes/onboarding-checklist.js`
- Modify: `dashboard-server/routes/hiring.js` (auto-populate on stage change)
- Modify: `dashboard-server/server.js`

- [ ] **Step 1: Write failing tests**

Append to `intelligence-layer.test.mjs`:

```javascript
describe('Onboarding checklist', () => {
  it('POST creates a checklist item', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'OnboardA', stage: 'onboarding' });

    const res = await request(app)
      .post(`/api/candidates/${candidate.id}/onboarding`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ title: 'Order laptop' })
      .expect(201);

    expect(res.body.title).toBe('Order laptop');
    expect(res.body.completed).toBe(false);
  });

  it('GET lists items ordered by sort_order', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'OnboardB' });

    await createTestOnboardingItem({ candidate_id: candidate.id, title: 'Second', sort_order: 2 });
    await createTestOnboardingItem({ candidate_id: candidate.id, title: 'First', sort_order: 1 });

    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/onboarding`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(2);
    expect(res.body[0].title).toBe('First');
    expect(res.body[1].title).toBe('Second');
  });

  it('PATCH marks item completed with auto-timestamp', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'OnboardC' });
    const item = await createTestOnboardingItem({ candidate_id: candidate.id, title: 'Create email' });

    const res = await request(app)
      .patch(`/api/candidates/${candidate.id}/onboarding/${item.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ completed: true })
      .expect(200);

    expect(res.body.completed).toBe(true);
    expect(res.body.completed_at).toBeTruthy();
    expect(res.body.completed_by).toBe(admin.display_name);
  });

  it('DELETE removes an item', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const candidate = await createTestCandidate({ name: 'OnboardD' });
    const item = await createTestOnboardingItem({ candidate_id: candidate.id, title: 'Remove me' });

    await request(app)
      .delete(`/api/candidates/${candidate.id}/onboarding/${item.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);
  });

  it('auto-populates from position onboarding_template on stage change to onboarding', async () => {
    const admin = await createTestUser({ role: 'admin' });
    const token = await mintSession(admin.id);
    const client = await createTestClient({ name: 'OnboardCo' });

    // Create position with onboarding template
    const { rows: [pos] } = await pool.query(
      `INSERT INTO hiring_positions (client_id, title, onboarding_template) VALUES ($1, 'Dev', $2) RETURNING *`,
      [client.id, JSON.stringify([{ title: 'Order laptop' }, { title: 'Create email' }, { title: 'Schedule induction' }])]
    );

    const candidate = await createTestCandidate({ name: 'OnboardE', client_id: client.id, position_id: pos.id, stage: 'offer' });

    // Move to onboarding stage
    await request(app)
      .patch(`/api/candidates/${candidate.id}`)
      .set('Cookie', `nbi_session=${token}`)
      .send({ stage: 'onboarding' })
      .expect(200);

    // Check checklist items were auto-created
    const res = await request(app)
      .get(`/api/candidates/${candidate.id}/onboarding`)
      .set('Cookie', `nbi_session=${token}`)
      .expect(200);

    expect(res.body).toHaveLength(3);
    expect(res.body[0].title).toBe('Order laptop');
  });
});
```

- [ ] **Step 2: Create `onboarding-checklist.js`**

Create `dashboard-server/routes/onboarding-checklist.js`:

```javascript
'use strict';

module.exports = function (ctx) {
  const router = require('express').Router();
  const { pool, log, isValidUuid } = ctx;

  async function verifyCandidateAccess(req, res, candidateId) {
    const { rows: [candidate] } = await pool.query('SELECT client_id FROM candidates WHERE id = $1', [candidateId]);
    if (!candidate) { res.status(404).json({ error: 'Candidate not found' }); return null; }
    if (req.user.clientId && candidate.client_id !== req.user.clientId) {
      res.status(403).json({ error: 'Access denied' }); return null;
    }
    return candidate;
  }

  // GET /api/candidates/:id/onboarding
  router.get('/api/candidates/:id/onboarding', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;
      const { rows } = await pool.query(
        'SELECT * FROM onboarding_checklist_items WHERE candidate_id = $1 ORDER BY sort_order ASC, created_at ASC',
        [req.params.id]
      );
      res.json(rows);
    } catch (e) {
      log('error', 'Onboarding', 'Failed to list items', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // POST /api/candidates/:id/onboarding
  router.post('/api/candidates/:id/onboarding', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id)) return res.status(400).json({ error: 'Invalid candidate ID' });
    const { title } = req.body || {};
    if (!title || !title.trim()) return res.status(400).json({ error: 'title required' });
    try {
      const candidate = await verifyCandidateAccess(req, res, req.params.id);
      if (!candidate) return;
      const { rows: [maxRow] } = await pool.query(
        'SELECT COALESCE(MAX(sort_order), -1) AS max_order FROM onboarding_checklist_items WHERE candidate_id = $1',
        [req.params.id]
      );
      const { rows } = await pool.query(
        'INSERT INTO onboarding_checklist_items (candidate_id, title, sort_order) VALUES ($1, $2, $3) RETURNING *',
        [req.params.id, title.trim(), (maxRow.max_order || 0) + 1]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      log('error', 'Onboarding', 'Failed to create item', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // PATCH /api/candidates/:id/onboarding/:itemId
  router.patch('/api/candidates/:id/onboarding/:itemId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.itemId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    try {
      const updates = [];
      const vals = [];
      let i = 1;

      if (req.body.title !== undefined) { updates.push(`title = $${i++}`); vals.push(req.body.title); }
      if (req.body.sort_order !== undefined) { updates.push(`sort_order = $${i++}`); vals.push(req.body.sort_order); }
      if (req.body.completed !== undefined) {
        updates.push(`completed = $${i++}`); vals.push(req.body.completed);
        if (req.body.completed === true) {
          updates.push(`completed_at = $${i++}`); vals.push(new Date().toISOString());
          updates.push(`completed_by = $${i++}`); vals.push(req.user.displayName || 'Unknown');
        } else {
          updates.push(`completed_at = $${i++}`); vals.push(null);
          updates.push(`completed_by = $${i++}`); vals.push(null);
        }
      }

      if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });
      vals.push(req.params.itemId);
      vals.push(req.params.id);
      const { rows } = await pool.query(
        `UPDATE onboarding_checklist_items SET ${updates.join(', ')} WHERE id = $${i} AND candidate_id = $${i + 1} RETURNING *`,
        vals
      );
      if (!rows[0]) return res.status(404).json({ error: 'Item not found' });
      res.json(rows[0]);
    } catch (e) {
      log('error', 'Onboarding', 'Failed to update item', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  // DELETE /api/candidates/:id/onboarding/:itemId
  router.delete('/api/candidates/:id/onboarding/:itemId', async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Auth required' });
    if (!isValidUuid(req.params.id) || !isValidUuid(req.params.itemId)) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    try {
      const { rowCount } = await pool.query(
        'DELETE FROM onboarding_checklist_items WHERE id = $1 AND candidate_id = $2',
        [req.params.itemId, req.params.id]
      );
      if (rowCount === 0) return res.status(404).json({ error: 'Item not found' });
      res.json({ ok: true });
    } catch (e) {
      log('error', 'Onboarding', 'Failed to delete item', { error: e.message });
      res.status(500).json({ error: 'An internal error occurred' });
    }
  });

  return router;
};
```

- [ ] **Step 3: Mount in server.js**

```javascript
app.use(require('./routes/onboarding-checklist')({ pool, log, isValidUuid }));
```

- [ ] **Step 4: Add auto-populate to hiring.js PATCH**

In the PATCH `/api/candidates/:id` endpoint, after the stage transition history INSERT (inside the `wantsReorder` block, after the history recording), add onboarding checklist auto-population:

```javascript
        // Auto-populate onboarding checklist from position template
        if (body.stage !== undefined && body.stage === 'onboarding' && body.stage !== oldStage) {
          const { rows: [checkCount] } = await dbClient.query(
            'SELECT COUNT(*)::int AS cnt FROM onboarding_checklist_items WHERE candidate_id = $1',
            [req.params.id]
          );
          if (checkCount.cnt === 0) {
            const { rows: [cand] } = await dbClient.query('SELECT position_id FROM candidates WHERE id = $1', [req.params.id]);
            if (cand && cand.position_id) {
              const { rows: [pos] } = await dbClient.query('SELECT onboarding_template FROM hiring_positions WHERE id = $1', [cand.position_id]);
              if (pos && pos.onboarding_template && Array.isArray(pos.onboarding_template)) {
                for (let idx = 0; idx < pos.onboarding_template.length; idx++) {
                  const item = pos.onboarding_template[idx];
                  await dbClient.query(
                    'INSERT INTO onboarding_checklist_items (candidate_id, title, sort_order) VALUES ($1, $2, $3)',
                    [req.params.id, item.title, idx]
                  );
                }
              }
            }
          }
        }
```

This goes inside the transaction (using `dbClient`), inside the `if (wantsReorder)` block, after the stage history INSERT.

- [ ] **Step 5: Run tests**

```
cd dashboard-server && npx vitest run tests/unit/intelligence-layer.test.mjs
```

- [ ] **Step 6: Run full suite**

```
cd dashboard-server && npm test
```

- [ ] **Step 7: Commit**

```
git add dashboard-server/routes/onboarding-checklist.js dashboard-server/routes/hiring.js dashboard-server/server.js dashboard-server/tests/unit/intelligence-layer.test.mjs
git commit -m "feat(ats): onboarding checklist CRUD + auto-populate from position template"
```

---

## Task 9: Stall Reminders Cron

**Files:**
- Modify: `dashboard-server/cron/index.js`

- [ ] **Step 1: Write the stall check function**

Add to `cron/index.js`, before the `return` statement that exports functions:

```javascript
  const STALL_THRESHOLDS = { sourcing: 7, interviews: 10, offer: 5, onboarding: 14 };
  const DEFAULT_STALL_DAYS = 10;

  async function checkHiringStalls() {
    try {
      // Find all active (non-archived) candidates with their latest stage entry
      const { rows: candidates } = await pool.query(`
        SELECT ca.id, ca.name, ca.stage, ca.client_id,
               c.name AS client_name,
               latest.moved_at AS stage_entered_at,
               EXTRACT(EPOCH FROM (NOW() - latest.moved_at)) / 86400 AS days_in_stage
        FROM candidates ca
        JOIN clients c ON ca.client_id = c.id
        LEFT JOIN LATERAL (
          SELECT moved_at FROM candidate_stage_history
          WHERE candidate_id = ca.id ORDER BY moved_at DESC LIMIT 1
        ) latest ON true
        WHERE ca.archived_at IS NULL
          AND latest.moved_at IS NOT NULL
      `);

      for (const cand of candidates) {
        const threshold = STALL_THRESHOLDS[cand.stage] || DEFAULT_STALL_DAYS;
        if (cand.days_in_stage < threshold) continue;

        // Check if we already sent a stall reminder for this candidate in the threshold period
        const { rows: existing } = await pool.query(
          `SELECT id FROM notifications
           WHERE type = 'hiring_stall_reminder'
             AND link LIKE $1
             AND created_at > NOW() - INTERVAL '1 day' * $2`,
          [`%${cand.id}%`, threshold]
        );
        if (existing.length > 0) continue;

        // Get stage assignees
        const { rows: [candFull] } = await pool.query('SELECT stage_assignees FROM candidates WHERE id = $1', [cand.id]);
        if (!candFull || !candFull.stage_assignees) continue;
        const assignees = candFull.stage_assignees[cand.stage];
        if (!Array.isArray(assignees) || assignees.length === 0) continue;

        const title = `${cand.name || 'Candidate'} has been in ${cand.stage} for ${Math.floor(cand.days_in_stage)} days (${cand.client_name})`;
        const link = `#hiring/candidate/${cand.id}`;

        for (const displayName of assignees) {
          const { rows: [user] } = await pool.query(
            'SELECT username FROM users WHERE display_name = $1 AND is_active = true LIMIT 1',
            [displayName]
          );
          if (user) {
            await createNotification(user.username, 'hiring_stall_reminder', title, '', link);
          }
        }
      }
      log('info', 'Cron', 'Hiring stall check completed');
    } catch (e) {
      log('error', 'Cron', 'Hiring stall check failed', { error: e.message });
    }
  }

  // Schedule: daily at 08:00
  if (cron) {
    cron.schedule('0 8 * * *', checkHiringStalls, CRON_TZ);
  }
```

Add `checkHiringStalls` to the exports object at the bottom of the file.

- [ ] **Step 2: Commit**

```
git add dashboard-server/cron/index.js
git commit -m "feat(ats): daily stall reminder cron for hiring candidates"
```

---

## Task 10: Frontend — Metrics Sub-View, Rejection Modal, Onboarding Checklist

**Files:**
- Modify: `nbi_project_dashboard.html`

This adds:
- Metrics sub-view on the hiring page (4th tab alongside Kanban / By Client / Positions)
- Rejection modal when archiving a non-terminal candidate
- Onboarding checklist replacing the old onboarding links section
- Notification click handler for `#hiring/candidate/` deep links

This is a large frontend task. The subagent should:

1. Add "Metrics" tab to the hiring view mode toggle
2. Add metrics rendering (CSS-only bar charts for time-in-stage, stat cards for time-to-hire, funnel for pipeline)
3. Update `hiringClearCandidate` to show a rejection category modal before archiving
4. Replace the onboarding links section in `buildCandidateStageSubHtml` with the onboarding checklist (GET items, render checkboxes, add item input)
5. Add notification deep-link handler: when a notification link starts with `#hiring/candidate/`, switch to hiring view and open the candidate detail

- [ ] **Step 1-5: Implement all frontend changes**

(The subagent handles this as a single task with multiple edits.)

- [ ] **Step 6: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(ats): metrics view, rejection modal, onboarding checklist, notification deep links"
```

---

## Task 11: Full Verification

- [ ] **Step 1: Run full test suite**

```
cd dashboard-server && npm test
```

- [ ] **Step 2: Run E2E tests**

```
cd dashboard-server && npm run test:e2e
```

- [ ] **Step 3: Restart PM2 and verify**

```
pm2 restart nbi-dashboard
```

Verify:
- Metrics tab shows time-in-stage bars, time-to-hire stats, pipeline funnel
- Archiving a non-terminal candidate shows rejection category modal
- Moving a candidate to onboarding auto-creates checklist items from position template
- Onboarding checklist items can be checked off, added, removed
- Stage-change notifications appear in the alerts dropdown
- Clicking a hiring notification opens the candidate detail
- Email templates CRUD works in the templates section
- Stall reminders function fires without errors (test by calling `checkHiringStalls()` manually)
