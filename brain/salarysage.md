---
last_verified: 2026-06-23
---

# SalarySage - Global Gaming Salary Intelligence

Last Updated: 2026-06-23

---

**Internal Codename:** "Operation MoneyBall"

**Relationship to PlaySage:** SalarySage is a feature/module of PlaySage, not a separate product. It will live inside the broader PlaySage gaming intelligence platform alongside the other 10 core modules. A separate PRD is not needed - the PlaySage PRD should incorporate it.

---

## What SalarySage Is

A comprehensive global gaming industry salary intelligence database with an LLM-powered AI query interface. Covers video game salaries by country, by grade (seniority level), by position/role. Includes hub vs non-hub location salary differentials (e.g. London vs Norwich, or major metro vs regional within a US state).

---

## Key Features

- **Global salary database** - 5MB+ CSV dataset covering gaming salaries across countries, positions, and grades
- **Hub vs non-hub location pricing** - salary ranges differ by sub-location (major hub cities vs smaller cities within the same country/state)
- **AI-powered query interface** - LLM-based natural language search that translates questions into salary lookups and presents results
- **Authentication front end** - SHA-256 hashed user credentials, case-sensitive login, access logging (SalarySage_AccessLog_YYYY-MM-DD.txt)
- **Standalone HTML app** - runs as a local HTML file (double-click to open), loads the CSV at runtime

---

## Current State (as of 26 March 2026)

**Working prototype/demo** - version 10 of the package (Operation_MoneyBall_v10.zip)

### Components

| File | Size | Description |
|------|------|-------------|
| SalarySage-Standalone.html | 29KB | The main demo app |
| Demo_Salary.csv | 5MB | The salary database |
| SalarySage.jsx | 24KB | React component |
| SalarySage-Auth.html | 36KB | Authentication front end (added by Devin, 25-26 March 2026) |
| CLAUDE.md | -- | Claude Code workflow file inside the zip |

---

## Team Working on SalarySage

| Name | Role | Notes |
|------|------|-------|
| Jeff Day | Principal Data Scientist | DEPARTED (let go June 2026). Built the original demo and salary data pipeline. API key was on Jeff's personal credit card -- migration needed |
| Devin Rieger | Analyst | Built the auth front end, packaging, access logging. Note: surname Rieger - likely related to Tom Rieger. Still active at NBI |
| Jessica Williams | Human Capital Researcher | DEPARTED (let go June 2026). Was involved in data/QA |
| Tom Rieger | Practice Lead, Human Capital | Overseeing, forwarded demo to Glen, reviewing QA. Not currently drawing from NBI payroll |

---

## Data QA Status

Jeff Day completed a full automated QA assessment (FULL_DATABASE_QA_EXECUTIVE_SUMMARY.pdf, 3 March 2026). Tom noted it "looks really, really good" with 80 records needing caution flags (small market countries like Armenia, Republic of Georgia). Decision: add caution flags rather than remove the data.

Earlier data work: video_game_salaries_2025-2026_missing_rows_filled.xlsx - Jeff had "critical concerns" about some data (13 Jan 2026).

---

## Security Concerns (Raised by Glen, 26 March 2026)

Glen flagged three critical issues for client-facing use:

1. **API key on personal card** - the API key was on Jeff Day's personal credit card. Jeff has since departed NBI (June 2026). Migration to an NBI-owned key is critical
2. **Exposed API keys in code** - there must be NO exposed API keys in the code at all. The API key was embedded in the HTML code, visible to anyone who browses source
3. **Hashing/obfuscation needed** - Devin needs to hash them. Jeff confirmed the key can be hashed; working on server-side solution. With Jeff's departure, Devin is the sole technical owner

---

## Feature Glen Wants to Add

The API key is currently exposed in usage - Glen wants it obfuscated. This is the priority feature/fix beyond the auth front end work Devin has already done.

---

## Remaining Open Questions

- **Server/hosting plan** - currently runs as a local standalone; needs a server for proper auth, logging, and API key obfuscation
- **PlaySage integration** - how will SalarySage integrate into the PlaySage product architecture? Will it become Module 11, or fold into an existing module (e.g. Market Overview or a new "Talent Intelligence" section)?
- **Pricing tier placement** - is salary data available at all tiers, or is it a Professional/Enterprise feature?
