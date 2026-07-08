'use strict';

// NOT destructured -- see the matching note in claude-dispatch.js (test
// interception on the shared child_process module object).
const child_process = require('child_process');
const { assertModelAllowed } = require('./claude-dispatch');

const DEFAULT_TURN_TIMEOUT_MS = 60000;
const DEFAULT_MAX_EXCHANGES = 20;

/**
 * A long-lived `claude -p` process in stream-json mode. One process serves many
 * turns, so per-turn latency is model time-to-first-token, not CLI cold start
 * (measured 2026-07-08: cold ~10s, warm ~2-4s on claude-opus-4-6).
 *
 * - Lazy spawn on first ask(); respawn on next ask() after crash or recycle.
 * - Turns are serialised: one in-flight message at a time.
 * - The session is recycled after maxExchanges turns so accumulated context
 *   cannot grow without bound; the system prompt is re-sent on the first turn
 *   of each session.
 * - Spawned with --permission-mode default and no tool grants: the voice brain
 *   converses, it does not act. Action execution needs a separate approved path.
 */
function createClaudeWorker({
  model,
  cwd,
  systemPrompt = '',
  maxExchanges = DEFAULT_MAX_EXCHANGES,
  turnTimeoutMs = DEFAULT_TURN_TIMEOUT_MS,
  log = () => {},
}) {
  assertModelAllowed(model);

  let child = null;
  let buf = '';
  let exchanges = 0;
  let sessionFresh = true;
  let inFlight = null; // { resolve, reject, timer, startedAt }
  const queue = [];

  function spawnChild() {
    const args = [
      '-p',
      '--model', model,
      '--permission-mode', 'default',
      '--input-format', 'stream-json',
      '--output-format', 'stream-json',
      '--verbose',
    ];
    // shell: true so Windows resolves the `claude` npm shim (claude.cmd)
    child = child_process.spawn('claude', args, { cwd, shell: true, windowsHide: true });
    buf = '';
    exchanges = 0;
    sessionFresh = true;

    child.stdout.on('data', onStdout);
    child.on('close', onClose);
    log('info', 'ClaudeWorker', 'Worker spawned', { model, pid: child.pid });
  }

  function onStdout(data) {
    buf += data.toString();
    let idx;
    while ((idx = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line) continue;
      let evt;
      try { evt = JSON.parse(line); } catch { continue; }
      if (evt.type === 'result') onResult(evt);
    }
  }

  function onResult(evt) {
    if (!inFlight) return;
    const turn = inFlight;
    inFlight = null;
    clearTimeout(turn.timer);
    exchanges++;

    if (evt.is_error) {
      turn.reject(new Error(`claude worker turn failed: ${evt.subtype || 'unknown error'}`));
    } else {
      turn.resolve({
        text: (evt.result || '').trim(),
        durationMs: Date.now() - turn.startedAt,
      });
    }

    if (exchanges >= maxExchanges) {
      log('info', 'ClaudeWorker', 'Recycling session at exchange limit', { exchanges });
      retire();
    }
    pump();
  }

  function onClose(code) {
    const wasChild = child;
    child = null;
    if (inFlight) {
      const turn = inFlight;
      inFlight = null;
      clearTimeout(turn.timer);
      turn.reject(new Error(`claude worker exited (code ${code}) mid-turn`));
    }
    if (wasChild) {
      log('warn', 'ClaudeWorker', 'Worker process closed', { code });
    }
    pump();
  }

  // Graceful retirement: close stdin so the CLI exits when done; next ask respawns.
  function retire() {
    if (!child) return;
    const retiring = child;
    child = null;
    try { retiring.stdin.end(); } catch { /* already gone */ }
    retiring.removeListener('close', onClose);
  }

  function killTree(proc) {
    if (process.platform === 'win32' && proc.pid) {
      child_process.spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { windowsHide: true });
    } else {
      proc.kill();
    }
  }

  function writeTurn(turn) {
    inFlight = turn;
    turn.startedAt = Date.now();
    turn.timer = setTimeout(() => {
      if (inFlight !== turn) return;
      inFlight = null;
      const dead = child;
      child = null;
      if (dead) {
        dead.removeListener('close', onClose);
        killTree(dead);
      }
      turn.reject(new Error(`claude worker turn timed out after ${turnTimeoutMs}ms`));
      pump();
    }, turnTimeoutMs);

    let text = turn.text;
    if (sessionFresh) {
      const preamble = [systemPrompt, turn.freshContext].filter(Boolean).join('\n\n');
      if (preamble) text = `${preamble}\n\n${text}`;
    }
    sessionFresh = false;

    child.stdin.write(JSON.stringify({
      type: 'user',
      message: { role: 'user', content: [{ type: 'text', text }] },
    }) + '\n');
  }

  function pump() {
    if (inFlight || queue.length === 0) return;
    if (!child) spawnChild();
    writeTurn(queue.shift());
  }

  // freshContext: conversation restore block, used only when this turn opens a
  // new session (spawn or post-recycle) -- an ongoing session already has it.
  function ask(text, { freshContext = '' } = {}) {
    return new Promise((resolve, reject) => {
      queue.push({ text, freshContext, resolve, reject });
      pump();
    });
  }

  function stop() {
    queue.length = 0;
    if (inFlight) {
      clearTimeout(inFlight.timer);
      inFlight.reject(new Error('claude worker stopped'));
      inFlight = null;
    }
    if (child) {
      const dead = child;
      child = null;
      dead.removeListener('close', onClose);
      killTree(dead);
    }
  }

  function status() {
    return {
      running: !!child,
      exchanges,
      queued: queue.length,
      busy: !!inFlight,
    };
  }

  return { ask, stop, status };
}

module.exports = { createClaudeWorker };
