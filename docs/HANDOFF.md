# HANDOFF — RHO Harness Pre-Merge Hardening (2026-06-14)

## What this session did

1. **Codex critique review** — Read the full GPT-5.5 critique (10 MUST-FIX, 13 SHOULD-FIX, 10 spec deviations) from the prior session. Full critique at `d:\tmp\codex_rho_critique_2026-06-14.md`.

2. **Adversarial convergence debate** — Ran two rounds of critic debate between Claude Fable 5 and Codex GPT-5.5 on the best path forward. Three paths proposed (A: fix all now, B: run as-is, C: merge then harden). Converged on **Path D-lite**: merge after four specific pre-merge fixes, then harden on a new branch.

3. **Implemented all four pre-merge items** (commit `84e789e`):
   - **M3:** write-guard.js fails closed on missing/corrupt config (was failing open)
   - **M9:** test-emit-event.js uses isolated temp directories (was polluting live data)
   - **Claim demotion:** CLAUDE.md and cadence prompt now say "telemetry and proposal prototype" with conventional (not mechanical) principal separation
   - **apply-gate.js:** Mechanical auto-apply gate that validates AND performs writes. Canonical path resolution, anchored glob matching, traversal protection, governed path blocking.

4. **Codex code review** — Codex reviewed the patch and found 2 HIGH (path traversal, unanchored regex), 3 MEDIUM (outer catch, CLAUDE.md contradiction, operation not tied to write), 1 LOW (no-op test assertion). All fixed and re-verified.

5. **Upgraded apply-gate to validate-and-write** — Glen chose to make the gate perform the write itself rather than just validating intent. The cadence prompt must pipe content through the gate; it cannot write directly.

## Branch / repo state

- Branch: `feature/command-centre`, HEAD = `84e789e`
- All pre-merge criteria met. Branch is merge-ready per Path D-lite.
- Debate transcripts: `d:\tmp\codex_round1.md`, Codex round 2 output in session tool results

## What was fixed (pre-merge)

| Finding | File | Fix |
|---|---|---|
| M3: Guard fails open | write-guard.js | `failClosed()` helper; matrix load error blocks; outer catch emits block decision |
| M9: Tests pollute live data | test-emit-event.js | Isolated temp dir via `os.tmpdir()`, config copied in, temp cleaned up. 14/14 pass |
| Claim demotion | CLAUDE.md, harness-improvement.md | "Telemetry and proposal prototype", conventional roles, session attribution caveats |
| Auto-apply gate | apply-gate.js (NEW) | Validates AND writes: canonical paths, anchored globs, traversal protection, governed path blocking, empty stdin rejection |

## What is NOT fixed (deferred to `feature/rho-hardening`)

### Enforcement boundary (do first)
- M1: Principal identity (`HARNESS_PRINCIPAL` env var, principal-aware write guard)
- M2: Bash/PowerShell bypass coverage
- M5: Full deterministic applier (apply-gate.js is a safety rail, not full M5)
- D1-D3: Two-principal separation, principal-aware deny, proposal immutability
- D10: Deterministic risk policy engine

### Capture quality (do second)
- M6: Session join key for transcript signals
- M7: Bootstrap metadata preservation in emit-event.js
- M8: Session ID race condition

### Remaining SHOULD-FIX (do third)
- S1-S13: Redaction improvements, ULID monotonicity, lock improvements, entropy scan fixes, transcript parser scoping, bootstrap git history, Windows tooling

## Key decisions made

1. **Path D-lite wins** — Merge the telemetry prototype after it is honest about what it is and mechanically unable to perform unsafe auto-apply. Full enforcement deferred.
2. **Claim demotion is architectural** — For an AI-operated system, the operating contract (CLAUDE.md) IS architecture. False enforcement claims are not documentation bugs.
3. **Gate validates AND writes** — apply-gate.js is the write path, not a preflight check. Prevents the cadence prompt from lying about operation type.
4. **Write tool + cp is the pattern for harness lib edits** — Writing JS files through Python/Node string layers mangles regex backslashes. Write to `d:\tmp/` via Write tool, then `cp` into place, then `node --check`. Codex confirmed this as best practice.

## Files changed

| File | Purpose |
|---|---|
| `.claude/harness/lib/write-guard.js` | M3 fix: fail closed + outer catch blocks |
| `.claude/harness/lib/apply-gate.js` | NEW: mechanical validate-and-write gate |
| `.claude/harness/tests/test-emit-event.js` | M9 fix: isolated temp directories |
| `CLAUDE.md` | Claim demotion: telemetry prototype language |
| `scripts/cadence/prompts/harness-improvement.md` | Claim demotion + mandatory write gate |

## Reference files (unchanged, for context)

| File | Purpose |
|---|---|
| `d:\tmp\codex_rho_critique_2026-06-14.md` | Full Codex critique (10 MUST-FIX, 13 SHOULD-FIX, 10 deviations) |
| `.claude/harness/config/risk-policy.json` | LOW/HIGH/BLOCKED_TO_APPLY rules (read by apply-gate.js) |
| `.claude/harness/config/write-matrix.json` | Write authority matrix (read by write-guard.js) |
| `docs/specs/2026-06-08-harness-improvement-system-design.md` | Locked spec (source of truth for hardening branch) |
