# ATS Single-Flow Interview Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two-step Add Round modal with a single-flow wizard that creates interview configs with questions and interviewers in one submit, passing all 4 red ats-workflow e2e tests.

**Architecture:** Minimal backend change (accept optional `status` field on existing POST endpoint) plus frontend-only replacement of `openAddRoundModal`, `_ivAddTypeChanged`, and `_ivSubmitAddRound` in nbi-hiring.js. No new files, no new routes, no schema changes.

**Tech Stack:** Express 4 / PostgreSQL backend, vanilla JS frontend (global-scope SPA pattern, no build step).

**Design spec:** `docs/superpowers/specs/2026-07-02-ats-interview-wizard-design.md`
**E2e contract:** `dashboard-server/tests/e2e/ats-workflow.spec.js`

---

### Task 1: Backend — Accept optional `status` field on POST /api/interview-configs

**Files:**
- Modify: `dashboard-server/routes/interview.js:361-474`
- Test: `dashboard-server/tests/unit/interview-configs.test.mjs`

- [ ] **Step 1: Write failing unit test — status active creates active config with notified sessions**

Add to the `POST /api/interview-configs` describe block in `dashboard-server/tests/unit/interview-configs.test.mjs`:

```javascript
it('creates active config with notified sessions when status=active and questions+interviewers provided', async () => {
  const { admin, interviewer, adminToken, candidate, position, q1, q2 } = await setupConfigData();

  const res = await request(app)
    .post('/api/interview-configs')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      candidate_id: candidate.id,
      position_id: position.id,
      question_ids: [q1.id, q2.id],
      interviewer_ids: [interviewer.id],
      round_type: 'Technical',
      status: 'active',
      scheduled_at: '2026-07-01T14:00:00Z',
      location: 'Remote — Teams',
    });

  expect(res.status).toBe(201);
  expect(res.body.config.status).toBe('active');
  expect(res.body.sessions).toHaveLength(1);
  expect(res.body.sessions[0].notified_at).not.toBeNull();
});
```

- [ ] **Step 2: Write failing unit test — status active ignored without questions or interviewers**

Add immediately after the previous test:

```javascript
it('ignores status=active when question_ids is empty and creates as draft', async () => {
  const { adminToken, candidate } = await setupConfigData();

  const res = await request(app)
    .post('/api/interview-configs')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      candidate_id: candidate.id,
      round_type: 'Technical',
      status: 'active',
      interviewer_ids: [],
    });

  expect(res.status).toBe(201);
  expect(res.body.config.status).toBe('draft');
});
```

- [ ] **Step 3: Write failing unit test — invalid status value rejected**

```javascript
it('rejects invalid status value', async () => {
  const { adminToken, candidate } = await setupConfigData();

  const res = await request(app)
    .post('/api/interview-configs')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      candidate_id: candidate.id,
      round_type: 'Technical',
      status: 'bogus',
    });

  expect(res.status).toBe(400);
  expect(res.body.error).toMatch(/status/i);
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd dashboard-server && npx vitest run tests/unit/interview-configs.test.mjs`
Expected: 3 new tests FAIL (status still hardcoded to draft, no validation on status field).

- [ ] **Step 5: Implement the backend change**

In `dashboard-server/routes/interview.js`, make these edits:

**5a.** At line 363, add `status` to the destructured fields:

Change:
```javascript
const { candidate_id, position_id, question_ids, interviewer_ids, round_type, round_type_custom,
        scheduled_at, duration_minutes, location, interviewer_name } = req.body;
```
To:
```javascript
const { candidate_id, position_id, question_ids, interviewer_ids, round_type, round_type_custom,
        scheduled_at, duration_minutes, location, interviewer_name, status: requestedStatus } = req.body;
```

**5b.** After line 389 (the duration validation block), add status validation:

```javascript
if (requestedStatus !== undefined && !INTERVIEW_CONFIG_STATUSES.includes(requestedStatus)) {
  return res.status(400).json({ error: `status must be one of: ${INTERVIEW_CONFIG_STATUSES.join(', ')}` });
}
```

**5c.** Replace line 410:

Change:
```javascript
const configStatus = isPhoneScreen ? 'completed' : 'draft';
```
To:
```javascript
const wantActive = requestedStatus === 'active'
  && Array.isArray(question_ids) && question_ids.length > 0
  && Array.isArray(interviewer_ids) && interviewer_ids.length > 0;
const configStatus = isPhoneScreen ? 'completed' : (wantActive ? 'active' : 'draft');
```

**5d.** In the sessions creation block (lines 456-464), change the INSERT to set `notified_at` when creating as active:

Change:
```javascript
const sessions = [];
if (!isPhoneScreen && interviewer_ids) {
  for (const iid of interviewer_ids) {
    const { rows } = await conn.query(
      `INSERT INTO interview_sessions (config_id, interviewer_id, status) VALUES ($1, $2, 'assigned') RETURNING *`,
      [config.id, iid]
    );
    sessions.push(rows[0]);
  }
}
```
To:
```javascript
const sessions = [];
if (!isPhoneScreen && interviewer_ids) {
  for (const iid of interviewer_ids) {
    const { rows } = await conn.query(
      wantActive
        ? `INSERT INTO interview_sessions (config_id, interviewer_id, status, notified_at) VALUES ($1, $2, 'assigned', NOW()) RETURNING *`
        : `INSERT INTO interview_sessions (config_id, interviewer_id, status) VALUES ($1, $2, 'assigned') RETURNING *`,
      [config.id, iid]
    );
    sessions.push(rows[0]);
  }
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd dashboard-server && npx vitest run tests/unit/interview-configs.test.mjs`
Expected: ALL tests pass including the 3 new ones.

- [ ] **Step 7: Run full unit suite to check for regressions**

Run: `cd dashboard-server && npm test`
Expected: 933+ tests pass, 0 failures.

- [ ] **Step 8: Commit**

```bash
git add dashboard-server/routes/interview.js dashboard-server/tests/unit/interview-configs.test.mjs
git commit -m "feat(interview): accept optional status field on POST /api/interview-configs"
```

---

### Task 2: Frontend — Replace openAddRoundModal with single-flow wizard

**Files:**
- Modify: `dashboard-server/public/js/domains/nbi-hiring.js:4098-4237`

This is the core change. Replace three functions: `openAddRoundModal` (4098-4172), `_ivAddTypeChanged` (4174-4184), and `_ivSubmitAddRound` (4186-4237).

- [ ] **Step 1: Add helper functions `_ivRenderQuestions`, `_ivRenderInterviewers`, `_ivUpdateCount`**

Add these immediately before the `openAddRoundModal` function (insert before line 4098):

```javascript
function _ivRenderQuestions(discipline) {
  var container = document.getElementById('ivwQuestionList');
  if (!container) return;
  var data = window._ivWizardData || {};
  var questions = (data.allQuestions || []).filter(function(q) {
    return discipline && q.discipline === discipline;
  });
  var html = '';
  if (discipline) {
    html += '<div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:8px">Showing questions for: <strong>' + esc(discipline) + '</strong></div>';
  }
  if (questions.length === 0 && discipline) {
    html += '<div style="font-size:0.82rem;color:var(--text-muted);padding:8px 0">No questions found for this discipline.</div>';
  }
  questions.forEach(function(q) {
    html += '<label style="display:flex;align-items:flex-start;gap:6px;padding:4px 0;font-size:0.82rem;color:var(--text-primary);cursor:pointer">' +
      '<input type="checkbox" value="' + q.id + '" onchange="window._ivUpdateCount()" style="margin-top:2px">' +
      '<span>' + esc(q.question_text) + ' <span style="color:var(--text-muted);font-size:0.75rem">(' + esc(q.category) + ')</span></span>' +
    '</label>';
  });
  container.innerHTML = html;
}

function _ivRenderInterviewers(users) {
  var container = document.getElementById('ivwInterviewerList');
  if (!container) return;
  var html = '';
  (users || []).forEach(function(u) {
    html += '<label style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:0.82rem;color:var(--text-primary);cursor:pointer">' +
      '<input type="checkbox" value="' + u.id + '" onchange="window._ivUpdateCount()">' +
      esc(u.display_name || u.username) +
    '</label>';
  });
  container.innerHTML = html;
}

window._ivUpdateCount = function() {
  var qCount = document.querySelectorAll('#ivwQuestionList input[type=checkbox]:checked').length;
  var iCount = document.querySelectorAll('#ivwInterviewerList input[type=checkbox]:checked').length;
  var countEl = document.getElementById('ivwCount');
  if (countEl) countEl.textContent = qCount + ' questions · ' + iCount + ' interviewers';
  var btn = document.getElementById('ivAddSubmitBtn');
  if (!btn) return;
  var type = document.getElementById('ivAddType')?.value;
  var isScored = type === 'Technical' || type === 'Cultural' || type === 'Final';
  if (isScored) {
    btn.disabled = qCount === 0 || iCount === 0;
  }
};
```

- [ ] **Step 2: Replace `openAddRoundModal` function (lines 4098-4172)**

The function is now `async` because it fetches questions and users before rendering. Replace the entire function body:

```javascript
async function openAddRoundModal(candidateId) {
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  var candidate = (_candidatesData || []).find(function(c) { return c.id === candidateId; });
  var candidateName = candidate ? candidate.name : 'Candidate';
  var positionId = candidate ? candidate.position_id : null;
  var clientId = candidate ? candidate.client_id : null;

  var position = positionId ? (_hiringPositionsData || []).find(function(p) { return p.id === positionId; }) : null;
  var discipline = position ? position.discipline : null;

  var allQuestions = [];
  var allUsers = [];
  try {
    var params = new URLSearchParams();
    if (clientId) params.set('client_id', clientId);
    var fetches = [
      authFetch('/api/interview-questions?' + params),
      authFetch('/api/users')
    ];
    var results = await Promise.all(fetches);
    allQuestions = await results[0].json();
    var rawUsers = await results[1].json();
    allUsers = (rawUsers || []).filter(function(u) { return u.is_active !== false && !u.client_id; });
  } catch (e) {}

  var disciplines = [];
  var seen = {};
  (allQuestions || []).forEach(function(q) {
    if (q.discipline && !seen[q.discipline]) { seen[q.discipline] = true; disciplines.push(q.discipline); }
  });
  disciplines.sort();

  var needsDiscipline = !discipline;

  var disciplineSelectHtml = '';
  if (needsDiscipline) {
    disciplineSelectHtml = '<div style="margin-bottom:12px">' +
      '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Position Discipline</label>' +
      '<select id="ivwDiscipline" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;font-family:inherit">' +
      '<option value="">Select discipline…</option>' +
      disciplines.map(function(d) { return '<option value="' + esc(d) + '">' + esc(d) + '</option>'; }).join('') +
      '</select></div>';
  }

  overlay.innerHTML =
  '<div style="background:var(--bg-card);border-radius:var(--radius-md);width:min(580px,90vw);max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);padding:24px" role="dialog" aria-modal="true" aria-label="Add interview round">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">' +
      '<h3 style="margin:0;font-size:1rem;color:var(--text-primary)">Add Interview Round — ' + esc(candidateName) + '</h3>' +
      '<button onclick="this.closest(\'.modal-overlay\').remove()" style="background:none;border:none;color:var(--text-muted);font-size:1.2rem;cursor:pointer;padding:4px">&times;</button>' +
    '</div>' +

    '<div style="margin-bottom:12px">' +
      '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Round Type</label>' +
      '<select id="ivAddType" onchange="window._ivAddTypeChanged()" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;font-family:inherit">' +
        '<option value="Phone Screen">Phone Screen</option>' +
        '<option value="Technical">Technical</option>' +
        '<option value="Cultural">Cultural</option>' +
        '<option value="Final">Final</option>' +
        '<option value="Other">Other (custom label)</option>' +
      '</select>' +
    '</div>' +

    '<div id="ivAddCustomRow" style="display:none;margin-bottom:12px">' +
      '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Custom Label</label>' +
      '<input id="ivAddCustomLabel" type="text" maxlength="40" placeholder="e.g. Portfolio Review" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
      '<div>' +
        '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Date</label>' +
        '<input id="ivAddDate" type="date" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">' +
      '</div>' +
      '<div>' +
        '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Time</label>' +
        '<input id="ivAddTime" type="time" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">' +
      '</div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
      '<div>' +
        '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Duration (minutes)</label>' +
        '<input id="ivAddDuration" type="number" value="60" min="5" max="480" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">' +
      '</div>' +
      '<div>' +
        '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Location</label>' +
        '<input id="ivAddLocation" type="text" placeholder="e.g. Office, Zoom" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">' +
      '</div>' +
    '</div>' +

    '<div id="ivAddInterviewerRow" style="margin-bottom:16px">' +
      '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Interviewer Name</label>' +
      '<input id="ivAddInterviewer" type="text" placeholder="e.g. Glen Pryer" style="width:100%;padding:8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem">' +
    '</div>' +

    '<div id="ivwScoredSections" style="display:none;margin-bottom:16px;border:1px solid var(--border-default);border-radius:var(--radius-sm);padding:12px">' +
      disciplineSelectHtml +
      '<div id="ivwQuestionList" style="margin-bottom:12px"></div>' +
      '<div style="margin-bottom:8px">' +
        '<label style="font-size:0.78rem;color:var(--text-muted);display:block;margin-bottom:4px">Interviewers</label>' +
        '<input type="text" placeholder="Filter by name..." style="width:100%;padding:6px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.82rem;margin-bottom:8px">' +
      '</div>' +
      '<div id="ivwInterviewerList" style="max-height:160px;overflow-y:auto"></div>' +
      '<div style="margin-top:8px;font-size:0.82rem;color:var(--text-secondary)"><span id="ivwCount">0 questions · 0 interviewers</span></div>' +
    '</div>' +

    '<div id="ivAddPastWarn" style="display:none;margin-bottom:12px;padding:8px;border-radius:var(--radius-sm);background:color-mix(in srgb, var(--warning) 10%, var(--bg-surface));font-size:0.78rem;color:var(--warning)">This date is in the past — the round will be created for retrospective entry.</div>' +

    '<div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid var(--border-default)">' +
      '<button class="btn btn--sm" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
      '<button class="btn btn--sm btn--primary" id="ivAddSubmitBtn" onclick="window._ivSubmitAddRound(\'' + candidateId + '\', this)">Create Round</button>' +
    '</div>' +
  '</div>';

  document.body.appendChild(overlay);
  _trapFocus(overlay.querySelector('[role="dialog"]'));
  document.getElementById('ivAddType')?.focus();

  // Store data in window for handlers (closure not available for onclick strings)
  window._ivWizardData = {
    allQuestions: allQuestions,
    allUsers: allUsers,
    discipline: discipline,
    positionId: positionId,
    candidateId: candidateId
  };

  // Wire up question/interviewer rendering
  _ivRenderQuestions(discipline);
  _ivRenderInterviewers(allUsers);

  // Wire up discipline change
  var discSel = document.getElementById('ivwDiscipline');
  if (discSel) {
    discSel.addEventListener('change', function() {
      var d = discSel.value;
      window._ivWizardData.discipline = d;
      _ivRenderQuestions(d);
      _ivUpdateCount();
      if (d && positionId) {
        authFetch('/api/hiring-positions/' + positionId, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ discipline: d })
        });
      }
    });
  }

  // Wire up interviewer filter (uses input event, never re-renders the input)
  var filterInput = document.querySelector('#ivwScoredSections input[placeholder="Filter by name..."]');
  if (filterInput) {
    filterInput.addEventListener('input', function() {
      var term = filterInput.value.toLowerCase();
      var labels = document.querySelectorAll('#ivwInterviewerList label');
      labels.forEach(function(lbl) {
        var match = lbl.textContent.toLowerCase().indexOf(term) !== -1;
        lbl.style.display = match ? '' : 'none';
      });
    });
  }
}
```

- [ ] **Step 3: Replace `_ivAddTypeChanged` (lines 4174-4184)**

```javascript
window._ivAddTypeChanged = function() {
  var type = document.getElementById('ivAddType')?.value;
  var isPhoneScreen = type === 'Phone Screen';
  var isOther = type === 'Other';
  var isScored = type === 'Technical' || type === 'Cultural' || type === 'Final';
  var customRow = document.getElementById('ivAddCustomRow');
  var interviewerRow = document.getElementById('ivAddInterviewerRow');
  var scoredSections = document.getElementById('ivwScoredSections');
  var btn = document.getElementById('ivAddSubmitBtn');
  if (customRow) customRow.style.display = isOther ? 'block' : 'none';
  if (interviewerRow) interviewerRow.style.display = isPhoneScreen ? 'block' : 'none';
  if (scoredSections) scoredSections.style.display = isScored ? 'block' : 'none';
  if (btn) {
    btn.textContent = isScored ? 'Send Interviews' : 'Create Round';
    if (isScored) {
      window._ivUpdateCount();
    } else {
      btn.disabled = false;
    }
  }
};
```

- [ ] **Step 4: Replace `_ivSubmitAddRound` (lines 4186-4237)**

```javascript
window._ivSubmitAddRound = async function(candidateId, btn) {
  var roundType = document.getElementById('ivAddType')?.value;
  var customLabel = document.getElementById('ivAddCustomLabel')?.value?.trim();
  var date = document.getElementById('ivAddDate')?.value;
  var time = document.getElementById('ivAddTime')?.value;
  var duration = parseInt(document.getElementById('ivAddDuration')?.value) || 60;
  var location = document.getElementById('ivAddLocation')?.value?.trim();
  var interviewer = document.getElementById('ivAddInterviewer')?.value?.trim();

  if (roundType === 'Other' && !customLabel) { toast('Custom label is required for Other type', 'error'); return; }

  var scheduledAt = (date && time) ? new Date(date + 'T' + time).toISOString() : null;

  var pastWarn = document.getElementById('ivAddPastWarn');
  if (scheduledAt && new Date(scheduledAt) < new Date() && pastWarn) pastWarn.style.display = 'block';

  var isPhoneScreen = roundType === 'Phone Screen';
  var isScored = roundType === 'Technical' || roundType === 'Cultural' || roundType === 'Final';

  var body = {
    candidate_id: candidateId,
    round_type: roundType,
    scheduled_at: scheduledAt,
    duration_minutes: duration,
    location: location || undefined,
  };
  if (roundType === 'Other') body.round_type_custom = customLabel;
  if (isPhoneScreen && interviewer) body.interviewer_name = interviewer;

  if (isScored) {
    var questionIds = [];
    document.querySelectorAll('#ivwQuestionList input[type=checkbox]:checked').forEach(function(cb) {
      questionIds.push(cb.value);
    });
    var interviewerIds = [];
    document.querySelectorAll('#ivwInterviewerList input[type=checkbox]:checked').forEach(function(cb) {
      interviewerIds.push(cb.value);
    });
    if (questionIds.length === 0 || interviewerIds.length === 0) {
      toast('Select at least one question and one interviewer', 'error');
      return;
    }
    body.question_ids = questionIds;
    body.interviewer_ids = interviewerIds;
    body.status = 'active';
  }

  var overlay = btn.closest('.modal-overlay');
  btn.disabled = true;
  btn.textContent = isScored ? 'Sending…' : 'Creating…';
  try {
    var resp = await authFetch('/api/interview-configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (resp.ok) {
      if (overlay) overlay.remove();
      toast(isScored ? 'Interviews sent' : 'Interview round created');
      openCandidateDetail(candidateId);
    } else {
      var err = await resp.json().catch(function() { return {}; });
      toast(err.error || 'Failed to create round', 'error');
      btn.disabled = false;
      btn.textContent = isScored ? 'Send Interviews' : 'Create Round';
    }
  } catch (e) {
    toast('Network error', 'error');
    btn.disabled = false;
    btn.textContent = isScored ? 'Send Interviews' : 'Create Round';
  }

  // Clean up
  delete window._ivWizardData;
};
```

- [ ] **Step 5: Run unit tests to check for regressions**

Run: `cd dashboard-server && npm test`
Expected: 933+ tests pass (frontend changes don't affect unit tests, but verify nothing broke).

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/public/js/domains/nbi-hiring.js
git commit -m "feat(hiring): single-flow interview wizard for scored round types"
```

---

### Task 3: Cache-bust and verify

**Files:**
- Modify: `nbi_project_dashboard.html:353`

- [ ] **Step 1: Bump cache-bust version for nbi-hiring.js**

In `nbi_project_dashboard.html` line 353, change:
```html
<script src="/public/js/domains/nbi-hiring.js?v=20"></script>
```
To:
```html
<script src="/public/js/domains/nbi-hiring.js?v=21"></script>
```

- [ ] **Step 2: Run the ats-workflow e2e tests specifically**

Run: `cd dashboard-server && npx playwright test tests/e2e/ats-workflow.spec.js --workers=1`
Expected: All 5 tests pass (59, 114, 132, 154, 194). If any fail, debug and fix before proceeding.

- [ ] **Step 3: Run the full e2e suite**

Run: `cd dashboard-server && npm run test:e2e`
Expected: All tests pass. The 4 previously-red tests now green. No regressions in other specs.

- [ ] **Step 4: Run the full unit suite one final time**

Run: `cd dashboard-server && npm test`
Expected: 933+ tests pass.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "chore(frontend): cache-bust nbi-hiring.js v21 for interview wizard"
```

---

### Task 4: PM2 restart and production verification

- [ ] **Step 1: Restart the production server**

Run: `pm2 restart nbi-dashboard`
Expected: PM2 reports the process restarted successfully.

- [ ] **Step 2: Verify server is running**

Run: `pm2 logs nbi-dashboard --lines 5`
Expected: Server started log line, no errors.

- [ ] **Step 3: Run `npm run test:all` as final gate**

Run: `cd dashboard-server && npm run test:all`
Expected: All unit and e2e tests pass.

- [ ] **Step 4: Commit not needed** — PM2 restart is operational, not a code change.

---

### Task 5: Codex adversarial review

- [ ] **Step 1: Run Codex review on uncommitted changes**

Run: `codex review --uncommitted`
If the tree is clean (all committed), review the branch diff instead:
Run: `codex review --base master~3`

Expected: Codex produces a review file (`tmpcodex_*.md`). Read it.

- [ ] **Step 2: Address any findings**

If Codex identifies real issues, fix them. If findings are false positives, document why in the session log.

- [ ] **Step 3: Re-run tests if any fixes were made**

Run: `cd dashboard-server && npm run test:all`
Expected: All pass.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(hiring): address Codex review findings for interview wizard"
```
