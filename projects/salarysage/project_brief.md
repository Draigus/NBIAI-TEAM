# Project Brief — SalarySage

**Project name:** SalarySage — Global Gaming Salary Intelligence Tool
**Project lead:** Tom Rieger (overseen by Glen Pryer)
**Date created:** 2026-03-28
**Last updated:** 2026-03-28
**Status:** ACTIVE — urgent security fix required before any client demo

---

## Purpose

SalarySage is a global gaming industry salary intelligence tool with an LLM-powered AI query interface. It enables studios, HR teams, and executives to look up salary benchmarks by country, role, seniority grade, and location type (hub city vs non-hub city). It was built internally by NBI under the codename "Operation MoneyBall" and is currently at version 10. SalarySage is classified as a future feature of the Playsage platform, not a standalone product, though it currently exists as a standalone HTML application pending full platform integration.

**Critical:** An API key is embedded in the application source code and is charged to Jeff Day's personal credit card. This must be resolved before any client-facing demo or deployment.

---

## Scope

### In scope
- Resolve the exposed API key security issue (move to server-side; remove from client code)
- Define and implement a server/hosting plan (currently local-only)
- Integrate SalarySage into the Playsage platform architecture as a future module
- Resolve 80 records requiring caution flags (small-market countries: Armenia, Republic of Georgia, etc.) — decision made: add flags rather than remove records
- Define pricing tier placement (which Playsage tiers include salary data access)
- Decide integration path: new standalone Module 11 vs fold into Market Overview vs new "Talent Intelligence" section

### Out of scope
- Replacing the underlying salary database (5MB CSV is the current source of truth)
- Full UI rebuild (standalone HTML app is the working prototype; major rebuild deferred to Playsage integration)
- New data collection (current QA assessment deemed the dataset "really, really good" per Tom Rieger, March 2026)

---

## Success Criteria

| Criterion | Measurement |
|---|---|
| API key removed from client-side code | Code review confirms no keys in HTML/JS source |
| API costs moved to NBI business account | Jeff Day's personal credit card no longer used |
| Server-side solution running | App functions correctly via server; no client-exposed keys |
| App deployable for client demos | Security review passed; ready for external use |
| Integration plan for Playsage defined | Architecture decision documented in project_context.md |
| Caution flags applied to 80 flagged records | Data file updated; flags visible in UI |

---

## Deliverables

| Deliverable | Owner | Due | Status |
|---|---|---|---|
| API key removed from HTML source code | Devin Rieger | URGENT | Not confirmed complete |
| Server-side API key management implemented | Jeff Day + Devin Rieger | URGENT | In progress (Jeff confirmed working on it) |
| NBI business account set up for API billing | Glen Pryer / Bryan Rasmussen | URGENT | Not started |
| Caution flags applied to 80 flagged records | Jeff Day | TBD | Not started |
| Server/hosting plan defined and implemented | Jeff Day + Devin Rieger | TBD | Not started |
| Playsage integration architecture decision | Glen Pryer | TBD | Not started |
| Pricing tier placement decision | Glen Pryer | TBD | Not started |
| Glen's partially described feature addition | Glen Pryer (to brief team) | TBD | Incomplete — Glen did not finish describing it |

---

## Dependencies

| Dependency | Provided by | Status |
|---|---|---|
| Jeff Day available to implement server-side solution | Jeff Day / Tom Rieger | Pending |
| Devin Rieger available to update HTML/auth front end | Devin Rieger | Pending |
| NBI business API billing account | Glen Pryer / Bryan Rasmussen | Not started |
| Playsage architecture decisions (for integration path) | Glen Pryer | Not started — blocked on Playsage PRD v1.3 |
| Glen's description of the unfinished feature request | Glen Pryer | Incomplete — needs follow-up |

---

## Key Decisions

| Decision | Chosen approach | Rationale | Date |
|---|---|---|---|
| Product positioning | Feature of Playsage, not standalone product | Avoids competing with Playsage's own go-to-market; salary data is most valuable in context of broader intelligence platform | Glen confirmed, March 2026 |
| Data quality action on flagged records | Add caution flags, do not remove records | Preserves data breadth while signalling data quality concerns to users | Tom Rieger, March 2026 |
| API key exposure priority | Fix before any client demo | Exposed API key on personal credit card is both a security and financial risk | Glen confirmed, 26 March 2026 |
| Integration path into Playsage | Not yet decided | Options: Module 11 standalone, fold into Market Overview, new "Talent Intelligence" section | Pending |

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| API key exposed in client code causes cost overrun on Jeff's card | High — already occurring | Medium | Move to server-side immediately; move billing to NBI account |
| API key visible in source allows third parties to use NBI's API quota | High — currently true | High | Remove from client code; implement server-side proxy |
| Client demo exposes the security issue during a meeting | Medium | High — reputational damage | Do not demo until fix is confirmed complete |
| SalarySage integration into Playsage not architected before Playsage development begins | Medium | Medium | Define integration path as part of PRD v1.3 work |
| Jeff Day and Devin Rieger bandwidth (NSI workload competing) | Medium | Medium | Confirm availability with Tom; set explicit timelines |
| Glen's unfinished feature request never gets described | Low | Low | Flag at next Glen/Tom check-in |

---

## Stakeholders

| Name | Role | Involvement |
|---|---|---|
| Glen Pryer | Product owner / decision authority | Approves all direction; raised security concerns |
| Tom Rieger | Project overseer | Forwarded demo to Glen; reviewing QA; manages Jeff and Jessica |
| Jeff Day | Principal Data Scientist | Built original demo, salary data pipeline; holds API key on personal card |
| Devin Rieger | Analyst | Built auth front end, packaging, access logging |
| Jessica Williams | QA / data researcher | Involved in data quality assessment (CC'd on QA emails) |
| Bryan Rasmussen | CFO | Should set up NBI business billing account for API costs |

---

## Timeline

| Milestone | Target Date | Status |
|---|---|---|
| Security audit: confirm what is exposed | ASAP | Not confirmed |
| API key removed from client code | ASAP | Not confirmed complete |
| Server-side API proxy implemented | ASAP | In progress (Jeff) |
| API billing moved to NBI business account | ASAP | Not started |
| App cleared for client demos | After security fix | Blocked |
| Caution flags applied to 80 records | TBD | Not started |
| Server/hosting plan live | TBD | Not started |
| Playsage integration architecture defined | TBD — tied to PRD v1.3 | Not started |

---

## Notes

**Codename:** "Operation MoneyBall". Current version: 10 (Operation_MoneyBall_v10.zip).

**Current file components (v10):**
- SalarySage-Standalone.html (29KB) — main demo app
- Demo_Salary.csv (5MB) — the salary database
- SalarySage.jsx (24KB) — React component
- SalarySage-Auth.html (36KB) — authentication front end (built by Devin, 25-26 March 2026)
- CLAUDE.md — Claude Code workflow file (inside the zip)

**Authentication:** SHA-256 hashed user credentials, case-sensitive login, access logging (SalarySage_AccessLog_YYYY-MM-DD.txt). Auth front end is a recent addition by Devin Rieger.

**Data QA history:** Jeff Day completed a full automated QA assessment (FULL_DATABASE_QA_EXECUTIVE_SUMMARY.pdf, 3 March 2026). 80 records need caution flags for small-market countries with limited data. Earlier data work: video_game_salaries_2025-2026_missing_rows_filled.xlsx — Jeff flagged "critical concerns" about some data on 13 January 2026.

**Coverage:** Global gaming salaries by country, role, seniority grade, and hub vs non-hub location (e.g. London vs Norwich, major metro vs regional city within a US state).

**Unresolved feature request:** Glen described wanting to add a feature but did not finish the description. This needs a follow-up with Glen at the next opportunity.
