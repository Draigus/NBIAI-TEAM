# AIOS Dispatch Improvements — Spec

Three targeted improvements to the dispatch system built in the 2026-05-15 infrastructure audit.

## 1. production_consultant AGENT.md

Build composite AGENT.md following the established pattern (150-250 lines). Source files:
- `roles/production_consultant/persona.md`
- `roles/production_consultant/responsibilities.md`
- `roles/production_consultant/workflows.md`
- `roles/production_consultant/prompts/system_prompt.md`
- `roles/production_consultant/knowledge/game_production_methodology.md`

Frontmatter dispatch_triggers:
- skills: []
- topics: [production processes, studio ops, scheduling, agile for games, sprint planning]

## 2. Role Attribution Instruction

Add to CLAUDE.md Section A, after Role Dispatch routing tables. Instruction text:

> When loading a role's AGENT.md into your own context or a subagent prompt, announce it briefly: "Loading [role] context for this." One line, no ceremony. This lets Glen see which perspective is active and judge the output accordingly.

## 3. Brain Module Routing Table

Add to CLAUDE.md Section A, as a new subsection under Role Dispatch. Maps conversation topics to brain/ modules, making loading deterministic rather than ad hoc.

| Topic | Load brain module |
|---|---|
| Clients, client state, engagements | clients_detailed.md |
| Playsage product, modules, pricing | playsage.md |
| SalarySage product, salary data | salarysage.md |
| NBI people, team, contractors | people_directory.md |
| Strategic decisions, canon | decisions_log.md |
| Glen's working style, preferences | glen-working-profile.md |
| Dashboard/WorkSage architecture | nbi_hub.md |
| Services, consulting offerings | services_ai_operations.md |
| AI operations, EAD framework | ead_framework.md |
| Tools, processes, infrastructure | processes_tools.md |
| Website, brand, online presence | brand_website.md |
| Pending actions, follow-ups | pending_actions.md |
| Glen's career, background | career_history.md |
| Glen's personal context | personal.md |

## Constraints

- CLAUDE.md line limit raised to 225 (from 200)
- All three changes on feature/command-centre branch
- production_consultant AGENT.md follows exact same template as vp_product
