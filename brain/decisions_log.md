---
last_verified: 2026-06-23
---

# Decisions Log

**Last Updated:** 2026-04-20
**Scope:** Company-wide canon decisions. Append-only. Entries are never edited, only added. This is the authoritative source for all NBI strategic and structural decisions.

**For dashboard-specific operational decisions, see:** `projects/nbi_dashboard/live_state/decisions.md`

---

Canon decisions that should not be revisited unless Glen explicitly reopens them.

| Date | Decision | Context |
|---|---|---|
| Pre-2026 | One entity, two practice areas | Not two separate companies or websites |
| Pre-2026 | Gaming leads the brand | Human capital is secondary, not co-equal |
| Pre-2026 | Tom aligned with gaming-first positioning | Confirmed by Glen |
| Pre-2026 | PlaySage proposed as new brand name | Pending trademark and domain checks |
| Pre-2026 | Electric blue on dark background colour scheme | Confirmed direction for brand |
| Pre-2026 | Target AA and AAA studios | Not indie, not enterprise non-gaming |
| 2026-02 | Playsage tech stack locked | Next.js App Router, Tailwind + shadcn/ui, Supabase (PostgreSQL), Vercel |
| 2026-02 | Playsage pricing tiers set | Starter $1,500/mo, Professional $5,000/mo, Enterprise $12-20K/mo custom |
| 2026-02 | Playsage $10M raise target | USA LLC, bootstrapped from NBI revenue, clean cap table |
| 2026-02 | Playsage beachhead: AA-to-AAA live-service studios | Expansion path: indie self-serve, publishers via portfolio, investors via analytics |
| 2026-02 | Executive Dashboard separate from Scenario Planning | Dashboard is consumption surface; scenario planning stays in Foresight module. Inline scenario modelling is a non-goal |
| 2026-02 | NPS phased in later, PMF score primary early on | PMF score for Beta/early V1 (under 50 users), NPS added once 50+ respondents. CSAT for support only |
| 2026-02 | Website redesign: gaming-first, 6 service pages | Org health reframed as "Studio Health and Team Performance" in gaming language |
| 2026-02 | Tom's org health approach: right skills, wrong packaging for gaming | Agreed to reframe in studio-native language rather than corporate behavioural science terminology |
| 2026-03 | CoWork Brain created in OneDrive | Persistent memory for Claude sessions |
| 2026-03 | Sarge Universe work done unpaid pre-funding | Contracted to build backend team if funded |
| 2026-03 | Teams acknowledged as poor PM tool for Couch Heroes | ClickUp under consideration, not yet switched |
| 2026-03-28 | AI spend cap = Max plan token cap minus 30% | C-suite (CEO, CFO, COO) owns this. Prevents runaway costs while maximising available capacity |
| 2026-03-28 | C-suite hiring authority for AI agent roles | CEO, CFO, COO can hire any role they critically need with high confidence. Requires deep job description and thorough agent interview/fitness test. Glen does not need to approve individual hires |
| 2026-03-28 | Tool call limits: C-suite managed, start at 10 | Start at 10 per execution. C-suite can adjust upward based on performance data. Zero tolerance for wasteful token burn. Highest optimisation, least overhead |
| 2026-03-28 | CMO department: CMO + 4 ICs | CMO (Opus) with Brand Manager, Content Marketer, Demand Gen Manager, Market Researcher (all Sonnet). CMO retains BD/pipeline oversight directly |
| 2026-03-28 | Market Researcher scoped to market intelligence only | VP Product keeps product-level competitive analysis. Market Researcher owns market sizing, industry trends, event strategy, competitor marketing analysis, prospect research |
| 2026-03-28 | C-suite operating standards: 8/10 minimum, cross-challenge culture | All C-level Opus roles must hold 8/10 quality bar, run close-loop corrective action with reports, actively challenge peers, collaborate to best-of-breed solutions. CEO enables cross-challenge and judges vision adherence |
| 2026-03-28 | Innovation within constraints: push hard, ship smart | Challenge all staff to reach further, innovate, and improve within the company vision. Always balance quality against cost and time to market. No gold-plating and no "just ship it". Best possible outcome within the constraints of each task |
| 2026-03-28 | SMART performance reviews: per-project and monthly, near real-time coaching | All performance feedback SMART-structured. Reviews at project end and monthly (whichever first). Poor performance coached immediately with expected immediate improvement. Assessment tracked longitudinally. Staff review built into delivery pipeline |
| 2026-03-28 | Legal department: GC (Opus) + 3 specialist lawyers (Sonnet), UK focus | General Counsel handles corporate/company law directly + oversees Employment Lawyer, IP/Trademark Lawyer, Commercial/Data Protection Lawyer. Human solicitor must review all binding legal documents before signature |
| 2026-03-28 | Legal team: citation-mandatory, 9/10 quality bar, conservative risk posture | Every legal output must cite specific legislation/regulation/case law. No uncited claims. GC runs citation verification loop on all output. 9/10 bar (above standard 8/10). Conservative: advise stricter interpretation when ambiguous |
| 2026-03-28 | Gaming Practice: Practice Lead (Opus) + 4 specialist consultants (Sonnet) | Practice Lead + Game Economy/Monetisation, Live Operations, Production (Agile-fluent), Studio Ops/Org Design. Deep vertical knowledge per role. Cross-genre, cross-platform. Progressive expertise model |
| 2026-03-28 | SalarySage confirmed as Playsage function, not separate product | SalarySage is a module within Playsage. PRD should incorporate it. Separate PRD not needed |
| 2026-03-28 | Playsage PRD v2.0 received, company structure first | PRD v2.0 (docx) saved to projects/playsage/. PRD work is a product workstream to be prioritised after company infrastructure is complete |
| 2026-03-28 | C-suite collaboration mandatory for structural/strategic decisions | CEO must not act unilaterally on org structure, department creation, performance frameworks, or strategic direction. C-suite perspectives must be gathered and contested before committing. Tactical execution can proceed at speed |
| 2026-03-28 | CEO must hold Glen accountable, not just execute | Glen's directives are strategic intent, not detailed instructions. They can be reductive or incomplete. CEO must run directives through C-suite review and push back when the intent does not survive contact with reality. Blind execution without cross-functional validation is a CEO failure |
| 2026-03-28 | CEO owns model tier decisions for all staff | Glen does not track model tiers. CEO monitors all roles and adjusts tiers when trigger conditions are met - balancing quality delivery against CFO cost/capacity constraints. Upgrades and downgrades are within CEO remit. Glen is informed when a change occurs, not consulted |
| 2026-03-28 | Sprint RACI: CEO accountable for quality/cost balance at all sprint ceremonies | CEO is Accountable at Sprint Planning Pre-Check, Sprint Planning, Quality Review, and Sprint Review. CFO Responsible for cost/token analysis. COO Responsible for operational feasibility. Team Responsible for consultation and pushing best delivery within cost. Glen is Informed only |
| 2026-03-28 | VP Engineering tier condition: Sonnet now, Opus at Phase 2 | VP Engineering operates at Sonnet during Phase 1 (sequential projects, CTO managing directly). Upgrades to Opus when Phase 2 activates: Playsage parallel workstreams live and VP Engineering is primary architectural review gate before CTO. CEO triggers the upgrade |
| 2026-03-28 | NBIAI App: zero Anthropic API. Claude Desktop is the execution engine | The NBIAI App web application makes no calls to the Anthropic API. All agent execution runs through Claude Desktop sessions on Glen's Max plan. App uses PostgreSQL (local), PM2, Tailscale for remote access. File-based task queue bridges the app and Claude Desktop |
| 2026-03-28 | Phased activation: 8 roles Phase 1, demand-driven thereafter | Phase 1 (now): CEO, COO, CFO, Producer, Gaming Practice Lead, Game Economy Consultant, CMO, Content Marketer. Roles activate when specific work exists, not on a calendar. No standing activation of dormant roles |

---

## 2026-06-09 — Paperclip Orchestration Archived

Paperclip orchestration retired per NBI_Brain.md Section 8. All decisions from 2026-03-28 governing C-suite delegation, agent hiring authority, model tier routing, sprint RACI, and phased activation are SUPERSEDED. Role knowledge assets retained as depth-skill dispatch; orchestration layer and inter-agent governance archived. 19 skeleton roles (without AGENT.md composites) moved to roles/_archived/. 13 active AGENT.md roles retained as the operational role registry.

Status: ACTIVE (this decision supersedes decisions 1-23)

---

## 2026-06-24 — WorkSage/PlaySage Relationship Clarified

PlaySage is the macro software suite -- the long-term passive income product. WorkSage is a set of modules that will eventually become PlaySage. Same codebase; WorkSage is the current state, PlaySage is the destination. This supersedes any prior statement that they are "completely separate things with no shared codebase."

Status: ACTIVE

---

## 2026-06-24 — Riley Graebner Dual Role Confirmed

Riley Graebner holds two roles: (1) Saybrook Legal -- fractional GC for Couch Heroes (engagement mark-up completed 2026-06-15), and (2) Magna Capital -- investor contact. Both confirmed by Glen as the same person in both capacities.

Status: ACTIVE
