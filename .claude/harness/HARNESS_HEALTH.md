# HARNESS HEALTH REPORT

**Run:** 7 (2026-07-27)  
**Period analysed:** 2026-07-21 through 2026-07-27  
**Sessions in period:** 10  
**Events read:** 3,420  
**Overall health:** RED  

---

## Summary

Worst week since harness deployment. 11 confirmed interventions across 10 sessions, reversing the clean run 6. The run 6 health report's caution proved correct: the GREEN was work-mix-dependent (mechanical coding with clear test gates), not behavioural improvement. This period's deliverable-heavy workload (CH org chart, Monthly Costs feature, CTO deck, DICE Athens bios) triggered immediate regression.

Two new patterns diagnosed:
- **PATTERN_K** (deliverable form mismatch): 4 interventions from producing deliverables in the wrong visual form, wrong format, with stale data and no brand source verification. The brainstorming skill was mandatory but invoked zero times this period.
- **PATTERN_L** (partial computation overgeneralisation): 2 interventions from gating an entire feature surface as "blocked" when most outputs were independently computable.

PATTERN_J (model identity) recurred: an Opus 4.6 session was not flagged to Glen at start. P012 has been pending since run 5.

Two LOW-risk proposals (P013, P014) auto-applied as feedback memories. The proposal backlog (6 pending Glen review, 3 recommended for closure) remains the secondary concern.

---

## Event Capture Status

| Item | Value |
|---|---|
| Event files scanned | 12 files across 10 sessions (2026-07-21 to 2026-07-27) |
| Event source | `~/.claude/harness/data/NBIAI_TEAM_aeb5ed/events/` |
| Total events | 3,420 |
| Tool outcomes | 3,129 (100% success rate) |
| Entropy signals | 48 |
| Context pressure events | 110 |
| Skill usages | 49 (20 unique skills) |
| Role dispatches | 7 |
| Interventions | **11** |
| Blocked writes (period) | 2 |
| Malformed records | 0 |

**Infrastructure status: GREEN.** Full telemetry flowing. Zero tool failures. Write-guard and shell-guard operational. 2 shell-guard blocks, both correct.

---

## Intervention Analysis

### 11 confirmed interventions (up from 0 last run)

**By severity:**
| Severity | Count | Events |
|---|---|---|
| Rejection | 5 | CH org chart x2, Monthly Costs x2, CTO deck |
| Correction | 5 | Model identity, CTO brand, DICE bios x3 |
| Redirect | 1 | Wrong handoff resume |

**By harness component:**
| Component | Count | Events |
|---|---|---|
| context | 7 | Handoff resume, model identity, org chart factual errors, CTO brand, DICE bios x3 |
| verification | 3 | Org chart fragmented, Monthly Costs blank, Monthly Costs "hot mess" |
| memory | 1 | Org chart wrong format (feedback_pptx_layout over-applied) |

**Intervention timeline:**
| Date | Session | Events | Description |
|---|---|---|---|
| Jul 22 | ses_01KY3QES | 1 | Wrong handoff resume (picked up news-aggregator instead of preserved hiring plan handoff) |
| Jul 23 | ses_01KY6FZZ | 2 | Opus 4.6 not flagged; CH org chart HTML rejected (card grid, not PPT) |
| Jul 23 | ses_01KY7WRV | 2 | Second org chart rejection (fragmented 7-slide deck); Monthly Costs blank for CH |
| Jul 24 | ses_01KY968V | 3 | Third org chart rejection (factual errors, stale bank data); CTO deck wrong brand; Monthly Costs "hot mess" |
| Jul 25 | ses_01KYAMJ7 | 3 | DICE bios: naming restrictions, co-founder not founder, one-identity-per-bio rule |

**Key observation:** Sessions on Jul 23-24 account for 7 of 11 interventions, all on deliverable work. The Jul 25 bio corrections (3 events) include 1 unavoidable first-encounter and 2 iterative refinements on wording preferences. Jul 26-27 had zero interventions (cadence runs, mechanical coding).

### Core set analysis

Excluding the DICE bio refinements (expected for a first-ever task type), 8 avoidable interventions remain. This is the highest avoidable count since harness deployment.

The CH org chart alone consumed 3 rejection cycles across 2 sessions before reaching an acceptable state. This is a failure of the brainstorming gate: format, visual form, and data sources should have been confirmed before any implementation.

---

## Pattern Status

### PATTERN_A: Verification Insufficient (runs 1-4)
**Status:** No recurrence. Last occurrence run 4.

### PATTERN_B: Stale Memory Trusted (runs 1-4)
**Status:** No recurrence. Last occurrence run 4.

### PATTERN_C: Entropy Signal Noise (continuing)
**Status:** Continuing. 48 signals this period. Mean score 6.3 (up from 1-2 last run). 8 spikes above 10, including one at 52 (2026-07-26 22:55, 32 signals across test/file_residue/dependency). The score-52 spike is an outlier but correlates with a heavy coding session, not a systemic concern. P004 (entropy dedup) would reduce noise if applied.

| Category | Count | % |
|---|---|---|
| file_residue | 31 | 46% |
| dependency | 17 | 25% |
| test | 12 | 18% |
| code | 8 | 12% |

### PATTERN_D: Adversarial Convergence (runs 2-4)
**Status:** FORMALLY CLOSED. No recurrence for 4 consecutive runs.

### PATTERN_E: Tool Substitution (runs 2-4)
**Status:** FORMALLY CLOSED. No recurrence for 4 consecutive runs.

### PATTERN_F: Numerical Reframing (run 3)
**Status:** No recurrence (5 consecutive runs). P008 still pending. Recommend closing P008 as moot.

### PATTERN_G: Verification Rule Saturation (runs 4-7)
**Status:** REGRESSED. 0 interventions in run 6, 11 in run 7. The run 6 report predicted this: "whether this reflects genuine compliance improvement or a favourable work mix requires another clean week to confirm." The answer is clear: it was work mix.

Mechanical coding (Foundation features, bug fixes) triggers zero interventions because test gates provide natural verification checkpoints. Deliverable work (org charts, decks, bios, cost features with client-facing UX) lacks equivalent mechanical gates and depends entirely on behavioural rules.

**Implication:** The harness needs stronger pre-implementation gates for deliverable work, not just post-implementation verification. P013 (deliverable form brainstorming gate) was auto-applied this run to address this.

### PATTERN_H: Planned-Future Tense Flip (run 4)
**Status:** No recurrence. P011 still pending Glen review.

### PATTERN_I: Memory-vs-Bank Conflict (run 4)
**Status:** No recurrence. Monitoring.

### PATTERN_J: Model Identity Check Failure (runs 5, 7)
**Status:** RECURRED. Opus 4.6 session on Jul 23 was not flagged to Glen at start per feedback_no_opus_47.md. The session committed and deployed hiring plan work (d5b4602) before Glen noticed. This is the second occurrence. P012 (mechanical model identity check) has been pending since run 5 and its urgency is now elevated. The catch-22 remains: the model that most needs to follow the instruction is the one least likely to do so.

### PATTERN_K: Deliverable Form Mismatch (NEW, run 7)
**Status:** NEW. 4 interventions across 2 deliverables (CH org chart, CTO deck).

Root cause chain:
1. Brainstorming skill not invoked (0 invocations this period, mandatory for creative work)
2. Output format not confirmed (HTML produced when PPT was expected)
3. Visual form not matched to canonical standard (card grid instead of boxes-and-lines hierarchy)
4. Brand source not consulted (colours invented from unrelated screenshot)
5. Bank data included in deliverable without freshness verification (stale candidate names, wrong titles)

**Mitigation applied:** P013 auto-applied as `feedback_deliverable_form_gate.md` memory. Codifies the brainstorming checklist for deliverables with canonical visual forms.

### PATTERN_L: Partial Blockage Overgeneralisation (NEW, run 7)
**Status:** NEW. 2 interventions on Monthly Costs feature.

Root cause: when on-cost percentage was missing, the model gated ALL cost display instead of showing the 28/30 roles where base costs were computable. Then projected costs for unhired roles as if already on payroll.

**Mitigation applied:** P014 auto-applied as `feedback_partial_computation.md` memory.

---

## Skill Coverage

| Skill | Invocations | Mandatory | Trend vs Run 6 |
|---|---|---|---|
| resume | 10 | N/A | Up (3 to 10) -- heavy session continuity |
| systematic-debugging | 6 | Yes | Up (2 to 6) |
| handoff | 5 | N/A | Up (3 to 5) |
| harness-intervention | 5 | Yes | New capture mechanism (first period with explicit captures) |
| deploy | 3 | Yes | New this period |
| intel-brief | 3 | N/A | Up (2 to 3) |
| update-config | 3 | N/A | New this period |
| pipeline | 2 | No | Stable (4 to 2) |
| test-driven-development | 1 | **Yes** | **Recovered from 0 (3 consecutive runs at 0)** |
| test-health | 1 | Yes | Stable (1) |
| subagent-driven-development | 1 | Yes | Stable (3 to 1) |
| codex-converge | 1 | Yes | Stable (2 to 1) |
| using-git-worktrees | 1 | Yes | New this period |
| receiving-code-review | 1 | Yes | New this period |
| games | 1 | No | New this period |
| open-design-systems | 1 | No | New this period |
| claude-api | 1 | No | New this period |
| recompile-banks | 1 | No | Stable |
| ingest-granola | 1 | N/A | Stable |
| system-audit | 1 | N/A | New this period |
| brainstorming | **0** | **Yes** | **Down from 3 to 0** |
| writing-plans | **0** | **Yes** | **Down from 2 to 0** |
| verification-before-completion | **0** | **Yes** | **0 for 4 consecutive runs** |
| finishing-a-development-branch | **0** | **Yes** | **0 for 2 consecutive runs** |

**Assessment:** The brainstorming absence is the headline finding. It was at 3 last run and dropped to 0 during a period of HEAVY creative deliverable work. This directly caused PATTERN_K (4 interventions). The CH org chart, CTO deck, and Monthly Costs UX all qualified as creative work requiring brainstorming.

**Positive notes:**
- `test-driven-development` recovered from 0 (3 consecutive runs) to 1
- `harness-intervention` appeared (5 invocations), meaning interventions are being captured in real-time
- `systematic-debugging` doubled (2 to 6)
- `using-git-worktrees` and `receiving-code-review` appeared
- Total skill invocations up from 31 to 49

---

## Blocked Writes This Period

2 blocked writes (down from 5):

| Date | Guard | Detail |
|---|---|---|
| 2026-07-24 05:59 | shell-guard | write command targeting governed harness path |
| 2026-07-27 00:09 | shell-guard | write command targeting governed harness path |

**Assessment:** Minimal blocked write activity. Guards functioning correctly. No concerning patterns.

---

## Entropy Trend

48 signals this period. Score distribution wider than previous runs.

| Category | Count | % |
|---|---|---|
| file_residue | 31 | 46% |
| dependency | 17 | 25% |
| test | 12 | 18% |
| code | 8 | 12% |

| Metric | Run 6 | Run 7 |
|---|---|---|
| Total signals | 99 | 48 |
| Score range | 1-2 | 0-52 |
| Mean score | ~1.5 | 6.3 |
| Spikes (>10) | 0 | 8 |

The spike at score 52 (2026-07-26 22:55) correlates with a heavy end-of-session entropy scan (32 signals: test, file_residue, dependency). This is an outlier, not a trend. The test category appearing (18%, was 0% last run) reflects active test writing. P004 (entropy dedup) would further reduce noise.

---

## Prior Proposal Status

| ID | Title | Run Filed | Status | Recommendation |
|----|-------|-----------|--------|----------------|
| P001 | Compile-bank content verification | 1 | Applied | CLOSED. |
| P002 | Recompile-banks verification reminder | 1 | Applied | CLOSED. |
| P003 | Dispatching-agents handoff validation | 1 | Pending Glen review | **6 runs pending.** Review or close. |
| P004 | Entropy scanner session dedup | 2 | BLOCKED_TO_APPLY | Still pending. Would reduce PATTERN_C noise. |
| P005 | Adversarial convergence discipline | 2 | Applied/Improving | **RECOMMEND CLOSE.** No recurrence 4 runs. |
| P006 | Named-tool direction compliance | 2 | Pending Glen review | **5 runs pending.** Review or close. |
| P007 | Adversarial convergence feedback memory | 2 | Applied/Improving | **RECOMMEND CLOSE.** No recurrence 4 runs. |
| P008 | Numerical reframing clause | 3 | Pending Glen review | No recurrence 5 runs. **RECOMMEND CLOSE as moot.** |
| P009 | Event capture gap | 3 | Resolved | **RECOMMEND CLOSE.** |
| P010 | Gate snapshot bypass bug | 3 | BLOCKED_TO_APPLY | Still pending. Workaround documented. |
| P011 | Tense-flip fabrication guard | 4 | Pending Glen review | No recurrence. Still worth applying (severity was high). |
| P012 | Mechanical model identity check | 5 | Pending Glen review | **URGENCY ELEVATED.** PATTERN_J recurred this run. |
| P013 | Deliverable form brainstorming gate | 7 | **AUTO-APPLIED** | Memory `feedback_deliverable_form_gate.md` created. |
| P014 | Partial computation display | 7 | **AUTO-APPLIED** | Memory `feedback_partial_computation.md` created. |

---

## Actions Required (Glen)

| Priority | Action | Proposal |
|---|---|---|
| **HIGH** | Review and apply P012 (model identity mechanical check): PATTERN_J recurred, Opus 4.6 session shipped code without flagging. SessionStart hook is the recommended fix. | P012 |
| MEDIUM | Batch close P005, P007, P008, P009: patterns resolved, no recurrence 4-5 runs, moot | P005, P007, P008, P009 |
| MEDIUM | Review/close P003 (6 runs pending) and P006 (5 runs pending): long-lived proposals need a decision | P003, P006 |
| LOW | Review P011 tense-flip guard: no recurrence but severity was high (fabrication reached Slack) | P011 |
| LOW | Apply P004 entropy dedup when convenient: PATTERN_C continues but benign | P004 |
| LOW | Investigate P010 heredoc bypass: workaround exists, low urgency | P010 |

---

## Structural Observations

### The work-mix hypothesis is confirmed

Run 6's GREEN was explicitly flagged as provisional: "whether this reflects genuine compliance improvement or a favourable work mix requires another clean week to confirm." Run 7 provides the answer. The moment deliverable work returned (org charts, decks, cost UX, bios), interventions spiked to the highest count ever recorded.

This has a concrete implication: **the harness's effectiveness is bifurcated.** For mechanical coding (server features, bug fixes, test-gated work), the VSM gates, write-guards, and test requirements provide strong mechanical enforcement. For deliverable work (client-facing documents, UX design, unstructured output), enforcement is entirely behavioural and demonstrably insufficient.

### The brainstorming gap is the root cause

4 of 11 interventions (PATTERN_K) trace directly to the brainstorming skill not being invoked. The mandatory skill table says brainstorming is required for "new feature, new component, creative work." The model did not classify client deliverables as creative work. P013 was auto-applied to make this explicit, but the deeper issue is mandatory skill compliance: the model skips mandatory skills when it perceives the task as "just producing output" rather than "building something."

### P012 urgency is now critical

PATTERN_J (model identity) has now occurred in runs 5 and 7. Both times, a non-Fable model ran a full session without flagging itself to Glen. Both times, the work quality was measurably worse. The behavioural rule (feedback_no_opus_47.md) is not reliable because the weaker model is precisely the one that fails to follow it. A mechanical SessionStart hook is the only reliable fix. Glen: this is the single highest-value proposal in the backlog.

### Intervention capture is working

The `harness-intervention` skill appeared for the first time (5 invocations), meaning interventions are being captured in real-time during sessions rather than diagnosed retrospectively from session logs. This is a significant infrastructure improvement: the data quality for this run was markedly better than prior runs.

### Proposal backlog

14 proposals exist. 2 applied and closed (P001, P002). 2 auto-applied this run (P013, P014). 4 recommended for closure (P005, P007, P008, P009). 2 blocked (P004, P010). 4 pending Glen review (P003, P006, P011, P012). The backlog is not shrinking. A 15-minute batch review session would clear the queue.

---

*Generated by harness-improvement cadence run 2026-07-27. Run 7. Recorder principal (with Applier auto-apply for P013, P014). Overwritten each cadence run.*
