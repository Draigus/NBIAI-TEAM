# Couch Heroes Backlog Consolidation - Design Spec

**Date:** 2026-04-24 (rewritten 2026-04-27 after Q1-Q17 + parallel-agent build-out)
**Author:** Glen Pryer / Claude
**Status:** Comprehensive workbook built. 2,212 items across 7+AI projects. Ready for offsite review (Apr 27-30).

---

## Goal

Consolidate every fragmented Couch Heroes work item from multiple stale sources into one clean, up-to-date backlog structured for WorkSage import. Every item preserved, fully classified, or explicitly killed. Game project items carry type/layer/confidence metadata so the studio can filter the backlog by architectural layer and work type during the offsite. Thin projects (Studio Operations, Studio Business, AI, Production Strategy) built out from authoritative source material plus reference skills, not skeleton lists.

## Source Data

| Source | Location | Items | Contribution |
|---|---|---|---|
| CSV work list (v10) | `Clients/Couch Heroes/Glen_work_list_v10.csv` | 121 mapped items | Task titles, parent grouping, status, priority, descriptions, assignees |
| UK Project Plan Excel (v3) | `Clients/Couch Heroes/CH_Artifacts_Project_Plan_FINAL_v3.xlsx` | 96 artifacts | Legal refs, deadlines, owners, Lorenza's notes, action items, artifact links |
| Hiring Plan Excel (v2) | `Clients/Couch Heroes/Merged_Hiring_Plan_final_v2.xlsx` | 57 positions | Headcount plan, salary bands, phasing |
| Org structure (likely) | `Clients/Couch Heroes/org_structure_likely_2026-04-26.md` | 1 doc | Glen's Miro screenshot transcribed; subject to offsite finalisation |
| Granola meeting notes | ~47 CH meetings in last 30 days | Decisions, action items, status updates | Truth layer for truing up stale CSV statuses |
| UK Company Guidance (extracted) | `Clients/Couch Heroes/CH_Guidance_extracted.md` | 355 lines | Insurance, pensions, payroll, employment law content |
| Couch_Heroes_Features_v2.xlsx | `Clients/Couch Heroes/Couch_Heroes_Features_v2.xlsx` | 1,189 game items across 6 sheets | Game project source: Game Feature List, TDD, Platform Feature List, Content List, Live Service Features, Feature Versions |
| Roadmap Schedule | `Clients/Couch Heroes/couch_heroes_roadmap_schedule.xlsx` | 13 steps | AMA + roadmap planning sequence (mostly historical) |
| AMA materials | `Clients/Couch Heroes/CH_AMA_*` | Multiple files | AMA project artifacts (closed) |
| CTO assets (staged) | `Clients/Couch Heroes/CTO_*` | 4 files | Question set, scorecard, recruiting brief, role brief, hiring plan calendar |
| Vision docs | `Clients/Couch Heroes/Couch_Heroes_Vision_Document2.docx` + `COUCH HEROES VISION.docx` | 2 docs | Studio + game vision, design pillars, audience priorities |
| Studio announcement | `Clients/Couch Heroes/Couch_Heroes_Studio_Announcement2.pptx` | 1 deck | Studio launch comms reference |

## Build Process

1. CSV mapped to 7+AI structure with Q1-Q13 status overrides applied (Cam/Neil/Nia dead, Lead Animator Done, Dino review delivered, Coaching to HR, etc.)
2. UK Excel artifacts ingested into UK Company Setup project
3. Hiring sheet positions categorised into HR Hiring Pipeline sub-features by discipline (Engineering, Production & Design, Art, Audio, QA, Operations)
4. Game items ingested from V2 file across 6 sub-features (Game Features, Game Systems, Platform Features, Live Service Features, Content, Feature Versions)
5. **Five parallel agents dispatched (per dispatching-parallel-agents skill)** to produce:
   - Game classification (1,201 items classified by type + layer + confidence)
   - Studio Operations backlog (233 items)
   - Studio Business backlog (246 items)
   - AI project backlog (137 items)
   - Production Strategy enrichments (124 NEW items added on top of 27 existing CSV items)
6. All agent outputs ingested via markdown table parser, normalised against WorkSage schema, em-dashes stripped per Glen's hard rule

---

## Glen's Decisions (Q1-Q17, 2026-04-26 / 2026-04-27)

| Q | Topic | Decision | Action applied |
|---|---|---|---|
| Q1 | CTO Hiring | Cam, Neil, Nia ALL DEAD. Restart search. | Cancel three records. New stories: locate question set (DONE - staged at CTO_Interview_Questions_Couch_Heroes.docx), refresh scorecard (CTO_Scorecard.xlsx staged), restart sourcing |
| Q2 | Executive Coaching | Move out of EP Hiring | Placed under HR / Coaching Programme |
| Q3 | Lead Animator | Same role as Alon | Marked Done |
| Q4 | Lead Animator question set | Done, but produce written artifact | Marked Done. Story added: locate questions used, document, attach during WorkSage upload |
| Q5 | Lili Zhao vs Lorenza | Two separate people | Added Lili COS hire (~£135k) |
| Q6 | HR Operations | Still interviewing | In Progress. Reference URLs (Slack + Google Sheet) attached |
| Q7 | Dino performance review | Already DELIVERED. Exit timeline tentative | Marked review Done. Exit dates flagged tentative |
| Q8 | Org design models | All details to add. Miro screenshot received | Captured at org_structure_likely_2026-04-26.md. Story added to attach final post-offsite |
| Q9 | Feb 18 JIRA walk-through | Postponed | Target ~2 weeks after offsite (mid-May), conditional on roadmap + process flow agreement |
| Q10 | Offsite dates | 4 days, Apr 27-30 | Confirmed |
| Q11 | Miro board | Export to CSV/Excel | Already done - Couch Heroes Features.xlsx WAS the export |
| Q12 | Recurring 1:1s | One programme story + 8 weekly sub-tasks per cycle | Single HR story plus 8 task children |
| Q13 | SOW administration | NOT a Couch Heroes item | REMOVED. Belongs in NBI internal |
| Q14 | Game classification taxonomy | System / Feature / Content (+ Platform / LiveService / Maturity orthogonal) | Applied to all 1,189 game items via parallel agent using game-studios reference skills |
| Q15 | Game Feature List classification | Auto-classify by heuristic, flag uncertain for offsite | 180 items flagged low confidence with reasons |
| Q16 | Thin projects to flesh out | All three (Studio Ops, Studio Business, AI) plus Production Strategy | Done via 4 parallel agents using legal/finance/marketing/launch-strategy/etc. reference skills |
| Q17 | Spec rewrite | Full rewrite with everything | This document |

---

## WorkSage Schema

### Hierarchy
```
Client: Couch Heroes (client_id)
Project (depth 0)
  Feature (depth 1)
    Story (depth 2)
      Task (depth 3+)
```

### Field Mapping
| Source field | WorkSage field | Notes |
|---|---|---|
| Task name | `title` | Prefixed with ref number for UK artifacts |
| Description | `description` | Enriched with legal basis, Granola context, Q&A notes |
| Status | `status` | Not started / In progress / Planning / Drafted / In Review / Blocked / Done / Cancelled |
| Priority | `priority` | Low / Medium / High / Urgent / Critical ACT |
| Assignee | `assignees` | Array |
| Health State | `health_state` | Green / Yellow / Red / Waiting on Client |
| Parent | `parent_id` | Tree reference via `parent_path` column |
| Deadline | `due_date` | From UK Excel or Glen's direction |
| Work categorisation | `work_type` | Research / Strategy / Implementation / Assessment / Ongoing Mgmt |
| **(NEW) Game classification** | `type` | System / Feature / Content / Platform / LiveService / Maturity |
| **(NEW) Architecture layer** | `layer` | Foundation / Core / Feature / Presentation / Polish |
| **(NEW) Confidence** | `confidence` | high / medium / low (low = needs offsite review) |

---

## Game Build - Classification Framework (Q14)

Derived from game-studios reference skills (`create-architecture.md` layer model, `create-epics.md` epic-per-architectural-module principle, `team-live-ops.md` for live service taxonomy).

### Type axis (primary)

| Type | Definition | Source sheet |
|---|---|---|
| System | Architectural module backbone. Built once. Foundation for everything else. | TDD sheet (entire) + system-keyword rows in Game Feature List |
| Feature | Player-facing capability built on top of a System | Most of Game Feature List |
| Content | Data/asset instance populating Systems and Features | Content List (entire) |
| Platform | Web/mobile companion product. Separate stack/team/cadence | Platform Feature List + [Platform]-prefixed Feature Versions |
| LiveService | Post-launch operational. Different release cadence | Live Service Features sheet |
| Maturity | V0-V7 progression overlay. Not a separate item, attached to existing items | Feature Versions sheet |

### Layer axis (secondary, from create-architecture.md)

| Layer | Definition | Examples |
|---|---|---|
| Foundation | Engine integration, save/load, scene management, event bus, networking, online services | Online Services & Backend, Save/Load, Multiplayer Systems, Analytics, Telemetry |
| Core | Physics, input, combat, movement, base inventory mechanics | Combat unified, Movement System, Navigation, Inventory System, Stat System |
| Feature | Gameplay systems built on Core | Crafting, Magic, Quests, Achievements, Factions, Fishing, Pets, Day/night cycle |
| Presentation | UI, HUD, menus, VFX, audio, social-facing surfaces | HUD, Player Chat, Notifications, Mail, Friends, Animations, VFX, Icons |
| Polish | Accessibility, tutorial, optimisations | Accessibility, In-game Tutorial, UX Optimizations, Modern UX |

### Game project workbook structure

```
Couch Heroes / Game / [sub-feature] / [Epic] / [Feature] / [Story] / [Task]
```

Six sub-features (one per V2 sheet):
1. **Game Features** (Game Feature List) - core gameplay items, mix of System and Feature types
2. **Game Systems** (TDD) - architectural systems with ETA / Actual Time tracking
3. **Platform Features** (Platform Feature List) - web/mobile companion
4. **Live Service Features** (Live Service Features) - LiveOps, events, monetisation
5. **Content** (Content List) - art and UX production tasks
6. **Feature Versions** (Feature Versions) - V0-V7 maturity overlay (Not Started / R&D / Prototype / MVP / Launch / Optimize / Expand / Scale)

---

## Project Structure (7+AI) - Full Detail

### 1. Studio Operations
**Sub-features:** Org Design and Structure, Finance, Fundraising, IT and Systems, Legal and Compliance

Built from CH_Guidance_extracted.md (UK insurance, pensions, payroll, employment law) plus Riley/SayBrook engagement context, Greece initiative tracking, fundraising pipeline (Alter Ego, Picks Capital, Enoma, Madrona). Reference skills: `legal:legal-risk-assessment`, `legal:vendor-check`, `legal:compliance-check`, `finance:close-management`, `finance:reconciliation`, `finance:financial-statements`.

Items NOT duplicated from UK Company Setup project (those are one-time legal artifacts; Studio Operations covers ongoing operational/governance/process work).

Known gaps requiring Glen input (flagged in workbook notes):
- Riley engagement scope (fixed retainer vs capped hours)
- Greece initiative structure (subsidiary / branch / EOR) - blocks Org Design
- CTO vacancy ownership of IT items currently assigned to Mustafa
- Game backend platform decision (PlayFab / AccelByte / Pragma / custom)
- Cap table holder of truth confirmation
- Audio lead presence vs absence

### 2. HR
**Sub-features:** Hiring Pipeline (Engineering / Production & Design / Art / Audio / QA / Operations / DONE), Pay & Performance, Coaching Programme (per Q2), 1:1s (per Q12 - one programme story plus 8 weekly task children), Culture & Comms, Staff Changes (Dino exit, Rafael, Mustafa, Robin)

CSV items reparented per Q1-Q12 decisions. 57 hiring positions from Hiring Plan Excel categorised by discipline. New items from Q&A: CTO restart x3, Lead Animator question doc, Lili Zhao COS hire, HR Ops references, Dino exit, Org structure attach, Weekly 1:1 Programme.

### 3. UK Company Setup
**One-time project, closes when complete.** 96 artifacts from CH_Artifacts_Project_Plan_FINAL_v3.xlsx, organised across P1 (Legal Before First Hire), P2 (First Months / Before Scaling), P3 (Sponsor Licence), P4 (Operational & Best Practice), P5 (Companies House & Corp Gov), Red Team Findings, Compliance Timeline, UK Transition Operational. Each artifact references back to CH_Guidance_extracted.md sections where applicable.

### 4. Production Strategy & Implementation
**Sub-features:** JIRA Implementation and Rollout, Agilefall Methodology Rollout, Gate System Design and Rollout, Roadmap and Cadence Rollout, Offsite Apr 27-30 and Post-Offsite

27 existing CSV items + 124 NEW items added by parallel agent. Reference skills used: `superpowers:writing-plans`, `product-management:sprint-planning`, `product-management:roadmap-update`, `product-management:metrics-review`, game-studios `sprint-plan.md`. Q9 (JIRA walk-through postponed to ~mid-May) applied. Q10 (offsite Apr 27-30, 4 days) confirmed. Critical-path items for offsite week explicitly flagged Red.

Known gaps: QA strategy and tooling decision, Confluence usage confirmation, art tooling (Perforce vs DAM) for JIRA integration, per-season Live Service exit criteria, finance owner for budget integration.

### 5. Game (with classification framework)
**Sub-features:** Game Features, Game Systems, Platform Features, Live Service Features, Content, Feature Versions

1,189 items from Couch_Heroes_Features_v2.xlsx. Each item carries type/layer/confidence. 180 items at low confidence flagged for offsite review.

Source data note: Couch Heroes Features v2 was a substantial restructure from v1. Dashboard summary sheet has not been recalculated against the new sheet structure (still shows v1's 421-feature total) - this is a separate gap for the file owner to address.

### 6. Studio Business
**Sub-features:** GTM and Forecasting, BD, PR, Community, Website, Studio Naming

Built from Couch Heroes vision docs and design pillars. Reference skills used: `marketing-ideas`, `launch-strategy`, `seo-audit`, `site-architecture`, `competitor-alternatives`, `customer-research`, `content-strategy`, `pricing-strategy`, `marketing-psychology`. Audience priority order from vision doc applied: Explorer primary, Socialiser secondary, Achiever tertiary, Killer supported only.

Known gaps requiring Glen input:
- Pricing model decision (premium / F2P+cosmetics / subscription) - blocks Steam page work
- Demo/beta/early access strategic call - blocks wishlist artifacts
- Publisher vs self-publish decision
- Studio name vs game name resolution (per Granola Apr 2 discussion)
- Cross-play and unified account model decision
- PR agency vs in-house decision
- Forum platform vs Discord/Reddit-only decision
- Switch 2 capability for MMO scope (needs Mustafa input)

### 7. AI (cross-cutting)
**Sub-features:** Usage Policy and Governance, Tool Selection and Licensing, Training and Education, Production Integration, IP Safeguards

Built from scratch using `superpowers:brainstorming`, `legal:compliance-check`, `legal:legal-risk-assessment`, `product-management:write-spec`. Risk areas explicitly flagged:
- Voice cloning / SAG-AFTRA & Equity post-strike obligations
- Concept artist boycott exposure (human red-line process required)
- Steam AI disclosure (mandatory since Jan 2024) plus PSN, Xbox, Nintendo, Epic equivalents
- Partner-IP firewall (Couch Heroes' partner-game integration model creates contamination risk via public AI tools)
- Outsource/contractor leak vector
- Unsettled training-data litigation (Stability, Midjourney, Suno) tied to tool eligibility

27 items flagged Critical or Red for immediate attention.

### Closed Projects (status preserved)
- AMA: Done (Apr 22)
- Salary Review Delivery: Done

### Killed Projects
- Gamescom Preparations: Cancelled

### Out of Scope (per Q13)
- Statement of Work administration: Belongs in NBI internal, not CH backlog

---

## Item Counts (verified by personally counting workbook rows, not relayed)

| Project | Items |
|---|---|
| Game | 1,190 |
| Studio Business | 249 |
| Studio Operations | 244 |
| Production Strategy & Implementation | 151 |
| AI | 138 |
| HR | 133 |
| UK Company Setup | 102 |
| Closed/Killed | 5 |
| **TOTAL** | **2,212** |

Game classification breakdown:
- Type: System 217, Feature 494, Content 211, Platform 142, LiveService 78, Maturity 46, blank 2
- Layer: Feature 591, Foundation 284, Presentation 246, Polish 45, Core 22, blank 2
- Confidence: high 949, medium 59, low 180, unknown 1

---

## Pending Inputs From Glen

| Item | Source | Why blocking |
|---|---|---|
| 180 low-confidence game classifications | Q15 - flagged for offsite | Filter by confidence=low in Game sheet to review during offsite |
| Studio Business decisions | Studio Business agent flagged | Pricing model, demo strategy, publisher vs self-publish, studio naming, cross-play, PR agency, forum platform, Switch 2 scope |
| Studio Operations decisions | Studio Operations agent flagged | Riley scope, Greece structure, IT ownership post-CTO, backend platform, cap table truth holder, audio lead |
| AI Couch Heroes specifics | AI agent flagged | Current AI tool inventory, existing whistleblower channel, standing legal counsel, active publisher contracts, prior policy template |
| Production Strategy gaps | Production Strategy agent flagged | QA tooling, Confluence usage, art tooling, per-season exit criteria, finance owner |
| Lead Animator question set physical artifact | Q4 | No separate doc on disk - confirm if informal/Slack/Notion/reconstruct |
| Org structure final | Q8 | Replace likely version with finalised post-offsite |
| Workbook approval | All projects | Before any live WorkSage API insertion |

---

## Output

Final deliverable: `Clients/Couch Heroes/CH_WorkSage_import_v1.xlsx`

Sheets:
- `_STATS` - per-project counts
- `MASTER` - all items with classification fields
- One sheet per project: Production Strategy & Implement, HR, Studio Operations, UK Company Setup, Studio Business, Closed-Killed, Game, AI
- `_VALIDATION` - data integrity flags

Approve before any live WorkSage API insertion.

---

## Tools, Skills, and Agents Used

- `superpowers:dispatching-parallel-agents` - 5 parallel agents covering Game classification, Studio Operations, Studio Business, AI, Production Strategy enrichments
- `superpowers:writing-plans` - the overnight + offsite-prep execution plans
- `superpowers:brainstorming` - via AI project agent
- Game-studios reference skills: `create-architecture.md` (layer model), `create-epics.md` (epic = architectural module), `team-combat.md`, `team-ui.md`, `team-audio.md`, `team-narrative.md`, `team-live-ops.md`, `sprint-plan.md`
- Legal: `legal:legal-risk-assessment`, `legal:vendor-check`, `legal:compliance-check`
- Finance: `finance:close-management`, `finance:reconciliation`, `finance:financial-statements`, `finance:journal-entry-prep`
- Marketing/launch: `marketing-ideas`, `launch-strategy`, `seo-audit`, `site-architecture`, `competitor-alternatives`, `customer-research`, `content-strategy`, `pricing-strategy`, `marketing-psychology`
- Product management: `product-management:write-spec`, `product-management:sprint-planning`, `product-management:roadmap-update`, `product-management:metrics-review`
- Anthropic: `anthropic-skills:xlsx`, `anthropic-skills:docx`
- Granola MCP, openpyxl, python-docx
- AskUserQuestion (Q1-Q17)
- TodoWrite (active throughout)

## Hard Rules Applied

1. No fabrication - every count personally verified, no agent claims relayed without check
2. No scope-watering - thin projects fully built out, not skeletons. Glen explicitly called this out and the work was redone
3. No timelines in deliverables (offsite Apr 27-30 is a fixed milestone, not a timeline)
4. British English throughout
5. Zero em-dashes
6. Verify everything - 1,188 of 1,189 game classifications matched after lookup logic was corrected
