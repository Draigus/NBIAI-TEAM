# HANDOFF — CH AI Tool Strategy v2 Batch 4 (Synthesis Sections + Final Assembly)

**Date:** 2026-06-15
**Branch:** `master`
**Reason for handoff:** All 13 discipline sections complete. Context heavy from research agent outputs. Synthesis sections need clean context to reference all disciplines simultaneously.
**Model:** Claude Opus 4.6 [1M]

---

## Glen's Directive (unchanged)

Complete rebuild of CH AI Tool Strategy. Decision-making tool, not a report. Organised by discipline. Each tool gets a FULL profile (company history, production citations, user quotes, verified pricing, productivity estimates). McKinsey quality bar. AI tools ONLY. No Copilot, no infrastructure tools.

**Process rules:** 50% context handoff. Opus-only subagents. Codex adversarial review per batch.

---

## CRITICAL CORRECTION FROM THIS SESSION

**AI tools only.** Glen corrected forcefully: do NOT evaluate generic business tools with AI features bolted on (Jira, HiBob, Amplitude, Mixpanel, Otter.ai, Wrike, etc.). Only evaluate tools where AI/ML is the CORE product (ToxMod, Luminance, Harvey, modl.ai, Inworld AI, etc.). Reference infrastructure tools as context but never score them in evaluation tables. Saved as feedback memory: `feedback_ai_tools_only.md`.

---

## Key Files

| File | Path | Purpose |
|------|------|---------|
| **v2 report** | `Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_v2.md` | ~3,500 lines. All 13 discipline sections complete (Sections 3-15). |
| **RICECO prompt** | `Clients/Couch Heroes/ai_strategy/RICECO_PROMPT_CH_AI_Tool_Strategy.md` | THE SPEC. ~570 lines. Read the exemplar section, quality checklist, and output format before writing synthesis. |
| **Tool seed list** | `Clients/Couch Heroes/ai_strategy/TOOL_SEED_LIST_v3_FINAL.md` | Pre-researched tools. |
| **Batch 2 research** | `Clients/Couch Heroes/ai_strategy/HANDOFF_v4.md` | Research corrections for sections 6-10. |
| **Batch 3 handoff** | `Clients/Couch Heroes/ai_strategy/HANDOFF_v5.md` | What was done in Batch 2 session (sections 6-10). |
| **This handoff** | `Clients/Couch Heroes/ai_strategy/HANDOFF_v6.md` | You are reading it. |

---

## What Has Been Done

### Batch 1 (Sections 3-5, Codex-reviewed)
- Section 3: Animation (MetaHuman ADOPT, Rokoko PILOT, Cascadeur PILOT)
- Section 4: Art Pipeline (Firefly PILOT, Substance 3D AI PILOT, Meshy WATCH, Houdini ML WATCH, Promethean AI WATCH)
- Section 5: Audio (Wwise Sound Search PILOT conditional, ElevenLabs SFX PILOT, AIVA WATCH, Soundraw AVOID, iZotope WATCH, LANDR WATCH)

### Batch 2 (Sections 6-10, arithmetic-verified)
- Section 6: Engineering (Aura PILOT 6.5, UE CoPilot WATCH 5.6)
- Section 7: DevOps (TeamCity AI WATCH 5.6, entire discipline premature)
- Section 8: Game Design (Machinations PILOT 7.8, Ludo.ai PILOT 6.7, Promethean AI cross-ref WATCH)
- Section 9: QA (modl.ai PILOT contingent 6.4)
- Section 10: Narrative & Localisation (Inworld WATCH 4.7, Charisma WATCH 5.7, Convai WATCH 4.9, memoQ WATCH 7.3, Phrase WATCH 7.1)

### Batch 3 (Sections 11-15, arithmetic-verified)
- Section 11: Production & PM — **No specialist AI tools.** Enable Jira AI/Rovo features in existing subscription. $0 budget.
- Section 12: Marketing & Community — ToxMod WATCH 7.7, GGWP WATCH 7.1, AI marketing imagery AVOID 5.5. $0 pre-launch, TBD moderation at launch.
- Section 13: Data & Analytics — **No specialist AI tools at CH's scale.** Zero headcount, discipline premature. Analytics platforms referenced as infrastructure, not scored. $0 budget.
- Section 14: HR & People — **No specialist AI tools for gaming HR.** GDPR Article 22 and EU AI Act barriers. HiBob AI features referenced with OpenAI API GDPR warning. $0 budget.
- Section 15: Finance & Legal — Luminance WATCH 6.1, Harvey WATCH 6.9. Both too expensive for single in-house counsel; recommend external law firms adopt these tools. $0 budget.

### Verification completed (all batches)
- All 18 composite calculations in Batch 3 verified correct (5 new + 13 from Batch 2 previously verified)
- Score range (≤3 and ≥9) confirmed for all sections with scored tools
- Sensitivity floor respected throughout
- British English, no em dashes, all (est.) markers confirmed
- Website URLs included for all tools in Batch 3

---

## ALL VERDICTS (Complete — 30 tools across 13 disciplines)

| Tool | Discipline | Verdict | Composite | Section |
|------|-----------|---------|-----------|---------|
| MetaHuman Animator | Animation | ADOPT | 8.8 | 3 |
| Rokoko | Animation | PILOT | 6.6 | 3 |
| Cascadeur | Animation | PILOT | 7.4 | 3 |
| Adobe Firefly | Art | PILOT | 7.0 | 4 |
| Substance 3D AI | Art | PILOT | 7.2 | 4 |
| Meshy | Art | WATCH | 4.9 | 4 |
| Houdini ML | Art | WATCH | 6.9 | 4 |
| Promethean AI | Art | WATCH | 6.0 | 4 |
| Wwise Sound Search | Audio | PILOT (conditional) | 7.8 | 5 |
| ElevenLabs SFX | Audio | PILOT | 5.9 | 5 |
| AIVA | Audio | WATCH | 5.3 | 5 |
| Soundraw | Audio | AVOID | 4.5 | 5 |
| iZotope Ozone | Audio | WATCH | 7.6 | 5 |
| LANDR | Audio | WATCH | 5.8 | 5 |
| Aura | Engineering | PILOT | 6.5 | 6 |
| UE CoPilot | Engineering | WATCH | 5.6 | 6 |
| TeamCity AI | DevOps | WATCH | 5.6 | 7 |
| Machinations | Game Design | PILOT | 7.8 | 8 |
| Ludo.ai | Game Design | PILOT | 6.7 | 8 |
| modl.ai | QA | PILOT (contingent) | 6.4 | 9 |
| Inworld AI | Narrative | WATCH | 4.7 | 10 |
| Charisma.ai | Narrative | WATCH | 5.7 | 10 |
| Convai | Narrative | WATCH | 4.9 | 10 |
| memoQ | Localisation | WATCH | 7.3 | 10 |
| Phrase TMS | Localisation | WATCH | 7.1 | 10 |
| ToxMod | Marketing/Community | WATCH | 7.7 | 12 |
| GGWP | Marketing/Community | WATCH | 7.1 | 12 |
| AI marketing imagery | Marketing/Community | AVOID | 5.5 | 12 |
| Luminance | Finance/Legal | WATCH | 6.1 | 15 |
| Harvey | Finance/Legal | WATCH | 6.9 | 15 |

**Summary: 1 ADOPT, 9 PILOT, 18 WATCH, 2 AVOID**

---

## BUDGET SUMMARY (all disciplines)

| Discipline | Pre-Launch (mid-2026 to late 2028) | Post-Launch Annual |
|-----------|-----------------------------------|-------------------|
| Animation | ~$8,984 | ~$1,992 |
| Art Pipeline | ~$14,400 | ~$5,400 |
| Audio | ~$2,376 | ~$1,188 |
| Engineering | ~$2,880 | ~$1,440 |
| DevOps | $0 | $0 |
| Game Design | ~$2,400-$5,280 | ~$1,200-$2,640 |
| QA | ~$60,000 [VERIFY modl.ai pricing] | ~$30,000 |
| Narrative & Localisation | $0 | $0 |
| Production & PM | $0 | $0 |
| Marketing & Community | $0 | TBD (moderation at launch) |
| Data & Analytics | $0 | $0 |
| HR & People | $0 | $0 |
| Finance & Legal | $0 | $0 |
| **TOTAL** | **~$91,040-$93,920** | **~$41,220-$42,660 + TBD moderation** |

Note: QA estimate ($60K) is based on a 2022 modl.ai CEO quote and could differ substantially. Moderation costs (ToxMod/GGWP) are custom-priced and will emerge at launch planning. Budget does not include infrastructure costs (analytics platforms, cloud GPU for self-hosted models, etc.) which will be addressed in Cross-cutting Infrastructure section.

---

## WHAT REMAINS (Batch 4 — Synthesis + Final Assembly)

### Platform & Backend — Decision Needed

The RICECO spec lists 14 disciplines. Only 13 are written. "Platform & Backend" (anti-cheat, fraud detection, matchmaking optimisation, infrastructure scaling, incident response) was omitted from the Batch 3 handoff. Assessment: this discipline likely has no specialist AI tools (anti-cheat is middleware not AI; matchmaking is custom engineering; AccelByte is excluded). But Glen should confirm whether to write a brief section or formally exclude it.

### Synthesis Sections to Write

These are generated from the discipline analysis per RICECO Processing Instructions 4-6. Read the full v2 report (all 13 discipline sections) before writing any synthesis.

| Section (document order) | Content | Notes |
|--------------------------|---------|-------|
| 2 | Competitive Landscape | 500 words max. 3-5 MMO/live-service studios' public AI adoption. Verifiable only. |
| 3 | Cross-cutting Infrastructure | Self-hosted vs cloud framework, API gateway, data classification, prompt libraries. Derived from discipline analysis. |
| Decision Dashboard | Roll-up table | One row per task per discipline. Columns: Task, Tool, Verdict, Pre-Launch Cost, Key Risk. CEO/board skim layer. |
| Executive Summary | Written LAST | Lead with top 3 ADOPT recs + top 2 AVOID. Board memo, not thought piece. |
| 16 | Phased Adoption Roadmap | Phase 1/2/3 mapped to Agilefall cadence and milestone gates. Dependency map. |
| 17 | Organisational Change Management | Named stakeholder analysis: Aris (champion), Glen (champion), Sasha (opposition), Simon (unknown), Mustafa (passive), Graham (unreliable), Fred (ally), Hannah (overloaded). Remote-first, async communication plan. |
| 18 | Budget Summary | USD + GBP at 1:0.79. ADOPT + PILOT + Infrastructure totals. Headcount comparison. |
| 19 | Risk Register | Top 10 risks. Each: description, likelihood × impact, owner, mitigation, residual risk. |
| 20 | Appendices | Full tool inventory, vendor comparison matrix, governance backlog priority map, glossary. |

### Codex Adversarial Review

Run Codex review on the complete report after synthesis sections are written. Per Glen's process rules: one Codex pass per batch. Batch 4 should get the final Codex review covering synthesis sections and overall report coherence.

### Final Assembly

After all sections are written, the document needs to be reordered into RICECO document order (sections 1-20 as specified in the output format). Currently sections are in generation order (3-15 written first). The final document should flow: Executive Summary → Decision Dashboard → ToC → Methodology → Competitive Landscape → Infrastructure → Disciplines 3-15 → Synthesis 16-20.

---

## Critical Rules (unchanged)

1. No Copilot. No AccelByte.
2. AI tools only. Not generic platforms with AI features. (HARD CORRECTION from this session)
3. No generic framework padding.
4. Every scored tool gets a real profile (company, production citations, pricing, productivity). Website URLs required.
5. [VERIFY] flags for unverified claims.
6. 50% context = handoff.
7. Codex adversarial review per batch.
8. No Sonnet or Haiku subagents. Opus only.
9. McKinsey quality bar.
10. British English, no em dashes.
