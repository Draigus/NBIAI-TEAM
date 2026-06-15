#!/usr/bin/env node
'use strict';
// shell-guard.js — PreToolUse hook that blocks Bash/PowerShell write primitives
// targeting governed harness paths (.claude/harness/config/, .claude/harness/lib/).
//
// Complements write-guard.js (which blocks Write/Edit tools) by closing the
// shell bypass: commands like `cp`, `>`, `Set-Content` could otherwise mutate
// governed files that the Write/Edit guard protects.
//
// Design: quote-aware parsing to avoid false positives from text arguments
// (e.g., codex exec prompts that discuss governed paths). Three phases:
//   1. Redirect (> or >>) outside quotes targeting a governed path
//   2. Per-segment analysis: write commands, wrappers, shell-exec, git, find
//   3. Inline code (node -e, python -c) with fs writes targeting governed paths
//
// Known limitations (unsolvable at static analysis layer):
//   - Variable expansion ($p holding a governed path)
//   - Symlinks (non-governed path resolving to governed via symlink)
//   - Backslash escape sequences in paths (.claude/harness/l\ib/evil.js)
//
// Governed paths: .claude/harness/config/  .claude/harness/lib/
// Non-governed harness paths (data/, tests/, proposals/) are allowed.

const fs = require('fs');

const GOVERNED_PATTERNS = [
  '.claude/harness/config/',
  '.claude/harness/lib/'
];

const WRITE_COMMANDS = new Set([
  'cp', 'mv', 'rm', 'tee', 'dd', 'install',
  'sed', 'perl', 'truncate', 'touch', 'ln',
  'tar', 'unzip', 'patch',
  'set-content', 'out-file', 'add-content',
  'copy-item', 'move-item', 'remove-item', 'new-item',
  'set-item', 'clear-content', 'rename-item',
  // PowerShell aliases and cmd.exe builtins
  'sc', 'ni', 'ri', 'del', 'copy', 'move',
]);

const WRAPPER_COMMANDS = new Set([
  'sudo', 'env', 'command', 'xargs',
]);

const SHELL_EXEC_COMMANDS = new Set([
  'bash', 'sh', 'zsh', 'dash', 'pwsh', 'powershell', 'cmd',
]);

const GIT_WRITE_SUBCOMMANDS = new Set([
  'checkout', 'restore', 'clean', 'reset',
]);

const FS_WRITE_PATTERNS = [
  // Dot-prefix matches both fs.X and require('fs').X after lowercasing
  '.writefilesync', '.writefile(', '.appendfilesync', '.appendfile(',
  '.copyfilesync', '.copyfile(', '.renamesync', '.rename(',
  '.unlinksync', '.unlink(', '.rmsync', '.rm(',
];

function canonicalizePath(rawPath) {
  const parts = rawPath.split('/');
  const resolved = [];
  for (const part of parts) {
    if (part === '..') {
      if (resolved.length > 0) resolved.pop();
    } else if (part !== '' && part !== '.') {
      resolved.push(part);
    }
  }
  return resolved.join('/');
}

function normalizeShellToken(token) {
  return canonicalizePath(
    token.replace(/\\/g, '/').replace(/['"]/g, '').toLowerCase()
  );
}

function isGovernedPath(token) {
  const norm = normalizeShellToken(token);
  for (const gov of GOVERNED_PATTERNS) {
    if (norm.startsWith(gov) || norm === gov.slice(0, -1)) return true;
  }
  const marker = '.claude/harness/';
  const idx = norm.indexOf(marker);
  if (idx === -1) return false;
  const sub = norm.slice(idx);
  for (const gov of GOVERNED_PATTERNS) {
    if (sub.startsWith(gov)) return true;
  }
  return false;
}

function hasRedirectToGovernedPath(command) {
  let inSingle = false, inDouble = false, escaped = false;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];

    if (escaped) { escaped = false; continue; }
    if (ch === '\\' && !inSingle) { escaped = true; continue; }
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }

    if (inSingle || inDouble) continue;

    if (ch === '>') {
      let j = i + 1;
      if (j < command.length && command[j] === '>') j++;
      while (j < command.length && command[j] === ' ') j++;

      let target = '';
      let tInSingle = false, tInDouble = false;
      while (j < command.length) {
        const tc = command[j];
        if (tc === "'" && !tInDouble) { tInSingle = !tInSingle; j++; continue; }
        if (tc === '"' && !tInSingle) { tInDouble = !tInDouble; j++; continue; }
        if (!tInSingle && !tInDouble && /[\s|;&)}<]/.test(tc)) break;
        target += tc;
        j++;
      }

      if (target && isGovernedPath(target)) return true;
      i = j - 1;
    }
  }
  return false;
}

function splitPipeSegments(command) {
  const segments = [];
  let current = '';
  let inSingle = false, inDouble = false, escaped = false;

  for (let i = 0; i < command.length; i++) {
    const ch = command[i];

    if (escaped) { current += ch; escaped = false; continue; }
    if (ch === '\\' && !inSingle) { current += ch; escaped = true; continue; }
    if (ch === "'" && !inDouble) { inSingle = !inSingle; current += ch; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; current += ch; continue; }

    if (!inSingle && !inDouble) {
      if (ch === '|') {
        if (i + 1 < command.length && command[i + 1] === '|') {
          segments.push(current);
          current = '';
          i++;
          continue;
        }
        segments.push(current);
        current = '';
        continue;
      }
      if (ch === '&' && i + 1 < command.length && command[i + 1] === '&') {
        segments.push(current);
        current = '';
        i++;
        continue;
      }
      if (ch === ';') {
        segments.push(current);
        current = '';
        continue;
      }
    }

    current += ch;
  }
  if (current.trim()) segments.push(current);
  return segments;
}

function getFirstWord(segment) {
  const trimmed = segment.trim();
  const match = trimmed.match(/^(\S+)/);
  return match ? match[1] : '';
}

function getSecondWord(segment) {
  const trimmed = segment.trim();
  const match = trimmed.match(/^\S+\s+(\S+)/);
  return match ? match[1] : '';
}

function resolveCommand(segment) {
  const words = segment.trim().split(/\s+/);
  const argTakingFlags = new Set(['-u', '-g', '-C', '-I', '-n', '-P', '-L', '-d', '-S']);
  let i = 0;
  while (i < words.length) {
    const w = words[i];
    if (!WRAPPER_COMMANDS.has(w)) return w;
    i++;
    while (i < words.length) {
      if (words[i].startsWith('-')) {
        const flag = words[i].slice(0, 2);
        if (argTakingFlags.has(flag) && words[i].length <= 2) i++;
        i++;
        continue;
      }
      if (/^\w+=/.test(words[i])) { i++; continue; }
      break;
    }
  }
  return '';
}

function findGitSubcommand(segment) {
  const words = segment.trim().split(/\s+/);
  const gitArgFlags = new Set(['-c', '-C', '--git-dir', '--work-tree', '--namespace']);
  for (let i = 1; i < words.length; i++) {
    const w = words[i];
    if (w.startsWith('-')) {
      const flag = w.startsWith('--') ? w.split('=')[0] : w.slice(0, 2);
      if (gitArgFlags.has(flag) && !w.includes('=') && w.length <= flag.length) i++;
      continue;
    }
    return w;
  }
  return '';
}

function segmentHasGovernedPath(segment) {
  const norm = segment.replace(/\\/g, '/').replace(/['"]/g, '').toLowerCase();
  const marker = '.claude/harness/';
  let idx = 0;
  while (idx < norm.length) {
    const pos = norm.indexOf(marker, idx);
    if (pos === -1) return false;

    let end = pos;
    while (end < norm.length && !/[\s`|;)}&]/.test(norm[end])) {
      end++;
    }
    const rawPath = norm.slice(pos, end);
    const canonical = canonicalizePath(rawPath);

    for (const gov of GOVERNED_PATTERNS) {
      if (canonical.startsWith(gov) || canonical === gov.slice(0, -1)) return true;
    }
    idx = pos + 1;
  }
  return false;
}

function segmentHasWriteKeyword(segment) {
  const stripped = segment.replace(/['"]/g, '').toLowerCase();
  for (const cmd of WRITE_COMMANDS) {
    const idx = stripped.indexOf(cmd);
    if (idx === -1) continue;
    const before = idx === 0 || /[\s(]/.test(stripped[idx - 1]);
    const after = idx + cmd.length >= stripped.length || /[\s);]/.test(stripped[idx + cmd.length]);
    if (before && after) return true;
  }
  if (/>{1,2}/.test(stripped)) return true;
  return false;
}

function block(reason) {
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'SHELL_WRITE_DENIED: ' + reason
  }));
  process.exit(0);
}

function checkRedirectsAndSegments(norm, toolName) {
  if (hasRedirectToGovernedPath(norm)) {
    block('shell redirect targeting governed harness path');
  }

  const segments = splitPipeSegments(norm);
  for (const seg of segments) {
    // Resolve through all wrapper layers (sudo, env, command, xargs)
    // to find the actual command being executed.
    const actualCmd = resolveCommand(seg);
    if (!actualCmd) continue;

    if (WRITE_COMMANDS.has(actualCmd) && segmentHasGovernedPath(seg)) {
      block('write command targeting governed harness path');
    }

    if (SHELL_EXEC_COMMANDS.has(actualCmd)) {
      const hasCFlag = /-[a-z]*c(?=\s|["']|$)/i.test(seg) || seg.includes('/c');
      if (hasCFlag && segmentHasGovernedPath(seg) && segmentHasWriteKeyword(seg)) {
        block('shell exec dispatching write to governed harness path');
      }
    }

    if (actualCmd === 'git') {
      const gitIdx = seg.indexOf('git');
      if (gitIdx !== -1) {
        const subcommand = findGitSubcommand(seg.slice(gitIdx));
        if (GIT_WRITE_SUBCOMMANDS.has(subcommand) && segmentHasGovernedPath(seg)) {
          block('git write subcommand targeting governed harness path');
        }
      }
    }

    if (actualCmd === 'find') {
      if ((seg.includes('-exec') || seg.includes('-delete')) && segmentHasGovernedPath(seg)) {
        block('find with -exec/-delete targeting governed harness path');
      }
    }

    if (actualCmd === 'node' && seg.includes('-e') && segmentHasGovernedPath(seg)) {
      for (const pat of FS_WRITE_PATTERNS) {
        if (seg.includes(pat)) {
          block('inline Node.js write targeting governed harness path');
        }
      }
    }

    if ((actualCmd === 'python' || actualCmd === 'python3') &&
        seg.includes('-c') && segmentHasGovernedPath(seg)) {
      if (seg.includes('open(') || seg.includes('.write(')) {
        block('inline Python write targeting governed harness path');
      }
    }
  }

  return segments;
}

function hasGovernedVariableAssignment(command) {
  const stripped = command.replace(/['"]/g, '');
  const re = /\b\w+=([\S]+)/g;
  let match;
  while ((match = re.exec(stripped)) !== null) {
    if (isGovernedPath(match[1])) return true;
  }
  return false;
}

function segmentHasWriteShape(seg) {
  const fw = getFirstWord(seg);
  if (WRITE_COMMANDS.has(fw)) return true;
  if (WRAPPER_COMMANDS.has(fw) && WRITE_COMMANDS.has(getSecondWord(seg))) return true;
  if (SHELL_EXEC_COMMANDS.has(fw)) return true;
  // Redirect with variable target
  const stripped = seg.replace(/['"]/g, '');
  if (/>{1,2}\s*\$/.test(stripped)) return true;
  return false;
}

function main() {
  let stdin = '';
  try { stdin = fs.readFileSync(0, 'utf8'); } catch { process.exit(0); }

  let hookData = {};
  try { hookData = JSON.parse(stdin); } catch { process.exit(0); }

  const command = (hookData.tool_input || {}).command || '';
  if (!command) process.exit(0);

  const toolName = hookData.tool_name || 'Bash';

  // Pass 1: Windows-path interpretation (\ → /)
  const normWin = command.replace(/\\/g, '/').toLowerCase();
  const segments = checkRedirectsAndSegments(normWin, toolName);

  // Pass 2: bash-escape interpretation (\X → X) — catches .claude/harness/l\ib bypass
  if (command.includes('\\')) {
    const normBash = command.replace(/\\(.)/g, '$1').toLowerCase();
    if (normBash !== normWin) {
      checkRedirectsAndSegments(normBash, toolName);
    }
  }

  // Pass 3: variable assignment — governed path in VAR=value + write command in same command
  if (hasGovernedVariableAssignment(normWin)) {
    for (const seg of segments) {
      if (segmentHasWriteShape(seg)) {
        block('governed path in variable assignment with write command present');
      }
    }
  }

  process.exit(0);
}

try { main(); } catch (e) {
  process.stderr.write('shell-guard: unexpected error: ' + (e.message || e) + '\n');
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'SHELL_WRITE_DENIED: unexpected error in shell-guard — failing closed'
  }));
  process.exit(0);
}
