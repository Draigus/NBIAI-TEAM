# NBI Brain Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the NBI Brain as a lean core file (~300-400 lines) with 11 extended modules, replacing the current monolithic 1,060-line file and retiring redundant Tier 1 knowledge files.

**Architecture:** Core + Extended. `NBI_Brain.md` (always loaded) captures Glen's identity, operating style, AI preferences, business overview, current clients, pipeline, team, and AI infrastructure. Extended modules in `brain/` provide deep-dive detail loaded on demand. Five Tier 1 files in `company/knowledge/` are retired (content absorbed). Eight Paperclip agent-orchestration policies are deleted.

**Tech Stack:** Markdown files only. No code changes.

**Source spec:** `docs/superpowers/specs/2026-04-20-nbi-brain-redesign.md`

---

## File Map

### Files to Create
| File | Responsibility |
|---|---|
| `NBI_Brain.md` (rewrite) | Core brain — always-loaded business context (~300-400 lines) |
| `brain/career_history.md` | Full career table, role highlights, education |
| `brain/clients_detailed.md` | Deep client profiles, contacts, political dynamics |
| `brain/playsage.md` | Playsage product spec, competitive landscape, financials |
| `brain/salarysage.md` | SalarySage current state, security, integration plan |
| `brain/nbi_hub.md` | WorkSage dashboard and news aggregator details |
| `brain/people_directory.md` | All contacts: NBI team, clients, pipeline, investors |
| `brain/brand_website.md` | Brand, website, testimonials, proof points |
| `brain/processes_tools.md` | Tools, systems, communication channels, personal setup |
| `brain/personal.md` | Family, health, hobbies, D&D, Astinus |
| `brain/decisions_log.md` | All canon decisions with dates and context |
| `brain/pending_actions.md` | Outstanding tasks and stalled work |

### Files to Modify
| File | Change |
|---|---|
| `CLAUDE.md` | Add reference to `NBI_Brain.md` for business context |

### Files to Delete
| File | Reason |
|---|---|
| `company/knowledge/company_overview.md` | Content absorbed into core Section 4 + `brain/brand_website.md` |
| `company/knowledge/clients.md` | Content absorbed into core Section 5 + `brain/clients_detailed.md` |
| `company/knowledge/strategic_decisions.md` | Content absorbed into `brain/decisions_log.md` |
| `company/knowledge/team_directory.md` | Content absorbed into core Section 7 + `brain/people_directory.md` |
| `company/knowledge/tools_and_systems.md` | Content absorbed into `brain/processes_tools.md` |
| `company/policies/agent_activation_policy.md` | Paperclip overhead — multi-agent orchestration not in use |
| `company/policies/agent_iteration_protocol.md` | Paperclip overhead — agent self-improvement cycles |
| `company/policies/agent_performance_management.md` | Paperclip overhead — agent SMART reviews |
| `company/policies/csuite_operating_standards.md` | Paperclip overhead — C-suite agent standards |
| `company/policies/cost_tracking_procedure.md` | Paperclip overhead — multi-agent token tracking |
| `company/policies/role_audit_report.md` | Paperclip overhead — agent role fitness audit |
| `company/policies/role_iteration_recommendations.md` | Paperclip overhead — agent role improvement recs |
| `company/policies/sla_tech_writer_capacity.md` | Paperclip overhead — agent SLA |

### Files Retained (no changes)
| File | Reason |
|---|---|
| `company/knowledge/gaming_industry_context.md` | Domain reference, not business state — stays as standalone |
| `roles/*/` (all 33 directories) | Retained as depth-skill assets |
| `company/policies/approval_gates.md` | Applicable to real work |
| `company/policies/communication_protocols.md` | Applicable to real work |
| `company/policies/escalation_rules.md` | Applicable to real work |
| `company/policies/quality_standards.md` | Applicable to real work |
| `company/policies/security_policy.md` | Applicable to real work |
| `company/policies/legal_quality_standards.md` | Applicable to real work |
| `company/policies/boundary_producer_vs_production_consultant.md` | Useful reference |
| `company/policies/workflow_gaming_practice_to_vp_product.md` | Useful reference |

---

## Content Source Map

Every piece of content in the new Brain comes from one of these sources. When writing a file, consult these sources and apply the corrections noted during brainstorming.

| New File | Primary Source | Secondary Sources | Key Updates from Brainstorming |
|---|---|---|---|
| Core Section 1 (Identity) | Old Brain Section 1 | — | Change "20 years" to "22 years". Title is now "Managing Director" |
| Core Section 2 (Operating Style) | **NEW** — brainstorming transcript | — | Entirely new section. Use spec lines 57-62 verbatim |
| Core Section 3 (AI Working) | Old Brain Section 1 (partial) | Memory files: `feedback_*.md` | Consolidate hard rules from memory files. Add aggressive tool usage expectation. Add zero-tolerance sloppy work language |
| Core Section 4 (Business) | Old Brain Section 2 | `company/knowledge/company_overview.md` | PlaySage is the PRODUCT, not the company rebrand. Add WorkSage distinction. Jeff/Jessica moved to hourly. "At edge of profitability" |
| Core Section 5 (Clients) | Old Brain Section 2.5 | `company/knowledge/clients.md` | Goals Studio converted ($10K). Couch Heroes escalated to fractional C-level. Lighthouse at risk (analytics manager dynamics) |
| Core Section 6 (Pipeline) | Old Brain Section 3 (Pipeline) | — | Add Enoma Capital / Mike Palan. Jen MacLean still unanswered |
| Core Section 7 (Team) | Old Brain Section 2.4 | `company/knowledge/team_directory.md` | Jeff/Jessica on hourly. Add nuanced Tom description. Ruan not Juan |
| Core Section 8 (AI Infra) | **NEW** | NBIAI_TEAM repo structure | Paperclip = vaporware, roles = depth skills. NBI Hub actively being built. News aggregator expansion plans |
| Core Section 9 (Index) | **NEW** | — | Extended module index table |
| `brain/career_history.md` | Old Brain Section 1 (career table + highlights) | — | No changes needed — content is stable |
| `brain/clients_detailed.md` | Old Brain Sections 2.5, 3 (Pipeline) | `company/knowledge/clients.md` | Add Lighthouse political dynamics. Add Couch Heroes escalation details. Add Goals Studio conversion |
| `brain/playsage.md` | Old Brain Section 3 (Playsage) | — | Status: on hold. Glen is the only one who can build it. PRD stalled at v1.3 |
| `brain/salarysage.md` | Old Brain Section 3 (SalarySage) | — | Confirmed rolls into PlaySage as a module |
| `brain/nbi_hub.md` | **NEW** | Repo structure, brainstorming transcript | WorkSage dashboard, news aggregator, game launch/DLC expansion plans, Opus 4.7 refactoring history |
| `brain/people_directory.md` | Old Brain Section 8 | `company/knowledge/team_directory.md` | Jeff/Jessica status change |
| `brain/brand_website.md` | Old Brain Sections 2.9, 2.10, 2.11 | `company/knowledge/company_overview.md` | PlaySage is product name only, company rebrand hasn't moved |
| `brain/processes_tools.md` | Old Brain Sections 4, 5 | `company/knowledge/tools_and_systems.md` | No major changes |
| `brain/personal.md` | Old Brain Section 9 | — | No major changes |
| `brain/decisions_log.md` | Old Brain Section 7 | `company/knowledge/strategic_decisions.md` | Merge both sources. strategic_decisions.md has 2026-03-28 batch not in old Brain |
| `brain/pending_actions.md` | Old Brain Section 10 | — | Add Enoma Capital follow-up. Update stale statuses |

---

## Tasks

### Task 1: Create brain/ Directory and Core NBI_Brain.md

**Files:**
- Create: `brain/` directory
- Rewrite: `NBI_Brain.md`

**Source files to read before writing:**
- Current `NBI_Brain.md` (all 1,060 lines — Sections 1, 2.1-2.4, 2.5, 2.8, 3, 4, 5)
- `docs/superpowers/specs/2026-04-20-nbi-brain-redesign.md` (lines 47-156 — the section specifications)
- Memory files at `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI-TEAM\memory\feedback_*.md` (for hard rules)

- [ ] **Step 1: Create the brain/ directory**

```bash
mkdir -p "d:/OneDrive/Claude_code/NBIAI_TEAM/brain"
```

- [ ] **Step 2: Read all source files**

Read the current `NBI_Brain.md` in full. Read all `feedback_*.md` memory files. These are the content sources for the core rewrite.

- [ ] **Step 3: Write the new NBI_Brain.md**

Rewrite `NBI_Brain.md` at the repo root with exactly 9 sections as specified in the design spec (lines 47-156). Target 300-400 lines.

**Header format:**
```markdown
# NBI Brain — Glen Pryer
### Persistent Business Context for Claude Code Sessions
**Last Updated:** 2026-04-20
**Owner:** Glen Pryer
---
```

**Section 1 — Glen Pryer — Identity:** Extract from old Brain lines 9-52. Update "20 years" to "22 years". Career headline as a single flow line (not the full table — that goes to extended module). Include contact info, education, LinkedIn.

**Section 2 — How Glen Works — Operating Style:** This is entirely new. Use the spec lines 57-62 as the authoritative content. Six subsections: Decision-making, Feedback style, Leadership, Information format, What people get wrong, Energy/workload.

**Section 3 — How Glen Works With AI:** Consolidate from old Brain lines 63-91 (challenging, autonomy, can't stand, quality standards, proactive behaviour) AND memory files (no fabrication, no scope-watering, no timelines, verify everything, keep going, finished products only, auto-handoff). Use the spec lines 64-91 as the structural template. Include the aggressive tool usage expectation and zero-tolerance sloppy work language.

**Section 4 — NBI Business Overview:** Extract from old Brain Section 2.1-2.3, 2.6-2.8. Apply corrections: PlaySage = product only (not company rebrand). WorkSage = NBI Hub (separate). Jeff/Jessica on hourly. "At the edge of profitability." Keep to ~20 lines — detail lives in extended modules.

**Section 5 — Current Clients:** Table format with 5 rows (Couch Heroes, Lighthouse, Goals Studio, Sarge Universe, Blizzard). Use the spec lines 104-111 as the exact content — these reflect brainstorming updates.

**Section 6 — Pipeline and Leads:** Table format. Use spec lines 113-120. Include Enoma Capital/Mike Palan. Note Jen MacLean unanswered since March.

**Section 7 — NBI Team (Active Roster):** Table format with 11 rows. Use spec lines 122-135. Include the nuanced Tom Rieger description. Mark Jeff/Jessica as hourly/as-needed.

**Section 8 — Internal AI Infrastructure:** Four bullet points (NBIAI Agent Team, NBI Hub, News Aggregator, Astinus). Use spec lines 137-141.

**Section 9 — Extended Module Index:** Table format with 11 rows mapping module name to file path and loading trigger. Use spec lines 143-156.

- [ ] **Step 4: Verify line count**

```bash
wc -l "d:/OneDrive/Claude_code/NBIAI_TEAM/NBI_Brain.md"
```

Expected: between 300 and 400 lines. If significantly over, trim verbose sections. If significantly under, check for missing content.

- [ ] **Step 5: Commit**

```bash
git add NBI_Brain.md brain/
git commit -m "feat: rewrite NBI Brain as core + extended architecture

- Core Brain rewritten to ~300-400 lines (was 1,060)
- New sections: Operating Style, AI Working Style, AI Infrastructure
- Updated all stale client/team/business information
- Created brain/ directory for extended modules"
```

---

### Task 2: Write brain/career_history.md

**Files:**
- Create: `brain/career_history.md`

**Source:** Old `NBI_Brain.md` lines 23-48 (career table and highlights), lines 17-21 (education/certs)

- [ ] **Step 1: Read old Brain career content**

Read `NBI_Brain.md` lines 23-48 for the career history table and key highlights section.

- [ ] **Step 2: Write brain/career_history.md**

```markdown
# Glen Pryer — Career History

**Last Updated:** 2026-04-20

---

## Career Timeline (Reverse Chronological)

| Dates | Role | Company | Location |
|-------|------|---------|----------|
| Oct 2024 - Present | Managing Director | NBI Gaming | Remote (UK) |
| Oct 2022 - Sep 2024 | Chief Publishing Officer | Build A Rocket Boy | Edinburgh, Scotland |
| Jun 2020 - Aug 2022 | Senior Director Product Analytics, Data Science & Engineering | Jagex | Cambridge, England |
| 2017 - May 2020 | EU Senior Director of Product Analysis | Electronic Arts (EA) / DICE | Stockholm, Sweden |
| 2013 - 2017 | Principal Director Xbox Portfolio & Data Science | Microsoft | Redmond, Washington |
| 2012 - 2013 | Vice President of Operations | Z2 | Seattle area |
| 2011 - 2012 | Vice President Operations | 38 Studios | -- |
| 2006 - 2011 | Director of Global Planning and Live Services | Blizzard Entertainment | -- |
| Dec 2005 - Nov 2006 | V.P. Operations | Fifth Third Bankcorp | -- |
| Jan 1996 - Dec 2005 | Senior Manager | Dell Computers | -- |

## Key Highlights by Role

**Dell (10 yrs):** Built Dell's first premium service offering ($230M revenue). $3.4M annual savings via Six Sigma. Led new product launches. Grew from small teams to full divisions.

**Blizzard (5 yrs):** Launched StarCraft 2, WoW WOTLK, Cataclysm, Diablo 3. Built multiple departments for global product strategy and live support. Established analytics and data-driven decision making.

**38 Studios (1 yr):** Created launch strategy for Kingdoms of Amalur and unreleased MMO. Developed publishing investment strategies. Built BI strategy, system and team.

**Z2 (1 yr):** Launched two new games, maintained live games. Expanded with second studio in Vancouver. First data intelligence team. Economy modelling increased revenue 22%. Reduced costs 40%.

**Microsoft/Xbox (4 yrs):** Game design support for Halo, Minecraft, Sunset Overdrive, Sea of Thieves. Built core data systems used by Dev, Finance, Marketing, Exec teams. ML-driven forecasting, recommendation engines. Supported M&A and console launches.

**EA/DICE (3.5 yrs):** Launch and live support for Apex Legends, Battlefield 1 & 5, Need for Speed. Created economy design analyst role at DICE. Restructured Star Wars Battlefront 2 progression post-launch (40% performance lift). Built live service roadmaps.

**Jagex (2 yrs):** Old School Runescape feature prioritisation. Increased FTP retention 18% and revenue 15%. Led cloud migration from legacy on-prem. Supported successful sale of studio twice.

**Build A Rocket Boy (2 yrs):** Led 280+ staff. Co-led closing £110M Series D investment. Improved employee satisfaction from low 40s to mid 80s. Built product management, data analytics, user research, marketing, brand, CRM, BD, QA and player services from scratch.

**NBI Gaming (current):** Managing Director of European practice. Strategic planning, project management, operational efficiency, research, data analytics for game studios, publishers, and app developers.

## Education and Credentials

- **University of Texas** — BS Computer Science (1995-1999)
- **Six Sigma Black Belt**
- **LinkedIn:** linkedin.com/in/glenpryer
- **Volunteering:** JDRF Team Captain (2005-2007), IGDA member
```

- [ ] **Step 3: Commit**

```bash
git add brain/career_history.md
git commit -m "feat(brain): add career history extended module"
```

---

### Task 3: Write brain/clients_detailed.md

**Files:**
- Create: `brain/clients_detailed.md`

**Sources:**
- Old `NBI_Brain.md` lines 225-314 (Section 2.5 — client details)
- `company/knowledge/clients.md` (past clients table)
- Brainstorming transcript (Lighthouse political dynamics, Couch Heroes escalation, Goals Studio conversion)

- [ ] **Step 1: Read old Brain client sections**

Read old `NBI_Brain.md` lines 225-314. Read `company/knowledge/clients.md`. Note updates from brainstorming.

- [ ] **Step 2: Write brain/clients_detailed.md**

Include for each active client: Glen's role, workload, current work, communication channel, key contacts (name/role), engagement history, and political dynamics. Apply these corrections:
- **Couch Heroes:** Escalated from project work to fractional C-level. Glen is doing a multitude of projects. This is no longer "setting up the UK company" — it's ongoing fractional leadership.
- **Lighthouse:** Add political dynamics — analytics manager disengaged, Justin Logan (Life Service Director, worked for Glen 15 years) frustrated. Building roadmap/backlog. Objective: make analytics manager look good, make NBI look good, make Justin look good. Justin will know what comes from Glen because he knows Glen's work.
- **Goals Studio:** Converted from lead. First package: $10K US for price elasticity and high-level live service overview. Contact: Jonas Rundberg (jonas@playgoals.com), Stockholm.
- **Sarge Universe:** Still pre-funding. No changes.
- **Blizzard:** No changes.

Include the past clients table from `company/knowledge/clients.md` lines 33-54. Note that four active clients still need adding to the website carousel.

Include the Jen MacLean / Dragon Snacks Games email summary from old Brain lines 727-751 (two emails from 19 March 2026, both unanswered).

- [ ] **Step 3: Commit**

```bash
git add brain/clients_detailed.md
git commit -m "feat(brain): add detailed clients extended module"
```

---

### Task 4: Write brain/playsage.md

**Files:**
- Create: `brain/playsage.md`

**Source:** Old `NBI_Brain.md` lines 558-665 (Playsage section)

- [ ] **Step 1: Read old Brain Playsage section**

Read old `NBI_Brain.md` lines 558-665 in full.

- [ ] **Step 2: Write brain/playsage.md**

Extract the complete Playsage section from the old Brain. This includes: what it is, 10 core modules, Cascade Engine, tech stack (locked), pricing, financial projections, competitive landscape, beachhead market, TAM, demo anchor titles, data strategy, key moat arguments, deliverables progress, PRD status, advisory contacts, "Why Now" argument, and open questions.

Apply these corrections:
- Status: on hold. Glen is the only person who can put it together, and client work takes priority.
- SalarySage confirmed as a module within Playsage (not a separate product).
- PlaySage is the PRODUCT name. It is NOT the company rebrand name. The company rebrand to "PlaySage Advisors" or similar has not moved at all.
- PRD stalled at v1.3 corrections (~60+ fixes identified, 10 decision points queried). Last active ~20 Feb 2026.
- GDC 2026 demo status still unknown.

- [ ] **Step 3: Commit**

```bash
git add brain/playsage.md
git commit -m "feat(brain): add Playsage product extended module"
```

---

### Task 5: Write brain/salarysage.md

**Files:**
- Create: `brain/salarysage.md`

**Source:** Old `NBI_Brain.md` lines 667-716 (SalarySage section)

- [ ] **Step 1: Read old Brain SalarySage section**

Read old `NBI_Brain.md` lines 667-716.

- [ ] **Step 2: Write brain/salarysage.md**

Extract the complete SalarySage section. Include: what it is, key features, current state (v10 prototype), components list, team working on it, data QA status, security concerns (API key exposure — three issues flagged by Glen 26 March), relationship to Playsage (confirmed: SalarySage is a function of Playsage, rolls into it as a module), and remaining open questions.

No corrections needed beyond what's already in the source.

- [ ] **Step 3: Commit**

```bash
git add brain/salarysage.md
git commit -m "feat(brain): add SalarySage extended module"
```

---

### Task 6: Write brain/nbi_hub.md

**Files:**
- Create: `brain/nbi_hub.md`

**Sources:**
- Brainstorming transcript (primary — this content is new)
- Repo structure: `dashboard-server/`, `nbi_project_dashboard.html`, `projects/news-aggregator/`
- Memory file: `project_nbi_hub_vocabulary.md`

- [ ] **Step 1: Read source context**

Read `C:\Users\gpbea\.claude\projects\d--OneDrive-Claude-code-NBIAI-TEAM\memory\project_nbi_hub_vocabulary.md` for naming conventions. Check `dashboard-server/package.json` for tech stack details. Check `projects/news-aggregator/package.json` for news aggregator tech details.

- [ ] **Step 2: Write brain/nbi_hub.md**

This is mostly new content. Structure:

**NBI Hub (WorkSage) — Internal Dashboard:**
- What it is: internal project management dashboard being actively built to replace paid PM tools (ClickUp, Jira)
- Naming: "NBI Hub" and "WorkSage" are the same thing. It runs at `dashboard-server/` + `nbi_project_dashboard.html` on port 8888 via PM2
- It is NOT PlaySage (the customer-facing product). These are completely separate
- Current state: actively being built, currently has mock/test data that needs replacing with real projects and tasks
- Access: worksage.nbi-consulting.com via Tailscale
- Tech details: extract from package.json

**News Aggregator:**
- What it is: modular service in `projects/news-aggregator/` that feeds gaming industry news into the NBI Hub
- Current state: generic aggregator. Was built with Opus 4.7, which Glen found to be poor quality and required significant refactoring
- Planned expansion: Glen wants it to go beyond generic news aggregation to include game launches, DLC releases, and dashboard-style elements alongside the news feed
- Tech details: extract from package.json

- [ ] **Step 3: Commit**

```bash
git add brain/nbi_hub.md
git commit -m "feat(brain): add NBI Hub and news aggregator extended module"
```

---

### Task 7: Write brain/people_directory.md

**Files:**
- Create: `brain/people_directory.md`

**Sources:**
- Old `NBI_Brain.md` lines 896-944 (Section 8 — People Directory)
- `company/knowledge/team_directory.md`

- [ ] **Step 1: Read old Brain people section**

Read old `NBI_Brain.md` lines 896-944. Read `company/knowledge/team_directory.md`.

- [ ] **Step 2: Write brain/people_directory.md**

Four tables:
1. **NBI Team** — full details for all 11 people. Apply corrections: Jeff Day and Jessica Williams moved to hourly/as-needed. Ruan is the correct spelling (not Juan).
2. **Client Contacts** — all named contacts per client, with company, role, and communication channel.
3. **Pipeline / Lead Contacts** — all named leads with company, context, and status. Add Enoma Capital / Mike Palan.
4. **Investor Contacts (Sarge Universe)** — Jackson (RMT), Riley Graebner (Magna Capital), Binni (Behold Ventures), Manjit Dawe (TDR Capital). Note: Edery/Spryfox unconfirmed.

- [ ] **Step 3: Commit**

```bash
git add brain/people_directory.md
git commit -m "feat(brain): add people directory extended module"
```

---

### Task 8: Write brain/brand_website.md

**Files:**
- Create: `brain/brand_website.md`

**Sources:**
- Old `NBI_Brain.md` lines 413-524 (Sections 2.9-2.12 — Brand, Website, Testimonials, Proof Points, Open Items)
- `company/knowledge/company_overview.md` (brand direction, proof points)

- [ ] **Step 1: Read old Brain brand sections**

Read old `NBI_Brain.md` lines 413-524.

- [ ] **Step 2: Write brain/brand_website.md**

Extract all brand/website content. Sections:
- Current brand elements (electric blue, dark theme, Orbitron font, nbi logo)
- Website assessment (4.8/10 score, specific issues)
- Website redesign progress (HTML/CSS prototype in Claude Chat, not deployed, 10 files)
- **Critical clarification:** PlaySage is the product name (the gaming intelligence SaaS platform). The company rebrand (NBI -> PlaySage Advisors or similar) has NOT moved at all. No trademark checks, no domain checks done. These are separate things and the Brain must not conflate them.
- Website issues (hero section, diluted messaging, missing active clients from carousel)
- Digital channels (LinkedIn page exists, zero activity)
- Testimonials (Paul Sams, J Allen Brack, Justin Logan — all approved for public use, include full quotes)
- Proof points and credentials table
- Open items table (from old Brain Section 2.12)

- [ ] **Step 3: Commit**

```bash
git add brain/brand_website.md
git commit -m "feat(brain): add brand and website extended module"
```

---

### Task 9: Write brain/processes_tools.md

**Files:**
- Create: `brain/processes_tools.md`

**Sources:**
- Old `NBI_Brain.md` lines 752-810 (Sections 4, 5 — Processes, Tools)
- `company/knowledge/tools_and_systems.md`

- [ ] **Step 1: Read old Brain processes/tools sections**

Read old `NBI_Brain.md` lines 752-810. Read `company/knowledge/tools_and_systems.md`.

- [ ] **Step 2: Write brain/processes_tools.md**

Merge content from both sources. Sections:
- Business tools table (M365, Slack, Teams, Telegram, WhatsApp, QuickBooks, Framer, Excel, Git/GitHub, LinkedIn)
- AI and automation tools table (Claude Code, Claude Chat, Granola, client leads app, MCP integrations: Google Calendar, Google Drive, Gmail, MS365)
- Glen's personal setup (Windows 11, user dir C:\Users\gpbea, OneDrive D:\OneDrive, Claude Code projects D:\OneDrive\Claude_code\, timezone, working hours, emails)
- Communication priority stack (Slack > Telegram > WhatsApp > Teams)
- Business processes (TBDs from old Brain — note these are still undefined: proposal/SOW creation, invoicing, reporting cadence)
- Glen's working patterns (09:00-21:00, no lunch, daily standup when available, analytics hour with Lighthouse team weekly)

- [ ] **Step 3: Commit**

```bash
git add brain/processes_tools.md
git commit -m "feat(brain): add processes and tools extended module"
```

---

### Task 10: Write brain/personal.md

**Files:**
- Create: `brain/personal.md`

**Source:** Old `NBI_Brain.md` lines 946-1030 (Section 9 — Personal & Family)

- [ ] **Step 1: Read old Brain personal section**

Read old `NBI_Brain.md` lines 946-1030.

- [ ] **Step 2: Write brain/personal.md**

Extract the complete personal section. Include:
- Family details (Heather, Nick — mark as sensitive topic, Kali, Jacob at Anglia Ruskin, Grendel the Cane Corso)
- Health (3x pulmonary embolisms, blood thinners, keto with Heather, ~50 lbs combined loss)
- D&D (DM, Foundry VTT, extensive world lore, Spotify music library, considering world book and novels)
- Astinus system (named after Dragonlance chronicler, all 23+ phases complete, full tech stack from old Brain lines 997-1029, custom calendar with GameDate.format_display(), entity types, project location D:\OneDrive\Claude_code\Astinus, warning about stale Downloads copy)
- Important dates (TBD — birthdays, anniversary)

No corrections needed — this content is stable.

- [ ] **Step 3: Commit**

```bash
git add brain/personal.md
git commit -m "feat(brain): add personal and family extended module"
```

---

### Task 11: Write brain/decisions_log.md

**Files:**
- Create: `brain/decisions_log.md`

**Sources:**
- Old `NBI_Brain.md` lines 866-889 (Section 7 — Decisions Log)
- `company/knowledge/strategic_decisions.md` (has 2026-03-28 batch not in old Brain)

- [ ] **Step 1: Read both decision sources**

Read old `NBI_Brain.md` lines 866-889. Read `company/knowledge/strategic_decisions.md` in full.

- [ ] **Step 2: Write brain/decisions_log.md**

Merge both sources into one authoritative log. The `strategic_decisions.md` file has significantly more entries (the entire 2026-03-28 batch of C-suite, legal, gaming practice, sprint, and operational decisions). Include ALL entries from both sources, deduplicated.

Header: state clearly that these are canon decisions that should not be revisited unless Glen explicitly reopens them. Decisions log is append-only.

Format: date | decision | context — same table format as original.

- [ ] **Step 3: Commit**

```bash
git add brain/decisions_log.md
git commit -m "feat(brain): add decisions log extended module"
```

---

### Task 12: Write brain/pending_actions.md

**Files:**
- Create: `brain/pending_actions.md`

**Source:** Old `NBI_Brain.md` lines 1038-1056 (Section 10 — Pending Actions)

- [ ] **Step 1: Read old Brain pending actions**

Read old `NBI_Brain.md` lines 1038-1056.

- [ ] **Step 2: Write brain/pending_actions.md**

Extract and update the pending actions table. Apply these updates from brainstorming:
- **Jen MacLean reply:** Still pending (Glen confirmed)
- **Goals Studio follow-up:** Change to DONE — converted, $10K package landed
- **SalarySage API key issues:** Status unchanged (still urgent)
- **Playsage PRD/deliverables:** Status unchanged (stalled, on hold)
- **Add new:** Enoma Capital / Mike Palan follow-up (coming week)
- **Add new:** NBI Hub — replace mock data with real projects and tasks
- **Add new:** News aggregator — expand beyond generic to game launches, DLC, dashboard elements
- **GDC 2026 demo status:** Still waiting on Glen

- [ ] **Step 3: Commit**

```bash
git add brain/pending_actions.md
git commit -m "feat(brain): add pending actions extended module"
```

---

### Task 13: Update CLAUDE.md with Brain Reference

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Read current CLAUDE.md**

Read `CLAUDE.md` to find the right location for the Brain reference.

- [ ] **Step 2: Add Brain reference**

Add to the top of CLAUDE.md, after the "What This Is" section:

```markdown
## Business Context

See `NBI_Brain.md` for full business context: Glen's identity, operating style, AI working preferences, current clients, pipeline, team roster, and internal AI infrastructure. Extended modules in `brain/` provide deep-dive detail on specific topics — consult the index in Section 9 of the Brain.
```

- [ ] **Step 3: Remove or update Knowledge Architecture section**

The current CLAUDE.md has a "Knowledge Architecture (Three Tiers)" section. Update it to reflect:
- Tier 1 is now the Brain (NBI_Brain.md + brain/ modules), not company/knowledge/ files
- `company/knowledge/gaming_industry_context.md` remains as standalone domain reference
- Tier 2 (role knowledge in roles/) unchanged
- Tier 3 (project knowledge in projects/) unchanged

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "feat: update CLAUDE.md with Brain reference and revised knowledge architecture"
```

---

### Task 14: Retire Tier 1 Knowledge Files

**Files:**
- Delete: `company/knowledge/company_overview.md`
- Delete: `company/knowledge/clients.md`
- Delete: `company/knowledge/strategic_decisions.md`
- Delete: `company/knowledge/team_directory.md`
- Delete: `company/knowledge/tools_and_systems.md`
- Retain: `company/knowledge/gaming_industry_context.md`

- [ ] **Step 1: Verify all content has been absorbed**

For each file to be deleted, confirm the Brain (core or extended module) contains equivalent or updated content:

| Tier 1 File | Absorbed Into | Verify |
|---|---|---|
| company_overview.md | Core Section 4 + brain/brand_website.md | One-liner, differentiator, proof points, service lines all present |
| clients.md | Core Section 5 + brain/clients_detailed.md | All 5 active clients + past clients table present |
| strategic_decisions.md | brain/decisions_log.md | All entries including 2026-03-28 batch present |
| team_directory.md | Core Section 7 + brain/people_directory.md | All 11 team members + payroll notes present |
| tools_and_systems.md | brain/processes_tools.md | All tools, setup details, comms stack present |

- [ ] **Step 2: Delete the five files**

```bash
git rm company/knowledge/company_overview.md
git rm company/knowledge/clients.md
git rm company/knowledge/strategic_decisions.md
git rm company/knowledge/team_directory.md
git rm company/knowledge/tools_and_systems.md
```

- [ ] **Step 3: Verify gaming_industry_context.md is untouched**

```bash
git status company/knowledge/gaming_industry_context.md
```

Expected: no changes to this file.

- [ ] **Step 4: Commit**

```bash
git add -A company/knowledge/
git commit -m "chore: retire Tier 1 knowledge files — content absorbed into Brain

- company_overview.md -> Core Section 4 + brain/brand_website.md
- clients.md -> Core Section 5 + brain/clients_detailed.md
- strategic_decisions.md -> brain/decisions_log.md
- team_directory.md -> Core Section 7 + brain/people_directory.md
- tools_and_systems.md -> brain/processes_tools.md
- gaming_industry_context.md RETAINED as standalone domain reference"
```

---

### Task 15: Retire Paperclip Policy Files

**Files:**
- Delete: `company/policies/agent_activation_policy.md`
- Delete: `company/policies/agent_iteration_protocol.md`
- Delete: `company/policies/agent_performance_management.md`
- Delete: `company/policies/csuite_operating_standards.md`
- Delete: `company/policies/cost_tracking_procedure.md`
- Delete: `company/policies/role_audit_report.md`
- Delete: `company/policies/role_iteration_recommendations.md`
- Delete: `company/policies/sla_tech_writer_capacity.md`

- [ ] **Step 1: Verify retained policies are not in the delete list**

Check that these 8 files are NOT being deleted:
- approval_gates.md
- communication_protocols.md
- escalation_rules.md
- quality_standards.md
- security_policy.md
- legal_quality_standards.md
- boundary_producer_vs_production_consultant.md
- workflow_gaming_practice_to_vp_product.md

- [ ] **Step 2: Delete the eight Paperclip policy files**

```bash
git rm company/policies/agent_activation_policy.md
git rm company/policies/agent_iteration_protocol.md
git rm company/policies/agent_performance_management.md
git rm company/policies/csuite_operating_standards.md
git rm company/policies/cost_tracking_procedure.md
git rm company/policies/role_audit_report.md
git rm company/policies/role_iteration_recommendations.md
git rm company/policies/sla_tech_writer_capacity.md
```

- [ ] **Step 3: Commit**

```bash
git add -A company/policies/
git commit -m "chore: retire Paperclip agent-orchestration policies

Removed 8 policy files that only applied to the multi-agent Paperclip
execution model (not in use). Retained 8 policies applicable to real work."
```

---

### Task 16: Final Verification Pass

**Files:** All new and modified files

- [ ] **Step 1: Verify file structure**

```bash
echo "=== Core Brain ===" && wc -l NBI_Brain.md && echo "=== Extended Modules ===" && ls -la brain/ && echo "=== Remaining Tier 1 ===" && ls company/knowledge/ && echo "=== Remaining Policies ===" && ls company/policies/
```

Expected:
- NBI_Brain.md: 300-400 lines
- brain/: 11 .md files
- company/knowledge/: only gaming_industry_context.md
- company/policies/: 8 retained files

- [ ] **Step 2: Check for cross-file conflicts**

Spot-check that key facts are consistent across core and extended modules:
- Glen's industry experience: "22 years" in core Section 1, career_history.md, and nowhere says "20 years"
- Client count: 5 active clients in core Section 5, same 5 in clients_detailed.md
- Team count: 11 people in core Section 7, same 11 in people_directory.md
- PlaySage: described as "product" (not company rebrand) in core Section 4, playsage.md, and brand_website.md
- WorkSage: described as "NBI Hub" (not PlaySage) in core Section 8 and nbi_hub.md

- [ ] **Step 3: Check for information loss**

Search old Brain for proper nouns, figures, and facts that must not be lost:

```bash
grep -c "£\|GBP\|\$" NBI_Brain.md brain/*.md
```

Key facts to verify are present somewhere in the new system:
- £625K/year UK payroll
- £1.2M Year 2 target, £2M Year 3 target
- Lighthouse £350K/year contract
- Couch Heroes £300K/year contract
- Playsage $10M raise target
- Playsage pricing: $1,500 / $5,000 / $12-20K per month
- SalarySage API key on Jeff's personal credit card ($25 loaded)
- Goals Studio $10K first package
- £110M Series D at Build A Rocket Boy
- $230M Dell premium service offering

- [ ] **Step 4: Verify CLAUDE.md references are correct**

Read `CLAUDE.md` and confirm:
- Brain reference points to `NBI_Brain.md`
- Knowledge Architecture section reflects new structure
- No references to deleted Tier 1 files remain

- [ ] **Step 5: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "fix: address verification issues in Brain redesign"
```

Only run this if Step 2-4 found issues that required fixes.
