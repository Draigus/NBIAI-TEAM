# ATS Visual Polish + Salary Backfill + Client Access Control

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the hiring UI from functional-but-flat into a polished ATS experience inspired by Greenhouse/Ashby/Lever, backfill salary data from the Couch Heroes Excel sheet, and enforce salary visibility restrictions for client users.

**Architecture:** Three workstreams — (1) client access control (security-first), (2) salary backfill (one-shot script), (3) visual polish (CSS + HTML template changes across kanban cards, candidate detail panel, position cards, metrics, stage editor). All changes are in the monolithic `nbi_project_dashboard.html` and `dashboard-server/routes/hiring.js`.

**Tech Stack:** Express + PostgreSQL backend, vanilla JS SPA frontend, ExcelJS for salary extraction.

---

## File Map

| File | Changes |
|---|---|
| `dashboard-server/routes/hiring.js` | Strip `salary_range` from GET positions response for client users |
| `dashboard-server/scripts/backfill-salaries.js` | NEW — one-shot script to populate salary_range from Excel |
| `dashboard-server/tests/unit/salary-access-control.test.mjs` | NEW — tests for salary stripping |
| `nbi_project_dashboard.html` (CSS ~lines 2107-2265) | Hiring CSS overhaul: font sizes, card styles, action borders, tabs |
| `nbi_project_dashboard.html` (renderHiringCard ~line 19290) | Action-state left border, days-in-stage, simplified card content |
| `nbi_project_dashboard.html` (renderPositionCard ~line 19460) | Salary hidden for client users, larger minibar, font bump |
| `nbi_project_dashboard.html` (openCandidateDetail ~line 20593) | Tabbed panel layout, stage pinned at top |
| `nbi_project_dashboard.html` (buildCandidate* ~line 20279) | Content reorganised into tab containers |
| `nbi_project_dashboard.html` (openPositionDetail ~line 19751) | Salary field hidden for client users |
| `nbi_project_dashboard.html` (loadHiringMetrics ~line 19205) | Conversion rates between funnel bars, summary stats row |
| `nbi_project_dashboard.html` (openStageEditor ~line 20089) | Drag handles for reordering |

---

## Workstream 1: Client Access Control (Security)

### Task 1: Backend — Strip salary_range from positions API for client users

**Files:**
- Modify: `dashboard-server/routes/hiring.js:225-257` (GET /api/hiring-positions)
- Test: `dashboard-server/tests/unit/salary-access-control.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `dashboard-server/tests/unit/salary-access-control.test.mjs`:

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../helpers/app-factory.js';
import { getPool, createTestClient, createTestUser, createTestHiringPosition } from '../helpers/fixtures.js';

describe('Salary access control', () => {
  let app, pool, adminToken, clientToken, clientId, positionId;

  beforeAll(async () => {
    pool = getPool();
    ({ app } = await createApp());
    const client = await createTestClient(pool, { name: 'SalaryTestCo' });
    clientId = client.id;
    const admin = await createTestUser(pool, { role: 'admin', displayName: 'Admin' });
    adminToken = admin.token;
    const clientUser = await createTestUser(pool, { role: 'user', displayName: 'ClientUser', clientId });
    clientToken = clientUser.token;
    const pos = await createTestHiringPosition(pool, {
      clientId, title: 'Test Engineer', salaryRange: '£50,000-£60,000',
    });
    positionId = pos.id;
  });

  afterAll(async () => {
    if (positionId) await pool.query('DELETE FROM hiring_positions WHERE id = $1', [positionId]);
    await pool.query("DELETE FROM users WHERE display_name IN ('Admin','ClientUser')");
    if (clientId) await pool.query('DELETE FROM clients WHERE id = $1', [clientId]);
  });

  it('admin sees salary_range in positions list', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/hiring-positions', headers: { Authorization: `Bearer ${adminToken}` } });
    expect(res.statusCode).toBe(200);
    const positions = JSON.parse(res.body);
    const pos = positions.find(p => p.id === positionId);
    expect(pos.salary_range).toBe('£50,000-£60,000');
  });

  it('client user does NOT see salary_range in positions list', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/hiring-positions', headers: { Authorization: `Bearer ${clientToken}` } });
    expect(res.statusCode).toBe(200);
    const positions = JSON.parse(res.body);
    const pos = positions.find(p => p.id === positionId);
    expect(pos.salary_range).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd dashboard-server && npx vitest run tests/unit/salary-access-control.test.mjs`
Expected: FAIL — both tests pass since salary_range is currently returned to all users.

- [ ] **Step 3: Implement salary stripping in the GET positions endpoint**

In `dashboard-server/routes/hiring.js`, after the query in the GET /api/hiring-positions handler (~line 251), add salary stripping before sending the response:

```javascript
      // Strip salary data from client-scoped users
      const results = req.user.clientId
        ? rows.map(({ salary_range, ...rest }) => rest)
        : rows;
      res.json(results);
```

Replace `res.json(rows);` (line 252) with the above block.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd dashboard-server && npx vitest run tests/unit/salary-access-control.test.mjs`
Expected: PASS

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `cd dashboard-server && npm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add dashboard-server/routes/hiring.js dashboard-server/tests/unit/salary-access-control.test.mjs
git commit -m "security: strip salary_range from positions API for client users"
```

### Task 2: Frontend — Hide salary from position cards and detail for client users

**Files:**
- Modify: `nbi_project_dashboard.html:19460-19507` (renderPositionCard)
- Modify: `nbi_project_dashboard.html:19751-19870` (openPositionDetail)

- [ ] **Step 1: Hide salary from position cards for client users**

In `renderPositionCard` (~line 19467), add:
```javascript
const isScopedUser = isClientUser();
```

Then at line 19498, wrap the salary display:
```javascript
${!isScopedUser && (p.salary_range || d.startMonth) ? `<span>${p.salary_range ? esc(p.salary_range) : 'Start: ' + esc(d.startMonth)}</span>` : ''}
```

Replace the current line:
```javascript
${p.salary_range ? `<span>${esc(p.salary_range)}</span>` : d.startMonth ? `<span>Start: ${esc(d.startMonth)}</span>` : ''}
```

- [ ] **Step 2: Hide salary from position detail panel for client users**

In `openPositionDetail` (~line 19765), `canSeeSalary` is already defined as `const canSeeSalary = isAdmin;`. The non-admin branch at line 19863-19867 already renders a read-only info grid. Update it to exclude salary:

Replace the non-admin fallback (line 19863-19867):
```javascript
      </div>` : `<div class="position-detail__info-grid" style="margin-bottom:var(--space-lg)">
        ${p.employment_type ? `<div class="position-detail__info-item"><span class="position-detail__info-label">Type</span><span class="position-detail__info-value">${esc(p.employment_type.charAt(0).toUpperCase()+p.employment_type.slice(1))}</span></div>` : ''}
        ${p.location ? `<div class="position-detail__info-item"><span class="position-detail__info-label">Location</span><span class="position-detail__info-value">${esc(p.location)}</span></div>` : ''}
      </div>`}
```

The `salary_range` line is removed from the non-admin view.

- [ ] **Step 3: Verify in browser**

Run: `npm run test:e2e`
Expected: All E2E tests pass. Salary is not visible in position cards or detail panels when logged in as a client user.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "security: hide salary fields from client user views"
```

---

## Workstream 2: Salary Backfill

### Task 3: Write and run salary backfill script

**Files:**
- Create: `dashboard-server/scripts/backfill-salaries.js`

The Excel file `Clients/Couch Heroes/hr_hiring/Merged_Hiring_Plan_final_v2.xlsx` has salary data in Column 4 (title, UPPERCASE) and Column 5 (annual salary, numeric). Column 7 is the base GBP salary. The DB has 30 positions, all with `salary_range = null`.

Title matching map (Excel UPPERCASE → DB title case, with fuzzy adjustments):

| Excel Title | DB Title | Excel Salary (Col 5) | Base GBP (Col 7) |
|---|---|---|---|
| TECHNICAL ANIMATOR (HIRED) | Technical Animator | 44,160 | 38,400 |
| CTO | CTO | 230,000 | 200,000 |
| EXECUTIVE PRODUCER | Executive Producer | 172,500 | 150,000 |
| LEVEL DESIGN LEAD | Level Design Lead | 71,300 | 62,000 |
| SR CHARACTER MODELER | Sr Character Modeler | 57,500 | 50,000 |
| JIRA ADMIN CONTRACTOR | Jira Admin Contractor | 57,500 | 50,000 |
| HR OPERATIONS | HR Operations | 50,025 | 43,500 |
| LEAD ANIMATOR (HIRED) | Lead Animator | 114,960 | — |
| LEAD FULL STACK DEVELOPER | Lead Full Stack Developer | 92,000 | 80,000 |
| LEAD GAMEPLAY DEVELOPER | Lead Gameplay Developer | 92,000 | 80,000 |
| SNR NETWORK ENGINEER | Snr Network Engineer | 70,150 | 61,000 |
| HEAD OF FINANCE | Head of Finance | 97,750 | 85,000 |
| GAME DESIGN LEAD | Game Design Lead | 70,150 | 61,000 |
| ART PRODUCER | Art Producer | 54,625 | 47,500 |
| MID QA TESTER (CONTRACT) | Mid QA Tester (Contract) | 33,350 | 29,000 |
| UI/UX LEAD (NEW) | UI/UX Lead (New Role) | 0 | — |
| IT LEAD | IT Lead | 69,000 | 60,000 |
| TOOLS ENGINEER | Tools Engineer | 67,850 | 59,000 |
| TECH PRODUCER | Tech Producer | 53,475 | 46,500 |
| SNR TECHNICAL ARTIST | Snr Technical Artist | 66,700 | 58,000 |
| SENIOR LEVEL DESIGNER | Senior Level Designer | 54,625 | 47,500 |
| SNR ENVIRO ARTIST | Snr Environment Artist | 80,500 | 70,000 |
| MID QA TESTER | Mid QA Tester | 33,350 | 29,000 |
| SR VFX ARTIST | Sr VFX Artist | 61,525 | 53,500 |
| MID GENERAL DESIGNER | Mid General Designer | 40,250 | 35,000 |
| AUDIO MENTOR (3-MONTH CONTRACT) | Audio Mentor (3-Month Contract) | 69,000 | 60,000 |
| ASSOC PRODUCER | Assoc Producer | 31,050 | 27,000 |
| SNR LIGHTING ARTIST | Snr Lighting Artist | 57,500 | 50,000 |
| LEAD CONCEPT ARTIST | Lead Concept Artist | 71,300 | 62,000 |
| AUDIO LEAD | Audio Lead | 69,000 | 60,000 |

- [ ] **Step 1: Create the backfill script**

Create `dashboard-server/scripts/backfill-salaries.js`:

```javascript
#!/usr/bin/env node
/**
 * One-shot script to populate salary_range on hiring_positions
 * from the Couch Heroes Excel hiring plan.
 *
 * Usage: node scripts/backfill-salaries.js [--dry-run]
 */
require('dotenv').config();
const { Pool } = require('pg');
const ExcelJS = require('exceljs');
const path = require('path');

const EXCEL_PATH = path.resolve(__dirname, '../../Clients/Couch Heroes/hr_hiring/Merged_Hiring_Plan_final_v2.xlsx');

// Normalise title for matching: lowercase, strip (HIRED), (NEW), (Contract), trim
function normalise(title) {
  return title
    .toLowerCase()
    .replace(/\(hired\)/gi, '')
    .replace(/\(new\)/gi, '')
    .replace(/\bsnr\b/g, 'snr')
    .replace(/\bsr\b/g, 'sr')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // 1. Read Excel
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(EXCEL_PATH);
  const ws = wb.worksheets[0];

  const excelData = [];
  for (let i = 5; i <= 50; i++) {
    const row = ws.getRow(i);
    const title = row.getCell(4).value;
    const annualSalary = row.getCell(5).value;
    const baseSalary = row.getCell(7).value;
    if (title && typeof title === 'string' && title.trim()) {
      excelData.push({
        title: title.trim(),
        annualSalary: typeof annualSalary === 'number' ? annualSalary : null,
        baseSalary: typeof baseSalary === 'number' ? baseSalary : null,
      });
    }
  }
  console.log(`Read ${excelData.length} positions from Excel`);

  // 2. Read DB positions
  const { rows: dbPositions } = await pool.query(
    'SELECT id, title, salary_range FROM hiring_positions ORDER BY title'
  );
  console.log(`Found ${dbPositions.length} positions in DB`);

  // 3. Match and update
  let matched = 0;
  let skipped = 0;
  for (const dbPos of dbPositions) {
    const dbNorm = normalise(dbPos.title);
    const excelMatch = excelData.find(e => {
      const eNorm = normalise(e.title);
      return eNorm === dbNorm
        || eNorm.replace('enviro', 'environment') === dbNorm
        || eNorm.includes(dbNorm)
        || dbNorm.includes(eNorm)
        || dbNorm.replace('(new role)', '').trim() === eNorm.replace('(new)', '').trim();
    });

    if (!excelMatch) {
      console.log(`  MISS: ${dbPos.title}`);
      skipped++;
      continue;
    }

    // Format salary range as "£XX,000" using the annual salary column
    const salary = excelMatch.annualSalary;
    if (!salary || salary === 0) {
      console.log(`  SKIP (no salary): ${dbPos.title} ← ${excelMatch.title}`);
      skipped++;
      continue;
    }

    const formatted = '£' + Math.round(salary).toLocaleString('en-GB');
    console.log(`  MATCH: ${dbPos.title} ← ${excelMatch.title} → ${formatted}`);

    if (!dryRun) {
      await pool.query(
        'UPDATE hiring_positions SET salary_range = $1, updated_at = NOW() WHERE id = $2',
        [formatted, dbPos.id]
      );
    }
    matched++;
  }

  console.log(`\nDone: ${matched} matched, ${skipped} skipped${dryRun ? ' (DRY RUN)' : ''}`);
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Dry run first**

Run: `cd dashboard-server && node scripts/backfill-salaries.js --dry-run`
Expected: Shows all 30 positions matched with formatted salary values. No DB writes.

- [ ] **Step 3: Run for real**

Run: `cd dashboard-server && node scripts/backfill-salaries.js`
Expected: 28-30 positions updated with salary_range values.

- [ ] **Step 4: Verify in DB**

Run: `cd dashboard-server && node -e "require('dotenv').config();const{Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('SELECT title,salary_range FROM hiring_positions ORDER BY title').then(r=>{r.rows.forEach(row=>console.log(row.title,'-',row.salary_range));p.end()})"`

- [ ] **Step 5: Commit**

```bash
git add dashboard-server/scripts/backfill-salaries.js
git commit -m "data: backfill salary_range from Couch Heroes Excel hiring plan"
```

---

## Workstream 3: Visual Polish

### Task 4: CSS Foundation — Font sizes, card styles, hiring-specific overrides

**Files:**
- Modify: `nbi_project_dashboard.html:2107-2265` (hiring CSS block)

This task establishes the CSS foundation that all subsequent tasks build on. All font sizes bumped to meet Glen's minimum (14px body, 16px data).

- [ ] **Step 1: Replace the hiring CSS block (lines 2107-2265)**

Replace the entire block from `.hiring {` through the end of the `@media (max-width: 480px)` block with:

```css
/* ═══════════════════ HIRING — ATS Visual Polish ═══════════════════ */
.hiring { padding: var(--space-lg); }
.hiring__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg); flex-wrap: wrap; gap: var(--space-md); }
.hiring__header h2 { font-size: 1.25rem; font-weight: 700; margin: 0; }
.hiring__filters { display: flex; gap: var(--space-sm); align-items: center; flex-wrap: wrap; margin-bottom: var(--space-md); }

/* --- Kanban Cards (Greenhouse-inspired action-state borders) --- */
.hiring-card {
  display: flex; flex-direction: column; gap: 6px;
  padding: 12px 14px; background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-left: 3px solid var(--border-default);
  border-radius: var(--radius-sm);
  cursor: pointer; transition: all 0.15s;
  min-height: 72px; position: relative;
}
.hiring-card:hover { border-color: var(--accent-border); box-shadow: var(--shadow-md); transform: translateY(-1px); }
.hiring-card--action-red { border-left-color: var(--danger); }
.hiring-card--action-amber { border-left-color: #f59e0b; }
.hiring-card--action-grey { border-left-color: var(--text-muted); }
.hiring-card--archived { opacity: 0.5; filter: grayscale(0.4); }
.hiring-card__name { font-weight: 600; font-size: 0.95rem; line-height: 1.3; }
.hiring-card__role { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.2; }
.hiring-card__meta { font-size: 0.82rem; color: var(--text-muted); display: flex; justify-content: space-between; margin-top: auto; align-items: center; gap: 6px; }
.hiring-card__days { font-size: 0.78rem; color: var(--text-muted); }
.hiring-card__days--stale { color: var(--danger); font-weight: 600; }
.hiring-card__due--late { color: var(--danger); font-weight: 600; }

/* Stage badges */
.hiring-stage-badge { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
.hiring-stage-badge--sourcing   { background: var(--bg-surface); color: var(--text-muted); }
.hiring-stage-badge--interviews { background: color-mix(in srgb, #f59e0b 15%, var(--bg-card)); color: #f59e0b; }
.hiring-stage-badge--offer      { background: color-mix(in srgb, #2563eb 15%, var(--bg-card)); color: #2563eb; }
.hiring-stage-badge--onboarding { background: color-mix(in srgb, #10b981 15%, var(--bg-card)); color: #10b981; }
.hiring-stage-badge--onboarded  { background: var(--success-bg, color-mix(in srgb, var(--success) 15%, var(--bg-card))); color: var(--success); }
.hiring-stage-badge--sourced    { background: var(--bg-surface); color: var(--text-muted); }
.hiring-stage-badge--screening  { background: color-mix(in srgb, #3b82f6 15%, var(--bg-card)); color: #3b82f6; }
.hiring-stage-badge--interview  { background: color-mix(in srgb, #f59e0b 15%, var(--bg-card)); color: #f59e0b; }
.hiring-stage-badge--hired      { background: var(--success-bg, color-mix(in srgb, var(--success) 15%, var(--bg-card))); color: var(--success); }
.hiring-stage-badge--rejected   { background: var(--danger-bg); color: var(--danger); }

/* Card grid (client view) */
.hiring-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.hiring-client-group { margin-bottom: 28px; }
.hiring-client-group__header { font-size: 1.05rem; font-weight: 600; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 2px solid var(--border-default); display: flex; justify-content: space-between; align-items: baseline; }

/* Kanban lanes */
.hiring-kanban { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px; align-items: flex-start; }
.hiring-lane { flex: 1 1 220px; min-width: 200px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); display: flex; flex-direction: column; min-height: 300px; max-height: calc(var(--vh-full) - 240px); transition: border-color 0.15s, background 0.15s; }
.hiring-lane.drag-over { border-color: var(--accent); background: var(--accent-glow); }
.hiring-lane__header { padding: 10px 14px; border-bottom: 1px solid var(--border-default); font-size: 0.82rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.hiring-lane__count { background: var(--bg-raised); color: var(--text-muted); font-size: 0.78rem; padding: 2px 8px; border-radius: 9px; font-weight: 600; min-width: 24px; text-align: center; }
.hiring-lane__header--sourcing   { color: var(--text-secondary); }
.hiring-lane__header--interviews { color: #f59e0b; }
.hiring-lane__header--offer      { color: #2563eb; }
.hiring-lane__header--onboarding { color: #10b981; }
.hiring-lane__header--onboarded  { color: var(--success); }
.hiring-lane__header--sourced    { color: var(--text-secondary); }
.hiring-lane__header--screening  { color: #3b82f6; }
.hiring-lane__header--interview  { color: #f59e0b; }
.hiring-lane__header--hired      { color: var(--success); }
.hiring-lane__header--rejected   { color: var(--danger); }
.hiring-lane__body { padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; flex: 1; }
.hiring-lane__body .hiring-card { width: auto; }
.hiring-lane__empty { text-align: center; color: var(--text-faint); font-size: 0.82rem; padding: 20px 12px; font-style: italic; }
.hiring-card[draggable="true"] { cursor: grab; }
.hiring-card[draggable="true"]:active { cursor: grabbing; }
.hiring-card.dragging { opacity: 0.4; }

/* View mode toggle */
.hiring-view-toggle { display: inline-flex; border: 1px solid var(--border-default); border-radius: var(--radius-sm); overflow: hidden; }
.hiring-view-toggle button { background: var(--bg-raised); color: var(--text-secondary); border: none; padding: 6px 14px; font-size: 0.82rem; cursor: pointer; font-family: inherit; transition: background 0.12s; }
.hiring-view-toggle button.active { background: var(--accent); color: #fff; }
.hiring-view-toggle button:hover:not(.active) { background: var(--bg-hover); color: var(--text-primary); }

/* --- Position Cards (enhanced) --- */
.position-card {
  display: flex; flex-direction: column; gap: 10px;
  padding: 16px 18px; background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  cursor: pointer; transition: all 0.15s;
  min-height: 120px; position: relative;
}
.position-card:hover { border-color: var(--accent-border); box-shadow: var(--shadow-md); transform: translateY(-1px); }
.position-card__row { display: flex; align-items: center; gap: 8px; }
.position-card__title { font-weight: 600; font-size: 1rem; flex: 1; min-width: 0; word-break: break-word; line-height: 1.3; }
.position-card__dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.position-card__dot--open { background: var(--success); }
.position-card__dot--filled { background: var(--text-muted); }
.position-card__priority { font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 8px; text-transform: uppercase; flex-shrink: 0; }
.position-card__priority--0 { background: var(--danger-bg); color: var(--danger); }
.position-card__priority--1 { background: color-mix(in srgb, #f59e0b 15%, var(--bg-card)); color: #f59e0b; }
.position-card__priority--2 { background: color-mix(in srgb, #3b82f6 15%, var(--bg-card)); color: #3b82f6; }
.position-card__priority--3 { background: var(--bg-surface); color: var(--text-muted); }
.position-card__priority--4 { background: var(--bg-surface); color: var(--text-faint); }
.position-card__chip { font-size: 0.78rem; padding: 2px 10px; border-radius: 8px; background: var(--bg-surface); color: var(--text-muted); font-weight: 500; }
.position-card__salary { font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; }
.position-card__meta { font-size: 0.82rem; color: var(--text-muted); display: flex; gap: 12px; align-items: center; margin-top: auto; }
.position-card__candidates { font-size: 0.82rem; color: var(--text-muted); display: flex; align-items: center; gap: 8px; }
.position-card__days--green { color: var(--success); }
.position-card__days--amber { color: #f59e0b; }
.position-card__days--red { color: var(--danger); font-weight: 600; }
.position-card__minibar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; flex: 1; max-width: 140px; background: var(--bg-surface); }
.position-card__minibar span { display: block; height: 100%; }

/* --- Position detail panel --- */
.position-detail-overlay { position: fixed; inset: 0; background: var(--bg-overlay, rgba(0,0,0,0.85)); z-index: 200; display: none; }
.position-detail-panel { position: fixed; top: var(--header-h); right: 0; width: 600px; min-width: 320px; max-width: 80vw; height: calc(var(--vh-full) - var(--header-h)); background: var(--bg-card, var(--bg-raised)); border-left: 1px solid var(--border-default); z-index: 201; overflow: hidden; display: none; flex-direction: column; box-shadow: -4px 0 20px rgba(0,0,0,0.3); }
.position-detail-panel.open { display: flex; }
.position-detail__header { padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border-default); display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); flex-shrink: 0; background: var(--bg-card, var(--bg-raised)); }
.position-detail__body { padding: var(--space-lg); flex: 1; overflow-y: auto; min-height: 0; }
.position-detail__info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; margin-bottom: var(--space-lg); }
.position-detail__info-item { display: flex; flex-direction: column; gap: 3px; }
.position-detail__info-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 600; }
.position-detail__info-value { font-size: 0.9rem; color: var(--text-primary); font-weight: 500; }
.position-detail__candidates-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
.position-detail__candidates-table th { text-align: left; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); font-weight: 600; padding: 8px; border-bottom: 1px solid var(--border-default); }
.position-detail__candidates-table td { padding: 10px 8px; border-bottom: 1px solid var(--border-subtle, var(--border-default)); cursor: pointer; }
.position-detail__candidates-table tr:hover td { background: var(--bg-hover); }

/* --- Candidate detail panel (tabbed) --- */
.candidate-detail-overlay { position: fixed; inset: 0; background: var(--bg-overlay, rgba(0,0,0,0.85)); z-index: 200; display: none; }
.candidate-detail-panel { position: fixed; top: var(--header-h); right: 0; width: 600px; min-width: 320px; max-width: 80vw; height: calc(var(--vh-full) - var(--header-h)); background: var(--bg-raised); border-left: 1px solid var(--border-default); z-index: 201; overflow: hidden; display: none; flex-direction: column; box-shadow: -4px 0 20px rgba(0,0,0,0.3); }
.candidate-detail-panel.open { display: flex; }
.candidate-detail__header { padding: var(--space-md) var(--space-lg); border-bottom: 1px solid var(--border-default); display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-md); flex-shrink: 0; background: var(--bg-raised); }
.candidate-detail__stage-bar { padding: 10px var(--space-lg); border-bottom: 1px solid var(--border-default); flex-shrink: 0; background: var(--bg-raised); }
.candidate-detail__tabs { display: flex; border-bottom: 1px solid var(--border-default); flex-shrink: 0; background: var(--bg-raised); padding: 0 var(--space-lg); }
.candidate-detail__tab { padding: 10px 16px; font-size: 0.82rem; font-weight: 600; color: var(--text-muted); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-family: inherit; transition: color 0.12s, border-color 0.12s; }
.candidate-detail__tab:hover { color: var(--text-primary); }
.candidate-detail__tab--active { color: var(--accent); border-bottom-color: var(--accent); }
.candidate-detail__body { padding: var(--space-lg); flex: 1; overflow-y: auto; min-height: 0; }
.candidate-detail__tab-content { display: none; }
.candidate-detail__tab-content--active { display: block; }
.candidate-detail__section { margin-bottom: var(--space-lg); }
.candidate-detail__section-title { font-size: 0.78rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: var(--space-sm); font-weight: 600; }
.candidate-detail__field { display: flex; flex-direction: column; gap: 4px; margin-bottom: var(--space-md); }
.candidate-detail__field label { font-size: 0.78rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
.candidate-detail__field input,
.candidate-detail__field select,
.candidate-detail__field textarea {
  padding: 8px 12px; background: var(--bg-input); border: 1px solid var(--border-default);
  border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.9rem;
  font-family: var(--font-body);
}
.candidate-detail__field textarea { resize: vertical; min-height: 80px; }
.candidate-stages { display: flex; gap: 6px; flex-wrap: wrap; }
.candidate-stage-pill { padding: 4px 10px; border: 1px solid var(--border-default); border-radius: 14px; font-size: 0.78rem; font-weight: 600; text-transform: uppercase; background: var(--bg-card); color: var(--text-muted); cursor: pointer; transition: all 0.12s; }
.candidate-stage-pill:hover { border-color: var(--accent-border); }
.candidate-stage-pill--active { background: var(--accent); color: #fff; border-color: var(--accent); }
.candidate-cv { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.candidate-cv__name { font-size: 0.82rem; color: var(--text-muted); word-break: break-all; }

/* Stage editor drag handles */
.stage-editor-row { display: flex; gap: 6px; align-items: center; }
.stage-editor-row .se-drag-handle { cursor: grab; color: var(--text-muted); font-size: 1rem; padding: 0 4px; user-select: none; }
.stage-editor-row .se-drag-handle:active { cursor: grabbing; }
.stage-editor-row.se-dragging { opacity: 0.5; background: var(--accent-glow); border-radius: var(--radius-sm); }

/* Responsive */
@media (max-width: 768px) {
  .candidate-detail-panel, .position-detail-panel { width: 100vw; max-width: 100vw; }
  .hiring-kanban > .hiring-lane { flex: 0 0 100%; min-width: 100%; max-width: 100%; scroll-snap-align: start; }
  .position-detail__info-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .detail-panel, .bug-detail-panel, .candidate-detail-panel, .ms-detail-panel, .queue-detail-panel {
    width: 100vw !important; min-width: 0; max-width: 100vw;
  }
}
```

- [ ] **Step 2: Verify CSS changes don't break layout**

Run: `npm run test:e2e`
Expected: All E2E tests pass. Visually: hiring cards are slightly larger, fonts more readable, panels wider.

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "style: ATS CSS foundation — larger fonts, action borders, tabbed panel styles"
```

### Task 5: Kanban Cards — Action-state borders + days-in-stage

**Files:**
- Modify: `nbi_project_dashboard.html:19290-19346` (renderHiringCard)

The Greenhouse pattern: cards get a coloured left border based on what action is needed:
- **Red** (`--action-red`): unassigned on current stage OR candidate is overdue
- **Amber** (`--action-amber`): has pending interviews (scheduled but not completed)
- **Grey** (`--action-grey`): archived or in terminal stage (onboarded)
- **Default** (no class): everything is fine, no action required

Also adds: days-in-stage counter on every card, removes tag chips and GDPR/comment badges from card surface (moved to detail panel only).

- [ ] **Step 1: Replace renderHiringCard function**

Replace the entire `renderHiringCard` function (lines 19290-19346) with:

```javascript
function renderHiringCard(c, draggable) {
  const due = c.due_date ? new Date(c.due_date) : null;
  const isArchived = !!c.archived_at;
  const isLate = due && due < new Date() && c.stage !== 'onboarded' && !isArchived;
  const dueText = due ? due.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

  const header = c.name && c.name.trim() ? c.name : (c.role || 'Unnamed candidate');
  const subheader = c.name && c.name.trim() && c.role ? c.role : '';
  const stageAssignees = (c.stage_assignees && typeof c.stage_assignees === 'object') ? c.stage_assignees : {};
  const currentStageAssignees = Array.isArray(stageAssignees[c.stage]) ? stageAssignees[c.stage] : [];
  const unassigned = !isArchived && currentStageAssignees.length === 0;

  // Action-state border colour (Greenhouse pattern)
  let actionClass = '';
  if (isArchived || c.stage === 'onboarded') {
    actionClass = 'hiring-card--action-grey';
  } else if (unassigned || isLate) {
    actionClass = 'hiring-card--action-red';
  }

  // Days in current stage (from updated_at as proxy)
  const updatedAt = c.updated_at ? new Date(c.updated_at) : null;
  const daysInStage = updatedAt ? Math.floor((Date.now() - updatedAt.getTime()) / 86400000) : 0;
  const daysStale = daysInStage > 7;
  const daysLabel = daysInStage > 0 ? `${daysInStage}d` : 'new';

  const archivedClass = isArchived ? ' hiring-card--archived' : '';
  const dragAttrs = draggable && !isArchived
    ? ` draggable="true" ondragstart="onHiringCardDragStart(event, '${c.id}')" ondragend="onHiringCardDragEnd(event)"`
    : '';

  const clientChip = c.client_name ? `<span style="color:var(--text-muted);font-size:0.75rem">${esc(c.client_name)}</span>` : '';

  return `<div class="hiring-card ${actionClass}${archivedClass}" data-candidate-id="${c.id}"${dragAttrs} data-action="_actOpenCandidateDetailIfNotDrag" data-arg0="${c.id}" tabindex="0" role="button"
              aria-label="${esc(header)}${subheader ? ', ' + esc(subheader) : ''}${c.client_name ? ', ' + esc(c.client_name) : ''}, stage ${esc(HIRING_STAGE_LABELS[c.stage] || c.stage)}${unassigned ? ', no assignee' : ''}${isArchived ? ', archived' : ''}"
              onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openCandidateDetail('${c.id}')}">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">
      <div style="flex:1;min-width:0">
        <div class="hiring-card__name" ${c.stage === 'onboarded' ? 'style="text-decoration:line-through"' : ''}>${esc(header)}</div>
        ${subheader ? `<div class="hiring-card__role">${esc(subheader)}</div>` : ''}
      </div>
      <span class="hiring-card__days${daysStale ? ' hiring-card__days--stale' : ''}" title="${daysInStage} days in stage">${daysLabel}</span>
    </div>
    <div class="hiring-card__meta">
      ${clientChip || `<span class="${isLate ? 'hiring-card__due--late' : ''}">${dueText || '—'}</span>`}
      <span class="hiring-stage-badge hiring-stage-badge--${c.stage}" aria-hidden="true">${HIRING_STAGE_LABELS[c.stage] || c.stage}</span>
    </div>
  </div>`;
}
```

Key changes:
- Left-border action class based on unassigned/overdue/archived state
- Days-in-stage counter in top-right of every card
- Tags, GDPR warning, and comment count removed from cards (they live in the detail panel)
- Archived cards use CSS class instead of inline style
- Cleaner name/role layout with flex header

- [ ] **Step 2: Verify visually**

Run: `npm run test:e2e`
Expected: All E2E tests pass. Cards now show coloured left borders and days counter.

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: kanban cards — action-state left borders + days-in-stage counter"
```

### Task 6: Candidate Detail Panel — Tabbed Layout

**Files:**
- Modify: `nbi_project_dashboard.html:20593-20681` (openCandidateDetail)

Transforms the single-scroll panel into a tabbed layout:
- **Header** (always visible): name, role, stage badge, client
- **Stage bar** (always visible, pinned): stage prev/next controls + assignees
- **Tab bar**: Profile | Interviews | Activity | Settings
- **Tab content**: each tab shows its sections

Tab contents:
- **Profile**: profile fields (name, role, email, linkedin, due, source, CV, position), tags
- **Interviews**: interview rounds + scorecards, stage-specific content (offer/onboarding)
- **Activity**: timeline + comments
- **Settings**: GDPR consent, actions (clear/delete/reopen)

- [ ] **Step 1: Replace openCandidateDetail function**

Replace the `openCandidateDetail` function (lines 20593-20681) with:

```javascript
async function openCandidateDetail(id) {
  const overlay = document.getElementById('candidateDetailOverlay');
  const panel = document.getElementById('candidateDetailPanel');
  if (!overlay || !panel) return;

  const c = await apiCall('/api/candidates/' + id);
  if (!c) return;

  const isAdmin = _currentUser && _currentUser.role === 'admin';
  const isDetailScoped = isClientUser();
  let clientList = getContractedClientRecords();
  if (c.client_id && !clientList.some(cl => cl.id === c.client_id)) {
    const existing = Object.values(_apiClientsCache || {}).find(cl => cl && cl.id === c.client_id);
    if (existing) clientList = [...clientList, existing].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  const positions = _hiringPositionsData || [];
  const isArchived = !!c.archived_at;
  const disabledStyle = isArchived ? 'pointer-events:none;opacity:0.55' : '';
  const [roundsData, candidateStages] = await Promise.all([
    apiCall(`/api/candidates/${id}/interviews`).catch(() => []),
    getHiringStagesForClient(c.client_id),
  ]);

  panel.innerHTML = `
    ${buildCandidateHeaderHtml(c, isArchived)}
    <div class="candidate-detail__stage-bar">${buildCandidateStageBarHtml(c, isArchived, disabledStyle, candidateStages)}</div>
    <div class="candidate-detail__tabs">
      <button class="candidate-detail__tab candidate-detail__tab--active" data-tab="profile" onclick="switchCandidateTab(this,'profile')">Profile</button>
      <button class="candidate-detail__tab" data-tab="interviews" onclick="switchCandidateTab(this,'interviews')">Interviews${roundsData && roundsData.length > 0 ? ' (' + roundsData.length + ')' : ''}</button>
      <button class="candidate-detail__tab" data-tab="activity" onclick="switchCandidateTab(this,'activity')">Activity</button>
      <button class="candidate-detail__tab" data-tab="settings" onclick="switchCandidateTab(this,'settings')">Settings</button>
    </div>
    <div class="candidate-detail__body">
      <div id="cdTabProfile" class="candidate-detail__tab-content candidate-detail__tab-content--active">
        ${buildCandidateProfileHtml(c, isDetailScoped, clientList, positions, disabledStyle)}
        ${buildCandidateTagsHtml(c, disabledStyle)}
      </div>
      <div id="cdTabInterviews" class="candidate-detail__tab-content">
        ${buildCandidateStageSubHtml(c)}
        ${buildCandidateInterviewsHtml(id, roundsData, disabledStyle)}
      </div>
      <div id="cdTabActivity" class="candidate-detail__tab-content">
        <div class="candidate-detail__section" id="cdTimelineSection">
          <div class="candidate-detail__section-title">Timeline</div>
          <div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0">Loading history…</div>
        </div>
        <div class="candidate-detail__section" id="cdCommentsSection" style="${disabledStyle}">
          <div class="candidate-detail__section-title">Comments <span id="cdCommentCount" style="font-size:0.78rem;color:var(--text-muted)">(${c.comment_count || 0})</span></div>
          <div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0">Loading comments…</div>
        </div>
      </div>
      <div id="cdTabSettings" class="candidate-detail__tab-content">
        ${buildCandidateGdprHtml(c, disabledStyle)}
        ${buildCandidateActionsHtml(c, isArchived, isAdmin)}
      </div>
    </div>`;

  overlay.style.display = 'block';
  overlay.onclick = (e) => { if (e.target === overlay) closeCandidateDetail(); };
  panel.classList.add('open');
  window._candidateDetailPreviousFocus = document.activeElement;
  if (typeof _trapFocus === 'function') _trapFocus(panel);
  window._candidateDetailEscHandler = (e) => { if (e.key === 'Escape') closeCandidateDetail(); };
  document.addEventListener('keydown', window._candidateDetailEscHandler);

  const [historyData, commentsData] = await Promise.all([
    apiCall(`/api/candidates/${id}/history`).catch(() => []),
    apiCall(`/api/candidates/${id}/comments`).catch(() => []),
  ]);

  const timelineEl = document.getElementById('cdTimelineSection');
  if (timelineEl) {
    if (!historyData || historyData.length === 0) {
      timelineEl.innerHTML = `<div class="candidate-detail__section-title">Timeline</div><div style="color:var(--text-muted);font-size:0.82rem;padding:8px 0">No stage transitions recorded</div>`;
    } else {
      timelineEl.innerHTML = `<div class="candidate-detail__section-title">Timeline</div>
        ${historyData.map(h => {
          const ago = _relativeTime(new Date(h.moved_at));
          const fromLabel = h.from_stage ? (HIRING_STAGE_LABELS[h.from_stage] || h.from_stage) : 'New';
          const toLabel = HIRING_STAGE_LABELS[h.to_stage] || h.to_stage;
          return `<div style="display:flex;gap:10px;padding:6px 0;font-size:0.82rem;border-left:2px solid var(--border-default);padding-left:14px;margin-left:4px">
            <div style="flex:1"><span class="hiring-stage-badge hiring-stage-badge--${h.to_stage}" style="font-size:0.7rem;padding:2px 7px">${fromLabel} → ${toLabel}</span> <span style="color:var(--text-muted)">by ${esc(h.moved_by)}</span></div>
            <div style="color:var(--text-muted);white-space:nowrap">${ago}</div>
          </div>`;
        }).join('')}`;
    }
  }

  renderCandidateComments(id, commentsData, disabledStyle);

  if (roundsData && roundsData.length > 0) {
    roundsData.forEach(r => loadAndRenderScorecards(id, r.id));
  }

  if (c.stage === 'onboarding') {
    loadOnboardingChecklist(id);
  }
}

function switchCandidateTab(btn, tabId) {
  const panel = btn.closest('.candidate-detail-panel');
  panel.querySelectorAll('.candidate-detail__tab').forEach(t => t.classList.remove('candidate-detail__tab--active'));
  panel.querySelectorAll('.candidate-detail__tab-content').forEach(t => t.classList.remove('candidate-detail__tab-content--active'));
  btn.classList.add('candidate-detail__tab--active');
  const target = document.getElementById('cdTab' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
  if (target) target.classList.add('candidate-detail__tab-content--active');
}
```

- [ ] **Step 2: Add buildCandidateStageBarHtml function**

Add this new function after `buildCandidateHeaderHtml` (~line 20294):

```javascript
function buildCandidateStageBarHtml(c, isArchived, disabledStyle, candidateStages) {
  const resolvedStages = candidateStages || HIRING_STAGES.map(k => ({ key: k, label: HIRING_STAGE_LABELS[k] || k }));
  const stageIdx = resolvedStages.findIndex(s => s.key === c.stage);
  const prev = stageIdx > 0 ? resolvedStages[stageIdx - 1] : null;
  const next = stageIdx < resolvedStages.length - 1 ? resolvedStages[stageIdx + 1] : null;
  const stageAssignees = (c.stage_assignees && typeof c.stage_assignees === 'object') ? c.stage_assignees : {};
  const currentStageAssignees = Array.isArray(stageAssignees[c.stage]) ? stageAssignees[c.stage] : [];
  const unassigned = !isArchived && currentStageAssignees.length === 0;

  return `<div style="display:flex;align-items:center;gap:8px;${disabledStyle}">
    <button class="btn btn--sm" style="min-width:36px;background:var(--bg-surface);color:${prev ? 'var(--text-secondary)' : 'var(--text-faint)'};border:1px solid var(--border-default)" ${prev ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${prev.key}" title="Previous: ${esc(prev.label)}"` : 'disabled'}>&larr;</button>
    <select id="cdStageSel" onchange="hiringStageSelectChange('${c.id}',this.value)" style="flex:1;font-weight:600;text-align:center;padding:8px 10px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary);font-size:0.9rem">
      ${resolvedStages.map(s => `<option value="${s.key}" ${c.stage===s.key?'selected':''}>${esc(s.label)}</option>`).join('')}
    </select>
    <button class="btn btn--sm" style="min-width:36px;background:color-mix(in srgb, var(--success) 30%, var(--bg-surface));color:#fff;border:1px solid var(--success)" ${next ? `data-action="updateCandidateField" data-arg0="${c.id}" data-arg1="stage" data-arg2="${next.key}" title="Next: ${esc(next.label)}"` : `data-action="hiringConfirmHire" data-arg0="${c.id}" title="Confirm Onboarded"`}>&rarr;</button>
  </div>
  <div style="display:flex;align-items:center;gap:6px;margin-top:8px;flex-wrap:wrap;${disabledStyle}">
    ${currentStageAssignees.map((name, i) => `<span style="background:var(--bg-surface);border:1px solid var(--border-default);border-radius:10px;padding:3px 10px;font-size:0.78rem;display:inline-flex;align-items:center;gap:4px">${esc(name)} <button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:0.78rem" data-action="hiringRemoveStageAssignee" data-arg0="${c.id}" data-arg1="${esc(c.stage)}" data-arg2="${i}">&times;</button></span>`).join('')}
    ${unassigned ? '<span style="color:var(--danger);font-size:0.78rem">&#9888; No assignee</span>' : ''}
    <select id="cdStageAssigneeAdd" style="font-size:0.78rem;padding:3px 8px;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" onchange="if(this.value){hiringAddStageAssignee('${c.id}','${esc(c.stage)}');this.value=''}"><option value="">+ Assign…</option>${(_cachedTeamMembers || []).map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}</select>
  </div>`;
}
```

- [ ] **Step 3: Remove the old buildCandidateStageHtml content that is now in the stage bar**

The old `buildCandidateStageHtml` function (lines 20325-20354) rendered both stage controls AND assignees. Since those are now in the stage bar, this function is no longer called by openCandidateDetail. Leave it in place for any other callers, but it won't be used by the tabbed panel.

- [ ] **Step 4: Run E2E tests**

Run: `cd dashboard-server && npm run test:e2e`
Expected: All tests pass. The candidate panel now shows tabs, stage controls are pinned.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: candidate detail panel — tabbed layout with pinned stage controls"
```

### Task 7: Metrics View — Conversion Rates + Summary Row

**Files:**
- Modify: `nbi_project_dashboard.html:19205-19281` (loadHiringMetrics)

Add conversion rate percentages between pipeline funnel bars. Add a summary stat cards row above everything.

- [ ] **Step 1: Replace loadHiringMetrics function**

Replace the entire function (lines 19205-19281) with:

```javascript
async function loadHiringMetrics() {
  const clientId = document.getElementById('metricsClientFilter')?.value;
  const container = document.getElementById('metricsContent');
  if (!container) return;
  if (!clientId) { container.innerHTML = '<div style="color:var(--text-muted);font-size:0.9rem">Select a client to view metrics</div>'; return; }

  container.innerHTML = '<div style="color:var(--text-muted)">Loading metrics…</div>';

  try {
    const [timeInStage, timeToHire, pipeline] = await Promise.all([
      apiCall(`/api/hiring/metrics/time-in-stage?client_id=${clientId}`).catch(() => null),
      apiCall(`/api/hiring/metrics/time-to-hire?client_id=${clientId}`).catch(() => null),
      apiCall(`/api/hiring/metrics/pipeline?client_id=${clientId}`).catch(() => null),
    ]);

    let html = '';

    // Summary stat cards (always show)
    const totalActive = pipeline && pipeline.snapshot ? pipeline.snapshot.reduce((s, x) => s + x.count, 0) : 0;
    const totalHires = timeToHire && timeToHire.candidates ? timeToHire.candidates.length : 0;
    const avgDays = timeToHire ? (timeToHire.avg_days || 0) : 0;
    const medianDays = timeToHire ? (timeToHire.median_days || 0) : 0;

    html += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px;margin-bottom:var(--space-xl)">
      <div style="background:var(--bg-surface);padding:18px 20px;border-radius:var(--radius-md);border:1px solid var(--border-default)">
        <div style="font-size:2rem;font-weight:700;color:var(--text-primary);line-height:1">${totalActive}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Active candidates</div>
      </div>
      <div style="background:var(--bg-surface);padding:18px 20px;border-radius:var(--radius-md);border:1px solid var(--border-default)">
        <div style="font-size:2rem;font-weight:700;color:var(--success);line-height:1">${totalHires}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Total hires</div>
      </div>
      <div style="background:var(--bg-surface);padding:18px 20px;border-radius:var(--radius-md);border:1px solid var(--border-default)">
        <div style="font-size:2rem;font-weight:700;color:var(--text-primary);line-height:1">${avgDays}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Avg days to hire</div>
      </div>
      <div style="background:var(--bg-surface);padding:18px 20px;border-radius:var(--radius-md);border:1px solid var(--border-default)">
        <div style="font-size:2rem;font-weight:700;color:var(--text-primary);line-height:1">${medianDays}</div>
        <div style="font-size:0.78rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-top:4px">Median days</div>
      </div>
    </div>`;

    // Pipeline funnel with conversion rates (Ashby pattern)
    if (pipeline && pipeline.snapshot && pipeline.snapshot.length > 0) {
      const maxCount = Math.max(...pipeline.snapshot.map(s => s.count));
      html += `<div style="margin-bottom:var(--space-xl)">
        <div style="font-size:0.9rem;font-weight:600;margin-bottom:var(--space-md)">Pipeline Funnel</div>`;
      pipeline.snapshot.forEach((s, idx) => {
        const pct = maxCount > 0 ? (s.count / maxCount * 100) : 0;
        const prevCount = idx > 0 ? pipeline.snapshot[idx - 1].count : null;
        const conversionRate = prevCount && prevCount > 0 ? Math.round((s.count / prevCount) * 100) : null;

        if (idx > 0 && conversionRate !== null) {
          html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:2px;margin-top:-2px">
            <span style="width:110px"></span>
            <span style="font-size:0.72rem;color:${conversionRate < 30 ? 'var(--danger)' : conversionRate < 60 ? '#f59e0b' : 'var(--success)'};font-weight:600">↓ ${conversionRate}%</span>
          </div>`;
        }

        html += `<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
          <span style="width:110px;font-size:0.82rem;color:var(--text-muted);text-align:right;flex-shrink:0">${s.stage}</span>
          <div style="flex:1;height:28px;background:var(--bg-surface);border-radius:4px;overflow:hidden">
            <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:4px;display:flex;align-items:center;padding-left:10px;font-size:0.78rem;color:#fff;font-weight:600;min-width:fit-content">${s.count}</div>
          </div>
        </div>`;
      });
      html += '</div>';
    }

    // Time in stage bar chart
    if (timeInStage && timeInStage.stages && timeInStage.stages.length > 0) {
      html += `<div style="margin-bottom:var(--space-xl)">
        <div style="font-size:0.9rem;font-weight:600;margin-bottom:var(--space-md)">Average Time in Stage (days)</div>
        ${timeInStage.stages.map(s => {
          const days = Number(s.avg_days) || 0;
          const color = days < 7 ? 'var(--success)' : days < 14 ? '#f59e0b' : 'var(--danger)';
          const maxDays = Math.max(...timeInStage.stages.map(x => Number(x.avg_days) || 0));
          const pct = maxDays > 0 ? (days / maxDays * 100) : 0;
          return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
            <span style="width:110px;font-size:0.82rem;color:var(--text-muted);text-align:right;flex-shrink:0">${s.stage}</span>
            <div style="flex:1;height:24px;background:var(--bg-surface);border-radius:4px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;display:flex;align-items:center;padding-left:10px;font-size:0.78rem;color:#fff;font-weight:600;min-width:fit-content">${days}d</div>
            </div>
            <span style="font-size:0.78rem;color:var(--text-muted);width:70px">${s.candidate_count} cand.</span>
          </div>`;
        }).join('')}
      </div>`;
    }

    container.innerHTML = html || '<div style="color:var(--text-muted)">No metrics data available for this client</div>';
  } catch (e) {
    container.innerHTML = '<div style="color:var(--danger)">Failed to load metrics</div>';
  }
}
```

- [ ] **Step 2: Verify metrics render correctly**

Run: `npm run test:e2e`
Expected: All E2E tests pass. Metrics view now shows summary cards, funnel with conversion rates, and time-in-stage bars.

- [ ] **Step 3: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: metrics view — summary stat cards + pipeline conversion rates"
```

### Task 8: Stage Editor — Drag-to-Reorder

**Files:**
- Modify: `nbi_project_dashboard.html:20089-20166` (openStageEditor + addStageEditorRow)

Add drag handles (⠿ grip icon) to each stage row. Drag-and-drop reorders rows. The terminal stage (onboarded) cannot be moved — it's always last.

- [ ] **Step 1: Update openStageEditor to add drag handles**

In the `openStageEditor` function (~line 20100), update the row HTML template to prepend a drag handle:

Replace each stage row HTML (the return inside the `.map()`) with:

```javascript
return `<div class="stage-editor-row" draggable="${isTerminal ? 'false' : 'true'}" style="display:flex;gap:6px;align-items:center">
  ${isTerminal ? '<span style="width:24px"></span>' : '<span class="se-drag-handle" title="Drag to reorder">&#10303;</span>'}
  <input type="text" value="${esc(s.key)}" class="se-key" style="width:120px;padding:5px 8px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" ${isTerminal ? 'disabled' : ''} placeholder="key">
  <input type="text" value="${esc(s.label)}" class="se-label" style="flex:1;padding:5px 8px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" placeholder="Label">
  <label style="display:flex;align-items:center;gap:3px;font-size:0.72rem;color:var(--text-muted);white-space:nowrap" title="Onboarding stage"><input type="checkbox" class="se-onboarding" ${isOnboarding ? 'checked' : ''}> Onboard</label>
  ${isTerminal ? '' : `<button class="btn btn--ghost btn--sm" style="color:var(--danger)" onclick="this.closest('.stage-editor-row').remove()">×</button>`}
</div>`;
```

- [ ] **Step 2: Add drag-and-drop event handlers**

After the `openStageEditor` function creates the overlay and appends it to the document, add these drag handlers (before the `close` function):

```javascript
  // Drag reorder for stage rows
  const list = overlay.querySelector('#stageEditorList');
  let dragRow = null;
  list.addEventListener('dragstart', (e) => {
    dragRow = e.target.closest('.stage-editor-row');
    if (!dragRow || dragRow.getAttribute('draggable') === 'false') { e.preventDefault(); return; }
    dragRow.classList.add('se-dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    const target = e.target.closest('.stage-editor-row');
    if (!target || target === dragRow || target.getAttribute('draggable') === 'false') return;
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      list.insertBefore(dragRow, target);
    } else {
      list.insertBefore(dragRow, target.nextSibling);
    }
  });
  list.addEventListener('dragend', () => {
    if (dragRow) dragRow.classList.remove('se-dragging');
    dragRow = null;
    // Ensure terminal row stays last
    const rows = list.querySelectorAll('.stage-editor-row');
    const terminal = Array.from(rows).find(r => r.getAttribute('draggable') === 'false');
    if (terminal && terminal !== rows[rows.length - 1]) list.appendChild(terminal);
  });
```

- [ ] **Step 3: Update addStageEditorRow to include drag handle**

Replace the `addStageEditorRow` function (lines 20154-20166) with:

```javascript
function addStageEditorRow() {
  const list = document.getElementById('stageEditorList');
  if (!list) return;
  const terminalRow = list.querySelector('.stage-editor-row:last-child');
  const newRow = document.createElement('div');
  newRow.className = 'stage-editor-row';
  newRow.draggable = true;
  newRow.style.cssText = 'display:flex;gap:6px;align-items:center';
  newRow.innerHTML = `<span class="se-drag-handle" title="Drag to reorder">&#10303;</span>
    <input type="text" class="se-key" style="width:120px;padding:5px 8px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" placeholder="key">
    <input type="text" class="se-label" style="flex:1;padding:5px 8px;font-size:0.85rem;background:var(--bg-input);border:1px solid var(--border-default);border-radius:var(--radius-sm);color:var(--text-primary)" placeholder="Label">
    <label style="display:flex;align-items:center;gap:3px;font-size:0.72rem;color:var(--text-muted);white-space:nowrap"><input type="checkbox" class="se-onboarding"> Onboard</label>
    <button class="btn btn--ghost btn--sm" style="color:var(--danger)" onclick="this.closest('.stage-editor-row').remove()">×</button>`;
  list.insertBefore(newRow, terminalRow);
}
```

- [ ] **Step 4: Verify stage editor works**

Run: `npm run test:e2e`
Expected: All E2E tests pass. Stage editor rows now have drag handles and can be reordered.

- [ ] **Step 5: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: stage editor — drag-to-reorder handles"
```

### Task 9: Position Cards — Larger Minibar + Client Salary Hiding

**Files:**
- Modify: `nbi_project_dashboard.html:19460-19507` (renderPositionCard)

Enhances the position card minibar from 4px to 8px height (already done in CSS Task 4), adds stage label tooltips to segments, and enforces salary hiding for client users.

- [ ] **Step 1: Update renderPositionCard**

Replace the function (lines 19460-19507) with:

```javascript
function renderPositionCard(p, candidates) {
  const d = _parsePositionDesc(p.description);
  const days = _positionDaysOpen(p);
  const linked = candidates.filter(c => c.position_id === p.id && !c.archived_at);
  const dotClass = p.status === 'filled' ? 'position-card__dot--filled' : 'position-card__dot--open';
  const prioClass = d.priority !== null ? 'position-card__priority--' + d.priority : '';
  const seniorityChip = p.seniority ? `<span class="position-card__chip">${esc(p.seniority.charAt(0).toUpperCase() + p.seniority.slice(1))}</span>` : '';
  const isScopedUser = isClientUser();

  let minibar = '';
  if (linked.length > 0) {
    const stageColors = { sourcing: 'var(--text-muted)', interviews: '#f59e0b', offer: '#2563eb', onboarding: '#10b981', onboarded: 'var(--success)' };
    const stageCounts = {};
    linked.forEach(c => { stageCounts[c.stage] = (stageCounts[c.stage] || 0) + 1; });
    const total = linked.length;
    const segments = Object.entries(stageCounts).map(([stage, count]) =>
      `<span style="width:${(count/total)*100}%;background:${stageColors[stage] || 'var(--text-muted)'}" title="${count} ${stage}"></span>`
    ).join('');
    minibar = `<div class="position-card__minibar">${segments}</div>`;
  }

  const candidateLabel = linked.length === 1 ? '1 candidate' : linked.length + ' candidates';
  const jdIcon = p.jd_filename ? '<span style="position:absolute;top:8px;right:10px;font-size:0.75rem;color:var(--text-muted)" title="Job description attached">&#128196;</span>' : '';

  return `<div class="position-card" data-position-id="${p.id}" data-action="openPositionDetail" data-arg0="${p.id}" tabindex="0" role="button"
              aria-label="${esc(p.title)}, ${p.status}, ${candidateLabel}"
              onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPositionDetail('${p.id}')}">
    ${jdIcon}
    <div class="position-card__row">
      <span class="position-card__dot ${dotClass}"></span>
      <span class="position-card__title">${esc(p.title)}</span>
      ${d.priority !== null ? `<span class="position-card__priority ${prioClass}">P${esc(String(d.priority))}</span>` : ''}
    </div>
    <div class="position-card__row">
      ${seniorityChip}
      ${d.recruitStatus ? `<span class="position-card__chip">${esc(d.recruitStatus)}</span>` : ''}
    </div>
    <div class="position-card__meta">
      ${!isScopedUser && p.salary_range ? `<span class="position-card__salary">${esc(p.salary_range)}</span>` : ''}
      ${!isScopedUser && !p.salary_range && d.startMonth ? `<span>Start: ${esc(d.startMonth)}</span>` : ''}
      ${p.location ? `<span>${esc(p.location)}</span>` : ''}
      <span class="${_daysOpenClass(days)}">${days}d open</span>
    </div>
    <div class="position-card__candidates">
      ${minibar}
      <span>${candidateLabel}</span>
    </div>
  </div>`;
}
```

Key changes: salary hidden for client users, salary class for proper styling, font sizes bumped via CSS.

- [ ] **Step 2: Update openPositionDetail for client salary hiding**

In `openPositionDetail` (~line 19863-19867), update the non-admin info grid to exclude salary:

Replace:
```javascript
        ${p.salary_range ? `<div class="position-detail__info-item"><span class="position-detail__info-label">Salary</span><span class="position-detail__info-value">${esc(p.salary_range)}</span></div>` : ''}
```

With:
```javascript
        ${!isClientUser() && p.salary_range ? `<div class="position-detail__info-item"><span class="position-detail__info-label">Salary</span><span class="position-detail__info-value">${esc(p.salary_range)}</span></div>` : ''}
```

- [ ] **Step 3: Run tests**

Run: `cd dashboard-server && npm run test:all`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add nbi_project_dashboard.html
git commit -m "feat: position cards — enhanced minibar, salary hidden for client users"
```

### Task 10: Final Verification + PM2 Restart

- [ ] **Step 1: Run full test suite**

Run: `cd dashboard-server && npm run test:all`
Expected: All unit tests and E2E tests pass.

- [ ] **Step 2: Restart PM2**

Run: `pm2 restart nbi-dashboard`
Expected: Server restarts cleanly.

- [ ] **Step 3: Verify in browser**

Open https://worksage.nbi-consulting.com and check:
1. Kanban cards have coloured left borders
2. Days-in-stage shows on every card
3. Candidate detail panel has tabs (Profile, Interviews, Activity, Settings)
4. Stage controls are pinned above tabs
5. Position cards show salary for admin, hidden for client users
6. Metrics view has summary cards and conversion rates
7. Stage editor has drag handles
8. Salary_range is populated for Couch Heroes positions

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: ATS visual polish — action borders, tabbed panel, salary backfill, client access control"
```
