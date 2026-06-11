# NBI Org Chart — Humans and AI System

Last updated: 2026-06-11

This replaces the 2026-03-28 chart, which described the retired Paperclip architecture (a 30-role hierarchical agent company with CEO/COO/CFO agents). That architecture was archived on 2026-06-09: 19 skeleton roles moved to `roles/_archived/`, 23 Paperclip-era decisions marked SUPERSEDED. The current system is a flat dispatch model, not a hierarchy.

## How the system actually works

```
Glen Pryer (Managing Director / operator)
│
├── Human team ............... see brain/people_directory.md (canonical roster + payroll)
│
└── Claude Code (single orchestrating assistant)
    ├── Role dispatch ........ 13 advisory AGENT.md roles, loaded on demand (below)
    ├── Skills ............... .claude/skills/ (intelligence pipeline, proposals, audits, etc.)
    ├── Connections .......... company/connections.md (MCPs, API connectors, dashboard integrations)
    └── Cadence .............. company/routines.md (7 scheduled local tasks)
```

There is no agent hierarchy. Claude Code is one assistant that loads expertise into context via the routing tables in CLAUDE.md (skill-triggered and topic-detected). Roles are knowledge composites, not autonomous workers. Scheduled autonomy lives in the cadence layer, where each run is a headless Claude session executing a specific skill.

## Active AI roles (13) — `roles/{role}/AGENT.md`

| Role | Domain | Typical triggers |
|---|---|---|
| vp_product | Product strategy, feature design | brainstorming, writing-plans |
| senior_engineer | Architecture, code review, debugging | code-review, systematic-debugging |
| qa_lead | Testing strategy, quality gates | test-driven-development |
| ui_ux_lead | Design systems, accessibility, UX | frontend-design; UI/UX topics |
| cto | Technology leadership, infrastructure | architecture decisions |
| data_analyst | Analytics, dashboards, pipelines | data topics |
| producer | Client delivery, milestones, reporting | delivery topics |
| production_consultant | Studio ops, production processes, scheduling | production topics |
| gaming_practice_lead | Game industry expertise, investment analysis | /gi skill |
| game_economy_consultant | Economy, monetisation, loot, currencies | game-economy-design |
| general_counsel | Legal, contracts, IP, GDPR | legal topics |
| cmo | Marketing, positioning, brand, BD pipeline | marketing topics |
| head_of_people | Hiring, compensation, team structure | people topics |

Archived roles (19, no AGENT.md, Paperclip era): `roles/_archived/` — ceo, coo, cfo, vp_engineering, engineer, data_engineer, devops, qa_engineer, ui_ux_designer, tech_writer, brand_manager, content_marketer, demand_gen_manager, market_researcher, employment_lawyer, ip_trademark_lawyer, commercial_dp_lawyer, live_ops_consultant, studio_ops_consultant.

## Human team (summary — canonical detail in brain/people_directory.md)

| Person | Role |
|---|---|
| Glen Pryer | Practice Lead Gaming, Partner, MD |
| Tom Rieger | Practice Lead Human Capital, Partner |
| Magnus (Kali) Pryer | Producer |
| Amir Didar, Ruan, Stavros | Data team embedded at Lighthouse Studios (3-year contract) |
| Devin Rieger | Analyst |
| Patrice | HR Advisor / Administration |

Third-party: Marie (contractor on project delivery, tracked in WorkSage assignees, no user account).

Departures (June 2026, NSI/NBI separation): Jeff Day and Jessica Williams let go; Bryan Rasmussen stayed at NSI and is no longer part of NBI (CFO seat vacant). Tom Rieger remains a Partner but is not currently drawing a paycheck from NBI.

## Pending additions

- **Hermes Agent** — approved 2026-05-10: WSL2 deployment on second PC, Discord interface, Claude CLI brain. Will be the team-facing answer channel. Blocked on machine specs.
