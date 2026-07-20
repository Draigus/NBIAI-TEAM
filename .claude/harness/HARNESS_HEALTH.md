# HARNESS HEALTH REPORT

**Run:** 6 (2026-07-20)  
**Period analysed:** 2026-07-14 through 2026-07-20  
**Sessions in period:** 10  
**Events read:** 2,161  
**Overall health:** GREEN  

---

## Summary

First intervention-free week since harness deployment. Zero Glen corrections across 10 sessions, 2,161 events, and zero tool failures. Heavy coding output (Foundation features 2-6, bug batch, intelligence cadence) with no verification incidents.

PATTERN_G (verification rule saturation) shows its first improvement signal: from 5/5 interventions last run to 0/0 this run. Whether this reflects genuine compliance improvement or a favourable work mix (more mechanical coding, less unstructured deliverable work) requires another clean week to confirm.

The proposal backlog (7 pending items, 3 recommended for closure) is now the primary harness concern. No new proposals generated this run.

---

## Event Capture Status

| Item | Value |
|---|---|
| Event files scanned | 14 files across 10 sessions (2026-07-14 to 2026-07-20) |
| Event source | `~/.claude/harness/data/NBIAI_TEAM_aeb5ed/events/` |
| Total events | 2,161 |
| Tool outcomes | 1,888 (100% success rate) |
| Entropy signals | 99 |
| Context pressure events | 143 |
| Skill usages | 31 (13 unique skills) |
| Interventions | **0** |
| Role dispatches | 0 |
| Blocked writes (period) | 5 |
| Malformed records | 0 |

**Infrastructure status: GREEN.** Full telemetry flowing. Zero tool failures. Write-guard and shell-guard both operational.

---

## Intervention Analysis

**None.** Zero confirmed interventions across the full analysis period. This is the first clean week since harness deployment (run 1: 2026-06-11).

Previous intervention counts: run 1 (bootstrapping), run 2 (4), run 3 (1 minimal-data), run 4 (6), run 5 (5), run 6 (0).

---

## Pattern Status

### PATTERN_A: Verification Insufficient (runs 1-4)
**Status:** Subsumed by PATTERN_G. Not tracked separately.

### PATTERN_B: Stale Memory Trusted (runs 1-4)
**Status:** No recurrence. Last occurrence run 4.

### PATTERN_C: Entropy Signal Noise (continuing)
**Status:** Continuing. 99 entropy signals this period. Severity range 1-2 only (no spikes above 2). 87% file_residue (intelligence pipeline, expected). Baseline stable. P004 (entropy dedup) would reduce noise if applied.

### PATTERN_D: Adversarial Convergence (runs 2-4)
**Status:** FORMALLY CLOSED. No recurrence for 3 consecutive runs. P005/P007 effective.

### PATTERN_E: Tool Substitution (runs 2-4)
**Status:** FORMALLY CLOSED. No recurrence for 3 consecutive runs. Shell-guard operational. 5 blocked writes this period (all correct blocks on harness engine code).

### PATTERN_F: Numerical Reframing (run 3)
**Status:** No recurrence (4 consecutive runs). Still at 1 confirmed event. P008 remains pending.

### PATTERN_G: Verification Rule Saturation (runs 4-6)
**Status:** IMPROVING. First week with 0 interventions (was 5/5 last run, 4/6 run before that). Caution: this may reflect the work mix (Foundation features are mechanical coding with clear test gates) rather than a genuine behavioural shift. If next run also shows 0 interventions across a work mix that includes deliverables and briefs, the improvement is likely real.

**Blocked-write correlation:** 5 blocked writes on 2026-07-16 targeted `.claude/harness/lib/git-push.js`. The VSM gates and write-guards caught these attempts. Mechanical enforcement continues to work where behavioural rules falter.

### PATTERN_H: Planned-Future Tense Flip (run 4)
**Status:** No recurrence. P011 still pending Glen review.

### PATTERN_I: Memory-vs-Bank Conflict (run 4)
**Status:** No recurrence. Monitoring.

### PATTERN_J: Model Identity Check Failure (run 5)
**Status:** No recurrence. Sessions appear to have run on Fable 5 this period. P012 still pending Glen review.

---

## Skill Coverage

| Skill | Invocations | Mandatory | Trend vs Run 5 |
|---|---|---|---|
| pipeline | 4 | No | Stable (4) |
| brainstorming | 3 | Yes | Stable (3-4) |
| artifact-design | 3 | No | Up (1 to 3) |
| handoff | 3 | N/A | Healthy session continuity |
| resume | 3 | N/A | Healthy session continuity |
| subagent-driven-development | 3 (superpowers:) | Yes | Stable (2-3) |
| writing-plans | 2 | Yes | Down slightly (3 to 2) |
| systematic-debugging | 2 | Yes | Down (3 to 2) but present |
| codex-converge | 2 | Yes | New this period |
| intel-brief | 2 | N/A | Cadence |
| ingest-granola | 2 | N/A | Cadence |
| bug-sweep | 1 | Yes | New this period |
| test-health | 1 | Yes | Up from 0 |
| test-driven-development | **0** | **Yes** | **0 for 3 consecutive runs** |
| verification-before-completion | **0** | **Yes** | **0 for 3 consecutive runs** |
| finishing-a-development-branch | **0** | **Yes** | Down from 4 |

**Assessment:** Two mandatory skills remain at zero for 3 consecutive runs: `test-driven-development` and `verification-before-completion`. However, 0 interventions this period suggests verification IS happening through other mechanisms (codex-converge, test-health, and the VSM gates themselves). The TDD absence is more concerning given the Foundation 2-6 feature work. E2E tests were written (commit 8dc39b6) but the formal TDD skill was not invoked, meaning the test-first discipline may not have been followed.

**Positive notes:** `codex-converge` appeared (2 invocations), indicating cross-AI adversarial review is active. `bug-sweep` appeared (1), indicating the bug triage pipeline was followed. `test-health` recovered from 0 to 1.

---

## Blocked Writes This Period

5 blocked writes on 2026-07-16, all targeting `.claude/harness/lib/git-push.js`:

| Time | Guard | Detail |
|---|---|---|
| 09:03:48 | write-guard | BLOCKED_TO_APPLY: harness engine code |
| 09:05:33 | write-guard | BLOCKED_TO_APPLY: harness engine code |
| 09:05:40 | shell-guard | write command targeting governed harness path |
| 09:05:45 | shell-guard | write command targeting governed harness path |
| 09:23:07 | shell-guard | write command targeting governed harness path |

**Assessment:** A session attempted to modify `git-push.js` (harness engine code). Both the file-level write-guard and the shell-guard correctly blocked all 5 attempts. The guards are functioning as designed. The session likely needed a legitimate change to the push gate but the correct route is BLOCKED_TO_APPLY (Glen applies manually from a generated diff).

---

## Entropy Trend

99 signals this period. Down from 100 (run 5). All severity 1-2 (no spikes).

| Category | Count | % |
|---|---|---|
| file_residue | 86 | 87% |
| dependency | 9 | 9% |
| code | 4 | 4% |

No sustained elevation. No concerning patterns. The entropy signal is stable and low. P004 (entropy dedup) would further reduce noise from the intelligence pipeline's file_residue signals.

---

## Prior Proposal Status

| ID | Title | Run Filed | Status | Recommendation |
|----|-------|-----------|--------|----------------|
| P001 | Compile-bank content verification | 1 | Applied | No recurrence. CLOSED. |
| P002 | Recompile-banks verification reminder | 1 | Applied | No recurrence. CLOSED. |
| P003 | Dispatching-agents handoff validation | 1 | Pending Glen review | **Still pending (5 runs).** Review or close. |
| P004 | Entropy scanner session dedup | 2 | BLOCKED_TO_APPLY | Still pending. Would reduce PATTERN_C noise. |
| P005 | Adversarial convergence discipline | 2 | Applied/Improving | **RECOMMEND CLOSE.** No recurrence 3 runs. |
| P006 | Named-tool direction compliance | 2 | Pending Glen review | Still pending. |
| P007 | Adversarial convergence feedback memory | 2 | Applied/Improving | **RECOMMEND CLOSE.** No recurrence 3 runs. |
| P008 | Numerical reframing clause | 3 | Pending Glen review | No recurrence 4 runs. May be moot. |
| P009 | Event capture gap | 3 | Resolved | **RECOMMEND CLOSE.** Events confirmed flowing at NBIAI_TEAM_aeb5ed namespace. |
| P010 | Gate snapshot bypass bug | 3 | BLOCKED_TO_APPLY | Still pending. Workaround documented. |
| P011 | Tense-flip fabrication guard | 4 | Pending Glen review | No recurrence. Still worth applying (severity was high). |
| P012 | Mechanical model identity check | 5 | Pending Glen review | No recurrence. Still worth applying (prevents model quality cascade). |

**No new proposals this run.**

---

## Actions Required (Glen)

| Priority | Action | Proposal |
|---|---|---|
| MEDIUM | Batch close P005, P007, P009: patterns resolved, no recurrence 3+ runs | P005, P007, P009 |
| MEDIUM | Review P011 tense-flip guard: no recurrence but severity was high (fabrication reached Slack) | P011 |
| MEDIUM | Review P012 model identity check: no recurrence but prevents cascade failures on wrong model | P012 |
| LOW | Review/close P003 (5 runs pending), P006, P008 (4 runs, no recurrence, may be moot) | P003, P006, P008 |
| LOW | Apply P004 entropy dedup when convenient: PATTERN_C continues but benign | P004 |
| LOW | Investigate P010 heredoc bypass: workaround exists, low urgency | P010 |

---

## Structural Observations

### First clean week: cautious optimism

Zero interventions is genuinely positive. The combination of factors may be:
1. **Fable 5 model stability** (no model identity incidents)
2. **Mechanical gates working** (VSM, write-guard, shell-guard blocking incorrect actions)
3. **Work mix favourable** (Foundation features are well-defined coding tasks with clear test criteria, unlike the briefs/deliverables that triggered prior interventions)

The test for whether PATTERN_G is truly improving will be the next period that includes unstructured deliverable work (client briefs, consulting output, capability assessments). Until then, the improvement is real but the cause is uncertain.

### Proposal backlog

12 proposals exist. 3 applied (P001, P002, and P005/P007 effectively resolved). 3 recommended for closure (P005, P007, P009). 2 blocked (P004, P010). 5 pending Glen review (P003, P006, P008, P011, P012). No new proposals this run. The backlog is not growing but neither is it shrinking. A batch review session would clear the queue.

### Event infrastructure confirmed stable

Event capture confirmed flowing at `~/.claude/harness/data/NBIAI_TEAM_aeb5ed/events/` for the full analysis period. The project-embedded copy at `.claude/harness/data/events/` (which stops at 2026-06-19) is stale and should be treated as historical archive only. The `last_diagnosis.json` now records the correct source path.

### Missing skills not yet a problem but trending

`test-driven-development` at 0 for 3 consecutive runs during a period of active feature development is a concern worth monitoring. Tests ARE being written, but the formal TDD discipline (write test first, then implementation) may not be followed. If the next run shows 0 again alongside coding work, consider whether the mandatory skill invocation is being bypassed or whether the work genuinely does not trigger it.

---

*Generated by harness-improvement cadence run 2026-07-20. Run 6. Recorder principal. Overwritten each cadence run.*
