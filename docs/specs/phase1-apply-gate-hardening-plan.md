# Phase 1: Apply-Gate Hardening — Implementation Plan (Rev 3)

**Date:** 2026-06-17
**Revision:** 3 (addressing Round 2 Codex findings: 2 CRITICAL, 4 HIGH, 3 MEDIUM new + 10 partial)
**Target files:** `.claude/harness/lib/apply-gate.js`, `.claude/harness/lib/risk-classify.js`, `.claude/harness/lib/proposal-utils.js` (new), `.claude/harness/config/risk-policy.json`
**Risk:** BLOCKED_TO_APPLY (engine code + config — Glen must approve every file)
**Controlling spec:** docs/specs/2026-06-08-harness-improvement-system-design.md (locked)
**Completion design:** docs/specs/2026-06-17-rho-completion-design.md

---

## Codex Rev 1 Findings Addressed

| # | Severity | Finding | How addressed |
|---|---|---|---|
| 1 | CRITICAL | Content-hash binds wrong artefact, optional | Apply-gate now consumes proposal JSON file; hash binds entire proposal; mandatory for new proposals |
| 2 | CRITICAL | Risk classification path-only, can't support constraints | risk-classify.js made operation-aware; HIGH rules with action field only match when operation matches |
| 3 | CRITICAL | Edit writes before validating | Validate-before-write for ALL constraints; in-memory diff comparison |
| 4 | CRITICAL | Revert can destroy concurrent edits | Eliminated; validate-before-write means no revert needed |
| 5 | HIGH | Shell injection via execSync | All git commands use execFileSync/spawnSync with argument arrays |
| 6 | HIGH | Operation modes not enforced | Mode enforcement added (edit_existing_only, create_new_or_edit_existing, append_only) |
| 7 | HIGH | append_only not implemented | Added as a constraint validator |
| 8 | HIGH | Missing constraint = allow | Missing constraint on LOW target-based rule = block |
| 9 | HIGH | Evidence unauthenticated | Basic validation: evidence IDs must be syntactically valid ULIDs that exist in event files |
| 10 | HIGH | Dirty-tree preflight underspecified | Full spec per parent spec section 5.4 with three abort conditions |
| 11 | HIGH | Memory edits not validated | Frontmatter validation on both create and edit |
| 12 | MEDIUM | generated_by missing | Added to required frontmatter fields |
| 13 | MEDIUM | knowledge_section_only fragile | In-memory line-by-line diff against correct file version |
| 14 | MEDIUM | Section ambiguity not defined | Explicit ambiguity cases enumerated |
| 15 | MEDIUM | Index-entry inconsistent | Correct dash character, filename constraints, path traversal check |
| 16 | MEDIUM | Not atomic | Document atomic commit as caller responsibility; gate returns written paths |
| 17 | MEDIUM | Test plan incomplete | Tests added for all production-critical paths |
| 18 | LOW | Parent reference drift | Both specs named explicitly |

## Codex Rev 2 Findings Addressed

| # | Status from R2 | Finding | How addressed in Rev 3 |
|---|---|---|---|
| 1 | PARTIAL | Hash canonicalisation undefined | Canonical JSON: keys sorted alphabetically, no whitespace, content_hash="" before hashing |
| 2 | PARTIAL | AGENT.md HIGH path removed | ~~Restored with create_or_delete~~ SUPERSEDED by Rev 3b: HIGH rule removed; LOW catches all ops; gate mode enforcement blocks create/delete |
| 6 | PARTIAL | edit_existing_only allows append | Fixed: edit_existing_only = edit only; append requires append_only mode |
| 7 | PARTIAL | append_only self-contradiction | Fixed: removed conflicting tests; changelog is cadence-written not gate-written |
| 8 | PARTIAL | Gate trusts proposal.constraint | Fixed: gate derives constraint from matched policy rule; cross-checks proposal field |
| 9 | PARTIAL | Evidence semantic auth outside v1 | Accepted as v1 limitation; documented |
| 10 | PARTIAL | Preflight ordering inconsistent | Fixed: preflight runs after all writes, before any staging |
| 13 | PARTIAL | Section-diff underspecified | Fixed: explicit algorithm defined (section-aware content comparison) |
| 16 | PARTIAL | Crash window | Accepted as v1 limitation; documented |
| 17 | PARTIAL | Test gaps | Fixed: tests added for constraint derivation, cross-check, hash stability, preflight order |
| 19 | CRITICAL (new) | Gate trusts proposal.constraint | Same as #8: derive from policy, cross-check, mismatch = block |
| 20 | CRITICAL (new) | HIGH AGENT.md path removed | ~~Same as #2~~ SUPERSEDED: HIGH rule removed; mode enforcement handles create/delete |
| 21 | HIGH (new) | actionMatches unknown = match | Fixed: unknown action = no match (fail closed) |
| 22 | HIGH (new) | Action-only rules dead | Documented: action-only rules are cadence-prompt-level routing, not path classification |
| 23 | HIGH (new) | Evidence format conflict | Fixed: accept both bare `evt_ID` and suffixed `evt_ID:type:date` |
| 24 | HIGH (new) | edit_existing_only redefined | Same as #6 |
| 25 | MEDIUM (new) | Changelog ownership ambiguous | Fixed: changelog is cadence-written; gate handles target file only |
| 26 | MEDIUM (new) | Preflight timing ambiguous | Same as #10 |
| 27 | MEDIUM (new) | Proposal cross-check thin | Fixed: gate verifies all proposal fields match classifier output |

## Codex Rev 3 Findings Addressed

| # | Status from R3 | Finding | How addressed in Rev 3b |
|---|---|---|---|
| 2/20 | STILL OPEN | AGENT.md HIGH path uses escalation not direct classification | Accepted: escalation is the correct flow per spec. HIGH rule removed; fail-safe catches create/delete. |
| 9 | STILL OPEN | Evidence semantic auth | Accepted as v1 limitation, documented |
| 22 | STILL OPEN | Action-only rules dead | Documented as cadence-prompt scope; tests deferred to Phase 8 |
| 20 (new) | CRITICAL | --approved hash is forgeable | Fixed: --approved removed from Phase 1 entirely; deferred to Phase 3 with secure mechanism |
| 21 (new) | HIGH | HIGH apply skips classification | Fixed: same as above; Phase 3 will preserve all validation except constraint |
| 22 (new) | HIGH | Role create/delete contradicts spec | Fixed: removed create_or_delete for roles; fail-safe (no matching rule → HIGH) handles correctly |

---

## Prerequisite: Operation-Aware Risk Classification

### Problem

`risk-classify.js` evaluates `target_file` only. The `findMatch` function checks each rule's `target` glob but ignores the `action` field. This means:

- `.claude/skills/compile-bank/SKILL.md` matches HIGH rule `.claude/skills/**` (action: `create_or_delete`) before reaching LOW rule `.claude/skills/**/SKILL.md` (constraint: `additive_only`)
- `roles/senior_engineer/AGENT.md` matches HIGH rule `roles/*/AGENT.md` (constraint: `full_edit`) before reaching LOW rule `roles/*/AGENT.md` (constraint: `knowledge_section_only`)

The apply-gate can never reach LOW for these targets. The entire constraint enforcement path is dead.

### Fix: risk-classify.js

Add `operation` to the classify input: `{ target_file, evidence, operation }`.

Change `findMatch` to skip rules where the `action` field doesn't match the operation:

```js
function actionMatches(ruleAction, operation) {
  if (!ruleAction) return true;  // no action field = matches all operations
  const actionMap = {
    'create_or_delete': ['create', 'delete'],
    'create_or_edit': ['create', 'edit'],
    'create_or_edit_or_delete': ['create', 'edit', 'delete'],
  };
  const allowed = actionMap[ruleAction];
  if (!allowed) return false;  // unknown action string = no match (fail closed)
  return allowed.includes(operation);
}

function findMatch(rules, targetFile, operation) {
  if (!Array.isArray(rules)) return null;
  for (const rule of rules) {
    if (!rule.target) continue;
    if (!matchGlob(targetFile, rule.target)) continue;
    if (!actionMatches(rule.action, operation)) continue;
    return rule;
  }
  return null;
}
```

With this fix:
- `classify({ target_file: '.claude/skills/compile-bank/SKILL.md', operation: 'edit', evidence: [...] })` → HIGH rule `.claude/skills/**` has `action: create_or_delete` which doesn't match `edit` → skipped → LOW rule `.claude/skills/**/SKILL.md` matches → returns LOW with constraint `additive_only`
- `classify({ target_file: '.claude/skills/compile-bank/SKILL.md', operation: 'create', evidence: [...] })` → HIGH rule matches → returns HIGH (correct: creating a new skill requires Glen approval)

### Fix: risk-policy.json

No structural changes needed. The existing `action` fields already express the right semantics. But verify that every rule's `action` field is correct:

| Tier | Target | Action | Meaning |
|---|---|---|---|
| LOW | `.claude/skills/**/SKILL.md` | (none) | Matches edit/append/create — constraint `additive_only` prevents dangerous ops |
| LOW | `roles/*/AGENT.md` | (none) | Matches edit/append — constraint `knowledge_section_only` limits scope |
| HIGH | `.claude/skills/**` | `create_or_delete` | Only matches creates and deletes |
| HIGH | `roles/*/AGENT.md` | (none, has `constraint: full_edit`) | Matches all ops — but only reached if LOW didn't match first |

Wait — the LOW `roles/*/AGENT.md` and HIGH `roles/*/AGENT.md` have the same target glob. With operation-aware matching and no `action` filter on either, the HIGH rule still matches first (BLOCKED > HIGH > LOW precedence). The HIGH rule needs an `action` filter.

**Required risk-policy.json changes for HIGH rules:**

```json
{ "target": ".claude/skills/**", "action": "create_or_delete", "description": "Skill creation or deletion" }
```

The HIGH `roles/*/AGENT.md` rule with `constraint: full_edit` is **removed from risk-policy.json**. The parent spec's apply allowlist (section 2.3) only permits role file **edits**, not creates or deletes. Adding `create_or_delete` for roles would contradict the spec. Instead, the flow for role files is:

- AGENT.md edit → LOW matches → constraint: `knowledge_section_only`
- If edit only touches knowledge sections → auto-apply
- If edit touches non-knowledge sections → `blocked_knowledge_section_violation` → cadence escalates to HIGH → Glen reviews
- HIGH-approved AGENT.md edits are applied in Phase 3 (deferred, see above)
- AGENT.md create/delete → LOW matches (the LOW rule has no action filter) → classifier returns LOW → gate checks mode `edit_existing_only` → blocks with `blocked_operation_mode_violation` → cadence escalates to HIGH. This correctly prevents auto-apply of role file creation/deletion.

**Important:** The cadence prompt MUST treat any gate rejection (`blocked_*`) as a HIGH escalation trigger, not just constraint violations. Mode violations, evidence failures, and dirty-worktree blocks all mean the proposal cannot be auto-applied and needs Glen's review.

**HIGH-approved proposal application is OUT OF SCOPE for Phase 1.**

Phase 1 builds the LOW auto-apply path only. When a LOW proposal fails constraint validation (e.g., AGENT.md edit touches non-knowledge sections), the gate blocks it and the cadence prompt surfaces it as HIGH in the weekly digest. Glen reviews and approves (or rejects).

The approved-apply path (how Glen's approval translates into a mechanical write) is deferred to Phase 3 (Write-Guard Completeness), which extends the write-guard to cover governed targets during cadence runs. That phase will define a secure approval mechanism that cannot be forged by the agent. The parent spec (section 5.3) requires approved proposals to go through the same validation steps (content-hash, path, evidence) after approval, with only the constraint check relaxed.

**Why no `--approved` flag in Phase 1:** Any deterministic approval hash (e.g., `SHA256(proposal_id + content_hash + "approved")`) is forgeable by the agent. Secure approval requires either Glen's interactive confirmation during the cadence run, or a signed approval token from a channel the agent cannot access. This is a Phase 3 design problem.

**Action-only policy rules** (e.g., `flag_stale_memory`, `update_last_verified`, `routine_schedule_change`, `role_dispatch_change`) have no `target` field. The classifier's `findMatch` already skips rules without a `target` (risk-classify.js:41). These rules are cadence-prompt-level routing indicators, not path-based classification. They do not flow through the apply-gate. The cadence prompt reads these rules from risk-policy.json to determine which non-file actions are LOW vs HIGH, but the gate has no role in this. Tests for action-only routing belong in the cadence prompt's test suite (Phase 8), not the apply-gate tests.

---

## Redesigned Apply-Gate Interface

### Input: Proposal JSON File

The apply-gate no longer accepts raw stdin + path. It consumes a **proposal JSON file**:

```
node apply-gate.js <proposal_json_path>
```

The proposal file contains:

```json
{
  "proposal_id": "P005",
  "target_file": ".claude/skills/compile-bank/SKILL.md",
  "operation": "edit",
  "content": "<full new file content for edit, or content to append, or content to create>",
  "content_hash": "sha256:<hex of this entire JSON with content_hash set to empty string>",
  "evidence": ["evt_01JXYZ...", "evt_01JABC...", "evt_01JDEF..."],
  "risk": "LOW",
  "constraint": "additive_only"
}
```

The gate:
1. Reads the proposal file
2. Recomputes content_hash using **canonical JSON serialisation** (keys sorted alphabetically, no whitespace, `content_hash` value set to `""` before hashing) and verifies SHA-256 matches
3. Extracts target, operation, content, evidence from the proposal
4. Runs risk classification with target + operation + evidence → gets matched_rule with **derived constraint**
5. **Cross-checks proposal fields against classifier output:**
   - `proposal.risk` must match `classification.risk` (Phase 1 only processes LOW; HIGH proposals are surfaced in digest, not applied)
   - `proposal.constraint` must match `matched_rule.constraint` (informational field, not trusted for enforcement)
   - `proposal.target_file` must match the canonical path
   - Any mismatch → block with `blocked_proposal_policy_mismatch`
6. The **derived constraint** from the matched policy rule (NOT the proposal's claimed constraint) is used for enforcement
7. Proceeds with validation and write

**Legacy support:** For P001-P004 (markdown proposals without JSON), the cadence prompt must construct a temporary proposal JSON from the markdown file before calling the gate. This is the cadence prompt's responsibility, not the gate's.

### Operations

| Operation | Spec mode | Behaviour |
|---|---|---|
| `create` | File must NOT exist | Write new file |
| `append` | File MUST exist | Append content to existing file |
| `edit` | File MUST exist | Replace file content entirely |

### Mode Enforcement

Before any write, verify the operation is compatible with the spec's mode for the target:

| Risk-policy target | Spec mode | Allowed operations |
|---|---|---|
| `.claude/skills/**/SKILL.md` | `edit_existing_only` | edit |
| `roles/*/AGENT.md` | `edit_existing_only` | edit |
| `memory/feedback_*.md` | `create_new_or_edit_existing` | create, edit |
| `memory/MEMORY.md` | `append_only` | append |

Block with `blocked_operation_mode_violation` if the operation doesn't match.

**Note:** `edit_existing_only` does NOT allow `append`. For skill and role files, the cadence prompt uses `edit` operation with full new file content (existing content + additions). This is how "appending a section" works: the proposal contains the complete new file, and the `additive_only` / `knowledge_section_only` constraint validates that only additions were made.

**Note:** `changelog.md` is NOT an apply-gate target. The cadence prompt writes changelog entries directly after the gate succeeds (see Atomicity section). The LOW rule for changelog in risk-policy.json exists for classification purposes only.

The `mode` field is added to each LOW target-based rule in risk-policy.json:

```json
{ "target": ".claude/skills/**/SKILL.md", "constraint": "additive_only", "mode": "edit_existing_only" },
{ "target": "roles/*/AGENT.md", "constraint": "knowledge_section_only", "mode": "edit_existing_only" },
{ "target": "memory/feedback_*.md", "constraint": "frontmatter_schema_required", "mode": "create_new_or_edit_existing" },
{ "target": "memory/MEMORY.md", "constraint": "index_entry_only", "mode": "append_only" }
```

---

## Validate-Before-Write Architecture

**No write-then-revert.** All constraint validation happens before any disk write.

### Flow

```
 1. Read proposal JSON, verify content_hash
 2. Extract fields: target, operation, content, evidence, constraint
 3. Canonicalise target path, verify within project root
 4. Block governed paths (harness config/lib/tests/settings)
 5. Risk classification (operation-aware) → must return LOW
 6. Evidence validation: each ID is valid ULID format, exists in event files
 7. Mode enforcement: operation compatible with target's spec mode
 8. Clean-worktree check (execFileSync git status)
 9. Pre-write constraint validation:
    a. ALL constraints validated before any write
    b. For edit/append: read current file from disk (old content)
    c. Compute in-memory diff between old and new content
    d. Run constraint validator on the diff
10. If all validation passes: perform the write (create/append/edit)
11. Return { ok: true, paths_written: [target], constraint, operation }
```

### Constraint Validators (all operate on in-memory content, no git commands)

**a. additive_only**
- Compare old content and new content line-by-line
- Every line in old content must appear in new content in the same relative order
- New content may have additional lines inserted anywhere
- If any old line is removed or modified: block with `blocked_additive_only_violation`
- For `create` operations: always passes (no old content)

**b. knowledge_section_only**

Algorithm:
1. Parse both old and new content into **section maps**: `{ heading: content_lines[] }`. A section starts at a heading matching `heading_level_boundary` (## or #) and ends at the next heading of equal or higher level.
2. Load allowed heading patterns from `section-boundaries.json`.
3. For each section in the old file's map: if the corresponding section in the new file has different content, check if the heading matches any allowed pattern.
4. For each section in the new file's map that doesn't exist in the old file: check if its heading matches any allowed pattern. (New sections must be under allowed headings.)
5. If ANY section with changed or new content has a heading NOT in the allowed list: block with `blocked_knowledge_section_violation`.

**Ambiguity rules:**
  - No matching headings found in the file at all → block (fail closed, per section-boundaries.json `_usage`)
  - Multiple matching headings → allowed (all matching sections are valid targets)
  - Change to a heading line itself → block (headings are structural, not content)
  - Heading level jumps within matching section → allowed (###, #### under ## are fine)
  - Section removed entirely → block (removal is not additive knowledge)

**c. frontmatter_schema_required**
- Parse content for YAML frontmatter (between first `---` and second `---`)
- Required fields: `name` (string), `description` (string), `metadata.type` (string), `source: harness_rho`, `auto_generated: true`, `generated_by` (proposal ID string)
- For `edit` operations: re-validate frontmatter in the new content. All required fields must still be present and correct. `source: harness_rho` and `auto_generated: true` cannot be removed.
- Block with `blocked_frontmatter_invalid` if validation fails

**d. index_entry_only**
- Content must be exactly one line (plus optional trailing newline)
- Must match pattern: `- [<title>](<filename>.md) — <description>` where:
  - `<filename>` contains no slashes, no `..`, no null bytes
  - `<filename>` ends with `.md` (redundant check, but explicit)
  - The dash is `—` (em dash, U+2014) matching MEMORY.md's existing format
- Block with `blocked_index_format_invalid` if validation fails

**e. append_only**
- For `append` operations: always passes (append is inherently append-only)
- For `edit` and `create` operations: blocked by mode enforcement before reaching constraint validation (`append_only` mode only allows `append` operation). This constraint validator only runs for `append` operations, so it always passes. It exists for completeness and as defence-in-depth if mode enforcement is bypassed.

**f. Missing or unknown constraint**
- If matched rule has a `target` field but no `constraint` field: block with `blocked_missing_constraint` (policy bug, fail closed)
- If constraint is not one of the known validators: block with `blocked_unknown_constraint` (fail closed)
- Action-only rules (no `target` field, e.g., `flag_stale_memory`) are not matched by path-based classification and never reach the apply-gate

### Evidence Validation

Basic validation (v1 scope):
- Evidence entries may be bare IDs (`evt_01JXYZ...`) or suffixed (`evt_01JXYZ...:intervention:2026-06-04`) per parent spec section 5.1 examples
- The gate extracts the ID prefix: everything before the first `:`, or the full string if no `:`
- Each extracted ID must be prefixed with `evt_` followed by 20 Crockford Base32 characters (`[0-9A-HJKMNP-TV-Z]`)
- Each extracted ID must exist in at least one `.jsonl` event file under `.claude/harness/data/events/` (grep for the ID string)
- Block with `blocked_evidence_invalid` if any ID fails format or existence check

NOT in v1 scope: verifying events are confirmed, relate to the target domain, or belong to the proposing diagnosis cycle. These are cadence-prompt-level concerns. Documented as v1 limitation.

---

## Shell Safety

All git commands use `execFileSync` or `spawnSync` with argument arrays. Never pass paths through shell interpolation.

```js
// WRONG (shell injection risk):
execSync('git status --porcelain -- ' + targetPath)

// RIGHT:
execFileSync('git', ['status', '--porcelain', '--', targetPath], { cwd: PROJECT_DIR, ... })
```

This applies to: `git status`, `git diff`, `git checkout`, and any future git commands.

---

## Dirty-Tree Preflight

Exported utility function, called by the cadence prompt before staging:

```js
function dirtyTreePreflight(writtenPaths) {
  // 1. Run: git status --porcelain
  // 2. Parse output into { staged: [...], unstaged: [...] }
  // 3. For each file in writtenPaths:
  //    - If it has staged changes from a PRIOR operation (not this one):
  //      return { clean: false, reason: 'blocked_pre_staged_content', path }
  // 4. For any staged file NOT in writtenPaths:
  //    return { clean: false, reason: 'blocked_foreign_staged_content', path }
  // 5. For any unstaged tracked changes in files outside writtenPaths:
  //    return { clean: false, reason: 'blocked_dirty_owned_path', path }
  // 6. return { clean: true, paths: writtenPaths }
}
```

The preflight checks `writtenPaths` (returned by apply-gate) plus changelog and status JSONL paths (written by the cadence prompt after the gate succeeds).

---

## Atomicity

The apply-gate writes the target file ONLY. The cadence prompt writes changelog.md and proposal_status.jsonl. All three are committed atomically by the cadence prompt.

**Sequence (strict order):**

```
1. Cadence prompt calls apply-gate with proposal JSON path
   → Gate validates, writes target file, returns { ok, paths_written: [target] }
2. Cadence prompt appends changelog entry to .claude/harness/changelog.md
3. Cadence prompt appends status transition to .claude/harness/data/proposal_status.jsonl
4. ALL writes complete. Nothing further is written.
5. Cadence prompt calls dirtyTreePreflight([target, changelog, status])
   → Checks: no pre-staged content, no foreign staged files, no unrelated unstaged changes
6. If clean: git add <target> <changelog> <status>; git commit
7. If not clean: abort with reason (do NOT stage or commit)
```

**Preflight timing:** `dirtyTreePreflight` runs AFTER all writes (steps 1-3) but BEFORE any staging (step 6). It inspects `git status --porcelain` output. At this point, the written files appear as unstaged modifications. The preflight verifies no OTHER files are staged or modified.

**Crash window (v1 known limitation):** If a crash occurs between step 1 and step 6, the target has uncommitted changes with no status event or changelog entry. The next diagnosis cycle should detect this (file modified in working tree but no proposal_status event). Full crash recovery (write-ahead journal) is v2 scope.

---

## File Changes Summary

| File | Change | Risk |
|---|---|---|
| `.claude/harness/lib/risk-classify.js` | Add operation parameter, actionMatches function, update findMatch | BLOCKED_TO_APPLY |
| `.claude/harness/config/risk-policy.json` | Remove HIGH AGENT.md `full_edit` rule (create/delete blocked by gate mode enforcement, not classifier); add `mode` field to LOW rules | BLOCKED_TO_APPLY |
| `.claude/harness/lib/apply-gate.js` | Full rewrite: proposal JSON input, validate-before-write, all constraints, execFileSync, mode enforcement | BLOCKED_TO_APPLY |
| `.claude/harness/lib/proposal-utils.js` | New: content-hash computation, proposal schema validation, evidence ID validation | BLOCKED_TO_APPLY |
| `.claude/harness/tests/test-apply-gate.js` | New: full test suite | development_allowed |
| `.claude/harness/tests/test-risk-classify.js` | Update: add operation-aware tests | development_allowed |

---

## Test Plan

All tests create temporary git repos with controlled state. Tests use `execFileSync` for git operations (matching production code).

### risk-classify.js tests (additions to existing test file)

| Test | Input | Expected |
|---|---|---|
| T-RC1: skill edit reaches LOW | target: `.claude/skills/x/SKILL.md`, op: `edit`, evidence: 3 | risk: LOW, constraint: additive_only |
| T-RC2: skill create reaches HIGH | target: `.claude/skills/x/SKILL.md`, op: `create`, evidence: 5 | risk: HIGH (action: create_or_delete matches) |
| T-RC3: skill delete reaches HIGH | target: `.claude/skills/x/SKILL.md`, op: `delete`, evidence: 5 | risk: HIGH |
| T-RC4: AGENT.md edit reaches LOW | target: `roles/x/AGENT.md`, op: `edit`, evidence: 3 | risk: LOW, constraint: knowledge_section_only |
| T-RC5: AGENT.md create reaches LOW (gate blocks via mode) | target: `roles/x/AGENT.md`, op: `create`, evidence: 3 | risk: LOW, then gate blocks with blocked_operation_mode_violation |
| T-RC6: no operation param = match all | target: `CLAUDE.md`, op: undefined, evidence: 5 | risk: HIGH (matches as before) |
| T-RC7: backward compat — old tests pass | all existing tests | same results |

### apply-gate.js tests (new test file)

| Test | Scenario | Expected |
|---|---|---|
| T-AG1: valid proposal, create, frontmatter OK | create memory file with valid frontmatter + generated_by | PASS, file created |
| T-AG2: valid proposal, append, index entry OK | append valid `- [Title](file.md) — desc` to MEMORY.md | PASS, content appended |
| T-AG3: valid proposal, edit, additive only OK | edit skill file adding lines, no removals | PASS, file updated |
| T-AG4: edit with deletions | edit skill file removing a line | FAIL: blocked_additive_only_violation |
| T-AG5: edit under allowed heading | edit AGENT.md adding under ## Domain Knowledge | PASS |
| T-AG6: edit under wrong heading | edit AGENT.md adding under ## Core Responsibilities | FAIL: blocked_knowledge_section_violation |
| T-AG7: edit changing a heading line | edit AGENT.md changing heading text | FAIL: blocked_knowledge_section_violation |
| T-AG8: no matching headings in file | edit AGENT.md that has none of the allowed headings | FAIL: blocked_knowledge_section_violation (fail closed) |
| T-AG9: invalid frontmatter — missing name | create memory without `name` field | FAIL: blocked_frontmatter_invalid |
| T-AG10: invalid frontmatter — missing generated_by | create memory without `generated_by` | FAIL: blocked_frontmatter_invalid |
| T-AG11: frontmatter on edit — source removed | edit memory removing `source: harness_rho` | FAIL: blocked_frontmatter_invalid |
| T-AG12: malformed index entry — wrong dash | append with `--` instead of `—` | FAIL: blocked_index_format_invalid |
| T-AG13: index entry with path traversal | append with `- [T](../../etc/passwd.md) — x` | FAIL: blocked_index_format_invalid |
| T-AG14: content-hash mismatch | proposal with wrong content_hash | FAIL: blocked_content_hash_mismatch |
| T-AG15: content-hash correct | proposal with correct hash | PASS |
| T-AG16: dirty worktree | target has uncommitted changes | FAIL: blocked_dirty_worktree |
| T-AG17: operation mode violation — create on edit_existing_only | create operation on skill file target | FAIL: blocked_operation_mode_violation |
| T-AG18: operation mode violation — edit on append_only | edit MEMORY.md | FAIL: blocked_operation_mode_violation |
| T-AG19: operation mode violation — append on edit_existing_only | append to skill file | FAIL: blocked_operation_mode_violation |
| T-AG20: unknown constraint in policy | LOW rule with constraint: `foobar` | FAIL: blocked_unknown_constraint |
| T-AG21: missing constraint on target rule | LOW rule with target but no constraint field | FAIL: blocked_missing_constraint |
| T-AG22: evidence IDs valid and exist | proposal with 3 real event IDs (bare format) | PASS |
| T-AG23: evidence IDs suffixed format | proposal with `evt_ID:intervention:2026-06-14` | PASS |
| T-AG24: evidence ID doesn't exist | proposal with fabricated event ID | FAIL: blocked_evidence_invalid |
| T-AG25: evidence count < 3 | proposal with 2 events → classifier returns HIGH | FAIL: risk not LOW |
| T-AG26: shell metacharacter in filename | memory/feedback_$(whoami).md | PASS (execFileSync prevents injection) |
| T-AG27: governed path blocked | target under .claude/harness/lib/ | FAIL: governed path |
| T-AG28: validate-before-write confirmed | edit with constraint violation — file on disk is unchanged | file matches original content |
| T-AG29: constraint derived from policy not proposal | proposal claims constraint X, policy says Y | FAIL: blocked_proposal_policy_mismatch |
| T-AG30: proposal cross-check — risk mismatch | proposal claims LOW, classifier returns HIGH | FAIL: blocked_proposal_policy_mismatch |
| T-AG31: canonical hash stability | same proposal content → same hash regardless of key insertion order | PASS |
| T-AG34: dirtyTreePreflight clean | only written paths modified, nothing staged | { clean: true } |
| T-AG35: dirtyTreePreflight foreign staged | unrelated file staged before preflight | { clean: false, blocked_foreign_staged_content } |
| T-AG36: dirtyTreePreflight pre-staged | target already staged from prior op | { clean: false, blocked_pre_staged_content } |

---

## Implementation Order

1. **risk-classify.js** — add `operation` parameter, `actionMatches`, update `findMatch` and `classify`. Update existing tests. (~50 lines changed)
2. **risk-policy.json** — remove HIGH AGENT.md `full_edit` rule, add `mode` fields to LOW rules. (~10 lines changed)
3. **proposal-utils.js** — new module: content-hash computation, proposal schema validation, evidence ID existence check. (~120 lines)
4. **apply-gate.js** — full rewrite: proposal input, validate-before-write, all 6 constraint validators, mode enforcement, execFileSync, dirtyTreePreflight export. (~350 lines)
5. **test-risk-classify.js** — add operation-aware tests. (~40 lines)
6. **test-apply-gate.js** — new: 30 tests with temp git repos. (~500 lines)
7. Run full harness test suite, verify existing tests still pass.

---

## Known v1 Limitations

1. **Evidence authentication is basic** — checks ID format and file existence only, not semantic relation to proposal target. Full relation checking deferred to v2.
2. **Crash recovery is absent** — if a crash occurs between apply-gate write and commit, the target has uncommitted changes with no status event. Next diagnosis detects this. Full journalling is v2.
3. **Concurrent edit protection is best-effort** — clean-worktree check happens before write, but another process could modify the file between check and write. Single-machine single-user system makes this extremely unlikely. True file locking is v2.
4. **additive_only uses line-level comparison** — reordering lines counts as deletion+addition. This is stricter than necessary but safe. Semantic diff is v2.
