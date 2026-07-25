#!/usr/bin/env node
'use strict';
// command-detector.js -- Parses shell commands to detect verification evidence
// types and gate targets. Used by:
//   - PostToolUse hooks: record evidence from test/curl commands
//   - PreToolUse hooks: detect gate targets (commit, push, pm2, pr, bugstatus)
//
// Pure functions, no side effects. All detection is quote-aware and ANCHORED:
// after stripping subshell/brace/substitution openers, env assignments
// (quoted values included -- stripping runs on the masked string), and
// command/sudo/time/nohup/nice/xargs wrappers, the gate pattern must match at
// position 0 of the (pipe-)sub-segment. This ties detection to the command
// that actually executes: `grep git push file`, `git status # git commit`,
// and `pm2 list pm2 restart x` all emit nothing.
//
// Residual limitations (static analysis boundary; runtime enforcement is
// SP6 rho-hardening territory):
//   - Value-taking wrapper flags before the command-string flag
//     (powershell -ExecutionPolicy Bypass -Command "git commit")
//   - Quoted command names ("git" push), backslash escapes, variable
//     indirection ($GIT commit)
//   - Git aliases (git ci) -- resolving them needs git config at detection
//     time; hook-mediated commands use canonical subcommands
//   - Commands inside PowerShell script blocks (ForEach-Object { git ... })

const path = require('path');
const R = require('./resolve');

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Strip quoted regions from a string, replacing them with whitespace of
 * equal length. This lets downstream regex/indexOf work without matching
 * content inside string literals.
 */
function maskQuoted(str) {
  const chars = str.split('');
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === '\\' && (inSingle || inDouble)) {
      // skip escaped char inside quotes
      if (i + 1 < chars.length) {
        chars[i] = ' ';
        chars[i + 1] = ' ';
        i++;
      }
      continue;
    }
    if (c === "'" && !inDouble) {
      inSingle = !inSingle;
      chars[i] = ' ';
      continue;
    }
    if (c === '"' && !inSingle) {
      inDouble = !inDouble;
      chars[i] = ' ';
      continue;
    }
    if (inSingle || inDouble) {
      chars[i] = ' ';
    }
  }
  return chars.join('');
}

/**
 * Returns true if the segment is an echo/printf wrapper (the real command
 * is just printing text, not executing).
 */
function isEchoSegment(segment) {
  const trimmed = segment.trim();
  return /^(echo|printf)\s/i.test(trimmed);
}

/**
 * Returns true if the match position falls inside a comment (# prefix)
 * in the masked string.
 */
function isInComment(masked, matchIndex) {
  // Walk backwards from matchIndex to find start of line or start of string
  let i = matchIndex;
  while (i > 0 && masked[i - 1] !== '\n') {
    i--;
  }
  const linePrefix = masked.slice(i, matchIndex);
  return linePrefix.includes('#');
}

// Prefix stripping for anchored matching. Operates on the MASKED string so
// quoted env-assignment values (FOO="bar baz") collapse to spaces and cannot
// derail the walk. Strips subshell/brace/backtick openers and `$(` command
// substitution as a unit -- a bare `$` is NOT stripped, so variable
// indirection ($GIT push) stays undetected per the documented residuals
// rather than being half-matched as canonical git. `$((` is arithmetic
// expansion, not command substitution, and is not stripped.
const ANCHOR_STRIP_RE = /^(?:[\s({`]|\$\((?!\())+/;
const CMD_PREFIX_RE = /^(?:\w+=\S*\s+)*(?:(?:command|sudo|time|nohup|nice|xargs)\s+)*/i;

function stripCommandPrefix(maskedStr) {
  let s = maskedStr.replace(ANCHOR_STRIP_RE, '');
  const pm = s.match(CMD_PREFIX_RE);
  if (pm) s = s.slice(pm[0].length);
  return s;
}

/**
 * Split a segment at unquoted pipe operators (`|` and bash's `|&`).
 * parseCommand handles && || ; -- this handles pipelines so each stage
 * anchors independently (`echo y | git commit` must still detect the
 * commit, `cat x | grep git commit` must not).
 */
function splitPipes(segment) {
  const masked = maskQuoted(segment);
  const parts = [];
  let start = 0;
  for (let i = 0; i < masked.length; i++) {
    if (masked[i] === '|') {
      parts.push(segment.slice(start, i).trim());
      // |& pipes stderr too -- consume the & so the next stage anchors clean
      start = masked[i + 1] === '&' ? i + 2 : i + 1;
      if (masked[i + 1] === '&') i++;
    }
  }
  const last = segment.slice(start).trim();
  if (last) parts.push(last);
  return parts.filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════
// parseCommand
// ═══════════════════════════════════════════════════════════════════

/**
 * Mask heredoc bodies (and their terminator lines) with spaces in the
 * quote-masked copy. Without this, operator-looking text inside a heredoc
 * body (`cat <<EOF\n&& npm test\nEOF`) is treated as a real shell segment
 * and can mint false gates or false evidence. The introducer must itself be
 * unquoted (checked against the quote-masked copy); the delimiter may be
 * quoted (<<'EOF'), which only disables expansion, not the heredoc.
 * Body newlines are preserved so segment offsets stay aligned.
 */
function maskHeredocBodies(rawCommand, quoteMasked) {
  let out = quoteMasked;

  // Phase 1: collect ALL unquoted introducers up front. Advancing a single
  // regex cursor past each body would skip a second introducer on the same
  // command line (cat <<A <<B), leaving body B unmasked.
  const intro = /<<-?[ \t]*(['"]?)([A-Za-z_]\w*)\1/g;
  const introducers = [];
  let m;
  while ((m = intro.exec(rawCommand)) !== null) {
    if (quoteMasked[m.index] !== '<') continue; // introducer inside quotes
    introducers.push({ index: m.index, end: m.index + m[0].length, delim: m[2] });
  }

  // Phase 2: consume bodies in shell order. Each body starts after the
  // newline that ends its introducer's command line, or after the previous
  // body's terminator when several introducers share a line. An
  // "introducer" that falls inside an already-masked body is data.
  const maskedRanges = [];
  let bodyCursor = 0;
  for (const h of introducers) {
    let insideBody = false;
    for (const r of maskedRanges) {
      if (h.index >= r[0] && h.index < r[1]) { insideBody = true; break; }
    }
    if (insideBody) continue;

    const nl = rawCommand.indexOf('\n', h.end);
    if (nl === -1) break; // no body present in this string
    let bodyStart = nl + 1;
    if (bodyCursor > bodyStart) bodyStart = bodyCursor;

    let bodyEnd = rawCommand.length;
    let lineStart = bodyStart;
    while (lineStart <= rawCommand.length) {
      let lineEnd = rawCommand.indexOf('\n', lineStart);
      if (lineEnd === -1) lineEnd = rawCommand.length;
      if (rawCommand.slice(lineStart, lineEnd).trim() === h.delim) {
        bodyEnd = lineEnd;
        break;
      }
      lineStart = lineEnd + 1;
    }

    out = out.slice(0, bodyStart)
      + out.slice(bodyStart, bodyEnd).replace(/[^\n]/g, ' ')
      + out.slice(bodyEnd);
    maskedRanges.push([bodyStart, bodyEnd]);
    bodyCursor = bodyEnd + 1;
  }
  return out;
}

/**
 * Split a compound shell command at combinators (&&, ||, ;) and newlines
 * into segments. Does not split inside quoted strings or heredoc bodies.
 * Newlines separate commands in shell, so multiline input like
 * `git status\ngit push` must yield two segments -- anchored matching would
 * otherwise miss the second command entirely.
 *
 * @param {string} rawCommand
 * @returns {string[]} Array of trimmed segments
 */
function parseCommand(rawCommand) {
  if (!rawCommand || typeof rawCommand !== 'string') return [];

  const masked = maskHeredocBodies(rawCommand, maskQuoted(rawCommand));
  const bounds = [];
  let start = 0;

  for (let i = 0; i < masked.length; i++) {
    // Check for && or ||
    if (i + 1 < masked.length) {
      const pair = masked[i] + masked[i + 1];
      if (pair === '&&' || pair === '||') {
        bounds.push([start, i]);
        start = i + 2;
        i++; // skip second char
        continue;
      }
    }
    // Check for ; and newline separators
    if (masked[i] === ';' || masked[i] === '\n') {
      bounds.push([start, i]);
      start = i + 1;
    }
  }
  bounds.push([start, rawCommand.length]);

  // A slice whose MASKED form is blank carries no executable text -- it is
  // quoted content or a heredoc body line. Drop it; slicing the raw string
  // would resurrect heredoc body text as a fake command.
  const segments = [];
  for (const b of bounds) {
    if (!masked.slice(b[0], b[1]).trim()) continue;
    const seg = rawCommand.slice(b[0], b[1]).trim();
    if (seg) segments.push(seg);
  }
  return segments;
}

// ═══════════════════════════════════════════════════════════════════
// resolveWorkingDirectory
// ═══════════════════════════════════════════════════════════════════

/**
 * Detect cd prefixes in a command and return the resolved working directory.
 * Handles: `cd some/dir && rest` and plain `cd some/dir`.
 *
 * @param {string} rawCommand
 * @param {string} defaultCwd - Fallback if no cd prefix found
 * @returns {string} Resolved working directory
 */
function resolveWorkingDirectory(rawCommand, defaultCwd) {
  if (!rawCommand || typeof rawCommand !== 'string') return defaultCwd || R.PROJECT_DIR;

  const segments = parseCommand(rawCommand);
  const cwd = defaultCwd || R.PROJECT_DIR;

  // Walk segments in order; each cd changes the effective cwd
  let resolved = cwd;
  for (const seg of segments) {
    const cdMatch = seg.match(/^(?:cd|chdir|sl|set-location|pushd)\s+(?:-path\s+)?(.+)$/i);
    if (cdMatch) {
      const target = cdMatch[1].replace(/["']/g, '').trim();
      resolved = path.resolve(resolved, target);
    }
  }

  // If no cd was found, return the original cwd
  return resolved;
}

// ═══════════════════════════════════════════════════════════════════
// detectEvidenceType
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if a resolved working directory is the dashboard-server directory
 * (or a subdirectory of it).
 */
function isDashboardServerCwd(cwd) {
  if (!cwd) return false;
  const norm = cwd.replace(/\\/g, '/').toLowerCase();
  // Must end with dashboard-server or be a subdir of it
  return norm.endsWith('/dashboard-server') ||
         norm.endsWith('/dashboard-server/') ||
         norm.includes('/dashboard-server/');
}

// Anchored evidence patterns -- matched at position 0 of the stripped,
// masked pipeline stage.
const EV_TEST_ALL_RE = /^npm(?:\.cmd|\.exe)?\s+run\s+test:all\b/i;
const EV_TEST_E2E_RE = /^npm(?:\.cmd|\.exe)?\s+run\s+test:e2e\b/i;
const EV_PLAYWRIGHT_RE = /^npx(?:\.cmd|\.exe)?\s+playwright\s+test\b/i;
const EV_NPM_TEST_RE = /^npm(?:\.cmd|\.exe)?\s+test\b/i;
const EV_VITEST_RE = /^npx(?:\.cmd|\.exe)?\s+vitest\s+run\b/i;
const EV_CURL_RE = /^curl(?:\.exe)?\b/i;
const EV_NODE_RE = /^node(?:\.exe)?\b/i;

/**
 * Detect verification evidence type from a shell command.
 *
 * Returns null if no evidence detected.
 * For `test:all`, returns an array of two result objects.
 * Otherwise returns a single result object: {type, surfacesCovered}.
 *
 * Uses the LAST execution-relevant segment (not first) to determine the
 * evidence type, then evaluates each pipeline stage of that segment
 * independently (`cat input | npm test` records; `grep npm test file` does
 * not). Rejects matches inside echo/printf/quotes, and requires the
 * evidence tool at command position.
 *
 * @param {string} rawCommand
 * @param {string} cwd - Current working directory
 * @returns {null|object|object[]}
 */
function detectEvidenceType(rawCommand, cwd) {
  if (!rawCommand || typeof rawCommand !== 'string') return null;

  const segments = parseCommand(rawCommand);
  if (segments.length === 0) return null;

  // Resolve the effective cwd accounting for any cd segments
  const effectiveCwd = resolveWorkingDirectory(rawCommand, cwd);

  // Find the LAST execution-relevant segment (skip cd, echo, printf).
  // A segment counts as echo only if EVERY pipe stage is echo/printf --
  // `echo y | npx vitest run` still executes vitest.
  let lastRelevant = null;
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (/^(?:cd|chdir|sl|set-location|pushd)\s/i.test(seg)) continue;
    if (splitPipes(seg).every(isEchoSegment)) continue;
    lastRelevant = seg;
    break;
  }

  if (!lastRelevant) return null;

  // No global-offset masking here: segments split only at unquoted
  // operators, so each stage's quote state is self-contained and the stage
  // loop below masks each stage independently. A fully-quoted stage masks
  // to spaces and matches no evidence pattern.

  // Evaluate each pipeline stage independently
  for (const stage of splitPipes(lastRelevant)) {
    if (isEchoSegment(stage)) continue;
    const stripped = stripCommandPrefix(maskQuoted(stage));
    const raw = stage.trim();

    // --- npm/npx patterns (require dashboard-server cwd) ---

    // test:all -> returns BOTH unit_test and e2e_test
    if (EV_TEST_ALL_RE.test(stripped) && isDashboardServerCwd(effectiveCwd)) {
      return [
        { type: 'unit_test', surfacesCovered: ['server', 'frontend', 'migrations', 'tests'] },
        { type: 'e2e_test', surfacesCovered: ['server', 'frontend'] }
      ];
    }

    // test:e2e or playwright
    if ((EV_TEST_E2E_RE.test(stripped) || EV_PLAYWRIGHT_RE.test(stripped))
        && isDashboardServerCwd(effectiveCwd)) {
      return { type: 'e2e_test', surfacesCovered: ['server', 'frontend'] };
    }

    // npm test or npx vitest
    if ((EV_NPM_TEST_RE.test(stripped) || EV_VITEST_RE.test(stripped))
        && isDashboardServerCwd(effectiveCwd)) {
      return { type: 'unit_test', surfacesCovered: ['server', 'frontend', 'migrations', 'tests'] };
    }

    // --- curl health check (no cwd requirement, excludes mutating requests) ---
    if (EV_CURL_RE.test(stripped) && /localhost:8888/.test(raw) &&
        !/-(X|d|data)\b/.test(stripped) && !/--data/.test(stripped)) {
      return { type: 'health_check', surfacesCovered: ['server'] };
    }

    // --- harness tests (node path containing .claude/harness/tests/) ---
    if (EV_NODE_RE.test(stripped) && /\.claude\/harness\/tests\/test-/.test(raw)) {
      return { type: 'unit_test', surfacesCovered: ['harness'] };
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════
// isGateTarget
// ═══════════════════════════════════════════════════════════════════

/**
 * Extract commit message from a git commit command.
 * Handles -m/-message "msg", -m 'msg', and -m msg patterns.
 */
function extractCommitMessage(segment) {
  // --message "message" or --message 'message'
  const longQuoted = segment.match(/--message[\s=]+["']([^"']*?)["']/);
  if (longQuoted) return longQuoted[1];

  // --message followed by unquoted word(s)
  const longUnquoted = segment.match(/--message[\s=]+([^\s-][^\s]*)/);
  if (longUnquoted) return longUnquoted[1];

  // -m "message" or -m 'message'
  const quoted = segment.match(/-m\s+["']([^"']*?)["']/);
  if (quoted) return quoted[1];

  // -m followed by unquoted word(s) up to next flag or end
  const unquoted = segment.match(/-m\s+([^\s-][^\s]*)/);
  if (unquoted) return unquoted[1];

  // heredoc pattern: -m "$(cat <<'EOF' ... )" -- too complex, return null
  return null;
}

// Git global options that may precede the subcommand:
//   -c key=val / -C dir (a quoted value is masked to spaces, so the bare
//   short-flag alternative absorbs the flag and the mask absorbs the value),
//   long options with =value or space-separated value (--git-dir=.git,
//   --work-tree ., --no-pager), bare short flags (-P).
// The (?![\w-]) lookahead rejects plumbing subcommands that merely share the
// prefix (commit-tree, commit-graph).
// All gate patterns match at POSITION 0 of the stripped masked sub-segment,
// tying detection to the command that actually executes -- text later in the
// same sub-segment (arguments, trailing # comments) cannot match.
const GIT_GLOBAL_OPTS = '(?:(?:-[cC]\\s+\\S+|--[\\w-]+(?:[=\\s]+\\S+)?|-\\w+)\\s+)*';
const GIT_COMMIT_ANCHORED_RE = new RegExp('^git(?:\\.exe)?\\s+' + GIT_GLOBAL_OPTS + 'commit(?![\\w-])', 'i');
const GIT_PUSH_ANCHORED_RE = new RegExp('^git(?:\\.exe)?\\s+' + GIT_GLOBAL_OPTS + 'push(?![\\w-])', 'i');
const PM2_RESTART_ANCHORED_RE = /^pm2(?:\.cmd|\.exe)?\s+restart\b/i;
const GH_PR_ANCHORED_RE = /^gh(?:\.exe)?\s+pr\s+create\b/i;
const CURL_ANCHORED_RE = /^curl(?:\.exe)?\b/i;

/**
 * If the sub-segment invokes another shell with a command-string flag
 * (bash -c / -lc, pwsh/powershell -c/-Command, cmd /c or /k), return the
 * payload so gate detection can recurse into it. Returns null otherwise.
 *
 * Quoted payloads are unwrapped for every shell. Unquoted payloads are
 * unwrapped only for PowerShell and cmd, where the remainder of the line IS
 * the command; POSIX shells execute only the first word of an unquoted -c
 * argument, so `bash -c git commit` runs plain `git` and is not a commit.
 *
 * Prefix matching runs on the masked string (indices align with raw), so
 * quoted env-assignment values cannot derail it. Leading flags without
 * separate values are walked over, including cmd's inline-value forms
 * (cmd /v:on /c, cmd /q /d /s /c, powershell -NoProfile -Command). A flag
 * taking a separate value before the command-string flag
 * (-ExecutionPolicy Bypass) aborts the unwrap -- see the
 * residual-limitations note at the top of this file.
 */
function unwrapShellPayload(segment) {
  const t = segment.trim();
  const tm = maskQuoted(t);
  const m = tm.match(/^(?:\w+=\S*\s+)*(bash|sh|zsh|dash|pwsh|powershell|cmd)(?:\.exe)?\s+/i);
  if (!m) return null;
  const shell = m[1].toLowerCase();
  const isCmd = shell === 'cmd';
  const isPS = shell === 'pwsh' || shell === 'powershell';
  const cmdFlagRe = isCmd
    ? /^\/[ckCK](?=\s|$)/
    : isPS
      ? /^-{1,2}c(?:o(?:m(?:m(?:a(?:n(?:d)?)?)?)?)?)?(?=\s|$)/i
      : /^-[A-Za-z]*c[A-Za-z]*(?=\s|$)/;

  let pos = m[0].length;
  let found = false;
  while (pos < t.length) {
    const restMasked = tm.slice(pos);
    const fm = restMasked.match(cmdFlagRe);
    if (fm) {
      pos += fm[0].length;
      while (t[pos] === ' ') pos++;
      found = true;
      break;
    }
    const other = restMasked.match(/^(?:-{1,2}[\w:.-]+|\/[\w:.-]+)(?:\s+|$)/);
    if (!other) break;
    pos += other[0].length;
  }
  if (!found || pos >= t.length) return null;

  const rest = t.slice(pos);
  const q = rest[0];
  if (q === '"' || q === "'") {
    const last = rest.lastIndexOf(q);
    if (last <= 0) return null;
    return rest.slice(1, last);
  }
  return (isPS || isCmd) ? rest : null;
}

/**
 * Extract the shell command string from a PostToolUse/PreToolUse hook
 * payload. Prefers the canonical tool_input.command shape; falls back to a
 * flattened { command } payload. Returns '' when no usable command exists,
 * so callers can exit silently on payload-shape drift.
 */
function extractHookCommand(hookPayload) {
  if (!hookPayload || typeof hookPayload !== 'object') return '';
  const ti = hookPayload.tool_input;
  if (ti && typeof ti === 'object' && typeof ti.command === 'string' && ti.command) {
    return ti.command;
  }
  if (typeof hookPayload.command === 'string') return hookPayload.command;
  return '';
}

/**
 * Scan ALL segments of a command for gate targets.
 * Returns an array of gate objects (possibly empty).
 *
 * Each gate: {gate: "commit"|"push"|"pm2"|"pr"|"bugstatus", metadata: {...}}
 * Commit gates carry metadata.anchored (always true under anchored-only
 * emission; retained for consumers that check it explicitly, e.g.
 * git-push.js).
 *
 * Semantic detection: splits on && || ; and pipes (including |&), rejects
 * echo/printf, comments, and quoted text, requires the gate pattern at
 * command position of its pipeline stage, and recurses up to two levels
 * into shell-exec wrappers (bash -c "...", powershell -Command ...,
 * cmd /c ...).
 *
 * @param {string} rawCommand
 * @param {number} [depth] - internal recursion depth for wrapper unwrapping
 * @returns {Array<{gate: string, metadata: object}>}
 */
function isGateTarget(rawCommand, depth) {
  depth = depth || 0;
  if (!rawCommand || typeof rawCommand !== 'string') return [];

  const segments = parseCommand(rawCommand);
  if (segments.length === 0) return [];

  const gates = [];

  for (const seg of segments) {
    for (const sub of splitPipes(seg)) {
      // Skip echo/printf sub-segments
      if (isEchoSegment(sub)) continue;

      // Check for comment-only sub-segments
      if (sub.trim().startsWith('#')) continue;

      // Shell-exec wrappers: recurse into the payload (up to two levels)
      if (depth < 2) {
        const inner = unwrapShellPayload(sub);
        if (inner !== null) {
          const innerGates = isGateTarget(inner, depth + 1);
          for (const g of innerGates) gates.push(g);
          continue;
        }
      }

      // Anchored matching: gate patterns must sit at position 0 of the
      // stripped masked sub-segment (see header comment). The sub-segment
      // is masked INDEPENDENTLY -- sub boundaries are unquoted operators,
      // so its quote state is self-contained. Never locate a sub-segment
      // via indexOf on the full command: identical quoted text earlier in
      // the command would shadow the real occurrence.
      const stripped = stripCommandPrefix(maskQuoted(sub));

      // --- git commit ---
      if (GIT_COMMIT_ANCHORED_RE.test(stripped)) {
        const message = extractCommitMessage(sub);
        gates.push({
          gate: 'commit',
          metadata: { message: message || null, anchored: true }
        });
        continue;
      }

      // --- git push ---
      if (GIT_PUSH_ANCHORED_RE.test(stripped)) {
        gates.push({ gate: 'push', metadata: {} });
        continue;
      }

      // --- pm2 restart ---
      if (PM2_RESTART_ANCHORED_RE.test(stripped)) {
        gates.push({ gate: 'pm2', metadata: {} });
        continue;
      }

      // --- gh pr create ---
      if (GH_PR_ANCHORED_RE.test(stripped)) {
        gates.push({ gate: 'pr', metadata: {} });
        continue;
      }

      // --- bug status update (curl to /api/bug with please_review) ---
      // curl must be the executing command; the URL/body content is checked
      // against the raw sub-segment (payloads are quoted), and a mutation
      // flag (-X/-d/--data) must be present so a plain fetch with stray
      // arguments cannot register as a status update.
      if (CURL_ANCHORED_RE.test(stripped) &&
          /\/api\/bug/.test(sub) && /please_review/.test(sub) &&
          (/\s-(X|d)\b/.test(stripped) || /--data/.test(stripped))) {
        gates.push({ gate: 'bugstatus', metadata: {} });
      }
    }
  }

  return gates;
}

// ═══════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  parseCommand,
  resolveWorkingDirectory,
  detectEvidenceType,
  isGateTarget,
  extractHookCommand,
  // Exposed for testing
  _maskQuoted: maskQuoted,
  _isEchoSegment: isEchoSegment,
  _unwrapShellPayload: unwrapShellPayload,
  _splitPipes: splitPipes,
  _stripCommandPrefix: stripCommandPrefix,
};
