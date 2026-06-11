# Handoff — 2026-06-11 (Session 4: Harness Improvement System)

**Branch:** `feature/command-centre`
**Last commit:** check `git log -1` (auto-push hook active, should be in sync with GitHub)
**Session log:** `projects/nbi_dashboard/session_logs/2026-06-11_session.md` (Session 4 entry at bottom)

---

## What happened this session

### Context recovery
This session is a continuation from a conversation that compacted without writing a handoff. The context-guard hook (`.claude/hooks/context-guard.sh`) counts tool calls (threshold 200), not context tokens, so it didn't fire before the system auto-compacted. State was recovered from the auto-summary.

### Previous conversation produced (before compaction)
- **Locked spec:** `docs/specs/2026-06-08-harness-improvement-system-design.md` (~790 lines, 12 sections)
- **8 rounds of Codex review** via NBIAI Coordination Bridge at `D:\OneDrive\NBIAI_Coordination\`
  - 6 design rounds + 2 spec rounds
  - Review prompts in `D:\OneDrive\NBIAI_Coordination\scratch\harness-review-round*.json`
  - Review events in `D:\OneDrive\NBIAI_Coordination\state\events.jsonl`
- **Key design decisions from Codex review:**
  - Two-principal architecture (Recorder/Proposer + Applier) with separate write authorities
  - BLOCKED_TO_APPLY semantics for governance files (config, redaction, failure codes, engine code)
  - Enumerated failure codes (25 codes across 8 categories) for anti-regression tracking
  - Content-hash approval binding (SHA-256 of proposal verified at apply time)
  - Dirty-tree preflight per principal before staging
  - Candidate signal gating (unconfirmed transcript-parsed interventions excluded from auto-diagnosis)
  - Threat model: "AI makes an accidental mistake" not adversarial compromise
- Glen approved the locked spec with "y"

### This session's work
1. Updated session log (Session 4 entry) capturing state from compacted conversation
2. Read full spec, existing hooks (settings.json + settings.local.json), cadence infrastructure (run-cadence.ps1, prompts, register-tasks.ps1), and skill structure
3. Wrote comprehensive implementation plan: `docs/superpowers/plans/2026-06-11-harness-improvement-system.md`

---

## Implementation plan summary

**Location:** `docs/superpowers/plans/2026-06-11-harness-improvement-system.md`

**16 tasks**, organised as:

| Tasks | Group | What it builds |
|---|---|---|
| 1 | Scaffold | Directory structure, .gitignore, .gitkeep, changelog.md, HARNESS_HEALTH.md |
| 2 | Config | 6 JSON config files: write-matrix, redaction, failure-codes, risk-policy, entropy-checks, section-boundaries |
| 3-4 | Core utility | `emit-event.js` — ULID generation, session ID management, redaction, atomic JSONL append with file locking. Plus tests. |
| 5-6 | Write guard | `write-guard.js` — PreToolUse hook blocking writes to `.claude/harness/config/**` and `lib/**`. Plus tests. |
| 7 | Capture hooks | PostToolUse hooks for `tool_outcome` (Bash/PowerShell/Agent/Edit/Write) and `skill_usage` (Skill). Async, zero latency. |
| 8-9 | Entropy scan | `entropy-scan.js` — fast scan on git diffs for code residue, test integrity, file residue. Wired to PostToolUse on git commit. Plus tests. |
| 10 | Intervention skill | `/harness intervention` SKILL.md for explicit correction capture |
| 11 | Transcript parser | `transcript-parser.js` — scans session logs for candidate intervention signals |
| 12 | Weekly routine | `harness-improvement.md` cadence prompt — THE BRAIN. Encodes full diagnosis algorithm, coreset selection, dual diagnosis, proposal generation, risk classification, LOW auto-apply flow, anti-regression, and HARNESS_HEALTH.md reporting. |
| 13 | Bootstrap | `bootstrap.js` — one-time normaliser processing existing session logs (20+) and feedback memories (25+) into harness events |
| 14 | CLAUDE.md | Add principal separation rules, event capture docs, intervention skill to mandatory table |
| 15 | Cadence registration | Task Scheduler registration for Monday 09:00, routines.md update |
| 16 | Integration test | End-to-end: bootstrap, verify events, write guard, capture hooks, transcript parser, all tests |

**Key design decisions in the plan:**
- **JSON configs** (not YAML from spec) — zero-dependency parsing in Node.js built-ins. Claude reads JSON equally well.
- **Zero npm dependencies** — all utilities use only `fs`, `path`, `crypto`, `child_process`
- **Async capture hooks** — `async: true` flag so event capture adds zero latency to interactive sessions
- **Weekly routine prompt IS the engine** — no standalone application. The diagnosis algorithm, proposal generation, apply flow, and reporting are all instructions in a cadence prompt that headless Claude follows.
- **Separate commit scopes** — Recorder commits (proposals, health report, event data) and Applier commits (governed targets, changelog) are always separate

**Natural break points:**
- After Task 8: capture infrastructure complete, events accumulating (testable independently)
- After Task 13: full cycle operational
- After Task 16: integrated and registered

---

## Pending decisions for Glen

1. **Execution approach for the plan:** Subagent-driven (recommended — fresh agent per task, review between) or inline execution. Glen was asked this question when the session ended.

2. **Context guard improvement:** The current guard counts tool calls (threshold 200). It should count tokens or use a smarter heuristic. This is a separate task from the harness system but directly related (the harness would capture "compaction without handoff" as an entropy signal).

---

## Dirty state

**Git status at session end:**
- Modified: `projects/nbi_dashboard/session_logs/2026-06-11_session.md` (Session 4 entry added)
- New (untracked): `docs/superpowers/plans/2026-06-11-harness-improvement-system.md` (the plan)
- New (untracked): `docs/HANDOFF.md` (this file)
- Pre-existing dirty files (do not touch): various Couch Heroes hr_hiring docs, ATS workflow files, dashboard-server changes from earlier sessions

**These should be committed at session start:**
```bash
git add docs/superpowers/plans/2026-06-11-harness-improvement-system.md docs/HANDOFF.md projects/nbi_dashboard/session_logs/2026-06-11_session.md
git commit -m "docs(harness): implementation plan + session 4 log + handoff"
```

---

## Files to read at next session start

1. `docs/specs/2026-06-08-harness-improvement-system-design.md` — the locked spec (790 lines)
2. `docs/superpowers/plans/2026-06-11-harness-improvement-system.md` — the implementation plan (16 tasks)
3. `.claude/settings.json` — current hook infrastructure (will be modified by Tasks 5, 7, 8)
4. `scripts/cadence/run-cadence.ps1` — cadence runner pattern (used by Task 15)
5. `projects/nbi_dashboard/session_logs/2026-06-11_session.md` — Session 4 entry at bottom

---

## What to do next

1. Glen chooses execution approach (subagent-driven or inline)
2. Execute the plan task by task, starting with Task 1 (directory scaffold)
3. After Task 8, smoke test the capture layer (events should appear in `.claude/harness/data/events/`)
4. After Task 16, run the bootstrap and verify the full system
5. Wait for the first Monday cadence run (or manually trigger with `Start-ScheduledTask 'NBI Cadence - harness-improvement'`)
6. Review HARNESS_HEALTH.md and DIGEST.md after first run

---

## Other sessions today (context for completeness)

- **Session 1:** AIOS audit + cadence fix (bank rebuild, local cadence layer, 17 cloud routines disabled, registries, org chart refresh). Committed `dd02336`.
- **Session 2:** Lorenza hiring pack — salary research (5 roles, global benchmarks, red-team verification, Skillsearch 2026 PDF extraction). Multiple deliverables in `Clients/Couch Heroes/hr_hiring/`.
- **Session 3 (interrupted):** COO operations breakout for Aris — brainstorming started, coverage map directive from Glen. NOT COMPLETE. Was interrupted by context switch to harness design conversation.
- **Session 4 (this one):** Harness improvement system — implementation plan written.

### Session 3 resume notes
The COO breakout brainstorming was in progress. Glen's directive: map each brainstormed area to its owner (Legal=Dino, HR=Lorenza, Finance=Lili from 1 July, Operations=Aris). Goal is complete coverage map for Aris's COO role. CH client id: `21be0772-73e5-4cca-8795-8b1a66f89ec2`. Existing projects: AI Strategy, CH People Strategy, Game Planning, IT Managementt (typo), Jira Implementation, Legal, Organisational Structure, VDR Development. IT/Org Structure/Game Planning/AI Strategy are empty shells.
