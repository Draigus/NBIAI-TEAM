# HANDOFF — CH AI Tool Strategy v2 Batch 3 (Sections 11-17 + Synthesis)

**Date:** 2026-06-15
**Branch:** `master`
**Reason for handoff:** Batch 2 sections written and verified. Context available for Batch 3.
**Model:** Claude Opus 4.6 [1M]

---

## Glen's Directive (unchanged)

Complete rebuild of CH AI Tool Strategy. Decision-making tool, not a report. Organised by discipline. Each tool gets a FULL profile (company history, production citations, user quotes, verified pricing, productivity estimates). McKinsey quality bar. AI tools ONLY. No Copilot, no infrastructure tools.

**Process rules:** 50% context handoff. Opus-only subagents. Codex adversarial review per batch.

---

## Key Files

| File | Path | Purpose |
|------|------|---------|
| **v2 report** | `Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_v2.md` | ~1,560 lines. Sections 3-10 complete (8 of 14 disciplines). |
| **RICECO prompt** | `Clients/Couch Heroes/ai_strategy/RICECO_PROMPT_CH_AI_Tool_Strategy.md` | THE SPEC. ~570 lines. Read the exemplar section and quality checklist before writing. |
| **Tool seed list** | `Clients/Couch Heroes/ai_strategy/TOOL_SEED_LIST_v3_FINAL.md` | Pre-researched tools. **CAUTION: several facts corrected in HANDOFF_v4.** |
| **Batch 2 research** | `Clients/Couch Heroes/ai_strategy/HANDOFF_v4.md` | Full research for sections 6-10. Corrections and verified profiles. |
| **This handoff** | `Clients/Couch Heroes/ai_strategy/HANDOFF_v5.md` | You are reading it. |

---

## What Has Been Done

### Batch 1 (in v2 report, Codex-reviewed)
- Section 3: Animation (MetaHuman ADOPT, Rokoko PILOT, Cascadeur PILOT)
- Section 4: Art Pipeline (Firefly PILOT, Substance 3D AI PILOT, Meshy WATCH, Houdini ML WATCH, Promethean AI WATCH)
- Section 5: Audio (Wwise Sound Search PILOT conditional, ElevenLabs SFX PILOT, AIVA WATCH, Soundraw AVOID, iZotope WATCH, LANDR WATCH)

### Batch 2 (in v2 report, arithmetic-verified, Codex review attempted but non-productive)
- Section 6: Engineering (Aura PILOT 6.5, UE CoPilot WATCH 5.6, code review gap, 6-month eval framework)
- Section 7: DevOps (TeamCity AI WATCH 5.6, entire discipline premature)
- Section 8: Game Design (Machinations PILOT 7.8, Ludo.ai PILOT 6.7, Promethean AI cross-ref WATCH with CH-specific scoring table)
- Section 9: QA (modl.ai PILOT contingent 6.4, Rare correction, Die Gute Fabrik conflict flagged)
- Section 10: Narrative & Localisation (Inworld WATCH 4.7, Charisma WATCH 5.7, Convai WATCH 4.9, memoQ WATCH 7.3, Phrase WATCH 7.1, $0 current spend)

### Verification completed
- All 13 composite calculations in Batch 2 verified correct
- Score range (≤3 and ≥9) confirmed in all 5 sections
- Sensitivity floor respected throughout
- Section 8 score range fix applied (Promethean AI cross-ref expanded to explicit table with Adopt=2)
- British English, no em dashes, all (est.) markers confirmed

---

## WHAT REMAINS (Batch 3)

### Discipline Sections to Write (research needed)

These sections need WEB RESEARCH before writing. The seed list has starting points for some but not all.

| Section | Discipline | Seed List Tools | Research Needed |
|---------|-----------|----------------|-----------------|
| 11 | Production & Project Management | Atlassian Intelligence/Rovo | Verify Rovo pricing, features, game studio adoption |
| 12 | Marketing & Community | ToxMod (mentioned in RICECO) | Research ToxMod, AI content creation tools, social listening tools |
| 13 | Data & Analytics | GameAnalytics (mentioned in RICECO) | Research game analytics AI tools, 0 headcount at CH |
| 14 | HR & People | HiBob AI (CH already uses HiBob) | Research HiBob AI features, GDPR cross-border (UK+Greece), Lorenza is solo HR |
| 15 | Finance & Legal | Luminance, Harvey (mentioned in RICECO) | Research AI contract analysis, compliance tools. Lili starts 1 July. Commercial data sensitivity |

### Synthesis Sections to Write (derived from analysis)

These are generated AFTER discipline sections, per RICECO Processing Instruction 4:

| Section | Content | Notes |
|---------|---------|-------|
| 3 | Cross-cutting Infrastructure | Self-hosted vs cloud framework, API gateway, data classification |
| 1 | Methodology & Scoring | Already written (section 1-2 exist in v2 report) |
| Decision Dashboard | Roll-up from all disciplines | One table per discipline, CEO/board skim layer |
| Executive Summary | Written LAST | Lead with top 3 ADOPT, top 2 AVOID |
| 16 | Phased Adoption Roadmap | Phase 1/2/3 mapped to Agilefall cadence |
| 17 | Organisational Change Management | Named stakeholder analysis |
| 18 | Budget Summary | USD + GBP at 1:0.79 |
| 19 | Risk Register | Top 10, likelihood × impact |
| 20 | Appendices | Full tool inventory, vendor matrix, governance map |

### Competitive Landscape Section
- Section 2 in the RICECO spec: 500 words max, verifiable public statements only
- 3-5 MMO/live-service studios' public AI adoption decisions

---

## RUNNING VERDICTS (for synthesis reference)

### All Verdicts So Far (Batch 1 + Batch 2)

| Tool | Discipline | Verdict | Composite |
|------|-----------|---------|-----------|
| MetaHuman Animator | Animation | ADOPT | 8.8 |
| Rokoko | Animation | PILOT | 6.6 |
| Cascadeur | Animation | PILOT | 7.4 |
| Adobe Firefly | Art | PILOT | 7.0 |
| Substance 3D AI | Art | PILOT | 7.2 |
| Meshy | Art | WATCH | 4.9 |
| Houdini ML | Art | WATCH | 6.9 |
| Promethean AI | Art | WATCH | 6.0 |
| Wwise Sound Search | Audio | PILOT (conditional) | 7.8 |
| ElevenLabs SFX | Audio | PILOT | 5.9 |
| AIVA | Audio | WATCH | 5.3 |
| Soundraw | Audio | AVOID | 4.5 |
| iZotope Ozone | Audio | WATCH | 7.6 |
| LANDR | Audio | WATCH | 5.8 |
| Aura | Engineering | PILOT | 6.5 |
| UE CoPilot | Engineering | WATCH | 5.6 |
| TeamCity AI | DevOps | WATCH | 5.6 |
| Machinations | Game Design | PILOT | 7.8 |
| Ludo.ai | Game Design | PILOT | 6.7 |
| modl.ai | QA | PILOT (contingent) | 6.4 |
| Inworld AI | Narrative | WATCH | 4.7 |
| Charisma.ai | Narrative | WATCH | 5.7 |
| Convai | Narrative | WATCH | 4.9 |
| memoQ | Localisation | WATCH | 7.3 |
| Phrase TMS | Localisation | WATCH | 7.1 |

**Totals so far:** 1 ADOPT, 9 PILOT, 14 WATCH, 1 AVOID (25 tools evaluated)

### Budget So Far

| Discipline | Pre-Launch | Post-Launch Annual |
|-----------|-----------|-------------------|
| Animation | ~$8,984 | ~$1,992 |
| Art Pipeline | ~$14,400 | ~$5,400 |
| Audio | ~$2,376 | ~$1,188 |
| Engineering | ~$2,880 | ~$1,440 |
| DevOps | $0 | $0 |
| Game Design | ~$2,400-$5,280 | ~$1,200-$2,640 |
| QA | ~$60,000 [VERIFY] | ~$30,000 |
| Narrative & Localisation | $0 | $0 |
| **Running Total** | **~$91,040-$93,920** | **~$41,220-$42,660** |

Note: QA estimate is based on a 2022 CEO quote and could differ substantially.

---

## Critical Rules (unchanged)

1. No Copilot. No AccelByte.
2. AI tools only.
3. No generic framework padding.
4. Every tool gets a real profile (company, production citations, user quotes, pricing, productivity).
5. [VERIFY] flags for unverified claims.
6. 50% context = handoff.
7. Codex adversarial review per batch.
8. No Sonnet or Haiku subagents. Opus only.
9. McKinsey quality bar.
10. British English, no em dashes.
