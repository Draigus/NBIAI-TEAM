#!/usr/bin/env node
'use strict';
// command-detector.js -- Parses shell commands to detect verification evidence
// types and gate targets. Used by:
//   - PostToolUse hooks: record evidence from test/curl commands
//   - PreToolUse hooks: detect gate targets (commit, push, pm2, pr, bugstatus)
//
// Pure functions, no side effects. All detection is quote-aware to avoid
// false positives from echo/printf/comment text.

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

// ═══════════════════════════════════════════════════════════════════
// parseCommand
// ═══════════════════════════════════════════════════════════════════

/**
 * Split a compound shell command at combinators (&&, ||, ;) into segments.
 * Does not split on combinators inside quoted strings.
 *
 * @param {string} rawCommand
 * @returns {string[]} Array of trimmed segments
 */
function parseCommand(rawCommand) {
  if (!rawCommand || typeof rawCommand !== 'string') return [];

  const masked = maskQuoted(rawCommand);
  const segments = [];
  let start = 0;

  for (let i = 0; i < masked.length; i++) {
    // Check for && or ||
    if (i + 1 < masked.length) {
      const pair = masked[i] + masked[i + 1];
      if (pair === '&&' || pair === '||') {
        segments.push(rawCommand.slice(start, i).trim());
        start = i + 2;
        i++; // skip second char
        continue;
      }
    }
    // Check for ;
    if (masked[i] === ';') {
      segments.push(rawCommand.slice(start, i).trim());
      start = i + 1;
    }
  }

  // Final segment
  const last = rawCommand.slice(start).trim();
  if (last) segments.push(last);

  return segments.filter(Boolean);
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
    const cdMatch = seg.match(/^cd\s+(.+)$/i);
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

/**
 * Detect verification evidence type from a shell command.
 *
 * Returns null if no evidence detected.
 * For `test:all`, returns an array of two result objects.
 * Otherwise returns a single result object: {type, surfacesCovered}.
 *
 * Uses the LAST execution-relevant segment (not first) to determine the
 * evidence type. Rejects matches inside echo/printf/quotes.
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

  // Find the LAST execution-relevant segment (skip cd, echo, printf)
  let lastRelevant = null;
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (/^cd\s/i.test(seg)) continue;
    if (isEchoSegment(seg)) continue;
    lastRelevant = seg;
    break;
  }

  if (!lastRelevant) return null;

  // Check if the whole command is inside quotes (echo wrapping the entire thing)
  const masked = maskQuoted(rawCommand);
  // If the last relevant segment in the masked version is all spaces, it was quoted
  const segStart = rawCommand.lastIndexOf(lastRelevant);
  if (segStart >= 0) {
    const maskedSeg = masked.slice(segStart, segStart + lastRelevant.length).trim();
    if (!maskedSeg) return null;
  }

  // Also reject if the segment itself is an echo/printf
  if (isEchoSegment(lastRelevant)) return null;

  const seg = lastRelevant.trim();

  // --- npm/npx patterns (require dashboard-server cwd) ---

  // test:all -> returns BOTH unit_test and e2e_test
  if (/\bnpm\s+run\s+test:all\b/.test(seg) && isDashboardServerCwd(effectiveCwd)) {
    return [
      { type: 'unit_test', surfacesCovered: ['server', 'frontend', 'migrations', 'tests'] },
      { type: 'e2e_test', surfacesCovered: ['server', 'frontend'] }
    ];
  }

  // test:e2e or playwright
  if ((/\bnpm\s+run\s+test:e2e\b/.test(seg) || /\bnpx\s+playwright\s+test\b/.test(seg))
      && isDashboardServerCwd(effectiveCwd)) {
    return { type: 'e2e_test', surfacesCovered: ['server', 'frontend'] };
  }

  // npm test or npx vitest
  if ((/\bnpm\s+test\b/.test(seg) || /\bnpx\s+vitest\s+run\b/.test(seg))
      && isDashboardServerCwd(effectiveCwd)) {
    return { type: 'unit_test', surfacesCovered: ['server', 'frontend', 'migrations', 'tests'] };
  }

  // --- curl health check (no cwd requirement, excludes mutating requests) ---
  if (/\bcurl\b/.test(seg) && /localhost:8888/.test(seg) &&
      !/-(X|d|data)\b/.test(seg) && !/--data/.test(seg)) {
    return { type: 'health_check', surfacesCovered: ['server'] };
  }

  // --- harness tests (node path containing .claude/harness/tests/) ---
  if (/\bnode\b/.test(seg) && /\.claude\/harness\/tests\/test-/.test(seg)) {
    return { type: 'unit_test', surfacesCovered: ['harness'] };
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

/**
 * Scan ALL segments of a command for gate targets.
 * Returns an array of gate objects (possibly empty).
 *
 * Each gate: {gate: "commit"|"push"|"pm2"|"pr"|"bugstatus", metadata: {...}}
 *
 * Uses semantic detection -- rejects matches inside echo, printf, comments,
 * or string literals.
 *
 * @param {string} rawCommand
 * @returns {Array<{gate: string, metadata: object}>}
 */
function isGateTarget(rawCommand) {
  if (!rawCommand || typeof rawCommand !== 'string') return [];

  const segments = parseCommand(rawCommand);
  if (segments.length === 0) return [];

  const masked = maskQuoted(rawCommand);
  const gates = [];

  for (const seg of segments) {
    // Skip echo/printf segments
    if (isEchoSegment(seg)) continue;

    // Find this segment's position in the original command to check masked version
    const segStart = rawCommand.indexOf(seg);
    if (segStart >= 0) {
      const maskedSeg = masked.slice(segStart, segStart + seg.length).trim();
      if (!maskedSeg) continue; // entire segment was inside quotes
    }

    // Check for comment-only segments
    if (seg.trim().startsWith('#')) continue;

    // Use masked segment for pattern matching to avoid false positives
    // from gate keywords inside quoted strings
    const segStart2 = rawCommand.indexOf(seg);
    const testSeg = segStart2 >= 0 ? masked.slice(segStart2, segStart2 + seg.length) : seg;

    // --- git commit (handles: git commit, git -C <dir> commit, git -c key=val commit) ---
    if (/\bgit\s+(?:-[cC]\s+\S+\s+)*commit\b/.test(testSeg)) {
      const message = extractCommitMessage(seg);
      gates.push({ gate: 'commit', metadata: { message: message || null } });
      continue;
    }

    // --- git push (handles: git push, git -C <dir> push, git -c key=val push) ---
    if (/\bgit\s+(?:-[cC]\s+\S+\s+)*push\b/.test(testSeg)) {
      gates.push({ gate: 'push', metadata: {} });
      continue;
    }

    // --- pm2 restart ---
    if (/\bpm2\s+restart\b/.test(testSeg)) {
      gates.push({ gate: 'pm2', metadata: {} });
      continue;
    }

    // --- gh pr create ---
    if (/\bgh\s+pr\s+create\b/.test(testSeg)) {
      gates.push({ gate: 'pr', metadata: {} });
      continue;
    }

    // --- bug status update (curl to /api/bug with please_review) ---
    // curl must be a real command (masked), but URL/body content checked against original
    if (/\bcurl\b/.test(testSeg) && /\/api\/bug/.test(seg) && /please_review/.test(seg)) {
      gates.push({ gate: 'bugstatus', metadata: {} });
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
  // Exposed for testing
  _maskQuoted: maskQuoted,
  _isEchoSegment: isEchoSegment,
};
