# Self-Healing Harness Improvement System — Design Spec

**Date:** 2026-06-08
**Status:** Locked (converged after 6 cross-AI review rounds + 2 spec review rounds)
**Author:** Claude (with Glen's architecture directives)
**Reviewer:** OpenAI Codex via Arthrea Coordination Bridge
**Scope:** Cyclical self-improvement system for the NBI AI Team AIOS. Captures failure signals, diagnoses patterns, proposes harness updates, and applies them with tiered approval gates.

---

## 1. Overview

### 1.1 Problem

The NBI AIOS (33 roles, 33+ skills, intelligence pipeline, memory system, hooks, routines) improves only when Glen notices a failure and manually creates a rule, feedback memory, or skill update. This is reactive, incomplete, and doesn't scale. Patterns repeat because no system tracks whether past fixes actually work.

### 1.2 Solution

A four-phase continuous improvement cycle — CAPTURE → DIAGNOSE → PROPOSE → APPLY — inspired by Microsoft Research's Retrospective Harness Optimization (RHO) paper and the Zhong/Zhu harness engineering taxonomy.

The system captures structured failure data from every session, runs weekly diagnosis to find patterns, proposes specific harness changes, and applies them through tiered approval gates. Low-risk additive changes auto-apply. High-risk structural changes require Glen's review. Governance changes (risk policy, redaction rules, decision logic) require Glen to manually apply from a generated diff.

### 1.3 Threat Model

This system runs on Glen's personal Windows 11 machine. Glen is the only human user. Claude Code and Codex are the only agents. No multi-tenant access, no network exposure.

**Threat:** The AI makes an accidental mistake that degrades the harness.
**Not in scope for v1:** Adversarial compromise, approval replay, symlink exploitation, cryptographic binding.

### 1.4 Location

`.claude/harness/` within the NBIAI_TEAM repo, alongside the hooks and skills it governs.

### 1.5 Inspiration

- **RHO paper** (arxiv 2606.05922): Self-supervised harness optimisation using past trajectory data. Coreset selection, self-validation, self-consistency, candidate generation.
- **Zhong/Zhu taxonomy** (arxiv 2605.13357): 11-component harness framework. Task interface, context manager, tool registry, project memory, task state, observability, failure attribution, verification, permissions, entropy auditing, intervention logging.

---

## 2. Architecture

### 2.1 Two-Principal Separation

The system is split into two logical principals with distinct write authorities. This prevents the diagnosis engine from directly modifying governed files.

**Principal 1: Recorder/Proposer**
- Capture hooks, diagnosis engine, proposal generator
- Can write to: `.claude/harness/data/**`, `.claude/harness/proposals/**`, `.claude/harness/HARNESS_HEALTH.md`
- Cannot write to: governed targets (skills, CLAUDE.md, hooks, roles, memories)
- Cannot write to: `.claude/harness/changelog.md` (Applier-only)

**Principal 2: Applier**
- Executes approved proposals against governed targets
- Can write to: governed targets per the apply allowlist (Section 2.3)
- Can write to: `.claude/harness/changelog.md` (append-only)
- Cannot create proposals or modify harness logic

**Enforcement (v1):** CLAUDE.md rules + hook infrastructure + risk policy engine. Recorder and Applier are separate skill/hook invocations. A PreToolUse hook checks the role-to-path write matrix (Section 2.4) before any harness-related write. Out-of-scope writes are blocked with a clear error message.

### 2.2 Output Allowlist (Recorder)

```yaml
system_writable_outputs:
  - path: .claude/harness/data/**
    mode: append_or_create_only
  - path: .claude/harness/proposals/**
    mode: create_only_immutable
  - path: .claude/harness/HARNESS_HEALTH.md
    mode: overwrite_generated_report_only
```

Proposal files are immutable after creation. Status changes are tracked as separate events in the JSONL ledger, not as mutations to proposal files.

### 2.3 Apply Allowlist (Applier)

```yaml
apply_targets:
  LOW_auto_apply:
    - pattern: .claude/skills/**/SKILL.md
      mode: edit_existing_only
      constraint: additive_only
    - pattern: roles/*/AGENT.md
      mode: edit_existing_only
      constraint: knowledge_section_only
    - pattern: memory/feedback_*.md
      mode: create_new_or_edit_existing
      constraint: frontmatter_schema_required
    - pattern: memory/MEMORY.md
      mode: append_only
      constraint: index_entry_only
  HIGH_glen_approved:
    - pattern: CLAUDE.md
      mode: edit_existing_only
    - pattern: .claude/hooks/**
      mode: create_or_edit
    - pattern: .claude/skills/**
      mode: create_or_edit_or_delete
    - pattern: roles/*/AGENT.md
      mode: edit_existing_only
```

**Constraint definitions:**

- `additive_only`: Git diff for the target file must contain zero deletion hunks. No existing content removed or rewritten.
- `knowledge_section_only`: All diff hunks must fall under a heading matching a configured pattern (e.g. `## Domain Knowledge`, `## Known Issues`). Section starts at the matching heading, ends at next heading of equal or higher level. Nested headings (###, ####) within the section are included. Multiple matching sections all allowed. Fail closed if heading structure is ambiguous.
- `frontmatter_schema_required`: New or edited memory files must have valid frontmatter with `name`, `description`, `metadata.type` fields. Harness-generated memories must include `source: harness_rho` and `auto_generated: true`.
- `index_entry_only`: Append must be a single line matching the MEMORY.md index format (`- [Title](file.md) — description`).

### 2.4 Role-to-Path Write Matrix

Deterministic lookup enforced by PreToolUse hook:

| Principal | Path pattern | Allowed modes | Constraint |
|---|---|---|---|
| Recorder | `.claude/harness/data/**` | append, create | — |
| Recorder | `.claude/harness/proposals/**` | create | immutable |
| Recorder | `.claude/harness/HARNESS_HEALTH.md` | overwrite | generated only |
| Applier | `.claude/skills/**/SKILL.md` | edit | additive_only (LOW) or full (HIGH) |
| Applier | `roles/*/AGENT.md` | edit | knowledge_section_only (LOW) or full (HIGH) |
| Applier | `memory/feedback_*.md` | create, edit | frontmatter_schema (LOW) |
| Applier | `memory/MEMORY.md` | append | index_entry_only (LOW) |
| Applier | `CLAUDE.md` | edit | HIGH only |
| Applier | `.claude/hooks/**` | create, edit | HIGH only |
| Applier | `.claude/skills/**` | create, edit, delete | HIGH only |
| Applier | `.claude/harness/changelog.md` | append | — |
| Neither | `.claude/harness/config/**` | — | BLOCKED_TO_APPLY |

Any write attempt not matching this matrix is blocked by the hook with error `HARNESS_WRITE_DENIED: {principal} cannot write {path} in mode {mode}`.

### 2.5 Cycle Flow

```
Session starts
  → Capture hooks emit structured events (Recorder)
  → End-of-session entropy scan (Recorder)
  → Events written to .claude/harness/data/

Weekly routine fires (Monday, alongside system audit)
  → Read accumulated event data (Recorder)
  → Coreset selection: 10 hardest + most diverse episodes (Recorder)
  → Dual diagnosis: self-validation + self-consistency (Recorder)
  → Generate proposals with evidence links (Recorder)
  → Classify risk via policy engine (Recorder)
  → LOW proposals: Applier executes immediately
  → HIGH proposals: written to digest for Glen's review
  → BLOCKED_TO_APPLY proposals: diff generated, Glen applies manually
  → HARNESS_HEALTH.md generated (Recorder)
  → Anti-regression checks on previously applied fixes (Recorder)
```

---

## 3. Capture Layer

### 3.1 Event Schema

All events written as line-delimited JSON to `.claude/harness/data/events/YYYY-MM-DD/<session_id>.jsonl`.

Base fields on every event:

```json
{
  "event_id": "evt_01JXYZ...",
  "session_id": "ses_01JXYZ...",
  "schema_version": 1,
  "type": "intervention",
  "ts": "2026-06-08T14:32:00Z",
  "redacted": false
}
```

- `event_id`: ULID (timestamp-sortable, globally unique)
- `session_id`: ULID generated at session start, shared across all events in a session
- `schema_version`: integer, incremented when event structure changes
- `redacted`: boolean, true if any field was scrubbed by the redaction filter

### 3.2 Event Types

**1. `intervention` — Glen corrects the approach**

```json
{
  "type": "intervention",
  "severity": "correction|redirect|rejection",
  "harness_component": "context|skill_routing|verification|memory|permission|tool_use|role_dispatch",
  "description": "Glen said don't mock the database in integration tests",
  "task_context": "Bug fix for PM report dedup",
  "avoidable": true,
  "existing_rule_missed": "feedback_verify_work.md",
  "proposed_fix": "Add explicit rule to TDD skill for integration test scope",
  "confirmed": true,
  "capture_method": "explicit_command|transcript_parser"
}
```

Capture methods:
- **Explicit command:** `/harness intervention` invoked during session. Sets `confirmed: true`.
- **Transcript parser:** End-of-session scan of session log for correction indicators (approach rejection, "no", "stop", "don't", redirection patterns). Sets `confirmed: false`. Stored in `candidate_signals` table. Excluded from automatic diagnosis until corroborated by at least one hard signal (explicit intervention, tool failure, or entropy spike in the same session). Never triggers code changes alone.

**2. `skill_usage` — Skill invoked or skipped**

```json
{
  "type": "skill_usage",
  "skill": "systematic-debugging",
  "action": "invoked|skipped|failed",
  "task_type": "bug_fix|feature|refactor|documentation|infrastructure",
  "mandatory": true,
  "skip_reason": null
}
```

Captured via extension of existing `gsd-prompt-guard.js` hook.

**3. `tool_outcome` — Tool call result**

```json
{
  "type": "tool_outcome",
  "tool": "Bash|Edit|Write|Read|Grep|Glob|Agent|MCP|PowerShell",
  "command_summary": "npm test",
  "result": "success|failure|timeout|recovery",
  "recovery_action": null,
  "duration_ms": 4200
}
```

Captured via PostToolUse hook on all tool types.

**4. `entropy_signal` — Maintenance burden introduced**

```json
{
  "type": "entropy_signal",
  "category": "code|documentation|dependency|test|file_residue|architecture|workflow",
  "severity": 0,
  "file": "dashboard-server/server.js",
  "detail": "Added 40-line function without test coverage",
  "scan_tier": "fast|slow"
}
```

Fast scan (every session, <15 seconds): code residue, test integrity, file residue, dependency hygiene.
Slow scan (weekly, with diagnosis routine): architecture consistency, documentation drift, workflow state.

**5. `context_pressure` — Context management stress**

```json
{
  "type": "context_pressure",
  "event": "compaction|handoff|selective_read|bank_load",
  "context_pct": 72,
  "files_in_context": 14,
  "banks_loaded": ["client_couch_heroes", "production_methods"]
}
```

Captured via extension of existing `gsd-context-monitor.js` hook.

**6. `role_dispatch` — Role loaded and effectiveness**

```json
{
  "type": "role_dispatch",
  "role": "senior_engineer",
  "trigger": "skill:code-review|topic:dashboard_bug",
  "task_domain": "dashboard|client_work|infrastructure|documentation|intelligence",
  "intervention_followed": false
}
```

`intervention_followed` backfilled by weekly routine — did Glen correct something that the role context should have handled?

### 3.3 Atomic Writes and Corruption Recovery

Events appended with file locking (same pattern as Arthrea Coordination Bridge `file-lock.ts`):

1. Acquire write lock (`.claude/harness/data/.locks/write.lock`)
2. Append JSON line to session JSONL file
3. Release lock

Lock TTL: 10 seconds. Retry: 3 times, 1 second apart. Stale lock recovery: if `expires_at` is past, delete lock and proceed.

**JSONL corruption recovery:** Reader ignores/quarantines malformed trailing records (partial lines from process death). Emits a `log_corruption` event. Continues diagnosis on valid records.

### 3.4 Redaction Policy

Redaction runs at capture time. Configured in `.claude/harness/config/redaction.yaml`.

**Do-not-log patterns:**
- Values matching `*_KEY`, `*_SECRET`, `*_TOKEN`, `*_PASSWORD`
- Database connection strings (`postgres://`, `DATABASE_URL`)
- `.env` file contents
- Client-sensitive fields (configurable per-client list)

Matched values replaced with `[REDACTED]`. Event marked `redacted: true`.

**Retention:**
- Raw events: 90 days
- Aggregated metrics in HARNESS_HEALTH.md: indefinite
- Proposals and changelog: indefinite

**Governance:** Both tightening and loosening of `redaction.yaml` are BLOCKED_TO_APPLY. The harness can propose changes with diffs. Glen must review and apply.

---

## 4. Diagnosis Engine

### 4.1 Cadence

Weekly routine, firing Monday alongside the existing system audit. Reads all events accumulated since the last diagnosis cycle.

### 4.2 Coreset Selection

Selects 10 episodes (session-level groupings) that are both hard and diverse.

**Difficulty scoring (0-10 per session):**
- Each `intervention` event (confirmed): +3 (correction), +2 (redirect), +1 (rejection)
- Each `tool_outcome` with failure/timeout: +1
- Each `entropy_signal` with severity >= 2: +1
- Each `skill_usage` where mandatory skill was skipped: +2
- Session with compaction/handoff triggered: +1

**Diversity fingerprint** (tag vector per session):
- Harness components involved (from intervention events)
- Task domain (dashboard, client_work, infrastructure, documentation, intelligence)
- Roles dispatched
- Skills invoked
- Failure codes (from prior diagnosed failures)

**Selection algorithm:** Greedy alternating — pick the hardest remaining session, then the most different from what's already selected, repeat until 10 selected.

**Critical bypass lane:** Security violations, permission boundary breaches, and self-weakening attempts are always included in diagnosis regardless of coreset sampling. Minimum HIGH risk classification.

### 4.3 Dual Diagnosis

**Self-validation** — "Did the harness actually work?"
- For each intervention: was there an existing rule, skill, or check that should have prevented this?
- For each tool failure: was there a recovery path the system should have taken?
- For each entropy signal: was there a verification step that should have caught this?
- Output: list of **harness gaps**

**Self-consistency** — "Are similar tasks handled the same way?"
- Group sessions by task domain and compare: do similar bug fixes invoke the same skills? Do similar client tasks load the same roles? Do similar code changes get the same verification treatment?
- Output: list of **drift signals**

### 4.4 Root Cause Classification

Each gap and drift signal classified to a harness component:

| Classification | What it means |
|---|---|
| `rule_gap` | No CLAUDE.md rule covers this case |
| `skill_gap` | Mandatory skill table doesn't catch this scenario |
| `skill_deficiency` | Skill exists but its instructions miss this pattern |
| `role_gap` | Role AGENT.md lacks knowledge needed for this domain |
| `hook_gap` | No hook captures/prevents this class of error |
| `memory_decay` | A feedback memory or brain module is stale/wrong |
| `routine_gap` | No scheduled check covers this |
| `context_failure` | Right information existed but wasn't loaded |

### 4.5 Failure Code Enumeration

Each diagnosis assigns an enumerated failure code. These are deterministic keys for anti-regression tracking.

```yaml
failure_codes:
  # Verification failures
  - verification_skipped
  - verification_insufficient
  - false_positive_verification

  # Skill/routing failures
  - mandatory_skill_skipped
  - wrong_skill_selected
  - skill_instruction_gap

  # Context/memory failures
  - context_not_loaded
  - stale_memory_trusted
  - context_overload

  # Role failures
  - role_not_dispatched
  - role_knowledge_gap

  # Tool/execution failures
  - tool_misuse
  - tool_failure_no_recovery
  - test_mock_misuse

  # Permission/safety failures
  - unsafe_action_not_caught
  - approval_gate_missed

  # Entropy failures
  - code_residue_left
  - test_integrity_weakened
  - docs_drift
  - architecture_violation

  # Harness meta-failures
  - redaction_miss
  - bad_path_classification
  - manual_edit_collision
  - log_parse_corruption
  - proposal_applied_without_review
```

The enumeration is extensible via BLOCKED_TO_APPLY proposals (Glen approves new codes).

### 4.6 Bootstrap

The first diagnosis cycle does not wait for hook data. A one-time normaliser processes existing data:

- **Session logs** (20+ files): parsed into structured records with `source_file`, `source_line`, `confidence` (high/medium/low based on structural completeness), `parse_warnings`
- **Feedback memories** (25+ files): parsed from frontmatter into intervention-equivalent records
- **Git history**: commit messages and diff stats mapped to task domain and scope

Bootstrap records tagged `source: bootstrap`. The first cycle accepts whatever it produces, noise included. Noisier signals get lower difficulty scores and contribute less to coreset selection.

---

## 5. Proposal Engine

### 5.1 Proposal Schema

```json
{
  "id": "RHO-2026-W24-003",
  "created": "2026-06-09T08:00:00Z",
  "classification": "skill_deficiency",
  "failure_code": "test_mock_misuse",
  "target_file": ".claude/skills/test-driven-development/SKILL.md",
  "risk": "LOW",
  "evidence": [
    "evt_01JXYZ...:intervention:2026-06-04",
    "evt_01JABC...:intervention:2026-06-06"
  ],
  "diagnosis": "TDD skill doesn't specify when integration tests should use real DB vs mocks. Glen corrected this twice in 3 days.",
  "proposed_change": "Add section: 'For dashboard-server endpoints that touch PostgreSQL, always write integration tests against the real database. Never mock pg.'",
  "diff_preview": "+ ## Integration Test Scope\n+ For dashboard-server endpoints...",
  "content_hash": "sha256:a1b2c3d4...",
  "anti_regression": {
    "key": ["skill_routing", "skill_deficiency", "dashboard", "test_mock_misuse", "RHO-2026-W24-003"],
    "check": "Next dashboard DB test uses real pg connection"
  },
  "status": "pending"
}
```

Proposal files are immutable after creation. The `status` field in the JSON is the initial status at creation time (`pending`). All subsequent status transitions are tracked as events in `.claude/harness/data/proposal_status.jsonl`, not as mutations to the proposal file. The `content_hash` is SHA-256 of the proposal file content.

**Proposal status event schema:**

```json
{
  "event_id": "pse_01JXYZ...",
  "proposal_id": "RHO-2026-W24-003",
  "proposal_hash": "sha256:a1b2c3d4...",
  "ts": "2026-06-09T10:00:00Z",
  "actor": "applier|glen|recorder",
  "from_status": "pending",
  "to_status": "applied",
  "reason": "LOW auto-apply, all checks passed"
}
```

**Valid status transitions:**

| From | To | Actor |
|---|---|---|
| `pending` | `applied` | applier (LOW) or applier after glen approval (HIGH) |
| `pending` | `approved` | glen |
| `pending` | `rejected` | glen (reason required) |
| `pending` | `superseded` | recorder (newer proposal replaces this one) |
| `approved` | `applied` | applier |
| `applied` | `validated_by_evidence` | recorder (anti-regression confirmed) |
| `applied` | `validated_by_absence` | recorder (no recurrence, no evidence) |
| `applied` | `regressed` | recorder (failure recurred) |
| `regressed` | `rollback_proposed` | recorder (revert proposal created) |

Any transition not in this table is rejected. Duplicate transitions (same proposal_id + to_status) are idempotent (logged but ignored). Current status is derived by reading the latest event per proposal_id, ordered by `ts`.

### 5.2 Risk Classification

Deterministic policy engine in `.claude/harness/config/risk_policy.yaml`.

**LOW (auto-apply by Applier):**
- Adding checks/sections to existing skill SKILL.md files (additive_only)
- Adding knowledge entries to role AGENT.md (knowledge_section_only)
- Creating new feedback memory files (with harness_rho tag)
- Adding index entries to MEMORY.md
- Flagging stale memories for review
- Updating `last_verified` dates on brain modules

**HIGH (Glen approves, then Applier executes):**
- CLAUDE.md structural edits (including mandatory skill table rows)
- Hook behaviour changes (new hooks, modified matchers)
- Routine schedule changes
- Role dispatch routing table changes
- Skill creation or deletion
- Full AGENT.md edits (beyond knowledge sections)
- Any proposal where diagnosis confidence < 70% (fewer than 3 supporting evidence events)

**BLOCKED_TO_APPLY (Glen applies manually from generated diff):**
- `.claude/harness/config/**` (risk policy, redaction rules, failure codes)
- `.claude/harness/` decision logic or engine code
- Removing any HARD RULE from CLAUDE.md or feedback memories
- Disabling a mandatory skill invocation
- Removing an approval gate
- Any redaction rule change, including tightening or loosening (explicit override of config path catch-all)
- Self-weakening attempts (proposals that reduce verification requirements or loosen permission boundaries)

### 5.3 Apply Flow

**LOW auto-apply:**
1. Recorder creates immutable proposal in `.claude/harness/proposals/YYYY-WNN/`
2. Risk engine classifies as LOW
3. Applier reads proposal, verifies `content_hash` matches file content
4. Applier computes actual diff, extracts target paths, validates each against apply allowlist
5. Applier checks clean-worktree for target file (abort if dirty, log `blocked_dirty_worktree`)
6. Applier applies change to target file
7. Applier appends entry to `changelog.md` with proposal ID, content hash, target path
8. Applier stages exact paths, commits with prefix `harness(rho):`
9. Next session's opening message: "Harness update applied: [one-line summary]"

**HIGH Glen-approved:**
1. Steps 1-2 as above
2. Proposal stored in weekly digest at `.claude/harness/proposals/YYYY-WNN/DIGEST.md`
3. Digest surfaced in Monday briefing or next session
4. Glen reviews: approves (with proposal_id + content_hash), rejects (with reason), or modifies
5. On approval: Applier verifies content_hash matches, then steps 4-9 as LOW
6. Rejected proposals: `status: rejected` with Glen's reason. Rejection becomes training data for future cycles.

**BLOCKED_TO_APPLY:**
1. Steps 1-2 as above
2. Recorder generates a diff and writes it to the proposal file
3. Proposal surfaced to Glen in digest
4. Glen manually reviews and applies (or delegates)

### 5.4 Auto-Commit Guard and Commit Scope

Before committing, the Applier checks:
1. `git status` shows no unrelated tracked changes outside harness scope
2. No uncommitted changes within harness scope from manual edits (abort with `blocked_manual_edits_present`)

**Commit sets per apply type:**

**LOW auto-apply commit:** Single atomic commit containing:
- The target file(s) modified by the proposal
- `.claude/harness/changelog.md` (append entry)
- `.claude/harness/data/proposal_status.jsonl` (status transition event)
- Commit message: `harness(rho): [proposal_id] [one-line summary]`

**HIGH Glen-approved commit:** Same commit set as LOW. The proposal JSON and digest were already committed separately when created by the Recorder.

**Recorder commit (separate from Applier):** When the weekly routine runs, the Recorder commits:
- `.claude/harness/proposals/YYYY-WNN/*.json` (new proposal files)
- `.claude/harness/proposals/YYYY-WNN/DIGEST.md`
- `.claude/harness/HARNESS_HEALTH.md`
- `.claude/harness/data/` (new event files, entropy trend, candidate signals)
- Commit message: `harness(rho): weekly diagnosis YYYY-WNN`

Recorder and Applier commits are always separate. The Applier never stages Recorder outputs and vice versa.

**Dirty-tree preflight (both principals):**

Before staging, the committing principal checks `git status` for each file it intends to stage:
1. If the file has unstaged changes not introduced by this principal: **abort** with `blocked_dirty_owned_path`. Do not stage, do not commit.
2. If the file has staged changes from a prior operation: **abort** with `blocked_pre_staged_content`.
3. If any file outside the principal's owned paths is staged: **abort** with `blocked_foreign_staged_content`.

Only after all owned paths pass the preflight does the principal stage and commit. This prevents accidental inclusion of manual edits or cross-principal contamination.

---

## 6. Anti-Regression

### 6.1 Tracking Key

Every applied proposal carries an anti-regression key:

```
(harness_component, classification, task_domain, failure_code, fix_id)
```

Example: `(skill_routing, skill_deficiency, dashboard, test_mock_misuse, RHO-2026-W24-003)`

### 6.2 Monitoring

Each weekly cycle checks all applied proposals:
- **Recurrence within 4 weeks of fix:** Same `(component, classification, domain, failure_code)` tuple appears in new events. The fix was insufficient. Escalate to stronger proposal (promote LOW to HIGH if needed).
- **No recurrence for 4 weeks, with evidence:** At least one successful instance of the same task type completed without the failure recurring. Status: `validated_by_evidence` (strong).
- **No recurrence for 4 weeks, without evidence:** Task type didn't come up. Status: `validated_by_absence` (weak). Re-checked if the task type eventually recurs.

### 6.3 Revert Proposals

When anti-regression detects a fix is harmful (introduces new interventions or entropy spikes), the system generates a **rollback proposal** with evidence. Even reverting a low-risk change goes through the full proposal pipeline. No automated reverts.

---

## 7. Entropy Auditing

### 7.1 Fast Scan (Every Session)

Runs at end-of-session or before 75% context handoff. Target: <15 seconds.

| Dimension | Check method | Severity trigger |
|---|---|---|
| Code residue | `git diff` scan for: `console.log`, `debugger`, `TODO` added, commented-out blocks, unused imports | Any found = 1; >3 = 2 |
| Test integrity | `git diff` on test files: assertions removed/weakened, `.skip` added, expect count decreased | Any weakened = 3 |
| File residue | New files not referenced by any other changed file, temp files, debug scripts | Orphaned file = 1 |
| Dependency hygiene | New `require()`/`import` — is the dependency used in new code? | Unused import = 1 |

### 7.2 Slow Scan (Weekly)

Runs as part of the diagnosis routine. Full file reads, heuristic analysis.

| Dimension | Check method | Severity trigger |
|---|---|---|
| Architecture consistency | New code follows established patterns (route registration, error handling, naming) | Deviation = 2 |
| Documentation drift | Modified files with stale JSDoc/README/inline doc references | Stale ref = 2 |
| Workflow state | Session log updated? Live state files current? Pending tasks accurate? | Missing update = 2 |

### 7.3 Composite Score

```
entropy_score = sum(severity per signal)
```

Tracked in `.claude/harness/data/entropy_trend.jsonl`. Rising trends (3+ sessions increasing) trigger diagnosis. Spikes (single session > 6) cross-referenced with session events.

### 7.4 No Negative Assurance

"No entropy signals detected in fast scan" does NOT mean "codebase is clean." The fast scan uses pattern matching on git diffs. It systematically cannot detect: semantic test weakening, renamed bypasses, generated-file drift, dependency behaviour changes where diff text looks harmless. Coverage limitations documented in HARNESS_HEALTH.md.

---

## 8. Memory Conflict Handling

### 8.1 Harness-Generated Memories

All memories created by the harness include in frontmatter:

```yaml
source: harness_rho
auto_generated: true
generated_by: RHO-2026-W24-003
```

### 8.2 Conflict Detection

When a `source: harness_rho` memory targets the same `name:` slug or `description:` domain as an explicit Glen memory, the proposal is automatically classified as HIGH regardless of the risk policy's initial classification.

### 8.3 Priority

Glen's explicit memories always take priority over harness-generated memories. If they conflict on the same topic, the harness-generated memory is surfaced for review in the weekly digest with a `conflict_with: [glen_memory_name]` flag.

---

## 9. Reporting

### 9.1 HARNESS_HEALTH.md

Generated weekly by the Recorder. Contains:

- **Trend lines:** Entropy score (4-week rolling), intervention rate, proposal acceptance rate, false positive rate
- **Open proposals:** Pending HIGH and BLOCKED_TO_APPLY proposals awaiting Glen's review
- **Validation states:** Applied fixes and their anti-regression status
- **Event volume:** Events captured this week by type
- **Data quality warnings:** Corruption events, redaction hits, candidate signals awaiting corroboration
- **Blocked attempt log:** Any write attempts denied by the role-to-path matrix
- **What's working well:** Stable harness components with low intervention rate and validated fixes. Higher scrutiny for proposed changes to these components.
- **Coverage limitations:** What the fast entropy scan cannot detect

### 9.2 changelog.md

Append-only, Applier-written. Every applied change recorded with:

```
## [RHO-2026-W24-003] 2026-06-09
- Classification: skill_deficiency
- Failure code: test_mock_misuse
- Target: .claude/skills/test-driven-development/SKILL.md
- Risk: LOW (auto-applied)
- Content hash: sha256:a1b2c3d4...
- Change: Added integration test guidance for dashboard-server DB tests
- Evidence: evt_01JXYZ..., evt_01JABC...
- Anti-regression key: skill_routing/skill_deficiency/dashboard/test_mock_misuse
```

### 9.3 Weekly Proposal Digest

Generated at `.claude/harness/proposals/YYYY-WNN/DIGEST.md`. Human-readable summary of all proposals from this cycle, grouped by risk level. Surfaced in Monday briefing or next session.

---

## 10. File Layout

```
.claude/harness/
  config/
    risk_policy.yaml         # Deterministic risk classification rules
    redaction.yaml           # Do-not-log patterns and retention policy
    failure_codes.yaml       # Enumerated failure code list
    entropy_checks.yaml      # Fast/slow scan patterns and severity thresholds
    section_boundaries.yaml  # Markdown section rules for constraint checking
    write_matrix.yaml        # Role-to-path write matrix (Section 2.4)
  data/
    events/
      YYYY-MM-DD/
        <session_id>.jsonl   # Per-session event streams
    entropy_trend.jsonl      # Composite entropy scores over time
    candidate_signals.jsonl  # Unconfirmed transcript-parsed interventions
    proposal_status.jsonl    # Status transitions for proposals (append-only)
    .locks/
      write.lock             # Short-lived file lock (git-ignored)
  proposals/
    YYYY-WNN/
      RHO-YYYY-WNN-NNN.json # Immutable proposal files
      DIGEST.md              # Weekly human-readable digest
  changelog.md               # Append-only apply history (Applier-written)
  HARNESS_HEALTH.md          # Weekly generated health report (Recorder-written)
```

---

## 11. Integration Points

### 11.1 Existing Hooks (Extended)

| Hook | Extension |
|---|---|
| `gsd-prompt-guard.js` | Emit `skill_usage` events |
| `gsd-context-monitor.js` | Emit `context_pressure` events |
| PostToolUse (all tools) | Emit `tool_outcome` events |
| git commit hook | Emit `entropy_signal` events (fast scan) |

### 11.2 New Hooks

| Hook | Type | Purpose |
|---|---|---|
| `harness-write-guard` | PreToolUse (Write/Edit) | Enforce role-to-path write matrix |
| `harness-entropy-scan` | PostToolUse (git commit) | Fast entropy scan on committed changes |
| `harness-session-end` | SessionEnd | Transcript parser for candidate interventions |

### 11.3 New Skill

`/harness intervention` — Explicit command to flag an intervention during a session. Creates a confirmed intervention event.

### 11.4 New Routine

Weekly harness improvement routine (Monday alongside system audit):
- Read events since last cycle
- Run coreset selection + dual diagnosis
- Generate proposals
- Apply LOW changes
- Generate HARNESS_HEALTH.md and weekly digest
- Run anti-regression checks

### 11.5 Coordination Bridge

The NBIAI Coordination Bridge (cloned from Arthrea Coordination Bridge) enables cross-AI review of proposals and design decisions. Located at `D:\OneDrive\NBIAI_Coordination`. Used for:
- Peer review of HIGH and BLOCKED_TO_APPLY proposals before Glen's review
- Adversarial critique of proposed harness changes
- Design convergence on structural modifications

---

## 12. v1 vs v2 Boundary

**v1 (build now):**
- Logical principal separation via CLAUDE.md rules + hooks
- Deterministic risk policy engine
- Content-hash approval binding
- Diff-based Markdown constraint checking
- Tagged auto-generated memories with conflict detection
- Split audit logs (event data vs apply changelog)
- Bootstrap normaliser for existing data
- NBIAI Coordination Bridge for cross-AI review

**v2 (build if v1 proves value):**
- Process-level principal isolation (separate tools/permissions)
- Canonical path resolution and symlink rejection
- Full Markdown AST constraint checking
- Embedding-based failure mode clustering for anti-regression
- Multi-round iterative diagnosis (RHO paper's candidate generation loop)
- Automated coreset size tuning based on event volume
- Cross-project harness portability (package for client delivery)
