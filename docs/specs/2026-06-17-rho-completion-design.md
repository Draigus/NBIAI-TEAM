# RHO Harness Completion Design

**Date:** 2026-06-17
**Status:** Approved by Glen (conversation approval)
**Scope:** Complete all v1 gaps between the locked spec (2026-06-08) and the current implementation
**Parent spec:** docs/specs/2026-06-08-harness-improvement-system-design.md

---

## Context

The RHO harness improvement system was designed June 8 (spec locked after 6 cross-AI review rounds), partially implemented June 11-15. The first diagnosis cycle ran June 15 and produced 4 proposals (2 auto-applied, 1 awaiting Glen review, 1 BLOCKED). Event capture, write-guards, risk classification, and the basic apply-gate are operational.

This document covers the remaining v1 gaps identified by a full spec-vs-implementation audit on June 17.

---

## Implementation Phases

Each phase follows the adversarial convergence pattern:
1. Plan the changes (files, functions, exact modifications)
2. Codex reviews the plan (adversarial critique)
3. Implement the changes
4. Codex reviews the implementation (adversarial critique)
5. Tests where applicable
6. Commit (Glen approves changes to BLOCKED_TO_APPLY paths)

### Phase 1: Apply-Gate Hardening

**Target files:** `.claude/harness/lib/apply-gate.js`, `.claude/harness/config/section-boundaries.json`
**Risk:** BLOCKED_TO_APPLY (engine code)

The apply-gate currently validates operation type and target path, then performs the write. It does not enforce the spec's constraint system.

**Changes:**
1. **Content-hash verification** - Before applying, compute SHA-256 of proposal content and verify it matches the proposal's `content_hash` field. Reject if mismatch.
2. **Additive-only enforcement** - After writing, run `git diff --stat <target>` and check for zero deletion hunks. Revert and reject if deletions found.
3. **Knowledge-section-only enforcement** - Parse section-boundaries.json heading patterns. After writing, verify all diff hunks fall under matching headings. Revert and reject if content outside allowed sections.
4. **Frontmatter schema validation** - For new memory files: parse YAML frontmatter, verify required fields (name, description, metadata.type, source: harness_rho, auto_generated: true). Reject if invalid.
5. **Index-entry-only format validation** - For MEMORY.md appends: verify the appended line matches `- [Title](file.md) -- description` format. Reject if malformed.
6. **Clean-worktree check** - Before any write, check `git status <target>`. Abort with `blocked_dirty_worktree` if target has uncommitted changes.
7. **Dirty-tree preflight** - Before staging, verify no foreign files are staged, no pre-staged content exists for owned paths.

**Tests:** Unit tests for each constraint validator.

### Phase 2: Proposal Format Compliance

**Target files:** `.claude/harness/lib/proposal-utils.js` (new), cadence prompt alignment
**Risk:** BLOCKED_TO_APPLY (new engine code)

**Changes:**
1. **Proposal utilities module** - Functions for: generating proposal JSON with all required fields, computing content_hash (SHA-256 with content_hash field set to empty string), validating proposal schema, reading/writing proposal_status.jsonl.
2. **YYYY-WNN directory structure** - Utility to compute ISO week, create subdirectory.
3. **Status transition tracking** - Functions to append valid status transitions to proposal_status.jsonl, validate transitions against the allowed transition table (spec section 5.1).
4. **DIGEST.md generation** - Template function to produce weekly digest from proposal files.
5. **Cadence prompt update** - Align the prompt with proposal-utils.js so the cadence routine calls the utility functions rather than writing ad hoc markdown.

**Tests:** Unit tests for proposal schema validation, content-hash computation, status transitions.

### Phase 3: Write-Guard Completeness

**Target files:** `.claude/harness/lib/write-guard.js`, `.claude/harness/config/write-matrix.json`
**Risk:** BLOCKED_TO_APPLY (engine code + config)

**Changes:**
1. **Governed target protection** - Extend write-guard to fire on paths outside `.claude/harness/` when `HARNESS_CADENCE=true`. During cadence runs, writes to governed targets (skills, roles, memories, CLAUDE.md, hooks) must go through apply-gate.js. Block direct writes.
2. **Full Applier paths in write-matrix** - Add the complete Applier path list from spec section 2.4 to write-matrix.json.
3. **Principal-aware checking** - When `HARNESS_CADENCE=true` and target is a governed path: check if the write came through apply-gate (via env marker or call stack detection). Block if not.

**Tests:** Unit tests for governed target blocking during cadence, pass-through during normal sessions.

### Phase 4: Entropy Scanner (P004 + Slow Scan)

**Target files:** `.claude/harness/lib/entropy-scan.js`
**Risk:** BLOCKED_TO_APPLY (engine code)

**Changes:**
1. **Session-level deduplication (P004)** - Before emitting an entropy event, check if an event with the same (category, detail) tuple has already been emitted in this session. Skip if duplicate. Reset state on new session.
2. **Slow scan functions** - Add functions for weekly diagnosis use:
   - Architecture consistency: check new code follows established patterns (route registration, error handling, naming conventions)
   - Documentation drift: detect modified files with stale JSDoc/README references
   - Workflow state: verify session log updated, live state files current
3. **Export slow scan for cadence** - Expose slow scan functions so the cadence prompt can invoke them via `node entropy-scan.js --slow`.

**Tests:** Unit tests for deduplication logic, slow scan pattern detection.

### Phase 5: Event Capture Completeness

**Target files:** `.claude/harness/lib/emit-event.js`, `.claude/settings.json` (hooks)
**Risk:** BLOCKED_TO_APPLY (engine code) + settings changes

**Changes:**
1. **skill_usage enrichment** - Populate `task_type` and `mandatory` fields. Read the mandatory skill table from CLAUDE.md or a cached config to determine if the invoked skill was mandatory for the detected task type.
2. **context_pressure capture** - Add a PostToolUse hook that detects context management events (compaction markers, handoff writes, selective reads, bank loads) and emits context_pressure events.
3. **role_dispatch capture** - Add emission when role AGENT.md files are loaded. Track which role, what triggered it, what domain.
4. **duration_ms capture** - For Bash/PowerShell tool_outcome events, compute duration from hook timing if available.
5. **Transcript parser auto-fire** - Wire transcript-parser.js to run at session end. Since Claude Code doesn't have a native SessionEnd hook, use a best-effort approach: fire the parser as part of the handoff write process or as a PostToolUse hook on the final commit.

**Tests:** Unit tests for event enrichment, integration test for hook wiring.

### Phase 6: Anti-Regression Mechanics

**Target files:** `.claude/harness/lib/anti-regression.js` (new)
**Risk:** BLOCKED_TO_APPLY (new engine code)

**Changes:**
1. **Anti-regression tracking module** - Functions for:
   - Extracting anti-regression keys from applied proposals
   - Searching new events for matching (component, classification, domain, failure_code) tuples
   - Computing status: `validated_by_evidence`, `validated_by_absence`, `regressed`
   - Writing status transitions to proposal_status.jsonl
2. **Recurrence detection** - When the same failure pattern appears within 4 weeks: generate a rollback proposal through the normal proposal pipeline (no automated reverts).
3. **Cadence integration** - Expose as a callable function the cadence prompt invokes after diagnosis.

**Tests:** Unit tests for key extraction, recurrence matching, status computation.

### Phase 7: Memory Conflict Handling

**Target files:** `.claude/harness/lib/memory-conflict.js` (new)
**Risk:** BLOCKED_TO_APPLY (new engine code)

**Changes:**
1. **Conflict detection** - When a proposal targets a memory file: scan existing memory files for matching `name:` slug or overlapping `description:` domain. Flag conflicts.
2. **Automatic HIGH promotion** - If conflict detected with a Glen-explicit memory (no `source: harness_rho` tag), promote proposal to HIGH regardless of initial risk classification.
3. **Conflict flag in digest** - Add `conflict_with: [memory_name]` to proposal metadata when conflict detected.

**Tests:** Unit tests for slug matching, description domain overlap, promotion logic.

### Phase 8: Reporting and Hygiene

**Target files:** `.claude/harness/lib/reporting.js` (new), cadence prompt
**Risk:** BLOCKED_TO_APPLY (new engine code)

**Changes:**
1. **Full HARNESS_HEALTH.md template** - All spec sections: trend lines (4-week rolling entropy score, intervention rate, proposal acceptance rate, false positive rate), event volume by type, blocked attempt log, validation states table, coverage limitations.
2. **Reporting utilities** - Functions to compute trend lines from entropy_trend.jsonl, count events by type, aggregate proposal statistics.
3. **Retention cleanup** - Script to delete raw event files older than 90 days. Run as part of weekly cadence.
4. **Cadence prompt alignment** - Update the cadence prompt to use the new utility modules (proposal-utils, anti-regression, memory-conflict, reporting) rather than doing everything inline.

**Tests:** Unit tests for trend computation, retention date logic.

---

## Cross-Cutting Concerns

- **All changes to `.claude/harness/lib/` and `.claude/harness/config/` are BLOCKED_TO_APPLY.** Glen must approve each phase's changes before they go live.
- **Existing tests must remain green.** Run the harness test suite after each phase.
- **Backward compatibility** - New proposal format (JSON) must handle existing markdown proposals (P001-P004) gracefully. The system should read both formats during the transition.
- **Context management** - This is a multi-session effort. Handoffs at natural phase boundaries.

---

## Success Criteria

When all 8 phases are complete:
1. Every constraint in risk-policy.json is mechanically enforced by apply-gate.js
2. Proposals follow the JSON schema from spec section 5.1 with content-hash binding
3. Write-guard protects governed targets during cadence runs
4. Entropy scanner deduplicates per-session and has slow scan capability
5. All 6 event types capture their full field set
6. Anti-regression monitoring runs mechanically each weekly cycle
7. Memory conflict detection prevents silent override of Glen's memories
8. HARNESS_HEALTH.md contains all sections specified in spec section 9.1
9. All new code has unit tests
10. Codex adversarial review passed at both plan and implementation stages for every phase
