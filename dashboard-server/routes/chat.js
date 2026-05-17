'use strict';

const { spawn } = require('child_process');
const { readFileSync, writeFileSync, unlinkSync, readdirSync } = require('fs');
const { join } = require('path');
const os = require('os');
const WebSocket = require('ws');

// Load NBI Brain files once at startup — they rarely change
function loadBrainContext(repoRoot) {
  const parts = [];
  try {
    const brain = readFileSync(join(repoRoot, 'NBI_Brain.md'), 'utf8');
    parts.push('# NBI Business Context (from NBI_Brain.md)\n\n' + brain);
  } catch {}
  try {
    const brainDir = join(repoRoot, 'brain');
    const files = readdirSync(brainDir).filter(f => f.endsWith('.md')).sort();
    for (const f of files) {
      try {
        const content = readFileSync(join(brainDir, f), 'utf8');
        const name = f.replace('.md', '').replace(/-/g, ' ').replace(/_/g, ' ');
        parts.push('## Brain Module: ' + name + '\n\n' + content);
      } catch {}
    }
  } catch {}
  return parts.join('\n\n---\n\n');
}

module.exports = function attachChat(server, ctx) {
  const { pool, log } = ctx;
  const wss = new WebSocket.Server({ server, path: '/ws/chat' });

  // Resolve repo root (one level up from dashboard-server/)
  const repoRoot = join(__dirname, '..', '..');
  const brainContext = loadBrainContext(repoRoot);
  log('info', 'Chat', 'Brain context loaded', { chars: brainContext.length });

  wss.on('connection', (ws) => {
    let claudeProc = null;
    let buffer = '';

    ws.on('message', async (raw) => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }

      if (msg.type === 'chat') {
        if (claudeProc && !claudeProc.killed) {
          claudeProc.kill();
        }

        // Build system prompt: identity + brain + live database
        let systemPrompt = 'You are PlaySage, Glen Pryer\'s AI assistant embedded in the WorkSage dashboard (NBI Hub) at worksage.nbi-consulting.com.\n';
        systemPrompt += 'You have COMPLETE knowledge of the NBI business (loaded from the NBI Brain below) and LIVE data from the WorkSage PostgreSQL database (queried at this moment).\n';
        systemPrompt += 'Never claim you cannot access WorkSage, the dashboard, tasks, clients, or business data — you already have it all.\n';
        systemPrompt += 'Answer using this data. Be concise and actionable. British English only.\n\n';

        // Append NBI Brain context
        systemPrompt += '# PART 1: NBI BUSINESS KNOWLEDGE\n\n' + brainContext + '\n\n';

        // Append live database context
        systemPrompt += '# PART 2: LIVE WORKSAGE DATABASE (queried now)\n\n';
        try {
          const contextParts = [];

          const [
            snapRes, statsRes, overdueRes, blockedRes, inProgressRes,
            clientRes, contactRes, bugRes, projectRes, milestoneRes,
            hiringRes, expenseRes, timeRes, sowRes, noteRes, calRes
          ] = await Promise.all([
            pool.query('SELECT data FROM cc_snapshots ORDER BY snapshot_date DESC LIMIT 1'),
            pool.query("SELECT COUNT(*) FILTER (WHERE status NOT IN ('Done','Cancelled')) as open, COUNT(*) FILTER (WHERE status = 'Blocked') as blocked, COUNT(*) FILTER (WHERE due_date IS NOT NULL AND due_date != '' AND due_date::date < CURRENT_DATE AND status NOT IN ('Done','Cancelled')) as overdue FROM tasks WHERE item_type IN ('story','task')"),
            pool.query("SELECT t.title, t.status, t.due_date, t.item_type, t.assignees, c.name as client_name, p.title as project_name FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN tasks p ON t.parent_id = p.id WHERE t.item_type IN ('story','task') AND t.status NOT IN ('Done','Cancelled') AND t.due_date IS NOT NULL AND t.due_date != '' AND t.due_date::date < CURRENT_DATE ORDER BY t.due_date ASC LIMIT 50"),
            pool.query("SELECT t.title, t.item_type, t.assignees, c.name as client_name FROM tasks t LEFT JOIN clients c ON t.client_id = c.id WHERE t.item_type IN ('story','task') AND t.status = 'Blocked' LIMIT 20"),
            pool.query("SELECT t.title, t.status, t.item_type, t.assignees, t.due_date, c.name as client_name, p.title as project_name FROM tasks t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN tasks p ON t.parent_id = p.id WHERE t.item_type IN ('story','task') AND t.status IN ('In progress','In review') ORDER BY t.updated_at DESC LIMIT 30"),
            pool.query("SELECT c.name, c.description, c.nbi_relationship, c.website, COUNT(t.id) FILTER (WHERE t.status NOT IN ('Done','Cancelled')) as active, COUNT(t.id) FILTER (WHERE t.status = 'Done') as done FROM clients c LEFT JOIN tasks t ON t.client_id = c.id AND t.item_type IN ('story','task') GROUP BY c.id ORDER BY active DESC"),
            pool.query("SELECT co.name, co.role, co.notes, c.name as client_name FROM contacts co JOIN clients c ON co.client_id = c.id ORDER BY c.name, co.sort_order").catch(() => ({ rows: [] })),
            pool.query("SELECT title, status, priority, description, created_at FROM bug_reports WHERE status NOT IN ('closed','resolved') ORDER BY CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, created_at DESC LIMIT 20").catch(() => ({ rows: [] })),
            pool.query("SELECT t.title, t.status, t.description, c.name as client_name FROM tasks t LEFT JOIN clients c ON t.client_id = c.id WHERE t.item_type = 'project' AND t.status NOT IN ('Done','Cancelled') ORDER BY t.updated_at DESC LIMIT 20").catch(() => ({ rows: [] })),
            pool.query("SELECT name, target_date, status, description FROM milestones WHERE status NOT IN ('completed','cancelled') ORDER BY target_date ASC LIMIT 15").catch(() => ({ rows: [] })),
            pool.query("SELECT title, status, department, description FROM hiring_positions WHERE status NOT IN ('closed','filled','cancelled') ORDER BY created_at DESC LIMIT 10").catch(() => ({ rows: [] })),
            pool.query("SELECT description, amount, currency, category, status, submitted_by, expense_date FROM expense_reports WHERE status NOT IN ('paid','rejected') ORDER BY expense_date DESC LIMIT 15").catch(() => ({ rows: [] })),
            pool.query("SELECT te.hours, te.description, te.date, te.user_name, t.title as task_title FROM time_entries te LEFT JOIN tasks t ON te.task_id = t.id ORDER BY te.date DESC LIMIT 20").catch(() => ({ rows: [] })),
            pool.query("SELECT s.title, s.status, s.total_value, s.currency, c.name as client_name FROM sows s LEFT JOIN clients c ON s.client_id = c.id ORDER BY s.created_at DESC LIMIT 10").catch(() => ({ rows: [] })),
            pool.query("SELECT cn.title, cn.content, cn.source, cn.meeting_date, c.name as client_name FROM client_notes cn JOIN clients c ON cn.client_id = c.id ORDER BY cn.meeting_date DESC NULLS LAST LIMIT 15").catch(() => ({ rows: [] })),
            pool.query("SELECT title, start_date, end_date, event_type, description FROM calendar_events WHERE start_date >= CURRENT_DATE ORDER BY start_date ASC LIMIT 10").catch(() => ({ rows: [] })),
          ]);

          // AIOS Health
          if (snapRes.rows.length > 0 && snapRes.rows[0].data?.four_cs) {
            const fc = snapRes.rows[0].data.four_cs;
            contextParts.push('## AIOS Health\nContext ' + (fc.context?.score || 0) + '/10, Connections ' + (fc.connections?.score || 0) + '/10, Capabilities ' + (fc.capabilities?.score || 0) + '/10, Cadence ' + (fc.cadence?.score || 0) + '/10');
          }

          // Task summary
          if (statsRes.rows[0]) {
            contextParts.push('## Task Summary\n' + statsRes.rows[0].open + ' open, ' + statsRes.rows[0].overdue + ' overdue, ' + statsRes.rows[0].blocked + ' blocked');
          }

          // Overdue tasks
          if (overdueRes.rows.length > 0) {
            contextParts.push('## Overdue Tasks\n' + overdueRes.rows.map(r =>
              '- ' + r.title + ' (' + r.item_type + ', due ' + r.due_date + ', status: ' + r.status + (r.assignees?.length ? ', assigned: ' + r.assignees.join('/') : '') + (r.client_name ? ', client: ' + r.client_name : '') + (r.project_name ? ', project: ' + r.project_name : '') + ')'
            ).join('\n'));
          }

          // Blocked tasks
          if (blockedRes.rows.length > 0) {
            contextParts.push('## Blocked Tasks\n' + blockedRes.rows.map(r =>
              '- ' + r.title + ' (' + r.item_type + (r.assignees?.length ? ', assigned: ' + r.assignees.join('/') : '') + (r.client_name ? ', client: ' + r.client_name : '') + ')'
            ).join('\n'));
          }

          // In-progress work
          if (inProgressRes.rows.length > 0) {
            contextParts.push('## In Progress / In Review\n' + inProgressRes.rows.map(r =>
              '- ' + r.title + ' (' + r.item_type + ', ' + r.status + (r.assignees?.length ? ', assigned: ' + r.assignees.join('/') : '') + (r.due_date ? ', due ' + r.due_date : '') + (r.client_name ? ', client: ' + r.client_name : '') + ')'
            ).join('\n'));
          }

          // Clients
          if (clientRes.rows.length > 0) {
            contextParts.push('## Clients\n' + clientRes.rows.map(c =>
              '- ' + c.name + ': ' + c.active + ' active, ' + c.done + ' done' + (c.nbi_relationship ? ' (' + c.nbi_relationship + ')' : '') + (c.description ? ' — ' + c.description.slice(0, 100) : '')
            ).join('\n'));
          }

          // Contacts
          if (contactRes.rows.length > 0) {
            contextParts.push('## Contacts\n' + contactRes.rows.map(r =>
              '- ' + r.name + (r.role ? ' (' + r.role + ')' : '') + ' at ' + r.client_name + (r.notes ? ' — ' + r.notes.slice(0, 80) : '')
            ).join('\n'));
          }

          // Active projects
          if (projectRes.rows.length > 0) {
            contextParts.push('## Active Projects\n' + projectRes.rows.map(r =>
              '- ' + r.title + ' — ' + r.status + (r.client_name ? ' (' + r.client_name + ')' : '') + (r.description ? ' — ' + r.description.slice(0, 80) : '')
            ).join('\n'));
          }

          // SoWs
          if (sowRes.rows.length > 0) {
            contextParts.push('## Statements of Work\n' + sowRes.rows.map(r =>
              '- ' + r.title + ' — ' + r.status + (r.client_name ? ' (' + r.client_name + ')' : '') + (r.total_value ? ', value: ' + (r.currency || 'GBP') + ' ' + r.total_value : '')
            ).join('\n'));
          }

          // Open bugs
          if (bugRes.rows.length > 0) {
            contextParts.push('## Open Bugs\n' + bugRes.rows.map(r =>
              '- [' + (r.priority || 'unset') + '] ' + r.title + ' (' + r.status + ')' + (r.description ? ' — ' + r.description.slice(0, 80) : '')
            ).join('\n'));
          }

          // Milestones
          if (milestoneRes.rows.length > 0) {
            contextParts.push('## Milestones\n' + milestoneRes.rows.map(r =>
              '- ' + r.name + (r.target_date ? ' — due ' + r.target_date : '') + ' (' + r.status + ')' + (r.description ? ' — ' + r.description.slice(0, 80) : '')
            ).join('\n'));
          }

          // Hiring
          if (hiringRes.rows.length > 0) {
            contextParts.push('## Open Hiring\n' + hiringRes.rows.map(r =>
              '- ' + r.title + ' (' + r.status + (r.department ? ', ' + r.department : '') + ')' + (r.description ? ' — ' + r.description.slice(0, 80) : '')
            ).join('\n'));
          }

          // Pending expenses
          if (expenseRes.rows.length > 0) {
            contextParts.push('## Pending Expenses\n' + expenseRes.rows.map(r =>
              '- ' + (r.description || 'No description') + ': ' + (r.currency || 'GBP') + ' ' + r.amount + ' (' + r.status + ', ' + r.category + ', by ' + r.submitted_by + ')'
            ).join('\n'));
          }

          // Recent time entries
          if (timeRes.rows.length > 0) {
            contextParts.push('## Recent Time Entries\n' + timeRes.rows.map(r =>
              '- ' + r.date + ': ' + r.hours + 'h by ' + (r.user_name || '?') + ' on ' + (r.task_title || 'unknown') + (r.description ? ' — ' + r.description : '')
            ).join('\n'));
          }

          // Recent client notes/meetings
          if (noteRes.rows.length > 0) {
            contextParts.push('## Recent Client Notes\n' + noteRes.rows.map(r =>
              '- ' + (r.meeting_date ? r.meeting_date.toISOString().slice(0, 10) + ': ' : '') + r.title + ' (' + r.client_name + ', ' + r.source + ')' + (r.content ? ' — ' + r.content.slice(0, 100) : '')
            ).join('\n'));
          }

          // Upcoming calendar events
          if (calRes.rows.length > 0) {
            contextParts.push('## Upcoming Calendar Events\n' + calRes.rows.map(r =>
              '- ' + (r.start_date ? r.start_date.toISOString().slice(0, 10) : '?') + ': ' + r.title + (r.event_type ? ' (' + r.event_type + ')' : '') + (r.description ? ' — ' + r.description.slice(0, 80) : '')
            ).join('\n'));
          }

          if (contextParts.length > 0) {
            systemPrompt += contextParts.join('\n\n');
          }
        } catch (e) {
          log('warn', 'Chat', 'Failed to build context', { error: e.message });
        }

        // Write system prompt to temp file to avoid Windows command line length limit
        const promptFile = join(os.tmpdir(), 'playsage-prompt-' + Date.now() + '.txt');
        writeFileSync(promptFile, systemPrompt, 'utf8');
        log('info', 'Chat', 'Prompt file written', { chars: systemPrompt.length, file: promptFile });

        const args = [
          '-p',
          '--verbose',
          '--output-format', 'stream-json',
          '--include-partial-messages',
          '--max-turns', '1',
          '--model', 'opus',
          '--system-prompt-file', promptFile,
          '--no-session-persistence',
          '--disable-slash-commands',
          '--setting-sources', 'local',
        ];

        claudeProc = spawn('claude', args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          shell: true,
          cwd: os.tmpdir(),
        });

        let sentLength = 0;

        claudeProc.stdout.on('data', (chunk) => {
          const lines = (buffer + chunk.toString()).split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'assistant' && parsed.message?.content) {
                let fullText = '';
                for (const block of parsed.message.content) {
                  if (block.type === 'text') fullText += block.text;
                }
                if (fullText.length > sentLength) {
                  const delta = fullText.slice(sentLength);
                  sentLength = fullText.length;
                  ws.send(JSON.stringify({ type: 'chunk', text: delta }));
                }
              } else if (parsed.type === 'result') {
                ws.send(JSON.stringify({
                  type: 'done',
                  text: parsed.result || '',
                  session_id: parsed.session_id,
                  cost_usd: parsed.total_cost_usd,
                  duration_ms: parsed.duration_ms,
                }));
              }
            } catch {}
          }
        });

        let stderrBuf = '';
        claudeProc.stderr.on('data', (chunk) => {
          stderrBuf += chunk.toString();
          const errText = chunk.toString().trim();
          if (errText) {
            log('warn', 'Chat', 'Claude stderr', { text: errText.slice(0, 500) });
          }
        });

        claudeProc.on('error', (err) => {
          log('error', 'Chat', 'Claude spawn error', { message: err.message, code: err.code });
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', text: 'Failed to start Claude: ' + err.message }));
          }
        });

        claudeProc.on('close', (code) => {
          log('info', 'Chat', 'Claude process closed', { code, stderr: stderrBuf.slice(0, 500) });
          try { unlinkSync(promptFile); } catch {}
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
