> **Canonical product context:** See `brain/salarysage.md`. This file contains project-specific operational state only — sprint progress, blockers, deliverables, and session-specific decisions.

# SalarySage — Project Context (Tier 3 Knowledge)

> This file is the deep knowledge base for any agent working on SalarySage. It contains all technical, personnel, security, data, and integration detail needed to continue work without re-briefing Glen.

**Source of truth:** NBI_Brain.md Section 3 (SalarySage subsection)
**Last updated:** 2026-03-28

---

## What SalarySage Is

SalarySage is a global gaming industry salary intelligence database with an LLM-powered AI query interface. It answers questions like:
- "What is the salary range for a Senior Game Designer in the UK?"
- "How does a Lead Data Scientist salary in London compare to Norwich?"
- "What do QA Managers earn at hub vs non-hub locations in the USA?"

It covers video game industry salaries by:
- Country
- Role / position type
- Seniority grade
- Hub vs non-hub location (major cities vs regional cities within the same country or US state)

The AI query interface accepts natural language questions and translates them into salary lookups, returning results in a structured format.

---

## Current State

**Version:** 10 (Operation_MoneyBall_v10.zip)
**Codename:** Operation MoneyBall
**Deployment:** Local only. The app runs as a standalone HTML file opened directly in a browser (double-click to open). There is no live server deployment.

### File Components (v10)

| File | Size | Description |
|---|---|---|
| SalarySage-Standalone.html | 29KB | Main demo application — the working UI and query interface |
| Demo_Salary.csv | 5MB | The salary database — loaded at runtime by the HTML app |
| SalarySage.jsx | 24KB | React component (source for the HTML app) |
| SalarySage-Auth.html | 36KB | Authentication front end added by Devin Rieger (25-26 March 2026) |
| CLAUDE.md | TBD | Claude Code workflow file included in the zip |

---

## Team

### Jeff Day — Principal Data Scientist
- Built the original demo application
- Built and maintains the salary data pipeline
- The API key is currently on Jeff's personal credit card ($25 loaded)
- Jeff confirmed the key can be moved to server-side; he is working on the solution
- Contracted via NSI (hourly) — not yet on NBI payroll

### Devin Rieger — Analyst
- Built the authentication front end (SalarySage-Auth.html)
- Handles packaging and access logging
- Part of the Gaming Practice (NBI payroll, £5,617/month)
- Note: surname Rieger — likely related to Tom Rieger
- NBI email: drieger@nbi-consulting.com

### Jessica Williams — QA / Data Researcher
- Involved in data quality work
- CC'd on QA assessment emails
- Contracted via NSI — not yet on NBI payroll

### Tom Rieger — Overseer
- Forwarded the demo to Glen
- Reviewed the QA assessment (called it "really, really good")
- Manages Jeff and Jessica day-to-day

---

## Security Issues — CRITICAL

**Status as of 26 March 2026: these issues are not confirmed resolved.**

### Issue 1: API key exposed in client-side HTML
The API key used by the LLM query interface is embedded directly in the HTML source code (SalarySage-Standalone.html or SalarySage-Auth.html — to be confirmed which file). This means anyone who opens the app and views page source can read the API key.

**Impact:** The key can be extracted and used by third parties, running up costs on the account it is billed to.

### Issue 2: API costs on Jeff Day's personal credit card
The API key is charged to Jeff Day's personal credit card with $25 loaded. NBI is effectively running a product demo on an employee's personal finances. If the key is scraped and abused, Jeff bears the financial risk.

**Resolution path (as confirmed by Jeff):**
- Move the API key to a server-side proxy so it never appears in client code
- Move billing to an NBI business account (Bryan Rasmussen / Glen Pryer to action)

### Issue 3: Do not demo until resolved
Glen's explicit instruction: the app must not be used in client-facing demos until these security issues are fixed. Any agent scheduling or preparing client demos must check that the security fix is confirmed complete before proceeding.

---

## Authentication System

Built by Devin Rieger (25-26 March 2026). Key features:
- SHA-256 hashed user credentials
- Case-sensitive login
- Access logging: SalarySage_AccessLog_YYYY-MM-DD.txt files
- Front end: SalarySage-Auth.html (36KB)

The auth system is a gating layer added in front of the main app. It was not present in versions before v10.

---

## Data Quality

### QA Assessment (Jeff Day, 3 March 2026)
Full automated QA assessment completed. Document: FULL_DATABASE_QA_EXECUTIVE_SUMMARY.pdf
- Tom's assessment: "looks really, really good"
- 80 records identified as needing caution flags (small market countries with limited data samples: Armenia, Republic of Georgia, and similar)
- Decision: add caution flags to these records, do not remove them. This preserves data breadth while informing users of data quality limitations.

### Earlier Data Concerns (13 January 2026)
Jeff Day had "critical concerns" about some data in the earlier dataset. Working file: video_game_salaries_2025-2026_missing_rows_filled.xlsx. This was resolved before the March 2026 QA assessment.

### Data Scope
- Global coverage: salaries by country
- Role types: all major game development positions
- Seniority grades: junior through executive
- Location differential: hub cities (London, NYC, LA, etc.) vs non-hub cities (Norwich, Austin, etc.) within the same country/state
- Database size: 5MB CSV

---

## Relationship to Playsage

**SalarySage is a feature of Playsage, not a standalone product.**

This is a confirmed decision from Glen (March 2026). The salary intelligence tool, AI query interface, and hub/non-hub location data will eventually live inside the Playsage platform as a module or section.

### Integration path options (not yet decided)

1. **Module 11 (standalone Talent Intelligence module)** — SalarySage becomes a distinct 11th module in the platform, positioned as "Talent Intelligence" or "Salary Intelligence". This is the cleanest separation.

2. **Fold into Market Overview (Module 1)** — Salary data becomes a layer within the market overview dashboard. Less visible, but keeps the module count at 10.

3. **New "Talent Intelligence" section** — A distinct product area separate from the 10 core modules, positioned as an add-on or separate feature bundle.

The architecture decision should be made during PRD v1.3 work on the Playsage side. Until that decision is made, SalarySage continues as a standalone tool.

### Pricing tier placement (not yet decided)
Should salary intelligence be:
- Available at all tiers (Starter, Pro, Enterprise)?
- A Pro/Enterprise-only feature (given the HR/executive audience)?
- A separate add-on at any tier?

This is an open question requiring Glen's input.

---

## Open Questions for Glen

1. **Unfinished feature request:** Glen began describing a feature he wants to add but did not complete the description. This needs a follow-up. The API key obfuscation is the only partially-described feature on record, but Glen implied there was something additional.
2. **Integration path:** Which architecture option for Playsage integration?
3. **Pricing tier placement:** Which tiers get salary data access?
4. **Server/hosting plan:** Who owns the decision? Jeff + Devin to implement, but Glen or Bryan needs to select and fund the hosting environment.
5. **When is the app demo-ready?** Once security is fixed, who decides the app is cleared for client demos? Glen, Tom, or both?

---

## Known Gaps and Risks

| Item | Risk Level | Notes |
|---|---|---|
| API key in client code | Critical | Must resolve before any demo |
| API billing on Jeff's personal card | Critical | Must move to NBI account |
| No live server deployment | High | Limits who can access the tool; blocks proper auth logging |
| 80 records without caution flags | Medium | Decision made; not yet implemented |
| Integration architecture undefined | Medium | Needed before Playsage development begins |
| Glen's unfinished feature request | Low | Needs a follow-up conversation |
| Jeff/Jessica not on NBI payroll | Medium | As NSI winds down, this becomes a retention and cost risk |
