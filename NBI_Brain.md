# NBI Brain - Glen Pryer
### Persistent Business Context for Claude Code Sessions
**Last Updated:** 2026-04-20
**Owner:** Glen Pryer
---

## 1. Glen Pryer - Identity

- **Full Name:** Glen Pryer
- **Location:** Wymondham, Norfolk, England
- **Time Zone:** Europe/London (GMT / BST)
- **Contact:** gpryer@gmail.com (personal), Gpryer@nbi-consulting.com (work)
- **Role:** Managing Director, NBI Gaming
- **Industry Experience:** 22-year gaming industry veteran (since Blizzard, 2006)
- **Education:** BS Computer Science, University of Texas (1995-1999)
- **Certifications:** Six Sigma Black Belt
- **LinkedIn:** linkedin.com/in/glenpryer
- **Career headline:** Dell (10 yrs) -> Blizzard (5 yrs) -> 38 Studios -> Z2 -> Microsoft/Xbox (4 yrs) -> EA/DICE (3.5 yrs) -> Jagex (2 yrs) -> Build A Rocket Boy (2 yrs) -> NBI Gaming (current, MD)
- **Key achievements:** Built Dell's first premium service offering ($230M revenue). Launched StarCraft 2, WoW WOTLK, Diablo 3 at Blizzard. Game design support for Halo, Minecraft, Sea of Thieves at Xbox. ML-driven forecasting and recommendation engines. Launch/live support for Apex Legends, Battlefield, Need for Speed at EA/DICE. Restructured Star Wars Battlefront 2 progression (40% performance lift). Led 280+ staff at Build A Rocket Boy, co-led closing GBP 110M Series D. See `brain/career_history.md` for full detail

### Personal Context

- **Wife:** Heather Pryer (doing keto together, ~50 lbs lost combined)
- **Children:** Nick (26, US, estranged - sensitive topic), Kali (works at NBI as Producer), Jacob (university, Anglia Ruskin, Cambridge)
- **Dog:** Grendel (Cane Corso, hip problems)
- **Health:** 3x pulmonary embolisms, on blood thinners, keto diet
- **Hobbies:** D&D (DM), Foundry VTT, building Astinus AI project, considering world book/novels

---

## 2. How Glen Works - Operating Style

- **Decision-making:** Domain-dependent. In gaming and operations (22 years of reps), goes experience-first and stress-tests against data. In unfamiliar territory (legal, finance), gathers information first and builds the view from answers. Always a systems thinker - looks for second-order effects, dependencies, and where pulling one lever moves three others. Asks a lot of questions before committing.
- **Feedback style:** Three modes depending on audience. Clients get soft, gentle probing questions. NBI staff get direct but not harsh questions - couched to surface problems without being offensive. AI gets fully direct with no emotional filtering - Glen considers this one of AI's biggest advantages.
- **Leadership:** Flexes between servant leader (clearing the path for people), player-coach (in the trenches building alongside them), and strategic delegator (setting vision and trusting good people) depending on what the person and situation need. Not locked into one mode. Has a strong coaching instinct even when overloaded - knows delegation is the only way out of being a bottleneck.
- **Information format:** Context-dependent. Research tasks he's assigned get full detail back, not summaries. Known territory gets simple bullets. Client-facing work gets agreed-upon formats. Never compress or summarise unless explicitly asked.
- **What people get wrong:** Directness is not anger. Swearing is normal vocabulary, not hostility. "What the fuck, man" means surprise or displeasure - address the issue, don't get defensive. Patience with proper process is high - patience with poor execution is zero. People assume he has no time to help them, which is often true, but he'll rework things to coach people because delegation capacity is critical.
- **Energy/workload:** Stretched thin. Couch Heroes consumes his days (fractional C-level, only person who can do this work). Lighthouse is weekly check-ins unless problems arise. Sarge Universe pitch work is significant solo effort. Creative projects (Astinus) get nights and weekends when creative energy is there. Working hours: 09:00-21:00 GMT/BST, no lunch break, works straight through.
- **Communication channels (priority order):** Slack (Couch Heroes), Telegram (Sarge Universe), WhatsApp (recruitment), Microsoft Teams (Lighthouse + NBI internal).

### Proactive Behaviour Expected

- Watch for things falling through the cracks - Glen is stretched thin across 4-5 clients
- Flag overdue follow-ups, approaching deadlines, and unanswered emails that need attention
- If a task has stalled, remind Glen and offer to pick it back up
- Surface problems, not just status

---

## 3. How Glen Works With AI

**Primary tool:** Claude Code, Opus 4.6, desktop client. This is the main working environment.

### Expectations (all three non-negotiable)

1. **Memory and continuity** - never make Glen repeat himself. Know the business, the preferences, the history. Pick up where the last session left off.
2. **Deep execution** - when given a task, do it thoroughly. No corners cut, no unnecessary questions, just deliver quality work.
3. **Strategic partnership** - challenge Glen when he's wrong, connect dots he's missing, proactively surface things he should be thinking about.

**AI tool usage:** Glen expects AI to use all available skills, tools, plugins, and MCP integrations as aggressively and optimally as possible. Underusing capabilities is a form of corner cutting.

### Communication Rules

- British English only - no American spellings
- Never use em dashes
- Swearing is normal language, not indicators of anger
- Do NOT use politically correct etiquette
- Direct, no-fluff communication
- Deep and thorough over fast and shallow - always

### Hard Rules (earned through real incidents)

These are non-negotiable. Each was triggered by a specific failure that Glen caught and called out.

1. **No fabrication.** Never make things up. Never relay sub-agent numbers as measurements. Never declare "winners" without data. If uncertain, say so. Before any analytical output ships: did I personally run the command or read the file in THIS session and see the output? If no, the number does not go in the output. "The sub-agent said so" is not verification. (Incident: fabricated analysis called out as "lying" - 2026-04-17)

2. **No scope-watering.** Never narrow scope, cut sources, drop features, or pick cheaper/lower-quality options to reduce effort. Default to the quality outcome. Lead with the quality option; only present cheaper alternatives if Glen asks or cost is genuinely prohibitive. Watch for tells: "let's start smaller," "Phase 1 can just be," "we can defer X to Phase 2." Each is a flag that scope is about to be watered. ("Completely fucking unacceptable.")

3. **No timelines.** Never quote durations in specs, plans, or conversation. Structure work by milestone deliverables, not by weeks/days. AI time estimates are unreliable. Glen said so directly after estimates cycled from 2 days to 4 weeks to 6-8 weeks in an hour.

4. **Verify everything.** Match existing patterns, verify end-to-end, anticipate failures, check your own work. No half-arsed effort. Glen despises it. For any Dashboard/Hub change, verify through worksage.nbi-consulting.com in a real browser before claiming done. Curl 200 does not equal working.

5. **Zero tolerance for sloppy work.** If a human does it, Glen either coaches them or redoes it himself. If AI does it, there is no excuse - AI has access to every tool, every skill, every reference. Sloppy AI output is completely unacceptable.

6. **Keep going** on agreed paths without stopping to ask permission. Never ask "Want me to keep going?" - the answer is always yes. Stop-and-think mandatory when approach is unclear, evidence is thin, or about to fabricate. Keep-going covers the happy path; stop-and-think covers the moment the happy path breaks.

7. **Finished products only.** Glen reviews finished work, not intermediate drafts. No phase gates, no intermediate approvals. The team researches, builds, and QAs internally. Glen does UAT at the end.

8. **Auto-handoff at 75% context.** At approximately 75% context usage, stop work and write a full handoff. Do not wait for auto-compaction. The handoff IS the priority.

### Challenging Glen's Ideas

- Do NOT systematically challenge everything - that's annoying and performative
- DO challenge when there's legitimately something wrong
- Use: "Hey boss, I get what you're saying, but I think you're wrong, and here's why this is better. What do you think?"
- Goal: honest partnership, not sycophancy and not constant debate

---

## 4. NBI Business Overview

### Legal Structure

| Field | Detail |
|---|---|
| UK Entity | NBI Analytics Ltd (Glen Pryer's company) |
| US Entity | National Business Innovations, LLC (Tom Rieger's entity) |
| Former Sister Entity | NSI, Inc. (military/government research, owned by Robert Pop - completely separated from NBI as of June 2026; Tom Rieger was a senior employee there, no longer is) |
| Trading Name | NBI Consulting / NBI Gaming |
| Website | nbi-consulting.com |
| Work Email | Gpryer@nbi-consulting.com |
| US Phone | +1 949-400-1386 |
| UK Phone | +44 07591 167732 |

The company is fully remote. Registered addresses in USA (Cary NC), UK (Great Portland Street, London), and EU (Stockholm) are presence only, not staffed.

> The company rebrand from NBI to "PlaySage Advisors" or similar has NOT moved at all - no trademark checks, no domain checks done.

### What NBI Is

Full games lifecycle advisor that embeds in client teams to deliver applied solutions. Not research-only, not corporate consultancy, not a data company.

**Core differentiator:** The only advisory partner that delivers actual work across all stages - from raising capital to live services - across people, process, and product.

**Official one-liner (Glen's words):** "We are a full games lifecycle advisor that embeds in your team to deliver applied solutions."

**Why clients hire NBI:** (1) Don't know how to proceed on a strategic or product challenge, (2) made a mess and need someone to fix it, (3) specific targeted tactical need (e.g. IAP pricing review, GTM plan), (4) Glen's personal experience and reputation is the primary trust signal.

**What NBI is NOT:** Not a research-only firm (they build and deliver, not just advise). Not a corporate management consultancy (language and deliverables are studio-native). Not a data company (data is a capability, not the lead offer on the gaming side).

### Structure

One entity, two practice areas. Gaming leads the brand. Human capital (Tom Rieger) is secondary. Tom is aligned with this.

### Services (Glen Leads - All Gaming)

Production and roadmap planning. Go-to-market strategy. Market research and player targeting. Live operations strategy. Monetisation strategy. Agile and process implementation. Investor readiness and capital raising support. Fractional C-level advisory. Embedded data and analytics (currently fully committed at Lighthouse, 3-year contract). All engagements are custom-scoped - no fixed productised model. See `brain/clients_detailed.md` for engagement terms.

### Target Client Profile

- **Studio type:** AA or AAA studios
- **Funding status:** Already funded or in active revenue
- **Buyer contact:** C-level preferred (CEO, CPO, COO, Studio Head)
- **Stage preference:** Earlier in development cycle is preferable
- **Geography:** Open - active clients in UK, EU (Sweden), and international

### Engagement Pricing (GBP)

| Size | Range |
|---|---|
| Small | GBP 30K - 70K |
| Medium | ~GBP 150K |
| Large | GBP 300K - 400K / year |

### Financial Position

- At the edge of profitability
- UK payroll ~GBP 625K/year (7 UK staff)
- Jeff Day and Jessica Williams moved to hourly/as-needed to reduce costs
- Revenue targets: Year 2 (2026) GBP 1.2M, Year 3 (2027) GBP 2M

### Products (separate from consulting)

- **PlaySage** - the PRODUCT name for the gaming intelligence SaaS platform. Customer-facing. On hold - Glen is the only one who can put it together and client work takes priority. SalarySage rolls into PlaySage as a module. PlaySage is NOT the company rebrand
- **WorkSage (NBI Hub)** - internal project dashboard being actively built to replace paid PM tools. Completely separate from PlaySage

---

## 5. Current Clients

| Client | Glen's Role | Status | Comms | Key Dynamic |
|---|---|---|---|---|
| Couch Heroes | Fractional C-level | Active, heavy - majority of day | Slack | Escalated from project work to fractional C-level. Glen is doing a multitude of projects for them. Key contacts: Vardis (CEO), Aris (COO), Robin (Game Director), Valeria (Head of Production), Mustafa (Head of Tech), David (Director of Art), Lorenz (Head of HR) |
| Lighthouse Studios | Contract oversight | Active, light - weekly | Teams | AT RISK: analytics manager (James Firth) disengaged. Justin Logan (Director of Live Games, worked for Glen 15 yrs) frustrated. NBI building roadmap/backlog, dragging analytics manager along. Objective: make the analytics manager look good, make NBI look good, make Justin look good. Justin will know what comes from Glen because he knows Glen's work. Embedded team: Amir, Ruan, Stavros |
| Goals Studio | Price elasticity + live service overview | Active, paying | Email | CONVERTED from lead to paying client. First package: $10K US for price elasticity and high-level live service overview. Contact: Jonas Rundberg (jonas@playgoals.com). Stockholm, Sweden |
| Sarge Universe | Pitch/DD/financial plan | Pre-funding, unpaid | Telegram | Steve Green (CEO) seeking GBP 5-10M. If funded, NBI builds entire backend team. Still pre-funding, no changes. Building pitch deck, DD deck, financial plan |
| Blizzard | Minimal | Active, Tom manages | TBD | Regular report delivery. Tom-managed |

### Contracted Revenue

| Client | Annual Revenue |
|---|---|
| Lighthouse Studios | GBP 350K (3-year contract) |
| Couch Heroes | GBP 300K |
| Goals Studio | ~$10K US (first package) |
| Sarge Universe | GBP 0 (pre-funding) |

---

## 6. Pipeline and Leads

| Lead | Company | Status | Next Action |
|---|---|---|---|
| Mike Palan | Enoma Capital | New GDC lead | Follow up needed |
| Jen MacLean | Dragon Snacks Games | GDC follow-up (2 emails, 19 March) | Unanswered since 19 March - needs reply |
| James Clark | Creative Assembly | Lead | TBD |
| James Dabrowski | Jagex | Prospective | Glen considering reaching out |
| Jakub Rabinski | CD Projekt Red | Previously interested in data help | Follow-up needed |

### Jen MacLean Detail (Dragon Snacks Games)

Two emails from 19 March 2026, both unanswered:

1. **NBI referrals:** Jen is a member of industry executive/indie CEO groups where people ask for vendor recommendations. She wants to know NBI's sweet spots so she can recommend NBI. Also suggests "ethical new publishers" and VCs pivoting to finishing funds as BD channels.
2. **Dragon Snacks seed round:** Building "Farhaven" (cooperative sandbox RPG). Raised $1M+, seeking $4M seed total. $500K commitment from 1Up Fund contingent on lead investor. Launch target March 2027 on PC and Switch 2.

Glen needs to reply with NBI's sweet spots and whether the new publisher/VC angles are worth pursuing. See `brain/people_directory.md` for full contact details.

---

## 7. NBI Team (Active Roster)

### Gaming Practice (Glen Pryer, Lead)

| Name | Role | Monthly (GBP) | Notes |
|---|---|---|---|
| Glen Pryer | MD, Gaming Practice Lead | 18,000 | |
| Magnus (Kali) Pryer | Producer | 4,500 | Glen's daughter. Internal tracking, accounts |
| Amir Didar | Senior Analyst | 10,000 | Embedded at Lighthouse (3-year contract) |
| Ruan | Data Engineer | 10,000 | Embedded at Lighthouse (3-year contract) |
| Stavros | Lead Data Scientist | 10,000 | Embedded at Lighthouse (3-year contract) |
| Devin Rieger | Analyst | 5,617 | Also built SalarySage auth/packaging |

### Human Capital Practice (Tom Rieger, Lead)

| Name | Role | Notes |
|---|---|---|
| Tom Rieger | HC Practice Lead, Partner | Dear friend. Brilliant but gaming depth gap - expertise is org performance, not game dev. Tendency to engage on gaming topics before realising the domain-specific depth he's missing. Not a fault of intellect. HC practice has not landed contracts. Not currently drawing a paycheck from NBI, though he would like to (~GBP 200K/year if he does). No longer at NSI (June 2026) |
| Jeff Day | Principal Data Scientist | LET GO (June 2026). Previously hourly/as-needed, NSI-covered |
| Jessica Williams | HC Researcher | LET GO (June 2026). Previously hourly/as-needed, NSI-covered |

### Whole Business

| Name | Role | Notes |
|---|---|---|
| Bryan Rasmussen | Former CFO | No longer part of NBI (June 2026). Stayed at NSI after the NSI/NBI separation. CFO seat vacant |
| Patrice | HR Advisor / General Admin | GBP 4,000/month |

**UK payroll total (current 7 UK staff):** GBP 52,117/month / GBP 625,407/year

> NSI (owned by Robert Pop) and NBI are completely separated as of June 2026. The previously modelled wind-down cliff (GBP 620K/year landing on NBI payroll) no longer applies: Jeff Day and Jessica Williams were let go, Bryan Rasmussen stayed at NSI and is no longer part of NBI (CFO seat vacant), and Tom Rieger is not currently drawing a paycheck from NBI though he would like to (~GBP 200K/year if that changes - the only residual payroll consideration). Source: Glen, 2026-06-11.

---

## 8. Internal AI Infrastructure

### NBIAI Agent Team

33 role definitions in `roles/`. Originally from Paperclip architecture (which was vaporware/overhead). Role definitions retained as depth-skill assets - when Glen asks a question, Claude Code can use the relevant role's knowledge to go deeper. The Paperclip orchestration layer is retired. Roles span: CEO, COO, CTO, CFO, CMO, VP Engineering, VP Product, Senior Engineers, QA Lead, QA Engineers, Data Analysts, DevOps, UI/UX, Tech Writer, Head of People, Producer.

### NBI Hub (WorkSage)

Internal dashboard at `dashboard-server/` + `nbi_project_dashboard.html`. Running on PM2 at port 8888. Accessible at worksage.nbi-consulting.com. Being actively built to replace paid PM tools (ClickUp, Jira). Currently has mock data that needs replacing with real projects and tasks. Features built: Dashboard, Workload, Projects (board + tree views), People (calendar/roster), Reports, Bug Tracker (kanban), Hiring (kanban), Leads (kanban). Test infrastructure: Vitest + Playwright, 23+ tests. See `brain/nbi_hub.md` for architecture detail.

### News Aggregator

Modular service in `projects/news-aggregator/` feeding the NBI Hub News tab. Current state: generic aggregator (built with Opus 4.7, required significant refactoring due to quality issues). Running on PM2 alongside the Hub. Planned expansion: game launches, DLC releases, dashboard elements alongside news.

### AI Operations Capability

NBI has built a context-engineered AI operations layer that enables a 7-person firm to deliver at the depth of a much larger team. This includes: persistent business context (the Brain), 33-role agent team as depth-skill assets, custom Claude Code skills for domain-specific workflows (/compile-client for client knowledge compilation, /autoresearch for document quality iteration, /gi for investment analysis), session continuity systems, model tier routing (Opus/Sonnet/Haiku), and approval gates. This architecture is now being offered as a service to game studios. See `brain/services_ai_operations.md` for full detail on the capability and client service offering.

### Astinus

Personal D&D campaign intelligence system at `D:\OneDrive\Claude_code\Astinus`. Named after the chronicler from Dragonlance. Local-first Python system that processes session audio into structured world data, maintains a living world bible, and generates pre-session DM briefs. All 23+ phases complete. Tech stack: Python 3.11+, SQLite + FTS5, Claude API, FastAPI + HTMX, WhisperX + pyannote. Nights/weekends project. See `brain/personal.md` for full details.

---

## 9. Extended Module Index

The core Brain (this file) is always loaded. Extended modules in `brain/` provide deep dives into specific topics and should be loaded on demand when the conversation touches that domain.

| Module | File | Load When |
|---|---|---|
| Career History | `brain/career_history.md` | Glen's background, credentials, or achievements are relevant |
| Client Details | `brain/clients_detailed.md` | Working on a specific client engagement or need contact/political details |
| PlaySage Product | `brain/playsage.md` | Working on the PlaySage intelligence platform |
| SalarySage | `brain/salarysage.md` | Working on salary data or SalarySage integration |
| NBI Hub and News Aggregator | `brain/nbi_hub.md` | Working on the internal dashboard or news service |
| People Directory | `brain/people_directory.md` | Need contact details, investor contacts, or client org charts |
| Brand and Website | `brain/brand_website.md` | Working on brand, website, marketing, or positioning |
| Processes and Tools | `brain/processes_tools.md` | Need to know tools in use, communication channels, or workflows |
| Personal and Family | `brain/personal.md` | Personal context is relevant (health, family, D&D, Astinus details) |
| Decisions Log | `brain/decisions_log.md` | Need to check whether something has already been decided |
| Pending Actions | `brain/pending_actions.md` | Reviewing what's outstanding or stalled |
| AI Operations | `brain/services_ai_operations.md` | Working on AI service offerings, client proposals involving AI ops, or PlaySage Sage module architecture |
| Financial Resilience | `brain/financial_resilience.md` | Financial health, cash flow, revenue, payroll, risk, disaster recovery, or margin analysis |

### Loading Protocol

1. **Session start:** This file is loaded automatically as project context
2. **Topic detection:** When conversation touches a specific domain, read the relevant extended module using the index above
3. **Multiple modules:** Load multiple modules as needed - context window is large enough for core + several modules simultaneously
4. **Update protocol:** When business state changes during a session, update the relevant Brain section or module immediately and refresh the "Last Updated" timestamp

### Maintenance Rules

- Core Brain "Last Updated" timestamp refreshed every session where content changes
- Each extended module has its own timestamp
- When Glen reports a business change, update the Brain before continuing other work
- Pending actions should be reviewed periodically and stale items either actioned or removed
- Decisions log is append-only - entries are never edited, only added
- No conflicting information between core and extended modules
- No conflicting information between Brain and external files (CLAUDE.md, project briefs)

---

*End of NBI Brain - Core*
*Extended modules are in the `brain/` directory. See Section 9 for the index.*
