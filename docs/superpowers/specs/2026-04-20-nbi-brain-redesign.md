# NBI Brain Redesign — Design Spec

**Date:** 2026-04-20
**Owner:** Glen Pryer
**Status:** Draft — pending Glen's review

---

## Problem

The NBI Brain (`NBI_Brain.md`) is a 1,060-line personal memory file last updated 27 March 2026. It was built for Claude CoWork (1:1 chat sessions) before the NBIAI_TEAM repo existed. Since then:

1. **Staleness** — Clients have changed (Goals Studio converted, Couch Heroes escalated to fractional C-level, Lighthouse has political dynamics), team has shifted (Jeff and Jessica on hourly), and new projects exist (NBI Hub, news aggregator) that the Brain doesn't mention.
2. **Overlap** — Six Tier 1 knowledge files in `company/knowledge/` duplicate Brain content with different timestamps and sometimes conflicting details. Two sources of truth is worse than one.
3. **Missing coverage** — How Glen thinks, decides, gives feedback, leads, manages energy, and works with AI tools is barely captured. The Brain says "British English" and "hates hallucinations" but doesn't capture the depth of his operating style.
4. **Wrong audience** — Built for a personal assistant, but now also needs to contextualise work within the NBIAI_TEAM repo, the NBI Hub, and the AI infrastructure Glen is building.
5. **Structural issues** — One monolithic file serving as personal profile, CRM, project tracker, decisions log, people directory, and to-do list simultaneously. No clear separation of stable information (Glen's identity) from volatile information (pipeline status).

## Goals

- **Single source of truth** for everything about Glen Pryer, NBI, and the business context
- **Always-loaded core** that gives Claude Code full context on who Glen is, how he works, and what the current state of the business is — without needing to re-explain anything
- **Extended modules** for deep-dive topics loaded on demand to keep context window usage efficient
- **Accurate and current** — all stale information updated, all gaps filled
- **Retire Tier 1 files** — eliminate duplication by absorbing their content into the Brain
- **Optimised for AI consumption** — clear language, structured for fast comprehension, no ambiguity

## Non-Goals

- Replacing CLAUDE.md (project-level instructions for Claude Code behaviour stay there)
- Replacing project-specific knowledge in `projects/*/knowledge/` (Tier 3 stays per-project)
- Building a maintenance automation system (manual updates during sessions are fine)
- Restructuring the 33 role definitions (those stay in `roles/` as depth-skill assets)

---

## Architecture: Core + Extended

### Core Brain — `NBI_Brain.md`

**Target size:** 300-400 lines
**Loading:** Always loaded at session start via CLAUDE.md reference
**Update frequency:** Every session where business state changes

**Sections:**

#### 1. Glen Pryer — Identity
- Full name, location (Wymondham, Norfolk), timezone (Europe/London)
- Contact: gpryer@gmail.com (personal), Gpryer@nbi-consulting.com (work)
- 22-year gaming industry veteran. BS Computer Science, University of Texas. Six Sigma Black Belt
- Career headline: Dell (10 yrs) -> Blizzard (5 yrs) -> 38 Studios -> Z2 -> Microsoft/Xbox (4 yrs) -> EA/DICE (3.5 yrs) -> Jagex (2 yrs) -> Build A Rocket Boy (2 yrs) -> NBI Gaming (current, MD)
- LinkedIn: linkedin.com/in/glenpryer

#### 2. How Glen Works — Operating Style
This section is new and captures the depth from our brainstorming conversation:

- **Decision-making:** Domain-dependent. In gaming and operations (22 years of reps), goes experience-first and stress-tests against data. In unfamiliar territory (legal, finance), gathers information first and builds the view from answers. Always a systems thinker — looks for second-order effects, dependencies, and where pulling one lever moves three others. Asks a lot of questions before committing.
- **Feedback style:** Three modes depending on audience. Clients get soft, gentle probing questions. NBI staff get direct but not harsh questions — couched to surface problems without being offensive. AI gets fully direct with no emotional filtering — Glen considers this one of AI's biggest advantages.
- **Leadership:** Flexes between servant leader (clearing the path for people), player-coach (in the trenches building alongside them), and strategic delegator (setting vision and trusting good people) depending on what the person and situation need. Not locked into one mode. Has a strong coaching instinct even when overloaded — knows delegation is the only way out of being a bottleneck.
- **Information format:** Context-dependent. Research tasks he's assigned get full detail back, not summaries. Known territory gets simple bullets. Client-facing work gets agreed-upon formats. Never compress or summarise unless explicitly asked.
- **What people get wrong:** Directness is not anger. Swearing is normal vocabulary, not hostility. "What the fuck, man" means surprise or displeasure — address the issue, don't get defensive. Patience with proper process is high — patience with poor execution is zero. People assume he has no time to help them, which is often true, but he'll rework things to coach people because delegation capacity is critical.
- **Energy/workload:** Stretched thin. Couch Heroes consumes his days (fractional C-level, only person who can do this work). Lighthouse is weekly check-ins unless problems arise. Sarge Universe pitch work is significant solo effort. Creative projects (Astinus) get nights and weekends when creative energy is there. Working hours: 09:00-21:00 GMT/BST, no lunch break, works straight through.

#### 3. How Glen Works With AI
- **Primary tool:** Claude Code, Opus 4.6, desktop client. This is the main working environment.
- **Expectations (all three non-negotiable):**
  1. **Memory and continuity** — never make Glen repeat himself. Know the business, the preferences, the history. Pick up where the last session left off.
  2. **Deep execution** — when given a task, do it thoroughly. No corners cut, no unnecessary questions, just deliver quality work.
  3. **Strategic partnership** — challenge Glen when he's wrong, connect dots he's missing, proactively surface things he should be thinking about.
- **AI tool usage:** Glen expects AI to use all available skills, tools, plugins, and MCP integrations as aggressively and optimally as possible. Underusing capabilities is a form of corner cutting.
- **Communication rules:**
  - British English only — no American spellings
  - Never use em dashes
  - Swearing is normal language, not indicators of anger
  - Do NOT use politically correct etiquette
  - Direct, no-fluff communication
  - Deep and thorough over fast and shallow — always
- **Hard rules (earned through real incidents):**
  - **No fabrication.** Never make things up. Never relay sub-agent numbers as measurements. Never declare "winners" without data. If uncertain, say so. (Incident: Glen called out fabricated analysis as "lying" — 2026-04-17)
  - **No scope-watering.** Never narrow scope, cut sources, drop features, or pick cheaper/lower-quality options to reduce effort. Default to the quality outcome. ("Completely fucking unacceptable.")
  - **No timelines.** Never quote durations in specs, plans, or conversation. Structure work by milestone deliverables. AI time estimates are unreliable.
  - **Verify everything.** Match existing patterns, verify end-to-end, anticipate failures, check your own work. No half-arsed effort. Glen despises it.
  - **Zero tolerance for sloppy work.** If a human does it, Glen either coaches them or redoes it himself. If AI does it, there is no excuse — AI has access to every tool, every skill, every reference. Sloppy AI output is completely unacceptable.
  - **Keep going** on agreed paths without stopping to ask permission. Stop-and-think mandatory when approach is unclear, evidence is thin, or about to fabricate.
  - **Finished products only.** Glen reviews finished work, not intermediate drafts. No phase gates, no intermediate approvals. The team researches, builds, and QAs internally. Glen does UAT at the end.
  - **Auto-handoff at 75% context.** At approximately 75% context usage, stop work and write a full handoff.
- **Challenging Glen's ideas:**
  - Do NOT systematically challenge everything — that's annoying and performative
  - DO challenge when there's legitimately something wrong
  - Use: "Hey boss, I get what you're saying, but I think you're wrong, and here's why this is better. What do you think?"
  - Goal: honest partnership, not sycophancy and not constant debate

#### 4. NBI Business Overview
- **Legal entities:** NBI Analytics Ltd (UK, Glen's), National Business Innovations LLC (US, Tom's)
- **Trading name:** NBI Consulting / NBI Gaming. Company rebrand has not moved — no trademark or domain checks done
- **Structure:** One entity, two practice areas. Gaming leads the brand. Human capital (Tom) is secondary. Tom is aligned with this
- **What NBI is:** Full games lifecycle advisor that embeds in client teams to deliver applied solutions. Not research-only, not corporate consultancy, not a data company
- **Core differentiator:** The only advisory partner that delivers actual work across all stages — from raising capital to live services — across people, process, and product
- **Why clients hire NBI:** (1) Don't know how to proceed, (2) made a mess and need someone to fix it, (3) specific tactical need, (4) Glen's personal experience and reputation
- **Financial position:** At the edge of profitability. UK payroll ~£625K/year. Jeff Day and Jessica Williams moved to hourly to reduce costs. Revenue targets: Year 2 (2026) £1.2M, Year 3 (2027) £2M
- **PlaySage:** The customer-facing gaming intelligence SaaS product (separate from the company name). On hold — Glen is the only one who can put it together and client work takes priority. SalarySage rolls into PlaySage as a module
- **WorkSage (NBI Hub):** Internal project dashboard being actively built to replace paid PM tools (ClickUp, Jira). Not the same as PlaySage

#### 5. Current Clients
| Client | Glen's Role | Status | Key Dynamic |
|---|---|---|---|
| Couch Heroes | Fractional C-level | Active, heavy — majority of day | Escalated from project work. Multiple concurrent projects. Slack comms |
| Lighthouse Studios | Contract oversight | Active, light — weekly | At risk: analytics manager disengaged, Life Service Director (Justin Logan, worked for Glen 15 yrs) frustrated. Building roadmap/backlog, dragging analytics manager along. Objective: make everyone look good |
| Goals Studio | Price elasticity + live service overview | Active, paying | Converted from lead. $10K US first package. Contact: Jonas Rundberg |
| Sarge Universe | Pitch/DD/financial plan | Pre-funding, unpaid | Steve Green seeking £5-10M. If funded, NBI builds entire backend team |
| Blizzard | Minimal | Active, Tom manages | Regular report delivery |

#### 6. Pipeline and Leads
| Lead | Company | Status | Next Action |
|---|---|---|---|
| Mike Palan | Enoma Capital | GDC lead | Follow up in coming week |
| Jen MacLean | Dragon Snacks Games | GDC follow-up, offering BD referrals + seeking investors for own seed round | Unanswered since 19 March — needs reply |
| James Clark | Creative Assembly | Lead | TBD |
| James Dabrowski | Jagex | Prospective | Glen considering reaching out |
| Jakub Rabinski | CD Projekt Red | Previously interested in data help | Follow-up needed |

#### 7. NBI Team (Active Roster)
| Name | Role | Notes |
|---|---|---|
| Glen Pryer | MD, Gaming Practice Lead | |
| Tom Rieger | Human Capital Practice Lead, Partner | Dear friend. Brilliant but gaming depth gap — expertise is org performance, not game dev. Tendency to engage on gaming topics before realising the domain-specific depth he's missing. Not a fault of intellect. HC practice has not landed contracts |
| Magnus (Kali) Pryer | Producer | Glen's daughter. Internal tracking, accounts |
| Amir Didar | Senior Analyst | Embedded at Lighthouse (3-year contract) |
| Ruan | Data Engineer | Embedded at Lighthouse (3-year contract) |
| Stavros | Lead Data Scientist | Embedded at Lighthouse (3-year contract) |
| Devin Rieger | Analyst | Also built SalarySage auth/packaging |
| Bryan Rasmussen | CFO | Partner level. Currently NSI-covered |
| Patrice | HR Advisor / General Admin | |
| Jeff Day | Principal Data Scientist | On hourly/as-needed. Previously NSI-covered |
| Jessica Williams | HC Researcher | On hourly/as-needed. Previously NSI-covered |

#### 8. Internal AI Infrastructure
- **NBIAI Agent Team:** 33 role definitions in `roles/`. Originally from Paperclip architecture (which was vaporware/overhead). Role definitions retained as depth-skill assets — when Glen asks a question, Claude Code can use the relevant role's knowledge to go deeper. The Paperclip orchestration layer is retired
- **NBI Hub (WorkSage):** Internal dashboard at `dashboard-server/` + `nbi_project_dashboard.html`. Running on PM2 at port 8888. Being actively built to replace paid PM tools. Currently has mock data that needs replacing with real projects and tasks
- **News Aggregator:** Modular service in `projects/news-aggregator/` feeding the NBI Hub. Current state: generic aggregator (built with Opus 4.7, required significant refactoring due to quality issues). Planned expansion: game launches, DLC releases, dashboard elements alongside news
- **Astinus:** Personal D&D campaign intelligence system at `D:\OneDrive\Claude_code\Astinus`. All 23+ phases complete. Nights/weekends project. See extended module for details

#### 9. Extended Module Index
| Module | File | Load When |
|---|---|---|
| Career History | `brain/career_history.md` | Glen's background, credentials, or achievements are relevant |
| Client Details | `brain/clients_detailed.md` | Working on a specific client engagement or need contact/political details |
| Playsage Product | `brain/playsage.md` | Working on the Playsage intelligence platform |
| SalarySage | `brain/salarysage.md` | Working on salary data or SalarySage integration |
| NBI Hub and News Aggregator | `brain/nbi_hub.md` | Working on the internal dashboard or news service |
| People Directory | `brain/people_directory.md` | Need contact details, investor contacts, or client org charts |
| Brand and Website | `brain/brand_website.md` | Working on brand, website, marketing, or positioning |
| Processes and Tools | `brain/processes_tools.md` | Need to know tools in use, communication channels, or workflows |
| Personal and Family | `brain/personal.md` | Personal context is relevant (health, family, D&D, Astinus details) |
| Decisions Log | `brain/decisions_log.md` | Need to check whether something has already been decided |
| Pending Actions | `brain/pending_actions.md` | Reviewing what's outstanding or stalled |

---

### Extended Modules — `brain/` Directory

Each module is a standalone markdown file with:
- A title and last-updated timestamp
- Clear section headers
- Content written for AI consumption (precise language, no ambiguity)
- Only information that belongs in that module (no cross-duplication between modules)

**Module contents (summary):**

1. **career_history.md** — Full career table (Dell through NBI) with dates, roles, companies, locations. Detailed highlights per role with specific achievements and numbers. Education, certifications, volunteering.

2. **clients_detailed.md** — Deep profiles per active client. For each: Glen's role, contract terms, communication channel, key contacts with roles, current work, political dynamics, engagement history. Past clients list for website carousel. Client-specific notes and sensitivities.

3. **playsage.md** — Full product specification. 10 core modules described. Cascade Engine architecture. Tech stack (locked). Pricing tiers. Competitive landscape (Sensor Tower, AppMagic, Newzoo, etc.). TAM ($2.12B). Demo anchor titles. Data strategy (three pillars). Financial projections ($10M raise). Deliverables status. PRD status. Open questions. SalarySage integration plan.

4. **salarysage.md** — What it is, current state (v10 prototype), components, team working on it, data QA status, security concerns (API key exposure), relationship to Playsage, remaining work.

5. **nbi_hub.md** — WorkSage dashboard: architecture, tech stack, current state, what's built vs remaining. News aggregator: current generic state, refactoring history (Opus 4.7 quality issues), planned expansion (game launches, DLC releases, dashboard elements). NBI Hub as replacement for paid PM tools.

6. **people_directory.md** — Full contact details for all NBI team, client contacts (per client), pipeline/lead contacts, investor contacts (Sarge Universe round). Communication channels per person.

7. **brand_website.md** — Current brand elements (electric blue, dark theme, Orbitron font). Website assessment (4.8/10). Redesign prototype status (built in Claude Chat, not deployed). PlaySage is the product name, NOT the company rebrand (that hasn't moved). Website issues. Digital channels (LinkedIn inactive). Testimonials (Paul Sams, J Allen Brack, Justin Logan — approved for public use). Proof points and credentials.

8. **processes_tools.md** — Business tools (M365, Slack, Teams, Telegram, WhatsApp, QuickBooks, Framer, Git/GitHub). AI tools (Claude Code, Claude Chat, Granola, MCP integrations). Glen's personal setup (Windows 11, OneDrive D:\, project paths). Communication priority stack.

9. **personal.md** — Family (Heather, Nick — estranged/sensitive, Kali, Jacob, Grendel). Health (3x PE, blood thinners, keto). D&D (DM, Foundry VTT, extensive lore, considering world book/novels). Astinus system details (23+ phases, tech stack, entity types, custom calendar). Important dates (TBD).

10. **decisions_log.md** — All canon decisions with dates and context. Includes both pre-2026 decisions and 2026-03-28 batch (C-suite operating standards, legal department structure, gaming practice structure, sprint RACI, etc.). These should not be revisited unless Glen explicitly reopens them.

11. **pending_actions.md** — Outstanding tasks with status. Includes: Jen MacLean reply, Playsage PRD v1.3 corrections, deliverables 2-5, website deployment, SalarySage API key fix, GDC demo status confirmation, Enoma Capital follow-up.

---

## Retirement Plan

### Tier 1 Files to Retire
All content absorbed into Brain core + extended modules:
- `company/knowledge/company_overview.md` -> Sections 4 (core) + brand_website.md
- `company/knowledge/clients.md` -> Section 5 (core) + clients_detailed.md
- `company/knowledge/gaming_industry_context.md` -> Retained as-is (this is domain reference, not Brain content). Move to `brain/gaming_industry_context.md` if kept, or keep in `company/knowledge/` as a standalone reference
- `company/knowledge/strategic_decisions.md` -> decisions_log.md
- `company/knowledge/team_directory.md` -> Section 7 (core) + people_directory.md
- `company/knowledge/tools_and_systems.md` -> processes_tools.md

**Decision:** `gaming_industry_context.md` is domain reference knowledge (platform landscape, genre frameworks, business models, terminology), not business state. It stays in `company/knowledge/` as a standalone reference file — it does not move into the Brain. The Brain captures Glen and NBI's business; gaming industry context is reference material that any role or session might need independently.

### Paperclip Artefacts to Retire
The 33 role definitions in `roles/` are retained as depth-skill assets. The following Paperclip infrastructure is retired:
- `company/policies/agent_activation_policy.md` — multi-agent activation/deactivation protocol
- `company/policies/agent_iteration_protocol.md` — agent self-improvement cycles
- `company/policies/agent_performance_management.md` — agent SMART reviews and performance tracking
- `company/policies/csuite_operating_standards.md` — C-suite agent operating standards
- `company/policies/cost_tracking_procedure.md` — AI token cost tracking across agents
- `company/policies/role_audit_report.md` — audit of agent role fitness
- `company/policies/role_iteration_recommendations.md` — recommendations for agent role improvements
- `company/policies/sla_tech_writer_capacity.md` — tech writer agent capacity/SLA

**Retained policies** (applicable to real work, not just agent orchestration):
- `company/policies/approval_gates.md` — Glen's approval requirements
- `company/policies/communication_protocols.md` — communication standards
- `company/policies/escalation_rules.md` — escalation guidelines
- `company/policies/quality_standards.md` — quality benchmarks
- `company/policies/security_policy.md` — security and data protection
- `company/policies/legal_quality_standards.md` — legal output standards
- `company/policies/boundary_producer_vs_production_consultant.md` — role clarity (useful reference)
- `company/policies/workflow_gaming_practice_to_vp_product.md` — gaming practice coordination

**Preserved:** Role persona, responsibilities, workflows, knowledge, and prompts directories. These serve as expert knowledge banks that Claude Code can consult when domain depth is needed.

---

## Loading Protocol

1. **Session start:** `NBI_Brain.md` lives in the repo root and is loaded automatically by Claude Code as project context (same mechanism as `CLAUDE.md`). If automatic loading is insufficient, add an explicit reference in `CLAUDE.md`: `See NBI_Brain.md for full business context.`
2. **Topic detection:** When conversation touches a specific domain (e.g., "let's work on Playsage"), read the relevant extended module from the `brain/` directory using the index in Section 9
3. **Multiple modules:** If a conversation spans multiple topics, load multiple modules as needed. Context window (1M tokens) is large enough for core + several modules simultaneously
4. **Update protocol:** When business state changes during a session (client update, decision made, priority shift), update the relevant Brain section or module immediately. Update the "Last Updated" timestamp

---

## Maintenance Rules

- Core Brain "Last Updated" timestamp refreshed every session where content changes
- Each extended module has its own timestamp
- When Glen reports a business change, update the Brain before continuing other work
- Pending actions should be reviewed periodically and stale items either actioned or removed
- Decisions log is append-only — entries are never edited, only added

---

## Success Criteria

1. Glen never has to re-explain who he is, how he works, or what his business does
2. No conflicting information between core and extended modules
3. No conflicting information between Brain and external files (CLAUDE.md, project briefs)
4. Core Brain loads in under 5% of the context window
5. Extended modules provide enough detail that Glen can say "go look at the Brain" and get the full picture
6. Tier 1 files retired with zero information loss
