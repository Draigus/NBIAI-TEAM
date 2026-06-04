# Interview Tool Completion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the interview tool with discipline-based question filtering, focused scorecard view, question bank management tab, question quality pass, and E2E tests.

**Architecture:** Migration adds `discipline` to `hiring_positions`. Frontend groups questions by discipline in the picker, adds a full-page scorecard view for interviewers (hash-routed), and a Questions management tab in the hiring page. All changes in the monolithic `nbi_project_dashboard.html` + Express routes. E2E tests via Playwright.

**Tech Stack:** Node.js/Express, PostgreSQL, vanilla JS (monolithic SPA), Playwright (E2E), Vitest (unit)

**Spec:** `docs/superpowers/specs/2026-06-02-interview-tool-completion.md` (v2)

---

## Task 1: Migration 059 — Add discipline to hiring_positions

**Files:**
- Create: `dashboard-server/migrations/059_hiring_position_discipline.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 059_hiring_position_discipline.sql
-- Add discipline field to hiring_positions for interview question filtering.

ALTER TABLE hiring_positions ADD COLUMN IF NOT EXISTS discipline TEXT;
```

- [ ] **Step 2: Apply the migration**

Run from `dashboard-server/`:
```bash
node init-db.js
```
Expected: migration 059 applied, no errors.

- [ ] **Step 3: Verify the column exists**

```bash
node -e "require('dotenv').config(); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query(\"SELECT column_name,data_type FROM information_schema.columns WHERE table_name='hiring_positions' AND column_name='discipline'\").then(r=>{console.log(r.rows);p.end()})"
```
Expected: `[ { column_name: 'discipline', data_type: 'text' } ]`

- [ ] **Step 4: Commit**

```bash
git add dashboard-server/migrations/059_hiring_position_discipline.sql
git commit -m "feat(interview): add discipline column to hiring_positions (migration 059)"
```

---

## Task 2: Backend API changes — hiring.js + interview.js + fixture

**Files:**
- Modify: `dashboard-server/routes/hiring.js:251,288,296,317`
- Modify: `dashboard-server/routes/interview.js:222`
- Modify: `dashboard-server/tests/helpers/fixtures.js:293-312`

- [ ] **Step 1: Update the GET SELECT list in hiring.js**

In `routes/hiring.js`, find the SELECT at line 251:
```js
               p.scorecard_criteria, p.jd_filename, p.jd_original_name,
```
Add `p.discipline` after `p.jd_original_name`:
```js
               p.scorecard_criteria, p.jd_filename, p.jd_original_name,
               p.discipline,
```

- [ ] **Step 2: Update the POST INSERT in hiring.js**

In `routes/hiring.js`, find the INSERT at line 288:
```js
        `INSERT INTO hiring_positions (client_id, sow_id, title, description, seniority, status, salary_range, employment_type, location, interview_panel)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
```
Change to:
```js
        `INSERT INTO hiring_positions (client_id, sow_id, title, description, seniority, status, salary_range, employment_type, location, interview_panel, discipline)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
```

And in the values array (line 290-297), add `req.body.discipline || null` after the interview_panel line:
```js
        [
          client_id || null, sow_id || null, title.trim(), description || null,
          seniority || null, status || 'open',
          req.body.salary_range || null,
          req.body.employment_type || 'permanent',
          req.body.location || null,
          req.body.interview_panel ? JSON.stringify(req.body.interview_panel) : '[]',
          req.body.discipline || null,
        ]
```

- [ ] **Step 3: Update the PATCH whitelist in hiring.js**

In `routes/hiring.js`, find the `buildPatchQuery` call at line 317:
```js
    const { updates, vals, nextIdx } = buildPatchQuery(patchBody, ['client_id', 'sow_id', 'title', 'description', 'seniority', 'status', 'salary_range', 'employment_type', 'location', 'interview_panel', 'scorecard_criteria']);
```
Add `'discipline'` to the array:
```js
    const { updates, vals, nextIdx } = buildPatchQuery(patchBody, ['client_id', 'sow_id', 'title', 'description', 'seniority', 'status', 'salary_range', 'employment_type', 'location', 'interview_panel', 'scorecard_criteria', 'discipline']);
```

- [ ] **Step 4: Update interview config query in interview.js**

In `routes/interview.js`, find the GET `/api/interview-configs` SELECT at line 222. Add `hp.discipline AS position_discipline` to the SELECT columns, after `hp.client_id AS position_client_id`:
```js
               hp.title AS position_title, hp.client_id AS position_client_id,
               hp.discipline AS position_discipline,
```

- [ ] **Step 5: Update test fixture — createTestHiringPosition**

In `tests/helpers/fixtures.js`, find `createTestHiringPosition` (line 293). Update the INSERT to include `discipline`:
```js
async function createTestHiringPosition(opts = {}) {
  const title = opts.title || uniq('TestPosition');
  const { rows } = await pool.query(
    `INSERT INTO hiring_positions (client_id, sow_id, title, description, seniority, status, salary_range, employment_type, location, interview_panel, discipline)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      opts.client_id || null,
      opts.sow_id || null,
      title,
      opts.description || null,
      opts.seniority || null,
      opts.status || 'open',
      opts.salary_range || null,
      opts.employment_type || 'permanent',
      opts.location || null,
      opts.interview_panel ? JSON.stringify(opts.interview_panel) : '[]',
      opts.discipline || null,
    ]
  );
  return rows[0];
}
```

- [ ] **Step 6: Run existing unit tests to verify nothing breaks**

```bash
cd dashboard-server && npm test
```
Expected: all tests pass. The new column is nullable with default NULL, so existing fixtures that don't pass `discipline` will still work.

- [ ] **Step 7: Commit**

```bash
git add dashboard-server/routes/hiring.js dashboard-server/routes/interview.js dashboard-server/tests/helpers/fixtures.js
git commit -m "feat(interview): add discipline to position API (GET/POST/PATCH) and test fixtures"
```

---

## Task 3: Position UI — discipline dropdown in create modal + detail panel + card badge

**Files:**
- Modify: `nbi_project_dashboard.html:20321-20368,21057-21081,20044`

- [ ] **Step 1: Add discipline dropdown to the create position modal**

In `nbi_project_dashboard.html`, find `openCreatePositionModal()` (line 20321). Find the `</div>` closing the Seniority/Type flex row (after line 20338, the closing `</div>` for the flex row). After that closing `</div>`, add a new flex row for Discipline and Location:

Replace the existing Location label (line 20341):
```js
      '<label style="font-size:0.78rem;color:var(--text-muted)">Location<input type="text" id="cpLocation" placeholder="e.g. Remote, London" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px"></label>' +
```

With a flex row containing Discipline dropdown + Location:
```js
      '<div style="display:flex;gap:8px">' +
        '<label style="flex:1;font-size:0.78rem;color:var(--text-muted)">Discipline<select id="cpDiscipline" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">' +
          '<option value="">— None —</option><option value="Engineering">Engineering</option><option value="Art">Art</option><option value="Narrative/Writing">Narrative/Writing</option><option value="Game Design">Game Design</option><option value="QA">QA</option><option value="Production">Production</option><option value="Audio">Audio</option><option value="HR/People">HR/People</option><option value="Leadership">Leadership</option></select></label>' +
        '<label style="flex:1;font-size:0.78rem;color:var(--text-muted)">Location<input type="text" id="cpLocation" placeholder="e.g. Remote, London" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px"></label>' +
      '</div>' +
```

- [ ] **Step 2: Add discipline to submitCreatePosition body**

In `submitCreatePosition()` (line 20361), find the body construction. Add `discipline` to the body object:
```js
  var body = {
    title: title.trim(),
    client_id: (document.getElementById('cpClient') || {}).value || null,
    seniority: (document.getElementById('cpSeniority') || {}).value || null,
    employment_type: (document.getElementById('cpType') || {}).value || 'permanent',
    salary_range: (document.getElementById('cpSalary') || {}).value || null,
    location: (document.getElementById('cpLocation') || {}).value || null,
    discipline: (document.getElementById('cpDiscipline') || {}).value || null,
  };
```

- [ ] **Step 3: Add discipline dropdown to position detail panel (admin view)**

In `openPositionDetail()` (line 21001), find the admin edit section with Status and Seniority dropdowns (lines 21066-21081). After the Seniority `</div>` (closing the seniority flex item around line 21080), add a Discipline flex item:

```js
        <div style="flex:1;min-width:120px">
          <div class="position-detail__info-label" style="margin-bottom:4px">Discipline</div>
          <select style="${inputStyle}" onchange="updatePositionField('${p.id}','discipline',this.value||null)">
            <option value="">— None —</option>
            ${['Engineering','Art','Narrative/Writing','Game Design','QA','Production','Audio','HR/People','Leadership'].map(d => `<option value="${d}" ${p.discipline===d?'selected':''}>${d}</option>`).join('')}
          </select>
        </div>
```

- [ ] **Step 4: Show discipline in read-only (non-admin) view**

In the non-admin section of the position detail (line 21060, where seniority is shown), add discipline display:
```js
        ${p.seniority && !isAdmin ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px">${esc(seniorityLabel)} level${p.discipline ? ' · ' + esc(p.discipline) : ''}</div>` : (!isAdmin && p.discipline ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-top:2px">${esc(p.discipline)}</div>` : '')}
```

- [ ] **Step 5: Add discipline badge to position card**

In the position card rendering (line 20044), find where the title and metadata are rendered. After the title line, add the discipline badge:
```js
              ${p.discipline ? `<div style="display:inline-block;font-size:0.7rem;padding:1px 8px;border-radius:10px;background:color-mix(in srgb, var(--accent) 15%, transparent);color:var(--accent);margin-top:4px">${esc(p.discipline)}</div>` : ''}
```

- [ ] **Step 6: Verify in browser**

Open http://localhost:8888/nbi_project_dashboard.html, navigate to Hiring > Positions. Create a new position — confirm discipline dropdown appears. Open an existing position — confirm discipline dropdown appears in admin view. Check position cards show discipline badge.

- [ ] **Step 7: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(interview): add discipline dropdown to position create modal, detail panel, and card badge"
```

---

## Task 4: Question picker — discipline filtering with accordion

**Files:**
- Modify: `nbi_project_dashboard.html:21772-21890` (openInterviewConfig function)

- [ ] **Step 1: Add position discipline lookup and restructure renderConfigPanel**

In `openInterviewConfig()` (line 21772), after `allQuestions` and `users` are loaded (line 21785), add the position discipline lookup:

```js
  const position = (_hiringPositionsData || []).find(p => p.id === positionId);
  const positionDiscipline = position ? position.discipline : null;
```

- [ ] **Step 2: Rewrite renderConfigPanel to group by discipline**

Replace the existing `renderConfigPanel` function body (lines 21796-21834). The new version groups questions by discipline with expand/collapse:

```js
  function renderConfigPanel() {
    const disciplines = {};
    for (const q of (allQuestions || [])) {
      const d = q.discipline || 'General';
      if (!disciplines[d]) disciplines[d] = {};
      if (!disciplines[d][q.category]) disciplines[d][q.category] = [];
      disciplines[d][q.category].push(q);
    }

    const categoryOrder = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
    const expandedDisciplines = window._ivExpandedDisc || new Set(positionDiscipline ? [positionDiscipline] : Object.keys(disciplines));
    window._ivExpandedDisc = expandedDisciplines;

    function renderDisciplineSection(discName, discQuestions, isMatched) {
      const total = Object.values(discQuestions).reduce((s, qs) => s + qs.length, 0);
      const selCount = Object.values(discQuestions).reduce((s, qs) => s + qs.filter(q => selectedIds.has(q.id)).length, 0);
      const isOpen = expandedDisciplines.has(discName);
      let html = '<div style="margin-bottom:12px;border:1px solid var(--border);border-radius:8px;overflow:hidden' + (isMatched ? ';border-color:var(--accent)' : '') + '">';
      html += '<div style="display:flex;align-items:center;gap:8px;padding:10px 12px;cursor:pointer;background:' + (isMatched ? 'color-mix(in srgb, var(--accent) 8%, var(--bg-card))' : 'var(--bg-elevated)') + '" onclick="window._ivToggleDisc(\'' + discName + '\')">';
      html += '<span style="transform:rotate(' + (isOpen ? '90' : '0') + 'deg);transition:transform 0.15s;font-size:10px">&#9654;</span>';
      html += '<span style="font-weight:600;font-size:13px">' + esc(discName) + '</span>';
      html += '<span style="font-size:11px;color:var(--text-muted)">' + total + ' questions</span>';
      if (selCount > 0) html += '<span style="font-size:11px;color:var(--accent);margin-left:auto">' + selCount + ' selected</span>';
      html += '</div>';
      if (isOpen) {
        html += '<div style="padding:8px 12px">';
        for (const cat of categoryOrder) {
          const qs = discQuestions[cat];
          if (!qs || qs.length === 0) continue;
          html += '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin:8px 0 4px">' + cat + '</div>';
          for (const q of qs) {
            html += '<label style="display:flex;align-items:flex-start;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;background:' + (selectedIds.has(q.id) ? 'var(--bg-elevated)' : 'transparent') + ';margin-bottom:2px;border:1px solid ' + (selectedIds.has(q.id) ? 'var(--accent)' : 'transparent') + '">';
            html += '<input type="checkbox" ' + (selectedIds.has(q.id) ? 'checked' : '') + ' onchange="window._ivToggleQ(\'' + q.id + '\')" style="margin-top:4px">';
            html += '<div><div style="font-size:14px;line-height:1.5">' + esc(q.question_text) + '</div>';
            html += '<div style="font-size:10px;color:var(--text-muted);margin-top:2px">' + q.source + (q.depth_type ? ' · ' + q.depth_type : '') + '</div></div></label>';
          }
        }
        html += '</div>';
      }
      html += '</div>';
      return html;
    }

    let questionsHtml = '';
    if (positionDiscipline) {
      questionsHtml += '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">Showing questions for: <strong style="color:var(--accent)">' + esc(positionDiscipline) + '</strong></div>';
      if (disciplines[positionDiscipline]) {
        questionsHtml += renderDisciplineSection(positionDiscipline, disciplines[positionDiscipline], true);
      }
      const otherDiscs = Object.keys(disciplines).filter(d => d !== positionDiscipline).sort();
      if (otherDiscs.length > 0) {
        const otherTotal = otherDiscs.reduce((s, d) => s + Object.values(disciplines[d]).reduce((s2, qs) => s2 + qs.length, 0), 0);
        questionsHtml += '<div style="font-size:11px;color:var(--text-muted);margin:12px 0 8px;padding-top:8px;border-top:1px solid var(--border)">Other disciplines (' + otherTotal + ' questions)</div>';
        for (const d of otherDiscs) {
          questionsHtml += renderDisciplineSection(d, disciplines[d], false);
        }
      }
    } else {
      questionsHtml += '<div style="background:color-mix(in srgb, #f59e0b 10%, var(--bg-card));border:1px solid #f59e0b;border-radius:6px;padding:8px 12px;font-size:12px;color:#f59e0b;margin-bottom:12px">This position has no discipline set — showing all questions. Set a discipline on the position to filter.</div>';
      for (const d of Object.keys(disciplines).sort()) {
        questionsHtml += renderDisciplineSection(d, disciplines[d], false);
      }
    }

    // Interviewers tab (unchanged logic)
    const interviewersHtml = (users || []).filter(u => u.is_active !== false && u.client_id === clientId).map(u =>
      '<label style="display:flex;align-items:center;gap:8px;padding:8px;cursor:pointer;border-bottom:1px solid var(--border)">' +
        '<input type="checkbox" ' + (selectedInterviewers.has(u.id) ? 'checked' : '') + ' onchange="window._ivToggleInterviewer(\'' + u.id + '\')">' +
        '<span>' + esc(u.display_name || u.username) + '</span>' +
        '<span style="color:var(--text-muted);font-size:12px">' + esc(u.email || '') + '</span></label>'
    ).join('');

    panel.innerHTML =
      '<div class="candidate-detail__header"><h3>Configure Interview</h3>' +
        '<button class="btn btn--sm" onclick="openCandidateDetail(\'' + candidateId + '\')">Back</button></div>' +
      '<div style="display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:12px">' +
        '<div style="padding:10px 16px;cursor:pointer;font-weight:' + (activeTab === 'questions' ? '600' : '400') + ';border-bottom:2px solid ' + (activeTab === 'questions' ? 'var(--accent)' : 'transparent') + '" onclick="window._ivSetTab(\'questions\')">Questions</div>' +
        '<div style="padding:10px 16px;cursor:pointer;font-weight:' + (activeTab === 'interviewers' ? '600' : '400') + ';border-bottom:2px solid ' + (activeTab === 'interviewers' ? 'var(--accent)' : 'transparent') + '" onclick="window._ivSetTab(\'interviewers\')">Interviewers</div></div>' +
      (activeTab === 'questions'
        ? '<div style="display:flex;gap:8px;margin-bottom:12px">' +
            '<button class="btn btn--sm" onclick="window._ivAddCustom()">+ Custom Question</button></div>' +
          '<div style="font-weight:600;margin-bottom:8px;color:var(--accent)">' + selectedIds.size + ' selected</div>' +
          '<div style="max-height:400px;overflow-y:auto">' + (questionsHtml || '<p style="color:var(--text-muted)">No questions in bank. Add custom questions.</p>') + '</div>'
        : '<div style="max-height:400px;overflow-y:auto">' + (interviewersHtml || '<p style="color:var(--text-muted)">No team members found.</p>') + '</div>') +
      '<div style="border-top:1px solid var(--border);padding-top:12px;margin-top:12px;display:flex;justify-content:space-between;align-items:center">' +
        '<span style="color:var(--text-muted);font-size:13px">' + selectedIds.size + ' questions · ' + selectedInterviewers.size + ' interviewers</span>' +
        '<button class="btn btn--primary" ' + (selectedIds.size === 0 || selectedInterviewers.size === 0 ? 'disabled' : '') + ' onclick="window._ivSendInterviews()">Send Interviews</button></div>';
  }
```

- [ ] **Step 3: Add discipline toggle handler**

After the existing handlers (line 21838), add:
```js
  window._ivToggleDisc = function(disc) {
    if (expandedDisciplines.has(disc)) expandedDisciplines.delete(disc);
    else expandedDisciplines.add(disc);
    window._ivExpandedDisc = expandedDisciplines;
    renderConfigPanel();
  };
```

Note: `expandedDisciplines` is referenced from the closure created in Step 2 — it's the `window._ivExpandedDisc` set initialised in `renderConfigPanel`.

- [ ] **Step 4: Fix custom question form to inherit discipline**

Find `window._ivSaveCustom` (line 21859). Change the hardcoded `discipline: 'General'` to use the position discipline:

```js
      body: JSON.stringify({ client_id: clientId || null, discipline: positionDiscipline || 'General', category: cat.value, question_text: text.value.trim() }),
```

- [ ] **Step 5: Verify in browser**

Navigate to Hiring, open a candidate in the "interviews" stage, click "Configure Interview". Verify:
- Questions grouped by discipline with expand/collapse
- If position has discipline set, that discipline is expanded and highlighted
- If position has no discipline, all are expanded with warning banner
- Custom questions inherit the position's discipline

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(interview): discipline-grouped question picker with accordion and position filtering"
```

---

## Task 5: Focused interview scorecard — full-page scoring view

**Files:**
- Modify: `nbi_project_dashboard.html` — add CSS, scorecard JS functions, hash route, deep-link checks

This is the largest task. It adds ~300 lines of CSS+JS to the monolithic HTML.

- [ ] **Step 1: Add scorecard CSS**

Find the end of the existing interview CSS (around line 2300, after `.ats-interview-block` styles). Add the scorecard styles:

```css
/* ===== Interview Scorecard (full-page) ===== */
.interview-scorecard { position: fixed; inset: 0; z-index: 9999; background: var(--bg-body); display: flex; flex-direction: column; overflow: hidden; }
.interview-scorecard__header { height: 56px; display: flex; align-items: center; padding: 0 24px; gap: 16px; border-bottom: 1px solid var(--border); background: var(--bg-card); flex-shrink: 0; }
.interview-scorecard__header-left { display: flex; align-items: center; gap: 8px; font-size: 14px; min-width: 0; }
.interview-scorecard__header-left span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.interview-scorecard__header-centre { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; }
.interview-scorecard__progress-bar { width: 200px; height: 6px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; }
.interview-scorecard__progress-fill { height: 100%; background: var(--accent); border-radius: 3px; transition: width 0.3s; }
.interview-scorecard__header-right { flex-shrink: 0; }
.interview-scorecard__categories { display: flex; gap: 12px; padding: 12px 24px; border-bottom: 1px solid var(--border); background: var(--bg-card); flex-shrink: 0; flex-wrap: wrap; }
.interview-scorecard__cat-bar { flex: 1; min-width: 100px; cursor: pointer; }
.interview-scorecard__cat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.interview-scorecard__cat-track { height: 4px; background: var(--bg-elevated); border-radius: 2px; overflow: hidden; }
.interview-scorecard__cat-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
.interview-scorecard__body { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; overflow-y: auto; }
.interview-scorecard__card { max-width: 700px; width: 100%; }
.interview-scorecard__card-badges { display: flex; justify-content: space-between; margin-bottom: 16px; }
.interview-scorecard__badge { font-size: 11px; padding: 2px 10px; border-radius: 10px; font-weight: 600; text-transform: uppercase; }
.interview-scorecard__question-text { font-size: 18px; line-height: 1.6; color: var(--text-primary); margin-bottom: 24px; }
.interview-scorecard__scores { display: flex; gap: 8px; justify-content: center; margin-bottom: 16px; }
.interview-scorecard__score-btn { width: 72px; padding: 12px 0; border: 2px solid var(--border); border-radius: 8px; background: transparent; color: var(--text-primary); cursor: pointer; text-align: center; font-size: 14px; font-weight: 600; transition: all 0.15s; }
.interview-scorecard__score-btn:hover { border-color: var(--accent); }
.interview-scorecard__score-btn--selected { border-color: transparent; color: #fff; }
.interview-scorecard__score-btn--1.interview-scorecard__score-btn--selected,
.interview-scorecard__score-btn--2.interview-scorecard__score-btn--selected { background: #dc2626; }
.interview-scorecard__score-btn--3.interview-scorecard__score-btn--selected { background: #d97706; }
.interview-scorecard__score-btn--4.interview-scorecard__score-btn--selected,
.interview-scorecard__score-btn--5.interview-scorecard__score-btn--selected { background: #16a34a; }
.interview-scorecard__score-label { font-size: 10px; font-weight: 400; display: block; margin-top: 2px; }
.interview-scorecard__score-btn.unsaved::after { content: ''; position: absolute; top: 4px; right: 4px; width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; }
.interview-scorecard__score-btn { position: relative; }
.interview-scorecard__notes-toggle { font-size: 13px; color: var(--accent); cursor: pointer; border: none; background: none; padding: 0; }
.interview-scorecard__notes { width: 100%; margin-top: 8px; font-size: 14px; padding: 8px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); resize: vertical; min-height: 60px; }
.interview-scorecard__nav { height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-top: 1px solid var(--border); background: var(--bg-card); flex-shrink: 0; }
.interview-scorecard__dots { display: flex; gap: 6px; align-items: center; }
.interview-scorecard__dot { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--text-muted); background: transparent; cursor: pointer; transition: all 0.15s; padding: 0; }
.interview-scorecard__dot--scored { background: var(--accent); border-color: var(--accent); }
.interview-scorecard__dot--current { border-color: var(--accent); box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent); }
.interview-scorecard__splash { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 16px; max-width: 500px; margin: 0 auto; }
.interview-scorecard__splash h2 { font-size: 24px; margin: 0; }
.interview-scorecard__splash .meta { font-size: 14px; color: var(--text-muted); }
.interview-scorecard__splash .info { font-size: 13px; color: var(--text-secondary); }
.interview-scorecard__submitted { max-width: 600px; width: 100%; }
@media (max-width: 480px) {
  .interview-scorecard__scores { flex-wrap: wrap; justify-content: center; }
  .interview-scorecard__score-btn { width: calc(33% - 6px); }
  .interview-scorecard__header { padding: 0 12px; gap: 8px; }
  .interview-scorecard__header-centre { display: none; }
  .interview-scorecard__body { padding: 16px; }
  .interview-scorecard__question-text { font-size: 16px; }
  .interview-scorecard__dots { gap: 4px; }
  .interview-scorecard__dot { width: 8px; height: 8px; }
}
```

- [ ] **Step 2: Add the scorecard container div**

Find the existing interview-related HTML containers (near line 3265-3268, where `candidateDetailOverlay` and `positionDetailPanel` are). Add the scorecard container after them:

```html
<div id="interviewScorecardView" class="interview-scorecard" style="display:none"></div>
```

- [ ] **Step 3: Add openInterviewScorecard function**

Add the full scorecard function after `openInterviewResults` (after line 21980). This is the core function — ~150 lines:

```js
async function openInterviewScorecard(sessionId) {
  const container = document.getElementById('interviewScorecardView');
  if (!container) return;

  container.style.display = 'flex';
  container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;flex:1;color:var(--text-muted)">Loading scorecard…</div>';
  document.getElementById('appContainer').style.display = 'none';

  let data;
  try {
    const resp = await authFetch('/api/interview-sessions/' + sessionId);
    if (resp.status === 401) { container.innerHTML = '<div class="interview-scorecard__body"><div class="interview-scorecard__splash"><h2>Please log in</h2><p class="meta">You need to be logged in to view this scorecard.</p><button class="btn btn--primary" onclick="closeInterviewScorecard()">Back to Dashboard</button></div></div>'; return; }
    if (resp.status === 403) { container.innerHTML = '<div class="interview-scorecard__body"><div class="interview-scorecard__splash"><h2>Access Denied</h2><p class="meta">You are not assigned to this interview.</p><button class="btn btn--primary" onclick="closeInterviewScorecard()">Back to Dashboard</button></div></div>'; return; }
    if (!resp.ok) { container.innerHTML = '<div class="interview-scorecard__body"><div class="interview-scorecard__splash"><h2>Not Found</h2><p class="meta">Interview session not found.</p><button class="btn btn--primary" onclick="closeInterviewScorecard()">Back to Dashboard</button></div></div>'; return; }
    data = await resp.json();
  } catch (e) {
    container.innerHTML = '<div class="interview-scorecard__body"><div class="interview-scorecard__splash"><h2>Connection Error</h2><p class="meta">Could not load the scorecard. Please try again.</p><button class="btn btn--primary" onclick="closeInterviewScorecard()">Back to Dashboard</button></div></div>';
    return;
  }

  const { session, questions } = data;
  const categoryOrder = ['culture', 'technical', 'collaboration', 'leadership', 'depth'];
  const catColours = { culture: '#3b82f6', technical: '#7c3aed', collaboration: '#16a34a', leadership: '#d97706', depth: '#e8a87c' };
  let currentIdx = 0;
  let showNotes = {};
  const localScores = {};
  for (const q of questions) {
    if (q.score) localScores[q.question_id] = { score: q.score, notes: q.score_notes || '' };
  }

  if (session.status === 'submitted') { renderSubmitted(); return; }
  if (session.status === 'assigned') { renderSplash(); return; }
  // in_progress — find first unscored
  currentIdx = questions.findIndex(q => !localScores[q.question_id]);
  if (currentIdx < 0) currentIdx = 0;
  renderScoring();

  function renderSplash() {
    const estTime = questions.length * 2;
    container.innerHTML =
      '<div class="interview-scorecard__body"><div class="interview-scorecard__splash">' +
      '<h2>' + esc(session.candidate_name || 'Candidate') + '</h2>' +
      '<p class="meta">' + esc(session.candidate_role || '') + (session.position_title ? ' — ' + esc(session.position_title) : '') + '</p>' +
      (session.client_name ? '<p class="meta">' + esc(session.client_name) + '</p>' : '') +
      '<p class="info">' + questions.length + ' questions · ~' + estTime + ' minutes</p>' +
      '<p class="info" style="font-style:italic;max-width:400px">These scores are confidential — only the hiring manager will see aggregated results.</p>' +
      '<button class="btn btn--primary" style="padding:12px 32px;font-size:16px" onclick="window._scStart()">Begin Scoring</button>' +
      '<button class="btn" style="margin-top:8px" onclick="closeInterviewScorecard()">Cancel</button>' +
      '</div></div>';
    window._scStart = function() { renderScoring(); };
  }

  function renderSubmitted() {
    let html = '<div class="interview-scorecard__header"><div class="interview-scorecard__header-left"><strong>' + esc(session.candidate_name || 'Candidate') + '</strong></div><div class="interview-scorecard__header-right"><button class="btn btn--sm" onclick="closeInterviewScorecard()">Close</button></div></div>';
    html += '<div class="interview-scorecard__body"><div class="interview-scorecard__submitted">';
    html += '<div style="text-align:center;margin-bottom:24px;padding:16px;background:color-mix(in srgb, var(--success) 10%, var(--bg-card));border-radius:8px;border:1px solid var(--success)"><div style="font-size:18px;font-weight:600;color:var(--success)">Your scorecard has been submitted — thank you</div>';
    html += session.submitted_at ? '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">Submitted ' + new Date(session.submitted_at).toLocaleString('en-GB') + '</div>' : '';
    html += '</div>';
    let currentCat = '';
    for (const q of questions) {
      if (q.category !== currentCat) { currentCat = q.category; html += '<div style="font-size:10px;text-transform:uppercase;letter-spacing:1px;color:' + (catColours[currentCat] || 'var(--text-muted)') + ';margin:16px 0 8px;font-weight:600">' + currentCat + '</div>'; }
      const sc = localScores[q.question_id];
      const scoreBg = sc ? (sc.score >= 4 ? '#16a34a' : sc.score === 3 ? '#d97706' : '#dc2626') : 'var(--text-muted)';
      html += '<div style="display:flex;gap:12px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border)">';
      html += '<span style="flex-shrink:0;width:28px;height:28px;border-radius:6px;background:' + scoreBg + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:14px">' + (sc ? sc.score : '—') + '</span>';
      html += '<div style="flex:1"><div style="font-size:14px;line-height:1.5">' + esc(q.question_text) + '</div>';
      if (sc && sc.notes) html += '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;font-style:italic">' + esc(sc.notes) + '</div>';
      html += '</div></div>';
    }
    html += '</div></div>';
    container.innerHTML = html;
  }

  function renderScoring() {
    const q = questions[currentIdx];
    const scored = Object.keys(localScores).length;
    const pct = questions.length > 0 ? (scored / questions.length) * 100 : 0;

    let catBarsHtml = '';
    for (const cat of categoryOrder) {
      const catQs = questions.filter(x => x.category === cat);
      const catScored = catQs.filter(x => localScores[x.question_id]).length;
      const catPct = catQs.length > 0 ? (catScored / catQs.length) * 100 : 0;
      catBarsHtml += '<div class="interview-scorecard__cat-bar" onclick="window._scJumpCat(\'' + cat + '\')">' +
        '<div class="interview-scorecard__cat-label" style="color:' + (catColours[cat] || 'var(--text-muted)') + '">' + cat + ' ' + catScored + '/' + catQs.length + '</div>' +
        '<div class="interview-scorecard__cat-track"><div class="interview-scorecard__cat-fill" style="width:' + catPct + '%;background:' + (catColours[cat] || 'var(--accent)') + '"></div></div></div>';
    }

    const sc = localScores[q.question_id];
    const scoreLabels = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'];
    let scoreBtnsHtml = '';
    for (let s = 1; s <= 5; s++) {
      const sel = sc && sc.score === s;
      scoreBtnsHtml += '<button class="interview-scorecard__score-btn interview-scorecard__score-btn--' + s + (sel ? ' interview-scorecard__score-btn--selected' : '') + '" onclick="window._scScore(' + s + ')">' + s + '<span class="interview-scorecard__score-label">' + scoreLabels[s] + '</span></button>';
    }

    const showingNotes = showNotes[q.question_id] || (sc && sc.notes);
    let notesHtml = '';
    if (showingNotes) {
      notesHtml = '<textarea class="interview-scorecard__notes" placeholder="Optional — add context for the hiring manager" onchange="window._scNotes(this.value)">' + esc(sc && sc.notes ? sc.notes : '') + '</textarea>';
    } else {
      notesHtml = '<button class="interview-scorecard__notes-toggle" onclick="window._scShowNotes()">+ Add notes</button>';
    }

    let dotsHtml = '';
    for (let i = 0; i < questions.length; i++) {
      const dotClass = i === currentIdx ? ' interview-scorecard__dot--current' : (localScores[questions[i].question_id] ? ' interview-scorecard__dot--scored' : '');
      dotsHtml += '<button class="interview-scorecard__dot' + dotClass + '" onclick="window._scJump(' + i + ')"></button>';
    }

    const allScored = scored >= questions.length;
    const isLast = currentIdx === questions.length - 1;
    let navRightHtml = '';
    if (isLast && allScored) {
      navRightHtml = '<button class="btn btn--primary" onclick="window._scSubmit()">Submit Scorecard</button>';
    } else {
      navRightHtml = '<button class="btn btn--sm" ' + (isLast ? 'disabled' : '') + ' onclick="window._scNav(1)">Next &rarr;</button>';
    }

    container.innerHTML =
      '<div class="interview-scorecard__header">' +
        '<div class="interview-scorecard__header-left"><strong>' + esc(session.candidate_name || 'Candidate') + '</strong><span style="color:var(--text-muted)">·</span><span style="color:var(--text-muted)">' + esc(session.candidate_role || '') + '</span>' + (session.client_name ? '<span style="color:var(--text-muted)">·</span><span style="color:var(--text-muted)">' + esc(session.client_name) + '</span>' : '') + '</div>' +
        '<div class="interview-scorecard__header-centre"><span style="font-size:12px;color:var(--text-muted)">' + scored + ' of ' + questions.length + '</span><div class="interview-scorecard__progress-bar"><div class="interview-scorecard__progress-fill" style="width:' + pct + '%"></div></div></div>' +
        '<div class="interview-scorecard__header-right"><button class="btn btn--sm" onclick="closeInterviewScorecard()">Save &amp; Exit</button></div>' +
      '</div>' +
      '<div class="interview-scorecard__categories">' + catBarsHtml + '</div>' +
      '<div class="interview-scorecard__body"><div class="interview-scorecard__card">' +
        '<div class="interview-scorecard__card-badges"><span class="interview-scorecard__badge" style="background:color-mix(in srgb, ' + (catColours[q.category] || 'var(--accent)') + ' 15%, transparent);color:' + (catColours[q.category] || 'var(--accent)') + '">' + q.category + '</span>' +
        (q.discipline ? '<span class="interview-scorecard__badge" style="background:var(--bg-elevated);color:var(--text-muted)">' + esc(q.discipline) + '</span>' : '') + '</div>' +
        '<div class="interview-scorecard__question-text">' + esc(q.question_text) + '</div>' +
        '<div class="interview-scorecard__scores">' + scoreBtnsHtml + '</div>' +
        '<div style="text-align:center">' + notesHtml + '</div>' +
      '</div></div>' +
      '<div class="interview-scorecard__nav">' +
        '<button class="btn btn--sm" ' + (currentIdx === 0 ? 'disabled' : '') + ' onclick="window._scNav(-1)">&larr; Previous</button>' +
        '<div class="interview-scorecard__dots">' + dotsHtml + '</div>' +
        navRightHtml +
      '</div>';
  }

  // --- Scorecard event handlers ---
  window._scNav = function(dir) { currentIdx = Math.max(0, Math.min(questions.length - 1, currentIdx + dir)); renderScoring(); };
  window._scJump = function(idx) { currentIdx = idx; renderScoring(); };
  window._scJumpCat = function(cat) {
    const idx = questions.findIndex(q => q.category === cat && !localScores[q.question_id]);
    if (idx >= 0) { currentIdx = idx; renderScoring(); }
    else { const firstInCat = questions.findIndex(q => q.category === cat); if (firstInCat >= 0) { currentIdx = firstInCat; renderScoring(); } }
  };
  window._scShowNotes = function() { showNotes[questions[currentIdx].question_id] = true; renderScoring(); };
  window._scNotes = function(val) {
    const qid = questions[currentIdx].question_id;
    if (localScores[qid]) localScores[qid].notes = val;
  };

  window._scScore = async function(score) {
    const q = questions[currentIdx];
    localScores[q.question_id] = { score, notes: (localScores[q.question_id] || {}).notes || '' };
    renderScoring();
    try {
      await authFetch('/api/interview-scores/' + sessionId + '/' + q.question_id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, notes: localScores[q.question_id].notes || null }),
      });
    } catch (e) {
      toast('Score not saved — check your connection', 'error');
    }
  };

  window._scSubmit = async function() {
    if (!confirm('Submit your scorecard for ' + (session.candidate_name || 'this candidate') + '? You won\'t be able to change your scores after submission.')) return;
    // Save any pending notes on current question
    const q = questions[currentIdx];
    const sc = localScores[q.question_id];
    if (sc && sc.notes) {
      try { await authFetch('/api/interview-scores/' + sessionId + '/' + q.question_id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ score: sc.score, notes: sc.notes }) }); } catch (e) {}
    }
    try {
      const resp = await authFetch('/api/interview-sessions/' + sessionId + '/submit', { method: 'POST' });
      if (!resp.ok) { const err = await resp.json().catch(() => ({})); toast(err.error || 'Submission failed', 'error'); return; }
      session.status = 'submitted';
      session.submitted_at = new Date().toISOString();
      renderSubmitted();
    } catch (e) {
      toast('Submission failed — check your connection', 'error');
    }
  };

  // Keyboard handler — scoped to container
  function scorecardKeyHandler(e) {
    if (session.status === 'submitted') return;
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowLeft') { window._scNav(-1); e.preventDefault(); }
    else if (e.key === 'ArrowRight') { window._scNav(1); e.preventDefault(); }
    else if (['1','2','3','4','5'].includes(e.key)) { window._scScore(parseInt(e.key)); e.preventDefault(); }
  }
  container.setAttribute('tabindex', '-1');
  container.focus();
  container.addEventListener('keydown', scorecardKeyHandler);
  window._scCleanup = function() { container.removeEventListener('keydown', scorecardKeyHandler); };
}

function closeInterviewScorecard() {
  const container = document.getElementById('interviewScorecardView');
  if (container) { container.style.display = 'none'; container.innerHTML = ''; }
  if (window._scCleanup) { window._scCleanup(); window._scCleanup = null; }
  document.getElementById('appContainer').style.display = '';
  // Clean up all scorecard window handlers
  ['_scNav','_scJump','_scJumpCat','_scShowNotes','_scNotes','_scScore','_scSubmit','_scStart'].forEach(k => { delete window[k]; });
}
```

- [ ] **Step 4: Add hash route and deep-link check**

Find the `hashchange` listener (line 26408). Before the closing `});`, add the interview clause:

```js
  if (hash.startsWith('#interview/')) {
    const sessionId = hash.replace('#interview/', '');
    if (sessionId && /^[a-f0-9-]+$/i.test(sessionId)) {
      openInterviewScorecard(sessionId);
    }
    window.location.hash = '';
  }
```

Add the deep-link check function (anywhere near `checkExpenseReportDeepLink`, around line 4001):

```js
function checkInterviewDeepLink() {
  const hash = window.location.hash;
  const m = hash.match(/#interview\/([a-f0-9-]+)/i);
  if (m) {
    setTimeout(() => openInterviewScorecard(m[1]), 300);
    window.location.hash = '';
  }
}
```

Call it at both post-login points:
1. In `handleLogin` (line 3993), after `checkExpenseReportDeepLink();`:
   ```js
   checkInterviewDeepLink();
   ```
2. In the session restore block (line 27614), after `checkExpenseReportDeepLink();`:
   ```js
   checkInterviewDeepLink();
   ```

- [ ] **Step 5: Verify in browser**

Test the scorecard by navigating to `http://localhost:8888/nbi_project_dashboard.html#interview/{sessionId}` (use a session ID from the database). Verify:
- Splash screen shows for `assigned` sessions
- Scoring flow works: click scores, navigate questions, see progress
- Keyboard nav works (arrow keys, number keys)
- Submit flow works
- Close/exit restores normal view

- [ ] **Step 6: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(interview): add full-page scorecard view with hash routing, deep links, and keyboard nav"
```

---

## Task 6: Question bank management tab

**Files:**
- Modify: `nbi_project_dashboard.html:20105,20122,20131` (tab registration + render function)

- [ ] **Step 1: Register the tab**

In the hiring page render function, find `tabLabels` (line 20105):
```js
  var tabLabels = { pipeline: 'Pipeline', positions: 'Positions', database: 'Database', calendar: 'Calendar', metrics: 'Metrics' };
```
Add `questions`:
```js
  var tabLabels = { pipeline: 'Pipeline', positions: 'Positions', database: 'Database', calendar: 'Calendar', metrics: 'Metrics', questions: 'Questions' };
```

- [ ] **Step 2: Gate tab visibility to NBI users only**

Find the tab rendering loop (line 20122). Currently:
```js
      html += '<div class="ats-tab' + (activeTab === t ? ' active' : '') + '" role="tab" onclick="window._hiringActiveTab=\'' + t + '\';renderContent()">' + tabLabels[t] + '</div>';
```
Add a skip for client users on the questions tab:
```js
      if (t === 'questions' && isClientUser()) continue;
      html += '<div class="ats-tab' + (activeTab === t ? ' active' : '') + '" role="tab" onclick="window._hiringActiveTab=\'' + t + '\';renderContent()">' + tabLabels[t] + '</div>';
```

- [ ] **Step 3: Add tab dispatch**

Find the switch statement (line 20131):
```js
    case 'metrics': renderMetricsTab(tabEl); break;
```
Add after it:
```js
    case 'questions': renderQuestionsTab(tabEl); break;
```

- [ ] **Step 4: Implement renderQuestionsTab**

Add the function after `renderMetricsTab` (or wherever the other tab render functions end). This is ~120 lines:

```js
async function renderQuestionsTab(container) {
  const isAdmin = _currentUser && _currentUser.role === 'admin';
  const DISCIPLINES = ['Engineering','Art','Narrative/Writing','Game Design','QA','Production','Audio','HR/People','Leadership'];
  const CATEGORIES = ['culture','technical','collaboration','leadership','depth'];
  const CATEGORY_ORDER = { culture: 0, technical: 1, collaboration: 2, leadership: 3, depth: 4 };

  const filterClient = window._qbFilterClient || window._hiringFilterClient || '';
  const filterDisc = window._qbFilterDisc || '';
  const filterCat = window._qbFilterCat || '';
  const filterSearch = window._qbFilterSearch || '';

  // Filter bar
  const clientOptions = getContractedClientRecords();
  let html = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:16px">';
  html += '<select onchange="window._qbFilterClient=this.value;renderContent()" style="font-size:13px;padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">';
  html += '<option value="">All clients</option>';
  clientOptions.forEach(c => { html += '<option value="' + c.id + '"' + (filterClient === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; });
  html += '</select>';
  html += '<select onchange="window._qbFilterDisc=this.value;renderContent()" style="font-size:13px;padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)">';
  html += '<option value="">All disciplines</option>';
  DISCIPLINES.forEach(d => { html += '<option value="' + d + '"' + (filterDisc === d ? ' selected' : '') + '>' + d + '</option>'; });
  html += '</select>';
  // Category pills
  html += '<div style="display:flex;gap:4px">';
  html += '<span style="padding:4px 10px;border-radius:12px;font-size:12px;cursor:pointer;' + (!filterCat ? 'background:var(--accent);color:#fff' : 'background:var(--bg-elevated);color:var(--text-muted)') + '" onclick="window._qbFilterCat=\'\';renderContent()">All</span>';
  CATEGORIES.forEach(cat => {
    html += '<span style="padding:4px 10px;border-radius:12px;font-size:12px;cursor:pointer;text-transform:capitalize;' + (filterCat === cat ? 'background:var(--accent);color:#fff' : 'background:var(--bg-elevated);color:var(--text-muted)') + '" onclick="window._qbFilterCat=\'' + cat + '\';renderContent()">' + cat + '</span>';
  });
  html += '</div>';
  html += '<input type="text" placeholder="Search questions…" value="' + esc(filterSearch) + '" oninput="window._qbFilterSearch=this.value;clearTimeout(window._qbSearchTimer);window._qbSearchTimer=setTimeout(function(){renderContent()},300)" style="font-size:13px;padding:4px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);min-width:150px">';
  if (isAdmin) html += '<button class="btn btn--primary btn--sm" style="margin-left:auto" onclick="window._qbOpenModal()">+ New Question</button>';
  html += '</div>';

  container.innerHTML = html + '<div id="qbQuestionsList" style="color:var(--text-muted)">Loading questions…</div>';

  // Fetch
  const params = new URLSearchParams();
  if (filterClient) params.set('client_id', filterClient);
  if (filterDisc) params.set('discipline', filterDisc);
  let questions = [];
  try {
    const resp = await authFetch('/api/interview-questions?' + params);
    if (resp.ok) questions = await resp.json();
  } catch (e) {}

  // Client-side filters
  if (filterCat) questions = questions.filter(q => q.category === filterCat);
  if (filterSearch) {
    const s = filterSearch.toLowerCase();
    questions = questions.filter(q => q.question_text.toLowerCase().includes(s));
  }

  // Group by discipline, sort by category
  const grouped = {};
  questions.forEach(q => {
    const d = q.discipline || 'General';
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(q);
  });
  for (const d in grouped) grouped[d].sort((a, b) => (CATEGORY_ORDER[a.category] || 99) - (CATEGORY_ORDER[b.category] || 99));

  const listEl = document.getElementById('qbQuestionsList');
  if (!listEl) return;

  if (questions.length === 0) {
    listEl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted)">No questions match your filters. Try adjusting your search or filters.</div>';
    return;
  }

  let listHtml = '<div style="font-size:12px;color:var(--text-muted);margin-bottom:8px">' + questions.length + ' question' + (questions.length !== 1 ? 's' : '') + '</div>';
  const catColours = { culture: '#3b82f6', technical: '#7c3aed', collaboration: '#16a34a', leadership: '#d97706', depth: '#e8a87c' };
  const sourceColours = { curated: '#16a34a', custom: '#3b82f6', ai_generated: '#7c3aed' };

  for (const disc of Object.keys(grouped).sort()) {
    const qs = grouped[disc];
    listHtml += '<div style="margin-bottom:16px">';
    listHtml += '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--accent);font-weight:600;margin-bottom:8px">' + esc(disc) + ' <span style="color:var(--text-muted);font-weight:400">(' + qs.length + ')</span></div>';
    for (const q of qs) {
      listHtml += '<div style="display:flex;gap:12px;align-items:flex-start;padding:10px 12px;border:1px solid var(--border);border-radius:6px;margin-bottom:4px;background:var(--bg-card)">';
      listHtml += '<div style="flex:1;min-width:0"><div style="font-size:14px;line-height:1.5">' + esc(q.question_text) + '</div>';
      listHtml += '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">';
      listHtml += '<span style="font-size:10px;padding:1px 8px;border-radius:8px;background:color-mix(in srgb, ' + (catColours[q.category] || 'var(--accent)') + ' 15%, transparent);color:' + (catColours[q.category] || 'var(--accent)') + '">' + q.category + '</span>';
      listHtml += '<span style="font-size:10px;padding:1px 8px;border-radius:8px;background:color-mix(in srgb, ' + (sourceColours[q.source] || '#6b7280') + ' 15%, transparent);color:' + (sourceColours[q.source] || '#6b7280') + '">' + q.source + '</span>';
      if (q.created_by_name) listHtml += '<span style="font-size:10px;color:var(--text-muted)">by ' + esc(q.created_by_name) + '</span>';
      listHtml += '</div></div>';
      if (isAdmin) {
        listHtml += '<div style="display:flex;gap:4px;flex-shrink:0">';
        listHtml += '<button class="btn btn--ghost btn--sm" onclick="window._qbEdit(\'' + q.id + '\')" title="Edit">&#9998;</button>';
        listHtml += '<button class="btn btn--ghost btn--sm" style="color:var(--danger)" onclick="window._qbDelete(\'' + q.id + '\')" title="Delete">&times;</button>';
        listHtml += '</div>';
      }
      listHtml += '</div>';
    }
    listHtml += '</div>';
  }
  listEl.innerHTML = listHtml;

  // Store questions for edit/delete handlers
  window._qbQuestions = questions;
}
```

- [ ] **Step 5: Add CRUD modal functions**

Add these after `renderQuestionsTab`:

```js
window._qbOpenModal = function(existingId) {
  const DISCIPLINES = ['Engineering','Art','Narrative/Writing','Game Design','QA','Production','Audio','HR/People','Leadership'];
  const CATEGORIES = ['culture','technical','collaboration','leadership','depth'];
  const existing = existingId ? (window._qbQuestions || []).find(q => q.id === existingId) : null;
  const isEdit = !!existing;
  const clientOptions = getContractedClientRecords();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = '<div class="modal" style="min-width:400px;max-width:560px">' +
    '<div class="modal__title">' + (isEdit ? 'Edit Question' : 'New Question') + '</div>' +
    '<div style="display:flex;flex-direction:column;gap:10px">' +
      '<label style="font-size:0.78rem;color:var(--text-muted)">Question *<textarea id="qbModalText" rows="4" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px;resize:vertical">' + (existing ? esc(existing.question_text) : '') + '</textarea></label>' +
      '<div style="display:flex;gap:8px">' +
        '<label style="flex:1;font-size:0.78rem;color:var(--text-muted)">Discipline *<select id="qbModalDisc" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">' +
          DISCIPLINES.map(d => '<option value="' + d + '"' + (existing && existing.discipline === d ? ' selected' : '') + '>' + d + '</option>').join('') +
        '</select></label>' +
        '<label style="flex:1;font-size:0.78rem;color:var(--text-muted)">Category *<select id="qbModalCat" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px">' +
          CATEGORIES.map(c => '<option value="' + c + '"' + (existing && existing.category === c ? ' selected' : '') + '>' + c.charAt(0).toUpperCase() + c.slice(1) + '</option>').join('') +
        '</select></label>' +
      '</div>' +
      (!isEdit ? '<label style="font-size:0.78rem;color:var(--text-muted)">Client<select id="qbModalClient" style="width:100%;padding:6px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.85rem;margin-top:4px"><option value="">— None —</option>' + clientOptions.map(c => '<option value="' + c.id + '"' + (window._qbFilterClient === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('') + '</select></label>' : '') +
    '</div>' +
    '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px">' +
      '<button class="btn" onclick="this.closest(\'.modal-overlay\').remove()">Cancel</button>' +
      '<button class="btn btn--primary" onclick="window._qbModalSave(\'' + (existingId || '') + '\')">' + (isEdit ? 'Save' : 'Create') + '</button>' +
    '</div></div>';

  document.body.appendChild(modal);
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  setTimeout(() => { var el = modal.querySelector('#qbModalText'); if (el) el.focus(); }, 0);
};

window._qbModalSave = async function(existingId) {
  const text = (document.getElementById('qbModalText') || {}).value;
  if (!text || !text.trim()) { toast('Question text is required', 'error'); return; }
  const discipline = (document.getElementById('qbModalDisc') || {}).value;
  const category = (document.getElementById('qbModalCat') || {}).value;

  if (existingId) {
    await authFetch('/api/interview-questions/' + existingId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_text: text.trim(), discipline, category }),
    });
  } else {
    const client_id = (document.getElementById('qbModalClient') || {}).value || null;
    await authFetch('/api/interview-questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_text: text.trim(), discipline, category, client_id, source: 'custom' }),
    });
  }
  document.querySelector('.modal-overlay')?.remove();
  renderContent();
};

window._qbEdit = function(id) { window._qbOpenModal(id); };

window._qbDelete = async function(id) {
  if (!confirm('Delete this question? This cannot be undone.')) return;
  await authFetch('/api/interview-questions/' + id, { method: 'DELETE' });
  renderContent();
};
```

- [ ] **Step 6: Verify in browser**

Navigate to Hiring > Questions tab. Verify:
- Tab visible for NBI users, hidden for client users
- Filters work (client, discipline, category, search)
- Questions grouped by discipline with category badges
- Create modal works
- Edit modal pre-populates correctly
- Delete with confirmation works

- [ ] **Step 7: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat(interview): add Questions management tab to hiring page with CRUD modals"
```

---

## Task 7: Question quality pass

**Files:**
- No file changes — API calls to review and update seeded questions
- Create: `docs/interview-question-quality-log.md` (change log)

- [ ] **Step 1: Verify question count**

Run from `dashboard-server/`:
```bash
node -e "require('dotenv').config(); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query(\"SELECT discipline, COUNT(*)::int as cnt FROM interview_question_bank WHERE client_id = '21be0772-73e5-4cca-8795-8b1a66f89ec2' GROUP BY discipline ORDER BY discipline\").then(r=>{console.log(JSON.stringify(r.rows,null,2));console.log('Total:',r.rows.reduce((s,r)=>s+r.cnt,0));p.end()})"
```

- [ ] **Step 2: Fetch all questions and review**

Fetch all questions via the API and review against the 7 criteria in the spec:
1. Specific to Couch Heroes context
2. No generic "tell me about a time" phrasing
3. Correctly categorised
4. No near-duplicates
5. Mid-level seniority calibration
6. Correct depth_type
7. British English, grammatically correct

- [ ] **Step 3: Apply edits via API**

For each question that needs changes, call the appropriate endpoint:
- Edit: `PATCH /api/interview-questions/{id}` with `{ question_text, category, discipline, depth_type }`
- Delete duplicates: `DELETE /api/interview-questions/{id}`
- Add new if gaps found: `POST /api/interview-questions` with full details

- [ ] **Step 4: Write the change log**

Create `docs/interview-question-quality-log.md` listing every change with rationale.

- [ ] **Step 5: Commit the change log**

```bash
git add docs/interview-question-quality-log.md
git commit -m "docs(interview): question quality review — change log for Couch Heroes question bank"
```

---

## Task 8: E2E tests — 4 Playwright spec files

**Files:**
- Create: `dashboard-server/tests/e2e/interview-picker.spec.js`
- Create: `dashboard-server/tests/e2e/interview-scorecard.spec.js`
- Create: `dashboard-server/tests/e2e/interview-results.spec.js`
- Create: `dashboard-server/tests/e2e/interview-bank.spec.js`

- [ ] **Step 1: Create interview-picker.spec.js**

```js
const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestHiringPosition, createTestCandidate, createTestInterviewQuestion } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

test.describe('Interview Question Picker', () => {
  let admin, client, position, candidate;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Picker Test Client' });
    admin = await createTestUser({ role: 'admin' });
    position = await createTestHiringPosition({ client_id: client.id, title: 'Senior Engineer', discipline: 'Engineering' });
    candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Test Candidate', role: 'Engineer', stage: 'interviews' });

    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'Eng technical Q' });
    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'culture', question_text: 'Eng culture Q' });
    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Art', category: 'technical', question_text: 'Art technical Q' });
  });

  test('shows discipline-grouped questions with position discipline expanded', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(admin.username);
    await page.locator('#loginPass').fill(admin.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    // Navigate to hiring page
    await page.evaluate(() => { switchView('hiring'); });
    await page.waitForTimeout(1000);

    // Open the candidate — verify questions are visible
    await page.evaluate((cid) => { openCandidateDetail(cid); }, candidate.id);
    await page.waitForTimeout(500);

    // The candidate is in interviews stage, so there should be a Configure Interview button
    const configBtn = page.locator('button:has-text("Configure Interview")');
    await expect(configBtn).toBeVisible({ timeout: 5000 });
    await configBtn.click();
    await page.waitForTimeout(500);

    // Engineering section should be expanded (matches position discipline)
    await expect(page.locator('text=Eng technical Q')).toBeVisible();
    await expect(page.locator('text=Eng culture Q')).toBeVisible();
    // Art section should be collapsed under "Other disciplines"
    await expect(page.locator('text=Art technical Q')).not.toBeVisible();
  });
});
```

- [ ] **Step 2: Create interview-scorecard.spec.js**

```js
const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestHiringPosition, createTestCandidate, createTestInterviewQuestion, createTestInterviewConfig } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

test.describe('Interview Scorecard', () => {
  let interviewer, client, position, candidate, config, session, questions;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Scorecard Test Client' });
    interviewer = await createTestUser({ role: 'admin', display_name: 'Test Interviewer' });
    position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer', discipline: 'Engineering' });
    candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'SC Candidate', role: 'Engineer', stage: 'interviews' });

    const q1 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'SC Q1' });
    const q2 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'culture', question_text: 'SC Q2' });
    questions = [q1, q2];

    const result = await createTestInterviewConfig({
      candidate_id: candidate.id,
      position_id: position.id,
      created_by: interviewer.id,
      question_ids: [q1.id, q2.id],
      interviewer_ids: [interviewer.id],
    });
    config = result.config;
    session = result.sessions[0];
  });

  test('deep link opens scorecard with splash screen', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html#interview/' + session.id);
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(interviewer.username);
    await page.locator('#loginPass').fill(interviewer.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    // Should see the scorecard splash
    await expect(page.locator('text=SC Candidate')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Begin Scoring')).toBeVisible();
  });

  test('can score questions and submit', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(interviewer.username);
    await page.locator('#loginPass').fill(interviewer.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    // Open scorecard via JS
    await page.evaluate((sid) => { openInterviewScorecard(sid); }, session.id);
    await page.waitForTimeout(500);

    // Click Begin Scoring
    await page.locator('text=Begin Scoring').click();
    await page.waitForTimeout(300);

    // Score first question
    await expect(page.locator('text=SC Q1')).toBeVisible();
    await page.locator('.interview-scorecard__score-btn--4').click();
    await page.waitForTimeout(300);

    // Navigate to next
    await page.locator('text=Next →').click();
    await page.waitForTimeout(300);

    // Score second question
    await expect(page.locator('text=SC Q2')).toBeVisible();
    await page.locator('.interview-scorecard__score-btn--5').click();
    await page.waitForTimeout(300);

    // Submit should now be available
    page.on('dialog', dialog => dialog.accept());
    await page.locator('text=Submit Scorecard').click();
    await page.waitForTimeout(500);

    // Should show submitted view
    await expect(page.locator('text=Your scorecard has been submitted')).toBeVisible({ timeout: 5000 });
  });
});
```

- [ ] **Step 3: Create interview-results.spec.js**

```js
const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestHiringPosition, createTestCandidate, createTestInterviewQuestion, createTestInterviewConfig } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');
const { pool } = require('../helpers/db');

test.describe('Interview Results', () => {
  let admin, client, position, candidate, config;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Results Test Client' });
    admin = await createTestUser({ role: 'admin', display_name: 'Admin User' });
    position = await createTestHiringPosition({ client_id: client.id, title: 'Engineer', discipline: 'Engineering' });
    candidate = await createTestCandidate({ client_id: client.id, position_id: position.id, name: 'Results Candidate', role: 'Engineer', stage: 'interviews' });

    const q1 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'Results Q1' });
    const q2 = await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'culture', question_text: 'Results Q2' });

    const result = await createTestInterviewConfig({
      candidate_id: candidate.id,
      position_id: position.id,
      created_by: admin.id,
      question_ids: [q1.id, q2.id],
      interviewer_ids: [admin.id],
      status: 'active',
    });
    config = result.config;
    const session = result.sessions[0];

    // Submit scores directly in DB
    await pool.query(`INSERT INTO interview_scores (session_id, question_id, score, notes) VALUES ($1, $2, 4, 'Good')`, [session.id, q1.id]);
    await pool.query(`INSERT INTO interview_scores (session_id, question_id, score, notes) VALUES ($1, $2, 5, 'Excellent')`, [session.id, q2.id]);
    await pool.query(`UPDATE interview_sessions SET status = 'submitted', submitted_at = NOW() WHERE id = $1`, [session.id]);
    await pool.query(`UPDATE interview_configs SET status = 'active' WHERE id = $1`, [config.id]);
  });

  test('shows aggregated results with category averages', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(admin.username);
    await page.locator('#loginPass').fill(admin.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    await page.evaluate((cid) => { openInterviewResults(cid); }, config.id);
    await page.waitForTimeout(500);

    await expect(page.locator('text=Results Candidate')).toBeVisible({ timeout: 5000 });
    // Should show overall average (4.5)
    await expect(page.locator('text=4.5')).toBeVisible();
  });

  test('can record a decision', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(admin.username);
    await page.locator('#loginPass').fill(admin.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    await page.evaluate((cid) => { openInterviewResults(cid); }, config.id);
    await page.waitForTimeout(500);

    await page.locator('#ivDecisionNotes').fill('Strong candidate, advancing to offer.');
    await page.locator('text=Advance').click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=ADVANCE')).toBeVisible({ timeout: 5000 });
  });
});
```

- [ ] **Step 4: Create interview-bank.spec.js**

```js
const { test, expect } = require('@playwright/test');
const { createTestUser, createTestClient, createTestInterviewQuestion } = require('../helpers/fixtures');
const { truncate } = require('../helpers/db');

test.describe('Interview Question Bank Tab', () => {
  let admin, client;

  test.beforeAll(async () => {
    await truncate();
    client = await createTestClient({ name: 'Bank Test Client' });
    admin = await createTestUser({ role: 'admin' });
    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Engineering', category: 'technical', question_text: 'Bank Eng Q1' });
    await createTestInterviewQuestion({ client_id: client.id, discipline: 'Art', category: 'culture', question_text: 'Bank Art Q1' });
  });

  test('Questions tab is visible for NBI admin users', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(admin.username);
    await page.locator('#loginPass').fill(admin.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    await page.evaluate(() => { switchView('hiring'); });
    await page.waitForTimeout(1000);

    const questionsTab = page.locator('.ats-tab:has-text("Questions")');
    await expect(questionsTab).toBeVisible({ timeout: 5000 });
    await questionsTab.click();
    await page.waitForTimeout(500);

    await expect(page.locator('text=Bank Eng Q1')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Bank Art Q1')).toBeVisible();
  });

  test('discipline filter narrows results', async ({ page }) => {
    await page.goto('/nbi_project_dashboard.html');
    await page.waitForSelector('#loginScreen', { state: 'visible', timeout: 10000 });
    await page.locator('#loginUser').fill(admin.username);
    await page.locator('#loginPass').fill(admin.raw_password);
    await page.locator('#loginBtn').click();
    await page.waitForSelector('#loginScreen', { state: 'hidden', timeout: 10000 });

    await page.evaluate(() => { window._hiringActiveTab = 'questions'; switchView('hiring'); });
    await page.waitForTimeout(1000);

    // Select Engineering discipline filter
    await page.locator('select').nth(1).selectOption('Engineering');
    await page.waitForTimeout(500);

    await expect(page.locator('text=Bank Eng Q1')).toBeVisible();
    await expect(page.locator('text=Bank Art Q1')).not.toBeVisible();
  });
});
```

- [ ] **Step 5: Run the E2E tests**

```bash
cd dashboard-server && npx playwright test tests/e2e/interview-picker.spec.js tests/e2e/interview-scorecard.spec.js tests/e2e/interview-results.spec.js tests/e2e/interview-bank.spec.js
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/tests/e2e/interview-picker.spec.js dashboard-server/tests/e2e/interview-scorecard.spec.js dashboard-server/tests/e2e/interview-results.spec.js dashboard-server/tests/e2e/interview-bank.spec.js
git commit -m "test(interview): add E2E tests for picker, scorecard, results, and bank management"
```

---

## Task 9: Final verification

- [ ] **Step 1: Run full unit test suite**

```bash
cd dashboard-server && npm test
```
Expected: all tests pass.

- [ ] **Step 2: Run full E2E suite**

```bash
cd dashboard-server && npm run test:e2e
```
Expected: all tests pass.

- [ ] **Step 3: Restart PM2**

```bash
pm2 restart nbi-dashboard
```

- [ ] **Step 4: Verify in browser at http://localhost:8888**

Walk through the complete flow:
1. Hiring > Positions > create a new position with discipline set
2. Open a candidate in interviews stage > Configure Interview > verify discipline filtering
3. Use a direct link `#interview/{sessionId}` > verify scorecard loads
4. Score all questions > submit > verify submitted view
5. View results > record a decision
6. Questions tab > create, edit, delete questions
