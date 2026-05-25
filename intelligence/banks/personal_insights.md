# Personal Insights -- Knowledge Bank

**Last compiled:** 2026-05-25 (full rebuild)
**Sources:** 30+ extracts (20 Claude sessions, 5 OneDrive, 3 Granola, 2 Slack)
**Schema:** personal_insights v1

## Executive Summary

Glen's decision-making is characterised by five consistent principles: quality over speed (CFO-grade or nothing), manual control over automation (never auto-derive health states or probabilities), full scope before cost reduction (scope-watering is unacceptable), milestone-based structure over time estimates (never quote durations), and evidence-based verification (visual proof before any "done" claim). His Q2 2026 business strategy reveals NBI operating at GBP 55k/month revenue against a GBP 75-80k/month target, with a clear pipeline to close the gap.

## Strategic Decisions

**NBI business structure:** One entity with two practice areas -- gaming leads the brand, human capital is secondary. Target AA/AAA studios, not indie, not enterprise non-gaming [source: nbi_decisions_log_2026-04-20].

**AI team architecture:** 33-role structure with C-suite (CEO, COO, CFO) as Opus models, ICs as Sonnet, routine tasks as Haiku. Zero Anthropic API usage for interactive work -- all through Claude Code on Max plan. Agent SDK adds ~13K tokens overhead per call, unusable for batch workloads; raw SDK with streaming is correct [source: nbi_decisions_log_2026-04-20, handoff_2026-04-17c].

**AIOS is project-agnostic:** Serves consulting, product strategy, marketing, engineering -- not just WorkSage. All skills stay (the library IS the capability set). Roles auto-trigger via routing tables [source: handoff_2026-05-15].

**PlaySage:** Product ON HOLD until client work allows Glen to build. Tech stack locked (Next.js, Supabase, Vercel). Seed ask GBP 2.5M for 24-month runway. SalarySage confirmed as module within PlaySage, not separate product [source: playsage_brain_module_2026-04-20].

**WorkSage stays vanilla JS:** React migration explicitly rejected. Single monolithic HTML file over component framework enables rapid iteration. Glen's PC serves as production server via Cloudflare Tunnel at zero recurring cost [source: handoff_2026-04-18_desktop_migration].

**Q2 2026 cash flow:** Revenue GBP 55k/month (Couch GBP 30k, Lighthouse GBP 25k, Activision GBP 5k). Target GBP 75-80k/month. High-confidence pipeline: UXR/data science expansion GBP 150-250k/year, Lighthouse data manager GBP 130-150k/year, Greek fund auditing GBP 50-100k initial [source: granola_53aa4eef].

**Investor debt:** GBP 600k owed to Bob, Brian, and partners. Proposed payback: 30-50% of net profit capped at GBP 100k per quarter. Conservative scenario: ~1.3-year payback from GBP 200k annual net profit [source: granola_53aa4eef].

## Rejected Approaches

- **Scope-watering:** Narrowing sources, swapping cheaper algorithms, deferring features to reduce effort. Glen's verbatim: "Hacky code corner cutting watering down my intention to lower the quality is completely fucking unacceptable" [source: handoff_2026-04-17a].
- **Time estimates:** Quoting durations (days/weeks) for any project. Structure by milestone deliverables, never by duration [source: handoff_2026-04-17a].
- **Auto-calculated health states:** Glen manually controls health assessments and probability estimates [source: handoff_2026-04-06a].
- **React for WorkSage:** "It doesn't earn its keep until complex interactive state arrives" [source: handoff_2026-04-18_desktop_migration].
- **Suggesting cheaper alternatives:** Proposing Ollama vs Claude to save cost is unwelcome unless Glen raises cost concerns first. Actual cost of 30-day news backfill: $0.79 [source: handoff_2026-04-17a].
- **Role-based toggles (MD/PM/IC):** Removed from dashboard when they "don't earn their keep" [source: handoff_2026-04-06a].

## Business Philosophy

**Quality standard:** "That looks like absolute shit" was Glen's response to the initial Finances page. CFO-grade quality is the permanent bar. Every view must be presentation-ready at first render. He judges output against professional tool standards, not "good for a side project" [source: handoff_2026-04-01].

**AI operations as service:** NBI's AI infrastructure is a sellable client service, not just internal tooling. "A 7-person firm delivering at the depth and consistency of a team three to four times the size." Client offering includes Studio Brain, role-specific knowledge bases, session continuity systems [source: nbi_ai_operations_2026-05-12].

**EAD Framework:** Eliminate, Automate, Delegate -- in strict order. Key anti-pattern: "automating before eliminating" builds sophistication around waste. The boundary for human retention: "the cost of a wrong answer exceeds the cost of a slow answer" [source: nbi_ead_framework_2026-05-15].

**Innovation within constraints:** "No gold-plating and no 'just ship it'" -- the quality zone is between over-engineering and cutting corners [source: nbi_decisions_log_2026-04-20].

**CEO accountability:** "CEO must hold Glen accountable, not just execute; blind execution is a CEO failure" -- this applies to the AI team structure [source: nbi_decisions_log_2026-04-20].

## Working Patterns

**Feature approval style:** Glen approves features in bulk when presented with a structured audit. He does not want incremental proposals. His binary: "build now" vs "discuss approach" -- he never says "park it for later" [source: handoff_2026-04-04].

**Design communication:** Reference images are how Glen communicates design intent -- he shows, not describes. Expect 7+ mockup iterations for visual design approval. Must design for widescreen first. "Looks like shit on widescreen" is a terminal rejection [source: handoff_2026-05-11].

**Visual requirements:** Full dark theme (no white elements ever), text walls rejected (everything must be charts/bars/rings/gauges), raw data (UUIDs, "no data" panels) destroys trust, dense widescreen layout with minimal scrolling [source: handoff_2026-05-16].

**Text sizes:** Glen wears glasses. Minimum 12px, body text 14-15px, data 16px+.

**Tech debt ordering:** Prioritised by user-facing data-loss risk, not code aesthetics. Board drag-drop bypassing sync was highest-risk (silent overwrites). Performance optimisation explicitly deferred until data volumes justify it [source: handoff_2026-04-19].

**Autonomous execution trust:** "Do the ones you can do on your own" -- Glen trusts autonomous execution on mechanical fixes. Only escalate decisions and architectural choices [source: handoff_2026-04-19].

**Tab naming:** Should reflect function, not convention. "Dashboard" = executive view, "Workload" = current work. "Prerequisites" is the canonical term (never Dependencies/Blockers) [source: handoff_2026-04-06a, handoff_2026-04-11b].

## Client Relationship Approaches

**Audit-to-engagement conversion:** Glen's 80-page audit at CH converted to ongoing engagement. The audit builds trust; the ongoing work follows naturally [source: granola_50612dd7].

**Pre-decisions before workshops:** Binding strategic decisions laid down before offsites prevent relitigating. Burden of proof shifts onto anyone disagreeing [source: ch_offsite_pre_decisions_2026-04-27].

**Facilitation technique:** Person-specific watch-fors, scripted standard responses for derails, verbatim opening lines for tone-setting. Playbook is for facilitator's eyes only [source: ch_offsite_working_doc_2026-04-27].

**Contract flexibility:** Early-stage studios need general, flexible contracts -- not milestone-specific pricing locked at contract stage [source: slack_lorenza-dm_2026-05-25_contracts].

**Decision process codification:** Glen defined the canonical decision process for CH production with explicit approval chain (GD+EP+GC alignment required) [source: slack_production-council_2026-05-25_process].

## Open Questions

- What is the right pricing for AI operations setup services?
- How should NBI structure the PlaySage raise given current cash flow constraints?
- What is the optimal investor payback schedule vs BD investment balance?

## Source Index

| ID | Source Type | Date |
|---|---|---|
| handoff_2026-04-01 | Claude | 2026-04-01 |
| handoff_2026-04-04 | Claude | 2026-04-04 |
| handoff_2026-04-06a | Claude | 2026-04-06 |
| handoff_2026-04-06c | Claude | 2026-04-06 |
| handoff_2026-04-09a | Claude | 2026-04-09 |
| handoff_2026-04-11b | Claude | 2026-04-11 |
| handoff_2026-04-17a | Claude | 2026-04-17 |
| handoff_2026-04-17c | Claude | 2026-04-17 |
| handoff_2026-04-18 | Claude | 2026-04-18 |
| handoff_2026-04-19 | Claude | 2026-04-19 |
| handoff_2026-05-11 | Claude | 2026-05-11 |
| handoff_2026-05-12 | Claude | 2026-05-12 |
| handoff_2026-05-13 | Claude | 2026-05-13 |
| handoff_2026-05-15 | Claude | 2026-05-15 |
| handoff_2026-05-16 | Claude | 2026-05-16 |
| granola_53aa4eef | Granola | 2026-05-04 |
| granola_50612dd7 | Granola | 2026-04-13 |
| nbi_decisions_log_2026-04-20 | OneDrive | 2026-04-20 |
| nbi_ai_operations_2026-05-12 | OneDrive | 2026-05-12 |
| nbi_ead_framework_2026-05-15 | OneDrive | 2026-05-15 |
| playsage_brain_module_2026-04-20 | OneDrive | 2026-04-20 |
| nbi_dashboard_project_brief | OneDrive | 2026-05 |
| ch_offsite_pre_decisions_2026-04-27 | OneDrive | 2026-04-27 |
| ch_offsite_working_doc_2026-04-27 | OneDrive | 2026-04-27 |
| slack_lorenza-dm_2026-05-25_contracts | Slack | 2026-05-25 |
| slack_production-council_2026-05-25_process | Slack | 2026-05-25 |
