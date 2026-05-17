'use strict';

const { spawn } = require('child_process');
const WebSocket = require('ws');

module.exports = function attachChat(server, ctx) {
  const { pool, log } = ctx;
  const wss = new WebSocket.Server({ server, path: '/ws/chat' });

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

        // Build system prompt with live dashboard context
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
