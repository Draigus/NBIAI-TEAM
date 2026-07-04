'use strict';

const { spawn } = require('child_process');

const BANNED_PREFIXES = ['claude-opus-4-7', 'claude-opus-4-8'];
const DEFAULT_TIMEOUT_MS = 120000;

function assertModelAllowed(model) {
  if (!model) throw new Error('model is required');
  const m = String(model).toLowerCase();
  if (m === 'opus') throw new Error("bare 'opus' alias is banned by policy");
  for (const p of BANNED_PREFIXES) {
    if (m.startsWith(p)) throw new Error(`model '${model}' is banned by policy`);
  }
  if (!/^[a-z0-9.\-\[\]]+$/i.test(model)) {
    throw new Error(`model '${model}' contains disallowed characters`);
  }
}

/**
 * Run headless Claude with the prompt on stdin.
 * Returns { text, durationMs }. Rejects on banned model, timeout, or non-zero exit.
 * (async so the banned-model policy throw surfaces as a rejection, not a sync throw)
 */
async function dispatch({ prompt, model, cwd, timeoutMs = DEFAULT_TIMEOUT_MS, extraArgs = [] }) {
  assertModelAllowed(model);
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const args = ['-p', '--model', model, '--permission-mode', 'bypassPermissions', ...extraArgs];
    // shell: true so Windows resolves the `claude` npm shim (claude.cmd)
    const child = spawn('claude', args, { cwd, shell: true, windowsHide: true });

    let out = '';
    let err = '';
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      reject(new Error(`claude dispatch timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        return reject(new Error(`claude dispatch exit ${code}: ${err.slice(0, 500)}`));
      }
      resolve({ text: out.trim(), durationMs: Date.now() - started });
    });

    child.stdin.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

module.exports = { dispatch, assertModelAllowed };
