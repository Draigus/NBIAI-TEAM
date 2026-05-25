# Personal Insights — Knowledge Bank

**Last compiled:** 2026-05-25
**Sources:** 20 extracts from Claude session handoffs (2026-04-01 to 2026-05-16)
**Schema:** personal_insights v1

---

## Executive Summary

Glen Pryer's decision-making is governed by five interlocking principles: quality absolutism (every output must meet commercial SaaS standards, not "good enough"), full-scope commitment (build the complete vision first, trim only with real justification), manual control over judgement calls (health state, probability, client ordering are never auto-derived), data-driven infrastructure (everything configurable from the database, nothing hardcoded), and exception-based management (show problems, not status reports). He makes decisions fast when presented with complete audits, trusts autonomous execution on mechanical work, and reserves his attention for architectural choices and visual quality. He communicates design intent through reference images, judges by widescreen rendering, and will iterate 7+ times on visual design until it feels "exciting, not just functional." [source: handoff_2026-04-01_finances, handoff_2026-04-04_finances_and_features, handoff_2026-04-06a_ux_overhaul, handoff_2026-05-11_command_centre]

---

## Strategic Decisions

### Architecture: Vanilla JS Over React

Glen asked whether WorkSage should move to React. The answer was no -- it is a single-page internal dashboard served from Express, talking to Postgres via pg. React does not earn its keep until complex interactive state arrives. Glen confirmed this rejection explicitly. WorkSage stays as a vanilla JS SPA. [source: handoff_2026-04-18_desktop_migration_complete]

### Architecture: PC as Production Server

Glen's PC serves as the production server for WorkSage. Internet > worksage.nbi-consulting.com > Cloudflare Tunnel (free tier) > localhost:8888 > PM2 > Node.js > PostgreSQL. Zero recurring hosting cost. The decision reflects Glen's preference for controlled, self-hosted infrastructure over cloud services when the use case is internal tooling. [source: handoff_2026-04-09a_move_to_nine]

### Architecture: AIOS is Project-Agnostic

The AI operating system serves all NBI work (consulting, product strategy, marketing, engineering), not just WorkSage. All skills stay -- the full library IS the capability set, not bloat. Roles auto-trigger via routing tables. CLAUDE.md stays lean (<225 lines), everything else loaded on demand. [source: handoff_2026-05-15_aios_audit_phase1]

### AI Operations as Revenue Stream

NBI's AI tooling is both operational infrastructure and a sellable service. Competitive advantage: NBI is studio-native (lives inside game studios) while Big4 consultancies are external. The /compile-client and /autoresearch skills embody Karpathy-derived patterns (LLM Wiki, AutoResearch) that are directly applicable to client work. [source: handoff_2026-05-13_karpathy_capabilities]

### Agent SDK vs Raw SDK

The Claude Agent SDK adds ~13K tokens overhead per call (full harness injection). Unusable for batch LLM workloads. Raw @anthropic-ai/sdk with streaming is the correct pattern for programmatic Claude usage. Actual cost of 34 LLM calls for a month of news curation: $0.79. Do not pre-optimise costs -- real numbers are usually trivial. [source: handoff_2026-04-17c_news_m2_m3_complete]

### Model Selection: Quality Over Budget

Glen chose claude-sonnet-4-6 for all news pipeline stages, rejecting Haiku downgrade because "curation and summaries are the whole point." Suggesting cheaper model alternatives to save cost is unwelcome unless Glen raises cost concerns first. Model selection should match the task's quality requirements, not budget anxiety. [source: handoff_2026-04-17a_news_aggregator_m1_start]

### Work Item Hierarchy: Locked at 4 Levels

Project > Feature > Story > Task. Not "Tickets" -- Glen explicitly rejected that term. Terminology is "Prerequisites" not "Dependencies" or "Blocked By." Sidebar uses "Projects" and "My Work" (not "Tasks" / "My Tasks"). No 5th level without re-reading the README. [source: handoff_2026-04-11b_hierarchy_dependencies_timeline]

### Finance: Consulting P&L Structure

Revenue is "Fee Income" not "Revenue." P&L structure: Fee Income > Cost of Services (billable staff with 15% employer costs) > Gross Profit > Support Staff > OpEx > Net Profit. Bank statements are the source of truth for expense amounts and dates. Expense dates must match actual bank transaction dates, never placeholders. [source: handoff_2026-04-07b_expenses_finance_qa]

### Multi-Tenancy: Client-Scoped Access

External users see only their client's data. Internal users with teams see only their team's clients plus shared entities. Admins unrestricted. 40+ endpoints scoped via getClientScopes(). Email uses Microsoft Graph API (Azure Security Defaults block SMTP AUTH). [source: handoff_2026-04-16b_full_day]

---

## Rejected Approaches

### Scope Reduction as Default
Glen's verbatim: "Hacky code corner cutting watering down my intention to lower the quality is completely fucking unacceptable." Triggered by narrowing 46 news sources to 10, swapping entity-extraction clustering for "LLM picks one representative," dropping features, and suggesting Ollama to save pennies. Default to the quality outcome; cost and scope trims offered only after the quality version is on the table. [source: handoff_2026-04-17a_news_aggregator_m1_start]

### Duration Estimates
Glen's verbatim: "Stop quoting timelines; you're terrible at them." Triggered by cycling through 2 days, 4 weeks, and 6-8 weeks on the same project within an hour. Structure work by milestone deliverables, never by duration. Calendar dates set by Glen are data, not estimates. [source: handoff_2026-04-17a_news_aggregator_m1_start]

### React for WorkSage
Explicitly rejected. Vanilla JS SPA is sufficient for an internal dashboard. React does not earn its keep until complex interactive state arrives. [source: handoff_2026-04-18_desktop_migration_complete]

### Auto-Calculated Health State
Glen's directive: "Auto-filling my health is not a solution." Health state is always manual -- Glen controls this himself. Never implement auto-calculation of project health. [source: handoff_2026-04-06a_ux_overhaul]

### Auto-Calculated Win Probability
Glen insists on manual control over lead probability estimates. He does not trust algorithmic scoring for deal value. Manual override must exist on any auto-derived field. [source: handoff_2026-04-05a_leads_expenses_qa]

### Role-Based View Toggles (MD/PM/IC)
Removed from the dashboard because they "didn't add value." Features that don't earn their keep get cut regardless of implementation effort. [source: handoff_2026-04-06a_ux_overhaul]

### Cheaper Model Alternatives
Suggesting Ollama or Haiku when the task is core quality work (curation, summaries, analysis) is unwelcome. Glen views this as laziness, not pragmatism. Only raise cost concerns if Glen does first, and always with actual cost data (e.g., "$0.79 for a month"). [source: handoff_2026-04-17a_news_aggregator_m1_start, handoff_2026-04-17c_news_m2_m3_complete]

### Hardcoded Configuration Values
Everything data-driven: pipeline stages, field options, resource types, sectors must all come from the database, never from code. Any new feature with configurable options stores them in DB. [source: handoff_2026-04-05a_leads_expenses_qa]

### Text-Heavy Dashboards
Text walls are rejected. Everything must be visual: charts, bars, rings, gauges. Raw data (UUIDs, "no data" panels) destroys trust in the tool. [source: handoff_2026-05-16_aios_audit_and_cc_redesign]

### White Elements in Dark Theme
"No white elements ever" in dark-themed views. Glen hates them. [source: handoff_2026-05-16_aios_audit_and_cc_redesign]

---

## Business Philosophy

### Quality is Non-Negotiable
Glen's first reaction to the initial dashboard: "That looks like absolute shit." He demanded CFO-grade quality, sent reference dashboard images as design targets, and stated: "Nothing on this project is something you can do with minimal effort. It needs to be high quality." This applies universally, not just to client-facing work. The quality bar is professional commercial SaaS, not "good for an internal tool." [source: handoff_2026-04-01_finances]

### Full Scope First, Trim Later
The default is always the quality outcome. Cost and scope trims are offered only after the full version is on the table, and only with real justification (actual cost data, not speculation). Glen reads scope reduction as laziness, not pragmatism. [source: handoff_2026-04-17a_news_aggregator_m1_start]

### Data-Driven Everything
Pipeline stages, field options, resource types, sectors -- all from the database. Never hardcode configurable values. This extends to CRM fields (deal stages, win probability), work item fields (priorities, statuses), and financial categories. [source: handoff_2026-04-05a_leads_expenses_qa]

### Exception-Based Management
Executive dashboards must show 3-5 actionable numbers, not 30-40 metrics. The "Needs Attention" panel shows only blocked + at risk + overdue items. Standup views show only active work, never backlog. Tables beat cards for data-dense views. [source: handoff_2026-04-18_portfolio_dashboard_v2, handoff_2026-04-06a_ux_overhaul]

### Manual Control Over Judgement Calls
Health state, win probability, and client priority ordering are never auto-derived. Glen controls these manually because they require human judgement. Auto-calculated fields should always have a manual override. [source: handoff_2026-04-06a_ux_overhaul, handoff_2026-04-05a_leads_expenses_qa]

### Zero-Cost Infrastructure When Viable
PC as production server, Cloudflare free tier, free OCR API. Glen prefers controlled self-hosted infrastructure over paid cloud services for internal tooling. But this is about control, not penny-pinching -- he will pay for quality (claude-sonnet-4-6 over Haiku) when it matters. [source: handoff_2026-04-09a_move_to_nine, handoff_2026-04-17a_news_aggregator_m1_start]

### Tech Debt Ordered by User-Facing Risk
Glen prioritises tech debt by data-loss risk to users, not by code aesthetics. Board drag-drop bypassing sync/conflict detection (silent overwrites) was highest priority. Performance optimisation is explicitly deferred until data volumes justify it. Contracts kept forever -- no retention cleanup. [source: handoff_2026-04-19_tech_debt_sprint]

### Intelligence Over Inventory
Dashboard cards must show actionable insights, not file counts. The Command Centre's 50/50 split between business operations and AIOS health reflects Glen's dual concern: the business AND the infrastructure that runs it. [source: handoff_2026-05-11_command_centre]

---

## Working Patterns

### Decision Style: Bulk Approval from Complete Audits
Glen approves features in bulk when presented with a structured audit. In one session he approved ALL 15 features and ALL 13 UI changes. He does not want incremental proposals. His binary is "build now" vs "discuss approach" -- he never says "park it for later." Present complete pictures, not piecemeal requests. [source: handoff_2026-04-04_finances_and_features]

### Design Communication: Reference Images
Glen communicates design intent by showing reference images, not describing. When dissatisfied, he sends screenshots of tools he admires (Ajelix, P&L trackers). When approving, he iterates through mockup rounds (7+ iterations for the Command Centre). [source: handoff_2026-04-01_finances, handoff_2026-05-11_command_centre]

### Visual Design Iteration: Expect 5-7 Rounds
The Command Centre went through 7 mockup iterations. v1 rejected ("looks like shit on widescreen"), v2 rejected ("underwhelming value"), v3 "better but not exciting", v4 approved for Dashboard tab. Design for widescreen first. Gradient colour bars must be thick (3px with glow). The aesthetic must feel "exciting, not just functional." [source: handoff_2026-05-11_command_centre]

### UAT Style: Thorough Multi-Device Testing
Glen tests on both desktop and phone simultaneously. His first real UAT session produced 5 iterations on scroll preservation alone, reported via real-time screenshots and voice messages. Expect intensive, thorough testing when Glen reviews. [source: handoff_2026-04-06c_glen_uat]

### Delegation: Autonomous Execution for Mechanical Work
"Do the ones you can do on your own" = Glen trusts autonomous execution on mechanical fixes. One session cleared 33 bug tracker items and built 7 features autonomously. Glen reviews finished products, not phase gates. Escalate only decisions and architectural choices. [source: handoff_2026-04-19_tech_debt_sprint, handoff_2026-04-14a_full_backlog_clearance]

### Audit-Driven Improvement
Structured numeric audits (19-dimension scoring, 6.6/10 baseline) drive focused improvement. Glen approves plans, not individual fixes. Sprint grouping by concern (foundation, security, performance, frontend, UX, ops) prevents context-switching. Data-backed proposals get fast approval. [source: handoff_2026-04-08b_comprehensive_improvement]

### Vocabulary Precision
"NBI Hub" = WorkSage = the dashboard at worksage.nbi-consulting.com. NOT projects/nbiai_app/ (archived). "Prerequisites" not "Dependencies." "Projects" and "My Work" not "Tasks." "Fee Income" not "Revenue." Glen cares about terminology and will correct it. [source: handoff_2026-04-18_worksage_audit_sprint, handoff_2026-04-11b_hierarchy_dependencies_timeline, handoff_2026-04-07b_expenses_finance_qa]

### Widescreen-First Design
Glen uses a large monitor. He rejects anything that creates dead space on widescreen (killed max-width 1800px constraint). Dense 4-row layouts with minimal scrolling. Design for widescreen first, then responsive down. [source: handoff_2026-04-08b_comprehensive_improvement, handoff_2026-05-16_aios_audit_and_cc_redesign, handoff_2026-05-11_command_centre]

### Tooling: Claude Code in VS Code
Claude Code in VS Code is the permanent primary interface (not Desktop). Weekly config backup (Sundays 02:00, zips ~/.claude/ to OneDrive). Worktree-first rule for risky edits (>3 files). autoCompactWindow set to 1000000 for 1M context. Skills trimmed to 200-char descriptions for context efficiency. [source: handoff_2026-04-18_desktop_migration_complete, handoff_2026-04-19_settings_overhaul]

---

## Client Relationship Approaches

### Client Ordering: Paying First
Paying clients first in all views. The canonical ordering is: Couch Heroes > Lighthouse > Sarge > Goals > alpha (internal). This is enforced via clientSortOrder() in the frontend. [source: handoff_2026-04-06a_ux_overhaul]

### Deal Ownership: Principals Only
Deal ownership is deliberately restricted to Glen and Tom, not delegated to analysts. This reflects the consultancy's principal-led model. [source: handoff_2026-04-05a_leads_expenses_qa]

### Deliverable Pattern: Three Artifacts
Client engagements deliver three artifacts: Excel (planning), Word (execution guide), WorkSage (live tracking). The WorkSage Import sheet in Excel enables bulk import of project hierarchies. Deliverables should not contain NBI team member names -- use role descriptions. [source: handoff_2026-04-21_goals_deliverables]

### Manual Lead Entry
Glen prefers manual data entry for leads over bulk import -- he wants to touch each entry. This reflects his belief that lead quality requires human attention at ingestion. [source: handoff_2026-04-05a_leads_expenses_qa]

### Scoping via SoW Extraction
SoW text extraction must filter pricing and legal content before storage. Memory-only file handling (buffer nulled after use) prevents sensitive PDFs from persisting on disk. Only scope and deliverables content is retained. [source: handoff_2026-04-14a_full_backlog_clearance]

---

## Open Questions

- How does Glen's quality absolutism scale as client count grows? Does he maintain the same review intensity for each client's deliverables?
- What triggers Glen to revisit a rejected approach (e.g., React for WorkSage)? Is there a threshold where the vanilla JS SPA becomes untenable?
- Glen's manual control philosophy (health state, probability, ordering) works at NBI's current scale. At what scale does delegation of these judgements become necessary?
- The 50/50 business ops / AIOS health split on the Command Centre -- does this ratio hold as the business grows, or does business ops dominate?

---

## Source Index

| Extract ID | Date | Title | Primary Themes |
|---|---|---|---|
| handoff_2026-04-01_finances | 2026-04-01 | Glen's Quality Standard: CFO-Grade or Nothing | quality bar, reference images |
| handoff_2026-04-04_finances_and_features | 2026-04-04 | Feature Approval Pattern | bulk approval, decision style |
| handoff_2026-04-05a_leads_expenses_qa | 2026-04-05 | CRM Design and Security | manual control, data-driven config |
| handoff_2026-04-06a_ux_overhaul | 2026-04-06 | 22 UX Decisions | tab naming, exception-based views |
| handoff_2026-04-06c_glen_uat | 2026-04-06 | Scroll Preservation Iterations | UAT style, multi-device testing |
| handoff_2026-04-07b_expenses_finance_qa | 2026-04-07 | Finance Architecture | consulting P&L, terminology |
| handoff_2026-04-08b_comprehensive_improvement | 2026-04-08 | Audit-Driven Improvement | numeric scoring, sprint grouping |
| handoff_2026-04-09a_move_to_nine | 2026-04-09 | Production Architecture | PC as server, zero-cost infra |
| handoff_2026-04-11b_hierarchy_dependencies_timeline | 2026-04-11 | Work Item Hierarchy | 4-level hierarchy, terminology |
| handoff_2026-04-14a_full_backlog_clearance | 2026-04-14 | SoW Extraction Pattern | document filtering, autonomous velocity |
| handoff_2026-04-16b_full_day | 2026-04-16 | Email and Client Scoping | multi-tenancy, Graph API |
| handoff_2026-04-17a_news_aggregator_m1_start | 2026-04-17 | No Scope-Watering, No Timelines | hard rules, quality first |
| handoff_2026-04-17c_news_m2_m3_complete | 2026-04-17 | Agent SDK vs Raw SDK | SDK choice, actual costs |
| handoff_2026-04-18_desktop_migration_complete | 2026-04-18 | Desktop to CLI Migration | React rejection, tooling |
| handoff_2026-04-18_worksage_audit_sprint | 2026-04-18 | WorkSage Vocabulary Reset | naming, security audit |
| handoff_2026-04-18_portfolio_dashboard_v2 | 2026-04-18 | Portfolio Dashboard Philosophy | progressive disclosure, exceptions |
| handoff_2026-04-19_tech_debt_sprint | 2026-04-19 | Tech Debt Ordering | risk-based prioritisation |
| handoff_2026-05-11_command_centre | 2026-05-11 | Command Centre Design | 7 mockup iterations, visual design |
| handoff_2026-05-12_command_centre_build | 2026-05-12 | Build Antipatterns Post-Mortem | verification discipline, context rot |
| handoff_2026-05-13_karpathy_capabilities | 2026-05-13 | Karpathy Patterns | LLM Wiki, AutoResearch, AI ops |
| handoff_2026-05-15_aios_audit_phase1 | 2026-05-15 | AIOS Dispatch Architecture | role dispatch, project-agnostic |
| handoff_2026-05-16_aios_audit_and_cc_redesign | 2026-05-16 | Command Centre v2 Requirements | dark theme, visual density |
