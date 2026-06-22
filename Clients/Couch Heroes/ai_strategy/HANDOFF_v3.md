# HANDOFF — CH AI Tool Strategy v2 Batch 2

**Date:** 2026-06-15
**Branch:** `master`
**Reason for handoff:** Batch 1 complete (Animation, Art Pipeline, Audio). Context budget management per 50% rule.
**Model:** Claude Opus 4.6 [1M]

---

## Glen's Directive (unchanged from v2)

Complete rebuild of CH AI Tool Strategy. Decision-making tool, not a report. Organised by discipline. Each tool gets a FULL profile (company history, production citations, user quotes, verified pricing, productivity estimates). McKinsey quality bar. AI tools ONLY. No Copilot, no infrastructure tools.

**Process rules:** 50% context handoff. Opus-only subagents. Codex adversarial review per batch.

---

## Key Files

| File | Path | Purpose |
|------|------|---------|
| **v2 report** | `Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_v2.md` | 809 lines. Shell + sections 3 (Animation), 4 (Art Pipeline), 5 (Audio) complete. |
| **RICECO prompt** | `Clients/Couch Heroes/ai_strategy/RICECO_PROMPT_CH_AI_Tool_Strategy.md` | THE SPEC. ~570 lines. Read the exemplar section and quality checklist before writing. |
| **Tool seed list** | `Clients/Couch Heroes/ai_strategy/TOOL_SEED_LIST_v3_FINAL.md` | Pre-researched tools. Use Tier 1 tools as starting points. |
| **Old report (v1)** | `Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_Report_v1.md` | Reference ONLY. ~2,450 lines. |
| **Convergence record** | `Clients/Couch Heroes/ai_strategy/adversarial_convergence_2026-06-14.md` | 3 rounds of adversarial review of v1. |
| **Codex critique** | `Clients/Couch Heroes/ai_strategy/codex_critique_2026-06-14.md` | Codex's 8 key findings on v1. |
| **This handoff** | `Clients/Couch Heroes/ai_strategy/HANDOFF_v3.md` | You are reading it. |

---

## What Has Been Done (Batch 1)

### Sections Written (all in v2 report)

1. **Section 3: Animation** (~200 lines)
   - 4 tasks: Body Mocap, Facial Animation, Keyframe Combat, Procedural NPC/Crowd
   - Tools evaluated: Rokoko (PILOT), Move.ai (WATCH), DeepMotion (WATCH), MetaHuman Animator (ADOPT), DeepMotion Facial (WATCH), Cascadeur (PILOT), RADiCAL (AVOID — shutting down July 2026), Plask (WATCH — stale funding)
   - MetaHuman Animator scored 8.8 composite — strongest ADOPT in Batch 1
   - Animation lead instability noted throughout (PIP, expected exit, backfill needed)
   - Discipline budget: ~$8,984 pre-launch, ~$1,992/yr post-launch

2. **Section 4: Art Pipeline** (~280 lines)
   - 5 tasks: Concept Ideation, Texturing/Materials, 3D Model Gen, Procedural/VFX (Houdini ML), Environment Layout
   - Tools evaluated: Firefly (PILOT), Midjourney (WATCH — IP floor), Stable Diffusion XL (WATCH — no DevOps), Substance 3D AI (PILOT), InstaMAT (WATCH), Meshy (WATCH — team resistance), Houdini ML (WATCH — too new), Promethean AI (WATCH — micro-startup, 3 employees)
   - Sasha's opposition addressed in EVERY task section (verified)
   - Discipline budget: ~$14,400 pre-launch (possibly $0 marginal if existing Adobe CC includes Firefly)

3. **Section 5: Audio** (~200 lines)
   - 3 tasks: SFX Search/Creation, Music Composition, Audio Mastering
   - Tools evaluated: Wwise Sound Search (ADOPT conditional on Wwise), ElevenLabs SFX (PILOT), AIVA (WATCH), Soundraw (AVOID), iZotope Ozone (WATCH — NI insolvency), LANDR (WATCH)
   - SAG-AFTRA/Equity addressed in EVERY task section (verified)
   - Honest assessment on music: "Hire a composer." AI music tools can't deliver byte-punk soundtrack.
   - Discipline budget: ~$2,376 pre-launch, ~$1,188/yr post-launch

### Quality Checks Completed

- All composite score arithmetic verified and corrected (8 table/calculation mismatches fixed)
- Sensitivity floor rule applied: DeepMotion (Prod Ready 3 → WATCH), Midjourney (IP/Legal 3 → WATCH), Soundraw (Prod Ready 3 → AVOID)
- Score range: ≤3 present in all three sections ✓ (DeepMotion=3, Meshy adoption=2, SD adoption=2, Soundraw Prod=3)
- Score range: ≥9 present in all three sections ✓ (MetaHuman multiple 9s+10, Cascadeur IP=9/Cost=9, Firefly IP=9, Substance IP=9/Integration=9, Wwise IP=9/Integration=9)
- Steam disclosure flagged for every tool ✓
- Partner IP guardrails stated for every cloud tool ✓
- Governance prerequisites mapped per discipline ✓
- Budget summaries with pre-launch and post-launch ✓
- Codex adversarial review: COMPLETE. 10 findings. All CRITICAL and HIGH fixed. Details below.

### Codex Adversarial Review — Findings & Resolution

| # | Severity | Finding | Resolution |
|---|----------|---------|------------|
| 1 | CRITICAL | iZotope/NI M&A: inMusic announced definitive acquisition agreement May 2026, invalidating the insolvency rationale | Updated iZotope section with [VERIFY] flag on inMusic acquisition. Revisit date moved to Q3 2026. |
| 2 | HIGH | Epic Games described as "publicly traded via Tencent majority stake" — Epic is private, Tencent is ~40% minority | Fixed: "Private company; Tencent holds a ~40% minority stake" |
| 3 | HIGH | Audiokinetic acquired by Sony 2023 — actually 2019 | Fixed: "2019 [VERIFY: announced 2019, completion 2020]" |
| 4 | HIGH | Wwise Sound Search ADOPT but AI feature has no shipped-game evidence; ProdReady scored for base product | Downgraded to PILOT. ProdReady dropped from 7 to 6. Composite 8.0 → 7.8. Added upgrade path to ADOPT after 3-month pilot. |
| 5 | HIGH | MetaHuman audio-only mode touches SAG-AFTRA performer consent territory | Added SAG-AFTRA/Equity note: audio-only mode requires legal review, performer consent, union notification before production use. Camera-based capture is clean. |
| 6 | MEDIUM | 3 more composite arithmetic mismatches (Substance 7.1→7.2, Meshy 4.8→4.9, Houdini 6.8→6.9) | All three table entries corrected to match calculation lines. |
| 7 | MEDIUM | ElevenLabs ProdReady at 4 is generous with no shipped game | Acknowledged; added note that if no production evidence emerges, this drops to WATCH. Kept at 4 for now (GA product, well-funded company). |
| 8 | MEDIUM | ElevenLabs "safe for all categories" ignores partner IP leakage via prompts | Fixed: added guardrail (generic descriptions only, no faction/character/partner names, monthly prompt log review). |
| 9 | MEDIUM | Firefly "ideation-only" claim conflicts with disclosure trigger | Valid tension; wording is already conservative ("disclose all AI-assisted ideation"). Left as-is; the disclosure stance is correct. |
| 10 | LOW | Composite scores cluster 4.5-8.8 (no composite ≤3 or ≥9) | Not a rule violation. RICECO requires ≤3 and ≥9 at dimension level, not composite level. All three sections pass. |

---

## What Remains

### BATCH 2 (Next Session — priority order)

**Sections 6-10 in v2:**

1. **Section 6: Engineering** — Aura (TryAura.dev), Ultimate Engine CoPilot. No Copilot. Note: code assistants are a fast-moving category; recommend evaluation methodology per RICECO instruction 11.
   - Seed list tools: Aura, Ultimate Engine CoPilot
   - Research needed: Aura production evidence beyond Sinn Studio, Ultimate Engine CoPilot named studio users

2. **Section 7: DevOps & Infrastructure** — TeamCity AI Build Analyzer. Small section (CH has no DevOps).
   - Seed list tool: TeamCity AI
   - Research needed: TeamCity AI GA status (Early Access?)

3. **Section 8: Game Design** — Machinations, Ludo.ai, Promethean AI (cross-ref from Art), modl.ai (cross-ref from QA)
   - Seed list tools: Machinations, Promethean AI, Ludo.ai, modl.ai
   - Note: Machinations is borderline criterion 1 (simulation, not ML). Include with honest flag.
   - Simon Woodruff (Head of Design) just started — views unknown, do not assume buy-in

4. **Section 9: QA & Testing** — modl.ai (primary), accessibility compliance testing
   - Seed list tool: modl.ai
   - Hannah is sole QA — owner-capacity rule applies (max PILOT contingent on QA expansion)
   - RICECO requires accessibility compliance testing (WCAG audit, colour contrast for byte-punk palette)

5. **Section 10: Narrative & Localisation** — Inworld AI, Convai, Charisma.ai, memoQ, Phrase TMS
   - Seed list tools: Inworld AI, Convai, memoQ, Phrase TMS
   - Research needed: Charisma.ai (stronger production citations than Convai per seed list)
   - SAG-AFTRA/Equity applies to NPC voice features in Inworld/Convai
   - memoQ and Phrase are Year 2+ tools (localisation not needed until ~2027)

6. **Codex adversarial review of Batch 2**
7. **Handoff if needed**

### BATCH 3 (Following Session)

Sections 11-17 plus synthesis sections:

1. Section 11: Production & Project Management (Atlassian Intelligence/Rovo)
2. Section 12: Marketing & Community (ToxMod, content creation)
3. Section 13: Data & Analytics (GameAnalytics, no dedicated headcount — owner-capacity rule)
4. Section 14: HR & People (HiBob AI, SalarySage — GDPR cross-border for UK/Greece)
5. Section 15: Finance & Legal (Luminance, Harvey — commercial data sensitivity)
6. Cross-cutting Infrastructure (section 3 in final document, generated AFTER all disciplines)
7. Decision Dashboard (roll-up from all disciplines)
8. Phased Adoption Roadmap (Phase 1/2/3 mapped to Agilefall cadence)
9. Organisational Change Management (named stakeholders: Aris champion, Sasha opposition, etc.)
10. Budget Summary (USD + GBP at 0.79 rate)
11. Risk Register (top 10)
12. Executive Summary (LAST — summarises findings, not predictions)
13. Final Codex adversarial pass + convergence debate

---

## Research Data Available (from v2 handoff, use in Batch 2)

### Already Researched (use directly)

**modl.ai (QA):** $8.4M Series A (Microsoft M12). Rare (Sea of Thieves — GDC case study), Die Gute Fabrik (Saltsea Chronicles / Take-Two). UE5 plugin. Custom pricing.

**Inworld AI (Narrative):** $500M valuation. NetEase (Cygnus Enterprises), Niantic (Wol). UE5 plugin. On-Demand $25-50/M characters. SAG-AFTRA TTS compliance [VERIFY]. Steam: Live-Generated.

**Convai (Narrative):** Free / Indie $29/mo / Scale $499/mo. No shipped game. 8-10s latency, broken long-term memory (March 2026). UE5 plugin. NVIDIA marketing partner (not production). Steam: Live-Generated.

**Machinations (Game Design):** Ubisoft, Gameloft, Wargaming, King. 34% production time reduction. Free (1 seat). Borderline criterion 1 (simulation, not ML).

**Ludo.ai (Game Design):** Rovio, Ubisoft, Voodoo, SayGames, Homa, Garena. Free / Indie ~$20/mo / Studio $300/mo. Passes all 7 criteria.

**memoQ (Localisation):** Gameloft (30% productivity boost), Epic. Gaming Bundle with Gridly + Voiseed. Translator Pro $30-44/mo.

**Phrase TMS (Localisation):** Bohemia Interactive, GameHouse, Mixi. From ~$525/mo.

### Needs Research (Batch 2)

- **Aura (TryAura.dev)** — deeper production evidence, user quotes beyond Sinn Studio
- **Ultimate Engine CoPilot** — named studio users, review quality
- **TeamCity AI** — GA status, AI feature maturity
- **Charisma.ai** — company profile, production citations (BBC, Sky, Warner Bros per seed list), pricing, UE5 integration
- **modl.ai pricing** — Starter tier pricing for criterion 7 assessment

---

## Critical Rules (unchanged — do not violate)

1. No Copilot. No AccelByte.
2. AI tools only.
3. No generic framework padding.
4. Every tool gets a real profile (company, production citations, user quotes, pricing, productivity).
5. [VERIFY] flags for unverified claims — never fabricate.
6. 50% context = handoff.
7. Codex adversarial review per batch.
8. No Sonnet or Haiku subagents. Opus only.
9. McKinsey quality bar.
10. British English, no em dashes.

---

## Batch 1 Verdicts Summary (for cross-referencing in Batch 2)

| Tool | Discipline | Verdict | Composite | Key constraint |
|------|-----------|---------|-----------|----------------|
| MetaHuman Animator | Animation | ADOPT | 8.8 | Free, UE5-native, shipped in AAA |
| Cascadeur | Animation | PILOT | 7.4 | Only vendor's own game shipped |
| Rokoko | Animation | PILOT | 6.6 | RICO lawsuit risk; team instability |
| Substance 3D AI | Art | PILOT | 7.2 | $0 marginal; augments existing workflow |
| Adobe Firefly | Art | PILOT | 7.0 | Voluntary only; Sasha factor |
| Wwise Sound Search | Audio | PILOT (conditional) | 7.8 | Conditional on Wwise; AI feature has no shipped-game citation |
| ElevenLabs SFX | Audio | PILOT | 5.9 | SFX only, not voice |
| Houdini ML | Art | WATCH | 6.9 | Too new, no shipped game with ML features |
| InstaMAT | Art | WATCH | 6.3 | New DCC alongside existing Substance |
| Move.ai | Animation | WATCH | 6.0 | Unverified precision for combat |
| AIVA | Audio | WATCH | 5.3 | Weak citation, hire a composer instead |
| DeepMotion | Animation | WATCH | 5.5 | No shipped game, shrinking team |
| Meshy | Art | WATCH | 4.9 | Art team resistance, no AAA adoption |
| Midjourney | Art | WATCH | 5.9 | IP/Legal floor (3) blocks PILOT |
| Stable Diffusion XL | Art | WATCH | 5.7 | No DevOps, team resistance (2) |
| LANDR | Audio | WATCH | 5.8 | Not game-specific |
| iZotope Ozone | Audio | WATCH | 7.6 | Strong tool, NI insolvency blocks adoption |
| Promethean AI | Art | WATCH | 6.0 | 3 employees, $300K funding |
| Soundraw | Audio | AVOID | 4.5 | No game use, even jams rejected it |
| RADiCAL | Animation | AVOID | — | Shutting down July 2026 |
