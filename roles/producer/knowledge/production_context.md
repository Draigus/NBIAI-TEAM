# Producer — Production Context

## NBI's Active Project Landscape

The Producer must understand all active workstreams to track them effectively. This is the current project inventory as of March 2026.

---

### Playsage — Gaming Intelligence SaaS Platform

**Status:** Product development in progress. PRD v1.2 complete (scored 7.1/10). v1.3 corrections were in progress as of ~20 Feb 2026 and appear to have stalled.

**Tech stack (locked):** Next.js (App Router), Tailwind CSS + shadcn/ui, Supabase (PostgreSQL), Vercel. Demo: Docker Compose offline fallback.

**10 modules:** Market Overview & TAM, Competitive Landscape, Sentiment Analysis, Foresight (Forecasting), Market Watch / Release Calendar, Alerts, The Sage (Recommendations), Executive Dashboard & Scenario Planning, Finance / IAP Intelligence, API & Integrations.

**Deliverables status (as of ~20 Feb 2026):**
| Deliverable | Status |
|---|---|
| Consolidated Decision Document (v3) | DONE — 63 decisions locked |
| Cascade Engine Architecture | NOT STARTED |
| Full PRD (v1.3 corrections) | IN PROGRESS — stalled ~20 Feb 2026 |
| Pitch Deck Content | NOT STARTED |
| Claude Code Master Instruction Document | NOT STARTED |

**GDC 2026 demo status:** Unknown — was a demo built and shown? Glen needs to confirm.

**Key dependency:** Brand rename to PlaySage is pending trademark/domain checks. Playsage product naming may be affected.

**Advisory contacts:** Vardis and Aris (Couch Heroes CEO/COO) listed as advisors.

---

### SalarySage — Salary Intelligence Tool

**Status:** Working prototype exists (Operation_MoneyBall_v10.zip). Auth front end added by Devin Rieger (March 2026). Critical security issue: API key was embedded in HTML source — server-side obfuscation solution in progress.

**Relationship to Playsage:** SalarySage is a feature of Playsage, not a separate product. Will become a module within the platform.

**Open items:**
- Server/hosting plan for API key obfuscation
- Integration architecture into Playsage (which module or standalone module?)
- Pricing tier access (which tiers get salary intelligence?)

**Team:** Jeff Day (original build), Devin Rieger (auth front end), Jessica Williams (data/QA), Tom Rieger (overseeing).

---

### NBI Website Redesign

**Status:** HTML/CSS prototype complete (built Feb 2026 in Claude Chat "About NBI" project). NOT deployed to Framer.

**Reference files:** 10 HTML/CSS files — index.html (homepage), 6 service pages, About, Contact, shared CSS.

**Platform:** Framer (nbi-consulting.com).

**Pending:** Framer deployment or direct hosting decision (Netlify/Vercel).

**Dependency:** Brand rename to PlaySage — website rebrand is pending name confirmation.

**Design direction:** Gaming-first, 6 service pages named after real studio problems. Dark theme, electric blue, Orbitron + JetBrains Mono + Outfit.

---

### Brand Rename — PlaySage

**Status:** Proposed. Pending (1) playsage.com domain availability, (2) USPTO trademark search Class 35 & 41, (3) UK IPO trademark search, (4) EUIPO trademark search, (5) social handle availability.

**Legal note:** UK immigration solicitor must confirm whether registering a new trading name requires Home Office notification or affects the sponsor licence.

**Impact on other projects:** Playsage product naming, website rebrand, LinkedIn page, all client-facing materials.

---

### Active Client Engagements (Delivery Tracking)

#### Couch Heroes
- **Glen's role:** Fractional Studio Head
- **Current work:** UK company setup, FTE processes, job descriptions, interviews, org structure, roadmaps, head of department engagement
- **Tools:** Couch Heroes Slack (communication), Microsoft Teams (project management — being reconsidered for ClickUp)
- **Artefact tracking:** Checklist and Excel project plan of required artifacts is in Claude Chat (Couch Heroes project). Glen is "super particular" about correctness
- **Key contacts:** Vardis (CEO), Aris (COO), Lorenz (HR), Robin (Game Director), Valeria (Head of Production), David (Director of Art), Mustafa (Head of Tech)
- **Priority:** Glen's #1 current priority

#### Lighthouse Studios
- **Glen's role:** Contract oversight (~3-4 hours/week)
- **Embedded team:** Amir Didar (Senior Analyst), Ruan (Data Engineer), Stavros (Lead Data Scientist) — building data system and analytics for the title
- **Regular meeting:** Data science & analytics hour with the embedded team
- **Tools:** Microsoft Teams
- **Key contacts:** Justin Logan (Director of Live Games), James Firth (Manager of Analytics)

#### Sarge Universe
- **Current work:** Pitch deck, due diligence (DD) deck, financial plan
- **Status:** Pre-funding, unpaid. Contracted: if funded (target £5-10M), NBI builds the entire backend team
- **Deadline pressure:** Pitch deck and DD deck targeted for completion by end of w/c 6 April 2026. Investor emails to go out that week
- **Tools:** Telegram (Steve Green / CEO)
- **Key dates:**
  - 30 March: Working session on pitch deck
  - 31 March: DD deck progress and review
  - 6 April (target): Send investor emails

#### Goals Studio
- **Status:** Active lead — follow-up to Jonas Rundberg is OVERDUE (should have happened post-GDC)
- **Scope:** (1) Hard currency pricing review for 7 items + regional pricing recommendations. (2) In-game store review
- **Contact:** Jonas Rundberg (jonas@playgoals.com)
- **Action needed:** Glen to reply — overdue since 11 March 2026

#### Blizzard Entertainment
- **Status:** Active — Tom Rieger manages. Report delivery on a regular basis. Glen has minimal involvement.

---

### Internal Operations Projects

| Project | Status | Owner | Notes |
|---|---|---|---|
| Brand rename to PlaySage | Pending checks | Glen | Domain, trademark, social handles, legal review |
| LinkedIn activation | Not started | CMO | Page exists, zero activity |
| Client tracker app | Alpha | Glen (built) | Built in Claude Cowork; needs development into a proper CRM |
| Case studies | Not started | Glen | No case studies built yet — priority to develop |
| Outcome metrics documentation | Not started | Data Analyst | No metrics compiled |
| Team bios | Not started | Head of People | To be sourced from LinkedIn profiles |
| ClickUp evaluation | In consideration | Glen/COO | Being evaluated to replace Teams at Couch Heroes |

---

## Tools and Systems for Project Management

| Tool | Use | Notes |
|---|---|---|
| ClickUp | Primary project management (under evaluation) | Being considered to replace Teams at Couch Heroes; may become NBI-wide PM tool |
| Microsoft Teams | NBI internal communication + current PM at some clients | Acknowledged as poor for project management |
| Slack | Couch Heroes daily communication | Glen's primary channel for Couch Heroes work |
| Telegram | Sarge Universe | Steve Green communication |
| Excel | Project plans (Couch Heroes artifact tracker) | Currently in use for Couch Heroes artifact checklist |

---

## NBI Team Structure — Who the Producer Coordinates With

| Name | Role | Workload |
|---|---|---|
| Glen Pryer | MD / Practice Lead, Gaming | Primarily on Couch Heroes; stretched across 4-5 clients |
| Kali Pryer (Magnus) | Producer (real NBI team) | Internal tracking, accounts, cross-practice support |
| Amir Didar | Senior Analyst (embedded at Lighthouse) | Lighthouse-dedicated |
| Ruan | Data Engineer (embedded at Lighthouse) | Lighthouse-dedicated |
| Stavros | Lead Data Scientist (embedded at Lighthouse) | Lighthouse-dedicated |
| Devin Rieger | Analyst | SalarySage, general analytics support |
| Patrice | HR Advisor / Administration | Cross-business admin |
| Bryan Rasmussen | CFO | Finance across full business (NSI-covered currently) |
| Tom Rieger | Practice Lead, Human Capital | Blizzard report, HC pipeline, SalarySage oversight |
| Jeff Day | Principal Data Scientist | SalarySage data pipeline; hourly |

**Note:** The AI Producer agent's coordination is within the AI agent team structure. For real NBI team members (Glen, Kali, Devin, Amir, Ruan, Stavros), the Producer tracks work and surfaces slippage but does not manage or task these individuals — Glen and the COO manage them.

---

## Known Stalled Work (Slippage Register)

These items were last active more than 30 days ago and require attention:

| Item | Last Active | Status | Action Needed |
|---|---|---|---|
| Playsage PRD v1.3 corrections | ~20 Feb 2026 | Stalled — ~60 fixes identified | Glen to resume or prioritise |
| Playsage Cascade Engine Architecture | Not started | Deliverable 2, never started | Awaiting PRD completion |
| Playsage Pitch Deck | Not started | Deliverable 4, never started | Awaiting PRD completion |
| Playsage Claude Code Master Instruction | Not started | Deliverable 5, never started | Awaiting PRD + Architecture |
| Goals Studio follow-up | 11 March 2026 | Overdue — Jonas awaiting response | Glen to contact Jonas ASAP |
| Jen MacLean replies (2 emails) | 19 March 2026 | Unread / unanswered | Glen to reply to both emails |
| NBI website Framer deployment | Feb 2026 prototype | Prototype complete, not deployed | Decision on deployment method needed |
| SalarySage API key obfuscation | March 2026 | In progress (Devin/Jeff) | Must complete before any client demos |

---

## Sprint Rhythms at NBI

NBI does not have a formally established sprint cadence across all projects (as of March 2026). The Producer should work with the COO to establish:
- A weekly sprint rhythm for Playsage product development
- A milestone-based tracking approach for client delivery work (Couch Heroes, Sarge Universe)
- A standing weekly status report replacing ad hoc check-ins

Until a formal sprint cadence is established, the Producer tracks all work at the task and milestone level and produces a weekly status report regardless.
