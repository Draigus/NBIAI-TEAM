# HANDOFF — CH AI Tool Strategy Report — Adversarial Convergence
**Date:** 2026-06-14 (Session 3 continuation — post-compaction)
**Branch:** `feat/deep-linking` (contains all work — uncommitted changes in report file)
**Reason for handoff:** Context budget breach at 75%+. Work is safe but session must end.

---

## Glen's Original Instruction (Verbatim)

> "give your very sketchy performance setup your self to spin up the ai game team and game skills and have them use apify to do thier research and critic the report against it. If this isnt a 200K value or more report that is at least a 9 of 10 against a full detailed mackenzie report then its wrong and needs fixing have codex do the same and then do an advesarial convergence on the report as a whole and fix it"

**Translation:** The CH AI Tool Strategy Report must meet McKinsey £200K+ engagement quality (9/10 minimum). Multi-agent Apify research + Codex adversarial review + convergence + fix everything.

---

## Client Context

- **Client:** Couch Heroes (CH Game Development UK Ltd) — ~55 employees, 100% remote, building a PC MMO in Unreal Engine 5
- **Recipients:** Vardis (CEO), Aris (COO), Dino (General Counsel)
- **Report:** AI Tool Strategy — 54 tools evaluated across 14 disciplines, with composite scoring, phased rollout plan, budget projections, legal/IP analysis
- **Report file:** `Clients/Couch Heroes/ai_strategy/CH_AI_Tool_Strategy_Report_v1.md` (~2,400 lines, ~32,000 words)

---

## What Has Been Done Across All Sessions

### Session 1 (earlier today)
- Generated full 54-tool report from RICECO prompt + seed list
- First Codex adversarial review found 10 material errors

### Session 2 (earlier today, pre-compaction)
- Applied all 10 Codex round 1 findings
- Second Codex adversarial review found 10 more findings
- Applied all 10 Codex round 2 findings (Ludo.ai reclassification, Machinations framing, Pragma/Nakama note, Substance scope, Steam disclosure narrowing, SAG-AFTRA update, Phase 1 capping, GC gate table, HiBob rewrite, budget auditability)
- Fixed budget arithmetic (column totals didn't match line items)
- Fixed 5 composite score errors (Mixpanel, GameAnalytics, Ludo.ai, Luminance, Harvey AI)
- Fixed PILOT/WATCH counts (PILOT 11→10, WATCH 28→32, total confirmed 54)
- Cleaned ~44 [VERIFY] flags down to 7 legitimate [UNVERIFIED] items requiring vendor contact

### Session 3 — This Session (post-compaction)
Ran the full adversarial convergence pipeline Glen requested:

**Step 1 — 6-Agent Apify Workflow:**
- 6 specialist agents (game tech, pricing, legal, MMO architecture, competitive intel, financial analysis)
- Each used Apify web-browser Actor to verify claims against live sources
- Result: 40 confirmed findings, 7 rejected findings
- Overall score: **6.8/10**

**Step 2 — Codex Adversarial Critique:**
- Via Arthrea Coordination Bridge (`D:\OneDrive\Arthrea_Coordination_Bridge`)
- Command: `node bridge.js critique --file "<report>" --lens "mckinsey-quality-bar"`
- Result: 8 key findings (saved to `codex_critique_2026-06-14.md`)

**Step 3 — Adversarial Convergence:**
- Reconciled all findings from both sources
- Prioritised by credibility impact (CRITICAL > HIGH > MEDIUM > LOW)
- Verified the two most damaging findings independently via Apify before applying

**Step 4 — Fixes Applied (all completed, all clean):**

#### CRITICAL Fixes

| Fix | What Changed | Report Sections Modified |
|-----|-------------|------------------------|
| modl.ai product pivot | Entire tool rewritten. Was: "UE5 SDK plugin for 200-600 concurrent bots." Now: "black-box visual testing, no SDK, incompatible with MMO combat." Downgraded PILOT 7.3 → WATCH 5.1. Recommended custom bot infrastructure (UE5 AI Controller bots, server-side, as Rare/Riot/Blizzard use). Estimated ~£30K-50K engineering. | Section 10.2.1 (full rewrite), 10.3, 10.4, 10.5, 18.2, 18.4, 19 (Hannah's row), 19 (training), 20.1, 20.2, 21 (risk register #5, #8), Appendix A (score), Appendix E |
| Rovo pricing | Was: $20/user/month ($8,280/yr pre-launch, $3,600/yr post-launch). Now: $0 — included in all paid JIRA subscriptions. The $20/month is Rovo Dev (separate coding product, not relevant). | Section 12, 20.1, 20.2, 20.5, Appendix E |
| Rare/modl.ai | Was: "Rare publicly partnered with modl.ai for Sea of Thieves." Now: "Rare built internal automated testing bots (GDC presentation by Robert Masella)." | Section 2 competitive landscape |
| Budget cascade | Pre-launch: $53,384-139,222 → **$39,104-115,942**. Post-launch: simplified (no modl.ai scaling scenario). Conservative ~$39K, Moderate ~$85K, Full ~$116K. | Sections 20.1, 20.2, 20.4, 20.5, Executive Summary |

#### HIGH Fixes

| Fix | What Changed | Report Sections |
|-----|-------------|----------------|
| Copilot AI Credits | Added: "As of June 1, 2026, GitHub Copilot uses usage-based AI Credits. $19/seat base includes 1,900 credits. Standard completions unlimited. Premium features (agent mode, multi-file edits) consume credits at variable rates." Recommended $500/month org-wide overage ceiling. | Section 4, 20.3 |
| Copilot 55% contextualisation | The 55.8% figure is from arXiv:2302.06590 — measuring time to complete an HTTP server in JavaScript. NOT representative of C++/UE5/MMO networking code. Real-world full-workflow studies show 10-25%. Added context everywhere the figure appears. | Executive Summary, Section 20.3, efficiency claims note |
| FX rate | Was: 0.79 GBP/USD. Now: 0.75 (June 2026 spot rate). All GBP figures recalculated. | Section 20.5 |
| Anti-cheat two-layer | Added CRITICAL NOTE: EAC is client-side only. For subscription MMO with player economy, server-authoritative validation is the primary defence layer. EAC catches commodity cheats; server-side catches economy exploits, speed hacks, teleportation. Every successful MMO (WoW, FFXIV, ESO, GW2) uses both layers. | Section 15.2.1 |
| Sentry citation | Was: "used by Supercell." Now: "used by Riot Games, CCP Games, Facepunch Studios" (confirmed on Sentry's gaming customers page). | Section 4 |
| Implementation costs | New Section 20.4a: $30K-59K overhead (~35-50% of licence spend). Covers: training/upskilling, productivity dip (3-6 months), governance/policy drafting, change management, vendor procurement/legal, integration engineering. | Section 20.4a (new) |
| Hard-blocker gates | Added to Section 1.2: 5 gates applied BEFORE composite scoring. Any gate failed = tool cannot proceed regardless of score. Gates: (1) Named owner exists, (2) Operational dependency met, (3) Shipped-content risk assessed, (4) Failure blast radius bounded, (5) Time to value < 6 months for Phase 1. | Section 1.2 |

---

## Workflow Scoring Breakdown (8 Dimensions)

| Dimension | Score | Why |
|-----------|-------|-----|
| factual_accuracy | 6.5 | Fixed by CRITICAL corrections above → now ~8.5 |
| strategic_depth | 5.5 | **STILL WEAK** — needs maturity assessment, scenario planning |
| analytical_rigour | 7.5 | Improved by hard-blocker gates, implementation costs |
| financial_analysis | 5.0 | **WEAKEST** — needs ROI/NPV/payback model |
| presentation_quality | 7.5 | Adequate |
| methodology_and_scoring | 8.5 | Strong — gating criteria pushed it higher |
| mmo_domain_expertise | 5.0 | **STILL WEAK** — needs server orchestration, telemetry architecture |
| governance_and_legal | 8.0 | Strong |

**Estimated post-fix score: 7.8-8.0/10.** The three dimensions at 5.0-5.5 are the gap to 9/10.

---

## What Remains to Reach 9/10

### The Three Weakest Dimensions (must fix all three)

**1. Financial Analysis (5.0 → target 8.5)**
- Write ROI/NPV section with payback periods per tool tier
- Model: Year 1 costs vs Year 2-3 productivity gains
- Include sensitivity analysis (what if adoption is 50% of forecast?)
- Include opportunity cost of NOT adopting (competitor advantage erosion)
- Place after current Section 20.5 as new Section 20.6 or restructure Section 20

**2. Strategic Depth (5.5 → target 8.5)**
- AI Maturity Assessment: score CH on a 1-5 scale across 6 dimensions (data infrastructure, engineering practices, AI literacy, governance readiness, change management capacity, tool ecosystem maturity). CH probably scores 1.5-2.0. This single number tells the board "you need to walk before you run."
- Strategic scenario planning: 4 named scenarios (Conservative £39K, Moderate £85K, Aggressive £116K, Transformative £200K+) with different tool mixes, different hiring assumptions, different timelines, and different risk profiles. Board picks which scenario to fund.
- Build-vs-buy decision tree: when to use SaaS tools vs build internal (based on: competitive advantage, data sensitivity, customisation needs, team capacity, cost at scale)

**3. MMO Domain Expertise (5.0 → target 8.0)**
- Game server orchestration section: Agones (open-source, K8s-native) vs GameLift (AWS managed) vs custom. CH needs this for their MMO backend — it gates load testing, bot simulation, and observability tool recommendations.
- Player telemetry architecture: what to instrument NOW (before tools), so analytics tools have data to work with later.
- Network/latency testing category: tools for simulating 1000+ concurrent players with varying latency profiles.

### MEDIUM Priority Corrections

| Item | Detail | Where |
|------|--------|-------|
| Cascadeur Pro cost | Should be $294/yr not $240/yr | Section 7, Appendix E |
| Machinations framing | Currently rated as AI tool but core value is deterministic simulation. Frame as "AI-augmented simulation" not "AI tool" | Section 9 |
| Network/latency testing | Missing tool category entirely — critical for MMO. At minimum note the gap. | New subsection in Section 15 or 10 |
| Community management | Timing unclear — when does CH need moderation AI? Post-launch only. | Section 13 |
| Player telemetry | Architecture decisions needed NOW even if tool selection is later | Section 15 or new subsection |
| Employee count | Report says "~55 employees" in some places, "~70" in others. Brain says ~55. Verify with Glen. | Executive Summary, multiple |

### LOW Priority (Polish for 9.5+)

- Houdini ML: credit Houdini Labs community, not just SideFX marketing
- MetaHuman: note Android Live Link support coming
- iZotope Ozone 12: verify $10-20/mo subscription vs perpetual
- Rokoko: clarify which plan tier is recommended
- Promethean: $29.99/mo Indie (was $19.99 in seed list)
- Substance 3D: note Steam version vs Creative Cloud version differences
- Firefly: explain credit consumption model for enterprise
- Vendor concentration: note that 40%+ of ADOPT tools are Adobe/Autodesk/Microsoft

---

## Verification Checkpoints (for next session)

Before starting new content, verify the report's current state is clean:

1. **Section 10.2.1** — should describe modl.ai as black-box visual testing, WATCH 5.1, with custom bot infrastructure recommendation
2. **Section 12** — Rovo should show $0 cost, "included in JIRA Premium"
3. **Section 20.1 TOTAL row** — should read $39,104-115,942 (pre-launch)
4. **Section 20.5** — FX rate should be 0.75, not 0.79
5. **Appendix A** — modl.ai row should show 5.1 WATCH (not 7.3 PILOT)
6. **Appendix E** — Rovo should show $0, modl.ai should show $0 WATCH
7. **Executive Summary** — budget should reference $39K-116K pre-launch range
8. **Section 1.2** — hard-blocker gates table should exist (5 gates)

If any of these fail, the file may have been corrupted by partial edits. Restore from the last clean state in git history on `feat/deep-linking`.

---

## Key Files (Full Paths)

| File | Purpose |
|------|---------|
| `d:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Couch Heroes\ai_strategy\CH_AI_Tool_Strategy_Report_v1.md` | THE REPORT |
| `d:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Couch Heroes\ai_strategy\adversarial_convergence_2026-06-14.md` | Convergence record — all findings, dispositions, scores |
| `d:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Couch Heroes\ai_strategy\codex_critique_2026-06-14.md` | Codex bridge output (8 findings) |
| `d:\OneDrive\Claude_code\NBIAI_TEAM\projects\nbi_dashboard\session_logs\2026-06-14_session.md` | Session log |
| `D:\OneDrive\Arthrea_Coordination_Bridge` | Codex adversarial bridge CLI |
| `d:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Couch Heroes\ai_strategy\RICECO_PROMPT_CH_AI_Tool_Strategy.md` | Original generation prompt |
| `d:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Couch Heroes\ai_strategy\TOOL_SEED_LIST_v3_FINAL.md` | Pre-researched tool data |

---

## Evidence Sources Used

| Source | How accessed | What it proved |
|--------|-------------|---------------|
| modl.ai product page | Apify web-browser Actor | "No integration — no SDKs, no code hooks" + "analyzing what's on screen and sending simulated inputs" |
| Atlassian pricing/support docs | Apify web-browser Actor | "Rovo is now included in all paid Jira, Confluence subscriptions" + "not currently billing for usage above included allowance" |
| GitHub blog (April 27, 2026) | Workflow agent research | Copilot AI Credits transition June 1, 2026 |
| arXiv:2302.06590 | Workflow agent + Codex | The 55.8% figure methodology (JavaScript HTTP server task) |
| Sentry gaming customers page | Workflow agent | Riot Games, CCP Games, Facepunch Studios confirmed; Supercell NOT on page |
| GDC archives | Workflow agent | Robert Masella (Rare) presentation on internal bot testing |
| Currency data June 2026 | Workflow agent | GBP/USD spot rate ~0.75 |

---

## Process Notes for Next Session

1. **Do NOT re-run the full 6-agent workflow.** The findings are captured in `adversarial_convergence_2026-06-14.md`. Use that as the source of truth.
2. **The remaining work is ADDITIVE.** No more corrections needed. Write new sections, insert them in logical positions, update the table of contents and cross-references.
3. **After writing new sections:** run one final Codex adversarial pass to score the complete report. If it scores 9/10+, the work is done.
4. **Apify is available** for fact-checking any new content (ROI benchmarks, maturity frameworks, server orchestration pricing). Use it.
5. **The report has NOT been committed this session.** All changes are in the working tree. Commit after verifying coherence.
6. **Glen's quality bar:** "at least a 9 of 10 against a full detailed McKinsey report." This means: executive-ready framing, defensible numbers, strategic frameworks, no hand-waving, every claim sourced or flagged [UNVERIFIED].

---

## Resume Sequence (Step by Step)

1. Read `adversarial_convergence_2026-06-14.md` (103 lines — full context)
2. Read report Sections 18-21 (lines ~1600-2200 — phasing, budget, risk, appendices)
3. Run verification checkpoints above (8 checks)
4. **Priority 1:** Write ROI/NPV section — model payback periods for Conservative/Moderate/Full scenarios. Use industry benchmarks for developer productivity ROI (Apify if needed). Insert after Section 20.5.
5. **Priority 2:** Write AI Maturity Assessment — score CH across 6 dimensions. This is a framework section, insert as new Section 3 (before tool evaluations begin).
6. **Priority 3:** Write game server orchestration subsection — Agones vs GameLift vs custom, with CH-specific recommendation. Insert in Section 15 or as new Section 15.5.
7. **Priority 4:** Write strategic scenario planning — 4 scenarios with tool mixes. Insert as new Section 21 or restructure existing Section 18.
8. Apply MEDIUM corrections (Cascadeur $294, employee count clarification)
9. Run final Codex adversarial pass: `cd D:\OneDrive\Arthrea_Coordination_Bridge && node bridge.js critique --file "d:\OneDrive\Claude_code\NBIAI_TEAM\Clients\Couch Heroes\ai_strategy\CH_AI_Tool_Strategy_Report_v1.md" --lens "mckinsey-quality-bar"`
10. If score >= 9/10: commit, update session log, notify Glen for UAT
11. If score < 9/10: read Codex output, apply remaining fixes, re-run
