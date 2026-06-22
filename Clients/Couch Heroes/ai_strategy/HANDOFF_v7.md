# HANDOFF -- CH AI Tool Strategy v2: Report Complete, Pending Editorial Pass

**Date:** 2026-06-15
**Branch:** `master`
**Reason for handoff:** Report fully written, assembled, and Codex-reviewed. Critical Codex findings fixed. Medium-priority findings documented for editorial pass.
**Model:** Claude Opus 4.6 [1M]

---

## What Was Done This Session (Batch 4)

### New content written
1. **Section 16: Platform & Backend** -- the 14th and final discipline. Anybrain (AI anti-cheat, behavioural biometrics) evaluated as WATCH 5.7. No specialist AI tools for matchmaking, fraud detection, infrastructure scaling, or incident response. $0 budget.
2. **Competitive Landscape** -- 500 words, 5 verifiable examples (Ubisoft, Square Enix, Blizzard, Rare, Steam disclosure data).
3. **Cross-cutting Infrastructure** -- data classification framework (9-category table), self-hosted vs cloud decision framework (3-phase), API gateway, prompt library, infrastructure budget.
4. **Decision Dashboard** -- one table per discipline, 14 tables, CEO skim layer.
5. **Phased Adoption Roadmap** -- 3 phases, dependency map (text-based tree), rollback protocol.
6. **Organisational Change Management** -- 11-person stakeholder analysis (Aris champion, Sasha opposition, Simon unknown, Graham unreliable, Fred ally, Hannah overloaded), communication plan, training requirements table, policy dependencies.
7. **Budget Summary** -- pre-launch ~$91-94K, post-launch ~$41-43K, cost avoidance estimates, headcount comparison (entire AI budget < 1 FTE), GBP conversion.
8. **Risk Register** -- top 10 risks, top 3 all score 20/25 (no CTO, no data team, economy exploits).
9. **Appendices** -- full tool inventory (32 rows), 3 vendor comparison matrices, governance backlog priority map (12 items across 3 phases), glossary (18 terms).
10. **Executive Summary** -- board memo format, leads with MetaHuman ADOPT + top 3 strategic recs.
11. **Aggregate Value Estimate** -- completed (was a placeholder).

### Final assembly
- Reordered document into RICECO document order: Executive Summary and Decision Dashboard at top, Competitive Landscape and Cross-cutting Infrastructure before disciplines.
- Discipline section numbers (3-16) kept as-is to preserve internal cross-references. Full renumbering to RICECO 4-17 is an editorial task for the final pass.

### Codex adversarial review
- GPT-5.5 review completed, 15 findings. Full output at `tmpcodex_ch_ai_review.md`.
- **4 CRITICAL findings fixed this session** (see below).
- **11 MEDIUM findings** documented for editorial pass (see below).

---

## Codex CRITICAL Findings -- FIXED

| # | Finding | Fix applied |
|---|---------|------------|
| 1 | Executive Summary and Competitive Landscape falsely claimed Rare adopted modl.ai. The QA section itself corrects this (Rare built their own system; modl.ai blogged about it). | Removed false Rare/modl.ai customer claim from Exec Summary and Competitive Landscape. Reframed Competitive Landscape to explain Rare built in-house; modl.ai is the commercial alternative. |
| 2 | UE royalty rate stated as 3.5% (standard) when standard is 5%; 3.5% only under Launch Everywhere terms. | Corrected to "5% above $1M; 3.5% only under Launch Everywhere terms". |
| 3 | AGGREGATE VALUE ESTIMATE section still had `[TO BE COMPLETED]` placeholder. | Completed with budget totals, top 3 productivity impacts, and cross-references to Budget Summary. |
| 4 | "Unconditional rollout" for MetaHuman contradicted governance prerequisites requirement. | Changed to "full rollout once minimum governance (AI Acceptable Use Policy v1) is in place". |

**Also fixed:** Risk register community backlash entry (2x5=10) now explains the transformation from discipline-level raw risk (4x5=20) to post-mitigation likelihood. PILOT count corrected from 9 to 10 across all summary sections. Move.ai added to Appendix A (was evaluated in Section 3 but missing from inventory). Total tools: 32.

---

## Codex MEDIUM Findings -- REMAINING (for editorial pass)

| # | Finding | Action needed | Effort |
|---|---------|--------------|--------|
| 3 | Dashboard and Appendix A row-level costs contradict discipline sections (Rokoko $4,590 vs $7,400; Cascadeur $4,394 vs $1,584; Wwise/ElevenLabs cost swapped; Substance 3D AI $6,000 vs $0 marginal) | Reconcile all row-level costs against discipline budget summaries. Aggregate totals are correct; individual rows are stale. | 30 min |
| 5 | [VERIFY] flags remain in recommendation-critical areas (modl.ai pricing, Firefly indemnification, Cascadeur UE5 Live Link, Anybrain funding/headcount) | Resolve each: verify, remove claim, or convert to named diligence action in Appendix | 1-2 hours research |
| 8 | TeamCity AI Build Analyzer features could not be verified from public JetBrains materials | Verify or reframe as "potential AI/EAP features" | 15 min |
| 9 | GameDriver (gamedriver.ai) missing from QA evaluation -- AI-maintained tests, QaaS delivery, MMO customer | Evaluate or explain exclusion | 30 min |
| 10 | General-purpose code assistants (Copilot, Cursor) excluded but report claims "every function" coverage | Add short subsection or scope it out explicitly in Exec Summary | 30 min |
| 11 | Scenario (scenario.com) and Layer (layer.ai) missing from art evaluation | Add "also considered" note with rationale | 15 min |
| 12 | Appendix A not actually sorted by discipline then composite (ToxMod 7.7 after GGWP 7.1) | Regenerate sort order | 15 min |
| 13 | ElevenLabs funding materially outdated ($100M+ stated; actual is $800M+ at $11B valuation after Feb 2026 round) | Update company profile in audio section | 10 min |
| 14 | "Inworld pivoted away from gaming" too blunt; better: "broadened beyond game-specific NPC tooling" | Soften language in 3-4 locations | 10 min |
| 15 | Data & Analytics section needs analytics readiness checklist (not just "hire a data lead") | Add pre-beta analytics readiness checklist | 20 min |

**Estimated total editorial effort: ~3-4 hours (one session).**

---

## Report Status

| Metric | Value |
|--------|-------|
| File | `Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_v2.md` |
| Lines | ~2,780 |
| Tools evaluated | 32 |
| ADOPT | 1 (MetaHuman Animator) |
| PILOT | 10 |
| WATCH | 19 |
| AVOID | 2 |
| Pre-launch budget | ~$91,040-$93,920 |
| Post-launch annual | ~$41,220-$42,660 + TBD |
| Codex review | Complete (15 findings, 4 critical fixed, 11 medium remaining) |
| Codex output | `tmpcodex_ch_ai_review.md` |

---

## Key Files

| File | Purpose |
|------|---------|
| `Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_v2.md` | The report (assembled, post-Codex fixes) |
| `Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_v2_preassembly.md` | Backup of pre-assembly version |
| `Clients/Couch Heroes/ai_strategy/RICECO_PROMPT_CH_AI_Tool_Strategy.md` | THE SPEC |
| `tmpcodex_ch_ai_review.md` | Full Codex adversarial review output |
| `Clients/Couch Heroes/ai_strategy/HANDOFF_v7.md` | This file |

---

## Next Session: Editorial Pass

1. **Reconcile row-level costs** in Dashboard and Appendix A against discipline budget summaries (Codex finding #3).
2. **Resolve [VERIFY] flags** -- research or remove claims in modl.ai pricing, Firefly indemnification, Cascadeur Live Link, Anybrain details, TeamCity AI features.
3. **Evaluate or scope out** GameDriver (QA), Copilot/Cursor (Engineering), Scenario/Layer (Art).
4. **Update** ElevenLabs funding, Inworld "pivoted" language.
5. **Add** Data & Analytics readiness checklist.
6. **Fix** Appendix A sort order.
7. **Full RICECO section renumbering** (3-16 to 4-17) and update all internal cross-references.
8. **Final read-through** for British English, no em dashes, consistent formatting.
9. **Delete** `CH_AI_Tool_Strategy_v2_preassembly.md` and `tmpcodex_ch_ai_review.md` after editorial pass.

---

## Critical Rules (unchanged)

1. No Copilot (as a recommendation -- can be evaluated). No AccelByte.
2. AI tools only. Not generic platforms with AI features.
3. No generic framework padding.
4. Every scored tool gets a real profile. Website URLs required.
5. [VERIFY] flags must be resolved before client delivery.
6. 50% context = handoff.
7. Codex adversarial review per batch. ✓ DONE
8. No Sonnet or Haiku subagents. Opus only.
9. McKinsey quality bar.
10. British English, no em dashes.
