# Command Centre v2 Phase 2 — Financial Pulse + Embedded Chat

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the Money tab (F7) showing financial KPIs from the existing finance_data JSONB, and a floating Claude chat panel (F13) that bills to Glen's Max Pro subscription via the Claude Code CLI.

**Architecture:** F7 reuses the same finance_data JSONB that the Finances view already parses — a new endpoint reads the latest row and computes KPIs server-side. F13 spawns `claude -p --output-format stream-json` as a child process, pipes messages through a WebSocket connection to a floating chat panel in the HTML. The system prompt includes live dashboard context (fires, clients, stats) so Claude has full business awareness.

**Tech Stack:** Express 4, PostgreSQL (`pg`), `ws` npm package for WebSocket, `child_process.spawn` for Claude CLI, Vitest + supertest for tests.

**Spec:** `docs/superpowers/specs/2026-05-16-command-centre-v2-design.md` (F7 + F13)

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `dashboard-server/routes/command-centre.js` | Modify | Add `/api/command-centre/financial-pulse` endpoint |
| `dashboard-server/routes/chat.js` | Create | WebSocket chat handler — spawns Claude CLI, pipes messages, manages sessions |
| `dashboard-server/server.js` | Modify | Attach WebSocket server to HTTP server, mount chat route |
| `dashboard-server/package.json` | Modify | Add `ws` dependency |
| `nbi_project_dashboard.html` | Modify | Replace Money tab placeholder with financial dashboard; add floating chat panel + CSS |
| `dashboard-server/tests/unit/command-centre.test.mjs` | Modify | Add financial-pulse endpoint tests |
| `dashboard-server/tests/unit/chat.test.mjs` | Create | Chat route unit tests |

---

## Schema Reference

**finance_data** — single JSONB row, structure:
```js
{
  revenue: [{ client: 'Lighthouse Games', annual: 150000, type: 'Retainer', status: 'Active', startMonth: 1 }],
  payroll: [{ name: 'Glen Pryer', role: 'MD', monthly: 5000, annual: 60000, billable: true, client: null }],
  pipeline: [{ client: 'New Lead', low: 10000, high: 50000, probability: 'Medium', notes: '' }],
  opex: [{ name: 'Office', amount: 500, tag: 'Premises', type: 'recurring' }],
  targets: { y2026: 500000, y2027: 700000 },
  employerCostPct: 15
}
```

**clients** — `id, name, contract_value, practice_area`
**sows** — `id, client_id, title, start_date, end_date, status` (already queried by project-health endpoint)
**expenses** — `id, user_id, date, amount, currency, category_id, description, status`

---

## Existing Patterns

**Finance data access** (from `routes/finance.js` line 23-27):
```js
const { rows } = await pool.query('SELECT id, data, updated_by, updated_at FROM finance_data ORDER BY id DESC LIMIT 1');
// rows[0].data is the JSONB object
```

**KPI calculations** (from `nbi_project_dashboard.html` lines 15008-15050):
```js
const annualPayroll = S.payroll.reduce((s,p) => s + p.annual, 0);
const monthlyPayroll = annualPayroll / 12;
const contractedRevenue = S.revenue.reduce((s,r) => s + r.annual, 0);
const grossProfit = contractedRevenue - billableFullCost;
const grossMarginPct = contractedRevenue > 0 ? Math.round(grossProfit / contractedRevenue * 100) : 0;
```

**Server HTTP instance** (`server.js` line 505):
```js
var server = app.listen(PORT, '0.0.0.0', () => { ... });
```

**Claude CLI streaming** — tested and working:
```bash
echo "prompt" | claude -p --output-format stream-json --max-turns 1
# Returns JSON lines: {"type":"assistant","message":{"content":[{"type":"text","text":"..."}]}}
# Final line: {"type":"result","result":"full text","session_id":"...","total_cost_usd":0.xx}
```

---

## Task 1: Financial Pulse Endpoint (F7 backend)

New `/api/command-centre/financial-pulse` endpoint that reads finance_data JSONB and computes KPIs server-side.

**Files:**
- Modify: `dashboard-server/routes/command-centre.js`
- Modify: `dashboard-server/tests/unit/command-centre.test.mjs`

### Steps

- [ ] **Step 1: Write failing tests**

Add to `dashboard-server/tests/unit/command-centre.test.mjs`:

```js
describe('Command Centre — Financial-pulse endpoint', () => {
  it('GET /api/command-centre/financial-pulse returns correct shape', async () => {
    const pool = makeMockPool({
      financeData: [{
        data: {
          revenue: [{ client: 'Acme', annual: 120000, type: 'Retainer', status: 'Active', startMonth: 1 }],
          payroll: [{ name: 'Glen', role: 'MD', monthly: 5000, annual: 60000, billable: true }],
          pipeline: [],
          opex: [{ name: 'Office', amount: 500, tag: 'Premises', type: 'recurring' }],
          targets: { y2026: 500000, y2027: 700000 },
          employerCostPct: 15,
        },
        updated_at: '2026-05-16T10:00:00Z',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/financial-pulse');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('revenue');
    expect(res.body.data).toHaveProperty('costs');
    expect(res.body.data).toHaveProperty('margins');
    expect(res.body.data).toHaveProperty('contracts');
    expect(res.body.data).toHaveProperty('last_updated');
    expect(res.body.error).toBeNull();
  });

  it('returns 404 when no finance data exists', async () => {
    const pool = makeMockPool({ financeData: [] });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/financial-pulse');
    expect(res.status).toBe(404);
  });

  it('computes gross margin correctly', async () => {
    const pool = makeMockPool({
      financeData: [{
        data: {
          revenue: [{ client: 'A', annual: 200000, billable: true }],
          payroll: [{ name: 'X', annual: 80000, billable: true }],
          pipeline: [], opex: [], targets: {}, employerCostPct: 0,
        },
        updated_at: '2026-05-16T10:00:00Z',
      }],
    });
    const { app } = makeApp(pool);
    const res = await request(app).get('/api/command-centre/financial-pulse');
    expect(res.body.data.margins.gross_margin_pct).toBe(60);
  });
});
```

Update `makeMockPool` to handle finance_data queries — add this case before the default `return { rows: [] }`:
```js
if (sql.includes('finance_data')) {
  return { rows: overrides.financeData || [] };
}
```

- [ ] **Step 2: Run tests to verify failure**

Run: `cd dashboard-server && npx vitest run tests/unit/command-centre.test.mjs`
Expected: FAIL — 404.

- [ ] **Step 3: Implement the endpoint**

Add to `dashboard-server/routes/command-centre.js` before `router._computeSnapshot`:

```js
  /** GET /api/command-centre/financial-pulse — KPIs from finance_data JSONB (F7) */
  router.get('/api/command-centre/financial-pulse', requireNBI, async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT data, updated_at FROM finance_data ORDER BY id DESC LIMIT 1'
      );
      if (rows.length === 0) {
        return res.status(404).json({ data: null, error: 'No finance data. Use the Finances view to set up revenue and payroll data.' });
      }

      const S = rows[0].data;
      const updatedAt = rows[0].updated_at;

      // Revenue
      const revenueItems = S.revenue || [];
      const contractedRevenue = revenueItems.reduce((s, r) => s + (r.annual || 0), 0);
      const monthlyRevenue = Math.round(contractedRevenue / 12);
      const revenueByClient = revenueItems.map(r => ({
        client: r.client, annual: r.annual || 0, type: r.type || '', status: r.status || '',
      }));

      // Costs
      const payrollItems = S.payroll || [];
      const annualPayroll = payrollItems.reduce((s, p) => s + (p.annual || 0), 0);
      const employerCostPct = parseFloat(S.employerCostPct || 15) / 100;
      const billableStaffCost = payrollItems.filter(p => p.billable).reduce((s, p) => s + (p.annual || 0), 0);
      const billableFullCost = Math.round(billableStaffCost * (1 + employerCostPct));
      const totalStaffFullCost = Math.round(annualPayroll * (1 + employerCostPct));
      const opexItems = S.opex || [];
      const annualOpex = opexItems.reduce((s, e) => s + ((e.amount || 0) * 12), 0);
      const monthlyBurn = Math.round((totalStaffFullCost / 12) + (annualOpex / 12));
      const headcount = payrollItems.length;
      const billableCount = payrollItems.filter(p => p.billable).length;

      // Margins
      const grossProfit = contractedRevenue - billableFullCost;
      const grossMarginPct = contractedRevenue > 0 ? Math.round(grossProfit / contractedRevenue * 100) : 0;
      const totalOverheads = (totalStaffFullCost - billableFullCost) + annualOpex;
      const netProfit = grossProfit - totalOverheads;
      const netMarginPct = contractedRevenue > 0 ? Math.round(netProfit / contractedRevenue * 100) : 0;

      // Targets
      const targets = S.targets || {};
      const currentYear = new Date().getFullYear();
      const targetKey = 'y' + currentYear;
      const annualTarget = targets[targetKey] || 0;
      const targetPct = annualTarget > 0 ? Math.round(contractedRevenue / annualTarget * 100) : 0;

      // Pipeline
      const pipelineItems = S.pipeline || [];
      const pipelineTotal = pipelineItems.reduce((s, p) => s + ((p.low || 0) + (p.high || 0)) / 2, 0);

      // Contracts (from clients table — separate query)
      const { rows: clientRows } = await pool.query(
        'SELECT name, contract_value FROM clients WHERE contract_value IS NOT NULL AND contract_value > 0 ORDER BY contract_value DESC'
      );
      const totalContractValue = clientRows.reduce((s, c) => s + parseFloat(c.contract_value || 0), 0);

      // SOWs expiring soon
      const { rows: sowRows } = await pool.query(
        "SELECT title, client_id, end_date FROM sows WHERE status = 'active' AND end_date IS NOT NULL AND end_date <= CURRENT_DATE + 60 ORDER BY end_date"
      );

      res.json({
        data: {
          revenue: {
            annual_contracted: contractedRevenue,
            monthly: monthlyRevenue,
            by_client: revenueByClient,
            target: annualTarget,
            target_pct: targetPct,
          },
          costs: {
            annual_payroll: annualPayroll,
            annual_full_cost: totalStaffFullCost,
            annual_opex: annualOpex,
            monthly_burn: monthlyBurn,
            headcount,
            billable_count: billableCount,
          },
          margins: {
            gross_profit: grossProfit,
            gross_margin_pct: grossMarginPct,
            net_profit: netProfit,
            net_margin_pct: netMarginPct,
          },
          pipeline: {
            total_value: Math.round(pipelineTotal),
            count: pipelineItems.length,
          },
          contracts: {
            total_value: totalContractValue,
            by_client: clientRows.map(c => ({ name: c.name, value: parseFloat(c.contract_value) })),
            expiring_sows: sowRows,
          },
          last_updated: updatedAt,
        },
        error: null,
      });
    } catch (e) {
      log('error', 'CC', 'financial-pulse failed', { error: e.message });
      res.status(500).json({ data: null, error: e.message });
    }
  });
```

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npx vitest run tests/unit/command-centre.test.mjs`
Expected: All PASS.

- [ ] **Step 5: Commit**

```
git add dashboard-server/routes/command-centre.js dashboard-server/tests/unit/command-centre.test.mjs
git commit -m "feat(cc): financial pulse endpoint (F7) — revenue, costs, margins, pipeline KPIs"
```

---

## Task 2: Money Tab Frontend (F7 frontend)

Replace the Money tab placeholder with a financial dashboard showing the KPIs from the financial-pulse endpoint.

**Files:**
- Modify: `nbi_project_dashboard.html` — replace `_ccRenderMoneyTab`, add `_ccFinancialPulse` state var, wire into `_ccFetchAll`

### Steps

- [ ] **Step 1: Add state variable and fetch wiring**

Add `let _ccFinancialPulse = null;` alongside the other CC state variables (around line 19670).

Add `apiCall('/api/command-centre/financial-pulse')` to the `Promise.allSettled` array in `_ccFetchAll`.

Add the extraction after the existing result handlers:
```js
if (finRes.status === 'fulfilled' && finRes.value) {
  _ccFinancialPulse = finRes.value.data || finRes.value;
}
```

Update the destructure to include `finRes`.

- [ ] **Step 2: Replace `_ccRenderMoneyTab` with full implementation**

Replace the placeholder function with:

```js
function _ccRenderMoneyTab() {
  var f = _ccFinancialPulse;
  if (!f) return '<div class="cc-panel-empty">Loading financial data...</div>';

  var html = '';
  var rev = f.revenue || {};
  var costs = f.costs || {};
  var margins = f.margins || {};
  var pipe = f.pipeline || {};
  var contracts = f.contracts || {};

  // === ROW 1: KPI tiles (6 across) ===
  html += '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:16px;">';

  var kpis = [
    { label: 'ANNUAL REVENUE', v: '£' + Math.round(rev.annual_contracted / 1000) + 'k', colour: '#3fb950' },
    { label: 'MONTHLY BURN', v: '£' + Math.round(costs.monthly_burn / 1000) + 'k', colour: '#f85149' },
    { label: 'GROSS MARGIN', v: margins.gross_margin_pct + '%', colour: margins.gross_margin_pct >= 40 ? '#3fb950' : margins.gross_margin_pct >= 20 ? '#d29922' : '#f85149' },
    { label: 'NET MARGIN', v: margins.net_margin_pct + '%', colour: margins.net_margin_pct >= 15 ? '#3fb950' : margins.net_margin_pct >= 0 ? '#d29922' : '#f85149' },
    { label: 'PIPELINE', v: '£' + Math.round(pipe.total_value / 1000) + 'k', colour: '#58a6ff' },
    { label: 'TARGET', v: rev.target_pct + '%', colour: rev.target_pct >= 80 ? '#3fb950' : rev.target_pct >= 50 ? '#d29922' : '#f85149' }
  ];
  kpis.forEach(function(k) {
    html += '<div class="cc-card cc-stat"><div class="s">' + k.label + '</div><div class="v" style="color:' + k.colour + ';">' + k.v + '</div></div>';
  });
  html += '</div>';

  // === ROW 2: Revenue by client + Cost breakdown + Contracts (3 cols) ===
  html += '<div class="cc-grid-3">';

  // Revenue by client
  html += '<div class="cc-card"><h3><span>Revenue by Client</span> <span class="ct">£' + Math.round(rev.annual_contracted / 1000) + 'k/yr</span></h3>';
  var byClient = rev.by_client || [];
  if (byClient.length === 0) {
    html += '<div style="color:#8b949e">No revenue data — set up in Finances view</div>';
  } else {
    var maxRev = Math.max.apply(null, byClient.map(function(c) { return c.annual; }).concat([1]));
    byClient.forEach(function(c) {
      var pct = Math.max(5, Math.round((c.annual / maxRev) * 100));
      html += '<div style="margin-bottom:8px;">';
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">';
      html += '<span style="font-size:0.9rem;">' + esc(c.client) + '</span>';
      html += '<span style="font-size:0.82rem;color:#3fb950;">£' + Math.round(c.annual / 1000) + 'k</span>';
      html += '</div>';
      html += '<div style="background:#21262d;border-radius:4px;height:10px;overflow:hidden;">';
      html += '<div style="background:linear-gradient(to right,#238636,#3fb950);width:' + pct + '%;height:100%;border-radius:4px;"></div>';
      html += '</div></div>';
    });
  }
  html += '</div>';

  // Cost breakdown
  html += '<div class="cc-card"><h3><span>Cost Structure</span> <span class="ct">annual</span></h3>';
  var costItems = [
    { label: 'Staff (full cost)', v: costs.annual_full_cost || 0, colour: '#f85149' },
    { label: 'Operating expenses', v: costs.annual_opex || 0, colour: '#d29922' },
  ];
  var totalCost = costItems.reduce(function(s, c) { return s + c.v; }, 0) || 1;
  html += '<div style="display:flex;height:12px;border-radius:6px;overflow:hidden;gap:1px;margin-bottom:14px;">';
  costItems.forEach(function(c) {
    if (c.v > 0) html += '<div style="background:' + c.colour + ';flex:' + c.v + ';" title="' + c.label + '"></div>';
  });
  html += '</div>';
  costItems.forEach(function(c) {
    html += '<div class="cc-row">';
    html += '<div class="cc-row-b"><div class="cc-row-t">' + c.label + '</div></div>';
    html += '<div style="font-size:0.9rem;font-weight:700;color:' + c.colour + ';">£' + Math.round(c.v / 1000) + 'k</div>';
    html += '</div>';
  });
  html += '<div style="margin-top:12px;padding-top:10px;border-top:1px solid #21262d;">';
  html += '<div class="cc-row"><div class="cc-row-b"><div class="cc-row-t">Headcount</div></div><div style="font-size:0.9rem;font-weight:700;">' + costs.headcount + ' (' + costs.billable_count + ' billable)</div></div>';
  html += '</div>';
  html += '</div>';

  // Contracts
  html += '<div class="cc-card"><h3><span>Contracts</span> <span class="ct">£' + Math.round(contracts.total_value / 1000) + 'k total</span></h3>';
  var byContract = contracts.by_client || [];
  byContract.forEach(function(c) {
    html += '<div class="cc-row">';
    html += '<div class="cc-row-b"><div class="cc-row-t">' + esc(c.name) + '</div></div>';
    html += '<div style="font-size:0.9rem;font-weight:700;color:#58a6ff;">£' + Math.round(c.value / 1000) + 'k</div>';
    html += '</div>';
  });
  var expSows = contracts.expiring_sows || [];
  if (expSows.length > 0) {
    html += '<div class="cc-section-hdr" style="color:#f85149;margin-top:10px;">Expiring Soon</div>';
    expSows.forEach(function(s) {
      var daysLeft = s.end_date ? Math.ceil((new Date(s.end_date) - Date.now()) / 86400000) : 0;
      html += '<div class="cc-row">';
      html += '<div class="cc-row-b"><div class="cc-row-t">' + esc(s.title) + '</div></div>';
      html += '<span class="cc-tag r">' + daysLeft + 'd left</span>';
      html += '</div>';
    });
  }
  html += '</div>';

  html += '</div>';

  // Last updated
  if (f.last_updated) {
    html += '<div style="text-align:right;font-size:0.75rem;color:#484f58;margin-top:8px;">Finance data last updated: ' + new Date(f.last_updated).toLocaleString('en-GB') + '</div>';
  }

  return html;
}
```

- [ ] **Step 3: Run full test suite**

Run: `cd dashboard-server && npm test`
Expected: All PASS.

- [ ] **Step 4: Commit**

```
git add nbi_project_dashboard.html
git commit -m "feat(cc): Money tab frontend (F7) — KPI tiles, revenue bars, cost breakdown, contracts"
```

---

## Task 3: WebSocket Chat Server (F13 backend)

Create the chat route that spawns Claude CLI sessions and pipes messages through WebSocket.

**Files:**
- Create: `dashboard-server/routes/chat.js`
- Modify: `dashboard-server/server.js` — attach WebSocket server
- Modify: `dashboard-server/package.json` — add `ws` dependency

### Steps

- [ ] **Step 1: Install `ws` package**

Run: `cd dashboard-server && npm install ws`

- [ ] **Step 2: Create `dashboard-server/routes/chat.js`**

```js
'use strict';

const { spawn } = require('child_process');
const WebSocket = require('ws');

module.exports = function attachChat(server, ctx) {
  const { pool, log } = ctx;
  const wss = new WebSocket.Server({ server, path: '/ws/chat' });

  wss.on('connection', (ws) => {
    let claudeProc = null;
    let sessionId = null;
    let buffer = '';

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type === 'chat') {
        if (claudeProc && !claudeProc.killed) {
          claudeProc.kill();
        }

        // Build system prompt with dashboard context
        let systemPrompt = 'You are Glen\'s AI assistant embedded in the WorkSage dashboard (NBI Hub). ';
        systemPrompt += 'You have access to the business context below. Be concise and actionable. British English.\n\n';

        try {
          const contextParts = [];
          const { rows: snapRows } = await pool.query(
            'SELECT data FROM cc_snapshots ORDER BY snapshot_date DESC LIMIT 1'
          );
          if (snapRows.length > 0 && snapRows[0].data.four_cs) {
            const fc = snapRows[0].data.four_cs;
            contextParts.push('AIOS: Context ' + (fc.context?.score || 0) + '/10, Connections ' + (fc.connections?.score || 0) + '/10, Capabilities ' + (fc.capabilities?.score || 0) + '/10, Cadence ' + (fc.cadence?.score || 0) + '/10');
          }
          const { rows: statsRows } = await pool.query(
            "SELECT COUNT(*) FILTER (WHERE status NOT IN ('Done','Cancelled')) as open, COUNT(*) FILTER (WHERE status = 'Blocked') as blocked, COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date != '' AND due_date::date < CURRENT_DATE AND status NOT IN ('Done','Cancelled')) as overdue FROM tasks WHERE item_type IN ('story','task')"
          );
          if (statsRows[0]) {
            contextParts.push('Tasks: ' + statsRows[0].open + ' open, ' + statsRows[0].overdue + ' overdue, ' + statsRows[0].blocked + ' blocked');
          }
          const { rows: clientRows } = await pool.query(
            "SELECT c.name, COUNT(t.id) FILTER (WHERE t.status NOT IN ('Done','Cancelled')) as active FROM clients c LEFT JOIN tasks t ON t.client_id = c.id AND t.item_type IN ('story','task') GROUP BY c.name HAVING COUNT(t.id) > 0 ORDER BY active DESC"
          );
          if (clientRows.length > 0) {
            contextParts.push('Clients: ' + clientRows.map(c => c.name + ' (' + c.active + ' active)').join(', '));
          }
          if (contextParts.length > 0) {
            systemPrompt += contextParts.join('\n');
          }
        } catch (e) {
          log('warn', 'Chat', 'Failed to build context', { error: e.message });
        }

        const args = [
          '-p',
          '--output-format', 'stream-json',
          '--max-turns', '1',
          '--system-prompt', systemPrompt,
          '--no-session-persistence',
          '--bare',
        ];

        claudeProc = spawn('claude', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
        });

        claudeProc.stdout.on('data', (chunk) => {
          const lines = (buffer + chunk.toString()).split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'assistant' && parsed.message?.content) {
                for (const block of parsed.message.content) {
                  if (block.type === 'text' && block.text) {
                    ws.send(JSON.stringify({ type: 'chunk', text: block.text }));
                  }
                }
              } else if (parsed.type === 'result') {
                sessionId = parsed.session_id;
                ws.send(JSON.stringify({
                  type: 'done',
                  text: parsed.result || '',
                  session_id: sessionId,
                  cost_usd: parsed.total_cost_usd,
                  duration_ms: parsed.duration_ms,
                }));
              }
            } catch {}
          }
        });

        claudeProc.stderr.on('data', (chunk) => {
          const errText = chunk.toString().trim();
          if (errText) {
            log('warn', 'Chat', 'Claude stderr', { text: errText.slice(0, 200) });
          }
        });

        claudeProc.on('close', (code) => {
          if (code !== 0 && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', text: 'Claude process exited with code ' + code }));
          }
          claudeProc = null;
        });

        claudeProc.stdin.write(msg.text + '\n');
        claudeProc.stdin.end();
      }
    });

    ws.on('close', () => {
      if (claudeProc && !claudeProc.killed) {
        claudeProc.kill();
      }
    });
  });

  return wss;
};
```

- [ ] **Step 3: Wire WebSocket into server.js**

Find `var server = app.listen(PORT, '0.0.0.0', () => {` (line 505) in `server.js`. AFTER the `server = app.listen(...)` block (after the closing `});`), add:

```js
  // WebSocket: Claude chat
  const attachChat = require('./routes/chat');
  attachChat(server, ctx);
```

Note: `ctx` is the context object that's already defined earlier in server.js (it contains `pool`, `log`, etc.). Find where it's defined and ensure the `attachChat` call uses the same variable.

- [ ] **Step 4: Run tests**

Run: `cd dashboard-server && npm test`
Expected: All existing tests still PASS. The chat module is WebSocket-based so doesn't need supertest HTTP tests.

- [ ] **Step 5: Commit**

```
git add dashboard-server/routes/chat.js dashboard-server/server.js dashboard-server/package.json dashboard-server/package-lock.json
git commit -m "feat(cc): WebSocket chat server (F13) — Claude CLI spawner with dashboard context"
```

---

## Task 4: Floating Chat Panel Frontend (F13 frontend)

Add a floating chat panel to the CC with a text input, message history, and WebSocket connection.

**Files:**
- Modify: `nbi_project_dashboard.html` — add CSS for chat panel, add JS for WebSocket connection + chat UI

### Steps

- [ ] **Step 1: Add chat panel CSS**

Add to the CC CSS block (after the existing CC styles, before `</style>`):

```css
/* v2 Floating chat panel */
.cc-chat { position: fixed; bottom: 20px; right: 20px; width: 420px; max-height: 520px; background: #161b22; border: 1px solid #30363d; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,.5); display: flex; flex-direction: column; z-index: 500; font-size: 15px; }
.cc-chat.hidden { display: none; }
.cc-chat-hdr { padding: 10px 16px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; background: #0d1117; border-radius: 12px 12px 0 0; }
.cc-chat-hdr h4 { margin: 0; font-size: 0.9rem; color: #e6edf3; }
.cc-chat-close { background: none; border: none; color: #8b949e; cursor: pointer; font-size: 1.1rem; padding: 4px; }
.cc-chat-close:hover { color: #e6edf3; }
.cc-chat-msgs { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; min-height: 200px; max-height: 380px; }
.cc-chat-msg { padding: 8px 12px; border-radius: 8px; font-size: 0.9rem; line-height: 1.5; max-width: 90%; word-wrap: break-word; }
.cc-chat-msg.user { background: #1f6feb; color: white; align-self: flex-end; border-bottom-right-radius: 2px; }
.cc-chat-msg.assistant { background: #21262d; color: #e6edf3; align-self: flex-start; border-bottom-left-radius: 2px; }
.cc-chat-msg.error { background: rgba(248,81,73,.1); color: #f85149; align-self: center; font-size: 0.82rem; }
.cc-chat-msg.typing { color: #8b949e; font-style: italic; }
.cc-chat-input { display: flex; gap: 8px; padding: 10px 16px; border-top: 1px solid #30363d; background: #0d1117; border-radius: 0 0 12px 12px; }
.cc-chat-input input { flex: 1; background: #21262d; border: 1px solid #30363d; border-radius: 6px; padding: 8px 12px; color: #e6edf3; font-size: 0.9rem; font-family: inherit; outline: none; }
.cc-chat-input input:focus { border-color: #58a6ff; }
.cc-chat-input button { background: #238636; border: none; border-radius: 6px; padding: 8px 14px; color: white; font-weight: 600; cursor: pointer; font-family: inherit; font-size: 0.85rem; }
.cc-chat-input button:hover { background: #2ea043; }
.cc-chat-input button:disabled { opacity: .5; cursor: not-allowed; }
.cc-chat-fab { position: fixed; bottom: 20px; right: 20px; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #238636, #1f6feb); border: none; color: white; font-size: 1.4rem; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,.4); z-index: 499; display: flex; align-items: center; justify-content: center; transition: transform .2s; }
.cc-chat-fab:hover { transform: scale(1.1); }
.cc-chat-fab.hidden { display: none; }
```

- [ ] **Step 2: Add chat JS**

Add after the CC tab renderer functions, before `// ==================== SETTINGS VIEW ====================`:

```js
// ==================== EMBEDDED CLAUDE CHAT ====================

var _chatWs = null;
var _chatOpen = false;
var _chatMessages = [];
var _chatStreaming = false;

function _chatToggle() {
  _chatOpen = !_chatOpen;
  var panel = document.getElementById('ccChatPanel');
  var fab = document.getElementById('ccChatFab');
  if (panel) panel.className = 'cc-chat' + (_chatOpen ? '' : ' hidden');
  if (fab) fab.className = 'cc-chat-fab' + (_chatOpen ? ' hidden' : '');
  if (_chatOpen && !_chatWs) _chatConnect();
}

function _chatConnect() {
  var proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  _chatWs = new WebSocket(proto + '//' + location.host + '/ws/chat');
  _chatWs.onmessage = function(ev) {
    var msg;
    try { msg = JSON.parse(ev.data); } catch { return; }
    if (msg.type === 'chunk') {
      if (_chatMessages.length > 0 && _chatMessages[_chatMessages.length - 1].role === 'typing') {
        _chatMessages[_chatMessages.length - 1].text += msg.text;
      } else {
        _chatMessages.push({ role: 'typing', text: msg.text });
      }
      _chatRenderMsgs();
    } else if (msg.type === 'done') {
      if (_chatMessages.length > 0 && _chatMessages[_chatMessages.length - 1].role === 'typing') {
        _chatMessages[_chatMessages.length - 1].role = 'assistant';
        _chatMessages[_chatMessages.length - 1].text = msg.text;
      }
      _chatStreaming = false;
      _chatRenderMsgs();
      var btn = document.getElementById('ccChatSend');
      if (btn) btn.disabled = false;
    } else if (msg.type === 'error') {
      _chatMessages.push({ role: 'error', text: msg.text });
      _chatStreaming = false;
      _chatRenderMsgs();
      var btn2 = document.getElementById('ccChatSend');
      if (btn2) btn2.disabled = false;
    }
  };
  _chatWs.onclose = function() { _chatWs = null; };
}

function _chatSend() {
  var input = document.getElementById('ccChatInput');
  if (!input || !input.value.trim()) return;
  var text = input.value.trim();
  input.value = '';
  _chatMessages.push({ role: 'user', text: text });
  _chatStreaming = true;
  _chatRenderMsgs();
  var btn = document.getElementById('ccChatSend');
  if (btn) btn.disabled = true;
  if (!_chatWs || _chatWs.readyState !== WebSocket.OPEN) _chatConnect();
  setTimeout(function() {
    if (_chatWs && _chatWs.readyState === WebSocket.OPEN) {
      _chatWs.send(JSON.stringify({ type: 'chat', text: text }));
    }
  }, 100);
}

function _chatRenderMsgs() {
  var container = document.getElementById('ccChatMsgs');
  if (!container) return;
  var html = '';
  _chatMessages.forEach(function(m) {
    var cls = m.role === 'user' ? 'user' : m.role === 'error' ? 'error' : m.role === 'typing' ? 'assistant typing' : 'assistant';
    html += '<div class="cc-chat-msg ' + cls + '">' + esc(m.text) + '</div>';
  });
  if (_chatStreaming && (_chatMessages.length === 0 || _chatMessages[_chatMessages.length - 1].role !== 'typing')) {
    html += '<div class="cc-chat-msg assistant typing">Thinking...</div>';
  }
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

function _chatKeydown(ev) {
  if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); _chatSend(); }
}
```

- [ ] **Step 3: Add chat HTML to the CC page render**

In `_ccRenderPage`, just before `el.innerHTML = html;`, add:

```js
  // Floating chat panel + FAB
  html += '<div id="ccChatPanel" class="cc-chat hidden">';
  html += '<div class="cc-chat-hdr"><h4>&#9889; Claude</h4><button class="cc-chat-close" onclick="_chatToggle()">&#10005;</button></div>';
  html += '<div class="cc-chat-msgs" id="ccChatMsgs"></div>';
  html += '<div class="cc-chat-input"><input id="ccChatInput" placeholder="Ask Claude anything..." onkeydown="_chatKeydown(event)"><button id="ccChatSend" onclick="_chatSend()">Send</button></div>';
  html += '</div>';
  html += '<button id="ccChatFab" class="cc-chat-fab" onclick="_chatToggle()" title="Chat with Claude">&#9889;</button>';
```

- [ ] **Step 4: Verify and commit**

Run: `cd dashboard-server && npm test`
Expected: All PASS.

```
git add nbi_project_dashboard.html
git commit -m "feat(cc): floating Claude chat panel (F13) — WebSocket client, streaming messages, dashboard context"
```

---

## Task 5: Integration + Visual Verification

Restart server, verify Money tab renders with real data, verify chat panel connects and streams responses.

**Files:** No changes — verification only.

### Steps

- [ ] **Step 1: Restart server**

```
pm2 restart nbi-dashboard || node dashboard-server/server.js
```

- [ ] **Step 2: Verify Money tab**

Navigate to CC → Money tab. Should show KPI tiles (revenue, burn, margins), revenue by client bars, cost breakdown, contracts list.

- [ ] **Step 3: Verify chat panel**

Click the lightning bolt FAB in bottom-right. Type "What should I focus on today?" and send. Should see streaming response from Claude with dashboard context.

- [ ] **Step 4: Run full test suite**

```
cd dashboard-server && npm run test:all
```

- [ ] **Step 5: Commit any fixes**

```
git add -A && git commit -m "fix(cc): Phase 2 integration fixes"
```

---

## Dependency Graph

```
Task 1 (Financial Pulse endpoint)
  └── Task 2 (Money tab frontend) — needs endpoint

Task 3 (WebSocket chat server)
  └── Task 4 (Chat panel frontend) — needs WebSocket

Task 5 (Integration) — after all above
```

Tasks 1-2 and Tasks 3-4 are independent pairs that can run in sequence within each pair.

---

## Verification Checklist

- [ ] Money tab shows: 6 KPI tiles, revenue by client bars, cost breakdown, contracts, expiring SOWs
- [ ] Money tab handles missing finance_data gracefully (shows helpful message)
- [ ] Chat FAB appears on all CC tabs (bottom-right corner)
- [ ] Chat panel opens/closes on FAB click
- [ ] Sending a message spawns Claude CLI and streams response
- [ ] Chat panel shows user messages right-aligned (blue) and assistant messages left-aligned (dark)
- [ ] Claude's system prompt includes live task counts, client data, AIOS scores
- [ ] WebSocket reconnects if connection drops
- [ ] All unit tests pass
- [ ] No console errors
