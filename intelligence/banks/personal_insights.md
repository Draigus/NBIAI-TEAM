# Personal Insights -- Knowledge Bank

**Last compiled:** 2026-06-11 (full rebuild)
**Sources:** 20 qualifying claude_sessions extracts + 6 retained prior-build sources (Granola, OneDrive, Slack)
**Schema:** personal_insights v1

---

## Executive Summary

Glen's decision-making is governed by five consistent principles: quality over speed (CFO-grade or nothing, always), manual control over automation (never auto-derive health states, probabilities, or classifications), full scope before cost reduction (scope-watering is a terminal offence, not a pragmatic option), milestone-based structure over time estimates (durations are never quoted), and evidence-based verification (visual proof is required before any "done" claim). His AI team architecture -- project-agnostic, role-dispatched, skills-library-as-capability -- reflects the same philosophy applied to tooling: build the full version, trust it, keep it lean. NBI operates at GBP 55k/month revenue against a GBP 75-80k target, with a clear pipeline to close the gap through client expansion and new engagements.

---

## Strategic Decisions

**NBI business structure:** One entity, two practice areas. Gaming leads the brand; human capital is secondary. Target AA/AAA studios, not indie, not enterprise non-gaming [source: nbi_decisions_log_2026-04-20].

**AIOS is project-agnostic:** Serves consulting, product strategy, marketing, engineering -- not just WorkSage. All skills in the library stay: the library IS the capability set, not bloat. Roles auto-trigger via routing tables (skill-triggered and topic-detected). Only CLAUDE.md and MEMORY.md auto-load; everything else loaded on demand. CLAUDE.md kept under 225 lines -- critical rules only [source: handoff_2026-05-15_aios_audit_phase1].

**AI team architecture:** 33-role structure with C-suite as Opus models, ICs as Sonnet, routine tasks as Haiku. Zero Anthropic API usage for interactive work -- all through Claude Code on Max plan. Agent SDK adds ~13K tokens overhead per call (unusable for batch workloads); raw SDK with streaming is the correct pattern for programmatic Claude usage [source: nbi_decisions_log_2026-04-20, handoff_2026-04-17c_news_m2_m3_complete].

**WorkSage stays vanilla JS:** React migration explicitly rejected. "It doesn't earn its keep until complex interactive state arrives." Single monolithic HTML + modular JS over a component framework enables rapid iteration without a build step. Glen's PC serves as the production server via Cloudflare Tunnel at zero recurring cost [source: handoff_2026-04-18_desktop_migration_complete].

**WorkSage vocabulary is canonical:** "NBI Hub" = WorkSage = worksage.nbi-consulting.com. The archived Fastify+React app (projects/nbiai_app) is dead code. Confusion on this point has caused wasted work [source: handoff_2026-04-18_worksage_audit_sprint].

**PC-as-server model:** Cloudflare Tunnel + PM2 is a viable zero-cost hosting pattern for internal tools. Free tier provides tunnel, DNS, SSL, and DDoS protection. This is a deliberate choice, not a temporary measure [source: handoff_2026-04-09a_move_to_nine].

**PlaySage:** ON HOLD until client work allows Glen to build. Tech stack locked (Next.js, Supabase, Vercel). Seed ask GBP 2.5M for 24-month runway. SalarySage confirmed as a module within PlaySage, not a separate product [source: playsage_brain_module_2026-04-20].

**Q2 2026 financial position:** See brain/financial_resilience.md for current figures. [REDACTED 2026-06-11: source granola_53aa4eef is sensitivity_class: restricted and should not have been compiled into this bank. Revenue breakdown and investor debt detail removed. The restricted extract remains in intelligence/raw/granola/ for Glen's direct access only.]

**NBI AI operations as service:** NBI's AI infrastructure is a sellable client offering, not just internal tooling. "A 7-person firm delivering at the depth and consistency of a team three to four times the size." Competitive advantage is being studio-native (inside game studios) vs Big4 being external. Client offering includes Studio Brain, role-specific knowledge bases, session continuity systems [source: nbi_ai_operations_2026-05-12].

---

## Rejected Approaches

**Scope-watering:** Narrowing sources, swapping cheaper algorithms, deferring features to reduce effort. Glen's verbatim reaction: "Hacky code corner cutting watering down my intention to lower the quality is completely fucking unacceptable." Scope reduction must never be the default -- build the full version first; offer trimmed alternatives only if Glen raises cost concerns with supporting data [source: handoff_2026-04-17a_news_aggregator_m1_start].

**Time estimates:** Quoting durations (days/weeks/hours) for any project. Structure by milestone deliverables, never by duration. Calendar dates set by Glen are data; estimates from the AI are not [source: handoff_2026-04-17a_news_aggregator_m1_start].

**Suggesting cheaper alternatives unprompted:** Proposing Ollama vs Claude, Haiku vs Sonnet, or any quality downgrade to save cost is unwelcome unless Glen raises cost concerns first. Present actual cost data when relevant (the 30-day news backfill cost $0.79) [source: handoff_2026-04-17a_news_aggregator_m1_start, handoff_2026-04-17c_news_m2_m3_complete].

**Auto-calculated health states and probabilities:** Glen manually controls health assessments, win probabilities, and deal scoring. Auto-filling health state is "not a solution." Manual override must always be available [source: handoff_2026-04-06a_ux_overhaul].

**React for WorkSage:** Explicitly rejected. The vanilla JS SPA does not warrant the overhead of a component framework at its current complexity level [source: handoff_2026-04-18_desktop_migration_complete].

**Role-based toggles (MD/PM/IC):** Removed from WorkSage when they "don't earn their keep." Features must justify their UI real estate [source: handoff_2026-04-06a_ux_overhaul].

**Agent SDK for batch processing:** The Claude Agent SDK injects ~13K tokens of harness overhead per call. It is only appropriate for interactive CLI sessions; all programmatic/batch Claude work must use @anthropic-ai/sdk directly [source: handoff_2026-04-17c_news_m2_m3_complete].

**Text walls in dashboards:** Text-heavy views are rejected. Everything must be visual -- charts, progress bars, ring gauges, SVG indicators. "No data" states must show meaningful empty states, never raw nulls or UUIDs [source: handoff_2026-05-16_cc_design_requirements].

**White elements in dark theme views:** Glen hates white in dark theme. Full dark with no white elements is a hard requirement [source: handoff_2026-05-16_cc_design_requirements].

---

## Business Philosophy

**Quality standard is fixed and non-negotiable:** Glen's first live reaction to the Finances page was "That looks like absolute shit." He then sent two reference dashboard images and stated: "Nothing on this project is something you can do with minimal effort. It needs to be high quality." CFO-grade quality is the permanent bar. Every view must be presentation-ready at first render. He judges output against professional tool standards, not "good for a side project" [source: handoff_2026-04-01_quality_standard_established].

**Reference images over verbal descriptions:** Glen communicates design intent by showing reference images, not describing them. When he is dissatisfied, expect screenshots and reference designs rather than prose feedback [source: handoff_2026-04-01_quality_standard_established, handoff_2026-05-11_command_centre_design_process].

**EAD Framework:** Eliminate, Automate, Delegate -- in strict order. The key anti-pattern is "automating before eliminating" (building sophistication around waste). The human-retention boundary: "the cost of a wrong answer exceeds the cost of a slow answer" [source: nbi_ead_framework_2026-05-15].

**Innovation within constraints:** "No gold-plating and no just ship it." The quality zone sits between over-engineering and cutting corners. This applies equally to client deliverables and internal tooling [source: nbi_decisions_log_2026-04-20].

**CEO accountability principle:** "CEO must hold Glen accountable, not just execute; blind execution is a CEO failure." This applies to the AI team structure -- the AI must challenge poor decisions, not just comply [source: nbi_decisions_log_2026-04-20].

**Data-driven configuration everywhere:** Pipeline stages, field options, resource types, sectors must all come from the database, never hardcoded. "Everything data-driven" is a standing architectural rule [source: handoff_2026-04-05_security_first_pass].

**Manual control over deal flow:** Deal ownership in WorkSage is deliberately restricted to principals (Glen/Tom), not delegated to analysts. Win probability is always manual, never algorithmic. Glen wants to touch each lead entry individually -- no bulk import [source: handoff_2026-04-05_security_first_pass].

**Real data over placeholder data:** Pre-seed with real NBI financials whenever possible. Demos with fake data will be rejected. Bank statements are the source of truth for expense amounts and dates; USD expenses from GDC were already GBP (bank already converted) [source: handoff_2026-04-01_quality_standard_established, handoff_2026-04-07b_expenses_finance_qa].

**Contracts forever:** Client contracts are retained permanently. No retention cleanup. [source: handoff_2026-04-19_tech_debt_sprint].

---

## Working Patterns

**Feature approval in bulk from complete audits:** Glen approves features in bulk when presented with a structured audit. He does not want incremental proposals. His binary: "build now" vs "discuss approach" -- he never says "park it for later." 26 features approved in one session after a single comprehensive audit [source: handoff_2026-04-04_feature_approval_pattern].

**Autonomous execution is trusted for mechanical work:** "Do the ones you can do on your own." Glen trusts autonomous execution on mechanical fixes and backlog clearance. Escalate decisions and architectural choices only [source: handoff_2026-04-19_tech_debt_sprint].

**Tech debt ordered by user-facing risk:** Glen prioritises tech debt by user-facing data-loss risk, not by code aesthetics. Board drag-drop bypassing sync (silent multi-user overwrites) was higher priority than renderAll decomposition. Performance optimisation explicitly deferred until data volumes warrant it [source: handoff_2026-04-19_tech_debt_sprint].

**Visual verification before any "done" claim:** Cannot claim "fixed" without visual verification in a real browser. Stating that visual testing is not possible does not excuse skipping it -- build a different workflow. Glen had to screenshot every issue after a session where the agent repeatedly claimed "fixed" without testing [source: handoff_2026-05-12_build_antipatterns].

**Context rot awareness:** By late in a long session, basic schema lookups are missed (wrong column names, wrong status fields, wrong mailbox). Check actual schema before writing queries. Do not trust session memory for database details [source: handoff_2026-05-12_build_antipatterns].

**Visual design iteration count:** Expect 5-7 mockup iterations for visual design approval. The Command Centre went through 7 iterations before Glen approved. Design for widescreen first, responsive down. "Looks like shit on widescreen" is a terminal rejection [source: handoff_2026-05-11_command_centre_design_process].

**Dashboard design philosophy:** Executive dashboards must show 3-5 actionable numbers, not 30-40 metrics. Client-level RAG cards with progressive disclosure (collapse/expand) is the correct pattern. Exception-based views (show only problems) are preferred over comprehensive status views. Tables beat cards for data-dense views [source: handoff_2026-04-18_portfolio_dashboard_v2, handoff_2026-04-06a_ux_overhaul].

**Paying clients first:** Client ordering in all views uses `clientSortOrder()` -- paying clients (Couch Heroes, Lighthouse) always appear before non-paying [source: handoff_2026-04-06a_ux_overhaul].

**Text size requirement:** Glen wears glasses. Minimum 12px, body text 14-15px, data text 16px+. Never use small text [source: feedback_text_size].

**Tool selection via Claude Code CLI:** Claude Code in VS Code is the permanent primary interface since mid-April 2026. Not Desktop (Opus 4.6 removed from Desktop). MCP servers need manual setup on migration -- they do not transfer. Weekly config backup (514 MB zip to OneDrive, Sundays 02:00) is established infrastructure [source: handoff_2026-04-18_desktop_migration_complete].

**LLM Wiki pattern for client work:** Compile client document folders into a structured CLIENT_BRAIN.md knowledge base before starting sustained engagement work. Load the artefact; never re-read raw sources every session. /compile-client skill implements this [source: handoff_2026-05-13_karpathy_capabilities].

**AutoResearch pattern for deliverables:** Score document against weighted criteria, make atomic improvements until convergence. Three criteria sets available: consulting (6 dimensions), pricing (6 dimensions), pitch (6 dimensions). Run on consulting deliverables before client review [source: handoff_2026-05-13_karpathy_capabilities].

**Three-artifact delivery pattern for client engagements:** Excel (planning tracker), Word (execution guide with What/How/Done When for every task), WorkSage (live tracking). Deliverables should not contain NBI team member names -- use role descriptions. Always verify deadlines by working backwards from launch dates [source: handoff_2026-04-21_goals_deliverables].

---

## Client Relationship Approaches

**Audit-to-engagement conversion:** Glen's 80-page audit at Couch Heroes converted to an ongoing engagement. The audit builds trust; the ongoing work follows naturally. This is the preferred entry pattern for large studio clients [source: granola_50612dd7].

**Pre-decisions before workshops:** Binding strategic decisions are laid down before offsites to prevent relitigating. The burden of proof shifts onto anyone disagreeing. This is a deliberate facilitation choice, not an oversight [source: ch_offsite_pre_decisions_2026-04-27].

**Facilitation technique:** Person-specific watch-fors, scripted standard responses for derailments, verbatim opening lines for tone-setting. Playbook is for facilitator's eyes only [source: ch_offsite_working_doc_2026-04-27].

**Contract flexibility for early-stage studios:** Early-stage studios need general, flexible contracts -- not milestone-specific pricing locked at contract stage. The engagement must be able to evolve as the studio's needs clarify [source: slack_lorenza-dm_2026-05-25_contracts].

**Decision process codification:** Glen defines canonical decision processes for client production with explicit approval chains. At Couch Heroes: GD+EP+GC alignment required for major decisions [source: slack_production-council_2026-05-25_process].

**Client scoping in WorkSage:** External client users see only their client's data. Internal users with teams see team clients + NBI OPS + Playsage. Admins unrestricted. All new endpoints must call getClientScopes() for data filtering [source: handoff_2026-04-16b_full_day].

---

## Open Questions

- What is the right pricing for AI operations setup services? (EAD implementation, Studio Brain setup, ongoing advisory)
- How should NBI structure the PlaySage raise given current cash flow constraints and investor debt obligations?
- What is the optimal investor payback schedule vs BD investment balance?
- At what point does the WorkSage vanilla JS architecture warrant a component framework? (Currently: explicitly not yet)

---

## Source Index

| ID | Source Type | Date | Topic |
|---|---|---|---|
| handoff_2026-04-01_quality_standard_established | Claude session | 2026-04-01 | Quality bar established |
| handoff_2026-04-04_feature_approval_pattern | Claude session | 2026-04-04 | Bulk feature approval pattern |
| handoff_2026-04-05_security_first_pass | Claude session | 2026-04-05 | CRM design, manual control |
| handoff_2026-04-06a_ux_overhaul | Claude session | 2026-04-06 | 22 UX decisions, dashboard philosophy |
| handoff_2026-04-06c_glen_uat | Claude session | 2026-04-06 | UAT iteration patterns |
| handoff_2026-04-07b_expenses_finance_qa | Claude session | 2026-04-07 | Finance architecture, P&L structure |
| handoff_2026-04-09a_move_to_nine | Claude session | 2026-04-09 | PC-as-server, zero-cost hosting |
| handoff_2026-04-11b_hierarchy_dependencies | Claude session | 2026-04-11 | Work item hierarchy, terminology |
| handoff_2026-04-16b_full_day | Claude session | 2026-04-16 | Email, multi-tenancy, client scoping |
| handoff_2026-04-17a_news_aggregator_m1_start | Claude session | 2026-04-17 | No scope-watering, no timelines |
| handoff_2026-04-17c_news_m2_m3_complete | Claude session | 2026-04-17 | Agent SDK vs raw SDK |
| handoff_2026-04-18_desktop_migration_complete | Claude session | 2026-04-18 | Desktop to CLI, React rejection |
| handoff_2026-04-18_worksage_audit_sprint | Claude session | 2026-04-18 | WorkSage vocabulary, nbiai_app archive |
| handoff_2026-04-18_portfolio_dashboard_v2 | Claude session | 2026-04-18 | Portfolio dashboard philosophy |
| handoff_2026-04-19_tech_debt_sprint | Claude session | 2026-04-19 | Tech debt ordering |
| handoff_2026-05-11_command_centre_design_process | Claude session | 2026-05-11 | Command Centre design, 7 iterations |
| handoff_2026-05-12_build_antipatterns | Claude session | 2026-05-12 | Build session post-mortem, 6 antipatterns |
| handoff_2026-05-13_karpathy_capabilities | Claude session | 2026-05-13 | LLM Wiki, AutoResearch patterns |
| handoff_2026-05-15_aios_audit_phase1 | Claude session | 2026-05-15 | AIOS architecture, role dispatch |
| handoff_2026-05-16_cc_design_requirements | Claude session | 2026-05-16 | Command Centre v2 visual requirements |
| ~~granola_53aa4eef~~ | ~~Granola~~ | ~~2026-05-04~~ | REDACTED — sensitivity_class: restricted. Should not have been compiled |
| granola_50612dd7 | Granola | 2026-04-13 | Audit-to-engagement conversion |
| nbi_decisions_log_2026-04-20 | OneDrive | 2026-04-20 | Business structure, AI team |
| nbi_ai_operations_2026-05-12 | OneDrive | 2026-05-12 | AI operations as service |
| nbi_ead_framework_2026-05-15 | OneDrive | 2026-05-15 | EAD framework |
| playsage_brain_module_2026-04-20 | OneDrive | 2026-04-20 | PlaySage status |
| ch_offsite_pre_decisions_2026-04-27 | OneDrive | 2026-04-27 | Pre-decisions before workshops |
| ch_offsite_working_doc_2026-04-27 | OneDrive | 2026-04-27 | Facilitation technique |
| slack_lorenza-dm_2026-05-25_contracts | Slack | 2026-05-25 | Contract flexibility |
| slack_production-council_2026-05-25_process | Slack | 2026-05-25 | Decision process codification |
